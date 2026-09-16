import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const historical=read('graph/alpha2-certification-ledger.json');
const ext=read('graph/alpha2-2013-certification-ledger-extension.json');
const canonical=read('graph/alpha2-canonical-candidate.json');
const r1=read('graph/alpha2-r1-signing-handoff.json');
const human=read('graph/alpha2-human-intervention-gate.json');
const fail=m=>{throw new Error(`ALPHA2_CERT_LEDGER_FAILED:${m}`)};
const a=(c,m)=>{if(!c)fail(m)};
const sortRecursive=v=>Array.isArray(v)?v.map(sortRecursive):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortRecursive(v[k])])):v);
const stableStringify=v=>JSON.stringify(sortRecursive(v));
const hashBlock=(domain,b)=>{const {blockHash:_,...core}=b;return crypto.createHash('sha256').update(`${domain}\n${stableStringify(core)}`,'utf8').digest('hex')};

a(historical.schemaVersion==='A2_CERTIFICATION_LEDGER_V1','historical schema');
a(historical.chainId==='FINANCESENSOR_ALPHA2_2012_CERTIFICATION','historical chain id');
a(historical.headBlockHash==='6b2014d788011018c4ebbb586e0d9c9f90b4a8e0ea25dd5a94071b150d789b4e','historical head drift');
a(Array.isArray(historical.blocks)&&historical.blocks.length===7,'historical block count');
for(let i=0;i<historical.blocks.length;i++){const b=historical.blocks[i];a(b.height===i,`historical height:${i}`);a(b.parentBlockHash===(i===0?null:historical.blocks[i-1].blockHash),`historical parent:${i}`);a(hashBlock(historical.blockHashDomain,b)===b.blockHash,`historical hash:${i}`)}

a(ext.schemaVersion==='A2_CERTIFICATION_LEDGER_EXTENSION_V1','extension schema');
a(ext.chainId==='FINANCESENSOR_ALPHA2_2013_CERTIFICATION'&&ext.candidate==='0.2.0-alpha.2+2013','extension identity');
a(ext.priorChainId===historical.chainId&&ext.priorHeadBlockHash===historical.headBlockHash,'chain linkage');
a(ext.baseHeight===7&&Array.isArray(ext.blocks)&&ext.blocks.length===4,'extension shape');
const kinds=['PHYSICAL_FAILURE_OBSERVATION','SCAN_RESILIENCE_REMEDIATION_MERGE','CANONICAL_BUILD_FREEZE','PRE_SIGNING_FRONTIER'];
for(let i=0;i<ext.blocks.length;i++){const b=ext.blocks[i];a(b.height===7+i,`extension height:${i}`);a(b.kind===kinds[i],`extension kind:${i}`);a(b.parentBlockHash===(i===0?historical.headBlockHash:ext.blocks[i-1].blockHash),`extension parent:${i}`);a(hashBlock(ext.blockHashDomain,b)===b.blockHash,`extension hash:${i}`)}
a(ext.headBlockHash===ext.blocks.at(-1).blockHash&&ext.headBlockHash==='adb68584fc13a52b25fb8a2adaa47e4cee3778c3c8fea53a50589ab71e5f1f9a','extension head');
a(ext.state==='PRE_SIGNING_FRONTIER'&&ext.nextGate==='R1_TRUSTED_EDGE_SIGNING','extension frontier');
const failBlock=ext.blocks[0].payload;a(failBlock.candidate==='0.2.0-alpha.2+2012'&&failBlock.result==='REJECTED_AT_REFRESH_SCAN'&&failBlock.physicalEvidenceInheritedBySuccessor===false,'physical failure law');
const remediation=ext.blocks[1].payload;a(remediation.candidate==='0.2.0-alpha.2+2013'&&remediation.remediationMergeSha==='da6176f9acba1854c470ce2caea471bb6b66d8f2'&&remediation.scanResilience==='A2_SCAN_RESILIENCE_V1','remediation');
const build=ext.blocks[2].payload;a(build.sourceCommit===canonical.sourceCommit&&build.runId===canonical.authority.runId&&build.artifactId===canonical.authority.artifactId&&build.unsignedApkSha256===canonical.authority.apkSha256&&build.unsignedApkBytes===canonical.authority.apkBytes,'canonical build');
const frontier=ext.blocks[3].payload;a(frontier.canonicalUnsignedApkSha256===canonical.authority.apkSha256&&frontier.handoffBundleStatus==='PENDING_CI_GENERATION'&&frontier.signingRequestAllowed===true&&frontier.ownedDeviceUatAllowed===false,'pre-signing frontier');
a(canonical.candidate==='0.2.0-alpha.2+2013'&&canonical.signing.trustedEdgeSigningPass===false,'canonical must remain unsigned');
a(r1.status==='READY_FOR_TRUSTED_EDGE_SIGNING'&&r1.trustedEdgeSigningPass===false&&r1.handoffBundle.status==='PENDING_CI_GENERATION','R1 frontier');
a(human.candidateState==='CANONICAL_UNSIGNED_FROZEN_SIGNING_REQUIRED'&&human.claims.signingRequestAllowed===true&&human.claims.ownedDeviceUatRequestAllowed===false,'human frontier');
a(canonical.boundaries.physicalAlpha2Pass===false&&canonical.boundaries.buildReady===false&&canonical.boundaries.releaseReady===false,'readiness premature');
console.log('ALPHA2_CERTIFICATION_LEDGER=PASS');
console.log(`HISTORICAL_HEAD=${historical.headBlockHash}`);
console.log(`EXTENSION_HEAD=${ext.headBlockHash}`);
console.log('STATE=PRE_SIGNING_FRONTIER');
console.log('NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
console.log('PRIOR_PHYSICAL_EVIDENCE_INHERITED=NO');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
