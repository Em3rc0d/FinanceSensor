# EV-Q003 — FinanceSensor-owned Gmail Level C v3 partial physical proof — 2026-09-02

## Purpose

Freeze the physical v3 observation supplied by the controlled operator session. This certificate is intentionally **not** a Level-C PASS certificate.

## Observed chain

The product-owned FinanceSensor DEV Desktop OAuth path physically crossed:

```text
interactive Google consent          PASS
authorization callback              PASS
state binding                       PASS
token exchange                      PASS
refresh authority issued locally    PASS
Gmail getProfile/history cursor     PASS
post-authorization history.list     PASS
METADATA retrieval                  PASS
messages.list                       0
historical mailbox sweep            0
FULL retrieval                      0
```

The operator-visible aggregate at probe completion was:

```text
profile requests     1
list requests        0
metadata requests    2
FULL requests        0
history requests     2
selected FULL        NO_SYNTHETIC_CANDIDATE_FOUND
```

The session then executed the revoke path and the v3 UI displayed `LEVEL_C_EXECUTION_COMPLETE`.

## Why this is not PASS

`EXECUTION_COMPLETE != LEVEL_C_PASS`.

The required chain was not complete because no selected message crossed:

```text
METADATA -> FULL -> extraction -> replay
```

Therefore Q-003 remains ACTIVE and Level C remains NOT PASSED.

## Defect 1 — metadata header casing

Physical provider behavior exposed that FinanceSensor's metadata gate depended on exact object keys such as `Subject` and `From`. Internet message header field names are semantically case-insensitive; provider casing must not determine financial-candidate selection.

A regression test was committed first at:

```text
1538a0272f95ea1470e4b8670d415bbb9e792d86
```

MK0 Foundation failed as expected.

The repair normalized header lookup case-insensitively at:

```text
cc7de1475390958b2169d8bea4de6d690d022e21
```

Foundation then returned to SUCCESS.

## Defect 2 — proof-state authority

v3 allowed a successful revoke path to end with `LEVEL_C_EXECUTION_COMPLETE` even when `FULL = 0`. That wording was too easy to confuse with a successful Level-C proof.

The corrected v4 state law is:

```text
executionComplete = true
DOES NOT IMPLY
levelCPass = PASS
```

`LEVEL_C_PASS` requires all of:

```text
real consent
state binding
profile history cursor
post-authorization history
METADATA
exact per-run synthetic proof marker
production metadata gate
one bounded FULL
financial extraction
history replay consistency
provider revoke accepted
old refresh authority denied
```

## v4 privacy/request correction

v4 keeps the prior privacy limits and strengthens synthetic selection:

```text
messages.list                    0
pre-authorization mailbox sweep 0
changed IDs / attempt            <= 5
FULL                             <= 1
probe attempts                   <= 2
synthetic proof marker           per-run random, memory only
proof marker in evidence         0
credential path in evidence      0
OAuth/client secret in evidence  0
```

The per-run proof marker selects only the harmless synthetic message. The same message is independently evaluated by the production `isLikelyFinancialMetadata` gate, so deterministic harness selection does not silently weaken production classification.

## v4 engineering head

The v4 code/launcher/test wiring head is:

```text
df36e91b91eee80577b1b1d2f5f6bcc087cb2558
```

Observed CI on that exact head:

```text
FinanceSensor Heartbeat           SUCCESS
MK0 Foundation push               SUCCESS
MK0 Foundation pull_request       SUCCESS
Package Gmail Level C Helper      SUCCESS
```

Artifact:

```text
FinanceSensor-Level-C-v4-Windows
artifact id: 9828250023
sha256: c9fff3ae2c139159631826925cd6cd77c30b5076251fd1cceb10475769ad8b32
```

## Status impact

```text
Q-003 Gmail feasibility            ACTIVE
Level A contractual ingress        PASS at spike level
Level B real Gmail provider        PASS
Level C OAuth/token exchange       PHYSICALLY PASS
Level C profile/history/METADATA   PHYSICALLY PASS
Level C FULL/extraction/replay      NOT YET PROVEN
Level C revocation                 OBSERVED PATH, strict v4 re-proof required
Level C overall                    NOT PASSED
BUILD_READY                        false
```
