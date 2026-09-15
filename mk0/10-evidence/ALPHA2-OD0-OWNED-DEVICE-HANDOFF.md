# Alpha.2 +2009 — consolidated owned-device certification handoff

**Status:** READY FOR ONE CONSOLIDATED OWNED-DEVICE UAT

The current canonical product candidate is `0.2.0-alpha.2+2009`. R1 trusted-edge signing has passed and the exact stable-signed APK identity is frozen. The next human interaction is certification-only: one continuous owned-device run, not exploratory testing and not one manual test per OD gate.

## Frozen identity

- Candidate: `0.2.0-alpha.2+2009`
- Product source commit: `9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f`
- Canonical source commit: `e19bcccee13e326bbc08012533ddaeba026c633a`
- Canonical unsigned APK SHA-256: `1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717`
- Stable-signed APK SHA-256: `7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a`
- Stable-signed APK bytes: `182538790`
- Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Gmail scope: `gmail.readonly`
- Sanitized signing receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json`

```text
TRUSTED_EDGE_SIGNING_PASS=YES
OD0_EXECUTION_ALLOWED=YES
OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES
HUMAN_UAT_ELIGIBLE=YES
FINANCIAL_VIEW_MATERIALIZED=PHYSICAL_CERTIFICATION_REQUIRED
```

## One continuous run

Keep the generated `FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2009.apk` beside `RUN-FINANCESENSOR-ALPHA2-OD0.cmd`, connect one authorized Android device, then execute the CMD. The harness verifies the exact stable-signed APK hash, installs with `adb install -r` without clearing app data, launches the package, confirms the process is alive, and emits only a sanitized receipt.

Then continue **inside the app once**:

1. Connect Gmail using the exact `gmail.readonly` authorization.
2. Allow FinanceSensor to discover statement candidates.
3. When `BCP · SAVINGS` requests the PDF password, enter it locally in the app.
4. Trigger the refresh/build action once.
5. Certification target: the financial view must materialize even if an individual statement import is rejected safely. The old fatal `ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED` behavior must not prevent the safe Gmail-derived projection from appearing.
6. Verify the visible financial experience is useful: accounts/sources, movements or summaries, inflow/outflow separation, gaps/review state, and the financial sensor projection should be visible where data supports them. Do not infer unsupported numbers.
7. A second refresh on the same candidate must not duplicate canonical movements.

Return only the sanitized OD0 receipt and the final visible result needed for certification. Do **not** return passwords, OAuth tokens, raw Gmail content, raw PDFs, account numbers, or transaction plaintext.

`OLD_2008_OD0_HANDOFF = SUPERSEDED / FORBIDDEN`

`OD0_PASS != R2_PASS`

`R2_PHYSICAL_PASS requires FINANCIAL_VIEW_MATERIALIZED=YES from the consolidated physical observation.`

`R2_PASS != BUILD_READY`

`R2_PASS != RELEASE_READY`
