import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-od3-mobile-fetch-remediation.mjs';
import './validate-alpha2-human-intervention-gate.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const strictAdapter = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const strictRegression = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ui = read('spikes/mobile-shell/lib/main_alpha2.dart');
const passwordDialogRegression = read('spikes/mobile-shell/test/alpha2_statement_password_dialog_test.dart');
const canonical = JSON.parse(read('graph/alpha2-canonical-candidate.json'));
const campaign = JSON.parse(read('graph/alpha2-r2-owned-device-campaign.json'));
const fail = message => { throw new Error(`ALPHA2_2010_CANDIDATE_CUT_FAILED:${message}`); };

const canonical2009Unsigned = '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717';
const canonical2009Signed = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';
const stableSigner = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0';

for (const marker of [
  '--build-number 2010',
  "versionCode='2010'",
  'CANDIDATE_ID=0.2.0-alpha.2+2010',
  'financesensor-alpha2-2010-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'PROFILE_KEY_SESSION_REUSE=YES',
  'BCP_FRAGMENTED_HEADER_RECONSTRUCTION=YES',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2009')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
if (workflow.includes("grep -q \"versionCode='2009'\"")) fail('OLD_VERSION_CODE_ASSERTION_STILL_ACTIVE');

for (const marker of [
  'final reconstructed = <Alpha2LayoutItem>[]',
  'for (final line in _strictLines(page))',
  'start + 4',
  'text: joined',
  'width: math.max(0, right - left)',
]) if (!strictAdapter.includes(marker)) fail(`FRAGMENTED_HEADER_RECONSTRUCTION_MISSING:${marker}`);

for (const marker of [
  'strict audit reconstructs fragmented BCP debit and credit headers',
  "_item('CARGOS /'",
  "_item('DEBE'",
  "_item('ABONOS /'",
  "_item('HABER'",
  'expect(result.importable, isTrue)',
  'alpha2CompletenessGeometryUnknownCode',
]) if (!strictRegression.includes(marker)) fail(`FRAGMENTED_HEADER_REGRESSION_MISSING:${marker}`);

for (const marker of [
  'final Map<String, String> _profilePasswords',
  'final cached = _profilePasswords[candidate.profileId]',
  '_profilePasswords[candidate.profileId] = password',
  '_profilePasswords.clear()',
  '_invalidateRejectedProfilePasswords(result)',
  "item.reviewCodes.contains('STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED')",
  'mientras Gmail siga conectado',
  'no se guarda en disco ni se sincroniza',
]) if (!ui.includes(marker)) fail(`PROFILE_KEY_SESSION_BOUNDARY_MISSING:${marker}`);
if (ui.includes('SharedPreferences')) fail('PROFILE_KEY_MUST_NOT_USE_PLAINTEXT_SHARED_PREFERENCES');

for (const marker of [
  'Clave del perfil BCP',
  'Usar para este perfil',
  'mientras Gmail siga conectado',
  'no se guarda en disco',
]) if (!passwordDialogRegression.includes(marker)) fail(`PROFILE_KEY_UI_REGRESSION_MISSING:${marker}`);

// +2010 is a new product identity. +2009 remains the immutable canonical and
// stable-signed diagnostic predecessor until +2010 itself is frozen and signed.
if (canonical.candidate !== '0.2.0-alpha.2+2009') fail('PREPROMOTION_CANONICAL_MUST_REMAIN_2009');
if (canonical.productSourceCommit !== '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f') fail('CANONICAL_2009_PRODUCT_SOURCE_DRIFTED');
if (canonical.sourceCommit !== 'e19bcccee13e326bbc08012533ddaeba026c633a') fail('CANONICAL_2009_SOURCE_DRIFTED');
if (canonical.authority?.apkSha256 !== canonical2009Unsigned || canonical.authority?.apkBytes !== 182514883) fail('CANONICAL_2009_UNSIGNED_IDENTITY_DRIFTED');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== canonical2009Signed || canonical.signing?.signedApkBytes !== 182538790) fail('CANONICAL_2009_SIGNED_IDENTITY_DRIFTED');
if (canonical.signing?.expectedSignerSha1 !== stableSigner) fail('CANONICAL_2009_SIGNER_DRIFTED');
if (canonical.boundaries?.buildReady !== false || canonical.boundaries?.releaseReady !== false) fail('CANONICAL_2009_PREMATURE_READY_PROMOTION');

if (campaign.candidate?.id !== '0.2.0-alpha.2+2009' || campaign.candidate?.signedApkSha256 !== canonical2009Signed) fail('R2_2009_AUTHORITY_DRIFTED');
if (campaign.currentState?.r1TrustedEdgeSigning !== 'PASS') fail('R2_2009_R1_MUST_REMAIN_PASS');
if (campaign.currentState?.r2PhysicalCampaign !== 'READY_FOR_CONSOLIDATED_UAT') fail('R2_2009_STATE_DRIFTED');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('R2_2009_PREMATURE_READY_PROMOTION');
if (campaign.laws?.anyCandidateIdentityChangeInvalidatesCampaign !== true) fail('CANDIDATE_CHANGE_MUST_INVALIDATE_PHYSICAL_CAMPAIGN');
if (campaign.laws?.physicalPassCannotBeDerivedFromPublicCi !== true) fail('PUBLIC_CI_MUST_NOT_DERIVE_PHYSICAL_PASS');

console.log('ALPHA2_2010_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=ALPHA2_2009_PHYSICAL_PARSER_FRONTIER');
console.log('BCP_FRAGMENTED_HEADER_RECONSTRUCTION=GATED');
console.log('PROFILE_KEY_SCOPE=CONNECTED_SESSION_PER_PROFILE');
console.log('PROFILE_KEY_DISK_PERSISTENCE=NO');
console.log('PROFILE_KEY_SESSION_REUSE=GATED');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2010');
console.log('PREDECESSOR_CANONICAL=0.2.0-alpha.2+2009');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
