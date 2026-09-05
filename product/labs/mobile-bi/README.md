# FinanceSensor Mobile BI Product Lab

This lab exists to validate FinanceSensor's **mobile-first analytical experience** before production implementation is unblocked.

## What it is

A dependency-free mobile web prototype using only synthetic financial data.

It tests:

- no-scroll Home information hierarchy;
- compact cash-flow visualization;
- spending composition;
- period comparison;
- recurring-payment horizon;
- Financial Sensor prominence;
- movement drill-down;
- Needs Review interaction;
- explainability language;
- small-screen density.

## What it is not

```text
PRODUCT_LAB != PRODUCTION_APP
SYNTHETIC_DATA != FINANCIAL_EVIDENCE
WEB_PROTOTYPE != WEB_PRODUCT_DECISION
GREEN_LAB != BUILD_READY
```

The lab does not:

- execute Google OAuth;
- access Gmail;
- ingest real email;
- persist real financial plaintext;
- exercise protected Android/iOS credentials;
- prove production crypto;
- close Q-003, Q-004 or Q-005.

## Product direction under test

```text
MOBILE APPLICATION
      ↓
STATE + BI CONTEXT
      ↓
FINANCIAL SENSOR
      ↓
PROGRESSIVE DISCLOSURE
      ↓
EXPLAIN EVERYTHING
```

The target is not a desktop BI dashboard compressed into a smartphone. Each mobile viewport has one primary purpose.

## Primary navigation

```text
Inicio | Mov. | Sensor | Tú
```

## Run

Open `index.html` directly in a modern browser. No package installation, server, API key or credential is required.

For useful review, evaluate it at compact, regular and large smartphone widths and record:

- viewport dimensions;
- text scaling;
- overflow;
- touch target issues;
- primary-answer visibility;
- chart readability;
- information overload;
- confusing language;
- actions that feel hidden or unnecessary.

## Evidence discipline

Findings from this lab may refine `PRODUCT-DESIGN.md` and `SIGNATURE-WIREFRAMES.md`, but visual preference alone does not close the production physical gates.
