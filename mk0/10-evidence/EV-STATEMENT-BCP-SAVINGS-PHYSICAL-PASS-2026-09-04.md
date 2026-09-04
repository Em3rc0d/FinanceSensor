# EV-STATEMENT — BCP savings owned-corpus physical import PASS

**Date:** 2026-09-04  
**Profile:** `PE-BCP-SAVINGS-REQUESTED`  
**Runtime:** controlled Windows local-edge evidence harness  
**Source lane:** Gmail `gmail.readonly` + user-requested BCP savings statements  
**Baseline commit exercised:** `69e45e02069e6ec8f2248ecd8a4a6a908f6f1a2b`  
**Result:** `PASS_OWNED_CORPUS_PHYSICAL_PARSE`  
**BUILD_READY:** NO  
**IOS_TOUCHED:** 0

## Physical observation

A real user-owned statement-recovery run completed with the BCP savings geometric adapter enabled.

```text
BCP SAVINGS STATEMENTS DETECTED          9
BCP SAVINGS STATEMENTS PROCESSED         9
PAGES PROCESSED                         16
DERIVED EVIDENCE EMITTED               368
BCP SAVINGS STATEMENTS UNPROCESSED       0
HARNESS RESULT                           IMPORT FINISHED
```

The public receipt intentionally records only aggregate counts. It does not contain statement text, movement descriptions, dates, amounts, account identifiers, Gmail identifiers, attachment identifiers or PDF contents.

## What this physically proves

Within the observed owned BCP savings corpus and the controlled Windows local-edge harness, FinanceSensor demonstrated the complete statement path:

```text
GMAIL READONLY DISCOVERY
    -> BCP SAVINGS PROFILE CLASSIFICATION
    -> SESSION-ONLY PDF PASSWORD USE
    -> PASSIVE PDF.JS TEXT/GEOMETRY EXTRACTION
    -> LEDGER PAGE CLASSIFICATION
    -> HEADER-ANCHORED COLUMN INTERPRETATION
    -> BCP DDMMM PROCESS/VALUE DATE RECOVERY
    -> DEBIT/CREDIT MOVEMENT NORMALIZATION
    -> DERIVED STATEMENT EVIDENCE LOAD
```

The observed run processed every BCP savings statement selected by the harness and crossed a multi-page corpus without a fail-closed rejection.

## Privacy boundary observed

The harness reported and the implementation contract requires:

```text
PDF PASSWORD PERSISTED                  NO
DECRYPTED PDF PERSISTED                 NO
DECRYPTED STATEMENT TEXT PERSISTED      NO
PDF LAYOUT GEOMETRY PERSISTED           NO
RAW PRIVATE STATEMENT IN GITHUB         NO
REAL FINANCIAL VALUES IN RECEIPT        NO
```

Only derived evidence is eligible for durable local storage. This receipt contains no raw financial plaintext.

## What this does not prove

This result is deliberately narrower than generalized profile support.

```text
OWNED_CORPUS_PHYSICAL_PARSE             PASS
ALL BCP SAVINGS FORMAT VARIANTS         NOT PROVEN
INDEPENDENT 368-ROW RECONCILIATION      OPEN
CROSS-ACCOUNT / CROSS-USER DIVERSITY    NOT PROVEN
FUTURE BCP FORMAT DRIFT                 NOT PROVEN
BCP CREDIT PHYSICAL PARSER              OPEN / BLOCKED
RIPLEY CREDIT PHYSICAL PARSER           OPEN / BLOCKED
INTERBANK LOCAL-FILE SAVINGS LANE       OPEN
ANDROID PRODUCT STATEMENT PARSE         OPEN
IOS PRODUCT STATEMENT PARSE             OPEN
Q-003 / Q-004 CLOSURE                   NO
BUILD_READY                              NO
```

In particular, `368 derived evidence records emitted` proves successful extraction/load under the adapter contract; it does **not** by itself prove that all 368 rows independently reconcile one-for-one with an externally audited bank ledger.

## Residual risks

- Independent reconciliation of statement totals / row counts / directions remains required before treating the corpus as financially reconciled.
- The evidence corpus belongs to one observed statement family and does not establish compatibility with every historical or future BCP layout variant.
- Desktop harness success cannot promote Android or iOS product-runtime physical claims.
- Credit-card statement profiles remain intentionally fail-closed until their profile-specific adapters are physically validated.
- Interbank savings still requires its local-file physical ingress lane.

## Revalidation triggers

Re-run or reopen this claim if any of the following occurs:

- BCP changes statement headers, date grammar, column layout or page structure;
- a newly observed BCP savings statement fails the adapter;
- reconciliation exposes systematic debit/credit/date assignment error;
- the PDF runtime or row-layout algorithm changes materially;
- this evidence is used to promote a mobile-product claim.

## Governing result

```text
PE-BCP-SAVINGS-REQUESTED
OWNED_CORPUS_PHYSICAL_PARSE             PASS
STATEMENTS                              9 / 9
PAGES                                   16
DERIVED_EVIDENCE                        368
UNPROCESSED                             0
GENERALIZED_PROFILE_SUPPORT             OPEN
RECONCILIATION                          OPEN
MOBILE_PHYSICAL_PROOF                   OPEN
BUILD_READY                             NO
IOS_TOUCHED                             0
```
