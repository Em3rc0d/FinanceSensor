import fs from 'node:fs';
import crypto from 'node:crypto';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');
const expected = {
  candidate: '0.2.0-alpha.2+2009', sourceCommit: '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f',
  runId: 34907093765, jobId: 104186190632, artifactId: 10373012397,
  zipSha: 'be86fe57d919a64d09247581ba4140f06763ac24a12b9d83a13fd8ee9188b953',
  apkSha: '2a6803c9b48b1e4599c78e6424458972a4aad5fbf18f8dece74b859fbe33a1e8', apkBytes: 182514883,
  ps1Blob: '00da4d27f537390b3b88fbe2470cacbfdff638fd', cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  bundle: 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip'
};
const assert = (c,m) => { if (!c) throw new Error(m); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V11', 'R1 v11 schema drifted');
assert(graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit, 'R1 +2009 identity drifted');
assert(graph.canonicalRunId === expected.runId && graph.canonicalJobId === expected.jobId && graph.canonicalArtifactId === expected.artifactId && graph.canonicalArtifactZipSha256 === expected.zipSha, 'canonical authority drifted');
assert(graph.inputApk?.sha256 === expected.apkSha && graph.inputApk?.bytes === expected.apkBytes, 'input APK identity drifted');
assert(graph.inputApk?.minSdk === 31 && graph.inputApk?.targetSdk === 36 && graph.inputApk?.signatureVerify === 'PASS' && graph.inputApk?.aapt2Parse === 'PASS', 'input APK verification drifted');
assert(graph.inputApk?.postPasswordSafeStopDiagnostics === true && graph.inputApk?.postPasswordImportIsolation === true && graph.inputApk?.statementFailureBlocksSafeProjection === false, '2009 repair contract missing');
assert(graph.inputApk?.physicalClaimsInheritedFromPriorCandidate === false, 'prior physical evidence inheritance forbidden');
assert(graph.signer?.powershellGitBlob === expected.ps1Blob && graph.signer?.cmdGitBlob === expected.cmdBlob, 'signer authority drifted');
assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'actual signer blob differs from authority');
assert(graph.signer?.windowsNativeStdin === 'PROCESS_START_INFO_REDIRECTED' && graph.signer?.directPasswordPipe === 'FORBIDDEN', 'signer password boundary drifted');
assert(graph.signer?.expectedSignerSha1 === expected.signerSha1 && graph.signer?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signer?.exactScope === 'gmail.readonly', 'stable signer/package/scope drifted');

const bundle = graph.handoffBundle ?? {};
assert(bundle.name === expected.bundle && bundle.status === 'GENERATION_PENDING', 'v11 bundle must be generation-pending before postmerge freeze');
assert(bundle.sha256 === null && bundle.bytes === null && bundle.generationReceipt === null && bundle.certificationReceipt === null, 'v11 bytes/receipt cannot be invented before generation');
assert(bundle.files === 8 && bundle.privateKeyFiles === 0 && bundle.secretLikeValueMatches === 0, 'public-safe bundle contract drifted');
assert(bundle.ps1GitBlobExpected === expected.ps1Blob && bundle.cmdGitBlobExpected === expected.cmdBlob, 'bundle signer binding drifted');
assert(bundle.apksignerSha256 === '2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180', 'apksigner identity drifted');
assert((graph.supersededBundles ?? []).some(x => x.name.endsWith('v10.zip') && x.safeToUse === false), 'v10 supersession missing');
assert((graph.historicalPhysicalReceipts ?? []).some(x => x.candidate === '0.2.0-alpha.2+2008' && x.inheritAsCurrentPass === false), '+2008 signing receipt must be historical only');
assert(graph.physicalReceipt === null && graph.status === 'OPEN_PRE_SIGNING_CERTIFICATION' && graph.trustedEdgeSigningPass === false, 'R1 must remain open before +2009 trusted-edge signing');
assert(graph.signedApkSha256 === null && graph.signedApkBytes === null, 'unsigned +2009 cannot have stable signed identity');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'R1 cannot promote downstream readiness');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha, String(expected.apkBytes), expected.signerSha1, 'function Invoke-ProcessWithStdin', 'RedirectStandardInput = $true']) assert(signer.includes(marker), `signer missing marker: ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff forbidden');
for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha, String(expected.apkBytes), expected.bundle]) assert(workflow.includes(marker), `R1 workflow missing +2009/v11 marker: ${marker}`);
assert(workflow.includes('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0') && workflow.includes('BUILD_READY=NO') && workflow.includes('RELEASE_READY=NO'), 'R1 workflow safety markers missing');
assert(!workflow.includes('secrets.'), 'R1 workflow must not reference repository/environment secrets');

console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_V11_BUNDLE_STATE=GENERATION_PENDING');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
