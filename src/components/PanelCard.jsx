import { Link } from "react-router-dom";

export default function PanelCard({ id, datasetid, model }) {
  const modelLabel = model === "chatgpt" ? "ChatGPT" : "MedGemma";
  return (
    <Link to={`/item/${id}/${model}`} className="block">
      <div className="border rounded p-4 bg-white hover:shadow transition">
        <div className="text-xs text-gray-500">{modelLabel}</div>
        <div className="mt-2 text-sm">
          <b>ID:</b> {id}
        </div>
        <div className="text-sm">
          <b>DatasetID:</b> {datasetid || "-"}
        </div>
      </div>
    </Link>
  );
}
