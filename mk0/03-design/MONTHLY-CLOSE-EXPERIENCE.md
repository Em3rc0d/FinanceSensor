# MK0 / 03 — Monthly Close Experience

## Product idea

FinanceSensor is useful during the month before it has perfect ledger coverage.

The product works in a rhythm:

```text
OBSERVE → RECONCILE → CLOSE → LEARN → START NEXT CYCLE
```

During the month, Gmail and other low-latency evidence let FinanceSensor observe activity, especially outflows. At month end, bank statements provide the ledger evidence needed to complete inflows and validate/reconcile outflows.

## Signature states

### Month in progress

```text
Septiembre · En curso

Egresos observados
S/ X

Ingresos
Todavía incompletos

PocketFinances está observando la actividad detectada de tus cuentas.
```

Allowed claims:

- observed spending;
- detected recurring charges;
- observed transfer/payment activity;
- provisional category totals;
- alerts based on observed evidence.

Forbidden claims without statement/balance evidence:

- exact income total;
- exact net cashflow;
- exact available bank balance;
- month reconciled/complete.

### End-of-month prompt

Primary copy:

```text
Es hora de cerrar tu mes

Llegamos al final de septiembre.
Solicita los estados de cuenta de tus bancos para completar tus ingresos,
validar tus egresos y cerrar tu balance mensual.

[Cerrar septiembre]
```

Alternative short notification:

```text
Cierra septiembre
Solicita tus estados de cuenta para reconciliar ingresos y egresos.
```

The CTA should communicate a financial ritual, not a file-upload chore.

## Close flow

```text
Cerrar septiembre
      ↓
Tus cuentas
      ↓
┌────────────────────────────────────────────┐
│ BCP Ahorros       Falta EECC              │
│ Interbank         Falta EECC              │
│ Ripley Crédito    EECC recibido           │
└────────────────────────────────────────────┘
      ↓
Solicitar / descargar desde app bancaria
      ↓
Compartir / abrir con FinanceSensor
      ↓
Clave del PDF · solo esta operación
      ↓
Lectura local
      ↓
Conciliación
      ↓
Revisar diferencias si existen
      ↓
Septiembre cerrado
```

FinanceSensor does not require the user to copy/paste weekly transaction tables from bank websites.

## Account inventory

The close screen is account/instrument based, not bank-logo based.

A user may have:

```text
BCP
├─ Ahorros soles
├─ Ahorros dólares
└─ Tarjeta Visa
```

Each source has its own coverage state.

Candidate UI states:

```text
Esperando EECC
Recibido
Leyendo
Necesita clave
Necesita tu ayuda
Conciliado
No disponible
Excluido por ti
```

## Import interaction

### Document discovery

Supported product paths:

```text
1. statement discovered as Gmail attachment
2. user downloads statement from bank app and shares/opens with FinanceSensor
3. user selects an already downloaded local statement
```

The user should never have to understand MIME types, OCR or parser profiles.

### Password prompt

```text
Desbloquear estado de cuenta

Ingresa la clave que usa tu banco para abrir este PDF.
La usaremos solo durante esta operación.

[Clave del PDF]
[Continuar]
```

Do not say “DNI” even if a bank commonly uses it.

Do not provide a “remember password” option in MK0.

## Extraction UX

The system internally chooses:

```text
PDF text
   ↓ if unusable
OCR local
```

User-facing language stays simple:

```text
Leyendo tu estado de cuenta…
```

If OCR is needed, it does not need to be exposed unless relevant to explain a delay or uncertainty.

## Reconciliation result

### Clean reconciliation

```text
Septiembre está listo

Ingresos reconciliados     S/ X
Egresos reconciliados      S/ Y
Balance del mes            S/ Z

37 movimientos validados
4 movimientos agregados desde tus EECC
0 por revisar

[Cerrar septiembre]
```

`Balance del mes` here means period net cashflow, not bank available balance. Product copy must avoid ambiguity.

### Differences found

```text
Encontramos 3 cosas por revisar

• Un movimiento del EECC podría corresponder a una compra ya detectada.
• Un movimiento aparece solo en tu correo.
• Un abono del EECC no tenía notificación por correo.

[Revisar ahora]
[Continuar después]
```

## Closed month

```text
Septiembre cerrado ✓

Ingresos reconciliados
Egresos reconciliados
Tus fuentes del mes quedaron conciliadas.
```

History pattern:

```text
Julio        Cerrado ✓
Agosto       Cerrado ✓
Septiembre   En curso
Octubre      Próximo
```

## Reopen behavior

A closed month can reopen without implying data corruption.

User-facing examples:

```text
Septiembre necesita actualizarse
Agregaste un estado de cuenta que no estaba incluido en el cierre anterior.

[Reconciliar de nuevo]
```

or

```text
Encontramos un movimiento contabilizado tarde por tu banco.
Revisemos septiembre nuevamente.
```

## Coverage language

Avoid one fake completeness percentage.

Preferred explanations:

```text
Egresos observados durante el mes
Ingresos reconciliados con EECC
2 de 3 cuentas conciliadas
1 estado de cuenta pendiente
```

Advanced detail may expose coverage dimensions, but primary mobile UI stays understandable.

## Financial truth labels

Use explicit state vocabulary:

```text
OBSERVADO     → detected from live/transaction evidence
RECONCILIADO  → supported by period ledger evidence and resolver
CONFIRMADO POR TI → user-resolved fact
SALDO BANCARIO → only when a bank balance is explicitly evidenced
```

Do not mix them visually as equal certainty.

## Notification timing

The product may remind the user near month end / beginning of next month that the close is ready to begin.

The reminder must be dismissible and should not spam the user daily.

Candidate cadence:

```text
first prompt: once the target month has ended
follow-up: bounded reminder if month remains open
stop: when reconciled or user explicitly postpones/excludes
```

Exact notification scheduling remains product-research/open and is not frozen by this document.

## Empty/error states

### No accounts mapped

```text
Todavía no sabemos qué cuentas quieres conciliar.
Revisa tus conexiones y cuentas financieras.
```

### Unsupported statement

```text
Todavía no reconocemos este formato de estado de cuenta.
No modificamos tus movimientos.
```

### Wrong password

```text
No pudimos abrir el PDF con esa clave.
Puedes intentarlo nuevamente.
```

### OCR/parse uncertainty

```text
Pudimos leer parte del estado de cuenta, pero necesitamos tu ayuda con algunos movimientos.
```

### Missing statement

```text
Esta cuenta todavía no tiene EECC para septiembre.
```

## Mobile rule

All primary close actions belong in the mobile product.

```text
DESKTOP HARNESS      engineering evidence only
MOBILE CLOSE FLOW    product experience
```

No weekly web copy/paste workflow becomes a product requirement.

## Evidence boundary

```text
MONTHLY_CLOSE_UX_DESIGNED        YES
REAL_USER_FLOW_TESTED            NO
REAL_MULTI_BANK_CLOSE            NO
OCR_PHYSICAL                     NO
ANDROID_PHYSICAL                 OPEN
IOS_PHYSICAL                     OPEN / DEFERRED
PRODUCTION_READY                 NO
```
