# Clinical Benchmarks Rubric

A web app for blinded human evaluation of clinical English-to-Urdu translation outputs from two LLM systems. The app presents one original English clinical dialogue and two Urdu translations, asks raters to compare the translations across clinical and linguistic axes, and stores one editable submission per rater and case in MongoDB.

The current project is a Vite + React frontend with an Express + MongoDB backend. Static case data is generated from Excel files into JSON and served from `public/data`.

## Screenshots (Original App Design (Optimized Later)) 

### Login

Simple username/password prompt for raters.

<img width="1470" height="830" alt="Screenshot 2025-10-12 at 7 33 15 pm" src="https://github.com/user-attachments/assets/92cae679-9523-4060-a522-44a17d930ada" />

### Rating Menu

Lists rating cases, completion status, and access to the rubric.

<img width="1470" height="831" alt="Screenshot 2025-10-12 at 7 33 24 pm" src="https://github.com/user-attachments/assets/a2bd413c-2e75-417f-9a8f-4dbb83dae440" />

### Scoring View

Displays the original English dialogue beside Urdu translations and the rubric form.

<img width="1470" height="832" alt="Screenshot 2025-10-12 at 7 34 13 pm" src="https://github.com/user-attachments/assets/0c9ff9bd-9f5a-4727-8eb5-c08231a23304" />

## Current App

The active app supports:

- Username/password rater login with protected routes.
- A 60-case rating queue loaded from `public/data/paired.json`.
- Sequential case locking: case 1 is available first, and case `n` unlocks when case `n - 1` is completed.
- Admin override to unlock all cases.
- Progress tracking on the home page.
- Blinded comparison view with:
  - Original English dialogue.
  - Urdu Translation 1.
  - Urdu Translation 2.
  - Admin-only display of the underlying translation IDs.
- Stable per-case randomization of which model appears as Translation 1 or Translation 2.
- Eight axis-level relative judgments: Translation 1, Translation 2, or Tie.
- Tie quality labels: both translations are bad, good, or excellent.
- Relative overall grade with 1-5 strength when one translation wins.
- Absolute overall 1-5 rating for each translation.
- Required-field validation with a missing-fields modal.
- Optional comments.
- Resubmission support: existing ratings are loaded back into the form and saved again by upsert.
- Time-on-case capture in seconds.
- MongoDB persistence of rater, comparison, dataset ID, axis ratings, overall ratings, comments, elapsed time, and translation-position mapping.

## Tech Stack

- Frontend: React 18, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Data conversion: `xlsx`
- Deployment target used in the project history: Render-style Node server serving the Vite build

## Repository Structure

```text
.
|-- data_raw/
|   |-- chatgpt.xlsx
|   `-- medgemma.xlsx
|-- public/data/
|   |-- chatgpt.json
|   |-- medgemma.json
|   `-- paired.json
|-- scripts/
|   `-- xlsx-to-json.js
|-- server/
|   |-- index.js
|   |-- models/
|   |   |-- ComparisonRating.js
|   |   `-- NoteCounter.js
|   `-- package.json
|-- src/
|   |-- components/
|   |   |-- ComparisonRubricForm.jsx
|   |   `-- PanelCard.jsx
|   |-- config/
|   |   `-- appConfig.js
|   |-- pages/
|   |   |-- Detail.jsx
|   |   |-- Home.jsx
|   |   |-- Login.jsx
|   |   `-- Rubric.jsx
|   |-- utils/
|   |   `-- auth.js
|   |-- index.css
|   `-- main.jsx
|-- package.json
|-- tailwind.config.js
`-- vite.config.js
```

## Routes

Frontend routes are defined in `src/main.jsx`.

- `/login`: rater login.
- `/`: protected home page with the case queue, progress bar, completed markers, and lock state.
- `/case/:comparisonId`: protected detail page for one paired comparison.
- `/rubric`: protected rubric reference page.

The server redirects `/` to `/login`, serves the built frontend from `dist`, and falls back to `dist/index.html` for non-API routes.

## Data Flow

1. Raw data starts in:
   - `data_raw/chatgpt.xlsx`
   - `data_raw/medgemma.xlsx`
2. `scripts/xlsx-to-json.js` normalizes both spreadsheets into:
   - `public/data/chatgpt.json`
   - `public/data/medgemma.json`
3. The script pairs rows by `comparison` and `datasetid`.
4. The first 60 matched pairs are written to:
   - `public/data/paired.json`
5. The React app reads `paired.json` directly from the public folder.
6. Ratings are submitted to the backend and stored in MongoDB.

Expected normalized fields include:

- `id`
- `dataset`
- `datasetid`
- `comparison`
- `originalDialogue`
- `originalNote`
- `chatgptDial`
- `chatgptNote`
- `medDial`
- `medNote`

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB database, either local or hosted

### Install Dependencies

Install root dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
cd ..
```

### Configure MongoDB

The backend reads:

```bash
MONGODB_URI=mongodb://localhost:27017/clinical
MONGODB_DB=clinical_ratings
PORT=4000
```

If these variables are not set, `server/index.js` uses the local defaults above.

### Build Case Data

Generate JSON data from the Excel files:

```bash
npm run build:data
```

This writes `chatgpt.json`, `medgemma.json`, and `paired.json` into `public/data`.

### Run the Frontend for Development

```bash
npm run dev
```

Vite will start the frontend development server. During full-stack development, API calls to `/api/...` must be routed to the Express server by your local setup or by running the production server after building.

### Run the Backend

From the root package:

```bash
npm start
```

or from the server package:

```bash
cd server
npm start
```

The backend listens on `PORT` or `4000`.

### Build for Production

```bash
npm run build
```

This runs the data build and then creates the Vite production build in `dist`.

Start the production server:

```bash
npm start
```

The Express server serves both `/api/...` endpoints and the built frontend.

## Authentication

Allowed raters are configured in `src/config/appConfig.js`. The current implementation is simple client-side credential checking and stores the rater name in `localStorage` under `RATER`.

For a public or production deployment with sensitive data, replace this with server-side authentication and do not expose passwords in frontend source code.

## Rating Workflow

1. Rater logs in.
2. Home page loads all paired cases.
3. The app checks MongoDB for completed submissions for the current rater.
4. Completed cases are marked done.
5. Locked cases cannot be opened until the previous case is complete, except for admin override.
6. Rater opens a case.
7. The case page displays the original English dialogue and two blinded Urdu translations.
8. The rater completes:
   - Axis 1: Medical Accuracy
   - Axis 2: Clinical Safety for Handover Utility
   - Axis 3: Clinical Reasoning
   - Axis 4: Linguistic Correctness (Urdu/English)
   - Axis 5: Precision in Medical Terminology
   - Axis 6: Structure & Flow
   - Axis 7: Patient Interaction & Communication
   - Axis 8: Alignment to Source (Traceability)
   - Axis 9: Relative overall grade
   - Absolute overall score for Translation 1
   - Absolute overall score for Translation 2
9. The app blocks submission until all required fields are complete.
10. Submission is saved by upsert, so returning to the same case allows resubmission.

## API

### `GET /api/health`

Returns a basic health response:

```json
{
  "ok": true,
  "via": "render-web",
  "ts": 123456789
}
```

### `GET /api/comparison-ratings/get`

Query parameters:

- `comparison`
- `rater`

Returns `{ "exists": false }` if no saved submission exists. If a submission exists, it returns the saved axes, comments, duration, overall ratings, and translation-position IDs.

### `POST /api/comparison-ratings`

Creates or updates one rating for a `(rater, comparison)` pair.

Required top-level fields:

- `rater`
- `comparison`
- `axes`

Common payload shape:

```json
{
  "rater": "rater-id",
  "comparison": "1",
  "datasetId": "VS000",
  "axes": {
    "axis1": { "winner": 1, "strength": null, "tieQuality": null },
    "axis2": { "winner": 0, "strength": null, "tieQuality": "good" },
    "axis3": { "winner": 2, "strength": null, "tieQuality": null },
    "axis4": { "winner": 1, "strength": null, "tieQuality": null },
    "axis5": { "winner": 1, "strength": null, "tieQuality": null },
    "axis6": { "winner": 0, "strength": null, "tieQuality": "excellent" },
    "axis7": { "winner": 2, "strength": null, "tieQuality": null },
    "axis8": { "winner": 1, "strength": null, "tieQuality": null }
  },
  "relativeOverall": {
    "winner": 1,
    "strength": 4,
    "tieQuality": null
  },
  "absoluteOverall": {
    "translation1": 4,
    "translation2": 3
  },
  "comments": "Optional comment",
  "durationSeconds": 320,
  "urdu1": "c_aci_001",
  "urdu2": "g_aci_001"
}
```

`winner` uses:

- `0`: tie
- `1`: Translation 1
- `2`: Translation 2

## Database Models

### `ComparisonRating`

Stores the main rating submission. Important fields:

- `rater`
- `comparison`
- `datasetId`
- `urdu1`
- `urdu2`
- `axes.axis1` through `axes.axis8`
- `comments`
- `durationSeconds`
- `relativeOverall`
- `absoluteOverall`
- timestamps

The model has a unique index on `{ rater: 1, comparison: 1 }`, which enables resubmission by replacing the same rater-case document.

### `NoteCounter`

The model remains in the repository for interaction logging experiments. It can store note-click counts and rating-change counters, but the current active server endpoints only use `ComparisonRating`.

## Major App Changes From Commit History

This summary is based on the repository commit history from the initial app commits through the current `main` head.

### 2025-08-29: Project bootstrap

- Initial repository created.
- First Vite/React frontend added.
- Raw Excel files added under `data_raw`.
- Data conversion script introduced.
- Early pages and components created:
  - home/menu page
  - detail page
  - panel cards
  - initial rubric form
- Initial Express/Mongo backend added with early `Rating` and `Preference` models.

### 2025-08-30: Login, rater state, and deployment experiments

- Rater state added in the frontend.
- Login page and basic credential configuration introduced.
- Authentication helper added with localStorage-based rater persistence.
- Multiple Vercel deployment attempts were made, including API route experiments.
- Those Vercel attempts were later reverted.
- Static JSON data was committed into `public/data`.

### 2025-09-05: Render-oriented full-stack setup

- The project shifted toward a Render-style deployment.
- Root scripts and dependencies were adjusted for Vite and React.
- Express was configured to serve the frontend build.
- React Router dependency was added.
- A "working version for Render" was established.
- The server gained boot cleanup behavior in this period.

### 2025-09-06: Rubric expansion and data refresh

- Rubric UI and backend rating model were updated.
- Data files were regenerated from updated Excel sources.
- The in-app rubric reference page was expanded.

### 2025-09-12: Preferences, major-error experiments, and randomized data display

- Preference collection was added to the home page and backend.
- A `PreferenceBox` component was introduced.
- Major clinical error flag experiments were added, shown on panels, and later partially reverted or removed.
- Home panel behavior and display were updated repeatedly.
- A hash function was added to shuffle/randomize data presentation.
- The app moved closer to blinded pairwise comparison.

### 2025-09-13: Resubmission support and panel status

- Resubmission behavior was added and iterated.
- Rating state could be displayed on panels.
- Backend and frontend endpoints were adjusted so existing submissions could be detected and edited.

### 2025-09-15 to 2025-09-19: Rater UX, credentials, and rubric access

- More data updates were added.
- Panel presentation was refined.
- Preference behavior was changed based on reviewer feedback.
- Scores and major clinical error indicators were removed from the panel flow.
- Server redirect to `/login` was added.
- MQM/rubric concepts were updated.
- A rubric link/button and hover-detail behavior were added.
- Username/password lists were expanded in `appConfig.js`.
- Rubric source changed from a PDF-style reference to a Google Doc link.

### 2025-09-24 to 2025-10-12: Prefill fixes, randomized datasets, and initial README

- Existing saved options were fixed so forms could prefill reliably.
- Raw and generated data were refreshed several times.
- Data points were randomized/updated.
- The first GitHub README was added, with screenshots and a short project description.

### 2025-11-04: Major redesign and move to comparison-specific form

- Home and detail pages were redesigned.
- Detail page moved toward the current three-column view: English original plus two Urdu translations.
- The `ComparisonRubricForm` component and `ComparisonRating` model were introduced.
- The app moved away from the older individual `RubricForm`/`PreferenceBox` structure toward a single comparison-rating workflow.
- Multiple layout iterations refined rectangular cards, side-by-side display, scroll areas, and form sizing.

### 2025-11-05: Timing, completion, and new backend shape

- Time spent on a case was added.
- Home page green check/completion status was added.
- A note-counter model and related experiments were introduced.
- Older server and rating templates were removed.
- New rubric fields were added.
- Translation IDs were added to backend persistence so the stored rating records which concrete output was shown as Translation 1 and Translation 2.

### 2025-11-06 to 2025-11-07: Cleanup, locking, and Urdu font

- Unused legacy components were deleted.
- Note-click gating experiments were added and later changed.
- Tailwind was extended with a Nastaliq font family.
- Sequential case locking was implemented: case `n` unlocks after case `n - 1` is complete.
- Admin unlock/relock behavior was added.

### 2025-11-10 to 2025-11-21: Validation, missing-fields modal, progress, and form UX

- More raw/generated data updates were made.
- Absolute grading was locked behind completion of relative grading.
- Missing-details validation was added and iterated.
- Urdu font and line-height were refined for readability.
- Button wording, positioning, and selection behavior were refined.
- Interaction logging experiments were added.
- Note-click requirements were later removed.
- Missing-fields popup was added and refined, including absolute-grading wording.
- Home progress bar was added.
- Likert and tab-switching behaviors were adjusted, including an auto-scrolling experiment that was later undone.
- Axis 9 coloring was adjusted.

### 2025-12-04 to 2025-12-05: Tooltips, more users, data, and randomization

- Absolute grading UI was refined.
- Additional rater credentials were added.
- Tooltips were added to explain rubric axes and then fixed/refined.
- Relative overall wording/behavior was changed.
- More data refreshes were committed.
- Randomization behavior in the case detail view changed.
- Admin panel/detail behavior was adjusted.

### 2026-01-08 to 2026-01-10: Final comparison-rubric and backend adjustments

- Likert behavior was heavily revised, briefly removed, then restored/updated through follow-up commits.
- The comparison rating schema was updated.
- The backend validation and rating endpoints were updated to match the final comparison form shape.

### 2026-02-16: Latest configuration update

- `src/config/appConfig.js` was updated with the current rater configuration.

## Notes for Future Maintainers

- `src/App.jsx` is not the active router. The active routing entry point is `src/main.jsx`.
- `server/models/NoteCounter.js` exists, but active API routes currently use `ComparisonRating`.
- `scripts/xlsx-to-json.js` currently writes 60 pairs even though its console message still says "first 50".
- Client-side credentials are acceptable for a closed/internal prototype, but they should be replaced before any sensitive deployment.
- The app currently assumes static public data and MongoDB persistence. If data changes after ratings are collected, preserve the old `comparison`, `datasetid`, and translation IDs to keep saved ratings interpretable.
