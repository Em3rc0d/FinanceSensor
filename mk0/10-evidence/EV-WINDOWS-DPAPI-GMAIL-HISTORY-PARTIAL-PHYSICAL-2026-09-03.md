# EV — Windows DPAPI physical PASS + partial Gmail historical run

**Date:** 2026-09-03  
**Boundary:** trusted local Windows edge / Gmail historical viewer  
**DPAPI claim:** `WINDOWS_DPAPI_CURRENT_USER_PREFLIGHT`  
**DPAPI status:** PASS — user-observed physical execution  
**Real Gmail historical coverage:** OPEN / incomplete  
**BUILD_READY:** NO

## What was physically observed

A controlled run of the one-click Gmail historical viewer on the owned Windows environment progressed beyond the fail-closed DPAPI preflight, opened the OAuth credential-selection path, completed Google authorization, reached the local dashboard and performed real Gmail API reads.

Sanitized observed progress before the later provider stop:

```text
DPAPI PREFLIGHT                          PASS BY CONTROL-FLOW OBSERVATION
REAL OAUTH PATH                          REACHED
REAL GMAIL API PATH                      REACHED
MESSAGES ENUMERATED                      450
FINANCIAL EVIDENCE CREATED               7
CANONICAL MOVEMENTS                      7
REVIEW PENDING                           0
FINAL VIEWER STATE                       STOPPED_SAFE
STOP CLASS                               GMAIL_API_ERROR
COMPLETE CLAIM                           NO
```

The account identity, OAuth credential material, Gmail message content and transaction details from the physical run are intentionally omitted from this repository evidence.

## Why DPAPI is physically closed

The validated one-click topology is fail-closed and ordered as:

```text
WINDOWS DPAPI PREFLIGHT
        -> OAuth credential picker
        -> OAuth authorization
        -> Gmail viewer
```

The physical run reached the OAuth picker, authorization and Gmail reads. Therefore the DPAPI preflight on the owned Windows user context necessarily returned PASS before those later stages were reachable.

This closes only:

```text
WINDOWS_DPAPI_CURRENT_USER_PREFLIGHT     PASS_USER_OBSERVED
```

## What this does NOT prove

This evidence does not promote any of the following:

```text
REAL_GMAIL_HISTORICAL_COVERAGE_COMPLETE  NO
NEXT_PAGE_TOKEN_EXHAUSTED                 NO
ALL_GMAIL_TRANSACTION_EVIDENCE_ENUMERATED NO
RAW_GMAIL_CONTENT_NON_DURABILITY_PHYSICAL NO NEW CLAIM
BANK_LEDGER_COMPLETENESS                  NEVER CLAIMED
PRODUCTION_READY                          NO
```

The run stopped safely after a Gmail API error. Because `COMPLETE` is allowed only after `nextPageToken` exhaustion, partial progress cannot be promoted to historical completeness.

## Checkpoint interpretation

The historical importer persists state only after a page reaches the page-commit barrier. The observed `STOPPED_SAFE` therefore demonstrates fail-closed behavior rather than a false completion. A subsequent run may resume from the last durable page checkpoint under the existing encrypted-local-state contract.

## Evidence-strength limitation

This is a sanitized user-observed physical evidence record. The exact local Git HEAD was not independently machine-attested inside the public receipt, so this document does not claim an immutable code-to-device receipt binding.

That limitation does not change the observed DPAPI property, but it prevents stronger wording such as `PASS_BOUND_PHYSICAL_RECEIPT`.

## Governing result

```text
WINDOWS DPAPI PREFLIGHT                   PASS_USER_OBSERVED
REAL GMAIL EXECUTION                      PARTIAL / STOPPED_SAFE
REAL HISTORICAL COVERAGE                  OPEN
Q-003                                     ACTIVE
BUILD_READY                               NO
```
