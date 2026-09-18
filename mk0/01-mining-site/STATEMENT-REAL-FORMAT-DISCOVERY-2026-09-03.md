# MK0 / 01 — Real bank-statement format discovery — 2026-09-03

## Purpose

Record structural findings from a private, user-owned multi-bank statement corpus without publishing raw statements, identities, account/card numbers, transaction values, merchant names, references, addresses, filenames or passwords.

This document contains only **sanitized structural observations** needed to design adapters and negative fixtures.

## Evidence boundary

```text
REAL PRIVATE DOCUMENT OBSERVED != FORMAT SUPPORTED
STRUCTURAL REVIEW != PRODUCT PARSE PASS
NATIVE TEXT PRESENT != ROW NORMALIZATION PROVEN
ONE FORMAT VERSION != FUTURE FORMAT GUARANTEE
```

Private input reviewed:

- 4 user-owned statement PDFs;
- 3 institutions;
- 2 savings/debit-style account statements;
- 2 credit-card statements.

Repository/public CI receives:

```text
raw PDFs            0
raw statement text  0
real amounts        0
real identities     0
real account IDs    0
real card IDs       0
real references     0
```

## Finding FMT-001 — BCP savings / Cuenta Digital

Observed structural family:

```text
Estado de Cuenta de Ahorros Cuenta Digital BCP
```

Transaction ledger can continue across multiple pages.

Observed ledger headers:

```text
FECHA PROC.
FECHA VALOR
DESCRIPCION
CARGOS / DEBE
ABONOS / HABER
```

Important adapter properties:

- process date and value date are distinct columns;
- debit and credit are separate amount columns rather than one signed amount column;
- date tokens use day + month abbreviation in the observed copy;
- opening balance is embedded before transaction rows;
- totals and closing balance appear at the end of the final ledger page;
- repeated page headers and client-message/footer areas must not become movement rows;
- one statement period can therefore span `N` ledger pages with the same profile signature.

Required parser consequence:

```text
PAGE_BREAK != END_OF_LEDGER
DEBIT_COLUMN_POSITION != CREDIT_COLUMN_POSITION
OPENING_BALANCE != TRANSACTION
TOTAL_MOVEMENT != TRANSACTION
CLOSING_BALANCE != TRANSACTION
```

## Finding FMT-002 — Interbank Cuenta Simple Soles

Observed structural family:

```text
ESTADO DE CUENTA
CUENTA SIMPLE SOLES
DETALLE DE MOVIMIENTOS
```

Observed ledger headers:

```text
Fecha
Concepto
Ingresos
Gastos
Saldo Contable
```

Important adapter properties:

- the transaction ledger occupies the first statement page in the observed copy;
- later pages contain informational/security content;
- an educational page contains a **referential/sample statement with transaction-looking rows**;
- therefore whole-document text extraction followed by generic date/amount scanning is unsafe;
- positive and negative movement columns are conceptually separate even when extracted text may expose signs;
- running balance is a separate column and must never be mistaken for transaction amount;
- final totals aggregate income and expense columns separately.

This is the strongest new negative-fixture requirement from the real corpus:

```text
EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER
SAMPLE_ROW != USER_TRANSACTION
RUNNING_BALANCE != MOVEMENT_AMOUNT
```

## Finding FMT-003 — BCP Visa credit card

Observed structural family:

```text
Estado de Cuenta Tarjeta VISA
```

Observed transaction-area headers:

```text
Fecha de proceso
Fecha de consumo
Descripcion
Tipo de Operacion
Soles
Dolares
```

Important adapter properties:

- process date and consumption date are distinct;
- transaction rows coexist with statement-level credit, payment and debt summaries;
- payment rows can use a trailing-sign presentation in the observed layout;
- a later page contains debt composition / total-facturado information rather than ordinary transaction rows;
- another page is an educational/reference explanation containing a sample card statement;
- card payment remains `CARD_PAYMENT`, never personal income;
- summary debt amounts are evidence about the account period, not transaction rows by default.

Required parser consequence:

```text
TRANSACTION_TABLE != DEBT_COMPOSITION_TABLE
PAYMENT_SIGN != PERSONAL_INFLOW_SEMANTICS
REFERENCE_SAMPLE != USER_LEDGER
```

## Finding FMT-004 — Banco Ripley credit card

Observed structural family:

```text
EECC Tarjeta de Credito Ripley
Tus movimientos del mes
```

Observed movement columns include:

```text
Fecha de operacion
Fecha de proceso
Nro. ticket
Descripcion
T/A
Monto
TEA/TNA
Nro. de cuotas
Valor cuota / capital / interes / total
```

Important adapter properties:

- movement rows have a wider, richer schema than BCP card rows;
- ticket/reference may be available independently from description;
- installment/rate columns are optional per row and cannot be treated as movement amounts;
- summary formulas and membership/points sections share the same page as the ledger;
- the second page is informational/product guidance, not a ledger continuation;
- payment, insurance/fee and purchase semantics require row-type interpretation, not sign-only classification.

Required parser consequence:

```text
OPTIONAL_RATE_COLUMN != MOVEMENT_AMOUNT
INSTALLMENT_VALUE != TRANSACTION_TOTAL_BY_DEFAULT
POINTS_SECTION != FINANCIAL_LEDGER
FORMULA_SECTION != TRANSACTION_LEDGER
```

## Finding FMT-005 — Page-role classification is mandatory

The real corpus proves that document classification alone is insufficient.

New pipeline:

```text
PDF
  ↓
DOCUMENT PROFILE
  ↓
PAGE ROLE
  ↓
REGION / SECTION
  ↓
ROW
  ↓
NORMALIZED EVIDENCE
```

Page roles:

```text
TRANSACTION_LEDGER
SUMMARY
INFORMATIONAL
EDUCATIONAL_REFERENCE
UNKNOWN
```

Only `TRANSACTION_LEDGER` is row-parser eligible by default.

`UNKNOWN` fails closed.

## Finding FMT-006 — Active PDF content is not authority

Structural inspection of the private copies showed that some bank PDFs can report active PDF features such as JavaScript/actions and, in one observed family, form structures.

FinanceSensor must treat a statement as passive data only.

```text
PDF_JAVASCRIPT_EXECUTION = FORBIDDEN
PDF_LAUNCH_ACTIONS       = FORBIDDEN
EMBEDDED_FILE_EXECUTION  = FORBIDDEN
FORM_FIELD_VALUE         != FINANCIAL_AUTHORITY
PDF_ACTIVE_CONTENT       != FINANCIAL_AUTHORITY
```

Text/render extraction may inspect the document, but no statement feature is allowed to execute application code or gain device authority.

## Finding FMT-007 — Native text is present in these shared copies

All four reviewed copies expose usable text content at document level.

This is evidence only for these copies:

```text
OBSERVED_SHARED_COPY_NATIVE_TEXT = YES
OCR_REQUIRED_FOR_THESE_COPIES    = NO
OCR_REQUIRED_FOR_BANK_FAMILY     = NOT PROVEN
```

OCR remains a fallback because future/scanned copies can differ.

## Adapter-status consequence

The following profiles move from discovery/unproven format knowledge to **FORMAT_OBSERVED** only:

```text
PE-BCP-SAVINGS-REQUESTED
PE-BCP-CREDIT-MONTHLY
PE-RIPLEY-CREDIT-MONTHLY
PE-INTERBANK-SAVINGS-REQUESTED
```

This does **not** promote them to `FIXTURE_READY`, `STATIC_READY`, physical pass or product support.

Interbank credit remains `UNPROVEN`.

## Next implementation work

Per observed profile:

1. create synthetic structural fixture preserving headings/column geometry only;
2. add positive document signature tests;
3. add page-role tests;
4. add embedded-example/reference negative fixtures;
5. implement row/column reconstruction rules;
6. implement date/amount grammar;
7. implement debit-credit / card semantic mapping;
8. reconcile synthetic Gmail + statement pairs;
9. run owned Android physical proof later;
10. keep iOS deferred and untouched until the existing return sweep.

## Frozen laws added by this discovery

```text
DOCUMENT_CLASSIFIED != ROWS_TRUSTED
PAGE_ROLE_UNKNOWN != PARSE_ANYWAY
EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER
PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY
NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS
```
