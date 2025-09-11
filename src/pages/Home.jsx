import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state
  // choice[comparison] = 1 | 2 | "tie"
  // choice[`${comparison}:strength`] = "weak" | "moderate" | "strong"
  const [choice, setChoice] = useState({});
  const [locked, setLocked] = useState({}); // { [comparison]: true }

  // rating status for cards
  const [ratedMap, setRatedMap] = useState({}); // { "chatgpt:<id>": true, "medgemma:<id>": true }

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
              // result can be 1 | 2 | "tie"
              if (j.result === 1 || j.result === 2 || j.result === "tie") {
                choiceEntries[p.comparison] = j.result;
              }
              // optional strength from server
              if (j.strength) {
                choiceEntries[`${p.comparison}:strength`] = j.strength;
              }
            }
          })
          .catch(() => {})
      );

      // rating status for each panel per rater
      if (p.chatgpt?.id) {
        fetches.push(
          fetch(
            `/api/ratings/status?modelUsed=chatgpt&modelId=${encodeURIComponent(
              p.chatgpt.id
            )}&rater=${encodeURIComponent(rater)}`
          )
            .then((r) => (r.ok ? r.json() : { exists: false }))
            .then((j) => {
              if (j?.exists) ratedEntries[`chatgpt:${p.chatgpt.id}`] = true;
            })
            .catch(() => {})
        );
      }
      if (p.medgemma?.id) {
        fetches.push(
          fetch(
            `/api/ratings/status?modelUsed=medgemma&modelId=${encodeURIComponent(
              p.medgemma.id
            )}&rater=${encodeURIComponent(rater)}`
          )
            .then((r) => (r.ok ? r.json() : { exists: false }))
            .then((j) => {
              if (j?.exists) ratedEntries[`medgemma:${p.medgemma.id}`] = true;
            })
            .catch(() => {})
        );
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setLocked((m) => ({ ...m, ...lockedEntries }));
    setChoice((m) => ({ ...m, ...choiceEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;

    const sel = choice[p.comparison];                 // 1 | 2 | 'tie'
    const str = strength?.[p.comparison] || null;     // 'weak'|'moderate'|'strong'|null

    // Require a selection
    if (sel !== 1 && sel !== 2 && sel !== "tie") {
      alert("Pick 1, 2, or Tie first.");
      return;
    }

    // Only require strength when 1 or 2 is chosen (NOT for tie)
    if (sel !== "tie" && !str) {
      alert("Pick strength (weak / moderate / strong).");
      return;
    }

    // Backend requires: 0 = tie, 1, 2
    const resultNum = sel === "tie" ? 0 : sel;

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: resultNum,                      // 0 | 1 | 2
          strength: sel === "tie" ? null : str,   // omit/ignore for tie
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
        const strKey = `${p.comparison}:strength`;
        const selectedStrength = choice[strKey] || null;

        const set1Rated = p.chatgpt?.id
          ? !!ratedMap[`chatgpt:${p.chatgpt.id}`]
          : false;
        const set2Rated = p.medgemma?.id
          ? !!ratedMap[`medgemma:${p.medgemma.id}`]
          : false;

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
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls (A/B/Tie + strength below; Submit pinned right) */}
            <div className="flex items-start justify-center">
              <PreferenceBox
                locked={lockedRow}
                selected={selected} // 1 | 2 | "tie"
                setSelected={(val) =>
                  setChoice((m) => ({ ...m, [p.comparison]: val }))
                }
                strength={selectedStrength}
                setStrength={(val) =>
                  setChoice((m) => ({ ...m, [strKey]: val }))
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
