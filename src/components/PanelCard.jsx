// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - comparison: string | number
 *  - datasetid: string
 */
export default function PanelCard({ comparison, datasetid }) {
  const href = `/case/${encodeURIComponent(comparison)}`;

  return (
    <Link to={href} className="block">
      <div className="border rounded-xl p-4 bg-white hover:shadow-md transition">
        <div className="text-xs text-gray-500">Case</div>
        <div className="text-lg font-semibold">#{comparison}</div>
        <div className="text-sm text-gray-700 mt-1">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>
      </div>
    </Link>
  );
}
