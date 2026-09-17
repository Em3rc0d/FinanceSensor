# Alpha.2 +2013 — OD0 native stderr false-negative receipt — 2026-09-17

## Classification

- Candidate: `0.2.0-alpha.2+2013`
- Signed APK SHA-256: `4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387`
- Harness revision observed: `OD0_HARNESS_V2_ARRAY_SAFE_VERSION_CHECK`
- Terminal classification: `HARNESS_FALSE_NEGATIVE_NATIVE_STDERR`
- Candidate invalidated: **NO**
- Rebuild required: **NO**
- Re-sign required: **NO**
- Physical Alpha.2 PASS: **NO**
- BUILD_READY: **NO**
- RELEASE_READY: **NO**

## Sanitized physical observation

User-provided terminal output shows that the exact signed +2013 identity reached the data-preserving install path and passed the post-install version check before the harness terminated at the launcher command.

User-provided screenshots subsequently show, without being committed to GitHub, that:
- the application UI was visible on-device;
- Gmail-backed runtime state was active;
- protected statement-profile prompts were rendered;
- a financial view was materially rendered from observed data.

No screenshots, merchant names, transaction amounts, Gmail content, account identifiers, PDF passwords, OAuth material, device serials, or financial plaintext are stored in this repository receipt.

These observations establish that the application did launch in reality, but they do **not** promote `PHYSICAL_ALPHA2_PASS`: the OD0 machine-readable receipt was not generated and the remaining owned-device UAT gates are not yet certified.

## Root cause

Windows PowerShell 5 treated text emitted by the native `adb shell monkey` command on stderr (for example its informational `args: [...]` line) as a `NativeCommandError` because the harness runs with `$ErrorActionPreference='Stop'`.

The native process can therefore succeed and launch the application while PowerShell aborts before evaluating `$LASTEXITCODE` or writing the OD0 receipt.

## Remediation law

Harness revision 3 must:
1. preserve the exact +2013 APK and signer identity;
2. capture native stdout/stderr without allowing informational stderr to become a terminating PowerShell exception;
3. decide launch success from the native process exit code;
4. confirm the application process is running after launch without force-stop, uninstall, or data clearing;
5. retain revision-2 package/version checks and all privacy boundaries;
6. generate a fresh sanitized OD0 PASS receipt before OD0 is formally closed.

The device does not need a new candidate, rebuild, or signature.
