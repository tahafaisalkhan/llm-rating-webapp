// src/components/ComparisonRubricForm.jsx
import { useEffect, useMemo, useState } from "react";

const AXIS_SCROLL_MAX_H_CLASS = "max-h-[12rem]";

export default function ComparisonRubricForm({
  rater,
  comparison,
  datasetId,
  startedAtMs, // timer start passed from Detail.jsx
}) {
  // Per-axis rubric
  const [axes, setAxes] = useState(
    () =>
      Array.from({ length: 8 }).map(() => ({
        winner: null,      // 0 = tie, 1 = Translation 1, 2 = Translation 2
        strength: 3,       // 1–5 when winner is 1 or 2
        tieQuality: null,  // "bad" | "good" | "excellent" when winner = 0
      }))
  );
  // NEW: relative overall rating (Translation 1 vs 2 vs Tie)
  const [relativeOverall, setRelativeOverall] = useState({
    winner: null,      // 0,1,2
    strength: 3,       // 1–5 if winner 1 or 2
    tieQuality: null,  // "bad" | "good" | "excellent" if winner 0
  });

  // NEW: absolute overall rating for each translation
  const [absoluteOverall, setAbsoluteOverall] = useState({
    t1: null, // 1–5
    t2: null, // 1–5
  });

  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedOnce, setSavedOnce] = useState(false);

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
        if (!j?.exists || !j.axes) return;

        // per-axis
        const nextAxes = [];
        for (let i = 1; i <= 8; i++) {
          const key = `axis${i}`;
          const a = j.axes[key] || {};
          nextAxes.push({
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
        setAxes(nextAxes);
        setComments(j.comments || "");

        // relative overall (if present)
        const r = j.relativeOverall || {};
        setRelativeOverall({
          winner:
            typeof r.winner === "number" && [0, 1, 2].includes(r.winner)
              ? r.winner
              : null,
          strength:
            typeof r.strength === "number" &&
            r.strength >= 1 &&
            r.strength <= 5
              ? r.strength
              : 3,
          tieQuality: r.tieQuality ?? null,
        });

        // absolute overall (if present)
        const abs = j.absoluteOverall || {};
        setAbsoluteOverall({
          t1:
            typeof abs.translation1 === "number" &&
            abs.translation1 >= 1 &&
            abs.translation1 <= 5
              ? abs.translation1
              : null,
          t2:
            typeof abs.translation2 === "number" &&
            abs.translation2 >= 1 &&
            abs.translation2 <= 5
              ? abs.translation2
              : null,
        });

        setSavedOnce(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [comparison, rater]);

  // ---------- per-axis helpers ----------
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

  // ---------- relative overall helpers ----------
  const setRelativeWinner = (winner) =>
    setRelativeOverall((old) => ({
      winner,
      strength: winner === 0 ? null : old.strength ?? 3,
      tieQuality: winner === 0 ? old.tieQuality ?? null : null,
    }));

  const setRelativeStrength = (strength) =>
    setRelativeOverall((old) => ({ ...old, strength }));

  const setRelativeTieQuality = (tieQuality) =>
    setRelativeOverall((old) => ({ ...old, tieQuality }));

  // ---------- absolute overall helpers ----------
  const setAbsolute = (which, value) =>
    setAbsoluteOverall((old) => ({ ...old, [which]: value }));

  const isAxisComplete = (a) => {
    if (!a.winner && a.winner !== 0) return false;
    if (a.winner === 1 || a.winner === 2) return a.strength;
    if (a.winner === 0) return !!a.tieQuality;
    return false;
  };

  const isRelativeComplete = (r) => {
    if (r.winner === null || r.winner === undefined) return false;
    if (r.winner === 1 || r.winner === 2)
      return r.strength >= 1 && r.strength <= 5;
    if (r.winner === 0) return !!r.tieQuality;
    return false;
  };

  const isAbsoluteComplete = (abs) => {
    const { t1, t2 } = abs;
    return (
      typeof t1 === "number" &&
      t1 >= 1 &&
      t1 <= 5 &&
      typeof t2 === "number" &&
      t2 >= 1 &&
      t2 <= 5
    );
  };

  const allComplete = useMemo(() => {
    const axesOK = axes.every((a) => {
      if (a.winner === null) return false;
      if (a.winner === 1 || a.winner === 2)
        return a.strength >= 1 && a.strength <= 5;
      if (a.winner === 0) return !!a.tieQuality;
      return false;
    });

    return (
      axesOK &&
      isRelativeComplete(relativeOverall) &&
      isAbsoluteComplete(absoluteOverall)
    );
  }, [axes, relativeOverall, absoluteOverall]);

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
        // NEW: send relative + absolute blocks
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

  // reused Likert for both per-axis + relative
  const Likert = ({ value, onChange }) => {
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

  const TieQuality = ({ value, onChange }) => (
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-[13px]">
      {/* SECTION 1: per-axis comparison (unchanged layout) */}
      <div className="font-semibold text-sm">
        Choose which Urdu translation is better on each axis, and how strongly.
        <span className="font-normal">
          {" "}
          (Translation 1 vs Translation 2 vs Tie)
        </span>
      </div>

      <div
        className={["space-y-2 overflow-y-auto pr-1", AXIS_SCROLL_MAX_H_CLASS].join(
          " "
        )}
      >
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
                  <div className="text-[13px] font-medium">{ax.label}</div>
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
                    <Likert
                      value={strength}
                      onChange={(n) => setAxisStrength(idx, n)}
                    />
                  )}
                  {isTie && (
                    <TieQuality
                      value={tieQuality}
                      onChange={(v) => setAxisTieQuality(idx, v)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: RELATIVE OVERALL GRADE */}
      <div className="border rounded-lg px-3 py-3 bg-gray-50 space-y-2">
        <div className="font-semibold text-sm">Relative Grade (overall)</div>
        <div className="text-[11px] text-gray-600">
          Relatively grade the two translations overall (which is better, or tie?).
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[13px] font-medium">
            Overall comparison: Translation 1 vs Translation 2
          </div>
          <div className="flex items-center gap-3">
            {/* winner buttons */}
            <div className="inline-flex rounded-md shadow-sm overflow-hidden border text-[11px]">
              {[
                { val: 1, label: "Translation 1" },
                { val: 2, label: "Translation 2" },
                { val: 0, label: "Tie" },
              ].map((opt, i) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setRelativeWinner(opt.val)}
                  className={[
                    "px-2 py-0.5",
                    i !== 2 ? "border-r" : "",
                    relativeOverall.winner === opt.val
                      ? "bg-black text-white"
                      : "bg-white text-gray-800 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* conditional controls */}
            {relativeOverall.winner === 1 ||
            relativeOverall.winner === 2 ? (
              <Likert
                value={relativeOverall.strength}
                onChange={setRelativeStrength}
              />
            ) : null}

            {relativeOverall.winner === 0 ? (
              <TieQuality
                value={relativeOverall.tieQuality}
                onChange={setRelativeTieQuality}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* SECTION 3: ABSOLUTE OVERALL GRADES */}
      <div className="border rounded-lg px-3 py-3 bg-gray-50 space-y-3">
        <div className="font-semibold text-sm">Absolute Grade (overall)</div>
        <div className="text-[11px] text-gray-600">
          Absolutely grade each translation on a 1–5 scale.
        </div>

        <div className="space-y-2">
          {/* Translation 1 */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-medium">
              Rate Translation 1 overall
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="inline-flex items-center gap-1 cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={absoluteOverall.t1 === n}
                    onChange={() => setAbsolute("t1", n)}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="text-[12px] select-none">{n}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Translation 2 */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] font-medium">
              Rate Translation 2 overall
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="inline-flex items-center gap-1 cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={absoluteOverall.t2 === n}
                    onChange={() => setAbsolute("t2", n)}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="text-[12px] select-none">{n}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* comments + submit */}
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
