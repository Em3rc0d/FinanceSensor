# MK0 / 07 — Pre-Build Remainder Execution

Status: **FROZEN**  
Design authority: `mk0/03-design/PREBUILD-REMAINDER-DESIGN.md`  
Machine mirror: `graph/prebuild-remainder-design.json`

## Execution invariant

No new FinanceSensor product build, signing campaign, physical campaign or closure PR may execute outside this sequence.

```text
UNMAPPED_PRODUCT_BUILD = FORBIDDEN
ONE_CANONICAL_CANDIDATE_PER_PHYSICAL_CAMPAIGN = REQUIRED
RAW_TRUSTED_EDGE_EVIDENCE_IN_GITHUB = FORBIDDEN
SANITIZED_RECEIPTS_IN_GITHUB = ALLOWED
```

## Phase 0 — Freeze validation

Entry:

- canonical Alpha.2 receipt exists;
- `graph/closure-ledger.json` still reports `buildReady=false`;
- Q-003/Q-004/Q-005 are not prematurely closed.

Exit:

```text
PREBUILD_REMAINDER_DESIGN=PASS
NEXT_EXECUTION_NODE=R1
```

No binary execution occurs in Phase 0.

## Phase 1 — R1 trusted-edge signing

Use only the canonical Alpha.2 APK pinned by the design graph.

### Required output set

```text
FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2001.apk
FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2001.apk.sha256
FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2001.apk.receipt.txt
```

The receipt is the only signing artifact eligible for repository ingestion. The private keystore/password remain outside the repository and outside sanitized evidence.

### Gate

R1 closes only if signer fingerprint, signed APK verification and canonical input identity all pass on one attempt.

## Phase 2 — R2 owned-device Alpha.2 campaign

One signed APK, one coherent campaign, one sanitized campaign receipt family.

### Run order

```text
R2.1 INSTALL_AND_LAUNCH
R2.2 EXACT_OAUTH_SCOPE
R2.3 STATEMENT_DISCOVERY
R2.4 BOUNDED_FETCH_AND_STRICT_PARSE
R2.5 SQLCIPHER_PERSIST_REOPEN
R2.6 RECONCILIATION
R2.7 ACCOUNT_GRAPH
R2.8 MONTHLY_COVERAGE
R2.9 SENSOR_V1
R2.10 DISCONNECT_CUSTODY
```

### Stop conditions

The campaign stops immediately when a failure would make later evidence misleading, including:

- binary identity mismatch;
- signer mismatch;
- OAuth scope/package mismatch;
- token/financial plaintext leakage;
- generic statement fallback used as authority;
- plaintext database fallback;
- false auto-confirm;
- false monthly completeness;
- Sensor numeric-confidence/advice authority.

A repaired implementation requires a new source/APK identity and therefore reopens R1 before R2 can rerun.

## Phase 3 — P0 quarry evidence

R3/R4/R5 may execute after R2 has established the product path they are validating. They can run in parallel only where their evidence does not mutate shared provider or recovery state.

### R3 / Q-003

Maps to physical campaign P1 + P7.

Outputs:

- Gmail lifecycle sanitized receipt;
- revoke/old-authority-denial receipt;
- provider verification/assessment applicability receipt;
- consent/data-path reconciliation.

### R4 / Q-004

Maps to P2 + P3.

Outputs:

- local credential custody inspection;
- log/storage plaintext inspection;
- cloud path inspection;
- delete/backup/resurrection receipt.

### R5 / Q-005

Maps to P4 + P5 + P6.

Outputs:

- Android↔iOS crypto interoperability receipt;
- negative crypto matrix receipt;
- witness/crash/partition receipt;
- all-devices-lost recovery receipt;
- new-epoch revocation proof.

## Phase 4 — R6 quarry closure

Do not combine evidence collection and closure mutation in the same conceptual step.

For each quarry:

1. collect all required receipts;
2. audit contradictions/residual risks;
3. create the closure receipt;
4. update `graph/closure-ledger.json`;
5. run closure validators;
6. merge only exact-head green;
7. revalidate merge SHA.

Required order is not Q-003 → Q-004 → Q-005; they may close independently when their evidence is complete. R6 closes only when all three are CLOSED.

## Phase 5 — R7 architecture/security reconciliation

No implementation changes by default. This is an audit against observed reality.

Reconcile at minimum:

```text
CORE-ARCHITECTURE.md
SECURITY-PRIVACY.md
THREAT-MODEL.md
PRIVACY-DATA-MATRIX.json
PRIVACY-RECOVERY-MATRIX.json
PRIVACY-DELETION-MATRIX.json
ADR-010
ADR-014
ADR-017
ADR-020
ADR-021..024
```

If observed evidence contradicts an architecture decision, reopen the decision before closing A-001/SEC-001.

## Phase 6 — R8 model/workflow/operations reconciliation

Audit the product model and operational model against the now-closed architecture/security boundary.

Expected closure targets:

```text
DM-001
WF-001
OPS-001
```

Any model correction that changes runtime semantics requires the affected earlier node to reopen; this phase is not permission to silently patch production behavior after physical evidence.

## Phase 7 — R9 G-MK0 consensus

Create one final MK0 closure receipt that resolves every dependency from the authoritative closure ledger.

Required checks:

- no ACTIVE/DRAFTED/BLOCKED node required by G-MK0 remains unresolved;
- all closure receipts exist;
- all receipt paths resolve;
- no residual P0 contradiction is unowned;
- physical/provider evidence boundaries remain accurately labeled;
- build-readiness validator is green on the exact candidate SHA.

## Phase 8 — R10 BUILD_READY transition

Only here may:

```text
closure-ledger.buildReady = true
build-readiness.buildReady = true
```

The same PR must prove `G-MK0=CLOSED` and all build-readiness laws. The transition is rejected if it merely changes booleans without satisfying the graph.

`RELEASE_READY` remains independently false until its own release gates close.

# Pull request / consensus policy

Every state-changing closure PR follows:

```text
fresh branch from current integration head
        ↓
small bounded diff
        ↓
exact-head validators
        ↓
review-thread check
        ↓
merge using expected head SHA
        ↓
post-merge workflow consensus
        ↓
receipt becomes accepted ancestor
```

PR CI PASS is not inherited by the merge SHA.

# Artifact identity policy

For executable artifacts, preserve three identities separately:

```text
SOURCE_COMMIT_SHA
ARTIFACT_ZIP_SHA256
INNER_BINARY_SHA256
```

Never substitute one digest for another.

# Build policy after this freeze

Once this design-freeze PR is merged and post-merge validation is green, build/sign/test work may resume **only** for the next mapped node (`R1`) or for a repair explicitly caused by a failed mapped node.

This is not `BUILD_READY=YES`; it is permission to execute the already-designed closure campaign.
