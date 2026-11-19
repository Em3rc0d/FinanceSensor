import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const strict = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const regression = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ui = read('spikes/mobile-shell/lib/main_alpha2.dart');
const canonical = JSON.parse(read('graph/alpha2-canonical-candidate.json'));
const campaign = JSON.parse(read('graph/alpha2-r2-owned-device-campaign.json'));
const fail = message => { throw new Error(`ALPHA2_2011_CANDIDATE_CUT_FAILED:${message}`); };
const signed2009 = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';

for (const marker of [
  '--build-number 2011',
  "versionCode='2011'",
  'CANDIDATE_ID=0.2.0-alpha.2+2011',
  'financesensor-alpha2-2011-candidate-${{ github.run_id }}',
  'BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V2',
  'CERTIFIED_BCP_SUMMARY_ROWS_ARE_NOT_MOVEMENTS=YES',
  'UNKNOWN_UNDATED_MONETARY_ROW_FAILS_CLOSED=YES',
  'PROFILE_KEY_SESSION_REUSE=YES',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2010')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');

for (const marker of [
  "'A2_BCP_SAVINGS_COMPLETENESS_V2'",
  '_isCertifiedBcpSummaryRow',
  'SALDO ANTERIOR',
  'TOTAL MOVIMIENTO',
  'SALDO(?: FINAL)?',
  'STATEMENT_MONETARY_ROW_UNEXPLAINED',
  'final reconstructed = <Alpha2LayoutItem>[]',
]) if (!strict.includes(marker)) fail(`STRICT_MARKER_MISSING:${marker}`);

for (const marker of [
  'certified BCP balance and total rows are not ledger movements',
  "_item('SALDO ANTERIOR'",
  "_item('TOTAL MOVIMIENTO'",
  "_item('SALDO'",
  'unknown undated monetary row still fails closed',
  'strict audit reconstructs fragmented BCP debit and credit headers',
]) if (!regression.includes(marker)) fail(`REGRESSION_MISSING:${marker}`);

// Preserve +2010 connected-session profile-key behavior while changing only
// the BCP completeness semantics.
for (const marker of [
  'final Map<String, String> _profilePasswords',
  '_invalidateRejectedProfilePasswords(result)',
  '_profilePasswords.clear()',
  "item.reviewCodes.contains('STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED')",
]) if (!ui.includes(marker)) fail(`PROFILE_KEY_BEHAVIOR_REGRESSED:${marker}`);
if (ui.includes('SharedPreferences')) fail('PROFILE_KEY_PLAINTEXT_PERSISTENCE_FORBIDDEN');

// +2009 remains canonical until post-merge +2011 promotion. +2010 was an
// internal predecessor cut only and receives no signing/physical inheritance.
if (canonical.candidate !== '0.2.0-alpha.2+2009') fail('PREPROMOTION_CANONICAL_MUST_REMAIN_2009');
if (canonical.signing?.signedApkSha256 !== signed2009 || canonical.signing?.trustedEdgeSigningPass !== true) {
  fail('CANONICAL_2009_SIGNING_DRIFTED');
}
if (campaign.candidate?.id !== '0.2.0-alpha.2+2009' || campaign.candidate?.signedApkSha256 !== signed2009) {
  fail('R2_2009_AUTHORITY_DRIFTED');
}
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) {
  fail('PREMATURE_READY_PROMOTION');
}

console.log('ALPHA2_2011_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=MERGED_ALPHA2_2010_PARSER_PROFILE_KEY_REPAIR');
console.log('BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V2');
console.log('CERTIFIED_BCP_SUMMARY_ROWS_ARE_NOT_MOVEMENTS=YES');
console.log('UNKNOWN_UNDATED_MONETARY_ROW_FAILS_CLOSED=YES');
console.log('BCP_FRAGMENTED_HEADER_RECONSTRUCTION=RETAINED');
console.log('PROFILE_KEY_SESSION_REUSE=YES');
console.log('PROFILE_KEY_DISK_PERSISTENCE=NO');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2011');
console.log('PREDECESSOR_INTERNAL_CANDIDATE=0.2.0-alpha.2+2010');
console.log('PREDECESSOR_CANONICAL=0.2.0-alpha.2+2009');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
