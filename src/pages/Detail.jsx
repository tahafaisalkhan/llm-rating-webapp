// src/pages/Detail.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RubricForm from "../components/RubricForm";
import { getRater } from "../utils/auth";

export default function Detail() {
  const { comparisonId } = useParams(); // comparison id
  const navigate = useNavigate();

  const [cg, setCg] = useState(null); // Gemma row
  const [mg, setMg] = useState(null); // MedGemma row
  const [err, setErr] = useState("");

  const [alreadyGemma, setAlreadyGemma] = useState(false);
  const [scoreGemma, setScoreGemma] = useState(null);

  const [alreadyMed, setAlreadyMed] = useState(false);
  const [scoreMed, setScoreMed] = useState(null);

  const rater = getRater() || "";

  const [engTab, setEngTab] = useState("dialogue");
  const [urdGemTab, setUrdGemTab] = useState("dialogue");
  const [urdMedTab, setUrdMedTab] = useState("dialogue");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setCg(null);
        setMg(null);
        setAlreadyGemma(false);
        setAlreadyMed(false);
        setScoreGemma(null);
        setScoreMed(null);

        const [cgRes, mgRes] = await Promise.all([
          fetch("/data/chatgpt.json"),
          fetch("/data/medgemma.json"),
        ]);
        if (!cgRes.ok || !mgRes.ok)
          throw new Error("Missing JSON (run npm run build:data)");

        const [cgAll, mgAll] = await Promise.all([cgRes.json(), mgRes.json()]);

        // Find rows for this comparison
        const cgRow =
          cgAll.find(
            (r) => String(r.comparison) === String(comparisonId)
          ) || null;
        const mgRow =
          mgAll.find(
            (r) => String(r.comparison) === String(comparisonId)
          ) || null;

        setCg(cgRow);
        setMg(mgRow);

        // Fetch rating status for each translation
        if (cgRow) {
          const resG = await fetch(
            `/api/ratings/status?modelUsed=${encodeURIComponent(
              "gemma"
            )}&modelId=${encodeURIComponent(
              cgRow.id
            )}&rater=${encodeURIComponent(rater)}`
          );
          const jG = resG.ok ? await resG.json() : { exists: false };
          setAlreadyGemma(!!jG.exists);
          if (jG && typeof jG.total === "number") setScoreGemma(jG.total);
        }

        if (mgRow) {
          const resM = await fetch(
            `/api/ratings/status?modelUsed=${encodeURIComponent(
              "medgemma"
            )}&modelId=${encodeURIComponent(
              mgRow.id
            )}&rater=${encodeURIComponent(rater)}`
          );
          const jM = resM.ok ? await resM.json() : { exists: false };
          setAlreadyMed(!!jM.exists);
          if (jM && typeof jM.total === "number") setScoreMed(jM.total);
        }
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load.");
      }
    })();
  }, [comparisonId, rater]);

  const datasetId = cg?.datasetid || mg?.datasetid || "";
  const originalDialogue = cg?.originalDialogue || mg?.originalDialogue || "";
  const originalNote = cg?.originalNote || mg?.originalNote || "";

  const urduDialogueGemma = cg?.chatgptDial || "";
  const urduNoteGemma = cg?.chatgptNote || "";

  const urduDialogueMed = mg?.medDial || "";
  const urduNoteMed = mg?.medNote || "";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <div className="text-xs text-gray-500">
            Case #{comparisonId} &middot; DatasetID:{" "}
            <span className="font-semibold">{datasetId || "-"}</span>
          </div>
        </div>
        {err && <div className="text-sm text-red-700">{err}</div>}
      </div>

      {/* Main text area */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* English */}
        <div className="border rounded-2xl bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">English</div>
              <div className="mt-1 font-semibold">
                {engTab === "dialogue" ? "Original Dialogue" : "Original Note"}
              </div>
            </div>
            <button
              onClick={() =>
                setEngTab(engTab === "dialogue" ? "note" : "dialogue")
              }
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${
                  engTab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
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

        {/* Urdu – Gemma */}
        <div
          className="border rounded-2xl bg-white flex flex-col overflow-hidden"
          dir="rtl"
        >
          <div className="p-4 border-b flex items-center justify-between" dir="ltr">
            <div>
              <div className="text-xs text-gray-500">
                Urdu (Gemma Translation)
              </div>
              <div className="mt-1 font-semibold">
                {urdGemTab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}
              </div>
            </div>
            <button
              onClick={() =>
                setUrdGemTab(
                  urdGemTab === "dialogue" ? "note" : "dialogue"
                )
              }
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${
                  urdGemTab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
            >
              {urdGemTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {urdGemTab === "dialogue" ? (
              <pre
                dir="rtl"
                className="whitespace-pre-wrap font-nastaliq text-xl leading-loose"
              >
                {urduDialogueGemma || "(No Urdu)"}
              </pre>
            ) : (
              <pre
                dir="rtl"
                className="whitespace-pre-wrap font-nastaliq text-lg leading-relaxed"
              >
                {urduNoteGemma || "(No note)"}
              </pre>
            )}
          </div>
        </div>

        {/* Urdu – MedGemma */}
        <div
          className="border rounded-2xl bg-white flex flex-col overflow-hidden"
          dir="rtl"
        >
          <div className="p-4 border-b flex items-center justify-between" dir="ltr">
            <div>
              <div className="text-xs text-gray-500">
                Urdu (MedGemma Translation)
              </div>
              <div className="mt-1 font-semibold">
                {urdMedTab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}
              </div>
            </div>
            <button
              onClick={() =>
                setUrdMedTab(
                  urdMedTab === "dialogue" ? "note" : "dialogue"
                )
              }
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                ${
                  urdMedTab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
            >
              {urdMedTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {urdMedTab === "dialogue" ? (
              <pre
                dir="rtl"
                className="whitespace-pre-wrap font-nastaliq text-xl leading-loose"
              >
                {urduDialogueMed || "(No Urdu)"}
              </pre>
            ) : (
              <pre
                dir="rtl"
                className="whitespace-pre-wrap font-nastaliq text-lg leading-relaxed"
              >
                {urduNoteMed || "(No note)"}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Rubrics for both models */}
      <div className="border-t bg-white p-4 shadow-md">
        <div className="mb-2 font-semibold text-sm">
          Rate each Urdu translation separately:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cg && (
            <div>
              <div className="mb-1 text-sm font-semibold">
                Gemma Translation
              </div>
              <RubricForm
                disabledInitial={alreadyGemma}
                itemId={cg.id}
                datasetId={datasetId}
                comparison={comparisonId}
                modelUsed="gemma"
                rater={rater}
                score={scoreGemma}
                setScore={setScoreGemma}
              />
            </div>
          )}

          {mg && (
            <div>
              <div className="mb-1 text-sm font-semibold">
                MedGemma Translation
              </div>
              <RubricForm
                disabledInitial={alreadyMed}
                itemId={mg.id}
                datasetId={datasetId}
                comparison={comparisonId}
                modelUsed="medgemma"
                rater={rater}
                score={scoreMed}
                setScore={setScoreMed}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
