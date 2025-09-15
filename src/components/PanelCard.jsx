// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - id: string
 *  - datasetid: string
 *  - setLabel: "set1" | "set2"
 *  - rated: boolean              (true => already submitted and not major)
 *  - major?: boolean            (true => major error)
 *  - score?: number             (0–35) total score to display
 */
export default function PanelCard({ id, datasetid, setLabel, rated, major = false, score }) {
  const href = `/item/${encodeURIComponent(id)}/${setLabel}`;
  const submittedText =
    typeof score === "number"
      ? `✓ Submitted (Score Given: ${score}/35)`
      : "✓ Submitted";

  return (
    <Link to={href} className="block">
      <div
        className={`border rounded p-4 transition ${
          major
            ? "bg-red-100 border-red-400"
            : rated
            ? "bg-green-100 border-green-400"
            : "bg-white hover:shadow"
        }`}
      >
        <div className="text-xs text-gray-500">
          {setLabel === "set1" ? "Set 1" : "Set 2"}
        </div>

        {/* Removed ID line */}

        <div className="text-sm">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>

        {(rated || major) && (
          <div
            className={`mt-1 text-xs font-semibold ${
              major ? "text-red-700" : "text-green-700"
            }`}
          >
            {submittedText}
          </div>
        )}
      </div>
    </Link>
  );
}
