# SEC-001 Addendum — Q-005 Anti-Rollback / Trusted Checkpoint Revalidation

**Owner nodes:** `SEC-001`, `Q-005`  
**Status authority:** `graph/closure-ledger.json`  
**Decision:** ADR-015  
**Evidence:** `../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

## 1. Threat introduced

Q-005 already authenticates devices, envelopes, recovery wraps and revocation cutover state. That does not prevent a relay from presenting an **older but still validly signed** tenant state.

Threat classes:

```text
ROLLBACK
  relay presents a checkpoint older than an independently trusted checkpoint

FORK / EQUIVOCATION
  relay presents a different authentic checkpoint at an already trusted sequence

GAP / FAST-FORWARD
  relay skips intermediate checkpoints and asks client to trust an unproven continuation

FREEZE / WITHHOLDING
  relay repeatedly presents a valid old/current head while withholding an unseen later tail
```

The first three are detectable relative to an independent anchor in the bounded spike. The last is **not globally detectable** without an independently fresher witness/anchor.

## 2. New trust boundary

```text
RELAY / CONTROL PLANE
  may store signed checkpoints
  may transport checkpoint chains
  may advertise a head
  MUST NOT be sole authority for minimum trusted checkpoint state

INDEPENDENT ANCHOR DOMAIN
  protected device local state
  or user-held Recovery Kit
  or future separately reviewed witness
  establishes minimum trusted checkpoint identity
```

A server copy of the anchor is useful operationally but cannot be the only anti-rollback reference against that same server.

## 3. Security properties demonstrated at spike level

Given an independent anchor:

```text
behind anchor                      FAIL CLOSED
same sequence / different hash     FAIL CLOSED
wrong previous hash                FAIL CLOSED
missing intermediate sequence      FAIL CLOSED
cross-tenant chain                 FAIL CLOSED
unauthorized/revoked signer         FAIL CLOSED
exact duplicate checkpoint         IDEMPOTENT
valid append-only extension         ACCEPT AS CONSISTENT_FROM_ANCHOR
```

The evaluator also refuses to convert consistency into global freshness:

```text
latestGlobalFreshness = UNPROVEN
```

## 4. Recovery consequence

The Recovery Private Key answers:

> Can the user recover tenant key epochs?

A TrustedCheckpointAnchor answers:

> What minimum tenant state can the user independently insist on?

Neither alone answers:

> Is the relay showing the newest state that ever existed?

If every previous trusted device is gone and the newest independent anchor is N, a relay can potentially hide valid N+1..M. The recovered client can refuse anything older/forked before N but cannot infer that M does not exist.

## 5. Mandatory fail-honest state

If no independent anchor exists:

```text
INDETERMINATE_FRESHNESS
```

must be represented explicitly.

This is safer than treating a first-seen valid signed head as trusted latest state.

## 6. Metadata leakage

Signed checkpoint metadata can expose:

```text
opaque tenant identity
checkpoint cadence / timestamps
key epoch progression
device identifiers
per-origin highest sequence/activity
state commitment hashes
```

It must not expose financial payload plaintext, but the metadata itself can reveal activity patterns. Privacy classification: `TRUSTED-CHECKPOINT-METADATA`.

## 7. New security obligations before SEC-001 closure

```text
production checkpoint commitment reviewed
atomic checkpoint/anchor persistence proven
anchor rollback resistance in Android protected storage proven
anchor rollback resistance in Apple protected storage proven
Recovery Kit anchor export/import behavior proven
anchor refresh/witness strategy frozen
cloud checkpoint authorization enforced physically
retention/deletion policy frozen
metadata leakage budget reviewed
crash/restart around checkpoint advancement proven
```

## 8. Non-claims

The Node spike does not prove:

```text
globally latest Byzantine freshness
relay availability
absence of withheld unseen checkpoints
secure monotonic hardware counter behavior
production Merkle/transparency log correctness
production platform anchor storage
```

## 9. Security conclusion

The Q-005 model now separates:

```text
SIGNATURE AUTHENTICITY
        !=
AUTHORIZATION
        !=
APPEND-ONLY CONSISTENCY
        !=
GLOBAL FRESHNESS
```

The first three have bounded executable support. Strong global freshness after loss of every independent recent anchor remains a production design decision and keeps `Q-005`/`SEC-001` open.
