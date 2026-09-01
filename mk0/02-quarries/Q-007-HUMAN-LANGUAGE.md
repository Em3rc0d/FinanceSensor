# Q-007 — Human Financial Language

**Priority:** P1  
**Status:** OPEN

## Question

How should FinanceSensor communicate financial truth so that ordinary users understand it quickly without feeling judged?

## Core rule

```text
Internally: finance terminology
Externally: money language
```

Preferred default vocabulary:

- Entró dinero.
- Gastaste.
- Moviste dinero.
- Te devolvieron dinero.
- Pago recurrente.
- Cambió.
- Necesita revisión.
- Encontramos una oportunidad.

Avoid by default:

- variance;
- discretionary outflow;
- cash-flow optimization;
- poor spending;
- wasteful;
- irresponsible;
- “you should stop...” without explicit user intent.

## Message grammar

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

> Delivery está S/75 por encima de tu nivel habitual. Volver cerca de ese nivel dejaría aproximadamente S/75 adicionales este mes. [Crear un límite] [Está bien así]

## States

Prefer:

```text
Normal
Cambió
Revisar
```

over a universal green/yellow/red morality model.

Red should be reserved for materially important attention, not for lifestyle choices.

## Closure criteria

- copy lexicon and banned-default-language list reviewed;
- at least 30 insight examples rewritten into human language;
- comprehension test designed with non-finance users;
- opportunity copy separates facts from predictions;
- language contract integrated into signature wireframes.
