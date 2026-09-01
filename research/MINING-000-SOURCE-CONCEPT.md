# MINING-000 — Source Concept: “Departamento financiero de bolsillo”

## Source

User-provided PDF: **“El departamento financiero de bolsillo: 12 agentes + un Director en tu Claude”** (Made to Scale, 2026).

This mining note preserves the concepts actually present in that source and records how FinanceSensor adapts them. It does not reproduce the source verbatim.

## What the source proposes

The source describes a financial-management system composed of:

- a Financial Director coordinating 12 specialized agent roles;
- a single `Estado Financiero` document as source of truth;
- daily, weekly and monthly routines;
- invoice extraction/classification;
- bank reconciliation;
- accounts receivable and payable workflows;
- 90-day treasury forecasting;
- tax/labor management support;
- recurring-spend auditing;
- P&L and client margin analysis;
- budget-vs-actual analysis;
- a final “Vigía” agent that scans the complete financial state for alerts;
- a generated dashboard/panel;
- a strict “no invented data” rule;
- manual review for illegible/incomplete information;
- user approval before externally consequential actions.

The source explicitly treats its workflow as management support rather than official accounting/tax filing.

## Strong architectural ideas we preserve

### 1. One source of financial truth

Source concept:

```text
specialists
    ↓ read/write
Estado Financiero
```

FinanceSensor translation:

```text
financial evidence
      ↓
canonical event log
      ↓
materialized financial state
```

The document becomes a durable event/data model instead of a manually replaced text file.

### 2. No invented data

Source concept:

```text
missing/illegible → SIN DATO / REVISAR A MANO
```

FinanceSensor translation:

```text
low confidence / unresolved evidence
       ↓
Needs Review
```

Uncertainty is surfaced, not guessed away.

### 3. Reconciliation before downstream intelligence

The source's Conciliator distinguishes bank movements from invoices and avoids forced matches.

FinanceSensor generalizes this into:

```text
Evidence
  ↓
Candidate
  ↓
Resolver
  ↓
Canonical financial event
```

This directly motivates transaction fingerprinting and evidence provenance.

### 4. Recurring-spend audit

The source's expense auditor looks for subscriptions, silent price increases, duplicates and recurring charges without invoices.

FinanceSensor expands this into a recurring/anomaly engine capable of:

- recurring detection;
- price-change detection;
- duplicate candidates;
- fee accumulation;
- missing expected occurrence;
- savings opportunities.

### 5. Vigía → Financial Sensor

The source's Vigía always runs last and surfaces evidence-backed alerts with severity, origin and suggested action.

FinanceSensor converts that philosophy into the product's central **Sensor** surface:

```text
Normal
Cambió
Revisar
Oportunidad
```

The user-facing version deliberately avoids finance jargon and lifestyle judgment.

### 6. Approval boundary

The source requires user approval before payments, emails, subscription cancellations or other actions.

FinanceSensor preserves the larger principle:

> The system observes, explains and prepares. Consequential user actions require intentional user control unless a future capability is explicitly designed and authorized otherwise.

## What FinanceSensor changes radically

The source workflow depends on users manually uploading documents/exports and replacing a state document after routines.

FinanceSensor aims for:

```text
financial sources
      ↓ automated sensing
edge processing
      ↓
canonical ledger
      ↓
continuous understandable state
```

Other major changes:

- personal-finance orientation first rather than business-management accounting;
- multi-device tenant architecture;
- edge/local processing;
- encrypted synchronization;
- email as first sensor;
- provider-independent connector contract;
- canonical event identity rather than document blocks;
- signature mobile UX rather than generated HTML panel;
- ordinary-language financial explanations.

## Source boundary

The original source does **not** specify FinanceSensor's E2EE architecture, multi-device event model, Gmail OAuth approach, transaction fingerprinting algorithm, low-end Android strategy or no-scroll mobile UX. Those are FinanceSensor design/research additions developed separately.

## Mining result

The source is best treated as an **architectural ancestor**:

```text
Financial department
      ↓
source-of-truth discipline
      ↓
reconciliation
      ↓
risk/recurring intelligence
      ↓
FinanceSensor
```

Its strongest transferable principles are provenance, explicit uncertainty, reconciliation before analysis, centralized financial truth and evidence-backed alerts.
