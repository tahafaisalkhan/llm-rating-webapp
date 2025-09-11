// src/components/PanelCard.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function PanelCard({ id, datasetid, setLabel, rated, major }) {
  const ratedClass =
    rated
      ? major
        ? "bg-red-100 border-red-300"
        : "bg-green-100 border-green-300"
      : "bg-white";

  return (
    <Link
      to={`/item/${encodeURIComponent(id)}/${encodeURIComponent(setLabel)}`}
      className={`block border rounded-xl p-4 ${ratedClass}`}
    >
      <div className="text-xs text-gray-500">{setLabel === "set1" ? "Set 1" : "Set 2"}</div>
      <div className="mt-1 text-sm">
        <div><b>ID:</b> {id}</div>
        <div><b>DatasetID:</b> {datasetid || "-"}</div>
      </div>
      {rated && !major && <div className="mt-1 text-green-700 text-sm">✓ Submitted</div>}
      {rated && major && <div className="mt-1 text-red-700 text-sm">⚠ Major clinical error</div>}
    </Link>
  );
}
