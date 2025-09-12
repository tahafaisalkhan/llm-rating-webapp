import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state (per-comparison)
  // selected: 1 | 2 | 0 (tie)
  const [choice, setChoice] = useState({});         // { [comparison]: 0|1|2 }
  const [strength, setStrength] = useState({});     // { [comparison]: "weak"|"moderate"|"strong"|null }
  const [locked, setLocked] = useState({});         // { [comparison]: true }

  // rating status & major flag for cards (per-item)
  // keys like "chatgpt:<id>" / "medgemma:<id>"
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
              if ([0, 1, 2].includes(Number(j.result))) {
                choiceEntries[p.comparison] = Number(j.result);
              }
              strengthEntries[p.comparison] =
                j.result === 0 ? null : (j.strength ?? null);
            }
          })
          .catch(() => {})
      );

      // rating status for each panel per rater (+ major flag)
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
        fetches.push(
          handleRating(`chatgpt:${p.chatgpt.id}`, "chatgpt", p.chatgpt.id)
        );
      }
      if (p.medgemma?.id) {
        fetches.push(
          handleRating(`medgemma:${p.medgemma.id}`, "medgemma", p.medgemma.id)
        );
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setMajorMap(majorEntries);
    setLocked((m) => ({ ...m, ...lockedEntries }));
    setChoice((m) => ({ ...m, ...choiceEntries }));
    setStrength((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;

    const selected = choice[p.comparison]; // 0|1|2
    if (![0, 1, 2].includes(Number(selected))) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }
    const s =
      selected === 0
        ? null
        : strength[p.comparison] ?? null; // only when not tie

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: Number(selected), // 0,1,2
          strength: s,
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

  const PrefButton = ({ active, disabled, onClick, children }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-md border text-sm font-medium transition",
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
        disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const StrengthChip = ({ active, disabled, onClick, palette, children }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full border text-xs font-medium transition",
        active
          ? palette
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
        disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
      title={children}
    >
      {children}
    </button>
  );

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
        const set1Key = p.chatgpt?.id ? `chatgpt:${p.chatgpt.id}` : null;
        const set2Key = p.medgemma?.id ? `medgemma:${p.medgemma.id}` : null;

        const set1Rated = set1Key ? !!ratedMap[set1Key] : false;
        const set2Rated = set2Key ? !!ratedMap[set2Key] : false;

        const set1Major = set1Key ? !!majorMap[set1Key] : false;
        const set2Major = set2Key ? !!majorMap[set2Key] : false;

        const selected = choice[p.comparison];          // 0|1|2|undefined
        const selStrength = strength[p.comparison] || null;

        const lockedRow = !!locked[p.comparison];
        const disableStrength = lockedRow || !selected || selected === 0;

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            {/* Set 1 card */}
            <div>
              {p.chatgpt ? (
                <PanelCard
                  id={p.chatgpt.id}
                  datasetid={p.chatgpt.datasetid}
                  setLabel="set1"
                  // green only if not major
                  rated={set1Major ? false : set1Rated}
                  // red priority
                  major={set1Major}
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
                  rated={set2Major ? false : set2Rated}
                  major={set2Major}
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls */}
            <div className="flex flex-col items-center gap-1">
              {/* Row 1: 1 / 2 / Tie + Submit on the right (inline) */}
              <div className="flex items-center gap-2">
                <PrefButton
                  active={selected === 1}
                  disabled={lockedRow}
                  onClick={() =>
                    setChoice((m) => ({ ...m, [p.comparison]: 1 }))
                  }
                >
                  1
                </PrefButton>
                <PrefButton
                  active={selected === 2}
                  disabled={lockedRow}
                  onClick={() =>
                    setChoice((m) => ({ ...m, [p.comparison]: 2 }))
                  }
                >
                  2
                </PrefButton>
                <PrefButton
                  active={selected === 0}
                  disabled={lockedRow}
                  onClick={() => {
                    setChoice((m) => ({ ...m, [p.comparison]: 0 }));
                    setStrength((m) => ({ ...m, [p.comparison]: null }));
                  }}
                >
                  Tie
                </PrefButton>

                {lockedRow ? (
                  <span className="text-green-700 font-semibold">
                    ✓ Submitted
                  </span>
                ) : (
                  <button
                    className="px-3 py-1.5 rounded-md bg-black text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={
                      lockedRow || !selected || (selected !== 0 && !selStrength)
                    }
                    onClick={() => submitPref(p)}
                  >
                    Submit
                  </button>
                )}
              </div>

              {/* Row 2: Strength chips appear below (reserve height to avoid layout jump) */}
              <div
                className={[
                  "flex items-center gap-2 min-h-[30px]",
                  selected === 0 || !selected ? "invisible" : "visible",
                ].join(" ")}
              >
                <StrengthChip
                  active={selStrength === "weak"}
                  disabled={disableStrength}
                  onClick={() =>
                    setStrength((m) => ({ ...m, [p.comparison]: "weak" }))
                  }
                  palette="bg-amber-100 text-amber-800 border-amber-300"
                >
                  Weak
                </StrengthChip>
                <StrengthChip
                  active={selStrength === "moderate"}
                  disabled={disableStrength}
                  onClick={() =>
                    setStrength((m) => ({ ...m, [p.comparison]: "moderate" }))
                  }
                  palette="bg-blue-100 text-blue-800 border-blue-300"
                >
                  Moderate
                </StrengthChip>
                <StrengthChip
                  active={selStrength === "strong"}
                  disabled={disableStrength}
                  onClick={() =>
                    setStrength((m) => ({ ...m, [p.comparison]: "strong" }))
                  }
                  palette="bg-red-600 text-white border-red-700"
                >
                  Strong
                </StrengthChip>
              </div>
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
