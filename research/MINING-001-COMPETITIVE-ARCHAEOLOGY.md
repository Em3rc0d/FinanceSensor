# MINING-001 — PFM / Financial Intelligence Competitive Archaeology

## Purpose

Study products that attempted adjacent problems — personal finance aggregation, automatic categorization, subscription intelligence, email-derived purchase detection, local-first finance, financial assistants and Open Finance — to identify patterns to **reuse**, **avoid** and **validate experimentally** for FinanceSensor.

This document is a mining artifact, not a final architecture decision. Source registry: [`SOURCES.md`](SOURCES.md).

## Competitive map

| Product | What it validates | Outcome / signal | FinanceSensor implication |
|---|---|---|---|
| Mint | Mass-market aggregation, categories, budgets and insights | Large historical adoption; consumer product discontinued/migrated into Credit Karma | Demand is real, but aggregation alone is not durable differentiation |
| YNAB | Paid budgeting, sync and education | Long-running subscription product | Users will pay when trust/value are clear; incentives can align with users |
| Monarch Money | Multi-account/household aggregation and review workflows | Active premium product | Household model and Needs Review are valuable; correctness/dedup remains a serious domain problem |
| Copilot Money | Transaction semantics, categorization, recurring | Active premium product | Explicit separation of income/internal transfers/regular transactions validates our semantic model |
| Rocket Money | Subscription detection → action → savings | Large active consumer product | Insights become stronger when tied to money impact and action |
| Cleo | Conversational financial guidance and human language | Active product | Friendly language and small actions work; judgment/personality should not be mandatory |
| PocketGuard | Remaining-spend abstraction, bills and recurring | Active product | Simple user abstractions beat finance jargon; card-payment semantics matter |
| Fintonic | Spanish-language PFM, categories, alerts, duplicate/fee awareness | Long-running product with changing commercial focus | Strong Spanish-market validation; recommendations can create incentive conflicts if monetization is product sales |
| Guiabolso | Automated PFM/Open Finance in Brazil | Reached millions; acquired by PicPay | Strong LatAm validation for automated financial understanding |
| Olivia | AI + income/expense analysis + recommendations | Acquired by Nubank | AI-PFM can be strategically valuable, but standalone capability can be absorbed by banks |
| Finerio Connect | PFM/Open Finance infrastructure in LatAm | Active B2B platform | Connector abstraction should be ready for regional Open Finance providers |
| Money Dashboard | Open Banking PFM | Consumer product closed | User usefulness does not guarantee sustainable economics |
| Yolt | Open Banking smart-money app | Consumer app closed after significant adoption | Scale/users alone do not prove viable business model |
| Paribus | Email receipt scanning → purchase understanding → savings | Acquired by Capital One | Direct validation of email as a financial/commercial sensor |
| Unroll.Me / Slice | Email scanning and receipt extraction | FTC enforcement over deceptive data practices | Privacy betrayal is existential; our architecture must be the opposite |
| Actual Budget | Local-first personal finance + sync server | Active open-source project | Local financial ownership plus synchronization is a credible architecture pattern |

## Pattern 1 — Canonical financial semantics are not optional

Multiple PFM products distinguish ordinary expenses, income and internal transfers. This matters because naive arithmetic creates false financial truth.

Critical example:

```text
Visa purchase       -S/100   => EXPENSE
Card settlement     -S/100   => CARD_PAYMENT / INTERNAL MONEY MOVEMENT

Real expense         S/100
not                  S/200
```

The same applies to transfers between a user's own accounts and to refunds/reversals.

### Mining conclusion

FinanceSensor must own a semantic event model rather than treat every debit/credit/evidence item as an expense or income.

## Pattern 2 — Deduplication is a product-trust problem

Pending transactions can become posted transactions with changed identifiers. Sources can reconnect or switch aggregators. Email evidence can overlap with receipts, invoices and future bank events.

Therefore:

```text
provider_transaction_id != canonical economic identity
```

A robust engine requires:

- evidence correlation;
- transaction fingerprinting;
- temporal windows;
- amount/currency matching;
- merchant normalization;
- account/instrument context;
- state-transition awareness;
- idempotent replay.

### Mining conclusion

Transaction correctness is P0 and belongs below every analytics or AI feature.

## Pattern 3 — Email can be a real sensor

Paribus demonstrated a product flow where the inbox could identify purchase evidence and convert it into direct savings opportunities.

The useful abstraction is not “read email.” It is:

```text
Inbox
  ↓
financial/commercial evidence
  ↓
resolved purchase state
  ↓
valuable action
```

### Mining conclusion

Email-first is viable as a wedge. FinanceSensor must remain multi-source by design.

## Pattern 4 — Email privacy can destroy the product

The Unroll.Me/Slice FTC case is a core anti-pattern. A product can technically provide inbox utility while undermining trust through unexpected downstream use of receipt data.

FinanceSensor must invert this:

```text
source
  ↓ direct to device
local classification / extraction
  ↓
minimal canonical state
  ↓ E2EE
opaque cloud synchronization
```

The user should be able to inspect:

- how many messages were scanned;
- how many became financial evidence;
- what raw content was retained;
- how much financial plaintext left the device.

### Mining conclusion

Privacy is a system property and UX surface, not merely policy text.

## Pattern 5 — User-facing value is concrete, not analytical

Rocket Money, PocketGuard and adjacent products repeatedly translate financial data into direct user outcomes: bills, subscriptions, remaining spend, possible savings.

Preferred FinanceSensor grammar:

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

> Delivery is S/75 above your recent level. Returning near that level would leave about S/75 more this month.

Not:

> Your discretionary food variance increased 38%.

### Mining conclusion

Default surfaces should explain money, not expose financial-analysis terminology.

## Pattern 6 — Non-judgmental language is strategically important

Financial products can use personality, gamification or provocative copy, but FinanceSensor's default intelligence should not shame users.

The engine can safely state:

- “changed”;
- “above your recent level”;
- “this repeats every month”;
- “we found two similar charges”;
- “this may leave S/75 more.”

It should avoid unsupported moral claims such as “bad expense,” “waste,” or “irresponsible.”

### Mining conclusion

FinanceSensor evaluates financial signals, not lifestyles.

## Pattern 7 — Sustainability matters as much as adoption

Money Dashboard and Yolt are cautionary cases: useful PFM experiences and meaningful adoption did not guarantee a durable consumer business.

This creates an early product requirement:

```text
USER VALUE
   +
TRUST
   +
SUSTAINABLE UNIT ECONOMICS
```

The product should not rely on a future assumption that “large user count” will solve monetization.

### Mining conclusion

Monetization is a P0 quarry, even though it is not an MK0 build feature.

## Pattern 8 — LatAm is not an unvalidated market

Guiabolso, Olivia, Fintonic and Finerio provide evidence that automated PFM, financial intelligence and Open Finance have meaningful adoption/strategic value in Spanish- and Portuguese-speaking markets.

### Mining conclusion

FinanceSensor should treat Latin America as a first-class research environment, not merely localize a U.S. product later.

## Pattern 9 — Local-first + sync is viable

Actual Budget demonstrates a credible product pattern where financial state is local-first while a server provides synchronization.

FinanceSensor extends the idea with:

- edge financial processing;
- E2EE envelopes;
- device registry and execution leases;
- multi-source evidence;
- canonical event resolution.

### Mining conclusion

`Cloud Control Plane + Edge Data Plane` is a plausible foundation worth prototyping.

## Priority resulting from mining

### P0

1. Canonical financial semantics.
2. Fingerprinting / deduplication / idempotency.
3. Gmail OAuth and policy feasibility.
4. Email privacy and data-minimization boundary.
5. Local-first E2EE synchronization.
6. Sustainable product economics thesis.

### P1

1. Merchant normalization.
2. Categorization.
3. Recurring engine.
4. Needs Review.
5. Human-language system.
6. Household readiness.
7. LatAm source/connectivity strategy.
8. Savings/opportunity intelligence.

### P2

- advanced forecasting;
- richer local AI;
- broader direct-bank connectivity;
- additional advisory capabilities.

## Strategic differentiation hypothesis

No single reviewed competitor was found to clearly combine the entire target stack:

```text
Edge-first privacy
       +
Financial Evidence Graph
       +
Canonical Transaction Engine
       +
Multi-source reconciliation
       +
Multi-device tenant architecture
       +
Explainable intelligence
       +
Human financial language
       +
Actionable opportunities
       +
Signature no-scroll UX
```

This is a **hypothesis**, not a moat claim. It must be continuously re-evaluated as the market changes.

## Result

Mining status: **COMPLETE FOR INITIAL PRODUCT ARCHAEOLOGY**.

Next action: close the quarries in [`../mk0/02-quarries/README.md`](../mk0/02-quarries/README.md), starting with Q-001 through Q-005.
