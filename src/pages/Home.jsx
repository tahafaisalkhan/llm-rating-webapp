import { useEffect, useState } from "react";
import PanelCard from "../components/PanelCard";

export default function Home() {
  const [chatgpt, setChatgpt] = useState([]);
  const [medgemma, setMedgemma] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [cgRes, mgRes] = await Promise.all([
          fetch("/data/chatgpt.json"),
          fetch("/data/medgemma.json"),
        ]);
        if (!cgRes.ok) throw new Error("Missing /data/chatgpt.json (did you run npm run build:data?)");
        if (!mgRes.ok) throw new Error("Missing /data/medgemma.json");
        const [cg, mg] = await Promise.all([cgRes.json(), mgRes.json()]);
        setChatgpt(cg);
        setMedgemma(mg);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Failed to load JSON.");
      }
    })();
  }, []);

  // index by id for pairing
  const byIdCg = new Map(chatgpt.map(r => [r.id, r]));
  const byIdMg = new Map(medgemma.map(r => [r.id, r]));
  const ids = Array.from(new Set([...byIdCg.keys(), ...byIdMg.keys()])).sort((a,b) => (a+"").localeCompare(b+""));

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-4">
      <h1 className="text-2xl font-semibold">LLM Translation Rater</h1>

      <div className="grid grid-cols-3 gap-4 font-semibold text-center sticky top-0 bg-gray-50 py-2">
        <div>ChatGPT</div>
        <div>MedGemma</div>
        <div>Prefer</div>
      </div>

      {err && <div className="text-sm text-red-700">{err}</div>}

      {ids.map((id) => {
        const cg = byIdCg.get(id);
        const mg = byIdMg.get(id);
        return (
          <div key={id} className="grid grid-cols-3 gap-4">
            <div>
              {cg ? (
                <PanelCard id={cg.id} datasetid={cg.datasetid} model="chatgpt" />
              ) : (
                <Blank label="No ChatGPT item" />
              )}
            </div>
            <div>
              {mg ? (
                <PanelCard id={mg.id} datasetid={mg.datasetid} model="medgemma" />
              ) : (
                <Blank label="No MedGemma item" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button className="border px-3 py-1 rounded">1</button>
              <button className="border px-3 py-1 rounded">2</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Blank({ label }) {
  return <div className="border rounded p-4 bg-white text-sm text-gray-500">{label}</div>;
}
