import fs from 'node:fs';

const paths = {
  buildReceipt: 'graph/alpha2-human-test-build.json',
  signerGraph: 'graph/alpha2-r2-trusted-edge-signing.json',
  handoff: 'mk0/12-release/R2-TRUSTED-EDGE-SIGNING-HANDOFF.md',
  candidate: 'mk0/12-release/HUMAN-TEST-CANDIDATE.md',
  ps1: 'tools/SIGN-FINANCESENSOR-R2.ps1',
  cmd: 'tools/SIGN-FINANCESENSOR-R2.cmd',
};

const failures = [];
const fail = message => failures.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };
for (const path of Object.values(paths)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const build = JSON.parse(fs.readFileSync(paths.buildReceipt, 'utf8'));
  const graph = JSON.parse(fs.readFileSync(paths.signerGraph, 'utf8'));
  const handoff = fs.readFileSync(paths.handoff, 'utf8');
  const candidate = fs.readFileSync(paths.candidate, 'utf8');
  const ps1 = fs.readFileSync(paths.ps1, 'utf8');
  const cmd = fs.readFileSync(paths.cmd, 'utf8');

  assert(build.status === 'CI_BUILD_PASS_TRUSTED_EDGE_SIGNING_REQUIRED', 'build receipt status');
  assert(build.source?.commit === '9d990fc579429cc0bc8e5c02306d8ebe4622e145', 'build source commit');
  assert(build.artifact?.apkSha256 === 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d', 'build APK hash');
  assert(build.artifact?.trustedEdgeResignRequired === true, 'build must require trusted-edge signing');

  assert(graph.gate === 'TRUSTED_EDGE_STABLE_LAB_SIGNING', 'signing gate id');
  assert(graph.status === 'STATIC_IMPLEMENTED_CI_PENDING_PHYSICAL_SIGNING_REQUIRED', 'signing status must remain CI pending');
  assert(graph.staticImplementationReceipt === null, 'static implementation receipt must remain null before exact CI');
  assert(graph.inputBuild?.sourceCommit === build.source.commit, 'signing source commit binding');
  assert(graph.inputBuild?.artifactId === build.artifact.id, 'signing artifact binding');
  assert(graph.inputBuild?.apkSha256 === build.artifact.apkSha256, 'signing APK hash binding');
  assert(graph.inputBuild?.apkBytes === build.artifact.apkBytes, 'signing APK size binding');
  assert(graph.inputBuild?.exactMatchRequiredBeforeSigning === true, 'exact input match required');

  assert(graph.signer?.identity === 'FINANCESENSOR_R2_LAB', 'stable signer identity');
  assert(graph.signer?.expectedSha1 === '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0', 'stable signer fingerprint');
  assert(graph.signer?.androidPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package');
  assert(graph.signer?.privateKeystoreInGitHub === false, 'keystore in GitHub forbidden');
  assert(graph.signer?.privateKeystoreInPublicCi === false, 'keystore in public CI forbidden');
  assert(graph.signer?.passwordInGitHub === false, 'password in GitHub forbidden');
  assert(graph.signer?.passwordInPublicCi === false, 'password in CI forbidden');
  assert(graph.signer?.aliasResolvedByCertificateFingerprint === true, 'alias must be resolved by certificate fingerprint');

  assert(graph.tooling?.inputApkSignatureVerifiedBeforeSigning === true, 'input apksigner verify required');
  assert(graph.tooling?.inputApkHashPinned === true, 'input hash pin required');
  assert(graph.tooling?.outputMustDifferFromInput === true, 'output must differ from input');
  assert(graph.tooling?.partialOutputDeletedOnAnyFailure === true, 'partial output deletion required');
  assert(graph.tooling?.signedOutputVerifiedWithApkSigner === true, 'signed output verify required');
  assert(graph.tooling?.signedOutputFingerprintMustMatch === true, 'signed fingerprint match required');
  assert(graph.tooling?.signedApkSha256Receipt === true, 'signed APK hash receipt required');
  assert(graph.tooling?.deterministicPasswordZeroizationClaimed === false, 'zeroization overclaim forbidden');
  assert(graph.tooling?.sessionOnlyPasswordCustody === true, 'session-only password custody');

  assert(graph.physicalReceipt?.trustedEdgeSigningPass === false, 'physical signing must remain open before local execution');
  assert(graph.physicalReceipt?.signedApkSha256 === null, 'signed APK hash must remain null before local execution');
  assert(graph.physicalReceipt?.ownedDeviceInstallPass === false, 'owned-device install must remain open');
  assert(graph.physicalReceipt?.realOauthPass === false, 'real OAuth must remain open');
  assert(graph.physicalReceipt?.realGmailPass === false, 'real Gmail must remain open');
  assert(graph.historicalEvidenceBoundary?.previousPr === 62, 'historical PR boundary');
  assert(graph.historicalEvidenceBoundary?.inheritedAsCurrentPhysicalPass === false, 'old evidence inheritance forbidden');
  assert(graph.claims?.staticSignerHandoffReady === false, 'static signer handoff must remain false before exact CI');
  assert(graph.claims?.physicalSigningPass === false, 'physical signing pass forbidden before local execution');
  assert(graph.claims?.buildReady === false, 'BUILD_READY must remain false');
  assert(graph.claims?.releaseReady === false, 'RELEASE_READY must remain false');

  for (const marker of [
    "$ExpectedSourceCommit = '9d990fc579429cc0bc8e5c02306d8ebe4622e145'",
    "$ExpectedInputSha256 = 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d'",
    "$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'",
    "$ExpectedPackage = 'com.financesensor.lab.gmailconnection.r2'",
    'Output APK must be different from the certified input APK.',
    'Certified input APK mismatch.',
    'verify --print-certs $InputFull',
    'Remove-OutputArtifacts -OutputPath $OutputFull',
    'Produced APK signer mismatch.',
    'SIGNED_APK_SHA256=$SignedHash',
    'PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0',
    'REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0',
    'BUILD_READY=NO',
    'RELEASE_READY=NO',
    'do not provide deterministic zeroization'
  ]) assert(ps1.includes(marker), `PowerShell marker missing: ${marker}`);

  const removeCount = (ps1.match(/Remove-OutputArtifacts -OutputPath \$OutputFull/g) ?? []).length;
  assert(removeCount >= 5, `expected fail-closed output deletion coverage, got ${removeCount}`);
  assert(!/BUILD_READY=YES|RELEASE_READY=YES/.test(ps1), 'signer may not promote build/release readiness');
  assert(!/client_secret|refresh_token|access_token/i.test(ps1), 'signer may not contain OAuth credential fields');
  assert(!/4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b/.test(ps1), 'old signed APK must not be signer input authority');

  for (const marker of [
    'certified-input-apk',
    'SIGN-FINANCESENSOR-R2.ps1',
    'pinned to the certified Human Test Alpha build',
    'Verify the generated .sha256 and .receipt.txt files before installation.'
  ]) assert(cmd.includes(marker), `CMD marker missing: ${marker}`);

  for (const marker of [
    'INPUT_APK_SHA256     c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d',
    'EXPECTED_SIGNER_SHA1 63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
    'DETERMINISTIC_PASSWORD_ZEROIZATION_CLAIM=NO',
    'OLD_SIGNED_APK_RECEIPT != CURRENT_APK_SIGNING_PASS',
    'STATIC_SIGNER_HANDOFF_READY != PHYSICAL_SIGNING_PASS'
  ]) assert(handoff.includes(marker), `handoff marker missing: ${marker}`);

  for (const marker of [
    'HUMAN_TEST_READY=YES',
    'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ]) assert(candidate.includes(marker), `candidate boundary missing: ${marker}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_R2_TRUSTED_EDGE_SIGNER_HANDOFF=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_R2_TRUSTED_EDGE_SIGNER_HANDOFF=CANDIDATE');
console.log('STATIC_SIGNER_HANDOFF_READY=0');
console.log('INPUT_APK_SHA256=c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d');
console.log('EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0');
console.log('PRIVATE_SIGNER_IN_PUBLIC_CI=0');
console.log('OLD_PHYSICAL_RECEIPT_INHERITED=0');
console.log('PHYSICAL_SIGNING_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
