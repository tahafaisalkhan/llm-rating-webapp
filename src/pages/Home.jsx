import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // Preference state per comparison
  // selected: 1 | 2 | "tie"
  const [selectedMap, setSelectedMap] = useState({});   // { [comparison]: 1|2|"tie" }
  const [strengthMap, setStrengthMap] = useState({});   // { [comparison]: "weak"|"moderate"|"strong"|null }
  const [locked, setLocked] = useState({});             // { [comparison]: true }

  // Rating status for cards
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
    const selectedEntries = {};
    const strengthEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status per rater — supports tie (0) and strength
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
              if (j.result === 0) selectedEntries[p.comparison] = "tie";
              else if (j.result === 1) selectedEntries[p.comparison] = 1;
              else if (j.result === 2) selectedEntries[p.comparison] = 2;
              if (typeof j.strength === "string" || j.strength === null) {
                strengthEntries[p.comparison] = j.strength;
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
    setSelectedMap((m) => ({ ...m, ...selectedEntries }));
    setStrengthMap((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;

    const sel = selectedMap[p.comparison];            // 1 | 2 | "tie"
    if (!(sel === 1 || sel === 2 || sel === "tie")) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }

    // Map UI to backend: tie -> 0
    const result = sel === "tie" ? 0 : sel;
    const strength =
      result === 0 ? undefined : (strengthMap[p.comparison] || null);

    try {
      const body = {
        comparison: p.comparison,
        set1Id: p.chatgpt?.id || "",
        set2Id: p.medgemma?.id || "",
        result, // 0 | 1 | 2
        rater,
        ...(result !== 0 ? { strength } : {}), // include strength only for non-tie
      };

      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        const comp = p.comparison;
        const lockedRow = !!locked[comp];
        const selected = selectedMap[comp];              // 1 | 2 | "tie"
        const strength = strengthMap[comp] || null;

        const set1Rated = p.chatgpt?.id
          ? !!ratedMap[`chatgpt:${p.chatgpt.id}`]
          : false;
        const set2Rated = p.medgemma?.id
          ? !!ratedMap[`medgemma:${p.medgemma.id}`]
          : false;

        return (
          <div key={comp} className="grid grid-cols-3 gap-4 items-start">
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

            {/* Preference column — uses your PreferenceBox component */}
            <div className="flex items-center justify-center">
              <PreferenceBox
                locked={lockedRow}
                selected={selected}
                setSelected={(val) => {
                  setSelectedMap((m) => ({ ...m, [comp]: val }));
                  // When switching to 1/2 from tie/undefined, if no strength set, default to "weak"
                  if ((val === 1 || val === 2) && (strengthMap[comp] == null)) {
                    setStrengthMap((m) => ({ ...m, [comp]: "weak" }));
                  }
                  if (val === "tie") {
                    setStrengthMap((m) => ({ ...m, [comp]: null }));
                  }
                }}
                strength={strength}
                setStrength={(s) =>
                  setStrengthMap((m) => ({ ...m, [comp]: s }))
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
