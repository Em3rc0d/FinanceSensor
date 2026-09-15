import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');
const expected = {
  candidate: '0.2.0-alpha.2+2009', productSourceCommit: '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f', sourceCommit: 'e19bcccee13e326bbc08012533ddaeba026c633a',
  runId: 34913707304, jobId: 104206615482, artifactId: 10375277563,
  artifactZipSha256: '1dc730e9c2c0f3465149869b44ffcf27a4a18bc6f3b009e288ce85ca8e4e9ab7',
  apkSha256: '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717', apkBytes: 182514883,
  ps1Blob: 'fded88d0f4113d703211eb09316e3d06f9bbf67a', cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundleName: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip', bundleSha256: 'd2bc450d0ecac4ac8aff9e462ba0c9ccaf323d622e997180328aa38d877d545d', bundleBytes: 86635677,
};
const assert = (cond, message) => { if (!cond) throw new Error(`ALPHA2_R1_V11_FAILED:${message}`); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V11', 'schema drifted');
assert(graph.project === 'FinanceSensor' && graph.candidate === expected.candidate, 'identity drifted');
assert(graph.productSourceCommit === expected.productSourceCommit && graph.sourceCommit === expected.sourceCommit, 'source drifted');
for (const [key,value] of Object.entries({canonicalRunId:expected.runId,canonicalJobId:expected.jobId,canonicalArtifactId:expected.artifactId,canonicalArtifactZipSha256:expected.artifactZipSha256})) assert(graph[key] === value, `${key} drifted`);
assert(graph.inputApk?.sha256 === expected.apkSha256 && graph.inputApk?.bytes === expected.apkBytes, 'input APK drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36 && graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'input verification drifted');
assert(graph.inputApk?.postPasswordImportIsolation === true && graph.inputApk?.statementFailureBlocksSafeProjection === false, 'repair evidence missing');
assert(graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'prior physical inheritance forbidden');
assert(canonical.candidate === expected.candidate && canonical.sourceCommit === expected.sourceCommit && canonical.authority?.apkSha256 === expected.apkSha256, 'canonical/R1 authority mismatch');
assert(canonical.signing?.trustedEdgeSigningPass === false && canonical.signing?.status === 'TRUSTED_EDGE_SIGNING_REQUIRED', 'canonical must be awaiting signing');
assert(gate.preSigning?.requestAllowed === true && gate.claims?.signingRequestAllowed === true, 'signing request gate must be open');
assert(gate.ownedDeviceUat?.requestAllowed === false, 'UAT must stay closed before signing');

assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'password transport drifted');

const bundle = graph.handoffBundle ?? {};
assert(bundle.name === expected.bundleName && bundle.status === 'READY_FROZEN', 'bundle not frozen');
assert(bundle.sha256 === expected.bundleSha256 && bundle.bytes === expected.bundleBytes && bundle.files === 8, 'bundle identity drifted');
assert(bundle.privateKeyFiles === 0 && bundle.secretLikeValueMatches === 0, 'bundle secret boundary drifted');
assert(bundle.zipStructure === 'PASS' && bundle.zipIntegrity === 'PASS' && bundle.manifestIntegrity === 'PASS', 'bundle integrity proof missing');
assert(bundle.ps1GitBlobVerified === expected.ps1Blob && bundle.cmdGitBlobVerified === expected.cmdBlob, 'packaged signer binding drifted');
assert(bundle.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner drifted');
assert(bundle.supersedesBundleSha256 === '598b5e7f10f43eb1c1a1b3a9f1df57328e185825d860a13b3f41a75d8201c213', 'v10 supersession missing');
assert(bundle.generationReceipt?.status === 'PENDING_POST_MERGE_CI_RECEIPT', 'generation receipt must remain pending until merge CI');
assert(bundle.certificationReceipt === null, 'certification receipt must not be synthesized');
const old2008 = (graph.historicalPhysicalReceipts ?? []).find(x => x.candidate === '0.2.0-alpha.2+2008');
assert(old2008?.inheritAsCurrentPass === false && old2008?.signedApkSha256 === 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277', '+2008 must be historical');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && graph.trustedEdgeSigningPass === false && graph.physicalReceipt === null, 'R1 must remain pending');
assert(graph.signedApkSha256 === null && graph.signedApkBytes === null, 'signed APK identity cannot exist before receipt');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'downstream readiness premature');

for (const marker of [expected.candidate,expected.productSourceCommit,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),expected.signerSha1,'RedirectStandardInput = $true','--ks-pass','stdin','--key-pass']) assert(signer.includes(marker), `signer missing marker ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password transport forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh',['-NoProfile','-Command',psCommand],{encoding:'utf8'});
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

for (const marker of ['Download exact canonical +2009 artifact','Generate deterministic public-safe v11 handoff bundle',expected.bundleName,expected.bundleSha256,String(expected.bundleBytes),expected.apkSha256,String(expected.apkBytes),'R1_V11_GENERATION=PASS','SIGNING_REQUEST_ALLOWED=YES','R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE','OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0']) assert(workflow.includes(marker), `workflow marker missing: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read') && !workflow.includes('secrets.'), 'workflow public CI boundary drifted');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V11_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V11_BUNDLE_SHA256=${expected.bundleSha256}`);
console.log('SIGNING_REQUEST_ALLOWED=YES');
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
