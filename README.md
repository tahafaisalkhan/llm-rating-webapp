# LLM Rating Web App

A lightweight web app for **expert review of bilingual (English ↔ Urdu) clinical dialogues** and **LLM comparison**. Created as a part of a research project developing an Urdu Dataset.
Raters can score individual dimensions with a 0–5 rubric and also submit **pairwise preferences** (Model 1 vs Model 2 vs Tie). Data is stored in MongoDB as JSON; the stack is **Node.js/Express + MongoDB**, deployed on **Render** (frontend and backend).

> Screenshots:
> - **Login**: simple username/password prompt
> - <img width="1470" height="830" alt="Screenshot 2025-10-12 at 7 33 15 pm" src="https://github.com/user-attachments/assets/92cae679-9523-4060-a522-44a17d930ada" />

> - **Rating Menu**: lists datasets in **Set 1** and **Set 2** columns with DatasetIDs (e.g., `ACI000` … `ACI005`), plus a right-hand **Preference** panel (radio: `1`, `2`, `Tie`, `Submit`)
> - <img width="1470" height="831" alt="Screenshot 2025-10-12 at 7 33 24 pm" src="https://github.com/user-attachments/assets/a2bd413c-2e75-417f-9a8f-4dbb83dae440" />

> - **Scoring View**: side-by-side **Original Dialogue (English)** and **Urdu Dialogue (Set 2)**, “Go to Note” buttons, detailed **rubric rows**, **Extra Comments** box, **Score: xx/40**, and **Resubmit**
<img width="1470" height="832" alt="Screenshot 2025-10-12 at 7 34 13 pm" src="https://github.com/user-attachments/assets/0c9ff9bd-9f5a-4727-8eb5-c08231a23304" />

---

## Features

### Rating menu
- Two parallel columns: **Set 1** and **Set 2**.
- Each row shows:
  - **Card** with “Press for Data” and **DatasetID** (e.g., `ACI001`).
  - Right-side **Preference** controls: choose **1**, **2**, or **Tie**, then **Submit**.
- “**Scoring Rubric**” link in the header for quick reference.
- Logged-in identity and **Logout** on the top right.

### Individual scoring (per datapoint)
- **English** original text (left) and **Urdu** model output (right) shown **side by side** for direct comparison.
- **Per-dimension 0–5 sliders/radios** with instant total (e.g., **Score: 39/40**).
- Dimensions visible in the UI:
  - Medical Accuracy
  - Clinical Safety for Handover Utility
  - Clinical Reasoning
  - Linguistic Correctness (Urdu/English)
  - Precision in Medical Terminology
  - Structure & Flow
  - Patient Interaction & Communication
  - Alignment to Source (“Traceability”)
- **Free-text comments** box (e.g., “wrist urdu in notes isnt correct”).
- **Resubmit** to update scores; changes are versioned in MongoDB.

### Pairwise preference testing
- Compare **two LLMs that translated the same text** (shown as Set 1 vs Set 2).
- Store preferences as **`modelA > modelB`**, **`modelB > modelA`**, or **Tie**.
- Use the right-hand **Preference** panel to submit judgments quickly across a batch.

### Authentication
- **Rater Login** page (username + password).
- Basic session handling with secure cookie/JWT (implementation detail below).

### Persistence
- All artifacts saved in MongoDB as JSON:
  - user accounts
  - datasets / prompts
  - individual scores per rubric dimension
  - pairwise preferences
  - comments / notes
  - audit metadata (timestamps, rater id, dataset id, set id)

---
