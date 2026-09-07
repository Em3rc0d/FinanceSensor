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
  'alpha2-integrated-runtime.yml',
  'alpha2-r1-trusted-edge-signing.yml',
  'alpha2-r2-owned-device-campaign.yml',
]);

const RETIRED_WORKFLOWS = new Set(['gmail-live-spike.yml']);
const REQUIRED_RUNNER = 'runs-on: ubuntu-latest';
const failures = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);
const read = file => fs.readFileSync(path.join(workflowDir, file), 'utf8');
const runsOnLines = text => text.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('runs-on:'));

const workflowFiles = fs.readdirSync(workflowDir)
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
  for (const line of runnerLines) if (line !== REQUIRED_RUNNER) fail(file, `public CI routing must be exactly: ${REQUIRED_RUNNER}`);
  if (/runs-on:\s*\[[^\]]*self-hosted|runs-on:\s*self-hosted/i.test(text)) fail(file, 'public active workflow references a persistent self-hosted runner');
  if (/\$\{\{\s*secrets\./.test(text)) fail(file, 'active workflow references repository/environment secrets');
  if (/^\s*schedule\s*:/m.test(text) || /^\s*-?\s*cron\s*:/m.test(text)) fail(file, 'CI must not rely on cron scheduling during MK0');
  if (!/permissions:\s*\n\s*contents:\s*read/m.test(text)) fail(file, 'workflow must keep explicit least-privilege contents: read');
}

const contracts = {
  'mobile-shell.yml': {
    markers: ['flutter build apk --debug', 'REAL_GMAIL=0', 'REAL_OAUTH=0', 'REAL_FINANCIAL_DATA=0', 'BUILD_READY=NO'],
    forbidden: [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i],
  },
  'mobile-gmail-connection.yml': {
    markers: [
      'ANDROID_AUTHORIZATION_PROVIDER=GOOGLE_AUTHORIZATION_CLIENT', 'EXACT_SCOPE=gmail.readonly',
      'APP_REFRESH_TOKEN_CUSTODY=0', 'DART_BEARER_CUSTODY=0', 'OFFLINE_ACCESS_REQUESTED=0',
      'REAL_OAUTH_EXECUTED_BY_CI=0', 'REAL_GMAIL_EXECUTED_BY_CI=0', 'BUILD_READY=NO'
    ],
    forbidden: [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|owned-oauth-level-c/i],
  },
  'mobile-human-test-alpha.yml': {
    markers: [
      'node tools/validate-human-test-alpha.mjs', '--target lib/main_human_test.dart',
      'com.financesensor.lab.gmailconnection.r2', 'EXACT_SCOPE=gmail.readonly', 'SESSION_ONLY_FINANCIAL_STATE=1',
      'REAL_OAUTH_EXECUTED_BY_CI=0', 'REAL_GMAIL_EXECUTED_BY_CI=0',
      'PUBLIC_CI_SIGNER=COMPILE_ONLY_EPHEMERAL', 'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
      'HUMAN_TEST_READY=YES', 'BUILD_READY=NO', 'RELEASE_READY=NO', 'IOS_TOUCHED=0'
    ],
    forbidden: [/FINANCESENSOR_GMAIL_ACCESS_TOKEN|FINANCESENSOR_GMAIL_REFRESH_TOKEN|FINANCESENSOR_GOOGLE_CLIENT_SECRET|FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/],
  },
  'gmail-historical.yml': {
    markers: ['Synthetic/static only', 'REAL_HISTORICAL_GMAIL_COVERAGE remains physically OPEN', 'contents: read', 'runs-on: ubuntu-latest'],
    validate(text, file) {
      if (/node\s+[^\n]*owned-oauth-gmail-history-viewer\.mjs/.test(text) &&
          !/node --check\s+spikes\/physical-ingress\/live\/owned-oauth-gmail-history-viewer\.mjs/.test(text)) {
        fail(file, 'historical CI may syntax-check but never execute the real Gmail viewer');
      }
    },
  },
  'statement-etl-contract.yml': {
    markers: ['node tools/validate-statement-etl-reconciliation.mjs', 'REAL_STATEMENT_DATA_IN_CI=0', 'REAL_GMAIL_IN_CI=0', 'IOS_TOUCHED=0', 'BUILD_READY=false'],
    forbidden: [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i],
  },
  'alpha2-design-freeze.yml': {
    markers: ['node tools/validate-alpha2-design-freeze.mjs', 'REAL_GMAIL_IN_CI=0', 'REAL_FINANCIAL_DATA_IN_CI=0', 'BUILD_READY=NO'],
  },
  'alpha2-statement-discovery.yml': {
    markers: ['node tools/validate-alpha2-a-statement-discovery.mjs', 'ATTACHMENT_BYTES_FETCHED=0', 'PASSWORD_REQUESTED=0', 'VAULT_MUTATION=0', 'REAL_GMAIL_IN_CI=0', 'BUILD_READY=NO'],
  },
  'alpha2-statement-fetch-parse.yml': {
    markers: [
      'node tools/validate-alpha2-b-statement-fetch-parse.mjs', 'REAL_GMAIL_IN_CI=0', 'REAL_FINANCIAL_PLAINTEXT_IN_CI=0',
      'PASSWORD_DURABLE_STORAGE=0', 'RAW_PDF_DURABLE_WRITES=0', 'FORMAT_OBSERVED_PROFILE_FETCH=0',
      'PHYSICAL_PROFILE_PASS=0', 'BUILD_READY=NO'
    ],
    forbidden: [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i],
  },
  'alpha2-financial-vault.yml': {
    markers: [
      'node tools/validate-alpha2-c-financial-vault.mjs', 'SQLCIPHER_VERSION=4.18.0',
      'REAL_FINANCIAL_PLAINTEXT_IN_CI=0', 'REAL_PLATFORM_KEYSTORE_IN_CI=0', 'PLAINTEXT_SQLITE_FALLBACK=0',
      'DURABLE_APP_DEK=0', 'RAW_FINANCIAL_PLAINTEXT_COLUMNS=0', 'PHYSICAL_SQLCIPHER_INSPECTION=0', 'BUILD_READY=NO'
    ],
    forbidden: [/owned-oauth-|RUN-FINANCESENSOR-|gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com/i],
  },
  'alpha2-consolidated-contract.yml': {
    markers: ['node tools/validate-alpha2-consolidated-product-contract.mjs', 'contents: read', 'runs-on: ubuntu-latest'],
    forbidden: [/gmail\.googleapis\.com|accounts\.google\.com|oauth2\.googleapis\.com|owned-oauth-|RUN-FINANCESENSOR-/i],
  },
  'alpha2-integrated-runtime.yml': {
    markers: [
      'node tools/validate-alpha2-integrated-runtime.mjs', '--target lib/main_alpha2.dart',
      'ANDROID_COMPILE_SDK=37', 'ANDROID_MIN_SDK=31', 'ANDROID_TARGET_SDK=36',
      'ANDROID_AGP_VERSION=9.1.1', 'ANDROID_GRADLE_VERSION=9.3.1', 'SQLCIPHER_VERSION=4.18.0',
      'REAL_OAUTH_EXECUTED_BY_CI=NO', 'REAL_GMAIL_EXECUTED_BY_CI=NO', 'REAL_FINANCIAL_DATA_IN_CI=NO',
      'PHYSICAL_SQLCIPHER_PASS=NO', 'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
    ],
    forbidden: [/REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES|REAL_FINANCIAL_DATA_IN_CI=YES|PHYSICAL_SQLCIPHER_PASS=YES|PHYSICAL_ALPHA2_PASS=YES|BUILD_READY=YES|RELEASE_READY=YES/i],
  },
  'alpha2-r1-trusted-edge-signing.yml': {
    markers: [
      'node tools/validate-alpha2-canonical-candidate.mjs', 'node tools/validate-alpha2-r1-signing-handoff.mjs',
      'node tools/validate-alpha2-r1-ci-routing-receipt.mjs', 'R1_HANDOFF_READY=YES',
      'R1_TRUSTED_EDGE_SIGNING=OPEN', 'R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1', 'BUILD_READY=NO', 'RELEASE_READY=NO'
    ],
    forbidden: [/R1_TRUSTED_EDGE_SIGNING=PASS|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/i],
  },
  'alpha2-r2-owned-device-campaign.yml': {
    markers: [
      'node tools/validate-alpha2-r2-owned-device-campaign.mjs', 'node tools/validate-alpha2-r2-chain.mjs',
      'node tools/validate-ci-runner-policy.mjs', 'R1_TRUSTED_EDGE_SIGNING=OPEN', 'R2_PHYSICAL_CAMPAIGN=BLOCKED_ON_R1',
      'REAL_OAUTH_IN_CI=0', 'REAL_GMAIL_IN_CI=0', 'REAL_FINANCIAL_DATA_IN_CI=0',
      'PRIVATE_SIGNING_MATERIAL_IN_CI=0', 'BUILD_READY=NO', 'RELEASE_READY=NO'
    ],
    forbidden: [/R1_TRUSTED_EDGE_SIGNING=PASS|R2_PHYSICAL_CAMPAIGN=PASS|REAL_OAUTH_IN_CI=1|REAL_GMAIL_IN_CI=1|REAL_FINANCIAL_DATA_IN_CI=1|PRIVATE_SIGNING_MATERIAL_IN_CI=1|BUILD_READY=YES|RELEASE_READY=YES/i],
  },
};

for (const [file, contract] of Object.entries(contracts)) {
  if (!workflowFiles.includes(file)) continue;
  const text = read(file);
  for (const marker of contract.markers ?? []) if (!text.includes(marker)) fail(file, `workflow contract missing marker: ${marker}`);
  for (const pattern of contract.forbidden ?? []) if (pattern.test(text)) fail(file, 'workflow contains a forbidden execution/promotion surface');
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
console.log('ALPHA2_R1_WORKFLOW_REGISTERED=1');
console.log('ALPHA2_R2_WORKFLOW_REGISTERED=1');
console.log('PUBLIC_CI_PHYSICAL_PROMOTION=0');
console.log('PUBLIC_CI_BUILD_READY_PROMOTION=0');
console.log('PUBLIC_CI_RELEASE_READY_PROMOTION=0');
console.log('GITHUB_HOSTED_CI!=FINANCESENSOR_TRUSTED_EDGE');
