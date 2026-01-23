import fs from "fs";
import path from "path";

const sourcePath = path.resolve("scripts/sample-source.json");
const outputDir = path.resolve("public/data");

if (!fs.existsSync(sourcePath)) {
  console.error("Missing scripts/sample-source.json. Add raw statement data before running.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
const normalized = raw.map((company) => ({
  ...company,
  normalizedAt: new Date().toISOString(),
  notes: "Generated offline. Replace with refreshed data as needed.",
}));

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outPath = path.join(outputDir, "normalized-sample.json");
fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));

console.log(`Wrote ${normalized.length} records to ${outPath}`);
console.log("Tip: plug in a yfinance-based loader before normalization if needed.");
