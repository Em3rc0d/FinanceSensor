import fs from 'node:fs';

const paths = {
  buildReceipt: 'graph/alpha2-human-test-build.json',
  signerGraph: 'graph/alpha2-r2-trusted-edge-signing.json',
  handoff: 'mk0/12-release/R2-TRUSTED-EDGE-SIGNING-HANDOFF.md',
  candidate: 'mk0/12-release/HUMAN-TEST-CANDIDATE.md',
  physicalEvidence: 'mk0/10-evidence/EV-R2-PHYSICAL-RECEIPT-2026-09-06.md',
  repairEvidence: 'mk0/10-evidence/EV-R2-SIGNER-STDIN-FIX-2026-09-06.md',
  ps1: 'tools/SIGN-FINANCESENSOR-R2.ps1',
  cmd: 'tools/SIGN-FINANCESENSOR-R2.cmd',
};

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
for (const path of Object.values(paths)) assert(fs.existsSync(path), `missing ${path}`);

if (!failures.length) {
  const build = JSON.parse(fs.readFileSync(paths.buildReceipt, 'utf8'));
  const graph = JSON.parse(fs.readFileSync(paths.signerGraph, 'utf8'));
  const handoff = fs.readFileSync(paths.handoff, 'utf8');
  const candidate = fs.readFileSync(paths.candidate, 'utf8');
  const physical = fs.readFileSync(paths.physicalEvidence, 'utf8');
  const repair = fs.readFileSync(paths.repairEvidence, 'utf8');
  const ps1 = fs.readFileSync(paths.ps1, 'utf8');
  const cmd = fs.readFileSync(paths.cmd, 'utf8');

  const expectedInput = 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d';
  const expectedSigned = '4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b';
  const expectedSigner = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0';
  const expectedSource = '9d990fc579429cc0bc8e5c02306d8ebe4622e145';

  assert(build.status === 'CI_BUILD_PASS_TRUSTED_EDGE_SIGNING_REQUIRED', 'build receipt status');
  assert(build.source?.commit === expectedSource, 'build source commit');
  assert(build.artifact?.apkSha256 === expectedInput, 'build input hash');
  assert(build.artifact?.trustedEdgeResignRequired === true, 'trusted-edge resign requirement');

  assert(graph.gate === 'TRUSTED_EDGE_STABLE_LAB_SIGNING', 'signing gate');
  assert(graph.status === 'PHYSICAL_SIGNING_AND_OWNED_DEVICE_GMAIL_PASS_ALPHA2_INTEGRATION_OPEN', 'physical status');
  assert(graph.inputBuild?.sourceCommit === expectedSource, 'input source binding');
  assert(graph.inputBuild?.apkSha256 === expectedInput, 'input hash binding');
  assert(graph.inputBuild?.apkBytes === 172884802, 'input byte binding');

  assert(graph.signer?.identity === 'FINANCESENSOR_R2_LAB', 'signer identity');
  assert(graph.signer?.expectedSha1 === expectedSigner, 'signer fingerprint');
  assert(graph.signer?.androidPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package');
  assert(graph.signer?.privateKeystoreInGitHub === false, 'private keystore in GitHub forbidden');
  assert(graph.signer?.passwordInGitHub === false, 'password in GitHub forbidden');

  assert(graph.tooling?.passwordTransport === 'stdin', 'password transport must be stdin');
  assert(graph.tooling?.partialOutputDeletedOnAnyFailure === true, 'fail-closed output deletion');
  assert(graph.tooling?.signedOutputFingerprintMustMatch === true, 'output fingerprint verification');
  assert(graph.tooling?.deterministicPasswordZeroizationClaimed === false, 'zeroization overclaim forbidden');

  const receipt = graph.physicalReceipt;
  assert(receipt?.trustedEdgeSigningPass === true, 'physical signing pass');
  assert(receipt?.sourceCommit === expectedSource, 'physical source binding');
  assert(receipt?.inputApkSha256 === expectedInput, 'physical input hash');
  assert(receipt?.signedApkSha256 === expectedSigned, 'signed output hash');
  assert(receipt?.signedApkBytes === 172908785, 'signed output bytes');
  assert(receipt?.signerSha1 === expectedSigner, 'physical signer fingerprint');
  assert(receipt?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'physical OAuth package');
  assert(receipt?.exactScope === 'gmail.readonly', 'physical exact scope');
  assert(receipt?.ownedDeviceInstallPass === true, 'owned-device install pass');
  assert(receipt?.realOauthPass === true, 'real OAuth pass');
  assert(receipt?.realGmailPass === true, 'real Gmail pass');
  assert(receipt?.realBoundedScanPass === true, 'bounded scan pass');
  assert(receipt?.privateSigningMaterialInGitHub === false, 'private signer material forbidden');

  assert(graph.historicalEvidenceBoundary?.previousPr === 62, 'historical PR boundary');
  assert(graph.historicalEvidenceBoundary?.currentSignedOutputEqualsHistoricalBytes === true, 'historical byte equality observation');
  assert(graph.historicalEvidenceBoundary?.inheritedAsCurrentPhysicalPass === false, 'historical provenance inheritance forbidden');

  assert(graph.claims?.physicalSigningPass === true, 'current physical signing claim');
  assert(graph.claims?.ownedDeviceGmailHumanTestPass === true, 'current human-test Gmail claim');
  assert(graph.claims?.alpha2PhysicalProductPass === false, 'Alpha.2 full physical product pass forbidden');
  assert(graph.claims?.alpha2MobileIntegration === 'OPEN', 'Alpha.2 mobile integration remains open');
  assert(graph.claims?.buildReady === false, 'BUILD_READY remains false');
  assert(graph.claims?.releaseReady === false, 'RELEASE_READY remains false');

  for (const marker of [
    "$ExpectedSourceCommit = '9d990fc579429cc0bc8e5c02306d8ebe4622e145'",
    "$ExpectedInputSha256 = 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d'",
    "$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'",
    '--ks-pass stdin',
    '--key-pass stdin',
    'Remove-OutputArtifacts -OutputPath $OutputFull',
    'Produced APK signer mismatch.',
    'SIGNED_APK_SHA256=$SignedHash',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ]) assert(ps1.includes(marker), `PowerShell marker missing: ${marker}`);

  assert(!ps1.includes('-storepass:env'), 'keytool env password transport must not return');
  assert(!ps1.includes('--ks-pass env:'), 'apksigner env password transport must not return');
  assert(!/BUILD_READY=YES|RELEASE_READY=YES/.test(ps1), 'signer may not promote build/release readiness');
  assert(!/client_secret|refresh_token|access_token/i.test(ps1), 'OAuth credential fields forbidden');

  for (const marker of [
    'goto INTERACTIVE',
    'SIGN-FINANCESENSOR-R2.ps1',
    'pinned to the certified Human Test Alpha build',
    'Verify the generated .sha256 and .receipt.txt files before installation.'
  ]) assert(cmd.includes(marker), `CMD marker missing: ${marker}`);

  for (const marker of [
    '**Status:** PHYSICAL SIGNING PASS / OWNED-DEVICE OAUTH+GMAIL PASS / ALPHA.2 MOBILE INTEGRATION OPEN',
    expectedInput,
    expectedSigned,
    expectedSigner,
    'PASSWORD_SESSION_ONLY=YES',
    'PHYSICAL_SIGNING_PASS != ALPHA2_MOBILE_INTEGRATED',
    'BUILD_READY                            NO',
    'RELEASE_READY                          NO'
  ]) assert(handoff.includes(marker), `handoff marker missing: ${marker}`);

  for (const marker of [expectedInput, expectedSigned, expectedSigner, 'CURRENT_R2_PHYSICAL_SIGNING_PASS      YES', 'ALPHA2_MOBILE_INTEGRATION             OPEN']) {
    assert(physical.includes(marker), `physical evidence marker missing: ${marker}`);
  }
  assert(repair.includes('apksigner') && repair.includes('stdin'), 'repair evidence must document stdin transport');

  for (const marker of ['HUMAN_TEST_READY=YES', 'TRUSTED_EDGE_RESIGN_REQUIRED=YES', 'BUILD_READY=NO', 'RELEASE_READY=NO']) {
    assert(candidate.includes(marker), `candidate boundary missing: ${marker}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_R2_TRUSTED_EDGE_SIGNER_HANDOFF=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_R2_TRUSTED_EDGE_SIGNER_HANDOFF=PASS');
console.log('STATIC_SIGNER_HANDOFF_READY=1');
console.log('PHYSICAL_SIGNING_PASS=1');
console.log('OWNED_DEVICE_GMAIL_HUMAN_TEST_PASS=1');
console.log('SIGNED_APK_SHA256=4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b');
console.log('ALPHA2_MOBILE_INTEGRATION=OPEN');
console.log('GOOGLE_PRODUCTION_VERIFICATION=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
