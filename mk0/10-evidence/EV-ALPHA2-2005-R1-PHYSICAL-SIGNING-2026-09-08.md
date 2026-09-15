# EV — Alpha.2 +2005 R1 trusted-edge physical signing — 2026-09-08

## Accepted sanitized receipt

The owned Windows trusted edge signed the exact frozen Alpha.2 `0.2.0-alpha.2+2005` canonical input using the private `FINANCESENSOR_R2_LAB` authority. Only the generated sanitized receipt entered GitHub; no keystore, password, private key, OAuth token, Gmail body, statement PDF, PDF password or financial plaintext is committed.

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2005
SOURCE_COMMIT=d99e7e4765adfc96bed9d914b2b6f296f9712242
CANONICAL_RUN_ID=34257413733
CANONICAL_ARTIFACT_ID=10068684066
INPUT_APK_SHA256=dacc7d7281842989904adfc1d3e7b17242b39b20674eb8e7c33e1e339428a44c
INPUT_APK_BYTES=182092699
SIGNED_APK_SHA256=530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85
SIGNED_APK_BYTES=182116902
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0
REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0
REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0
ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

## Reducer / authority checks

The repository reducer for +2005 requires exact equality for candidate, source SHA, canonical run/artifact, canonical input APK SHA/bytes, stable signer SHA1, Android OAuth package, exact Gmail scope and all non-promotion/privacy markers. `SIGNED_APK_SHA256` and `SIGNED_APK_BYTES` are the only dynamic signing outputs; the hash must be lowercase SHA256, differ from the canonical CI input hash, and the byte count must be positive.

The accepted receipt therefore closes only R1 stable signing and binds the single stable-signed APK identity for the R2 owned-device campaign:

- Stable APK SHA256: `530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85`
- Stable APK bytes: `182116902`
- Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Package: `com.financesensor.lab.gmailconnection.r2`
- Scope: `gmail.readonly`

The historical +2003 receipt remains historical and cannot be inherited as current authority.

## State transition

```text
R1_TRUSTED_EDGE_SIGNING=PASS
R2_OWNED_DEVICE_CAMPAIGN=READY
R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH
OD1..OD11=BLOCKED_BY_PRIOR_GATE
PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

R1 PASS is evidence from the owned trusted edge. Public CI is permitted only to re-run the reducer, validate the sanitized binding, reproduce the already frozen public-safe v7 bundle and enforce non-promotion/privacy laws. It must not manufacture or claim the physical signing event.

## Reopen rule

Any change to the +2005 source commit, canonical input APK identity, stable signed APK identity, signer SHA1, Android package or exact Gmail scope invalidates this current binding and reopens R1/R2 according to the frozen source/APK identity law.
