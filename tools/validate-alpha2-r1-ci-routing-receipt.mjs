import fs from 'node:fs';
const g=JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8')), w=fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml','utf8');
const a=(x,m)=>{if(!x)throw new Error(`ALPHA2_R1_CI_ROUTING_FAILED:${m}`)};
for(const m of ['node tools/validate-alpha2-human-intervention-gate.mjs','node tools/validate-alpha2-canonical-candidate.mjs','node tools/validate-alpha2-r1-signing-handoff.mjs','Download exact canonical +2012 artifact','financesensor-alpha2-2012-candidate-34983489697','Regenerate deterministic public-safe v12 bundle for reproducibility','FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v12.zip','d6c9538b0c84d0bdabc966847cd7f6d340bd17eea68bf69e65d3d2a852585642','R1_V12_GENERATION=PASS','SIGNING_REQUEST_ALLOWED=NO','R1_TRUSTED_EDGE_SIGNING=PASS','OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES','PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0','BUILD_READY=NO','RELEASE_READY=NO'])a(w.includes(m),`workflow marker ${m}`);
a(w.includes('contents: read')&&w.includes('actions: read')&&!w.includes('secrets.'),'public CI boundary');
a(!/PHYSICAL_ALPHA2_PASS=YES|BUILD_READY=YES|RELEASE_READY=YES|PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1/.test(w),'forbidden promotion');
a(g.handoffBundle?.sha256==='d6c9538b0c84d0bdabc966847cd7f6d340bd17eea68bf69e65d3d2a852585642'&&g.trustedEdgeSigningPass===true,'graph routing');
a(g.nextGate==='OD0_SIGNED_APK_INSTALL_AND_LAUNCH','next gate');
console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS'); console.log('R1_V12_PUBLIC_BUNDLE_REPRODUCIBILITY=ROUTED'); console.log('R1_TRUSTED_EDGE_SIGNING=PASS'); console.log('SIGNING_REQUEST_ALLOWED=NO'); console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES'); console.log('BUILD_READY=NO'); console.log('RELEASE_READY=NO');
