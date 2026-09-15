import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const ps1Path = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.ps1';
const cmdPath = 'tools/RUN-FINANCESENSOR-ALPHA2-OD0.cmd';
const docPath = 'mk0/10-evidence/ALPHA2-OD0-OWNED-DEVICE-HANDOFF.md';
const campaign = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const expected = {
  candidate:'0.2.0-alpha.2+2009', productSourceCommit:'9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f', sourceCommit:'e19bcccee13e326bbc08012533ddaeba026c633a',
  canonicalApkSha:'1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717',
  signedApkSha:'7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a', signedApkBytes:'182538790',
  signerSha1:'63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0', package:'com.financesensor.lab.gmailconnection.r2', scope:'gmail.readonly'
};
const assert = (condition,message) => { if (!condition) throw new Error(`ALPHA2_OD0_HARNESS_FAILED:${message}`); };
for (const path of [ps1Path,cmdPath,docPath]) assert(fs.existsSync(path), `MISSING:${path}`);
const ps1 = fs.readFileSync(ps1Path,'utf8');
const cmd = fs.readFileSync(cmdPath,'utf8');
const doc = fs.readFileSync(docPath,'utf8');

for (const marker of [expected.candidate,expected.productSourceCommit,expected.sourceCommit,expected.canonicalApkSha,expected.signedApkSha,expected.signedApkBytes,expected.signerSha1,expected.package,expected.scope,'OD0_EXECUTION_ALLOWED=YES','adb install -r','shell monkey','pidof','INSTALL_PASS=YES','LAUNCH_PASS=YES','REAL_GMAIL_CONTENT_IN_RECEIPT=0','FINANCIAL_PLAINTEXT_IN_RECEIPT=0']) assert(ps1.includes(marker), `PS1_MARKER:${marker}`);
for (const marker of ['RUN-FINANCESENSOR-ALPHA2-OD0.ps1','installed and launched with the exact stable-signed APK','connect Gmail','financial view appears']) assert(cmd.includes(marker), `CMD_MARKER:${marker}`);
for (const marker of [expected.candidate,expected.canonicalApkSha,expected.signedApkSha,expected.signerSha1,'TRUSTED_EDGE_SIGNING_PASS=YES','OD0_EXECUTION_ALLOWED=YES','OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES','FINANCIAL_VIEW_MATERIALIZED','OLD_2008_OD0_HANDOFF = SUPERSEDED / FORBIDDEN']) assert(doc.includes(marker), `DOC_MARKER:${marker}`);
assert(!/FINANCESENSOR_R2_STORE_PASS|FINANCESENSOR_R2_KEY_PASS|secrets\./.test(ps1 + cmd), 'private signing secret reference forbidden');
assert(!/adb\s+uninstall|pm\s+clear|shell\s+rm|run-as/i.test(ps1), 'automatic data-destructive operation forbidden');
const parse = spawnSync('pwsh',['-NoProfile','-Command',`$errors=$null;$tokens=$null;[System.Management.Automation.Language.Parser]::ParseFile('${ps1Path}',[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){exit 1}`],{encoding:'utf8'});
assert(parse.error == null && parse.status === 0, 'PowerShell parse failed');
const selfTest = spawnSync('pwsh',['-NoProfile','-File',ps1Path,'-SelfTest'],{encoding:'utf8'});
assert(selfTest.error == null && selfTest.status === 0 && selfTest.stdout.includes('FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS') && selfTest.stdout.includes('OD0_EXECUTION_ALLOWED=YES') && selfTest.stdout.includes(expected.signedApkSha), 'armed self-test failed');

assert(canonical.candidate === expected.candidate && canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.signedApkSha256 === expected.signedApkSha, 'canonical signed state drifted');
assert(r1.trustedEdgeSigningPass === true && r1.signedApkSha256 === expected.signedApkSha, 'R1 signed state drifted');
assert(campaign.candidate?.id === expected.candidate && campaign.candidate?.signedApkSha256 === expected.signedApkSha, 'campaign signed identity drifted');
assert(campaign.status === 'READY_FOR_CONSOLIDATED_OWNED_DEVICE_UAT' && campaign.currentState?.nextGate === 'CONSOLIDATED_OWNED_DEVICE_UAT' && campaign.subgates?.[0]?.status === 'READY_IN_CONSOLIDATED_UAT', 'OD0 UAT frontier drifted');
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.ownedDeviceUat?.humanUatEligible === true, 'human UAT gate must be open');
assert(campaign.currentState?.buildReady === false && campaign.currentState?.releaseReady === false, 'readiness cannot be promoted');

console.log('ALPHA2_OD0_OWNED_DEVICE_HARNESS=PASS_READY_STATE');
console.log('CANDIDATE=0.2.0-alpha.2+2009');
console.log('TRUSTED_EDGE_SIGNING_PASS=YES');
console.log(`STABLE_SIGNED_APK_SHA256=${expected.signedApkSha}`);
console.log('OD0_EXECUTION_ALLOWED=YES');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('OD0_HANDOFF_PACKAGE_ALLOWED=YES');
console.log('PUBLIC_CI_ORIGINATED_OD0_PASS=0');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
