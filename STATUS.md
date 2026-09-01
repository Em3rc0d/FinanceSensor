# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-01**.

## Project state

```text
PRODUCT THESIS             PASS
PRODUCT INVARIANTS         PASS
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

## Heart closure state

The first canonical financial-truth cycle has completed formal closure audit:

```text
C-001 External-transfer semantics     CLOSED
C-002 Refund/reversal projection      CLOSED
Q-001 Canonical semantics             CLOSED
Q-002 Fingerprinting/dedup            CLOSED
```

Closure receipts:

- `mk0/11-decisions/closure-receipts/C-001.md`
- `mk0/11-decisions/closure-receipts/C-002.md`
- `mk0/11-decisions/closure-receipts/Q-001.md`
- `mk0/11-decisions/closure-receipts/Q-002.md`

The nodes remain reopenable if later provider/device evidence contradicts their closed claims.

## Financial heart evidence

The closure-candidate resolver baseline passed:

```text
CANONICAL RESOLVER           PASS — 98/98 tests
SEMANTIC CORPUS              PASS — 54 bounded cases
Q-002 ADVERSARIAL SCENARIOS  PASS — 28/28 decisions
UNSAFE FALSE MERGES          0
AUTO-MERGE PRECISION         100%
HARD-LINK FALSE SPLITS       0
REPLAY DUPLICATE COUNT       0
BENCHMARK DECISION ACCURACY  100%
```

Thresholds were frozen before benchmark acceptance in `spikes/canonical-resolver/BENCHMARK-CONTRACT.md`.

Evidence: `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`.

## Peripheral/autonomic evidence

```text
PERIPHERAL + PARASYMPATHETIC PASS — 28/28 tests
T-002                        PASS
Q-005                        ACTIVE
```

Q-005 remains deliberately open because production cryptography, physical Android/iOS key/background behavior and recovery still need physical evidence.

## Invariant nervous system

After the heart closure and canonical invariant promotion:

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       38
TOTAL WIRED                  72

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              10
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`PROVEN` is used only for the bounded invariants whose owning heart nodes are now `CLOSED` and whose executable evidence is recorded. Q-005 properties remain `PROVEN_AT_SPIKE` where production/mobile evidence is still missing.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

Machine-readable wiring:

- `graph/closure-ledger.json`
- `graph/traceability-matrix.json`
- `tools/validate-closure-graph.mjs`
- `tools/validate-traceability.mjs`

## Closure graph

```text
P-001 Product thesis                 PASS
P-002 Product invariants             PASS

Q-001 Canonical semantics            CLOSED
Q-002 Fingerprinting/dedup           CLOSED
Q-003 Gmail feasibility              ACTIVE
Q-004 Email privacy                  ACTIVE
Q-005 E2EE multi-device sync         ACTIVE

C-001 External-transfer semantics    CLOSED
C-002 Refund/reversal projection     CLOSED

A-001 Core architecture              DRAFTED
SEC-001 Security/privacy arch        DRAFTED
DM-001 Core data model               DRAFTED
WF-001 Signature wireframes          DRAFTED
S-001 Canonical resolver spike       ACTIVE
T-001 Canonical resolver test        PASS
S-002 Peripheral convergence spike   ACTIVE
T-002 Peripheral/parasympathetic     PASS
OPS-001 Repository governance        OPEN

G-MK0 BUILD_READY                    BLOCKED
```

## Closed financial semantics

### Movement mechanism != economic meaning

```text
external transfer + unresolved purpose
→ REQUIRES_REVIEW
→ authoritative income 0 / expense 0
```

Only explicit evidence or an auditable correction can resolve it to a compatible income, expense or neutral effect.

### Relationship-aware bounded offsets

```text
purchase                expense +100
refund #1               expense -40
refund #2               expense -35
remaining offset capacity        25
refund #3 of 30         REQUIRES_REVIEW
```

Refunds/reversals cannot silently erase more economic value than the linked original event contributed.

### Conservative identity

```text
exact replay                         → idempotent
hard cross-artifact link + compatible → merge
weak similarity                       → review
hard contradiction                    → separate
```

Known tenant/currency/amount/direction/account/instrument/semantic contradictions block automatic identity.

## Gmail position

Q-003 remains the next source-feasibility front:

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

Q-004 still requires physical deletion/revocation and real source-lifecycle evidence. The machine-readable privacy matrix currently tracks 18 data classes and remains a DRAFT model.

## Q-005 remaining blockers

```text
production cryptographic construction/library decision
Android Keystore physical evidence
iOS Keychain/Secure Enclave physical evidence
real cloud authorization enforcement
real network partition / long-offline recovery
real crash/restart persistence
real WorkManager / BackgroundTasks behavior
all-devices-lost recovery
side-channel / penetration-test review
metadata leakage analysis
```

## Repository governance position

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` therefore remains an explicit dependency of `G-MK0`.

## Critical path

With the financial heart closed, the critical path advances to:

```text
Q-003 physical Gmail feasibility
        +
Q-004 deletion/privacy evidence
        +
Q-005 production crypto/recovery/mobile evidence
        ↓
A-001 + SEC-001 reconciliation
        ↓
DM-001 reconciliation/freeze
        ↓
WF-001 signature UX reconciliation
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

Bounded spikes remain allowed only when they close graph nodes or produce evidence.

## North-star invariant

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```
