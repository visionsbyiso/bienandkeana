// Rasterize the per-section Canva SVGs into compact WebP files.
// Run via `node scripts/build-page-assets.mjs`.

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = "/Users/coleen/Downloads/Layout Keana";
const OUT_DIR = path.resolve("public/pages");

const PAGES = [
  { id: "main", file: "Main Page.svg" },
  { id: "details", file: "Details.svg" },
  { id: "entourage", file: "Entourage Page.svg" },
  { id: "attire", file: "Attire.svg" },
  { id: "unplugged", file: "Unplugged_Gift.svg" },
];

const TARGET_W = 800; // 2x retina for ~400px column

await fs.mkdir(OUT_DIR, { recursive: true });

for (const p of PAGES) {
  const src = path.join(SOURCE_DIR, p.file);
  const buf = await fs.readFile(src);
  const meta = await sharp(buf, { density: 300 }).metadata();
  console.log(`${p.id}: src ${(buf.length / 1024 / 1024).toFixed(2)} MB · vector ${meta.width}×${meta.height}`);

  const out = path.join(OUT_DIR, `${p.id}.webp`);
  const result = await sharp(buf, { density: 300 })
    .resize({ width: TARGET_W, withoutEnlargement: false })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  console.log(`  -> ${path.relative(process.cwd(), out)}: ${result.width}×${result.height}, ${(result.size / 1024).toFixed(1)} KB`);
}
