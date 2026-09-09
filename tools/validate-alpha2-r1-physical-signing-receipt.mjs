import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = 'graph/physical-receipts';
const receiptPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';
const expectedR2Receipt = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const requiredPath of [receiptDir, r1Path, r2Path, reducerPath, expectedR2Receipt]) assert(fs.existsSync(requiredPath), `missing ${requiredPath}`);

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

assert(r1.physicalReceipt !== null, 'current +2006 R1 physical signing receipt must remain bound');
const reducedPath = r1.physicalReceipt?.path;
const sourcePath = r1.physicalReceipt?.sourcePath;
assert(typeof reducedPath === 'string' && typeof sourcePath === 'string', 'R1 physicalReceipt must bind reduced and source paths');
assert(path.dirname(reducedPath) === receiptDir && path.dirname(sourcePath) === receiptDir, 'R1 receipt paths must stay inside physical-receipts');
assert(path.basename(reducedPath).startsWith(receiptPrefix) && reducedPath.endsWith('.json'), 'R1 reduced receipt path invalid');
assert(path.basename(sourcePath).startsWith(receiptPrefix) && sourcePath.endsWith('.txt'), 'R1 source receipt path invalid');
assert(path.basename(reducedPath, '.json') === path.basename(sourcePath, '.txt'), 'R1 receipt stems must match');
assert(candidateTxt.length === 1 && candidateJson.length === 1, 'exactly one +2006 R1 sanitized receipt pair is allowed');
assert(path.join(receiptDir, candidateTxt[0]) === sourcePath && path.join(receiptDir, candidateJson[0]) === reducedPath, 'R1 candidate receipt files must equal graph-bound pair');
assert(fs.existsSync(sourcePath) && fs.existsSync(reducedPath), 'R1 receipt pair incomplete');

const source = fs.readFileSync(sourcePath, 'utf8');
const reduced = JSON.parse(fs.readFileSync(reducedPath, 'utf8'));
assert(!/keystore password|private[ _-]?key|access[_ -]?token|refresh[_ -]?token|bearer\s|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(source), 'sanitized R1 source contains forbidden secret-like material');
assert(!source.includes('Keystore password (trusted-edge session only)'), 'interactive password prompt must not enter GitHub');

const run = spawnSync(process.execPath, [reducerPath, sourcePath], { encoding: 'utf8' });
assert(run.error == null, `R1 reducer failed to start: ${run.error?.message ?? ''}`);
assert(run.status === 0, `R1 reducer rejected physical receipt:\n${run.stdout}\n${run.stderr}`);
assert(run.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'R1 reducer PASS marker missing');
const jsonStart = run.stdout.indexOf('{');
assert(jsonStart >= 0, 'R1 reducer JSON output missing');
const observed = JSON.parse(run.stdout.slice(jsonStart));
for (const [key, value] of Object.entries(expectedStatic)) {
  assert(JSON.stringify(observed[key]) === JSON.stringify(value), `R1 reducer output ${key} mismatch`);
  assert(JSON.stringify(reduced[key]) === JSON.stringify(value), `R1 reduced receipt ${key} mismatch`);
}
for (const key of ['signedApkSha256','signedApkBytes']) assert(JSON.stringify(observed[key]) === JSON.stringify(reduced[key]), `${key} reducer/reduced mismatch`);
assert(reduced.signedApkSha256 === '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0', 'stable +2006 signed APK hash drifted');
assert(reduced.signedApkBytes === 182125094, 'stable +2006 signed APK byte size drifted');
assert(reduced.evidenceClass === 'SANITIZED_TRUSTED_EDGE_RECEIPT' && reduced.rawPrivateMaterialCommitted === false, 'R1 evidence-class boundary drifted');

assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true, 'R1 must remain PASS');
assert(r1.candidate === expectedStatic.candidate && r1.sourceCommit === expectedStatic.sourceCommit, 'R1 authority drifted');
assert(r1.signedApkSha256 === reduced.signedApkSha256 && r1.signedApkBytes === reduced.signedApkBytes, 'R1 signed APK identity drifted');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 cannot promote downstream readiness');

assert(r2.r1PhysicalReceipt === reducedPath, 'R2 must bind exact current R1 receipt');
assert(r2.candidate?.id === expectedStatic.candidate && r2.candidate?.sourceCommit === expectedStatic.sourceCommit, 'R2 current authority drifted');
assert(r2.candidate?.signedApkSha256 === reduced.signedApkSha256 && r2.candidate?.signedApkBytes === reduced.signedApkBytes, 'R2 signed candidate drifted');
assert(r2.receipt?.current === expectedR2Receipt, 'R2 cumulative receipt must be the OD2 receipt');
assert(r2.status === 'PHYSICAL_CAMPAIGN_IN_PROGRESS', 'R2 must remain in progress');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'IN_PROGRESS', 'R2 must preserve R1 PASS while progressing physically');
assert(r2.currentState?.nextGate === 'OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE', 'OD3 must be the next physical gate');
assert(r2.currentState?.currentBlocker === 'OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED', 'OD3 current blocker drifted');
const expectedStatuses = ['PASS','PASS','PASS','READY_FOR_PHYSICAL',...Array(8).fill('BLOCKED_BY_PRIOR_GATE')];
for (let i = 0; i < expectedStatuses.length; i += 1) {
  assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === expectedStatuses[i], `OD${i} R2 state drifted`);
}
assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from incremental R1/R2 evidence');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'incremental R1/R2 evidence cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
console.log('CURRENT_2006_RECEIPT=PASS');
console.log(`SIGNED_APK_SHA256=${reduced.signedApkSha256}`);
console.log(`SIGNED_APK_BYTES=${reduced.signedApkBytes}`);
console.log(`SIGNER_SHA1=${expectedStatic.signerSha1}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('R2_NEXT_GATE=OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE');
console.log('OD0_INSTALL_AND_LAUNCH=PASS');
console.log('OD1_EXACT_GMAIL_READONLY_OAUTH=PASS');
console.log('OD2_METADATA_FIRST_STATEMENT_DISCOVERY=PASS');
console.log('OD3_CURRENT_BLOCKER=ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
