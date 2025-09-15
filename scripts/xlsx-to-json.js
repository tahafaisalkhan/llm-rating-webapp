// scripts/xlsx-to-json.js
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const RAW_DIR = path.resolve("data_raw");
const OUT_DIR = path.resolve("public/data");

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
    comparison: String(pick(row, "comparison", "Comparison", "pair", "pair_id") ?? ""),
    originalDialogue: pick(row, "Original Dialogue", "Original_Dialogue", "English Dialogue"),
    originalNote: pick(row, "Original Note", "Original_Note", "English Note"),
  };
}

function normalizeMed(row) {
  const base = normalizeCommon(row);
  return {
    ...base,
    // supports new & legacy Med columns
    medDial: pick(row, "MedG Dial", "Med Dial", "Med Dialogue", "MedGemma Dial", "MedGemma Dialogue"),
    medNote: pick(row, "MedG Note", "Med Note", "MedGemma Note"),
  };
}

function normalizeChatGPT(row) {
  const base = normalizeCommon(row);
  return {
    ...base,
    // UPDATED: support new ChatGPT column names with fallbacks
    chatgptDial: pick(row, "ChatG Dial", "ChatG Dialogue", "GPT Dial", "GPT Dialogue", "ChatGPT Dial", "ChatGPT Dialogue"),
    chatgptNote: pick(row, "ChatG Note", "GPT Note", "ChatGPT Note"),
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

  // Pair by BOTH comparison and datasetid, then take only first 50
  const keyOf = (r) => {
    const comp = String((r.comparison ?? "").toString().trim());
    const dsid = String((r.datasetid ?? "").toString().trim());
    return `${comp}:::${dsid}`;
  };

  const byKeyMed = new Map(
    medRows
      .filter(r => r.comparison !== "" && r.datasetid !== "")
      .map(r => [keyOf(r), r])
  );
  const byKeyCg = new Map(
    cgRows
      .filter(r => r.comparison !== "" && r.datasetid !== "")
      .map(r => [keyOf(r), r])
  );

  const keys = Array.from(byKeyMed.keys()).filter(k => byKeyCg.has(k));

  // numeric-aware sort by comparison, then datasetid
  keys.sort((a, b) => {
    const [ac, ad] = a.split(":::");
    const [bc, bd] = b.split(":::");
    const na = Number(ac), nb = Number(bc);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    if (!Number.isNaN(na) && Number.isNaN(nb)) return -1;
    if (Number.isNaN(na) && !Number.isNaN(nb)) return 1;
    if (ac !== bc) return String(ac).localeCompare(String(bc));
    return String(ad).localeCompare(String(bd));
  });

  const limitedKeys = keys.slice(0, 50);

  const paired = limitedKeys.map(k => {
    const [comparison, datasetid] = k.split(":::");
    return {
      comparison: String(comparison),
      datasetid: String(datasetid),
      chatgpt: byKeyCg.get(k) || null,
      medgemma: byKeyMed.get(k) || null
    };
  });

  fs.writeFileSync(path.join(OUT_DIR, "paired.json"), JSON.stringify(paired, null, 2));

  console.log(
    `✅ Wrote ${medRows.length} medgemma rows, ${cgRows.length} chatgpt rows, and ${paired.length} pairs (first 50 by comparison+datasetid) to public/data/`
  );
}

convert();
