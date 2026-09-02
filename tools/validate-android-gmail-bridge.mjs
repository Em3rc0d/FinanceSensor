import fs from 'node:fs';

const paths = {
  dart: 'spikes/mobile-shell/lib/main_connected.dart',
  kotlin: 'spikes/mobile-shell/native/android/MainActivity.kt',
  test: 'spikes/mobile-shell/test/connection_ui_test.dart',
  workflow: '.github/workflows/mobile-gmail-connection.yml',
  adr: 'mk0/11-decisions/ADR-026-ANDROID-GOOGLE-AUTHORIZATION-BOUNDARY.md'
};

const failures = [];
const fail = message => failures.push(message);

for (const path of Object.values(paths)) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const dart = fs.readFileSync(paths.dart, 'utf8');
  const kotlin = fs.readFileSync(paths.kotlin, 'utf8');
  const test = fs.readFileSync(paths.test, 'utf8');
  const workflow = fs.readFileSync(paths.workflow, 'utf8');
  const adr = fs.readFileSync(paths.adr, 'utf8');

  for (const marker of [
    "MethodChannel('com.financesensor.platform/gmail')",
    "getGmailState",
    "authorizeGmail",
    "probeGmail",
    "disconnectGmail",
    "CONNECTION LAB · FINANZAS SINTÉTICAS",
    "Bearer hacia Flutter",
    "Refresh token en app"
  ]) {
    if (!dart.includes(marker)) fail(`connected Dart surface missing marker: ${marker}`);
  }

  const forbiddenDart = [
    /import\s+['"]dart:io['"]/,
    /gmail\.googleapis\.com/i,
    /oauth2\.googleapis\.com/i,
    /accounts\.google\.com/i,
    /\baccess_token\b/i,
    /\brefresh_token\b/i,
    /\bclient_secret\b/i,
    /serverAuthCode/,
    /requestOfflineAccess/
  ];
  for (const pattern of forbiddenDart) {
    if (pattern.test(dart)) fail(`Dart layer crossed native credential/network boundary: ${pattern}`);
  }

  for (const marker of [
    'https://www.googleapis.com/auth/gmail.readonly',
    'Identity.getAuthorizationClient(this)',
    '.authorize(request())',
    'getAuthorizationResultFromIntent',
    'revokeAccess',
    'clearToken',
    'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    '"accessTokenExposedToFlutter" to false',
    '"refreshTokenHeldByApp" to false',
    '"offlineAccessRequested" to false',
    'REAUTH_REQUIRED'
  ]) {
    if (!kotlin.includes(marker)) fail(`Android bridge missing marker: ${marker}`);
  }

  const forbiddenKotlin = [
    /requestOfflineAccess/,
    /serverAuthCode/,
    /SharedPreferences/,
    /FileOutputStream/,
    /Log\./,
    /"accessToken"\s+to/,
    /result\.success\s*\(\s*token/,
    /result\.success\s*\(\s*shortLivedAccessToken/
  ];
  for (const pattern of forbiddenKotlin) {
    if (pattern.test(kotlin)) fail(`Android bridge violates credential-custody boundary: ${pattern}`);
  }

  for (const marker of [
    'play-services-auth:21.6.0',
    '--target lib/main_connected.dart',
    'ANDROID_OAUTH_PACKAGE=com.financesensor.lab.financesensor_mobile_shell',
    'ANDROID_DEBUG_SHA1=',
    'REAL_OAUTH_EXECUTED_BY_CI=0',
    'REAL_GMAIL_EXECUTED_BY_CI=0',
    'BUILD_READY=NO'
  ]) {
    if (!workflow.includes(marker)) fail(`connection workflow missing marker: ${marker}`);
  }
  if (/\$\{\{\s*secrets\./.test(workflow)) fail('connection workflow must not reference GitHub secrets');
  if (/self-hosted/i.test(workflow)) fail('connection workflow must not route to self-hosted CI');

  for (const marker of [
    'ANDROID_AUTHORIZATION_PROVIDER = GOOGLE_AUTHORIZATION_CLIENT',
    'ANDROID_OFFLINE_ACCESS = REJECTED',
    'ANDROID_APP_REFRESH_TOKEN_CUSTODY = NONE',
    'SHORT_LIVED_BEARER_TO_FLUTTER = FORBIDDEN',
    'PACKAGE_PLUS_SHA1_BINDING = REQUIRED',
    'STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS'
  ]) {
    if (!adr.includes(marker)) fail(`ADR-026 missing marker: ${marker}`);
  }

  for (const marker of [
    'Gmail solo lectura',
    'No solicitado',
    'successful native authorization exposes only coarse Gmail state to Flutter'
  ]) {
    if (!test.includes(marker)) fail(`connection widget test missing marker: ${marker}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_ANDROID_GMAIL_BRIDGE=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_ANDROID_GMAIL_BRIDGE=PASS');
console.log('ANDROID_AUTHORIZATION_PROVIDER=GOOGLE_AUTHORIZATION_CLIENT');
console.log('EXACT_SCOPE=gmail.readonly');
console.log('DART_BEARER_CUSTODY=0');
console.log('APP_REFRESH_TOKEN_CUSTODY=0');
console.log('OFFLINE_ACCESS_REQUESTED=0');
console.log('NATIVE_GMAIL_PROFILE_PROBE=DECLARED');
console.log('DISCONNECT_PROVIDER_REVOKE=DECLARED');
console.log('REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('BUILD_READY=false');
