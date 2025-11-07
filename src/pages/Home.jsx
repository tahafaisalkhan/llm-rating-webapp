// src/pages/Home.jsx
import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");
  const [completedMap, setCompletedMap] = useState({}); // comparison -> true

  // Load paired cases
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const rows = await res.json();
        const arr = Array.isArray(rows) ? rows : [];
        setPairs(arr);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
  }, [rater]);

  // After pairs load, check which cases are completed for this rater
  useEffect(() => {
    if (!rater || pairs.length === 0) return;

    (async () => {
      try {
        const next = {};
        const fetches = pairs.map((p) =>
          fetch(
            `/api/comparison-ratings/get?comparison=${encodeURIComponent(
              p.comparison
            )}&rater=${encodeURIComponent(rater)}`
          )
            .then((res) => (res.ok ? res.json() : { exists: false }))
            .then((j) => {
              if (j?.exists) {
                next[p.comparison] = true;
              }
            })
            .catch(() => {})
        );

        await Promise.all(fetches);
        setCompletedMap(next); // fresh map per rater
      } catch (e) {
        console.error("Failed to fetch completion statuses", e);
      }
    })();
  }, [pairs, rater]);

  // One item per comparison, only need comparison + datasetid
  // Ensure cases are in numeric order
  const viewCases = useMemo(() => {
    return [...pairs]
      .slice()
      .sort((a, b) => Number(a.comparison) - Number(b.comparison))
      .map((p) => ({
        comparison: p.comparison,
        datasetid: p.chatgpt?.datasetid || p.medgemma?.datasetid || "",
      }));
  }, [pairs]);

  // Determine which cases are locked/unlocked for this rater
  const casesWithLock = useMemo(() => {
    let previousCompleted = false;

    return viewCases.map((c, idx) => {
      const completed = !!completedMap[c.comparison];

      // Unlock logic:
      // - Case 1 (idx 0) is always unlocked
      // - Any already-completed case is always unlocked
      // - Otherwise, a case is unlocked only if the *previous* case is completed
      const unlocked =
        idx === 0 || completed || previousCompleted;

      if (completed) {
        previousCompleted = true;
      }

      return {
        ...c,
        completed,
        locked: !unlocked,
      };
    });
  }, [viewCases, completedMap]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <a
          href="https://docs.google.com/document/d/1K4VkgNa3FkOeZHHu9qOCktq2-gLWPNbdogn_OsgoMp8/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline text-gray-600 hover:text-black"
        >
          Scoring Rubric
        </a>

        <h1 className="text-3xl font-bold text-center flex-1 text-center">
          LLM Rating Menu
        </h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Signed in: <b>{rater}</b>
          </span>
          <button
            className="text-sm underline text-gray-600 hover:text-black"
            onClick={() => {
              clearRater();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-3">
        {casesWithLock.map((c) => (
          <PanelCard
            key={c.comparison}
            comparison={c.comparison}
            datasetid={c.datasetid}
            completed={c.completed}
            locked={c.locked}
          />
        ))}

        {casesWithLock.length === 0 && !err && (
          <div className="text-sm text-gray-500">No cases found.</div>
        )}
      </div>
    </div>
  );
}
