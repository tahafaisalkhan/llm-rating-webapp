// src/components/RubricForm.jsx
import { useEffect, useState } from "react";

/**
 * Props:
 *  - disabledInitial: boolean
 *  - itemId: string
 *  - datasetId: string
 *  - comparison: string
 *  - modelUsed: "chatgpt" | "medgemma" | "unknown"
 *  - rater: string (USERX)
 */
export default function RubricForm({
  disabledInitial = false,
  itemId,
  datasetId,
  comparison,
  modelUsed,
  rater,
}) {
  const [scores, setScores] = useState([3, 3, 3, 3, 3]);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(!!disabledInitial);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLocked(!!disabledInitial);
  }, [disabledInitial]);

  const setAxis = (i, v) =>
    setScores((arr) => {
      const copy = arr.slice();
      copy[i] = Number(v);
      return copy;
    });

  async function submit(e) {
    e.preventDefault();
    if (locked) return;
    setSaving(true);
    setErr("");

    try {
      const body = {
        rater,
        modelId: itemId,
        datasetId,
        modelUsed,
        comparison,
        scores: {
          axis1: scores[0],
          axis2: scores[1],
          axis3: scores[2],
          axis4: scores[3],
          axis5: scores[4],
        },
      };

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setLocked(true);
        setSaving(false);
        setErr("");
        alert("You already submitted a rating for this item.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server error");
      }

      setLocked(true);
      setSaving(false);
      alert("Rating submitted. Thank you!");
    } catch (e2) {
      console.error(e2);
      setErr(e2.message || "Failed to submit.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="font-semibold">Rubric (0–5)</div>

      <Row label="Medical accuracy & completeness" value={scores[0]} onChange={(v) => setAxis(0, v)} />
      <Row label="Communication & rapport"        value={scores[1]} onChange={(v) => setAxis(1, v)} />
      <Row label="Structure & flow"               value={scores[2]} onChange={(v) => setAxis(2, v)} />
      <Row label="Language & terminology"         value={scores[3]} onChange={(v) => setAxis(3, v)} />
      <Row label="Patient-safety & handover utility" value={scores[4]} onChange={(v) => setAxis(4, v)} />

      {err && <div className="text-sm text-red-700">{err}</div>}

      {locked ? (
        <div className="text-green-700 font-semibold">✓ Submitted</div>
      ) : (
        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-2 font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Submitting…" : "Submit"}
        </button>
      )}
    </form>
  );
}

function Row({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <Likert value={value} onChange={onChange} />
    </div>
  );
}

function Likert({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {Array.from({ length: 6 }).map((_, n) => (
        <label key={n} className="inline-flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name={`likert-${Math.random().toString(36).slice(2)}`}
            className="accent-black"
            checked={value === n}
            onChange={() => onChange(n)}
            disabled={false}
          />
          <span>{n}</span>
        </label>
      ))}
    </div>
  );
}
