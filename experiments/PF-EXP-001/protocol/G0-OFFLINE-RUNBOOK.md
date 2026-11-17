# PF-EXP-001 G0 — Secure local-only document preflight

**Status:** PREPARED / NOT_EXECUTED_ON_REAL_STATEMENTS. These tools do not grant G0 PASS.

## Authorized execution environment

Use a user-owned local device or authorized Work Desktop local runtime. The agent must not upload raw Gmail PDF, account identifiers, full transaction rows, or passwords to a cloud AI prompt, GitHub, CI or analytics. Work Web is a *cloud* runtime and must not be silently substituted for local custody. Process **copies** of only the chosen bank statements in a protected, non-synced temporary folder. Disable unnecessary network access. The PDF parser processes untrusted files; use sandboxing / limited account permissions.

Python 3.11+; tested locally with Python, `PyMuPDF 1.26.7` and `ReportLab 4.4.9` (reportlab required for test PDFs, not for probing bank statements). Reproduce syntax and behavior:

```sh
python -m unittest discover -s experiments/PF-EXP-001/tests -p 'test_*precheck.py' -v
python -m unittest discover -s experiments/PF-EXP-001/tests -p 'test_private_pdf_probe.py' -v
python experiments/PF-EXP-001/tools/private_pdf_probe.py /PRIVATE/statement.pdf --source-class BCP_SAVINGS --password-prompt
python experiments/PF-EXP-001/tools/oracle_precheck.py /PRIVATE/independent_oracle.json
```

Only the first two commands are synthetic self-tests. The last two require authorized *private local* inputs and must not be run in CI. Never pass PDF passwords as command-line args or environment variables; password is requested by `getpass` in a real terminal.

## Exact source selection rule

For `BCP_SAVINGS_C01`, the September 4 email *mentions* July 2026; the PDF's actual first and last dates, all pages, account type, currency, opening/closing balances, and completeness must be established before C0. For Ripley (2026-10-30 / alternative 2026-08-28), the accounting cycle is **unknown** until inspected. The mail received date is not the statement date.

## Independent financial oracle

The reviewer must read the original full PDF without access to parser predictions and record each statement row, page/locator, signed amount in integer minor units, currency and meaning. BCP saving balance check is mechanically `opening + sum(signed movement rows) == closing` **only where the statement's sign and balance convention is independently confirmed**. Ripley credit statement balance mechanics are source-specific; avoid applying the BCP savings equation without proof. At least two distinct observation sources are needed for a dedup oracle.

`oracle_precheck.py` only checks shape, submitted arithmetic and absence of obvious red flags. It **cannot independently verify document completeness, actual balances, reviewer independence or whether the oracle was copied from the parser**. A synthetically fabricated manifest is never G0 proof.

## Publication and cleanup

Publish **only** one sanitized receipt with source aliases, gate statuses and numbers of test cases. Do not publish page text, amounts, balances, encrypted PDF bytes, filenames containing customer identities, Gmail message IDs, password hashes or individual financial rows. Delete temporary plaintext and derived caches; verify the secure disposal procedure appropriate to the local system, backups, and private folder policy. No claim of forensic erasure from simple file deletion.

**C0 remains BLOCKED. G0/G1/G2/G3/G4 remain NOT_RUN.** The human data owner must approve the exact periods, the independent reviewer and the local custody/baseline before performing financial evaluations.
