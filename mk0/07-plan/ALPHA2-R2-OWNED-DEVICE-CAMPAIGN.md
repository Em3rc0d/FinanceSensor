# Alpha.2 R2 — Single Owned-Device Campaign

Status: **DESIGN FROZEN / R1 PASS / R2 READY / OD0 READY**

## Purpose

R2 is one controlled owned-Android campaign over exactly one stable-signed Alpha.2 APK. It is not a sequence of per-slice APK promotions and it is not a substitute for the later Q-003/Q-004/Q-005 closure phases.

```text
R1 trusted-edge signing — PASS
        ↓ sanitized +2006 receipt bound
OD0 install + launch — READY
        ↓
OD1 exact gmail.readonly OAuth
        ↓
OD2 metadata-first discovery
        ↓
OD3 bounded profile fetch
        ↓
OD4 BCP Savings strict geometry parse
        ↓
OD5 SQLCipher + Android Keystore persist/reopen
        ↓
OD6 reconciliation / no double count
        ↓
OD7 account graph ownership gate
        ↓
OD8 monthly coverage truth
        ↓
OD9 Sensor + dashboard truth
        ↓
OD10 disconnect + secret custody
        ↓
OD11 same-APK replay/idempotency
        ↓
R2 sanitized receipt
```

## Current identity law

R1 is closed on the post-merge `+2006` authority. Every OD0..OD11 observation MUST bind the same stable signed APK produced from this canonical input:

- candidate: `0.2.0-alpha.2+2006`
- source: `e26bab7cd87c5e686898998e867d8fb25c99db27`
- canonical run: `34278019055`
- canonical job: `102235745821`
- canonical artifact: `10076715491`
- canonical artifact ZIP SHA256: `f1d958a7134bd56595bbea8680c48099fa4169f3209d17625e1000c81cee5309`
- canonical input APK SHA256: `11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179`
- canonical input APK bytes: `182102047`
- stable signed APK SHA256: `36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0`
- stable signed APK bytes: `182125094`
- package: `com.financesensor.lab.gmailconnection.r2`
- scope: `gmail.readonly`
- stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- R1 handoff bundle: `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v8.zip`
- R1 physical receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json`

The historical `+2001` design snapshot remains immutable in the prebuild design. The source/APK reopen law moves execution authority without rewriting that historical snapshot. All `+2005` signing/physical observations are historical only after the `+2006` source/APK identity change.

The prior `+2005` stable-signed APK (`530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85`) MUST NOT donate OD evidence to `+2006`.

If the stable-signed `+2006` APK hash changes after R2 starts, the entire R2 campaign is invalidated and must restart from OD0. Evidence from two APK hashes must never be combined.

## Campaign rules

1. **One APK, one campaign.** No per-slice physical promotion.
2. **Fail closed.** A FAIL or INCONCLUSIVE gate does not get converted to PASS by a later gate.
3. **No synthetic inheritance.** CI PASS cannot satisfy an OD gate.
4. **No signature inheritance.** Install/launch or OAuth observed on another candidate cannot satisfy `+2006`.
5. **No raw evidence in GitHub.** Only sanitized receipts may be committed.
6. **No hidden coverage.** Missing or quarantined sources remain visible gaps.
7. **No generic statement parser authority.** BCP Credit and Ripley Credit remain fetch/parse quarantined until their own physical profiles close.
8. **No numeric confidence UX.** Reconciliation scores remain internal; public truth uses states.
9. **No readiness shortcut.** R2 PASS does not close Q-003, Q-004, Q-005, G-MK0, BUILD_READY or RELEASE_READY.
10. **Single-pass diagnostic contract.** The current `+2006` UI may expose only coarse statement-stage outcomes; it must not expose passwords, raw PDF/Gmail identifiers, financial plaintext or provider exception details.

## OD gates

### OD0 — Stable signed APK install and launch
Install exactly the stable `+2006` APK with SHA256 `36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0`. Prove signer identity, APK hash match, successful install and successful launch. Do not record device identifiers beyond a coarse device class/API level in the sanitized receipt.

### OD1 — Exact Gmail readonly OAuth
Prove the package is the frozen R2 package and requested authority is exactly `gmail.readonly`. R2 does not request offline access.

### OD2 — Metadata-first statement discovery
Prove discovery inspects metadata before attachment bytes and does not expose real Gmail identifiers to Dart/public projection.

### OD3 — Bounded fetch
Only a STRONG fetch-eligible profile may download attachment bytes. BCP Savings is the current allowed physical path. BCP Credit and Ripley Credit remain blocked.

### OD4 — BCP Savings strict parse
Use geometry/header authority. A monetary row that cannot be explained quarantines the batch. PDF password is session-only; raw PDF is not durable. The `+2006` single-pass outcome surface may distinguish password/PDF/parser rejection without converting uncertainty into import.

### OD5 — Financial vault
Prove SQLCipher 4.18.0 + Android Keystore protected path, persistence/reopen, `noBackupFilesDir`, and absence of plaintext SQLite fallback.

### OD6 — Reconciliation
Prove a strong Gmail+statement match materializes once, ambiguity fails closed, currency boundaries hold, and no double count appears.

### OD7 — Account graph
Bank+currency alone cannot system-confirm ownership. Missing mapping must remain visible rather than silently closing the month.

### OD8 — Monthly coverage
Inflow/outflow remain independent, expected missing sources block RECONCILED, conflicts remain visible, and no unqualified global percentage appears.

### OD9 — Sensor/dashboard
No public numeric confidence, no automated financial advice, transfers/card payments stay outside expense, PEN/USD remain separate, and knowledge gaps are visible.

### OD10 — Disconnect/custody
Prove local disconnect behavior, protected credential removal/denial semantics, and absence of token/Gmail/financial plaintext in ordinary storage/logs. This is feeder evidence only; broader Q-004 deletion/backup remains open.

### OD11 — Replay/idempotency
Repeat the same bounded campaign input on the same stable signed APK. Canonical movements must not duplicate and semantic output must remain stable. Store only a sanitized replay digest/counters.

## Sanitized receipt

Authoritative schema: `graph/alpha2-r2-sanitized-receipt-schema.json`.

Allowed evidence is coarse: hashes, package/scope, API level, gate statuses, stable result codes, counts and replay digests. Never commit keystore material, passwords, bearer/refresh tokens, Gmail IDs/body/MIME, raw PDFs, account numbers, merchant-level samples or transaction plaintext.

## What R2 feeds

- R3 / Q-003 may consume OD1/OD2/OD3/OD10 as owned-Android evidence.
- R4 / Q-004 may consume OD2/OD4/OD5/OD10 as owned-Android privacy evidence.
- R5 / Q-005 may consume OD5 only as local Android crypto evidence.

R2 cannot satisfy provider verification, backup/deletion lifecycle, Android↔iOS crypto interoperability, witness quorum, partition recovery or all-devices-lost recovery. Those remain separate physical/provider nodes by design.

## Reopen law

```text
SOURCE / CANONICAL APK changed      → reopen R1 + R2
SIGNED APK hash changed             → invalidate all OD0..OD11 evidence
PACKAGE / SCOPE / data path changed → reopen R2 + R3 + R4 + R7
VAULT crypto semantics changed      → reopen OD5..OD11 + dependent audits
financial authority changed         → reopen affected OD6..OD11
```

Current execution state:

```text
R1_TRUSTED_EDGE_SIGNING = PASS
R2_PHYSICAL_CAMPAIGN    = READY
R2_NEXT_GATE            = OD0_SIGNED_APK_INSTALL_AND_LAUNCH
OD0                     = READY_FOR_PHYSICAL
OD1..OD11               = BLOCKED_BY_PRIOR_GATE
PHYSICAL_ALPHA2_PASS    = NO
Q003_Q004_Q005          = ACTIVE
G_MK0                   = OPEN
BUILD_READY             = NO
RELEASE_READY           = NO
```
