# Evidence — Statement trusted-edge OAuth redirect mismatch — 2026-09-03

## Observation

A real owned local execution of the FinanceSensor bank-statement recovery harness stopped safely during OAuth token exchange with the sanitized local code:

```text
TOKEN_EXCHANGE_HTTP_400
```

No bank-statement parse, PDF download, password handling, Gmail statement discovery or vault write is claimed for this failed authorization attempt.

## Root cause found in code

The statement viewer authorized with:

```text
http://127.0.0.1:<ephemeral-port>/oauth/callback
```

but exchanged the authorization code using:

```text
http://127.0.0.1:<same-port>
```

OAuth authorization-code exchange requires the token request `redirect_uri` to match the URI used in the authorization request.

The historical Gmail viewer already used one identical root redirect URI in both stages; the newer statement viewer introduced a callback-path mismatch.

## Fix

The statement viewer now derives one function:

```text
oauthRedirectUri()
```

and uses it for both:

```text
createAuthorizationRequest(... redirectUri)
buildTokenExchangeRequest(... redirectUri)
```

A synthetic regression test locks the two call sites to the same redirect function.

## Evidence boundary

```text
TOKEN_EXCHANGE_HTTP_400_OBSERVED = YES
ROOT_CAUSE_CODE_PATH_IDENTIFIED  = YES
FIX_IMPLEMENTED                  = YES
FIX_SYNTHETIC_CI                 = OPEN
FIX_REAL_RETRY                   = OPEN
REAL_STATEMENT_PARSE             = OPEN
ANDROID_REAL_STATEMENT           = OPEN
IOS_TOUCHED                      = 0
BUILD_READY                      = false
```

No OAuth code, access token, refresh token, mailbox identity, statement password, statement data or financial value is present in this receipt.
