import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const readText = path => fs.readFileSync(path, 'utf8');
const failures = [];
const fail = message => failures.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };

const slicePaths = [
  ['A', 'graph/alpha2-a-statement-discovery.json'],
  ['B', 'graph/alpha2-b-statement-fetch-parse.json'],
  ['C', 'graph/alpha2-c-financial-vault.json'],
  ['D', 'graph/alpha2-d-reconciliation.json'],
  ['E', 'graph/alpha2-e-account-graph.json'],
  ['F', 'graph/alpha2-f-monthly-coverage.json'],
  ['G', 'graph/alpha2-g-sensor-v1.json']
];
const handoffPath = 'mk0/12-release/ALPHA2-STATIC-BUILD-HANDOFF.md';
const requiredPaths = [
  ...slicePaths.map(([, path]) => path),
  'graph/alpha2-design-freeze.json',
  'graph/build-readiness.json',
  'graph/closure-ledger.json',
  'mk0/12-release/HUMAN-TEST-CANDIDATE.md',
  handoffPath
];
for (const path of requiredPaths) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const design = readJson('graph/alpha2-design-freeze.json');
  const readiness = readJson('graph/build-readiness.json');
  const ledger = readJson('graph/closure-ledger.json');
  const release = readText('mk0/12-release/HUMAN-TEST-CANDIDATE.md');
  const handoff = readText(handoffPath);

  assert(design.status === 'DESIGN_FROZEN', 'Alpha.2 design must remain frozen');
  assert(design.buildReady === false, 'Alpha.2 design must not claim BUILD_READY');

  let staticPassCount = 0;
  for (const [letter, path] of slicePaths) {
    const slice = readJson(path);
    assert(slice.status === 'STATIC_IMPLEMENTED_CI_PASS', `Alpha.2-${letter} must be STATIC_IMPLEMENTED_CI_PASS`);
    const staticClaim = letter === 'A'
      ? slice.ciEvidence?.allConclusions === 'SUCCESS'
      : slice.claims?.staticImplementationPass === true;
    assert(staticClaim, `Alpha.2-${letter} static implementation evidence must be PASS`);
    const physicalClaim = letter === 'A'
      ? slice.implementation?.physicalExecution === true || slice.implementation?.productPromotion === true
      : Object.entries(slice.claims ?? {}).some(([key, value]) => /physical|alpha2ProductPass/i.test(key) && value === true);
    assert(!physicalClaim, `Alpha.2-${letter} must not promote a physical/product claim`);
    const buildClaim = letter === 'A' ? slice.buildReady : slice.claims?.buildReady;
    assert(buildClaim === false, `Alpha.2-${letter} buildReady must remain false`);
    if (staticClaim) staticPassCount += 1;
  }
  assert(staticPassCount === 7, `expected 7 static slice passes, got ${staticPassCount}`);

  assert(readiness.implementationBaseline === 'FROZEN', 'implementation baseline must remain FROZEN');
  assert(Array.isArray(readiness.prePhysicalClosureTargets) && readiness.prePhysicalClosureTargets.length === 0, 'pre-physical documentary build blockers must remain zero');
  assert(readiness.buildReady === false, 'build-readiness manifest must remain false');
  assert(readiness.law === 'BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED', 'global build law drift');
  assert(ledger.buildReady === false, 'closure ledger buildReady must remain false');

  for (const id of ['Q-003', 'Q-004', 'Q-005']) {
    const node = ledger.nodes?.find(item => item.id === id);
    assert(node?.status === 'ACTIVE', `${id} must remain ACTIVE before physical closure`);
  }
  const gmk0 = ledger.nodes?.find(item => item.id === 'G-MK0');
  assert(gmk0 && gmk0.status !== 'CLOSED', 'G-MK0 must remain open before global BUILD_READY');

  for (const marker of [
    'HUMAN_TEST_READY=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO',
    'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
    'STATIC_A_G_CERTIFIED=YES',
    'ALPHA2_MOBILE_INTEGRATION=OPEN'
  ]) assert(release.includes(marker), `human-test release contract missing ${marker}`);

  for (const marker of [
    'ALPHA.2-A STATEMENT DISCOVERY         STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-B FETCH + PARSE               STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-C FINANCIAL VAULT             STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-D RECONCILIATION              STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-E ACCOUNT GRAPH               STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-F MONTHLY COVERAGE            STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2-G SENSOR V1                   STATIC IMPLEMENTED / CI PASS',
    'ALPHA.2 STATIC SLICES                 7 / 7 EXACT-SHA CI PASS',
    'CONTROLLED_ANDROID_HUMAN_TEST_BUILD   AUTHORIZED',
    'ALPHA.2 MOBILE PRODUCT INTEGRATION    OPEN',
    'GLOBAL BUILD_READY                    NO',
    'APK_BUILD_PASS != BUILD_READY'
  ]) assert(handoff.includes(marker), `handoff receipt missing ${marker}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_ALPHA2_STATIC_BUILD_HANDOFF=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_ALPHA2_STATIC_BUILD_HANDOFF=PASS');
console.log('ALPHA2_STATIC_SLICES=7/7');
console.log('STATIC_A_G_CERTIFIED=YES');
console.log('PRE_PHYSICAL_BUILD_ENTRY=PASS');
console.log('CONTROLLED_ANDROID_HUMAN_TEST_BUILD=AUTHORIZED');
console.log('ALPHA2_MOBILE_INTEGRATION=OPEN');
console.log('ALPHA2_PHYSICAL_PRODUCT_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
