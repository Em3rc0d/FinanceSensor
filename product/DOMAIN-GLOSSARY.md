# DOMAIN GLOSSARY

## Identity and ownership

**User** — An authenticated product account.

**Tenant** — An isolated financial universe. It is the primary ownership boundary for financial state.

**Membership** — Relationship between a User and a Tenant, with role and lifecycle state.

**FinancialIdentity** — A person or financial actor represented inside a Tenant. This keeps the model ready for households, partners and small teams without equating tenant with person.

**Device** — An authorized smartphone/tablet acting as an edge execution node.

## Connectivity

**Connection** — Tenant-owned connection to a source such as Gmail, Outlook, generic IMAP, a bank aggregator or a future direct bank API.

**ConnectionCursor** — Source-specific checkpoint used for incremental ingestion.

**ProcessingLease** — Temporary right granted to one device to execute work for a connection, reducing duplicate concurrent processing.

**Institution** — Financial institution such as a bank, lender, wallet provider or card issuer.

**FinancialAccount** — Account representing money, credit or another financial balance at an Institution.

**PaymentInstrument** — Card or other payment mechanism associated with an account or financial identity.

## Evidence and event resolution

**SourceArtifact** — Raw source object, for example an email, PDF receipt, statement row or API event.

**FinancialEvidence** — Minimal structured financial information extracted from a SourceArtifact, with provenance and parser metadata.

**FinancialEventCandidate** — A hypothesis that one or more evidence items represent a financial event.

**Resolution** — Process that correlates, deduplicates and classifies candidates into canonical events.

**CanonicalFinancialEvent** — Trusted domain event used to construct the financial truth of a tenant.

**CanonicalTransaction** — Canonical event representing an economic transaction with amount, currency, semantic type and ownership context.

**TransactionFingerprint** — Composite identity signal used to recognize the same economic event when external IDs differ.

## Financial semantics

**Income / MONEY_IN** — Money entering the user's economic universe as genuine income.

**Expense / MONEY_OUT** — Genuine consumption or cost leaving the economic universe.

**Transfer** — Movement of money between accounts/instruments; may be internal or external.

**InternalTransfer** — Movement between accounts belonging to the same tenant. Does not create income or expense.

**CardPayment** — Settlement of a credit-card balance. Not the original purchases again.

**Refund** — Returned money associated with a prior purchase or charge.

**Reversal** — Cancellation/reversal of a previous authorization or financial event.

**Fee** — Financial-institution or service fee.

**RecurringPattern** — Repeated financial behavior inferred from historical canonical events.

## Intelligence

**SpendingPattern** — Observed distribution or trend in spending over time.

**Anomaly** — Event or pattern materially different from expected behavior or data consistency.

**Insight** — Evidence-backed explanation of a financial fact or change.

**Opportunity** — Evidence-backed suggestion where a user may preserve money, reduce cost, remove waste or improve control.

**ReviewTask** — User-facing uncertainty that requires a small human decision.

**FinancialState** — Materialized current state derived from canonical financial events.

## Distributed system

**Control Plane** — Cloud services for auth, tenancy, device/connection registry, scheduling, health, versioning, push and opaque encrypted synchronization.

**Data Plane** — Device-local ingestion, parsing, classification, resolution, ledger and analytics.

**Intelligence Plane** — Logic for patterns, anomalies, opportunities, forecasting and user explanations. Primarily edge-resident in the target architecture.

**EncryptedEnvelope** — Ciphertext payload synchronized through the cloud without requiring plaintext financial interpretation.

**Tenant Data Key** — Tenant-scoped encryption key material used to protect financial state.

**Device Keypair** — Device identity/key material used to authorize and provision access to tenant secrets.

## UX language

**Sensor Status** — Simple summary of whether finances look normal, changed, or require review.

**Opportunity** — Preferred user-facing term for many savings suggestions.

**Needs Review / Necesita revisión** — User-facing state for unresolved or low-confidence financial information.

**Normal / Cambió / Revisar** — Preferred high-level state vocabulary; red is reserved for genuinely important attention, not lifestyle judgment.
