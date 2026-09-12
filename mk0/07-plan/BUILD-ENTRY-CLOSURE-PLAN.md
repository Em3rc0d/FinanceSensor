# MK0 / 07 — Build Entry Closure Plan

Status: ACTIVE  
Authority: `graph/closure-ledger.json`  
Machine-readable mirror: `graph/build-readiness.json`

## Objective

Move FinanceSensor from a frozen implementation baseline to formal `BUILD_READY = YES` without confusing documentation completeness, synthetic CI, or spike success with production evidence.

## Current position

The implementation direction is already frozen strongly enough that there are no major technology-selection blockers:

```text
PRIMARY PRODUCT             MOBILE / ANDROID FIRST
UI / PRODUCT STATE          FLUTTER / DART
ANDROID SECURITY BRIDGE     KOTLIN
IOS SECURITY BRIDGE         SWIFT
ANDROID MIN SDK             API 31
LOCAL DATABASE              SQLITE + SQLCIPHER 4.x
CONTROL PLANE               SUPABASE / POSTGRESQL
FINANCIAL PLAINTEXT CLOUD    FORBIDDEN NORMAL PATH
GMAIL REFRESH CLOUD CUSTODY  FORBIDDEN
PRODUCTION CRYPTO PROFILE   ADR-021
WITNESS QUORUM              ADR-022
DELETION/BACKUP             ADR-023
RECOVERY KIT REFRESH        ADR-024
```

This does not close MK0. The remaining work is closure evidence and residual documentary reconciliation.

## Track A — Close everything that does not require physical/provider evidence

These nodes/gates should be exhausted before claiming that hardware/provider access is the only blocker.

### A1 — MK0 scope freeze

Required result:

```text
MOBILE PRIMARY PRODUCT          FROZEN
ANDROID FIRST                   FROZEN
IOS REQUIRED TARGET             FROZEN
WEB/DESKTOP                     OUT OF MK0 PRODUCT SCOPE
MK0 FEATURE SET                 BOUNDED
NO NEW P0 PRODUCT SURFACES      WITHOUT REOPENING SCOPE
```

Evidence candidates:

- `product/ROADMAP.md`
- `mk0/11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md`
- `mk0/03-design/PRODUCT-DESIGN.md`

### A2 — Tenancy model formalization

ADR-001 is still `PROPOSED`. Reconcile it against the accepted Supabase/RLS control-plane decision and core data model.

Required result:

```text
TENANT = FINANCIAL OWNERSHIP BOUNDARY
ACCOUNT != TENANT
DEVICE != TENANT
SOURCE CONNECTION != TENANT
MEMBERSHIP AUTHORIZES CONTROL-PLANE ACCESS
RLS ENFORCES TENANT SCOPING
DEVICE CRYPTO AUTHORITY REMAINS SEPARATE
```

Do not close physical tenant isolation until real RLS/adversarial evidence exists.

### A3 — Threat-model reconciliation

Reconcile `SECURITY-PRIVACY.md`, Q-005 security revalidation, ADR-021/022/023/024 and the mobile/native security boundary into one current threat inventory.

The documentary threat model must name at least:

```text
malicious/compromised relay
cross-tenant access
lost/stolen device
rollback/fork/replay
credential extraction
cloud operator visibility
backup resurrection
log/crash-report leakage
OAuth revocation failure
mobile bridge misuse
witness divergence
recovery-kit misuse
```

Physical mitigations remain open until tested.

### A4 — Signature UX freeze

Freeze the minimum product surfaces and information hierarchy:

```text
HOME
MOVEMENTS
SENSOR
YOU
MOVEMENT DETAIL
NEEDS REVIEW
OPPORTUNITY
PRIVACY INSPECTOR
SOURCE CONNECTION
DEVICE / RECOVERY
```

Mobile BI is accepted. Desktop-dashboard density is rejected.

### A5 — No-scroll contract

For the compact viewport contract, the primary decision surfaces must not require scroll to understand the immediate state/action.

This does not prohibit scrolling in history/details. It applies to signature decision surfaces such as Home summary, Sensor summary, Opportunity CTA and Needs Review CTA.

Required evidence:

- deterministic widget/layout tests;
- small viewport matrix;
- later physical Android screenshots/usability evidence.

### A6 — Implementation plan freeze

Before unrestricted build, convert architecture into ordered build slices with explicit entry/exit gates.

Proposed sequence:

```text
B0 Mobile shell + design tokens + synthetic BI
B1 Native security bridge skeleton
B2 SQLCipher local store + repository boundary
B3 Gmail mobile OAuth + protected credential custody
B4 Gmail bounded bootstrap/incremental ingress
B5 Canonical resolver integration
B6 Financial views + provenance + review workflow
B7 Supabase control plane + tenant RLS
B8 Opaque E2EE relay + device enrollment
B9 Witness/checkpoint/revocation
B10 Recovery/deletion/backup
B11 Physical matrix + closure campaign
```

Every slice must preserve `PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE`.

## Track B — Physical/provider closure

After Track A is exhausted, remaining blockers should be dominated by P0-P8 physical evidence.

```text
P0 harness sanitization
P1 Gmail v8 lifecycle / refresh / bytes / latency / revoke
P2 Android + iOS protected OAuth custody
P3 transport / storage / deletion / backup
P4 Android ↔ iOS crypto interoperability
P5 witness / crash / partition
P6 all-devices-lost recovery + N+1 cutover
P7 Google restricted-scope / security-assessment determination
P8 Q-003/Q-004/Q-005 closure receipts
```

## Build-entry dependency collapse

Target graph:

```text
Track A documentary closure
          +
P0-P8 physical/provider evidence
          ↓
Q-003 + Q-004 + Q-005 CLOSED
          ↓
A-001 + SEC-001 closure audit
          ↓
DM-001 closure audit
          ↓
WF-001 + OPS-001 closure
          ↓
G-MK0 closure receipt
          ↓
BUILD_READY = YES
```

## Hard laws

```text
IMPLEMENTATION_BASELINE_FROZEN != BUILD_READY
APK_BUILD_PASS                  != BUILD_READY
GMAIL_REACHABILITY_PASS         != Q003_CLOSED
SYNTHETIC_WIDGET_PASS           != PHYSICAL_ANDROID_PASS
DOCUMENT_COMPLETE               != SECURITY_PROVEN
GREEN_CI                        != RELEASE_READY
```

## Current decision

```text
UNRESTRICTED_BUILD = BLOCKED
CONTROLLED_SPIKES  = ALLOWED
BUILD_READY        = NO
```

The purpose of this plan is to make the remaining distance finite, inspectable and non-negotiable.
