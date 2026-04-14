import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const MARKERS = ["<<<<<<<", "=======", ">>>>>>>"];
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const offenders = [];

for (const relativeDir of SCAN_DIRS) {
  const dir = join(ROOT, relativeDir);
  const files = walk(dir);

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const hasMarker = MARKERS.some((marker) => content.includes(marker));

    if (hasMarker) {
      offenders.push(file.replace(`${ROOT}/`, ""));
    }
  }
}

if (offenders.length > 0) {
  console.error("Merge conflict markers were found in these files:");
  offenders.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("No merge conflict markers found.");
