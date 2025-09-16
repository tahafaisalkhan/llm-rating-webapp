// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - id: string
 *  - datasetid: string
 *  - setLabel: "set1" | "set2"
 *  - rated: boolean              (true => already submitted)
 */
export default function PanelCard({ id, datasetid, setLabel, rated }) {
  const href = `/item/${encodeURIComponent(id)}/${setLabel}`;
  const submittedText = "✓ Submitted";

  return (
    <Link to={href} className="block">
      <div
        className={`border rounded p-4 transition ${
          rated ? "bg-green-100 border-green-400" : "bg-white hover:shadow"
        }`}
      >
        <div className="text-xs text-gray-500">
          {setLabel === "set1" ? "Set 1" : "Set 2"}
        </div>
        <div className="mt-2 text-sm">
          <b>Press for Data</b>
        </div>
        <div className="text-sm">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>

        {rated && (
          <div className="mt-1 text-xs font-semibold text-green-700">
            {submittedText}
          </div>
        )}
      </div>
    </Link>
  );
}
