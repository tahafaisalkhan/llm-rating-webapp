import { useEffect, useState, useMemo } from "react";

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
  // 7 axes (default 3) + per-axis comment + optional extra comment
  const [scores, setScores] = useState([3, 3, 3, 3, 3, 3, 3]);
  const [comments, setComments] = useState(["", "", "", "", "", "", ""]);
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

  const setComment = (i, v) =>
    setComments((arr) => {
      const copy = arr.slice();
      copy[i] = v;
      return copy;
    });

  const AXES = useMemo(
    () => [
      {
        label: "Medical Accuracy & Completeness",
        hint:
          "All clinically relevant facts present, correct, not hallucinated. Subitems: symptom fidelity, history preserved, findings/diagnosis correctness, treatment fidelity.",
      },
      {
        label: "Clinical Safety & Handover Utility",
        hint:
          "Safe to hand over without harm. Subitems: red-flags preserved; medication names/doses/units exact; labs/vitals intact; no dangerous omissions.",
      },
      {
        label: "Guideline Alignment & Clinical Reasoning",
        hint:
          "Diagnosis/management align with standard practice. Subitems: diagnosis appropriateness; management aligns with guidelines; reasoning consistent.",
      },
      {
        label: "Structure, Flow & Communication",
        hint:
          "Clear, coherent, faithful to consultation. Subitems: proper sectioning (S/O/A/P); chronology preserved; clear turns/transitions; clarity of explanations; key patient statements; respectful tone.",
      },
      {
        label: "Communication, Rapport & Patient Engagement",
        hint:
          "Human interaction preserved. Subitems: clarity of explanations, respectful tone, empathy, patient participation, concerns addressed, education included.",
      },
      {
        label: "Alignment Task",
        hint:
          "Each note sentence traceable to dialogue. If not, it’s unsupported (hallucination/added knowledge).",
      },
      {
        label: "Language & Terminology",
        hint:
          "Idiomatic Urdu, consistent medical terms, glossary adherence.",
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
          comments: {
            axis1: comments[0] || "",
            axis2: comments[1] || "",
            axis3: comments[2] || "",
            axis4: comments[3] || "",
            axis5: comments[4] || "",
            axis6: comments[5] || "",
            axis7: comments[6] || "",
            extra: extra || "",
          },
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

  const Likert = ({ value, onChange, disabled }) => (
    <div className="flex items-center gap-2 text-[15px] select-none">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="inline-flex items-center gap-1">
          <input
            type="radio"
            name={"likert-" + Math.random().toString(36).slice(2)}
            disabled={disabled}
            checked={value === n}
            onChange={() => onChange(n)}
            className="h-4 w-4"
          />
          <span>{n}</span>
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="font-semibold">Rubric (0–5)</div>

      {/* 7 axes */}
      {AXES.map((ax, i) => (
        <div key={ax.label} className="flex items-start justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">{ax.label}</div>
            <div className="text-xs text-gray-500">{ax.hint}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Likert
              value={scores[i]}
              onChange={(v) => setAxis(i, v)}
              disabled={locked}
            />
            {/* compact comment input to keep panel height similar */}
            <input
              type="text"
              placeholder="1–2 lines on major deductions (optional)"
              className="border rounded px-2 py-1 text-xs w-72"
              disabled={locked}
              value={comments[i]}
              onChange={(e) => setComment(i, e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Optional extra comment box */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">Optional Open Axis — Extra Comment</div>
          <div className="text-xs text-gray-500">
            Explicit notes on hallucination/mistranslation or anything not covered above.
          </div>
        </div>
        <input
          type="text"
          placeholder="Optional extra note"
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
