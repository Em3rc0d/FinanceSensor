import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import './validate-ci-runner-policy.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const fail = m => { throw new Error(`ALPHA2_2015_IDENTITY_REFREEZE_FAILED:${m}`); };
const c = JSON.parse(read('graph/alpha2-2015-refreeze-candidate.json'));
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');

if (c.schemaVersion !== 'A2_2015_IDENTITY_REFREEZE_V1') fail('SCHEMA');
if (c.candidate !== '0.2.0-alpha.2+2015') fail('CANDIDATE');
if (c.functionalBaselineCandidate !== '0.2.0-alpha.2+2014') fail('BASELINE');
if (c.boundaries?.functionalDelta !== false) fail('FUNCTIONAL_DELTA');
if (c.boundaries?.physicalEvidenceInheritedFrom2014 !== false) fail('PHYSICAL_INHERITANCE');
if (c.build?.versionCode !== 2015 || c.build?.trustedEdgeResignRequired !== true || c.build?.canonicalPromotionPending !== true) fail('BUILD_BOUNDARY');

for (const [path, expected] of Object.entries(c.functionalBlobShas ?? {})) {
  const observed = execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
  if (observed !== expected) fail(`FUNCTIONAL_BLOB_CHANGED:${path}:${observed}`);
}

for (const marker of [
  '--build-number 2015',
  "versionCode='2015'",
  'CANDIDATE_ID=0.2.0-alpha.2+2015',
  'FUNCTIONAL_BASELINE_CANDIDATE=0.2.0-alpha.2+2014',
  'FUNCTIONAL_DELTA=NO',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'financesensor-alpha2-2015-candidate-${{ github.run_id }}'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2014') || workflow.includes("versionCode='2014'")) fail('OLD_BUILD_NUMBER_ACTIVE');

console.log('ALPHA2_2015_IDENTITY_REFREEZE=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2015');
console.log('FUNCTIONAL_BASELINE=0.2.0-alpha.2+2014');
console.log('FUNCTIONAL_DELTA=NO');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
