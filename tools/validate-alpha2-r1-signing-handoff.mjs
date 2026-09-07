import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-R1-SIGNING-HANDOFF-2026-09-07.md', 'utf8');
const workflowPath = '.github/workflows/alpha2-r1-trusted-edge-signing.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2001',
  designGovernanceSha: '416b8e3a1632d549d7d7d0d3026d18f969c57dd2',
  sourceCommit: 'f658363772b8d3652a81a8a4275a571f2f409ed8',
  canonicalRunId: 34082101187,
  canonicalArtifactId: 10004110513,
  canonicalArtifactZipSha256: '812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736',
  apkSha256: '7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f',
  apkBytes: 182053563,
  ps1Blob: 'd2aadb1bda90bbbcc3d7aa0e10a5835ef068a297',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  packageName: 'com.financesensor.lab.gmailconnection.r2',
  scope: 'gmail.readonly',
  apksignerSha256: '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v3.zip',
  bundleSha256: 'dbb310bf1efddda91793b996543568b8fff57c4379561fdfeec98eedbe70c90d',
  bundleBytes: 86191424,
  rejectedV1: 'b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8',
  rejectedV2: 'c4b59ce33a9fc7755a14a9a320507492544b9981bdbf2fc5086b78675bc54ae5',
  rejectedV2ObservedPs1: '7ddce7fe22ef8a65cad5edf5c9f42cb87dbd4010'
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function gitBlobSha1(buffer) {
  return crypto
    .createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest('hex');
}

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V3', 'R1 handoff schema drifted');
assert(graph.project === 'FinanceSensor', 'project drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.designGovernanceSha === expected.designGovernanceSha, 'design governance SHA drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.canonicalRunId === expected.canonicalRunId, 'canonical run id drifted');
assert(graph.canonicalArtifactId === expected.canonicalArtifactId, 'canonical artifact id drifted');
assert(graph.canonicalArtifactZipSha256 === expected.canonicalArtifactZipSha256, 'canonical artifact ZIP digest drifted');
assert(graph.inputApk?.sha256 === expected.apkSha256, 'canonical APK digest drifted');
assert(graph.inputApk?.bytes === expected.apkBytes, 'canonical APK bytes drifted');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob, 'signer PS1 blob authority drifted');
assert(graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer CMD blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'actual PS1 git blob does not match frozen authority');
assert(gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual CMD git blob does not match frozen authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED', 'Windows native stdin mode drifted');
assert(graph.signer?.directPasswordPipe === 'FORBIDDEN', 'direct password pipe boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1, 'stable signer fingerprint drifted');
assert(graph.signer?.androidOauthPackage === expected.packageName, 'OAuth package drifted');
assert(graph.signer?.exactScope === expected.scope, 'OAuth scope drifted');
assert(graph.publicTooling?.apksignerSha256 === expected.apksignerSha256, 'public apksigner digest drifted');

assert(graph.handoffBundle?.name === expected.bundleName, 'R1 v3 bundle name drifted');
assert(graph.handoffBundle?.sha256 === expected.bundleSha256, 'R1 v3 bundle digest drifted');
assert(graph.handoffBundle?.bytes === expected.bundleBytes, 'R1 v3 bundle bytes drifted');
assert(graph.handoffBundle?.files === 8, 'R1 v3 bundle file count drifted');
assert(graph.handoffBundle?.privateKeyFiles === 0, 'private signing file detected in handoff authority');
assert(graph.handoffBundle?.secretLikeValueMatches === 0, 'secret-like material detected in handoff authority');
assert(graph.handoffBundle?.zipStructure === 'PASS', 'bundle ZIP structure not PASS');
assert(graph.handoffBundle?.zipIntegrity === 'PASS', 'bundle ZIP integrity not PASS');
assert(graph.handoffBundle?.manifestIntegrity === 'PASS', 'bundle manifest integrity not PASS');
assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob, 'v3 packaged PS1 blob verification drifted');
assert(graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'v3 packaged CMD blob verification drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.rejectedV2, 'v3 supersession authority drifted');
assert(JSON.stringify(graph.handoffBundle?.supersessionChain) === JSON.stringify([expected.rejectedV1, expected.rejectedV2]), 'bundle supersession chain drifted');

const rejectedV1 = graph.rejectedBundles?.find((x) => x.sha256 === expected.rejectedV1);
const rejectedV2 = graph.rejectedBundles?.find((x) => x.sha256 === expected.rejectedV2);
assert(rejectedV1?.reason === 'WINDOWS_POWERSHELL_NATIVE_STDERR_PIPE_FAILURE' && rejectedV1?.safeToUse === false, 'v1 rejection boundary drifted');
assert(rejectedV2?.reason === 'PACKAGED_PS1_GIT_BLOB_MISMATCH' && rejectedV2?.safeToUse === false, 'v2 rejection boundary drifted');
assert(rejectedV2?.observedPs1GitBlob === expected.rejectedV2ObservedPs1, 'v2 observed PS1 blob drifted');
assert(rejectedV2?.expectedPs1GitBlob === expected.ps1Blob, 'v2 expected PS1 blob drifted');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 CI workflow authority drifted');
assert(graph.ciGate?.workflowPath === workflowPath, 'R1 CI workflow path drifted');
assert(graph.ciGate?.validator === 'tools/validate-alpha2-r1-signing-handoff.mjs', 'R1 validator path drifted');
assert(graph.ciGate?.canonicalValidator === 'tools/validate-alpha2-canonical-candidate.mjs', 'canonical validator path drifted');
assert(graph.ciGate?.powershellParserRequired === true, 'PowerShell parser gate must remain required');
assert(graph.ciGate?.privateSigningMaterialAllowed === false, 'private signing material cannot be allowed in public CI');

assert(graph.status === 'HANDOFF_READY_PHYSICAL_OPEN', 'R1 must remain physical-open before trusted-edge receipt');
assert(graph.trustedEdgeSigningPass === false, 'R1 physical signing cannot be pre-certified');
assert(graph.signedApkSha256 === null, 'signed APK digest must remain null before R1 physical PASS');
assert(graph.physicalAlpha2Pass === false, 'physical Alpha.2 cannot be pre-certified');
assert(graph.buildReady === false, 'BUILD_READY must remain false');
assert(graph.releaseReady === false, 'RELEASE_READY must remain false');

for (const marker of [
  expected.candidate,
  expected.sourceCommit,
  expected.apkSha256,
  String(expected.apkBytes),
  expected.signerSha1,
  'function Invoke-ProcessWithStdin',
  'RedirectStandardInput = $true',
  'RedirectStandardError = $true',
  'Invoke-ProcessWithStdin -FileName $keytool',
  'Invoke-ProcessWithStdin -FileName $java',
  "'--ks-pass', 'stdin'",
  "'--key-pass', 'stdin'"
]) {
  assert(signer.includes(marker), `signer missing frozen/robust marker: ${marker}`);
}
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool password pipe is forbidden');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable for R1 signer parser gate: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

for (const marker of [
  expected.bundleName,
  expected.bundleSha256,
  String(expected.bundleBytes),
  expected.apkSha256,
  expected.ps1Blob,
  expected.cmdBlob,
  expected.signerSha1,
  'WINDOWS_NATIVE_STDIN=PROCESS_START_INFO_REDIRECTED',
  'DIRECT_PASSWORD_PIPE=FORBIDDEN',
  `BUNDLE_V1_SHA256=${expected.rejectedV1}`,
  'BUNDLE_V1_STATUS=REJECTED_SUPERSEDED',
  `BUNDLE_V2_SHA256=${expected.rejectedV2}`,
  'BUNDLE_V2_STATUS=REJECTED_SUPERSEDED',
  `BUNDLE_V2_OBSERVED_PS1_GIT_BLOB=${expected.rejectedV2ObservedPs1}`,
  `BUNDLE_V2_EXPECTED_PS1_GIT_BLOB=${expected.ps1Blob}`,
  'R1_TRUSTED_EDGE_SIGNING=OPEN',
  'R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) {
  assert(evidence.includes(marker), `R1 evidence missing marker: ${marker}`);
}

for (const path of [
  'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1',
  'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd',
  'tools/validate-alpha2-canonical-candidate.mjs',
  'tools/validate-alpha2-r1-signing-handoff.mjs',
  'graph/alpha2-canonical-candidate.json',
  'graph/alpha2-r1-signing-handoff.json',
  'mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md',
  'mk0/10-evidence/EV-ALPHA2-R1-SIGNING-HANDOFF-2026-09-07.md',
  '.github/workflows/alpha2-r1-trusted-edge-signing.yml'
]) {
  assert(workflow.split(path).length - 1 >= 2, `R1 workflow routing missing PR/push path: ${path}`);
}
assert(workflow.includes('node tools/validate-alpha2-canonical-candidate.mjs'), 'R1 workflow must execute canonical candidate validator');
assert(workflow.includes('node tools/validate-alpha2-r1-signing-handoff.mjs'), 'R1 workflow must execute R1 handoff validator');
assert(workflow.includes('contents: read'), 'R1 workflow must remain read-only');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume GitHub secrets');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('ALPHA2_R1_BUNDLE_V3=PASS');
console.log('ALPHA2_R1_SIGNER_GIT_BLOBS=PASS');
console.log('ALPHA2_R1_WINDOWS_STDIN=PASS');
console.log('ALPHA2_R1_CI_ROUTING=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
