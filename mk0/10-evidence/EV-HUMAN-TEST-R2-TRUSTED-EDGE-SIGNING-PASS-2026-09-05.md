# EV — Android Human-Test R2 Trusted-Edge Signing PASS

Date: 2026-09-05  
Candidate source commit: `7c322a163e15a42fbfbda7dc32ee2b94dbf1b006`  
Package contract: `com.financesensor.lab.gmailconnection.r2`  
Identity: `FINANCESENSOR_R2_LAB`

## Observation

A human executed the trusted-edge signing helper locally against the previously frozen private R2 signing material. The private keystore and password remained outside GitHub, CI and chat.

Sanitized observed output:

```text
R2 alias=financesensor-r2-lab
Expected SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0

FINANCESENSOR R2 TRUSTED-EDGE SIGNING: PASS
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
APK_SHA256=4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
```

## Interpretation

The human-test APK has now crossed the previously open trusted-edge signing boundary and is signed by the exact stable R2 identity already bound to the Android OAuth client.

This evidence certifies only the signing step. It does **not** certify real Google authorization, Gmail profile reachability, financial scan behavior, disconnect/revoke behavior, production readiness or iOS.

```text
CI_BUILD_CANDIDATE                 PASS
TRUSTED_EDGE_R2_SIGNING           PASS
R2_SIGNER_SHA1_MATCH              PASS
REAL_GOOGLE_OAUTH                 PENDING_PHYSICAL
REAL_GMAIL_PROFILE                PENDING_PHYSICAL
REAL_FINANCIAL_SCAN               PENDING_PHYSICAL
BUILD_READY                       NO
RELEASE_READY                     NO
IOS_TOUCHED                       0
```

## Security boundary

No private keystore bytes, alias password, keystore password, OAuth token, Gmail content or financial data are recorded in this evidence.
