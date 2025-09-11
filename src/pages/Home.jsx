import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state
  // choice: { [comparison]: 1 | 2 | 0 }  (0 = tie)
  const [choice, setChoice] = useState({});
  // strength: { [comparison]: 'weak'|'moderate'|'strong'|'' }
  const [strength, setStrength] = useState({});
  // lock map
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
    const strengthEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status per rater (returns result and strength)
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
              if ([0, 1, 2].includes(j.result)) choiceEntries[p.comparison] = j.result;
              if (j.strength) strengthEntries[p.comparison] = j.strength;
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
    setStrength((m) => ({ ...m, ...strengthEntries }));
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;

    const selected = choice[p.comparison]; // 0,1,2
    if (![0, 1, 2].includes(selected)) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }

    // If 1 or 2, require strength; if tie (0), strength must not be sent.
    let sendStrength = null;
    if (selected === 1 || selected === 2) {
      const s = strength[p.comparison] || "";
      if (!["weak", "moderate", "strong"].includes(s)) {
        alert('Select “How strong?” (weak / moderate / strong).');
        return;
      }
      sendStrength = s;
    }

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "",
          set2Id: p.medgemma?.id || "",
          result: Number(selected),      // 0 | 1 | 2
          strength: sendStrength,        // null for tie
          rater,                         // per-user submission
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
        const selected = choice[p.comparison]; // 0|1|2

        const set1Rated = p.chatgpt?.id ? !!ratedMap[`chatgpt:${p.chatgpt.id}`] : false;
        const set2Rated = p.medgemma?.id ? !!ratedMap[`medgemma:${p.medgemma.id}`] : false;

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
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* A/B/Tie buttons */}
              <div className="flex items-center gap-2">
                <ButtonPref
                  label="1"
                  active={selected === 1}
                  disabled={lockedRow}
                  onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 1 }))}
                />
                <ButtonPref
                  label="2"
                  active={selected === 2}
                  disabled={lockedRow}
                  onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 2 }))}
                />
                <ButtonPref
                  label="Tie"
                  active={selected === 0}
                  disabled={lockedRow}
                  onClick={() => {
                    setChoice((m) => ({ ...m, [p.comparison]: 0 }));
                    // clear strength when tie is chosen
                    setStrength((m) => {
                      const c = { ...m };
                      delete c[p.comparison];
                      return c;
                    });
                  }}
                />
              </div>

              {/* Strength pills: only when 1 or 2 selected */}
              {(selected === 1 || selected === 2) && (
                <div className="flex items-center gap-2 text-xs">
                  <StrengthPill
                    color="bg-yellow-400"
                    label="Weak"
                    value="weak"
                    name={`strength-${p.comparison}`}
                    checked={(strength[p.comparison] || "") === "weak"}
                    disabled={lockedRow}
                    onChange={() =>
                      setStrength((m) => ({ ...m, [p.comparison]: "weak" }))
                    }
                  />
                  <StrengthPill
                    color="bg-orange-500"
                    label="Moderate"
                    value="moderate"
                    name={`strength-${p.comparison}`}
                    checked={(strength[p.comparison] || "") === "moderate"}
                    disabled={lockedRow}
                    onChange={() =>
                      setStrength((m) => ({ ...m, [p.comparison]: "moderate" }))
                    }
                  />
                  <StrengthPill
                    color="bg-red-600"
                    label="Strong"
                    value="strong"
                    name={`strength-${p.comparison}`}
                    checked={(strength[p.comparison] || "") === "strong"}
                    disabled={lockedRow}
                    onChange={() =>
                      setStrength((m) => ({ ...m, [p.comparison]: "strong" }))
                    }
                  />
                </div>
              )}

              {/* Submit now sits to the RIGHT */}
              {lockedRow ? (
                <span className="text-green-700 font-semibold">✓ Submitted</span>
              ) : (
                <button
                  className="border px-3 py-1 rounded font-semibold bg-black text-white"
                  onClick={() => submitPref(p)}
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

function ButtonPref({ label, active, disabled, onClick }) {
  const base = "border px-3 py-1 rounded";
  const on   = "bg-blue-600 text-white";
  const off  = "bg-white";
  const dis  = disabled ? "opacity-80 cursor-not-allowed" : "hover:bg-blue-50";
  return (
    <button className={`${base} ${active ? on : off} ${dis}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

/** Colored “radio-pill” for strength */
function StrengthPill({ color, label, value, name, checked, disabled, onChange }) {
  const ring = checked ? `ring-2 ring-offset-1 ring-gray-700` : "ring-1 ring-gray-300";
  const shade = checked ? color : "bg-gray-100";
  const text = checked ? "text-white" : "text-gray-700";
  const cursor = disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer";
  return (
    <label className={`inline-flex items-center gap-2 ${cursor}`}>
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${shade} ${text} ${ring}`}>
        {label}
      </span>
    </label>
  );
}
