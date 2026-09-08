import fs from 'node:fs';

const receiptPath = process.argv[2];
if (!receiptPath) {
  console.error('usage: node tools/reduce-alpha2-r1-signing-receipt.mjs <sanitized-receipt.txt>');
  process.exit(2);
}
if (!fs.existsSync(receiptPath)) {
  console.error(`receipt not found: ${receiptPath}`);
  process.exit(2);
}

const expected = {
  FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING: 'PASS',
  FINANCESENSOR_ALPHA2_CANDIDATE: '0.2.0-alpha.2+2005',
  SOURCE_COMMIT: 'd99e7e4765adfc96bed9d914b2b6f296f9712242',
  CANONICAL_RUN_ID: '34257413733',
  CANONICAL_ARTIFACT_ID: '10068684066',
  INPUT_APK_SHA256: 'dacc7d7281842989904adfc1d3e7b17242b39b20674eb8e7c33e1e339428a44c',
  INPUT_APK_BYTES: '182092699',
  SIGNER_SHA1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  ANDROID_OAUTH_PACKAGE: 'com.financesensor.lab.gmailconnection.r2',
  EXACT_SCOPE: 'gmail.readonly',
  PRIVATE_SIGNING_MATERIAL_IN_GITHUB: '0',
  REAL_OAUTH_EXECUTED_BY_SIGNING_STEP: '0',
  REAL_GMAIL_EXECUTED_BY_SIGNING_STEP: '0',
  ALPHA2_MOBILE_INTEGRATION_CI: 'PASS',
  ALPHA2_MOBILE_INTEGRATION_PHYSICAL: 'OPEN',
  PHYSICAL_SQLCIPHER_PASS: 'NO',
  PHYSICAL_ALPHA2_PASS: 'NO',
  BUILD_READY: 'NO',
  RELEASE_READY: 'NO',
};

const requiredDynamic = ['SIGNED_APK_SHA256', 'SIGNED_APK_BYTES'];
const allowedKeys = new Set([...Object.keys(expected), ...requiredDynamic]);
const raw = fs.readFileSync(receiptPath, 'utf8');
const values = new Map();
const failures = [];

for (const rawLine of raw.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const index = line.indexOf('=');
  if (index <= 0) { failures.push(`invalid receipt line: ${line.slice(0, 40)}`); continue; }
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim();
  if (!allowedKeys.has(key)) { failures.push(`unexpected receipt key: ${key}`); continue; }
  if (values.has(key)) failures.push(`duplicate receipt key: ${key}`);
  values.set(key, value);
}

for (const [key, expectedValue] of Object.entries(expected)) if (values.get(key) !== expectedValue) failures.push(`${key} mismatch`);
for (const key of requiredDynamic) if (!values.has(key)) failures.push(`missing ${key}`);

const signedHash = values.get('SIGNED_APK_SHA256') ?? '';
const signedBytes = values.get('SIGNED_APK_BYTES') ?? '';
if (!/^[0-9a-f]{64}$/.test(signedHash)) failures.push('SIGNED_APK_SHA256 must be lowercase SHA256');
if (signedHash === expected.INPUT_APK_SHA256) failures.push('signed APK hash must differ from canonical CI input after stable re-sign');
if (!/^\d+$/.test(signedBytes) || Number(signedBytes) <= 0) failures.push('SIGNED_APK_BYTES must be a positive integer');

const forbiddenText = /password|private[ _-]?key|keystore path|bearer\s|ya29\.|refresh[_ -]?token|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
if (forbiddenText.test(raw)) failures.push('receipt contains secret-like material');

if (failures.length) {
  console.error('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const reduced = {
  schemaVersion: 'A2_R1_PHYSICAL_SIGNING_RECEIPT_V1',
  candidate: expected.FINANCESENSOR_ALPHA2_CANDIDATE,
  sourceCommit: expected.SOURCE_COMMIT,
  canonicalRunId: Number(expected.CANONICAL_RUN_ID),
  canonicalArtifactId: Number(expected.CANONICAL_ARTIFACT_ID),
  inputApkSha256: expected.INPUT_APK_SHA256,
  inputApkBytes: Number(expected.INPUT_APK_BYTES),
  signedApkSha256: signedHash,
  signedApkBytes: Number(signedBytes),
  signerSha1: expected.SIGNER_SHA1,
  androidPackage: expected.ANDROID_OAUTH_PACKAGE,
  gmailScope: expected.EXACT_SCOPE,
  trustedEdgeSigningPass: true,
  r2OwnedDeviceCampaignUnblocked: true,
  physicalAlpha2Pass: false,
  buildReady: false,
  releaseReady: false,
  sanitizationPass: true,
};

console.log('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS');
console.log(JSON.stringify(reduced, null, 2));
