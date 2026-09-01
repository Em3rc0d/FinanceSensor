# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-01**.

## Project state

```text
PRODUCT THESIS             DRAFTED
PRODUCT INVARIANTS         DRAFTED
DOMAIN GLOSSARY            DRAFTED
ROADMAP                    DRAFTED
COMPETITIVE MINING         INITIAL PASS
SOURCE CONCEPT MINING      PASS

MK0 BRAINSTORMING          PASS
MK0 MINING SITE            ACTIVE
MK0 QUARRIES               ACTIVE
MK0 DESIGN                 DRAFTED
MK0 ARCHITECTURE           DRAFTED
MK0 DATA MODEL             DRAFTED
MK0 SIGNATURE WIREFRAMES   DRAFTED
MK0 PLAN                   DRAFTED
MK0 BUILD                  BLOCKED
MK0 TEST STRATEGY          DRAFTED
MK0 EVIDENCE               ACTIVE
MK0 ADR SET                OPEN
MK0 RELEASE GATES          DRAFTED

BUILD_READY                NO
```

## Operational vital signs

Latest physically recorded green ECG snapshot:

```text
CANONICAL RESOLVER         PASS — 88/88 tests
CLOSURE GRAPH              PASS — structural validation
PRIVACY DATA MATRIX        PASS — structural validation, model still DRAFT
RECOVERY EQUIPMENT         PASS
BUILD_READY                false
```

Evidence: `mk0/10-evidence/EV-MK0-ECG-2026-09-01.md`.

A green test certificate does not automatically close the quarry that owns it.

## P0 closure graph

```text
Q-001 Canonical semantics          ACTIVE
Q-002 Fingerprinting/dedup         ACTIVE
Q-003 Gmail feasibility            ACTIVE
Q-004 Email privacy                ACTIVE
Q-005 E2EE multi-device sync       OPEN

C-001 External-transfer semantics  OPEN
C-002 Refund/reversal projection   OPEN

A-001 Core architecture            DRAFTED
SEC-001 Security/privacy arch      DRAFTED
DM-001 Core data model             DRAFTED
WF-001 Signature wireframes        DRAFTED

G-MK0 BUILD_READY                  BLOCKED
```

## What changed during reverse validation

The first resolver model exposed two upstream contradictions instead of hiding them:

1. `EXTERNAL_TRANSFER` is a movement mechanism, not enough information to call something income, expense or neutral.
2. A linked refund/reversal must offset the original economic contribution; treating it as permanently zero-effect would overstate historical totals.

The candidate reconciliation is documented in:

- `graph/CONTRADICTIONS.md`
- `mk0/05-data-model/ECONOMIC-EFFECT-MODEL.md`

Executable tests now cover the candidate projection, but the contradictions remain formally OPEN until closure audit/receipts are produced.

## Gmail position

Q-003 research currently supports this candidate direction:

```text
minimum Gmail scope candidate      gmail.readonly
metadata-first retrieval           feasible
historyId incremental sync         feasible
Pub/Sub push required for MK0      no
production OAuth verification      required
security assessment applicability  still open for actual architecture
physical Android OAuth spike       not executed yet
```

Research provenance: `research/GMAIL-2026-SOURCES.md`.

## Privacy position

Q-004 has moved from slogan to enforceable candidate policy:

```text
raw email cloud storage        forbidden by default
raw body/attachment retention  transient in MK0
OAuth token cloud plaintext    forbidden
derived evidence local         encrypted candidate
canonical ledger local         encrypted candidate
canonical multi-device sync    E2EE candidate
routine human content access   forbidden
content-bearing analytics      forbidden
Gmail-derived generalized AI   forbidden
```

Machine-readable contract: `mk0/04-architecture/PRIVACY-DATA-MATRIX.json`.

## Critical path

```text
Q-001 / Q-002 closure audit
        +
C-001 / C-002 reconciliation
        ↓
Q-003 physical Gmail spike
        +
Q-004 deletion/privacy evidence
        +
Q-005 E2EE convergence design + spike
        ↓
architecture reconciliation
        ↓
data-model reconciliation
        ↓
signature UX reconciliation
        ↓
closure audit
        ↓
BUILD_READY = YES
```

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.**

Bounded spikes are allowed only when they exist to close a graph node or produce evidence. No feature work bypasses the graph.

## North-star invariant

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```
