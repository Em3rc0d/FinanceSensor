import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = 'graph/physical-receipts';
const currentPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-';
const historical2007Prefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';
const currentJsonPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.json';
const currentTxtPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.txt';
const historicalJsonPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const historicalTxtPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.txt';
const historicalOd3Path = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json';
const signedHash = 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277';
const signedBytes = 182538790;
const signerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const requiredPath of [receiptDir, r1Path, r2Path, reducerPath, currentJsonPath, currentTxtPath, historicalJsonPath, historicalTxtPath, historicalOd3Path]) assert(fs.existsSync(requiredPath), `missing ${requiredPath}`);

const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));
const currentFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(currentPrefix)).sort();
assert(currentFiles.filter(name => name.endsWith('.txt')).length === 1, 'exactly one +2008 R1 source receipt is required');
assert(currentFiles.filter(name => name.endsWith('.json')).length === 1, 'exactly one +2008 R1 reduced receipt is required');
assert(path.join(receiptDir, currentFiles.find(name => name.endsWith('.txt'))) === currentTxtPath, 'unexpected +2008 source receipt path');
assert(path.join(receiptDir, currentFiles.find(name => name.endsWith('.json'))) === currentJsonPath, 'unexpected +2008 reduced receipt path');

const currentRun = spawnSync(process.execPath, [reducerPath, currentTxtPath], { encoding: 'utf8' });
assert(currentRun.error == null && currentRun.status === 0 && currentRun.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'current +2008 signing reducer failed');
assert(currentRun.stdout.includes(`"signedApkSha256": "${signedHash}"`) && currentRun.stdout.includes(`"signedApkBytes": ${signedBytes}`), 'current reducer output signed identity drifted');
const current = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
assert(current.candidate === '0.2.0-alpha.2+2008' && current.sourceCommit === '45b605d29fe0b90f528e4f0f952ab878080b2f0b', '+2008 receipt identity drifted');
assert(current.inputApkSha256 === 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238' && current.inputApkBytes === 182515867, '+2008 canonical input binding drifted');
assert(current.signedApkSha256 === signedHash && current.signedApkBytes === signedBytes, '+2008 signed APK identity drifted');
assert(current.signerSha1 === signerSha1 && current.androidPackage === 'com.financesensor.lab.gmailconnection.r2' && current.gmailScope === 'gmail.readonly', '+2008 signer/package/scope drifted');
assert(current.trustedEdgeSigningPass === true && current.r2OwnedDeviceCampaignUnblocked === true && current.sanitizationPass === true && current.rawPrivateMaterialCommitted === false, '+2008 receipt trust boundary drifted');
assert(current.physicalAlpha2Pass === false && current.buildReady === false && current.releaseReady === false, 'R1 receipt cannot promote downstream readiness');

const historicalFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(historical2007Prefix)).sort();
assert(historicalFiles.filter(name => name.endsWith('.txt')).length === 1 && historicalFiles.filter(name => name.endsWith('.json')).length === 1, 'historical +2007 R1 receipt pair missing');
const historicalRun = spawnSync(process.execPath, [reducerPath, historicalTxtPath], { encoding: 'utf8' });
assert(historicalRun.error == null && historicalRun.status === 0 && historicalRun.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'historical +2007 signing reducer regression failed');
const historical = JSON.parse(fs.readFileSync(historicalJsonPath, 'utf8'));
assert(historical.candidate === '0.2.0-alpha.2+2007' && historical.signedApkSha256 === '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab', '+2007 historical receipt drifted');
const oldOd3 = JSON.parse(fs.readFileSync(historicalOd3Path, 'utf8'));
assert(oldOd3.gateId === 'OD3' && oldOd3.gateStatus === 'INCONCLUSIVE' && oldOd3.interpretation?.od3PassProven === false, '+2007 OD3 historical observation drifted');

assert(r1.candidate === current.candidate && r1.sourceCommit === current.sourceCommit, 'R1/current receipt authority drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true, 'R1 +2008 signing PASS missing');
assert(r1.physicalReceipt?.path === currentJsonPath && r1.physicalReceipt?.sourcePath === currentTxtPath && r1.physicalReceipt?.receivedDate === '2026-09-14' && r1.physicalReceipt?.sanitizationPass === true, 'R1 physical receipt binding drifted');
assert(r1.signedApkSha256 === signedHash && r1.signedApkBytes === signedBytes, 'R1 stable-signed identity drifted');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 cannot promote downstream readiness');

assert(r2.candidate?.id === current.candidate && r2.candidate?.sourceCommit === current.sourceCommit, 'R2 +2008 authority drifted');
assert(r2.candidate?.signedApkSha256 === signedHash && r2.candidate?.signedApkBytes === signedBytes, 'R2 stable-signed identity drifted');
assert(r2.r1PhysicalReceipt === currentJsonPath, 'R2 must bind current R1 physical receipt');
assert(r2.status === 'IN_PROGRESS' && r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.r2PhysicalCampaign === 'IN_PROGRESS', 'R2 must start only after R1 PASS');
assert(r2.currentState?.nextGate === 'OD0' && r2.currentState?.currentBlocker === 'OWNED_ANDROID_OD0_INSTALL_AND_LAUNCH_REQUIRED', 'OD0 must be the current physical frontier');
assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'READY_FOR_PHYSICAL', 'OD0 must be ready for physical execution');
for (let i = 1; i <= 11; i += 1) assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === 'BLOCKED_BY_PRIOR_GATE', `OD${i} must remain blocked`);
assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from R1');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'R1 PASS cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
console.log('CURRENT_2008_RECEIPT=PASS_SANITIZED');
console.log(`SIGNED_APK_SHA256=${signedHash}`);
console.log(`SIGNED_APK_BYTES=${signedBytes}`);
console.log('HISTORICAL_2007_RECEIPT=PASS_NON_INHERITABLE');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('CURRENT_R2_FRONTIER=OD0');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
