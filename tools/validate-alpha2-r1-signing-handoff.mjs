import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const r=JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const c=JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const ps='tools/SIGN-FINANCESENSOR-ALPHA2-R2.ps1', cmd='tools/SIGN-FINANCESENSOR-ALPHA2-R2.cmd';
const a=(x,m)=>{if(!x)throw new Error(`ALPHA2_R1_2017_GENERIC_FAILED:${m}`)};
a(r.schemaVersion==='A2_R1_TRUSTED_EDGE_HANDOFF_V18'&&r.candidate==='0.2.0-alpha.2+2017','identity');
a(r.sourceCommit===c.sourceCommit&&r.productSourceCommit===c.productSourceCommit,'source chain');
a(r.canonicalRunId===c.authority?.runId&&r.canonicalArtifactId===c.authority?.artifactId,'CI authority');
a(r.inputApk?.sha256===c.authority?.apkSha256&&r.inputApk?.bytes===c.authority?.apkBytes,'input APK');
a(r.inputApk?.bcpSavingsCompletenessVersion==='A2_BCP_SAVINGS_COMPLETENESS_V4','BCP V4');
a(r.inputApk?.ripleyCreditStrictAdapter==='A2_RIPLEY_CREDIT_STRICT_V3','Ripley V3');
a(r.signer?.powershellGitBlob===execFileSync('git',['hash-object',ps],{encoding:'utf8'}).trim(),'PS1 blob');
a(r.signer?.cmdGitBlob===execFileSync('git',['hash-object',cmd],{encoding:'utf8'}).trim(),'CMD blob');
a(r.handoffBundle?.name==='FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v17.zip','bundle name');
a(['PENDING_CI_GENERATION','FROZEN_PUBLIC_SAFE_BUNDLE'].includes(r.handoffBundle?.status),'bundle status');
if(r.handoffBundle?.status==='FROZEN_PUBLIC_SAFE_BUNDLE'){
  a(typeof r.handoffBundle.sha256==='string'&&r.handoffBundle.sha256.length===64,'bundle hash');
  a(Number.isInteger(r.handoffBundle.bytes)&&r.handoffBundle.bytes>0,'bundle bytes');
  a(r.handoffBundle.manifestIntegrity==='PASS'&&r.handoffBundle.zipIntegrity==='PASS','bundle integrity');
}
a(r.trustedEdgeSigningPass===false&&r.status==='CANONICAL_FROZEN_SIGNING_REQUIRED'&&r.nextGate==='R1_TRUSTED_EDGE_SIGNING','frontier');
a(r.physicalAlpha2Pass===false&&r.buildReady===false&&r.releaseReady===false,'readiness');
console.log('ALPHA2_R1_SIGNING_HANDOFF=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=REQUIRED');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
