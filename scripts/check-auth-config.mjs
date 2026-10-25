import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv, parseProjectEnv } from '@expo/env';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const expo = JSON.parse(read('app.json')).expo;
const example = parseEnv(read('.env.example'));
const bundledClient = JSON.parse(read('src/constants/firebase-client.json'));
const bundledGoogle = JSON.parse(read('src/constants/google-client.json'));
const problems = [];
const required = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
];

for (const key of required) {
  if (!example[key]) problems.push(`${key} is missing from .env.example`);
}

// Use Expo's parser and precedence, including .env.local and shell overrides.
// Checking only .env let stale emulator values pass this check while Metro used
// those values instead of the hosted project. Check development and release.
for (const mode of ['development', 'production']) {
  const { env, files } = parseProjectEnv(fileURLToPath(root), { mode });
  const effective = { ...env, ...process.env };
  const source = files.join(', ') || 'shell environment';
  for (const key of required) {
    // Other registered iOS bundle IDs in this Firebase project have their own
    // OAuth clients. Validate the client/scheme pair below instead of requiring
    // the default bundle's iOS client.
    if (key === 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID') continue;
    if (effective[key] !== undefined && effective[key] !== example[key]) {
      problems.push(`${mode}: ${key} from ${source} or shell differs from the configured HeatSense client`);
    }
  }
  for (const key of ['EXPO_PUBLIC_USE_FIREBASE_EMULATORS', 'EXPO_PUBLIC_USE_AUTH_EMULATOR']) {
    if (effective[key] === '1') problems.push(`${mode}: ${key}=1 routes accounts or data to local emulators. Unset it before hosted sign-in or a device build.`);
  }
  const iosClient = effective.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? bundledGoogle.iosClientId;
  const scheme = effective.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || expo.plugins.find((plugin) =>
    Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin',
  )?.[1]?.iosUrlScheme;
  if (!new RegExp(`^${bundledClient.messagingSenderId}-[a-z0-9]+\\.apps\\.googleusercontent\\.com$`).test(iosClient)) {
    problems.push(`${mode}: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be an iOS OAuth client in the HeatSense project`);
  }
  if (scheme !== `com.googleusercontent.apps.${iosClient.replace(/\.apps\.googleusercontent\.com$/, '')}`) {
    problems.push(`${mode}: EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME must match EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID; rebuild iOS after changing the callback scheme`);
  }
}

// Fresh physical-device installs use this public config when no .env is present.
for (const [field, envKey] of Object.entries({ apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', appId: 'APP_ID', messagingSenderId: 'MESSAGING_SENDER_ID' })) {
  if (bundledClient[field] !== example[`EXPO_PUBLIC_FIREBASE_${envKey}`]) {
    problems.push(`Bundled Firebase ${field} differs from .env.example`);
  }
}
for (const [field, envKey] of Object.entries({ webClientId: 'WEB', iosClientId: 'IOS' })) {
  if (bundledGoogle[field] !== example[`EXPO_PUBLIC_GOOGLE_${envKey}_CLIENT_ID`]) {
    problems.push(`Bundled Google ${field} differs from .env.example`);
  }
}

const projectId = example.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (projectId && example.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN !== `${projectId}.firebaseapp.com`) {
  problems.push('Firebase auth domain does not match the project ID');
}

const senderId = example.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
if (senderId && example.EXPO_PUBLIC_FIREBASE_APP_ID?.split(':')[1] !== senderId) {
  problems.push('Firebase app ID does not match the messaging sender ID');
}
for (const key of ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID']) {
  if (senderId && example[key] && !example[key].startsWith(`${senderId}-`)) {
    problems.push(`${key} does not belong to the configured Firebase project`);
  }
}

const googlePlugins = expo.plugins.filter((plugin) =>
  Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin',
);
if (googlePlugins.length !== 1) problems.push('Expected exactly one native Google Sign-In plugin');
const iosClient = example.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const reversedClient = iosClient?.replace(/\.apps\.googleusercontent\.com$/, '');
if (iosClient && googlePlugins[0]?.[1]?.iosUrlScheme !== `com.googleusercontent.apps.${reversedClient}`) {
  problems.push('iOS OAuth callback scheme does not match the iOS client ID');
}
if (!expo.ios?.bundleIdentifier) problems.push('iOS bundle identifier is missing');

for (const path of ['src/app/_layout.tsx', 'src/app/sign-in.tsx']) {
  if (/SKIP_SIGN_IN/.test(read(path))) problems.push(`${path} contains the sign-in bypass`);
}

if (process.argv.includes('--android')) {
  if (!expo.android?.package) problems.push('Android package is missing; register it and its signing SHA-1 certificates in Firebase before releasing Android');
}

if (problems.length) {
  for (const problem of problems) console.error(`Auth preflight: ${problem}`);
  process.exitCode = 1;
} else {
  console.log('Auth preflight passed for configured platforms.');
}
