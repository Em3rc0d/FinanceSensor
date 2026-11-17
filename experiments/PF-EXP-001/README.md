# PF-EXP-001 — C0 preflight (no APK)

**Status:** C0_PROPOSED; G0–G4 NOT_RUN; no production authorization.

This experiment tests whether a *bounded, independently verified* financial period can be reconstructed accurately and with less human effort than a comparable Excel/other baseline. It does not certify the +2018 Android candidate.

Full contract SHA256: `fe6bdc1d7b89e224048d9601b75fcc6e86ac51714bc774a26dcd75b2b5b5373b` (original contract provided to the product owner separately).

Initial scope candidates: one complete BCP savings period; one complete Ripley credit cycle; matching Gmail emails only if separately authorized. Historical owned-device +2016 observation: 0 of 10 bank statements imported (7 BCP and 3 Ripley rejected). Newer +2018 has no certified physical closure.

**Blocking conditions:** choose exact source periods, independent row/balance oracle, private local custody and approved baseline; preserve raw financial sources/passwords outside GitHub and prompts.

**Acceptance:** no invented amounts; no false merges or double count; no unexplained balance differences for closed scope; real time savings vs comparable baseline. Synthetic preflight test results are not financial gate evidence.

**No build or CI:** this directory is documentary C0 groundwork only. Runner and synthetic test package remain as an independently delivered local ZIP until C0 authorization and reproducible native execution.

## Native regression milestone (2026-11-16, isolated experiment)

The source correction on this branch (blob `e8e7193a36f40eb92654fb11c9e56ea65cfdd64b`) was byte-for-byte checked against a local Node.js 22.16.0 snapshot. Executed: **14/14 existing synthetic contract assertions and 7/7 new safety assertions**; the separate C0 preflight package passed **4/4** protocol checks. Total local synthetic assertions: **25/25**.

Reproduce native engine assertions in a checkout of this **experimental branch**:

```sh
node --test experiments/PF-EXP-001/tests/canonical-resolver.test.mjs experiments/PF-EXP-001/tests/safety-boundary.test.mjs
```

The C0 protocol harness and 28-case registry are included in the downloadable local lab package, not yet committed in this branch. No Action, Android build, PDF, Gmail query or real ledger was executed. Do not interpret this as G0/G1/G2/G3/G4 closure.

**Bounded hardening:** tenant-specific same-evidence replay, conflicting reference fail-closed, finite positive amounts before admission and projection, and changed same-source amount routed to `EVIDENCE_REPLAY_CONFLICT` instead of silently discarded. No change has been merged into `jett/mk0-foundation`.

## C0/G0 Gmail source discovery (2026-11-16)

A bounded Gmail search located one BCP Savings email from 2026-09-04 (a July 2026 hint in the mail, unverified) and Ripley credit PDF candidates from 2026-10-30 and 2026-08-28. All three accounting cycles remain unconfirmed. Direct Gmail attachment retrieval failed by both filename and attachment ID, so there is **no original PDF, independent row oracle or balance proof**.

See `protocol/G0-SOURCE-DISCOVERY-2026-11-16.md` and the sanitized machine receipt under `receipts/`. A separate G0 local structural lab passed 11/11 synthetic tests (PDF password/error handling and oracle schema/arithmetic), but **C0 is blocked and G0–G4 are NOT_RUN**. This is not an approval to read financial documents in the cloud or to build an APK.

### Versioned G0 probe tools

The **exact** offline probe and oracle-precheck implementations tested on synthetic PDFs (5+6=11 PASS) are now in `tools/private_pdf_probe.py`, `tools/oracle_precheck.py`, corresponding `tests/test_*.py`, the synthetic fixture under `fixtures/synthetic/`, and `requirements-g0.txt`. See `protocol/G0-OFFLINE-RUNBOOK.md`. Reproducibility is demonstrated on synthetics; source completeness and independent bank truth remain unverified.

**Source discovery is not an approval:** authorized Gmail searches located plausible BCP/Ripley document notifications, but raw attachment retrieval failed. A local private original + independent oracle is required. No Gmail account contents or PDF original committed.

## V3 — Reconciliation precheck without financial gate promotion

The new independent `src/reconcile.mjs` module validates exact source-row identity, signed integer minor units, posting dates, source/currency isolation, expected-vs-observed records, duplicates, missing/phantom rows, and source-verified balance equation semantics for BCP savings or Ripley credit.

`tests/reconcile.test.mjs` contains **31 synthetic adversarial tests**, executed with Node 22.16.0; all passed. The existing 25 Node preflight+resolver checks and 11 Python PDF/oracle checks were rerun locally: **67/67 synthetic tests PASS**.

**These are technical prechecks only.** Even an input declaring `PRIVATE_ACCEPTANCE` and `verifiedAgainstSource=true` cannot advance G0/G2. No system should mistake those JSON claims for independently inspected bank statements.

Reproduce from repository root:

```sh
node --test experiments/PF-EXP-001/tests/*.test.mjs
python -m unittest discover -s experiments/PF-EXP-001/tests -p 'test_*.py' -v
```

Requires Python PyMuPDF and reportlab for the PDF tests (see `requirements-g0.txt`); no GitHub Actions. Sanitized receipt: `receipts/SYNTHETIC-RECONCILIATION-V3.json`.

**C0 BLOCKED; G0–G4 NOT_RUN:** Gmail shows candidate statements, but attachment retrieval failed and no user-owned original was processed in a private local environment. Exact periods, independent manual row oracle and physical bank reconciliation remain unverified.
