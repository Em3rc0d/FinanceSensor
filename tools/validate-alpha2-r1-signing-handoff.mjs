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
  candidate: '0.2.0-alpha.2+2006',
  sourceCommit: 'e26bab7cd87c5e686898998e867d8fb25c99db27',
  canonicalRunId: 34278019055,
  canonicalJobId: 102235745821,
  canonicalArtifactId: 10076715491,
  canonicalArtifactZipSha256: 'f1d958a7134bd56595bbea8680c48099fa4169f3209d17625e1000c81cee5309',
  apkSha256: '11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179',
  apkBytes: 182102047,
  ps1Blob: '91acbc974afcd16e01a14ff531bd1503c812da5b',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v8.zip',
  bundleSha256: 'c0932d29235f5e213dd2e830c7641796fa9179795744bc71e4dc9dbc4e3dcb80',
  bundleBytes: 86232702,
  priorV7: '201cc603e2ce144b0848fbaaa793eaa669119bfeea8ffb027c8eec2fd24ef6b1',
};

function assert(cond, message) { if (!cond) throw new Error(message); }
function gitBlobSha1(buffer) { return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex'); }

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V8', 'R1 v8 schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 current identity drifted');
for (const [key, value] of Object.entries({canonicalRunId:expected.canonicalRunId,canonicalJobId:expected.canonicalJobId,canonicalArtifactId:expected.canonicalArtifactId,canonicalArtifactZipSha256:expected.canonicalArtifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'canonical APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36, 'Android baseline drifted');
assert(graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK verification evidence drifted');
assert(graph.inputApk?.ownedDeviceInstallPass === false && graph.inputApk?.ownedDeviceLaunchPass === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'physical claims must be reacquired for +2006');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'Windows signer boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');

assert(graph.handoffBundle?.name === expected.bundleName && graph.handoffBundle?.status === 'READY_FROZEN', 'v8 frozen bundle state drifted');
assert(graph.handoffBundle?.sha256 === expected.bundleSha256 && graph.handoffBundle?.bytes === expected.bundleBytes, 'v8 frozen identity drifted');
assert(graph.handoffBundle?.files === 8 && graph.handoffBundle?.privateKeyFiles === 0 && graph.handoffBundle?.secretLikeValueMatches === 0, 'v8 safe bundle boundary drifted');
assert(graph.handoffBundle?.zipStructure === 'PASS' && graph.handoffBundle?.zipIntegrity === 'PASS' && graph.handoffBundle?.manifestIntegrity === 'PASS', 'v8 integrity missing');
assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob && graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer blob binding drifted');
assert(graph.handoffBundle?.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner authority drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.priorV7, 'v8 must supersede v7');
if (graph.handoffBundle?.generationReceipt !== null) {
  const generation = graph.handoffBundle.generationReceipt;
  assert(generation.innerBundleSha256 === expected.bundleSha256 && generation.innerBundleBytes === expected.bundleBytes, 'v8 generation identity drifted');
  assert(generation.independentBundleAudit === 'PASS' && generation.exactHeadRegenerationRequiredBeforeMerge === true, 'v8 generation audit boundary drifted');
}

const oldV7 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV7);
assert(oldV7?.safeToUse === false && /SUPERSEDED_ALPHA2_2005_RUNTIME/.test(oldV7.reason), 'v7 supersession boundary missing');
const historical2005 = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2005');
assert(historical2005?.inheritAsCurrentPass === false && historical2005?.signedApkSha256 === '530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85', '+2005 historical receipt isolation missing');

assert(graph.physicalReceipt === null && graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null && graph.signedApkBytes === null, 'current R1 must remain physically open');
assert(graph.status === 'READY_FOR_TRUSTED_EDGE_SIGNING', 'R1 must be ready for trusted-edge signing only');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream promotion boundary drifted');

for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'function Invoke-ProcessWithStdin','RedirectStandardInput = $true','RedirectStandardError = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('$StorePass | & $keytool') && !signer.includes('@($StorePass, $StorePass) | & $java'), 'direct password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

for (const marker of ['node tools/validate-alpha2-canonical-candidate.mjs','node tools/validate-alpha2-r1-signing-handoff.mjs','R1_V8_FROZEN_BYTES=PASS','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1','PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO',expected.bundleSha256,String(expected.bundleBytes)]) assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'R1 public CI permission/secret boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V8_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V8_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`R1_V8_BUNDLE_BYTES=${expected.bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
