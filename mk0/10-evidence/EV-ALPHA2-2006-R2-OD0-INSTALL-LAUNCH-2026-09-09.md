# EV — Alpha.2 +2006 R2 OD0 install + launch

Date: 2026-09-09

## Authority

```text
CANDIDATE=0.2.0-alpha.2+2006
SOURCE_COMMIT=e26bab7cd87c5e686898998e867d8fb25c99db27
SIGNED_APK_SHA256=36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0
SIGNED_APK_BYTES=182125094
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
R1_TRUSTED_EDGE_SIGNING=PASS
```

## Physical observation

The owned Android device accepted the R1-bound stable APK and the application launched successfully. The first observed frame showed the application shell in its loading state. A subsequent observation showed the application in an interactive operational state with the primary controls enabled and the local dashboard rendered.

The application also hydrated previously available local/session state during launch. That observation is intentionally **not** promoted to OD1 evidence because this gate did not execute a fresh OAuth flow under the OD1 contract.

```text
OD0_SIGNED_APK_INSTALL=PASS
OD0_APPLICATION_LAUNCH=PASS
OD0_INTERACTIVE_RENDER=PASS
OD0=PASS

FRESH_OAUTH_EXECUTED_FOR_OD1=NO
OD1=READY
OD2..OD11=BLOCKED_BY_PRIOR_GATE
```

## Privacy boundary

Raw screenshots are not committed because they contain user financial presentation data. No OAuth token, Gmail identity, statement bytes, PDF password, account identifier, merchant-level sample, private signing material, or raw financial plaintext is preserved in this evidence artifact.

The repository receives only the sanitized incremental receipt:

`graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD0-2026-09-09.json`

## State transition

```text
R1_TRUSTED_EDGE_SIGNING=PASS
R2_PHYSICAL_CAMPAIGN=IN_PROGRESS
OD0_INSTALL_AND_LAUNCH=PASS
NEXT_EXECUTION_NODE=OD1_EXACT_GMAIL_READONLY_OAUTH
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

OD0 proves installability and launch of the stable +2006 signed candidate only. It does not prove fresh OAuth, Gmail discovery, statement fetch, parsing, SQLCipher persistence, reconciliation, disconnect semantics, or replay/idempotency.
