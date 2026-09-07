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
  candidate: '0.2.0-alpha.2+2003',
  sourceCommit: 'c29a68e5326a187a7c82e6d66254ae05b6a4178a',
  canonicalRunId: 34166127407,
  canonicalJobId: 101877387416,
  canonicalArtifactId: 10034303033,
  canonicalArtifactZipSha256: '17489354c2b3da1a3389c2fa991ac9d444f8eb58d031c030d05e0d20fbed481f',
  apkSha256: '93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6',
  apkBytes: 182090843,
  ps1Blob: 'efe59ef464007c8af9f67fd184926f74e403ca08',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v5.zip',
  priorV4: 'a801bcff3255c0e4e9c76cea1e7de1abd0277db2757eb49699cd254b8d69321e'
};

function assert(cond, message) { if (!cond) throw new Error(message); }
function gitBlobSha1(buffer) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V5', 'R1 v5 schema drifted');
assert(graph.project === 'FinanceSensor', 'project drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.canonicalRunId === expected.canonicalRunId, 'canonical run drifted');
assert(graph.canonicalJobId === expected.canonicalJobId, 'canonical job drifted');
assert(graph.canonicalArtifactId === expected.canonicalArtifactId, 'canonical artifact drifted');
assert(graph.canonicalArtifactZipSha256 === expected.canonicalArtifactZipSha256, 'artifact ZIP digest drifted');
assert(graph.inputApk?.sha256 === expected.apkSha256, 'canonical APK digest drifted');
assert(graph.inputApk?.bytes === expected.apkBytes, 'canonical APK bytes drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36, 'Android security baseline drifted');
assert(graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK verification evidence drifted');
assert(graph.inputApk?.ownedDeviceInstallPass === true && graph.inputApk?.ownedDeviceLaunchPass === true, 'physical installability prerequisite missing');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob, 'PS1 blob authority drifted');
assert(graph.signer?.cmdGitBlob === expected.cmdBlob, 'CMD blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'actual PS1 blob differs from authority');
assert(gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual CMD blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED', 'Windows stdin boundary drifted');
assert(graph.signer?.directPasswordPipe === 'FORBIDDEN', 'direct password pipe boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package drifted');
assert(graph.signer?.exactScope === 'gmail.readonly', 'OAuth scope drifted');

assert(graph.handoffBundle?.name === expected.bundleName, 'v5 bundle name drifted');
assert(graph.handoffBundle?.files === 8, 'v5 bundle must contain exactly 8 files');
assert(graph.handoffBundle?.privateKeyFiles === 0, 'private key boundary drifted');
assert(graph.handoffBundle?.secretLikeValueMatches === 0, 'secret-like material boundary drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.priorV4, 'v5 supersession authority drifted');
if (graph.handoffBundle?.status === 'GENERATION_PENDING') {
  assert(graph.handoffBundle.sha256 === null && graph.handoffBundle.bytes === null, 'pending v5 cannot predeclare bytes');
  assert(graph.handoffBundle.apksignerSha256 === null, 'pending v5 cannot predeclare apksigner digest');
  assert(graph.status === 'BUNDLE_GENERATION_OPEN_PHYSICAL_OPEN', 'staging R1 state drifted');
} else {
  assert(graph.handoffBundle?.status === 'READY', 'bundle status invalid');
  assert(/^[0-9a-f]{64}$/.test(graph.handoffBundle?.sha256 ?? ''), 'ready bundle SHA invalid');
  assert(Number.isInteger(graph.handoffBundle?.bytes) && graph.handoffBundle.bytes > 0, 'ready bundle bytes invalid');
  assert(/^[0-9a-f]{64}$/.test(graph.handoffBundle?.apksignerSha256 ?? ''), 'ready apksigner digest invalid');
  assert(graph.handoffBundle?.zipStructure === 'PASS', 'ZIP structure must PASS');
  assert(graph.handoffBundle?.zipIntegrity === 'PASS', 'ZIP integrity must PASS');
  assert(graph.handoffBundle?.manifestIntegrity === 'PASS', 'manifest integrity must PASS');
  assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob, 'packaged PS1 blob drifted');
  assert(graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'packaged CMD blob drifted');
  assert(graph.status === 'HANDOFF_READY_PHYSICAL_OPEN', 'ready R1 state drifted');
}

for (const superseded of graph.supersededBundles ?? []) {
  assert(superseded.safeToUse === false, `superseded bundle ${superseded.name} must remain unsafe`);
}
const v4 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV4);
assert(v4?.reason === 'ABANDONED_UNMERGED_STAGING_PINNED_TO_SUPERSEDED_ALPHA2_2002_INPUT', '+2002 v4 supersession boundary missing');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 workflow authority drifted');
assert(graph.ciGate?.workflowPath === workflowPath, 'R1 workflow path drifted');
assert(graph.ciGate?.privateSigningMaterialAllowed === false, 'private signing material cannot enter public CI');
assert(graph.ciGate?.bundleGenerationInPublicCi === true, 'public-safe bundle generation must remain enabled');
assert(graph.ciGate?.physicalSigningInPublicCi === false, 'physical signing must remain outside public CI');
assert(graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null, 'R1 physical signing cannot be pre-certified');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream promotion boundary drifted');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.apkBytes), expected.signerSha1, 'function Invoke-ProcessWithStdin', 'RedirectStandardInput = $true', 'RedirectStandardError = $true']) {
  assert(signer.includes(marker), `signer missing robust marker: ${marker}`);
}
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool password pipe is forbidden');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, expected.ps1Blob, expected.cmdBlob, expected.bundleName, 'R1_TRUSTED_EDGE_SIGNING=OPEN', 'BUILD_READY=NO', 'RELEASE_READY=NO']) {
  assert(evidence.includes(marker), `R1 evidence missing marker: ${marker}`);
}
for (const marker of ['node tools/validate-alpha2-canonical-candidate.mjs', 'node tools/validate-alpha2-r1-signing-handoff.mjs', 'R1_TRUSTED_EDGE_SIGNING=OPEN', 'BUILD_READY=NO', 'RELEASE_READY=NO']) {
  assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
}
assert(workflow.includes('contents: read'), 'R1 workflow must retain contents: read');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository secrets');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log(`ALPHA2_R1_BUNDLE_V5=${graph.handoffBundle.status}`);
console.log('ALPHA2_R1_SIGNER_GIT_BLOBS=PASS');
console.log('ALPHA2_R1_WINDOWS_STDIN=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
