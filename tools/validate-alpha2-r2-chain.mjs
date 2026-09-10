import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const historicalR2 = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';

if (canonical.candidate !== '0.2.0-alpha.2+2007' || canonical.sourceCommit !== '8a4aa307b9b3328e67232c919a94994e80446331') throw new Error('canonical +2007 authority drifted');
if (r1.candidate !== canonical.candidate || r1.sourceCommit !== canonical.sourceCommit || r1.inputApk?.sha256 !== canonical.authority?.apkSha256) throw new Error('canonical/R1 +2007 authority chain drifted');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2007 authority chain drifted');
if (r1.status !== 'READY_FOR_TRUSTED_EDGE_SIGNING' || r1.trustedEdgeSigningPass !== false || r1.physicalReceipt !== null) throw new Error('R1 must remain open before +2007 trusted-edge signing');
if (r1.signedApkSha256 !== null || r1.signedApkBytes !== null || r2.candidate?.signedApkSha256 !== null || r2.candidate?.signedApkBytes !== null) throw new Error('stable +2007 APK identity cannot exist before R1 receipt');
if (r2.r1PhysicalReceipt !== null || r2.receipt?.current !== null) throw new Error('current +2007 R2 cannot inherit physical receipts');

if (r2.status !== 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING' || r2.currentState?.r2PhysicalCampaign !== 'BLOCKED_BY_R1') throw new Error('R2 must remain blocked by R1');
const expectedStatuses = ['BLOCKED_BY_R1', ...Array(11).fill('BLOCKED_BY_PRIOR_GATE')];
for (let i = 0; i < expectedStatuses.length; i += 1) {
  const gate = r2.subgates?.[i];
  if (gate?.id !== `OD${i}` || gate?.status !== expectedStatuses[i]) throw new Error(`OD${i} current chain state drifted`);
}
if (r2.currentState?.nextGate !== 'R1_TRUSTED_EDGE_SIGNING' || r2.currentState?.currentBlocker !== 'CURRENT_2007_STABLE_SIGNED_APK_NOT_YET_CERTIFIED') throw new Error('current next gate/blocker drifted');

const historical = r2.historicalInvalidatedCampaign ?? {};
if (historical.candidate !== '0.2.0-alpha.2+2006' || historical.lastSanitizedReceipt !== historicalR2 || historical.evidenceInheritanceAllowed !== false || historical.continuationAllowed !== false) throw new Error('+2006 campaign must remain historical and non-inheritable');
if (!fs.existsSync(historicalR2)) throw new Error('historical +2006 R2 receipt missing');

if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');
if (r2.currentState?.q003 !== 'ACTIVE' || r2.currentState?.q004 !== 'ACTIVE' || r2.currentState?.q005 !== 'ACTIVE') throw new Error('R1/R2 evidence cannot close Q003/Q004/Q005');
if (r2.currentState?.gMk0 !== 'OPEN') throw new Error('G-MK0 must remain OPEN');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2007_POSTMERGE');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('CURRENT_OD0_OD11_PASS=NONE');
console.log('ALPHA2_2006_R2_RECEIPT=HISTORICAL_ONLY');
console.log('NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
console.log('CURRENT_BLOCKER=CURRENT_2007_STABLE_SIGNED_APK_NOT_YET_CERTIFIED');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
