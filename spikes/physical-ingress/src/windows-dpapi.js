import { execFileSync } from 'node:child_process';

const FAILURE_PREFIX = 'FINANCESENSOR_DPAPI_FAILURE|';
const MODES = new Set(['preflight', 'protect', 'unprotect']);

const POWERSHELL_DPAPI = String.raw`
$ErrorActionPreference = 'Stop'
$mode = $env:FINANCESENSOR_DPAPI_MODE

function Fail-Dpapi([string]$stage, [System.Exception]$exception) {
  $type = if ($null -ne $exception) { $exception.GetType().FullName } else { 'UNKNOWN' }
  $hresult = if ($null -ne $exception) { $exception.HResult } else { 0 }
  $major = $PSVersionTable.PSVersion.Major
  $edition = if ($PSVersionTable.PSObject.Properties.Name -contains 'PSEdition') { $PSVersionTable.PSEdition } else { 'Desktop' }
  [Console]::Error.Write("FINANCESENSOR_DPAPI_FAILURE|stage=$stage|type=$type|hresult=$hresult|psmajor=$major|psedition=$edition")
  exit 91
}

try {
  Add-Type -AssemblyName System.Security -ErrorAction Stop
} catch {
  Fail-Dpapi 'ASSEMBLY_LOAD' $_.Exception
}

try {
  $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
} catch {
  Fail-Dpapi 'TYPE_RESOLUTION' $_.Exception
}

if ($mode -eq 'preflight') {
  $plain = [Text.Encoding]::UTF8.GetBytes('FinanceSensor-DPAPI-Preflight')
  try {
    $protected = [System.Security.Cryptography.ProtectedData]::Protect($plain, $null, $scope)
  } catch {
    Fail-Dpapi 'PROTECT' $_.Exception
  }
  try {
    $unprotected = [System.Security.Cryptography.ProtectedData]::Unprotect($protected, $null, $scope)
  } catch {
    Fail-Dpapi 'UNPROTECT' $_.Exception
  }
  if ([Text.Encoding]::UTF8.GetString($unprotected) -ne 'FinanceSensor-DPAPI-Preflight') {
    [Console]::Error.Write("FINANCESENSOR_DPAPI_FAILURE|stage=ROUNDTRIP_MISMATCH|type=NONE|hresult=0|psmajor=$($PSVersionTable.PSVersion.Major)|psedition=$edition")
    exit 92
  }
  [Console]::Out.Write('PASS')
  exit 0
}

try {
  $encoded = [Console]::In.ReadToEnd().Trim()
  $bytes = [Convert]::FromBase64String($encoded)
} catch {
  Fail-Dpapi 'INPUT_DECODE' $_.Exception
}

if ($mode -eq 'protect') {
  try {
    $result = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, $scope)
  } catch {
    Fail-Dpapi 'PROTECT' $_.Exception
  }
} elseif ($mode -eq 'unprotect') {
  try {
    $result = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, $scope)
  } catch {
    Fail-Dpapi 'UNPROTECT' $_.Exception
  }
} else {
  [Console]::Error.Write("FINANCESENSOR_DPAPI_FAILURE|stage=MODE_INVALID|type=NONE|hresult=0|psmajor=$($PSVersionTable.PSVersion.Major)|psedition=$edition")
  exit 93
}

[Console]::Out.Write([Convert]::ToBase64String($result))
`;

function compactField(value, fallback = 'UNKNOWN') {
  const normalized = String(value ?? fallback).replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 120);
  return normalized || fallback;
}

export function parseDpapiFailure(stderr = '') {
  const line = String(stderr).split(/\r?\n/).find(candidate => candidate.startsWith(FAILURE_PREFIX));
  if (!line) {
    return {
      stage: 'POWERSHELL_INVOCATION',
      type: 'UNKNOWN',
      hresult: 'UNKNOWN',
      psmajor: 'UNKNOWN',
      psedition: 'UNKNOWN'
    };
  }

  const fields = Object.create(null);
  for (const field of line.slice(FAILURE_PREFIX.length).split('|')) {
    const separator = field.indexOf('=');
    if (separator <= 0) continue;
    fields[field.slice(0, separator)] = field.slice(separator + 1);
  }

  return {
    stage: compactField(fields.stage),
    type: compactField(fields.type),
    hresult: compactField(fields.hresult),
    psmajor: compactField(fields.psmajor),
    psedition: compactField(fields.psedition)
  };
}

function toDiagnostic(failure) {
  return `stage=${failure.stage} type=${failure.type} hresult=${failure.hresult} powershell=${failure.psmajor}/${failure.psedition}`;
}

export function windowsDpapi(mode, inputBuffer = Buffer.alloc(0)) {
  if (!MODES.has(mode)) throw new Error('WINDOWS_DPAPI_MODE_INVALID');
  if (process.platform !== 'win32') throw new Error('WINDOWS_DPAPI_REQUIRED');

  try {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_DPAPI], {
      input: Buffer.from(inputBuffer).toString('base64'),
      encoding: 'utf8',
      windowsHide: true,
      env: { ...process.env, FINANCESENSOR_DPAPI_MODE: mode },
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (mode === 'preflight') {
      if (output !== 'PASS') throw new Error('WINDOWS_DPAPI_PREFLIGHT_OUTPUT_INVALID');
      return true;
    }

    const decoded = Buffer.from(output, 'base64');
    if (decoded.length === 0) throw new Error('WINDOWS_DPAPI_EMPTY_OUTPUT');
    return decoded;
  } catch (error) {
    if (String(error?.message || '').startsWith('WINDOWS_DPAPI_')) throw error;
    const failure = parseDpapiFailure(error?.stderr?.toString?.() || '');
    const safeError = new Error(`WINDOWS_DPAPI_${failure.stage}`);
    safeError.code = `WINDOWS_DPAPI_${failure.stage}`;
    safeError.diagnostic = toDiagnostic(failure);
    throw safeError;
  }
}

export function dpapiPreflight() {
  return windowsDpapi('preflight');
}
