# Alpha.2 +2009 — one-pass owned-device UAT

This checklist is certification-only. The owner is not asked to test each OD gate separately.

The single physical run is acceptable only if all of the following are observed on the exact stable-signed APK `7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a`:

1. Exact APK installs without clearing app data and launches.
2. Gmail authorization succeeds for package `com.financesensor.lab.gmailconnection.r2` and exact scope `gmail.readonly`.
3. Statement discovery remains metadata-first and only the allowed BCP SAVINGS profile may fetch/import statement bytes.
4. The PDF password is entered locally, is session-only, and is not persisted.
5. A rejected individual statement import does not kill the entire refresh.
6. The old visible failure `ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED` must not prevent safe projection materialization.
7. The user reaches a financial view showing the information actually supported by the available evidence: accounts/sources, movements or summaries, inflow/outflow, gaps/review state and sensor projection as applicable.
8. No unsupported balance, completeness claim, cross-currency reconciliation, or automated financial advice is synthesized.
9. A same-candidate second refresh does not create duplicate canonical movements.
10. The app remains fail-closed for unsupported statement profiles and ambiguous reconciliation.

The evidence returned to GitHub must be sanitized. Do not commit raw Gmail bodies, message/attachment identifiers, OAuth tokens, PDFs, PDF passwords, account numbers, merchant-level financial plaintext, device serials, or keystores.

`FINANCIAL_VIEW_MATERIALIZED` is the explicit acceptance claim that closes the user-visible issue "no vi mi dinero". It cannot be inferred from CI; it requires this physical run.
