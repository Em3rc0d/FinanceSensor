# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while mobile background behavior remains calm, battery-aware, offline-tolerant and recoverable?

## Current finding

Q-005 is three coupled systems that must agree:

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

RECOVERY SYSTEM
  all-devices-lost recovery
  user-held Recovery Kit
  recovery-wrap coverage
  post-recovery revocation
  tenant epoch rotation
  Recovery Key rotation
```

None can be postponed to unrestricted implementation. A secure protocol that constantly wakes the phone is unhealthy; a battery-friendly sync that silently corrupts financial state is unacceptable; a convenient recovery path that gives the server a decryption master key violates the product thesis.

Detailed contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../11-decisions/ADR-005-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`

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

Recovery adds a separate authority path:

```text
Tenant Key Epoch N
   ├─ wrap → Device A
   ├─ wrap → Device B
   └─ wrap → Recovery Public Key

Recovery Private Key
   └─ user-held Recovery Kit only
```

The cloud may store public recovery metadata and ciphertext wraps but not recovery decryption authority.

## Core ownership model

- `Tenant` owns financial truth.
- `Device` is an authorized execution node.
- `Connection` belongs to Tenant.
- A device may temporarily execute a Connection through a `ProcessingLease`.
- A lease reduces duplicate work but is never a correctness mechanism.
- Recovery authority is independent from normal device authority.

## Cryptographic model

```text
Tenant Root Key epoch N
├─ domain-separated Sync key
├─ domain-separated Ledger key
├─ domain-separated Evidence key
├─ device-specific wrapped packages
└─ recovery wrap to active Recovery Public Key

Device
├─ encryption keypair
└─ signing keypair

Recovery
├─ Recovery Public Key   cloud-visible minimized metadata
└─ Recovery Private Key  user-held offline Recovery Kit
```

The Node spike uses hand-composed primitives only to prove protocol properties. Production key wrapping/recovery must use a reviewed construction/library such as HPKE; the spike is **not** production cryptography.

Standards/research inputs:

- RFC 9180 — HPKE: https://www.rfc-editor.org/info/rfc9180/
- NIST SP 800-38D — GCM/GMAC: https://csrc.nist.gov/pubs/800/38/d/final
- `research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

The final production suite remains security-review work.

## Sync envelope

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

## Device enrollment

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

## Device revocation

```text
revoke B
   ↓
control plane denies future B authorization
   ↓
remaining trusted device creates epoch N+1
   ↓
N+1 wrapped only for remaining authorized devices
   ↓
recovery wrap created for N+1
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

If two phones can execute the same source connection:

```text
connection
    ↓
one device claims short lease
    ↓
bounded source processing
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

Android WorkManager and Apple's BackgroundTasks APIs are the target OS-cooperative mechanisms rather than permanent wake/poll loops.

## Backoff

Transient failures:

```text
ceiling = min(cap, base * 2^attempt)
delay   = random(0, ceiling)
```

No busy retries while offline. Authentication failure transitions to reconnect/`NEEDS_AUTH`, not infinite retry.

## All-devices-lost recovery decision

The logical ownership model is now decided at spike level through ADR-005:

```text
SERVER MASTER KEY         REJECTED
PASSWORD-ONLY RECOVERY    REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY   ACCEPTED AT SPIKE LEVEL
PRIVATE RECOVERY KEY      USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP   REQUIRED
```

Recovery coverage is explicit:

```text
recoverable epoch
  ↓
matching tenant + recovery key id + epoch wrap exists
  ↓
RECOVERY-COVERED
```

After disaster recovery:

```text
restore through epoch N
        ↓
new device authorized from N+1
lost devices revoked from N+1
new tenant epoch N+1 required
new Recovery Key required
        ↓
future sync resumes
```

If all devices and the Recovery Kit are lost, cryptographic recovery is intentionally impossible. No hidden server bypass is permitted.

Evidence:

`../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`

## Current executable evidence

Validated bounded suite:

```text
E2EE / PERIPHERAL / RECOVERY / PNS   40 / 40 PASS
RECOVERY                             12 / 12 PASS
```

Recovery cases include:

```text
cloud without private recovery authority
wrong recovery key
multi-epoch restore
public-key-only non-decryptability
context binding
tamper rejection
all-devices-lost restore
Recovery Key rotation
historical authorizer validation
no-kit no-backdoor state
coverage completeness
post-recovery revocation + epoch/recovery rotation plan
```

The following data-model invariants are now `PROVEN_AT_SPIKE`:

```text
INV-SYNC-008
INV-SYNC-009
INV-SYNC-010
INV-SYNC-011
```

## Remaining recovery/crypto questions

The conceptual all-devices-lost ownership question is no longer open. Remaining questions are physical/production questions:

1. Which reviewed HPKE/AEAD/signature implementation and exact suite will be frozen for Android/iOS?
2. How long are historical tenant key epochs and recovery wraps retained?
3. How do encrypted backups interact with app deletion/account deletion?
4. How are schema migrations replayed across long-offline devices?
5. How is Recovery Kit export/import protected from clipboard, screenshot, backup and accidental cloud-sync leakage?
6. What account-authentication/re-authentication gate is required before serving recovery wraps?
7. How are physical post-recovery revocation and rotation demonstrated on Android/iOS?

These questions still prevent Q-005 closure.

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

Node evidence can only promote bounded properties to `PROVEN_AT_SPIKE`.

## Finding

Multi-device support turns local privacy into a combined cryptography + distributed-state + mobile-runtime + recovery problem. "Encrypted database + cloud backup" is not a sufficient architecture.

## Current decision

```text
TENANT_KEY_EPOCHS               ACCEPTED LOGICAL MODEL
PER_DEVICE_KEY_WRAPPING         REQUIRED
DEVICE_ORIGIN_SIGNATURE         REQUIRED CANDIDATE
OPAQUE_CLOUD_ENVELOPES          REQUIRED
DUPLICATE_REPLAY                MUST BE IDEMPOTENT
GLOBAL_LWW_FINANCIAL_STATE      REJECTED
DOMAIN_CONFLICT_RECORD          CANDIDATE
REVOCATION_MEANING              FUTURE ACCESS
PERMANENT_BACKGROUND_POLLING    REJECTED
OS_COOPERATIVE_SCHEDULING       REQUIRED
OFFLINE_IS_ERROR                NO
ALL_DEVICES_LOST_RECOVERY       SPIKE-ACCEPTED / ADR-005
SERVER_MASTER_KEY               REJECTED
PRODUCTION_CRYPTO_SUITE         OPEN / SECURITY REVIEW REQUIRED
PHYSICAL_MOBILE_RECOVERY        OPEN

MULTI_DEVICE_DESIGN             ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when:

- key hierarchy and epoch model selected/reviewed;
- audited production key-wrap/AEAD/signature implementation chosen;
- device enrollment/revocation sequence frozen;
- future-access revocation physically demonstrated;
- event ordering/conflict semantics frozen;
- all-devices-lost behavior remains reconciled with ADR-005;
- recovery coverage and post-recovery hardening are physically demonstrated;
- encrypted sync prototype demonstrates two-device convergence;
- duplicate delivery and lease failure remain economically idempotent;
- cloud inspection confirms no required financial plaintext;
- cloud inspection confirms no Recovery Private Key/plain tenant key authority;
- Android key storage/background behavior is physically measured;
- iOS key storage/background/expiration behavior is physically measured;
- Recovery Kit export/import leakage controls are physically tested;
- parasympathetic backoff/offline/resource rules are tested;
- Q-004 privacy matrices are reconciled with metadata leakage/key retention/deletion;
- SEC-001 and DM-001 are revalidated;
- release-grade evidence artifacts are stored under `mk0/10-evidence/`;
- closure receipt issued;
- `MULTI_DEVICE_DESIGN PASS` and `PRIVACY_MODEL PASS` evidence produced.
