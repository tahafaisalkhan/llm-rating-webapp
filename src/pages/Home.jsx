// src/pages/Home.jsx
import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();
  const isAdmin = rater === "admin";

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");
  const [completedMap, setCompletedMap] = useState({}); // comparison -> true

  // admin override: when true, all cases are unlocked for admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);

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
        setCompletedMap(next);
      } catch (e) {
        console.error("Failed to fetch completion statuses", e);
      }
    })();
  }, [pairs, rater]);

  // One item per comparison
  const viewCases = useMemo(() => {
    return [...pairs]
      .sort((a, b) => Number(a.comparison) - Number(b.comparison))
      .map((p) => ({
        comparison: p.comparison,
        datasetid: p.chatgpt?.datasetid || p.medgemma?.datasetid || "",
      }));
  }, [pairs]);

  // Determine locks
  const casesWithLock = useMemo(() => {
    return viewCases.map((c, idx, arr) => {
      const completed = !!completedMap[c.comparison];

      // Admin override
      if (isAdmin && adminUnlocked) {
        return { ...c, completed, locked: false };
      }

      // Case 1 always unlocked
      if (idx === 0) {
        return { ...c, completed, locked: false };
      }

      const prev = arr[idx - 1];
      const prevCompleted = !!completedMap[prev.comparison];
      const unlocked = completed || prevCompleted;

      return {
        ...c,
        completed,
        locked: !unlocked,
      };
    });
  }, [viewCases, completedMap, isAdmin, adminUnlocked]);

  // ---- PROGRESS BAR CALC ----
  const TOTAL = 60; // Hard requirement
  const completedCount = Object.keys(completedMap).length;
  const percent = Math.min((completedCount / TOTAL) * 100, 100);

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
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminUnlocked((v) => !v)}
              className={`text-xs px-3 py-1 rounded border font-semibold ${
                adminUnlocked
                  ? "bg-green-600 text-white border-green-700"
                  : "bg-white text-gray-800 hover:bg-gray-100 border-gray-300"
              }`}
            >
              {adminUnlocked ? "Relock cases" : "Unlock all cases"}
            </button>
          )}

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

      {/* ---- PROGRESS BAR ---- */}
      <div className="w-full mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedCount} / {TOTAL}
          </span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          ></div>
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
