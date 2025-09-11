// src/pages/Detail.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RubricForm from "../components/RubricForm";
import { getRater } from "../utils/auth";

export default function Detail() {
  const { id, set } = useParams();
  const navigate = useNavigate();

  const [cg, setCg] = useState(null);
  const [mg, setMg] = useState(null);
  const [err, setErr] = useState("");
  const [already, setAlready] = useState(false);
  const [initialMajor, setInitialMajor] = useState(false); // NEW

  const rater = getRater() || "";

  useEffect(() => {
    (async () => {
      try {
        const [cgRes, mgRes] = await Promise.all([
          fetch("/data/chatgpt.json"),
          fetch("/data/medgemma.json"),
        ]);
        if (!cgRes.ok || !mgRes.ok) throw new Error("Missing JSON (run npm run build:data)");
        const [cgAll, mgAll] = await Promise.all([cgRes.json(), mgRes.json()]);
        const cgRow = cgAll.find((r) => String(r.id) === String(id)) || null;
        const mgRow = mgAll.find((r) => String(r.id) === String(id)) || null;
        setCg(cgRow);
        setMg(mgRow);

        const modelUsed = cgRow ? "chatgpt" : mgRow ? "medgemma" : "unknown";
        const res = await fetch(
          `/api/ratings/status?modelUsed=${encodeURIComponent(modelUsed)}&modelId=${encodeURIComponent(
            id
          )}&rater=${encodeURIComponent(rater)}`
        );
        const j = res.ok ? await res.json() : { exists: false };
        setAlready(!!j.exists);
        setInitialMajor(!!j.major_error); // NEW
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load.");
      }
    })();
  }, [id, rater]);

  const modelUsed = cg ? "chatgpt" : mg ? "medgemma" : "unknown";
  const comparison = cg?.comparison || mg?.comparison || "";
  const datasetId  = cg?.datasetid || mg?.datasetid || "";

  const originalDialogue = cg?.originalDialogue || mg?.originalDialogue || "";
  const originalNote     = cg?.originalNote || mg?.originalNote || "";
  const urduDialogue     = cg ? (cg.chatgptDial || "") : mg ? (mg.medDial || "") : "";
  const urduNote         = cg ? (cg.chatgptNote || "") : mg ? (mg.medNote || "") : "";

  const [engTab, setEngTab] = useState("dialogue");
  const [urdTab, setUrdTab] = useState("dialogue");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← Back</button>
        {err && <div className="text-sm text-red-700">{err}</div>}
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* English */}
        <div className="border rounded-2xl bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">English</div>
              <div className="mt-1 font-semibold">{engTab === "dialogue" ? "Original Dialogue" : "Original Note"}</div>
            </div>
            <button
              onClick={() => setEngTab(engTab === "dialogue" ? "note" : "dialogue")}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${engTab === "dialogue" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-orange-500 text-white hover:bg-orange-600"}`}
            >
              {engTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {engTab === "dialogue" ? (
              <pre className="whitespace-pre-wrap leading-relaxed text-[15px]">{originalDialogue || "(No dialogue found)"}</pre>
            ) : (
              <pre className="whitespace-pre-wrap leading-relaxed text-[14px]">{originalNote || "(No note)"}</pre>
            )}
          </div>
        </div>

        {/* Urdu */}
        <div className="border rounded-2xl bg-white flex flex-col overflow-hidden" dir="rtl">
          <div className="p-4 border-b flex items-center justify-between" dir="ltr">
            <div>
              <div className="text-xs text-gray-500">Urdu ({set === "set1" ? "Set 1" : "Set 2"})</div>
              <div className="mt-1 font-semibold">{urdTab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}</div>
            </div>
            <button
              onClick={() => setUrdTab(urdTab === "dialogue" ? "note" : "dialogue")}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${urdTab === "dialogue" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-orange-500 text-white hover:bg-orange-600"}`}
            >
              {urdTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {urdTab === "dialogue" ? (
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq text-xl leading-loose">{urduDialogue || "(No Urdu)"}</pre>
            ) : (
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq text-lg leading-relaxed">{urduNote || "(No note)"}</pre>
            )}
          </div>
        </div>
      </div>

      {/* Fixed rubric */}
      <div className="border-t bg-white p-4 shadow-md">
        <RubricForm
          disabledInitial={already}
          initialMajor={initialMajor}   // NEW
          itemId={id}
          datasetId={datasetId}
          comparison={comparison}
          modelUsed={modelUsed}
          rater={rater}
        />
      </div>
    </div>
  );
}
