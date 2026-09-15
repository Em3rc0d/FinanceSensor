import fs from 'node:fs';

const files = {
  ledger: 'graph/closure-ledger.json',
  storage: 'mk0/11-decisions/ADR-006-LOCAL-PERSISTENCE-ENCRYPTION.md',
  mobile: 'mk0/11-decisions/ADR-009-MOBILE-IMPLEMENTATION-STACK.md',
  cloud: 'mk0/11-decisions/ADR-010-CONTROL-PLANE-RUNTIME-CLOUD.md',
  android: 'mk0/11-decisions/ADR-013-MINIMUM-SUPPORTED-ANDROID-BASELINE.md',
  oauth: 'mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md',
  serverBoundary: 'mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md',
  crypto: 'mk0/11-decisions/ADR-021-MOBILE-PRODUCTION-CRYPTO-PROFILE.md',
  witness: 'mk0/11-decisions/ADR-022-PRODUCTION-WITNESS-QUORUM.md',
  deletion: 'mk0/11-decisions/ADR-023-DISCONNECT-DELETION-BACKUP-SEMANTICS.md',
  surface: 'mk0/11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md',
  index: 'mk0/11-decisions/ADR-INDEX.md'
};

const failures = [];
const fail = message => failures.push(message);
for (const path of Object.values(files)) if (!fs.existsSync(path)) fail(`missing ${path}`);

function requireMarkers(label, text, markers) {
  for (const marker of markers) if (!text.includes(marker)) fail(`${label} missing marker: ${marker}`);
}

if (!failures.length) {
  const ledger = JSON.parse(fs.readFileSync(files.ledger, 'utf8'));
  const storage = fs.readFileSync(files.storage, 'utf8');
  const mobile = fs.readFileSync(files.mobile, 'utf8');
  const cloud = fs.readFileSync(files.cloud, 'utf8');
  const android = fs.readFileSync(files.android, 'utf8');
  const oauth = fs.readFileSync(files.oauth, 'utf8');
  const serverBoundary = fs.readFileSync(files.serverBoundary, 'utf8');
  const crypto = fs.readFileSync(files.crypto, 'utf8');
  const witness = fs.readFileSync(files.witness, 'utf8');
  const deletion = fs.readFileSync(files.deletion, 'utf8');
  const surface = fs.readFileSync(files.surface, 'utf8');
  const index = fs.readFileSync(files.index, 'utf8');

  requireMarkers('ADR-006', storage, [
    'PRODUCTION DATABASE ENCRYPTION  SQLCipher 4.x family',
    'DATABASE KEY                    random 256-bit DEK',
    'DEK IN SOURCE / DART CONFIG     FORBIDDEN',
    'PLAINTEXT PRODUCTION DB         FORBIDDEN',
    'SQLCIPHER_FAILURE => FAIL_CLOSED'
  ]);

  requireMarkers('ADR-009', mobile, [
    'Flutter / Dart',
    'Android → Kotlin',
    'Apple   → Swift',
    'FLUTTER_UI != SECURITY_BOUNDARY',
    'PLAINTEXT_SQLITE_FALLBACK = FORBIDDEN'
  ]);

  requireMarkers('ADR-010', cloud, [
    'PRIMARY CONTROL-PLANE PROVIDER       Supabase',
    'CONTROL DATABASE                     PostgreSQL',
    'GMAIL API EXECUTION                  FORBIDDEN IN CONTROL PLANE',
    'GMAIL REFRESH TOKEN CUSTODY          FORBIDDEN IN CONTROL PLANE',
    'FINANCIAL PLAINTEXT                  FORBIDDEN IN NORMAL CONTROL PLANE',
    'SERVICE ROLE IN MOBILE CLIENT        FORBIDDEN',
    'INDEPENDENT WITNESS                  OUTSIDE relay failure domain REQUIRED',
    'SUPABASE_AUTH != GOOGLE_OAUTH_AUTHORITY'
  ]);

  requireMarkers('ADR-013', android, [
    'ANDROID MIN SDK                  31',
    '2026 RELEASE TARGET SDK FLOOR    36',
    'EMULATOR_PASS != PHYSICAL_KEY_PROOF'
  ]);

  requireMarkers('ADR-017', oauth, [
    'store long-lived refresh authority only in protected device credential storage',
    'expose short-lived access tokens to the Gmail adapter only when needed'
  ]);

  requireMarkers('ADR-020', serverBoundary, [
    'PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION'
  ]);

  requireMarkers('ADR-021', crypto, [
    'DHKEM(P-256, HKDF-SHA256)',
    'exportable long-lived private key fallback → forbidden'
  ]);

  requireMarkers('ADR-022', witness, [
    'configured witnesses              3',
    'confirmation quorum               2 of 3',
    'minimum relay-independent witness 1'
  ]);

  requireMarkers('ADR-023', deletion, [
    'BACKUP_MAX_PHYSICAL_RETENTION <= 35 days',
    'MUST NOT RESURRECT TENANT AUTHORITY'
  ]);

  requireMarkers('ADR-025', surface, [
    'FINANCESENSOR PRIMARY PRODUCT = MOBILE APPLICATION',
    'Android — first physical product target',
    'IMPLEMENTATION_DIRECTION_RESOLVED != PHYSICAL_PRODUCT_PROVEN'
  ]);

  requireMarkers('ADR-INDEX', index, [
    '| ADR-006 | Local persistence/encryption technology | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL STORAGE VALIDATION REQUIRED |',
    '| ADR-009 | Mobile implementation stack | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL MOBILE VALIDATION REQUIRED |',
    '| ADR-010 | Control-plane runtime/cloud platform | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL CLOUD VALIDATION REQUIRED |',
    '| ADR-013 | Minimum supported Android baseline | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL DEVICE MATRIX REQUIRED |',
    'PRIMARY CONTROL PLANE              Supabase / PostgreSQL'
  ]);

  if (ledger.buildReady !== false) fail('closure ledger must remain buildReady=false until G-MK0 closes');
  for (const id of ['Q-003', 'Q-004', 'Q-005']) {
    const node = ledger.nodes.find(node => node.id === id);
    if (!node) fail(`closure ledger missing ${id}`);
    else if (node.status !== 'ACTIVE') fail(`${id} must remain ACTIVE during implementation-baseline freeze; got ${node.status}`);
  }

  if (/Gmail refresh token.{0,80}(Supabase|Postgres|Edge Function)/is.test(cloud) && !cloud.includes('FORBIDDEN IN CONTROL PLANE')) {
    fail('cloud ADR may be moving Gmail refresh authority into the control plane');
  }

  if (/minSdk\s*[<:=]+\s*(?:2[0-9]|30)\b/i.test(android)) fail('Android baseline appears lower than API 31');
}

if (failures.length) {
  console.error('FINANCESENSOR_IMPLEMENTATION_BASELINE=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_IMPLEMENTATION_BASELINE=PASS');
console.log('PRIMARY_PRODUCT=MOBILE');
console.log('MOBILE_STACK=FLUTTER_DART_NATIVE_KOTLIN_SWIFT_BRIDGES');
console.log('ANDROID_MIN_SDK=31');
console.log('ANDROID_2026_TARGET_SDK_FLOOR=36');
console.log('LOCAL_PERSISTENCE=SQLITE_SQLCIPHER_4X');
console.log('DATABASE_DEK_DURABLE_DART_CUSTODY=FORBIDDEN');
console.log('CONTROL_PLANE=SUPABASE_POSTGRESQL');
console.log('GMAIL_REFRESH_AUTHORITY_IN_CONTROL_PLANE=FORBIDDEN');
console.log('FINANCIAL_PLAINTEXT_IN_CONTROL_PLANE=FORBIDDEN');
console.log('INDEPENDENT_WITNESS_REQUIRED=YES');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('BUILD_READY=false');
console.log('IMPLEMENTATION_DIRECTION=FROZEN');
console.log('PHYSICAL_CLOSURE=OPEN');
