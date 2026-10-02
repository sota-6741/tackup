import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

/** pdf.js の worker と、描画に使うデータ（CMap・フォント・WASM・ICC）を public/pdfjs/ に置く。同じオリジンから読ませるので、CSP は 'self' のままでよい。 */
const source = dirname(require.resolve("pdfjs-dist/package.json"));
const target = join(process.cwd(), "public", "pdfjs");

rmSync(target, { recursive: true, force: true });
cpSync(
  join(source, "legacy", "build", "pdf.worker.min.mjs"),
  join(target, "pdf.worker.min.mjs"),
);
for (const directory of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(join(source, directory), join(target, directory), { recursive: true });
}
