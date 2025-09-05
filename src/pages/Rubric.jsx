import { Link } from "react-router-dom";

export default function Rubric() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 text-gray-900">
      <Link to="/" className="text-blue-600 underline">← Back</Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Human-Evaluation Rubric</h1>
        <p className="text-sm text-gray-600">
          A multi-axis rubric (7 axes) inspired by ArabicBench. Each axis is scored 0–5 and accompanied by a short (1–2 line) comment explaining major deductions.
        </p>
      </header>

      {/* Scoring Guide */}
      <section className="rounded-2xl border p-4 bg-gray-50">
        <h2 className="text-xl font-semibold">Scoring Guide</h2>
        <p className="mt-2">
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">0</span>
          dangerous / unusable
        </p>
        <p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">1</span>
          poor
        </p>
        <p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">2</span>
          usable with major edits
        </p>
        <p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">3</span>
          usable with minor edits
        </p>
        <p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">4</span>
          good / near-ready
        </p>
        <p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium mr-2">5</span>
          excellent / ready-for-use
        </p>
        <p className="mt-3 text-sm text-gray-700">
          <b>Comment rule:</b> For each axis, record a brief comment (1–2 lines) explaining any point deductions and citing the concrete issue(s).
        </p>
      </section>

      {/* Axes */}
      <ol className="space-y-6 list-decimal list-inside">
        {/* Axis 1 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 1 — Medical Accuracy &amp; Completeness</h3>
            <p className="mt-1 text-gray-700">
              Measures whether all clinically relevant facts from the source dialogue are present, correct, and not hallucinated.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Symptom fidelity</li>
                <li>Relevant history preserved</li>
                <li>Findings / diagnosis correctness</li>
                <li>Treatment fidelity</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 2 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 2 — Clinical Safety &amp; Handover Utility</h3>
            <p className="mt-1 text-gray-700">
              Measures whether the note is safe to hand over to another clinician without risk of harm.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Red-flag symptoms preserved</li>
                <li>Medication names / doses / units exact</li>
                <li>Lab values / vitals intact</li>
                <li>No dangerous omissions or misstatements</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 3 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 3 — Guideline Alignment &amp; Clinical Reasoning</h3>
            <p className="mt-1 text-gray-700">
              Measures whether diagnoses, management, and recommendations align with standard clinical practice and sound reasoning.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Appropriateness of diagnosis</li>
                <li>Management / treatment aligns with guidelines</li>
                <li>Reasoning consistent with medical logic</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 4 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 4 — Language &amp; Terminology Accuracy (Urdu/English)</h3>
            <p className="mt-1 text-gray-700">
              Measures fidelity and clarity of language choices across Urdu/English, including correct and consistent medical terminology.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Idiomatic, natural Urdu where applicable</li>
                <li>Term consistency and glossary adherence</li>
                <li>Accurate medication / diagnosis naming</li>
                <li>Faithful rendering of clinical nuances</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 5 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 5 — Structure, Flow &amp; Communication</h3>
            <p className="mt-1 text-gray-700">
              Measures clarity, coherence, and communicative faithfulness to the consultation.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Correct sectioning (Subjective, Objective, Assessment, Plan)</li>
                <li>Chronological order preserved</li>
                <li>Clear speaker turns and transitions</li>
                <li>Clarity of clinician explanations</li>
                <li>Preservation of key patient statements</li>
                <li>Respectful, professional tone</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 6 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 6 — Communication, Rapport &amp; Patient Engagement</h3>
            <p className="mt-1 text-gray-700">
              Measures preservation of the human interaction and patient voice.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Subitems</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Clarity of clinician explanations</li>
                <li>Respectful tone and empathy preserved</li>
                <li>Patient participation and concerns addressed</li>
                <li>Patient education included where relevant</li>
              </ul>
            </div>
          </section>
        </li>

        {/* Axis 7 */}
        <li>
          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">Axis 7 — Alignment to Source (“traceability”)</h3>
            <p className="mt-1 text-gray-700">
              For every sentence in the note, ask: “Can this sentence be traced back to a specific part of the dialogue?”
            </p>
            <div className="mt-3">
              <h4 className="font-semibold">Rules</h4>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>If <b>yes</b> → align it to the corresponding transcript sentence(s).</li>
                <li>If <b>no</b> → mark it as <i>unsupported</i> (hallucinated / added knowledge not in the transcript).</li>
              </ul>
            </div>
          </section>
        </li>
      </ol>

      {/* Unsupported / Extra Comments */}
      <section className="rounded-2xl border p-5">
        <h3 className="text-lg font-bold">Extra Comments TextBox (Optional)</h3>
        <p className="mt-1 text-gray-700">
          Not part of the numeric evaluation; use to explicitly flag suspected hallucinations, mistranslations, or other issues that cut across axes.
          Include span(s), why unsupported, and severity (Minor / Moderate / Major).
        </p>
      </section>

      {/* How to Use */}
      <section className="rounded-2xl border p-5 bg-gray-50">
        <h2 className="text-xl font-semibold">How to Use This Rubric</h2>
        <ol className="mt-2 list-decimal list-inside space-y-1">
          <li>Score each axis from 0–5.</li>
          <li>Write a brief (1–2 line) justification per axis, citing concrete evidence.</li>
          <li>Mark any unsupported sentences under Axis 7; summarize cross-cutting issues in the Extra Comments box.</li>
        </ol>
      </section>
    </div>
  );
}
