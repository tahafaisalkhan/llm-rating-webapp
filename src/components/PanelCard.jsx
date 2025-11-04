// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - comparison: string | number
 *  - datasetid: string
 *  - completed: boolean  (true => case fully rated)
 */
export default function PanelCard({ comparison, datasetid, completed }) {
  const href = `/case/${encodeURIComponent(comparison)}`;

  return (
    <Link to={href} className="block">
      <div
        className={[
          "border rounded-xl p-4 transition",
          completed
            ? "bg-green-50 border-green-500"
            : "bg-white hover:shadow-md",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-gray-500">Case</div>
            <div className="text-lg font-semibold">#{comparison}</div>
          </div>

          {completed && (
            <div className="text-xs font-semibold text-green-700">
              ✓ Rated
            </div>
          )}
        </div>

        <div className="text-sm text-gray-700 mt-1">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>
      </div>
    </Link>
  );
}
