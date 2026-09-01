# Q-011 — Savings Opportunity Intelligence

**Priority:** P1  
**Status:** OPEN

## Question

How can FinanceSensor identify useful opportunities to preserve money without turning observations into moral judgments or unsupported financial advice?

## Candidate opportunity classes

- recurring price increase;
- duplicate or near-duplicate charge;
- bank fees accumulating;
- unused/suspicious recurring payment candidate;
- category drift vs personal recent baseline;
- refund announced but not later confirmed;
- avoidable repeated charge pattern;
- user-defined limit approaching.

## Product grammar

Every opportunity should expose:

```text
What changed?
What evidence supports it?
What is the money impact?
What can the user do?
```

Example:

```text
Comisiones bancarias
Este mes: S/29.70
Últimos 3 meses: S/79.20

Quizá puedas evitar alguno de estos cargos.
[Ver cuáles]
```

## Rules

- no recommendation without evidence;
- no claim that an expense is “unnecessary” unless the user defined that preference;
- annualized numbers must clearly be projections;
- lifestyle categories are not red simply because spending is high;
- user can dismiss/ignore an opportunity without punishment loops.

## Closure criteria

- initial opportunity taxonomy defined;
- evidence requirements per opportunity type defined;
- money-impact calculation rules tested;
- copy separates observation from projection;
- no high-stakes personalized investment/tax/debt advice enters this engine by accident.
