import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

function assert(cond, message) { if (!cond) throw new Error(message); }

assert(graph.schemaVersion === 'A2_R1_TRUSTED_EDGE_HANDOFF_V4', 'R1 v4 graph required');
assert(['BUNDLE_GENERATION_OPEN_PHYSICAL_OPEN', 'HANDOFF_READY_PHYSICAL_OPEN'].includes(graph.status), 'R1 must remain physical-open');
assert(graph.trustedEdgeSigningPass === false, 'R1 physical signing cannot be pre-certified');
assert(graph.signedApkSha256 === null, 'signed APK digest must remain null before physical signing');
assert(graph.buildReady === false, 'BUILD_READY must remain false');
assert(graph.releaseReady === false, 'RELEASE_READY must remain false');

for (const path of [
  'tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1',
  'tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd',
  'tools/validate-alpha2-canonical-candidate.mjs',
  'tools/validate-alpha2-r1-signing-handoff.mjs',
  'tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  'graph/alpha2-canonical-candidate.json',
  'graph/alpha2-r1-signing-handoff.json',
  'mk0/10-evidence/EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07.md',
  'mk0/10-evidence/EV-ALPHA2-R1-SIGNING-HANDOFF-2026-09-07.md',
  '.github/workflows/alpha2-r1-trusted-edge-signing.yml',
]) {
  assert(workflow.split(path).length - 1 >= 2, `R1 workflow routing missing PR/push path: ${path}`);
}

assert(workflow.includes('node tools/validate-alpha2-canonical-candidate.mjs'), 'canonical validator must execute');
assert(workflow.includes('node tools/validate-alpha2-r1-signing-handoff.mjs'), 'R1 handoff validator must execute');
assert(workflow.includes('node tools/validate-alpha2-r1-ci-routing-receipt.mjs'), 'routing validator must execute');
assert(workflow.includes('runs-on: ubuntu-latest'), 'R1 public CI must use ubuntu-latest');
assert(workflow.includes('contents: read'), 'R1 workflow must retain contents: read');
assert(!workflow.includes('self-hosted'), 'R1 public workflow cannot route to self-hosted');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/R1_TRUSTED_EDGE_SIGNING=PASS|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/i.test(workflow), 'public CI may not promote physical/release state');

console.log('ALPHA2_R1_CI_ROUTING_RECEIPT=PASS');
console.log('R1_CI_ROUTING=CLOSED');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
