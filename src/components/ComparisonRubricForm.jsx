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

  // Load saved ratings
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
    if (a.winner === 0) return !!a.tieQuality;
    return true;
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
        relativeOverall,
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
      {/* AXES 1–8 */}
      <div className={`space-y-2 overflow-y-auto pr-1 ${AXIS_SCROLL_MAX_H_CLASS}`}>
        {AXES_META.map((ax, idx) => {
          const a = axes[idx];
          const isTie = a.winner === 0;

          return (
            <div
              key={ax.label}
              className={`border rounded-lg px-3 py-2 ${
                isAxisComplete(a) ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium text-[13px]">{ax.label}</div>

                <div className="flex flex-col items-end gap-1">
                  <div className="inline-flex rounded-md border overflow-hidden text-[11px]">
                    {[1, 2, 0].map((val, i) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setAxes((old) =>
                            old.map((a2, ii) =>
                              ii === idx
                                ? { winner: val, tieQuality: val === 0 ? a2.tieQuality : null }
                                : a2
                            )
                          )
                        }
                        className={`px-2 py-0.5 ${i < 2 ? "border-r" : ""} ${
                          a.winner === val ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                        }`}
                      >
                        {val === 1 ? "Translation 1" : val === 2 ? "Translation 2" : "Tie"}
                      </button>
                    ))}
                  </div>

                  {isTie && (
                    <div className="flex gap-1 text-[10px]">
                      {["bad", "good", "excellent"].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setAxes((old) =>
                              old.map((a2, ii) =>
                                ii === idx ? { ...a2, tieQuality: val } : a2
                              )
                            )
                          }
                          className={`px-2 py-0.5 rounded border ${
                            a.tieQuality === val ? "bg-gray-800 text-white" : "bg-white"
                          }`}
                        >
                          both translations are {val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {err && <div className="text-red-700 text-sm">{err}</div>}

      <button
        type="submit"
        disabled={saving}
        className={`px-3 py-1.5 rounded font-semibold text-sm ${
          allComplete ? "bg-black text-white" : "bg-gray-300 text-gray-600"
        }`}
      >
        {saving ? "Submitting…" : savedOnce ? "Resubmit" : "Submit"}
      </button>
    </form>
  );
}
