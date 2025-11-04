import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

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

  // One item per comparison, only need comparison + datasetid
  const viewCases = useMemo(() => {
    return pairs.map((p) => ({
      comparison: p.comparison,
      datasetid: p.chatgpt?.datasetid || p.medgemma?.datasetid || "",
    }));
  }, [pairs]);

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
          />
        ))}

        {viewCases.length === 0 && !err && (
          <div className="text-sm text-gray-500">No cases found.</div>
        )}
      </div>
    </div>
  );
}
