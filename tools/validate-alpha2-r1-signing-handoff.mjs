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
  candidate: '0.2.0-alpha.2+2007', sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
  canonicalRunId: 34439978152, canonicalJobId: 102752791279, canonicalArtifactId: 10137701427,
  canonicalArtifactZipSha256: 'ede25e4928bda319c2b335fcb5aa73b1b019af9a9e6234e5e2e5db47def2892c',
  apkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197', apkBytes: 182121475,
  ps1Blob: 'b6fa7da4d5f14bc7586a7634b5813b8eec0a2c93', cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v9.zip',
  bundleSha256: 'ce8442047a9f5c6df0caf5bc9d0e9337e17ec57d9d600d647b8b4123323751c8', bundleBytes: 86238732,
  priorV8: 'c0932d29235f5e213dd2e830c7641796fa9179795744bc71e4dc9dbc4e3dcb80',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V9', 'R1 v9 schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 +2007 identity drifted');
for (const [key, value] of Object.entries({canonicalRunId:expected.canonicalRunId,canonicalJobId:expected.canonicalJobId,canonicalArtifactId:expected.canonicalArtifactId,canonicalArtifactZipSha256:expected.canonicalArtifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'canonical APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36 && graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK baseline/evidence drifted');
assert(graph.inputApk?.ownedDeviceInstallPass === false && graph.inputApk?.ownedDeviceLaunchPass === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'prior physical claims cannot be inherited');
assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'Windows signer boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');

assert(graph.handoffBundle?.name === expected.bundleName && graph.handoffBundle?.status === 'READY_FROZEN', 'v9 frozen bundle state drifted');
assert(graph.handoffBundle?.sha256 === expected.bundleSha256 && graph.handoffBundle?.bytes === expected.bundleBytes, 'v9 frozen identity drifted');
assert(graph.handoffBundle?.files === 8 && graph.handoffBundle?.privateKeyFiles === 0 && graph.handoffBundle?.secretLikeValueMatches === 0, 'v9 safe bundle boundary drifted');
assert(graph.handoffBundle?.zipStructure === 'PASS' && graph.handoffBundle?.zipIntegrity === 'PASS' && graph.handoffBundle?.manifestIntegrity === 'PASS', 'v9 integrity missing');
assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob && graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer blob binding drifted');
assert(graph.handoffBundle?.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner authority drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.priorV8 && graph.handoffBundle?.certificationReceipt === null, 'v9 must supersede v8 without pre-certification');
const oldV8 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV8);
assert(oldV8?.safeToUse === false && /2006|OD3/i.test(oldV8.reason), 'v8 supersession boundary missing');
const historical2006 = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2006');
assert(historical2006?.inheritAsCurrentPass === false && historical2006?.signedApkSha256 === '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0', '+2006 historical receipt isolation missing');

assert(graph.physicalReceipt === null, 'current +2007 R1 may not inherit a physical receipt');
assert(graph.status === 'READY_FOR_TRUSTED_EDGE_SIGNING' && graph.trustedEdgeSigningPass === false, 'R1 must be open for trusted-edge signing');
assert(graph.signedApkSha256 === null && graph.signedApkBytes === null, 'open R1 cannot pre-certify signed APK bytes');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'R1 cannot promote downstream readiness');

for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'function Invoke-ProcessWithStdin','RedirectStandardInput = $true','RedirectStandardError = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');
for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.bundleSha256,String(expected.bundleBytes),'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','R1_TRUSTED_EDGE_SIGNING=OPEN','R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1','PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO']) assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'R1 public CI permission/secret boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V9_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V9_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`R1_V9_BUNDLE_BYTES=${expected.bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
