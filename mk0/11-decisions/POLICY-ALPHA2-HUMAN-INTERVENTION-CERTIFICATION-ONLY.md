# Alpha.2 execution policy — Human intervention is certification-only

**Status:** ACTIVE / ENFORCED

**Date:** 2026-09-14

## Purpose

Alpha.2 has a few boundaries that public CI cannot truthfully cross: trusted-edge signing with the private keystore, real Google authorization, owned-device Android behavior, real Gmail content and encrypted statement interaction. Those boundaries do not justify using the owner as iterative QA for every generated APK.

From this policy forward, human intervention is exception-only and certification-only.

## Allowed human boundaries

1. `TRUSTED_EDGE_SIGNING` — may be requested only after the exact candidate artifact is frozen and every reproducible pre-signing gate is green.
2. `CONSOLIDATED_OWNED_DEVICE_UAT` — may be requested only after stable signing is certified and every reproducible pre-UAT gate is green for that exact signed candidate.

The owner MUST NOT be asked to install or test each candidate merely because an APK exists.

## Pre-signing gate

Before asking for private trusted-edge signing, the exact candidate must have:

- frozen source identity;
- frozen canonical APK identity;
- required post-merge CI consensus complete and green;
- static analysis green;
- unit/integration suites green;
- an automated regression for the exact known physical failure;
- synthetic end-to-end dashboard/projection materialization green;
- statement-failure isolation green;
- the strongest automatable encrypted-persistence contract green;
- replay/idempotency contract green;
- zero known candidate-blocking defects;
- no newer product-source mutation outside the frozen identity.

## Owned-device UAT gate

Before asking for a phone run, all pre-signing requirements must remain true and:

- trusted-edge signing PASS must be bound to the exact candidate/APK/signer;
- package and exact OAuth scope must remain frozen;
- stable-signed APK identity must be frozen;
- the UAT campaign must have a finite written success/failure contract;
- one consolidated campaign must collect as many physical gates as safely possible;
- the human must not be used to discover a bug that can still be reproduced synthetically or in CI.

## Mutation law

Any change to product source, runtime behavior, Android package, OAuth scope, versionCode, canonical APK bytes or stable-signed APK bytes resets:

```text
SIGNING_REQUEST_ALLOWED=NO
OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO
HUMAN_UAT_ELIGIBLE=NO
```

Prior-candidate physical evidence remains historical and non-inheritable across source/APK identity changes.

## Same-candidate rerun law

A second owned-device run on the exact same candidate is allowed only when the prior observation was ambiguous or failed for a demonstrably environmental reason. A deterministic product failure requires source remediation and a new automated preflight, not repeated owner testing.

## Enforcement

The machine-readable authority is:

- `graph/alpha2-human-intervention-gate.json`
- `tools/validate-alpha2-human-intervention-gate.mjs`

The current candidate-cut validator imports that gate, so the integrated candidate pipeline cannot remain green if the intervention policy is violated.

Public CI never originates a physical PASS and never receives private signing material, Gmail identity, PDF passwords or financial plaintext.
