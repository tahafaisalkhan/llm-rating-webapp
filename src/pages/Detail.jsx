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
  const [engTab, setEngTab] = useState("dialogue");
  const [urd1Tab, setUrd1Tab] = useState("dialogue");
  const [urd2Tab, setUrd2Tab] = useState("dialogue");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const all = await res.json();
        const hit = all.find((p) => String(p.comparison) === String(comparisonId));
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
          {err || "Loading…"}
        </div>
      </div>
    );
  }

  const datasetId = row.chatgpt?.datasetid || row.medgemma?.datasetid || "";
  const originalDialogue =
    row.chatgpt?.originalDialogue || row.medgemma?.originalDialogue || "";
  const originalNote =
    row.chatgpt?.originalNote || row.medgemma?.originalNote || "";

  const flip = (hash32(String(row.comparison)) & 1) === 1;
  const urdu1 = flip ? row.medgemma : row.chatgpt;
  const urdu2 = flip ? row.chatgpt : row.medgemma;

  const urdu1Dialogue = urdu1?.chatgptDial || urdu1?.medDial || "";
  const urdu1Note = urdu1?.chatgptNote || urdu1?.medNote || "";

  const urdu2Dialogue = urdu2?.chatgptDial || urdu2?.medDial || "";
  const urdu2Note = urdu2?.chatgptNote || urdu2?.medNote || "";

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
        {/* 3-panel layout: English + Urdu1 + Urdu2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <pre className="whitespace-pre-wrap leading-relaxed text-[15px]">
                {engTab === "dialogue"
                  ? originalDialogue || "(No dialogue found)"
                  : originalNote || "(No note)"}
              </pre>
            </div>
          </div>

          {/* Urdu 1 */}
          <div
            className="border rounded-2xl bg-white flex flex-col overflow-hidden font-nastaliq"
            dir="rtl"
          >
            <div className="p-4 border-b flex items-center justify-between" dir="ltr">
              <div>
                <div className="text-xs text-gray-500">Urdu 1</div>
                <div className="mt-1 font-semibold">
                  {urd1Tab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}
                </div>
              </div>
              <button
                onClick={() =>
                  setUrd1Tab(urd1Tab === "dialogue" ? "note" : "dialogue")
                }
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                  ${
                    urd1Tab === "dialogue"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
              >
                {urd1Tab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <pre
                dir="rtl"
                className="whitespace-pre-wrap text-xl leading-relaxed font-nastaliq"
              >
                {urd1Tab === "dialogue"
                  ? urdu1Dialogue || "(No Urdu)"
                  : urdu1Note || "(No note)"}
              </pre>
            </div>
          </div>

          {/* Urdu 2 */}
          <div
            className="border rounded-2xl bg-white flex flex-col overflow-hidden font-nastaliq"
            dir="rtl"
          >
            <div className="p-4 border-b flex items-center justify-between" dir="ltr">
              <div>
                <div className="text-xs text-gray-500">Urdu 2</div>
                <div className="mt-1 font-semibold">
                  {urd2Tab === "dialogue" ? "Urdu Dialogue" : "Urdu Note"}
                </div>
              </div>
              <button
                onClick={() =>
                  setUrd2Tab(urd2Tab === "dialogue" ? "note" : "dialogue")
                }
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition
                  ${
                    urd2Tab === "dialogue"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
              >
                {urd2Tab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <pre
                dir="rtl"
                className="whitespace-pre-wrap text-xl leading-relaxed font-nastaliq"
              >
                {urd2Tab === "dialogue"
                  ? urdu2Dialogue || "(No Urdu)"
                  : urdu2Note || "(No note)"}
              </pre>
            </div>
          </div>
        </div>

        {/* Rating panel */}
        <div className="border rounded-2xl bg-white p-4 shadow-md">
          <ComparisonRubricForm
            rater={rater}
            comparison={comparisonId}
            datasetId={datasetId}
          />
        </div>
      </div>
    </div>
  );
}
