import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LocalFileEncryptedVault } from '../src/file-encrypted-vault.js';
import { windowsDpapi } from '../src/windows-dpapi.js';
import {
  decideHistoricalWriterGate,
  HistoricalWriterGateAction
} from '../src/historical-writer-gate.js';

const localRoot = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), '.financesensor'),
  'FinanceSensor',
  'gmail-history-dev'
);
const wrappedKeyPath = path.join(localRoot, 'history-key.dpapi');
const snapshotPath = path.join(localRoot, 'history-state.aesgcm.json');

function detectHistoricalViewerProcess() {
  if (process.platform !== 'win32') return null;
  const script = [
    `$selfPid=${process.pid}`,
    "$p = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" |",
    "  Where-Object { $_.ProcessId -ne $selfPid -and $_.CommandLine -like '*owned-oauth-gmail-history-viewer*' } |",
    '  Select-Object -First 1',
    "if ($null -ne $p) { [Console]::Write('ACTIVE') } else { [Console]::Write('INACTIVE') }"
  ].join('; ');

  try {
    const marker = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    if (marker === 'ACTIVE') return true;
    if (marker === 'INACTIVE') return false;
    return null;
  } catch {
    return null;
  }
}

function loadVault() {
  if (process.platform !== 'win32') throw new Error('WINDOWS_REQUIRED');
  if (!fs.existsSync(wrappedKeyPath) || !fs.existsSync(snapshotPath)) return null;

  const wrapped = Buffer.from(fs.readFileSync(wrappedKeyPath, 'utf8').trim(), 'base64');
  let key;
  try {
    key = windowsDpapi('unprotect', wrapped);
  } finally {
    wrapped.fill(0);
  }

  try {
    if (key.length !== 32) throw new Error('DPAPI_VAULT_KEY_LENGTH_INVALID');
    return new LocalFileEncryptedVault({ key, snapshotPath });
  } finally {
    key?.fill?.(0);
  }
}

try {
  const vault = loadVault();
  if (!vault) {
    console.log('FINANCESENSOR_HISTORICAL_WRITER_STATE=NO_LOCAL_HISTORY_STATE');
    process.exit(0);
  }

  const state = vault.read();
  const status = state?.historicalBootstrap?.status ?? 'NOT_STARTED';
  const processActive = status === 'RUNNING' ? detectHistoricalViewerProcess() : false;
  const decision = decideHistoricalWriterGate({
    bootstrapStatus: status,
    historyViewerProcessActive: processActive
  });

  if (decision.action === HistoricalWriterGateAction.ALLOW) {
    console.log(`FINANCESENSOR_HISTORICAL_WRITER_STATE=${decision.status}`);
    process.exit(0);
  }

  if (decision.action === HistoricalWriterGateAction.BLOCK_ACTIVE) {
    console.error('FINANCESENSOR_HISTORICAL_WRITER=ACTIVE');
    process.exit(20);
  }

  if (decision.action === HistoricalWriterGateAction.BLOCK_UNKNOWN) {
    console.error('FINANCESENSOR_HISTORICAL_WRITER=UNKNOWN_FAIL_CLOSED');
    process.exit(21);
  }

  const repaired = {
    ...state,
    historicalBootstrap: {
      ...(state?.historicalBootstrap ?? {}),
      status: 'PAUSED'
    }
  };
  vault.write(repaired);
  console.log('FINANCESENSOR_HISTORICAL_STALE_RUNNING_RECOVERED=1');
  console.log('FINANCESENSOR_HISTORICAL_WRITER_STATE=PAUSED');
} catch {
  console.error('FINANCESENSOR_HISTORICAL_WRITER_PREFLIGHT=FAILED_CLOSED');
  process.exit(22);
}
