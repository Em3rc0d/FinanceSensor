import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path,'utf8'));
const campaign = readJson('graph/alpha2-r2-owned-device-campaign.json');
const canonical = readJson('graph/alpha2-canonical-candidate.json');
const r1 = readJson('graph/alpha2-r1-signing-handoff.json');
const gate = readJson('graph/alpha2-human-intervention-gate.json');
const schema = readJson('graph/alpha2-r2-sanitized-receipt-schema.json');
const physical = readJson('graph/physical-closure-campaign.json');
const receipt = readJson('graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json');
const old2008 = readJson('graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-POSTPASSWORD-IMPORT-FAILURE-2008-2026-09-14.json');
const old2007 = readJson('graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json');
const nativeScanner = fs.readFileSync('spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt','utf8');
const pipeline = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart','utf8');
const main = fs.readFileSync('spikes/mobile-shell/lib/main_alpha2.dart','utf8');
const fail = message => { throw new Error(`ALPHA2_R2_V3_FAILED:${message}`); };
const assert = (cond,message) => { if (!cond) fail(message); };
const expected = {
  candidate:'0.2.0-alpha.2+2009', productSourceCommit:'9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f', sourceCommit:'e19bcccee13e326bbc08012533ddaeba026c633a',
  apkSha:'1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717', apkBytes:182514883,
  signedSha:'7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a', signedBytes:182538790,
  signerSha1:'63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
};

assert(campaign.schemaVersion === 'A2_R2_OWNED_DEVICE_CAMPAIGN_V3' && campaign.project === 'FinanceSensor' && campaign.mk === 'MK0', 'campaign identity drifted');
assert(campaign.status === 'READY_FOR_CONSOLIDATED_OWNED_DEVICE_UAT', 'R2 must be ready for consolidated UAT');
const c = campaign.candidate ?? {};
assert(c.id === expected.candidate && c.productSourceCommit === expected.productSourceCommit && c.sourceCommit === expected.sourceCommit, 'candidate source drifted');
assert(c.canonicalInputApkSha256 === expected.apkSha && c.canonicalInputApkBytes === expected.apkBytes, 'canonical APK drifted');
assert(c.signedApkSha256 === expected.signedSha && c.signedApkBytes === expected.signedBytes, 'signed identity drifted');
assert(c.expectedSignerSha1 === expected.signerSha1 && c.androidPackage === 'com.financesensor.lab.gmailconnection.r2' && c.gmailScope === 'gmail.readonly', 'signer/package/scope drifted');
assert(c.minSdk === 31 && c.installabilityObservation === 'NOT_YET_PHYSICALLY_OBSERVED' && c.stableSignedInstallability === 'READY_FOR_UAT', 'installability frontier drifted');
assert(campaign.r1PhysicalReceipt === 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json' && campaign.receipt?.current === null, 'receipt frontier drifted');

assert(canonical.candidate === expected.candidate && canonical.authority?.apkSha256 === expected.apkSha && canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.signedApkSha256 === expected.signedSha, 'canonical/R2 mismatch');
assert(r1.candidate === expected.candidate && r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true && r1.signedApkSha256 === expected.signedSha, 'R1/R2 chain mismatch');
assert(receipt.trustedEdgeSigningPass === true && receipt.signedApkSha256 === expected.signedSha && receipt.signerSha1 === expected.signerSha1, 'R1 sanitized receipt mismatch');
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.ownedDeviceUat?.humanUatEligible === true && gate.ownedDeviceUat?.stableSignedArtifactIdentityFrozen === true, 'human UAT gate must be open');

const historical = campaign.historicalInvalidatedCampaign ?? {};
assert(historical.candidate === '0.2.0-alpha.2+2008' && historical.signedApkSha256 === 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277', '+2008 historical identity missing');
assert(historical.continuationAllowed === false && historical.evidenceInheritanceAllowed === false && old2008.interpretation?.candidateBlocked === true, '+2008 evidence inheritance forbidden');
const older = (campaign.olderHistoricalCampaigns ?? []).find(x => x.candidate === '0.2.0-alpha.2+2007');
assert(older?.evidenceInheritanceAllowed === false && old2007.gateId === 'OD3', '+2007 history drifted');

const gates = campaign.subgates ?? [];
assert(gates.length === 12 && gates.every((g,i) => g.id === `OD${i}`), 'gate ordering must be OD0..OD11');
for (const g of gates) {
  assert(g.status === 'READY_IN_CONSOLIDATED_UAT', `${g.id} must be ready in consolidated UAT`);
  assert(Array.isArray(g.physicalClaims) && g.physicalClaims.length > 0, `${g.id} claims missing`);
}
assert(gates.find(g => g.id === 'OD9')?.physicalClaims?.includes('FINANCIAL_VIEW_MATERIALIZED'), 'money-visibility certification claim missing');
const laws = campaign.laws ?? {};
for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) assert(laws[key] === true, `law ${key} drifted`);
for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) assert(laws[key] === false, `law ${key} drifted`);

assert(schema.schemaVersion === 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' && schema.receiptClass === 'SANITIZED_SUMMARY_ONLY', 'receipt schema drifted');
for (const id of Array.from({length:12},(_,i)=>`OD${i}`)) assert(new Set(schema.requiredGateIds ?? []).has(id), `receipt schema missing ${id}`);
for (const marker of ['private val handles = linkedMapOf<String, NativeHandle>()','if (!candidate.profile.runtimeFetchEnabled)','/attachments/']) assert(nativeScanner.includes(marker), `native boundary marker missing ${marker}`);
for (const marker of ['STATEMENT_IMPORT_RUNTIME_REJECTED','Future<void> _safeRelease(String handle)','ALPHA2_REFRESH_PROJECTION_FAILED']) assert(pipeline.includes(marker), `pipeline marker missing ${marker}`);
for (const marker of ['on Alpha2PipelineStageException catch (error)','Diagnóstico: $code']) assert(main.includes(marker), `UI diagnostic marker missing ${marker}`);

const state = campaign.currentState ?? {};
assert(state.r1TrustedEdgeSigning === 'PASS' && state.r2PhysicalCampaign === 'READY_FOR_CONSOLIDATED_UAT', 'current R1/R2 state drifted');
assert(state.nextGate === 'CONSOLIDATED_OWNED_DEVICE_UAT' && state.currentBlocker === null, 'next gate drifted');
for (const q of ['q003','q004','q005']) assert(state[q] === 'ACTIVE', `${q} must remain ACTIVE`);
assert(state.gMk0 === 'OPEN' && state.buildReady === false && state.releaseReady === false, 'readiness boundary drifted');
assert(physical.status === 'ACTIVE', 'broad physical campaign must remain ACTIVE');

console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log(`STABLE_SIGNED_APK_SHA256=${expected.signedSha}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY_FOR_CONSOLIDATED_UAT');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('CURRENT_OD0_OD11_PASS=NONE');
console.log('FINANCIAL_VIEW_MATERIALIZATION=PHYSICAL_CERTIFICATION_REQUIRED');
console.log('ALPHA2_2008_R2_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('R2_NEXT_GATE=CONSOLIDATED_OWNED_DEVICE_UAT');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
