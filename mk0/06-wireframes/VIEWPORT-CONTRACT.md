# WF-001 — Viewport Contract

## Principle

> **One viewport → one primary purpose.**

The main question and primary action of a FinanceSensor surface must be understandable without arbitrary vertical exploration.

## Supported viewport classes

Exact device matrix will be frozen after Android feasibility testing. Wireframes must be evaluated at least against:

```text
SMALL    compact Android smartphone
REGULAR  mainstream Android smartphone
LARGE    large Android / iPhone class
```

The design cannot be validated only on the developer's own phone.

## Rules

### VIEW-001 — One primary question
Every screen declares the question it answers.

### VIEW-002 — Primary answer above fold
The primary answer must be available in the first viewport.

### VIEW-003 — Home has no vertical scroll
If Home overflows, information hierarchy is wrong. Do not solve it by extending the dashboard downward.

### VIEW-004 — Sensor Overview has no vertical scroll
The user must see system status, opportunity count and review count immediately.

### VIEW-005 — Primary actions are never hidden below scroll
Navigation and main decisions stay visible or are reached through an explicit drill-down.

### VIEW-006 — Scroll only for intrinsic sequence
Allowed examples:

- movement history;
- search results;
- evidence list;
- connections/devices list if truly long;
- settings;
- privacy/legal content.

### VIEW-007 — Progressive disclosure
A top category summary links to a category detail rather than stacking all categories into Home.

### VIEW-008 — No decorative overflow
Charts/cards that do not improve the answer do not earn screen space.

### VIEW-009 — Detail screens aim for one viewport
Opportunity and Needs Review flows should normally fit one viewport. If source evidence is long, evidence opens separately.

### VIEW-010 — Accessible density
No-scroll must not be achieved through unreadably small type, tiny touch targets or inaccessible spacing.

## Screen contract template

Every signature screen must specify:

```text
SCREEN ID
PRIMARY QUESTION
PRIMARY DATA
SECONDARY DATA
PRIMARY ACTION
SECONDARY ACTIONS
SCROLL YES/NO
LOADING STATE
EMPTY STATE
PARTIAL STATE
ERROR STATE
OFFLINE STATE
STALE STATE
SMALL VIEWPORT PASS/FAIL
```

## Initial matrix

| Screen | Primary question | Vertical scroll |
|---|---|---:|
| S-01 Home | ¿Cómo está mi dinero? | NO |
| S-02 Movements | ¿Qué movimientos tengo? | YES |
| S-03 Transaction Detail | ¿Qué fue este movimiento y de dónde salió? | NO target / evidence separate |
| S-04 Sensor | ¿Qué cambió o requiere atención? | NO |
| S-05 Opportunity | ¿Qué oportunidad encontraste y cuánto impacta? | NO |
| S-06 Needs Review | ¿Qué necesitas que confirme? | NO |
| S-07 Recurring Summary | ¿Qué pagos se repiten? | NO summary; list drill-down may scroll |
| S-08 Connections | ¿Qué fuentes están conectadas? | Conditional |
| S-09 Devices | ¿Qué dispositivos tienen acceso? | Conditional |
| S-10 Privacy Inspector | ¿Qué procesa/guarda/sincroniza FinanceSensor? | NO summary; details may scroll |

## Validation

A screenshot test alone is insufficient. Viewport evidence must include:

- viewport dimensions;
- OS text scaling configuration;
- navigation bars/insets;
- rendered screenshot;
- overflow detection;
- touch-target audit;
- PASS/FAIL.
