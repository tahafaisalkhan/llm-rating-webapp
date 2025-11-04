// src/pages/Home.jsx
import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // Rated status per model+id, e.g. "gemma:123", "medgemma:456"
  const [ratedMap, setRatedMap] = useState({});
  const [scoreMap, setScoreMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const rows = await res.json();
        const arr = Array.isArray(rows) ? rows : [];
        setPairs(arr);
        await checkStatuses(arr); // fetch persisted rubric status from server
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
  }, [rater]);

  async function checkStatuses(rows) {
    const ratedEntries = {};
    const scoreEntries = {};
    const fetches = [];

    const handleRating = (key, modelUsed, modelId) =>
      fetch(
        `/api/ratings/status?modelUsed=${encodeURIComponent(
          modelUsed
        )}&modelId=${encodeURIComponent(modelId)}&rater=${encodeURIComponent(
          rater
        )}`
      )
        .then((r) => (r.ok ? r.json() : { exists: false }))
        .then((j) => {
          if (j?.exists) {
            ratedEntries[key] = true;
            if (typeof j.total === "number") scoreEntries[key] = j.total;
          }
        })
        .catch(() => {});

    for (const p of rows) {
      if (p.chatgpt?.id) {
        fetches.push(
          handleRating(`gemma:${p.chatgpt.id}`, "gemma", p.chatgpt.id)
        );
      }
      if (p.medgemma?.id) {
        fetches.push(
          handleRating(
            `medgemma:${p.medgemma.id}`,
            "medgemma",
            p.medgemma.id
          )
        );
      }
    }

    await Promise.all(fetches);

    setRatedMap(ratedEntries);
    setScoreMap(scoreEntries);
  }

  // One item per comparison
  const viewCases = useMemo(() => {
    return pairs.map((p) => {
      const gemmaKey = p.chatgpt?.id ? `gemma:${p.chatgpt.id}` : null;
      const medKey = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

      return {
        comparison: p.comparison,
        datasetid: p.chatgpt?.datasetid || p.medgemma?.datasetid || "",
        gemmaRated: gemmaKey ? !!ratedMap[gemmaKey] : false,
        medgemmaRated: medKey ? !!ratedMap[medKey] : false,
        gemmaScore: gemmaKey ? scoreMap[gemmaKey] : undefined,
        medgemmaScore: medKey ? scoreMap[medKey] : undefined,
      };
    });
  }, [pairs, ratedMap, scoreMap]);

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
        {viewCases.map((c) => (
          <PanelCard
            key={c.comparison}
            comparison={c.comparison}
            datasetid={c.datasetid}
            gemmaRated={c.gemmaRated}
            medgemmaRated={c.medgemmaRated}
            gemmaScore={c.gemmaScore}
            medgemmaScore={c.medgemmaScore}
          />
        ))}
        {viewCases.length === 0 && !err && (
          <div className="text-sm text-gray-500">No cases found.</div>
        )}
      </div>
    </div>
  );
}
