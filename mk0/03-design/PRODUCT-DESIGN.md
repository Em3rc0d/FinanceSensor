# MK0 / 03 — Product Design

## Design goal

Make the user's financial state understandable in seconds, without requiring finance knowledge and without judging lifestyle choices.

## Platform contract

FinanceSensor is **mobile-first**.

```text
PRIMARY PRODUCT
Android → first physical product target
iOS     → required production target

SECONDARY / FUTURE
Web     → possible companion / richer analysis surface
Desktop → engineering proof surface; no first-class product commitment
```

See [`../11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md`](../11-decisions/ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md).

The product may deliver BI-grade financial understanding, but it must not become a desktop dashboard compressed into a phone.

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

## Primary questions

MK0 surfaces should answer:

1. **What happened?**
2. **What changed?**
3. **What needs my attention?**

## Navigation hypothesis

```text
Home
├── Movements
│   └── Transaction Detail
├── Sensor
│   ├── Opportunity
│   └── Needs Review
└── You
    ├── Connections
    ├── Devices
    └── Privacy
```

Bottom navigation candidate:

```text
Inicio | Mov. | Sensor | Tú
```

## Mobile BI language

FinanceSensor should feel richer than a simple banking app while preserving mobile clarity.

Allowed analytical primitives:

- compact cash-flow trend;
- period comparison;
- spending composition;
- top-category contribution;
- recurring-payment horizon;
- budget/limit progress;
- projection only when its evidence and uncertainty are explicit;
- Sensor signals for material change, opportunity and review;
- drill-down from every derived number to events and evidence.

Charts must answer a financial question. Decorative charts do not earn viewport space.

The preferred hierarchy is:

```text
STATE
  ↓
TREND / COMPOSITION
  ↓
SENSOR SIGNAL
  ↓
ACTION OR DRILL-DOWN
```

## Home information hierarchy

1. Period.
2. Primary financial state / available difference.
3. Money in.
4. Money spent.
5. Compact trend or comparison.
6. Top spending categories.
7. Upcoming known/expected recurring costs.
8. Sensor status: opportunities / review count.

The Home should not become an infinite dashboard.

A visual may replace prose or redundant cards when it communicates the same answer more efficiently, but **Home remains no-scroll on the minimum supported viewport**.

## Default financial language

| Domain | UI |
|---|---|
| Income | Entró dinero |
| Expense | Gastaste / Salió dinero |
| Internal transfer | Moviste dinero |
| Refund | Te devolvieron dinero |
| Recurring payment | Pago recurrente |
| Variance / drift | Cambió |
| Anomaly | Algo por revisar |
| Savings recommendation | Oportunidad |
| Low confidence | Necesitamos tu ayuda |

## Category foundation

Initial human categories, subject to research/testing:

- Comida
- Transporte
- Hogar
- Servicios
- Compras
- Entretenimiento
- Suscripciones
- Salud
- Estudios
- Viajes
- Familia
- Mascotas
- Comisiones
- Impuestos
- Otros

Categories are product-language groupings, not a formal accounting chart.

## Sensor-state philosophy

Do not map every lifestyle pattern into good/bad colors.

Preferred states:

```text
Normal
Cambió
Revisar
```

A high restaurant spend may be perfectly intentional. A probable duplicate charge deserves review.

## Opportunity design

An opportunity follows:

```text
OBSERVATION
     ↓
CONTEXT
     ↓
MONEY IMPACT
     ↓
OPTION
```

Example:

```text
Delivery cambió este mes

Julio       S/122
Agosto      S/197
Diferencia   S/75

Volver cerca de tu nivel habitual
podría dejarte ~S/75 adicionales.

[Crear un límite]
[Está bien así]
```

## Needs Review design

Uncertainty is a first-class state.

Example:

```text
Necesitamos tu ayuda

S/49.90
28 ago · movimiento detectado

No estamos seguros de qué fue.

[Comida] [Transporte]
[Compras] [Otro]

[No es mío]
```

User correction should become a durable signal for future classification, but never rewrite historical evidence.

## Explain Everything

Every derived financial item should support a drill-down path:

```text
Summary number / chart point / Sensor signal
   ↓
category / transaction list
   ↓
transaction detail
   ↓
source evidence + confidence + corrections
```

Confidence is presented in human form:

```text
Alta
Media
Necesitamos tu ayuda
```

rather than raw probability by default.

## Synthetic Product Lab boundary

A Product Lab may be implemented before `BUILD_READY=YES` only to validate UX and information architecture.

It must remain visibly synthetic and cannot:

- execute Gmail OAuth;
- consume real Gmail content;
- persist real financial plaintext;
- claim production crypto behavior;
- close Q-003/Q-004/Q-005;
- be described as the production app.

## Empty/loading/stale states

Primary screens must define:

- loading;
- no data yet;
- partial reconstruction;
- disconnected source;
- stale sync;
- offline;
- privacy lock;
- low-confidence data.

Examples:

- “Todavía estamos aprendiendo tus pagos recurrentes.”
- “Actualizado hace 3 h.”
- “Una cuenta necesita volver a conectarse.”
- “No hay suficiente información para estimar esto todavía.”

## No-scroll design rule

Home and Sensor Overview fit in the minimum supported viewport.

Scroll is appropriate for:

- transaction history;
- search results;
- long evidence lists;
- analytical drill-down;
- settings;
- privacy/legal documents.

Scroll is not used to hide primary actions or to stack decorative cards.

See [`../06-wireframes/VIEWPORT-CONTRACT.md`](../06-wireframes/VIEWPORT-CONTRACT.md) and [`../06-wireframes/SIGNATURE-WIREFRAMES.md`](../06-wireframes/SIGNATURE-WIREFRAMES.md).
