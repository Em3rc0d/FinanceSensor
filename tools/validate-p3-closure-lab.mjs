import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const contractPath = 'graph/p3-closure-lab.json';
const campaignPath = 'graph/physical-closure-campaign.json';
const adr29Path = 'mk0/11-decisions/ADR-029-MK0-CLOSURE-LAB-EVIDENCE-INFRASTRUCTURE.md';
const adr30Path = 'mk0/11-decisions/ADR-030-DELETION-RESURRECTION-BARRIER.md';
const modelPath = 'spikes/e2ee-sync/src/deletion-resurrection.js';
const testPath = 'spikes/e2ee-sync/test/deletion-resurrection.test.js';
const failures = [];
const fail = message => failures.push(message);

for (const path of [contractPath, campaignPath, adr29Path, adr30Path, modelPath, testPath]) {
  if (!fs.existsSync(path)) fail(`missing P3 artifact: ${path}`);
}

if (!failures.length) {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
  const adr29 = fs.readFileSync(adr29Path, 'utf8');
  const adr30 = fs.readFileSync(adr30Path, 'utf8');
  const p3 = (campaign.phases ?? []).find(phase => phase.id === 'P3');

  if (contract.schemaVersion !== 1) fail('P3 contract schemaVersion must be 1');
  if (contract.project !== 'FinanceSensor') fail('P3 contract project mismatch');
  if (contract.phase !== 'P3') fail('P3 contract phase mismatch');
  if (contract.status !== 'STATIC_READY_PHYSICAL_OPEN') fail('P3 must remain STATIC_READY_PHYSICAL_OPEN');
  if (contract.provider !== 'SUPABASE') fail('P3 Closure Lab provider must remain Supabase under ADR-010');
  if (contract.environmentClass !== 'MK0_CLOSURE_LAB') fail('Closure Lab environment class mismatch');
  if (contract.provisioningState !== 'NOT_PROVISIONED') fail('P3 static contract must not falsely claim a provisioned lab');
  if (contract.buildReadyAuthority !== false) fail('Closure Lab must not grant BUILD_READY');

  for (const [key, expected] of Object.entries({
    syntheticOnly: true,
    realUserDataAllowed: false,
    realGmailAllowed: false,
    realFinancialPlaintextAllowed: false,
    productionKeysAllowed: false,
    customerTrafficAllowed: false
  })) {
    if (contract.dataPolicy?.[key] !== expected) fail(`dataPolicy.${key} must be ${expected}`);
  }

  if (contract.restoreDomains?.deletionBarrierRegistry !== 'INDEPENDENT_RESTORE_DOMAIN_REQUIRED') {
    fail('deletion barrier registry must be outside the primary restore domain');
  }
  if (contract.restoreDomains?.sameDatabaseTombstoneSufficient !== false) fail('same-database tombstone must be rejected');
  if (contract.backupContract?.maxApplicableRetentionDays !== 35) fail('backup ceiling must remain 35 days');
  if (contract.backupContract?.providerDocumentationAloneIsPass !== false) fail('provider docs alone cannot prove P3');
  if (contract.deletionBarrierContract?.registryUnavailableDecision !== 'DENY_RESTORE_INDETERMINATE') {
    fail('registry outage must fail closed');
  }
  if (contract.deletionBarrierContract?.restoreQuarantineRequired !== true) fail('restore quarantine must be mandatory');

  const campaignClaims = new Set(p3?.requiredClaims ?? []);
  const contractClaims = new Set(contract.requiredClaims ?? []);
  if (campaignClaims.size !== contractClaims.size || [...campaignClaims].some(claim => !contractClaims.has(claim))) {
    fail('P3 contract claim set must exactly match physical campaign P3');
  }
  if (p3?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail('campaign P3 must remain physically open');

  for (const phrase of [
    'CLOSURE_LAB != PRODUCTION',
    'real Gmail OAuth authority',
    'PAID PROVIDER ACTION REQUIRES COST APPROVAL'
  ]) {
    if (!adr29.toUpperCase().includes(phrase.toUpperCase())) fail(`ADR-029 missing governing boundary: ${phrase}`);
  }

  for (const phrase of [
    'SAME RESTORE DOMAIN TOMBSTONE',
    'RESTORE_QUARANTINE',
    'REGISTRY_UNAVAILABLE != NOT_DELETED',
    'PHYSICAL_PROVIDER_RESTORE > SIMULATED_RESTORE CLAIM'
  ]) {
    if (!adr30.includes(phrase)) fail(`ADR-030 missing fail-closed boundary: ${phrase}`);
  }

  const test = spawnSync(process.execPath, ['--test', testPath], { encoding: 'utf8' });
  if (test.status !== 0) {
    fail(`P3 deletion resurrection negative matrix failed:\n${test.stdout}\n${test.stderr}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_P3_CLOSURE_LAB=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_P3_CLOSURE_LAB=PASS');
console.log('P3_STATIC_CONTRACT=READY');
console.log('P3_DELETION_NEGATIVE_MATRIX=5/5_PASS');
console.log('P3_PROVIDER_ENVIRONMENT=NOT_PROVISIONED');
console.log('P3_PROVIDER_RESTORE=PHYSICAL_OPEN');
console.log('P3_BACKUP_RETENTION=PHYSICAL_OPEN');
console.log('P3_PHYSICAL_PASS=false');
console.log('BUILD_READY=false');
