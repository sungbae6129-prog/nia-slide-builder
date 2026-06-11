#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = {
    deckDir: null,
    screenshotDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--screenshot-dir') {
      args.screenshotDir = argv[++i];
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
    'Usage: node qa_html_slides.mjs <deck-folder> [--screenshot-dir output-dir]',
    '',
    'Runs browser-based QA for slide-*.html files.',
    'Checks mandatory NIA cover/closing structure, element bounds, text overflow, and nonblank rendering.',
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

function imageStats(png) {
  const colors = new Set();
  let count = 0;
  let sum = 0;
  let sumSq = 0;

  for (let y = 0; y < png.height; y += 16) {
    for (let x = 0; x < png.width; x += 16) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];
      if (a < 8) continue;

      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += luminance;
      sumSq += luminance * luminance;
      count += 1;
      colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
    }
  }

  const mean = count ? sum / count : 0;
  const variance = count ? sumSq / count - mean * mean : 0;
  return {
    sampledPixels: count,
    quantizedColorCount: colors.size,
    luminanceStdDev: Math.sqrt(Math.max(0, variance)),
  };
}

function classifyImage(stats) {
  const issues = [];
  if (stats.sampledPixels < 100) {
    issues.push({ level: 'error', code: 'blank-render', message: 'Slide screenshot has too few visible pixels.' });
  }
  if (stats.quantizedColorCount < 8 || stats.luminanceStdDev < 3) {
    issues.push({
      level: 'error',
      code: 'low-visual-variance',
      message: 'Slide appears blank or nearly single-color in screenshot.',
      stats,
    });
  }
  return issues;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.deckDir) {
    console.log(usage());
    return;
  }

  const { chromium } = tryRequire('playwright');
  const { PNG } = tryRequire('pngjs');

  const deckDir = path.resolve(args.deckDir);
  const slides = await findSlides(deckDir);
  const screenshotDir = args.screenshotDir ? path.resolve(args.screenshotDir) : null;
  if (screenshotDir) {
    await fs.mkdir(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const results = [];

  try {
    for (let slideIndex = 0; slideIndex < slides.length; slideIndex += 1) {
      const slide = slides[slideIndex];
      await page.goto(pathToFileURL(path.join(deckDir, slide)).href, { waitUntil: 'networkidle' });
      const slideBox = page.locator('.slide');
      await slideBox.waitFor({ state: 'visible' });

      const screenshot = await slideBox.screenshot();
      if (screenshotDir) {
        await fs.writeFile(path.join(screenshotDir, slide.replace('.html', '.qa.png')), screenshot);
      }

      const png = PNG.sync.read(screenshot);
      const visualStats = imageStats(png);
      const issues = classifyImage(visualStats);

      const domReport = await page.evaluate(({ isFirst, isLast }) => {
        const slideEl = document.querySelector('.slide');
        if (!slideEl) {
          return {
            slide: null,
            issues: [{ level: 'error', code: 'missing-slide', message: 'No .slide element found.' }],
          };
        }

        const slideRect = slideEl.getBoundingClientRect();
        const selectors = [
          'h1',
          'h2',
          'h3',
          'p',
          'li',
          'small',
          '.card',
          '.axis',
          '.callout',
          '.roadmap',
          '.presenter',
          '.brand',
          '.tag',
          '.slide-tag',
          '.slide-num',
          '.thesis-text',
          '[data-qa]',
        ].join(',');
        const issues = [];
        const elements = Array.from(document.querySelectorAll(selectors));

        if (isFirst) {
          if (slideEl.dataset.slideRole !== 'cover') {
            issues.push({ level: 'error', code: 'missing-cover-role', message: 'First slide must use data-slide-role="cover".' });
          }
          const ciCount = document.querySelectorAll('[data-nia-ci]').length;
          const nyanyaCount = document.querySelectorAll('[data-nyanya]').length;
          if (ciCount !== 1) {
            issues.push({ level: 'error', code: 'cover-ci-count', message: `Cover must contain exactly one NIA CI; found ${ciCount}.` });
          }
          if (nyanyaCount !== 1) {
            issues.push({ level: 'error', code: 'cover-nyanya-count', message: `Cover must contain exactly one Nyanya; found ${nyanyaCount}.` });
          }
        }

        if (isLast) {
          if (slideEl.dataset.slideRole !== 'closing') {
            issues.push({ level: 'error', code: 'missing-closing-role', message: 'Last slide must use data-slide-role="closing".' });
          }
          if (!(slideEl.textContent || '').includes('감사합니다.')) {
            issues.push({ level: 'error', code: 'missing-thank-you', message: 'Closing slide must contain the exact message "감사합니다.".' });
          }
          const ciEls = Array.from(document.querySelectorAll('[data-nia-ci]'));
          if (ciEls.length !== 1) {
            issues.push({ level: 'error', code: 'closing-ci-count', message: `Closing slide must contain exactly one NIA CI; found ${ciEls.length}.` });
          } else {
            const ciRect = ciEls[0].getBoundingClientRect();
            const ciCenter = ciRect.left + ciRect.width / 2;
            const slideCenter = slideRect.left + slideRect.width / 2;
            const isBottom = ciRect.top >= slideRect.top + slideRect.height * 0.7;
            const isCentered = Math.abs(ciCenter - slideCenter) <= 40;
            if (!isBottom || !isCentered) {
              issues.push({ level: 'error', code: 'closing-ci-position', message: 'Closing NIA CI must be horizontally centered near the bottom.' });
            }
          }
        }

        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const label = (el.textContent || el.className || el.tagName).replace(/\s+/gu, ' ').trim().slice(0, 90);
          if (
            rect.left < slideRect.left - 1 ||
            rect.top < slideRect.top - 1 ||
            rect.right > slideRect.right + 1 ||
            rect.bottom > slideRect.bottom + 1
          ) {
            issues.push({
              level: 'error',
              code: 'outside-slide',
              message: 'Element extends outside the .slide canvas.',
              target: label,
              rect: {
                left: Math.round(rect.left - slideRect.left),
                top: Math.round(rect.top - slideRect.top),
                right: Math.round(rect.right - slideRect.left),
                bottom: Math.round(rect.bottom - slideRect.top),
              },
            });
          }

          if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
            const overflow = style.overflow + style.overflowX + style.overflowY;
            if (overflow.includes('hidden') || overflow.includes('clip') || el.clientHeight > 0) {
              issues.push({
                level: 'warning',
                code: 'element-overflow',
                message: 'Element scroll size exceeds its client box; check for clipped text.',
                target: label,
                metrics: {
                  clientWidth: el.clientWidth,
                  scrollWidth: el.scrollWidth,
                  clientHeight: el.clientHeight,
                  scrollHeight: el.scrollHeight,
                },
              });
            }
          }
        }

        const bgEls = Array.from(document.querySelectorAll('.bg, [data-cover-bg]'));
        for (const bg of bgEls) {
          const style = window.getComputedStyle(bg);
          const rect = bg.getBoundingClientRect();
          const backgroundImage = style.backgroundImage || '';
          if (rect.width < slideRect.width * 0.5 || rect.height < slideRect.height * 0.5) {
            issues.push({
              level: 'warning',
              code: 'small-background',
              message: 'Cover background element does not cover most of the slide.',
            });
          }
          if (backgroundImage.includes('url(') && !backgroundImage.includes('data:image')) {
            issues.push({
              level: 'warning',
              code: 'external-background',
              message: 'Cover background uses an external or relative URL instead of an embedded data URI.',
            });
          }
          if (backgroundImage === 'none' && style.opacity !== '0') {
            issues.push({
              level: 'warning',
              code: 'missing-background-image',
              message: 'Cover background element exists but has no background image.',
            });
          }
        }

        return {
          slide: {
            width: Math.round(slideRect.width),
            height: Math.round(slideRect.height),
          },
          issues,
        };
      }, { isFirst: slideIndex === 0, isLast: slideIndex === slides.length - 1 });

      issues.push(...domReport.issues);
      results.push({
        file: slide,
        slide: domReport.slide,
        visualStats,
        issues,
      });
    }
  } finally {
    await browser.close();
  }

  const issueCount = results.reduce((sum, result) => sum + result.issues.length, 0);
  const errorCount = results.reduce(
    (sum, result) => sum + result.issues.filter((issue) => issue.level === 'error').length,
    0,
  );

  console.log(JSON.stringify({
    deckDir,
    slideCount: slides.length,
    issueCount,
    errorCount,
    results,
  }, null, 2));

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
