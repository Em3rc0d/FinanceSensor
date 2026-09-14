# ADR-040 — Human intervention is certification-only

**Status:** ACCEPTED FOR ALPHA.2 EXECUTION

**Date:** 2026-09-14

## Context

Alpha.2 requires a small number of operations that public CI cannot truthfully execute: stable trusted-edge signing with the private keystore, real Google authorization, owned-device Android behavior, real Gmail content and encrypted statement interaction. Those boundaries do **not** justify using the owner as an iterative debugger for every generated APK.

The +2007/+2008 campaign exposed the cost of escalating a candidate to the owned device before all reproducible failure modes had been exhausted. Physical evidence remains valuable, but it must certify a hypothesis that is already strongly supported by automation rather than discover ordinary software defects.

## Decision drivers

- Human/device/privacy boundaries must remain truthful.
- Candidate churn must not create repeated owner work.
- A physical run must have high information value and a sharply defined certification purpose.
- Any product-source or APK-identity mutation invalidates prior physical eligibility.
- Public CI must never synthesize a physical PASS.
- Private signing material, Gmail identity, PDF passwords and financial plaintext remain outside GitHub.

## Decision

Human intervention for Alpha.2 is **exception-only and certification-only**.

Two human boundaries are permitted:

1. `TRUSTED_EDGE_SIGNING` — requested only after the exact candidate artifact is frozen and every reproducible pre-signing gate is green.
2. `CONSOLIDATED_OWNED_DEVICE_UAT` — requested only after stable signing is certified and every reproducible pre-UAT gate is green for that exact signed candidate.

The owner MUST NOT be asked to install or test each candidate merely because an APK exists.

A candidate may be escalated to the owner only when the machine-readable human-intervention gate explicitly allows the requested boundary. Conversation state, convenience or a partially green CI run is not sufficient evidence.

### Pre-signing eligibility

Before asking for trusted-edge signing, all of the following are required for the exact candidate:

- canonical source identity frozen;
- canonical APK identity frozen;
- required public CI consensus complete and green;
- static analysis and unit/integration suites green;
- exact known physical failure has an automated regression test;
- synthetic end-to-end projection/dashboard materialization passes;
- statement failure isolation passes;
- encrypted persistence contract passes in the strongest automatable environment available;
- replay/idempotency contract passes;
- zero known candidate-blocking defects;
- no newer product-source mutation exists outside the frozen identity.

### Owned-device UAT eligibility

Before asking for a consolidated owned-device UAT:

- every pre-signing requirement remains true;
- trusted-edge signing PASS is bound to the exact candidate/APK/signer;
- package and exact OAuth scope remain frozen;
- the stable-signed artifact identity is frozen;
- the UAT campaign has a finite written success/failure contract;
- one run is designed to collect as many physical gates as safely possible;
- the human is not being used to discover a bug that can be reproduced synthetically or in CI.

### Candidate mutation law

Any change to product source, runtime behavior, Android package, OAuth scope, versionCode, canonical APK bytes or stable-signed APK bytes MUST reset:

```text
SIGNING_REQUEST_ALLOWED=NO
OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO
HUMAN_UAT_ELIGIBLE=NO
```

Prior-candidate physical evidence remains historical and non-inheritable unless a contract explicitly proves that inheritance is safe; Alpha.2 currently permits no such inheritance across source/APK identity changes.

### Same-candidate rerun law

A second owned-device run on the exact same candidate is allowed only when the previous observation was ambiguous or failed for a demonstrably environmental reason. A deterministic product failure requires source remediation and a new automated preflight, not repeated tapping by the owner.

## Consequences

- More bugs must be reproduced with fixtures, fakes, synthetic providers and deterministic tests before an APK reaches the owner.
- Some candidates will never be signed or installed physically; that is expected and desirable.
- Physical campaigns become milestone certification events instead of iterative debugging loops.
- Release claims remain conservative: a green automation gate does not become a physical PASS.

## Security / privacy impact

Positive. The policy reduces the number of times real Gmail, real statements, PDF passwords, device state and private signing material need to participate in development.

## UX impact

Positive. The owner should see fewer test APKs and each requested interaction should have a clear expected product outcome.

## Test / evidence required

- `graph/alpha2-human-intervention-gate.json`
- `tools/validate-alpha2-human-intervention-gate.mjs`
- `.github/workflows/alpha2-human-intervention-gate.yml`
- CI runner policy registration
- exact-candidate receipts for any future transition to `SIGNING_REQUEST_ALLOWED=YES` or `OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES`

## Supersedes / superseded by

This strengthens the `MILESTONE_ONLY` physical cadence from ADR-038. It does not supersede any security, OAuth, signing or physical-evidence ADR.