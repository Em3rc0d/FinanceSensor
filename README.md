# FinanceSensor

> **OBD-II for your finances.** A privacy-first financial sensing system that observes digital financial evidence, resolves it into trustworthy financial events, and explains what matters in language anyone can understand.

## Product thesis

FinanceSensor is **not** an expense tracker, accounting package, banking app, or financial chatbot.

It is a distributed financial telemetry system:

```text
Financial sources
      ↓
Financial evidence
      ↓
Edge processing
      ↓
Canonical financial events
      ↓
Financial state
      ↓
Simple explanations, alerts and opportunities
```

The cloud coordinates. Devices observe and reason. The tenant owns the financial truth.

## Core ideas

- **Email is a sensor, not the ledger.** An email is evidence of a financial event; multiple emails may describe the same transaction.
- **Financial truth over feature count.** Incorrect deduplication, transfers counted as expenses, or duplicate card payments invalidate every insight built above them.
- **Privacy by architecture.** Financial content is processed locally by default; the cloud acts as control plane and can store opaque E2EE state.
- **Human language.** Users should not need accounting or finance knowledge to understand the product.
- **No judgment.** FinanceSensor explains changes and opportunities; it does not moralize spending.
- **One viewport, one purpose.** The primary answer of a screen belongs in the first viewport. Scroll exists only when the information is intrinsically sequential.

## Repository map

```text
FinanceSensor/
├── product/
│   ├── PRODUCT-THESIS.md
│   ├── PRODUCT-INVARIANTS.md
│   ├── DOMAIN-GLOSSARY.md
│   ├── ROADMAP.md
│   └── DECISION-LOG.md
├── research/
│   ├── MINING-001-COMPETITIVE-ARCHAEOLOGY.md
│   └── SOURCES.md
└── mk0/
    ├── 00-brainstorming/
    ├── 01-mining-site/
    ├── 02-quarries/
    ├── 03-design/
    ├── 04-architecture/
    ├── 05-data-model/
    ├── 06-wireframes/
    ├── 07-plan/
    ├── 08-build/
    ├── 09-test/
    ├── 10-evidence/
    ├── 11-decisions/
    └── 12-release/
```

## MK0 objective

Prove the sensing foundation before broadening the product:

```text
Connect Gmail
      ↓
scan bounded history
      ↓
identify financial evidence
      ↓
extract + normalize
      ↓
resolve canonical transactions
      ↓
deduplicate / correlate
      ↓
classify income, expense, transfer, refund
      ↓
detect basic recurring payments
      ↓
store encrypted local ledger
      ↓
sync E2EE across devices
      ↓
show a no-scroll financial home
```

### MK0 gates

```text
PRODUCT_DEFINITION       PASS
MK0_SCOPE                FROZEN
TENANCY_MODEL            PASS
FINANCIAL_MODEL          PASS
EVENT_INVARIANTS         PASS
EDGE_CLOUD_BOUNDARY      PASS
PRIVACY_MODEL            PASS
THREAT_MODEL             PASS
GMAIL_FEASIBILITY        PASS
ANDROID_FEASIBILITY      PASS
MULTI_DEVICE_DESIGN      PASS
SIGNATURE_WIREFRAMES     PASS
NO_SCROLL_CONTRACT       PASS
IMPLEMENTATION_PLAN      PASS

BUILD_READY              YES
```

After build:

```text
BUILD                     PASS
TEST                      PASS
EVIDENCE                  PASS
RELEASE_READY             YES
```

## Execution rule

Every MK follows the same flow:

```text
BRAINSTORM
   ↓
MINE
   ↓
QUARRY
   ↓
DESIGN
   ↓
ARCHITECT
   ↓
DATA MODEL
   ↓
SIGNATURE WIREFRAMES
   ↓
PLAN
   ↓
BUILD
   ↓
TEST
   ↓
EVIDENCE
   ↓
RELEASE
```

Failures route to their actual cause. We do not patch a domain-model problem with UI code or an architecture problem with conditionals.

## Current critical path

1. Canonical financial semantics.
2. Transaction fingerprinting and idempotency.
3. Gmail/OAuth production feasibility.
4. Email privacy and Limited Use constraints.
5. Local-first / E2EE multi-device synchronization.
6. MK0 signature UX.

See [`mk0/02-quarries/README.md`](mk0/02-quarries/README.md) for the active research graph.
