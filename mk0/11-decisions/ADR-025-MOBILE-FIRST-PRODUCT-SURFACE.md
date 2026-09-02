# ADR-025 — Mobile-first product surface

**Status:** ACCEPTED FOR PRODUCT DIRECTION / IMPLEMENTATION STACK OPEN  
**Date:** 2026-09-02

## Context

FinanceSensor is a personal financial sensing product designed around data that is discovered, reconstructed and explained close to the user. The current product contracts already assume ordinary smartphones, bottom navigation, protected device-local credentials, local financial processing and multi-device authorization.

Recent Product Lab work explored a desktop-style BI dashboard. The information density and chart language were useful, but the desktop surface itself conflicts with the product's existing interaction and trust assumptions.

This ADR removes that ambiguity.

## Decision drivers

- the user's financial state should be understandable in seconds;
- Gmail authorization and financial plaintext remain device-local by default;
- Android/iOS protected credential custody is a production requirement;
- the primary product should work on ordinary smartphones, including compact Android devices;
- Financial Sensor needs ambient, frequent use rather than occasional analyst-style sessions;
- charts and BI-style summaries are valuable, but must not become a desktop dashboard shrunk onto a phone;
- desktop currently exists as an engineering proof boundary, not a product identity;
- web may become useful later for richer exploration, but cannot redefine the primary client before mobile evidence exists.

## Decision

### 1. Primary surface

```text
FINANCESENSOR PRIMARY PRODUCT = MOBILE APPLICATION
```

Product priority:

```text
1. Android — first physical product target
2. iOS     — required production target
3. Web     — future companion / richer analysis surface
4. Desktop — no first-class product commitment
```

### 2. Android-first does not mean Android-only

Android is the first physical target because MK0 explicitly requires evidence on ordinary smartphones and because the minimum supported Android baseline still needs a device-matrix spike.

The architecture remains cross-platform at domain/protocol level. Platform-specific custody, protected keys and OAuth behavior are proven separately.

### 3. Mobile BI, not desktop BI

FinanceSensor should expose BI-grade understanding through mobile-native information architecture.

Accepted mobile analytical primitives include:

- compact cash-flow trend;
- category composition;
- period comparison;
- budget/limit progress;
- recurring-cost horizon;
- end-of-period projection when evidence supports it;
- Sensor cards for material change, review and opportunity;
- drill-down from every derived number to financial events and evidence.

Rejected pattern:

```text
DESKTOP DASHBOARD
      ↓ shrink
PHONE
```

Required pattern:

```text
FINANCIAL MODEL
      ↓
MOBILE INFORMATION PRIORITY
      ↓
ONE PRIMARY QUESTION PER VIEWPORT
      ↓
PROGRESSIVE DISCLOSURE
      ↓
EXPLAIN EVERYTHING
```

### 4. Home remains bounded

Mobile BI does not supersede the no-scroll Home rule.

The Home surface may contain richer visualization than the original grayscale wireframe, but its first viewport must still answer:

1. what is my current financial state?
2. what changed?
3. what needs my attention?

Long analytical exploration belongs in drill-down screens.

### 5. Financial Sensor remains a primary product object

The product is not merely an expense dashboard.

Charts provide context. Financial Sensor provides interpretation and action.

```text
DATA → VISUAL UNDERSTANDING → SENSOR SIGNAL → EVIDENCE → USER DECISION
```

### 6. Product Lab boundary

A synthetic mobile Product Lab is explicitly allowed before `BUILD_READY=YES` when all of the following are true:

- no Gmail OAuth is executed;
- no real Gmail content is consumed;
- no real financial plaintext is persisted;
- all displayed data is clearly synthetic;
- no lab behavior is claimed as production proof;
- the lab cannot close Q-003/Q-004/Q-005;
- the lab exists only to validate information architecture, viewport behavior, language and interaction.

## Consequences

Positive:

- product identity is now unambiguous;
- wireframes, mobile OAuth, protected-key requirements and runtime assumptions point in the same direction;
- BI richness can evolve without turning FinanceSensor into a desktop analytics tool;
- Android physical testing has a direct product surface to validate.

Cost:

- dense analytical views must be redesigned rather than reused directly from desktop BI patterns;
- responsive web parity is not an MK0 requirement;
- the implementation stack remains intentionally open until ADR-009 is resolved.

## Security/privacy impact

This decision reinforces the existing device-local Gmail/OAuth and financial data-plane boundary. It does not change Q-003/Q-004/Q-005 closure requirements.

## UX impact

The signature navigation remains mobile-first:

```text
Inicio | Mov. | Sensor | Tú
```

Analytical depth is delivered through drill-down, not infinite Home cards.

## Test/evidence required

Before production implementation is considered ready:

- compact Android viewport test;
- mainstream Android viewport test;
- large Android/iPhone-class viewport test;
- OS text-scaling test;
- touch-target audit;
- no-scroll Home proof;
- no-scroll Sensor Overview proof;
- physical Android protected-credential evidence;
- physical iOS protected-credential evidence;
- mobile crypto interoperability evidence.

## Explicit non-decisions

ADR-025 does **not** select:

- Flutter;
- React Native;
- Kotlin Multiplatform;
- native Kotlin + Swift;
- Compose Multiplatform;
- a web/PWA production client.

Those choices remain under ADR-009 and require platform evidence.

## Governing law

```text
MOBILE_FIRST != MOBILE_ONLY
BI_RICHNESS != DESKTOP_DASHBOARD
SYNTHETIC_PRODUCT_LAB != PRODUCTION_PROOF
GMAIL_CONNECTIVITY_PROVEN != MOBILE_OAUTH_CLOSED
```
