# EV-Q005 — Knee Stress / Revocation + Sync Identity Load Campaign

**Date:** 2026-09-01  
**Owner nodes:** `Q-005`, `SEC-001`, `DM-001`, `S-002`, `T-002`  
**Evidence level:** `PROVEN_AT_SPIKE` only  
**Final executable head:** `d09a420532d0f02ba904fec401932919065e66cc`

## Purpose

This campaign intentionally tried to break the load-bearing joints around:

```text
all-devices-lost recovery
        ↓
lost-device inventory
        ↓
revocation cutover
        ↓
frozen historical origin stream
        ↓
sync replay identity
        ↓
per-device origin sequence identity
        ↓
tenant-isolated materialization
        ↓
concurrent conflict resolution
```

The objective was not to increase a green-test counter. New adversarial tests were pushed **before** the corresponding fixes so that a red result could demonstrate a real weakness rather than a post-hoc assertion.

## Red → green progression

### Wave 1 — Recovery cutover authority

Red run: `33536490242`

```text
62 / 67 PASS
5 / 67 FAIL
```

The five failures showed that the final recovery gate did not yet prove:

1. a signed Revocation Barrier matched the history actually recovered;
2. every unexpected legacy device lost future authority;
3. semantically equivalent re-signed barriers were retry-equivalent;
4. distinct authentic cutover authorities failed closed as ambiguous;
5. recovered history evidence existed for every lost device.

After hardening `recovery-cutover.js`, `recovery.js` and the fixtures:

Green run: `33536698153`

```text
67 / 67 PASS
```

### Wave 2 — Historical identity + fatigue

Red run: `33536903293`

```text
72 / 74 PASS
2 / 74 FAIL
```

The failures exposed:

- one `event_id` could identify two different historical envelopes;
- a device active at the last recovered epoch could be omitted from the lost-device inventory if its authorization record had already been edited to revoke it at the next epoch.

The fixes added immutable historical replay identity and explicit completeness of the all-devices-lost inventory.

The load suite simultaneously exercised:

```text
16 signed sequence-fork positions       rejected
64-envelope historical stream           accepted when complete
reverse-order delivery                  accepted
triple exact relay delivery             idempotent
32 equivalent re-signed barriers        one semantic authority
epochs 1..7 historical / epoch 8 cut    enforced
cross-tenant unrelated auth record      ignored by tenant gate
```

### Wave 3 — Global sync replay identity

Red run: `33537418967`

```text
75 / 77 PASS
2 / 77 FAIL
```

The materializer was using `event_id` as a mutable map slot. Two deliveries with the same ID but different immutable content could silently become last-write-wins.

Fix:

```text
same event_id + same immutable header/action
→ exact retry / idempotent

same event_id + different immutable header/action
→ sync-event-id-content-conflict
→ FAIL CLOSED
```

Green run: `33537575478`

```text
77 / 77 PASS
```

### Wave 4 — Origin sequence fork + resolution fork

Red run: `33537682508`

```text
78 / 80 PASS
2 / 80 FAIL
```

The failures showed:

1. two distinct event identities could occupy the same `(tenant, origin_device, origin_sequence)` slot;
2. two simultaneous, incompatible user conflict-resolution actions selected a hidden winner instead of producing another explicit conflict.

Fixes:

```text
(tenant, origin_device, origin_sequence)
→ one immutable event identity

incompatible concurrent resolutions
→ CATEGORY_RESOLUTION_CONFLICT
→ no hidden winner

resolution pointing outside candidate set
→ CATEGORY_RESOLUTION_INVALID
→ no authoritative mutation

multiple resolutions selecting same candidate
→ retry-equivalent / converge
```

Green run: `33537847960`

```text
80 / 80 PASS
```

### Wave 5 — Tenant isolation

Red run: `33538059475`

```text
83 / 84 PASS
1 / 84 FAIL
```

The failure exposed a cross-tenant materialization weakness: decoded events from two tenants could enter one materialized state if a caller supplied them together.

Fix:

```text
one materialization
→ exactly one tenant

different tenant observed
→ mixed-tenant-materialization
→ FAIL CLOSED
```

Final green run: `33538235575`

```text
E2EE / KEY / RECOVERY / REVOCATION / KNEE / PNS   84 / 84 PASS
MK0 Foundation                                      3 / 3 jobs PASS
```

## Final load-bearing properties demonstrated

The bounded Node spike now demonstrates all of the following under the synthetic model:

```text
REVOCATION / RECOVERY
- final barrier must match actual recovered history
- every lost device needs recovered history evidence
- every device active at the recovered epoch must be accounted for
- no undeclared tenant device may retain next-epoch authority
- semantically equivalent barrier retries collapse safely
- distinct authentic barrier semantics fail closed
- historical event_id reuse fails closed
- historical per-sequence forks fail closed
- historical gaps fail closed
- cutover epoch cannot masquerade as old history
- old-history replay is reorder-tolerant and exact-duplicate-idempotent

SYNC IDENTITY
- event_id is immutable, not a mutable slot
- exact event replay remains idempotent
- same event_id with changed header/action fails closed
- one tenant/device/sequence slot has one event identity
- equal sequence numbers on different devices remain independent
- materialization cannot mix tenants

CONFLICT RESOLUTION
- incompatible concurrent corrections create explicit conflict
- incompatible concurrent resolutions create explicit meta-conflict
- invalid resolution target fails closed
- concurrent same-choice resolutions converge
```

## Failure count is evidence, not embarrassment

Across the five adversarial waves, **12 newly introduced red assertions** exposed assumptions that the earlier green suite did not protect. Each was either repaired and rerun green or, where the problem belongs outside the local model, recorded below as an explicit non-claim.

The campaign therefore strengthens the meaning of green CI: the current 84/84 suite is materially harder than the previous 62/62 suite.

## Explicit non-claims / remaining knee limits

### Malicious relay withholding is not solved by signatures alone

The current model detects:

```text
tampering
substitution
extension
forks
ambiguous authorities
known-history mismatch
```

It does **not** prove Byzantine availability.

A malicious relay that withholds both an envelope the recovering device has never seen **and** the cutover information that would reveal its existence may prevent the device from learning that the hidden data exists.

On a fresh recovery device with no independent trusted checkpoint:

```text
FIRST-SEEN COMPLETE-LOOKING PREFIX
        ≠
PROOF THAT THE RELAY DID NOT WITHHOLD A LATER PREFIX
```

Closing that stronger property requires a separately reviewed anti-rollback / transparency / trusted-checkpoint design. Candidate directions may include a locally protected monotonic checkpoint carried through recovery, a user-held recovery commitment, or another independently authenticated transparency mechanism. No choice is frozen by this evidence.

### Production history commitment is not selected

The spike uses deterministic SHA-256 commitments over the bounded accepted stream to prove semantics. Production may require a reviewed append-only hash chain, Merkle structure or equivalent construction. The current spike is not production cryptography.

### Physical platform proof remains open

This campaign does not prove:

```text
Android Keystore / StrongBox persistence
Apple Keychain / Secure Enclave persistence
Android ↔ iOS interoperability
real control-plane authorization enforcement
real crash/restart atomicity at cutover
long-offline network behavior
real Recovery Kit export/import controls
real barrier storage/retention/deletion
side-channel resistance
penetration-test results
```

## Result

```text
KNEE STRESS                      PASS AT SPIKE LEVEL
FINAL E2EE/PNS SUITE             84 / 84 PASS
FOUNDATION                       3 / 3 PASS
NEWLY EXPOSED RED ASSERTIONS     12
HIDDEN LAST-WRITE-WINS PATHS     CLOSED IN TESTED MODEL
CROSS-TENANT MATERIALIZATION     CLOSED IN TESTED MODEL
BYZANTINE RELAY AVAILABILITY     NOT CLAIMED
ANTI-ROLLBACK TRUST ANCHOR       OPEN
Q-005                            ACTIVE
BUILD_READY                      false
```

This evidence strengthens the logical knee. It does not convert Q-005 into release-grade `PROVEN` or authorize unrestricted implementation.
