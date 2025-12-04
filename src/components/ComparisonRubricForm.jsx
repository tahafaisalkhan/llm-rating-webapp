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

  // Missing modal
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingList, setMissingList] = useState([]);

  // Auto-close modal
  useEffect(() => {
    if (!showMissingModal) return;
    const timer = setTimeout(() => setShowMissingModal(false), 10000);
    return () => clearTimeout(timer);
  }, [showMissingModal]);

  const [mode, setMode] = useState("relative");

  const AXES_META = useMemo(
    () => [
      { label: "1. Medical Accuracy" },
      { label: "2. Clinical Safety for Handover Utility" },
      { label: "3. Clinical Reasoning" },
      { label: "4. Linguistic Correctness (Urdu/English)" },
      { label: "5. Precision in Medical Terminology" },
      { label: "6. Structure & Flow" },
      { label: "7. Patient Interaction & Communication" },
      { label: "8. Alignment to Source (Traceability)" },
    ],
    []
  );

  // Load saved ratings
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({
          comparison: String(comparison),
          rater,
        });
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

  // Axis helpers
  const isAxisComplete = (a) => {
    if (a.winner == null) return false;
    if (a.winner === 1 || a.winner === 2) return a.strength >= 1 && a.strength <= 5;
    if (a.winner === 0) return !!a.tieQuality;
    return false;
  };

  const isRelativeComplete = (ro) => {
    if (ro.winner == null) return false;
    if (ro.winner === 1 || ro.winner === 2)
      return ro.strength >= 1 && ro.strength <= 5;
    if (ro.winner === 0) return !!ro.tieQuality;
    return false;
  };

  const isAbsolutePanelComplete = (v) => v >= 1 && v <= 5;

  const isAbsoluteComplete = (ab) =>
    ab.t1 >= 1 && ab.t1 <= 5 && ab.t2 >= 1 && ab.t2 <= 5;

  // Missing list
  const computeMissing = () => {
    const missing = [];

    axes.forEach((a, i) => {
      if (!isAxisComplete(a)) missing.push(`Axis ${i + 1} is incomplete`);
    });

    if (!isRelativeComplete(relativeOverall))
      missing.push("Relative overall grade incomplete");

    if (!isAbsolutePanelComplete(absoluteOverall.t1))
      missing.push("Absolute Grading Tab: Rate Translation 1 (1–5)");

    if (!isAbsolutePanelComplete(absoluteOverall.t2))
      missing.push("Absolute Grading Tab: Rate Translation 2 (1–5)");

    return missing;
  };

  const allComplete = useMemo(
    () =>
      axes.every(isAxisComplete) &&
      isRelativeComplete(relativeOverall) &&
      isAbsoluteComplete(absoluteOverall),
    [axes, relativeOverall, absoluteOverall]
  );

  const Likert = ({ idx, strength }) => {
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
                checked={strength === i + 1}
                onChange={() =>
                  setAxes((old) =>
                    old.map((a, ii) =>
                      ii === idx ? { ...a, strength: i + 1 } : a
                    )
                  )
                }
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
            <input
              type="radio"
              checked={value === n}
              onChange={() => onChange(n)}
              className="h-4 w-4"
            />
            <span>{n}</span>
          </label>
        ))}
      </div>

      <div className="text-[11px] text-gray-500 mt-1">
        1 = poor, 5 = excellent
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!allComplete) {
      const missing = computeMissing();
      setMissingList(missing);
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
        typeof startedAtMs === "number"
          ? (Date.now() - startedAtMs) / 1000
          : null;

      const body = {
        rater,
        comparison,
        datasetId,
        axes: axesPayload,
        comments,
        durationSeconds,
        relativeOverall: {
          winner: relativeOverall.winner,
          strength:
            relativeOverall.winner === 0 ? null : relativeOverall.strength,
          tieQuality:
            relativeOverall.winner === 0 ? relativeOverall.tieQuality : null,
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

      {/* Missing Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-red-600 text-white rounded-xl p-5 w-96 shadow-2xl border border-red-800">
            <div className="font-semibold text-lg mb-2">Missing Fields</div>

            {missingList.length ? (
              <ul className="list-disc ml-5 space-y-1 text-sm">
                {missingList.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm">Everything is complete.</div>
            )}

            <div className="mt-4 flex justify-start">
              <button
                type="button"
                onClick={() => setShowMissingModal(false)}
                className="px-4 py-1.5 bg-black text-white rounded hover:bg-gray-900"
              >
                Close
              </button>
            </div>

            <div className="text-xs mt-2 text-red-200">
              This message will close automatically in 10 seconds.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">
          Rating Rubric –{" "}
          <span className="font-normal">(Translation 1 vs 2 or Tie)</span>
        </div>

        {/* Mode Buttons */}
        <div className="inline-flex rounded-md border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode("relative")}
            className={`px-3 py-1 ${
              mode === "relative"
                ? "bg-black text-white"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Relative Grading
          </button>

          <button
            type="button"
            disabled={
              !(
                axes.every(isAxisComplete) &&
                isRelativeComplete(relativeOverall)
              )
            }
            onClick={() => {
              if (
                axes.every(isAxisComplete) &&
                isRelativeComplete(relativeOverall)
              ) {
                setMode("absolute");
              }
            }}
            className={`px-3 py-1 border-l ${
              axes.every(isAxisComplete) &&
              isRelativeComplete(relativeOverall)
                ? mode === "absolute"
                  ? "bg-black text-white"
                  : "bg-white hover:bg-gray-100"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            Absolute Grading
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className={`space-y-2 overflow-y-auto pr-1 ${AXIS_SCROLL_MAX_H_CLASS}`}>
        {mode === "relative" ? (
          <>
            {/* AXES 1–8 */}
            {AXES_META.map((ax, idx) => {
              const a = axes[idx];
              const needsStrength = a.winner === 1 || a.winner === 2;
              const isTie = a.winner === 0;

              return (
                <div
                  key={ax.label}
                  className={`border rounded-lg px-3 py-2 ${
                    isAxisComplete(a)
                      ? "bg-green-50 border-green-400"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-medium text-[13px]">
                      {ax.label}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-3">
                        {/* Winner buttons */}
                        <div className="inline-flex rounded-md border overflow-hidden text-[11px]">
                          {[1, 2, 0].map((val, i) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setAxes((old) =>
                                  old.map((a, ii) =>
                                    ii === idx
                                      ? {
                                          winner: val,
                                          strength:
                                            val === 0 ? null : a.strength,
                                          tieQuality:
                                            val === 0
                                              ? a.tieQuality ?? null
                                              : null,
                                        }
                                      : a
                                  )
                                )
                              }
                              className={`px-2 py-0.5 ${
                                i < 2 ? "border-r" : ""
                              } ${
                                a.winner === val
                                  ? "bg-black text-white"
                                  : "bg-white hover:bg-gray-100"
                              }`}
                            >
                              {val === 1
                                ? "Translation 1"
                                : val === 2
                                ? "Translation 2"
                                : "Tie"}
                            </button>
                          ))}
                        </div>

                        {/* Strength / Tie */}
                        {needsStrength && (
                          <Likert idx={idx} strength={a.strength} />
                        )}

                        {isTie && (
                          <div className="flex gap-1 text-[10px] ml-2">
                            {["bad", "good", "excellent"].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setAxes((old) =>
                                    old.map((a, ii) =>
                                      ii === idx
                                        ? { ...a, tieQuality: val }
                                        : a
                                    )
                                  )
                                }
                                className={`px-2 py-0.5 rounded border ${
                                  a.tieQuality === val
                                    ? "bg-gray-800 text-white"
                                    : "bg-white"
                                }`}
                              >
                                {`both translations are ${val}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500">
                        {needsStrength
                          ? "How much better is the chosen translation?"
                          : isTie
                          ? "If Tie — specify if both translations are bad, good, or excellent."
                          : "Pick which translation is better."}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* BLUE RELATIVE OVERALL (Axis 9) */}
            <div
              className={`border rounded-lg px-3 py-2 ${
                isRelativeComplete(relativeOverall)
                  ? "bg-blue-50 border-blue-400"
                  : "bg-blue-50 border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-[13px] text-blue-800">
                    9. Relative overall grade
                  </div>
                  <div className="text-[11px] text-blue-600 mt-1">
                    Which translation is better overall?
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-3">
                    <div className="inline-flex rounded-md border overflow-hidden text-[11px]">
                      {[1, 2, 0].map((val, i) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setRelativeOverall((prev) => ({
                              winner: val,
                              strength:
                                val === 0 ? null : prev.strength,
                              tieQuality:
                                val === 0 ? prev.tieQuality : null,
                            }))
                          }
                          className={`px-2 py-0.5 ${
                            i < 2 ? "border-r" : ""
                          } ${
                            relativeOverall.winner === val
                              ? "bg-black text-white"
                              : "bg-white hover:bg-gray-100"
                          }`}
                        >
                          {val === 1
                            ? "Translation 1"
                            : val === 2
                            ? "Translation 2"
                            : "Tie"}
                        </button>
                      ))}
                    </div>

                    {relativeOverall.winner === 1 ||
                    relativeOverall.winner === 2 ? (
                      <NumericLikert
                        value={relativeOverall.strength}
                        onChange={(v) =>
                          setRelativeOverall((prev) => ({
                            ...prev,
                            strength: v,
                          }))
                        }
                      />
                    ) : null}

                    {relativeOverall.winner === 0 && (
                      <div className="flex gap-1 text-[10px] ml-2">
                        {["bad", "good", "excellent"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setRelativeOverall((prev) => ({
                                ...prev,
                                tieQuality: val,
                              }))
                            }
                            className={`px-2 py-0.5 rounded border ${
                              relativeOverall.tieQuality === val
                                ? "bg-gray-800 text-white"
                                : "bg-white"
                            }`}
                          >
                            {`both translations are ${val}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // ABSOLUTE MODE
          <div className="space-y-3">

            {/* T1 PANEL */}
            <div
              className={`border rounded-lg px-3 py-2 ${
                isAbsolutePanelComplete(absoluteOverall.t1)
                  ? "bg-green-50 border-green-400"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium text-[13px]">
                  Rate Translation 1 overall
                </div>

                <NumericLikert
                  value={absoluteOverall.t1}
                  onChange={(v) =>
                    setAbsoluteOverall((prev) => ({ ...prev, t1: v }))
                  }
                />
              </div>
            </div>

            {/* T2 PANEL */}
            <div
              className={`border rounded-lg px-3 py-2 ${
                isAbsolutePanelComplete(absoluteOverall.t2)
                  ? "bg-green-50 border-green-400"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium text-[13px]">
                  Rate Translation 2 overall
                </div>

                <NumericLikert
                  value={absoluteOverall.t2}
                  onChange={(v) =>
                    setAbsoluteOverall((prev) => ({ ...prev, t2: v }))
                  }
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Comments */}
      <div className="flex items-center justify-between">
        <div className="text-sm">Extra Comments</div>
        <input
          type="text"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="border rounded px-2 py-1 text-xs w-64"
          placeholder="(optional)"
        />
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
