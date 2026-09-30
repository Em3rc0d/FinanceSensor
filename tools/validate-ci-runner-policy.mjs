import fs from 'node:fs';
import path from 'node:path';
const dir='.github/workflows';
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
const fail=[]; const read=p=>fs.readFileSync(p,'utf8');
for(const f of files){
  const t=read(path.join(dir,f));
  if(/^[ \t]*runs-on:[ \t]*(?:self-hosted|\[[^\n\]]*self-hosted)/im.test(t)) fail.push(`${f}: self-hosted forbidden`);
  if(/\$\{\{\s*secrets\./.test(t)) fail.push(`${f}: direct secrets reference forbidden`);
}
const canonical=JSON.parse(read('graph/alpha2-canonical-candidate.json'));
const r1Graph=JSON.parse(read('graph/alpha2-2015-r1-signing-handoff.json'));
const human=JSON.parse(read('graph/alpha2-human-intervention-gate.json'));
const r1=read(path.join(dir,'alpha2-r1-trusted-edge-signing.yml'));
const r2=read(path.join(dir,'alpha2-r2-owned-device-campaign.yml'));
const od0=read(path.join(dir,'alpha2-od0-owned-device-harness.yml'));
const signed='076aa4328165e2e327d11e4cd4dc2d8a4b3ae1aff6b2b871e112910aeadd159e';
const currentSigned =
  canonical.candidate==='0.2.0-alpha.2+2015' &&
  canonical.signing?.status==='TRUSTED_EDGE_SIGNED' &&
  canonical.signing?.trustedEdgeSigningPass===true &&
  canonical.signing?.signedApkSha256===signed &&
  r1Graph.status==='TRUSTED_EDGE_SIGNED_OD0_READY' &&
  r1Graph.trustedEdgeSigningPass===true &&
  r1Graph.signedApkSha256===signed &&
  human.claims?.signingRequestAllowed===false &&
  human.claims?.ownedDeviceUatRequestAllowed===true;
if(!currentSigned) fail.push('graph: expected +2015 stable-signed OD0-ready frontier');
for(const [name,t,markers] of [
  ['alpha2-r1-trusted-edge-signing.yml',r1,['0.2.0-alpha.2+2015','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0']],
  ['alpha2-r2-owned-device-campaign.yml',r2,['R1_TRUSTED_EDGE_SIGNING=PASS','R2_PHYSICAL_CAMPAIGN=READY_FOR_OD0','OD0_EXECUTION_ALLOWED=YES','OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES']],
  ['alpha2-od0-owned-device-harness.yml',od0,['OD0_HANDOFF_PACKAGE=READY','OD0_EXECUTION_ALLOWED=YES','OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES',signed]]
]){
  for(const m of markers) if(!t.includes(m)) fail.push(`${name}: missing ${m}`);
  if(/PHYSICAL_ALPHA2_PASS=YES|BUILD_READY=YES|RELEASE_READY=YES|PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1/.test(t)) fail.push(`${name}: forbidden promotion`);
}
if(fail.length){console.error('FINANCESENSOR_CI_RUNNER_POLICY=FAIL');for(const x of fail)console.error('- '+x);process.exit(1)}
console.log('FINANCESENSOR_CI_RUNNER_POLICY=PASS');
console.log(`WORKFLOWS_SCANNED=${files.length}`);
console.log('ACTIVE_SELF_HOSTED_PATHS=0');
console.log('ALPHA2_2015_STABLE_SIGNED=FROZEN');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY_FOR_OD0');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
