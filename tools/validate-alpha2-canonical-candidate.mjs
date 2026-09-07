import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const signer = fs.readFileSync('tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1', 'utf8');
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md', 'utf8');

const expected = {
  candidate: '0.2.0-alpha.2+2001',
  certifiedPrHead: '3640244fb12aabf818b002399f3b7cc28fbde14c',
  sourceCommit: 'f658363772b8d3652a81a8a4275a571f2f409ed8',
  runId: 34082101187,
  jobId: 101619210181,
  artifactId: 10004110513,
  artifactZipSha256: '812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736',
  apkSha256: '7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f',
  apkBytes: 182053563,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(graph.schemaVersion === 'A2_CANONICAL_CANDIDATE_RECEIPT_V1', 'schema version drifted');
assert(graph.candidate === expected.candidate, 'candidate drifted');
assert(graph.certifiedPrHead === expected.certifiedPrHead, 'certified PR head drifted');
assert(graph.sourceCommit === expected.sourceCommit, 'source commit drifted');
assert(graph.authority.workflow === 'Alpha.2 Integrated Runtime', 'canonical workflow drifted');
assert(graph.authority.runId === expected.runId, 'run id drifted');
assert(graph.authority.jobId === expected.jobId, 'job id drifted');
assert(graph.authority.artifactId === expected.artifactId, 'artifact id drifted');
assert(graph.authority.artifactZipSha256 === expected.artifactZipSha256, 'artifact digest drifted');
assert(graph.authority.apkSha256 === expected.apkSha256, 'apk digest drifted');
assert(graph.authority.apkBytes === expected.apkBytes, 'apk bytes drifted');
assert(graph.authority.publicCiSigner === 'EPHEMERAL_DEBUG', 'public signer boundary drifted');
assert(graph.authority.trustedEdgeResignRequired === true, 'trusted edge resign boundary drifted');
assert(graph.signing.expectedSignerSha1 === expected.signerSha1, 'stable signer identity drifted');
assert(graph.signing.trustedEdgeSigningPass === false, 'physical signing cannot be pre-certified');
assert(graph.signing.signedApkSha256 === null, 'signed apk hash must remain null before physical signing');
assert(graph.boundaries.physicalSqlcipherPass === false, 'physical SQLCipher cannot be pre-certified');
assert(graph.boundaries.physicalAlpha2Pass === false, 'physical Alpha.2 cannot be pre-certified');
assert(graph.boundaries.buildReady === false, 'BUILD_READY must remain false');
assert(graph.boundaries.releaseReady === false, 'RELEASE_READY must remain false');

const consensus = new Map(graph.postMergeConsensus.map((x) => [x.workflow, x]));
for (const workflow of [
  'Alpha.2 Integrated Runtime',
  'FinanceSensor Mobile Shell',
  'FinanceSensor Android Human Test Alpha',
  'FinanceSensor Android Gmail Connection',
  'FinanceSensor Statement ETL Contract',
  'FinanceSensor Public Readiness',
  'Alpha.2 Design Freeze',
  'FinanceSensor Heartbeat'
]) {
  assert(consensus.has(workflow), `missing post-merge consensus workflow: ${workflow}`);
}
assert(consensus.get('FinanceSensor Android Human Test Alpha').conclusion === 'SUCCESS_REGRESSION_ONLY', 'legacy Human Test must remain regression-only');

const legacy = graph.nonAuthoritativeArtifacts.find((x) => x.artifactId === 10004093091);
assert(legacy && legacy.apkSha256 === '1525db5ae9ace01e7201ec8f529121c52efa6e414114e8a3cc661ba5ef14c3f9', 'legacy Human Test exclusion drifted');

for (const marker of [
  expected.candidate,
  expected.sourceCommit,
  expected.apkSha256,
  String(expected.apkBytes),
  String(expected.runId),
  String(expected.artifactId),
  expected.signerSha1,
  'ALPHA2_MOBILE_INTEGRATION_CI=PASS',
  'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) {
  assert(signer.includes(marker), `signer missing frozen marker: ${marker}`);
}
assert(signer.includes('--ks-pass stdin') && signer.includes('--key-pass stdin'), 'signer must use stdin password handoff');
assert(!signer.includes('FINANCESENSOR_R2_STORE_PASS') && !signer.includes('FINANCESENSOR_R2_KEY_PASS'), 'environment password handoff is forbidden');

for (const marker of [expected.candidate, expected.sourceCommit, expected.apkSha256, String(expected.artifactId)]) {
  assert(evidence.includes(marker), `evidence missing canonical marker: ${marker}`);
}
assert(evidence.includes('BUILD_READY                     NO'), 'evidence must preserve BUILD_READY=NO');
assert(evidence.includes('RELEASE_READY                   NO'), 'evidence must preserve RELEASE_READY=NO');

console.log('ALPHA2_CANONICAL_CANDIDATE_RECEIPT=PASS');
