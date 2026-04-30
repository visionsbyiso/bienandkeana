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
// Cover page — rasterized from the new "Web Hero Page" SVG (full
// floral wreath + rings + figures + cat & controller cameos).  We
// export TWO versions so the React layer can cross-fade between them
// for the "tap to reveal younger us" interaction:
//   • cover.webp       → kid photos in the gold frames (default state)
//   • cover-past.webp  → toddler photos baked over the figures region
// ────────────────────────────────────────────────────────────────────
const COVER_SRC = "/Users/coleen/Downloads/Web Hero Page.svg";
try {
  const heroBuf = await fs.readFile(COVER_SRC);
  // Render at high DPI so we have plenty of pixels to work with before resizing
  const heroPng = await sharp(heroBuf, { density: 240 })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const heroMeta = await sharp(heroPng).metadata();
  console.log(`cover source: ${heroMeta.width}×${heroMeta.height}`);

  // 1) Default cover (kids in frames) — straight resize + encode.
  const coverNowOut = path.join(OUT_DIR, "cover.webp");
  const coverNowResult = await sharp(heroPng)
    .resize({ width: TARGET_W })
    .webp({ quality: 82, effort: 6 })
    .toFile(coverNowOut);
  console.log(`cover (now): -> ${path.relative(process.cwd(), coverNowOut)}: ${coverNowResult.width}×${coverNowResult.height}, ${(coverNowResult.size / 1024).toFixed(1)} KB`);

  // 2) "Past" variant — preserve the SVG entirely and only swap the two
  //    rectangular photos inside the gold frames so the SVG's frames,
  //    bodies, and surrounding florals stay untouched.
  const appJsx = await fs.readFile("src/App.jsx", "utf8");
  const pastMatch = appJsx.match(/couplePast: "data:image\/webp;base64,([^"]+)"/);
  if (!pastMatch) throw new Error("Could not find couplePast base64 in src/App.jsx");
  const pastBuf = Buffer.from(pastMatch[1], "base64");

  // Toddler photo crops (the rectangular face photos) from
  // couplePast.png (602×632).  Take a generous square-ish crop so it
  // fills the frame interior without leaving border gaps.
  const boyPhoto = await sharp(pastBuf)
    .extract({ left: 80, top: 90, width: 185, height: 175 })
    .png()
    .toBuffer();
  const girlPhoto = await sharp(pastBuf)
    .extract({ left: 350, top: 92, width: 190, height: 175 })
    .png()
    .toBuffer();

  // SVG gold-frame photo interiors — coords measured against the
  // rendered hero (1323×1863 at density 240).  The proportions hold
  // for any rendered scale of the same SVG.
  const boyTarget = {
    left: Math.round(heroMeta.width * 0.302),
    top: Math.round(heroMeta.height * 0.460),
    width: Math.round(heroMeta.width * 0.150),
    height: Math.round(heroMeta.height * 0.118),
  };
  const girlTarget = {
    left: Math.round(heroMeta.width * 0.503),
    top: Math.round(heroMeta.height * 0.460),
    width: Math.round(heroMeta.width * 0.155),
    height: Math.round(heroMeta.height * 0.118),
  };

  const boyResized = await sharp(boyPhoto).resize(boyTarget.width, boyTarget.height).png().toBuffer();
  const girlResized = await sharp(girlPhoto).resize(girlTarget.width, girlTarget.height).png().toBuffer();

  const heroPast = await sharp(heroPng)
    .composite([
      { input: boyResized, left: boyTarget.left, top: boyTarget.top },
      { input: girlResized, left: girlTarget.left, top: girlTarget.top },
    ])
    .png()
    .toBuffer();

  const coverPastOut = path.join(OUT_DIR, "cover-past.webp");
  const coverPastResult = await sharp(heroPast)
    .resize({ width: TARGET_W })
    .webp({ quality: 82, effort: 6 })
    .toFile(coverPastOut);
  console.log(`cover (past): -> ${path.relative(process.cwd(), coverPastOut)}: ${coverPastResult.width}×${coverPastResult.height}, ${(coverPastResult.size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.warn("cover step skipped:", err.message);
}
