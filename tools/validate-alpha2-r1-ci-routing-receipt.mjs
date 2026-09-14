import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');
const assert = (cond, message) => { if (!cond) throw new Error(message); };

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  'node tools/validate-alpha2-r1-physical-signing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2008 artifact',
  'Generate deterministic public-safe v10 handoff bundle',
  'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v10.zip',
  'Upload v10 trusted-edge handoff bundle',
  'R1_V10_GENERATION=PASS',
  'R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE',
  'R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1',
  'OD0_INSTALL_AND_LAUNCH=BLOCKED_BY_R1',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'R1 workflow least privilege drifted');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing' && graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow authority drifted');
assert(graph.ciGate?.historicalPhysicalReceiptValidator === 'tools/validate-alpha2-r1-physical-signing-receipt.mjs', 'physical receipt validator authority drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false && graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'R1 trust boundary drifted');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v10.zip' && graph.handoffBundle?.status === 'CI_GENERATION_PENDING', 'v10 bundle pre-generation state drifted');
assert(graph.handoffBundle?.sha256 === null && graph.handoffBundle?.bytes === null && graph.handoffBundle?.certificationReceipt === null, 'v10 bytes cannot be preclaimed');
assert(graph.physicalReceipt?.path === null && graph.status === 'TRUSTED_EDGE_SIGNING_REQUIRED', 'R1 must remain pending current +2008 trusted-edge receipt');
assert(graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null && graph.signedApkBytes === null, 'R1 stable signed APK must remain absent before user action');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_CURRENT_PHYSICAL_RECEIPT=ABSENT_BY_DESIGN');
console.log('R1_V10_BUNDLE_STATE=CI_GENERATION_PENDING');
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('OD0_INSTALL_AND_LAUNCH=BLOCKED_BY_R1');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
