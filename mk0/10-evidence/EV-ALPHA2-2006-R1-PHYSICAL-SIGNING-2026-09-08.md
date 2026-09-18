# EV — Alpha.2 +2006 R1 trusted-edge physical signing — 2026-09-08

## Accepted sanitized receipt

The owned Windows trusted edge signed the exact frozen Alpha.2 `0.2.0-alpha.2+2006` canonical input using the private `FINANCESENSOR_R2_LAB` authority. Only the generated sanitized receipt enters GitHub; no keystore, password, private key, OAuth token, Gmail body/MIME, Gmail identifier, statement PDF, PDF password, account number or financial plaintext is committed.

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2006
SOURCE_COMMIT=e26bab7cd87c5e686898998e867d8fb25c99db27
CANONICAL_RUN_ID=34278019055
CANONICAL_ARTIFACT_ID=10076715491
INPUT_APK_SHA256=11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179
INPUT_APK_BYTES=182102047
SIGNED_APK_SHA256=36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0
SIGNED_APK_BYTES=182125094
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0
REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0
REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0
ALPHA2_MOBILE_INTEGRATION_CI=PASS
ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

## Reducer / authority checks

The +2006 receipt reducer requires exact equality for candidate, source SHA, canonical run/artifact, canonical input APK SHA/bytes, stable signer SHA1, Android OAuth package, exact Gmail scope, CI integration marker and all non-promotion/privacy markers. `SIGNED_APK_SHA256` and `SIGNED_APK_BYTES` are the only dynamic signing outputs; the hash must be lowercase SHA256, differ from the canonical CI input hash, and the byte count must be positive.

Accepted stable authority:

- Stable APK SHA256: `36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0`
- Stable APK bytes: `182125094`
- Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Package: `com.financesensor.lab.gmailconnection.r2`
- Scope: `gmail.readonly`
- Canonical source: `e26bab7cd87c5e686898998e867d8fb25c99db27`
- Canonical run: `34278019055`
- Canonical artifact: `10076715491`

The historical `+2005` stable receipt remains historical and cannot donate OD evidence to `+2006`.

## State transition

```text
R1_TRUSTED_EDGE_SIGNING=PASS
R2_OWNED_DEVICE_CAMPAIGN=READY
R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH
OD0=READY_FOR_PHYSICAL
OD1..OD11=BLOCKED_BY_PRIOR_GATE
PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

R1 PASS is evidence from the owned trusted edge. Public CI may re-run the reducer, validate the sanitized binding, reproduce the already frozen public-safe v8 bundle and enforce non-promotion/privacy laws. Public CI must not manufacture or claim the physical signing event.

## Next physical boundary

OD0 must use exactly the stable APK whose SHA256 is `36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0`. OD0 closes only after the owned Android proves hash/signer binding, installation and launch. OAuth, Gmail, SQLCipher and downstream Alpha.2 claims remain open until their own gates execute.

## Reopen rule

Any change to the +2006 source commit, canonical input APK identity, stable signed APK identity, signer SHA1, Android package or exact Gmail scope invalidates this current binding and reopens R1/R2 according to the frozen source/APK identity law.
