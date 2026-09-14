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
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.json';
const sourceReceiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.txt';
const expected = {
  candidate: '0.2.0-alpha.2+2008',
  sourceCommit: '45b605d29fe0b90f528e4f0f952ab878080b2f0b',
  canonicalRunId: 34874126273,
  canonicalJobId: 104076982845,
  canonicalArtifactId: 10360246203,
  canonicalArtifactZipSha256: 'f517fac8277bfdfe589758712cb30d3199e8a9415d6a5ea08b4903cee8e03cca',
  apkSha256: 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238',
  apkBytes: 182515867,
  signedApkSha256: 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277',
  signedApkBytes: 182538790,
  ps1Blob: 'd782f03bb97ca0910436500080bcaf10efc00161',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v10.zip',
  bundleSha256: '598b5e7f10f43eb1c1a1b3a9f1df57328e185825d860a13b3f41a75d8201c213',
  bundleBytes: 86635935,
  foundationMergeSha: '9e38048f88ac9b54589ab5ae7a42e64ed83f1db6',
  postMergeRunId: 34882888075,
  postMergeArtifactId: 10364270078,
  postMergeArtifactDigest: 'sha256:4dd8bd89cd7850e57d2abeb295fc551382a0342a36ca49698a650c983b9ca364',
  postMergeArtifactBytes: 86267875,
  priorV9: 'ce8442047a9f5c6df0caf5bc9d0e9337e17ec57d9d600d647b8b4123323751c8',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V10', 'R1 v10 schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 +2008 identity drifted');
for (const [key, value] of Object.entries({canonicalRunId:expected.canonicalRunId,canonicalJobId:expected.canonicalJobId,canonicalArtifactId:expected.canonicalArtifactId,canonicalArtifactZipSha256:expected.canonicalArtifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'canonical APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36 && graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'APK baseline/evidence drifted');
assert(graph.inputApk?.postPasswordSafeStopDiagnostics === true, '+2008 safe-stop diagnostics not bound');
assert(graph.inputApk?.ownedDeviceInstallPass === false && graph.inputApk?.ownedDeviceLaunchPass === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'R1 cannot claim OD0 or inherit prior physical claims');
assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer blob authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'Windows signer boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');

const bundle = graph.handoffBundle ?? {};
assert(bundle.name === expected.bundleName && bundle.status === 'READY_FROZEN', 'v10 bundle must remain frozen');
assert(bundle.sha256 === expected.bundleSha256 && bundle.bytes === expected.bundleBytes, 'v10 frozen inner bundle identity drifted');
assert(bundle.files === 8 && bundle.privateKeyFiles === 0 && bundle.secretLikeValueMatches === 0, 'v10 safe bundle boundary drifted');
assert(bundle.zipStructure === 'PASS' && bundle.zipIntegrity === 'PASS' && bundle.manifestIntegrity === 'PASS', 'v10 integrity proof missing');
assert(bundle.ps1GitBlobVerified === expected.ps1Blob && bundle.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer binding drifted');
assert(bundle.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner authority drifted');
assert(bundle.supersedesBundleSha256 === expected.priorV9, 'v10 supersession drifted');
const generation = bundle.generationReceipt ?? {};
assert(generation.foundationMergeSha === expected.foundationMergeSha && generation.workflowRunId === expected.postMergeRunId && generation.artifactId === expected.postMergeArtifactId, 'post-merge R1 generation authority drifted');
assert(generation.artifactDigest === expected.postMergeArtifactDigest && generation.artifactBytes === expected.postMergeArtifactBytes, 'post-merge wrapper artifact identity drifted');
assert(generation.innerBundleSha256 === expected.bundleSha256 && generation.innerBundleBytes === expected.bundleBytes, 'post-merge inner bundle receipt drifted');
const certification = bundle.certificationReceipt ?? {};
assert(certification.receiptPath === receiptPath && certification.sourcePath === sourceReceiptPath && certification.receivedDate === '2026-09-14', 'trusted-edge certification receipt binding drifted');
assert(certification.signedApkSha256 === expected.signedApkSha256 && certification.signedApkBytes === expected.signedApkBytes && certification.signerSha1 === expected.signerSha1, 'trusted-edge certification identity drifted');
assert(certification.sanitizationPass === true && certification.userOriginated === true && certification.publicCiOriginated === false, 'trusted-edge certification provenance drifted');
const oldV9 = (graph.supersededBundles ?? []).find(x => x.sha256 === expected.priorV9);
assert(oldV9?.safeToUse === false && /2007|safe-stop|diagnostic/i.test(oldV9.reason), 'v9 supersession boundary missing');
const historical2007 = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2007');
assert(historical2007?.inheritAsCurrentPass === false && historical2007?.signedApkSha256 === '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab', '+2007 historical receipt isolation missing');

assert(graph.physicalReceipt?.path === receiptPath && graph.physicalReceipt?.sourcePath === sourceReceiptPath && graph.physicalReceipt?.receivedDate === '2026-09-14' && graph.physicalReceipt?.sanitizationPass === true, '+2008 physical receipt binding drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true, 'R1 +2008 PASS missing');
assert(graph.signedApkSha256 === expected.signedApkSha256 && graph.signedApkBytes === expected.signedApkBytes, '+2008 stable signed APK identity drifted');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'R1 cannot promote downstream readiness');

for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'function Invoke-ProcessWithStdin','RedirectStandardInput = $true','RedirectStandardError = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

for (const marker of ['Download exact canonical +2008 artifact','Generate deterministic public-safe v10 handoff bundle',expected.bundleName,expected.bundleSha256,String(expected.bundleBytes),expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),'R1_V10_GENERATION=PASS','R1_V10_FROZEN_BYTES=PASS','R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT','R2_PHYSICAL_CAMPAIGN=IN_PROGRESS','OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO']) assert(workflow.includes(marker), `R1 workflow missing marker: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'R1 public CI permission/secret boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V10_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V10_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log(`R1_V10_BUNDLE_BYTES=${expected.bundleBytes}`);
console.log(`R1_V10_POSTMERGE_RUN_ID=${expected.postMergeRunId}`);
console.log(`STABLE_SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
