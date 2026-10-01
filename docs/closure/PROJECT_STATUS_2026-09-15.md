# FinanceSensor / PocketFinances — Project Status

**Status date:** 2026-09-15  
**Authority branch:** `jett/mk0-foundation`  
**Purpose:** evidence-based project status for closure planning. This document must never be used to synthesize a release PASS.

## 1. Executive status

FinanceSensor is not an early implementation missing its basic modules. The project has a mature Alpha.2 engineering/certification pipeline, a canonical Android candidate, deterministic CI/governance, strict financial-statement parsing, encrypted/local trust boundaries, and a fail-closed promotion model.

The current blocker is **release certification**, not initial feature construction.

Current mandatory claims:

```text
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

These values remain authoritative until the exact signed candidate completes the owned-device campaign and the remaining quality/security/data/product gates are closed with evidence.

## 2. Current canonical Alpha.2 chain

### Product / canonical candidate

- Candidate: `0.2.0-alpha.2+2012`
- Product work introduced by PR #140.
- Canonical source authority: `b75cc39318ee749a1123971f19d895d71e35bd91`
- Canonical build run: `34983489697`
- Canonical artifact: `10402582806`
- Unsigned APK SHA-256: `74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e`
- Unsigned APK bytes: `182538547`

### R1 trusted-edge handoff

- Deterministic R1 bundle v12 SHA-256: `d6c9538b0c84d0bdabc966847cd7f6d340bd17eea68bf69e65d3d2a852585642`
- R1 bundle bytes: `86659710`
- Private signing material remains outside GitHub and public CI.

### Certification ledger

PR #143 added the deterministic SHA-256 parent-linked certification ledger and validator. The ledger cross-checks the canonical candidate, R1/R2 state, human-intervention rules, and promotion boundaries.

### Stable signing / OD0 frontier

PR #144 is the current open transition for the exact `+2012` candidate.

Proposed frozen signed identity in that PR:

- Signed APK SHA-256: `05ee3efd70bb07fe11bde6a21140c03de3ffa872b5f90e7a1014b5106b4b3000`
- Signed APK bytes: `182563366`
- Signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- State transition: `PRE_SIGNING_FRONTIER -> STABLE_SIGNED_APK_FREEZE -> OD0_READY`

Because PR #144 is still open at the time of this status snapshot, this document does **not** treat the proposed transition as a completed branch-level release certification.

## 3. Implemented product surface supported by repository evidence

The current Alpha.2 line includes:

- Gmail read-only ingestion boundary.
- Safe message/attachment discovery.
- Candidate-local failure isolation so one statement failure cannot destroy already-safe financial evidence.
- Strict statement parsing with no generic fallback.
- BCP Savings strict parsing and completeness controls.
- Ripley Credit strict parser constrained to the observed/public statement geometry.
- BCP Credit structural probe that emits no financial evidence.
- Runtime-disabled Interbank Savings path until an allowlisted Gmail identity is proven.
- Session-only profile-scoped PDF password handling.
- No DNI derivation/storage for statement passwords.
- PDF byte zeroization / cleanup boundaries.
- Safe diagnostic codes rather than raw exception disclosure.
- Synthetic negative regressions for non-authoritative monetary rows, summaries/formulas, rates/installments and privacy boundaries.
- Canonical financial runtime/projection and dashboard materialization safeguards.
- Candidate identity invalidation law: physical evidence from an older APK is non-inheritable by a new candidate.
- Trusted-edge signing separation.
- Public Readiness checks and certification ledger validation.

## 4. What is still not proven

The project cannot be called finished merely because the code compiles or CI is green.

Still open / unproven at this snapshot:

1. Merge and post-merge validation of PR #144 without changing the frozen candidate identity.
2. Exact signed `+2012` installation/launch on the authorized owned Android device through OD0.
3. Complete consolidated R2 owned-device campaign for the exact signed APK.
4. Physical validation of real Gmail discovery and the intended financial-view materialization.
5. Physical validation of the statement profiles claimed by Alpha.2, including password-protected flows where applicable.
6. Closure of every remaining project quality/security/data-migration/product gate required by the MK0 exit graph.
7. Final documentation reconciliation against actual code/evidence.
8. A reproducible release handoff with release notes, known limitations, installation/rollback instructions and evidence manifest.
9. Final `BUILD_READY` gate.
10. Final `RELEASE_READY` gate.

## 5. Deliberate boundaries

The following are not defects and must not be silently expanded during closure:

- Public CI must not receive private signing material, OAuth tokens, Gmail content, real statement data, PDF passwords or financial plaintext.
- Human intervention is certification-only; the owner is not an iterative QA runner for every APK.
- Parser behavior remains fail-closed. Unknown financial structures are knowledge gaps, not permission to guess.
- Older physical evidence cannot certify a changed candidate.
- iOS must not be claimed as complete unless separately implemented and certified; Android Alpha.2 evidence does not imply iOS readiness.

## 6. Status verdict

**Engineering maturity:** advanced Alpha / certification frontier.  
**Product code:** substantially implemented for the currently defined Android Alpha.2 scope.  
**Documentation:** historically fragmented across PRs, receipts and gates; closure documentation is being consolidated under `docs/closure/`.  
**Release:** not ready.  
**Next controlling dependency:** exact `+2012` signed-candidate OD0/R2 certification, followed by closure of the remaining MK0 exit gates.
