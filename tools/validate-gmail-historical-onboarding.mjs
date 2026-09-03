import fs from 'node:fs';

const contractPath = 'graph/gmail-historical-onboarding.json';
const adrPath = 'mk0/11-decisions/ADR-031-GMAIL-HISTORICAL-ONBOARDING-COVERAGE.md';
const dpapiPhysicalEvidencePath = 'mk0/10-evidence/EV-WINDOWS-DPAPI-GMAIL-HISTORY-PARTIAL-PHYSICAL-2026-09-03.md';
const gmail403EvidencePath = 'mk0/10-evidence/EV-GMAIL-HISTORICAL-PARTIAL-HTTP403-2026-09-03.md';
const providerPath = 'spikes/physical-ingress/src/gmail-rest-provider.js';
const importerPath = 'spikes/physical-ingress/src/historical-gmail-importer.js';
const adaptersPath = 'spikes/physical-ingress/src/transaction-evidence-adapters.js';
const vaultPath = 'spikes/physical-ingress/src/file-encrypted-vault.js';
const viewerPath = 'spikes/physical-ingress/live/owned-oauth-gmail-history-viewer.mjs';
const windowsViewerPath = 'spikes/physical-ingress/live/owned-oauth-gmail-history-viewer-windows.mjs';
const dpapiPreflightPath = 'spikes/physical-ingress/live/windows-dpapi-preflight.mjs';
const dpapiBackendPath = 'spikes/physical-ingress/src/windows-dpapi.js';
const runnerPath = 'spikes/physical-ingress/live/RUN-FINANCESENSOR-GMAIL-HISTORY.cmd';
const resolverPath = 'spikes/canonical-resolver/src/resolver.js';
const tests = [
  'spikes/physical-ingress/test/gmail-rest-provider.test.js',
  'spikes/physical-ingress/test/transaction-evidence-adapters.test.js',
  'spikes/physical-ingress/test/historical-gmail-importer.test.js',
  'spikes/physical-ingress/test/historical-gmail-legacy-repair.test.js',
  'spikes/physical-ingress/test/file-encrypted-vault.test.js',
  'spikes/physical-ingress/test/windows-dpapi.test.js',
  'spikes/canonical-resolver/test/evidence-channel-reconciliation.test.js'
];
const failures = [];
const fail = message => failures.push(message);

for (const path of [
  contractPath,
  adrPath,
  dpapiPhysicalEvidencePath,
  gmail403EvidencePath,
  providerPath,
  importerPath,
  adaptersPath,
  vaultPath,
  viewerPath,
  windowsViewerPath,
  dpapiPreflightPath,
  dpapiBackendPath,
  runnerPath,
  resolverPath,
  ...tests
]) {
  if (!fs.existsSync(path)) fail(`missing Gmail historical artifact: ${path}`);
}

if (!failures.length) {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const adr = fs.readFileSync(adrPath, 'utf8');
  const dpapiPhysicalEvidence = fs.readFileSync(dpapiPhysicalEvidencePath, 'utf8');
  const gmail403Evidence = fs.readFileSync(gmail403EvidencePath, 'utf8');
  const provider = fs.readFileSync(providerPath, 'utf8');
  const importer = fs.readFileSync(importerPath, 'utf8');
  const adapters = fs.readFileSync(adaptersPath, 'utf8');
  const vault = fs.readFileSync(vaultPath, 'utf8');
  const viewer = fs.readFileSync(viewerPath, 'utf8');
  const windowsViewer = fs.readFileSync(windowsViewerPath, 'utf8');
  const dpapiPreflight = fs.readFileSync(dpapiPreflightPath, 'utf8');
  const dpapiBackend = fs.readFileSync(dpapiBackendPath, 'utf8');
  const runner = fs.readFileSync(runnerPath, 'utf8');
  const resolver = fs.readFileSync(resolverPath, 'utf8');

  if (contract.schemaVersion !== 4) fail('historical contract schemaVersion must be 4');
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
  if (contract.enumeration?.providerQuotaUnitsPerMinutePerUserProject !== 6000) fail('provider per-user quota evidence must be 6000 units/min');
  if (contract.enumeration?.localQuotaBudgetUnitsPerMinute !== 4800) fail('local quota budget must remain 4800 units/min');
  if (contract.enumeration?.localQuotaHeadroomPercent !== 20) fail('quota headroom must remain 20 percent');
  if (contract.enumeration?.messagesListQuotaUnits !== 5) fail('messages.list quota units mismatch');
  if (contract.enumeration?.messagesGetQuotaUnits !== 20) fail('messages.get quota units mismatch');
  if (contract.enumeration?.quotaGovernor !== 'METHOD_UNIT_PACED') fail('quota governor must pace by method units');
  if (contract.providerErrorPolicy?.parseRawErrorBody !== 'MEMORY_ONLY') fail('raw provider error body classification must be memory-only');
  if (contract.providerErrorPolicy?.persistRawErrorBody !== false) fail('raw provider error body persistence must remain forbidden');
  if (contract.providerErrorPolicy?.persistProviderMessage !== false) fail('provider error prose persistence must remain forbidden');
  if (contract.providerErrorPolicy?.boundedRetries !== 5) fail('bounded retry count must remain 5');
  if (contract.providerErrorPolicy?.maxBackoffMs !== 30000) fail('max backoff must remain 30000 ms');
  for (const reason of ['rateLimitExceeded', 'userRateLimitExceeded']) {
    if (!contract.providerErrorPolicy?.retryable403Reasons?.includes(reason)) fail(`retryable 403 reason missing: ${reason}`);
  }
  if (contract.resume?.invalidPageToken !== 'RESTART_FROM_BEGINNING_WITH_SOURCE_ID_DEDUP') fail('invalid cursor must restart safely');
  if (contract.resume?.skipUnknownRange !== false) fail('unknown ranges must never be skipped');
  if (contract.resume?.legacyDerivedRepair !== 'REFETCH_BY_LOCAL_SOURCE_MESSAGE_ID_ONLY') fail('legacy repair must use local source message id only');
  if (contract.resume?.legacyRepairRawBodyPersistence !== false) fail('legacy repair must not persist raw Gmail body');
  if (contract.incrementalCutover?.anchor !== 'GREATEST_VALID_OBSERVED_MESSAGE_HISTORY_ID') fail('incremental anchor must be message-derived');
  if (contract.incrementalCutover?.profileHistoryIdSubstitution !== false) fail('/profile.historyId substitution must remain rejected');
  if (contract.realMailboxValidation?.repositoryRawFixtures !== 'FORBIDDEN') fail('real Gmail fixtures must never enter repo');
  if (contract.physicalExecution?.realOwnedGmail !== 'OPEN') fail('real Gmail historical completion must remain OPEN after partial controlled runs');
  if (contract.physicalExecution?.realHistoricalCoverageReceipt !== 'ABSENT') fail('real historical coverage receipt must remain absent until COMPLETE');
  if (contract.physicalExecution?.windowsDpapiRealPreflight !== 'PASS_USER_OBSERVED') fail('Windows DPAPI physical preflight must remain user-observed PASS');
  if (contract.physicalExecution?.windowsDpapiEvidence !== dpapiPhysicalEvidencePath) fail('Windows DPAPI evidence path mismatch');
  if (contract.physicalExecution?.lastRealGmailRun !== 'PARTIAL_STOPPED_SAFE_GMAIL_API_HTTP_403') fail('latest real Gmail run must remain partial HTTP 403 until superseded');
  if (contract.physicalExecution?.lastRealGmailRunEvidence !== gmail403EvidencePath) fail('latest partial Gmail evidence path mismatch');
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

  for (const marker of [
    '**DPAPI status:** PASS — user-observed physical execution',
    'REAL GMAIL EXECUTION                      PARTIAL / STOPPED_SAFE',
    'REAL HISTORICAL COVERAGE                  OPEN',
    'COMPLETE CLAIM                           NO'
  ]) {
    if (!dpapiPhysicalEvidence.includes(marker)) fail(`DPAPI physical evidence missing marker: ${marker}`);
  }

  for (const marker of [
    '**Sanitized stop class:** `GMAIL_API_HTTP_403`',
    'HTTP_403_ALONE                         != RATE_LIMIT_PROVEN',
    'EXACT 403 REASON                        OPEN',
    'REAL HISTORICAL COVERAGE                OPEN'
  ]) {
    if (!gmail403Evidence.includes(marker)) fail(`HTTP 403 physical evidence missing marker: ${marker}`);
  }

  for (const marker of [
    'async listMessagePage',
    'includeSpamTrash',
    'DEFAULT_QUOTA_BUDGET_PER_MINUTE = 4800',
    "['userRateLimitExceeded', 'USER_RATE_LIMIT_EXCEEDED']",
    'quotaUnitsFor(path)',
    'async _acquireQuota(cost)',
    'await response.text()',
    'RETRYABLE_403_REASONS',
    'error.retryable',
    'maxRetries = DEFAULT_MAX_RETRIES'
  ]) {
    if (!provider.includes(marker)) fail(`Gmail provider missing quota/diagnostic marker: ${marker}`);
  }
  for (const forbidden of ['error.providerBody =', 'error.providerMessage =', 'rawProviderError']) {
    if (provider.includes(forbidden)) fail(`Gmail provider contains forbidden raw error persistence marker: ${forbidden}`);
  }

  for (const marker of [
    'runAllAvailableActiveMailbox',
    "mode: 'ALL_AVAILABLE_ACTIVE_MAILBOX'",
    'includeSpamTrash: false',
    'restartedFromInvalidCursor',
    "historyCursorSource = 'MESSAGE_DERIVED_HISTORY_ID'",
    'messageConcurrency = 6',
    'messageConcurrency > 10',
    'forEachConcurrent(uniqueIds, messageConcurrency',
    "if (item.semanticType === 'CARD_PAYMENT') return item.rawMerchant || 'Pago de tarjeta'",
    'isLegacyMarkupMerchant',
    'async _repairLegacyDerivedEvidence(state)',
    'legacyDerivedRepairs',
    'await this._repairLegacyDerivedEvidence(state)'
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
    'MARKETING_ACCOUNT_OR_SECURITY',
    'htmlBodyToText'
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
    'node live\\windows-dpapi-preflight.mjs',
    'node live\\owned-oauth-gmail-history-viewer-windows.mjs',
    'iOS: NO TOCADO',
    'pushd "%~dp0.."',
    'Ruta WSL/UNC: SOPORTADA MEDIANTE PUSHD',
    'System.Windows.Forms.OpenFileDialog'
  ]) {
    if (!runner.includes(marker)) fail(`one-click history runner missing marker: ${marker}`);
  }

  const dpapiIndex = runner.indexOf('node live\\windows-dpapi-preflight.mjs');
  const pickerIndex = runner.indexOf('System.Windows.Forms.OpenFileDialog');
  const viewerIndex = runner.indexOf('node live\\owned-oauth-gmail-history-viewer-windows.mjs');
  if (dpapiIndex < 0 || pickerIndex < 0 || dpapiIndex > pickerIndex) fail('DPAPI preflight must execute before OAuth credential picker');
  if (viewerIndex < 0 || pickerIndex < 0 || viewerIndex < pickerIndex) fail('real history viewer must execute only after credential selection');

  for (const marker of [
    "import { dpapiPreflight } from '../src/windows-dpapi.js'",
    'dpapiPreflight()',
    'FINANCESENSOR_DPAPI_PREFLIGHT=PASS',
    'FINANCESENSOR_DPAPI_PREFLIGHT=FAIL'
  ]) {
    if (!dpapiPreflight.includes(marker)) fail(`DPAPI preflight entrypoint missing marker: ${marker}`);
  }

  for (const marker of [
    "Add-Type -AssemblyName System.Security -ErrorAction Stop",
    '[System.Security.Cryptography.ProtectedData]::Protect',
    '[System.Security.Cryptography.ProtectedData]::Unprotect',
    '[System.Security.Cryptography.DataProtectionScope]::CurrentUser',
    'FinanceSensor-DPAPI-Preflight',
    'FINANCESENSOR_DPAPI_FAILURE|',
    "new Set(['preflight', 'protect', 'unprotect'])"
  ]) {
    if (!dpapiBackend.includes(marker)) fail(`Windows DPAPI backend missing marker: ${marker}`);
  }
  for (const forbidden of [
    'FINANCESENSOR_GOOGLE_CREDENTIALS_PATH',
    'gmail.googleapis.com',
    'accounts.google.com',
    'access_token',
    'refresh_token'
  ]) {
    if (dpapiBackend.includes(forbidden)) fail(`Windows DPAPI backend crosses forbidden OAuth/Gmail boundary: ${forbidden}`);
  }

  for (const marker of [
    "Add-Type -AssemblyName System.Security -ErrorAction Stop",
    '[System.Security.Cryptography.ProtectedData]',
    "await import('./owned-oauth-gmail-history-viewer.mjs')",
    'syncBuiltinESMExports()'
  ]) {
    if (!windowsViewer.includes(marker)) fail(`Windows history viewer shim missing marker: ${marker}`);
  }

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
console.log('GMAIL_PROVIDER_QUOTA_UNITS_PER_MINUTE=6000');
console.log('LOCAL_QUOTA_BUDGET_UNITS_PER_MINUTE=4800');
console.log('MESSAGES_GET_QUOTA_UNITS=20');
console.log('MESSAGES_LIST_QUOTA_UNITS=5');
console.log('QUOTA_GOVERNOR=METHOD_UNIT_PACED');
console.log('RETRYABLE_403=RATE_LIMIT_EXCEEDED,USER_RATE_LIMIT_EXCEEDED');
console.log('RAW_PROVIDER_ERROR_PERSISTENCE=0');
console.log('LEGACY_DERIVED_REPAIR=REFETCH_BY_SOURCE_ID');
console.log('PAGE_COMMIT_BARRIER=ALL_UNIQUE_MESSAGE_TASKS_TERMINAL');
console.log('INVALID_CURSOR=RESTART_WITH_SOURCE_ID_DEDUP');
console.log('INCREMENTAL_ANCHOR=MESSAGE_DERIVED_HISTORY_ID');
console.log('ISSUER_ADAPTERS=BCP,INTERBANK,RIPLEY');
console.log('LOCAL_HISTORY_STATE=AES_256_GCM');
console.log('LOCAL_HISTORY_KEY=WINDOWS_DPAPI_CURRENT_USER');
console.log('DPAPI_TOPOLOGY=RUNNER_TO_PREFLIGHT_TO_WINDOWS_BACKEND');
console.log('WSL_UNC_LAUNCH=STATIC_READY');
console.log('WINDOWS_DPAPI_PREFLIGHT=PASS_USER_OBSERVED');
console.log('REAL_HISTORY_VIEWER=STATIC_READY_REAL_OAUTH_OPEN');
console.log('REAL_GMAIL_EXECUTION=PARTIAL_STOPPED_SAFE_GMAIL_API_HTTP_403');
console.log('REAL_HISTORICAL_COVERAGE=OPEN');
console.log('IOS_TOUCHED=0');
