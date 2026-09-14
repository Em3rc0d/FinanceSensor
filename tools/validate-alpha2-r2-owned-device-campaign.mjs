import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const schemaPath = 'graph/alpha2-r2-sanitized-receipt-schema.json';
const remainderPath = 'graph/prebuild-remainder-design.json';
const canonicalPath = 'graph/alpha2-canonical-candidate.json';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const physicalPath = 'graph/physical-closure-campaign.json';
const historicalR1Path = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const historicalOd3Path = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json';
const nativeScannerPath = 'spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt';
const pipelinePath = 'spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart';
const mainPath = 'spikes/mobile-shell/lib/main_alpha2.dart';
const requiredPaths = [campaignPath,schemaPath,remainderPath,canonicalPath,r1Path,physicalPath,historicalR1Path,historicalOd3Path,nativeScannerPath,pipelinePath,mainPath];
const failures = [];
const fail = message => failures.push(message);
for (const path of requiredPaths) if (!fs.existsSync(path)) fail(`missing ${path}`);

const expected = {
  candidate: '0.2.0-alpha.2+2008',
  sourceCommit: '45b605d29fe0b90f528e4f0f952ab878080b2f0b',
  canonicalInputApkSha256: 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238',
  canonicalInputApkBytes: 182515867,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  androidPackage: 'com.financesensor.lab.gmailconnection.r2',
  gmailScope: 'gmail.readonly',
};

if (!failures.length) {
  const campaign = readJson(campaignPath);
  const schema = readJson(schemaPath);
  const remainder = readJson(remainderPath);
  const canonical = readJson(canonicalPath);
  const r1 = readJson(r1Path);
  const physical = readJson(physicalPath);
  const historicalR1 = readJson(historicalR1Path);
  const historicalOd3 = readJson(historicalOd3Path);
  const nativeScanner = fs.readFileSync(nativeScannerPath, 'utf8');
  const pipeline = fs.readFileSync(pipelinePath, 'utf8');
  const main = fs.readFileSync(mainPath, 'utf8');

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V2') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0' || campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 campaign identity/binding mismatch');
  if (campaign.status !== 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING') fail('R2 must be blocked until +2008 trusted-edge signing');

  const candidate = campaign.candidate ?? {};
  for (const [key, value] of [
    ['id', expected.candidate], ['sourceCommit', expected.sourceCommit],
    ['canonicalInputApkSha256', expected.canonicalInputApkSha256], ['canonicalInputApkBytes', expected.canonicalInputApkBytes],
    ['signerSha1', expected.signerSha1], ['androidPackage', expected.androidPackage], ['gmailScope', expected.gmailScope]
  ]) if (candidate[key] !== value) fail(`candidate ${key} drifted`);
  if (candidate.signedApkSha256 !== null || candidate.signedApkBytes !== null) fail('current +2008 signed identity must be absent before R1');
  if (candidate.minSdk !== 31 || candidate.installabilityObservation !== 'NOT_EXECUTED_CURRENT_CANDIDATE' || candidate.stableSignedInstallability !== 'BLOCKED_BY_R1') fail('current +2008 installability state drifted');
  if (campaign.r1PhysicalReceipt !== null || campaign.receipt?.current !== null) fail('current +2008 R1/R2 receipts must remain absent');

  if (canonical.candidate !== expected.candidate || canonical.sourceCommit !== expected.sourceCommit || canonical.authority?.apkSha256 !== expected.canonicalInputApkSha256 || canonical.authority?.apkBytes !== expected.canonicalInputApkBytes) fail('canonical +2008 authority drifted');
  if (canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null || canonical.signing?.signedApkBytes !== null) fail('canonical +2008 signing must remain pending');
  if (canonical.boundaries?.physicalAlpha2Pass !== false || canonical.boundaries?.buildReady !== false || canonical.boundaries?.releaseReady !== false) fail('canonical physical/build/release boundary drifted');
  if (r1.candidate !== expected.candidate || r1.sourceCommit !== expected.sourceCommit || r1.status !== 'TRUSTED_EDGE_SIGNING_REQUIRED' || r1.trustedEdgeSigningPass !== false) fail('R1 +2008 must be reopened');

  const historical = campaign.historicalInvalidatedCampaign ?? {};
  if (historical.candidate !== '0.2.0-alpha.2+2007' || historical.signedApkSha256 !== '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab') fail('historical +2007 campaign identity missing');
  if (historical.lastSanitizedReceipt !== historicalOd3Path || historical.continuationAllowed !== false || historical.evidenceInheritanceAllowed !== false) fail('historical +2007 non-inheritance boundary drifted');
  if (JSON.stringify(historical.priorPassedGates) !== JSON.stringify(['OD0','OD1','OD2']) || historical.priorOpenGate !== 'OD3') fail('historical +2007 frontier drifted');
  if (historicalR1.candidate !== '0.2.0-alpha.2+2007' || historicalR1.signedApkSha256 !== historical.signedApkSha256 || historicalR1.sanitizationPass !== true) fail('historical +2007 R1 receipt drifted');
  if (historicalOd3.gateId !== 'OD3' || historicalOd3.gateStatus !== 'INCONCLUSIVE' || historicalOd3.interpretation?.od3PassProven !== false || historicalOd3.interpretation?.od4PassProven !== false) fail('historical +2007 OD3 observation drifted');

  const remainderR1 = remainder.nodes?.find(node => node.id === 'R1');
  const remainderR2 = remainder.nodes?.find(node => node.id === 'R2');
  if (remainderR1?.status !== 'DESIGN_FROZEN_EXECUTION_OPEN' || remainderR2?.status !== 'BLOCKED_BY_PRIOR_NODE') fail('prebuild remainder R1/R2 reopen state drifted');

  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
  if (subgates[0]?.status !== 'BLOCKED_BY_R1') fail('OD0 must be blocked by R1');
  for (let i = 1; i < 12; i += 1) if (subgates[i]?.status !== 'BLOCKED_BY_PRIOR_GATE') fail(`OD${i} must remain blocked by prior gate`);
  for (const gate of subgates) if (!Array.isArray(gate?.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate?.id} physical claims missing`);

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema authority drifted');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);

  for (const marker of [
    'private val handles = linkedMapOf<String, NativeHandle>()',
    'if (!candidate.profile.runtimeFetchEnabled)',
    '/attachments/',
    'ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT',
    'ALPHA2_STATEMENT_ATTACHMENT_IO_RETRY_EXHAUSTED',
    'ALPHA2_STATEMENT_ATTACHMENT_RESPONSE_INVALID',
    'ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH'
  ]) if (!nativeScanner.includes(marker)) fail(`native fetch boundary missing marker: ${marker}`);
  for (const marker of [
    'class Alpha2PipelineStageException',
    'ALPHA2_REFRESH_SCAN_FAILED',
    'ALPHA2_REFRESH_VAULT_READ_FAILED',
    'ALPHA2_REFRESH_PROJECTION_FAILED',
    'Future<void> _safeRelease(String handle)'
  ]) if (!pipeline.includes(marker)) fail(`pipeline safe-stop marker missing: ${marker}`);
  for (const marker of ['on Alpha2PipelineStageException catch (error)', 'Diagnóstico: $code']) if (!main.includes(marker)) fail(`safe diagnostic UI marker missing: ${marker}`);

  const laws = campaign.laws ?? {};
  for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must remain true`);
  for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must remain false`);

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'PENDING' || state.r2PhysicalCampaign !== 'BLOCKED_BY_R1') fail('current R1/R2 state drifted');
  if (state.nextGate !== 'R1_TRUSTED_EDGE_SIGNING' || state.currentBlocker !== 'CURRENT_CANDIDATE_REQUIRES_STABLE_TRUSTED_EDGE_SIGNING') fail('current next gate/blocker drifted');
  for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN' || state.buildReady !== false || state.releaseReady !== false) fail('current campaign cannot promote G-MK0/build/release');
  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2008_UNSIGNED_CANONICAL_INPUT');
console.log('R1_PHYSICAL_SIGNING=PENDING_USER_TRUSTED_EDGE');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('OD0_INSTALL_AND_LAUNCH=BLOCKED_BY_R1');
console.log('CURRENT_OD0_OD11_PASS=NONE');
console.log('ALPHA2_2007_R2_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('R2_NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
console.log('R2_CURRENT_BLOCKER=CURRENT_CANDIDATE_REQUIRES_STABLE_TRUSTED_EDGE_SIGNING');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
