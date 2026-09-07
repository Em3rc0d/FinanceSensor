import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signer = fs.readFileSync(signerPath, 'utf8');
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md', 'utf8');
const physicalEvidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-2003-PHYSICAL-INSTALLABILITY-OBSERVATION-2026-09-07.md', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2003',
  certifiedPrHead: '25f0f79c3b21b78e8ca52c8a02cdf696d6d17b8c',
  sourceCommit: 'c29a68e5326a187a7c82e6d66254ae05b6a4178a',
  runId: 34166127407,
  jobId: 101877387416,
  artifactId: 10034303033,
  artifactZipSha256: '17489354c2b3da1a3389c2fa991ac9d444f8eb58d031c030d05e0d20fbed481f',
  apkSha256: '93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6',
  apkBytes: 182090843,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V2', 'schema version drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.certifiedPrHead === expected.certifiedPrHead, 'certified PR head drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
assert(graph.authority?.runId === expected.runId, 'run id drifted');
assert(graph.authority?.jobId === expected.jobId, 'job id drifted');
assert(graph.authority?.artifactId === expected.artifactId, 'artifact id drifted');
assert(graph.authority?.artifactZipSha256 === expected.artifactZipSha256, 'artifact digest drifted');
assert(graph.authority?.apkSha256 === expected.apkSha256, 'apk digest drifted');
assert(graph.authority?.apkBytes === expected.apkBytes, 'apk bytes drifted');
assert(graph.authority?.minSdk === 31, 'ADR-013 minSdk baseline drifted');
assert(graph.authority?.targetSdk === 36, 'targetSdk drifted');
assert(graph.authority?.compileSdk === 37, 'compileSdk drifted');
assert(graph.authority?.signatureVerify === 'PASS', 'apksigner evidence drifted');
assert(graph.authority?.aapt2Parse === 'PASS', 'aapt2 evidence drifted');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG', 'public signer boundary drifted');
assert(graph.authority?.trustedEdgeResignRequired === true, 'trusted edge resign boundary drifted');

assert(graph.physicalInstallabilityObservation?.installPass === true, 'owned-device install PASS missing');
assert(graph.physicalInstallabilityObservation?.launchPass === true, 'owned-device launch PASS missing');
assert(graph.physicalInstallabilityObservation?.oauthPass === false, 'OAuth must not be promoted before stable signing');
assert(graph.physicalInstallabilityObservation?.rawScreenshotInGitHub === false, 'raw screenshot must remain outside GitHub');

assert(graph.signing?.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package drifted');
assert(graph.signing?.exactScope === 'gmail.readonly', 'OAuth scope drifted');
assert(graph.signing?.trustedEdgeSigningPass === false, 'physical signing cannot be pre-certified');
assert(graph.signing?.signedApkSha256 === null, 'signed APK hash must remain null before physical signing');
assert(graph.boundaries?.ownedDeviceInstallPass === true, 'install boundary drifted');
assert(graph.boundaries?.ownedDeviceLaunchPass === true, 'launch boundary drifted');
assert(graph.boundaries?.ownedDeviceStableSignerOauthPass === false, 'stable-signer OAuth cannot be pre-certified');
assert(graph.boundaries?.physicalSqlcipherPass === false, 'physical SQLCipher cannot be pre-certified');
assert(graph.boundaries?.physicalAlpha2Pass === false, 'physical Alpha.2 cannot be pre-certified');
assert(graph.boundaries?.buildReady === false, 'BUILD_READY must remain false');
assert(graph.boundaries?.releaseReady === false, 'RELEASE_READY must remain false');

const consensus = new Map((graph.postMergeConsensus ?? []).map(x => [x.workflow, x]));
assert(consensus.get('Alpha.2 Integrated Runtime')?.runId === expected.runId, 'current integrated runtime consensus missing');
assert(consensus.get('Alpha.2 Integrated Runtime')?.conclusion === 'SUCCESS', 'current integrated runtime must be SUCCESS');
assert(consensus.get('Alpha.2 Design Freeze')?.conclusion === 'SUCCESS', 'design freeze consensus missing');

const old2002 = (graph.nonAuthoritativeCandidates ?? []).find(x => x.candidate === '0.2.0-alpha.2+2002');
assert(old2002 && /diagnostic/i.test(old2002.reason) && /ADR-013/.test(old2002.reason), '+2002 supersession boundary missing');

for (const marker of [
  expected.candidate,
  expected.sourceCommit,
  expected.apkSha256,
  String(expected.apkBytes),
  String(expected.runId),
  String(expected.artifactId),
  expected.signerSha1,
  'ALPHA2_MOBILE_INTEGRATION_CI=PASS',
  'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) {
  assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
}
assert(signer.includes("'--ks-pass', 'stdin'"), 'signer must use stdin keystore password handoff');
assert(signer.includes("'--key-pass', 'stdin'"), 'signer must use stdin private-key password handoff');
assert(signer.includes('function Invoke-ProcessWithStdin'), 'Windows native-process stdin wrapper is required');
assert(signer.includes('RedirectStandardInput = $true') && signer.includes('RedirectStandardError = $true'), 'native process streams must be redirected explicitly');
assert(signer.includes('Invoke-ProcessWithStdin -FileName $keytool'), 'keytool must run through redirected stdin wrapper');
assert(signer.includes('Invoke-ProcessWithStdin -FileName $java'), 'apksigner must run through redirected stdin wrapper');
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool password pipe is forbidden');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable for signer parser gate: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.artifactId), 'OWNED_DEVICE_INSTALL            PASS', 'OWNED_DEVICE_LAUNCH             PASS']) {
  assert(evidence.includes(marker), `canonical evidence missing marker: ${marker}`);
}
for (const marker of ['OWNED_DEVICE_INSTALL_PASS=YES', 'OWNED_DEVICE_LAUNCH_PASS=YES', 'GOOGLE_AUTHORIZATION_PASS=NO', 'R1_TRUSTED_EDGE_SIGNING=OPEN']) {
  assert(physicalEvidence.includes(marker), `physical observation evidence missing marker: ${marker}`);
}
assert(evidence.includes('BUILD_READY                     NO'), 'evidence must preserve BUILD_READY=NO');
assert(evidence.includes('RELEASE_READY                   NO'), 'evidence must preserve RELEASE_READY=NO');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('ALPHA2_2003_INSTALL_AND_LAUNCH=PASS');
console.log('ALPHA2_STABLE_SIGNER_OAUTH=OPEN');
console.log('ALPHA2_TRUSTED_EDGE_SIGNER_PARSE=PASS');
console.log('ALPHA2_WINDOWS_NATIVE_STDIN=PASS');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
