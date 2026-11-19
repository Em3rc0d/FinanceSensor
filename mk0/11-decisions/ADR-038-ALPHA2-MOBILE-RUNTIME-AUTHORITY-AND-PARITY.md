# ADR-038 — Alpha.2 mobile runtime authority and parity

**Status:** ACCEPTED FOR ALPHA.2 IMPLEMENTATION / PHYSICAL MILESTONE OPEN  
**Date:** 2026-09-06

## Context

Alpha.2 slices A–G are statically certified in the Node reference harness, while ADR-009 already fixes the product application layer as Flutter/Dart with small native Kotlin/Swift security bridges. Embedding the Node implementation in the APK, duplicating the full financial engine in Kotlin, or allowing three independently evolving implementations would create multiple financial authorities.

The product also needs to preserve the trusted-edge privacy boundary already demonstrated by the R2 Android human test: OAuth/token custody stays native, raw Gmail is not durable, and public CI never receives private financial or signing material.

## Decision

### Runtime authority

```text
ANDROID / KOTLIN
  Google authorization + short-lived bearer custody
  Gmail REST execution
  statement candidate session handles
  Android Keystore / protected DEK authority
  SQLCipher open / transaction boundary

FLUTTER / DART
  statement PDF parsing after a candidate is fetched locally
  typed normalized evidence
  canonical transaction model
  reconciliation
  account graph
  monthly coverage
  Sensor V1
  minimized sync/web projection

NODE / JAVASCRIPT
  reference implementation
  historical certification harness
  golden-vector oracle
  NOT shipped as product financial runtime
```

### One financial authority

Dart is the product authority for deterministic financial semantics that do not require protected platform facilities. Kotlin must not independently categorize, reconcile, compute coverage, infer recurrence, or derive product financial truth.

Native Kotlin may reject unsafe ingress before Dart sees it and may perform the minimum parsing necessary to construct sanitized source observations, but it cannot become a second canonical financial engine.

### Golden-vector parity

The already-certified Node implementations remain specification evidence. A versioned, synthetic golden corpus is the bridge from reference behavior to product runtime.

For every migrated rule that can affect financial truth, CI must prove:

```text
REFERENCE INPUT
      ↓
Node expected vector
      ↓
Dart product runtime
      ↓
SEMANTIC PARITY
```

Parity is required for outcomes/invariants, not for language-specific object layout or cryptographic object identifiers unless the identifier itself is part of the stable protocol contract.

### Source truth boundary

Gmail transaction notifications enter Dart as `OBSERVED` evidence. Statement rows enter as `POSTED` evidence. A source observation is never automatically a canonical transaction.

Only the canonical engine may create the minimized transaction projection consumed by Sensor and web surfaces.

### Public evidence boundary

The following are forbidden in user-facing transaction projection:

- `confidence` numeric probability;
- `matchScore`;
- `% evidencia`;
- raw Gmail identifiers;
- raw Gmail body/MIME;
- raw statement PDF/text/password.

Internal reconciliation scores remain implementation facts and cannot be presented as probability.

### Physical test cadence

No per-slice APK promotion. Physical Android testing occurs only for an exact-SHA integrated milestone after synthetic A–G, Dart tests, Android compile, vault compile, privacy, replay, minimized projection and web gates all pass together.

## Consequences

Positive:

- one product financial authority;
- native security remains native without moving business semantics into Kotlin;
- Node certification evidence remains useful through golden vectors;
- no JavaScript runtime is added to the APK;
- fewer divergence and privacy surfaces;
- physical-device churn is intentionally reduced.

Costs:

- certified Node semantics must be ported deliberately to Dart;
- parity vectors require maintenance when a versioned rule changes;
- SQLCipher/Keystore functionality still needs Android physical proof;
- statement acquisition has a split native/Dart path and must preserve strict session ownership.

## Rejected alternatives

### Ship Node/JavaScript inside the mobile app

Rejected. It adds a second application runtime and undermines ADR-009 without solving protected platform integration.

### Put the whole financial engine in Kotlin

Rejected. It creates Android-specific financial authority and makes the required iOS product path a second port.

### Reimplement independently in Node, Dart and Kotlin

Rejected. Three truth engines are not auditable enough for FinanceSensor.

### Treat CI compile success as physical integration

Rejected. Android Keystore, SQLCipher files/sidecars, provider OAuth, statement bytes and lifecycle behavior remain physical gates.

## Governing laws

```text
ONE_PRODUCT_FINANCIAL_AUTHORITY = DART
NODE_REFERENCE != PRODUCT_RUNTIME
KOTLIN_SECURITY_BRIDGE != FINANCIAL_ENGINE
SOURCE_OBSERVATION != CANONICAL_TRANSACTION
MATCH_SCORE != PROBABILITY
PUBLIC_EVIDENCE_PERCENTAGE = FORBIDDEN
RAW_GMAIL_OR_PDF != WEB_PROJECTION
STATIC_PARITY_PASS != PHYSICAL_PASS
PER_SLICE_APK_PROMOTION = FORBIDDEN
```

## Evidence required before physical milestone promotion

- Dart canonical model and invariants;
- Dart reconciliation parity on certified policy vectors;
- Dart account-graph parity;
- Dart monthly-coverage parity;
- Dart Sensor V1 parity;
- synthetic statement discovery/fetch boundaries;
- Android native SQLCipher 4.18.0 compile surface with protected-key bridge;
- no plaintext fallback path;
- minimized web/sync projection tests;
- replay/idempotency tests;
- integrated Android debug APK build on one exact SHA;
- public CI privacy/governance pass.

Physical evidence remains separate and is not claimed by this ADR.
