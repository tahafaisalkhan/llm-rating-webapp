// src/pages/Home.jsx
import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference UI state per comparison
  // selected: 0 | 1 | 2  (0 = tie, 1 = set1/gemma, 2 = set2/medgemma)
  const [selected, setSelected] = useState({}); // { [comparison]: 0|1|2 }
  const [strength, setStrength] = useState({}); // { [comparison]: "weak"|"moderate"|"strong"|null }
  const [locked, setLocked] = useState({});     // { [comparison]: true }

  // rating status for cards
  // ratedMap: { "gemma:<id>": true, "medgemma:<id>": true }
  // majorMap: { "gemma:<id>": true, "medgemma:<id>": true }
  const [ratedMap, setRatedMap] = useState({});
  const [majorMap, setMajorMap] = useState({});

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
    const selEntries = {};
    const strEntries = {};
    const fetches = [];

    for (const p of rows) {
      // --- preference status per rater
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
              if ([0, 1, 2].includes(Number(j.result))) {
                selEntries[p.comparison] = Number(j.result);
              }
              strEntries[p.comparison] =
                Number(j.result) === 0 ? null : (j.strength ?? null);
            }
          })
          .catch(() => {})
      );

      // --- rating status for each panel (+ major flag) per rater
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
              if (j.major_error) majorEntries[key] = true;
            }
          })
          .catch(() => {});

      if (p.chatgpt?.id) {
        // LEFT column is Gemma (backend label), even though file name is chatgpt.json
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
    setMajorMap(majorEntries);
    setLocked((m) => ({ ...m, ...lockedEntries }));
    setSelected((m) => ({ ...m, ...selEntries }));
    setStrength((m) => ({ ...m, ...strEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;

    // 0 (tie), 1 (set1/gemma), 2 (set2/medgemma)
    const resVal = selected[p.comparison];
    const strVal =
      resVal === 0 ? null : (strength[p.comparison] ?? null);

    if (resVal === undefined) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }
    if (resVal !== 0 && !strVal) {
      alert("Select preference strength (Weak/Moderate/Strong).");
      return;
    }

    try {
      const r = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: resVal,          // 0,1,2
          strength: strVal,        // null for tie
          rater,
        }),
      });
      if (r.status === 409) {
        setLocked((m) => ({ ...m, [p.comparison]: true }));
        alert("Already submitted for this comparison.");
        return;
      }
      if (!r.ok) throw new Error(await r.text());
      setLocked((m) => ({ ...m, [p.comparison]: true }));
      alert("Preference submitted.");
    } catch (e) {
      console.error(e);
      alert("Failed: " + (e.message || "Unknown"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      {/* Top bar */}
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
        // keys for maps (backend labels)
        const set1Key = p.chatgpt?.id ? `gemma:${p.chatgpt.id}` : null;
        const set2Key = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

        const set1Rated = set1Key ? !!ratedMap[set1Key] : false;
        const set2Rated = set2Key ? !!ratedMap[set2Key] : false;

        const set1Major = set1Key ? !!majorMap[set1Key] : false;
        const set2Major = set2Key ? !!majorMap[set2Key] : false;

        const comp = p.comparison;
        const sel = selected[comp];
        const str = strength[comp];
        const isLocked = !!locked[comp];

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            {/* Set 1 (Gemma) */}
            <div>
              {p.chatgpt ? (
                <PanelCard
                  id={p.chatgpt.id}
                  datasetid={p.chatgpt.datasetid}
                  setLabel="set1"
                  rated={set1Rated && !set1Major}
                  major={set1Major}
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            {/* Set 2 (MedGemma) */}
            <div>
              {p.medgemma ? (
                <PanelCard
                  id={p.medgemma.id}
                  datasetid={p.medgemma.datasetid}
                  setLabel="set2"
                  rated={set2Rated && !set2Major}
                  major={set2Major}
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls (keeps your established design via PreferenceBox) */}
            <div className="flex items-center justify-center">
              <PreferenceBox
                locked={isLocked}
                selected={sel === 0 ? "tie" : sel === 1 ? 1 : sel === 2 ? 2 : undefined}
                setSelected={(val) => {
                  // normalize to 0/1/2 in state
                  const normalized = val === "tie" ? 0 : val;
                  setSelected((m) => ({ ...m, [comp]: normalized }));
                  // if choosing 1/2 and no strength yet, leave strength as-is (user will pick)
                }}
                strength={str || null}
                setStrength={(val) =>
                  setStrength((m) => ({ ...m, [comp]: val }))
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
