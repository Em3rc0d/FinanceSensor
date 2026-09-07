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
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2002',
  sourceCommit: '3e83fbaa74c31b11fb46cccfa3a5c31d882d4093',
  canonicalRunId: 34163911830,
  canonicalJobId: 101871077983,
  canonicalArtifactId: 10033624133,
  canonicalArtifactZipSha256: '3f1d463fee5292ccfa1d0ec2b2b316b83183158459fee48af3afd2eca861db6c',
  apkSha256: 'a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf',
  apkBytes: 176012379,
  ps1Blob: 'b082238e111381d2689626037e5ac795dbd210c7',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v4.zip',
  bundleSha256: 'a801bcff3255c0e4e9c76cea1e7de1abd0277db2757eb49699cd254b8d69321e',
  bundleBytes: 86636368,
  apksignerSha256: '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180',
  v3Sha: 'dbb310bf1efddda91793b996543568b8fff57c4379561fdfeec98eedbe70c90d',
};

function assert(cond, message) { if (!cond) throw new Error(message); }
function gitBlobSha1(buffer) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V4', 'R1 v4 schema drifted');
assert(graph.project === 'FinanceSensor', 'project drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.canonicalRunId === expected.canonicalRunId, 'canonical run drifted');
assert(graph.canonicalJobId === expected.canonicalJobId, 'canonical job drifted');
assert(graph.canonicalArtifactId === expected.canonicalArtifactId, 'canonical artifact drifted');
assert(graph.canonicalArtifactZipSha256 === expected.canonicalArtifactZipSha256, 'canonical artifact ZIP drifted');
assert(graph.inputApk?.sha256 === expected.apkSha256, 'input APK SHA drifted');
assert(graph.inputApk?.bytes === expected.apkBytes, 'input APK bytes drifted');
assert(graph.inputApk?.minSdk === 24 && graph.inputApk?.targetSdk === 36, 'Android SDK boundary drifted');
assert(graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK parser/signature evidence drifted');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob, 'PS1 authority drifted');
assert(graph.signer?.cmdGitBlob === expected.cmdBlob, 'CMD authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'actual PS1 blob differs from authority');
assert(gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual CMD blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED', 'Windows stdin boundary drifted');
assert(graph.signer?.directPasswordPipe === 'FORBIDDEN', 'direct password pipe boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1, 'stable signer drifted');
assert(graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package drifted');
assert(graph.signer?.exactScope === 'gmail.readonly', 'OAuth scope drifted');

const bundle = graph.handoffBundle ?? {};
assert(bundle.name === expected.bundleName, 'v4 bundle name drifted');
assert(bundle.status === 'READY', 'v4 bundle must be READY');
assert(bundle.sha256 === expected.bundleSha256, 'v4 bundle SHA drifted');
assert(bundle.bytes === expected.bundleBytes, 'v4 bundle bytes drifted');
assert(bundle.files === 8, 'v4 bundle file count drifted');
assert(bundle.privateKeyFiles === 0, 'private signing file detected');
assert(bundle.secretLikeValueMatches === 0, 'secret-like material detected');
assert(bundle.zipStructure === 'PASS' && bundle.zipIntegrity === 'PASS' && bundle.manifestIntegrity === 'PASS', 'v4 bundle integrity drifted');
assert(bundle.apksignerSha256 === expected.apksignerSha256, 'public apksigner digest drifted');
assert(bundle.ps1GitBlobVerified === expected.ps1Blob, 'packaged PS1 blob drifted');
assert(bundle.cmdGitBlobVerified === expected.cmdBlob, 'packaged CMD blob drifted');
assert(bundle.supersedesBundleSha256 === expected.v3Sha, 'v4 supersession drifted');

const v3 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.v3Sha);
assert(v3?.safeToUse === false && v3?.reason === 'PINNED_TO_SUPERSEDED_ALPHA2_2001_INPUT', 'v3 supersession boundary drifted');
assert(graph.ciGate?.generationRunId === 34165897243, 'generation run drifted');
assert(graph.ciGate?.generationJobId === 101876751681, 'generation job drifted');
assert(graph.ciGate?.generationArtifactId === 10034132918, 'generation artifact drifted');
assert(graph.ciGate?.generationConclusion === 'SUCCESS', 'generation conclusion must be SUCCESS');
assert(graph.ciGate?.privateSigningMaterialAllowed === false, 'private signing material cannot enter public CI');
assert(graph.ciGate?.bundleGenerationInPublicCi === true, 'public-safe bundle generation must remain enabled');
assert(graph.ciGate?.physicalSigningInPublicCi === false, 'physical signing must remain outside CI');
assert(graph.status === 'HANDOFF_READY_PHYSICAL_OPEN', 'R1 handoff status drifted');
assert(graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null, 'R1 physical signing cannot be pre-certified');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream promotion boundary drifted');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.apkBytes), expected.signerSha1, 'function Invoke-ProcessWithStdin', 'RedirectStandardInput = $true', 'RedirectStandardError = $true']) {
  assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
}
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool password pipe is forbidden');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

for (const marker of [
  expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.apkBytes),
  expected.ps1Blob, expected.cmdBlob, expected.apksignerSha256, expected.bundleName,
  expected.bundleSha256, String(expected.bundleBytes), expected.v3Sha,
  'ZIP_INTEGRITY=PASS', 'MANIFEST_INTEGRITY=PASS', 'PRIVATE_KEY_FILES=0',
  'SECRET_LIKE_VALUE_MATCHES=0', 'R1_TRUSTED_EDGE_SIGNING=OPEN', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(evidence.includes(marker), `R1 evidence missing marker: ${marker}`);

for (const marker of ['node tools/validate-alpha2-canonical-candidate.mjs', 'node tools/validate-alpha2-r1-signing-handoff.mjs', 'node tools/validate-alpha2-r1-ci-routing-receipt.mjs', 'contents: read', 'R1_TRUSTED_EDGE_SIGNING=OPEN', 'BUILD_READY=NO', 'RELEASE_READY=NO']) {
  assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
}
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository secrets');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('ALPHA2_R1_BUNDLE_V4=PASS');
console.log(`BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`BUNDLE_BYTES=${expected.bundleBytes}`);
console.log('ALPHA2_R1_SIGNER_GIT_BLOBS=PASS');
console.log('ALPHA2_R1_WINDOWS_STDIN=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
