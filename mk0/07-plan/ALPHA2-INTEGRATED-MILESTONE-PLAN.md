# Alpha.2 — Integrated Milestone Plan

**Status:** PRE-BUILD PLAN  
**Date:** 2026-09-06

## Delivery rule

No new physical APK is requested for intermediate slices. Engineering proceeds internally until one integrated candidate clears the milestone gate.

## Phase 0 — close current trusted-edge receipt

- R2 stable signer physically proven.
- owned-device install/OAuth/Gmail bounded scan physically observed.
- repo tooling must match the physical Windows path.
- no `BUILD_READY` promotion.

## Phase 1 — remove evidence overclaim

Replace user-facing percentage evidence labels with the truth ladder:

```text
UNKNOWN / PARTIAL / OBSERVED / POSTED / RECONCILED
```

Internal deterministic reconciliation scores remain private algorithmic signals.

Exit criteria:

- no universal/fixed evidence percent in product UX;
- tests prove `matchScore` is not serialized as public confidence;
- visual copy distinguishes observation, posting and reconciliation.

## Phase 2 — integrate A + B

### A — discovery

Wire certified Gmail/statement source discovery into the Android trusted edge.

### B — fetch + parse

Wire only supported physical parser families.

Fail closed:

- BCP Savings requested may enter when its physical contract is satisfied;
- BCP Credit/Ripley remain quarantined until their parser families are physically closed;
- no generic PDF fallback.

Exit criteria:

- synthetic corpus + parser quarantine tests green;
- bounded Gmail metadata-first path preserved;
- raw evidence not durably leaked.

## Phase 3 — integrate C

Financial Vault becomes the local durable authority.

Exit criteria:

- SQLCipher lifecycle tests;
- migration/reopen/recovery tests;
- Android Keystore boundary tests where automatable;
- no plaintext backup/export path.

## Phase 4 — integrate D + E

Run deterministic reconciliation and account graph over source observations.

Exit criteria:

- duplicate event+statement observation becomes one canonical movement;
- transfer/card-payment/refund semantics preserved;
- account mapping cannot self-confirm from weak bank+currency identity;
- replay produces identical canonical output.

## Phase 5 — integrate F + G

Monthly coverage and Sensor V1 consume the canonical ledger.

Exit criteria:

- no unqualified global percentage;
- missing statement keeps month partial;
- category and recurrence outputs remain deterministic;
- recurring signal remains candidate/observed until stronger evidence exists.

## Phase 6 — web projection

Build the first consolidated web surface from synthetic canonical ledger fixtures before enabling any real sync.

Exit criteria:

- dashboard contract implemented;
- browser tests for month summary, movements, evidence chips, coverage panel and review queue;
- raw Gmail/PDF fields absent from web API/projection schema.

## Phase 7 — E2EE sync integration

Connect canonical ledger projection to the existing Q-005 local-first envelope protocol.

Exit criteria:

- relay receives ciphertext only;
- server has no master key;
- offline queue/retry works;
- conflict/replay tests deterministic;
- browser cannot obtain plaintext without authorized key material.

## Phase 8 — production-policy closure track

Q-003 remains a release dependency because `gmail.readonly` is a restricted scope. Development/test physical success does not equal public production approval.

Required before public launch:

- final OAuth verification topology;
- public privacy/Limited Use disclosures;
- provider determination of security-assessment applicability for the chosen topology;
- deletion/revocation behavior;
- production credential boundary.

This track does not block internal Alpha.2 engineering but does block `RELEASE_READY`.

## Phase 9 — integrated CI milestone

One exact candidate SHA must pass:

```text
A-G contract suites
canonical resolver suites
vault suites
sync suites
web unit/browser suites
privacy validators
build-readiness validators
Flutter analyze/tests
Android APK build
receipt freeze
```

Only after all are green is a new physical APK generated for the user.

## Phase 10 — one bounded integrated physical campaign

The next user test is intended to validate the integrated product milestone rather than isolated slices:

- install/upgrade;
- Gmail OAuth/read-only scope;
- supported statement discovery/import;
- encrypted persistence;
- reconciliation;
- source coverage;
- web consolidated view;
- revoke/disconnect and recovery boundary.

## Readiness law

```text
STATIC_A_G_PASS != MOBILE_INTEGRATED
MOBILE_INTEGRATED != PHYSICAL_PASS
PHYSICAL_PASS != BUILD_READY
BUILD_READY != RELEASE_READY
```
