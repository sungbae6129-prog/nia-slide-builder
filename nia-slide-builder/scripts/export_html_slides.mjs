#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = {
    deckDir: null,
    outDir: null,
    baseName: null,
    scale: 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-dir') {
      args.outDir = argv[++i];
    } else if (arg === '--base-name') {
      args.baseName = argv[++i];
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
    'Usage: node export_html_slides.mjs <deck-folder> [--out-dir output-dir] [--base-name name] [--scale 3]',
    '',
    'Exports a completed HTML slide deck to both PDF and PPTX.',
  ].join('\n');
}

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${path.basename(script)} exited with code ${code}`));
      }
    });
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

  const deckDir = path.resolve(args.deckDir);
  const outDir = path.resolve(args.outDir || deckDir);
  const baseName = args.baseName || path.basename(deckDir);
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const common = [deckDir, '--scale', String(args.scale)];

  await fs.mkdir(outDir, { recursive: true });

  const pdf = path.join(outDir, `${baseName}.pdf`);
  const pptx = path.join(outDir, `${baseName}.pptx`);

  await run(path.join(scriptDir, 'export_html_slides_pdf.mjs'), [...common, '--out', pdf]);
  await run(path.join(scriptDir, 'export_html_slides_pptx.mjs'), [...common, '--out', pptx]);

  console.log(JSON.stringify({
    deckDir,
    outputs: { pdf, pptx },
    scale: args.scale,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
