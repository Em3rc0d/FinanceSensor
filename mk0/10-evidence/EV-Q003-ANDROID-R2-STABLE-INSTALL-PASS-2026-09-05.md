# EV-Q003 — Android R2 stable-signed clean install PASS — 2026-09-05

Scope: owned-device Android human-test alpha install boundary.

## Observed physical evidence

```text
PACKAGE=com.financesensor.lab.gmailconnection.r2
PACKAGE_CLEANUP=PASS
ADB_INSTALL=Success
INSTALL=PASS
```

The previous package record was discovered in Android user/profile `0` and removed successfully before installation.

The installed candidate is the locally re-signed human-test alpha using the frozen `FINANCESENSOR_R2_LAB` identity.

Sanitized signer receipt carried forward from the trusted-edge signing step:

```text
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
APK_SHA256=4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
```

No keystore, password, local filesystem path, Gmail data, token, account identifier, raw financial content, or device serial is recorded in repository evidence.

## Gate impact

```text
TRUSTED_EDGE_SIGNING=PASS
OWNED_DEVICE_PACKAGE_CLEANUP=PASS
OWNED_DEVICE_INSTALL=PASS
GOOGLE_OAUTH_PHYSICAL=NOT_YET_OBSERVED
GMAIL_PROFILE_REAL=NOT_YET_OBSERVED
BOUNDED_FINANCIAL_SCAN=NOT_YET_OBSERVED
BUILD_READY=NO
RELEASE_READY=NO
IOS_TOUCHED=0
```

This receipt closes only the stable-signed installation boundary. It does not certify OAuth, Gmail access, scan correctness, product readiness, or release readiness.
