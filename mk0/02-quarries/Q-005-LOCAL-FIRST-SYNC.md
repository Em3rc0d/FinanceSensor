# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while mobile background behavior remains calm, battery-aware, offline-tolerant and recoverable?

## Current finding

Q-005 is two coupled distributed-system problems:

```text
PERIPHERAL NERVOUS SYSTEM
  identity
  tenant keys
  encrypted envelopes
  signatures
  replay
  convergence
  revocation
  conflict semantics

PARASYMPATHETIC SYSTEM
  rest
  background scheduling
  backoff
  offline tolerance
  battery/resource constraints
  safe interruption
  checkpointing
  recovery
```

Neither can be postponed to implementation. A secure protocol that constantly wakes the phone is unhealthy; a battery-friendly sync that can silently corrupt financial state is unacceptable.

Detailed candidate contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`

## Target model

```text
Device A
  ↓ canonical/domain action
  ↓ encrypt + sign locally
Cloud opaque envelope relay
  ↓
Device B
  ↓ verify origin
  ↓ decrypt locally
  ↓ replay/materialize
Equivalent financial state
```

## Core ownership model

- `Tenant` owns financial truth.
- `Device` is an authorized execution node.
- `Connection` belongs to Tenant.
- A device may temporarily execute a Connection through a `ProcessingLease`.
- A lease reduces duplicate work but is never a correctness mechanism.

## Candidate cryptographic model

```text
Tenant Root Key epoch N
├─ domain-separated Sync key
├─ domain-separated Ledger key
├─ domain-separated Evidence key
└─ Backup/recovery key — future separate decision

Device
├─ encryption keypair
└─ signing keypair
```

Production key wrapping must use an audited reviewed construction/library such as an HPKE implementation rather than the feasibility spike's hand-composed primitives.

Standards/research inputs:

- RFC 9180 — HPKE: https://www.rfc-editor.org/info/rfc9180/
- NIST SP 800-38D — GCM/GMAC: https://csrc.nist.gov/pubs/sp/800/38/d/final

The final cryptographic suite remains ADR/security-review work.

## Candidate sync envelope

Cloud-visible routing metadata should remain minimal:

```text
event_id
tenant_id opaque identifier
origin_device_id
origin_device_sequence
key_epoch
schema_version
created_at / relay sequence
ciphertext framing + byte length
signature
```

Financial semantics live inside ciphertext.

Cloud does not need plaintext:

```text
amount
merchant
category
currency tied to event
email subject/body
financial event kind
insight/opportunity
```

Metadata leakage such as timing, ciphertext size and device identity still belongs in the threat model.

## Device enrollment candidate

```text
B generates device keypairs locally
        ↓
B registers public keys/pairing request
        ↓
A verifies B through explicit user gesture/fingerprint
        ↓
A wraps current tenant root-key epoch to B
        ↓
A signs authorization/wrap context
        ↓
B verifies + unwraps locally
        ↓
B replays encrypted history from checkpoint
```

No silent enrollment.

## Device revocation candidate

```text
revoke B
   ↓
control plane denies future B authorization
   ↓
remaining trusted device creates epoch N+1
   ↓
N+1 wrapped only for remaining devices
   ↓
future envelopes use N+1
```

### Explicit non-claim

Revocation cannot make a device forget old plaintext/key material it already possessed. The MK0 property is **future-access revocation**, not remote historical erasure.

## Replay / ordering

Every origin device owns a monotonic sequence.

```text
Device A: 1, 2, 3...
Device B: 1, 2, 3...
```

Duplicate `event_id` is idempotent.

Relay/server order can be used for pagination, but **must not become financial conflict truth** merely because one packet arrived later.

## Conflict model

FinanceSensor uses domain-specific conflict semantics.

Example concurrent offline correction:

```text
A: transaction X → FOOD, base revision 3
B: transaction X → TRANSPORT, base revision 3
```

Candidate behavior:

```text
same target + same base revision + incompatible values
        ↓
CONFLICT
        ↓
no hidden winner
        ↓
explicit resolution action
```

The conflict object itself is deterministic, so devices still converge while waiting for resolution.

## Processing leases

If Pixel and iPhone both can execute the same Gmail connection:

```text
connection-123
    ↓
Device A claims short lease
    ↓
A performs bounded source processing
    ↓
lease released/expires
```

If the lease fails, idempotency/fingerprinting must still protect economic truth.

## Parasympathetic model

The sync engine is not an infinite polling service.

Candidate states:

```text
RESTING
WAKING
SYNCING_LIGHT
PROCESSING_HEAVY
COOLING_DOWN
WAITING_FOR_OS
WAITING_FOR_CONNECTIVITY
BACKOFF
LOW_RESOURCE
PAUSED
UPGRADE_REQUIRED
```

Primary rule:

```text
EVENTUAL FRESHNESS > FAKE REAL-TIME
```

Android WorkManager and Apple's BackgroundTasks APIs support OS-cooperative, constrained background execution. FinanceSensor should use those platform mechanisms instead of maintaining permanent wake/poll loops.

Sources:

- https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work
- https://developer.apple.com/documentation/BackgroundTasks
- https://developer.apple.com/documentation/backgroundtasks/bgprocessingtask

## Backoff candidate

Transient failures:

```text
ceiling = min(cap, base * 2^attempt)
delay   = random(0, ceiling)
```

No busy retries while offline. Authentication failure transitions to reconnect/`NEEDS_AUTH`, not infinite retry.

## Recovery questions still open

1. What happens when all authorized devices are lost?
2. Is zero-knowledge recovery required in v1?
3. Can recovery be optional with an explicit trade-off?
4. How long are historical tenant key epochs retained on authorized devices?
5. How do encrypted backups interact with app deletion/account deletion?
6. How are schema migrations replayed across long-offline devices?
7. Which audited HPKE/AEAD/signature implementation will be selected on Android/iOS?

These questions prevent Q-005 closure even if the synthetic convergence spike passes.

## Physical feasibility spike

Create a bounded two-device model that demonstrates protocol properties without production claims:

```text
Device A identity
Device B identity
        ↓
Tenant Root Key epoch 1
        ↓
wrap independently to A and B
        ↓
create encrypted/signed domain envelopes
        ↓
opaque relay store
        ↓
replay in different delivery order
        ↓
state digest A == state digest B
```

Required adversarial cases:

```text
wrong-device key unwrap
wrapper tamper
envelope ciphertext tamper
signature tamper
duplicate replay
sequence gap
revoked device after key rotation
cross-tenant envelope
concurrent correction conflict
explicit conflict resolution
offline scheduler
low-battery heavy-work deferral
bounded backoff
```

## Evidence levels

```text
SPECIFIED
  documented only

PARTIAL
  structural validation / incomplete physical proof

PROVEN_AT_SPIKE
  synthetic executable model proves bounded property

PROVEN
  release-grade physical implementation + platform/security evidence + closed owner nodes
```

Passing the Node spike may only promote selected sync invariants to `PROVEN_AT_SPIKE`.

## Finding

Multi-device support turns local privacy into a combined cryptography + distributed-state + mobile-runtime problem. "Encrypted database + cloud backup" is not a sufficient architecture.

## Current decision

```text
TENANT_KEY_EPOCHS              CANDIDATE
PER_DEVICE_KEY_WRAPPING        REQUIRED
DEVICE_ORIGIN_SIGNATURE        REQUIRED CANDIDATE
OPAQUE_CLOUD_ENVELOPES         REQUIRED
DUPLICATE_REPLAY               MUST BE IDEMPOTENT
GLOBAL_LWW_FINANCIAL_STATE      REJECTED
DOMAIN_CONFLICT_RECORD          CANDIDATE
REVOCATION_MEANING              FUTURE ACCESS
PERMANENT_BACKGROUND_POLLING    REJECTED
OS_COOPERATIVE_SCHEDULING       REQUIRED
OFFLINE_IS_ERROR                NO
ALL_DEVICES_LOST_RECOVERY       OPEN
PRODUCTION_CRYPTO_SUITE         OPEN / SECURITY REVIEW REQUIRED

MULTI_DEVICE_DESIGN             ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when:

- key hierarchy and epoch model selected/reviewed;
- audited production key-wrap/AEAD/signature implementation chosen;
- device enrollment/revocation sequence frozen;
- future-access revocation physically demonstrated;
- event ordering/conflict semantics frozen;
- lost-device and all-devices-lost behavior explicitly documented;
- encrypted sync prototype demonstrates two-device convergence;
- duplicate delivery and lease failure remain economically idempotent;
- cloud inspection confirms no required financial plaintext;
- Android background behavior is physically measured;
- iOS background/expiration behavior is physically measured;
- parasympathetic backoff/offline/resource rules are tested;
- Q-004 privacy matrix is reconciled with metadata leakage/key retention;
- SEC-001 and DM-001 are revalidated;
- evidence artifact stored under `mk0/10-evidence/`;
- closure receipt issued;
- `MULTI_DEVICE_DESIGN PASS` and `PRIVACY_MODEL PASS` evidence produced.
