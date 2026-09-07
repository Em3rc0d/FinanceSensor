# EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07

## Status

`CANONICAL_CANDIDATE_RECEIPT=PASS`

The owned-device installability observation invalidated the previous `+2001` candidate for this campaign. The repaired `+2002` artifact is now the only public-CI APK allowed to advance into trusted-edge signing.

## Candidate identity

- Candidate: `0.2.0-alpha.2+2002`
- Repair PR head: `81513c047f8bbf627eae64537be90a5f909328fb`
- Merge/source SHA: `3e83fbaa74c31b11fb46cccfa3a5c31d882d4093`
- Canonical workflow: `Alpha.2 Integrated Runtime`
- Run ID: `34163911830`
- Job ID: `101871077983`
- Artifact ID: `10033624133`
- Artifact ZIP SHA256: `3f1d463fee5292ccfa1d0ec2b2b316b83183158459fee48af3afd2eca861db6c`
- APK path: `build/app/outputs/flutter-apk/app-debug.apk`
- APK bytes: `176012379`
- APK SHA256: `a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf`
- Android minSdk: `24`
- Android targetSdk: `36`
- `apksigner verify`: `PASS`
- `aapt2 dump badging`: `PASS`

The artifact ZIP digest and APK digest/size were independently recomputed after downloading the exact post-merge artifact. Its embedded evidence reports the same source SHA, package, scope, SDK values, APK digest and byte count.

## Supersession

```text
OLD_CANDIDATE                    0.2.0-alpha.2+2001
OLD_APK_SHA256                   7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
OLD_STATUS                       SUPERSEDED
REOPEN_TRIGGER                   OWNED_DEVICE_INSTALLABILITY_FAILURE_MINSDK31
NEW_CANDIDATE                    0.2.0-alpha.2+2002
```

The pre-merge `+2002` artifact `10033487002` with APK SHA256 `756c1697332e487f748d6a283c8069285aeb08afde5f59806ca0fa202985215d` is corroboration only. Its debug signer/merge-ref provenance is not the canonical post-merge binary authority.

## Trusted-edge boundary

Expected stable signer SHA1:

`63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`

Package: `com.financesensor.lab.gmailconnection.r2`

Scope: `gmail.readonly`

Public GitHub CI contains no private signer and executes no real OAuth, Gmail, or financial data. The currently observed OAuth failure on the CI-debug-signed APK is not promoted to a provider conclusion; the next valid OAuth observation must use the stable R2 signer.

## Closure state

```text
CANONICAL_ALPHA2_CANDIDATE      PASS
TRUSTED_EDGE_SIGNING            OPEN
OWNED_DEVICE_INSTALL            OPEN_FOR_STABLE_SIGNED_2002
REAL_OAUTH                      OPEN
REAL_GMAIL                      OPEN
PHYSICAL_SQLCIPHER              OPEN
PHYSICAL_EECC_BCP_SAVINGS       OPEN
PHYSICAL_ALPHA2_A_G             OPEN
BUILD_READY                     NO
RELEASE_READY                   NO
```
