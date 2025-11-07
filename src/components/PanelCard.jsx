// src/components/PanelCard.jsx
import { Link } from "react-router-dom";

/**
 * Props:
 *  - comparison: string | number
 *  - datasetid: string
 *  - completed?: boolean
 *  - locked?: boolean
 */
export default function PanelCard({ comparison, datasetid, completed, locked }) {
  const href = `/case/${encodeURIComponent(comparison)}`;

  const cardClasses = [
    "border rounded-xl p-4 transition relative",
    completed ? "border-green-500 bg-green-100" : "border-gray-200 bg-white",
    locked
      ? "opacity-50 pointer-events-none"
      : "hover:shadow-md hover:-translate-y-[1px]",
  ].join(" ");

  const content = (
    <div className={cardClasses}>
      {/* Lock badge */}
      {locked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded-full border">
          <span role="img" aria-label="locked">
            🔒
          </span>
          <span>Locked</span>
        </div>
      )}

      {/* Completed badge */}
      {completed && !locked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-green-700 bg-green-200/90 px-2 py-0.5 rounded-full border border-green-500">
          <span role="img" aria-label="done">
            ✅
          </span>
          <span>Done</span>
        </div>
      )}

      <div className="text-xs text-gray-500">Case</div>
      <div className="text-lg font-semibold">#{comparison}</div>
      <div className="text-sm text-gray-700 mt-1">
        <b>DatasetID:</b> {datasetid || "-"}
      </div>
    </div>
  );

  // If locked, just render a div (no navigation)
  if (locked) {
    return <div className="block">{content}</div>;
  }

  // If unlocked, wrap in Link
  return (
    <Link to={href} className="block">
      {content}
    </Link>
  );
}
