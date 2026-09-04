import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner = fs.readFileSync(new URL('../live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd', import.meta.url), 'utf8');
const recovery = fs.readFileSync(new URL('../live/recover-stale-historical-writer.mjs', import.meta.url), 'utf8');

test('statement launcher resolves historical writer ownership before OAuth credential selection', () => {
  assert.match(runner, /recover-stale-historical-writer\.mjs/);
  assert.ok(runner.indexOf('recover-stale-historical-writer.mjs') < runner.indexOf('OpenFileDialog'));
  assert.match(runner, /No se seleccionaron credenciales y no se accedio a Gmail en este intento/);
});

test('stale RUNNING recovery is local, bounded and fail-closed', () => {
  assert.match(recovery, /Get-CimInstance Win32_Process/);
  assert.match(recovery, /owned-oauth-gmail-history-viewer/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_WRITER=ACTIVE/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_WRITER=UNKNOWN_FAIL_CLOSED/);
  assert.match(recovery, /status: 'PAUSED'/);
  assert.match(recovery, /FINANCESENSOR_HISTORICAL_STALE_RUNNING_RECOVERED=1/);
  assert.equal(/console\.(?:log|error)\([^\n]*(?:state|snapshot|mailbox|password|access_token|refresh_token)/i.test(recovery), false);
});
