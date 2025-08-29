import { useEffect, useState } from "react";

export default function RubricForm({ disabledInitial=false, itemId, datasetId, comparison, modelUsed }) {
  const axes = [
    "Medical accuracy & completeness",
    "Communication & rapport",
    "Structure & flow",
    "Language & terminology",
    "Patient-safety & handover utility",
  ];
  const [scores, setScores] = useState([3,3,3,3,3]);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(disabledInitial);

  useEffect(() => { setLocked(disabledInitial); }, [disabledInitial]);

  async function submit(e) {
    e.preventDefault();
    if (locked) return;
    setSaving(true);
    try {
      const body = {
        modelId: itemId,
        datasetId,
        comparison,
        modelUsed,              // "chatgpt" | "medgemma" (kept internal)
        scores: {
          axis1: scores[0], axis2: scores[1], axis3: scores[2], axis4: scores[3], axis5: scores[4]
        }
      };
      const res = await fetch("/api/ratings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.status === 409) {
        alert("A rating already exists for this item.");
        setLocked(true);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setLocked(true);
      alert("Rating saved.");
    } catch (e2) {
      alert("Failed: " + (e2.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="font-semibold">Rubric (0–5)</h3>

      {axes.map((ax, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-sm">{ax}</span>
          <select
            disabled={locked}
            value={scores[i]}
            onChange={(e) => {
              const arr = [...scores]; arr[i] = Number(e.target.value); setScores(arr);
            }}
            className="border rounded px-2 py-1 min-w-[80px]"
          >
            {[0,1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}

      <button
        disabled={locked || saving}
        className={`px-4 py-2 rounded font-semibold ${locked ? "opacity-50 cursor-not-allowed" : "bg-black text-white"}`}
      >
        {locked ? "Submitted" : (saving ? "Saving..." : "Submit")}
      </button>
    </form>
  );
}
