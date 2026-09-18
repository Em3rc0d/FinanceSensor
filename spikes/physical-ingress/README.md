# Physical Financial Ingress Spike

Purpose: prove the FinanceSensor ingress/privacy contract before binding it to a real Gmail credential.

This spike is intentionally split into two levels:

```text
LEVEL A — CONTRACTUAL HARNESS
simulated Gmail-shaped provider
metadata-first retrieval
incremental history cursor
local extraction
canonical resolver
local encrypted persistence
restart/replay
revoke/delete
privacy leak checks
resource/request accounting

LEVEL B — REAL PROVIDER
controlled Gmail account
real Google OAuth
real gmail.readonly
real messages.list/get/history.list
real revocation
real Android credential store/runtime
```

Level A can produce `PROVEN_AT_SPIKE`. It cannot close Q-003. Q-003 requires Level B evidence.

## Frozen acceptance criteria

```text
AUTH_CONTRACT                 PASS
BOUNDED_INITIAL_SYNC          PASS
METADATA_FIRST                PASS
FULL_ONLY_FOR_CANDIDATES      PASS
INCREMENTAL_SYNC              PASS
RESTART_RECOVERY              PASS
REPROCESSING_IDEMPOTENT       PASS
CANONICAL_RESOLVER_REUSED     PASS
RAW_BODY_PERSISTED            0
RAW_ATTACHMENT_PERSISTED      0
PLAINTEXT_FINANCIAL_CLOUD     0
TOKEN_IN_LOGS                 0
DISCONNECT_CREDENTIAL_DELETE  PASS
TENANT_DELETE                 PASS
HISTORY_404_RECOVERY_MODEL    PASS
REQUEST_ACCOUNTING            PASS

REAL_GMAIL_OAUTH              BLOCKED_UNTIL_CONTROLLED_CREDENTIAL
REAL_ANDROID_KEYSTORE         NOT_PROVEN_HERE
PRODUCTION_POLICY_ACCEPTANCE  NOT_PROVEN_HERE
```

## Privacy rule

Raw source content may exist only inside the bounded extraction stage. Durable state stores derived evidence/canonical state, never an inbox mirror.

## No-secret rule

No OAuth client secret, refresh token, access token, real email body, or user financial data is committed to this repository.
