// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PanelCard from "../components/PanelCard";
import { getRater, clearRater } from "../utils/auth";

export default function Home() {
  const navigate = useNavigate();
  const rater = getRater(); // USERX from localStorage

  const [pairs, setPairs] = useState([]);
  const [err, setErr] = useState("");

  // preference state (per user)
  const [choice, setChoice] = useState({}); // { [comparison]: 1|2 }
  const [locked, setLocked] = useState({}); // { [comparison]: true }

  // rating status for cards (per user)
  const [ratedMap, setRatedMap] = useState({}); // { "chatgpt:<id>": true, "medgemma:<id>": true }

  // redirect to login if no user
  useEffect(() => {
    if (!rater) navigate("/login");
  }, [rater, navigate]);

  // Load pairs & statuses whenever rater changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // clear old user’s UI state first
        setChoice({});
        setLocked({});
        setRatedMap({});
        setErr("");

        const res = await fetch("/data/paired.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Missing /data/paired.json");
        const rows = await res.json();
        const arr = Array.isArray(rows) ? rows : [];
        if (cancelled) return;
        setPairs(arr);

        await checkStatuses(arr, rater);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setErr(e.message || "Failed to load paired data.");
        }
      }
    }

    if (rater) load();
    return () => {
      cancelled = true;
    };
  }, [rater]);

  async function checkStatuses(rows, who) {
    const ratedEntries = {};
    const lockedEntries = {};
    const choiceEntries = {};
    const fetches = [];

    for (const p of rows) {
      // preference status per rater
      fetches.push(
        fetch(`/api/preferences/status?comparison=${encodeURIComponent(p.comparison)}&rater=${encodeURIComponent(who)}`)
          .then((r) => (r.ok ? r.json() : { exists: false }))
          .then((j) => {
            if (j?.exists) {
              lockedEntries[p.comparison] = true;
              if (j.result === 1 || j.result === 2) choiceEntries[p.comparison] = j.result;
            }
          })
          .catch(() => {})
      );

      // rating status for each panel per rater
      if (p.chatgpt?.id) {
        fetches.push(
          fetch(`/api/ratings/status?modelUsed=chatgpt&modelId=${encodeURIComponent(p.chatgpt.id)}&rater=${encodeURIComponent(who)}`)
            .then((r) => (r.ok ? r.json() : { exists: false }))
            .then((j) => {
              if (j?.exists) ratedEntries[`chatgpt:${p.chatgpt.id}`] = true;
            })
            .catch(() => {})
        );
      }
      if (p.medgemma?.id) {
        fetches.push(
          fetch(`/api/ratings/status?modelUsed=medgemma&modelId=${encodeURIComponent(p.medgemma.id)}&rater=${encodeURIComponent(who)}`)
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
    setLocked({ ...lockedEntries }); // replace to avoid stale
    setChoice({ ...choiceEntries });
  }

  async function submitPref(p) {
    if (locked[p.comparison]) return;
    const result = choice[p.comparison];
    if (result !== 1 && result !== 2) {
      alert("Pick 1 or 2 first.");
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
          result,
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
        <Link
          to="/rubric"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Scoring Rubric
        </Link>

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
              navigate("/login");
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

        const set1Rated = p.chatgpt?.id ? !!ratedMap[`chatgpt:${p.chatgpt.id}`] : false;
        const set2Rated = p.medgemma?.id ? !!ratedMap[`medgemma:${p.medgemma.id}`] : false;

        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            {/* Set 1 card */}
            <div>
              {p.chatgpt ? (
                <PanelCard id={p.chatgpt.id} datasetid={p.chatgpt.datasetid} setLabel="set1" rated={set1Rated} />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>

            {/* Set 2 card */}
            <div>
              {p.medgemma ? (
                <PanelCard id={p.medgemma.id} datasetid={p.medgemma.datasetid} setLabel="set2" rated={set2Rated} />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>

            {/* Preference controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${
                  selected === 1 ? (lockedRow ? "bg-green-600 text-white" : "bg-blue-600 text-white") : ""
                } ${lockedRow ? "opacity-80 cursor-not-allowed" : ""}`}
                onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 1 }))}
              >
                1
              </button>
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${
                  selected === 2 ? (lockedRow ? "bg-green-600 text-white" : "bg-blue-600 text-white") : ""
                } ${lockedRow ? "opacity-80 cursor-not-allowed" : ""}`}
                onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 2 }))}
              >
                2
              </button>

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
    <div className="border rounded p-4 bg-white text-sm text-gray-500">{label}</div>
  );
}
