import fs from "fs";
import path from "path";

const configPath = path.resolve("scripts/universe_config.json");
const outputDir = path.resolve("public/data/peer_universes");

if (!fs.existsSync(configPath)) {
  console.error("Missing scripts/universe_config.json.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const universesIndex = config.universes.map((universe) => {
  const regionDir = path.join(outputDir, universe.region);
  if (!fs.existsSync(regionDir)) {
    fs.mkdirSync(regionDir, { recursive: true });
  }

  const filePath = path.join(regionDir, `${universe.sector}.json`);
  const payload = {
    universe_id: universe.universe_id,
    region: universe.region,
    sector: universe.sector,
    as_of_date: config.as_of_date,
    notes: universe.notes,
    tickers: universe.tickers,
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));

  return {
    universe_id: universe.universe_id,
    region: universe.region,
    sector: universe.sector,
    path: `/data/peer_universes/${universe.region}/${universe.sector}.json`,
    as_of_date: config.as_of_date,
    description: universe.notes,
  };
});

fs.writeFileSync(
  path.join(outputDir, "index.json"),
  JSON.stringify({ universes: universesIndex }, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, "metrics_snapshot.json"),
  JSON.stringify(config.metrics_snapshot, null, 2)
);

console.log(`Generated ${universesIndex.length} universe files and metrics_snapshot.json`);
