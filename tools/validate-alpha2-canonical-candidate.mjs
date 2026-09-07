import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const handoff = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signer = fs.readFileSync(signerPath, 'utf8');
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md', 'utf8');
const handoffEvidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-R1-SIGNING-HANDOFF-2026-09-07.md', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2001',
  certifiedPrHead: '3640244fb12aabf818b002399f3b7cc28fbde14c',
  sourceCommit: 'f658363772b8d3652a81a8a4275a571f2f409ed8',
  runId: 34082101187,
  jobId: 101619210181,
  artifactId: 10004110513,
  artifactZipSha256: '812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736',
  apkSha256: '7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f',
  apkBytes: 182053563,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  signerPs1GitBlob: 'f535c79b4c375fdf2dcecd7632281cd282d542b4',
  signerCmdGitBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v2.zip',
  bundleSha256: '6ce4ec9fcb2e42043e89387cb4f21d1dd1bbe5ef079807e62e0bdad479be50d5',
  bundleBytes: 86531678,
  supersededBundleSha256: 'b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8'
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function gitBlobSha1(text) {
  const bytes = Buffer.from(text, 'utf8');
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V1', 'schema version drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.certifiedPrHead === expected.certifiedPrHead, 'certified PR head drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.authority.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
assert(graph.authority.runId === expected.runId, 'run id drifted');
assert(graph.authority.jobId === expected.jobId, 'job id drifted');
assert(graph.authority.artifactId === expected.artifactId, 'artifact id drifted');
assert(graph.authority.artifactZipSha256 === expected.artifactZipSha256, 'artifact digest drifted');
assert(graph.authority.apkSha256 === expected.apkSha256, 'apk digest drifted');
assert(graph.authority.apkBytes === expected.apkBytes, 'apk bytes drifted');
assert(graph.authority.publicCiSigner === 'EPHEMERAL_DEBUG', 'public signer boundary drifted');
assert(graph.authority.trustedEdgeResignRequired === true, 'trusted edge resign boundary drifted');
assert(graph.signing.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signing.trustedEdgeSigningPass === false, 'physical signing cannot be pre-certified');
assert(graph.signing.signedApkSha256 === null, 'signed apk hash must remain null before physical signing');
assert(graph.boundaries.physicalSqlcipherPass === false, 'physical SQLCipher cannot be pre-certified');
assert(graph.boundaries.physicalAlpha2Pass === false, 'physical Alpha.2 cannot be pre-certified');
assert(graph.boundaries.buildReady === false, 'BUILD_READY must remain false');
assert(graph.boundaries.releaseReady === false, 'RELEASE_READY must remain false');

const consensus = new Map(graph.postMergeConsensus.map((x) => [x.workflow, x]));
for (const workflow of [
  'Alpha.2 Integrated Runtime',
  'FinanceSensor Mobile Shell',
  'FinanceSensor Android Human Test Alpha',
  'FinanceSensor Android Gmail Connection',
  'FinanceSensor Statement ETL Contract',
  'FinanceSensor Public Readiness',
  'Alpha.2 Design Freeze',
  'FinanceSensor Heartbeat'
]) {
  assert(consensus.has(workflow), `missing post-merge consensus workflow: ${workflow}`);
}
assert(consensus.get('FinanceSensor Android Human Test Alpha').conclusion === 'SUCCESS_REGRESSION_ONLY', 'legacy Human Test must remain regression-only');

const legacy = graph.nonAuthoritativeArtifacts.find((x) => x.artifactId === 10004093091);
assert(legacy && legacy.apkSha256 === '1525db5ae9ace01e7201ec8f529121c52efa6e414114e8a3cc661ba5ef14c3f9', 'legacy Human Test exclusion drifted');

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

assert(signer.includes('--ks-pass') && signer.includes("'stdin'"), 'signer must use stdin password handoff');
assert(signer.includes('--key-pass') && signer.includes("'stdin'"), 'signer must use stdin key-password handoff');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

for (const marker of [
  'function Invoke-ProcessWithStdin',
  'System.Diagnostics.ProcessStartInfo',
  '$psi.UseShellExecute = $false',
  '$psi.RedirectStandardInput = $true',
  '$psi.RedirectStandardOutput = $true',
  '$psi.RedirectStandardError = $true',
  '$keytoolResult = Invoke-ProcessWithStdin',
  '$signResult = Invoke-ProcessWithStdin',
  '$verifyResult = Invoke-ProcessWithStdin',
  '$inputVerify = Invoke-ProcessWithStdin'
]) {
  assert(signer.includes(marker), `Windows native-process hardening missing: ${marker}`);
}
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool pipeline is forbidden on Windows trusted edge');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipeline is forbidden on Windows trusted edge');

const actualSignerBlob = gitBlobSha1(signer);
assert(actualSignerBlob === expected.signerPs1GitBlob, `signer git blob drifted: ${actualSignerBlob}`);

assert(handoff.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V2', 'R1 handoff schema drifted');
assert(handoff.candidate === expected.candidate, 'R1 candidate drifted');
assert(handoff.sourceCommit === expected.sourceCommit, 'R1 source drifted');
assert(handoff.canonicalRunId === expected.runId, 'R1 run drifted');
assert(handoff.canonicalArtifactId === expected.artifactId, 'R1 artifact drifted');
assert(handoff.inputApk.sha256 === expected.apkSha256, 'R1 input APK digest drifted');
assert(handoff.inputApk.bytes === expected.apkBytes, 'R1 input APK bytes drifted');
assert(handoff.signer.powershellGitBlob === expected.signerPs1GitBlob, 'R1 signer blob drifted');
assert(handoff.signer.cmdGitBlob === expected.signerCmdGitBlob, 'R1 CMD blob drifted');
assert(handoff.signer.windowsNativeIo === 'PROCESS_START_INFO_REDIRECTED_STDIN_STDOUT_STDERR', 'R1 Windows native IO drifted');
assert(handoff.signer.directNativePasswordPipeline === false, 'R1 direct native password pipeline must remain false');
assert(handoff.signer.expectedSignerSha1 === expected.signerSha1, 'R1 signer identity drifted');
assert(handoff.handoffBundle.name === expected.bundleName, 'R1 v2 bundle name drifted');
assert(handoff.handoffBundle.sha256 === expected.bundleSha256, 'R1 v2 bundle digest drifted');
assert(handoff.handoffBundle.bytes === expected.bundleBytes, 'R1 v2 bundle bytes drifted');
assert(handoff.handoffBundle.files === 8, 'R1 v2 bundle file count drifted');
assert(handoff.handoffBundle.privateKeyFiles === 0, 'R1 bundle must contain zero private key files');
assert(handoff.handoffBundle.secretLikeValueMatches === 0, 'R1 bundle must contain zero secret-like values');
assert(handoff.handoffBundle.zipStructure === 'PASS' && handoff.handoffBundle.zipIntegrity === 'PASS', 'R1 bundle ZIP audit drifted');
assert(handoff.handoffBundle.supersedesBundleSha256 === expected.supersededBundleSha256, 'R1 v1 supersession marker drifted');
assert(handoff.status === 'HANDOFF_READY_PHYSICAL_OPEN', 'R1 must remain physical-open before receipt');
assert(handoff.trustedEdgeSigningPass === false && handoff.signedApkSha256 === null, 'R1 physical signing cannot be pre-certified');
assert(handoff.buildReady === false && handoff.releaseReady === false, 'R1 cannot promote build/release readiness');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable for signer parser gate: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.artifactId)]) {
  assert(evidence.includes(marker), `evidence missing canonical marker: ${marker}`);
}
assert(evidence.includes('BUILD_READY                     NO'), 'evidence must preserve BUILD_READY=NO');
assert(evidence.includes('RELEASE_READY                   NO'), 'evidence must preserve RELEASE_READY=NO');

for (const marker of [
  'HANDOFF_SCHEMA=A2_R1_TRUSTED_EDGE_HANDOFF_V2',
  `SIGNER_PS1_GIT_BLOB=${expected.signerPs1GitBlob}`,
  `BUNDLE_NAME=${expected.bundleName}`,
  `BUNDLE_SHA256=${expected.bundleSha256}`,
  `BUNDLE_BYTES=${expected.bundleBytes}`,
  `SUPERSEDES_BUNDLE_SHA256=${expected.supersededBundleSha256}`,
  'R1_TRUSTED_EDGE_SIGNING=OPEN',
  'R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) {
  assert(handoffEvidence.includes(marker), `R1 handoff evidence missing marker: ${marker}`);
}

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('ALPHA2_TRUSTED_EDGE_SIGNER_PARSE=PASS');
console.log('ALPHA2_TRUSTED_EDGE_WINDOWS_NATIVE_IO=PASS');
console.log('ALPHA2_R1_HANDOFF_V2=PASS');
console.log(`ALPHA2_R1_SIGNER_GIT_BLOB=${actualSignerBlob}`);
