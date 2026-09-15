import fs from 'node:fs';

const launcherPath = 'spikes/physical-ingress/live/RUN-FINANCESENSOR-P1.cmd';
const runnerPath = 'spikes/physical-ingress/live/owned-oauth-p1-production-lifecycle.mjs';
const reducerPath = 'tools/reduce-p1-production-lifecycle-result.mjs';
const ignorePath = '.gitignore';

const launcher = fs.readFileSync(launcherPath, 'utf8');
const runner = fs.readFileSync(runnerPath, 'utf8');
const ignore = fs.readFileSync(ignorePath, 'utf8');
const failures = [];
const fail = message => failures.push(message);

function requireText(text, needle, label) {
  if (!text.includes(needle)) fail(`${label}: missing ${needle}`);
}

for (const needle of [
  'where node >nul 2>nul',
  'System.Windows.Forms.OpenFileDialog',
  'FINANCESENSOR_GOOGLE_CREDENTIALS_PATH',
  'owned-oauth-p1-production-lifecycle.mjs',
  'reduce-p1-production-lifecycle-result.mjs',
  'financesensor-p1-production-lifecycle-result.json',
  'financesensor-p1-sanitized-receipt.json',
  'HTTP 400 + invalid_grant',
  'No physical PASS is claimed',
  'still NOT a repository P1 PASS',
  'Do not upload or share the raw result or OAuth credential JSON'
]) requireText(launcher, needle, launcherPath);

for (const forbidden of [
  'echo %FINANCESENSOR_GOOGLE_CREDENTIALS_PATH%',
  'type %FINANCESENSOR_GOOGLE_CREDENTIALS_PATH%',
  'git add financesensor-p1-production-lifecycle-result.json',
  'curl ',
  'Invoke-WebRequest'
]) {
  if (launcher.includes(forbidden)) fail(`${launcherPath}: forbidden ${forbidden}`);
}

requireText(ignore, 'financesensor-p1-production-lifecycle-result.json', ignorePath);
requireText(ignore, 'financesensor-p1-sanitized-receipt.json', ignorePath);
requireText(ignore, 'financesensor-p1-*.json', ignorePath);

if (!fs.existsSync(reducerPath)) fail(`missing reducer: ${reducerPath}`);

const closeCount = (runner.match(/setTimeout\(\(\) => server\.close\(\), 100\);/g) ?? []).length;
if (closeCount < 3) fail(`${runnerPath}: expected terminal auto-close on PASS, STOP and failure paths; found ${closeCount}`);

for (const terminal of [
  "await runRefreshRevokeSequence();",
  "await bestEffortRevokeWithoutPass('STOPPED_BEFORE_P1_PASS');",
  "await bestEffortRevokeWithoutPass('FAIL').catch(async () => {"
]) requireText(runner, terminal, runnerPath);

if (failures.length) {
  console.error('FINANCESENSOR_P1_ONE_CLICK_RUN=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_P1_ONE_CLICK_RUN=PASS');
console.log('USER_INTERFACE=DOUBLE_CLICK_PLUS_BROWSER');
console.log('CREDENTIAL_SELECTION=LOCAL_FILE_PICKER');
console.log('RAW_RESULT_GIT_IGNORED=PASS');
console.log('SANITIZED_RECEIPT_GIT_IGNORED_UNTIL_REVIEW=PASS');
console.log('TERMINAL_SERVER_AUTO_CLOSE=PASS');
console.log('AUTO_PUBLICATION=0');
console.log('PHYSICAL_EXECUTION=NOT_CLAIMED_BY_STATIC_GUARD');
