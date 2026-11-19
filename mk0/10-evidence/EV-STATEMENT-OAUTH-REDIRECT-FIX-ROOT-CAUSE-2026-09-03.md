# Statement OAuth redirect fix root-cause note

The observed trusted-edge stop `TOKEN_EXCHANGE_HTTP_400` was traced to a local code defect in the bank-statement viewer: the authorization request used `/oauth/callback`, while token exchange used the loopback origin without that path.

The fix centralizes the callback URI through `oauthRedirectUri()` and reuses it in both stages. This note records the code diagnosis only; it does not claim that the subsequent real OAuth retry or statement parse has passed.

```text
CODE_ROOT_CAUSE_IDENTIFIED = YES
FIX_IMPLEMENTED            = YES
REAL_RETRY                  = OPEN
REAL_STATEMENT_PARSE        = OPEN
IOS_TOUCHED                 = 0
BUILD_READY                 = false
```
