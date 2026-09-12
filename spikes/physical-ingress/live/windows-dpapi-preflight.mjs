import { dpapiPreflight } from '../src/windows-dpapi.js';

try {
  dpapiPreflight();
  console.log('FINANCESENSOR_DPAPI_PREFLIGHT=PASS');
} catch (error) {
  const diagnostic = String(error?.diagnostic || 'stage=POWERSHELL_INVOCATION type=UNKNOWN hresult=UNKNOWN powershell=UNKNOWN/UNKNOWN')
    .replace(/[^A-Za-z0-9_=./ -]/g, '')
    .slice(0, 320);
  console.error(`FINANCESENSOR_DPAPI_PREFLIGHT=FAIL ${diagnostic}`);
  process.exitCode = 1;
}
