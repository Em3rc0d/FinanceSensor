# Alpha.2 — Implementation and certification plan

**Status:** DESIGN-FROZEN / EXECUTION NOT STARTED  
**Base authority:** ADR-036 and `graph/alpha2-design-freeze.json`

## Rule of execution

Each slice lands through a separate PR and exact-SHA evidence. A green static suite is never promoted into physical proof. Real Gmail, OAuth authority, passwords and financial plaintext remain on the trusted local edge.

## Slice A — Statement discovery

Deliver:

- versioned discovery-profile registry;
- targeted query planner with bounded history window;
- metadata/MIME descriptor inspection;
- deterministic candidate gate;
- source inventory and idempotent terminal states;
- UI source-discovery projection.

Static gate:

```text
weak/probable candidates downloaded       0
unknown attachment types downloaded       0
conflicting profile matches downloaded    0
strong known candidates planned uniquely  PASS
raw metadata persisted                     0
```

Physical gate uses a controlled owned Gmail corpus and sanitized aggregate receipts only.

## Slice B — Fetch and parse

Deliver:

- attachment fetch behind the strong gate;
- bounded in-memory document session;
- grouped session-only password UX;
- passive PDF runtime;
- profile/page/region/row selection;
- BCP savings, Interbank savings, BCP credit and Ripley credit adapters only at their proven lifecycle status;
- drift and unknown-profile quarantine.

Static gate verifies cancellation/background/error disposal and forbids durable raw writes. Physical promotion is per profile version and platform.

Current physical truth carried forward:

- BCP savings printed debit/credit totals: 9/9 exact;
- BCP savings full balance equation: 6/9;
- two one-page final-balance bindings remain open;
- one BCP period/date-order variant remains open;
- BCP credit and Ripley credit have owned-corpus evidence but must be receipt-bound to the Alpha.2 runtime before promotion;
- Interbank savings mobile product proof remains open.

## Slice C — Financial vault

Deliver:

- SQLCipher 4.x exact pin;
- platform-native wrapped 256-bit DEK;
- typed repository and schema v1;
- transactional migrations;
- crash-safe commit boundary: derived batch and terminal source state commit atomically;
- deletion/crypto-shred path;
- backup exclusions and restore state machine.

Physical gate inspects main DB, WAL, SHM/journal, temp, migration backups, logs and crash output. It also proves restart/reboot recovery and failure with missing/invalid unwrap authority.

## Slice D — Reconciliation

Deliver:

- immutable feature snapshot v1;
- candidate generation scoped by currency/account/period/economic compatibility;
- exact/strong decision path;
- proposed/review/conflict path;
- canonical merge transaction;
- replay and reprocessing audit.

Acceptance:

```text
Gmail + statement same event canonical count  1
amount-only automatic confirmation             0
ambiguous equal-score automatic confirmation   0
cross-currency automatic match                 0
incompatible movement-kind automatic match     0
replay duplicate count                         0
```

## Slice E — Account graph

Deliver institution, account and payment-instrument identities; masked stable hints; explicit mapping lifecycle; merge/split correction audit; statement-period ownership.

Automatic confirmation requires stable evidence across at least two independent statement periods or an exact stable account/instrument identifier under the profile contract. Bank plus currency is never sufficient.

## Slice F — Monthly coverage

Deliver per-source expected disposition, directional coverage, reconciliation status, unresolved counts and the monthly close/reopen state machine.

`RECONCILED` requires all included expected sources at sufficient coverage with zero blocking conflicts. Exclusion changes scope and remains visible. Late evidence and parser reprocessing reopen deterministically.

## Slice G — Sensor V1

Deliver deterministic merchant normalization, recurrence candidates, base categories, cashflow observations and explicit knowledge gaps. Each output stores algorithm version, evidence inputs and truth state.

No LLM, recommendation or automated financial advice enters this slice.

## Cross-slice negative campaign

Required cases include:

- unknown sender with statement-like subject;
- known sender with unrelated PDF;
- filename spoof with non-PDF bytes;
- oversized attachment;
- two matching discovery profiles;
- wrong password and canceled unlock;
- process death during parse and before durable commit;
- profile signature drift;
- educational/sample page with transaction-looking rows;
- same amount/date across multiple candidates;
- statement payment misclassified as income;
- own-account transfer misclassified as expense;
- SQLCipher unavailable or unwrap authority invalid;
- missing statement, user exclusion and late-arriving statement;
- stale Gmail history anchor;
- logs/crash report containing canary raw values.

## Physical Alpha.2 campaign

Minimum promotion corpus:

```text
institutions physically proven                 >= 2
savings/debit profile physically proven        >= 1
credit profile physically proven               >= 1
statement-only inflow                          PASS
Gmail + statement dedup                        PASS
monthly close + reopen                         PASS
restart persistence                            PASS
raw/password/plaintext privacy inspection      PASS
```

The receipt records exact app/parser/profile/schema versions, platform/device class, aggregate counts and allowed failure codes. It never contains email/PDF plaintext, real amounts, dates, merchants, account/card identifiers, Gmail IDs, password material or raw layout geometry.

## Promotion matrix

| Milestone | Required authority | Result allowed |
|---|---|---|
| Design freeze | machine validator on exact SHA | Alpha.2-A implementation may begin |
| Static slice pass | CI tests and negative corpus | candidate for controlled physical run |
| Physical profile pass | owned-edge sanitized receipt | that profile/version/platform may be promoted |
| Alpha.2 product pass | all slice gates + physical campaign | Alpha.2 capability pass |
| Global build ready | existing closure graph | unrestricted product integration |

## Explicit non-authorities

```text
DESIGN FREEZE           != STATIC IMPLEMENTATION PASS
STATIC IMPLEMENTATION  != PHYSICAL PASS
ONE PROFILE PASS        != ALL PROFILE PASS
ALPHA.2 PASS            != GLOBAL BUILD_READY
```

