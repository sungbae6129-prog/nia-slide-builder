#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = {
    deckDir: null,
    out: null,
    scale: 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      args.out = argv[++i];
    } else if (arg === '--scale') {
      args.scale = Number(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!args.deckDir) {
      args.deckDir = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return [
    'Usage: node export_html_slides_pdf.mjs <deck-folder> [--out output.pdf] [--scale 3]',
    '',
    'Exports slide-*.html files into one high-resolution 16:9 PDF.',
    'Default scale is 3, which captures a 1280x720 slide as 3840x2160.',
  ].join('\n');
}

function tryRequire(packageName) {
  const codexRuntimeRoots = [
    path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules'),
    path.join(os.homedir(), 'AppData', 'Local', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules'),
  ];
  const candidates = [
    process.env.NIA_SLIDE_BUILDER_NODE_MODULES,
    process.env.HTML_SLIDE_BUILDER_NODE_MODULES,
    ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    path.join(process.cwd(), 'node_modules'),
    ...codexRuntimeRoots,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return createRequire(path.join(candidate, 'package.json'))(packageName);
    } catch {
      // Try the next candidate.
    }
  }

  try {
    return createRequire(import.meta.url)(packageName);
  } catch {
    throw new Error(`Could not resolve "${packageName}". Install it locally or set NIA_SLIDE_BUILDER_NODE_MODULES.`);
  }
}

async function findSlides(deckDir) {
  const entries = await fs.readdir(deckDir);
  const slides = entries
    .filter((name) => /^slide-\d+\.html$/u.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/\d+/u)[0]);
      const bn = Number(b.match(/\d+/u)[0]);
      return an - bn;
    });

  if (slides.length === 0) {
    throw new Error(`No slide-*.html files found in ${deckDir}`);
  }

  return slides;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.deckDir) {
    console.log(usage());
    return;
  }

  if (!Number.isFinite(args.scale) || args.scale < 1 || args.scale > 6) {
    throw new Error('--scale must be a number between 1 and 6.');
  }

  const { chromium } = tryRequire('playwright');
  const { PDFDocument } = tryRequire('pdf-lib');

  const deckDir = path.resolve(args.deckDir);
  const slides = await findSlides(deckDir);
  const out = path.resolve(args.out || path.join(deckDir, `${path.basename(deckDir)}.pdf`));

  const pdf = await PDFDocument.create();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: args.scale,
  });
  const tempImages = [];

  try {
    for (const slide of slides) {
      await page.goto(pathToFileURL(path.join(deckDir, slide)).href, { waitUntil: 'networkidle' });
      const slideBox = page.locator('.slide');
      await slideBox.waitFor({ state: 'visible' });
      const tempImage = path.join(deckDir, `${slide.replace('.html', '')}.export.png`);
      await slideBox.screenshot({ path: tempImage });
      tempImages.push(tempImage);

      const png = await pdf.embedPng(await fs.readFile(tempImage));
      const pdfPage = pdf.addPage([1280, 720]);
      pdfPage.drawImage(png, { x: 0, y: 0, width: 1280, height: 720 });
    }
  } finally {
    await browser.close();
    await Promise.all(tempImages.map((file) => fs.rm(file, { force: true })));
  }

  await fs.writeFile(out, await pdf.save());

  const verify = await PDFDocument.load(await fs.readFile(out));
  const pageCount = verify.getPageCount();
  if (pageCount !== slides.length) {
    throw new Error(`PDF page count mismatch: expected ${slides.length}, got ${pageCount}`);
  }

  console.log(JSON.stringify({
    output: out,
    pageCount,
    slideCount: slides.length,
    scale: args.scale,
    captureResolution: `${1280 * args.scale}x${720 * args.scale}`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
