# FinanceSensor Human Financial Language System

## Purpose

FinanceSensor should tell the truth without sounding like a finance professor, debt collector or moral judge.

## Language law

```text
DESCRIBE
CONTEXTUALIZE
EXPLAIN IMPACT
OFFER CONTROL
```

Never shame.

## Internal → user language

| Internal concept | Default user language |
|---|---|
| cash inflow / income event | Entró dinero |
| expense / outflow | Gastaste / Salió dinero |
| internal transfer | Moviste dinero |
| refund | Te devolvieron dinero |
| recurring charge | Pago recurrente |
| spending variance | Cambió |
| anomaly | Algo por revisar |
| low confidence | Necesitamos tu ayuda |
| savings recommendation | Oportunidad |
| estimated future charge | Próximo pago estimado / Según tu historial |
| reconciliation evidence | Detectado mediante… |

## Default forbidden tone

Avoid:

- “Estás gastando mal.”
- “Gastas demasiado.”
- “Desperdiciaste…”
- “Gasto innecesario.”
- “Eres irresponsable con…”
- “Deberías dejar de…”

unless the user explicitly created a rule/goal whose wording makes such a direct comparison appropriate — and even then prefer neutral wording.

## Preferred patterns

### Change

Bad:

> Gastaste demasiado en delivery.

Good:

> Delivery está S/75 por encima de tu nivel habitual este mes.

### Opportunity

Bad:

> Deja de pedir comida para ahorrar.

Good:

> Volver cerca de tu nivel habitual de delivery dejaría aproximadamente S/75 adicionales este mes.

### Recurring price increase

> Spotify pasó de S/18.90 a S/20.90. Si el nuevo precio se mantiene, serían aproximadamente S/24 más al año.

### Duplicate candidate

> Encontramos dos cargos muy parecidos de Adobe. Revisa si ambos son tuyos.

### Unknown movement

> No estamos seguros de qué fue este movimiento. ¿Cómo quieres clasificarlo?

### Missing data

> No hay suficiente información para calcular esto todavía.

Not:

> S/0.

when zero would falsely imply a known result.

## Fact vs forecast

Facts use direct language:

> Netflix cobró S/39.90 el 28 de agosto.

Forecasts/expectations use explicit uncertainty:

> Según tu historial, Netflix podría cobrar alrededor de S/39.90 la próxima semana.

Never visually collapse those states.

## Confidence

Default user presentation:

```text
High numerical confidence     → Alta
Medium                        → Media
Insufficient                  → Necesitamos tu ayuda
```

Raw model probabilities are diagnostic data, not default UX.

## Money impact

When useful, translate patterns into money:

```text
monthly difference
annualized projection
fees accumulated
remaining user-defined limit
```

Annualization is always labeled as projection.

## User autonomy

Useful secondary actions:

```text
Crear un límite
Ver movimientos
Cambiar categoría
No me interesa
Está bien así
No es mío
Revisar
```

Dismissal is not a failure. FinanceSensor helps the user decide; it does not demand compliance.

## Color semantics

Do not equate:

```text
high spending = red = bad person/behavior
```

Preferred high-level states:

```text
Normal
Cambió
Revisar
```

Reserve urgent visual treatment for material risk/data issues, not merely personal consumption choices.

## Copy test

Before shipping any insight, ask:

1. Is every claim supported by evidence?
2. Can a non-finance user understand it quickly?
3. Is fact separated from prediction?
4. Does it describe behavior without judging the person?
5. Does it explain money impact when useful?
6. Does the user retain control?
