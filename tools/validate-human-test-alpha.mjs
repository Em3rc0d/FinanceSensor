import fs from 'node:fs';

const paths = {
  dart: 'spikes/mobile-shell/lib/main_human_test.dart',
  activity: 'spikes/mobile-shell/native/android/HumanTestMainActivity.kt',
  scanner: 'spikes/mobile-shell/native/android/FinancialMailScanner.kt',
  test: 'spikes/mobile-shell/test/human_test_candidate_test.dart',
  workflow: '.github/workflows/mobile-human-test-alpha.yml',
  release: 'mk0/12-release/HUMAN-TEST-CANDIDATE.md',
};

const failures = [];
const fail = (message) => failures.push(message);
for (const path of Object.values(paths)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const dart = fs.readFileSync(paths.dart, 'utf8');
  const activity = fs.readFileSync(paths.activity, 'utf8');
  const scanner = fs.readFileSync(paths.scanner, 'utf8');
  const workflow = fs.readFileSync(paths.workflow, 'utf8');
  const release = fs.readFileSync(paths.release, 'utf8');

  for (const marker of [
    "MethodChannel('com.financesensor.platform/human_test')",
    "invokeMapMethod<Object?, Object?>('getState')",
    "invokeMapMethod<Object?, Object?>('connect')",
    "invokeMapMethod<Object?, Object?>('scan')",
    "invokeMapMethod<Object?, Object?>('disconnect')",
    'ALPHA HUMANA · DATOS REALES SOLO EN ESTA SESIÓN',
    'No es un saldo bancario ni una foto financiera completa.',
  ]) if (!dart.includes(marker)) fail(`Dart human-test marker missing: ${marker}`);

  for (const pattern of [
    /gmail\.googleapis\.com/i,
    /accounts\.google\.com/i,
    /oauth2\.googleapis\.com/i,
    /access[_ -]?token/i,
    /refresh[_ -]?token/i,
    /client[_ -]?secret/i,
    /dart:io/,
  ]) if (pattern.test(dart)) fail(`Dart crossed native network/credential boundary: ${pattern}`);

  for (const marker of [
    'https://www.googleapis.com/auth/gmail.readonly',
    'Identity.getAuthorizationClient(this)',
    'AccountPicker.newChooseAccountIntent(options)',
    'FinancialMailScanner.scan(token)',
    '"accessTokenExposedToFlutter" to false',
    '"refreshTokenHeldByApp" to false',
    '"offlineAccessRequested" to false',
    'setBarrier(true)',
    'revokeAccess',
  ]) if (!activity.includes(marker)) fail(`Android human-test boundary missing: ${marker}`);

  for (const pattern of [
    /requestOfflineAccess/,
    /serverAuthCode/,
    /FileOutputStream/,
    /Log\./,
    /putString\s*\(/,
    /"accessToken"\s+to/,
  ]) if (pattern.test(activity)) fail(`Android human-test custody violation: ${pattern}`);

  for (const marker of [
    'private const val MAX_MESSAGES = 300',
    '?format=metadata',
    '?format=full',
    'candidate == null',
    '"coverage" to "RECENT_INBOX_BOUNDED_SAMPLE"',
    '"sessionOnly" to true',
    '"rawContentReturned" to false',
    '"rawContentPersisted" to false',
  ]) if (!scanner.includes(marker)) fail(`scanner boundary missing: ${marker}`);

  const metadataIndex = scanner.indexOf('?format=metadata');
  const fullIndex = scanner.indexOf('?format=full');
  if (metadataIndex < 0 || fullIndex < 0 || metadataIndex > fullIndex) fail('metadata-first ordering not visible in scanner source');

  for (const pattern of [
    /FileOutputStream/,
    /SharedPreferences/,
    /Log\./,
    /println\(/,
    /messageId\s+to/,
    /subject\s+to/,
    /body\s+to/,
  ]) if (pattern.test(scanner)) fail(`scanner may persist/log/return raw content: ${pattern}`);

  for (const marker of [
    'runs-on: ubuntu-latest',
    '--target lib/main_human_test.dart',
    'com.financesensor.lab.gmailconnection.r2',
    'HUMAN_TEST_READY=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO',
    'REAL_OAUTH_EXECUTED_BY_CI=0',
    'REAL_GMAIL_EXECUTED_BY_CI=0',
    'PUBLIC_CI_SIGNER=COMPILE_ONLY_EPHEMERAL',
  ]) if (!workflow.includes(marker)) fail(`workflow marker missing: ${marker}`);

  if (/\$\{\{\s*secrets\./.test(workflow)) fail('human-test workflow may not reference GitHub secrets');
  if (/self-hosted/i.test(workflow)) fail('human-test public CI may not route to self-hosted runner');

  for (const marker of [
    'HUMAN_TEST_READY=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO',
    'SESSION_ONLY_FINANCIAL_STATE=YES',
    'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  ]) if (!release.includes(marker)) fail(`release contract marker missing: ${marker}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_HUMAN_TEST_ALPHA=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_HUMAN_TEST_ALPHA=PASS');
console.log('HUMAN_TEST_READY=YES');
console.log('REAL_DATA_EXECUTION=OWNED_DEVICE_ONLY');
console.log('SESSION_ONLY_FINANCIAL_STATE=YES');
console.log('EXACT_SCOPE=gmail.readonly');
console.log('DART_BEARER_CUSTODY=0');
console.log('APP_REFRESH_TOKEN_CUSTODY=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
