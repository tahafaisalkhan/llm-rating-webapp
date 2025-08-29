import { Link } from "react-router-dom";

export default function PanelCard({ id, datasetid, setLabel }) {
  const href = `/item/${encodeURIComponent(id)}/${setLabel}`; // setLabel = "set1" | "set2"
  return (
    <Link to={href} className="block">
      <div className="border rounded p-4 bg-white hover:shadow transition">
        <div className="text-xs text-gray-500">{setLabel === "set1" ? "Set 1" : "Set 2"}</div>
        <div className="mt-2 text-sm"><b>ID:</b> {id}</div>
        <div className="text-sm"><b>DatasetID:</b> {datasetid || "-"}</div>
      </div>
    </Link>
  );
}
