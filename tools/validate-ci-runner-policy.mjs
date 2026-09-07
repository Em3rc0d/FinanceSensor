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
  'mobile-human-test-alpha.yml',
  'gmail-historical.yml',
  'statement-etl-contract.yml',
  'alpha2-design-freeze.yml',
  'alpha2-statement-discovery.yml',
  'alpha2-statement-fetch-parse.yml',
  'alpha2-financial-vault.yml',
  'alpha2-consolidated-contract.yml',
]);

const RETIRED_WORKFLOWS = new Set(['gmail-live-spike.yml']);
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
    .map(line => line.trim())
    .filter(line => line.startsWith('runs-on:'));
}

const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
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
  if (runnerLines.length === 0) fail(file, 'active workflow has no runs-on declaration');
  for (const line of runnerLines) {
    if (line !== REQUIRED_RUNNER) fail(file, `public CI routing must be exactly: ${REQUIRED_RUNNER}`);
  }
  if (/runs-on:\s*\[[^\]]*self-hosted/i.test(text) || /runs-on:\s*self-hosted/i.test(text)) {
    fail(file, 'public active workflow references a persistent self-hosted runner');
  }
  if (/\$\{\{\s*secrets\./.test(text)) fail(file, 'active workflow references repository/environment secrets');
  if (/^\s*schedule\s*:/m.test(text) || /^\s*-?\s*cron\s*:/m.test(text)) {
    fail(file, 'CI must not rely on cron scheduling during MK0');
  }
  if (!/permissions:\s*\n\s*contents:\s*read/m.test(text)) {
    fail(file, 'workflow must keep explicit least-privilege contents: read');
  }
}

const contracts = {
  'mobile-shell.yml': {
    markers: [
      'flutter build apk --debug',
      'REAL_GMAIL=0',
      'REAL_OAUTH=0',
      'REAL_FINANCIAL_DATA=0',
      'BUILD_READY=NO',
    ],
    markerLabel: 'synthetic build boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i,
        'mobile shell workflow may not acquire real Gmail/OAuth authority'],
    ],
  },
  'mobile-gmail-connection.yml': {
    markers: [
      'ANDROID_AUTHORIZATION_PROVIDER=GOOGLE_AUTHORIZATION_CLIENT',
      'EXACT_SCOPE=gmail.readonly',
      'APP_REFRESH_TOKEN_CUSTODY=0',
      'DART_BEARER_CUSTODY=0',
      'OFFLINE_ACCESS_REQUESTED=0',
      'REAL_OAUTH_EXECUTED_BY_CI=0',
      'REAL_GMAIL_EXECUTED_BY_CI=0',
      'BUILD_READY=NO',
    ],
    markerLabel: 'connection CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i,
        'connection workflow may compile the bridge but may not acquire real Gmail/OAuth authority'],
    ],
  },
  'mobile-human-test-alpha.yml': {
    markers: [
      'node tools/validate-human-test-alpha.mjs',
      '--target lib/main_human_test.dart',
      'com.financesensor.lab.gmailconnection.r2',
      'EXACT_SCOPE=gmail.readonly',
      'SESSION_ONLY_FINANCIAL_STATE=1',
      'REAL_OAUTH_EXECUTED_BY_CI=0',
      'REAL_GMAIL_EXECUTED_BY_CI=0',
      'PUBLIC_CI_SIGNER=COMPILE_ONLY_EPHEMERAL',
      'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
      'HUMAN_TEST_READY=YES',
      'BUILD_READY=NO',
      'RELEASE_READY=NO',
      'IOS_TOUCHED=0',
    ],
    markerLabel: 'human-test CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'human-test public CI may not receive Gmail/OAuth credentials'],
      [/FINANCESENSOR_R2_LAB.*(PASSWORD|PRIVATE|KEYSTORE)|storePassword|keyPassword/i,
        'human-test public CI may not receive stable private signing material'],
    ],
  },
  'gmail-historical.yml': {
    markers: [
      'Synthetic/static only',
      'REAL_HISTORICAL_GMAIL_COVERAGE remains physically OPEN',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'historical CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'historical CI may not receive Gmail/OAuth credentials'],
    ],
    validate(text, file) {
      if (/node\s+[^\n]*owned-oauth-gmail-history-viewer\.mjs/.test(text) &&
          !/node --check\s+spikes\/physical-ingress\/live\/owned-oauth-gmail-history-viewer\.mjs/.test(text)) {
        fail(file, 'historical CI may syntax-check but never execute the real Gmail viewer');
      }
    },
  },
  'statement-etl-contract.yml': {
    markers: [
      'node tools/validate-statement-etl-reconciliation.mjs',
      'REAL_STATEMENT_DATA_IN_CI=0',
      'REAL_GMAIL_IN_CI=0',
      'IOS_TOUCHED=0',
      'BUILD_READY=false',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'statement ETL synthetic boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'statement ETL CI may not receive Gmail/OAuth credentials'],
      [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i,
        'statement ETL CI may validate contracts but may not execute trusted-edge/provider flows'],
      [/REAL_STATEMENT_DATA_IN_CI=1|REAL_GMAIL_IN_CI=1|IOS_TOUCHED=1|BUILD_READY=true/i,
        'statement ETL CI contains a forbidden promotion marker'],
    ],
  },
  'alpha2-design-freeze.yml': {
    markers: [
      'node tools/validate-alpha2-design-freeze.mjs',
      'REAL_GMAIL_IN_CI=0',
      'REAL_FINANCIAL_DATA_IN_CI=0',
      'BUILD_READY=NO',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'Alpha.2 design CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'Alpha.2 design CI may not receive Gmail/OAuth credentials'],
    ],
  },
  'alpha2-statement-discovery.yml': {
    markers: [
      'node tools/validate-alpha2-a-statement-discovery.mjs',
      'ATTACHMENT_BYTES_FETCHED=0',
      'PASSWORD_REQUESTED=0',
      'VAULT_MUTATION=0',
      'REAL_GMAIL_IN_CI=0',
      'BUILD_READY=NO',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'Alpha.2 discovery CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'Alpha.2 discovery CI may not receive Gmail/OAuth credentials'],
      [/REAL_GMAIL_IN_CI=1|ATTACHMENT_BYTES_FETCHED=1|PASSWORD_REQUESTED=1|VAULT_MUTATION=1|BUILD_READY=YES/i,
        'Alpha.2 discovery CI contains a forbidden promotion marker'],
    ],
  },
  'alpha2-statement-fetch-parse.yml': {
    markers: [
      'node tools/validate-alpha2-b-statement-fetch-parse.mjs',
      'REAL_GMAIL_IN_CI=0',
      'REAL_FINANCIAL_PLAINTEXT_IN_CI=0',
      'PASSWORD_DURABLE_STORAGE=0',
      'RAW_PDF_DURABLE_WRITES=0',
      'FORMAT_OBSERVED_PROFILE_FETCH=0',
      'INTERBANK_GMAIL_IDENTITY=PENDING',
      'PHYSICAL_PROFILE_PASS=0',
      'BUILD_READY=NO',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'Alpha.2 fetch/parse CI boundary',
    forbidden: [
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'Alpha.2 fetch/parse CI may not receive Gmail/OAuth credentials'],
      [/REAL_GMAIL_IN_CI=1|REAL_FINANCIAL_PLAINTEXT_IN_CI=1|PASSWORD_DURABLE_STORAGE=1|RAW_PDF_DURABLE_WRITES=1|FORMAT_OBSERVED_PROFILE_FETCH=1|PHYSICAL_PROFILE_PASS=1|BUILD_READY=YES/i,
        'Alpha.2 fetch/parse CI contains a forbidden promotion marker'],
      [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i,
        'Alpha.2 fetch/parse CI may exercise synthetic adapters but may not execute trusted-edge/provider flows'],
    ],
  },
  'alpha2-financial-vault.yml': {
    markers: [
      'node tools/validate-alpha2-c-financial-vault.mjs',
      'SQLCIPHER_VERSION=4.18.0',
      'REAL_FINANCIAL_PLAINTEXT_IN_CI=0',
      'REAL_PLATFORM_KEYSTORE_IN_CI=0',
      'PLAINTEXT_SQLITE_FALLBACK=0',
      'DURABLE_APP_DEK=0',
      'RAW_FINANCIAL_PLAINTEXT_COLUMNS=0',
      'PHYSICAL_SQLCIPHER_INSPECTION=0',
      'P3_PHYSICAL_PASS=0',
      'BUILD_READY=NO',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'Alpha.2 financial vault CI boundary',
    forbidden: [
      [/\$\{\{\s*secrets\./,
        'Alpha.2 financial vault CI may not receive secrets'],
      [/REAL_FINANCIAL_PLAINTEXT_IN_CI=1|REAL_PLATFORM_KEYSTORE_IN_CI=1|PLAINTEXT_SQLITE_FALLBACK=1|DURABLE_APP_DEK=1|RAW_FINANCIAL_PLAINTEXT_COLUMNS=1|PHYSICAL_SQLCIPHER_INSPECTION=1|P3_PHYSICAL_PASS=1|BUILD_READY=YES/i,
        'Alpha.2 financial vault CI contains a forbidden promotion marker'],
      [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i,
        'Alpha.2 financial vault CI may use synthetic key/database doubles only and may not execute trusted-edge/provider flows'],
    ],
  },
  'alpha2-consolidated-contract.yml': {
    markers: [
      'node tools/validate-alpha2-consolidated-product-contract.mjs',
      'contents: read',
      'runs-on: ubuntu-latest',
    ],
    markerLabel: 'Alpha.2 consolidated contract CI boundary',
    forbidden: [
      [/\$\{\{\s*secrets\./,
        'Alpha.2 consolidated contract CI may not receive secrets'],
      [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/,
        'Alpha.2 consolidated contract CI may not receive Gmail/OAuth credentials'],
      [/gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com|owned-oauth-|RUN-FINANCESENSOR-/i,
        'Alpha.2 consolidated contract CI is static only and may not execute trusted-edge/provider flows'],
    ],
  },
};

for (const [file, contract] of Object.entries(contracts)) {
  if (!workflowFiles.includes(file)) continue;
  const text = read(file);
  for (const marker of contract.markers) {
    if (!text.includes(marker)) fail(file, `${contract.markerLabel} missing marker: ${marker}`);
  }
  for (const [pattern, message] of contract.forbidden ?? []) {
    if (pattern.test(text)) fail(file, message);
  }
  contract.validate?.(text, file);
}

for (const file of RETIRED_WORKFLOWS) {
  if (!workflowFiles.includes(file)) {
    fail(file, 'registered retired workflow is missing');
    continue;
  }
  const text = read(file);
  if (!/if:\s*\$\{\{\s*false\s*\}\}/.test(text)) fail(file, 'retired workflow must remain hard-disabled with if: ${{ false }}');
  if (!text.includes('runs-on: ubuntu-latest')) fail(file, 'retired historical workflow shape changed unexpectedly');
  if (!/^\s*workflow_dispatch\s*:/m.test(text)) fail(file, 'retired workflow must not regain an automatic trigger');
  if (/\$\{\{\s*secrets\./.test(text)) fail(file, 'retired workflow must not reference secrets');
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
console.log('MOBILE_HUMAN_TEST_REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('MOBILE_HUMAN_TEST_REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('MOBILE_HUMAN_TEST_PRIVATE_SIGNER_IN_CI=0');
console.log('GMAIL_HISTORICAL_REAL_OAUTH_EXECUTED_BY_CI=0');
console.log('GMAIL_HISTORICAL_REAL_GMAIL_EXECUTED_BY_CI=0');
console.log('STATEMENT_ETL_REAL_STATEMENT_DATA_IN_CI=0');
console.log('STATEMENT_ETL_REAL_GMAIL_IN_CI=0');
console.log('STATEMENT_ETL_IOS_TOUCHED=0');
console.log('ALPHA2_DESIGN_REAL_GMAIL_IN_CI=0');
console.log('ALPHA2_DISCOVERY_ATTACHMENT_BYTES_FETCHED_IN_CI=0');
console.log('ALPHA2_FETCH_PARSE_REAL_GMAIL_IN_CI=0');
console.log('ALPHA2_FETCH_PARSE_REAL_FINANCIAL_PLAINTEXT_IN_CI=0');
console.log('ALPHA2_FETCH_PARSE_PASSWORD_DURABLE_STORAGE=0');
console.log('ALPHA2_FINANCIAL_VAULT_REAL_PLAINTEXT_IN_CI=0');
console.log('ALPHA2_FINANCIAL_VAULT_REAL_PLATFORM_KEYSTORE_IN_CI=0');
console.log('ALPHA2_FINANCIAL_VAULT_PLAINTEXT_SQLITE_FALLBACK=0');
console.log('ALPHA2_CONSOLIDATED_CONTRACT_STATIC_ONLY=1');
console.log('GITHUB_HOSTED_CI!=FINANCESENSOR_TRUSTED_EDGE');
