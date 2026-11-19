# EV-Q005 — Anti-Rollback / Trusted Checkpoint Red→Green Campaign

**Date:** 2026-09-01  
**Owner nodes:** `Q-005`, `SEC-001`, `DM-001`, `S-002`, `T-002`  
**Evidence level:** `PROVEN_AT_SPIKE` only  
**Red executable head:** `c8dec1d43e76c779cfdccd2f078a0e9698ff8f64`  
**Green executable head:** `dbfd21c01be7352087ce4bf2a06a8922b68c8c8c`

## Purpose

The knee-stress campaign exposed an unsolved distributed-systems limit:

```text
valid signed state
        !=
proof that this is the newest valid state
```

This campaign tested whether an **independently retained trusted checkpoint anchor** can prevent an opaque relay from silently rolling a client backward before that anchor or presenting a fork/gap as a valid continuation.

It deliberately does not claim Byzantine global freshness when no independent anchor/witness exists.

## Design inputs

Provenance snapshot:

- `research/Q005-ANTI-ROLLBACK-2026-SOURCES.md`
- TUF rollback/freeze threat terminology
- RFC 9162 / RFC 6962 append-only consistency concepts

FinanceSensor's bounded property is its own protocol contract; the external designs are inputs, not evidence of FinanceSensor correctness.

## Red baseline

The first `checkpoint.js` implementation verified checkpoint body hash, signature and signer authorization, but intentionally treated authenticity as sufficient.

Red commit:

`c8dec1d43e76c779cfdccd2f078a0e9698ff8f64`

MK0 Foundation push run:

`33541779540`

E2EE job:

`99969536652`

Observed result:

```text
TOTAL DISTRIBUTED TESTS     98
PASS                        90
FAIL                         8
ANTI-ROLLBACK CASES         14
NEW RED ASSERTIONS           8
```

The eight failures demonstrated that authenticity-only logic did not protect:

```text
ARB-003 relay view entirely behind trusted anchor
ARB-004 two authentic hashes at one checkpoint sequence
ARB-005 valid signature with wrong previous-checkpoint hash
ARB-006 missing intermediate checkpoint / sequence gap
ARB-009 cross-tenant checkpoint attempting to extend tenant anchor
ARB-010 signed fast-forward over unknown checkpoints
ARB-011 no independent anchor incorrectly treated as trusted consistency
ARB-013 authentic equivocation at the exact trusted-anchor sequence
```

Six properties already survived the weak baseline:

```text
ARB-001 valid anchored advance happy path
ARB-002 exact duplicate checkpoint retry
ARB-007 body/hash/signature tampering
ARB-008 signer revoked for checkpoint epoch
ARB-012 frozen exactly at anchor never promoted to globally latest
ARB-014 unseen withheld tail never claimed absent
```

This separation matters: signature/authorization integrity and anti-rollback freshness are related but distinct properties.

## Green repair

The evaluator was hardened to require:

```text
independent anchor validation
same-tenant chain
one hash per checkpoint sequence
exact sequence continuity after anchor
previousCheckpointHash continuity
rollback rejection below anchor
explicit anchor equivocation rejection
no-anchor uncertainty
```

Green commit:

`dbfd21c01be7352087ce4bf2a06a8922b68c8c8c`

MK0 Foundation push run:

`33541916774`

E2EE job:

`99969992521`

FinanceSensor Heartbeat push run:

`33541916747`

Observed result:

```text
ARB-001..014                 14 / 14 PASS
E2EE / KEY / RECOVERY /
REVOCATION / KNEE /
CHECKPOINT / PNS             98 / 98 PASS
MK0 FOUNDATION                 3 / 3 PASS
HEARTBEAT                          SUCCESS
```

## Bounded properties demonstrated

### Independent-anchor rollback detection

```text
presented highest sequence < trusted anchor sequence
→ checkpoint-rollback-detected
→ FAIL CLOSED
```

### Sequence equivocation

```text
same tenant + checkpoint sequence
+ different authentic checkpoint hash
→ checkpoint-sequence-fork
→ FAIL CLOSED
```

At the exact anchor sequence:

```text
presented hash != independent anchor hash
→ checkpoint-anchor-fork
→ FAIL CLOSED
```

### Append-only continuity

```text
anchor N
→ expected N+1
→ expected N+2
...
```

A sequence gap/fast-forward or a wrong `previousCheckpointHash` fails closed.

### Tenant isolation and signer authority

Checkpoint signer authorization remains tenant-and-epoch scoped. Checkpoint material from another tenant cannot advance a tenant anchor merely because its signature is cryptographically valid.

### Exact duplicate delivery

Exact checkpoint duplicates are retry-equivalent and do not create multiple authorities.

### No-anchor honesty

```text
no independent TrustedCheckpointAnchor
→ INDETERMINATE_FRESHNESS
```

Authentication of the presented chain still occurs, but the API does not promote it to anchored freshness.

## Critical non-claim — globally latest freshness remains unproven

A valid chain extending anchor `A` proves:

> the presented head is an authenticated append-only extension of `A` in the bounded model.

It does **not** prove:

> the presented head is the newest checkpoint that ever existed.

Example:

```text
anchor = checkpoint 1
relay presents checkpoint 2
checkpoint 3 actually exists but is withheld
```

The evaluator truthfully returns:

```text
status                  CONSISTENT_FROM_ANCHOR
latestSeenSequence      2
latestGlobalFreshness   UNPROVEN
```

The local client cannot prove that unseen checkpoint 3 exists or does not exist.

Likewise, if all trusted devices are lost and the newest independent anchor available in the Recovery Kit is checkpoint 9 while the real tenant once reached 12, a relay can present exactly checkpoint 9. The client can prove it was not rolled back **before 9**; it cannot infer that 9 was globally latest.

Closing that stronger property requires an independently refreshed/witnessed freshness mechanism and remains a production architecture/product decision.

## Privacy boundary

The checkpoint mechanism adds security metadata such as:

```text
tenant opaque identifier
checkpoint sequence
key epoch
previous checkpoint hash
state commitment
origin-device identifiers
origin head sequences
authorizing device identifier
checkpoint timestamp
```

It does not require plaintext amount, merchant, category, email content or financial event semantics.

This metadata must be classified and leakage-budgeted before release-grade use.

## Result

```text
TRUSTED CHECKPOINT ANTI-ROLLBACK     PASS AT SPIKE LEVEL
ARB SUITE                            14 / 14 PASS
FULL DISTRIBUTED SUITE               98 / 98 PASS
RED ASSERTIONS EXPOSED                8
ANCHOR-RELATIVE ROLLBACK             DETECTED
CHECKPOINT FORK / GAP                DETECTED
CROSS-TENANT ADVANCE                 REJECTED
NO INDEPENDENT ANCHOR                INDETERMINATE_FRESHNESS
GLOBAL-LATEST FRESHNESS              NOT CLAIMED
Q-005                                ACTIVE
BUILD_READY                          false
```

This evidence may promote only the bounded anti-rollback/consistency invariants to `PROVEN_AT_SPIKE`. It does not close Q-005, SEC-001 or DM-001 and does not authorize unrestricted implementation.
