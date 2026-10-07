# ADR-040 — Provider-neutral Edge V1 as observe-only authority shadow

**Status:** ACCEPTED FOR ALPHA.2 SHADOW VALIDATION / DURABLE AUTHORITY FORBIDDEN
**Date:** 2026-10-07

## Context

Alpha.2 +2017 has a physically-informed, provider-specific Gmail/statement path that is useful as a bounded golden baseline but does not scale as the long-term ingestion strategy. Edge V1 introduces small local models that classify financial mail and statement-like mail on Android without a runtime switch on bank/provider identity.

The product must avoid replacing deterministic provider rules with an unbounded model that can silently create financial truth. A wrong amount, sign, date, currency or transaction type is more harmful than an explicit unknown.

## Decision drivers

- One consolidated mobile application; no user-facing APK churn for internal experiments.
- Device-local execution for Gmail-derived financial interpretation.
- Provider-neutral inference must not require sender domain or institution identity.
- +2017 evidence remains the comparison oracle until Edge V1 earns promotion.
- No model-generated result may become durable financial evidence without a separate fail-closed validation boundary.
- CI and physical evidence must distinguish inference quality from financial authority.

## Decision

Edge V1 is integrated into the Alpha.2 Android runtime in **OBSERVE_ONLY** mode.

The mail and statement-mail models execute over the already-fetched subject text during the normal Gmail transaction scan. The sender address/domain is not supplied to Edge V1. Edge results are reduced to aggregate, non-financial diagnostics.

    EDGE EXECUTION                    DEVICE LOCAL / ANDROID
    EDGE MODE                         OBSERVE_ONLY
    EDGE INPUT                        SUBJECT TEXT ONLY IN +2018
    SENDER DOMAIN TO EDGE             FORBIDDEN
    RUNTIME PROVIDER SWITCH           FORBIDDEN
    DURABLE FINANCIAL AUTHORITY       FORBIDDEN
    EDGE PERSISTED EVENTS             0
    +2017 ADAPTER AUTHORITY           PRESERVED AS GOLDEN ORACLE
    RAW GMAIL RETURNED TO FLUTTER     NO
    NUMERIC MODEL CONFIDENCE PUBLIC   NO

The existing +2017 adapter path remains the only transaction-event authority in +2018. Edge may disagree with that path; disagreement is telemetry for engineering, not permission to overwrite or synthesize an event.

Statement-mail inference is also observe-only. It does not create fetch handles, fetch PDFs, bypass strict statement profiles, or relax parser fail-closed behavior.

## Promotion gate

Edge V1 may move beyond shadow mode only after a separately reviewed candidate proves all of the following:

1. provider-neutral evaluation contains unseen/provider-redacted examples;
2. false positive durable financial events remain zero;
3. amount, currency, sign and date are re-read from source spans by deterministic validation;
4. ambiguous/low-confidence results resolve to UNKNOWN/review rather than persistence;
5. regression against the +2017 golden corpus is documented;
6. owned-device evidence is bound to the exact signed APK;
7. privacy and raw-content boundaries remain unchanged.

Promotion requires a new ADR or explicit revision of this ADR. Shadow integration alone does not authorize provider-specific adapters to be removed.

## Consequences

Positive:

- Edge V1 can be exercised in the same application the user ultimately tests.
- Internal iteration no longer requires a chain of throwaway APKs.
- Existing physical evidence is not falsely inherited by new model behavior.
- The team can quantify model/classic divergence before changing authority.

Negative:

- +2018 temporarily carries both the golden provider-specific path and the provider-neutral shadow path.
- The first shadow pass observes subjects only; body/PDF token inference remains a later bounded step.
- Provider neutrality is a property to prove with evaluation, not a claim inferred from model naming.

## Security / privacy impact

No new cloud processing is introduced. Model assets are packaged in the Android APK. Edge predictions are not durable financial records. Gmail access remains gmail.readonly, raw Gmail content is not returned to Flutter, and private signing material remains trusted-edge-only.

## Test / evidence required

- tools/validate-alpha2-edge-v1-runtime.mjs
- Android compile/materialization with both model assets packaged
- Alpha.2 +2017 regression suite
- provider-neutral adversarial corpus before any authority promotion
- exact signed owned-device campaign for the eventual Alpha.2 closure candidate

## Supersedes / superseded by

Does not supersede ADR-038. It narrows how experimental classification may coexist with the canonical Alpha.2 runtime authority.
