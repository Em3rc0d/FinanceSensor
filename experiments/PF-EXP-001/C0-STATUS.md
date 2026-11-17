# PF-EXP-001 C0 — Scope and metrics receipt

**Decision:** `BLOCKED_MISSING_INDEPENDENT_ORACLE_AND_PERIOD` (2026-11-16)

| Candidate | Period/cycle | Real completeness | State |
|---|---|---|---|
| BCP savings | exact closed month TBD | not established | NOT_SELECTED |
| Ripley credit | exact billed cycle TBD | not established | NOT_SELECTED |
| Matching Gmail notifications | precise matching scope only | not established | OPTIONAL_NOT_AUTHORIZED |

**Responsible authority:** financial account owner / separately assigned independent oracle reviewer. No passwords or private financial documents committed. No Gmail inbox crawl authorized by this receipt.

**Proposed preregistration (ratification pending):** M01 invented amounts=0; M02 confirmed double count=0; M03 false merges=0; M04 ledger drift on 1/10/100 imports=0; M05 unexplained balance difference=0 for CLOSED_VERIFIED; M06 all reference transactional rows correctly covered for CLOSED_VERIFIED; V01 >=25% less matched human work vs preregistered Excel/other baseline; V02 <=5 min weekly maintenance over actual weeks.

**C0 cannot close until:** (a) exact periods and complete documents verified; (b) independent source-row oracle established; (c) evaluation roles and baseline frozen before running; (d) private custody/retention/deletion agreed; (e) old MK0 scope change explicitly recorded.

**Current evidence:** source code and contract reviewed; 28 test cases inventoried; 4/4 synthetic protocol-integrity tests run locally; 14/14 *embedded V8* semantic smoke checks against the fetched resolver with mock hash/UUID (not native Node test, not real PDF). Financial G0–G4 remain NOT_RUN. 0 APK, 0 real banking files processed.

Next possible step after C0 approval: execute existing resolver regressions on a trusted local Node 22 checkout, then G0-protected BCP/Ripley parser experiments against independent oracles. No Android build is authorized.

## Follow-up: native Node regression milestone

- **25/25 local native assertions PASS**: 14 synthetic core resolver, 7 new adversarial safety, 4 C0 protocol shape checks.
- Source correction is isolated to `jett/pf-exp-001-c0-preflight`, Git blob `e8e7193a36f40eb92654fb11c9e56ea65cfdd64b`.
- Full repository canonical baseline suite: `NOT_RUN` (only verified resolver source snapshot locally).
- BCP/Ripley real source G0–G4: `NOT_RUN` and C0: `BLOCKED` until independent oracle and exact source periods are approved.
- This follow-up supersedes only the earlier V8-smoke description for the new native subset; it does not retroactively certify financial accuracy.

## Synthetic reconciliation follow-up — no financial gate closure

- 2026-11-16: 31/31 new Node native reconciliation prechecks on synthetic rows, plus 25/25 prior Node and 11/11 Python synthetic preflight checks = **67/67 PASS**.
- Source / tests blobs: `b95f03cb6ef5472b5a12cb082380a50f17b35985`, `b42d2027caab69397ecb40ab3379ec8f0f62ccd5`.
- **C0 remains BLOCKED. G0–G4 remain NOT_RUN.** No real PDF, account balance or independent reviewer attestation verified.
- Source of truth: `receipts/SYNTHETIC-RECONCILIATION-V3.json`.
