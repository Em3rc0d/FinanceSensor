# MK0 / 03 — Pre-Build Remainder Design

Status: **DESIGN_FREEZE = PASS**  
Machine authority: `graph/prebuild-remainder-design.json`  
Closure authority remains: `graph/closure-ledger.json`  
Build readiness authority remains: `graph/build-readiness.json`

## Why this document exists

FinanceSensor already has a certified Alpha.2 product runtime and one canonical APK identity. The remaining risk is no longer “what should we build?” but “what evidence must exist before the remaining graph may close?”.

This document freezes that answer before any new product build, trusted-edge signing campaign, provider closure, multi-device campaign, or final MK0 transition.

```text
DESIGN_FREEZE_PASS != BUILD_READY
STATIC_PASS        != PHYSICAL_PASS
APK_BUILD_PASS     != BUILD_READY
PHYSICAL_PASS      != RELEASE_READY
```

No future product build may introduce an execution path that is not mapped to the frozen remainder graph. If a new requirement appears, the design must be reopened before implementation.

## Frozen starting point

The only Alpha.2 binary allowed to enter the trusted-edge signing lane is:

```text
candidate     0.2.0-alpha.2+2001
source        f658363772b8d3652a81a8a4275a571f2f409ed8
apk sha256    7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
apk bytes     182053563
package       com.financesensor.lab.gmailconnection.r2
scope         gmail.readonly
signer sha1   63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
```

A rebuild from the same source is not interchangeable with this APK. A different source SHA, APK hash, package, scope, or expected signer identity reopens the affected node.

# Remainder topology

```text
R0 Canonical Alpha.2 receipt                CLOSED
        │
        ▼
R1 Trusted-edge signing                     EXECUTION OPEN
        │
        ▼
R2 One owned-device Alpha.2 campaign        BLOCKED ON R1
        ├──────────────┬────────────────┐
        ▼              ▼                ▼
R3 Q-003           R4 Q-004         R5 Q-005
Gmail/provider     privacy           multi-device/recovery
        └──────────────┴────────────────┘
                       ▼
R6 Q-003/Q-004/Q-005 closure receipts
                       ▼
R7 A-001 + SEC-001 closure audit
                       ▼
R8 DM-001 + WF-001 + OPS-001 closure audit
                       ▼
R9 G-MK0 closure
                       ▼
R10 BUILD_READY transition
```

`RELEASE_READY` is not part of this implication chain.

# R1 — Trusted-edge signing

## Purpose

Convert the canonical public-CI debug APK into a stable R2-signed physical-test artifact without allowing private signing material to cross into GitHub or ChatGPT-managed evidence.

## Inputs

- exact canonical APK identity;
- public `apksigner` tool;
- local private R2 keystore;
- local session-only password entry;
- frozen expected certificate SHA-1.

## PASS

All of the following must hold on the same attempt:

```text
INPUT_SHA256_AND_BYTES_MATCH_CANONICAL_RECEIPT
STABLE_R2_SIGNER_FINGERPRINT_MATCHES
SIGNED_APK_APKSIGNER_VERIFY_PASS
SANITIZED_SIGNING_RECEIPT_CREATED
NO_PRIVATE_KEY_OR_PASSWORD_IN_GITHUB
```

## FAIL-CLOSED

Any mismatch or signing/verification failure deletes the untrusted output and blocks R2. A partially generated APK is not evidence.

# R2 — Single owned-device Alpha.2 campaign

This is one bounded product campaign against one signed candidate. We do not create a different APK per subsystem.

## Execution order

### 1. Install / launch identity

Prove the signed candidate installs and launches on an owned Android device. Record only sanitized device/OS classification and binary identity.

### 2. OAuth boundary

Prove the package requests exactly `gmail.readonly`. No offline/server auth path may appear and no token may be printed in evidence.

### 3. Metadata-first statement discovery

Prove statement discovery starts from metadata. Attachment bytes remain unfetched until the source profile is allowed by the runtime contract.

### 4. Bounded fetch / parser boundary

BCP Savings may proceed only through its strict adapter. Unsupported or insufficiently understood statement formats remain quarantined; there is no generic fallback authority.

### 5. SQLCipher persistence

Prove the product writes the accepted financial material through SQLCipher 4.18.0, can reopen it correctly, and has no plaintext SQLite fallback or ordinary backup path.

### 6. Reconciliation

Prove ambiguous candidates do not auto-confirm; required score/margin/stable-anchor rules remain intact.

### 7. Account graph

Prove bank+currency alone cannot confirm ownership and the user-confirmation / stable-evidence boundaries behave as designed.

### 8. Monthly coverage

Prove incomplete sources, unresolved conflicts, excluded sources, or late evidence cannot create a false global “complete” state.

### 9. Sensor V1

Prove the mobile projection remains deterministic, does not publish numeric confidence as truth, does not enable LLM authority, and does not produce automated financial advice.

### 10. Disconnect / custody

Prove disconnect removes protected credential authority according to the platform contract without leaking secrets into ordinary storage/logs.

## R2 PASS law

```text
ALL_SUBGATES_PASS_ON_SAME_SIGNED_CANDIDATE
```

A partial pass is useful evidence but does not close R2.

# R3 — Q-003 Gmail production / provider closure

R3 consumes the R2 physical product proof and the provider-specific phases P1 + P7.

It must establish:

- successful minimum-scope refresh before revoke;
- request/response byte accounting and per-endpoint latency evidence;
- provider revoke accepted;
- old refresh authority denied after revoke;
- Google restricted-scope verification status recorded;
- security-assessment applicability determined from the provider policy path, not guessed by us;
- required assessment completed if applicable;
- public consent/disclosure package matches the actual implemented data path.

Only then may `Q-003` receive a closure receipt.

# R4 — Q-004 privacy / deletion / backup closure

R4 binds product custody evidence with physical privacy inspection.

PASS requires evidence that:

- OAuth token plaintext is absent from ordinary storage;
- token/Gmail/financial plaintext is absent from ordinary logs/crash evidence;
- raw Gmail content is not durable after extraction;
- forbidden financial plaintext is absent from the normal cloud path;
- disconnect removes protected credential authority;
- cloud envelopes and control metadata follow the deletion contract;
- the deletion resurrection barrier prevents stale backups from restoring authority;
- backup retention remains within the existing 35-day ceiling.

A single positive storage observation invalidates the relevant privacy claim until repaired and re-run.

# R5 — Q-005 multi-device / recovery closure

The current MK0 contract requires cross-platform evidence; this is not allowed to disappear merely because Android is the first physical product target.

## Crypto interoperability

- Android wrap → iOS unwrap;
- iOS wrap → Android unwrap;
- Android sign → iOS verify;
- iOS sign → Android verify;
- negative matrix fails closed;
- protected-key use proven;
- no silent exportable-key fallback.

## Witness / partition

- 3 witnesses / 2-of-3 quorum;
- at least 2 failure domains;
- at least one witness independent of the ordinary relay;
- contradiction cannot be voted away;
- crash/restart fails closed;
- partition/rejoin converges without choosing a false latest state.

## All-devices-lost recovery

- recovery succeeds from the defined recovery kit;
- lost device inventory is complete;
- tenant root key rotates;
- recovery key rotates;
- N+1 recovery coverage is created;
- old device and old recovery kit cannot authorize the new epoch.

Only then may `Q-005` close.

# R6 — Quarry closure receipts

R3/R4/R5 PASS do not mutate the ledger automatically. R6 is an explicit audit.

Required outputs:

```text
mk0/11-decisions/closure-receipts/Q-003.md
mk0/11-decisions/closure-receipts/Q-004.md
mk0/11-decisions/closure-receipts/Q-005.md
```

Each receipt must bind exact evidence, record residual risk and state why the node may close. The closure graph is then revalidated.

# R7 — A-001 / SEC-001 audit

Architecture and security remain drafted until the P0 quarries close because physical evidence can falsify assumptions.

R7 closes only when:

- the core architecture matches the observed edge/cloud boundary;
- security/privacy documentation matches actual custody, deletion and recovery behavior;
- no documentary claim exceeds the strongest physical evidence;
- every residual risk has an explicit owner/status.

# R8 — DM-001 / WF-001 / OPS-001 audit

After architecture/security closure:

- `DM-001` must match canonical transaction semantics, account graph, monthly coverage, SQLCipher and sync-key semantics;
- `WF-001` must match the signature UX, review states, reconciliation and recovery flows;
- `OPS-001` must match provider revocation, deletion, backup, witness and recovery operations.

No unresolved P0 contradiction may remain.

# R9 — G-MK0

`G-MK0` is a consensus node, not a checkbox. It may close only after the authoritative ledger confirms every dependency is in its contracted terminal state and all receipts resolve to real evidence.

# R10 — BUILD_READY

Only after `G-MK0 = CLOSED` may the build-readiness state transition to true.

```text
G_MK0_CLOSED  => BUILD_READY may become YES
BUILD_READY   != RELEASE_READY
```

# Evidence custody

Raw evidence may contain sensitive provider or local-device information and remains on the controlled local edge.

GitHub may receive only sanitized receipts containing the minimum useful fields, for example:

```text
candidate id
source commit
input/signed APK digest
receipt schema/version
opaque device class
platform/version class
PASS/FAIL per gate
provider operation result category
byte/latency aggregates when required
no email address
no token
no account/card number
no statement plaintext
no private key
no PDF password
```

# Reopen rules

The design is intentionally fail-open toward revalidation and fail-closed toward certification:

- source SHA or canonical APK digest changes → reopen R1/R2;
- OAuth package, scope or data path changes → reopen R2/R3/R4/R7;
- crypto/sync/witness/recovery changes → reopen R5/R7/R8;
- deletion/backup/retention changes → reopen R4/R5/R7/R8;
- Google policy/security-assessment requirement changes → reopen R3/R7.

# What is now frozen

```text
REMAINDER_DESIGN                  PASS
CANONICAL_ALPHA2_IDENTITY         FROZEN
NEXT_EXECUTION_NODE               R1_TRUSTED_EDGE_SIGNING
UNMAPPED_PRODUCT_BUILD            FORBIDDEN
Q003_Q004_Q005                    ACTIVE
A001_SEC001_DM001                 NOT_CLOSED
G_MK0                             OPEN
BUILD_READY                       NO
RELEASE_READY                     NO
```

The next build/sign/test activity must consume this design; it may not invent a parallel path around it.
