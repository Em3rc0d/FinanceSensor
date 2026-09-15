import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const ps1Path = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.ps1';
const cmdPath = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.cmd';
const docPath = 'mk0/10-evidence/ALPHA2-OD0-OWNED-DEVICE-HANDOFF.md';
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const gatePath = 'graph/alpha2-human-intervention-gate.json';
const canonicalPath = 'graph/alpha2-canonical-candidate.json';
const expected = {
  candidate: '0.2.0-alpha.2+2009',
  productSourceCommit: '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f',
  sourceCommit: 'e19bcccee13e326bbc08012533ddaeba026c633a',
  canonicalApkSha: '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717',
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  package: 'com.financesensor.lab.gmailconnection.r2',
  scope: 'gmail.readonly',
};
const assert = (condition,message) => { if (!condition) throw new Error(`ALPHA2_OD0_BLOCKED_HARNESS_FAILED:${message}`); };
for (const path of [ps1Path,cmdPath,docPath,campaignPath,gatePath,canonicalPath]) assert(fs.existsSync(path), `MISSING:${path}`);
const ps1 = fs.readFileSync(ps1Path,'utf8');
const cmd = fs.readFileSync(cmdPath,'utf8');
const doc = fs.readFileSync(docPath,'utf8');
const campaign = JSON.parse(fs.readFileSync(campaignPath,'utf8'));
const gate = JSON.parse(fs.readFileSync(gatePath,'utf8'));
const canonical = JSON.parse(fs.readFileSync(canonicalPath,'utf8'));

for (const marker of [expected.candidate,expected.productSourceCommit,expected.sourceCommit,expected.canonicalApkSha,expected.signerSha1,expected.package,expected.scope,'OD0_EXECUTION_ALLOWED=NO','STABLE_RESULT_CODE=OD0_BLOCKED_BY_R1_SIGNING','ADB_EXECUTED=0','DEVICE_TOUCHED=0','PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO']) assert(ps1.includes(marker), `PS1_MARKER:${marker}`);
for (const marker of ['RUN-FINANCESENSOR-ALPHA2-OD0.ps1','intentionally BLOCKED until trusted-edge signing for +2009 passes','No Android device operation was attempted']) assert(cmd.includes(marker), `CMD_MARKER:${marker}`);
for (const marker of [expected.candidate,expected.canonicalApkSha,expected.signerSha1,'SIGNING_REQUEST_ALLOWED=YES','OD0_EXECUTION_ALLOWED=NO','OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO','OLD_2008_OD0_HANDOFF = SUPERSEDED / FORBIDDEN']) assert(doc.includes(marker), `DOC_MARKER:${marker}`);

assert(!/\badb(?:\.exe)?\b/i.test(ps1), 'blocked harness must not contain adb execution');
assert(!/\binstall\b.*\.apk|pm\s+install|am\s+start/i.test(ps1), 'blocked harness must not contain install/launch execution');
assert(!/FINANCESENSOR_R2_STORE_PASS|FINANCESENSOR_R2_KEY_PASS|secrets\./.test(ps1 + cmd), 'private signing secret reference forbidden');
const parse = spawnSync('pwsh',['-NoProfile','-Command',`$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${ps1Path}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`],{encoding:'utf8'});
assert(parse.error == null && parse.status === 0, 'PowerShell parse failed');
const selfTest = spawnSync('pwsh',['-NoProfile','-File',ps1Path,'-SelfTest'],{encoding:'utf8'});
assert(selfTest.error == null && selfTest.status === 0 && selfTest.stdout.includes('FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS') && selfTest.stdout.includes('OD0_EXECUTION_ALLOWED=NO'), 'blocked self-test failed');

assert(canonical.candidate === expected.candidate && canonical.authority?.apkSha256 === expected.canonicalApkSha && canonical.signing?.trustedEdgeSigningPass === false, 'canonical pre-signing state drifted');
assert(campaign.candidate?.id === expected.candidate && campaign.candidate?.signedApkSha256 === null, 'campaign signed identity must remain absent');
assert(campaign.status === 'BLOCKED_BY_R1_SIGNING' && campaign.currentState?.nextGate === 'R1_TRUSTED_EDGE_SIGNING' && campaign.subgates?.[0]?.status === 'BLOCKED_BY_R1_SIGNING', 'OD0 must not be current physical frontier');
assert(gate.preSigning?.requestAllowed === true && gate.ownedDeviceUat?.requestAllowed === false && gate.ownedDeviceUat?.humanUatEligible === false, 'human gate must allow only signing');
assert(campaign.currentState?.buildReady === false && campaign.currentState?.releaseReady === false, 'readiness cannot be promoted');

console.log('ALPHA2_OD0_OWNED_DEVICE_HARNESS=PASS_BLOCKED_STATE');
console.log('CANDIDATE=0.2.0-alpha.2+2009');
console.log('SIGNING_REQUEST_ALLOWED=YES');
console.log('TRUSTED_EDGE_SIGNING_PASS=NO');
console.log('OD0_EXECUTION_ALLOWED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('ADB_EXECUTED_BY_HARNESS=0');
console.log('OD0_HANDOFF_PACKAGE_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
