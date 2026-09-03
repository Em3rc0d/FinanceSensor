import fs from 'node:fs';

const files = {
  stack: 'mk0/11-decisions/ADR-009-MOBILE-IMPLEMENTATION-STACK.md',
  storage: 'mk0/11-decisions/ADR-006-LOCAL-PERSISTENCE-ENCRYPTION.md',
  android: 'mk0/11-decisions/ADR-013-MINIMUM-SUPPORTED-ANDROID-BASELINE.md',
  oauth: 'mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md',
  custody: 'mk0/11-decisions/ADR-028-MOBILE-OAUTH-CUSTODY-SEMANTICS.md',
  crypto: 'mk0/11-decisions/ADR-021-MOBILE-PRODUCTION-CRYPTO-PROFILE.md',
  surface: 'mk0/11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md'
};

const failures = [];
for (const path of Object.values(files)) if (!fs.existsSync(path)) failures.push(`missing ${path}`);

if (!failures.length) {
  const stack = fs.readFileSync(files.stack, 'utf8');
  const storage = fs.readFileSync(files.storage, 'utf8');
  const android = fs.readFileSync(files.android, 'utf8');
  const oauth = fs.readFileSync(files.oauth, 'utf8');
  const custody = fs.readFileSync(files.custody, 'utf8');
  const crypto = fs.readFileSync(files.crypto, 'utf8');
  const surface = fs.readFileSync(files.surface, 'utf8');

  const stackRequired = [
    'Flutter / Dart',
    'Android → Kotlin',
    'Apple   → Swift',
    'Flutter is not the credential vault',
    'EXPORTABLE_PRIVATE_KEY_FALLBACK = FORBIDDEN',
    'PLAINTEXT_SQLITE_FALLBACK = FORBIDDEN',
    'FLUTTER_UI != SECURITY_BOUNDARY',
    'PLUGIN_CONVENIENCE < PLATFORM_TRUST_BOUNDARY',
    'FLUTTER_SUPPORT_MATRIX != FINANCESENSOR_SECURITY_BASELINE',
    'FINANCESENSOR minSdk            31',
    'PRODUCTION ENCRYPTION           SQLCipher 4.x family'
  ];
  for (const value of stackRequired) if (!stack.includes(value)) failures.push(`ADR-009 missing ${value}`);

  const storageRequired = [
    'PRODUCTION DATABASE ENCRYPTION  SQLCipher 4.x family',
    'DATABASE KEY                    random 256-bit DEK',
    'DEK IN SOURCE / DART CONFIG     FORBIDDEN',
    'PLAINTEXT PRODUCTION DB         FORBIDDEN',
    'SQLCIPHER_FAILURE => FAIL_CLOSED'
  ];
  for (const value of storageRequired) if (!storage.includes(value)) failures.push(`ADR-006 missing storage boundary marker: ${value}`);

  const androidRequired = [
    'ANDROID MIN SDK                  31',
    '2026 RELEASE TARGET SDK FLOOR    36',
    'SOFTWARE/EXPORTABLE AUTHORITY    forbidden as silent production fallback',
    'EMULATOR_PASS != PHYSICAL_KEY_PROOF'
  ];
  for (const value of androidRequired) if (!android.includes(value)) failures.push(`ADR-013 missing Android baseline marker: ${value}`);

  const oauthRequired = [
    '### 4. Production mobile boundary',
    'Production Android/iOS client',
    'store long-lived refresh authority only in protected device credential storage',
    'expose short-lived access tokens to the Gmail adapter only when needed',
    'does not claim final Android/iOS callback and credential-storage behavior is physically proven'
  ];
  for (const value of oauthRequired) if (!oauth.includes(value)) failures.push(`ADR-017 missing mobile OAuth boundary marker: ${value}`);

  const custodyRequired = [
    'PROTECTED_CUSTODY != APP_MUST_STORE_REFRESH_TOKEN',
    'NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN',
    'ANDROID APP-HELD REFRESH TOKEN       NONE',
    'FINANCESENSOR TOKEN DUPLICATION      FORBIDDEN',
    'USERDEFAULTS != TOKEN_STORE',
    'ANDROID_P2_CUSTODY_PASS != PROVIDER_REVOKE_PASS',
    'IOS_STATIC_READY != IOS_PHYSICAL_PASS'
  ];
  for (const value of custodyRequired) if (!custody.includes(value)) failures.push(`ADR-028 missing custody refinement: ${value}`);

  if (!crypto.includes('exportable long-lived private key fallback → forbidden')) failures.push('ADR-021 no longer forbids exportable production authority fallback');
  if (!surface.includes('FINANCESENSOR PRIMARY PRODUCT = MOBILE APPLICATION')) failures.push('ADR-025 no longer defines mobile primary product');

  if (/refresh token.*Dart/i.test(stack) && !stack.includes('MUST NOT become durable custody')) {
    failures.push('ADR-009 may have moved refresh-token custody into Dart');
  }
  if (/minSdk\s*[<:=]+\s*(?:2[0-9]|30)\b/i.test(stack)) {
    failures.push('ADR-009 appears to allow an Android minimum below API 31');
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_MOBILE_STACK_CONTRACT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_MOBILE_STACK_CONTRACT=PASS');
console.log('MOBILE_UI_STACK=FLUTTER_DART');
console.log('ANDROID_SECURITY_BRIDGE=KOTLIN');
console.log('IOS_SECURITY_BRIDGE=SWIFT');
console.log('LOCAL_DB=SQLITE_SQLCIPHER_4X');
console.log('DATABASE_DEK_CUSTODY_IN_DART=FORBIDDEN');
console.log('ANDROID_MIN_SDK=31');
console.log('ANDROID_2026_TARGET_SDK_FLOOR=36');
console.log('LONG_LIVED_SECRET_CUSTODY_IN_DART=FORBIDDEN');
console.log('ANDROID_APP_HELD_REFRESH_TOKEN=NONE');
console.log('IOS_GOOGLE_AUTHORITY=GOOGLE_SIGNIN_SDK');
console.log('IOS_TOKEN_DUPLICATION_BY_FINANCESENSOR=FORBIDDEN');
console.log('EXPORTABLE_PRIVATE_KEY_FALLBACK=FORBIDDEN');
console.log('MOBILE_OAUTH_PHYSICAL_PROVEN=PARTIAL_ANDROID_P2_ONLY');
console.log('IOS_OAUTH_PHYSICAL_PROVEN=NO');
console.log('MOBILE_CRYPTO_PHYSICAL_PROVEN=NO');
console.log('LOCAL_STORAGE_PHYSICAL_PROVEN=NO');
