# Alpha.2 +2008 — OD0 owned-device handoff

This handoff executes only `OD0 — SIGNED_APK_INSTALL_AND_LAUNCH` for the already certified stable-signed Alpha.2 +2008 candidate.

## Frozen identity

- Candidate: `0.2.0-alpha.2+2008`
- Product source commit: `45b605d29fe0b90f528e4f0f952ab878080b2f0b`
- Stable-signed APK SHA-256: `a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277`
- Stable-signed APK bytes: `182538790`
- Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Gmail scope: `gmail.readonly`

Operational tooling added after this freeze does not change the product candidate or APK identity. Any product-source/APK identity change still reopens R1/R2.

## One-click execution

The public-safe bundle contains:

- `RUN-FINANCESENSOR-ALPHA2-OD0.cmd`
- `RUN-FINANCESENSOR-ALPHA2-OD0.ps1`
- this handoff document

The operator extracts the bundle on the owned Windows trusted edge, connects exactly one authorized Android phone, double-clicks the CMD, and selects the locally generated stable-signed +2008 APK. The harness verifies the exact APK hash, byte length and stable signer before touching the device.

The harness then removes any prior installation of the package, installs the exact stable-signed candidate, confirms package resolution, launches the launcher activity and confirms the app process is observed. It records only Android API level and coarse counts. Device serials, raw ADB output, tokens, Gmail content, financial plaintext, screenshots and private signing material are never written to the receipt.

## Receipt boundary

On PASS the harness writes `ALPHA2-R2-OWNED-ANDROID-OD0-<date>.json` using `A2_R2_SANITIZED_RECEIPT_V1`. `OD0` is PASS and `OD1..OD11` remain INCONCLUSIVE / not executed.

On failure it writes only `FinanceSensor-ALPHA2-R2-OD0-FAILURE.txt` with a stable result code. Raw command output is deliberately omitted.

Only the generated sanitized PASS JSON or sanitized failure TXT may be returned for ingestion.

`OD0_PASS != R2_PASS`

`OD0_PASS != BUILD_READY`

`OD0_PASS != RELEASE_READY`
