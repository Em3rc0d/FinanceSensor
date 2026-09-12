# ADR-022 — Production Opaque Witness Topology and Quorum

**Status:** ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL DEPLOYMENT REQUIRED  
**Date:** 2026-09-02

## Context

ADR-016 proved that an opaque independent witness can remember monotonic checkpoint progress without holding financial truth. The spike deliberately used three witnesses and a two-witness threshold, but left production topology and quorum open.

Leaving that choice open keeps freshness semantics, outage behavior, recovery and deployment architecture ambiguous.

## Decision drivers

- relay compromise must not be sufficient to manufacture freshness;
- a single witness failure must not force a false “latest” claim;
- witness disagreement must be stronger evidence than simple unavailability;
- witnesses must not become a second financial dataset;
- the design must remain understandable and operable for an early product.

## Decision

FinanceSensor freezes the initial production witness policy as:

```text
configured witnesses              3
confirmation quorum               2 of 3
minimum failure domains           2
minimum relay-independent witness 1
real tenant identifier at witness FORBIDDEN
financial plaintext at witness    FORBIDDEN
financial ciphertext at witness   FORBIDDEN
per-witness opaque log id         REQUIRED
```

`2-of-3` is a **freshness-evidence threshold**, not a consensus protocol and not authority to decrypt or rewrite financial state.

### Confirmation rule

```text
2 agreeing current witnesses
+ no contradictory valid witness evidence
→ WITNESS_CONFIRMED_THROUGH_N
```

### Contradiction rule

Any cryptographically valid evidence of:

```text
same-sequence different checkpoint
parent mismatch
gap inconsistent with remembered history
witness ahead of relay
cross-log binding confusion
```

must be surfaced explicitly. Quorum counting MUST NOT vote away a valid contradiction.

```text
VALID CONTRADICTION > NUMERIC QUORUM
```

### Availability rule

If fewer than two current witnesses are available:

```text
freshness state = WITNESS_UNCONFIRMED
```

FinanceSensor may continue local work and may exchange opaque encrypted sync envelopes according to normal authorization rules, but it MUST NOT:

- claim global/latest freshness;
- silently advance a witness-confirmed freshness marker;
- use witness absence as proof that relay state is current;
- complete destructive recovery/cutover steps whose safety contract requires current independent evidence.

Recovery/cutover may proceed only through an explicitly documented degraded path if a future ADR defines one. MK0 defines no such fail-open path.

### Failure-domain rule

At release, witness placement must satisfy at least two distinct operational failure domains. At least one witness must not share the primary relay’s administrative failure domain.

Three logical endpoints on the same database/account are **not** three independent witnesses.

### Privacy rule

Each witness receives its own independently derived opaque log identifier. A witness record may contain only the minimum monotonic proof material required by ADR-016, such as:

```text
opaque_log_id
checkpoint_sequence
checkpoint_hash
previous_checkpoint_hash
protocol/version metadata
bounded timestamps / operational metadata
```

It must not require:

```text
email
real tenant id
bank/account/card identifiers
amount
merchant
category
financial event type
origin device inventory
financial payload ciphertext
Tenant Root Key
Recovery Private Key
```

Timing, cadence, sequence and network metadata remain privacy leakage and must be measured.

## Options considered

### One witness

Rejected. It merely replaces sole-relay trust with sole-witness trust.

### Two witnesses / one required

Rejected for the initial production contract because a single compromised or stale witness would be too easy to over-interpret as confirmation.

### Three witnesses / unanimous 3-of-3

Rejected because one outage would destroy availability without materially changing the contradiction rule.

### Large Byzantine consensus network

Rejected as unnecessary complexity. FinanceSensor witnesses are independent monotonic memories, not a blockchain or general consensus layer.

## Consequences

- the production freshness contract is now deterministic;
- witness outage and witness contradiction have different states;
- provider topology must be physically evidenced before release;
- the control plane needs health/lag observability that contains no financial payload;
- Q-005 remains ACTIVE until real witness deployments and failure campaigns pass.

## Test / evidence required

- three deployed witness identities across compliant failure domains;
- 2-of-3 confirmation under one-witness outage;
- explicit unconfirmed state under two-witness outage;
- relay-behind-witness detection;
- same-sequence witness divergence fail-closed behavior;
- witness replacement/bootstrap procedure;
- per-witness opaque ID unlinkability review;
- metadata leakage measurement;
- retention/deletion behavior under ADR-023;
- recovery/cutover refusal when required witness evidence is unavailable.

## Security law

```text
WITNESS QUORUM != GLOBAL FRESHNESS PROOF
QUORUM LOSS != RELAY TRUST
CONTRADICTION != MINORITY VOTE
INDEPENDENCE IS TOPOLOGY, NOT ENDPOINT COUNT
```

## Supersedes / superseded by

This ADR resolves the production-policy branch intentionally left open by ADR-016. ADR-016 remains the protocol semantics authority.