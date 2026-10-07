# MK0 / 07 — Implementation Slices

**Status:** FROZEN FOR BUILD ENTRY  
**Date:** 2026-09-02

## Rule

Implementation is dependency-ordered. A later slice may be prototyped synthetically, but production integration cannot bypass an unmet entry gate.

```text
SLICE_PASS != BUILD_READY
BUILD_READY controls unrestricted integration.
```

## B0 — Mobile shell and product system

**Purpose:** establish the Android-first Flutter application frame and signature mobile BI language.

Entry:

- ADR-009 accepted;
- ADR-025 accepted;
- MK0 scope frozen.

Deliverables:

- Flutter application shell;
- design tokens/theme;
- `Home | Movements | Sensor | You` navigation;
- synthetic read models;
- compact chart primitives;
- loading/empty/error states;
- viewport test matrix.

Exit:

```text
FLUTTER_ANALYZE             PASS
WIDGET_TESTS                PASS
SMALL_VIEWPORTS             PASS
REAL_GMAIL_IN_B0            0
REAL_FINANCIAL_DATA_IN_B0   0
```

## B1 — Native security bridge skeleton

**Purpose:** create the Kotlin/Swift boundary that owns protected security operations.

Entry:

- ADR-009;
- ADR-013;
- ADR-017;
- ADR-021.

Deliverables:

- typed Flutter↔native contract;
- protected-key capability query;
- protected secret CRUD contract;
- signing/agreement API contract;
- explicit unsupported/fail-closed states.

Exit:

```text
LONG_LIVED_SECRET_IN_DART       FORBIDDEN
EXPORTABLE_PRIVATE_KEY_FALLBACK FORBIDDEN
ANDROID_API31_CONTRACT          PASS
```

Physical key proof remains P2/P4.

## B2 — Encrypted local repository

**Purpose:** provide durable local financial state without plaintext SQLite fallback.

Entry:

- ADR-006;
- B1 protected DEK-wrap contract.

Deliverables:

- SQLCipher repository adapter;
- schema bootstrap/migrations;
- random 256-bit DB DEK;
- native protected DEK wrap/unwrap;
- repository interfaces for evidence/candidates/canonical state/read models;
- deletion/reset behavior.

Exit:

```text
PLAINTEXT_SQLITE_FALLBACK  0
DEK_DURABLE_DART_STORAGE   0
MIGRATION_TESTS            PASS
REPOSITORY_REPLAY          PASS
```

Physical file/WAL/temp inspection remains P3.

## B3 — Gmail mobile OAuth custody

**Purpose:** move proven Gmail feasibility into the production mobile authority boundary.

Entry:

- B1;
- ADR-017;
- Gmail production consent configuration available.

Deliverables:

- Android OAuth flow;
- iOS equivalent before production closure;
- protected refresh authority;
- on-demand short-lived access token;
- reauth/revoke/disconnect flow;
- no cloud refresh-token custody.

Exit for Android integration:

```text
ANDROID_PROTECTED_CREDENTIAL   PHYSICAL PASS
REFRESH_BEFORE_REVOKE          PHYSICAL PASS
OLD_REFRESH_AFTER_REVOKE       DENIED
SECRET_IN_LOGS                 0
```

## B4 — Gmail bounded ingress

**Purpose:** productionize bootstrap + incremental Gmail ingestion without Search-index dependency.

Entry:

- B3;
- ADR-018;
- ADR-019.

Deliverables:

- bounded bootstrap;
- message-history anchor provenance;
- incremental History API sync;
- metadata gate;
- selected full-message fetch;
- bounded raw-content lifetime;
- byte/latency instrumentation.

Exit:

```text
ANCHOR_PROVENANCE        PASS
INCREMENTAL_REPLAY       PASS
REQUEST_BYTES            ACCOUNTED
RESPONSE_BYTES           ACCOUNTED
ENDPOINT_LATENCY         RECORDED
RAW_GMAIL_DURABLE_STORE  0
```

## B5 — Canonical financial resolver integration

**Purpose:** connect real structured evidence to the already-closed financial semantics.

Entry:

- B2;
- B4 evidence objects;
- Q-001/Q-002 CLOSED.

Deliverables:

- evidence→candidate adapter;
- fingerprinting;
- resolver integration;
- review path;
- replay/idempotency harness.

Exit:

```text
UNSAFE_FALSE_MERGES      0
REPLAY_DUPLICATES        0
UNRESOLVED_EFFECT        NO TOTALS MUTATION
PROVENANCE_LINK          REQUIRED
```

## B6 — Financial read models and signature UX

**Purpose:** make trustworthy financial state useful on mobile.

Entry:

- B0;
- B5.

Deliverables:

- PeriodSummary;
- CategorySummary;
- MovementTimeline;
- RecurringSummary foundation;
- SensorSummary;
- Movement Detail;
- Needs Review;
- provenance drill-down.

Exit:

```text
HOME_SIGNATURE           PASS
MOVEMENTS_SIGNATURE      PASS
SENSOR_SIGNATURE         PASS
NEEDS_REVIEW_SIGNATURE   PASS
EXPLAIN_NUMBER_DRILLDOWN PASS
```

## B7 — Control plane and tenant RLS

**Purpose:** materialize ADR-001/ADR-010 without moving financial plaintext or Gmail authority to cloud.

Entry:

- ADR-001;
- ADR-010;
- privacy classification.

Deliverables:

- Supabase project/config-as-code where practical;
- account identity;
- Tenant/Membership tables;
- RLS policies;
- device/source control metadata;
- deletion tombstones/barriers;
- adversarial tenant-isolation tests.

Exit:

```text
CROSS_TENANT_READ       DENIED
CROSS_TENANT_WRITE      DENIED
SERVICE_ROLE_IN_MOBILE  0
GMAIL_REFRESH_IN_CLOUD  0
FINANCIAL_PLAINTEXT     0 NORMAL PATH
```

## B8 — Opaque E2EE relay and enrollment

**Purpose:** sync encrypted tenant state without server plaintext authority.

Entry:

- B1/B2/B7;
- ADR-021.

Deliverables:

- device enrollment;
- epoch/key coverage;
- opaque event relay;
- sequence/replay handling;
- offline rejoin foundation.

Exit:

```text
SERVER_CAN_DECRYPT       NO
DUPLICATE_DELIVERY       SAFE
OUT_OF_ORDER             SAFE
REVOKED_DEVICE_APPEND    DENIED
```

## B9 — Checkpoint, witness and revocation

Entry:

- B8;
- ADR-015/016/022.

Deliverables:

- append-only checkpoint construction;
- witness publication/confirmation;
- 3-witness / 2-of-3 policy;
- relay-independent witness;
- contradiction handling;
- crash/partition harness.

Exit depends on P5 physical evidence.

## B10 — Recovery, deletion and backup

Entry:

- B8/B9;
- ADR-014/023/024.

Deliverables:

- Recovery Kit export/import;
- all-devices-lost flow;
- N+1 tenant/recovery rotation;
- disconnect + erase;
- tenant deletion;
- resurrection barrier;
- backup retention verification.

Exit depends on P3/P6 physical evidence.

## B11 — Physical closure and gate reconciliation

Purpose: turn implementation into evidence rather than adding features.

Runs:

```text
P0 → P1/P2 → P3/P4 → P5/P6/P7 → P8
```

Then:

```text
Q-003/Q-004/Q-005 closure
A-001/SEC-001 audit
DM-001 audit
WF-001/OPS-001 closure
G-MK0 closure
BUILD_READY = YES
```

## Change discipline

A slice may change internally without an ADR when product/security/data contracts are preserved. Any change to tenancy, crypto, persistence, OAuth custody, cloud plaintext boundary, mobile platform scope or financial semantics requires ADR reconciliation before merge.

## Freeze decision

```text
IMPLEMENTATION_PLAN = PASS
BUILD_SEQUENCE       = B0 → B11
UNRESTRICTED_BUILD   = STILL BLOCKED BY G-MK0
```
