import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signer = fs.readFileSync(signerPath, 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2004',
  certifiedPrHead: 'b68094b895ce9fddb555115a7eb8efe8ed6adb5a',
  sourceCommit: '8030a8a2946f7ea288290f64662e52a928d851a3',
  runId: 34243314002,
  jobId: 102118791920,
  artifactId: 10063170773,
  artifactName: 'financesensor-alpha2-2004-candidate-34243314002',
  artifactZipSha256: '346e51e507f0f2328508747afc69234be4217046783ef25bfe872203da848d75',
  artifactZipBytes: 87249623,
  apkSha256: '14d8134bd6686291155d411e8938af632f1bba0d6ba1b94b5f86b35b13fbc1c1',
  apkBytes: 182091971,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
};

function assert(cond, message) { if (!cond) throw new Error(message); }

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V3', 'schema version drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.certifiedPrHead === expected.certifiedPrHead, 'certified PR head drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
for (const [key, value] of Object.entries({runId:expected.runId,jobId:expected.jobId,artifactId:expected.artifactId,artifactName:expected.artifactName,artifactZipSha256:expected.artifactZipSha256,artifactZipBytes:expected.artifactZipBytes,apkSha256:expected.apkSha256,apkBytes:expected.apkBytes})) {
  assert(graph.authority?.[key] === value, `authority ${key} drifted`);
}
assert(graph.authority?.minSdk === 31 && graph.authority?.targetSdk === 36 && graph.authority?.compileSdk === 37, 'Android SDK baseline drifted');
assert(graph.authority?.signatureVerify === 'PASS' && graph.authority?.aapt2Parse === 'PASS', 'APK verification gates drifted');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG' && graph.authority?.trustedEdgeResignRequired === true, 'public signer boundary drifted');

const physical = graph.physicalInstallabilityObservation ?? {};
assert(physical.status === 'OPEN_FOR_CURRENT_CANDIDATE', 'current physical installability must be open');
assert(physical.installPass === false && physical.launchPass === false && physical.oauthPass === false, 'physical claims cannot be inherited by +2004');
assert(physical.inheritanceFromPriorCandidateAllowed === false, 'prior-candidate physical inheritance must be forbidden');

assert(graph.signing?.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package drifted');
assert(graph.signing?.exactScope === 'gmail.readonly', 'OAuth scope drifted');
assert(graph.signing?.trustedEdgeSigningPass === false && graph.signing?.signedApkSha256 === null, 'current trusted-edge signing must remain open');
for (const key of ['ownedDeviceInstallPass','ownedDeviceLaunchPass','ownedDeviceStableSignerOauthPass','physicalSqlcipherPass','physicalAlpha2Pass','buildReady','releaseReady']) assert(graph.boundaries?.[key] === false, `${key} must remain false`);

const consensus = new Map((graph.postMergeConsensus ?? []).map(x => [x.workflow, x]));
for (const [workflow, runId] of [['Alpha.2 Integrated Runtime',34243314002],['Alpha.2 Design Freeze',34243319410],['FinanceSensor Heartbeat',34243313877],['FinanceSensor Public Readiness',34243313903]]) {
  assert(consensus.get(workflow)?.runId === runId && consensus.get(workflow)?.conclusion === 'SUCCESS', `post-merge consensus missing: ${workflow}`);
}
const old2003 = (graph.nonAuthoritativeCandidates ?? []).find(x => x.candidate === '0.2.0-alpha.2+2003');
assert(old2003 && /password-dialog/i.test(old2003.reason) && /no R2 physical claim may be inherited/i.test(old2003.reason), '+2003 supersession boundary missing');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.apkBytes), String(expected.runId), String(expected.artifactId), expected.signerSha1, 'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN', 'BUILD_READY=NO', 'RELEASE_READY=NO']) assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
assert(signer.includes("'--ks-pass', 'stdin'") && signer.includes("'--key-pass', 'stdin'"), 'stdin password handoff missing');
assert(signer.includes('function Invoke-ProcessWithStdin') && signer.includes('RedirectStandardInput = $true') && signer.includes('RedirectStandardError = $true'), 'Windows native stdin wrapper drifted');
assert(!signer.includes('$StorePass | & $keytool') && !signer.includes('@($StorePass, $StorePass) | & $java'), 'direct native password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null && parsed.status === 0, `PowerShell signer parse failed: ${parsed.error?.message ?? parsed.stderr ?? ''}`);

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2004');
console.log(`SOURCE_COMMIT=${expected.sourceCommit}`);
console.log(`APK_SHA256=${expected.apkSha256}`);
console.log('CURRENT_PHYSICAL_INSTALLABILITY=OPEN');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
