import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  decideHistoricalWriterGate,
  HistoricalWriterGateAction
} from '../src/historical-writer-gate.js';

const viewerPath = new URL('../live/owned-oauth-bank-statements-viewer.mjs', import.meta.url);
const runnerPath = new URL('../live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd', import.meta.url);
const recoveryPath = new URL('../live/recover-stale-historical-writer.mjs', import.meta.url);

const viewer = fs.readFileSync(viewerPath, 'utf8');
const runner = fs.readFileSync(runnerPath, 'utf8');
const recovery = fs.readFileSync(recoveryPath, 'utf8');

test('trusted-edge viewer uses geometric layout path for the physically enabled savings profile', () => {
  assert.match(viewer, /extractPasswordProtectedPdfLayout/);
  assert.match(viewer, /importStatementLayoutSession/);
  assert.match(viewer, /parseStatementProfileLayout/);
  assert.match(viewer, /PHYSICAL_LAYOUT_IMPORT_PROFILES[\s\S]*StatementProviderProfile\.BCP_SAVINGS_REQUESTED/);
  assert.match(viewer, /BCP_SAVINGS_LAYOUT_PHYSICAL_HARNESS=ENABLED/);
});

test('credit statement import remains physically blocked instead of falling back to generic text parser', () => {
  const setBlock = viewer.match(/const PHYSICAL_LAYOUT_IMPORT_PROFILES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
  assert.equal(setBlock.includes('BCP_CREDIT'), false);
  assert.equal(setBlock.includes('RIPLEY_CREDIT'), false);
  assert.equal(viewer.includes("from '../src/statement-row-parser.js'"), false);
  assert.equal(viewer.includes('extractPasswordProtectedPdfText'), false);
  assert.match(viewer, /STATEMENT_PROFILE_PHYSICAL_HARNESS_NOT_ENABLED/);
  assert.match(viewer, /CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN/);
});

test('real harness remains local, password non-durable and iOS untouched', () => {
  assert.match(viewer, /STATEMENT_PASSWORD_PERSISTENCE=0/);
  assert.match(viewer, /RAW_DECRYPTED_STATEMENT_DURABILITY=0/);
  assert.match(viewer, /LAYOUT_PLAINTEXT_DURABILITY=0/);
  assert.match(viewer, /IOS_TOUCHED=0/);
  assert.match(runner, /windows-dpapi-preflight\.mjs/);
  assert.match(runner, /FINANCESENSOR_GOOGLE_CREDENTIALS_PATH/);
});

test('statement launcher recovers stale historical RUNNING only before OAuth and fails closed on a live owner', () => {
  assert.match(runner, /recover-stale-historical-writer\.mjs/);
  assert.ok(runner.indexOf('recover-stale-historical-writer.mjs') < runner.indexOf('OpenFileDialog'));
  assert.equal(
    decideHistoricalWriterGate({ bootstrapStatus: 'RUNNING', historyViewerProcessActive: false }).action,
    HistoricalWriterGateAction.RECOVER_STALE_RUNNING
  );
  assert.equal(
    decideHistoricalWriterGate({ bootstrapStatus: 'RUNNING', historyViewerProcessActive: true }).action,
    HistoricalWriterGateAction.BLOCK_ACTIVE
  );
  assert.match(recovery, /Get-CimInstance Win32_Process/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_WRITER=ACTIVE/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_WRITER=UNKNOWN_FAIL_CLOSED/);
  assert.match(recovery, /status: 'PAUSED'/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_STALE_RUNNING_RECOVERED=1/);
  assert.equal(/console\.(?:log|error)\([^\n]*(?:snapshot|mailbox|password|access_token|refresh_token)/i.test(recovery), false);
});

test('stale historical recovery entrypoint is syntactically valid without executing Windows code in CI', () => {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(recoveryPath)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
