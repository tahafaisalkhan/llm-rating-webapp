import { useEffect, useMemo, useState } from "react";

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
  // 7 axes, default 3
  const [scores, setScores] = useState([3, 3, 3, 3, 3, 3, 3]);
  const [extra, setExtra] = useState("");

  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(!!disabledInitial);
  const [err, setErr] = useState("");

  useEffect(() => setLocked(!!disabledInitial), [disabledInitial]);

  const setAxis = (i, v) =>
    setScores((arr) => {
      const copy = arr.slice();
      copy[i] = Number(v);
      return copy;
    });

  // EXACT order requested:
  const AXES = useMemo(
    () => [
      {
        label: "Medical Accuracy & Completeness",
        title:
          "All clinically relevant facts present, correct, not hallucinated (symptoms/history/findings/treatment).",
      },
      {
        label: "Clinical Safety & Handover Utility",
        title:
          "Safe to hand over (red-flags preserved; exact meds/labs/vitals; no dangerous omissions).",
      },
      {
        label: "Guideline Alignment & Clinical Reasoning",
        title:
          "Diagnosis/management align with guidelines; reasoning consistent with medical logic.",
      },
      {
        label: "Language & Terminology Accuracy",
        title: "Idiomatic Urdu; consistent medical terms; glossary adherence.",
      },
      {
        label: "Structure, Flow & Communication",
        title:
          "Clear sectioning (S/O/A/P), chronology, speaker turns, explanations, key patient statements, respectful tone.",
      },
      {
        label: "Communication, Rapport & Patient Engagement",
        title:
          "Clarity of explanations, respectful tone, empathy, participation, concerns addressed, education included.",
      },
      {
        label: "Alignment to Source (“traceability”)",
        title:
          "Each note sentence traceable to dialogue; unsupported = hallucination/added knowledge.",
      },
    ],
    []
  );

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
          axis6: scores[5],
          axis7: scores[6],
          comments: { extra: extra || "" }, // only single extra note
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

  const Likert = ({ value, onChange, disabled }) => (
    <div className="flex items-center gap-2 text-[13px] select-none">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="inline-flex items-center gap-1">
          <input
            type="radio"
            name={"likert-" + Math.random().toString(36).slice(2)}
            disabled={disabled}
            checked={value === n}
            onChange={() => onChange(n)}
            className="h-3.5 w-3.5"
          />
          <span>{n}</span>
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="font-semibold">Rubric (0–5)</div>

      {/* Keep compact/scrollable sizing as before */}
      <div className="max-h-56 overflow-y-auto pr-1">
        <div className="space-y-2">
          {AXES.map((ax, i) => (
            <div
              key={ax.label}
              className="flex items-center justify-between gap-3"
              title={ax.title}
            >
              <div className="text-sm">{ax.label}</div>
              <Likert
                value={scores[i]}
                onChange={(v) => setAxis(i, v)}
                disabled={locked}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Only one optional extra note */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">Extra Comments</div>
        <input
          type="text"
          placeholder="(optional) brief note"
          className="border rounded px-2 py-1 text-xs w-72"
          disabled={locked}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
      </div>

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
