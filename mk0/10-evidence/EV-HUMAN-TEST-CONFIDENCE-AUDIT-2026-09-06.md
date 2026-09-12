# EV — Human Test confidence-label audit

**Date:** 2026-09-06  
**Scope:** current Android Human Test Alpha harness

## Finding

The repeated `96% evidencia` shown for unrelated movements is not a calibrated probability and is not transaction-specific.

The Android scanner currently assigns the same literal value to every successfully extracted event:

```kotlin
confidence = 0.96
```

File: `spikes/mobile-shell/native/android/FinancialMailScanner.kt`.

Flutter then renders that value directly as a percentage:

```dart
'${event.providerLabel} · ${event.semanticLabel} · ${(event.confidence * 100).round()}% evidencia'
```

File: `spikes/mobile-shell/lib/main_human_test.dart`.

Therefore:

```text
96% EVIDENCIA = HARNESS CONSTANT
96% EVIDENCIA != CALIBRATED PROBABILITY
96% EVIDENCIA != PER-TRANSACTION CONFIDENCE
```

## Risk

Displaying the value as a percentage creates false precision and can cause the user to interpret a deterministic parser success marker as probabilistic certainty.

This is a UX/evidence-semantics defect, not proof that the extracted financial values are wrong.

## Decision

The consolidated Alpha.2 product must not expose this field as public confidence.

Public evidence uses discrete truth states:

```text
UNKNOWN
PARTIAL
OBSERVED
POSTED
RECONCILED
```

Internal deterministic reconciliation scores may continue to exist for threshold/margin decisions, but:

```text
MATCH_SCORE != PROBABILITY
MATCH_SCORE != USER_FACING_EVIDENCE_PERCENT
```

## Required regression

Before the next physical milestone candidate:

- no movement row may render `% evidencia` from the current `confidence` field;
- Gmail-only extracted events render `OBSERVED` / `Observado en Gmail`;
- statement-backed events render `POSTED` / `Registrado en EECC`;
- independently matched observations render `RECONCILED` / `Conciliado`;
- tests must fail if a fixed `96% evidencia` string returns to the public product surface.

## Boundary

The current Human Test Alpha remains historical physical evidence for the Gmail ingress path. This audit supersedes only the interpretation of its percentage label; it does not invalidate the already observed install, OAuth, Gmail or bounded-scan results.
