import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const pipeline = read('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart');
const scanner = read('spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt');
const adapters = read('spikes/mobile-shell/lib/alpha2/alpha2_credit_statement_adapters.dart');
const tests = read('spikes/mobile-shell/test/alpha2_credit_statement_adapters_test.dart');
const sourceDoc = read('mk0/10-evidence/ALPHA2-CREDIT-MOBILE-PROFILE-AUTHORITY.md');
const authority = JSON.parse(read('graph/alpha2-credit-mobile-profile-authority.json'));
const canonical = JSON.parse(read('graph/alpha2-canonical-candidate.json'));
const campaign = JSON.parse(read('graph/alpha2-r2-owned-device-campaign.json'));
const fail = message => { throw new Error(`ALPHA2_2012_CANDIDATE_CUT_FAILED:${message}`); };
const signed2009 = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';
const frozen2011Zip = '0cb4119f5ff62ddd7bf3771383ae9f81b3b3c5d3d4a52fa4f9e90591c90c2121';
const frozen2011Apk = 'ea803fb00569b48b4cca17387aed81b93fd257fa3242bf5308d9fb9b1c71010a';
const frozen2012Source = 'b75cc39318ee749a1123971f19d895d71e35bd91';
const frozen2012Apk = '74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e';

for (const marker of [
  '--build-number 2012',
  "versionCode='2012'",
  'CANDIDATE_ID=0.2.0-alpha.2+2012',
  'financesensor-alpha2-2012-candidate-${{ github.run_id }}',
  'RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V1',
  'BCP_CREDIT_MODE=STRUCTURAL_PROBE_ONLY',
  'EXACT_FETCH_ENABLED_PROFILES=3',
  'PROFILE_KEY_SESSION_REUSE=YES',
  'PROFILE_KEY_DISK_PERSISTENCE=NO',
  'DNI_DERIVATION_OR_STORAGE=NO',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2011')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');

for (const marker of [
  'alpha2RuntimeStatementProfiles',
  'alpha2BcpSavingsProfileId',
  'alpha2RipleyCreditProfileId',
  'alpha2BcpCreditProfileId',
  'Alpha2StrictRipleyCreditAdapter',
  'Alpha2BcpCreditStructuralProbe',
  "terminalState: 'QUARANTINED'",
  'bytes.fillRange(0, bytes.length, 0)',
]) if (!pipeline.includes(marker)) fail(`PIPELINE_MARKER_MISSING:${marker}`);

if ((scanner.match(/runtimeFetchEnabled = true/g) ?? []).length !== 3) fail('EXACT_THREE_FETCH_ENABLED_PROFILES_REQUIRED');
for (const marker of [
  'BCP_CREDIT_PROFILE',
  'BCP_SAVINGS_PROFILE',
  'RIPLEY_CREDIT_PROFILE',
  '^eecc_visa\\\\.pdf$',
  'estado de cuenta banco ripley',
  'attachmentBytesFetched" to false',
]) if (!scanner.includes(marker)) fail(`SCANNER_MARKER_MISSING:${marker}`);
if (scanner.includes('GENERIC_STATEMENT_PROFILE')) fail('GENERIC_PROFILE_FORBIDDEN');

for (const marker of [
  "'A2_RIPLEY_CREDIT_STRICT_V1'",
  "'A2_BCP_CREDIT_STRUCTURAL_PROBE_V1'",
  'TUS MOVIMIENTOS DEL MES',
  'RIPLEY_CREDIT_MONETARY_ROW_UNEXPLAINED',
  'BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED',
  'BCP_CREDIT_STRUCTURAL_V1_',
  'evidence: const <Alpha2Evidence>[]',
]) if (!adapters.includes(marker)) fail(`ADAPTER_MARKER_MISSING:${marker}`);

for (const marker of [
  'Ripley strict adapter imports ledger totals and excludes summary/formulas',
  'Ripley unknown undated monetary row fails closed',
  'Ripley rate/installment numbers are not movement amount authority',
  'BCP credit probe emits only coarse whitelisted structural code',
  "isNot(contains('TIENDA PRIVADA'))",
  "isNot(contains('123.45'))",
]) if (!tests.includes(marker)) fail(`REGRESSION_MISSING:${marker}`);

if (!sourceDoc.includes('https://www.bancoripley.com.pe/pdf/como-leer-eecc.pdf')) fail('RIPLEY_PUBLIC_AUTHORITY_MISSING');
if (!sourceDoc.includes('No user PDF, extracted text, real amount, card identifier or merchant sample')) fail('PRIVATE_CORPUS_BOUNDARY_MISSING');
if (!sourceDoc.includes('cannot emit') && !sourceDoc.includes('**cannot emit**')) fail('BCP_PROBE_PRIVACY_DOC_MISSING');

if (authority.schemaVersion !== 'A2_CREDIT_MOBILE_PROFILE_AUTHORITY_V1') fail('AUTHORITY_SCHEMA');
if (authority.candidate !== '0.2.0-alpha.2+2012') fail('AUTHORITY_CANDIDATE');
if (authority.predecessor?.candidate !== '0.2.0-alpha.2+2011') fail('PREDECESSOR_ID');
if (authority.predecessor?.sourceCommit !== 'c7a795604404821f167d5eb9d9b41dd1bda811a9') fail('PREDECESSOR_SOURCE');
if (authority.predecessor?.integratedRunId !== 34977682793 || authority.predecessor?.artifactId !== 10400262449) fail('PREDECESSOR_RUN_ARTIFACT');
if (authority.predecessor?.artifactZipSha256 !== frozen2011Zip || authority.predecessor?.unsignedApkSha256 !== frozen2011Apk || authority.predecessor?.unsignedApkBytes !== 182521411) fail('PREDECESSOR_FROZEN_BYTES');
if (authority.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_INHERITANCE_FORBIDDEN');
if (authority.interbankSavings?.runtimeFetchEnabled !== false || authority.interbankSavings?.mobileGmailIdentityAllowlist !== 'OPEN') fail('INTERBANK_PREMATURE_RUNTIME_ENABLEMENT');
if (authority.privacy?.passwordPersisted !== false || authority.privacy?.dniDerivedOrStored !== false || authority.privacy?.crossInstitutionPasswordReuse !== false || authority.privacy?.genericParserFallback !== false) fail('PRIVACY_LAW_DRIFT');
if (authority.claims?.physicalProfilePass !== false || authority.claims?.physicalAlpha2Pass !== false || authority.claims?.buildReady !== false || authority.claims?.releaseReady !== false) fail('PREMATURE_PROMOTION');

// The +2012 APK was compiled while canonical promotion was still pending.
// After its successful post-merge freeze, current governance must bind that
// exact APK as canonical but remain pre-signing. No +2009/+2011 physical or
// stable-signing claim may be inherited.
if (canonical.candidate !== '0.2.0-alpha.2+2012') fail('POSTPROMOTION_CANONICAL_MUST_BE_2012');
if (canonical.sourceCommit !== frozen2012Source) fail('CANONICAL_2012_SOURCE_DRIFTED');
if (canonical.authority?.apkSha256 !== frozen2012Apk || canonical.authority?.apkBytes !== 182538547) fail('CANONICAL_2012_APK_DRIFTED');
if (canonical.signing?.status !== 'TRUSTED_EDGE_SIGNING_REQUIRED' || canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null || canonical.signing?.signedApkBytes !== null) fail('CANONICAL_2012_PRE_SIGNING_STATE_DRIFTED');
if (canonical.physicalInstallabilityObservation?.inheritanceFromPriorCandidateAllowed !== false) fail('CANONICAL_2012_PHYSICAL_INHERITANCE_FORBIDDEN');
if (canonical.boundaries?.physicalAlpha2Pass !== false || canonical.boundaries?.buildReady !== false || canonical.boundaries?.releaseReady !== false) fail('CANONICAL_2012_PREMATURE_READY_PROMOTION');

if (campaign.candidate?.id !== '0.2.0-alpha.2+2012' || campaign.candidate?.canonicalInputApkSha256 !== frozen2012Apk || campaign.candidate?.signedApkSha256 !== null) fail('R2_2012_AUTHORITY_DRIFTED');
if (campaign.status !== 'BLOCKED_BY_R1_SIGNING' || campaign.currentState?.nextGate !== 'R1_TRUSTED_EDGE_SIGNING' || campaign.currentState?.currentBlocker !== 'TRUSTED_EDGE_SIGNING_2012_REQUIRED') fail('R2_2012_PRE_SIGNING_FRONTIER_DRIFTED');
if (campaign.historicalInvalidatedCampaign?.candidate !== '0.2.0-alpha.2+2009' || campaign.historicalInvalidatedCampaign?.signedApkSha256 !== signed2009 || campaign.historicalInvalidatedCampaign?.evidenceInheritanceAllowed !== false || campaign.historicalInvalidatedCampaign?.continuationAllowed !== false) fail('R2_2009_HISTORY_DRIFTED');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('R2_PREMATURE_READY_PROMOTION');

console.log('ALPHA2_2012_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=FROZEN_ALPHA2_2011_BCP_SAVINGS_REPAIR');
console.log(`PREDECESSOR_2011_ZIP_SHA256=${frozen2011Zip}`);
console.log(`PREDECESSOR_2011_APK_SHA256=${frozen2011Apk}`);
console.log('BCP_SAVINGS_STRICT_IMPORT=RETAINED');
console.log('RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V1');
console.log('BCP_CREDIT_MODE=STRUCTURAL_PROBE_ONLY');
console.log('BCP_CREDIT_FINANCIAL_EVIDENCE_EMISSION=NO');
console.log('EXACT_FETCH_ENABLED_PROFILES=3');
console.log('INTERBANK_GMAIL_IDENTITY=OPEN_NOT_INVENTED');
console.log('PROFILE_KEY_SESSION_REUSE=YES');
console.log('PROFILE_KEY_DISK_PERSISTENCE=NO');
console.log('DNI_DERIVATION_OR_STORAGE=NO');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2012');
console.log('PREDECESSOR_CANONICAL=0.2.0-alpha.2+2009');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('BUILD_TIME_CANONICAL_PROMOTION_PENDING=YES');
console.log('CANONICAL_PROMOTION=FROZEN_PRE_SIGNING');
console.log(`CANONICAL_2012_APK_SHA256=${frozen2012Apk}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1_SIGNING');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
