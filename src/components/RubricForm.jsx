import { useState } from "react";

export default function RubricForm() {
  const axes = [
    "Medical accuracy & completeness",
    "Communication & rapport",
    "Structure & flow",
    "Language & terminology",
    "Patient-safety & handover utility",
  ];

  const [scores, setScores] = useState(Array(5).fill(3));

  const submit = (e) => {
    e.preventDefault();
    console.log("Submitted rubric:", scores);
    alert("Rubric submitted (check console)");
  };

  return (
    <form onSubmit={submit} className="border rounded p-4 space-y-4 bg-white">
      <h3 className="font-semibold">Rubric (0–5)</h3>
      {axes.map((ax, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-sm">{ax}</span>
          <select
            value={scores[i]}
            onChange={(e) => {
              const arr = [...scores];
              arr[i] = Number(e.target.value);
              setScores(arr);
            }}
            className="border rounded px-2 py-1"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button className="bg-black text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
}
