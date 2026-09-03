import fs from 'node:fs';

const contractPath = 'graph/gmail-historical-onboarding.json';
const adrPath = 'mk0/11-decisions/ADR-031-GMAIL-HISTORICAL-ONBOARDING-COVERAGE.md';
const providerPath = 'spikes/physical-ingress/src/gmail-rest-provider.js';
const importerPath = 'spikes/physical-ingress/src/historical-gmail-importer.js';
const adaptersPath = 'spikes/physical-ingress/src/transaction-evidence-adapters.js';
const resolverPath = 'spikes/canonical-resolver/src/resolver.js';
const tests = [
  'spikes/physical-ingress/test/transaction-evidence-adapters.test.js',
  'spikes/physical-ingress/test/historical-gmail-importer.test.js',
  'spikes/canonical-resolver/test/evidence-channel-reconciliation.test.js'
];
const failures = [];
const fail = message => failures.push(message);

for (const path of [contractPath, adrPath, providerPath, importerPath, adaptersPath, resolverPath, ...tests]) {
  if (!fs.existsSync(path)) fail(`missing Gmail historical artifact: ${path}`);
}

if (!failures.length) {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const adr = fs.readFileSync(adrPath, 'utf8');
  const provider = fs.readFileSync(providerPath, 'utf8');
  const importer = fs.readFileSync(importerPath, 'utf8');
  const adapters = fs.readFileSync(adaptersPath, 'utf8');
  const resolver = fs.readFileSync(resolverPath, 'utf8');

  if (contract.status !== 'STATIC_READY_REAL_GMAIL_OPEN') fail('historical contract must remain static-ready / real Gmail open');
  if (contract.coverageModes?.default !== 'ALL_AVAILABLE_ACTIVE_MAILBOX') fail('default coverage mode mismatch');
  if (contract.coverageModes?.includeSpamTrash !== false) fail('Spam/Trash must remain excluded by default');
  if (contract.enumeration?.query !== 'OMITTED') fail('completeness enumeration must omit Gmail q');
  if (contract.enumeration?.labelIds !== 'OMITTED') fail('completeness enumeration must omit label filters');
  if (contract.enumeration?.aggregateMessageLimit !== null) fail('ALL_AVAILABLE must not have an aggregate message ceiling');
  if (contract.enumeration?.completeWhen !== 'nextPageToken_absent') fail('coverage completion must be page-token exhaustion');
  if (contract.resume?.invalidPageToken !== 'RESTART_FROM_BEGINNING_WITH_SOURCE_ID_DEDUP') fail('invalid cursor must restart safely');
  if (contract.resume?.skipUnknownRange !== false) fail('unknown ranges must never be skipped');
  if (contract.incrementalCutover?.anchor !== 'GREATEST_VALID_OBSERVED_MESSAGE_HISTORY_ID') fail('incremental anchor must be message-derived');
  if (contract.incrementalCutover?.profileHistoryIdSubstitution !== false) fail('/profile.historyId substitution must remain rejected');
  if (contract.realMailboxValidation?.repositoryRawFixtures !== 'FORBIDDEN') fail('real Gmail fixtures must never enter repo');
  if (contract.physicalExecution?.realOwnedGmail !== 'OPEN') fail('real Gmail physical execution must remain OPEN before controlled run');

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
    "historyCursorSource = 'MESSAGE_DERIVED_HISTORY_ID'"
  ]) {
    if (!importer.includes(marker)) fail(`historical importer missing marker: ${marker}`);
  }
  if (/runAllAvailableActiveMailbox[\s\S]{0,500}days\s*=\s*90/.test(importer)) fail('ALL_AVAILABLE importer must not inherit 90-day ceiling');

  for (const marker of [
    'BCP_CARD_PURCHASE',
    'BCP_EXTERNAL_TRANSFER',
    'INTERBANK_CARD_PURCHASE',
    'INTERBANK_PLIN_PAYMENT',
    'KNOWN_BANK_NON_TRANSACTION',
    'MARKETING_ACCOUNT_OR_SECURITY'
  ]) {
    if (!adapters.includes(marker)) fail(`issuer adapter matrix missing marker: ${marker}`);
  }

  for (const marker of ['evidenceChannels', 'BANK_NOTIFICATION', 'MERCHANT_RECEIPT']) {
    if (!resolver.includes(marker) && marker === 'evidenceChannels') fail('resolver must preserve independent evidence channels');
  }
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
console.log('INVALID_CURSOR=RESTART_WITH_SOURCE_ID_DEDUP');
console.log('INCREMENTAL_ANCHOR=MESSAGE_DERIVED_HISTORY_ID');
console.log('REAL_GMAIL_EXECUTION=OPEN');
console.log('IOS_TOUCHED=0');
