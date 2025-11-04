// src/components/ComparisonRubricForm.jsx
import { useEffect, useMemo, useState } from "react";

/**
 * Tweak this to change how tall the whole rubric area is.
 * Examples:
 *  - "max-h-[12rem]"
 *  - "max-h-[14rem]"
 *  - "max-h-[18rem]"
 */
const AXIS_SCROLL_MAX_H_CLASS = "max-h-[12rem]";

/**
 * Props:
 *  - rater: string
 *  - comparison: string | number
 *  - datasetId: string
 */
export default function ComparisonRubricForm({ rater, comparison, datasetId }) {
  const [axes, setAxes] = useState(
    () =>
      Array.from({ length: 8 }).map(() => ({
        winner: null,      // 0 = tie, 1, 2
        strength: 3,       // 1–5 when winner is 1 or 2
        tieQuality: null,  // "bad" | "good" | "excellent" when winner === 0
      }))
  );
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedOnce, setSavedOnce] = useState(false);

  const AXES_META = useMemo(
    () => [
      { label: "Medical Accuracy" },
      { label: "Clinical Safety for Handover Utility" },
      { label: "Clinical Reasoning" },
      { label: "Linguistic Correctness (Urdu/English)" },
      { label: "Precision in Medical Terminology" },
      { label: "Structure & Flow" },
      { label: "Patient Interaction & Communication" },
      { label: "Alignment to Source (Traceability)" },
    ],
    []
  );

  // Prefill if saved
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
              typeof a.strength === "number" && a.strength >= 1 && a.strength <= 5
                ? a.strength
                : 3,
            tieQuality: a.tieQuality ?? null,
          });
        }
        setAxes(next);
        setComments(j.comments || "");
        setSavedOnce(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [comparison, rater]);

  const setAxisWinner = (idx, winner) => {
    setAxes((old) => {
      const copy = old.slice();
      const current = copy[idx] || {
        winner: null,
        strength: 3,
        tieQuality: null,
      };
      copy[idx] = {
        winner,
        strength: winner === 0 ? null : current.strength ?? 3,
        tieQuality: winner === 0 ? current.tieQuality ?? null : null,
      };
      return copy;
    });
  };

  const setAxisStrength = (idx, strength) => {
    setAxes((old) => {
      const copy = old.slice();
      const current = copy[idx] || {
        winner: null,
        strength: 3,
        tieQuality: null,
      };
      copy[idx] = { ...current, strength };
      return copy;
    });
  };

  const setAxisTieQuality = (idx, tieQuality) => {
    setAxes((old) => {
      const copy = old.slice();
      const current = copy[idx] || {
        winner: null,
        strength: 3,
        tieQuality: null,
      };
      copy[idx] = { ...current, tieQuality };
      return copy;
    });
  };

  // Are all 8 axes fully completed?
  const allComplete = useMemo(() => {
    for (let i = 0; i < 8; i++) {
      const a = axes[i];
      if (!a || a.winner === null) return false;
      if (a.winner === 1 || a.winner === 2) {
        if (!a.strength || a.strength < 1 || a.strength > 5) return false;
      }
      if (a.winner === 0) {
        if (!a.tieQuality) return false;
      }
    }
    return true;
  }, [axes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      // Validation (with clear error messages)
      for (let i = 0; i < 8; i++) {
        const a = axes[i];
        const axisNum = i + 1;
        if (!a || a.winner === null) {
          throw new Error(`Please choose Translation 1 / Translation 2 / Tie for axis ${axisNum}.`);
        }
        if (a.winner === 1 || a.winner === 2) {
          if (!a.strength || a.strength < 1 || a.strength > 5) {
            throw new Error(`Please choose strength 1–5 for axis ${axisNum}.`);
          }
        }
        if (a.winner === 0 && !a.tieQuality) {
          throw new Error(
            `For axis ${axisNum}, when Tie is selected, choose: both bad / both good / both excellent.`
          );
        }
      }

      const axesPayload = {};
      for (let i = 0; i < 8; i++) {
        const a = axes[i];
        axesPayload[`axis${i + 1}`] = {
          winner: a.winner,
          strength: a.winner === 0 ? null : a.strength,
          tieQuality: a.winner === 0 ? a.tieQuality : null,
        };
      }

      const body = {
        rater,
        comparison,
        datasetId,
        axes: axesPayload,
        comments,
      };

      const res = await fetch("/api/comparison-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Server error");
      }

      setSaving(false);
      setSavedOnce(true);
      alert("Rating saved.");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to submit.");
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

  const Likert = ({ idx, strength }) => (
    <div className="flex items-center gap-1 text-[10px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="inline-flex items-center gap-0.5">
          <input
            type="radio"
            checked={strength === n}
            onChange={() => setAxisStrength(idx, n)}
            className="h-3 w-3"
          />
          <span>{n}</span>
        </label>
      ))}
    </div>
  );

  const TieQuality = ({ idx, tieQuality }) => (
    <div className="flex flex-wrap gap-1 text-[10px] mt-1">
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-[13px]">
      <div className="font-semibold text-sm">
        Choose which Urdu translation is better on each axis, and how strongly.
        <span className="font-normal">
          {" "}
          (Translation&nbsp;1 vs Translation&nbsp;2 vs Tie)
        </span>
      </div>

      {/* All axes: height controlled by AXIS_SCROLL_MAX_H_CLASS */}
      <div
        className={[
          "space-y-2 overflow-y-auto pr-1",
          AXIS_SCROLL_MAX_H_CLASS,
        ].join(" ")}
      >
        {AXES_META.map((ax, idx) => {
          const a = axes[idx];
          const winner = a?.winner;
          const strength = a?.strength ?? 3;
          const tieQuality = a?.tieQuality ?? null;
          const needsStrength = winner === 1 || winner === 2;
          const isTie = winner === 0;

          return (
            <div
              key={ax.label}
              className="border rounded-lg px-3 py-2 bg-gray-50"
            >
              <div className="flex flex-col gap-2">
                {/* Axis label + helper text */}
                <div>
                  <div className="text-[13px] font-medium">{ax.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {needsStrength
                      ? "Winner chosen – now rate how strong the preference is (1–5)."
                      : isTie
                      ? "Tie selected – specify if both translations are bad, good, or excellent."
                      : "Pick Translation 1, Translation 2, or Tie."}
                  </div>
                </div>

                {/* Buttons & Likert / tie options under label, left-aligned */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <WinnerButtons idx={idx} winner={winner} />
                    {needsStrength && <Likert idx={idx} strength={strength} />}
                  </div>
                  {isTie && (
                    <TieQuality idx={idx} tieQuality={tieQuality} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
