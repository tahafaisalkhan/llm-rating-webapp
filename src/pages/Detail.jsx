import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRater } from "../utils/auth";
import ComparisonRubricForm from "../components/ComparisonRubricForm";

/* -------------------------------
   HASH + SALT (DROP-IN UPDATE)
--------------------------------*/
const SALT = "u3J9sD82naLKf9203nFhsaf"; // any fixed string

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

export default function Detail() {
  const { comparisonId } = useParams();
  const navigate = useNavigate();
  const rater = getRater() || "";

  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");
  const [startedAtMs] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const all = await res.json();
        const arr = Array.isArray(all) ? all : [];
        const hit = arr.find(
          (p) => String(p.comparison) === String(comparisonId)
        );
        if (!hit) throw new Error("Case not found");
        setRow(hit);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load case.");
      }
    })();
  }, [comparisonId]);

  if (!row) {
    return (
      <div className="h-screen flex flex-col">
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <div className="text-xs text-gray-500">Case #{comparisonId}</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          {err ? err : "Loading…"}
        </div>
      </div>
    );
  }

  const datasetId =
    row.chatgpt?.datasetid || row.medgemma?.datasetid || "";

  const originalDialogue =
    row.chatgpt?.originalDialogue || row.medgemma?.originalDialogue || "";

  /* -------------------------------
     FLIP USING SALTED HASH
  --------------------------------*/
  const saltedKey = SALT + String(row.comparison);
  const flip = (hash32(saltedKey) & 1) === 1;

  const urdu1 = flip ? row.medgemma : row.chatgpt;
  const urdu2 = flip ? row.chatgpt : row.medgemma;

  const urdu1Dialogue = urdu1?.chatgptDial || urdu1?.medDial || "";
  const urdu2Dialogue = urdu2?.chatgptDial || urdu2?.medDial || "";

  const urdu1Id = urdu1?.id || "";
  const urdu2Id = urdu2?.id || "";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <div className="text-xs text-gray-500">
            Case #{comparisonId} · DatasetID:{" "}
            <span className="font-semibold">{datasetId || "-"}</span>
          </div>
        </div>
        {err && <div className="text-sm text-red-700">{err}</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* English Dialogue */}
          <div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]">
            <div className="p-3 border-b">
              <div className="text-xs text-gray-500">English</div>
              <div className="mt-1 font-semibold text-sm">Original Dialogue</div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-sm leading-relaxed">
              <pre className="whitespace-pre-wrap">{originalDialogue}</pre>
            </div>
          </div>

          {/* Urdu 1 */}
          <div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]" dir="rtl">
            <div className="p-3 border-b" dir="ltr">
              <div className="mt-1 font-semibold text-sm">Urdu Dialogue 1</div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-base font-nastaliq leading-relaxed">
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq leading-[2.1rem] tracking-[0.02em]">
                {urdu1Dialogue}
              </pre>
            </div>
          </div>

          {/* Urdu 2 */}
          <div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]" dir="rtl">
            <div className="p-3 border-b" dir="ltr">
              <div className="mt-1 font-semibold text-sm">Urdu Dialogue 2</div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-base font-nastaliq leading-relaxed">
              <pre dir="rtl" className="whitespace-pre-wrap font-nastaliq leading-[2.1rem] tracking-[0.02em]">
                {urdu2Dialogue}
              </pre>
            </div>
          </div>
        </div>

        {/* Rating Form */}
        <div className="border rounded-2xl bg-white p-4 shadow-md">
          <ComparisonRubricForm
            rater={rater}
            comparison={comparisonId}
            datasetId={datasetId}
            startedAtMs={startedAtMs}
            urdu1={urdu1Id}
            urdu2={urdu2Id}
          />
        </div>
      </div>
    </div>
  );
}
