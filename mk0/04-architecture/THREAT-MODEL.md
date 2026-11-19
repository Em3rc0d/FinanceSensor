# MK0 Threat Model

**Status:** PASS FOR BUILD ENTRY / PHYSICAL SECURITY VALIDATION OPEN  
**Date:** 2026-09-02

## Scope

This document freezes the threats that MK0 implementation must actively defend against. It does **not** claim that mitigations are physically proven; those proofs belong to Q-003/Q-004/Q-005, P0-P8 and later penetration/review evidence.

## Protected assets

```text
Gmail OAuth refresh authority
short-lived Gmail access tokens
raw Gmail body/attachment content
structured financial evidence
canonical financial state
user corrections
SQLCipher database DEK
Tenant Root Key / epoch keys
Recovery Key / Recovery Kit
protected device private keys
control-plane tenant metadata
opaque E2EE envelopes
witness commitments
privacy/deletion state
```

## Trust boundaries

```text
PUBLIC GITHUB / CI
        !=
CONTROLLED LOCAL EDGE
        !=
PROTECTED MOBILE KEY STORE

DEVICE FINANCIAL PLAINTEXT
        !=
SUPABASE CONTROL PLANE
        !=
OPAQUE E2EE RELAY
        !=
INDEPENDENT WITNESS
```

No boundary may be collapsed silently.

## Threat actors / failure classes

### T01 — OAuth authority theft

Attack/failure:

- refresh token leaked to logs/files/Dart config/cloud;
- authorization code or PKCE verifier retained beyond flow;
- excessive OAuth scope.

Required controls:

- protected device credential custody;
- `gmail.readonly` minimum-scope candidate;
- short-lived access token exposure only on demand;
- log/result sanitizer;
- provider revocation;
- no cloud refresh-token custody.

Evidence still required: P1/P2/P7.

### T02 — Malicious or malformed source content

Attack/failure:

- hostile HTML/body/attachment shape;
- parser crash/resource abuse;
- source content manipulates financial semantics.

Controls:

- bounded fetch/processing;
- metadata gate before full fetch;
- source parsing separated from canonical resolver;
- unresolved evidence cannot mutate financial totals;
- raw content aggressively minimized.

Evidence still required: production parser fuzz/adversarial corpus.

### T03 — Lost/stolen/compromised device

Attack/failure:

- local DB extraction;
- credential extraction;
- long-lived key export;
- stale device continues syncing after revocation.

Controls:

- SQLCipher local DB;
- random 256-bit DEK;
- platform-protected DEK wrap;
- protected P-256 device authority;
- no exportable production-key fallback;
- device revocation + future epoch rotation.

Evidence still required: P2/P3/P4/P6.

### T04 — Plaintext leakage through logs/crash/notifications

Controls:

- deny financial/email plaintext in operational logs;
- secret/content-pattern public guards;
- minimized diagnostics;
- notification detail conservative by default;
- privacy matrices define logging per data class.

Evidence still required: physical crash/log inspection.

### T05 — Cross-tenant cloud access

Attack/failure:

- authenticated user reads/writes foreign tenant rows;
- guessed tenant ID bypass;
- service-role key shipped to mobile.

Controls:

- ADR-001 User/Tenant/Membership separation;
- Supabase RLS;
- end-user scoped mobile auth only;
- service role forbidden in mobile;
- tenant scope on durable control-plane records.

Evidence still required: B7 adversarial RLS tests + physical control-plane campaign.

### T06 — Cloud operator/server learns financial plaintext

Controls:

- Gmail data plane local;
- normal cloud financial plaintext forbidden;
- E2EE opaque envelopes only;
- server cannot hold Tenant Root Key authority.

Evidence still required: P3 network/storage inspection.

### T07 — Malicious/compromised relay

Attack/failure:

- replay;
- omission;
- rollback;
- fork/equivocation;
- stale snapshot presented as latest.

Controls:

- signed append-only continuity;
- device sequences;
- trusted checkpoints;
- opaque independent witnesses;
- 3 configured witnesses / 2-of-3 confirmation;
- contradiction cannot be voted away.

Evidence still required: P5 crash/partition/divergence campaign.

### T08 — Unauthorized device enrollment / key provisioning

Controls:

- account membership and device cryptographic authority separated;
- enrollment explicitly authorizes device key;
- wrapped key material bound to tenant/device/epoch/context;
- wrong tenant/epoch/recipient/authorizer negative tests.

Evidence still required: P4 + production enrollment tests.

### T09 — Revoked device continues future authority

Controls:

- revocation barrier;
- N+1 key rotation where required;
- old device cannot append/decrypt future epoch;
- witness/checkpoint history binds revocation state.

Evidence still required: P5/P6.

### T10 — Backup/deletion resurrection

Attack/failure:

- deleted tenant/source authority reappears after restore;
- backup retention silently exceeds contract.

Controls:

- ADR-023 deletion tombstone/resurrection barrier;
- crypto-shred key authority;
- physical backup retention ceiling <=35 days;
- restored pre-delete backup cannot authorize deleted tenant.

Evidence still required: P3.

### T11 — Recovery abuse / stale Recovery Kit

Controls:

- user-held offline Recovery Key;
- Recovery Kit minimum trusted anchor semantics;
- mandatory N+1 Tenant Root Key + Recovery Key rotation after disaster recovery;
- mandatory new Recovery Kit export/integrity/custody before resume;
- old kit historical-only after rotation.

Evidence still required: P6.

### T12 — Witness privacy leakage

Controls:

- real tenant ID forbidden at witness;
- financial plaintext forbidden;
- financial ciphertext forbidden;
- per-witness opaque log identifier.

Evidence still required: P5 metadata analysis.

### T13 — Mobile bridge misuse

Attack/failure:

- Dart obtains long-lived secrets/private key material;
- native bridge exposes generic secret export;
- unsupported hardware silently falls back to software key.

Controls:

- typed narrow Kotlin/Swift bridge;
- operations, not raw private-key bytes;
- protected capability query;
- explicit fail-closed unsupported states;
- exportable fallback forbidden.

Evidence still required: B1 static contract + P2/P4 physical tests.

### T14 — Financial-truth corruption

Attack/failure:

- false merge;
- duplicate replay;
- transfer/settlement double count;
- unresolved evidence mutates totals;
- refund/reversal over-offset.

Controls:

- Q-001/Q-002 CLOSED;
- canonical resolver invariant suites;
- provenance linkage;
- user correction emits durable action rather than rewriting source evidence.

Current evidence: canonical resolver suite PASS. Real-provider distribution remains future revalidation trigger.

### T15 — Privacy theater / misleading UI

Attack/failure:

- UI claims E2EE, zero plaintext or exact processing counts without measurable backing.

Controls:

- Privacy Inspector metrics must be technically measurable;
- synthetic Product Lab visibly labeled;
- production claims bind to runtime evidence;
- `DOCUMENTED != VERIFIED`.

Evidence still required: physical Privacy Inspector truth audit.

## Threat-to-evidence matrix

| Threat | Primary owner | Build control | Physical/provider proof |
|---|---|---|---|
| T01 OAuth theft | Q-003/Q-004 | B1/B3 | P1/P2/P7 |
| T02 hostile source | Q-003/Q-004 | B4/B5 | parser campaign |
| T03 device loss | Q-004/Q-005 | B1/B2/B8 | P2/P3/P4/P6 |
| T04 log leakage | Q-004 | all slices | P2/P3 |
| T05 cross-tenant | A-001/SEC-001 | B7 | RLS adversarial evidence |
| T06 cloud plaintext | Q-004 | B7/B8 | P3 |
| T07 malicious relay | Q-005 | B8/B9 | P5 |
| T08 enrollment abuse | Q-005 | B8 | P4/P5 |
| T09 revoked device | Q-005 | B9 | P5/P6 |
| T10 deletion resurrection | Q-004/Q-005 | B10 | P3/P6 |
| T11 recovery abuse | Q-005 | B10 | P6 |
| T12 witness leakage | Q-005 | B9 | P5 |
| T13 bridge misuse | Q-003/Q-005 | B1/B3 | P2/P4 |
| T14 truth corruption | Q-001/Q-002 | B5 | provider revalidation |
| T15 privacy theater | Q-004 | B6/B10 | physical truth audit |

## Build-entry decision

The threat inventory is complete enough to constrain implementation because every major trust boundary has an owning control and an explicit evidence destination.

```text
THREAT_MODEL = PASS_FOR_BUILD_ENTRY
SECURITY_PHYSICALLY_PROVEN = NO
SEC_001 = STILL_DRAFTED_UNTIL_Q003_Q004_Q005_CLOSE
```

## Revalidation triggers

Reopen the threat model if:

- a new provider/source is added;
- a new cloud plaintext class is proposed;
- a new long-lived credential exists;
- a new device security fallback is introduced;
- a new analytics/telemetry pipeline is added;
- household/shared-tenant behavior enters scope;
- a penetration/review finding exposes an unmodeled attack class.
