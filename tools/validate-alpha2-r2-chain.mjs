import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) throw new Error('R1 physical receipt must close trusted-edge signing');
if (r2.status !== 'READY_FOR_PHYSICAL_CAMPAIGN' || r2.currentState?.r2PhysicalCampaign !== 'READY') throw new Error('R2 must be ready after R1 PASS');
if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R2_IMPLEMENTATION_CONTRACT=SEPARATE_EXPLICIT_GATE');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
