# Q-005 Witness / Freshness — Source Snapshot

**Date:** 2026-09-01  
**Purpose:** provenance for FinanceSensor's bounded independent-witness/freshness design. External systems inform the threat model and terminology; they do not prove FinanceSensor correctness.

## 1. transparency-dev Witness

Source: https://github.com/transparency-dev/witness

Relevant design input:

- a witness remembers previously witnessed checkpoints for verifiable logs;
- it verifies that later checkpoints are append-only evolutions of prior witnessed state;
- it counter-signs consistent checkpoints;
- clients can use witness cosignatures to reduce exposure to split-view attacks;
- witnesses are intentionally lightweight and separate from the log operator.

FinanceSensor mapping:

```text
RELAY / CHECKPOINT STORE
        !=
INDEPENDENT WITNESS MEMORY
```

A witness can remember a head newer than a malicious/stale relay is willing to show a recovered client.

## 2. C2SP Transparency Log Witness Protocol

Source: https://c2sp.org/tlog-witness

Relevant design input:

- a witness is identified by a name/public key;
- the witness stores the latest checkpoint it has observed for a log;
- when asked to cosign a new checkpoint it verifies consistency from its prior observed checkpoint;
- a witness can expose a recent cosigned checkpoint to monitors;
- the specification explicitly notes that effective transparency requires preventing clients/monitors from being partitioned into stale or split views.

FinanceSensor mapping:

```text
witness remembers checkpoint N
relay later presents checkpoint N-2
        ↓
witness receipt / remembered head contradicts relay view
```

The witness is evidence of observation, not financial truth authority.

## 3. Trillian transparent logging design guide

Source: https://github.com/google/trillian/blob/master/docs/TransparentLogging.md

Relevant design input:

- transparent logs use verifiable append-only structures;
- inclusion proofs and consistency proofs are distinct tools;
- external auditing/monitoring is part of the ecosystem rather than something a log signature alone provides;
- admission control is a separate concern from append-only proof.

FinanceSensor mapping:

```text
CHECKPOINT AUTHORITY
APPEND-ONLY CONTINUITY
WITNESS OBSERVATION
```

must remain separate concepts.

## 4. Sigstore Rekor transparency log

Sources:

- https://docs.sigstore.dev/logging/overview/
- https://docs.sigstore.dev/cosign/signing/overview/

Relevant design input:

- Rekor is an immutable/tamper-resistant transparency log for signed supply-chain metadata;
- auditors/monitors check log consistency and identities;
- independent monitoring is an explicit operational role.

FinanceSensor mapping:

An opaque checkpoint witness can help establish that a checkpoint was externally observed without receiving financial payload plaintext.

## 5. Google transparency-log witness programme

Source: https://github.com/google/google-tlog-witness

Relevant design input:

- multiple separately configured witnesses can cosign checkpoints;
- witness keys/endpoints are independently identified;
- policy can define which witness signatures are acceptable.

FinanceSensor mapping:

A production policy may use more than one independent witness so one service is not a single freshness oracle.

## 6. FinanceSensor privacy adaptation

Public transparency systems often expose globally readable log material. That is inappropriate as a default for private financial telemetry.

FinanceSensor candidate witness input is therefore intentionally smaller:

```text
witness_log_id       random/pseudonymous and unique per witness
checkpoint_sequence
checkpoint_hash
previous_checkpoint_hash
protocol/version
```

The witness must not require:

```text
FinanceSensor tenant ID
email/account identity
amount
merchant
category
financial event type
origin-device list
origin heads
ciphertext payload
Tenant Root Key
Recovery Private Key
```

Per-witness pseudonyms should prevent trivial correlation of the same tenant across independent witnesses.

## 7. Candidate semantic distinction

Witness evidence may establish:

```text
WITNESS_CONFIRMED_THROUGH_N
```

meaning a configured independent witness observed checkpoint N (or a consistent later checkpoint).

It must not be named:

```text
PROVEN_GLOBALLY_LATEST
```

because a checkpoint newer than N may exist without having reached enough witnesses yet.

## 8. Candidate quorum direction

A single independent witness improves rollback detection but creates one additional availability/trust dependency.

A bounded candidate for evaluation is:

```text
3 configured independent witnesses
2-of-3 confirmation threshold
```

This is **not yet an accepted production number**. The spike should compare:

- all witnesses agree;
- one witness stale;
- one witness returns a fork;
- one witness unavailable;
- two witnesses unavailable;
- witness replay/duplicate receipts;
- cross-tenant/pseudonym confusion;
- receipt tampering;
- no quorum.

The desired fail-honest result when threshold evidence is absent is:

```text
FRESHNESS_UNCONFIRMED
```

not silent fallback to relay trust.
