// clean.js
const fs = require("fs");
const path = require("path");

const TARGET_DIRS = ["node_modules"];
const TARGET_FILES = ["pnpm-lock.yaml"];

function removeTarget(fullPath, type) {
  try {
    fs.rmSync(fullPath, {
      recursive: true,
      force: true,
    });

    console.log(`🗑️  Deleted ${type}: ${fullPath}`);
  } catch (err) {
    console.error(`❌ Failed to delete ${fullPath}`, err.message);
  }
}

function walk(dir) {
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip symbolic links
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (TARGET_DIRS.includes(entry.name)) {
        removeTarget(fullPath, "directory");
        continue;
      }

      walk(fullPath);
    } else if (entry.isFile()) {
      if (TARGET_FILES.includes(entry.name)) {
        removeTarget(fullPath, "file");
      }
    }
  }
}

const startDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

console.log(`🔍 Scanning: ${startDir}`);

walk(startDir);

console.log("✅ Done");