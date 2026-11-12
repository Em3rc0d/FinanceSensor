import fs from 'node:fs';

const design=JSON.parse(fs.readFileSync('graph/prebuild-remainder-design.json','utf8'));
const c=JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const r1=JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const r2=JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const h=JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('graph/closure-ledger.json','utf8'));
const readiness=JSON.parse(fs.readFileSync('graph/build-readiness.json','utf8'));
const a=(x,m)=>{if(!x)throw new Error(`PREBUILD_REMAINDER_DESIGN_FAILED:${m}`)};

const id='0.2.0-alpha.2+2017';
const src='3b0f99767909deebd34e9843b6fed3f036159903';
const apk='5b81d798b5f3885ece41b899a08963b89f5c4e300561a4c469c8c8371c762774';

a(design.schemaVersion==='MK0_PREBUILD_REMAINDER_DESIGN_V3','design schema');
a(design.canonicalAlpha2?.candidate===id,'design candidate');
a(design.canonicalAlpha2?.sourceCommit===src&&design.canonicalAlpha2?.productSourceCommit===src,'design source');
a(design.canonicalAlpha2?.apkSha256===apk&&design.canonicalAlpha2?.apkBytes===182567371,'design identity');
a(design.canonicalAlpha2?.signingStatus==='TRUSTED_EDGE_SIGNING_REQUIRED'&&design.canonicalAlpha2?.priorPhysicalEvidenceInherited===false,'design signing law');
a(design.canonicalAlpha2?.r1BundleName==='FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v17.zip','design bundle name');
a(['PENDING_CI_GENERATION','FROZEN_PUBLIC_SAFE_BUNDLE'].includes(design.canonicalAlpha2?.r1BundleStatus),'design bundle state');
if(design.canonicalAlpha2?.r1BundleStatus==='FROZEN_PUBLIC_SAFE_BUNDLE'){
  a(typeof design.canonicalAlpha2.r1BundleSha256==='string'&&design.canonicalAlpha2.r1BundleSha256.length===64,'design bundle hash');
}
a(design.currentFrontier==='R1_TRUSTED_EDGE_SIGNING','design frontier');
a(design.nodes?.find(n=>n.id==='R0')?.status==='CLOSED','R0');
a(design.nodes?.find(n=>n.id==='R1')?.status==='DESIGN_FROZEN_EXECUTION_OPEN','R1');
a(design.nodes?.find(n=>n.id==='R2')?.status==='BLOCKED_BY_PRIOR_NODE','R2');

a(c.candidate===id&&c.sourceCommit===src,'canonical');
a(c.authority?.apkSha256===apk&&c.signing?.trustedEdgeSigningPass===false&&c.signing?.status==='TRUSTED_EDGE_SIGNING_REQUIRED','APK/signing');
a(r1.candidate===id&&r1.sourceCommit===src&&r1.inputApk?.sha256===apk,'R1 identity');
a(r1.trustedEdgeSigningPass===false&&r1.status==='CANONICAL_FROZEN_SIGNING_REQUIRED','R1 state');
a(['PENDING_CI_GENERATION','FROZEN_PUBLIC_SAFE_BUNDLE'].includes(r1.handoffBundle?.status),'R1 bundle state');
if(r1.handoffBundle?.status==='FROZEN_PUBLIC_SAFE_BUNDLE'){
  a(typeof r1.handoffBundle.sha256==='string'&&r1.handoffBundle.sha256.length===64,'R1 bundle hash');
  a(r1.handoffBundle.manifestIntegrity==='PASS'&&r1.handoffBundle.zipIntegrity==='PASS','R1 bundle integrity');
  a(design.canonicalAlpha2?.r1BundleStatus==='FROZEN_PUBLIC_SAFE_BUNDLE'&&design.canonicalAlpha2?.r1BundleSha256===r1.handoffBundle.sha256,'design/R1 bundle consensus');
}

a(r2.status==='BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING'&&r2.currentState?.nextGate==='R1_TRUSTED_EDGE_SIGNING','R2 block');
a(h.preSigning?.requestAllowed===true&&h.ownedDeviceUat?.requestAllowed===false,'human frontier');
for(const q of ['Q-003','Q-004','Q-005']) a(ledger.nodes?.find(n=>n.id===q)?.status==='ACTIVE',q);
const g=ledger.nodes?.find(n=>n.id==='G-MK0');
a(g&&g.status!=='CLOSED','G-MK0');
a(ledger.buildReady===false&&readiness.buildReady===false,'BUILD_READY');
a(readiness.law==='BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED','law');

console.log('PREBUILD_REMAINDER_DESIGN=PASS');
console.log(`CURRENT_CANONICAL_REFREEZE=${id}`);
console.log(`CANONICAL_UNSIGNED_APK_SHA256=${apk}`);
console.log(`R1_BUNDLE_STATUS=${r1.handoffBundle.status}`);
console.log('CURRENT_EXECUTION_FRONTIER=R1_TRUSTED_EDGE_SIGNING');
console.log('R1_TRUSTED_EDGE_SIGNING=REQUIRED');
console.log('OD0_EXECUTION_ALLOWED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
