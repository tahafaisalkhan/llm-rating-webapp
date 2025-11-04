// src/pages/Home.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getRater, clearRater } from "../utils/auth";

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7;
  h += h << 3;  h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // keep per-translation rating status (re-used to colour cards)
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
        await checkStatuses(arr);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rater]);

  async function checkStatuses(rows) {
    const ratedEntries = {};
    const scoreEntries = {};
    const fetches = [];

    for (const p of rows) {
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

      if (p.chatgpt?.id) {
        fetches.push(handleRating(`gemma:${p.chatgpt.id}`, "gemma", p.chatgpt.id));
      }
      if (p.medgemma?.id) {
        fetches.push(handleRating(`medgemma:${p.medgemma.id}`, "medgemma", p.medgemma.id));
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setScoreMap(scoreEntries);
  }

  const viewPairs = useMemo(() => {
    // we still keep this in case you ever randomise left/right in the future,
    // but now we only care about the pair as a whole.
    return pairs.map((p) => {
      const flip = ((hash32(String(p.comparison)) & 1) === 1);
      const left = flip ? p.medgemma : p.chatgpt;
      const right = flip ? p.chatgpt : p.medgemma;

      const leftModelUsed = flip ? "medgemma" : "gemma";
      const rightModelUsed = flip ? "gemma" : "medgemma";

      return {
        comparison: p.comparison,
        chatgpt: p.chatgpt,
        medgemma: p.medgemma,
        left,
        right,
        leftModelUsed,
        rightModelUsed,
      };
    });
  }, [pairs]);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {viewPairs.map((vp) => {
          const { comparison, chatgpt, medgemma } = vp;

          const gemmaKey = chatgpt?.id ? `gemma:${chatgpt.id}` : null;
          const medKey   = medgemma?.id ? `medgemma:${medgemma.id}` : null;

          const gemmaRated = gemmaKey ? !!ratedMap[gemmaKey] : false;
          const medRated   = medKey ? !!ratedMap[medKey]   : false;
          const bothRated  = gemmaRated && medRated;

          const datasetId =
            chatgpt?.datasetid || medgemma?.datasetid || "";

          return (
            <Link
              key={comparison}
              to={`/item/${encodeURIComponent(comparison)}`}
              className="block"
            >
              <div
                className={`border rounded p-4 transition ${
                  bothRated ? "bg-green-100 border-green-400" : "bg-white hover:shadow"
                }`}
              >
                <div className="text-xs text-gray-500">
                  Case {comparison}
                </div>
                <div className="mt-2 text-sm">
                  <b>Press for Data</b>
                </div>
                <div className="text-sm">
                  <b>DatasetID:</b> {datasetId || "-"}
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  {gemmaRated || medRated
                    ? `Rated: ${Number(gemmaRated) + Number(medRated)}/2`
                    : "Not rated yet"}
                </div>

                {bothRated && (
                  <div className="mt-1 text-xs font-semibold text-green-700">
                    ✓ Both translations rated
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
