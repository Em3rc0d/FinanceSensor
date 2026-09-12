# MK0 / 04 — Statement geometric layout contract

## Purpose

Freeze the structural contract required to parse bank statements whose accounting meaning depends on **which visual column a value belongs to**.

This contract was introduced after private structural review showed that flattened PDF text can preserve the tokens while losing the financial meaning of debit/credit, income/expense and running-balance columns.

## Core law

```text
FLATTENED_TEXT != COLUMN_SEMANTICS
```

A string containing a date, description and amount is not sufficient when the source document communicates semantics through position.

## Extraction contract

The passive PDF reader may expose transient text items:

```text
StatementLayoutPage
  page_number
  width?
  height?
  items[]

StatementLayoutItem
  sequence
  text
  x
  y
  width
  height
```

These objects are **transient processing data**. They are not durable financial entities and do not authorize raw statement retention.

```text
LAYOUT_ITEM != DURABLE_DOMAIN_ENTITY
```

## Coordinate policy

FinanceSensor does not hard-code one absolute coordinate map for a bank PDF.

Instead it derives column boundaries from the observed header positions on the current page:

```text
header labels
    ↓
header x anchors
    ↓
midpoint column boundaries
    ↓
row item assignment
```

Therefore:

```text
HEADER_POSITION != ABSOLUTE_DEVICE_COORDINATE
```

Absolute screen/device coordinates are forbidden as parser authority. Page scaling, rendering DPI and device dimensions must not change financial semantics.

## Structural order

```text
DOCUMENT PROFILE
    ↓
PAGE ROLE
    ↓
HEADER GEOMETRY
    ↓
REGION / SECTION
    ↓
ROW GEOMETRY
    ↓
NORMALIZED EVIDENCE
```

A row parser must not run if the required header geometry cannot be established.

Safe failure:

```text
STATEMENT_HEADER_GEOMETRY_UNKNOWN
```

## BCP savings consequence

The observed family uses separate columns for:

```text
FECHA PROC.
FECHA VALOR
DESCRIPCION
CARGOS / DEBE
ABONOS / HABER
```

The same textual amount token could represent a debit or credit depending on the column. Description heuristics cannot replace this column authority.

```text
DESCRIPTION_GUESS != DEBIT_CREDIT_AUTHORITY
```

Opening balance, totals and closing balance remain non-movement rows unless a profile explicitly defines otherwise.

## Interbank savings consequence

The observed family uses:

```text
Fecha
Concepto
Ingresos
Gastos
Saldo Contable
```

The running balance is a separate numeric column and must never be selected as the movement amount.

```text
RUNNING_BALANCE != MOVEMENT_AMOUNT
```

Educational/reference pages containing statement-like examples remain excluded before geometry parsing.

## Ambiguity policy

If a candidate row has amounts in both opposing movement columns:

```text
BCP: debit + credit
Interbank: income + expense
```

FinanceSensor does not choose a side.

```text
AMBIGUOUS_COLUMN_ROW → REVIEW_REQUIRED
```

Rows with no positive movement amount are not promoted to movements by geometry alone.

## Static evidence stage

The first geometric fixtures are sanitized synthetic reconstructions for:

- `PE-BCP-SAVINGS-REQUESTED`;
- `PE-INTERBANK-SAVINGS-REQUESTED`.

They contain no real identities, account/card values, merchant history, references or financial values.

Current claim boundary:

```text
SYNTHETIC_GEOMETRIC_FIXTURE_PASS != REAL_PDF_PARSE_PASS
STATIC_ADAPTER_PASS != ANDROID_PHYSICAL_PASS
```

## Product boundary

The Node/PDF.js implementation is an MK0 evidence harness for the geometry contract. The production product remains Flutter mobile with Android as the first physical target.

The neutral contract is the page/item geometry and header-anchored adapter behavior, not PDF.js itself.

```text
DESKTOP_LAYOUT_HARNESS != MOBILE_PHYSICAL_PROOF
```

## Privacy

Forbidden in public CI/repository fixtures:

- real statement PDF bytes;
- raw real statement text;
- real names or addresses;
- account/card identifiers;
- real transaction values;
- real merchant/counterparty history;
- statement passwords.

Allowed:

- generic header labels needed to describe the bank format;
- synthetic coordinates;
- fictional descriptions;
- synthetic amounts/dates;
- aggregate test counts and PASS/OPEN states.

## Status

```text
PROFILE_SPEC_V1                 COMMITTED
BCP_SAVINGS_GEOMETRIC_FIXTURE  COMMITTED
INTERBANK_GEOMETRIC_FIXTURE     COMMITTED
SAVINGS_ADAPTERS                IMPLEMENTED_AWAITING_CI
REAL_PDF_PARSE                  OPEN
ANDROID_PHYSICAL                OPEN
IOS_TOUCHED                     0
BUILD_READY                     false
```
