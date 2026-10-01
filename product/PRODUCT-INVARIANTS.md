# PRODUCT INVARIANTS

These rules sit above implementation choices. A build that violates them is incorrect even if it compiles and passes superficial UI checks.

## Financial truth

### FIN-001 — No invented financial data
If a fact cannot be supported by evidence or a user correction, it is unknown.

### FIN-002 — Evidence is not a transaction
One evidence item may represent no transaction; multiple evidence items may represent one transaction.

### FIN-003 — Every financial number has provenance
The product must be able to explain where a transaction, category, recurring pattern or insight came from.

### FIN-004 — Never double-count money movement
Transfers between accounts owned by the same financial universe do not create income or expense.

### FIN-005 — Credit-card payment is not the purchase again
Purchases and subsequent settlement of the credit-card balance are separate financial events with different semantics.

### FIN-006 — Fact is not forecast
Predictions, expected recurring charges and inferred future cash requirements must never be displayed as already-observed facts.

### FIN-007 — Reprocessing is idempotent
Re-reading the same source evidence must not create an additional economic transaction.

### FIN-008 — Financial truth beats feature count
No new insight layer may compensate for unresolved correctness defects in the canonical ledger.

### FIN-009 — Movement mechanism is not economic meaning
An external transfer, debit or credit direction alone cannot silently determine income, expense or neutrality. When ownership/purpose evidence is insufficient, the economic effect remains unresolved and the movement does not mutate user-facing income/expense totals as if its meaning were known.

### FIN-010 — Offsets cannot erase more economic value than exists
Refunds, reversals and other linked offsets must be bounded by the economic contribution they offset. Ambiguous, duplicate or over-sized cumulative offsets route to review instead of silently producing impossible negative consumption/income.

## Privacy and security

### PRIV-001 — Financial content stays local by default
Plaintext financial content should not be uploaded merely to make classification convenient.

### PRIV-002 — Cloud coordination does not imply cloud comprehension
The control plane may coordinate devices and encrypted state without access to plaintext financial meaning.

### PRIV-003 — Least privilege
Every external connector requests the minimum permission required for its current function.

### PRIV-004 — User-verifiable privacy
The product should expose enough information for the user to understand what was processed, retained and synchronized.

### PRIV-005 — Device revocation is real
A revoked device must lose future access to tenant financial state.

## Tenancy and distributed state

### TEN-001 — Device is not tenant
A phone is an execution node, not the ownership boundary.

### TEN-002 — Connection belongs to tenant
A Gmail, IMAP or bank connection is tenant-owned even if a particular device currently executes its work.

### TEN-003 — User is not necessarily tenant
A user may participate in multiple financial universes and a tenant may eventually contain multiple members.

### TEN-004 — Source identifier is not economic identity
Provider IDs can change across pending/posted states, provider migrations or reconnections. Canonical identity must not depend on one external ID.

### TEN-005 — Multi-device must converge
Two authorized devices processing overlapping evidence must eventually agree on one canonical financial state.

## Human interaction

### HUM-001 — No financial expertise required
Default screens must use language understandable without accounting knowledge.

### HUM-002 — Explain, never shame
The system describes facts, changes and options. It does not moralize the user's purchases.

### HUM-003 — Never show a problem without useful context
An alert should state what changed, why it matters and what the user can do next when a meaningful action exists.

### HUM-004 — Suggestions require evidence
A savings opportunity must be traceable to observed spending, recurring charges, fees, trends or another defensible signal.

### HUM-005 — Uncertainty becomes interaction
Low confidence is surfaced as a lightweight review task rather than hidden behind fabricated certainty.

## UX

### UX-001 — One viewport, one primary purpose
Each primary screen answers one dominant user question.

### UX-002 — Primary answer in first viewport
Critical information and the primary action cannot be hidden below arbitrary vertical content.

### UX-003 — No meaningless scroll
Scroll is reserved for intrinsically sequential content such as transaction history, search results, evidence lists and long settings/legal documents.

### UX-004 — Home does not vertically scroll
The home screen must fit its primary summary in the supported minimum viewport.

### UX-005 — Sensor overview does not vertically scroll
The main Financial Sensor status view must fit without vertical scrolling.

### UX-006 — Progressive disclosure
Complexity belongs behind intentional taps, not in the default viewport.

## Device capability

### DEV-001 — High-end hardware is optional
Core product value must remain available without a large local LLM or flagship NPU.

### DEV-002 — Graceful degradation
A weaker device may ask the user to resolve more uncertain events, but must not silently produce lower-quality financial truth.

### DEV-003 — Eventual freshness over fake real-time
The product optimizes privacy and battery before sub-second background freshness.

## Release law

A release cannot be declared ready while an invariant affecting its declared scope is knowingly violated.
