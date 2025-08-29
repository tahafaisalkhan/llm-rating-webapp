import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";

export default function Home() {
  const [pairs, setPairs] = useState([]);
  const [choice, setChoice] = useState({});     // { [comparison]: 1|2 }
  const [locked, setLocked] = useState({});     // { [comparison]: true } after submission
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/paired.json");
        if (!res.ok) throw new Error("Missing /data/paired.json (run npm run build:data)");
        const json = await res.json();
        setPairs(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load paired data.");
      }
    })();
  }, []);

  async function submitPref(p) {
    if (locked[p.comparison]) return;
    const result = choice[p.comparison];
    if (result !== 1 && result !== 2) {
      alert("Select a preference (1 or 2) first.");
      return;
    }
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comparison: p.comparison,
          set1Id: p.chatgpt?.id || "", // left column id
          set2Id: p.medgemma?.id || "", // right column id
          result
        })
      });
      if (res.status === 409) {
        alert("Preference already submitted for this comparison.");
        setLocked((m) => ({ ...m, [p.comparison]: true }));
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setLocked((m) => ({ ...m, [p.comparison]: true }));
      alert("Preference submitted.");
    } catch (e) {
      alert("Failed: " + (e.message || "Unknown error"));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      <h1 className="text-3xl font-bold text-center">LLM Rating Menu</h1>

      <div className="grid grid-cols-3 gap-4 font-semibold text-center sticky top-0 bg-gray-50 py-2">
        <div>Set 1</div>
        <div>Set 2</div>
        <div>Preference</div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      {pairs.map((p) => {
        const lockedRow = !!locked[p.comparison];
        return (
          <div key={p.comparison} className="grid grid-cols-3 gap-4 items-start">
            <div>
              {p.chatgpt ? (
                <PanelCard id={p.chatgpt.id} datasetid={p.chatgpt.datasetid} setLabel="set1" />
              ) : (
                <Blank label="No Set 1 item" />
              )}
            </div>
            <div>
              {p.medgemma ? (
                <PanelCard id={p.medgemma.id} datasetid={p.medgemma.datasetid} setLabel="set2" />
              ) : (
                <Blank label="No Set 2 item" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${choice[p.comparison]===1 ? "bg-blue-600 text-white" : ""} ${lockedRow ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 1 }))}
              >
                1
              </button>
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded ${choice[p.comparison]===2 ? "bg-blue-600 text-white" : ""} ${lockedRow ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setChoice((m) => ({ ...m, [p.comparison]: 2 }))}
              >
                2
              </button>
              <button
                disabled={lockedRow}
                className={`border px-3 py-1 rounded font-semibold ${lockedRow ? "opacity-50 cursor-not-allowed" : "bg-black text-white"}`}
                onClick={() => submitPref(p)}
              >
                Submit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Blank({ label }) {
  return <div className="border rounded p-4 bg-white text-sm text-gray-500">{label}</div>;
}
