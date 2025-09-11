import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state
  // result: 0 (tie) | 1 | 2
  const [choice, setChoice] = useState({});        // { [comparison]: 0|1|2 }
  const [strengthMap, setStrengthMap] = useState({}); // { [comparison]: "weak"|"moderate"|"strong"|null }
  const [locked, setLocked] = useState({});        // { [comparison]: true }

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
    const strengthEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status per rater (includes tie 0 and strength)
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
              if (j.result === 0 || j.result === 1 || j.result === 2) {
                choiceEntries[p.comparison] = j.result;
              }
              // j.strength can be null for tie or missing
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
    setChoice((m) => ({ ...m, ...choiceEntries }));
    setStrengthMap((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;
    const result = choice[p.comparison];

    // must be 0 (tie), 1, or 2
    if (![0, 1, 2].includes(result)) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }

    // strength only when result is 1 or 2
    const strength = result === 0 ? undefined : (strengthMap[p.comparison] || null);

    try {
      const body = {
        comparison: p.comparison,
        set1Id: p.chatgpt?.id || "",
        set2Id: p.medgemma?.id || "",
        result: Number(result),
        rater, // per-user submission
        // Include strength only for non-tie (backend ignores when tie anyway)
        ...(result !== 0 ? { strength } : {}),
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
        const strength = strengthMap[p.comparison] || null;

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

            {/* Preference controls (keep original look & spacing) */}
            <div className="flex items-center justify-center gap-2">
              {/* 1 */}
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${
                  selected === 1
                    ? lockedRow
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white"
                    : ""
                } ${lockedRow ? "opacity-80 cursor-not-allowed" : ""}`}
                onClick={() => {
                  setChoice((m) => ({ ...m, [p.comparison]: 1 }));
                  // keep existing strength selection unless tie was selected earlier
                  if (strengthMap[p.comparison] == null) {
                    setStrengthMap((m) => ({ ...m, [p.comparison]: "weak" }));
                  }
                }}
              >
                1
              </button>

              {/* 2 */}
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${
                  selected === 2
                    ? lockedRow
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white"
                    : ""
                } ${lockedRow ? "opacity-80 cursor-not-allowed" : ""}`}
                onClick={() => {
                  setChoice((m) => ({ ...m, [p.comparison]: 2 }));
                  if (strengthMap[p.comparison] == null) {
                    setStrengthMap((m) => ({ ...m, [p.comparison]: "weak" }));
                  }
                }}
              >
                2
              </button>

              {/* Tie (0) */}
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${
                  selected === 0
                    ? lockedRow
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white"
                    : ""
                } ${lockedRow ? "opacity-80 cursor-not-allowed" : ""}`}
                onClick={() => {
                  setChoice((m) => ({ ...m, [p.comparison]: 0 }));
                  // clear strength for ties
                  setStrengthMap((m) => ({ ...m, [p.comparison]: null }));
                }}
              >
                Tie
              </button>

              {/* Submit */}
              {lockedRow ? (
                <span className="text-green-700 font-semibold ml-2">✓ Submitted</span>
              ) : (
                <button
                  className="border px-3 py-1 rounded font-semibold bg-black text-white ml-2"
                  onClick={() => submitPref(p)}
                >
                  Submit
                </button>
              )}
            </div>

            {/* Strength chips appear only when 1 or 2 selected (not for tie) */}
            {selected === 1 || selected === 2 ? (
              <div className="col-span-3 flex items-center justify-center gap-3 -mt-2">
                {["weak", "moderate", "strong"].map((s) => {
                  const active = strength === s;
                  return (
                    <button
                      key={s}
                      disabled={lockedRow}
                      onClick={() =>
                        setStrengthMap((m) => ({ ...m, [p.comparison]: s }))
                      }
                      className={
                        "px-3 py-1 rounded-full border text-sm " +
                        (active
                          ? s === "weak"
                            ? "bg-yellow-100 border-yellow-300"
                            : s === "moderate"
                            ? "bg-blue-100 border-blue-300"
                            : "bg-red-500 text-white border-red-600"
                          : "bg-gray-50 border-gray-300")
                      }
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
            ) : null}
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
