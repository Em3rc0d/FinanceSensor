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
  signedApkSha256: '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab', signedApkBytes: 182145574,
  ps1Blob: 'b6fa7da4d5f14bc7586a7634b5813b8eec0a2c93', cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v9.zip',
  bundleSha256: 'ce8442047a9f5c6df0caf5bc9d0e9337e17ec57d9d600d647b8b4123323751c8', bundleBytes: 86238732,
  priorV8: 'c0932d29235f5e213dd2e830c7641796fa9179795744bc71e4dc9dbc4e3dcb80',
  receiptJson: 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json',
  receiptTxt: 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.txt',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V9', 'R1 v9 schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 +2007 identity drifted');
for (const [key, value] of Object.entries({canonicalRunId:expected.canonicalRunId,canonicalJobId:expected.canonicalJobId,canonicalArtifactId:expected.canonicalArtifactId,canonicalArtifactZipSha256:expected.canonicalArtifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'canonical APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36 && graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK baseline/evidence drifted');
assert(graph.inputApk?.ownedDeviceInstallPass === false && graph.inputApk?.ownedDeviceLaunchPass === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'R1 signing cannot claim OD0 and cannot inherit prior physical claims');
assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'Windows signer boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');

assert(graph.handoffBundle?.name === expected.bundleName && graph.handoffBundle?.status === 'CERTIFIED_USED_ON_TRUSTED_EDGE', 'v9 certified bundle state drifted');
assert(graph.handoffBundle?.sha256 === expected.bundleSha256 && graph.handoffBundle?.bytes === expected.bundleBytes, 'v9 frozen identity drifted');
assert(graph.handoffBundle?.files === 8 && graph.handoffBundle?.privateKeyFiles === 0 && graph.handoffBundle?.secretLikeValueMatches === 0, 'v9 safe bundle boundary drifted');
assert(graph.handoffBundle?.zipStructure === 'PASS' && graph.handoffBundle?.zipIntegrity === 'PASS' && graph.handoffBundle?.manifestIntegrity === 'PASS', 'v9 integrity missing');
assert(graph.handoffBundle?.ps1GitBlobVerified === expected.ps1Blob && graph.handoffBundle?.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer blob binding drifted');
assert(graph.handoffBundle?.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner authority drifted');
assert(graph.handoffBundle?.supersedesBundleSha256 === expected.priorV8, 'v9 supersession drifted');
assert(graph.handoffBundle?.generationReceipt?.foundationMergeSha === '02aa7347897475572035b7d29d05b2fed12e8def', 'v9 post-merge generation receipt SHA drifted');
assert(graph.handoffBundle?.generationReceipt?.workflowRunId === 34485571026 && graph.handoffBundle?.generationReceipt?.artifactId === 10155467626, 'v9 post-merge generation authority drifted');
assert(graph.handoffBundle?.generationReceipt?.artifactDigest === 'sha256:6e2aee9b797c435f05786a4ad1c9f1443261357f4d6cb46f67b4af3702494f9a', 'v9 uploaded artifact digest drifted');
assert(graph.handoffBundle?.certificationReceipt === expected.receiptJson, 'v9 trusted-edge certification receipt drifted');
const oldV8 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV8);
assert(oldV8?.safeToUse === false && /2006|OD3/i.test(oldV8.reason), 'v8 supersession boundary missing');
const historical2006 = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2006');
assert(historical2006?.inheritAsCurrentPass === false && historical2006?.signedApkSha256 === '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0', '+2006 historical receipt isolation missing');

assert(fs.existsSync(expected.receiptJson) && fs.existsSync(expected.receiptTxt), 'current +2007 sanitized receipt pair missing');
assert(graph.physicalReceipt?.path === expected.receiptJson && graph.physicalReceipt?.sourcePath === expected.receiptTxt, 'current +2007 R1 receipt binding drifted');
assert(graph.physicalReceipt?.receivedDate === '2026-09-12' && graph.physicalReceipt?.sanitizationPass === true, 'current +2007 R1 receipt metadata drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true, 'R1 must be certified PASS');
assert(graph.signedApkSha256 === expected.signedApkSha256 && graph.signedApkBytes === expected.signedApkBytes, 'stable +2007 APK identity drifted');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'R1 cannot promote downstream readiness');

for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'function Invoke-ProcessWithStdin','RedirectStandardInput = $true','RedirectStandardError = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');
for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.bundleSha256,String(expected.bundleBytes),'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT','R2_OWNED_DEVICE_CAMPAIGN=READY','OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL','PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO']) assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'R1 public CI permission/secret boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V9_BUNDLE_STATE=CERTIFIED_USED_ON_TRUSTED_EDGE');
console.log(`R1_V9_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`R1_V9_BUNDLE_BYTES=${expected.bundleBytes}`);
console.log(`SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log(`SIGNED_APK_BYTES=${expected.signedApkBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
