# Alpha.2 +2013 — OD0 harness false-negative receipt — 2026-09-17

## Classification

- Candidate: `0.2.0-alpha.2+2013`
- Signed APK SHA-256: `4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387`
- Observed OD0 result code: `OD0_VERSION_CODE_MISMATCH_AFTER_INSTALL`
- Classification: `HARNESS_FALSE_NEGATIVE`
- Candidate invalidated: **NO**
- Rebuild required: **NO**
- Re-sign required: **NO**
- Physical Alpha.2 PASS: **NO**
- BUILD_READY: **NO**
- RELEASE_READY: **NO**

## Evidence

The +2013 canonical build authority used `flutter build apk --debug --build-number 2013` and its exact canonical workflow required `aapt2 dump badging` to contain `versionCode='2013'` before freezing the canonical APK identity.

The first OD0 harness revision installed the exact stable-signed APK with `adb install -r`, then evaluated the multi-line result of `adb shell dumpsys package` using PowerShell collection `-notmatch` semantics:

```powershell
if($packageState -notmatch "versionCode=$VersionCode\b"){ ... }
```

For a collection, `-notmatch` returns the elements that do not match. Because a normal `dumpsys package` response contains many non-version lines, the resulting non-empty collection is truthy even when one line correctly contains `versionCode=2013`. The gate therefore produced a false negative.

## Remediation law

OD0 harness revision 2 must:

1. preserve the exact +2013 signed APK identity and signer;
2. add pre-install `aapt2 dump badging` checks for package and `versionCode=2013`;
3. convert post-install package output to an explicit aggregate boolean via an array-safe helper;
4. include a self-test fixture where a multi-line package state containing `versionCode=2013` passes and `2012` fails;
5. continue to use only `adb install -r`; uninstall and `pm clear` remain forbidden;
6. infer no physical PASS from the failed first attempt.

The already-installed device state from the first attempt is not promoted to evidence. OD0 must be rerun using the corrected handoff and must generate a fresh sanitized PASS receipt before any later physical gate can advance.
