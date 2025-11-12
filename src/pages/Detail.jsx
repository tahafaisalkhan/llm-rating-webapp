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
  const [startedAtMs] = useState(() => Date.now());

  // tab state
  const [engTab, setEngTab] = useState("dialogue");
  const [urd1Tab, setUrd1Tab] = useState("dialogue");
  const [urd2Tab, setUrd2Tab] = useState("dialogue");

  // whether notes have been opened (persisted via DB)
  const [seenEnglishNote, setSeenEnglishNote] = useState(false);
  const [seenUrdu1Note, setSeenUrdu1Note] = useState(false);
  const [seenUrdu2Note, setSeenUrdu2Note] = useState(false);

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
        const hit = arr.find((p) => String(p.comparison) === String(comparisonId)) || null;
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
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">
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
              <pre className="whitespace-pre-wrap">
                {engTab === "dialogue" ? originalDialogue : originalNote || "(No note)"}
              </pre>
            </div>
          </div>

{/* Urdu 1 */}
<div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]" dir="rtl">
  <div className="p-3 border-b flex items-center justify-between" dir="ltr">
    <div><div className="mt-1 font-semibold text-sm">{urd1Tab === "dialogue" ? "Urdu Dialogue 1" : "Urdu Note"}</div></div>
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
    <pre
      dir="rtl"
      className="whitespace-pre-wrap font-nastaliq leading-[2.1rem] tracking-[0.02em]"
    >
      {urd1Tab === "dialogue" ? urdu1Dialogue : urdu1Note || "(No Urdu)"}
    </pre>
  </div>
</div>

{/* Urdu 2 */}
<div className="border rounded-2xl bg-white flex flex-col overflow-hidden max-h-[25rem]" dir="rtl">
  <div className="p-3 border-b flex items-center justify-between" dir="ltr">
    <div><div className="mt-1 font-semibold text-sm">{urd2Tab === "dialogue" ? "Urdu Dialogue 2" : "Urdu Note"}</div></div>
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
    <pre
      dir="rtl"
      className="whitespace-pre-wrap font-nastaliq leading-[2.1rem] tracking-[0.02em]"
    >
      {urd2Tab === "dialogue" ? urdu2Dialogue : urdu2Note || "(No Urdu)"}
    </pre>
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
