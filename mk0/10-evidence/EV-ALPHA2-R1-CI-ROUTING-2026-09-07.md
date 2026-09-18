# EV — Alpha.2 R1 CI Routing Receipt — 2026-09-07

Status: **R1_CI_ROUTING_CLOSED / PHYSICAL_SIGNING_OPEN**

This receipt closes the CI-routing debt discovered while hardening the Alpha.2 trusted-edge signer. It does **not** claim that trusted-edge signing has completed.

```text
R1_CI_ROUTING=CLOSED
PR_NUMBER=92
CERTIFIED_HEAD=75d286fc90f22c93c47b0ac55e5d5e294c3f097b
PR_RUN_ID=34135491080
PR_JOB_ID=101785339450
PR_CONCLUSION=SUCCESS
MERGE_SHA=32f9493773fb61fcae0785e0f55894ca6fc29aa7
POST_MERGE_RUN_ID=34135590675
POST_MERGE_JOB_ID=101785658752
POST_MERGE_CONCLUSION=SUCCESS
WORKFLOW=Alpha.2 R1 Trusted-Edge Signing
WORKFLOW_PATH=.github/workflows/alpha2-r1-trusted-edge-signing.yml
VALIDATOR=tools/validate-alpha2-r1-signing-handoff.mjs
CANONICAL_VALIDATOR=tools/validate-alpha2-canonical-candidate.mjs
POWERSHELL_PARSER_REQUIRED=YES
PUBLIC_CI_PRIVATE_SIGNING_MATERIAL_ALLOWED=NO
```

## What this closes

The signer and R1 handoff no longer rely on unrelated runtime files to trigger CI. Changes to the signer scripts, canonical candidate authority, R1 handoff graph, R1 evidence, or the R1 validators now route directly into the dedicated read-only public CI gate.

The gate verifies:

- exact canonical candidate identity;
- exact PS1 and CMD Git blob identities;
- real PowerShell syntax parsing;
- Windows-safe `ProcessStartInfo` redirected stdin;
- absence of direct password pipes and environment password handoff;
- exact R1 v2 bundle identity and v1 supersession;
- preservation of the physical boundary.

## Physical boundary remains open

```text
R1_TRUSTED_EDGE_SIGNING=OPEN
R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1
BUILD_READY=NO
RELEASE_READY=NO
```

No private keystore, private key, password, OAuth token, Gmail content, or financial plaintext is part of this receipt or public CI gate.
