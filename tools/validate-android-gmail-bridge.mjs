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
    'getGmailState',
    'authorizeGmail',
    'probeGmail',
    'disconnectGmail',
    'CONNECTION LAB · FINANZAS SINTÉTICAS',
    'Bearer hacia Flutter',
    'Refresh token en app',
    "bool get isConnected => state == 'CONNECTED';",
    'REVOKE_NOT_EFFECTIVE',
    'DISCONNECTED_VERIFIED'
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
    /requestOfflineAccess/,
    /isConnected\s*=>[^;]*AUTHORIZED/
  ];
  for (const pattern of forbiddenDart) {
    if (pattern.test(dart)) fail(`Dart layer crossed native credential/network boundary or overstated connectivity: ${pattern}`);
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
    'REAUTH_REQUIRED',
    'REVOKE_NOT_EFFECTIVE',
    'DISCONNECTED_VERIFIED',
    'DISCONNECT_BARRIER_KEY',
    'putBoolean(DISCONNECT_BARRIER_KEY, active)',
    'if (isDisconnectBarrierActive())',
    'verifyRevoked(account, result)',
    'clearCachedToken(token)',
    'probeAuthorizedProfile(authorization, result, explicitReconnect = false)'
  ]) {
    if (!kotlin.includes(marker)) fail(`Android bridge missing marker: ${marker}`);
  }

  const getStateBlock = kotlin.match(/private fun getGmailState\(result: MethodChannel\.Result\)\s*\{([\s\S]*?)\n\s*\}\n\n\s*private fun authorizeGmail/);
  if (!getStateBlock) {
    fail('Android bridge getGmailState block could not be audited');
  } else {
    if (!getStateBlock[1].includes('if (isDisconnectBarrierActive())')) {
      fail('getGmailState must honor the durable disconnect barrier before any provider authorization call');
    }
    if (!getStateBlock[1].includes('probeAuthorizedProfile(authorization, result, explicitReconnect = false)')) {
      fail('getGmailState must verify Gmail profile before reporting a connected state');
    }
    if (getStateBlock[1].includes('state("AUTHORIZED")')) {
      fail('getGmailState may not equate OAuth authorization with Gmail connectivity');
    }
  }

  const disconnectBlock = kotlin.match(/private fun disconnectGmail\(result: MethodChannel\.Result\)\s*\{([\s\S]*?)\n\s*\}\n\n\s*private fun revoke/);
  if (!disconnectBlock) {
    fail('Android bridge disconnectGmail block could not be audited');
  } else if (!disconnectBlock[1].includes('setDisconnectBarrierActive(true)')) {
    fail('disconnectGmail must activate the local disconnect barrier before provider operations');
  }

  const forbiddenKotlin = [
    /requestOfflineAccess/,
    /serverAuthCode/,
    /FileOutputStream/,
    /Log\./,
    /"accessToken"\s+to/,
    /result\.success\s*\(\s*token/,
    /result\.success\s*\(\s*shortLivedAccessToken/,
    /\.putString\s*\(/,
    /\.putStringSet\s*\(/,
    /\.putLong\s*\(/,
    /\.putInt\s*\(/,
    /\.putFloat\s*\(/
  ];
  for (const pattern of forbiddenKotlin) {
    if (pattern.test(kotlin)) fail(`Android bridge violates credential-custody boundary: ${pattern}`);
  }

  for (const marker of [
    'play-services-auth:21.6.0',
    '--target lib/main_connected.dart',
    'com.financesensor.lab.gmailconnection.r2',
    'ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2',
    'PACKAGE_COLLISION_ISOLATION=R2',
    'ANDROID_DEBUG_SHA1=',
    'REAL_OAUTH_EXECUTED_BY_CI=0',
    'REAL_GMAIL_EXECUTED_BY_CI=0',
    'BUILD_READY=NO'
  ]) {
    if (!workflow.includes(marker)) fail(`connection workflow missing marker: ${marker}`);
  }
  if (/ANDROID_OAUTH_PACKAGE=com\.financesensor\.lab\.financesensor_mobile_shell/.test(workflow)) {
    fail('connection workflow must not reuse the collision-prone generated applicationId');
  }
  if (/\$\{\{\s*secrets\./.test(workflow)) fail('connection workflow must not reference GitHub secrets');
  if (/self-hosted/i.test(workflow)) fail('connection workflow must not route to self-hosted CI');

  const adrMarkers = [
    [/ANDROID_AUTHORIZATION_PROVIDER\s*=\s*GOOGLE_AUTHORIZATION_CLIENT/, 'ANDROID_AUTHORIZATION_PROVIDER = GOOGLE_AUTHORIZATION_CLIENT'],
    [/ANDROID_OFFLINE_ACCESS\s*=\s*REJECTED/, 'ANDROID_OFFLINE_ACCESS = REJECTED'],
    [/ANDROID_APP_REFRESH_TOKEN_CUSTODY\s*=\s*NONE/, 'ANDROID_APP_REFRESH_TOKEN_CUSTODY = NONE'],
    [/SHORT_LIVED_BEARER_TO_FLUTTER\s*=\s*FORBIDDEN/, 'SHORT_LIVED_BEARER_TO_FLUTTER = FORBIDDEN'],
    [/PACKAGE_PLUS_SHA1_BINDING\s*=\s*REQUIRED/, 'PACKAGE_PLUS_SHA1_BINDING = REQUIRED'],
    [/DURABLE_DISCONNECT_BARRIER\s*=\s*REQUIRED/, 'DURABLE_DISCONNECT_BARRIER = REQUIRED'],
    [/POST_REVOKE_PROVIDER_VERIFICATION\s*=\s*REQUIRED/, 'POST_REVOKE_PROVIDER_VERIFICATION = REQUIRED'],
    [/STATIC_BRIDGE_PASS\s*!=\s*PHYSICAL_OAUTH_PASS/, 'STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS']
  ];
  for (const [pattern, label] of adrMarkers) {
    if (!pattern.test(adr)) fail(`ADR-026 missing marker: ${label}`);
  }

  for (const marker of [
    'Gmail solo lectura',
    'No solicitado',
    'successful native authorization exposes only coarse Gmail state to Flutter',
    'OAuth authorization alone is not a verified Gmail connection',
    'revocation failure is never represented as connected',
    'expect(authorized.isConnected, isFalse)',
    'expect(revokeNotEffective.isConnected, isFalse)'
  ]) {
    if (!test.includes(marker)) fail(`connection test missing marker: ${marker}`);
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
console.log('PHYSICAL_TEST_PACKAGE=com.financesensor.lab.gmailconnection.r2');
console.log('PACKAGE_COLLISION_ISOLATION=R2');
console.log('DART_BEARER_CUSTODY=0');
console.log('APP_REFRESH_TOKEN_CUSTODY=0');
console.log('OFFLINE_ACCESS_REQUESTED=0');
console.log('NATIVE_GMAIL_PROFILE_PROBE=REQUIRED_FOR_CONNECTED');
console.log('OAUTH_AUTHORIZED_ALONE_IS_CONNECTED=0');
console.log('DURABLE_DISCONNECT_BARRIER=REQUIRED');
console.log('POST_REVOKE_PROVIDER_VERIFICATION=REQUIRED');
console.log('DISCONNECT_PROVIDER_REVOKE=DECLARED');
console.log('REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('BUILD_READY=false');
