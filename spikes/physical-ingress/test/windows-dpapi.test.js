import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDpapiFailure, windowsDpapi } from '../src/windows-dpapi.js';

test('DPAPI-DIAG-001 parses only the bounded sanitized marker', () => {
  const failure = parseDpapiFailure('FINANCESENSOR_DPAPI_FAILURE|stage=PROTECT|type=System.Security.Cryptography.CryptographicException|hresult=-2146893813|psmajor=5|psedition=Desktop');
  assert.deepEqual(failure, {
    stage: 'PROTECT',
    type: 'System.Security.Cryptography.CryptographicException',
    hresult: '-2146893813',
    psmajor: '5',
    psedition: 'Desktop'
  });
});

test('DPAPI-DIAG-002 raw PowerShell text is never forwarded when marker is absent', () => {
  const failure = parseDpapiFailure('C:\\Users\\private-user\\secret-path token=not-for-output');
  assert.deepEqual(failure, {
    stage: 'POWERSHELL_INVOCATION',
    type: 'UNKNOWN',
    hresult: 'UNKNOWN',
    psmajor: 'UNKNOWN',
    psedition: 'UNKNOWN'
  });
});

test('DPAPI-DIAG-003 non-Windows execution remains fail-closed', () => {
  if (process.platform === 'win32') return;
  assert.throws(() => windowsDpapi('preflight'), /WINDOWS_DPAPI_REQUIRED/);
});

test('DPAPI-DIAG-004 invalid modes are rejected before touching PowerShell', () => {
  assert.throws(() => windowsDpapi('unsupported-mode'), /WINDOWS_DPAPI_MODE_INVALID/);
});
