import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';

const srcSvg = new URL('../public/icons/currency-grid.svg', import.meta.url).pathname;
const appleSvg = new URL('../public/icons/apple-touch-icon.svg', import.meta.url).pathname;
const outDir = new URL('../public/icons/', import.meta.url).pathname;

// Resolve Windows path quirks (remove leading / on Windows paths like /D:/...)
const resolvedSrc = srcSvg.replace(/^\/([A-Z]:)/i, '$1');
const resolvedApple = appleSvg.replace(/^\/([A-Z]:)/i, '$1');
const resolvedOut = outDir.replace(/^\/([A-Z]:)/i, '$1');

async function ensureDir() {
  await mkdir(resolvedOut, { recursive: true });
}

async function build() {
  await ensureDir();

  const tasks = [
    // Android icons use standard design
    { file: 'android-chrome-192x192.png', width: 192, height: 192, source: resolvedSrc },
    { file: 'android-chrome-512x512.png', width: 512, height: 512, source: resolvedSrc },
    // Favicon sizes use standard design
    { file: 'favicon-16x16.png', width: 16, height: 16, source: resolvedSrc },
    { file: 'favicon-32x32.png', width: 32, height: 32, source: resolvedSrc },
    // OG/Twitter image (1200x630 is the recommended size for social sharing)
    { file: 'og-image.png', width: 1200, height: 630, source: resolvedSrc },
    // MS Tile
    { file: 'mstile-150x150.png', width: 150, height: 150, source: resolvedSrc },
    // Apple touch icon uses liquid glass design
    { file: 'apple-touch-icon.png', width: 180, height: 180, source: resolvedApple },
  ];

  for (const t of tasks) {
    await sharp(t.source)
      .resize(t.width, t.height, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(resolvedOut + t.file);
    console.log(`Generated ${t.file}`);
  }

  // Generate favicon.ico (multi-size ICO file)
  // Note: sharp doesn't support ICO directly, so we create the 32x32 PNG as the main favicon
  await copyFile(resolvedOut + 'favicon-32x32.png', resolvedOut.replace('/icons/', '/') + 'favicon.ico');
  console.log('Copied favicon-32x32.png to /public/favicon.ico');

  // Keep the SVG as-is
  await copyFile(resolvedSrc, resolvedOut + 'currency-grid.svg');
  console.log('Copied currency-grid.svg');
}

build().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});