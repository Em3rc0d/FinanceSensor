import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signerPath = 'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1';
const signerBuffer = fs.readFileSync(signerPath);
const signer = signerBuffer.toString('utf8');
const expected = {
  candidate: '0.2.0-alpha.2+2009',
  sourceCommit: '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f',
  runId: 34907093765,
  jobId: 104186190632,
  artifactId: 10373012397,
  artifactName: 'financesensor-alpha2-2009-candidate-34907093765',
  artifactZipSha256: 'be86fe57d919a64d09247581ba4140f06763ac24a12b9d83a13fd8ee9188b953',
  artifactZipBytes: 87661365,
  apkSha256: '2a6803c9b48b1e4599c78e6424458972a4aad5fbf18f8dece74b859fbe33a1e8',
  apkBytes: 182514883,
  ps1Blob: '00da4d27f537390b3b88fbe2470cacbfdff638fd',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const gitBlobSha1 = buffer => crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V4', 'canonical schema drifted');
assert(graph.candidate === expected.candidate && graph.sourceCommit === expected.sourceCommit && graph.productSourceCommit === expected.sourceCommit, 'canonical +2009 product identity drifted');
assert(graph.authority?.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
for (const [key, value] of Object.entries({runId:expected.runId,jobId:expected.jobId,artifactId:expected.artifactId,artifactName:expected.artifactName,artifactZipSha256:expected.artifactZipSha256,artifactZipBytes:expected.artifactZipBytes,apkSha256:expected.apkSha256,apkBytes:expected.apkBytes})) assert(graph.authority?.[key] === value, `authority ${key} drifted`);
assert(graph.authority?.minSdk === 31 && graph.authority?.targetSdk === 36 && graph.authority?.compileSdk === 37, 'Android SDK baseline drifted');
assert(graph.authority?.signatureVerify === 'PASS' && graph.authority?.aapt2Parse === 'PASS', 'APK verification gates drifted');
assert(graph.authority?.publicCiSigner === 'EPHEMERAL_DEBUG' && graph.authority?.trustedEdgeResignRequired === true, 'public signer boundary drifted');
assert(graph.authority?.postPasswordSafeStopDiagnostics === true, 'safe-stop diagnostics missing');
assert(graph.authority?.postPasswordImportIsolation === true, 'post-password import isolation missing');
assert(graph.authority?.statementFailureBlocksSafeProjection === false, 'statement failure must not block safe projection');

const sourceConsensus = graph.sourceConsensus ?? {};
assert(sourceConsensus.mergeSha === expected.sourceCommit && sourceConsensus.requiredRuns === 8 && sourceConsensus.successfulRuns === 8 && sourceConsensus.failureRuns === 0, '+2009 source consensus drifted');
const expectedRuns = new Map([
  ['FinanceSensor Mobile Shell',34907093738],['Alpha.2 OD0 Owned-Device Handoff',34907093675],['FinanceSensor Android Gmail Connection',34907093825],['FinanceSensor Heartbeat',34907093744],['Alpha.2 Integrated Runtime',34907093765],['FinanceSensor Statement ETL',34907093734],['Alpha.2 R2 Owned-Device Campaign Contract',34907093648],['FinanceSensor Public Readiness',34907093769]
]);
for (const row of sourceConsensus.runs ?? []) {
  if (expectedRuns.has(row.workflow)) assert(expectedRuns.get(row.workflow) === row.runId && row.conclusion === 'SUCCESS', `source consensus run drifted: ${row.workflow}`);
}
assert((sourceConsensus.runs ?? []).length === expectedRuns.size, 'source consensus run count drifted');
assert(graph.regressionConsensus?.pr === 134 && graph.regressionConsensus?.headSha === '34e2d1f67b27144a1a496919afecc1dd2d78c95f', 'regression consensus identity drifted');
assert((graph.regressionConsensus?.runs ?? []).every(x => x.conclusion === 'SUCCESS') && (graph.regressionConsensus?.runs ?? []).length === 2, 'regression consensus not green');

const physical = graph.physicalInstallabilityObservation ?? {};
assert(physical.status === 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING', 'physical campaign must remain blocked by R1');
assert(physical.installPass === false && physical.launchPass === false && physical.oauthPass === false && physical.inheritanceFromPriorCandidateAllowed === false, 'physical evidence cannot be synthesized or inherited');

assert(graph.signing?.expectedSignerSha1 === expected.signerSha1, 'stable signer drifted');
assert(graph.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && graph.signing?.exactScope === 'gmail.readonly', 'package/scope drifted');
assert(graph.signing?.status === 'OPEN_PRE_SIGNING_CERTIFICATION' && graph.signing?.trustedEdgeSigningPass === false, '+2009 must remain unsigned before trusted-edge step');
assert(graph.signing?.signedApkSha256 === null && graph.signing?.signedApkBytes === null && graph.signing?.receipt === null, 'unsigned +2009 cannot carry signed identity/receipt');
for (const key of ['ownedDeviceInstallPass','ownedDeviceLaunchPass','ownedDeviceStableSignerOauthPass','physicalSqlcipherPass','physicalAlpha2Pass','buildReady','releaseReady']) assert(graph.boundaries?.[key] === false, `${key} must remain false`);
for (const id of ['0.2.0-alpha.2+2001','0.2.0-alpha.2+2002','0.2.0-alpha.2+2003','0.2.0-alpha.2+2004','0.2.0-alpha.2+2005','0.2.0-alpha.2+2006','0.2.0-alpha.2+2007','0.2.0-alpha.2+2008']) assert((graph.nonAuthoritativeCandidates ?? []).some(x => x.candidate === id), `supersession record missing: ${id}`);

assert(gitBlobSha1(signerBuffer) === expected.ps1Blob, 'current +2009 trusted-edge signer blob drifted');
for (const marker of [expected.candidate,expected.sourceCommit,expected.apkSha256,String(expected.apkBytes),String(expected.runId),String(expected.artifactId),expected.signerSha1,'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN','BUILD_READY=NO','RELEASE_READY=NO']) assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
assert(signer.includes("'--ks-pass', 'stdin'") && signer.includes("'--key-pass', 'stdin'") && signer.includes('function Invoke-ProcessWithStdin'), 'native stdin password handoff missing');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');
const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${signerPath}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile', '-Command', psCommand], { encoding: 'utf8' });
if (parsed.error?.code !== 'ENOENT') assert(parsed.error == null && parsed.status === 0, 'PowerShell signer parse failed');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2009');
console.log(`SOURCE_COMMIT=${expected.sourceCommit}`);
console.log(`CANONICAL_APK_SHA256=${expected.apkSha256}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('HUMAN_DISCOVERY_TESTING=FORBIDDEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
