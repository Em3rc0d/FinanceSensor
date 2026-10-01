# Alpha.2 +2012 — physical scan failure receipt

Date: 2026-09-15
Candidate: `0.2.0-alpha.2+2012`
Signed APK SHA-256: `05ee3efd70bb07fe11bde6a21140c03de3ffa872b5f90e7a1014b5106b4b3000`

## Observed physical sequence

1. The exact signed +2012 APK installed and launched on the owned Android device.
2. The Gmail authorization flow reached the connected product state.
3. The first real financial refresh did not materialize a financial view.
4. The product stopped fail-closed at the source-reading stage and surfaced the safe diagnostic `ALPHA2_REFRESH_SCAN_FAILED`.
5. Re-entering the connected surface did not produce evidence that the failed refresh had succeeded.

No raw Gmail body, Gmail identifier, OAuth bearer, statement PDF, PDF password, account number or financial plaintext is recorded in this receipt.

## Engineering diagnosis

The product-level diagnostic localizes the failure before Gmail evidence persistence, statement PDF parsing, vault readback, canonical runtime and public projection. The current native `scanFinancialSources` implementation executes the transaction scanner and statement-discovery scanner serially inside one try/catch boundary. A safe exception or I/O failure from either scanner aborts the complete refresh. Both discovery paths also rely on bounded per-request HTTP timeouts, so a single transient mobile-network/API failure can terminate the whole scan.

The exact lower-level native failure code is intentionally not reconstructible from the screenshot because the Dart pipeline sanitizes every scan-stage exception into `ALPHA2_REFRESH_SCAN_FAILED`. Therefore this receipt does not invent a more specific HTTP or transport root cause.

## Candidate law

`+2012` is retained as historical evidence only. It does not receive `PHYSICAL_ALPHA2_PASS`, `BUILD_READY` or `RELEASE_READY`.

Any source fix creates a new candidate identity and may not inherit +2012 physical PASS claims. The remediation branch is `jett/alpha2-2013-scan-resilience-20260915`.

## Required remediation

- isolate transaction and statement discovery outcomes;
- allow one safe source to continue when the other fails;
- retry only bounded transient conditions;
- keep 401/reauth fail-closed;
- expose only sanitized diagnostics;
- preserve no-raw-Gmail/no-token/no-attachment-during-discovery boundaries;
- add automated regression coverage before cutting the next canonical APK.
