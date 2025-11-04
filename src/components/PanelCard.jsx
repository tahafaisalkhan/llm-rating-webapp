// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - comparison: string | number
 *  - datasetid: string
 *  - gemmaRated: boolean
 *  - medgemmaRated: boolean
 *  - gemmaScore?: number
 *  - medgemmaScore?: number
 */
export default function PanelCard({
  comparison,
  datasetid,
  gemmaRated,
  medgemmaRated,
  gemmaScore,
  medgemmaScore,
}) {
  const href = `/case/${encodeURIComponent(comparison)}`;

  return (
    <Link to={href} className="block">
      <div className="border rounded-xl p-4 bg-white hover:shadow-md transition flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Case</div>
          <div className="text-lg font-semibold">#{comparison}</div>
          <div className="text-sm text-gray-700 mt-1">
            <b>DatasetID:</b> {datasetid || "-"}
          </div>
        </div>

        <div className="text-xs text-right space-y-1">
          <div className={gemmaRated ? "text-green-700 font-semibold" : "text-gray-400"}>
            Gemma: {gemmaRated ? `Rated ✓${gemmaScore != null ? ` (${gemmaScore}/40)` : ""}` : "Not rated"}
          </div>
          <div className={medgemmaRated ? "text-green-700 font-semibold" : "text-gray-400"}>
            MedGemma:{" "}
            {medgemmaRated
              ? `Rated ✓${medgemmaScore != null ? ` (${medgemmaScore}/40)` : ""}`
              : "Not rated"}
          </div>
        </div>
      </div>
    </Link>
  );
}
