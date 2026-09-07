# EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07

## Status

`CANONICAL_CANDIDATE_RECEIPT=PASS`

This evidence freezes the single Alpha.2 APK allowed to advance from public CI into trusted-edge signing.

## Candidate identity

- Candidate: `0.2.0-alpha.2+2001`
- Certified PR head: `3640244fb12aabf818b002399f3b7cc28fbde14c`
- Merge/source SHA: `f658363772b8d3652a81a8a4275a571f2f409ed8`
- Canonical workflow: `Alpha.2 Integrated Runtime`
- Run ID: `34082101187`
- Job ID: `101619210181`
- Artifact ID: `10004110513`
- Artifact ZIP SHA256: `812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736`
- APK path: `build/app/outputs/flutter-apk/app-debug.apk`
- APK bytes: `182053563`
- APK SHA256: `7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f`

The APK hash above was independently recomputed from the downloaded artifact and matches the CI evidence embedded in that artifact.

## Post-merge consensus

The merge SHA reproduced the integrated runtime, Mobile Shell, Human Test regression boundary, Gmail connection, Statement ETL, Public Readiness, Design Freeze, and Heartbeat workflows successfully. The Human Test workflow remains regression-only for Alpha.2 because that workflow still builds the bounded legacy harness and its own evidence declares `ALPHA2_MOBILE_INTEGRATION=OPEN`.

## Artifact authority

Only artifact `10004110513` is canonical for Alpha.2 trusted-edge signing.

`FinanceSensor Mobile Shell` also compiled the integrated runtime, but its independently generated ephemeral debug signature produces a different APK digest. It is a compile/replay corroboration artifact, not the signing input.

`FinanceSensor Android Human Test Alpha` artifact `10004093091` is explicitly non-authoritative for Alpha.2. It remains valuable as a regression harness for the previously proven Gmail/OAuth boundary.

## Trusted-edge boundary

Expected stable signer SHA1:

`63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`

Package: `com.financesensor.lab.gmailconnection.r2`

Scope: `gmail.readonly`

Public GitHub CI contains no private signer and executes no real OAuth, Gmail, or financial data.

## Closure state

```text
CANONICAL_ALPHA2_CANDIDATE      PASS
TRUSTED_EDGE_SIGNING            OPEN
OWNED_DEVICE_INSTALL            OPEN
REAL_OAUTH                      OPEN
REAL_GMAIL                      OPEN
PHYSICAL_SQLCIPHER              OPEN
PHYSICAL_EECC_BCP_SAVINGS       OPEN
PHYSICAL_ALPHA2_A_G             OPEN
BUILD_READY                     NO
RELEASE_READY                   NO
```

No downstream physical PASS may be inherited from candidate `0.1.0-alpha.1+1001` or from any non-canonical artifact.
