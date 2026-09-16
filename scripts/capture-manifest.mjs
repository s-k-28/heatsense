import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptsDirectory, '..');
const manifestPath = join(projectDirectory, 'design', 'screen-manifest.json');
const outputDirectory = resolve(process.argv[2] ?? '/tmp/heatsense-screen-set');
const expoUrl = process.env.HEATSENSE_EXPO_URL ?? 'exp://127.0.0.1:8082/--';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

mkdirSync(outputDirectory, { recursive: true });

for (const [index, screen] of manifest.screens.entries()) {
  const pageDirectory = join(outputDirectory, slug(screen.page));
  const filename = `${String(index + 1).padStart(2, '0')}-${slug(screen.name)}.png`;
  const outputPath = join(pageDirectory, filename);

  mkdirSync(pageDirectory, { recursive: true });
  execFileSync('xcrun', ['simctl', 'openurl', 'booted', `${expoUrl}${screen.route}`], { stdio: 'ignore' });
  await wait(1600);
  execFileSync('xcrun', ['simctl', 'io', 'booted', 'screenshot', outputPath], { stdio: 'ignore' });
  process.stdout.write(`[${index + 1}/${manifest.screens.length}] ${screen.page} / ${screen.name}\n`);
}

process.stdout.write(`Captured ${manifest.screens.length} screens in ${outputDirectory}\n`);
