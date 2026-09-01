# MK0 / 03 — Product Design

## Design goal

Make the user's financial state understandable in seconds, without requiring finance knowledge and without judging lifestyle choices.

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

## Home information hierarchy

1. Period.
2. Money in.
3. Money spent.
4. Difference.
5. Top spending categories.
6. Upcoming known/expected recurring costs.
7. Sensor status: opportunities / review count.

The Home should not become an infinite dashboard.

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
Summary number
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
- settings;
- privacy/legal documents.

Scroll is not used to hide primary actions or to stack decorative cards.

See [`../06-wireframes/VIEWPORT-CONTRACT.md`](../06-wireframes/VIEWPORT-CONTRACT.md) and [`../06-wireframes/SIGNATURE-WIREFRAMES.md`](../06-wireframes/SIGNATURE-WIREFRAMES.md).
