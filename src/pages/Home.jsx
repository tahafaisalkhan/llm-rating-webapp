import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox"; // your existing component
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state
  const [choice, setChoice] = useState({});   // { [comparison]: 1 | 2 | "tie" }
  const [strength, setStrength] = useState({}); // { [comparison]: "weak"|"moderate"|"strong"|null }
  const [locked, setLocked] = useState({});   // { [comparison]: true }

  // rating status for cards
  const [ratedMap, setRatedMap] = useState({});   // { "chatgpt:<id>": true, "medgemma:<id>": true }
  const [dangerMap, setDangerMap] = useState({}); // { "chatgpt:<id>": true if major_error, ... }

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
    const dangerEntries = {};
    const lockedEntries = {};
    const choiceEntries = {};
    const strengthEntries = {};
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
              // support new fields if your API returns them; otherwise we just mark locked
              if (j.result === 1 || j.result === 2 || j.result === 0) {
                choiceEntries[p.comparison] = j.result === 0 ? "tie" : j.result;
              }
              if (j.strength) strengthEntries[p.comparison] = j.strength;
            }
          })
          .catch(() => {})
      );

      // rating status for each panel per rater
      const setStatusFetch = (modelUsed, idKey) =>
        fetch(
          `/api/ratings/status?modelUsed=${encodeURIComponent(
            modelUsed
          )}&modelId=${encodeURIComponent(idKey)}&rater=${encodeURIComponent(
            rater
          )}`
        )
          .then((r) => (r.ok ? r.json() : { exists: false }))
          .then((j) => {
            // We expect { exists, major_error? }
            const mapKey = `${modelUsed}:${idKey}`;
            if (j?.exists) ratedEntries[mapKey] = true;
            if (j && typeof j.major_error === "boolean") {
              dangerEntries[mapKey] = j.major_error;
            }
          })
          .catch(() => {});

      if (p.chatgpt?.id) fetches.push(setStatusFetch("chatgpt", p.chatgpt.id));
      if (p.medgemma?.id) fetches.push(setStatusFetch("medgemma", p.medgemma.id));
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setDangerMap(dangerEntries);
    setLocked((m) => ({ ...m, ...lockedEntries }));
    setChoice((m) => ({ ...m, ...choiceEntries }));
    setStrength((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;
    const selected = choice[p.comparison]; // 1 | 2 | "tie"
    const selectedStrength = strength[p.comparison] || null;

    if (selected !== 1 && selected !== 2 && selected !== "tie") {
      alert("Pick 1 or 2 or Tie first.");
      return;
    }
    if (selected !== "tie" && !selectedStrength) {
      alert("Pick a strength (Weak/Moderate/Strong).");
      return;
    }

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          // backend expects: 1 | 2 | 0 (tie)
          result: selected === "tie" ? 0 : selected,
          strength: selected === "tie" ? null : selectedStrength || null,
          rater, // per-user submission
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
      {/* Top bar: rubric left, centered title, user & logout right */}
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
        const lockedRow = !!locked[p.comparison];
        const selected = choice[p.comparison];
        const selectedStrength = strength[p.comparison] || null;

        const set1Key = p.chatgpt?.id ? `chatgpt:${p.chatgpt.id}` : null;
        const set2Key = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

        const set1Rated = set1Key ? !!ratedMap[set1Key] : false;
        const set2Rated = set2Key ? !!ratedMap[set2Key] : false;

        const set1Danger = set1Key ? !!dangerMap[set1Key] : false;
        const set2Danger = set2Key ? !!dangerMap[set2Key] : false;

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            {/* Set 1 card */}
            <div>
              {p.chatgpt ? (
                <PanelCard
                  id={p.chatgpt.id}
                  datasetid={p.chatgpt.datasetid}
                  setLabel="set1"
                  rated={set1Rated}
                  danger={set1Danger}   // ← NEW: render red when true
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            {/* Set 2 card */}
            <div>
              {p.medgemma ? (
                <PanelCard
                  id={p.medgemma.id}
                  datasetid={p.medgemma.datasetid}
                  setLabel="set2"
                  rated={set2Rated}
                  danger={set2Danger}   // ← NEW
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls */}
            <div className="flex flex-col items-center justify-start">
              <PreferenceBox
                locked={lockedRow}
                selected={selected}
                setSelected={(val) =>
                  setChoice((m) => ({ ...m, [p.comparison]: val }))
                }
                strength={selectedStrength}
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
