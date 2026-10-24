// Exercise the app's actual Firebase/email services with no Expo env injected.
// Native UI/storage imports are stubbed; the Firebase SDK and local Auth emulator are real.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const sdk = require('firebase/app');
const authSDK = require('firebase/auth');
const defaults = Object.fromEntries(readFileSync(new URL('.env.example', root), 'utf8').split('\n').filter((line) => /^EXPO_PUBLIC_/.test(line)).map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));

function services(env = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    if (path.endsWith('.json')) return JSON.parse(readFileSync(new URL(path, root), 'utf8'));
    const source = readFileSync(new URL(path, root), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    cache.set(path, module);
    const resolve = (name) => {
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name === '@react-native-async-storage/async-storage') return {};
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}${name.endsWith('.json') ? '' : '.ts'}`);
      return require(name);
    };
    vm.runInNewContext(output, { require: resolve, module, exports: module.exports, process: { env } }, { filename: fileURLToPath(new URL(path, root)) });
    return module.exports;
  }
  return { firebase: load('src/services/firebase.ts'), email: () => load('src/services/email-auth.ts') };
}

try {
  const fresh = services();
  assert.ok(fresh.firebase.firebaseAuth, 'A fresh install without .env must initialize Firebase Auth instead of becoming a sample build');
  assert.equal(fresh.firebase.requireFirebaseAuth().app.options.projectId, defaults.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
  assert.equal(fresh.firebase.firebaseAuth.app.options.apiKey, defaults.EXPO_PUBLIC_FIREBASE_API_KEY);
  console.log('email-auth: fresh-install configuration passed');
  await sdk.deleteApp(fresh.firebase.firebaseApp);

  const custom = services({ EXPO_PUBLIC_FIREBASE_API_KEY: 'custom-public-key', EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'custom-project.firebaseapp.com', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'custom-project', EXPO_PUBLIC_FIREBASE_APP_ID: 'custom-app' });
  assert.equal(custom.firebase.requireFirebaseAuth().app.options.projectId, 'custom-project');
  assert.equal(custom.firebase.firebaseAuth.app.options.apiKey, 'custom-public-key');
  await sdk.deleteApp(custom.firebase.firebaseApp);

  const partial = services({ EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'custom-project' });
  assert.equal(partial.firebase.firebaseAuth, null, 'Incomplete overrides must not mix different Firebase projects');
  assert.throws(() => partial.firebase.requireFirebaseAuth());
  console.log('email-auth: complete overrides work; incomplete overrides stay isolated');

  if (process.argv.includes('--emulator')) {
    const test = services();
    const auth = test.firebase.requireFirebaseAuth();
    // Never send test identities or passwords to the live Firebase project.
    authSDK.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const emailService = test.email();
    const address = `fresh-install-${Date.now()}@heatsense.test`;
    const password = 'local-emulator-test-2026';
    const created = await emailService.createEmailAccount('Fresh Install Test', address, password);
    assert.equal(auth.currentUser.displayName, 'Fresh Install Test');
    await authSDK.signOut(auth);
    const signedIn = await emailService.signInWithEmail(`  ${address}  `, password);
    assert.equal(signedIn.uid, created.uid);
    await authSDK.signOut(auth);
    await assert.rejects(emailService.signInWithEmail(address, 'incorrect-password'), (error) => emailService.emailAuthMessage(error) === 'Email or password is incorrect.');
    assert.equal(auth.currentUser, null);
    await sdk.deleteApp(test.firebase.firebaseApp);
    console.log('email-auth: real SDK/emulator account creation, sign-out, sign-in and wrong-password handling passed');
  }
} finally {
  await Promise.all(sdk.getApps().map((app) => sdk.deleteApp(app)));
}
