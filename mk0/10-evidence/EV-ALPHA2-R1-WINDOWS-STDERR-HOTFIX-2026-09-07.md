# EV — Alpha.2 R1 Windows native stderr hotfix — 2026-09-07

## Trigger

The first physical R1 signing attempt selected the canonical Alpha.2 APK and reached the frozen candidate identity, but Windows PowerShell 5.1 surfaced the native `keytool.exe` password prompt written to stderr as `NativeCommandError` while `$ErrorActionPreference = 'Stop'` was active.

Observed boundary before failure:

- candidate `0.2.0-alpha.2+2001`
- source `f658363772b8d3652a81a8a4275a571f2f409ed8`
- canonical input SHA256 `7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f`
- physical signing did **not** complete
- no output APK from that attempt is authoritative

## Root cause

The Alpha.2 signer used the PowerShell pipeline to feed stdin to native `keytool`/`apksigner`. On Windows PowerShell 5.1 a native process writing a prompt to stderr can be promoted to a PowerShell error record, aborting execution even when that stderr line is only an interactive prompt.

## Correction

The signer now invokes native Java/keytool processes through `System.Diagnostics.ProcessStartInfo` with:

- `UseShellExecute = false`
- redirected stdin/stdout/stderr
- explicit stdin password lines
- process exit code as the failure authority
- no password in CLI arguments or environment variables

The same wrapper is used for input verification, keystore listing, signing and signed-output verification, removing the native-stderr ambiguity from the entire trusted-edge signing path.

## Boundary

This is a tooling compatibility correction only. It does not change the canonical APK, package, OAuth scope, expected signer identity, source commit, candidate version or R1/R2 readiness state.

```text
R1_TRUSTED_EDGE_SIGNING=OPEN
SIGNED_APK_SHA256=NULL
R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1
BUILD_READY=NO
RELEASE_READY=NO
```
