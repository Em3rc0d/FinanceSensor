import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2005-2026-09-08.txt';
const reducedPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2005-2026-09-08.json';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const path of [sourcePath, reducedPath, r1Path, r2Path, reducerPath]) assert(fs.existsSync(path), `missing ${path}`);

const source = fs.readFileSync(sourcePath, 'utf8');
const reduced = JSON.parse(fs.readFileSync(reducedPath, 'utf8'));
const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));

assert(!/keystore password|private[ _-]?key|access[_ -]?token|refresh[_ -]?token|bearer\s|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(source), 'sanitized source contains forbidden secret-like material');
assert(!source.includes('Keystore password (trusted-edge session only)'), 'interactive password prompt must not enter GitHub');

const run = spawnSync(process.execPath, [reducerPath, sourcePath], { encoding: 'utf8' });
assert(run.error == null, `receipt reducer failed to start: ${run.error?.message ?? ''}`);
assert(run.status === 0, `receipt reducer rejected physical receipt:\n${run.stdout}\n${run.stderr}`);
assert(run.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'receipt reducer PASS marker missing');
const jsonStart = run.stdout.indexOf('{');
assert(jsonStart >= 0, 'reducer JSON output missing');
const observed = JSON.parse(run.stdout.slice(jsonStart));

const expectedStatic = {
  schemaVersion: 'A2_R1_PHYSICAL_SIGNING_RECEIPT_V1',
  candidate: '0.2.0-alpha.2+2005',
  sourceCommit: 'd99e7e4765adfc96bed9d914b2b6f296f9712242',
  canonicalRunId: 34257413733,
  canonicalArtifactId: 10068684066,
  inputApkSha256: 'dacc7d7281842989904adfc1d3e7b17242b39b20674eb8e7c33e1e339428a44c',
  inputApkBytes: 182092699,
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
for (const [key, value] of Object.entries(expectedStatic)) {
  assert(JSON.stringify(observed[key]) === JSON.stringify(value), `reducer output ${key} mismatch`);
  assert(JSON.stringify(reduced[key]) === JSON.stringify(value), `reduced receipt ${key} mismatch`);
}
for (const key of ['signedApkSha256','signedApkBytes']) assert(JSON.stringify(observed[key]) === JSON.stringify(reduced[key]), `${key} reducer/reduced mismatch`);
assert(/^[0-9a-f]{64}$/.test(reduced.signedApkSha256) && reduced.signedApkSha256 !== expectedStatic.inputApkSha256, 'stable signed APK hash invalid');
assert(Number.isInteger(reduced.signedApkBytes) && reduced.signedApkBytes > 0, 'stable signed APK byte size invalid');
assert(reduced.evidenceClass === 'SANITIZED_TRUSTED_EDGE_RECEIPT', 'receipt evidence class drifted');
assert(reduced.rawPrivateMaterialCommitted === false, 'raw private material boundary drifted');

assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true, 'R1 must be closed by current +2005 receipt');
assert(r1.signedApkSha256 === reduced.signedApkSha256 && r1.signedApkBytes === reduced.signedApkBytes, 'R1 signed APK identity drifted');
assert(r1.physicalReceipt?.path === reducedPath, 'R1 current receipt binding drifted');
assert(r1.physicalReceipt?.sanitizationPass === true && r1.physicalReceipt?.rawPrivateMaterialCommitted === false, 'R1 receipt sanitization boundary drifted');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 receipt may not promote downstream readiness');

assert(r2.status === 'READY_FOR_PHYSICAL_CAMPAIGN', 'R2 must be ready only after current +2005 R1 PASS');
assert(r2.r1PhysicalReceipt === reducedPath, 'R2 must bind exact current +2005 R1 receipt');
assert(r2.candidate?.signedApkSha256 === reduced.signedApkSha256 && r2.candidate?.signedApkBytes === reduced.signedApkBytes, 'R2 signed candidate drifted');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'READY', 'R2 state must reflect current R1 PASS');
assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'READY_FOR_PHYSICAL', 'OD0 must be the only ready physical gate');
for (const gate of r2.subgates?.slice(1) ?? []) assert(gate.status === 'BLOCKED_BY_PRIOR_GATE', `${gate.id} must remain blocked`);
assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from R1 receipt');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'R1 receipt cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT=PASS');
console.log(`SIGNED_APK_SHA256=${reduced.signedApkSha256}`);
console.log(`SIGNED_APK_BYTES=${reduced.signedApkBytes}`);
console.log(`SIGNER_SHA1=${expectedStatic.signerSha1}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
