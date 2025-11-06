// src/components/ComparisonRubricForm.jsx
import { useEffect, useMemo, useState } from "react";

const AXIS_SCROLL_MAX_H_CLASS = "max-h-[12rem]";

export default function ComparisonRubricForm({
  rater,
  comparison,
  datasetId,
  startedAtMs, // timer start from Detail.jsx (can be undefined)
  urdu1,
  urdu2,
  notesViewed, // { english: bool, urdu1: bool, urdu2: bool }
}) {
  const [axes, setAxes] = useState(
    () =>
      Array.from({ length: 8 }).map(() => ({
        winner: null, // 0 = tie, 1 = Translation 1, 2 = Translation 2
        strength: 3, // 1–5 when winner is 1 or 2
        tieQuality: null, // "bad" | "good" | "excellent" when winner = 0
      }))
  );
  const [relativeOverall, setRelativeOverall] = useState({
    winner: null,
    strength: 3,
    tieQuality: null,
  });
  const [absoluteOverall, setAbsoluteOverall] = useState({
    t1: null,
    t2: null,
  });

  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedOnce, setSavedOnce] = useState(false);

  // which panel is showing: "relative" (axes) or "absolute" (overall 1–5)
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

  // Prefill saved data
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const qs = new URLSearchParams({
          comparison: String(comparison || ""),
          rater: rater || "",
        }).toString();
        const res = await fetch(`/api/comparison-ratings/get?${qs}`);
        if (!res.ok) return;
        const j = await res.json();
        if (!j?.exists) return;

        if (j.axes) {
          const next = [];
          for (let i = 1; i <= 8; i++) {
            const key = `axis${i}`;
            const a = j.axes[key] || {};
            next.push({
              winner:
                typeof a.winner === "number" && [0, 1, 2].includes(a.winner)
                  ? a.winner
                  : null,
              strength:
                typeof a.strength === "number" &&
                a.strength >= 1 &&
                a.strength <= 5
                  ? a.strength
                  : 3,
              tieQuality: a.tieQuality ?? null,
            });
          }
          setAxes(next);
        }

        // relative overall (9th axis visually)
        if (j.relativeOverall) {
          setRelativeOverall({
            winner:
              typeof j.relativeOverall.winner === "number" &&
              [0, 1, 2].includes(j.relativeOverall.winner)
                ? j.relativeOverall.winner
                : null,
            strength:
              typeof j.relativeOverall.strength === "number" &&
              j.relativeOverall.strength >= 1 &&
              j.relativeOverall.strength <= 5
                ? j.relativeOverall.strength
                : 3,
            tieQuality: j.relativeOverall.tieQuality ?? null,
          });
        }

        // absolute overall (two 1–5 ratings)
        if (j.absoluteOverall) {
          setAbsoluteOverall({
            t1:
              typeof j.absoluteOverall.translation1 === "number"
                ? j.absoluteOverall.translation1
                : null,
            t2:
              typeof j.absoluteOverall.translation2 === "number"
                ? j.absoluteOverall.translation2
                : null,
          });
        }

        setComments(j.comments || "");
        setSavedOnce(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [comparison, rater]);

  const setAxisWinner = (idx, winner) =>
    setAxes((old) =>
      old.map((a, i) =>
        i === idx
          ? {
              winner,
              strength: winner === 0 ? null : a.strength ?? 3,
              tieQuality: winner === 0 ? a.tieQuality ?? null : null,
            }
          : a
      )
    );

  const setAxisStrength = (idx, strength) =>
    setAxes((old) => old.map((a, i) => (i === idx ? { ...a, strength } : a)));

  const setAxisTieQuality = (idx, tieQuality) =>
    setAxes((old) => old.map((a, i) => (i === idx ? { ...a, tieQuality } : a)));

  const isAxisComplete = (a) => {
    if (a.winner === null || typeof a.winner === "undefined") return false;
    if (a.winner === 1 || a.winner === 2) {
      return a.strength >= 1 && a.strength <= 5;
    }
    if (a.winner === 0) {
      return !!a.tieQuality;
    }
    return false;
  };

  const isRelativeComplete = (ro) => {
    if (ro.winner === null || typeof ro.winner === "undefined") return false;
    if (ro.winner === 1 || ro.winner === 2) {
      return ro.strength >= 1 && ro.strength <= 5;
    }
    if (ro.winner === 0) {
      return !!ro.tieQuality;
    }
    return false;
  };

  const isAbsoluteComplete = (ab) => {
    const ok1 = typeof ab.t1 === "number" && ab.t1 >= 1 && ab.t1 <= 5;
    const ok2 = typeof ab.t2 === "number" && ab.t2 >= 1 && ab.t2 <= 5;
    return ok1 && ok2;
  };

  const allComplete = useMemo(() => {
    const axesDone = axes.every(isAxisComplete);
    const relDone = isRelativeComplete(relativeOverall);
    const absDone = isAbsoluteComplete(absoluteOverall);

    const nv = notesViewed || {};
    const notesSeen =
      !!nv.english && !!nv.urdu1 && !!nv.urdu2;

    return axesDone && relDone && absDone && notesSeen;
  }, [axes, relativeOverall, absoluteOverall, notesViewed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const axesPayload = {};
      axes.forEach((a, i) => {
        axesPayload[`axis${i + 1}`] = {
          winner: a.winner,
          strength: a.winner === 0 ? null : a.strength,
          tieQuality: a.winner === 0 ? a.tieQuality : null,
        };
      });

      // compute duration from startedAtMs, if valid
      let durationSeconds = null;
      if (typeof startedAtMs === "number" && startedAtMs > 0) {
        durationSeconds = (Date.now() - startedAtMs) / 1000;
      }

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

  const WinnerButtons = ({ idx, winner }) => (
    <div className="inline-flex rounded-md shadow-sm overflow-hidden border text-[11px]">
      {[
        { val: 1, label: "Translation 1" },
        { val: 2, label: "Translation 2" },
        { val: 0, label: "Tie" },
      ].map((opt, i) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => setAxisWinner(idx, opt.val)}
          className={[
            "px-2 py-0.5",
            i !== 2 ? "border-r" : "",
            winner === opt.val
              ? "bg-black text-white"
              : "bg-white text-gray-800 hover:bg-gray-100",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // same style as WinnerButtons, but for relative overall (no idx)
  const RelativeWinnerButtons = ({ winner, onChange }) => (
    <div className="inline-flex rounded-md shadow-sm overflow-hidden border text-[11px]">
      {[
        { val: 1, label: "Translation 1" },
        { val: 2, label: "Translation 2" },
        { val: 0, label: "Tie" },
      ].map((opt, i) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={[
            "px-2 py-0.5",
            i !== 2 ? "border-r" : "",
            winner === opt.val
              ? "bg-black text-white"
              : "bg-white text-gray-800 hover:bg-gray-100",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const Likert = ({ idx, strength }) => {
    const labels = ["Very Weak", "Weak", "Moderate", "Strong", "Very Strong"];
    return (
      <div className="flex items-center gap-2 text-[11px] ml-2">
        {labels.map((label, i) => {
          const n = i + 1;
          return (
            <label key={n} className="inline-flex items-center gap-1">
              <input
                type="radio"
                checked={strength === n}
                onChange={() => setAxisStrength(idx, n)}
                className="h-4 w-4 cursor-pointer"
              />
              <span className="text-[12px] select-none">{label}</span>
            </label>
          );
        })}
      </div>
    );
  };

  // Likert-style for relative overall (no idx)
  const RelativeLikert = ({ value, onChange }) => {
    const labels = ["Very Weak", "Weak", "Moderate", "Strong", "Very Strong"];
    return (
      <div className="flex items-center gap-2 text-[11px] ml-2">
        {labels.map((label, i) => {
          const n = i + 1;
          return (
            <label key={n} className="inline-flex items-center gap-1">
              <input
                type="radio"
                checked={value === n}
                onChange={() => onChange(n)}
                className="h-4 w-4 cursor-pointer"
              />
              <span className="text-[12px] select-none">{label}</span>
            </label>
          );
        })}
      </div>
    );
  };

  const TieQuality = ({ idx, tieQuality }) => (
    <div className="flex flex-wrap gap-1 text-[10px] ml-2">
      {[
        { val: "bad", label: "both translations are bad" },
        { val: "good", label: "both translations are good" },
        { val: "excellent", label: "both translations are excellent" },
      ].map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => setAxisTieQuality(idx, opt.val)}
          className={[
            "px-2 py-0.5 rounded border",
            tieQuality === opt.val
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-800 hover:bg-gray-100",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const RelativeTieQuality = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-1 text-[10px] ml-2">
      {[
        { val: "bad", label: "both translations are bad" },
        { val: "good", label: "both translations are good" },
        { val: "excellent", label: "both translations are excellent" },
      ].map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={[
            "px-2 py-0.5 rounded border",
            value === opt.val
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-800 hover:bg-gray-100",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // numeric 1–5 Likert for absolute grading
  const NumericLikert = ({ value, onChange }) => (
    <div className="flex items-center gap-2 text-[11px] ml-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="inline-flex items-center gap-1">
          <input
            type="radio"
            checked={value === n}
            onChange={() => onChange(n)}
            className="h-4 w-4 cursor-pointer"
          />
          <span className="text-[12px] select-none">{n}</span>
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-[13px]">
      {/* Heading + mode toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="font-semibold text-sm">
          Choose which Urdu translation is better on each axis, and how
          strongly.
          <span className="font-normal">
            {" "}
            (Translation 1 vs Translation 2 vs Tie)
          </span>
        </div>

        <div className="inline-flex rounded-md border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode("relative")}
            className={[
              "px-3 py-1 font-semibold",
              mode === "relative"
                ? "bg-black text-white"
                : "bg-white text-gray-800 hover:bg-gray-100",
            ].join(" ")}
          >
            Relative Grading
          </button>
          <button
            type="button"
            onClick={() => setMode("absolute")}
            className={[
              "px-3 py-1 border-l font-semibold",
              mode === "absolute"
                ? "bg-black text-white"
                : "bg-white text-gray-800 hover:bg-gray-100",
            ].join(" ")}
          >
            Absolute Grading
          </button>
        </div>
      </div>

      {/* Panel content – same height, swapped by mode */}
      <div
        className={[
          "space-y-2 overflow-y-auto pr-1",
          AXIS_SCROLL_MAX_H_CLASS,
        ].join(" ")}
      >
        {mode === "relative" ? (
          <>
            {/* 8 axes */}
            {AXES_META.map((ax, idx) => {
              const a = axes[idx];
              const winner = a?.winner;
              const strength = a?.strength ?? 3;
              const tieQuality = a?.tieQuality ?? null;
              const needsStrength = winner === 1 || winner === 2;
              const isTie = winner === 0;
              const done = isAxisComplete(a);

              return (
                <div
                  key={ax.label}
                  className={[
                    "border rounded-lg px-3 py-2 transition-colors",
                    done
                      ? "bg-green-50 border-green-400"
                      : "bg-gray-50 border-gray-200",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* LEFT: label text */}
                    <div className="flex flex-col">
                      <div className="text-[13px] font-medium">
                        {ax.label}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {needsStrength
                          ? "Winner chosen – rate the strength (Very Weak → Very Strong)."
                          : isTie
                          ? "Tie selected – specify if both translations are bad, good, or excellent."
                          : "Pick Translation 1, Translation 2, or Tie."}
                      </div>
                    </div>

                    {/* RIGHT: selection controls */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <WinnerButtons idx={idx} winner={winner} />
                      {needsStrength && (
                        <Likert idx={idx} strength={strength} />
                      )}
                      {isTie && (
                        <TieQuality idx={idx} tieQuality={tieQuality} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 9th "axis" – Relative overall grading */}
            <div
              className={[
                "border rounded-lg px-3 py-2 transition-colors",
                isRelativeComplete(relativeOverall)
                  ? "bg-green-50 border-green-400"
                  : "bg-gray-50 border-gray-200",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col">
                  <div className="text-[13px] font-medium">
                    9. Relative overall grade
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Which translation is better overall for this case, and how
                    strongly? (If Tie, indicate whether both are bad, good, or
                    excellent.)
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <RelativeWinnerButtons
                    winner={relativeOverall.winner}
                    onChange={(w) =>
                      setRelativeOverall((prev) => ({
                        winner: w,
                        strength: w === 0 ? null : prev.strength ?? 3,
                        tieQuality: w === 0 ? prev.tieQuality ?? null : null,
                      }))
                    }
                  />
                  {relativeOverall.winner === 1 ||
                  relativeOverall.winner === 2 ? (
                    <RelativeLikert
                      value={relativeOverall.strength ?? 3}
                      onChange={(val) =>
                        setRelativeOverall((prev) => ({
                          ...prev,
                          strength: val,
                        }))
                      }
                    />
                  ) : null}
                  {relativeOverall.winner === 0 ? (
                    <RelativeTieQuality
                      value={relativeOverall.tieQuality}
                      onChange={(val) =>
                        setRelativeOverall((prev) => ({
                          ...prev,
                          tieQuality: val,
                        }))
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Absolute grading panel */
          <div className="space-y-3">
            <div className="text-[13px] font-semibold">
              2. Absolute grading (overall quality of each translation)
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-col">
                <div className="text-[13px] font-medium">
                  Rate Translation 1 overall
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  1 = very poor, 5 = excellent.
                </div>
              </div>
              <NumericLikert
                value={absoluteOverall.t1}
                onChange={(v) =>
                  setAbsoluteOverall((prev) => ({ ...prev, t1: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-col">
                <div className="text-[13px] font-medium">
                  Rate Translation 2 overall
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  1 = very poor, 5 = excellent.
                </div>
              </div>
              <NumericLikert
                value={absoluteOverall.t2}
                onChange={(v) =>
                  setAbsoluteOverall((prev) => ({ ...prev, t2: v }))
                }
              />
            </div>

            {!isAbsoluteComplete(absoluteOverall) && (
              <div className="text-[11px] text-gray-500 mt-1">
                Please select a rating 1–5 for both translations.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">Extra Comments</div>
        <input
          type="text"
          placeholder="(optional) brief note"
          className="border rounded px-2 py-1 text-xs w-64"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className={`rounded px-3 py-1.5 font-semibold text-sm ${
            saving || !allComplete
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-black text-white"
          }`}
          disabled={saving || !allComplete}
        >
          {saving ? "Submitting…" : savedOnce ? "Resubmit" : "Submit"}
        </button>
      </div>
    </form>
  );
}
