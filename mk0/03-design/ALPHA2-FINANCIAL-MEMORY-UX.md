# Alpha.2 — Financial Memory UX freeze

**Status:** FROZEN FOR BOUNDED ALPHA.2 IMPLEMENTATION  
**Date:** 2026-09-05

## Experience promise

Alpha.2 answers one question:

> ¿Qué sabe FinanceSensor de mi dinero, con qué evidencia y qué falta todavía?

The user connects Gmail once with `gmail.readonly`. FinanceSensor observes transaction notifications, searches only for known statement candidates, asks for help only at a real ambiguity and retains only encrypted derived financial memory.

## Interaction laws

1. No onboarding questionnaire for banks, accounts or cards.
2. Automatic discovery is the primary path; share/open and local selection are fallback paths.
3. No financial total is presented as complete without source-scoped coverage.
4. A movement shows evidence state in words, not a generic percentage.
5. Password prompts are grouped, contextual and session-only.
6. Unknown profiles, drift and ambiguous matches stop with a useful action.
7. Home and Sensor overview remain no-scroll at the minimum supported viewport; detail and history may scroll.
8. The product asks one decision at a time through progressive disclosure.

## First Alpha.2 run

```text
Gmail conectado
      ↓
Observar señales recientes
      ↓
Buscar EECC con perfiles conocidos
      ↓
Mostrar inventario de fuentes
      ↓
Desbloqueo agrupado si corresponde
      ↓
Conciliar y guardar memoria derivada
```

The app never says it scanned the whole financial life merely because a Gmail enumeration completed.

## Source discovery surface

```text
Encontramos 3 fuentes financieras

BCP
Cuenta de ahorros · 9 estados detectados
Tarjeta Visa · 10 estados detectados

Ripley
Tarjeta · 3 estados detectados

Interbank
Cuenta de ahorros · falta confirmar un estado

[Continuar]
```

Permitted source states:

```text
Detectada
Necesita clave
Leyendo
Necesita confirmación
Conciliada
Formato no reconocido
No disponible
Excluida por ti
```

The UI does not expose Gmail query syntax, attachment IDs, MIME internals, parser versions or raw filenames in the primary flow.

## Password flow

The app waits until discovery is complete enough to group work.

```text
3 estados necesitan desbloqueo

La clave se usa solo en este dispositivo y durante esta sesión.

[Desbloquear estados]
[Ahora no]
```

After the first successful unlock for an institution:

```text
¿Usar esta clave con los otros estados BCP durante esta sesión?

[Sí, solo esta sesión]
[No, uno por uno]
```

This is not a remember-password feature. The choice and password expire with the statement session, app termination/background policy or explicit cancellation.

## Home

Home prioritizes truth state, period and gaps.

```text
TU DINERO, CON EVIDENCIA

Agosto 2026

Gasto confirmado          S/ —
Ingresos observados       S/ —

Fuentes del mes
2 conciliadas · 1 pendiente

Última actualización · hace 3 min

[Ver qué falta]
```

Display rules:

- `confirmado` requires posted/reconciled evidence appropriate to the claim;
- `observado` is allowed for incomplete Gmail evidence;
- a dash or explicit unavailable state is preferred to a fabricated total;
- a progress bar may show `2 de 3 fuentes`, never an unlabeled 82% certainty score;
- cross-currency totals are not combined without an explicit conversion policy outside Alpha.2.

## Movement card and detail

Primary card examples:

```text
SPOTIFY                       S/ 11.90
✓ Confirmado por BCP
  Gmail + estado de cuenta
```

```text
SPOTIFY                       S/ 11.90
○ Observado por Gmail
  Pendiente de estado de cuenta
```

```text
Comisión bancaria              S/ 9.00
✓ Estado de cuenta
  Sin notificación encontrada
```

Detail exposes provenance through human terms first, then technical details on demand:

```text
Evidencia
├─ Notificación de Gmail · observada
└─ Estado de cuenta BCP · contabilizada

[Ver detalles técnicos]
```

## Ambiguity interactions

### Account mapping

```text
¿A qué cuenta corresponde este estado?

BCP · cuenta terminada en ••42

[Ahorros principal]
[Otra cuenta]
[No estoy seguro]
```

Only safe masked hints may be shown. A choice does not reveal or persist the statement password.

### Reconciliation review

```text
¿Son el mismo movimiento?

Gmail · SPOTIFY · S/ 11.90 · 10 ago
EECC  · SPOTIFY · S/ 11.90 · 11 ago

[Sí, es el mismo]
[No son el mismo]
[Revisar después]
```

FinanceSensor does not default-select the financially convenient answer.

## Sensor V1

```text
SENSOR

LO QUE SABEMOS
✓ 3 fuentes detectadas
✓ 2 meses conciliados
✓ 4 cargos recurrentes observados

LO QUE TODAVÍA NO SABEMOS
○ Falta EECC BCP de agosto
○ Ripley de junio necesita clave
○ Interbank de abril tiene 1 ambigüedad
```

Sensor claims link to their evidence or gap. Deterministic recurring/category results are described as observations until their evidence threshold is met.

## Monthly close

Automatic discovery changes the primary close ritual:

```text
Es hora de cerrar agosto
      ↓
FinanceSensor busca EECC conocidos en Gmail
      ↓
Presenta fuentes recibidas, pendientes y no reconocidas
      ↓
Pide clave/mapping/revisión solo cuando corresponde
      ↓
RECONCILED o REVIEW_REQUIRED
```

Fallback copy when a statement was not delivered through Gmail:

> No encontramos el estado de esta cuenta. Puedes compartirlo desde tu banco o elegirlo en tu dispositivo.

`RECONCILED` copy must name the included scope. User-excluded sources remain visible.

## Failure language

| Domain code | User-facing message | Primary action |
|---|---|---|
| `STATEMENT_PASSWORD_REQUIRED` | Este estado necesita clave. | Desbloquear |
| `STATEMENT_PASSWORD_REJECTED` | La clave no abrió este estado. | Intentar otra vez |
| `STATEMENT_PROFILE_UNKNOWN` | Reconocimos un posible estado, pero todavía no sabemos leer este formato. | Ver fuente |
| `PROFILE_DRIFT` | El banco cambió el formato de este estado. | Mantener pendiente |
| `STATEMENT_ACCOUNT_MAPPING_REQUIRED` | Necesitamos confirmar a qué cuenta corresponde. | Confirmar cuenta |
| `STATEMENT_ROW_AMBIGUOUS` | Una fila no puede interpretarse con seguridad. | Revisar |
| `DUPLICATE_MATCH_AMBIGUOUS` | Dos movimientos podrían ser el mismo. | Comparar |
| `EMAIL_STATEMENT_CONFLICT` | El correo y el estado no coinciden. | Revisar evidencia |
| `PERIOD_GAP` | Falta evidencia para este periodo. | Ver qué falta |
| `SQLCIPHER_UNAVAILABLE` | Tu memoria financiera segura no está disponible. | Reintentar / soporte |

Raw document text, identifiers, coordinates and passwords are excluded from diagnostics and user-visible technical details.

## Accessibility and responsive contract

- touch targets meet the existing minimum target contract;
- information is not encoded by color alone;
- screen readers announce amount, currency, evidence state and action in one coherent order;
- password visibility is off by default and controlled explicitly;
- dynamic text may replace decorative content before clipping essential state/action;
- reduced motion removes nonessential progress animation;
- loading always has a determinate stage label even when total duration is unknown.

## Deferred

Background sync, financial advice, LLM explanations, OCR-first flows, cross-currency aggregation, iOS product promotion and bank-login automation are outside this freeze.

