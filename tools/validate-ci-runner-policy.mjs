import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');

const ACTIVE_WORKFLOWS = new Set([
  'mk0-foundation.yml',
  'heartbeat.yml',
  'package-level-c-helper.yml',
  'public-readiness.yml',
  'mobile-shell.yml',
  'mobile-gmail-connection.yml',
  'gmail-historical.yml',
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

// The mobile shell workflow is allowed only as a synthetic build surface.
// Registration here must never become permission to execute real provider authority.
if (workflowFiles.includes('mobile-shell.yml')) {
  const text = read('mobile-shell.yml');
  const requiredMarkers = [
    'flutter build apk --debug',
    'REAL_GMAIL=0',
    'REAL_OAUTH=0',
    'REAL_FINANCIAL_DATA=0',
    'BUILD_READY=NO',
  ];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) fail('mobile-shell.yml', `synthetic build boundary missing marker: ${marker}`);
  }
  if (/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i.test(text)) {
    fail('mobile-shell.yml', 'mobile shell workflow may not acquire real Gmail/OAuth authority');
  }
}

// The Android Gmail connection workflow may compile a real native provider bridge,
// but hosted CI remains forbidden from executing user OAuth or receiving Gmail data.
if (workflowFiles.includes('mobile-gmail-connection.yml')) {
  const text = read('mobile-gmail-connection.yml');
  const requiredMarkers = [
    'ANDROID_AUTHORIZATION_PROVIDER=GOOGLE_AUTHORIZATION_CLIENT',
    'EXACT_SCOPE=gmail.readonly',
    'APP_REFRESH_TOKEN_CUSTODY=0',
    'DART_BEARER_CUSTODY=0',
    'OFFLINE_ACCESS_REQUESTED=0',
    'REAL_OAUTH_EXECUTED_BY_CI=0',
    'REAL_GMAIL_EXECUTED_BY_CI=0',
    'BUILD_READY=NO',
  ];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) fail('mobile-gmail-connection.yml', `connection CI boundary missing marker: ${marker}`);
  }
  if (/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i.test(text)) {
    fail('mobile-gmail-connection.yml', 'connection workflow may compile the bridge but may not acquire real Gmail/OAuth authority');
  }
}

// The historical Gmail workflow validates only synthetic/static contracts.
// The executable real OAuth viewer remains a LOCAL/TRUSTED-EDGE entrypoint and must never run in hosted CI.
if (workflowFiles.includes('gmail-historical.yml')) {
  const text = read('gmail-historical.yml');
  const requiredMarkers = [
    'Synthetic/static only',
    'REAL_HISTORICAL_GMAIL_COVERAGE remains physically OPEN',
    'contents: read',
    'runs-on: ubuntu-latest',
  ];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) fail('gmail-historical.yml', `historical CI boundary missing marker: ${marker}`);
  }
  if (/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/.test(text)) {
    fail('gmail-historical.yml', 'historical CI may not receive Gmail/OAuth credentials');
  }
  if (/node\s+[^\n]*owned-oauth-gmail-history-viewer\.mjs/.test(text) && !/node --check\s+spikes\/physical-ingress\/live\/owned-oauth-gmail-history-viewer\.mjs/.test(text)) {
    fail('gmail-historical.yml', 'historical CI may syntax-check but never execute the real Gmail viewer');
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
console.log('MOBILE_SHELL_REAL_GMAIL=0');
console.log('MOBILE_SHELL_REAL_OAUTH=0');
console.log('MOBILE_SHELL_REAL_FINANCIAL_DATA=0');
console.log('MOBILE_GMAIL_CONNECTION_REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('MOBILE_GMAIL_CONNECTION_REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('GMAIL_HISTORICAL_REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('GMAIL_HISTORICAL_REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('GITHUB_HOSTED_CI!=FINANCESENSOR_TRUSTED_EDGE');
