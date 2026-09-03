import fs from 'node:fs';

const contractPath = 'graph/gmail-historical-onboarding.json';
const adrPath = 'mk0/11-decisions/ADR-031-GMAIL-HISTORICAL-ONBOARDING-COVERAGE.md';
const providerPath = 'spikes/physical-ingress/src/gmail-rest-provider.js';
const importerPath = 'spikes/physical-ingress/src/historical-gmail-importer.js';
const adaptersPath = 'spikes/physical-ingress/src/transaction-evidence-adapters.js';
const vaultPath = 'spikes/physical-ingress/src/file-encrypted-vault.js';
const viewerPath = 'spikes/physical-ingress/live/owned-oauth-gmail-history-viewer.mjs';
const runnerPath = 'spikes/physical-ingress/live/RUN-FINANCESENSOR-GMAIL-HISTORY.cmd';
const resolverPath = 'spikes/canonical-resolver/src/resolver.js';
const tests = [
  'spikes/physical-ingress/test/transaction-evidence-adapters.test.js',
  'spikes/physical-ingress/test/historical-gmail-importer.test.js',
  'spikes/physical-ingress/test/file-encrypted-vault.test.js',
  'spikes/canonical-resolver/test/evidence-channel-reconciliation.test.js'
];
const failures = [];
const fail = message => failures.push(message);

for (const path of [contractPath, adrPath, providerPath, importerPath, adaptersPath, vaultPath, viewerPath, runnerPath, resolverPath, ...tests]) {
  if (!fs.existsSync(path)) fail(`missing Gmail historical artifact: ${path}`);
}

if (!failures.length) {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const adr = fs.readFileSync(adrPath, 'utf8');
  const provider = fs.readFileSync(providerPath, 'utf8');
  const importer = fs.readFileSync(importerPath, 'utf8');
  const adapters = fs.readFileSync(adaptersPath, 'utf8');
  const vault = fs.readFileSync(vaultPath, 'utf8');
  const viewer = fs.readFileSync(viewerPath, 'utf8');
  const runner = fs.readFileSync(runnerPath, 'utf8');
  const resolver = fs.readFileSync(resolverPath, 'utf8');

  if (contract.schemaVersion !== 3) fail('historical contract schemaVersion must be 3');
  if (contract.status !== 'STATIC_READY_REAL_GMAIL_OPEN') fail('historical contract must remain static-ready / real Gmail open');
  if (contract.coverageModes?.default !== 'ALL_AVAILABLE_ACTIVE_MAILBOX') fail('default coverage mode mismatch');
  if (contract.coverageModes?.includeSpamTrash !== false) fail('Spam/Trash must remain excluded by default');
  if (contract.enumeration?.query !== 'OMITTED') fail('completeness enumeration must omit Gmail q');
  if (contract.enumeration?.labelIds !== 'OMITTED') fail('completeness enumeration must omit label filters');
  if (contract.enumeration?.aggregateMessageLimit !== null) fail('ALL_AVAILABLE must not have an aggregate message ceiling');
  if (contract.enumeration?.viewerPageSize !== 50) fail('viewer page size must remain 50 for visible checkpoint cadence');
  if (contract.enumeration?.messageConcurrencyDefault !== 6) fail('message concurrency default must remain 6');
  if (contract.enumeration?.messageConcurrencyMax !== 10) fail('message concurrency hard ceiling must remain 10');
  if (contract.enumeration?.pageCommitBarrier !== 'ALL_UNIQUE_MESSAGE_TASKS_TERMINAL') fail('page commit must wait for every unique message task');
  if (contract.enumeration?.completeWhen !== 'nextPageToken_absent') fail('coverage completion must be page-token exhaustion');
  if (contract.resume?.invalidPageToken !== 'RESTART_FROM_BEGINNING_WITH_SOURCE_ID_DEDUP') fail('invalid cursor must restart safely');
  if (contract.resume?.skipUnknownRange !== false) fail('unknown ranges must never be skipped');
  if (contract.incrementalCutover?.anchor !== 'GREATEST_VALID_OBSERVED_MESSAGE_HISTORY_ID') fail('incremental anchor must be message-derived');
  if (contract.incrementalCutover?.profileHistoryIdSubstitution !== false) fail('/profile.historyId substitution must remain rejected');
  if (contract.realMailboxValidation?.repositoryRawFixtures !== 'FORBIDDEN') fail('real Gmail fixtures must never enter repo');
  if (contract.physicalExecution?.realOwnedGmail !== 'OPEN') fail('real Gmail physical execution must remain OPEN before controlled run');
  if (contract.physicalExecution?.windowsDpapiRealPreflight !== 'OPEN_UNTIL_USER_RUN') fail('Windows DPAPI physical preflight must remain open until real user run');
  if (contract.physicalExecution?.iosTouched !== false) fail('iOS must remain untouched for this path');
  if (contract.localViewer?.status !== 'STATIC_READY_REAL_OAUTH_OPEN') fail('real viewer must remain static-ready / real OAuth open');
  if (contract.localViewer?.oauthScope !== 'https://www.googleapis.com/auth/gmail.readonly') fail('viewer scope must be exact gmail.readonly');
  if (contract.localViewer?.stateEncryption !== 'AES_256_GCM') fail('viewer local state must use AES-256-GCM');
  if (contract.localViewer?.stateKeyProtection !== 'WINDOWS_DPAPI_CURRENT_USER') fail('viewer key must be Windows DPAPI CurrentUser protected');
  if (contract.localViewer?.dpapiPreflightBeforeCredentialSelection !== true) fail('DPAPI preflight must happen before credential selection');
  if (contract.localViewer?.wslUncLaunchSupported !== true) fail('one-click viewer must support WSL UNC launch');
  if (contract.localViewer?.wslUncStrategy !== 'WINDOWS_CMD_PUSHD_TEMP_DRIVE_MAPPING') fail('WSL UNC strategy must remain pushd temporary drive mapping');
  if (contract.localViewer?.refreshTokenDurablePersistence !== 'FORBIDDEN') fail('refresh token durable persistence must remain forbidden');
  if (contract.localViewer?.completeState !== 'ONLY_AFTER_NEXT_PAGE_TOKEN_ABSENT') fail('viewer COMPLETE semantics mismatch');

  for (const phrase of [
    'GMAIL EVIDENCE COVERAGE != BANK LEDGER COMPLETENESS',
    'SEARCH_Q != COMPLETENESS_ORACLE',
    'PARTIAL_BOOTSTRAP != COMPLETE',
    'REAL_PRIVATE_CORPUS != PUBLIC_TEST_FIXTURE'
  ]) {
    if (!adr.includes(phrase)) fail(`ADR-031 missing governing law: ${phrase}`);
  }

  for (const marker of ['async listMessagePage', 'includeSpamTrash']) {
    if (!provider.includes(marker)) fail(`Gmail provider missing historical paging marker: ${marker}`);
  }

  for (const marker of [
    'runAllAvailableActiveMailbox',
    "mode: 'ALL_AVAILABLE_ACTIVE_MAILBOX'",
    'includeSpamTrash: false',
    'restartedFromInvalidCursor',
    "historyCursorSource = 'MESSAGE_DERIVED_HISTORY_ID'",
    'messageConcurrency = 6',
    'messageConcurrency > 10',
    'forEachConcurrent(uniqueIds, messageConcurrency'
  ]) {
    if (!importer.includes(marker)) fail(`historical importer missing marker: ${marker}`);
  }
  if (/runAllAvailableActiveMailbox[\s\S]{0,500}days\s*=\s*90/.test(importer)) fail('ALL_AVAILABLE importer must not inherit 90-day ceiling');

  for (const marker of [
    'BCP_CARD_PURCHASE',
    'BCP_EXTERNAL_TRANSFER',
    'INTERBANK_CARD_PURCHASE',
    'INTERBANK_PLIN_PAYMENT',
    'RIPLEY_CARD_PAYMENT',
    'RIPLEY_PROMOTIONAL_DOMAIN',
    'KNOWN_BANK_NON_TRANSACTION',
    'MARKETING_ACCOUNT_OR_SECURITY'
  ]) {
    if (!adapters.includes(marker)) fail(`issuer adapter matrix missing marker: ${marker}`);
  }

  for (const marker of ["createCipheriv('aes-256-gcm'", "createDecipheriv('aes-256-gcm'", 'renameSync']) {
    if (!vault.includes(marker)) fail(`persistent encrypted vault missing marker: ${marker}`);
  }

  for (const marker of [
    'HistoricalGmailImporter',
    'LocalFileEncryptedVault',
    'LocalOAuthCredentialProvider',
    'GMAIL_READONLY_SCOPE',
    'WINDOWS_DPAPI_REQUIRED_FOR_REAL_HISTORY_VIEWER',
    'DataProtectionScope]::CurrentUser',
    'PAGE_SIZE = 50',
    "authUrl.searchParams.set('prompt', 'consent')",
    'ALL_DETECTED_TRANSACTION_EVIDENCE_WITHIN_COMPLETED_GMAIL_MAILBOX_SCOPE',
    'nextPageToken',
    '127.0.0.1'
  ]) {
    if (!viewer.includes(marker)) fail(`real history viewer missing marker: ${marker}`);
  }
  for (const forbidden of ['writeFileSync(refreshToken', 'writeFileSync(shortAccessToken', 'raw_mime', 'attachments.map']) {
    if (viewer.includes(forbidden)) fail(`real viewer contains forbidden persistence marker: ${forbidden}`);
  }

  for (const marker of [
    'FINANCESENSOR_GOOGLE_CREDENTIALS_PATH',
    'gmail.readonly',
    'owned-oauth-gmail-history-viewer.mjs',
    'iOS: NO TOCADO',
    'pushd "%~dp0.."',
    'FinanceSensor-DPAPI-Preflight',
    'DataProtectionScope]::CurrentUser',
    'Ruta WSL/UNC: SOPORTADA MEDIANTE PUSHD'
  ]) {
    if (!runner.includes(marker)) fail(`one-click history runner missing marker: ${marker}`);
  }
  const dpapiIndex = runner.indexOf('FinanceSensor-DPAPI-Preflight');
  const pickerIndex = runner.indexOf('System.Windows.Forms.OpenFileDialog');
  if (dpapiIndex < 0 || pickerIndex < 0 || dpapiIndex > pickerIndex) fail('DPAPI preflight must execute before OAuth credential picker');

  if (!resolver.includes('evidenceChannels')) fail('resolver must preserve independent evidence channels');
}

if (failures.length) {
  console.error('FINANCESENSOR_GMAIL_HISTORICAL_ONBOARDING=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_GMAIL_HISTORICAL_ONBOARDING=PASS');
console.log('COVERAGE_MODE=ALL_AVAILABLE_ACTIVE_MAILBOX');
console.log('COMPLETENESS_QUERY=OMITTED');
console.log('AGGREGATE_MESSAGE_LIMIT=NONE');
console.log('RAW_BODY_FETCH=CANDIDATES_ONLY');
console.log('MESSAGE_CONCURRENCY=6');
console.log('MESSAGE_CONCURRENCY_MAX=10');
console.log('PAGE_COMMIT_BARRIER=ALL_UNIQUE_MESSAGE_TASKS_TERMINAL');
console.log('INVALID_CURSOR=RESTART_WITH_SOURCE_ID_DEDUP');
console.log('INCREMENTAL_ANCHOR=MESSAGE_DERIVED_HISTORY_ID');
console.log('ISSUER_ADAPTERS=BCP,INTERBANK,RIPLEY');
console.log('LOCAL_HISTORY_STATE=AES_256_GCM');
console.log('LOCAL_HISTORY_KEY=WINDOWS_DPAPI_CURRENT_USER');
console.log('WSL_UNC_LAUNCH=STATIC_READY');
console.log('WINDOWS_DPAPI_PREFLIGHT=PHYSICAL_OPEN_UNTIL_USER_RUN');
console.log('REAL_HISTORY_VIEWER=STATIC_READY_REAL_OAUTH_OPEN');
console.log('REAL_GMAIL_EXECUTION=OPEN');
console.log('IOS_TOUCHED=0');
