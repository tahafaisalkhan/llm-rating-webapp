import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RubricForm from "../components/RubricForm";

export default function Detail() {
  const { id, model } = useParams(); // "chatgpt" | "medgemma"
  const navigate = useNavigate();

  const [cg, setCg] = useState(null);
  const [mg, setMg] = useState(null);
  const [err, setErr] = useState("");

  // panel tabs (no TS types here)
  const [engTab, setEngTab] = useState("dialogue"); // "dialogue" | "note"
  const [urdTab, setUrdTab] = useState("dialogue"); // "dialogue" | "note"

  useEffect(() => {
    (async () => {
      try {
        const [cgRes, mgRes] = await Promise.all([
          fetch("/data/chatgpt.json"),
          fetch("/data/medgemma.json"),
        ]);
        if (!cgRes.ok || !mgRes.ok) throw new Error("Missing JSON (run npm run build:data)");
        const [cgAll, mgAll] = await Promise.all([cgRes.json(), mgRes.json()]);
        setCg(cgAll.find((r) => String(r.id) === String(id)) || null);
        setMg(mgAll.find((r) => String(r.id) === String(id)) || null);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load.");
      }
    })();
  }, [id]);

  const isChatGPT = (model || "").toLowerCase() === "chatgpt";

  const originalDialogue = cg?.originalDialogue || mg?.originalDialogue || "";
  const originalNote = cg?.originalNote || mg?.originalNote || "";

  const urduDialogue = isChatGPT ? (cg?.chatgptDial || "") : (mg?.medDial || "");
  const urduNote = isChatGPT ? (cg?.chatgptNote || "") : (mg?.medNote || "");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">
          ← Back
        </button>
        {err && <div className="text-sm text-red-700">{err}</div>}
      </div>

      {/* Scrollable panels area */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* English panel */}
        <div className="border rounded-2xl bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">English</div>
              <div className="mt-1 font-semibold">
                {engTab === "dialogue" ? "Original Dialogue" : "Original Note"}
              </div>
            </div>
            <button
              onClick={() => setEngTab(engTab === "dialogue" ? "note" : "dialogue")}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${engTab === "dialogue"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-orange-500 text-white hover:bg-orange-600"}`}
            >
              {engTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {engTab === "dialogue" ? (
              <pre className="whitespace-pre-wrap leading-relaxed text-[15px]">
                {originalDialogue || "(No dialogue found)"}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap leading-relaxed text-[14px]">
                {originalNote || "(No note)"}
              </pre>
            )}
          </div>
        </div>

        {/* Urdu panel */}
        <div className="border rounded-2xl bg-white flex flex-col overflow-hidden" dir="rtl">
          <div className="p-4 border-b flex items-center justify-between" dir="ltr">
            <div>
              <div className="text-xs text-gray-500">Urdu ({isChatGPT ? "chatgpt" : "medgemma"})</div>
              <div className="mt-1 font-semibold">
                {urdTab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}
              </div>
            </div>
          <button
            onClick={() => setUrdTab(urdTab === "dialogue" ? "note" : "dialogue")}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition
              ${urdTab === "dialogue"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-orange-500 text-white hover:bg-orange-600"}`}
          >
            {urdTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
          </button>

          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {urdTab === "dialogue" ? (
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq text-xl leading-loose">
                {urduDialogue || "(No Urdu)"}
              </pre>
            ) : (
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq text-lg leading-relaxed">
                {urduNote || "(No note)"}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Fixed rubric at bottom */}
      <div className="border-t bg-white p-4 shadow-md">
        <RubricForm />
      </div>
    </div>
  );
}
