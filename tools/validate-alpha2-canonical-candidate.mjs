import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signer = fs.readFileSync(signerPath, 'utf8');
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2002',
  certifiedPrHead: '81513c047f8bbf627eae64537be90a5f909328fb',
  sourceCommit: '3e83fbaa74c31b11fb46cccfa3a5c31d882d4093',
  runId: 34163911830,
  jobId: 101871077983,
  artifactId: 10033624133,
  artifactZipSha256: '3f1d463fee5292ccfa1d0ec2b2b316b83183158459fee48af3afd2eca861db6c',
  apkSha256: 'a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf',
  apkBytes: 176012379,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
};

function assert(cond, message) { if (!cond) throw new Error(message); }

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V2', 'schema version drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.certifiedPrHead === expected.certifiedPrHead, 'repair PR head drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.supersedes?.candidate === '0.2.0-alpha.2+2001', 'superseded candidate missing');
assert(graph.supersedes?.reason === 'OWNED_DEVICE_INSTALLABILITY_FAILURE_MINSDK31', 'supersession reason drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
assert(graph.authority?.runId === expected.runId, 'run id drifted');
assert(graph.authority?.jobId === expected.jobId, 'job id drifted');
assert(graph.authority?.artifactId === expected.artifactId, 'artifact id drifted');
assert(graph.authority?.artifactZipSha256 === expected.artifactZipSha256, 'artifact digest drifted');
assert(graph.authority?.apkSha256 === expected.apkSha256, 'apk digest drifted');
assert(graph.authority?.apkBytes === expected.apkBytes, 'apk bytes drifted');
assert(graph.authority?.androidMinSdk === 24, 'minSdk must remain 24');
assert(graph.authority?.androidTargetSdk === 36, 'targetSdk drifted');
assert(graph.authority?.apkSignatureVerify === 'PASS', 'APK signature parser gate missing');
assert(graph.authority?.apkAapt2Parse === 'PASS', 'APK aapt2 parser gate missing');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG', 'public signer boundary drifted');
assert(graph.authority?.trustedEdgeResignRequired === true, 'trusted edge resign boundary drifted');
assert(graph.signing?.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'OAuth package drifted');
assert(graph.signing?.exactScope === 'gmail.readonly', 'OAuth scope drifted');
assert(graph.signing?.trustedEdgeSigningPass === false, 'physical signing cannot be pre-certified');
assert(graph.signing?.signedApkSha256 === null, 'signed apk hash must remain null before physical signing');
assert(graph.boundaries?.physicalSqlcipherPass === false, 'physical SQLCipher cannot be pre-certified');
assert(graph.boundaries?.physicalAlpha2Pass === false, 'physical Alpha.2 cannot be pre-certified');
assert(graph.boundaries?.buildReady === false, 'BUILD_READY must remain false');
assert(graph.boundaries?.releaseReady === false, 'RELEASE_READY must remain false');

const consensus = graph.postMergeConsensus ?? [];
assert(consensus.some(x => x.workflow === 'Alpha.2 Integrated Runtime' && x.runId === expected.runId && x.jobId === expected.jobId && x.conclusion === 'SUCCESS'), 'exact post-merge integrated runtime receipt missing');
const preMerge = (graph.nonAuthoritativeArtifacts ?? []).find(x => x.artifactId === 10033487002);
assert(preMerge?.apkSha256 === '756c1697332e487f748d6a283c8069285aeb08afde5f59806ca0fa202985215d', 'pre-merge corroboration boundary drifted');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.apkBytes), String(expected.runId), String(expected.artifactId), expected.signerSha1]) {
  assert(signer.includes(marker), `signer missing canonical marker: ${marker}`);
  assert(evidence.includes(marker), `evidence missing canonical marker: ${marker}`);
}
assert(signer.includes('function Invoke-ProcessWithStdin'), 'redirected stdin wrapper is required');
assert(signer.includes('RedirectStandardInput = $true') && signer.includes('RedirectStandardError = $true'), 'native process streams must be redirected explicitly');
assert(!signer.includes('$StorePass | & $keytool'), 'direct keytool password pipe is forbidden');
assert(!signer.includes('@($StorePass, $StorePass) | & $java'), 'direct apksigner password pipe is forbidden');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
assert(evidence.includes('BUILD_READY                     NO'), 'evidence must preserve BUILD_READY=NO');
assert(evidence.includes('RELEASE_READY                   NO'), 'evidence must preserve RELEASE_READY=NO');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_.Message};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
assert(parsed.error == null, `pwsh unavailable for signer parser gate: ${parsed.error?.message ?? ''}`);
assert(parsed.status === 0, `PowerShell signer parse failed:\n${parsed.stdout ?? ''}\n${parsed.stderr ?? ''}`);

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('ALPHA2_CANDIDATE=0.2.0-alpha.2+2002');
console.log('APK_SIGNATURE_VERIFY=PASS');
console.log('APK_AAPT2_PARSE=PASS');
console.log('ALPHA2_TRUSTED_EDGE_SIGNER_PARSE=PASS');
console.log('ALPHA2_WINDOWS_NATIVE_STDIN=PASS');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
