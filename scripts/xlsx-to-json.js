// scripts/xlsx-to-json.js  (CommonJS)
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const RAW_DIR = path.resolve("data_raw");
const OUT_DIR = path.resolve("public/data");

// Ensure output dir exists
fs.mkdirSync(OUT_DIR, { recursive: true });

function readSheet(p) {
  const wb = XLSX.readFile(p);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function pick(row, ...names) {
  const keys = Object.keys(row);
  for (const want of names) {
    const hit = keys.find(
      (k) => k.toLowerCase().trim() === want.toLowerCase().trim()
    );
    if (hit) return row[hit];
  }
  return "";
}

function normalizeCommon(row) {
  return {
    id: String(pick(row, "id", "ID", "Id") ?? ""),
    dataset: pick(row, "dataset"),
    datasetid: String(pick(row, "datasetid", "dataset_id", "DatasetID") ?? ""),
    originalDialogue: pick(row, "Original Dialogue", "Original_Dialogue", "English Dialogue"),
    originalNote: pick(row, "Original Note", "Original_Note", "English Note"),
  };
}

function normalizeMed(row) {
  const base = normalizeCommon(row);
  return {
    ...base,
    medDial: pick(row, "Med Dial", "Med Dialogue", "MedGemma Dial", "MedGemma Dialogue"),
    medNote: pick(row, "Med Note", "MedGemma Note"),
  };
}

function normalizeChatGPT(row) {
  const base = normalizeCommon(row);
  return {
    ...base,
    chatgptDial: pick(row, "ChatGPT Dial", "ChatGPT Dialogue"),
    chatgptNote: pick(row, "ChatGPT Note"),
  };
}

function convert() {
  const medXlsx = path.join(RAW_DIR, "medgemma.xlsx");
  const cgXlsx = path.join(RAW_DIR, "chatgpt.xlsx");

  if (!fs.existsSync(medXlsx) || !fs.existsSync(cgXlsx)) {
    console.error("❌ Place medgemma.xlsx and chatgpt.xlsx in data_raw/");
    process.exit(1);
  }

  const medRows = readSheet(medXlsx).map(normalizeMed);
  const cgRows = readSheet(cgXlsx).map(normalizeChatGPT);

  fs.writeFileSync(path.join(OUT_DIR, "medgemma.json"), JSON.stringify(medRows, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "chatgpt.json"), JSON.stringify(cgRows, null, 2));

  // Optional paired file
  const mapMed = new Map(medRows.map(r => [r.id, r]));
  const mapCg = new Map(cgRows.map(r => [r.id, r]));
  const ids = Array.from(new Set([...mapMed.keys(), ...mapCg.keys()]));
  const paired = ids.map(id => ({ id, med: mapMed.get(id) || null, chatgpt: mapCg.get(id) || null }));
  fs.writeFileSync(path.join(OUT_DIR, "paired.json"), JSON.stringify(paired, null, 2));

  console.log(`✅ Wrote ${medRows.length} medgemma rows and ${cgRows.length} chatgpt rows to public/data/`);
}

convert();
