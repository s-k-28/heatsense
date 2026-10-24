import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'archive' ? [] : markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

const files = ['README.md', 'HANDOFF.md'].map((name) => join(root, name)).concat(markdownFiles(join(root, 'docs')));
const broken = [];
let checked = 0;

for (const file of files) {
  // Code examples are not links. Archived documents intentionally retain historical references.
  const source = readFileSync(file, 'utf8').replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  const links = source.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)|(?:src|href)=["']([^"']+)["']/g);
  for (const match of links) {
    const url = (match[1] ?? match[2]).replace(/^<|>$/g, '');
    if (url.startsWith('#') || url.startsWith('/') || /^[\w+.-]+:/.test(url)) continue;
    const target = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!target) continue;
    checked++;
    if (!existsSync(resolve(dirname(file), target))) broken.push(`${file.slice(root.length + 1)} → ${target}`);
  }
}

if (broken.length) {
  console.error(`Broken local documentation links:\n${broken.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`docs: ${checked} local links checked across ${files.length} maintained documents`);
}
