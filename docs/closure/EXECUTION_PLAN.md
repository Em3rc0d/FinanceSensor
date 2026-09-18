# FinanceSensor / PocketFinances — Action, Execution and Implementation Plan

**Plan authority:** closure roadmap for `jett/mk0-foundation`  
**Status:** ACTIVE  
**Reconciled:** 2026-09-17  
**Rule:** no gate is closed by prose. Every closure requires evidence bound to the exact candidate identity.

## 1. Objective

Move FinanceSensor from the current Alpha.2 `+2014` pre-signing frontier to a correctly certified, documented and releasable Android product without weakening the fail-closed model.

The plan separates product/runtime implementation, deterministic CI evidence, trusted-edge private evidence, owned-device physical evidence, governance/documentation, build readiness and release readiness. A green CI run alone is not project completion.

## 2. Current starting point

```text
candidate                       0.2.0-alpha.2+2014
canonical source               8e5bb535a7263beab0b687b616dff88205da58f3
canonical run                  35291827028
canonical artifact             10526841901
unsigned APK SHA256            72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3
unsigned APK bytes             182550031
R1 v14 bundle SHA256           eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be
R1 v14 bundle bytes            86665753
trusted-edge signing           REQUIRED
OD0                            BLOCKED_BY_R1
PHYSICAL_ALPHA2_PASS           NO
BUILD_READY                    NO
RELEASE_READY                  NO
```

The +2014 change is diagnostic-only. Parser/geometry/PDF-reader identities remain frozen from +2013 by the candidate-cut validator. Physical evidence from +2013 is historical and non-inheritable.

## 3. Closure graph

```text
+2014 canonical unsigned
        ↓
R1 v14 deterministic bundle freeze
        ↓
R1 trusted-edge signing                  ← current frontier
        ↓
stable-signed +2014 identity freeze
        ↓
OD0 exact signed install + launch
        ↓
R2 finite owned-device campaign
        ↓
safe strict-review cause evidence
        ↓
PHYSICAL_ALPHA2_PASS?
   ├─ NO  → typed remediation → new candidate identity → restart R1/R2
   └─ YES → Q-003 / Q-004 / Q-005
                    ↓
          A-001 / SEC-001 / DM-001
                    ↓
                  G-MK0
                    ↓
               BUILD_READY
                    ↓
          release candidate freeze
                    ↓
              RELEASE_READY
```

## 4. Workstream A — protect the +2014 authority chain

### A1. Canonical freeze — CLOSED

PR #152 froze the canonical unsigned candidate. PR #153 froze the R1 v14 bundle. PR #154 reconciled the prebuild graph after the source/APK identity change.

Laws:

- do not mutate the +2014 product source in place;
- do not inherit physical PASS from +2013 or older candidates;
- do not substitute a CI/debug signer for the stable signer;
- do not treat documentation-only changes as a product identity change;
- do not allow public CI to synthesize trusted-edge or physical PASS.

### A2. R1 trusted-edge signing — CURRENT

Use only `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v14.zip` with frozen SHA-256 `eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be`.

Required result:

- canonical input hash/bytes match;
- stable signer SHA1 matches `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`;
- signed APK verifies with apksigner;
- sanitized signing receipt produced;
- no private keystore/password/key enters GitHub.

Any failure leaves R1 open and R2 blocked.

## 5. Workstream B — physical Alpha.2 certification

### B1. OD0

OD0 becomes reachable only after the exact signed +2014 identity is frozen on the base branch.

Required evidence includes signed APK SHA-256, byte length, signer identity, `versionCode=2014`, exactly one authorized owned Android device, data-preserving `adb install -r`, successful package/launch verification and a sanitized receipt.

Never persist or upload device serials, OAuth tokens, Gmail content, statement PDFs, PDF passwords, account numbers or financial plaintext.

### B2. R2 consolidated campaign

Exercise the intended user journey rather than only app launch:

- exact Gmail read-only OAuth boundary;
- metadata-first source discovery;
- bounded attachment fetch;
- profile-scoped session-only password behavior;
- BCP Savings strict parse;
- Ripley Credit strict parse;
- BCP Credit structural probe without financial evidence;
- unsupported profile/input fail-closed behavior;
- safe +2014 strict-review cause diagnostics;
- SQLCipher/local persistence and reopen;
- canonical reconciliation/no-double-count;
- financial dashboard materialization;
- disconnect/secret cleanup;
- safe diagnostics without raw errors.

For each gate:

```text
PASS         -> advance
FAIL         -> type the defect; if source changes, cut a new candidate and reset non-inheritable evidence
INCONCLUSIVE -> repeat only for genuine environment/evidence ambiguity
```

## 6. Workstream C — MK0 exit

Only after physical Alpha.2 PASS:

```text
Q-003
Q-004
Q-005
  ↓
A-001
SEC-001
DM-001
  ↓
G-MK0
  ↓
BUILD_READY
```

Each gate must identify its canonical requirement, validator, evidence and exact authority SHA. Dependent gates do not close while prerequisites remain open.

## 7. Workstream D — documentation closure

Living documentation must be regenerated from actual evidence and classify claims as PROVEN, PLANNED, OUT_OF_SCOPE or UNVERIFIED.

Before release finalize:

- architecture and trust boundaries;
- canonical data/evidence model;
- supported/unsupported bank/profile matrix;
- Gmail/OAuth privacy boundary;
- parser registry;
- safe diagnostic catalog;
- CI/runner governance;
- trusted-edge signing runbook;
- owned-device certification runbook;
- installation/onboarding/troubleshooting;
- known limitations;
- release runbook;
- requirement → gate/test → evidence manifest.

## 8. Workstream E — release candidate

After `BUILD_READY=YES`:

- freeze exact release source;
- freeze exact signed distributable;
- run release-level automated regression;
- reproduce artifact from documented build path;
- validate install/upgrade and persistence/replay expectations;
- execute final bounded physical smoke/UAT;
- finalize privacy/secrets review, release notes, known limitations and evidence manifest.

Only then may `RELEASE_READY=YES` be considered.

## 9. Priority order

### P0

1. Trusted-edge sign exact +2014.
2. Freeze signed +2014 identity and sanitized receipt.
3. Generate/unlock +2014 OD0 handoff.
4. Complete OD0.
5. Complete R2 and observe safe strict-review causes.
6. Remediate only evidence-backed defects; cut a successor candidate if source changes.
7. Reach `PHYSICAL_ALPHA2_PASS=YES`.
8. Close Q-003/Q-004/Q-005 and dependent closure gates.
9. Close G-MK0 and derive `BUILD_READY=YES`.
10. Freeze and certify the release candidate.
11. Reach `RELEASE_READY=YES`.

### P1

Finalize release documentation, runbooks, source-profile matrix, safe diagnostic catalog and requirement-to-evidence traceability.

### P2

Additional bank coverage, platform expansion such as iOS, non-blocking UX polish and new analytics belong after the first certified release unless promoted by a separately frozen milestone.

## 10. Execution discipline

```text
requirement
  -> evidence needed
  -> implementation/change only if required
  -> automated validation
  -> physical validation where applicable
  -> durable sanitized receipt
  -> documentation reconciliation
  -> gate closure
```

If a task cannot name its evidence and exit condition, it is not ready to execute.

## 11. Immediate next action

```text
R1 trusted-edge signing of exact +2014
  -> return sanitized signing receipt
  -> freeze signed identity
  -> generate +2014 OD0 handoff
```

No new feature work is the controlling action.
