import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = 'graph/physical-receipts';
const currentPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-';
const historicalPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';
const currentJsonPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const currentTxtPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.txt';
const historicalJsonPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json';
const historicalTxtPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.txt';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const requiredPath of [receiptDir, r1Path, r2Path, reducerPath, currentJsonPath, currentTxtPath, historicalJsonPath, historicalTxtPath]) assert(fs.existsSync(requiredPath), `missing ${requiredPath}`);

const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));
const currentFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(currentPrefix)).sort();
assert(currentFiles.filter(name => name.endsWith('.txt')).length === 1, 'exactly one +2007 R1 sanitized source receipt is allowed');
assert(currentFiles.filter(name => name.endsWith('.json')).length === 1, 'exactly one +2007 R1 reduced receipt is allowed');
assert(path.join(receiptDir, currentFiles.find(name => name.endsWith('.txt'))) === currentTxtPath, 'unexpected +2007 R1 source receipt path');
assert(path.join(receiptDir, currentFiles.find(name => name.endsWith('.json'))) === currentJsonPath, 'unexpected +2007 R1 reduced receipt path');

const expected = {
  schemaVersion: 'A2_R1_PHYSICAL_SIGNING_RECEIPT_V1',
  candidate: '0.2.0-alpha.2+2007',
  sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
  canonicalRunId: 34439978152,
  canonicalArtifactId: 10137701427,
  inputApkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197',
  inputApkBytes: 182121475,
  signedApkSha256: '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab',
  signedApkBytes: 182145574,
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

const source = fs.readFileSync(currentTxtPath, 'utf8');
const reduced = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
assert(!/keystore password|private[ _-]?key|access[_ -]?token|refresh[_ -]?token|bearer\s|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(source), 'sanitized +2007 R1 source contains forbidden secret-like material');
assert(!source.includes('Keystore password (trusted-edge session only)'), 'interactive password prompt must not enter GitHub');
assert(!source.includes('Presione una tecla'), 'interactive console text must not enter sanitized receipt');

const run = spawnSync(process.execPath, [reducerPath, currentTxtPath], { encoding: 'utf8' });
assert(run.error == null, `R1 reducer failed to start: ${run.error?.message ?? ''}`);
assert(run.status === 0, `R1 reducer rejected +2007 physical receipt:\n${run.stdout}\n${run.stderr}`);
assert(run.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'R1 reducer PASS marker missing');
const jsonStart = run.stdout.indexOf('{');
assert(jsonStart >= 0, 'R1 reducer JSON output missing');
const observed = JSON.parse(run.stdout.slice(jsonStart));
for (const [key, value] of Object.entries(expected)) {
  assert(JSON.stringify(observed[key]) === JSON.stringify(value), `R1 reducer output ${key} mismatch`);
  assert(JSON.stringify(reduced[key]) === JSON.stringify(value), `R1 reduced receipt ${key} mismatch`);
}
assert(reduced.evidenceClass === 'SANITIZED_TRUSTED_EDGE_RECEIPT' && reduced.receivedDate === '2026-09-12' && reduced.rawPrivateMaterialCommitted === false, 'current R1 evidence-class/sanitization boundary drifted');

const historicalRun = spawnSync(process.execPath, [reducerPath, historicalTxtPath], { encoding: 'utf8' });
assert(historicalRun.error == null && historicalRun.status === 0 && historicalRun.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'historical +2006 signing reducer regression failed');
const historical = JSON.parse(fs.readFileSync(historicalJsonPath, 'utf8'));
assert(historical.candidate === '0.2.0-alpha.2+2006' && historical.signedApkSha256 === '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0', '+2006 historical signing identity drifted');
assert(fs.readdirSync(receiptDir).some(name => name.startsWith(historicalPrefix)), '+2006 historical receipt unexpectedly missing');

assert(r1.physicalReceipt?.path === currentJsonPath && r1.physicalReceipt?.sourcePath === currentTxtPath && r1.physicalReceipt?.sanitizationPass === true, 'R1 current physical receipt binding drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true, 'R1 must be PASS');
assert(r1.candidate === expected.candidate && r1.sourceCommit === expected.sourceCommit, 'R1 authority drifted');
assert(r1.signedApkSha256 === expected.signedApkSha256 && r1.signedApkBytes === expected.signedApkBytes, 'R1 signed APK identity drifted');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 cannot promote downstream readiness');

assert(r2.r1PhysicalReceipt === currentJsonPath, 'R2 must bind exact current +2007 R1 receipt');
assert(r2.candidate?.id === expected.candidate && r2.candidate?.sourceCommit === expected.sourceCommit, 'R2 current authority drifted');
assert(r2.candidate?.signedApkSha256 === expected.signedApkSha256 && r2.candidate?.signedApkBytes === expected.signedApkBytes, 'R2 signed candidate drifted');
assert(r2.receipt?.current === null, 'R2 may not have an OD receipt before OD0');
assert(r2.status === 'READY_FOR_PHYSICAL', 'R2 must be ready for physical OD0');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'READY', 'R2 must preserve R1 PASS and expose physical readiness');
assert(r2.currentState?.nextGate === 'OD0_SIGNED_APK_INSTALL_AND_LAUNCH', 'OD0 must be next physical gate');
assert(r2.currentState?.currentBlocker === 'OD0_INSTALL_AND_LAUNCH_NOT_YET_OBSERVED', 'OD0 blocker drifted');
const expectedStatuses = ['READY_FOR_PHYSICAL', ...Array(11).fill('BLOCKED_BY_PRIOR_GATE')];
for (let i = 0; i < expectedStatuses.length; i += 1) assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === expectedStatuses[i], `OD${i} R2 state drifted`);
assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from R1 evidence');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'R1 evidence cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
console.log('CURRENT_2007_RECEIPT=PASS');
console.log(`SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log(`SIGNED_APK_BYTES=${expected.signedApkBytes}`);
console.log(`SIGNER_SHA1=${expected.signerSha1}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('ALPHA2_2006_PHYSICAL_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
