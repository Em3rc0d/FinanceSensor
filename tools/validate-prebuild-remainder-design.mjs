import fs from 'node:fs';

const design=JSON.parse(fs.readFileSync('graph/prebuild-remainder-design.json','utf8'));
const c=JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const r1=JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const r2=JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const h=JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const cert=JSON.parse(fs.readFileSync('graph/alpha2-2014-certification-ledger-extension.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('graph/closure-ledger.json','utf8'));
const readiness=JSON.parse(fs.readFileSync('graph/build-readiness.json','utf8'));
const a=(x,m)=>{if(!x)throw new Error(`PREBUILD_REMAINDER_DESIGN_FAILED:${m}`)};

const apk='72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3';
const bundle='eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be';

a(design.schemaVersion==='MK0_PREBUILD_REMAINDER_DESIGN_V2','design schema');
a(design.canonicalAlpha2?.candidate==='0.2.0-alpha.2+2014','design candidate');
a(design.canonicalAlpha2?.apkSha256===apk&&design.canonicalAlpha2?.r1BundleSha256===bundle,'design identity');
a(design.canonicalAlpha2?.signingStatus==='TRUSTED_EDGE_SIGNING_REQUIRED'&&design.canonicalAlpha2?.priorPhysicalEvidenceInherited===false,'design signing law');
a(design.currentFrontier==='R1_TRUSTED_EDGE_SIGNING','design frontier');
a(design.nodes?.find(n=>n.id==='R0')?.status==='CLOSED','R0');
a(design.nodes?.find(n=>n.id==='R1')?.status==='DESIGN_FROZEN_EXECUTION_OPEN','R1');
a(design.nodes?.find(n=>n.id==='R2')?.status==='BLOCKED_BY_PRIOR_NODE','R2');

a(c.candidate==='0.2.0-alpha.2+2014'&&c.sourceCommit==='8e5bb535a7263beab0b687b616dff88205da58f3','canonical');
a(c.authority?.apkSha256===apk&&c.signing?.trustedEdgeSigningPass===false&&c.signing?.status==='TRUSTED_EDGE_SIGNING_REQUIRED','APK/signing');

a(r1.trustedEdgeSigningPass===false&&r1.status==='CANONICAL_FROZEN_SIGNING_REQUIRED','R1 state');
a(r1.handoffBundle?.status==='FROZEN_PUBLIC_SAFE_BUNDLE'&&r1.handoffBundle?.sha256===bundle&&r1.handoffBundle?.bytes===86665753,'R1 bundle');

a(r2.status==='BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING'&&r2.currentState?.nextGate==='R1_TRUSTED_EDGE_SIGNING','R2 block');
a(h.preSigning?.requestAllowed===true&&h.ownedDeviceUat?.requestAllowed===false,'human frontier');
a(cert.state==='R1_BUNDLE_FROZEN_SIGNING_REQUIRED'&&cert.nextGate==='R1_TRUSTED_EDGE_SIGNING','cert frontier');

for(const id of ['Q-003','Q-004','Q-005']) a(ledger.nodes?.find(n=>n.id===id)?.status==='ACTIVE',id);
const g=ledger.nodes?.find(n=>n.id==='G-MK0');
a(g&&g.status!=='CLOSED','G-MK0');
a(ledger.buildReady===false&&readiness.buildReady===false,'BUILD_READY');
a(readiness.law==='BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED','law');

console.log('PREBUILD_REMAINDER_DESIGN=PASS');
console.log('CURRENT_CANONICAL_REFREEZE=0.2.0-alpha.2+2014');
console.log(`CANONICAL_UNSIGNED_APK_SHA256=${apk}`);
console.log(`R1_BUNDLE_SHA256=${bundle}`);
console.log('CURRENT_EXECUTION_FRONTIER=R1_TRUSTED_EDGE_SIGNING');
console.log('R1_TRUSTED_EDGE_SIGNING=REQUIRED');
console.log('OD0_EXECUTION_ALLOWED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
