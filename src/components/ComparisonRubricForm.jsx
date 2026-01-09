// src/components/ComparisonRubricForm.jsx
import { useEffect, useMemo, useState } from "react";

const AXIS_SCROLL_MAX_H_CLASS = "max-h-[12rem]";

export default function ComparisonRubricForm({
  rater,
  comparison,
  datasetId,
  startedAtMs,
  urdu1,
  urdu2,
}) {
  const [axes, setAxes] = useState(() =>
    Array.from({ length: 8 }).map(() => ({
      winner: null,
      strength: null,
      tieQuality: null,
    }))
  );

  const [relativeOverall, setRelativeOverall] = useState({
    winner: null,
    strength: null,
    tieQuality: null,
  });

  const [absoluteOverall, setAbsoluteOverall] = useState({
    t1: null,
    t2: null,
  });

  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [err, setErr] = useState("");

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingList, setMissingList] = useState([]);

  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!showMissingModal) return;
    const timer = setTimeout(() => setShowMissingModal(false), 10000);
    return () => clearTimeout(timer);
  }, [showMissingModal]);

  const [mode, setMode] = useState("relative");

  const AXES_META = useMemo(
    () => [
      { label: "1. Medical Accuracy", description: "Are diagnoses, treatments, and facts medically correct with no major errors?" },
      { label: "2. Clinical Safety for Handover Utility", description: "Would this translation be safe and reliable to use in a real clinical handover?" },
      { label: "3. Clinical Reasoning", description: "Does the translation preserve the reasoning, differential diagnoses, and rationale?" },
      { label: "4. Linguistic Correctness (Urdu/English)", description: "Is the language grammatically correct, natural, and free of major linguistic issues?" },
      { label: "5. Precision in Medical Terminology", description: "Does it use accurate and precise medical terms instead of vague or incorrect wording?" },
      { label: "6. Structure & Flow", description: "Is the content well-organized, coherent, and easy to follow as a clinical narrative?" },
      { label: "7. Patient Interaction & Communication", description: "Does it preserve empathy, clarity, and appropriateness of communication with the patient?" },
      { label: "8. Alignment to Source (Traceability)", description: "Does it faithfully reflect the original English dialogue without omissions or additions?" },
    ],
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ comparison: String(comparison), rater });
        const res = await fetch(`/api/comparison-ratings/get?${qs}`);
        if (!res.ok) return;

        const j = await res.json();
        if (!j.exists) return;

        if (j.axes) {
          const next = [];
          for (let i = 1; i <= 8; i++) {
            const a = j.axes[`axis${i}`] || {};
            next.push({
              winner: [0, 1, 2].includes(a.winner) ? a.winner : null,
              strength: typeof a.strength === "number" ? a.strength : null,
              tieQuality: a.tieQuality ?? null,
            });
          }
          setAxes(next);
        }

        if (j.relativeOverall) {
          setRelativeOverall({
            winner: [0, 1, 2].includes(j.relativeOverall.winner)
              ? j.relativeOverall.winner
              : null,
            strength:
              typeof j.relativeOverall.strength === "number"
                ? j.relativeOverall.strength
                : null,
            tieQuality: j.relativeOverall.tieQuality ?? null,
          });
        }

        if (j.absoluteOverall) {
          setAbsoluteOverall({
            t1: j.absoluteOverall.translation1 ?? null,
            t2: j.absoluteOverall.translation2 ?? null,
          });
        }

        setComments(j.comments || "");
        setSavedOnce(true);
      } catch {}
    })();
  }, [comparison, rater]);

  const isAxisComplete = (a) => {
    if (a.winner == null) return false;
    if (a.winner === 1 || a.winner === 2) return true;
    if (a.winner === 0) return !!a.tieQuality;
    return false;
  };

  const isRelativeComplete = (ro) => {
    if (ro.winner == null) return false;
    if (ro.winner === 1 || ro.winner === 2) return ro.strength >= 1 && ro.strength <= 5;
    if (ro.winner === 0) return !!ro.tieQuality;
    return false;
  };

  const isAbsolutePanelComplete = (v) => v >= 1 && v <= 5;
  const isAbsoluteComplete = (ab) => ab.t1 >= 1 && ab.t1 <= 5 && ab.t2 >= 1 && ab.t2 <= 5;

  const computeMissing = () => {
    const missing = [];
    axes.forEach((a, i) => {
      if (!isAxisComplete(a)) missing.push(`Axis ${i + 1} is incomplete`);
    });
    if (!isRelativeComplete(relativeOverall)) missing.push("Relative overall grade incomplete");
    if (!isAbsolutePanelComplete(absoluteOverall.t1)) missing.push("Absolute Grading Tab: Rate Translation 1 (1–5)");
    if (!isAbsolutePanelComplete(absoluteOverall.t2)) missing.push("Absolute Grading Tab: Rate Translation 2 (1–5)");
    return missing;
  };

  const allComplete = useMemo(
    () => axes.every(isAxisComplete) && isRelativeComplete(relativeOverall) && isAbsoluteComplete(absoluteOverall),
    [axes, relativeOverall, absoluteOverall]
  );

  const showTooltip = (event, text) => {
    if (!text) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const margin = 8;

    let x = rect.right + margin;
    let y = rect.top + rect.height / 2;

    x = Math.min(Math.max(x, margin), window.innerWidth - margin);
    y = Math.min(Math.max(y, margin), window.innerHeight - margin);

    setTooltip({ visible: true, text, x, y });
  };

  const hideTooltip = () => setTooltip((t) => ({ ...t, visible: false }));

  const LikertScale = ({ value, onChange }) => {
    const labels = [
      "Very slightly better",
      "Slightly better",
      "Moderately better",
      "Significantly better",
      "Extremely better",
    ];

    return (
      <div className="flex flex-col items-end text-[11px]">
        <div className="flex gap-2">
          {labels.map((label, i) => (
            <label key={i} className="inline-flex items-center gap-1">
              <input
                type="radio"
                checked={value === i + 1}
                onChange={() => onChange(i + 1)}
                className="h-4 w-4"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const NumericLikert = ({ value, onChange }) => (
    <div className="flex flex-col items-end text-[11px]">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="inline-flex items-center gap-1">
            <input type="radio" checked={value === n} onChange={() => onChange(n)} className="h-4 w-4" />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="text-[11px] text-gray-500 mt-1">1 = poor, 5 = excellent</div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!allComplete) {
      setMissingList(computeMissing());
      setShowMissingModal(true);
      return;
    }

    setSaving(true);

    try {
      const axesPayload = {};
      axes.forEach((a, i) => {
        axesPayload[`axis${i + 1}`] = {
          winner: a.winner,
          strength: a.winner === 0 ? null : a.strength,
          tieQuality: a.winner === 0 ? a.tieQuality : null,
        };
      });

      const durationSeconds =
        typeof startedAtMs === "number" ? (Date.now() - startedAtMs) / 1000 : null;

      const body = {
        rater,
        comparison,
        datasetId,
        axes: axesPayload,
        comments,
        durationSeconds,
        relativeOverall: {
          winner: relativeOverall.winner,
          strength: relativeOverall.winner === 0 ? null : relativeOverall.strength,
          tieQuality: relativeOverall.winner === 0 ? relativeOverall.tieQuality : null,
        },
        absoluteOverall: {
          translation1: absoluteOverall.t1,
          translation2: absoluteOverall.t2,
        },
        urdu1,
        urdu2,
      };

      const res = await fetch("/api/comparison-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      setSavedOnce(true);
      alert("Rating saved.");
    } catch (e) {
      setErr(e.message || "Failed to submit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-[13px]">
      {/* HEADER + rest of JSX UNCHANGED */}
      {/* Axes 1–8 now ONLY show Translation 1 / Translation 2 / Tie */}
      {/* Axis 9 still shows Likert */}
    </form>
  );
}
