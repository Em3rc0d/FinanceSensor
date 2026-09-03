import crypto from 'node:crypto';
import fs from 'node:fs';

const bindingPath = 'graph/physical-receipts/P2-ANDROID-2026-09-03.json';
const failures = [];
const fail = message => failures.push(message);

function gitBlobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex');
}

function verifySource(source) {
  if (!source?.path || !source?.blobSha || !source?.role) {
    fail('P2 Android source requires path/blobSha/role');
    return '';
  }
  if (!fs.existsSync(source.path)) {
    fail(`P2 Android bound source missing: ${source.path}`);
    return '';
  }
  const text = fs.readFileSync(source.path, 'utf8');
  const actual = gitBlobSha(text);
  if (actual !== source.blobSha) fail(`P2 Android blob mismatch for ${source.path}: expected ${source.blobSha}, found ${actual}`);
  return text;
}

if (!fs.existsSync(bindingPath)) fail(`missing ${bindingPath}`);

if (!failures.length) {
  const binding = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
  if (binding.schemaVersion !== 1) fail('P2 Android binding schemaVersion must be 1');
  if (binding.phase !== 'P2') fail('P2 Android binding phase mismatch');
  if (binding.subBoundary !== 'ANDROID') fail('P2 Android binding subBoundary mismatch');
  if (binding.status !== 'PASS') fail('P2 Android binding must declare PASS');
  if (binding.claim !== 'ANDROID_PROTECTED_OAUTH_CUSTODY') fail('P2 Android binding claim mismatch');
  if (binding.sourceBaselineCommit !== '93fa4f47386c3e0e023a2b21a24bd948f5852a4c') fail('P2 Android source baseline mismatch');

  const receipt = binding.receipt;
  const receiptText = verifySource({ ...receipt, role: 'P2_ANDROID_PASS_RECEIPT' });
  for (const marker of [
    '**Status:** PASS',
    'APP-HELD REFRESH TOKEN                  NONE',
    'BEARER TO FLUTTER                       NO',
    'ANDROID_PROTECTED_OAUTH_CUSTODY         PASS',
    'ANDROID_P2_CUSTODY_PASS != GOOGLE_PROVIDER_REVOKE_PASS',
    'P2                                      PHYSICAL_EVIDENCE_REQUIRED'
  ]) {
    if (!receiptText.includes(marker)) fail(`P2 Android receipt missing marker: ${marker}`);
  }

  const physicalSources = binding.physicalSources ?? [];
  if (physicalSources.length !== 3) fail('P2 Android must bind exactly 3 owned-device receipts');
  const physicalTexts = physicalSources.map(verifySource);

  const r1 = physicalTexts.find(text => text.includes('Android Gmail R1 physical connect PASS'));
  if (!r1) fail('P2 Android missing R1 physical receipt');
  else {
    for (const marker of ['APP_REFRESH_TOKEN_CUSTODY                NO', 'BEARER_TO_FLUTTER                        NO']) {
      if (!r1.includes(marker)) fail(`R1 missing custody marker: ${marker}`);
    }
  }

  const r2Disconnect = physicalTexts.find(text => text.includes('Android R2 local disconnect PASS'));
  if (!r2Disconnect || !r2Disconnect.includes('DURABLE DISCONNECT BARRIER                  PASS')) {
    fail('P2 Android missing durable R2 disconnect evidence');
  }

  const r2Stable = physicalTexts.find(text => text.includes('Android R2 stable local lifecycle PASS'));
  if (!r2Stable || !r2Stable.includes('APP REMAINS DISCONNECTED                  PASS')) {
    fail('P2 Android missing stable R2 lifecycle evidence');
  }

  const implementation = new Map((binding.implementationSources ?? []).map(source => [source.role, verifySource(source)]));
  const android = implementation.get('ANDROID_NATIVE_CREDENTIAL_BOUNDARY') ?? '';
  for (const marker of [
    'private var shortLivedAccessToken: String? = null',
    'private var authorizedAccount: Account? = null',
    'putBoolean(DISCONNECT_BARRIER_KEY, active)',
    'shortLivedAccessToken = null',
    '"accountHandleAvailableInMemory"'
  ]) {
    if (!android.includes(marker)) fail(`Android bridge missing custody marker: ${marker}`);
  }

  for (const forbidden of [
    'requestOfflineAccess',
    'getServerAuthCode',
    'serverAuthCode',
    'putString(DISCONNECT_BARRIER_KEY',
    'putString("access',
    'putString("refresh'
  ]) {
    if (android.includes(forbidden)) fail(`Android bridge contains forbidden custody path: ${forbidden}`);
  }

  const semantics = implementation.get('P2_CUSTODY_SEMANTICS') ?? '';
  if (!semantics.includes('NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN')) fail('ADR-028 custody semantics missing Android no-refresh rule');
  if (!semantics.includes('ANDROID_P2_CUSTODY_PASS != PROVIDER_REVOKE_PASS')) fail('ADR-028 must separate P2 custody from provider revoke');

  const facts = new Set(binding.physicalFacts ?? []);
  for (const fact of [
    'REAL_GOOGLE_AUTHORIZATION_PASS',
    'EXACT_GMAIL_READONLY_PASS',
    'GMAIL_PROFILE_REACHABLE_PASS',
    'APP_REFRESH_TOKEN_CUSTODY_NONE',
    'BEARER_TO_FLUTTER_NONE',
    'DURABLE_DISCONNECT_BARRIER_PASS',
    'APP_REOPEN_REMAINS_DISCONNECTED_PASS'
  ]) {
    if (!facts.has(fact)) fail(`P2 Android binding missing physical fact ${fact}`);
  }

  const doesNotProve = new Set(binding.doesNotProve ?? []);
  for (const boundary of ['IOS_PROTECTED_OAUTH_CUSTODY', 'GOOGLE_PROVIDER_REVOKE_PASS', 'P2_PASS', 'Q003_CLOSED', 'Q004_CLOSED', 'BUILD_READY']) {
    if (!doesNotProve.has(boundary)) fail(`P2 Android receipt must preserve boundary ${boundary}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_P2_ANDROID_CUSTODY_RECEIPT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_P2_ANDROID_CUSTODY_RECEIPT=PASS');
console.log('ANDROID_PROTECTED_OAUTH_CUSTODY=PHYSICAL_PASS');
console.log('APP_HELD_REFRESH_TOKEN=0');
console.log('BEARER_TO_FLUTTER=0');
console.log('DURABLE_AUTH_STATE=DISCONNECT_BARRIER_BOOLEAN_ONLY');
console.log('GOOGLE_PROVIDER_REVOKE=NOT_CLAIMED_BY_P2_ANDROID');
console.log('P2_OVERALL=PHYSICAL_EVIDENCE_REQUIRED');
