import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = 'graph/physical-receipts';
const receiptPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';
const expectedOd0Receipt = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD0-2026-09-09.json';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const requiredPath of [receiptDir, r1Path, r2Path, reducerPath]) assert(fs.existsSync(requiredPath), `missing ${requiredPath}`);

const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));
const candidateFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(receiptPrefix)).sort();
const candidateTxt = candidateFiles.filter(name => name.endsWith('.txt'));
const candidateJson = candidateFiles.filter(name => name.endsWith('.json'));

const expectedStatic = {
  schemaVersion: 'A2_R1_PHYSICAL_SIGNING_RECEIPT_V1',
  candidate: '0.2.0-alpha.2+2006',
  sourceCommit: 'e26bab7cd87c5e686898998e867d8fb25c99db27',
  canonicalRunId: 34278019055,
  canonicalArtifactId: 10076715491,
  inputApkSha256: '11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179',
  inputApkBytes: 182102047,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  androidPackage: 'com.financesensor.lab.gmailconnection.r2',
  gmailScope: 'gmail.readonly',
  trustedEdgeSigningPass: true,
  r2OwnedDeviceCampaignUnblocked: true,
  physicalAlpha2Pass: false,
  buildReady: false,
  releaseReady: false,
  sanitizationPass: true,
};

if (r1.physicalReceipt === null) {
  assert(candidateTxt.length === 0 && candidateJson.length === 0, 'unbound +2006 signing receipt files are forbidden while R1 is OPEN');
  assert(r1.candidate === expectedStatic.candidate && r1.sourceCommit === expectedStatic.sourceCommit, 'open R1 must bind current +2006 authority');
  assert(r1.status === 'READY_FOR_TRUSTED_EDGE_SIGNING', `R1 must remain ready for trusted-edge signing; got ${r1.status}`);
  assert(r1.trustedEdgeSigningPass === false, 'R1 cannot pre-certify trusted-edge signing');
  assert(r1.signedApkSha256 === null && r1.signedApkBytes === null, 'R1 cannot bind a stable APK before receipt');
  assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'open R1 cannot promote downstream readiness');

  assert(r2.candidate?.id === expectedStatic.candidate && r2.candidate?.sourceCommit === expectedStatic.sourceCommit, 'open R2 must bind current +2006 authority');
  assert(r2.status === 'BLOCKED_BY_R1_SIGNING' && r2.r1PhysicalReceipt === null, 'R2 must remain blocked until +2006 receipt');
  assert(r2.candidate?.signedApkSha256 === null && r2.candidate?.signedApkBytes === null, 'R2 cannot bind stable APK before R1 receipt');
  assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'BLOCKED_BY_R1_SIGNING', 'OD0 must remain blocked by R1');
  for (const gate of r2.subgates?.slice(1) ?? []) assert(gate.status === 'BLOCKED_BY_PRIOR_GATE', `${gate.id} must remain blocked`);
  assert(r2.currentState?.r1TrustedEdgeSigning === 'OPEN' && r2.currentState?.r2PhysicalCampaign === 'BLOCKED_BY_R1', 'R2 pre-signing state drifted');
  assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close before receipt');
  assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'pre-signing state cannot promote G-MK0/build/release');

  console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
  console.log('CURRENT_2006_RECEIPT=OPEN');
  console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
  console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
  console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
  console.log('PHYSICAL_ALPHA2_PASS=NO');
  console.log('BUILD_READY=NO');
  console.log('RELEASE_READY=NO');
  process.exit(0);
}

const reducedPath = r1.physicalReceipt?.path;
const sourcePath = r1.physicalReceipt?.sourcePath;
assert(typeof reducedPath === 'string' && typeof sourcePath === 'string', 'R1 physicalReceipt must bind both reduced path and sourcePath');
assert(path.dirname(reducedPath) === receiptDir && path.dirname(sourcePath) === receiptDir, 'R1 receipt paths must stay inside graph/physical-receipts');
assert(path.basename(reducedPath).startsWith(receiptPrefix) && reducedPath.endsWith('.json'), 'R1 reduced receipt must be a +2006 JSON receipt');
assert(path.basename(sourcePath).startsWith(receiptPrefix) && sourcePath.endsWith('.txt'), 'R1 source receipt must be a +2006 TXT receipt');
assert(path.basename(reducedPath, '.json') === path.basename(sourcePath, '.txt'), 'R1 source/reduced receipt stems must match');
assert(candidateTxt.length === 1 && candidateJson.length === 1, 'exactly one bound +2006 sanitized receipt pair is allowed');
assert(path.join(receiptDir, candidateTxt[0]) === sourcePath && path.join(receiptDir, candidateJson[0]) === reducedPath, 'candidate receipt files must equal the graph-bound pair');
assert(fs.existsSync(sourcePath) && fs.existsSync(reducedPath), 'graph-bound +2006 receipt pair is incomplete');

const source = fs.readFileSync(sourcePath, 'utf8');
const reduced = JSON.parse(fs.readFileSync(reducedPath, 'utf8'));

assert(!/keystore password|private[ _-]?key|access[_ -]?token|refresh[_ -]?token|bearer\s|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(source), 'sanitized source contains forbidden secret-like material');
assert(!source.includes('Keystore password (trusted-edge session only)'), 'interactive password prompt must not enter GitHub');

const run = spawnSync(process.execPath, [reducerPath, sourcePath], { encoding: 'utf8' });
assert(run.error == null, `receipt reducer failed to start: ${run.error?.message ?? ''}`);
assert(run.status === 0, `receipt reducer rejected physical receipt:\n${run.stdout}\n${run.stderr}`);
assert(run.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'receipt reducer PASS marker missing');
const jsonStart = run.stdout.indexOf('{');
assert(jsonStart >= 0, 'reducer JSON output missing');
const observed = JSON.parse(run.stdout.slice(jsonStart));

for (const [key, value] of Object.entries(expectedStatic)) {
  assert(JSON.stringify(observed[key]) === JSON.stringify(value), `reducer output ${key} mismatch`);
  assert(JSON.stringify(reduced[key]) === JSON.stringify(value), `reduced receipt ${key} mismatch`);
}
for (const key of ['signedApkSha256','signedApkBytes']) assert(JSON.stringify(observed[key]) === JSON.stringify(reduced[key]), `${key} reducer/reduced mismatch`);
assert(/^[0-9a-f]{64}$/.test(reduced.signedApkSha256) && reduced.signedApkSha256 !== expectedStatic.inputApkSha256, 'stable signed APK hash invalid');
assert(Number.isInteger(reduced.signedApkBytes) && reduced.signedApkBytes > 0, 'stable signed APK byte size invalid');
assert(reduced.evidenceClass === 'SANITIZED_TRUSTED_EDGE_RECEIPT', 'receipt evidence class drifted');
assert(reduced.rawPrivateMaterialCommitted === false, 'raw private material boundary drifted');

assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true, 'R1 must be closed by current +2006 receipt');
assert(r1.candidate === expectedStatic.candidate && r1.sourceCommit === expectedStatic.sourceCommit, 'R1 current authority drifted');
assert(r1.signedApkSha256 === reduced.signedApkSha256 && r1.signedApkBytes === reduced.signedApkBytes, 'R1 signed APK identity drifted');
assert(r1.physicalReceipt?.sanitizationPass === true && r1.physicalReceipt?.rawPrivateMaterialCommitted === false, 'R1 receipt sanitization boundary drifted');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 receipt may not promote downstream readiness');

assert(r2.r1PhysicalReceipt === reducedPath, 'R2 must bind exact current +2006 R1 receipt');
assert(r2.candidate?.id === expectedStatic.candidate && r2.candidate?.sourceCommit === expectedStatic.sourceCommit, 'R2 current authority drifted');
assert(r2.candidate?.signedApkSha256 === reduced.signedApkSha256 && r2.candidate?.signedApkBytes === reduced.signedApkBytes, 'R2 signed candidate drifted');

const od0Pass = r2.receipt?.current === expectedOd0Receipt && r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'PASS';
if (od0Pass) {
  assert(fs.existsSync(expectedOd0Receipt), 'R2 OD0 receipt must exist when OD0 is PASS');
  assert(r2.status === 'PHYSICAL_CAMPAIGN_IN_PROGRESS', 'R2 must be in progress after OD0 PASS');
  assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'IN_PROGRESS', 'R2 state must preserve R1 PASS while progressing physically');
  assert(r2.currentState?.nextGate === 'OD1_EXACT_GMAIL_READONLY_OAUTH', 'OD1 must be the next physical gate after OD0');
  assert(r2.subgates?.[1]?.id === 'OD1' && r2.subgates?.[1]?.status === 'READY_FOR_PHYSICAL', 'OD1 must be ready after OD0 PASS');
  for (const gate of r2.subgates?.slice(2) ?? []) assert(gate.status === 'BLOCKED_BY_PRIOR_GATE', `${gate.id} must remain blocked`);
} else {
  assert(r2.status === 'READY_FOR_PHYSICAL_CAMPAIGN', 'R2 must be ready after current +2006 R1 PASS before OD0');
  assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'READY', 'R2 state must reflect current R1 PASS');
  assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'READY_FOR_PHYSICAL', 'OD0 must be the only ready physical gate before its receipt');
  for (const gate of r2.subgates?.slice(1) ?? []) assert(gate.status === 'BLOCKED_BY_PRIOR_GATE', `${gate.id} must remain blocked`);
}

assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from R1/R2 incremental evidence');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'R1/R2 incremental evidence cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
console.log('CURRENT_2006_RECEIPT=PASS');
console.log(`SIGNED_APK_SHA256=${reduced.signedApkSha256}`);
console.log(`SIGNED_APK_BYTES=${reduced.signedApkBytes}`);
console.log(`SIGNER_SHA1=${expectedStatic.signerSha1}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log(`R2_PHYSICAL_CAMPAIGN=${od0Pass ? 'IN_PROGRESS' : 'READY'}`);
console.log(`R2_NEXT_GATE=${od0Pass ? 'OD1_EXACT_GMAIL_READONLY_OAUTH' : 'OD0_SIGNED_APK_INSTALL_AND_LAUNCH'}`);
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
