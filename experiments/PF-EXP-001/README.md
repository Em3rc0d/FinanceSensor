# PF-EXP-001 — C0 preflight (no APK)

**Status:** C0_PROPOSED; G0–G4 NOT_RUN; no production authorization.

This experiment tests whether a *bounded, independently verified* financial period can be reconstructed accurately and with less human effort than a comparable Excel/other baseline. It does not certify the +2018 Android candidate.

Full contract SHA256: `fe6bdc1d7b89e224048d9601b75fcc6e86ac51714bc774a26dcd75b2b5b5373b` (original contract provided to the product owner separately).

Initial scope candidates: one complete BCP savings period; one complete Ripley credit cycle; matching Gmail emails only if separately authorized. Historical owned-device +2016 observation: 0 of 10 bank statements imported (7 BCP and 3 Ripley rejected). Newer +2018 has no certified physical closure.

**Blocking conditions:** choose exact source periods, independent row/balance oracle, private local custody and approved baseline; preserve raw financial sources/passwords outside GitHub and prompts.

**Acceptance:** no invented amounts; no false merges or double count; no unexplained balance differences for closed scope; real time savings vs comparable baseline. Synthetic preflight test results are not financial gate evidence.

**No build or CI:** this directory is documentary C0 groundwork only. Runner and synthetic test package remain as an independently delivered local ZIP until C0 authorization and reproducible native execution.

## Native regression milestone (2026-11-16, isolated experiment)

The source correction on this branch (blob `e8e7193a36f40eb92654fb11c9e56ea65cfdd64b`) was byte-for-byte checked against a local Node.js 22.16.0 snapshot. Executed: **14/14 existing synthetic contract assertions and 7/7 new safety assertions**; the separate C0 preflight package passed **4/4** protocol checks. Total local synthetic assertions: **25/25**.

Reproduce native engine assertions in a checkout of this **experimental branch**:

```sh
node --test experiments/PF-EXP-001/tests/canonical-resolver.test.mjs experiments/PF-EXP-001/tests/safety-boundary.test.mjs
```

The C0 protocol harness and 28-case registry are included in the downloadable local lab package, not yet committed in this branch. No Action, Android build, PDF, Gmail query or real ledger was executed. Do not interpret this as G0/G1/G2/G3/G4 closure.

**Bounded hardening:** tenant-specific same-evidence replay, conflicting reference fail-closed, finite positive amounts before admission and projection, and changed same-source amount routed to `EVIDENCE_REPLAY_CONFLICT` instead of silently discarded. No change has been merged into `jett/mk0-foundation`.
