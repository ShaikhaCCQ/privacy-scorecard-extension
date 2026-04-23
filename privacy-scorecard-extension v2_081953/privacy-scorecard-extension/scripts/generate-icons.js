/**
 * Generates simple SVG-based PNG placeholder icons for the extension.
 * Run: node scripts/generate-icons.js
 *
 * For production, replace these with professionally designed icons.
 * This script creates simple colored shield icons as placeholders.
 */

const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "assets");

// SVG shield icon template
function createShieldSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1d9bf0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0066cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <path d="M64 8 L112 28 L112 60 C112 92 90 112 64 120 C38 112 16 92 16 60 L16 28 Z"
        fill="url(#grad)" stroke="#0a4a8a" stroke-width="2"/>
  <path d="M52 64 L60 72 L78 52" stroke="white" stroke-width="8" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const sizes = [16, 48, 128];

for (const size of sizes) {
  const svg = createShieldSvg(size);
  const filePath = path.join(assetsDir, `icon${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Created ${filePath}`);
}

// Also create a simple PNG-compatible note
const readmePath = path.join(assetsDir, "ICON_NOTE.txt");
fs.writeFileSync(readmePath, `SVG icons have been generated as placeholders.

Chrome extensions require PNG icons. To convert:
1. Open each SVG in a browser
2. Take a screenshot at the correct size
3. Save as icon16.png, icon48.png, icon128.png

Or use a tool like Inkscape:
  inkscape icon128.svg --export-type=png --export-filename=icon128.png -w 128 -h 128

For development/testing, you can also use the SVG files directly by updating
manifest.json to reference .svg instead of .png files (supported in Chrome 112+).
`);

console.log("\nDone! SVG icons created in assets/");
console.log("See assets/ICON_NOTE.txt for PNG conversion instructions.");
