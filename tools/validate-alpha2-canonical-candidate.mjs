import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const cmdPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const signerBuffer = fs.readFileSync(signerPath);
const cmdBuffer = fs.readFileSync(cmdPath);
const signer = signerBuffer.toString('utf8');
const expected = {
  candidate: '0.2.0-alpha.2+2009',
  productSourceCommit: '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f',
  sourceCommit: 'e19bcccee13e326bbc08012533ddaeba026c633a',
  certifiedPrHead: '34e2d1f67b27144a1a496919afecc1dd2d78c95f',
  runId: 34913707304,
  jobId: 104206615482,
  artifactId: 10375277563,
  artifactName: 'financesensor-alpha2-2009-candidate-34913707304',
  artifactZipSha256: '1dc730e9c2c0f3465149869b44ffcf27a4a18bc6f3b009e288ce85ca8e4e9ab7',
  artifactZipBytes: 87661360,
  apkSha256: '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717',
  apkBytes: 182514883,
  ps1Blob: 'fded88d0f4113d703211eb09316e3d06f9bbf67a',
  cmdBlob: '3d01373b69051d30f88a57f26fa815e52d952d6d',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
};
const assert = (cond, message) => { if (!cond) throw new Error(`ALPHA2_CANONICAL_2009_FAILED:${message}`); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V5', 'schema drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.productSourceCommit === expected.productSourceCommit, 'product source drifted');
assert(graph.sourceCommit === expected.sourceCommit && graph.certifiedPrHead === expected.certifiedPrHead, 'canonical source authority drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'workflow drifted');
for (const [key, value] of Object.entries({runId:expected.runId,jobId:expected.jobId,artifactId:expected.artifactId,artifactName:expected.artifactName,artifactZipSha256:expected.artifactZipSha256,artifactZipBytes:expected.artifactZipBytes,apkSha256:expected.apkSha256,apkBytes:expected.apkBytes})) assert(graph.authority?.[key] === value, `authority ${key} drifted`);
assert(graph.authority?.minSdk === 31 && graph.authority?.targetSdk === 36 && graph.authority?.compileSdk === 37, 'Android baseline drifted');
assert(graph.authority?.signatureVerify === 'PASS' && graph.authority?.aapt2Parse === 'PASS', 'APK verification missing');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG' && graph.authority?.trustedEdgeResignRequired === true, 'public signer boundary drifted');
assert(graph.authority?.postPasswordSafeStopDiagnostics === true && graph.authority?.postPasswordImportIsolation === true, 'post-password isolation evidence missing');
assert(graph.authority?.statementFailureBlocksSafeProjection === false, 'statement failure must not block safe projection');
assert(graph.physicalInstallabilityObservation?.status === 'BLOCKED_UNTIL_TRUSTED_EDGE_SIGNING', 'physical frontier must be signing-blocked');
assert(graph.physicalInstallabilityObservation?.inheritanceFromPriorCandidateAllowed === false, 'physical evidence inheritance forbidden');
for (const key of ['installPass','launchPass','oauthPass']) assert(graph.physicalInstallabilityObservation?.[key] === false, `${key} must be false`);

const signing = graph.signing ?? {};
assert(signing.expectedSignerSha1 === expected.signerSha1, 'stable signer drifted');
assert(signing.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && signing.exactScope === 'gmail.readonly', 'package/scope drifted');
assert(signing.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && signing.trustedEdgeSigningPass === false, 'current +2009 must remain unsigned before trusted-edge receipt');
assert(signing.signedApkSha256 === null && signing.signedApkBytes === null && signing.receipt === null, 'signed identity must not be synthesized');

const consensus = new Map((graph.postMergeConsensus ?? []).map(x => [x.workflow, x]));
for (const [workflow, runId] of [['Alpha.2 Integrated Runtime',34913707304],['FinanceSensor Heartbeat',34913707411],['FinanceSensor Public Readiness',34913707293],['FinanceSensor Mobile Shell',34913707651]]) {
  const entry = consensus.get(workflow);
  assert(entry?.runId === runId && entry?.conclusion === 'SUCCESS' && entry?.mergeSha === expected.sourceCommit, `post-merge consensus missing: ${workflow}`);
}
for (const id of ['0.2.0-alpha.2+2001','0.2.0-alpha.2+2002','0.2.0-alpha.2+2003','0.2.0-alpha.2+2004','0.2.0-alpha.2+2005','0.2.0-alpha.2+2006','0.2.0-alpha.2+2007','0.2.0-alpha.2+2008']) assert((graph.nonAuthoritativeCandidates ?? []).some(x => x.candidate === id), `supersession missing: ${id}`);
const old2008 = (graph.nonAuthoritativeCandidates ?? []).find(x => x.candidate === '0.2.0-alpha.2+2008');
assert(old2008 && /historical|cannot be inherited|non-inheritable/i.test(old2008.reason), '+2008 non-inheritance boundary missing');
for (const key of ['ownedDeviceInstallPass','ownedDeviceLaunchPass','ownedDeviceStableSignerOauthPass','physicalSqlcipherPass','physicalAlpha2Pass','buildReady','releaseReady']) assert(graph.boundaries?.[key] === false, `${key} must remain false`);
assert(gate.currentCandidate === expected.candidate && gate.preSigning?.requestAllowed === true && gate.claims?.signingRequestAllowed === true, 'pre-signing gate not open for exact +2009');
assert(gate.ownedDeviceUat?.requestAllowed === false && gate.ownedDeviceUat?.humanUatEligible === false, 'UAT must remain blocked before signing');

assert(gitBlobSha1(signerBuffer) === expected.ps1Blob && gitBlobSha1(cmdBuffer) === expected.cmdBlob, 'signer blob drifted');
for (const marker of [expected.candidate,expected.productSourceCommit,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),String(expected.runId),String(expected.artifactId),expected.signerSha1,'--ks-pass','stdin','--key-pass','PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0']) assert(signer.includes(marker), `signer marker missing: ${marker}`);
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2009');
console.log(`CANONICAL_APK_SHA256=${expected.apkSha256}`);
console.log('CANONICAL_APK_FROZEN=YES');
console.log('SIGNING_REQUEST_ALLOWED=YES');
console.log('TRUSTED_EDGE_SIGNING=PENDING');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
