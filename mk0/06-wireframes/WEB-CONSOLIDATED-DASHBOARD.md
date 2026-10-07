# Web — Consolidated Finance Dashboard Wireframe Contract

**Status:** SIGNATURE WIREFRAME CONTRACT  
**Date:** 2026-09-06

## Goal

The web must answer one question quickly:

> ¿Cuánto entró, cuánto salió y qué tan respaldada está esa lectura?

It must not look like an accounting ERP or expose Gmail mechanics as the primary experience.

## Desktop signature layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ FinanceSensor         Septiembre 2026          [Cobertura parcial]  │
├──────────────────────────────────────────────────────────────────────┤
│  Ingresos confirmados   Gastos canónicos       Flujo neto           │
│  S/ 4,800.00            S/ 1,699.63            S/ 3,100.37*         │
│  POSTED                 MIXED                   *parcial             │
├───────────────────────────────────────┬──────────────────────────────┤
│ Gastos por categoría                  │ Estado de fuentes            │
│ [chart]                               │ BCP EECC       ✓ POSTED      │
│                                       │ Gmail          ✓ OBSERVED    │
│                                       │ Ripley EECC    · PENDIENTE   │
├───────────────────────────────────────┴──────────────────────────────┤
│ Movimientos recientes                                                  │
│ Uber             S/ 9.00       Transporte      [Conciliado]          │
│ Spotify          S/ 11.90      Suscripción     [Observado en Gmail]  │
│ Transferencia    S/ 500.00     Transferencia   [Registrado]          │
│ ...                                                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Recurrentes detectados   │ Cuentas e instrumentos │ Revisar (2)      │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile web

Cards stack in this order:

1. month + coverage state;
2. income;
3. spending;
4. net movement if allowed;
5. category summary;
6. recent movements;
7. source status;
8. recurring candidates;
9. review queue.

No horizontal financial table is required for the primary mobile view.

## UX truth rules

### Coverage first, percentage never by default

Top-right status uses a state label:

```text
Reconciliado
En conciliación
Cobertura parcial
Fuente pendiente
Revisión requerida
```

A percentage can exist only if the UI names the denominator, e.g. `2 de 3 fuentes esperadas cubiertas`.

### Evidence chips

Allowed chips:

- `Observado en Gmail`
- `Registrado en EECC`
- `Conciliado`
- `Revisión requerida`

Do not show `96% evidencia`.

### Net movement

If income or expense coverage is incomplete, the card remains visible but says `Parcial` and explains the missing source on interaction.

The UI must never silently imply a complete balance.

## Movement detail drawer

Progressive disclosure reveals:

```text
merchant / counterparty
amount + currency
economic effect
account / instrument
category
truth state
source bindings
observed timestamp
posted timestamp if available
reconciliation explanation
```

Raw Gmail body and raw PDF content are not rendered.

## Source status panel

Each expected source has:

```text
source name
source type
last successful evidence date
coverage state
parser state
blocking/non-blocking status
```

Unsupported parsers show `Formato detectado · importación no disponible` rather than a generic fallback.

## Review queue

Only ambiguity that can change financial meaning enters review:

- account mapping conflict;
- possible duplicate without sufficient margin;
- transfer vs expense ambiguity;
- refund relationship ambiguity;
- parser/source conflict.

The queue should not ask users to approve routine deterministic matches.

## Visual hierarchy

- one dominant monthly summary row;
- maximum 3 primary KPI cards above the fold;
- coverage state always visible near the month;
- transaction list favors merchant + amount + semantic chip;
- diagnostic/provenance details hidden until requested;
- empty states explain the missing source and next action.

## Accessibility / Laws of UX constraints

- minimum touch/click targets consistent with platform accessibility guidance;
- Hick: primary dashboard has few top-level actions;
- Jakob: month selector, cards and transaction list follow familiar finance patterns;
- progressive disclosure reduces working-memory burden;
- feedback for sync/import state is immediate and explicit;
- no color-only evidence status.
