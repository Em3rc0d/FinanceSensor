import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const viewerPath = new URL('../live/owned-oauth-bank-statements-viewer.mjs', import.meta.url);
const runnerPath = new URL('../live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd', import.meta.url);

const viewer = fs.readFileSync(viewerPath, 'utf8');
const runner = fs.readFileSync(runnerPath, 'utf8');

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
