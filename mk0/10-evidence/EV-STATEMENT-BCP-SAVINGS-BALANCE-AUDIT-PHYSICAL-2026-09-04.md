# EV-STATEMENT — BCP savings physical balance-audit campaign

**Date:** 2026-09-04  
**Profile:** `PE-BCP-SAVINGS-REQUESTED`  
**Runtime:** controlled Windows local-edge evidence harness  
**Source lane:** Gmail `gmail.readonly` + user-requested BCP savings statements  
**Parser baseline exercised:** `d22103b0654f8354d2c69abfe1df58a7d852d5ec`  
**Result:** `PARTIAL_PASS_WITH_EXPLICIT_OPEN_VARIANTS`  
**Governing promotion:** OPEN  
**BUILD_READY:** NO  
**IOS_TOUCHED:** 0

## Why this receipt exists

The first owned-corpus physical parse receipt recorded that the then-current adapter processed all detected BCP savings statements and emitted 368 derived evidences. That receipt explicitly did not claim independent reconciliation.

A later statement-level reconciliation campaign exposed a systematic debit-column contamination caused by detached numeric fragments crossing the geometric description/debit boundary. PR #53 corrected the money-column boundary by selecting the rightmost monetary fragment cluster. This campaign then physically re-ran the same owned corpus against the corrected parser.

The earlier `368` count remains a true historical observation of what that earlier parser emitted. It is **not** the current reconciled movement count and must not be reused as such.

## Final bounded physical observation

```text
BCP SAVINGS STATEMENTS SELECTED              9
BCP SAVINGS STATEMENTS AUDITED               9
PAGES AUDITED                               16
MOVEMENTS AUDITED                          359
PARSER FAILURES                              0

FULL BALANCE EQUATION PASS                   6
RECONCILIATION OPEN                          2
DISCREPANCY                                  1

PRINTED CARGOS TOTAL EXACT                   9 / 9
PRINTED ABONOS TOTAL EXACT                   9 / 9
SALDO ANTERIOR BOUND                         9 / 9
SALDO FINAL BOUND                            7 / 9
DATES WITHIN DECLARED PERIOD                 8 / 9

MULTI-PAGE LAYOUT                            7
ONE-PAGE LAYOUT                              2
```

No statement dates, monetary values, descriptions, account identifiers, Gmail identifiers, PDF text or layout coordinates are included in this receipt.

## Root-cause repair physically verified

Before PR #53, the parser produced a systematic pattern:

```text
PARSED CARGOS > PRINTED CARGOS               9 / 9
PARSED ABONOS = PRINTED ABONOS               9 / 9
```

After PR #53:

```text
PARSED CARGOS = PRINTED CARGOS               9 / 9
PARSED ABONOS = PRINTED ABONOS               9 / 9
MONEY CELLS SINGLE MONETARY CLUSTER          9 / 9
```

This physically verifies that the corrected monetary-fragment boundary removed the systematic debit inflation observed in the previous parser baseline.

## What is now supported by physical evidence

Within this owned corpus and Windows evidence harness:

- the BCP savings geometric adapter discovers and parses both debit and credit movement columns;
- the corrected parser's aggregate debit sum matches the bank's printed `TOTAL MOVIMIENTO` debit control in every audited statement;
- the corrected parser's aggregate credit sum matches the printed credit control in every audited statement;
- opening balance binding succeeds across all nine statements;
- six statements complete the full arithmetic reconciliation `opening + inflows - outflows = closing`;
- the parser processes the corpus without parser failures;
- the statement password, decrypted PDF, plaintext and layout geometry remain non-durable.

This is stronger than the original parse-only receipt, but it is still not generalized BCP support.

## Explicitly unresolved variants

### One-page closing-balance variant — 2 statements

Both one-page statements satisfy the printed movement-total controls, but the final `SALDO` numeric value is not structurally bindable under the current fail-closed anchor contract.

```text
LAYOUT                                      ONE_PAGE
FINAL SALDO LABEL                           PRESENT
FINAL SALDO VALUE                           NOT BOUND
STATUS                                      OPEN
```

FinanceSensor does not infer or fabricate the missing closing control from arithmetic.

### Pre-period date edge — 1 statement

One multipage statement has at least one movement where both process date and transient value date classify before the declared statement period.

```text
DATE DIAGNOSTIC                             PROCESS_BEFORE_VALUE_BEFORE_PERIOD
BALANCE / PRINTED MOVEMENT CONTROLS         OTHERWISE STRUCTURALLY AVAILABLE
STATUS                                      FAIL-CLOSED / OPEN SEMANTICS
```

The period rule is not relaxed in this campaign.

## Campaign stop rule

The owned-corpus BCP savings diagnostic campaign ends here. No additional local reruns are required merely to chase a cosmetic `9/9` result.

The two unresolved physical variants are carried forward explicitly and should be reopened only when one of these conditions is true:

- product acceptance requires those exact variants;
- an additional owned corpus provides new structural evidence;
- the BCP layout changes;
- a deliberate evidence-model decision is made for closing-balance or statement-period semantics.

This preserves the project rule that unresolved evidence is recorded rather than weakened, while avoiding unbounded testing.

## Privacy boundary

```text
OAUTH SCOPE                                 gmail.readonly
PDF PASSWORD PERSISTED                      NO
DECRYPTED PDF PERSISTED                     NO
DECRYPTED TEXT PERSISTED                    NO
LAYOUT GEOMETRY PERSISTED                   NO
REAL FINANCIAL VALUES COMMITTED             NO
REAL ACCOUNT / GMAIL IDENTIFIERS COMMITTED  NO
```

## What this does not prove

```text
ALL BCP SAVINGS FORMAT VARIANTS             NOT PROVEN
ONE-PAGE CLOSING BALANCE VARIANT            OPEN
PRE-PERIOD MOVEMENT SEMANTICS                OPEN
INDEPENDENT EXTERNAL ROW-BY-ROW AUDIT        OPEN
CROSS-ACCOUNT / CROSS-USER DIVERSITY         NOT PROVEN
BCP CREDIT PHYSICAL PARSER                   OPEN / BLOCKED
RIPLEY CREDIT PHYSICAL PARSER                OPEN / BLOCKED
INTERBANK LOCAL-FILE SAVINGS LANE            OPEN
ANDROID PRODUCT STATEMENT PARSE              OPEN
IOS PRODUCT STATEMENT PARSE                  OPEN
Q-003 / Q-004 CLOSURE                        NO
BUILD_READY                                  NO
```

## Governing result

```text
PE-BCP-SAVINGS-REQUESTED
OWNED CORPUS PARSE                           PHYSICAL PASS
PRINTED MOVEMENT TOTAL RECONCILIATION        9 / 9
FULL BALANCE EQUATION                        6 / 9 PASS
ONE-PAGE CLOSING VARIANT                     2 OPEN
PRE-PERIOD DATE EDGE                         1 OPEN / FAIL-CLOSED
GENERALIZED PROFILE SUPPORT                  OPEN
MOBILE PHYSICAL PROOF                        OPEN
BUILD_READY                                  NO
IOS_TOUCHED                                  0
```
