import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = 'graph/physical-receipts';
const currentPrefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-';
const historical2007Prefix = 'ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const r2Path = 'graph/alpha2-r2-owned-device-campaign.json';
const reducerPath = 'tools/reduce-alpha2-r1-signing-receipt.mjs';
const historicalJsonPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const historicalTxtPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.txt';
const historicalOd3Path = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json';

function assert(cond, message) { if (!cond) throw new Error(message); }
for (const requiredPath of [receiptDir, r1Path, r2Path, reducerPath, historicalJsonPath, historicalTxtPath, historicalOd3Path]) {
  assert(fs.existsSync(requiredPath), `missing ${requiredPath}`);
}

const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const r2 = JSON.parse(fs.readFileSync(r2Path, 'utf8'));
const currentFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(currentPrefix)).sort();
assert(currentFiles.length === 0, 'no +2008 physical signing receipt may exist before trusted-edge user signing');
const historicalFiles = fs.readdirSync(receiptDir).filter(name => name.startsWith(historical2007Prefix)).sort();
assert(historicalFiles.filter(name => name.endsWith('.txt')).length === 1, 'exactly one +2007 historical R1 source receipt is required');
assert(historicalFiles.filter(name => name.endsWith('.json')).length === 1, 'exactly one +2007 historical R1 reduced receipt is required');
assert(path.join(receiptDir, historicalFiles.find(name => name.endsWith('.txt'))) === historicalTxtPath, 'unexpected +2007 source receipt path');
assert(path.join(receiptDir, historicalFiles.find(name => name.endsWith('.json'))) === historicalJsonPath, 'unexpected +2007 reduced receipt path');

const historicalRun = spawnSync(process.execPath, [reducerPath, historicalTxtPath], { encoding: 'utf8' });
assert(historicalRun.error == null && historicalRun.status === 0 && historicalRun.stdout.includes('ALPHA2_R1_SIGNING_RECEIPT_REDUCER=PASS'), 'historical +2007 signing reducer regression failed');
const historical = JSON.parse(fs.readFileSync(historicalJsonPath, 'utf8'));
assert(historical.candidate === '0.2.0-alpha.2+2007', '+2007 historical candidate drifted');
assert(historical.sourceCommit === '8a4aa307b9b3328e67232c919a94994e80446331', '+2007 historical source drifted');
assert(historical.signedApkSha256 === '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab' && historical.signedApkBytes === 182145574, '+2007 historical signed APK identity drifted');
assert(historical.signerSha1 === '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0' && historical.sanitizationPass === true && historical.rawPrivateMaterialCommitted === false, '+2007 historical trust/sanitization boundary drifted');

const oldOd3 = JSON.parse(fs.readFileSync(historicalOd3Path, 'utf8'));
assert(oldOd3.gateId === 'OD3' && oldOd3.gateStatus === 'INCONCLUSIVE', '+2007 OD3 historical observation drifted');
assert(oldOd3.interpretation?.od3PassProven === false && oldOd3.interpretation?.od4PassProven === false, '+2007 OD3 observation must remain inconclusive');

assert(r1.candidate === '0.2.0-alpha.2+2008' && r1.sourceCommit === '45b605d29fe0b90f528e4f0f952ab878080b2f0b', 'R1 current +2008 authority drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && r1.trustedEdgeSigningPass === false, 'R1 +2008 must remain pending');
assert(r1.physicalReceipt?.path === null && r1.physicalReceipt?.sourcePath === null, 'R1 must not bind a +2008 receipt before user signing');
assert(r1.signedApkSha256 === null && r1.signedApkBytes === null, 'R1 must not bind a +2008 stable-signed APK before user signing');
assert(r1.physicalAlpha2Pass === false && r1.buildReady === false && r1.releaseReady === false, 'R1 cannot promote downstream readiness');

assert(r2.candidate?.id === '0.2.0-alpha.2+2008' && r2.candidate?.sourceCommit === '45b605d29fe0b90f528e4f0f952ab878080b2f0b', 'R2 +2008 authority drifted');
assert(r2.r1PhysicalReceipt === null && r2.receipt?.current === null, 'R2 must have no current physical receipt before +2008 signing');
assert(r2.status === 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING', 'R2 must be blocked by R1');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PENDING' && r2.currentState?.r2PhysicalCampaign === 'BLOCKED_BY_R1', 'R1/R2 pending state drifted');
assert(r2.currentState?.nextGate === 'R1_TRUSTED_EDGE_SIGNING', 'R1 signing must be next execution gate');
assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'BLOCKED_BY_R1', 'OD0 must be blocked by R1');
for (let i = 1; i <= 11; i += 1) assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === 'BLOCKED_BY_PRIOR_GATE', `OD${i} must remain blocked`);
assert(r2.currentState?.q003 === 'ACTIVE' && r2.currentState?.q004 === 'ACTIVE' && r2.currentState?.q005 === 'ACTIVE', 'Q003/Q004/Q005 cannot close from historical evidence');
assert(r2.currentState?.gMk0 === 'OPEN' && r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'current evidence cannot promote G-MK0/build/release');

console.log('ALPHA2_R1_PHYSICAL_SIGNING_RECEIPT_BOUNDARY=PASS');
console.log('CURRENT_2008_RECEIPT=ABSENT_EXPECTED');
console.log('HISTORICAL_2007_RECEIPT=PASS_NON_INHERITABLE');
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('CURRENT_R2_FRONTIER=R1_TRUSTED_EDGE_SIGNING');
console.log('OD0_OD11=NO_CURRENT_PASS');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
