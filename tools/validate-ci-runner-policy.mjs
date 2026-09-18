import fs from 'node:fs';
import path from 'node:path';

const dir='.github/workflows';
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
const fail=[];
const read=p=>fs.readFileSync(p,'utf8');

for(const f of files){
  const t=read(path.join(dir,f));
  if(/^[ \t]*runs-on:[ \t]*(?:self-hosted|\[[^\n\]]*self-hosted)/im.test(t)){
    fail.push(`${f}: self-hosted forbidden`);
  }
  if(/\$\{\{\s*secrets\./.test(t)){
    fail.push(`${f}: direct secrets reference forbidden`);
  }
}

const canonical=JSON.parse(read('graph/alpha2-canonical-candidate.json'));
const r1Graph=JSON.parse(read('graph/alpha2-r1-signing-handoff.json'));
const human=JSON.parse(read('graph/alpha2-human-intervention-gate.json'));
const r1=read(path.join(dir,'alpha2-r1-trusted-edge-signing.yml'));
const r2=read(path.join(dir,'alpha2-r2-owned-device-campaign.yml'));
const od0=read(path.join(dir,'alpha2-od0-owned-device-harness.yml'));

const currentPreSigning =
  canonical.candidate==='0.2.0-alpha.2+2014' &&
  canonical.signing?.status==='TRUSTED_EDGE_SIGNING_REQUIRED' &&
  canonical.signing?.trustedEdgeSigningPass===false &&
  r1Graph.candidate==='0.2.0-alpha.2+2014' &&
  r1Graph.status==='CANONICAL_FROZEN_SIGNING_REQUIRED' &&
  r1Graph.trustedEdgeSigningPass===false &&
  human.claims?.signingRequestAllowed===true &&
  human.claims?.ownedDeviceUatRequestAllowed===false;

if(!currentPreSigning) fail.push('graph: expected +2014 pre-signing frontier');

for(const m of [
  '0.2.0-alpha.2+2014',
  'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v14.zip',
  '72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3',
  'SIGNING_REQUEST_ALLOWED=YES',
  'R1_TRUSTED_EDGE_SIGNING=REQUIRED',
  'OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0'
]){
  if(!r1.includes(m)) fail.push(`alpha2-r1-trusted-edge-signing.yml: missing ${m}`);
}

for(const m of [
  'R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING',
  'OD0_EXECUTION_ALLOWED=NO',
  'OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO'
]){
  if(!r2.includes(m)) fail.push(`alpha2-r2-owned-device-campaign.yml: missing ${m}`);
}

for(const m of [
  'OD0_HANDOFF_PACKAGE=BLOCKED',
  'BLOCKER=R1_TRUSTED_EDGE_SIGNING_REQUIRED',
  'OD0_EXECUTION_ALLOWED=NO'
]){
  if(!od0.includes(m)) fail.push(`alpha2-od0-owned-device-harness.yml: missing ${m}`);
}

for(const [name,t] of [
  ['alpha2-r1-trusted-edge-signing.yml',r1],
  ['alpha2-r2-owned-device-campaign.yml',r2],
  ['alpha2-od0-owned-device-harness.yml',od0]
]){
  if(/PHYSICAL_ALPHA2_PASS=YES|BUILD_READY=YES|RELEASE_READY=YES|PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1/.test(t)){
    fail.push(`${name}: forbidden promotion`);
  }
}

if(/SIGNED_APK_SHA256=4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387/.test(r1)){
  fail.push('alpha2-r1-trusted-edge-signing.yml: historical +2013 signed APK cannot be current +2014 output');
}

if(fail.length){
  console.error('FINANCESENSOR_CI_RUNNER_POLICY=FAIL');
  for(const x of fail) console.error('- '+x);
  process.exit(1);
}

console.log('FINANCESENSOR_CI_RUNNER_POLICY=PASS');
console.log(`WORKFLOWS_SCANNED=${files.length}`);
console.log('ACTIVE_SELF_HOSTED_PATHS=0');
console.log('ALPHA2_2014_CANONICAL_UNSIGNED=FROZEN');
console.log('R1_TRUSTED_EDGE_SIGNING=REQUIRED');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
