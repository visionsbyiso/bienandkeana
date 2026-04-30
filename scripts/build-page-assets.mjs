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

// ────────────────────────────────────────────────────────────────────
// Cover page — sourced from Celebrate.png (full Canva spread) so we
// can clear the figures area and overlay the interactive couple photo.
// ────────────────────────────────────────────────────────────────────
const COVER_SRC = "/Users/coleen/Downloads/Celebrate.png";
try {
  const fullMeta = await sharp(COVER_SRC).metadata();
  // Crop top portion: floral border + "celebrate" + subtitle + figures + rings
  // Empirically: cover ends ~16% down the full Canva spread.
  const COVER_H = Math.round(fullMeta.height * 0.16); // ~3212 px when full is 20077
  const cropped = await sharp(COVER_SRC)
    .extract({ left: 0, top: 0, width: fullMeta.width, height: COVER_H })
    .flatten({ background: "#ffffff" }) // composite over white so it's a solid page
    .png()
    .toBuffer();
  const croppedMeta = await sharp(cropped).metadata();
  console.log("cropped dims:", croppedMeta.width, "x", croppedMeta.height);

  // Build a soft-edged white "eraser" SVG for the figures+card region.
  // Bounds expressed as % of the cropped cover (figures+card live ~13–84% × ~34–84%).
  const cropW = fullMeta.width;
  const cropH = COVER_H;
  const eraseLeft = Math.round(cropW * 0.10);
  const eraseTop = Math.round(cropH * 0.345);
  const eraseW = Math.round(cropW * (0.91 - 0.10));
  const eraseH = Math.round(cropH * (0.885 - 0.345));
  // Eraser: solid white rounded rect (no blur — sharp's SVG renderer expands
  // the canvas when filters overflow, which breaks the composite step).
  const eraserSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cropW}" height="${cropH}"><rect x="${eraseLeft}" y="${eraseTop}" rx="80" ry="80" width="${eraseW}" height="${eraseH}" fill="#ffffff"/></svg>`;
  const eraserPng = await sharp(Buffer.from(eraserSvg))
    .resize({ width: cropW, height: cropH, fit: "fill" })
    .png()
    .toBuffer();
  const eraserMeta = await sharp(eraserPng).metadata();
  console.log("eraser dims:", eraserMeta.width, "x", eraserMeta.height);

  // Composite first (full size), then in a second pipeline resize + encode.
  const composited = await sharp(cropped)
    .composite([{ input: eraserPng, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const coverOut = path.join(OUT_DIR, "cover.webp");
  const coverResult = await sharp(composited)
    .resize({ width: TARGET_W })
    .webp({ quality: 82, effort: 6 })
    .toFile(coverOut);
  console.log(`cover: src cropped ${cropW}×${cropH} -> ${path.relative(process.cwd(), coverOut)}: ${coverResult.width}×${coverResult.height}, ${(coverResult.size / 1024).toFixed(1)} KB`);

  // Also export normalized PNG cutouts of couplePast / coupleNow
  // from the IMAGES base64 data already embedded in src/App.jsx so we
  // can reuse them as standalone WebP for layout (smaller bundle).
} catch (err) {
  console.warn("cover step skipped:", err.message);
}
