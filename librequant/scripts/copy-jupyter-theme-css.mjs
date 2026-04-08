/**
 * Copies JupyterLab theme variable CSS into public/ so we can load it via <link>
 * (Turbopack does not resolve variables.css?raw the way @datalayer/jupyter-react expects).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");
const outDir = path.join(appDir, "public", "jupyter");

const copies = [
  [
    path.join(
      appDir,
      "node_modules/@jupyterlab/theme-light-extension/style/variables.css",
    ),
    path.join(outDir, "variables-light.css"),
  ],
  [
    path.join(
      appDir,
      "node_modules/@jupyterlab/theme-dark-extension/style/variables.css",
    ),
    path.join(outDir, "variables-dark.css"),
  ],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [src, dest] of copies) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-jupyter-theme-css] skip (missing): ${src}`);
    continue;
  }
  fs.copyFileSync(src, dest);
}
console.log("[copy-jupyter-theme-css] wrote", outDir);
