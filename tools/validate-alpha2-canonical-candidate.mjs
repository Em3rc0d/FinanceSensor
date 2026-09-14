import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signerBuffer = fs.readFileSync(signerPath);
const signer = signerBuffer.toString('utf8');
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.json';
const expected = {
  candidate: '0.2.0-alpha.2+2008',
  certifiedPrHead: 'db1852fb938df79608d1969799cc6c11216743b8',
  sourceCommit: '45b605d29fe0b90f528e4f0f952ab878080b2f0b',
  runId: 34874126273,
  jobId: 104076982845,
  artifactId: 10360246203,
  artifactName: 'financesensor-alpha2-2008-candidate-34874126273',
  artifactZipSha256: 'f517fac8277bfdfe589758712cb30d3199e8a9415d6a5ea08b4903cee8e03cca',
  artifactZipBytes: 87661508,
  apkSha256: 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238',
  apkBytes: 182515867,
  signedApkSha256: 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277',
  signedApkBytes: 182538790,
  ps1Blob: 'd782f03bb97ca0910436500080bcaf10efc00161',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V4', 'canonical schema drifted');
assert(graph.candidate === expected.candidate && graph.certifiedPrHead === expected.certifiedPrHead && graph.sourceCommit === expected.sourceCommit, 'canonical +2008 identity drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
for (const [key, value] of Object.entries({runId:expected.runId,jobId:expected.jobId,artifactId:expected.artifactId,artifactName:expected.artifactName,artifactZipSha256:expected.artifactZipSha256,artifactZipBytes:expected.artifactZipBytes,apkSha256:expected.apkSha256,apkBytes:expected.apkBytes})) assert(graph.authority?.[key] === value, `authority ${key} drifted`);
assert(graph.authority?.minSdk === 31 && graph.authority?.targetSdk === 36 && graph.authority?.compileSdk === 37, 'Android SDK baseline drifted');
assert(graph.authority?.signatureVerify === 'PASS' && graph.authority?.aapt2Parse === 'PASS', 'APK verification gates drifted');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG' && graph.authority?.trustedEdgeResignRequired === true, 'public signer boundary drifted');
assert(graph.authority?.postPasswordSafeStopDiagnostics === true, '+2008 post-password diagnostics marker missing');

const physical = graph.physicalInstallabilityObservation ?? {};
assert(physical.status === 'READY_FOR_OD0_CURRENT_CANDIDATE', 'current physical state must be ready for OD0 after R1 PASS');
assert(physical.installPass === false && physical.launchPass === false && physical.oauthPass === false && physical.inheritanceFromPriorCandidateAllowed === false, 'OD0/OD1 physical evidence cannot be synthesized or inherited');
assert(/stable trusted-edge signing|OD0|exact signed APK/i.test(physical.reason ?? ''), 'canonical physical boundary must identify OD0 reacquisition');

assert(graph.signing?.expectedSignerSha1 === expected.signerSha1, 'stable signer drifted');
assert(graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signing?.exactScope === 'gmail.readonly', 'package/scope drifted');
assert(graph.signing?.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.signing?.trustedEdgeSigningPass === true, '+2008 signing PASS missing');
assert(graph.signing?.signedApkSha256 === expected.signedApkSha256 && graph.signing?.signedApkBytes === expected.signedApkBytes && graph.signing?.receipt === receiptPath, '+2008 stable-signed identity/receipt drifted');
assert(fs.existsSync(receiptPath), 'current +2008 signing receipt missing');
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
assert(receipt.candidate === expected.candidate && receipt.sourceCommit === expected.sourceCommit && receipt.inputApkSha256 === expected.apkSha256 && receipt.inputApkBytes === expected.apkBytes, 'current receipt canonical binding drifted');
assert(receipt.signedApkSha256 === expected.signedApkSha256 && receipt.signedApkBytes === expected.signedApkBytes && receipt.signerSha1 === expected.signerSha1 && receipt.sanitizationPass === true, 'current receipt signing evidence drifted');

for (const key of ['ownedDeviceInstallPass','ownedDeviceLaunchPass','ownedDeviceStableSignerOauthPass','physicalSqlcipherPass','physicalAlpha2Pass','buildReady','releaseReady']) assert(graph.boundaries?.[key] === false, `${key} must remain false`);

const consensus = new Map((graph.postMergeConsensus ?? []).map(x => [x.workflow, x]));
for (const [workflow, runId] of [['Alpha.2 Integrated Runtime',34874126273],['FinanceSensor Heartbeat',34874126346],['FinanceSensor Public Readiness',34874126366],['FinanceSensor Mobile Shell',34874126458],['Alpha.2 R2 Owned-Device Campaign Contract',34874126286]]) {
  const entry = consensus.get(workflow);
  assert(entry?.runId === runId && entry?.conclusion === 'SUCCESS' && entry?.mergeSha === expected.sourceCommit, `post-merge consensus missing: ${workflow}`);
}
for (const id of ['0.2.0-alpha.2+2001','0.2.0-alpha.2+2002','0.2.0-alpha.2+2003','0.2.0-alpha.2+2004','0.2.0-alpha.2+2005','0.2.0-alpha.2+2006','0.2.0-alpha.2+2007']) assert((graph.nonAuthoritativeCandidates ?? []).some(x => x.candidate === id), `supersession record missing: ${id}`);
const old2007 = (graph.nonAuthoritativeCandidates ?? []).find(x => x.candidate === '0.2.0-alpha.2+2007');
assert(old2007 && /historical|cannot be inherited|non-inheritable/i.test(old2007.reason), '+2007 non-inheritance boundary missing');

assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'current +2008 trusted-edge signer blob drifted');
for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),String(expected.runId),String(expected.artifactId),expected.signerSha1,'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN','BUILD_READY=NO','RELEASE_READY=NO']) assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
assert(signer.includes("'--ks-pass', 'stdin'") && signer.includes("'--key-pass', 'stdin'") && signer.includes('function Invoke-ProcessWithStdin'), 'native stdin password handoff missing');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2008');
console.log(`SOURCE_COMMIT=${expected.sourceCommit}`);
console.log(`CANONICAL_APK_SHA256=${expected.apkSha256}`);
console.log(`STABLE_SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('R2_NEXT_GATE=OD0');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
