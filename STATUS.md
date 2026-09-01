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
REPOSITORY GOVERNANCE      OPEN

BUILD_READY                NO
```

## Operational vital signs

Latest physically recorded nervous-system ECG:

```text
CANONICAL RESOLVER         PASS — 88/88 tests
CLOSURE GRAPH              PASS
ARTIFACT STATUS AUTHORITY  PASS — 9 declarations checked
QUARRY ↔ LEDGER            PASS — 5/5 quarries coherent
TRACEABILITY NETWORK       PASS — 66/66 invariants wired
PRIVACY DATA MATRIX        PASS — 12 classes, model still DRAFT
RECOVERY EQUIPMENT         PASS
BUILD_READY                false
```

Evidence:

- `mk0/10-evidence/EV-MK0-ECG-2026-09-01.md`
- `mk0/10-evidence/EV-MK0-NERVOUS-SYSTEM-2026-09-01.md`

A green structural/test certificate does not automatically close the quarry or release invariant that owns it.

## Invariant nervous system

```text
PRODUCT INVARIANTS          32
DATA-MODEL INVARIANTS       34
TOTAL WIRED                  66

SPECIFIED                    37
PARTIAL                      18
PROVEN_AT_SPIKE              11
PROVEN                        0

OPEN CONTRADICTIONS           2
```

`PROVEN_AT_SPIKE` means bounded feasibility evidence exists. It is intentionally weaker than release-level `PROVEN`.

`G-MK0` cannot close while any release-scope invariant remains below `PROVEN` or while an interrupting contradiction is still open.

Machine-readable wiring:

- `graph/traceability-matrix.json`
- `tools/validate-traceability.mjs`
- `graph/NERVOUS-SYSTEM.md`

## Closure graph

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
OPS-001 Repository merge governance OPEN

G-MK0 BUILD_READY                  BLOCKED
```

## What reverse validation discovered

The resolver and downstream financial-state reasoning exposed two upstream contradictions instead of hiding them:

1. `EXTERNAL_TRANSFER` is a movement mechanism, not enough information to call something income, expense or neutral.
2. A linked refund/reversal must offset the original economic contribution; treating it as permanently zero-effect would overstate historical totals.

The candidate reconciliation is documented in:

- `graph/CONTRADICTIONS.md`
- `mk0/05-data-model/ECONOMIC-EFFECT-MODEL.md`

Executable tests now cover the candidate projection, but both contradictions remain formally `OPEN` until closure audit/receipts are produced.

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

## Repository governance position

Repository inspection on 2026-09-01 found:

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

This is now tracked as `OPS-001` and is a physical dependency of `G-MK0`.

The connected GitHub tooling available in this session can read branch protection but does not expose a write-capable protection/ruleset action. Therefore we do not claim the repository is enforced when it is not.

Interim control: PR #1 remains draft and its title/body explicitly forbid merge until `G-MK0` closes.

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
        +
OPS-001 repository enforcement
        ↓
closure audit
        ↓
all release-scope invariants PROVEN
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
