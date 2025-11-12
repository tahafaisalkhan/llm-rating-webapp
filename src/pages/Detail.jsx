// src/pages/Detail.jsx
import React, { startTransition, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRater } from "../utils/auth";
import ComparisonRubricForm from "../components/ComparisonRubricForm";

// Memoized heavy <pre> to avoid re-rendering big text blocks on checklist updates
const PreBlock = React.memo(function PreBlock({ text, dir = "ltr", className = "" }) {
  return <pre dir={dir} className={`whitespace-pre-wrap ${className}`}>{text}</pre>;
});

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

  // tab state
  const [engTab, setEngTab] = useState("dialogue");
  const [urd1Tab, setUrd1Tab] = useState("dialogue");
  const [urd2Tab, setUrd2Tab] = useState("dialogue");

  // whether notes have been opened (persisted via DB)
  const [seenEnglishNote, setSeenEnglishNote] = useState(false);
  const [seenUrdu1Note, setSeenUrdu1Note] = useState(false);
  const [seenUrdu2Note, setSeenUrdu2Note] = useState(false);

  // checklist chip/dropdown state (fed by ComparisonRubricForm via CustomEvent)
  const [checklist, setChecklist] = useState({
    allComplete: false,
    totalMissing: 0,
    missingRelative: [],
    missingAbsolute: [],
    missingOther: [],
  });
  const [showChecklist, setShowChecklist] = useState(false);

  // listen to broadcasted checklist updates from the form
  useEffect(() => {
    function handler(e) {
      const detail = e.detail || {};
      // Mark as non-urgent so clicks stay snappy
      startTransition(() => {
        setChecklist({
          allComplete: !!detail.allComplete,
          totalMissing: Number(detail.totalMissing || 0),
          missingRelative: detail.missingRelative || [],
          missingAbsolute: detail.missingAbsolute || [],
          missingOther: detail.missingOther || [],
        });
      });
    }
    window.addEventListener("rating-checklist", handler);
    return () => window.removeEventListener("rating-checklist", handler);
  }, []);

  async function logNoteClick(which) {
    try {
      await fetch("/api/note-counter/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rater,
          comparison: comparisonId,
          which,
        }),
      });
    } catch (e) {
      console.error("Failed to log note click", e);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        // Load case data
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const all = await res.json();
        const arr = Array.isArray(all) ? all : [];
        const hit =
          arr.find((p) => String(p.comparison) === String(comparisonId)) || null;
        if (!hit) throw new Error("Case not found");
        setRow(hit);

        // ✅ Load existing note click counts
        const q = new URLSearchParams({ rater, comparison: comparisonId });
        const res2 = await fetch(`/api/note-counter/get?${q}`);
        if (res2.ok) {
          const j = await res2.json();
          if (j.exists) {
            setSeenEnglishNote((j.englishNote || 0) > 0);
            setSeenUrdu1Note((j.urdu1Note || 0) > 0);
            setSeenUrdu2Note((j.urdu2Note || 0) > 0);
          }
        }
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load case.");
      }
    })();
  }, [comparisonId, rater]);

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

  const urdu1Id = urdu1?.id || "";
  const urdu2Id = urdu2?.id || "";

  const closeChecklist = () => setShowChecklist(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-2 border-b bg-gray-50 relative">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT cluster: Back + case info */}
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

          {/* RIGHT cluster: errors */}
          {err && <div className="text-sm text-red-700">{err}</div>}
        </div>

        {/* CENTER: status chip + dropdown (absolute, aligned near back but centered in bar) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex justify-center">
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowChecklist((v) => !v)}
                aria-expanded={showChecklist ? "true" : "false"}
                className={[
                  "px-3 py-1 text-xs font-semibold rounded-full border shadow-sm",
                  checklist.allComplete
                    ? "bg-green-600 text-white border-green-700"
                    : "bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100",
                ].join(" ")}
                title={
                  checklist.allComplete
                    ? "Everything complete"
                    : "Click to see what's missing"
                }
              >
                {checklist.allComplete
                  ? "Everything complete"
                  : "All ratings not complete — click to see what's missing"}
              </button>

              {showChecklist && (
                <div className="absolute z-20 mt-2 w-[28rem] max-w-[90vw] left-1/2 -translate-x-1/2 bg-white border rounded-xl shadow-lg p-3">
                  {checklist.totalMissing === 0 ? (
                    <div className="text-sm text-green-700">
                      ✅ You're all set. Nothing missing.
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {checklist.missingRelative?.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">
                            Relative grading
                          </div>
                          <ul className="list-disc ml-5 space-y-0.5">
                            {checklist.missingRelative.map((m, i) => (
                              <li key={`rel-${i}`}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {checklist.missingAbsolute?.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">
                            Absolute grading
                          </div>
                          <ul className="list-disc ml-5 space-y-0.5">
                            {checklist.missingAbsolute.map((m, i) => (
                              <li key={`abs-${i}`}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {checklist.missingOther?.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">
                            Other required steps
                          </div>
                          <ul className="list-disc ml-5 space-y-0.5">
                            {checklist.missingOther.map((m, i) => (
                              <li key={`oth-${i}`}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* click-away to close dropdown */}
        {showChecklist && (
          <div
            className="fixed inset-0 z-10"
            onClick={closeChecklist}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* English */}
          <div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]">
            <div className="p-3 border-b flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">English</div>
                <div className="mt-1 font-semibold text-sm">
                  {engTab === "dialogue" ? "Original Dialogue" : "Original Note"}
                </div>
              </div>
              <button
                onClick={() => {
                  const next = engTab === "dialogue" ? "note" : "dialogue";
                  setEngTab(next);
                  if (next === "note") {
                    logNoteClick("english");
                    setSeenEnglishNote(true);
                  }
                }}
                className={`text-xs px-2 py-1 rounded-lg font-semibold transition ${
                  engTab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {engTab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-sm leading-relaxed">
              <PreBlock text={engTab === "dialogue" ? originalDialogue : (originalNote || "(No note)")} />
            </div>
          </div>

          {/* Urdu 1 */}
          <div
            className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]"
            dir="rtl"
          >
            <div className="p-3 border-b flex items-center justify-between" dir="ltr">
              <div>
                <div className="mt-1 font-semibold text-sm">
                  {urd1Tab === "dialogue" ? "Urdu Dialogue 1" : "Urdu Note"}
                </div>
              </div>
              <button
                onClick={() => {
                  const next = urd1Tab === "dialogue" ? "note" : "dialogue";
                  setUrd1Tab(next);
                  if (next === "note") {
                    logNoteClick("urdu1");
                    setSeenUrdu1Note(true);
                  }
                }}
                className={`text-xs px-2 py-1 rounded-lg font-semibold transition ${
                  urd1Tab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {urd1Tab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-base font-nastaliq leading-relaxed">
              <PreBlock
                dir="rtl"
                className=""
                text={urd1Tab === "dialogue" ? urdu1Dialogue : (urdu1Note || "(No Urdu)")}
              />
            </div>
          </div>

          {/* Urdu 2 */}
          <div
            className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]"
            dir="rtl"
          >
            <div className="p-3 border-b flex items-center justify-between" dir="ltr">
              <div>
                <div className="mt-1 font-semibold text-sm">
                  {urd2Tab === "dialogue" ? "Urdu Dialogue 2" : "Urdu Note"}
                </div>
              </div>
              <button
                onClick={() => {
                  const next = urd2Tab === "dialogue" ? "note" : "dialogue";
                  setUrd2Tab(next);
                  if (next === "note") {
                    logNoteClick("urdu2");
                    setSeenUrdu2Note(true);
                  }
                }}
                className={`text-xs px-2 py-1 rounded-lg font-semibold transition ${
                  urd2Tab === "dialogue"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {urd2Tab === "dialogue" ? "Go to Note" : "Go to Dialogue"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-base font-nastaliq leading-relaxed">
              <PreBlock
                dir="rtl"
                className=""
                text={urd2Tab === "dialogue" ? urdu2Dialogue : (urdu2Note || "(No Urdu)")}
              />
            </div>
          </div>
        </div>

        {/* Rating panel */}
        <div className="border rounded-2xl bg-white p-4 shadow-md">
          <ComparisonRubricForm
            rater={rater}
            comparison={comparisonId}
            datasetId={datasetId}
            startedAtMs={startedAtMs}
            urdu1={urdu1Id}
            urdu2={urdu2Id}
            notesViewed={{
              english: seenEnglishNote,
              urdu1: seenUrdu1Note,
              urdu2: seenUrdu2Note,
            }}
          />
        </div>
      </div>
    </div>
  );
}
