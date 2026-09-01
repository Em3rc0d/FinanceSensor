# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** OPEN

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content?

## Target model

```text
Device A
  ↓ canonical event
  ↓ encrypt with tenant-scoped key
Cloud opaque event/envelope store
  ↓
Device B
  ↓ decrypt locally
  ↓ replay/materialize
Same financial state
```

## Ownership model

- `Tenant` owns the financial state.
- `Device` is an authorized execution node.
- `Connection` belongs to Tenant.
- One device may temporarily execute a Connection through a `ProcessingLease`.

## Why processing leases

If Pixel and iPhone both have access to the same Gmail connection, both must not independently create economic duplicates.

Candidate flow:

```text
connection-123
    ↓
Device A claims short lease
    ↓
Device A performs incremental processing
    ↓
lease released/expires
```

The lease reduces redundant work; canonical idempotency remains mandatory because leases can fail.

## Candidate key hierarchy

```text
Tenant Data Key
├── Ledger subkey
├── Evidence subkey
└── Backup/recovery subkey (if approved)

Device A keypair
Device B keypair
```

Tenant key material may be wrapped for each authorized device. Exact cryptographic construction remains OPEN and requires dedicated review.

## Event synchronization candidate

Each event carries non-financial routing metadata plus encrypted payload:

```text
event_id
tenant_id
origin_device_id
device_sequence
schema_version
created_at
ciphertext
ciphertext_hash
```

The cloud may need routing/version metadata; it should not need plaintext amount, merchant, category or email content.

## Conflict model

Corrections and classifications from multiple devices require deterministic merge semantics. Options to evaluate include:

- append-only user actions with deterministic replay;
- CRDT-inspired state for selected fields;
- server-sequenced opaque event ordering;
- explicit conflict records for non-commutative edits.

Do not select a mechanism merely because it is fashionable; model actual FinanceSensor mutation types first.

## Recovery questions

1. What happens when all authorized devices are lost?
2. Is zero-knowledge recovery required in v1?
3. Can recovery be optional with an explicit trade-off?
4. How are revoked-device key wrappers rotated?
5. How do encrypted backups interact with app deletion/account deletion?
6. How are schema migrations replayed across offline devices?

## Finding

Multi-device support turns local privacy into a distributed-system problem; “encrypted database + cloud backup” is not a sufficient design.

## Closure criteria

- key hierarchy selected and reviewed;
- device enrollment/revocation sequence specified;
- event ordering/conflict semantics specified;
- lost-device and all-devices-lost behavior explicitly documented;
- encrypted sync prototype demonstrates two-device convergence;
- cloud inspection confirms no financial plaintext is required;
- `MULTI_DEVICE_DESIGN PASS` and `PRIVACY_MODEL PASS` evidence produced.
