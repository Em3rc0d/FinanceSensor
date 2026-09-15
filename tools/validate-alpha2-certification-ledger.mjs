import fs from 'node:fs';
import crypto from 'node:crypto';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const ledger = read('graph/alpha2-certification-ledger.json');
const canonical = read('graph/alpha2-canonical-candidate.json');
const r1 = read('graph/alpha2-r1-signing-handoff.json');
const r2 = read('graph/alpha2-r2-owned-device-campaign.json');
const human = read('graph/alpha2-human-intervention-gate.json');
const fail = message => { throw new Error(`ALPHA2_CERT_LEDGER_FAILED:${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

const sortRecursive = value => {
  if (Array.isArray(value)) return value.map(sortRecursive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortRecursive(value[key])]));
  }
  return value;
};
const stableStringify = value => JSON.stringify(sortRecursive(value));
const blockHash = block => {
  const { blockHash: ignored, ...core } = block;
  return crypto.createHash('sha256')
    .update(`${ledger.blockHashDomain}\n${stableStringify(core)}`, 'utf8')
    .digest('hex');
};
const findKind = kind => ledger.blocks.find(block => block.kind === kind);

assert(ledger.schemaVersion === 'A2_CERTIFICATION_LEDGER_V1', 'schema');
assert(ledger.chainId === 'FINANCESENSOR_ALPHA2_2012_PRE_SIGNING', 'chain id');
assert(ledger.candidate === '0.2.0-alpha.2+2012', 'candidate');
assert(ledger.hashAlgorithm === 'SHA-256', 'hash algorithm');
assert(ledger.canonicalization === 'RECURSIVE_KEY_SORTED_JSON_UTF8_V1', 'canonicalization');
assert(ledger.blockHashDomain === 'FINANCESENSOR_ALPHA2_CERT_BLOCK_V1', 'hash domain');
assert(ledger.state === 'PRE_SIGNING_CONSENSUS_FROZEN', 'state');
assert(ledger.nextGate === 'R1_TRUSTED_EDGE_SIGNING', 'next gate');
assert(Array.isArray(ledger.blocks) && ledger.blocks.length === 6, 'block count');

const expectedKinds = [
  'PRODUCT_SOURCE_MERGE',
  'CANONICAL_BUILD_FREEZE',
  'CANONICAL_GOVERNANCE_PROMOTION',
  'R1_POST_MERGE_REPRODUCTION',
  'PUBLIC_CONSENSUS_REMEDIATION',
  'PRE_SIGNING_FRONTIER',
];
for (let index = 0; index < ledger.blocks.length; index += 1) {
  const block = ledger.blocks[index];
  assert(block.height === index, `height:${index}`);
  assert(block.kind === expectedKinds[index], `kind:${index}`);
  assert(block.parentBlockHash === (index === 0 ? null : ledger.blocks[index - 1].blockHash), `parent:${index}`);
  assert(blockHash(block) === block.blockHash, `hash:${index}`);
}
assert(ledger.genesisBlockHash === ledger.blocks[0].blockHash, 'genesis pointer');
assert(ledger.headBlockHash === ledger.blocks.at(-1).blockHash, 'head pointer');
assert(ledger.genesisBlockHash === '5753f562ee49c5b964010b541510c25e06b4d068055501227f0aa42328523893', 'genesis identity');
assert(ledger.headBlockHash === '4fddbd426678fc8b16449ce345d2eca0aa1df45efd22ac33a73adbb7273ffae5', 'head identity');

const source = findKind('PRODUCT_SOURCE_MERGE').payload;
assert(source.candidate === canonical.candidate, 'source candidate');
assert(source.productSourceCommit === canonical.productSourceCommit, 'source product commit');
assert(source.mergeSha === canonical.sourceCommit, 'source merge sha');
assert(source.physicalEvidenceInherited === false, 'source inheritance');

const build = findKind('CANONICAL_BUILD_FREEZE').payload;
assert(build.runId === canonical.authority.runId && build.jobId === canonical.authority.jobId, 'canonical run/job');
assert(build.artifactId === canonical.authority.artifactId && build.artifactName === canonical.authority.artifactName, 'canonical artifact');
assert(build.artifactZipSha256 === canonical.authority.artifactZipSha256 && build.artifactZipBytes === canonical.authority.artifactZipBytes, 'canonical wrapper');
assert(build.unsignedApkSha256 === canonical.authority.apkSha256 && build.unsignedApkBytes === canonical.authority.apkBytes, 'canonical apk');
assert(build.signatureVerify === 'PASS' && build.aapt2Parse === 'PASS', 'canonical apk gates');

const promotion = findKind('CANONICAL_GOVERNANCE_PROMOTION').payload;
assert(promotion.pullRequest === 141, 'promotion PR');
assert(promotion.headSha === '42bcb13416cd87eeaf54c54b8fa981100d723280', 'promotion head');
assert(promotion.mergeSha === 'c9ca769a86de58a77121b42d4b3520c7420441ae', 'promotion merge');
assert(Array.isArray(promotion.preMergeConsensus) && promotion.preMergeConsensus.length === 7, 'promotion consensus count');
assert(promotion.preMergeConsensus.every(item => item.conclusion === 'SUCCESS'), 'promotion consensus conclusions');
assert(new Set(promotion.preMergeConsensus.map(item => item.runId)).size === 7, 'promotion consensus unique runs');
assert(promotion.supersededSignedCandidate?.candidate === '0.2.0-alpha.2+2009', 'superseded candidate');
assert(promotion.supersededSignedCandidate?.signedApkSha256 === '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a', 'superseded signed apk');
assert(promotion.supersededSignedCandidate?.inheritPhysicalPass === false, 'superseded inheritance');
assert(r2.historicalInvalidatedCampaign?.candidate === '0.2.0-alpha.2+2009' && r2.historicalInvalidatedCampaign?.evidenceInheritanceAllowed === false, 'R2 historical invalidation');

const reproduction = findKind('R1_POST_MERGE_REPRODUCTION').payload;
const receipt = r1.handoffBundle?.generationReceipt;
assert(reproduction.governanceParentMergeSha === receipt?.governanceMergeSha, 'R1 governance parent');
assert(reproduction.runId === receipt?.runId && reproduction.jobId === receipt?.jobId && reproduction.artifactId === receipt?.artifactId, 'R1 run identity');
assert(reproduction.wrapperArtifactSha256 === receipt?.wrapperArtifactSha256, 'R1 wrapper hash');
assert(reproduction.innerBundleSha256 === r1.handoffBundle?.sha256 && reproduction.innerBundleSha256 === receipt?.observedInnerBundleSha256, 'R1 inner hash');
assert(reproduction.innerBundleBytes === r1.handoffBundle?.bytes && reproduction.innerBundleBytes === receipt?.observedInnerBundleBytes, 'R1 inner bytes');
assert(reproduction.innerBundleFiles === r1.handoffBundle?.files, 'R1 files');
assert(reproduction.manifestIntegrity === 'PASS' && receipt?.manifestIntegrity === 'PASS', 'R1 manifest');
assert(reproduction.privateSigningMaterialInCi === false && r1.ciGate?.privateSigningMaterialAllowed === false, 'R1 private material');
assert(reproduction.trustedEdgeSigningPass === false && r1.trustedEdgeSigningPass === false, 'R1 signing boundary');

const remediation = findKind('PUBLIC_CONSENSUS_REMEDIATION').payload;
assert(remediation.parentGovernanceMergeSha === promotion.mergeSha, 'remediation parent merge');
assert(remediation.pullRequest === 142, 'remediation PR');
assert(remediation.headSha === '0c54201b82190f5ea584abfd27da3f58b9690ec2', 'remediation head');
assert(remediation.mergeSha === '266705200a48269cf1a4c12886a729b3622f20b5', 'remediation merge');
assert(remediation.reason === 'PUBLIC_READINESS_PERMISSION_PARSER_SEMANTICS', 'remediation reason');
assert(remediation.productMutation === false && remediation.canonicalApkMutation === false && remediation.r1BundleMutation === false, 'remediation mutation boundary');
assert(remediation.preMergePublicReadinessRunId === 34996625088 && remediation.preMergeConclusion === 'SUCCESS', 'remediation pre-merge consensus');
assert(remediation.postMergePublicReadinessRunId === 34996818145 && remediation.postMergeConclusion === 'SUCCESS', 'remediation post-merge consensus');

const frontier = findKind('PRE_SIGNING_FRONTIER').payload;
assert(frontier.candidate === canonical.candidate && frontier.candidate === r1.candidate && frontier.candidate === r2.candidate?.id, 'frontier candidate');
assert(frontier.canonicalUnsignedApkSha256 === canonical.authority.apkSha256 && frontier.canonicalUnsignedApkSha256 === r1.inputApk?.sha256 && frontier.canonicalUnsignedApkSha256 === r2.candidate?.canonicalInputApkSha256, 'frontier apk');
assert(frontier.trustedEdgeBundleSha256 === r1.handoffBundle?.sha256, 'frontier bundle');
assert(frontier.expectedSignerSha1 === canonical.signing?.expectedSignerSha1 && frontier.expectedSignerSha1 === r1.signer?.expectedSignerSha1 && frontier.expectedSignerSha1 === r2.candidate?.expectedSignerSha1, 'frontier signer');
assert(frontier.nextGate === r2.currentState?.nextGate && frontier.nextGate === ledger.nextGate, 'frontier next gate');
assert(frontier.signingRequestAllowed === true && human.preSigning?.requestAllowed === true && human.claims?.signingRequestAllowed === true, 'signing allowed');
assert(frontier.ownedDeviceUatAllowed === false && human.ownedDeviceUat?.requestAllowed === false && human.claims?.ownedDeviceUatRequestAllowed === false, 'UAT blocked');
assert(canonical.signing?.trustedEdgeSigningPass === false && canonical.signing?.signedApkSha256 === null, 'canonical unsigned frontier');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && r1.physicalReceipt === null && r1.handoffBundle?.certificationReceipt === null, 'R1 pre-signing frontier');
assert(r2.status === 'BLOCKED_BY_R1_SIGNING' && r2.r1PhysicalReceipt === null && r2.candidate?.signedApkSha256 === null, 'R2 pre-signing frontier');
assert(human.currentCandidate === ledger.candidate && human.candidateState === 'PRE_SIGNING_ELIGIBLE', 'human candidate frontier');
assert(frontier.physicalAlpha2Pass === false && canonical.boundaries?.physicalAlpha2Pass === false && r1.physicalAlpha2Pass === false && human.claims?.physicalAlpha2Pass === false, 'physical PASS forbidden');
assert(frontier.buildReady === false && canonical.boundaries?.buildReady === false && r1.buildReady === false && r2.currentState?.buildReady === false && human.claims?.buildReady === false, 'build ready forbidden');
assert(frontier.releaseReady === false && canonical.boundaries?.releaseReady === false && r1.releaseReady === false && r2.currentState?.releaseReady === false && human.claims?.releaseReady === false, 'release ready forbidden');

console.log('ALPHA2_CERTIFICATION_LEDGER=PASS');
console.log(`CHAIN_ID=${ledger.chainId}`);
console.log(`GENESIS_BLOCK_HASH=${ledger.genesisBlockHash}`);
console.log(`HEAD_BLOCK_HASH=${ledger.headBlockHash}`);
console.log(`BLOCKS=${ledger.blocks.length}`);
console.log(`STATE=${ledger.state}`);
console.log(`NEXT_GATE=${ledger.nextGate}`);
console.log('HASH_LINKAGE=PASS');
console.log('R1_POST_MERGE_RECEIPT=PASS');
console.log('PRIOR_PHYSICAL_EVIDENCE_INHERITED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
