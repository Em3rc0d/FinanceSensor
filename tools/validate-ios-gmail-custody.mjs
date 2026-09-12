import fs from 'node:fs';

const path = 'spikes/mobile-shell/native/ios/GmailCredentialBroker.swift';
const adrPath = 'mk0/11-decisions/ADR-028-MOBILE-OAUTH-CUSTODY-SEMANTICS.md';
const failures = [];
const fail = message => failures.push(message);

if (!fs.existsSync(path)) fail(`missing ${path}`);
if (!fs.existsSync(adrPath)) fail(`missing ${adrPath}`);

if (!failures.length) {
  const swift = fs.readFileSync(path, 'utf8');
  const adr = fs.readFileSync(adrPath, 'utf8');

  for (const marker of [
    'import GoogleSignIn',
    'https://www.googleapis.com/auth/gmail.readonly',
    'restorePreviousSignIn',
    'additionalScopes: [Self.gmailReadonly]',
    'refreshTokensIfNeeded()',
    'refreshedUser.accessToken.tokenString',
    'GIDSignIn.sharedInstance.disconnect',
    'setDisconnectBarrier(true)',
    'shortLivedAccessToken = nil',
    'https://gmail.googleapis.com/gmail/v1/users/me/profile'
  ]) {
    if (!swift.includes(marker)) fail(`iOS custody bridge missing marker: ${marker}`);
  }

  const barrierIndex = swift.indexOf('setDisconnectBarrier(true)');
  const disconnectIndex = swift.indexOf('GIDSignIn.sharedInstance.disconnect');
  if (barrierIndex < 0 || disconnectIndex < 0 || barrierIndex > disconnectIndex) {
    fail('iOS disconnect must activate the local barrier before provider disconnect');
  }

  const restoreIndex = swift.indexOf('GIDSignIn.sharedInstance.restorePreviousSignIn');
  const restoreBarrierIndex = swift.indexOf('if disconnectBarrierActive');
  if (restoreBarrierIndex < 0 || restoreIndex < 0 || restoreBarrierIndex > restoreIndex) {
    fail('iOS restore must be guarded by the local disconnect barrier');
  }

  for (const forbidden of [
    /UserDefaults[^\n]*(?:access|refresh|token)/i,
    /defaults\.set\([^\n]*(?:token|access|refresh)/i,
    /print\s*\(/,
    /NSLog\s*\(/,
    /os_log\s*\(/,
    /refreshToken\.tokenString/,
    /FlutterMethodChannel/,
    /FlutterResult/
  ]) {
    if (forbidden.test(swift)) fail(`iOS custody bridge violates forbidden pattern: ${forbidden}`);
  }

  for (const marker of [
    'NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN',
    'FINANCESENSOR TOKEN DUPLICATION      FORBIDDEN',
    'USERDEFAULTS != TOKEN_STORE',
    'IOS_STATIC_READY != IOS_PHYSICAL_PASS',
    'P2_PARTIAL_PASS != P2_PASS'
  ]) {
    if (!adr.includes(marker)) fail(`ADR-028 missing boundary marker: ${marker}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_IOS_GMAIL_CUSTODY_STATIC=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_IOS_GMAIL_CUSTODY_STATIC=PASS');
console.log('IOS_GOOGLE_SIGNIN_SDK_BOUNDARY=PASS');
console.log('IOS_TOKEN_DUPLICATION_BY_FINANCESENSOR=0');
console.log('IOS_USERDEFAULTS_TOKEN_STORAGE=0');
console.log('IOS_BARRIER_BEFORE_PROVIDER_DISCONNECT=PASS');
console.log('IOS_RESTORE_GUARDED_BY_BARRIER=PASS');
console.log('IOS_PHYSICAL_CUSTODY_PASS=NOT_CLAIMED');
