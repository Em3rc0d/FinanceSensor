# PF-EXP-001 — Gmail source discovery and C0/G0 preflight

**Date:** 2026-11-16  
**Status:** `C0_BLOCKED / G0_NOT_RUN / G1_G4_NOT_RUN`

## Narrowed candidate inventory

| Alias | Profile | Mail date | Evidence | Cycle |
|---|---|---|---|---|
| BCP_SAVINGS_C01 | BCP savings | 2026-09-04 | One advertised PDF attachment; the accompanying email refers to July 2026 | Not verified against the PDF |
| RIPLEY_CREDIT_C01 | Ripley credit | 2026-10-30 | One advertised PDF attachment | Unknown |
| RIPLEY_CREDIT_C02 | Ripley credit | 2026-08-28 | Alternate advertised PDF attachment | Unknown |

The bank email arrival date must **never** be asserted as the accounting cycle start or end. No account identifiers, transaction amounts, names, raw mail, filenames, or private attachment/message identifiers are stored here. Searching Gmail and reading a limited email body established only candidate metadata, not completeness.

## Access blocker

Gmail metadata showed PDF attachments eligible for retrieval, but `read_attachment` failed for both selected BCP/Ripley candidates using the attachment ID and the exact filename. Therefore no PDF bytes, password, page geometry or financial figures were obtained. This does not constitute a parser regression, nor evidence that the documents are malformed.

## Executed technical check

A separate local package `PF-EXP-001-G0` contains a PDF **structure-only** probe and independent-oracle **structure-only** validator. Native Python execution against synthetic plain, password-protected and malformed PDFs: **11/11 tests PASS** (5 PDF + 6 oracle). Private statement contents, passwords, amounts or source paths are never printed; none are saved to GitHub. The synthetic oracle deliberately cannot mark G0 PASS.

This proof is limited to the protocol tools. It does **not** prove the Gmail attachment reader, any bank parser, real cycle completeness, bank reconciliation or financial truth.

## Must happen before C0 can close

1. Obtain original statement copies securely through a user-authorized **local** environment, without publishing raw source, Gmail attachment or password to AI prompts or GitHub.
2. Verify exact covered cycles, pages, accounts, currencies and completeness from the **PDF itself**, not its email.
3. Prepare the **independent manual oracle**: each original statement row, page location, signed minor units, currency, opening/closing balance and reviewer provenance. Never copy labels from the parser.
4. Freeze Excel/alternative comparison procedure, V01/V02 metrics, source retention/deletion policy and the old MK0 scope-change record.
5. Issue human-approved C0 receipt. Only then begin actual G0 gate verification.

A selected candidate or a passing structural validator cannot substitute for independent source review. **No APK, Actions, repository merge, physical Gmail financial certification or public product release authorized.**

Sanitized machine receipt: `receipts/GMAIL-SOURCE-DISCOVERY-2026-11-16.json`.
