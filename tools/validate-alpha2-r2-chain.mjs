import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) throw new Error('R1 +2003 physical signing fact must remain closed');
if (r2.status !== 'INVALIDATED_BY_PHYSICAL_RUNTIME_FAILURE' || r2.currentState?.r2PhysicalCampaign !== 'INVALIDATED_PENDING_REPLACEMENT_CANDIDATE') {
  throw new Error('R2 +2003 must remain invalidated pending a replacement candidate');
}
if (r2.physicalIncident?.requiresReplacementCandidate !== true || r2.physicalIncident?.mixEvidenceWithReplacementCandidateAllowed !== false) {
  throw new Error('R2 replacement-candidate boundary missing');
}
if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('failed R2 transition cannot promote readiness');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R2_IMPLEMENTATION_CONTRACT=SEPARATE_EXPLICIT_GATE');
console.log('R1_2003_TRUSTED_EDGE_SIGNING=PASS_HISTORICAL');
console.log('R2_2003_PHYSICAL_CAMPAIGN=INVALIDATED');
console.log('NEXT_EXECUTION=REPLACEMENT_CANONICAL_CANDIDATE_THEN_R1_THEN_R2_OD0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
