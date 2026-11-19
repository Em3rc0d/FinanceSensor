# Statement OAuth regression guard

The trusted-edge bank-statement viewer uses an ephemeral loopback listener. OAuth authorization and authorization-code token exchange must serialize the **same** loopback callback URI, including path.

This directory's OAuth redirect tests are synthetic only. They contain no real OAuth code, token, client credential, mailbox identity, statement data or statement password.

```text
AUTH_REDIRECT_URI == TOKEN_EXCHANGE_REDIRECT_URI
CI_PASS != REAL_OAUTH_PASS
REAL_OAUTH_PASS != REAL_STATEMENT_PARSE_PASS
```
