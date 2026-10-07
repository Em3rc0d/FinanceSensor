import fs from 'node:fs';
import './validate-alpha2-2016-canonical-candidate.mjs';
import './validate-alpha2-2016-r1-signing-handoff.mjs';

const design=JSON.parse(fs.readFileSync('graph/prebuild-remainder-design.json','utf8'));
const c=JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const r1=JSON.parse(fs.readFileSync('graph/alpha2-2016-r1-signing-handoff.json','utf8'));
const r2=JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const h=JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('graph/closure-ledger.json','utf8'));
const readiness=JSON.parse(fs.readFileSync('graph/build-readiness.json','utf8'));
const a=(x,m)=>{if(!x)throw new Error(`PREBUILD_REMAINDER_DESIGN_FAILED:${m}`)};

a(design.schemaVersion==='MK0_PREBUILD_REMAINDER_DESIGN_V2','design schema');
a(design.designFreeze==='PASS','design freeze');
a(design.authority?.canonicalCandidate==='graph/alpha2-canonical-candidate.json','canonical authority path');

a(design.canonicalAlpha2?.candidate===c.candidate,'design candidate');
a(design.canonicalAlpha2?.productSourceCommit===c.productSourceCommit,'design product source');
a(design.canonicalAlpha2?.sourceCommit===c.sourceCommit,'design source');
a(design.canonicalAlpha2?.apkSha256===c.authority?.apkSha256,'design APK hash');
a(design.canonicalAlpha2?.apkBytes===c.authority?.apkBytes,'design APK bytes');
a(design.canonicalAlpha2?.package===c.signing?.androidOauthPackage,'design package');
a(design.canonicalAlpha2?.scope===c.signing?.exactScope,'design scope');
a(design.canonicalAlpha2?.stableSignerSha1===c.signing?.expectedSignerSha1,'design signer');
a(design.canonicalAlpha2?.signingStatus===c.signing?.status,'design signing status');
a(design.canonicalAlpha2?.r1Handoff==='graph/alpha2-2016-r1-signing-handoff.json','design R1 handoff');
a(design.canonicalAlpha2?.priorPhysicalEvidenceInherited===false,'design evidence inheritance');

a(design.currentFrontier==='R1_TRUSTED_EDGE_SIGNING','design frontier');
a(design.nodes?.find(n=>n.id==='R0')?.status==='CLOSED','R0');
a(design.nodes?.find(n=>n.id==='R1')?.status==='DESIGN_FROZEN_EXECUTION_OPEN','R1');
a(design.nodes?.find(n=>n.id==='R2')?.status==='BLOCKED_BY_PRIOR_NODE','R2');

a(r1.candidate===c.candidate,'R1 candidate');
a(r1.sourceCommit===c.sourceCommit&&r1.productSourceCommit===c.productSourceCommit,'R1 source chain');
a(r1.inputApk?.sha256===c.authority?.apkSha256&&r1.inputApk?.bytes===c.authority?.apkBytes,'R1 input APK');
a(['PENDING_CI_GENERATION','FROZEN_PUBLIC_SAFE_BUNDLE'].includes(r1.handoffBundle?.status),'R1 bundle status');
a(r1.trustedEdgeSigningPass===false&&r1.status==='CANONICAL_FROZEN_SIGNING_REQUIRED','R1 state');
a(r1.nextGate==='R1_TRUSTED_EDGE_SIGNING','R1 frontier');

a(r2.candidate?.id===c.candidate,'R2 candidate');
a(r2.status==='BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING'&&r2.currentState?.nextGate==='R1_TRUSTED_EDGE_SIGNING','R2 block');
a(h.preSigning?.requestAllowed===true&&h.ownedDeviceUat?.requestAllowed===false,'human frontier');

for(const id of ['Q-003','Q-004','Q-005']) a(ledger.nodes?.find(n=>n.id===id)?.status==='ACTIVE',id);
const g=ledger.nodes?.find(n=>n.id==='G-MK0');
a(g&&g.status!=='CLOSED','G-MK0');
a(ledger.buildReady===false&&readiness.buildReady===false,'BUILD_READY');
a(readiness.law==='BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED','law');

console.log('PREBUILD_REMAINDER_DESIGN=PASS');
console.log(`CURRENT_CANONICAL_REFREEZE=${c.candidate}`);
console.log(`CANONICAL_UNSIGNED_APK_SHA256=${c.authority.apkSha256}`);
console.log(`R1_HANDOFF_STATUS=${r1.handoffBundle.status}`);
console.log('CURRENT_EXECUTION_FRONTIER=R1_TRUSTED_EDGE_SIGNING');
console.log('R1_TRUSTED_EDGE_SIGNING=REQUIRED');
console.log('OD0_EXECUTION_ALLOWED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
