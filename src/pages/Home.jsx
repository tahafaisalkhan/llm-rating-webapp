import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

// Simple, deterministic 32-bit hash for strings
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7;
  h += h << 3;  h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference UI state per comparison
  // selected: 0 | 1 | 2  (0 = tie, 1 = left, 2 = right)
  const [selected, setSelected] = useState({});
  const [strength, setStrength] = useState({});
  // track whether a submission exists (for the "Resubmit" label)
  const [submittedMap, setSubmittedMap] = useState({});

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
    const submitted = {};
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
              submitted[p.comparison] = true;
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
        // LEFT source item (historically chatgpt.json) labeled GEMMA in backend
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
    setSubmittedMap(submitted);
    setSelected((m) => ({ ...m, ...selEntries }));
    setStrength((m) => ({ ...m, ...strEntries }));
  }

  // Deterministic flip for left/right per comparison
  const viewPairs = useMemo(() => {
    return pairs.map((p) => {
      const flip = ((hash32(String(p.comparison)) & 1) === 1);
      const left = flip ? p.medgemma : p.chatgpt;
      const right = flip ? p.chatgpt : p.medgemma;

      const leftModelUsed = flip ? "medgemma" : "gemma";
      const rightModelUsed = flip ? "gemma" : "medgemma";

      return {
        comparison: p.comparison,
        left,
        right,
        leftModelUsed,
        rightModelUsed,
      };
    });
  }, [pairs]);

  async function submitPref(vp) {
    const comp = vp.comparison;

    const resVal = selected[comp]; // 0 (tie), 1 (left), 2 (right)
    const strVal = resVal === 0 ? null : (strength[comp] ?? null);

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
          comparison: comp,
          set1Id: vp.left?.id || "",   // set1 = LEFT (deterministic)
          set2Id: vp.right?.id || "",  // set2 = RIGHT
          result: resVal,              // 0,1,2
          strength: strVal,            // null for tie
          rater,
        }),
      });

      // On success (or 409 if your backend still blocks dupes),
      // re-fetch statuses so color and label stay in sync.
      await checkStatuses(pairs);
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

      {viewPairs.map((vp) => {
        const comp = vp.comparison;

        const leftKey = vp.left?.id ? `${vp.leftModelUsed}:${vp.left.id}` : null;
        const rightKey = vp.right?.id ? `${vp.rightModelUsed}:${vp.right.id}` : null;

        const leftRated = leftKey ? !!ratedMap[leftKey] : false;
        const rightRated = rightKey ? !!ratedMap[rightKey] : false;

        const leftMajor = leftKey ? !!majorMap[leftKey] : false;
        const rightMajor = rightKey ? !!majorMap[rightKey] : false;

        const sel = selected[comp];
        const str = strength[comp];

        return (
          <div key={comp} className="grid grid-cols-3 gap-4 items-start">
            {/* LEFT (Set 1) */}
            <div>
              {vp.left ? (
                <PanelCard
                  id={vp.left.id}
                  datasetid={vp.left.datasetid}
                  setLabel="set1"
                  rated={leftRated && !leftMajor}
                  major={leftMajor}
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            {/* RIGHT (Set 2) */}
            <div>
              {vp.right ? (
                <PanelCard
                  id={vp.right.id}
                  datasetid={vp.right.datasetid}
                  setLabel="set2"
                  rated={rightRated && !rightMajor}
                  major={rightMajor}
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls */}
            <div className="flex items-center justify-center">
              <PreferenceBox
                submitted={!!submittedMap[comp]}  // label: Submit → Resubmit
                selected={sel === 0 ? "tie" : sel === 1 ? 1 : sel === 2 ? 2 : undefined}
                setSelected={(val) => {
                  const normalized = val === "tie" ? 0 : val; // map to 0/1/2
                  setSelected((m) => ({ ...m, [comp]: normalized }));
                }}
                strength={str || null}
                setStrength={(val) =>
                  setStrength((m) => ({ ...m, [comp]: val }))
                }
                onSubmit={() => submitPref(vp)}
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
