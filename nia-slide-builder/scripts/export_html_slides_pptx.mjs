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
    'Usage: node export_html_slides_pptx.mjs <deck-folder> [--out output.pptx] [--scale 3]',
    '',
    'Exports slide-*.html files into one high-resolution 16:9 PowerPoint deck.',
    'Visuals are captured as a background image and HTML text is overlaid as editable PowerPoint text boxes.',
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
    .sort((a, b) => Number(a.match(/\d+/u)[0]) - Number(b.match(/\d+/u)[0]));

  if (slides.length === 0) {
    throw new Error(`No slide-*.html files found in ${deckDir}`);
  }

  return slides;
}

function normalizeColor(value) {
  const match = value?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/u);
  if (!match) return '111827';
  return match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function normalizeFontFace(value) {
  return value?.split(',')[0]?.replaceAll(/['"]/gu, '').trim() || 'Arial';
}

function pxToInches(px, canvasPx, canvasInches) {
  return (px / canvasPx) * canvasInches;
}

function pxToPoints(px) {
  return px * 0.75;
}

async function prepareEditableText(page) {
  return page.locator('.slide').evaluate((slide) => {
    const slideRect = slide.getBoundingClientRect();
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const items = [];
    for (const node of nodes) {
      const wrapper = document.createElement('pptx-editable-text');
      wrapper.dataset.pptxEditableText = 'true';
      wrapper.style.display = 'inline';
      wrapper.style.whiteSpace = 'inherit';
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);

      const rect = wrapper.getBoundingClientRect();
      const style = getComputedStyle(wrapper);
      if (rect.width < 1 || rect.height < 1) continue;

      items.push({
        text: wrapper.textContent,
        x: rect.left - slideRect.left,
        y: rect.top - slideRect.top,
        w: rect.width,
        h: rect.height,
        fontFamily: style.fontFamily,
        fontSize: parseFloat(style.fontSize),
        fontWeight: parseInt(style.fontWeight, 10) || 400,
        fontStyle: style.fontStyle,
        color: style.color,
        textAlign: style.textAlign,
        lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
        letterSpacing: parseFloat(style.letterSpacing) || 0,
        textDecoration: style.textDecorationLine,
        opacity: parseFloat(style.opacity) || 1,
      });
    }

    for (const wrapper of slide.querySelectorAll('[data-pptx-editable-text="true"]')) {
      wrapper.style.color = 'transparent';
      wrapper.style.textShadow = 'none';
      wrapper.style.webkitTextStrokeColor = 'transparent';
    }

    return items;
  });
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
  const PptxGenJS = tryRequire('pptxgenjs');
  const JSZip = tryRequire('jszip');

  const deckDir = path.resolve(args.deckDir);
  const slides = await findSlides(deckDir);
  const out = path.resolve(args.out || path.join(deckDir, `${path.basename(deckDir)}.pptx`));

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'HTML Slide Builder';
  pptx.subject = 'HTML slide deck export';
  pptx.title = path.basename(deckDir);
  pptx.company = 'OpenAI Codex';
  pptx.lang = 'ko-KR';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: args.scale,
  });
  const tempImages = [];
  let editableTextBoxCount = 0;

  try {
    for (const slideFile of slides) {
      await page.goto(pathToFileURL(path.join(deckDir, slideFile)).href, { waitUntil: 'networkidle' });
      const slideBox = page.locator('.slide');
      await slideBox.waitFor({ state: 'visible' });

      const textItems = await prepareEditableText(page);
      const tempImage = path.join(deckDir, `${slideFile.replace('.html', '')}.pptx-export.png`);
      await slideBox.screenshot({ path: tempImage });
      tempImages.push(tempImage);

      const pptSlide = pptx.addSlide();
      pptSlide.background = { color: 'FFFFFF' };
      pptSlide.addImage({ path: tempImage, x: 0, y: 0, w: 13.333333, h: 7.5 });

      for (const item of textItems) {
        const text = item.text.replaceAll(/\s+/gu, ' ').trim();
        if (!text) continue;

        const x = Math.max(pxToInches(item.x, 1280, 13.333333) - 0.01, 0);
        const y = Math.max(pxToInches(item.y, 720, 7.5) - 0.015, 0);
        const extraWidth = item.fontSize <= 12 ? 0.01 : item.fontSize <= 18 ? 0.06 : 0.16;
        const w = Math.max(pxToInches(item.w, 1280, 13.333333) + extraWidth, 0.08);
        const h = Math.max(pxToInches(Math.max(item.h, item.lineHeight), 720, 7.5) + 0.08, 0.08);
        const align = ['center', 'right', 'justify'].includes(item.textAlign) ? item.textAlign : 'left';
        const wrapsAcrossLines = item.h > item.lineHeight * 1.35;

        pptSlide.addText(text, {
          x,
          y,
          w,
          h,
          margin: 0,
          fontFace: normalizeFontFace(item.fontFamily),
          fontSize: Math.max(pxToPoints(item.fontSize), 1),
          bold: item.fontWeight >= 600,
          italic: item.fontStyle === 'italic',
          underline: item.textDecoration?.includes('underline'),
          color: normalizeColor(item.color),
          transparency: Math.round((1 - item.opacity) * 100),
          align,
          valign: 'top',
          wrap: wrapsAcrossLines,
          breakLine: false,
          paraSpaceAfterPt: 0,
          lineSpacingMultiple: 1,
          isTextBox: true,
        });
        editableTextBoxCount += 1;
      }
    }

    await pptx.writeFile({ fileName: out });
  } finally {
    await browser.close();
    await Promise.all(tempImages.map((file) => fs.rm(file, { force: true })));
  }

  const stat = await fs.stat(out);
  if (stat.size === 0) {
    throw new Error(`PPTX export produced an empty file: ${out}`);
  }

  const archive = await JSZip.loadAsync(await fs.readFile(out));
  const pptxSlideCount = Object.keys(archive.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/u.test(name))
    .length;
  if (pptxSlideCount !== slides.length) {
    throw new Error(`PPTX slide count mismatch: expected ${slides.length}, got ${pptxSlideCount}`);
  }
  const editableTextNodeCount = await Promise.all(
    Object.entries(archive.files)
      .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/u.test(name))
      .map(([, entry]) => entry.async('string').then((xml) => (xml.match(/<a:t>/gu) || []).length)),
  ).then((counts) => counts.reduce((sum, count) => sum + count, 0));
  if (editableTextNodeCount === 0) {
    throw new Error('PPTX export contains no editable text nodes.');
  }

  console.log(JSON.stringify({
    output: out,
    slideCount: pptxSlideCount,
    scale: args.scale,
    captureResolution: `${1280 * args.scale}x${720 * args.scale}`,
    format: 'pptx',
    editableText: true,
    editableTextBoxCount,
    verifiedEditableTextNodeCount: editableTextNodeCount,
    visualElementsEditable: false,
    bytes: stat.size,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
