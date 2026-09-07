# EV — R2 signer Windows stdin password transport fix

**Date:** 2026-09-06  
**Candidate:** `0.1.0-alpha.1+1001`  
**Input APK SHA-256:** `c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d`

## Physical defect observed

The first Windows trusted-edge attempt reached the certified input hash but `keytool.exe` failed to resolve `FINANCESENSOR_R2_STORE_PASS` when using `-storepass:env`.

This was a tooling defect, not a keystore or APK defect.

## Repair

`tools/SIGN-FINANCESENSOR-R2.ps1` now:

- keeps the exact certified input hash pin;
- keeps exact signer SHA-1 verification;
- supplies the keystore password to `keytool` through standard input instead of an environment-variable reference;
- supplies keystore and private-key passwords to Android `apksigner` using the documented `--ks-pass stdin` and `--key-pass stdin` modes;
- does not place passwords in command-line arguments or files;
- still deletes partial output on any signing or verification failure;
- still makes no deterministic .NET string-zeroization claim.

## Authority

Android documents `stdin` as a supported input format for both `--ks-pass` and `--key-pass`.

- https://developer.android.com/tools/apksigner

## Boundary

This repair changes only local trusted-edge signing password transport. It does not alter:

- Android package;
- OAuth scope;
- certified input APK;
- expected stable signer identity;
- Alpha.2 runtime;
- `BUILD_READY=NO`;
- `RELEASE_READY=NO`.

The subsequent successful trusted-edge receipt is recorded separately and is the physical authority for the signed output.
