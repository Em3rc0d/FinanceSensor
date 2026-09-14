import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const ps1Path = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.ps1';
const cmdPath = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.cmd';
const docPath = 'mk0/10-evidence/ALPHA2-OD0-OWNED-DEVICE-HANDOFF.md';
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const schemaPath = 'graph/alpha2-r2-sanitized-receipt-schema.json';
const expected = {
  candidate: '0.2.0-alpha.2+2008',
  sourceCommit: '45b605d29fe0b90f528e4f0f952ab878080b2f0b',
  signedSha: 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277',
  signedBytes: '182538790',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  package: 'com.financesensor.lab.gmailconnection.r2',
  scope: 'gmail.readonly',
};
const assert = (condition, message) => { if (!condition) throw new Error(`ALPHA2_OD0_HARNESS_FAILED:${message}`); };
for (const path of [ps1Path,cmdPath,docPath,campaignPath,schemaPath]) assert(fs.existsSync(path), `MISSING:${path}`);
const ps1 = fs.readFileSync(ps1Path, 'utf8');
const cmd = fs.readFileSync(cmdPath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

for (const marker of [
  expected.candidate,expected.sourceCommit,expected.signedSha,expected.signedBytes,expected.signerSha1,expected.package,expected.scope,
  'Get-FileHash','Find-ApkSigner','Find-Adb','certificate SHA-1 digest','OD0_EXACTLY_ONE_AUTHORIZED_DEVICE_REQUIRED',
  "@('install',$apkPath)",'installObservations','physicalLaunchObservations','R1_BOUND_SIGNED_APK_INSTALL_AND_LAUNCH_PASS',
  'DEVICE_SERIAL_IN_RECEIPT=0','RAW_ADB_OUTPUT_IN_RECEIPT=0','BUILD_READY=NO','RELEASE_READY=NO'
]) assert(ps1.includes(marker), `PS1_MARKER:${marker}`);
for (const marker of ['powershell.exe','RUN-FINANCESENSOR-ALPHA2-OD0.ps1','Return only the generated OD0 JSON receipt','FinanceSensor-ALPHA2-R2-OD0-FAILURE.txt']) assert(cmd.includes(marker), `CMD_MARKER:${marker}`);
for (const marker of [expected.candidate,expected.signedSha,expected.signerSha1,'OD0_PASS != R2_PASS','OD0_PASS != BUILD_READY','OD0_PASS != RELEASE_READY']) assert(doc.includes(marker), `DOC_MARKER:${marker}`);

assert(!/FINANCESENSOR_R2_STORE_PASS|FINANCESENSOR_R2_KEY_PASS|secrets\./.test(ps1 + cmd), 'private signing secret reference forbidden');
assert(!ps1.includes('Write-Host $serial') && !ps1.includes('Write-Output $serial'), 'device serial must never be printed');
assert(!/serial\s*=.*(Set-Content|Add-Content|Out-File)/i.test(ps1), 'device serial must never be persisted');
assert(ps1.includes("'DEVICE_SERIAL_IN_RECEIPT=0'") && ps1.includes("'RAW_ADB_OUTPUT_IN_RECEIPT=0'"), 'sanitized failure boundary missing');

const psCommand = `$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${ps1Path}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{Write-Error $_};exit 1}`;
const parsed = spawnSync('pwsh', ['-NoProfile','-Command',psCommand], { encoding:'utf8' });
assert(parsed.error == null && parsed.status === 0, `POWERSHELL_PARSE:${parsed.stderr || parsed.stdout}`);
const selfTest = spawnSync('pwsh', ['-NoProfile','-File',ps1Path,'-SelfTest'], { encoding:'utf8' });
assert(selfTest.error == null && selfTest.status === 0 && selfTest.stdout.includes('FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'), 'SELFTEST_FAILED');

assert(campaign.candidate?.id === expected.candidate && campaign.candidate?.signedApkSha256 === expected.signedSha && campaign.candidate?.signedApkBytes === Number(expected.signedBytes), 'campaign signed identity drifted');
assert(campaign.status === 'IN_PROGRESS' && campaign.currentState?.nextGate === 'OD0' && campaign.subgates?.[0]?.status === 'READY_FOR_PHYSICAL', 'OD0 must be the current physical frontier');
assert(campaign.currentState?.buildReady === false && campaign.currentState?.releaseReady === false, 'readiness cannot be promoted');
assert(schema.schemaVersion === 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' && schema.receiptClass === 'SANITIZED_SUMMARY_ONLY', 'receipt schema authority drifted');
for (const id of Array.from({length:12},(_,i)=>`OD${i}`)) assert(schema.requiredGateIds.includes(id), `schema missing ${id}`);

console.log('ALPHA2_OD0_OWNED_DEVICE_HARNESS=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2008');
console.log(`SIGNED_APK_SHA256=${expected.signedSha}`);
console.log('HARNESS_CLASS=PUBLIC_SAFE_OPERATIONS_TOOLING');
console.log('PRODUCT_SOURCE_MUTATION=0');
console.log('PRIVATE_SIGNING_MATERIAL_REQUIRED=0');
console.log('DEVICE_SERIAL_IN_RECEIPT=0');
console.log('RAW_ADB_OUTPUT_IN_RECEIPT=0');
console.log('OD0_PHYSICAL_PASS_SYNTHESIZED_BY_CI=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
