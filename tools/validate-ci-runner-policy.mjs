import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');

const ACTIVE_WORKFLOWS = new Set([
  'mk0-foundation.yml',
  'heartbeat.yml',
  'package-level-c-helper.yml',
  'public-readiness.yml',
]);

const RETIRED_WORKFLOWS = new Set([
  'gmail-live-spike.yml',
]);

const REQUIRED_RUNNER = 'runs-on: ubuntu-latest';
const failures = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function read(file) {
  return fs.readFileSync(path.join(workflowDir, file), 'utf8');
}

function runsOnLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('runs-on:'));
}

const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort();

for (const file of workflowFiles) {
  if (!ACTIVE_WORKFLOWS.has(file) && !RETIRED_WORKFLOWS.has(file)) {
    fail(file, 'workflow is not registered in the CI runner policy');
  }
}

for (const file of ACTIVE_WORKFLOWS) {
  if (!workflowFiles.includes(file)) {
    fail(file, 'registered active workflow is missing');
    continue;
  }

  const text = read(file);
  const runnerLines = runsOnLines(text);

  if (runnerLines.length === 0) {
    fail(file, 'active workflow has no runs-on declaration');
  }

  for (const line of runnerLines) {
    if (line !== REQUIRED_RUNNER) {
      fail(file, `public CI routing must be exactly: ${REQUIRED_RUNNER}`);
    }
  }

  if (/runs-on:\s*\[[^\]]*self-hosted/i.test(text) || /runs-on:\s*self-hosted/i.test(text)) {
    fail(file, 'public active workflow references a persistent self-hosted runner');
  }

  if (/\$\{\{\s*secrets\./.test(text)) {
    fail(file, 'active workflow references repository/environment secrets');
  }

  if (/^\s*schedule\s*:/m.test(text) || /^\s*-?\s*cron\s*:/m.test(text)) {
    fail(file, 'CI must not rely on cron scheduling during MK0');
  }

  if (!/permissions:\s*\n\s*contents:\s*read/m.test(text)) {
    fail(file, 'workflow must keep explicit least-privilege contents: read');
  }
}

for (const file of RETIRED_WORKFLOWS) {
  if (!workflowFiles.includes(file)) {
    fail(file, 'registered retired workflow is missing');
    continue;
  }

  const text = read(file);

  if (!/if:\s*\$\{\{\s*false\s*\}\}/.test(text)) {
    fail(file, 'retired workflow must remain hard-disabled with if: ${{ false }}');
  }

  if (!text.includes('runs-on: ubuntu-latest')) {
    fail(file, 'retired historical workflow shape changed unexpectedly');
  }

  if (!/^\s*workflow_dispatch\s*:/m.test(text)) {
    fail(file, 'retired workflow must not regain an automatic trigger');
  }

  if (/\$\{\{\s*secrets\./.test(text)) {
    fail(file, 'retired workflow must not reference secrets');
  }
}

if (failures.length > 0) {
  console.error('FINANCESENSOR_CI_RUNNER_POLICY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_CI_RUNNER_POLICY=PASS');
console.log(`ACTIVE_WORKFLOWS=${ACTIVE_WORKFLOWS.size}`);
console.log(`RETIRED_WORKFLOWS=${RETIRED_WORKFLOWS.size}`);
console.log('RUNNER_ROUTE=ubuntu-latest');
console.log('ACTIVE_SELF_HOSTED_PATHS=0');
console.log('WORKFLOW_SECRET_REFERENCES=0');
console.log('CRON_DEPENDENCIES=0');
console.log('GITHUB_HOSTED_CI!=FINANCESENSOR_TRUSTED_EDGE');
