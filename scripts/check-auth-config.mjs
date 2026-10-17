import { existsSync, readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const expo = JSON.parse(read('app.json')).expo;
const parseEnv = (source) => Object.fromEntries(
  source.split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const example = parseEnv(read('.env.example'));
const localEnv = existsSync(new URL('.env', root)) ? parseEnv(read('.env')) : null;
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
  if (localEnv && localEnv[key] !== example[key]) {
    problems.push(`${key} in .env differs from the configured HeatSense client`);
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
