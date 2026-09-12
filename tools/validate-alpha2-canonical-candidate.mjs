import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signerBuffer = fs.readFileSync(signerPath);
const signer = signerBuffer.toString('utf8');
const expected = {
  candidate: '0.2.0-alpha.2+2007',
  certifiedPrHead: '237803e2c1eceb4b4b6b4af2390ec88ce9032a96',
  sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
  runId: 34439978152,
  jobId: 102752791279,
  artifactId: 10137701427,
  artifactName: 'financesensor-alpha2-2007-candidate-34439978152',
  artifactZipSha256: 'ede25e4928bda319c2b335fcb5aa73b1b019af9a9e6234e5e2e5db47def2892c',
  artifactZipBytes: 87263303,
  apkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197',
  apkBytes: 182121475,
  signedApkSha256: '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab',
  signedApkBytes: 182145574,
  receipt: 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json',
  ps1Blob: 'b6fa7da4d5f14bc7586a7634b5813b8eec0a2c93',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V4', 'canonical schema drifted');
assert(graph.candidate === expected.candidate && graph.certifiedPrHead === expected.certifiedPrHead && graph.sourceCommit === expected.sourceCommit, 'canonical +2007 identity drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
for (const [key, value] of Object.entries({runId:expected.runId,jobId:expected.jobId,artifactId:expected.artifactId,artifactName:expected.artifactName,artifactZipSha256:expected.artifactZipSha256,artifactZipBytes:expected.artifactZipBytes,apkSha256:expected.apkSha256,apkBytes:expected.apkBytes})) {
  assert(graph.authority?.[key] === value, `authority ${key} drifted`);
}
assert(graph.authority?.minSdk === 31 && graph.authority?.targetSdk === 36 && graph.authority?.compileSdk === 37, 'Android SDK baseline drifted');
assert(graph.authority?.signatureVerify === 'PASS' && graph.authority?.aapt2Parse === 'PASS', 'APK verification gates drifted');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG' && graph.authority?.trustedEdgeResignRequired === true, 'public signer boundary drifted');

const physical = graph.physicalInstallabilityObservation ?? {};
assert(physical.status === 'OPEN_FOR_CURRENT_CANDIDATE', 'OD0 physical installability must remain open until observed');
assert(physical.installPass === false && physical.launchPass === false && physical.oauthPass === false && physical.inheritanceFromPriorCandidateAllowed === false, '+2006 physical evidence cannot be inherited');
assert(/stable trusted-edge|OD0/i.test(physical.reason ?? ''), 'canonical physical boundary must identify stable signing and OD0 reacquisition');

assert(graph.signing?.expectedSignerSha1 === expected.signerSha1 && graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signing?.exactScope === 'gmail.readonly', 'signer/package/scope drifted');
assert(graph.signing?.trustedEdgeSigningPass === true, 'trusted-edge signing PASS must be bound');
assert(graph.signing?.signedApkSha256 === expected.signedApkSha256 && graph.signing?.signedApkBytes === expected.signedApkBytes, 'stable signed APK identity drifted');
assert(graph.signing?.receipt === expected.receipt && fs.existsSync(expected.receipt), 'current +2007 signing receipt binding missing');
for (const key of ['ownedDeviceInstallPass','ownedDeviceLaunchPass','ownedDeviceStableSignerOauthPass','physicalSqlcipherPass','physicalAlpha2Pass','buildReady','releaseReady']) assert(graph.boundaries?.[key] === false, `${key} must remain false`);

const consensus = new Map((graph.postMergeConsensus ?? []).map(x => [x.workflow, x]));
for (const [workflow, runId] of [['Alpha.2 Integrated Runtime',34439978152],['Alpha.2 Design Freeze',34439980772],['FinanceSensor Heartbeat',34439978151],['FinanceSensor Public Readiness',34439978414]]) {
  assert(consensus.get(workflow)?.runId === runId && consensus.get(workflow)?.conclusion === 'SUCCESS', `post-merge consensus missing: ${workflow}`);
}
const r1Consensus = (graph.postMergeConsensus ?? []).find(x => x.workflow === 'Alpha.2 R1 Trusted-Edge Signing' && x.runId === 34485571026);
const r2Consensus = (graph.postMergeConsensus ?? []).find(x => x.workflow === 'Alpha.2 R2 Owned-Device Campaign Contract' && x.runId === 34485571147);
assert(r1Consensus?.conclusion === 'SUCCESS' && r1Consensus?.mergeSha === '02aa7347897475572035b7d29d05b2fed12e8def', 'post-merge R1 v9 consensus missing');
assert(r2Consensus?.conclusion === 'SUCCESS' && r2Consensus?.mergeSha === '02aa7347897475572035b7d29d05b2fed12e8def', 'post-merge R2 reset consensus missing');

const old2006 = (graph.nonAuthoritativeCandidates ?? []).find(x => x.candidate === '0.2.0-alpha.2+2006');
assert(old2006 && /no \+2006 R1\/R2 physical claim may be inherited by \+2007/i.test(old2006.reason), '+2006 physical supersession boundary missing');
for (const id of ['0.2.0-alpha.2+2001','0.2.0-alpha.2+2002','0.2.0-alpha.2+2003','0.2.0-alpha.2+2004','0.2.0-alpha.2+2005','0.2.0-alpha.2+2006']) assert((graph.nonAuthoritativeCandidates ?? []).some(x => x.candidate === id), `supersession record missing: ${id}`);

assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'current trusted-edge signer blob drifted');
for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),String(expected.runId),String(expected.artifactId),expected.signerSha1,'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN','BUILD_READY=NO','RELEASE_READY=NO']) assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
assert(signer.includes("'--ks-pass', 'stdin'") && signer.includes("'--key-pass', 'stdin'") && signer.includes('function Invoke-ProcessWithStdin'), 'native stdin password handoff missing');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2007');
console.log(`SOURCE_COMMIT=${expected.sourceCommit}`);
console.log(`CANONICAL_APK_SHA256=${expected.apkSha256}`);
console.log(`SIGNED_APK_SHA256=${expected.signedApkSha256}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('CURRENT_PHYSICAL_INSTALLABILITY=OPEN_OD0');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
