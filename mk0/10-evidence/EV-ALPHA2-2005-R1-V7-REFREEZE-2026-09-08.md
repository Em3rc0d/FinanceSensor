# EV — Alpha.2 +2005 R1 trusted-edge bundle v7 refreeze — 2026-09-08

## Trigger

Owned-device +2004 reached the session-only BCP Savings password handoff and then stopped safely downstream. PR #107 repaired a real call-path defect: native statement attachment-fetch rejection is now candidate-local instead of aborting the full financial refresh. Because runtime identity changed, +2004 cannot donate R1/R2 physical claims to +2005.

## Stage A exact-SHA authority

- PR #108 certified head: `9d0e54a4cabddfa8a5e634bc6c2e58b4fe169f9b`
- Stage A merge/source SHA: `d99e7e4765adfc96bed9d914b2b6f296f9712242`
- Post-merge Integrated Runtime: run `34257413733`, job `102166618707`, SUCCESS
- Canonical artifact: `10068684066`, `financesensor-alpha2-2005-candidate-34257413733`
- Artifact wrapper SHA256: `536495ef92218477156c2cf95a3dc636071187b239750787788ccc1d1a32a7b2`
- Artifact wrapper bytes: `87250264`
- Canonical APK SHA256: `dacc7d7281842989904adfc1d3e7b17242b39b20674eb8e7c33e1e339428a44c`
- Canonical APK bytes: `182092699`
- Package: `com.financesensor.lab.gmailconnection.r2`
- Scope: `gmail.readonly`
- minSdk / targetSdk / compileSdk: `31 / 36 / 37`
- APK signature verification: PASS (public CI ephemeral debug signer only)
- aapt2 parse: PASS

Post-merge consensus on the exact source SHA also passed:

- Alpha.2 Design Freeze `34257418398`
- FinanceSensor Heartbeat `34257413806`
- FinanceSensor Public Readiness `34257413671`

## R1 v7 public-safe handoff freeze

An independent deterministic reproduction using the canonical post-merge APK, canonical CI evidence, the bundled public `apksigner.jar`, and the +2005 signer produced:

- Bundle: `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v7.zip`
- Bundle SHA256: `201cc603e2ce144b0848fbaaa793eaa669119bfeea8ffb027c8eec2fd24ef6b1`
- Bundle bytes: `86227523`
- Files: `8`
- Private-key files: `0`
- Secret-like value matches: `0`
- ZIP integrity: PASS
- Manifest integrity: PASS
- Signer PS1 Git blob: `5c0ec28fa27ed0a67547c4b1d0c59c07c6c26911`
- Signer CMD Git blob: `3d01373b69051d30f88a57f26fa815e52d952d6d`
- `apksigner.jar` SHA256: `2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180`

Public CI must reproduce these exact bundle bytes before merge.

## Explicit non-claims

- R1 stable signing is **OPEN** until the private `FINANCESENSOR_R2_LAB` keystore signs the exact canonical +2005 input on the owned trusted edge.
- The private keystore, password and private key are not present in GitHub or in this bundle.
- No public CI job may claim stable signing, physical Alpha.2 PASS, BUILD_READY or RELEASE_READY.
- R2 remains blocked until a sanitized +2005 signing receipt proves the frozen signer SHA1 `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`.
- +2004 physical observations remain historical only and are not inherited.

## Current state

`R1_TRUSTED_EDGE_SIGNING=OPEN`

`R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1`

`PHYSICAL_ALPHA2_PASS=NO`

`BUILD_READY=NO`

`RELEASE_READY=NO`
