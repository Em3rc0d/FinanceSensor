import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

if (process.platform !== 'win32') {
  throw new Error('WINDOWS_DPAPI_REQUIRED_FOR_REAL_HISTORY_VIEWER');
}

const originalExecFileSync = childProcess.execFileSync;

childProcess.execFileSync = function financesensorWindowsExecFileSync(file, args = [], options = {}) {
  const normalizedFile = String(file || '').toLowerCase();
  const commandIndex = Array.isArray(args) ? args.indexOf('-Command') : -1;

  if (
    normalizedFile.endsWith('powershell.exe') &&
    commandIndex >= 0 &&
    typeof args[commandIndex + 1] === 'string' &&
    args[commandIndex + 1].includes('[System.Security.Cryptography.ProtectedData]')
  ) {
    const hardenedArgs = [...args];
    hardenedArgs[commandIndex + 1] = `$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security -ErrorAction Stop;${hardenedArgs[commandIndex + 1]}`;
    return originalExecFileSync.call(childProcess, file, hardenedArgs, options);
  }

  return originalExecFileSync.call(childProcess, file, args, options);
};

syncBuiltinESMExports();
await import('./owned-oauth-gmail-history-viewer.mjs');
