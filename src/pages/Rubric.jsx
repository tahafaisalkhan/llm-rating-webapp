import { Link } from "react-router-dom";

export default function Rubric() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      <Link to="/" className="text-blue-600 underline">← Back</Link>
      <h1 className="text-2xl font-bold">Scoring Rubric</h1>

      <div className="space-y-4 text-gray-800 leading-relaxed">
        <p>
          <b>Rubric Design</b><br/>
          Using a multi-axis rubric (5 main categories, each with sub-items) scored 0–5 with free-text comments,
          applied by LLM evaluators (Claude-3 & GPT-4-Turbo) to every generated dialogue and by human experts on
          a sampled subset, inspired by the Arabic translation of ACI Bench.
        </p>

        <div>
          <b>Axis 1 — Medical accuracy & completeness</b><br/>
          (symptoms, history, findings, diagnosis, treatment): score 0–5 for whether all clinically relevant
          facts from the English source are present and correctly represented in Urdu.<br/>
          <i>Subitems:</i> symptom fidelity, relevant history preserved, diagnosis/treatment fidelity.
        </div>

        <div>
          <b>Axis 2 — Communication & rapport</b><br/>
          (clarity, empathy, patient voice): score 0–5 for whether the Urdu preserves conversational tone,
          clarity of clinician explanations, and respectful phrasing.<br/>
          <i>Subitems:</i> clarity of questions/explanations, preservation of patient statements,
          maintenance of appropriate empathy/rapport.
        </div>

        <div>
          <b>Axis 3 — Structure & flow</b><br/>
          (coherence, chronology, turn-taking integrity): score 0–5 for logical organization and conversational flow.<br/>
          <i>Subitems:</i> correct chronological order, clear speaker turns, coherent transitions.
        </div>

        <div>
          <b>Axis 4 — Language & terminology</b><br/>
          (idiomatic Urdu, term consistency, glossary adherence): score 0–5 for natural Urdu phrasing and consistent use of medical terminology per your glossary.<br/>
          <i>Subitems:</i> idiomatic expression, correct use of [EN_TERM] markers, consistent medication/diagnosis naming.
        </div>

        <div>
          <b>Axis 5 — Patient-safety & handover utility</b><br/>
          (red-flags, dosing, numeric integrity): score 0–5 for preservation of safety-critical information and handover readiness.<br/>
          <i>Subitems:</i> red-flag signs preserved, medication names/doses/units exact, numeric/vital values intact.
        </div>

        <div>
          <b>Unsupported-span annotation</b><br/>
          Annotators must highlight any span(s) in the Urdu text that add, infer, or invent information not
          present in the English source; for each span record text, why it’s unsupported, and severity
          (Minor / Moderate / Major).
        </div>

        <div>
          <b>Scoring guide</b><br/>
          0 = dangerous/unusable, 1 = poor, 2 = usable with major edits, 3 = usable with minor edits,
          4 = good/near-ready, 5 = excellent/ready-for-use.
        </div>

        <div>
          <b>Decision rule & workflow</b><br/>
          Auto-accept items with an average rubric score ≥ 4.5 and no Major unsupported spans or medication/numeric mismatches.
          Items below 4.5 or with Major flags go to the Improvement Agent. A sampled subset (~50 items or 10%) is human-reviewed.
        </div>

        <div>
          <b>Implementation notes (LLM + human)</b><br/>
          Provide the LLM evaluator with: (a) the English source, (b) the Urdu translation, (c) the glossary,
          and instructions to return JSON with per-axis scores, comments, unsupported spans, and pass/fail.
          For humans: blind outputs to model identity, require ≥2 clinician ratings, adjudicate disagreements.
        </div>

        <div>
          <b>Accompanying automatic metrics</b><br/>
          Always run automatic checks (medication exactness, numeric/unit validation, back-translation concept F1,
          ROUGE/BERTScore) and flag items with disagreements for focused human review.
        </div>
      </div>
    </div>
  );
}
