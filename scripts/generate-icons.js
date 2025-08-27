#!/usr/bin/env node
/**
 * Generate extension icons from SVG using Sharp
 */
const fs = require("fs");
const path = require("path");

const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "icons");
const INPUT_SVG = path.join(ICONS_DIR, "icon.svg");
const OUTPUT_SIZES = [16, 32, 48, 128];

async function generate() {
  if (!fs.existsSync(INPUT_SVG)) {
    console.error(`Missing input SVG at: ${INPUT_SVG}`);
    process.exit(1);
  }

  for (const size of OUTPUT_SIZES) {
    const outPath = path.join(ICONS_DIR, `icon${size}.png`);
    console.log(`Generating ${outPath} ...`);
    await sharp(INPUT_SVG)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 100 })
      .toFile(outPath);
  }

  console.log("Done.");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
