import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2004',
  sourceCommit: '8030a8a2946f7ea288290f64662e52a928d851a3',
  canonicalRunId: 34243314002,
  canonicalJobId: 102118791920,
  canonicalArtifactId: 10063170773,
  canonicalArtifactZipSha256: '346e51e507f0f2328508747afc69234be4217046783ef25bfe872203da848d75',
  apkSha256: '14d8134bd6686291155d411e8938af632f1bba0d6ba1b94b5f86b35b13fbc1c1',
  apkBytes: 182091971,
  ps1Blob: 'f8090c669f1532698b65043d91cb63cdefa2b589',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v6.zip',
  bundleSha256: '6c5c2baa20f7a266d5ec2b45f225124a0a15e7381776c739f091fead5023cd1d',
  bundleBytes: 86227316,
  priorV5: '7f3dbb0570db5e403bb83334cc46590dcc51c1e6d2c12e78f295959ba7f83f33'
};
function assert(cond, message) { if (!cond) throw new Error(message); }
function gitBlobSha1(buffer) { return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex'); }

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V6', 'R1 v6 schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 current identity drifted');
for (const [key, value] of Object.entries({canonicalRunId:expected.canonicalRunId,canonicalJobId:expected.canonicalJobId,canonicalArtifactId:expected.canonicalArtifactId,canonicalArtifactZipSha256:expected.canonicalArtifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'canonical APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36, 'Android baseline drifted');
assert(graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK verification evidence drifted');
assert(graph.inputApk?.ownedDeviceInstallPass === false && graph.inputApk?.ownedDeviceLaunchPass === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'physical claims must be reacquired for +2004');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'Windows signer boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');

assert(graph.handoffBundle?.name === expected.bundleName, 'v6 bundle name drifted');
assert(graph.handoffBundle?.status === 'READY_FROZEN', 'v6 must be frozen before certification');
assert(graph.handoffBundle?.sha256 === expected.bundleSha256 && graph.handoffBundle?.bytes === expected.bundleBytes, 'v6 frozen identity drifted');
assert(graph.handoffBundle?.files === 8 && graph.handoffBundle?.privateKeyFiles === 0 && graph.handoffBundle?.secretLikeValueMatches === 0, 'v6 safe bundle boundary drifted');
assert(graph.handoffBundle?.zipStructure === 'PASS' && graph.handoffBundle?.zipIntegrity === 'PASS' && graph.handoffBundle?.manifestIntegrity === 'PASS', 'v6 integrity missing');
assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob && graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer blob binding drifted');
assert(graph.handoffBundle?.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner authority drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.priorV5, 'v6 must supersede v5');
const generation = graph.handoffBundle?.generationReceipt ?? {};
assert(generation.prNumber === 105 && generation.runId === 34246846876 && generation.jobId === 102130898420 && generation.artifactId === 10064357867, 'v6 generation receipt IDs drifted');
assert(generation.artifactWrapperSha256 === '2dc25ab17a6562a7978f2c81ea7e2f6c29e750074b5f74f90db4afcc45e9ed42', 'v6 wrapper digest drifted');
assert(generation.observedPrHeadSha === 'bee7518dec724863e60d25733a824791846d5c6d', 'v6 observed generation head drifted');
assert(generation.innerBundleSha256 === expected.bundleSha256 && generation.innerBundleBytes === expected.bundleBytes, 'v6 independent generation identity drifted');
assert(generation.independentBundleAudit === 'PASS' && generation.exactHeadRegenerationRequiredBeforeMerge === true, 'v6 generation audit boundary drifted');

const oldV5 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV5);
assert(oldV5?.safeToUse === false && /INVALIDATED_ALPHA2_2003_RUNTIME/.test(oldV5.reason), 'v5 supersession boundary missing');
const historical = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2003');
assert(historical?.inheritAsCurrentPass === false && historical?.signedApkSha256 === '7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6', '+2003 historical receipt isolation missing');

assert(graph.physicalReceipt === null && graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null && graph.signedApkBytes === null, 'current R1 must remain physically open');
assert(graph.status === 'READY_FOR_TRUSTED_EDGE_SIGNING', 'R1 must be ready for trusted-edge signing only');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream promotion boundary drifted');

for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'function Invoke-ProcessWithStdin','RedirectStandardInput = $true','RedirectStandardError = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('$StorePass | & $keytool') && !signer.includes('@($StorePass, $StorePass) | & $java'), 'direct password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

for (const marker of ['node tools/validate-alpha2-canonical-candidate.mjs','node tools/validate-alpha2-r1-signing-handoff.mjs','R1_V6_FROZEN_BYTES=PASS','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','BUILD_READY=NO','RELEASE_READY=NO',expected.bundleSha256,String(expected.bundleBytes)]) assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'R1 public CI permission/secret boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V6_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V6_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`R1_V6_BUNDLE_BYTES=${expected.bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
