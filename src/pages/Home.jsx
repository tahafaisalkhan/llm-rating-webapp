// src/pages/Home.jsx
import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state
  // choice: { [comparison]: 1 | 2 | 'tie' }
  const [choice, setChoice] = useState({});
  // strength: { [comparison]: 'weak' | 'moderate' | 'strong' | undefined }
  const [strength, setStrength] = useState({});
  // locked (already submitted): { [comparison]: true }
  const [locked, setLocked] = useState({});

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
              // server returns result: 0|1|2 ; map 0 -> 'tie'
              if (j.result === 0) choiceEntries[p.comparison] = "tie";
              if (j.result === 1) choiceEntries[p.comparison] = 1;
              if (j.result === 2) choiceEntries[p.comparison] = 2;
              // strength optional; if server returns it, reflect it
              if (j.strength) {
                setStrength((m) => ({ ...m, [p.comparison]: j.strength }));
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

    const sel = choice[p.comparison]; // 1 | 2 | 'tie'
    const str = strength[p.comparison] || null; // 'weak'|'moderate'|'strong'|null

    if (sel !== 1 && sel !== 2 && sel !== "tie") {
      alert("Pick 1, 2, or Tie first.");
      return;
    }
    if (sel !== "tie" && !str) {
      alert("Pick strength (weak / moderate / strong).");
      return;
    }

    const resultNum = sel === "tie" ? 0 : sel;

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: resultNum, // 0 | 1 | 2
          strength: sel === "tie" ? null : str, // omit/ignore for tie
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
        const lockedRow = !!locked[p.comparison];
        const sel = choice[p.comparison]; // 1 | 2 | 'tie'
        const str = strength[p.comparison]; // 'weak' | 'moderate' | 'strong' | undefined

        const set1Rated = p.chatgpt?.id
          ? !!ratedMap[`chatgpt:${p.chatgpt.id}`]
          : false;
        const set2Rated = p.medgemma?.id
          ? !!ratedMap[`medgemma:${p.medgemma.id}`]
          : false;

        const canSubmit =
          !lockedRow &&
          ((sel === "tie") || (sel === 1 || sel === 2) && !!str);

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

            {/* Preference controls */}
            <div className="flex items-center justify-between gap-3 pr-2">
              {/* left group: main buttons + (optional) strength */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MiniBtn
                    label="1"
                    active={sel === 1}
                    disabled={lockedRow}
                    onClick={() =>
                      setChoice((m) => ({ ...m, [p.comparison]: 1 }))
                    }
                  />
                  <MiniBtn
                    label="2"
                    active={sel === 2}
                    disabled={lockedRow}
                    onClick={() =>
                      setChoice((m) => ({ ...m, [p.comparison]: 2 }))
                    }
                  />
                  <MiniBtn
                    label="Tie"
                    active={sel === "tie"}
                    disabled={lockedRow}
                    onClick={() => {
                      setChoice((m) => ({ ...m, [p.comparison]: "tie" }));
                      // clear strength for tie
                      setStrength((m) => {
                        const copy = { ...m };
                        delete copy[p.comparison];
                        return copy;
                      });
                    }}
                  />
                </div>

                {/* strength only when 1 or 2 is chosen */}
                {(sel === 1 || sel === 2) && (
                  <div className="flex items-center gap-2">
                    <Pill
                      label="Weak"
                      tone="weak"
                      active={str === "weak"}
                      disabled={lockedRow}
                      onClick={() =>
                        setStrength((m) => ({ ...m, [p.comparison]: "weak" }))
                      }
                    />
                    <Pill
                      label="Moderate"
                      tone="moderate"
                      active={str === "moderate"}
                      disabled={lockedRow}
                      onClick={() =>
                        setStrength((m) => ({
                          ...m,
                          [p.comparison]: "moderate",
                        }))
                      }
                    />
                    <Pill
                      label="Strong"
                      tone="strong"
                      active={str === "strong"}
                      disabled={lockedRow}
                      onClick={() =>
                        setStrength((m) => ({ ...m, [p.comparison]: "strong" }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* right: submit / submitted */}
              {lockedRow ? (
                <span className="text-green-700 font-semibold whitespace-nowrap">
                  ✓ Submitted
                </span>
              ) : (
                <button
                  className={`px-4 py-2 rounded font-semibold text-white ${
                    canSubmit
                      ? "bg-black hover:bg-gray-900"
                      : "bg-gray-500 cursor-not-allowed"
                  }`}
                  onClick={() => canSubmit && submitPref(p)}
                  disabled={!canSubmit}
                >
                  Submit
                </button>
              )}
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

/* ---------- Small UI helpers ---------- */

function MiniBtn({ label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-3 py-1 text-sm rounded-md border",
        "transition-colors whitespace-nowrap",
        disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-100",
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Pill({ label, tone, active, disabled, onClick }) {
  const base =
    "px-3 py-1 text-sm rounded-full border whitespace-nowrap transition-colors";
  const off = "bg-white text-gray-700 border-gray-300 hover:bg-gray-100";
  const onByTone = {
    weak: "bg-sky-100 text-sky-800 border-sky-300",
    moderate: "bg-amber-100 text-amber-800 border-amber-300",
    strong: "bg-red-600 text-white border-red-700",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        base,
        disabled ? "opacity-70 cursor-not-allowed" : "",
        active ? onByTone : off,
      ].join(" ")}
    >
      {label}
    </button>
  );
}
