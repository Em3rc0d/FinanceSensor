import { spawnSync } from 'node:child_process';

if (process.env.GITHUB_ACTIONS !== 'true') {
  console.log('FINANCESENSOR_R2_POWERSHELL_SYNTAX=SKIPPED_NON_CI');
} else {
  const source = 'tools/SIGN-FINANCESENSOR-R2.ps1';
  const probe = `
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile('${source}', [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error $_.Message }
  exit 1
}
Write-Output 'FINANCESENSOR_R2_POWERSHELL_PARSE=PASS'
`;

  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', probe], {
    encoding: 'utf8',
  });

  if (result.error) {
    console.error('FINANCESENSOR_R2_POWERSHELL_SYNTAX=FAIL');
    console.error(`pwsh launch failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('FINANCESENSOR_R2_POWERSHELL_SYNTAX=FAIL');
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }

  console.log(result.stdout.trim());
  console.log('FINANCESENSOR_R2_POWERSHELL_SYNTAX=PASS');
  console.log('PRIVATE_SIGNING_MATERIAL_USED=0');
  console.log('SIGNING_EXECUTED=0');
}
