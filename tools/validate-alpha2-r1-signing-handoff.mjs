import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json';
const receipt = JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const expected = {
  candidate:'0.2.0-alpha.2+2009', productSourceCommit:'9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f', sourceCommit:'e19bcccee13e326bbc08012533ddaeba026c633a',
  runId:34913707304, jobId:104206615482, artifactId:10375277563, artifactZipSha256:'1dc730e9c2c0f3465149869b44ffcf27a4a18bc6f3b009e288ce85ca8e4e9ab7',
  apkSha256:'1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717', apkBytes:182514883,
  signedApkSha256:'7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a', signedApkBytes:182538790,
  ps1Blob:'fded88d0f4113d703211eb09316e3d06f9bbf67a', cmdBlob:'3d01373b69051d30f88a57f26fa815e52d952d6d', signerSha1:'63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName:'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip', bundleSha256:'d2bc450d0ecac4ac8aff9e462ba0c9ccaf323d622e997180328aa38d877d545d', bundleBytes:86635677,
  postMergeRunId:34921437444, postMergeArtifactId:10378575848, mergeSha:'184333d3f2946a1d20953c31d9239010253a7837'
};
const assert = (cond,message) => { if (!cond) throw new Error(`ALPHA2_R1_V11_FAILED:${message}`); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V11' && graph.project === 'FinanceSensor' && graph.candidate === expected.candidate, 'identity drifted');
assert(graph.productSourceCommit === expected.productSourceCommit && graph.sourceCommit === expected.sourceCommit, 'source drifted');
for (const [key,value] of Object.entries({canonicalRunId:expected.runId,canonicalJobId:expected.jobId,canonicalArtifactId:expected.artifactId,canonicalArtifactZipSha256:expected.artifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'input APK drifted');
assert(graph.inputApk?.postPasswordImportIsolation === true && graph.inputApk?.statementFailureBlocksSafeProjection === false && graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'repair/non-inheritance evidence missing');
assert(canonical.candidate === expected.candidate && canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.signedApkSha256 === expected.signedApkSha256, 'canonical/R1 signing mismatch');
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.claims?.ownedDeviceUatRequestAllowed === true, 'UAT must be open after signing');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'password transport drifted');

const bundle = graph.handoffBundle ?? {};
assert(bundle.name === expected.bundleName && bundle.status === 'READY_FROZEN', 'bundle not frozen');
assert(bundle.sha256 === expected.bundleSha256 && bundle.bytes === expected.bundleBytes && bundle.files === 8, 'bundle identity drifted');
assert(bundle.privateKeyFiles === 0 && bundle.secretLikeValueMatches === 0 && bundle.zipStructure === 'PASS' && bundle.zipIntegrity === 'PASS' && bundle.manifestIntegrity === 'PASS', 'bundle integrity/security drifted');
assert(bundle.generationReceipt?.status === 'POST_MERGE_CI_PASS' && bundle.generationReceipt?.runId === expected.postMergeRunId && bundle.generationReceipt?.artifactId === expected.postMergeArtifactId && bundle.generationReceipt?.mergeSha === expected.mergeSha, 'post-merge generation receipt drifted');
assert(bundle.generationReceipt?.expectedInnerBundleSha256 === expected.bundleSha256 && bundle.generationReceipt?.expectedInnerBundleBytes === expected.bundleBytes, 'inner bundle identity drifted');
assert(bundle.certificationReceipt === receiptPath, 'certification receipt path drifted');

assert(receipt.schemaVersion === 'A2_R1_PHYSICAL_SIGNING_RECEIPT_V1' && receipt.candidate === expected.candidate, 'receipt identity drifted');
assert(receipt.inputApkSha256 === expected.apkSha256 && receipt.inputApkBytes === expected.apkBytes, 'receipt input identity drifted');
assert(receipt.signedApkSha256 === expected.signedApkSha256 && receipt.signedApkBytes === expected.signedApkBytes && receipt.signerSha1 === expected.signerSha1, 'receipt signed identity drifted');
assert(receipt.trustedEdgeSigningPass === true && receipt.r2OwnedDeviceCampaignUnblocked === true && receipt.sanitizationPass === true && receipt.rawPrivateMaterialCommitted === false, 'receipt trust boundary drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true && graph.physicalReceipt === receiptPath, 'R1 must be PASS');
assert(graph.signedApkSha256 === expected.signedApkSha256 && graph.signedApkBytes === expected.signedApkBytes, 'signed APK identity drifted');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream readiness premature');

for (const marker of [expected.candidate,expected.productSourceCommit,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'RedirectStandardInput = $true','--ks-pass','stdin','--key-pass']) assert(signer.includes(marker), `signer missing marker ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password transport forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh',['-NoProfile','-Command',psCommand],{encoding:'utf8'});
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V11_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V11_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log(`STABLE_SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
