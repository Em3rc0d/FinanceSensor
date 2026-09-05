# WF-001 — Signature UX Build-Entry Freeze

**Status:** PASS FOR BUILD ENTRY / PHYSICAL USABILITY VALIDATION OPEN  
**Date:** 2026-09-02

## Purpose

Freeze the minimum recognizable FinanceSensor interaction structure before unrestricted implementation. This freezes information hierarchy, screen responsibilities, navigation and signature decision patterns. It does not freeze final visual polish.

## Governing principles

```text
STATE FIRST
EXPLAINABLE SUMMARY
SENSOR SIGNAL
ONE PRIMARY DECISION
PROGRESSIVE DISCLOSURE
BI_RICHNESS != DESKTOP_DASHBOARD
```

Every meaningful derived number must support:

```text
SUMMARY / CHART / SIGNAL
        ↓
EVENTS / CATEGORY CONTEXT
        ↓
MOVEMENT DETAIL
        ↓
EVIDENCE + CONFIDENCE + CORRECTION
```

## Frozen primary navigation

```text
HOME | MOVEMENTS | SENSOR | YOU
```

Adding another primary navigation destination requires reopening this freeze or explicitly deferring it to a later MK.

## Frozen signature surfaces

| ID | Surface | Primary question | Build-entry scroll contract |
|---|---|---|---|
| S-01 | Home | ¿Cómo está mi dinero? | NO |
| S-02 | Movements | ¿Qué pasó con mi dinero? | YES — intrinsic sequence |
| S-03 | Movement Detail | ¿Qué fue y por qué FinanceSensor cree eso? | NO target; long evidence drills down |
| S-04 | Financial Sensor | ¿Qué cambió o necesita atención? | NO |
| S-05 | Opportunity | ¿Qué oportunidad encontraste y cuánto representa? | NO target |
| S-06 | Needs Review | ¿Qué necesitas que confirme? | NO target |
| S-07 | Recurring Summary | ¿Qué pagos se repiten? | NO summary; full list may scroll |
| S-08 | Connections | ¿De dónde obtiene información? | conditional sequence |
| S-09 | Devices | ¿Qué dispositivos tienen acceso? | conditional sequence |
| S-10 | Privacy Inspector | ¿Qué procesa/guarda/sincroniza? | NO summary; detail may scroll |

Canonical structure reference: `SIGNATURE-WIREFRAMES.md`.

## S-01 Home — frozen hierarchy

Home answers financial state before exposing exploration.

Required hierarchy:

```text
PERIOD
PRIMARY FINANCIAL STATE / DIFFERENCE
MONEY IN + MONEY SPENT
COMPACT TREND / COMPARISON
TOP SPENDING COMPOSITION
COMPACT PLAN / RECURRING CONTEXT
SENSOR CALLOUT
```

Home must not become an infinite dashboard. Mobile BI is accepted only where a chart/card replaces more complex explanation and remains drillable.

## S-04 Sensor — frozen hierarchy

```text
SENSOR STATE
OPPORTUNITY
NEEDS REVIEW
CHANGED
```

Sensor semantics are descriptive, not moral:

```text
NORMAL
CHANGED
REVIEW
```

Do not encode lifestyle behavior as universally good/bad.

## S-05 Opportunity — signature pattern

```text
OBSERVATION
    ↓
CONTEXT
    ↓
MONEY IMPACT
    ↓
OPTION
```

The user must see the approximate monetary impact and at least one clear option in the first decision surface.

## S-06 Needs Review — signature pattern

Uncertainty is explicit and inexpensive to resolve.

Required first decision context:

```text
AMOUNT / SUBJECT
WHY CONFIDENCE IS INSUFFICIENT
WHAT KIND OF DECISION IS NEEDED
SAFE WAY TO CLASSIFY / REJECT / DRILL DOWN
```

User correction creates a durable decision signal; it does not rewrite historical source evidence.

## S-10 Privacy Inspector — truth contract

Every displayed privacy/security metric must be technically measurable. Product Lab values remain explicitly synthetic.

Forbidden:

```text
PRIVACY THEATER
UNMEASURED "100% PRIVATE" CLAIMS
E2EE CLAIM WITHOUT RUNTIME STATE
ZERO-PLAINTEXT CLAIM WITHOUT MEASUREMENT
```

## Density used for build-entry validation

Public CI cannot use real financial data. Build-entry UX therefore uses **production-shaped synthetic density**:

- realistic-length merchant/category labels;
- multiple financial states;
- charts with realistic point counts;
- Needs Review state;
- positive/negative/transfer movements;
- recurring context;
- small Android-class viewport.

```text
PRODUCTION_SHAPED_SYNTHETIC_DENSITY != REAL_FINANCIAL_DATA
SYNTHETIC_UX_PASS != PHYSICAL_USABILITY_PASS
```

Real-device density/insets/text-scale/accessibility validation remains required before product/release closure.

## Build-entry evidence

- `SIGNATURE-WIREFRAMES.md`
- `VIEWPORT-CONTRACT.md`
- `../03-design/PRODUCT-DESIGN.md`
- `../../product/labs/mobile-bi/README.md`
- `../../spikes/mobile-shell/lib/main.dart`
- `../../spikes/mobile-shell/test/widget_test.dart`

## Explicit non-claims

```text
SIGNATURE_WIREFRAMES_PASS != FINAL_VISUAL_DESIGN
SIGNATURE_WIREFRAMES_PASS != PHYSICAL_ANDROID_USABILITY_PASS
SIGNATURE_WIREFRAMES_PASS != ACCESSIBILITY_RELEASE_PASS
SIGNATURE_WIREFRAMES_PASS != BUILD_READY
```

## Revalidation triggers

Reopen if:

- primary navigation changes;
- a signature surface cannot fit its primary decision under viewport/accessibility constraints;
- real device testing shows critical comprehension failure;
- product scope introduces a new primary question;
- information density forces desktop-dashboard behavior.

## Freeze decision

```text
SIGNATURE_WIREFRAMES = PASS_FOR_BUILD_ENTRY
PRIMARY_NAVIGATION   = HOME_MOVEMENTS_SENSOR_YOU
PHYSICAL_UX_PROOF    = OPEN
```
