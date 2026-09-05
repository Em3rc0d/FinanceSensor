# EV-Q003 — Android R2 owned-device OAuth + bounded scan PASS

Date: 2026-09-05  
Surface: Android human-test alpha  
Package: `com.financesensor.lab.gmailconnection.r2`

## Sanitized physical observations

Human-provided owned-device screenshots demonstrate the following sequence on the stable R2-signed alpha:

```text
OWNED_DEVICE_INSTALL=PASS
GOOGLE_OAUTH_REAL=PASS
GMAIL_CONNECTED_UI=PASS
BOUNDED_RECENT_SCAN_TRIGGERED=PASS
BOUNDED_RECENT_SCAN_COMPLETED=PASS
RECENT_MESSAGES_INSPECTED=300
STRONG_CANDIDATES_OPENED_AFTER_METADATA=10
DERIVED_MOVEMENTS_RENDERED=10
TRANSFERS_SEPARATED_FROM_SPEND=4
UNINTERPRETED_CANDIDATES=0
```

The receipt intentionally omits all transaction amounts, message contents, account identifiers, email addresses, bank-specific raw payloads, device identifiers, local paths, signing secrets, and credentials.

## What this evidence proves

- the stable R2 Android signer is accepted by the configured Google OAuth binding;
- the app can complete real owned-device Gmail read-only authorization;
- the app can reach its connected state without exposing the bearer to Flutter;
- the bounded recent Gmail scan can inspect the configured maximum sample and complete;
- metadata-first narrowing and derived-event rendering work on the observed real sample;
- transfers remain separated from observed spend in the product surface;
- the sample is explicitly presented as incomplete and not equivalent to a bank balance or complete financial picture.

## What remains open

```text
MOVEMENT_LIST_HUMAN_REVIEW=PENDING
DISCONNECT_REAL=PENDING
PROVIDER_REVOKE_VERIFICATION=PENDING
EXPLICIT_RECONNECT_REAL=PENDING
BACKGROUND_SYNC=NOT_IN_ALPHA
HISTORICAL_COMPLETENESS=NOT_CLAIMED
BUILD_READY=NO
RELEASE_READY=NO
IOS_TOUCHED=0
```

This evidence does not promote production readiness.
