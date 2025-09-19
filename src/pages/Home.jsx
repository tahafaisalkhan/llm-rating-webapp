import { useEffect, useState, useMemo } from "react";
import PanelCard from "../components/PanelCard";
import PreferenceBox from "../components/PreferenceBox";
import { getRater, clearRater } from "../utils/auth";

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

/** ---- lightweight local persistence so the chosen option stays green on refresh ---- */
const LS_KEY = (rater) => `PREFS_${rater || "ANON"}`;
function readPrefs(rater) {
  try {
    const raw = localStorage.getItem(LS_KEY(rater));
    return raw ? JSON.parse(raw) : { selected: {}, submitted: {} };
  } catch {
    return { selected: {}, submitted: {} };
  }
}
function writePrefs(rater, selected, submitted) {
  try {
    localStorage.setItem(LS_KEY(rater), JSON.stringify({ selected, submitted }));
  } catch {}
}

export default function Home() {
  const rater = getRater();

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState({});
  const [submittedMap, setSubmittedMap] = useState({});

  const [ratedMap, setRatedMap] = useState({});
  const [scoreMap, setScoreMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const rows = await res.json();
        const arr = Array.isArray(rows) ? rows : [];
        setPairs(arr);

        // 1) Hydrate UI immediately from localStorage (fast)
        const fromLS = readPrefs(rater);
        if (fromLS) {
          if (fromLS.selected) setSelected((m) => ({ ...fromLS.selected }));
          if (fromLS.submitted) setSubmittedMap((m) => ({ ...fromLS.submitted }));
        }

        // 2) Then confirm/override with server truth
        await checkStatuses(arr);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rater]);

  async function checkStatuses(rows) {
    const ratedEntries = {};
    const scoreEntries = {};
    const submitted = {};
    const selEntries = {};
    const fetches = [];

    for (const p of rows) {
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
            }
          })
          .catch(() => {})
      );

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
              if (typeof j.total === "number") scoreEntries[key] = j.total;
            }
          })
          .catch(() => {});

      if (p.chatgpt?.id) {
        fetches.push(handleRating(`gemma:${p.chatgpt.id}`, "gemma", p.chatgpt.id));
      }
      if (p.medgemma?.id) {
        fetches.push(handleRating(`medgemma:${p.medgemma.id}`, "medgemma", p.medgemma.id));
      }
    }

    await Promise.all(fetches);
    setRatedMap(ratedEntries);
    setScoreMap(scoreEntries);
    setSubmittedMap((prev) => {
      const merged = { ...prev, ...submitted };
      // persist merged state
      writePrefs(rater, { ...selected, ...selEntries }, merged);
      return merged;
    });
    setSelected((m) => {
      const merged = { ...m, ...selEntries };
      // persist merged state
      writePrefs(rater, merged, { ...submittedMap, ...submitted });
      return merged;
    });
  }

  const viewPairs = useMemo(() => {
    return pairs.map((p) => {
      const flip = ( (hash32(String(p.comparison)) & 1) === 1 );
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
    const resVal = selected[comp];
    if (resVal === undefined) {
      alert("Pick 1, 2, or Tie first.");
      return;
    }

    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: comp,
          set1Id: vp.left?.id || "",
          set2Id: vp.right?.id || "",
          result: resVal,
          rater,
        }),
      });

      // Immediately reflect in UI and persist locally
      setSubmittedMap((m) => {
        const next = { ...m, [comp]: true };
        writePrefs(rater, { ...selected, [comp]: resVal }, next);
        return next;
      });
      setSelected((m) => {
        const next = { ...m, [comp]: resVal };
        writePrefs(rater, next, { ...submittedMap, [comp]: true });
        return next;
      });

      alert("Preference submitted.");
    } catch (e) {
      console.error(e);
      alert("Failed: " + (e.message || "Unknown"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <a
          href="https://drive.google.com/file/d/1l_9z2HcgwKD6NZZmBkLrn_aCtZfoCVRB/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline text-gray-600 hover:text-black"
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

      <div className="grid grid-cols-3 gap-4 font-semibold text-center sticky top-0 bg-gray-50 py-2">
        <div>Set 1</div>
        <div>Set 2</div>
        <div>Preference</div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      {viewPairs.map((vp) => {
        const comp = vp.comparison;
        const sel = selected[comp];

        const leftKey = vp.left?.id ? `${vp.leftModelUsed}:${vp.left.id}` : null;
        const rightKey = vp.right?.id ? `${vp.rightModelUsed}:${vp.right.id}` : null;

        const leftRated = leftKey ? !!ratedMap[leftKey] : false;
        const rightRated = rightKey ? !!ratedMap[rightKey] : false;

        const leftScore = leftKey ? scoreMap[leftKey] : undefined;
        const rightScore = rightKey ? scoreMap[rightKey] : undefined;

        return (
          <div key={comp} className="grid grid-cols-3 gap-4 items-start">
            <div>
              {vp.left ? (
                <PanelCard
                  id={vp.left.id}
                  datasetid={vp.left.datasetid}
                  setLabel="set1"
                  rated={leftRated}
                  score={leftScore}
                />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            <div>
              {vp.right ? (
                <PanelCard
                  id={vp.right.id}
                  datasetid={vp.right.datasetid}
                  setLabel="set2"
                  rated={rightRated}
                  score={rightScore}
                />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            <div className="flex items-center justify-center">
              <PreferenceBox
                submitted={!!submittedMap[comp]}
                selected={sel === 0 ? "tie" : sel === 1 ? 1 : sel === 2 ? 2 : undefined}
                setSelected={(val) => {
                  const normalized = val === "tie" ? 0 : val;
                  setSelected((m) => {
                    const next = { ...m, [comp]: normalized };
                    writePrefs(rater, next, submittedMap);
                    return next;
                  });
                }}
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
