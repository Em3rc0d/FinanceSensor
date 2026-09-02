import fs from 'node:fs';

const files = {
  stack: 'mk0/11-decisions/ADR-009-MOBILE-IMPLEMENTATION-STACK.md',
  oauth: 'mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md',
  crypto: 'mk0/11-decisions/ADR-021-MOBILE-PRODUCTION-CRYPTO-PROFILE.md',
  surface: 'mk0/11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md'
};

const failures = [];
for (const path of Object.values(files)) if (!fs.existsSync(path)) failures.push(`missing ${path}`);

if (!failures.length) {
  const stack = fs.readFileSync(files.stack, 'utf8');
  const oauth = fs.readFileSync(files.oauth, 'utf8');
  const crypto = fs.readFileSync(files.crypto, 'utf8');
  const surface = fs.readFileSync(files.surface, 'utf8');

  const stackRequired = [
    'Flutter / Dart',
    'Android → Kotlin',
    'Apple   → Swift',
    'Flutter is not the credential vault',
    'exportable long-lived private key fallback',
    'FLUTTER_UI != SECURITY_BOUNDARY',
    'PLUGIN_CONVENIENCE < PLATFORM_TRUST_BOUNDARY',
    'FLUTTER_SUPPORT_MATRIX != FINANCESENSOR_SECURITY_BASELINE',
    'ADR-013 remains open'
  ];
  for (const value of stackRequired) if (!stack.includes(value)) failures.push(`ADR-009 missing ${value}`);

  if (!oauth.includes('PRODUCTION MOBILE CREDENTIAL')) failures.push('ADR-017 no longer exposes mobile credential boundary');
  if (!crypto.includes('exportable long-lived private key fallback → forbidden')) failures.push('ADR-021 no longer forbids exportable production authority fallback');
  if (!surface.includes('FINANCESENSOR PRIMARY PRODUCT = MOBILE APPLICATION')) failures.push('ADR-025 no longer defines mobile primary product');

  if (/refresh token.*Dart/i.test(stack) && !stack.includes('MUST NOT become durable custody')) {
    failures.push('ADR-009 may have moved refresh-token custody into Dart');
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
console.log('LONG_LIVED_SECRET_CUSTODY_IN_DART=FORBIDDEN');
console.log('EXPORTABLE_PRIVATE_KEY_FALLBACK=FORBIDDEN');
console.log('ANDROID_BASELINE=OPEN_UNDER_ADR_013');
console.log('MOBILE_PHYSICAL_PROVEN=NO');
