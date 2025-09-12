// src/pages/Home.jsx
import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state (no locking now)
  const [choice, setChoice] = useState({});     // { [comparison]: 0|1|2 }
  const [strength, setStrength] = useState({}); // { [comparison]: "weak"|"moderate"|"strong"|null }

  // rating status for cards
  const [ratedMap, setRatedMap] = useState({}); // { "gemma:<id>": true, "medgemma:<id>": true }
  const [majorMap, setMajorMap] = useState({}); // { "gemma:<id>": true } for red panel

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const rows = await res.json();
        const arr = Array.isArray(rows) ? rows : [];
        setPairs(arr);
        await refreshStatuses(arr);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshStatuses(rows) {
    const ratedEntries = {};
    const majorEntries = {};
    const choiceEntries = {};
    const strengthEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status -> prefill selected + strength (but don't lock)
      fetches.push(
        fetch(
          `/api/preferences/status?comparison=${encodeURIComponent(
            p.comparison
          )}&rater=${encodeURIComponent(rater)}`
        )
          .then((r) => (r.ok ? r.json() : { exists: false }))
          .then((j) => {
            if (j?.exists) {
              if ([0, 1, 2].includes(j.result)) choiceEntries[p.comparison] = j.result;
              if (j.strength === null || ["weak", "moderate", "strong"].includes(j.strength)) {
                strengthEntries[p.comparison] = j.strength;
              }
            }
          })
          .catch(() => {})
      );

      // rating status (exists + major flag)
      const grab = (key, modelUsed, modelId) =>
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

      if (p.gemma?.id) {
        fetches.push(grab(`gemma:${p.gemma.id}`, "gemma", p.gemma.id));
      }
      if (p.medgemma?.id) {
        fetches.push(grab(`medgemma:${p.medgemma.id}`, "medgemma", p.medgemma.id));
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setMajorMap(majorEntries);
    setChoice((m) => ({ ...m, ...choiceEntries }));
    setStrength((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    const result = choice[p.comparison];
    const s = strength[p.comparison] ?? null;

    if (![0, 1, 2].includes(result)) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }
    if (result !== 0 && !["weak", "moderate", "strong"].includes(s)) {
      alert("Pick strength (weak/moderate/strong).");
      return;
    }

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.gemma?.id || "",
          set2Id: p.medgemma?.id || "",
          result,
          strength: result === 0 ? null : s,
          rater,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("Saved. (Previous submission replaced if it existed.)");
      // refresh status so badges reflect the latest
      await refreshStatuses([p]);
    } catch (e) {
      console.error(e);
      alert("Failed: " + (e.message || "Unknown"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      {/* Header */}
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

      {/* column headers */}
      <div className="grid grid-cols-3 gap-4 font-semibold text-center sticky top-0 bg-gray-50 py-2">
        <div>Set 1</div>
        <div>Set 2</div>
        <div>Preference</div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      {pairs.map((p) => {
        const set1Key = p.gemma?.id ? `gemma:${p.gemma.id}` : null;
        const set2Key = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

        const set1Rated = set1Key ? !!ratedMap[set1Key] : false;
        const set2Rated = set2Key ? !!ratedMap[set2Key] : false;

        const set1Major = set1Key ? !!majorMap[set1Key] : false;
        const set2Major = set2Key ? !!majorMap[set2Key] : false;

        const selected = choice[p.comparison];
        const s = strength[p.comparison] ?? null;

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            {/* Set 1 */}
            <div>
              {p.gemma ? (
                <PanelCard
                  id={p.gemma.id}
                  datasetid={p.gemma.datasetid}
                  setLabel="set1"
                  rated={set1Rated}
                  major={set1Major}
                  isGemma
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            {/* Set 2 */}
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

            {/* Preference controls (always enabled) */}
            <div className="flex flex-col items-center">
              <PreferenceBox
                locked={false}
                selected={selected}
                setSelected={(val) =>
                  setChoice((m) => ({ ...m, [p.comparison]: val }))
                }
                strength={s}
                setStrength={(val) =>
                  setStrength((m) => ({ ...m, [p.comparison]: val }))
                }
                onSubmit={() => submitPref(p)}
              />
            </div>
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
