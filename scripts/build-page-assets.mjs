// Rasterize the per-section Canva SVGs and cover artwork into compact WebP files.
// Run via `node scripts/build-page-assets.mjs`.

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = "/Users/coleen/Downloads/Layout Keana";
const OUT_DIR = path.resolve("public/pages");

const PAGES = [
  { id: "main", file: "Main Page.svg" },
  { id: "details", file: "Details.svg" },
  // Updated entourage artwork lives in Downloads root (with a trailing
  // space in the filename) — use an explicit absolute path.
  { id: "entourage", path: "/Users/coleen/Downloads/Entourage Page .svg" },
  { id: "attire", file: "Attire.svg" },
  { id: "unplugged", file: "Unplugged_Gift.svg" },
];

const TARGET_W = 800; // 2x retina for ~400px column

await fs.mkdir(OUT_DIR, { recursive: true });

for (const p of PAGES) {
  const src = p.path ?? path.join(SOURCE_DIR, p.file);
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

// ────────────────────────────────────────────────────────────────────
// Cover page — two pixel-aligned hero SVGs (kids/default and
// toddlers/alt) that the React layer cross-fades between on tap.
// Both SVGs share identical frame, figure, floral, cat, and
// controller positions — only the photos inside the gold frames
// differ — so swapping `<img src>` produces a clean dissolve.
// ────────────────────────────────────────────────────────────────────
const COVER_VARIANTS = [
  { src: "/Users/coleen/Downloads/Layout Keana (1)/1Web Hero Page.svg", out: "cover.webp", label: "now" },
  { src: "/Users/coleen/Downloads/Layout Keana (1)/2Web Hero Page.svg", out: "cover-past.webp", label: "past" },
];

for (const variant of COVER_VARIANTS) {
  try {
    const buf = await fs.readFile(variant.src);
    const outFile = path.join(OUT_DIR, variant.out);
    const result = await sharp(buf, { density: 240 })
      .flatten({ background: "#ffffff" })
      .resize({ width: TARGET_W })
      .webp({ quality: 82, effort: 6 })
      .toFile(outFile);
    console.log(`cover (${variant.label}): -> ${path.relative(process.cwd(), outFile)}: ${result.width}×${result.height}, ${(result.size / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.warn(`cover (${variant.label}) skipped:`, err.message);
  }
}
