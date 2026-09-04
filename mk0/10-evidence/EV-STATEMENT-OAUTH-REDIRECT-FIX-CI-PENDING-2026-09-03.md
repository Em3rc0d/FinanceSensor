# Evidence — Statement OAuth redirect fix — CI pending — 2026-09-03

## Scope

This receipt records a code fix prepared after the trusted-edge bank-statement harness stopped safely at OAuth token exchange.

Observed local stop:

```text
TOKEN_EXCHANGE_HTTP_400
```

Identified code mismatch:

```text
AUTHORIZATION redirect_uri = /oauth/callback
TOKEN EXCHANGE redirect_uri = /
```

Implemented correction:

```text
AUTHORIZATION redirect_uri = oauthRedirectUri()
TOKEN EXCHANGE redirect_uri = oauthRedirectUri()
```

Regression coverage added:

- viewer static contract: both call sites use the same redirect helper;
- OAuth request contract: authorization URL and token request serialize the same synthetic loopback callback URI.

## Claim boundary

```text
FIX_IMPLEMENTED             = YES
SYNTHETIC_CI                = PENDING
REAL_OAUTH_RETRY            = OPEN
REAL_STATEMENT_PARSE        = OPEN
ANDROID_REAL_STATEMENT      = OPEN
IOS_TOUCHED                 = 0
BUILD_READY                 = false
```

No token, authorization code, mailbox identity, PDF password, PDF content or financial value is present in this receipt.
