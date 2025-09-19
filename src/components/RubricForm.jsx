import { useEffect, useMemo, useState } from "react";

/**
 * Props:
 *  - disabledInitial: boolean
 *  - itemId: string
 *  - datasetId: string
 *  - comparison: string
 *  - modelUsed: "gemma" | "medgemma"
 *  - rater: string
 *  - score: number | null
 *  - setScore: function (to update score in parent)
 */
export default function RubricForm({
  disabledInitial = false,
  itemId,
  datasetId,
  comparison,
  modelUsed,
  rater,
  score,
  setScore,
}) {
  // 8 axes, default 3
  const [scores, setScores] = useState([3, 3, 3, 3, 3, 3, 3, 3]);
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

  const AXES = useMemo(
    () => [
      {
        label: "Medical Accuracy",
        title:
          "Does the translation preserve all clinically relevant facts from the source?\n" +
          "- Symptom fidelity (pain, location, severity, etc.)\n" +
          "- Relevant history retained (past injuries, comorbidities)\n" +
          "- Findings/diagnosis correctly translated\n" +
          "- No hallucinated or missing details",
      },
      {
        label: "Clinical Safety for Handover Utility",
        title:
          "Could another clinician safely use this translation without risk of harm?\n" +
          "- Red-flag symptoms intact (chest pain, fever, pregnancy risks, etc.)\n" +
          "- Medication names, doses, units translated exactly\n" +
          "- Lab values / vitals correct and unaltered\n" +
          "- No dangerous omissions or misstatements",
      },
      {
        label: "Clinical Reasoning",
        title:
          "Does the reasoning remain clinically sound?\n" +
          "- Diagnosis plausible and consistent\n" +
          "- Suggested management aligns with medical standards\n" +
          "- Logical cause–effect preserved",
      },
      {
        label: "Linguistic Correctness (Urdu/English)",
        title:
          "Is the language fluent, correct, and terminologically faithful?\n" +
          "- Natural, idiomatic Urdu (not awkward literal translation)\n" +
          "- Consistent medical terminology\n" +
          "- Medication / diagnosis names accurately rendered\n" +
          "- Subtle clinical nuances (negations, temporality) preserved",
      },
      {
        label: "Precision in Medical Terminology",
        title:
          "Terminology precision and consistency:\n" +
          "- Consistent medical terms across the note\n" +
          "- Accurate medication/diagnosis naming\n" +
          "- Nuances (negations, temporality) preserved",
      },
      {
        label: "Structure & Flow",
        title:
          "Does the translation follow the structure and flow of the original consultation?\n" +
          "- Order of events preserved (symptom → history → exam → advice)\n" +
          "- Speaker turns clear (doctor vs patient)\n" +
          "- Coherent and easy to follow\n" +
          "- Professional, clinical tone",
      },
      {
        label: "Patient Interaction & Communication",
        title:
          "Does the translation preserve the human interaction?\n" +
          "- Empathy and reassurance intact\n" +
          "- Patient voice respected and accurately conveyed\n" +
          "- Clinician’s explanations remain clear and supportive\n" +
          "- Patient questions/concerns included",
      },
      {
        label: "Alignment to Source (“Traceability”)",
        title:
          "Can every sentence in the Urdu dialogue be traced back to the English source?\n" +
          "- If yes → fine.\n" +
          "- If no → mark as “unsupported” (hallucination or added knowledge).\n" +
          "- Note unsupported spans in Extra Comments, with severity (Minor / Moderate / Major).",
      },
    ],
    []
  );

  async function submit(e) {
    e.preventDefault();
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
          axis8: scores[7],
          comments: { extra: extra || "" },
        },
      };

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server error");
      }

      const j = await res.json();
      if (j && typeof j.total === "number" && setScore) {
        setScore(j.total); // update score immediately
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="font-semibold">Rubric (0–5)</div>
        <a
          href="https://drive.google.com/file/d/1lCHpJ-nyQmClnzvWNcsa_LOpegXOhUPP/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Press to go to rubric
        </a>
      </div>

      <div className="max-h-56 overflow-y-auto pr-1">
        <div className="space-y-2">
          {AXES.map((ax, i) => (
            <div
              key={ax.label}
              className="flex items-center justify-between gap-2"
              title={ax.title}
            >
              <div className="text-sm">{ax.label}</div>
              <Likert value={scores[i]} onChange={(v) => setAxis(i, v)} disabled={false} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">Extra Comments</div>
        <input
          type="text"
          placeholder="(optional) brief note"
          className="border rounded px-2 py-1 text-xs w-72"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-2 font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Submitting…" : locked ? "Resubmit" : "Submit"}
        </button>
        {score != null && (
          <div className="text-sm font-semibold">Score: {score}/40</div>
        )}
      </div>
    </form>
  );
}
