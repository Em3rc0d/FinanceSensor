# FinanceSensor / PocketFinances — Project Status

**Status date:** 2026-09-17  
**Authority branch:** `jett/mk0-foundation`  
**Authority head at reconciliation:** `77b459f742eb2f0bcd16485a415c66bf59f40e0f`  
**Purpose:** current evidence-based closure status. Historical status snapshots remain historical and must not be edited to imply later PASS.

## 1. Executive status

FinanceSensor is at an Alpha.2 certification frontier. The active Android candidate is **`0.2.0-alpha.2+2014`**.

`+2014` is a diagnostic-only successor to `+2013`: it adds safe, profile-scoped, allow-listed strict-review diagnostics so the next owned-device run can classify statement-review causes without exposing PDF/Gmail/financial plaintext. The BCP/Ripley strict parsers, statement geometry and PDF reader were held unchanged from `+2013` by the candidate-cut validator.

Current mandatory claims:

```text
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

The current controlling gate is **R1 trusted-edge signing of +2014**. R2 and OD0 remain fail-closed until that exact candidate is signed with the frozen signer identity.

## 2. Canonical +2014 identity

### Product / canonical candidate

- Candidate: `0.2.0-alpha.2+2014`
- Product diagnostic merge: PR #151, merge `7b7f18ce9cf58564270dc4cfcb0c0a3dd72ea74b`
- Candidate-cut PR: #152
- Canonical source authority: `8e5bb535a7263beab0b687b616dff88205da58f3`
- Canonical Integrated Runtime run: `35291827028`
- Canonical artifact: `10526841901`
- Canonical artifact ZIP SHA-256: `d41eca871471d9700d2d8c48b2b70a7ac806f3cae0ee11c3e5020c0a171a9f80`
- Unsigned APK SHA-256: `72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3`
- Unsigned APK bytes: `182550031`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Exact Gmail scope: `gmail.readonly`
- versionCode: `2014`

### R1 trusted-edge bundle v14

PR #153 froze the deterministic public-safe signing handoff.

- Bundle: `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v14.zip`
- Bundle SHA-256: `eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be`
- Bundle bytes: `86665753`
- Bundle files: `8`
- Private key files: `0`
- Manifest integrity: `PASS`
- Expected stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Post-merge R1 reproduction run: `35294466703`
- Post-merge R1 artifact: `10526359859`
- Trusted-edge signing PASS: **NO — still required**

Public CI only reproduces the bundle. It cannot access the private keystore and cannot create a physical/signing PASS.

## 3. Why +2014 exists

The `+2013` owned-device observation reached the product UI and materialized safe financial evidence, while the statement path reported:

```text
Gmail observed          4
EECC imported           0
EECC review required   11
```

The `+2013` binary did not expose a sufficiently granular safe reason for those `REVIEW_REQUIRED` outcomes. Therefore no parser repair was guessed.

`+2014` adds only sanitized cause/profile observability. It is intended to distinguish causes such as safe period/header/geometry/monetary-row review classes while keeping raw provider details, PDF text, identifiers, merchants and amounts out of diagnostics.

Physical evidence from `+2013` is historical and **non-inheritable** by `+2014`.

## 4. Current certification graph

PR #154 reconciled the prebuild graph after the candidate identity changed.

```text
R0  canonical +2014 unsigned identity       CLOSED
R1  trusted-edge signing                    OPEN / current frontier
R2  owned-device campaign                   BLOCKED_BY_R1
Q-003 / Q-004 / Q-005                       ACTIVE
G-MK0                                       OPEN
BUILD_READY                                 NO
RELEASE_READY                               NO
```

Final reconciled authority head: `77b459f742eb2f0bcd16485a415c66bf59f40e0f`.

Post-merge checks on that head:

- FinanceSensor Heartbeat run `35294993088`: SUCCESS, including Build readiness ECG.
- FinanceSensor Public Readiness run `35294993089`: SUCCESS.
- FinanceSensor Android Human Test Alpha run `35294993083`: SUCCESS.

The prior #153 post-merge consensus also completed successfully, including Integrated Runtime `35294466697`, R1 `35294466703`, certification ledger, R2 blocked boundary and OD0 blocked boundary.

## 5. Supported product boundary

Current Android Alpha.2 repository evidence supports:

- Gmail read-only authorization boundary.
- Metadata-first/safe source discovery and bounded attachment fetch.
- BCP Savings strict parser.
- Ripley Credit strict parser constrained to the certified geometry.
- BCP Credit structural probe only, with no financial evidence emission.
- Interbank Savings runtime-disabled until Gmail identity allowlisting is proven.
- Profile-scoped session-only PDF password handling.
- No DNI derivation/storage for statement passwords.
- Local PDF cleanup/zeroization boundaries.
- No generic statement-parser fallback.
- Candidate-local failure isolation.
- Safe diagnostic projection without raw parser/provider detail.
- Canonical financial projection/dashboard materialization.
- Private signing material excluded from GitHub/public CI.
- Candidate identity invalidation and non-inheritance of physical evidence.

iOS completion is not implied by Android Alpha.2 evidence.

## 6. Open gates

The following remain genuinely open:

1. Trusted-edge sign the exact canonical `+2014` APK using R1 v14.
2. Freeze the resulting signed APK hash/bytes/signer receipt on the base branch.
3. Generate/unlock the `+2014` OD0 handoff.
4. Execute OD0 with exactly one authorized owned Android device using data-preserving install.
5. Execute the finite R2 campaign and observe the new safe strict-review diagnostics.
6. If evidence identifies a parser defect, cut a new candidate and invalidate non-inheritable physical evidence; do not patch `+2014` in place.
7. Reach `PHYSICAL_ALPHA2_PASS=YES` only if every required physical criterion passes.
8. Close Q-003/Q-004/Q-005 and dependent architecture/security/data gates.
9. Close G-MK0 and mechanically derive `BUILD_READY=YES`.
10. Freeze a release candidate and independently satisfy `RELEASE_READY=YES`.

## 7. Next controlling action

```text
exact +2014 canonical APK
  -> frozen R1 v14 bundle
  -> R1 trusted-edge signing      ← NOW
  -> signed identity freeze
  -> OD0 exact install/launch
  -> R2 owned-device campaign
  -> safe review-cause evidence
```

No new product feature work is authorized by this status. The next source change is justified only by typed evidence from the certification chain.
