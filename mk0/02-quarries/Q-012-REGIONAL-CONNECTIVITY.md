# Q-012 — Regional Connectivity Strategy

**Priority:** P1  
**Status:** OPEN

## Question

How should FinanceSensor acquire financial evidence across countries without making any single bank aggregator, email provider or platform the product architecture?

## Connector contract

```text
FinancialSource
├── MailSource
│   ├── GmailAdapter
│   ├── MicrosoftAdapter
│   └── IMAPAdapter
├── BankAggregatorSource
├── DirectBankSource
├── StatementImportSource
├── ReceiptImportSource
└── FutureOpenFinanceSource
```

All sources emit structured evidence into the same downstream evidence/resolution pipeline.

## Strategic rule

**Email-first, never email-only.**

Email provides a broad initial wedge and useful commercial/bank evidence. It cannot guarantee complete financial coverage because some payments generate no email, arrive late, happen in cash or exist only inside bank/wallet systems.

## Coverage model

The UI should eventually distinguish:

```text
Observed / high confidence
Unverified
Unknown coverage
Reconciled
```

Never claim complete financial state merely because all connected inbox evidence was processed.

## Evaluation dimensions for connector providers

- country coverage;
- institution coverage;
- uptime/data quality;
- pending/posted behavior;
- transaction identifiers;
- OAuth/consent UX;
- data retention rights;
- pricing;
- latency;
- webhook availability;
- security/compliance posture;
- ability to support our privacy architecture.

## Closure criteria

- common `FinancialSource` contract designed;
- Gmail implementation does not leak provider-specific concepts into canonical domain entities;
- Peru/LatAm source matrix exists;
- future aggregator evaluation template defined;
- product copy includes honest coverage semantics.
