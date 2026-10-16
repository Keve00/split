// Builds dist/ from src/. JS and CSS lose whitespace only: the files stay classic scripts that
// share globals, so identifiers are never renamed and nothing is bundled.
// Usage: node scripts/build.mjs            write dist/
//        node scripts/build.mjs --check    fail if dist/ is not what src/ builds to
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const check = process.argv.includes('--check');

function list(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? list(full, base) : [path.relative(base, full)];
  });
}

async function output(file) {
  const input = fs.readFileSync(path.join(src, file));
  const ext = path.extname(file);
  // Third-party files ship exactly as received.
  if (file.startsWith(`vendor${path.sep}`) || !['.js', '.css'].includes(ext)) return input;
  const result = await transform(input.toString('utf8'), {
    loader: ext.slice(1),
    minifyWhitespace: true,
    charset: 'utf8',
    legalComments: 'inline'
  });
  return Buffer.from(result.code);
}

async function build(target) {
  fs.rmSync(target, { recursive: true, force: true });
  for (const file of list(src)) {
    const destination = path.join(target, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, await output(file));
  }
}

if (check) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'split-build-'));
  try {
    await build(temp);
    const built = list(temp).sort(),
      current = fs.existsSync(dist) ? list(dist).sort() : [];
    const stale = [...new Set([...built, ...current])].filter(
      file =>
        !built.includes(file) ||
        !current.includes(file) ||
        !fs.readFileSync(path.join(temp, file)).equals(fs.readFileSync(path.join(dist, file)))
    );
    if (stale.length) {
      console.error(`dist/ está desatualizada. Rode npm run build.\n${stale.map(f => `  ${f}`).join('\n')}`);
      process.exitCode = 1;
    } else console.log('dist/ corresponde a src/.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
} else {
  await build(dist);
  console.log('dist/ gerada a partir de src/.');
}
