import { useEffect, useState } from "react";

/**
 * Props:
 *  - disabledInitial: boolean (already submitted by this rater)
 *  - itemId: string (modelId)
 *  - datasetId: string
 *  - comparison: string
 *  - modelUsed: "chatgpt" | "medgemma"
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
        modelId: itemId,
        datasetId,
        comparison,
        modelUsed,
        rater,
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

      <Row
        label="Medical accuracy & completeness"
        control={
          <Likert value={scores[0]} onChange={(v) => setAxis(0, v)} disabled={locked} />
        }
      />
      <Row
        label="Communication & rapport"
        control={
          <Likert value={scores[1]} onChange={(v) => setAxis(1, v)} disabled={locked} />
        }
      />
      <Row
        label="Structure & flow"
        control={
          <Likert value={scores[2]} onChange={(v) => setAxis(2, v)} disabled={locked} />
        }
      />
      <Row
        label="Language & terminology"
        control={
          <Likert value={scores[3]} onChange={(v) => setAxis(3, v)} disabled={locked} />
        }
      />
      <Row
        label="Patient-safety & handover utility"
        control={
          <Likert value={scores[4]} onChange={(v) => setAxis(4, v)} disabled={locked} />
        }
      />

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

/** Likert scale (0–5) with slightly bigger font + buttons */
function Likert({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium
            ${value === n ? "bg-blue-600 text-white border-blue-600" : "border-gray-400 text-gray-700"}
            ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-blue-600"}
          `}
          aria-label={`score ${n}`}
          title={`${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Row({ label, control }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <div>{control}</div>
    </div>
  );
}
