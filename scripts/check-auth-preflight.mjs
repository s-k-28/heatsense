// Verify the preflight against isolated fixtures, without changing local env files.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'heatsense-auth-'));
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('EXPO_PUBLIC_') && key !== 'EXPO_NO_DOTENV'));
const run = (env = {}) => spawnSync(process.execPath, ['scripts/check-auth-config.mjs'], { cwd: fixture, env: { ...cleanEnv, ...env }, encoding: 'utf8' });
const removeEnvs = () => {
  for (const path of ['.env', '.env.local', '.env.development.local', '.env.production.local']) rmSync(join(fixture, path), { force: true });
};

try {
  for (const path of ['scripts/check-auth-config.mjs', '.env.example', 'app.json', 'app.config.js', 'src/constants/firebase-client.json', 'src/constants/google-client.json', 'src/app/_layout.tsx', 'src/app/sign-in.tsx']) {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    cpSync(join(root, path), join(fixture, path));
  }
  symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
  const baseConfig = JSON.parse(readFileSync(join(fixture, 'app.json'), 'utf8')).expo;
  const resolveConfig = (env) => {
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(join(fixture, 'app.config.js'), 'utf8'), { module, process: { env } });
    return JSON.parse(JSON.stringify(module.exports({ config: baseConfig })));
  };
  assert.deepEqual(resolveConfig({}), baseConfig, 'Default builds must retain exactly the app.json configuration');
  const iosClient = '160498199797-testiosclient.apps.googleusercontent.com';
  const iosScheme = 'com.googleusercontent.apps.160498199797-testiosclient';
  const iosOverride = { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iosClient, EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: iosScheme };
  const expectedConfig = structuredClone(baseConfig);
  expectedConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin')[1].iosUrlScheme = iosScheme;
  assert.deepEqual(resolveConfig(iosOverride), expectedConfig, 'Only the Google iOS URL scheme should change');
  assert.deepEqual(resolveConfig({ EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: '' }), baseConfig, 'An empty scheme override must retain the default');
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  result = run(iosOverride);
  assert.equal(result.status, 0, result.stderr);
  result = run({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iosClient });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME/);
  result = run({ EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: iosScheme });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME/);
  result = run({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '999-otherproject.apps.googleusercontent.com', EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: 'com.googleusercontent.apps.999-otherproject' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  writeFileSync(join(fixture, '.env.local'), `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${iosClient}\nEXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=${iosScheme}\n`);
  result = run();
  assert.equal(result.status, 0, result.stderr);
  removeEnvs();

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
  console.log('auth-preflight: default config unchanged, iOS client/scheme overrides, fresh checkout, local-file precedence, emulator flags, development/release overrides, shell overrides and quoted values passed');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
