// Verify the preflight against isolated fixtures, without changing local env files.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'heatsense-auth-'));
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('EXPO_PUBLIC_') && key !== 'EXPO_NO_DOTENV'));
const run = (env = {}) => spawnSync(process.execPath, ['scripts/check-auth-config.mjs'], { cwd: fixture, env: { ...cleanEnv, ...env }, encoding: 'utf8' });
const removeEnvs = () => {
  for (const path of ['.env', '.env.local', '.env.development.local', '.env.production.local']) rmSync(join(fixture, path), { force: true });
};

try {
  for (const path of ['scripts/check-auth-config.mjs', '.env.example', 'app.json', 'src/constants/firebase-client.json', 'src/constants/google-client.json', 'src/app/_layout.tsx', 'src/app/sign-in.tsx']) {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    cpSync(join(root, path), join(fixture, path));
  }
  symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
  let result = run();
  assert.equal(result.status, 0, result.stderr);

  // Reproduce this incident: a correct .env cannot cancel .env.local overrides.
  cpSync(join(fixture, '.env.example'), join(fixture, '.env'));
  writeFileSync(join(fixture, '.env.local'), 'EXPO_PUBLIC_FIREBASE_API_KEY=demo-heatsense-key\nEXPO_PUBLIC_USE_FIREBASE_EMULATORS=1\nEXPO_PUBLIC_USE_AUTH_EMULATOR=1\n');
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_FIREBASE_API_KEY/);
  assert.match(result.stderr, /EXPO_PUBLIC_USE_AUTH_EMULATOR=1/);
  assert.match(result.stderr, /\.env\.local/);
  removeEnvs();

  for (const [file, mode] of [['.env.development.local', 'development'], ['.env.production.local', 'production']]) {
    writeFileSync(join(fixture, file), 'EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1\n');
    result = run();
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`${mode}: EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1`));
    removeEnvs();
  }

  result = run({ EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'wrong-project' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_FIREBASE_PROJECT_ID/);
  result = run({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);

  writeFileSync(join(fixture, '.env.local'), 'EXPO_PUBLIC_FIREBASE_PROJECT_ID="heatsense-aa3c8"\n');
  result = run();
  assert.equal(result.status, 0, result.stderr);
  console.log('auth-preflight: fresh checkout, local-file precedence, emulator flags, development/release overrides, shell overrides and quoted values passed');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
