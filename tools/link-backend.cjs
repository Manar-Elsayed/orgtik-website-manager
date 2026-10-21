// Copies backend/ (the mock API) into node_modules/orgtik-wm-backend before `next dev` and
// `next build`. As a real package there, Next keeps it external (serverExternalPackages) and it
// runs from its own files; a linked folder would be bundled instead, which breaks its file paths.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = path.join(root, "backend");
const target = path.join(root, "node_modules", "orgtik-wm-backend");
const skipped = new Set([".data", "node_modules", "uploads", "logs", "journal"]);

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true, filter: (file) => !skipped.has(path.basename(file)) && !/\.test\.[cm]?js$/.test(file) });
console.log("[backend] copied backend/ into node_modules/orgtik-wm-backend");
