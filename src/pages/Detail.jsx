// src/pages/Detail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRater } from "../utils/auth";
import ComparisonRubricForm from "../components/ComparisonRubricForm";

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
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
        if (!res.ok) throw new Error("Missing paired.json");

        const all = await res.json();
        const hit = all.find((p) => String(p.comparison) === String(comparisonId));
        if (!hit) throw new Error("Case not found");
        setRow(hit);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [comparisonId]);

  if (!row) {
    return (
      <div className="h-screen flex flex-col">
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600">
            ← Back
          </button>
          <div className="ml-3 text-xs text-gray-500">Case #{comparisonId}</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          {err || "Loading…"}
        </div>
      </div>
    );
  }

  const datasetId =
    row.chatgpt?.datasetid || row.medgemma?.datasetid || "";

  const flip = (hash32(String(row.comparison)) & 1) === 1;

  const urdu1 = flip ? row.medgemma : row.chatgpt;
  const urdu2 = flip ? row.chatgpt : row.medgemma;

  const englishDialogue =
    row.chatgpt?.originalDialogue || row.medgemma?.originalDialogue || "";

  const urdu1Dialogue = urdu1?.chatgptDial || urdu1?.medDial || "";
  const urdu2Dialogue = urdu2?.chatgptDial || urdu2?.medDial || "";

  const urdu1Id = urdu1?.id || "";
  const urdu2Id = urdu2?.id || "";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600">
            ← Back
          </button>

          <div className="text-xs text-gray-500">
            Case #{comparisonId} · DatasetID:
            <span className="font-semibold ml-1">{datasetId || "-"}</span>
          </div>
        </div>
        {err && <div className="text-sm text-red-700">{err}</div>}
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* English Dialogue */}
          <div className="border rounded-2xl bg-white p-3 overflow-hidden max-h-[25rem]">
            <div className="text-xs text-gray-500">English</div>
            <div className="mt-1 font-semibold text-sm">Original Dialogue</div>
            <div className="flex-1 overflow-y-auto mt-2 text-sm leading-relaxed">
              <pre className="whitespace-pre-wrap">{englishDialogue}</pre>
            </div>
          </div>

          {/* Urdu Dialogue 1 */}
          <div
            className="border rounded-2xl bg-white p-3 overflow-hidden max-h-[25rem]"
            dir="rtl"
          >
            <div className="text-xs text-gray-500" dir="ltr">
              Urdu 1
            </div>
            <div className="mt-1 font-semibold text-sm" dir="ltr">
              Urdu Dialogue
            </div>

            <div className="flex-1 overflow-y-auto mt-2 text-base font-nastaliq leading-relaxed">
              <pre dir="rtl" className="whitespace-pre-wrap">
                {urdu1Dialogue}
              </pre>
            </div>
          </div>

          {/* Urdu Dialogue 2 */}
          <div
            className="border rounded-2xl bg-white p-3 overflow-hidden max-h-[25rem]"
            dir="rtl"
          >
            <div className="text-xs text-gray-500" dir="ltr">
              Urdu 2
            </div>
            <div className="mt-1 font-semibold text-sm" dir="ltr">
              Urdu Dialogue
            </div>

            <div className="flex-1 overflow-y-auto mt-2 text-base font-nastaliq leading-relaxed">
              <pre dir="rtl" className="whitespace-pre-wrap">
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
