// src/pages/Home.jsx
import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  const [choice, setChoice] = useState({});
  const [locked, setLocked] = useState({});

  const [ratedMap, setRatedMap] = useState({}); // "chatgpt:<id>": true
  const [majorMap, setMajorMap] = useState({}); // "chatgpt:<id>": true if major

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
  }, []);

  async function checkStatuses(rows) {
    const ratedEntries = {};
    const majorEntries = {};
    const lockedEntries = {};
    const choiceEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status per rater
      fetches.push(
        fetch(
          `/api/preferences/status?comparison=${encodeURIComponent(
            p.comparison
          )}&rater=${encodeURIComponent(rater)}`
        )
          .then((r) => (r.ok ? r.json() : { exists: false }))
          .then((j) => {
            if (j?.exists) {
              lockedEntries[p.comparison] = true;
              if (j.result === 1 || j.result === 2 || j.result === 0) {
                choiceEntries[p.comparison] = j.result; // 0 = tie
              }
            }
          })
          .catch(() => {})
      );

      // rating status for each panel per rater (+ major flag)
      const handleRating = (key, modelUsed, modelId) =>
        fetch(
          `/api/ratings/status?modelUsed=${encodeURIComponent(
            modelUsed
          )}&modelId=${encodeURIComponent(modelId)}&rater=${encodeURIComponent(rater)}`
        )
          .then((r) => (r.ok ? r.json() : { exists: false }))
          .then((j) => {
            if (j?.exists) {
              ratedEntries[key] = true;
              if (j.major_error) majorEntries[key] = true;
            }
          })
          .catch(() => {});

      if (p.chatgpt?.id) {
        fetches.push(handleRating(`chatgpt:${p.chatgpt.id}`, "chatgpt", p.chatgpt.id));
      }
      if (p.medgemma?.id) {
        fetches.push(handleRating(`medgemma:${p.medgemma.id}`, "medgemma", p.medgemma.id));
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setMajorMap(majorEntries);
    setLocked((m) => ({ ...m, ...lockedEntries }));
    setChoice((m) => ({ ...m, ...choiceEntries }));
  }

  async function submitPref(p, selected, strength) {
    if (locked[p.comparison]) return;

    // selected: 1 | 2 | 0 (tie)
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: selected,            // 0,1,2
          strength: selected === 0 ? null : strength || null,
          rater,
        }),
      });
      if (res.status === 409) {
        setLocked((m) => ({ ...m, [p.comparison]: true }));
        alert("Already submitted for this comparison.");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setLocked((m) => ({ ...m, [p.comparison]: true }));
      alert("Preference submitted.");
    } catch (e) {
      console.error(e);
      alert("Failed: " + (e.message || "Unknown"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <a
          href="/rubric"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

      <div className="grid grid-cols-3 gap-4 font-semibold text-center sticky top-0 bg-gray-50 py-2">
        <div>Set 1</div>
        <div>Set 2</div>
        <div>Preference</div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      {pairs.map((p) => {
        const set1Key = p.chatgpt?.id ? `chatgpt:${p.chatgpt.id}` : null;
        const set2Key = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

        const set1Rated = set1Key ? !!ratedMap[set1Key] : false;
        const set2Rated = set2Key ? !!ratedMap[set2Key] : false;

        const set1Major = set1Key ? !!majorMap[set1Key] : false;
        const set2Major = set2Key ? !!majorMap[set2Key] : false;

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            <div>
              {p.chatgpt ? (
                <PanelCard
                  id={p.chatgpt.id}
                  datasetid={p.chatgpt.datasetid}
                  setLabel="set1"
                  rated={set1Rated}
                  major={set1Major}
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            <div>
              {p.medgemma ? (
                <PanelCard
                  id={p.medgemma.id}
                  datasetid={p.medgemma.datasetid}
                  setLabel="set2"
                  rated={set2Rated}
                  major={set2Major}
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Your existing preference UI stays as you already wired it up */}
            {/* (Left as-is to avoid altering your current look & logic) */}
          </div>
        );
      })}
    </div>
  );
}

function Blank({ label }) {
  return (
    <div className="border rounded p-4 bg-white text-sm text-gray-500">
      {label}
    </div>
  );
}
