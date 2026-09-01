# ROADMAP

The roadmap is capability-driven. MK boundaries exist to close uncertainty and produce evidence, not to maximize feature count.

## MK0 — Financial Sensing Foundation

**Goal:** prove that the product can connect to an email source, reconstruct trustworthy financial events locally, remain useful on ordinary smartphones, and present a simple financial state.

Scope:

- account + personal tenant;
- device registration;
- Gmail connection;
- bounded historical ingestion;
- financial email filtering;
- financial evidence extraction;
- canonical event resolution;
- idempotency and deduplication;
- income / expense / transfer / refund semantics;
- merchant normalization foundation;
- basic categories;
- basic recurring detection;
- encrypted local ledger;
- E2EE multi-device synchronization foundation;
- no-scroll Home;
- movement timeline;
- Needs Review;
- evidence/provenance detail.

Explicitly out of MK0:

- investments;
- tax/accounting workflows;
- lending recommendations;
- advanced forecasting;
- large conversational AI;
- autonomous payments;
- broad direct-bank coverage.

## MK1 — Personal Financial Understanding

Potential scope after MK0 evidence passes:

- robust merchant intelligence;
- personalized categorization;
- richer recurring-pattern engine;
- price-change detection;
- duplicate-charge warnings;
- refund tracking;
- category trends;
- monthly summary;
- opportunity engine v1;
- lightweight limits/budgets;
- richer Financial Sensor status.

## MK2 — Multi-source Finance

Potential scope:

- Outlook / Microsoft provider adapter;
- generic IMAP where policy and UX permit;
- PDF/receipt ingestion;
- statement import;
- on-device OCR;
- local ML fallback;
- improved source correlation;
- regional connector exploration.

## MK3 — Reconciliation and Forecasting

Potential scope:

- bank/open-finance connector abstraction;
- source-to-bank reconciliation;
- stronger coverage score;
- upcoming recurring obligations;
- cash availability projections;
- anomaly engine;
- savings intelligence v2.

## Future domains — not commitments

The data model should avoid blocking future support for:

- households and shared tenants;
- small-business financial universes;
- liabilities and credit health;
- net-worth views;
- subscriptions cancellation workflows;
- bank/open-finance integrations;
- financial assistants operating over canonical state.

These are future options, not justification for adding unused MK0 complexity.

## Gate philosophy

A later MK does not open because a date arrived. It opens when the dependency graph is sufficiently closed and the previous MK has physical evidence.
