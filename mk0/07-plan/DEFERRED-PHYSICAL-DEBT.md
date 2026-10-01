# Deferred Physical Debt — MK0

**Status:** ACTIVE  
**Date:** 2026-09-03  
**Authority:** `graph/deferred-physical-debt.json`

## Purpose

FinanceSensor must be able to continue rigorous work when a specific owned physical device is temporarily unavailable **without pretending the missing physical proof is complete**.

This ledger records such work as deferred physical debt.

```text
DEFERRED != WAIVED
DEFERRED != PASS
STATIC PASS != PHYSICAL PASS
SIMULATOR PASS != OWNED-DEVICE PASS
CONTINUE WORK != CHANGE CLOSURE GRAPH
```

The current deferred device is an owned iPhone. Android/control-edge work may continue. iOS physical claims remain open until a later bounded return campaign.

## Current debt

### TD-IOS-P2-001 — iOS OAuth custody and local privacy physical proof

P2 remains `PHYSICAL_EVIDENCE_REQUIRED`.

Already resolved:

- `ANDROID_PROTECTED_OAUTH_CUSTODY` — receipt-bound physical PASS;
- `RESTORE_BEHAVIOR_DOCUMENTED` — contract PASS.

Deferred until an owned iPhone is available:

- `IOS_PROTECTED_OAUTH_CUSTODY`;
- `NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE`;
- `NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS`;
- `DISCONNECT_REMOVES_PROTECTED_CREDENTIAL`.

This debt blocks promotion of P2, physical promotion of P3, P7 closure, Q-003 closure, Q-004 closure, P8 and `BUILD_READY`.

It does **not** block static bridge repair, hosted macOS compile checks, harness authoring, Android work or non-promotional downstream preparation.

### TD-IOS-P4-001 — iOS mobile crypto interoperability physical proof

P4 requires actual Android↔iOS interoperability plus Apple protected-key evidence. Hosted macOS and iOS Simulator may validate source compatibility and deterministic vectors but may not promote the physical claims.

The full P4 claim set therefore remains physically open until the iPhone sweep.

This debt blocks P4 PASS and therefore the physical promotion chain P5 → P6 → Q-005 → P8 → `BUILD_READY`.

It does **not** block authoring the P4 vectors/harness, preparing the P5 witness failure campaign, or preparing the P6 recovery harness.

### TD-IOS-COMPILE-001 — current static prerequisite

The first isolated hosted-macOS compile resolved the pinned Google Sign-In package and reached `xcodebuild`, where the reference bridge failed to compile.

This item is **not deferred physical debt**. It is work to solve now. We do not wait for an iPhone to fix source/API compatibility.

Return condition:

```text
HOSTED_MACOS_IOS_GMAIL_CUSTODY_COMPILE_PASS
```

Only after that and the remaining static P2/P4 harness gates are green is an iPhone session worth requesting.

## Return campaign — IOS-PHYSICAL-SWEEP-01

The next iPhone session should be intentionally bundled instead of repeatedly asking for device access.

### Entry gates

Before the device session:

1. iOS Gmail custody bridge compiles against the pinned SDK;
2. P2 static harness is green;
3. P4 crypto interoperability harness/vectors are green;
4. receipt sanitizer is green;
5. exact test sequence is frozen.

### Device session objectives

Use one bounded owned-iPhone campaign to collect the missing evidence for:

- P2 iOS OAuth custody;
- cross-platform ordinary-storage/log/disconnect claims;
- P4 Android↔iOS crypto interoperability;
- Apple protected-key / no-exportable-fallback behavior.

If any required claim fails, record FAIL and reopen the corresponding design/implementation boundary. Do not split a failed session into selective PASS claims unless the campaign contract explicitly permits independent claim promotion.

## Work that proceeds now

### 1. P1 — next physical execution frontier

P1 depends only on P0 and requires no iPhone. It is now the highest-leverage physical gate.

Target evidence:

- successful provider authority use before revoke;
- minimum `gmail.readonly` scope;
- request bytes per exercised endpoint;
- response bytes per exercised endpoint;
- per-endpoint latency;
- provider revoke acceptance;
- denial of old authority after revoke;
- sanitized result with no real Gmail content.

The existing Android R2 work already gives us a strong starting point, but provider revoke remains open until the required provider result is physically demonstrated.

### 2. Prepare downstream phases without promoting them

While iOS is deferred, we may continue:

- P3 transport/storage/deletion harness design and Android/local inspection preparation;
- P4 deterministic cross-platform vectors, negative fixtures and source-level implementations;
- P5 three-witness topology/failure harness preparation;
- P6 recovery campaign fixtures, state machine and evidence protocol.

This is preparation only. A downstream phase cannot be promoted to PASS while a required physical dependency remains unmet.

## Sweep rule

Whenever we later decide to clear deferred debt, search `graph/deferred-physical-debt.json` first. Every item must end in one of these outcomes:

```text
PASS_WITH_BOUND_RECEIPT
FAIL_AND_REOPEN
SUPERSEDED_BY_RECORDED_ARCHITECTURE_DECISION
```

Simply deleting a debt entry is forbidden.

## Final law

```text
IPHONE_UNAVAILABLE != PROJECT_BLOCKED
IPHONE_UNAVAILABLE != IOS_PROVEN
DEBT_RECORDED + GATES_PRESERVED = SAFE TO CONTINUE
BUILD_READY REMAINS GRAPH-DEFINED
```
