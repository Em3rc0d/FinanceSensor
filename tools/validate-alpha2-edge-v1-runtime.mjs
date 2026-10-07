import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  edgeSource,
  transactionScanner,
  mainActivity,
  materializer,
  mailModelText,
  statementModelText,
] = await Promise.all([
  read('spikes/mobile-shell/native/android/Alpha2EdgeTextModel.kt'),
  read('spikes/mobile-shell/native/android/Alpha2TransactionScanner.kt'),
  read('spikes/mobile-shell/native/android/Alpha2MainActivity.kt'),
  read('tools/materialize-alpha2-android.py'),
  read('spikes/mobile-shell/native/android/assets/edge_mail_model_v1.json'),
  read('spikes/mobile-shell/native/android/assets/edge_statement_mail_model_v1.json'),
]);

const mail = JSON.parse(mailModelText);
const statement = JSON.parse(statementModelText);

if (mail.schema !== 'POCKETFINANCES_EDGE_MAIL_MODEL_V1') {
  throw new Error('EDGE_MAIL_SCHEMA_MISMATCH');
}
if (statement.schema !== 'POCKETFINANCES_EDGE_STATEMENT_MAIL_MODEL_V1') {
  throw new Error('EDGE_STATEMENT_SCHEMA_MISMATCH');
}
for (const [name, model] of [['mail', mail], ['statement', statement]]) {
  if (model.training?.provider_identity_features !== false) {
    throw new Error(`EDGE_PROVIDER_IDENTITY_FEATURES_FORBIDDEN:${name}`);
  }
  if (model.training?.runtime_provider_switch !== false) {
    throw new Error(`EDGE_RUNTIME_PROVIDER_SWITCH_FORBIDDEN:${name}`);
  }
}
if (mail.feature_dim !== mail.hash_dim + 8) throw new Error('EDGE_MAIL_DIMENSION_MISMATCH');
if (statement.feature_dim !== statement.hash_dim + 6) throw new Error('EDGE_STATEMENT_DIMENSION_MISMATCH');
if (!Array.isArray(mail.labels) || !mail.labels.includes('NON_FINANCIAL')) {
  throw new Error('EDGE_NON_FINANCIAL_LABEL_REQUIRED');
}
if (!Array.isArray(mail.coef) || mail.coef.length !== mail.labels.length) {
  throw new Error('EDGE_MAIL_COEFFICIENT_ROWS_MISMATCH');
}
for (const row of mail.coef) {
  if (!Array.isArray(row) || row.length !== mail.feature_dim || row.some(value => !Number.isFinite(value))) {
    throw new Error('EDGE_MAIL_COEFFICIENT_INVALID');
  }
}
if (!Array.isArray(statement.coef) || statement.coef.length !== statement.feature_dim) {
  throw new Error('EDGE_STATEMENT_COEFFICIENT_DIMENSION_MISMATCH');
}
if (statement.coef.some(value => !Number.isFinite(value)) || !Number.isFinite(statement.intercept)) {
  throw new Error('EDGE_STATEMENT_COEFFICIENT_INVALID');
}

for (const forbidden of [
  'notificacionesbcp.com.pe',
  'netinterbank.com.pe',
  'bancoripley.com.pe',
  'BANCO_RIPLEY',
  'BCP_CARD_PURCHASE',
  'INTERBANK_CARD_PURCHASE',
]) {
  if (edgeSource.includes(forbidden)) {
    throw new Error(`EDGE_PROVIDER_SPECIFIC_RUNTIME_FORBIDDEN:${forbidden}`);
  }
}

for (const marker of [
  'Alpha2EdgeModelBundle',
  'edge_mail_model_v1.json',
  'edge_statement_mail_model_v1.json',
]) {
  if (!edgeSource.includes(marker)) throw new Error(`EDGE_MODEL_LOADER_MISSING:${marker}`);
}

for (const marker of [
  'edgeMailModel: Alpha2EdgeMailModel? = null',
  'edgeStatementMailModel: Alpha2EdgeStatementMailModel? = null',
  '"edgeShadowMode" to "OBSERVE_ONLY"',
  '"edgePersistedEvents" to 0',
  '"edgeProviderIdentityFeatures" to false',
  'edgeLabelFor(candidate.adapterId)',
]) {
  if (!transactionScanner.includes(marker)) throw new Error(`EDGE_SHADOW_WIRING_MISSING:${marker}`);
}

// Edge V1 observes the subject only. Provider address/domain stays outside model input.
if (!transactionScanner.includes('val subject = headers["subject"].orEmpty()')) {
  throw new Error('EDGE_SUBJECT_INPUT_MISSING');
}
if (!transactionScanner.includes('edgeMailModel?.predict(subject)')) {
  throw new Error('EDGE_MAIL_SUBJECT_ONLY_REQUIRED');
}
if (!transactionScanner.includes('edgeStatementMailModel?.probability(subject)')) {
  throw new Error('EDGE_STATEMENT_SUBJECT_ONLY_REQUIRED');
}

// The proven +2017 adapter path remains the only event authority in +2018 shadow mode.
if (!transactionScanner.includes('val candidate = classify(headers["from"].orEmpty(), subject)')) {
  throw new Error('EDGE_GOLDEN_ORACLE_MISSING');
}
if (!transactionScanner.includes('val event = extract(')) {
  throw new Error('EDGE_CLASSIC_EVENT_AUTHORITY_MISSING');
}
if (!mainActivity.includes('"gmailEvidence" to (transaction["events"]')) {
  throw new Error('EDGE_SHADOW_MUST_NOT_REPLACE_GMAIL_EVIDENCE');
}

for (const marker of [
  'Alpha2EdgeModelBundle.load(this)',
  'edgeMailModel = edgeModels?.mail',
  'edgeStatementMailModel = edgeModels?.statementMail',
  '"edgePersistedEvents" to 0',
]) {
  if (!mainActivity.includes(marker)) throw new Error(`EDGE_MAIN_WIRING_MISSING:${marker}`);
}

for (const marker of [
  "('Alpha2EdgeTextModel.kt', 'Alpha2EdgeTextModel.kt')",
  "'edge_mail_model_v1.json'",
  "'edge_statement_mail_model_v1.json'",
  "android/app/src/main/assets",
]) {
  if (!materializer.includes(marker)) throw new Error(`EDGE_ANDROID_PACKAGING_MISSING:${marker}`);
}

console.log('ALPHA2_EDGE_V1_RUNTIME=PASS');
console.log('EDGE_EXECUTION_MODE=OBSERVE_ONLY');
console.log('EDGE_PROVIDER_IDENTITY_FEATURES=NO');
console.log('EDGE_RUNTIME_PROVIDER_SWITCH=NO');
console.log('EDGE_DURABLE_FINANCIAL_AUTHORITY=NO');
console.log('EDGE_PERSISTED_EVENTS=0');
console.log('GOLDEN_2017_AUTHORITY=PRESERVED');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
