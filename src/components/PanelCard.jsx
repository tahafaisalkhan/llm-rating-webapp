// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - id: string
 *  - datasetid: string
 *  - setLabel: "set1" | "set2"
 *  - rated: boolean
 *  - major?: boolean   // ← NEW: major error flag
 */
export default function PanelCard({ id, datasetid, setLabel, rated, major = false }) {
  const href = `/item/${encodeURIComponent(id)}/${setLabel}`;

  const base = "border rounded p-4 transition";
  const color = major
    ? "bg-red-100 border-red-400"
    : rated
    ? "bg-green-100 border-green-400"
    : "bg-white hover:shadow";

  return (
    <Link to={href} className="block">
      <div className={`${base} ${color}`}>
        <div className="text-xs text-gray-500">
          {setLabel === "set1" ? "Set 1" : "Set 2"}
        </div>
        <div className="mt-2 text-sm">
          <b>ID:</b> {id}
        </div>
        <div className="text-sm">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>
        {major ? (
          <div className="mt-1 text-xs font-semibold text-red-700">
            ⚠ Major clinical error
          </div>
        ) : rated ? (
          <div className="mt-1 text-xs font-semibold text-green-700">
            ✓ Submitted
          </div>
        ) : null}
      </div>
    </Link>
  );
}
