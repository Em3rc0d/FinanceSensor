# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-03**.

## Project state

```text
PRODUCT THESIS             PASS
PRODUCT INVARIANTS         PASS
DOMAIN GLOSSARY            DRAFTED
ROADMAP                    DRAFTED
COMPETITIVE MINING         INITIAL PASS
SOURCE CONCEPT MINING      PASS

MK0 BRAINSTORMING          PASS
MK0 MINING SITE            ACTIVE
MK0 QUARRIES               ACTIVE
MK0 DESIGN                 DRAFTED
MK0 ARCHITECTURE           DRAFTED
MK0 DATA MODEL             DRAFTED
MK0 SIGNATURE WIREFRAMES   DRAFTED
MK0 PLAN                   DRAFTED
MK0 BUILD                  BLOCKED
MK0 TEST STRATEGY          DRAFTED
MK0 EVIDENCE               ACTIVE
MK0 ADR SET                OPEN
MK0 RELEASE GATES          DRAFTED
REPOSITORY GOVERNANCE      OPEN

BUILD_READY                NO
```

`graph/closure-ledger.json` remains the authoritative source for node closure state. `graph/q003-evidence.json` and `graph/q004-evidence.json` carry the finer physical/provider/privacy proof boundaries for their respective quarries.

## Financial heart

```text
CANONICAL RESOLVER           98 / 98 PASS
SEMANTIC CORPUS              54 bounded cases PASS
Q-002 ADVERSARIAL DECISIONS  28 / 28 PASS
UNSAFE FALSE MERGES          0
AUTO-MERGE PRECISION         100%
HARD-LINK FALSE SPLITS       0
REPLAY DUPLICATE COUNT       0
BENCHMARK DECISION ACCURACY  100%
```

Closed financial-heart nodes:

```text
C-001 External-transfer semantics     CLOSED
C-002 Refund/reversal projection      CLOSED
Q-001 Canonical semantics             CLOSED
Q-002 Fingerprinting/dedup            CLOSED
```

## Distributed nervous system

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS      116 / 116 PASS
```

Q-005 remains `ACTIVE`: bounded spike evidence is not release-grade production/mobile/crypto/witness proof.

## Gmail / financial ingress

Contract-level ingress remains green:

```text
PHYSICAL INGRESS / OAUTH CONTRACTS     53 / 53 PASS
CANONICAL RESOLVER                      98 / 98 PASS
```

### Android R2 physical connection boundary

The Android R2 lab has now physically established the mobile connection path while keeping the provider-revoke proof separate:

```text
PACKAGE                                    com.financesensor.lab.gmailconnection.r2
EXACT SCOPE                                gmail.readonly
ANDROID GMAIL CONNECT                      PHYSICAL PASS
GMAIL PROFILE                              HTTP 2xx PHYSICAL PASS
BEARER TO FLUTTER                          NO
APP REFRESH TOKEN CUSTODY                  NO
OFFLINE ACCESS                             NO
DURABLE LOCAL DISCONNECT BARRIER           PHYSICAL PASS
ACCOUNT_HANDLE_UNAVAILABLE ROOT CAUSE      IDENTIFIED
ACCOUNT HANDLE BRIDGE REPAIR               CI PASS
DEPRECATED SIGN-IN ACCOUNT INFERENCE       REMOVED
STABLE R2 SIGNING IDENTITY                 FROZEN
GOOGLE PROVIDER REVOKE                     PHYSICAL OPEN
REQUIRED OLD-BEARER RESULT                 HTTP 401
```

The repaired native bridge now obtains an Android `Account` handle explicitly through AccountPicker, binds `AuthorizationRequest.setAccount(account)`, and reuses the same in-memory handle for `RevokeAccessRequest`. Google account identifiers are not persisted.

The implementation repair compiled and tested successfully in public CI, but the CI APK uses an ephemeral compile-only signer. It is not valid evidence for the already registered stable R2 OAuth identity.

Therefore:

```text
ACCOUNT_HANDLE_BRIDGE_CI_PASS != GOOGLE_PROVIDER_REVOKE_PASS
CI_APK_BUILD_PASS             != PHYSICAL_R2_PROVIDER_REVOKE_PASS
REVOKE_TASK_SUCCESS           != PROVIDER_REVOKE_VERIFIED
PROVIDER_REVOKE_VERIFIED      = PREVIOUS_BEARER_HTTP_401
```

### Q-003 closure state

Q-003 remains `ACTIVE`. Level C v7 proves DEV feasibility; Android R2 proves physical mobile connectivity; neither closes the production/provider contract.

```text
LEVEL C PHYSICAL EXECUTION                    PASS
ANDROID R2 PHYSICAL CONNECTIVITY              PASS
ANDROID R2 ACCOUNT-HANDLE BRIDGE              CI PASS / PHYSICAL RETEST OPEN
ANDROID PROVIDER REVOKE HTTP 401               OPEN
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE     OPEN
REQUEST PAYLOAD BYTE ACCOUNTING               OPEN
PER-ENDPOINT LATENCY EVIDENCE                 OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING     OPEN
PUBLIC RESTRICTED-SCOPE VERIFICATION          OPEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION    OPEN
Q-003                                         ACTIVE
```

## Privacy boundary

The static Q-004 privacy model is now machine-validated rather than merely documented:

```text
PRIVACY INVENTORY                            25 / 25 CLASSES VALIDATED
CLOUD-VISIBLE CLASSES                        12 / EXHAUSTIVE BUDGET
CLOUD-FORBIDDEN CLASSES                      13 / EXHAUSTIVE BUDGET
UNCLASSIFIED CLOUD-VISIBLE FIELD             FAIL CLOSED
PRIVACY INSPECTOR MEASUREMENT CONTRACT       STATIC CI PASS
METADATA LEAKAGE BUDGET                      STATIC CI PASS
Q-004 EVIDENCE SUBGRAPH                      STATIC CI PASS
```

S-10 Privacy Inspector is fail-closed against privacy theater:

```text
MISSING COUNTER                              != 0
ARCHITECTURE FORBIDS PLAINTEXT               != MEASURED ZERO BYTES
RAW CONTENT DISPOSAL DESIGN                  != MEASURED ZERO RETAINED EMAILS
E2EE DESIGN                                  != VERIFIED CHECKMARK
CI PASS                                      != PHYSICAL PRIVACY PASS
```

Consequently, the product may not display `Correos guardados = 0` until the matching P3 physical storage evidence passes, and may not display the E2EE verified checkmark until the complete P4 mobile crypto interoperability evidence passes.

### Q-004 closure state

Q-004 remains `ACTIVE`. The repository has a green static privacy contract, not physical privacy proof.

```text
P0 HARNESS INTEGRITY                          STATIC READY / PHYSICAL OPEN
P2 MOBILE CREDENTIAL CUSTODY                  PHYSICAL OPEN
P3 TRANSPORT/STORAGE/DELETION/BACKUP          PHYSICAL OPEN
P4 MOBILE CRYPTO                              PHYSICAL OPEN FOR E2EE DISPLAY CLAIM
P0+P2+P3 OPEN PHYSICAL CLAIMS                 20
Q-004                                         ACTIVE
```

The open physical set is derived directly from `graph/physical-closure-campaign.json`; `tools/validate-q004-evidence.mjs` fails if the Q-004 subgraph drifts from those campaign claims.

Stable trust boundaries remain:

```text
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
CI_FIXTURES != REAL_FINANCIAL_DATA
REAL GMAIL/OAUTH AUTHORITY = LOCAL EDGE ONLY
REAL FINANCIAL PLAINTEXT = LOCAL EDGE ONLY
```

## Public-readiness contract

FinanceSensor is public. Repository exposure is continuously guarded by `.github/workflows/public-readiness.yml` and `tools/audit-public-history.mjs`.

Public-readiness results are snapshot-scoped runtime evidence. This versioned ledger therefore does not promote a previous workflow result into a permanent repository fact and does not store Git object totals. The latest `FinanceSensor Public Readiness` execution is authoritative for the refs it inspected.

Stable repository laws:

```text
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
REAL Gmail/OAuth IN CI = FORBIDDEN
REAL FINANCIAL PLAINTEXT IN CI = FORBIDDEN
PRIVATE R2 SIGNING KEY IN CI = FORBIDDEN
PUBLIC_READINESS_PASS(snapshot A) != PUBLIC_READINESS_PASS(snapshot B)
GREEN PUBLIC AUDIT != PRODUCT CLOSURE
```

## Repository governance

```text
main default-branch hardening        PASS
main protected                       NO — pending GitHub branch-protection configuration
required status checks               NONE — pending protection configuration
branch protection enforcement        OFF — pending protection configuration
PR #1                                DRAFT / DO NOT MERGE
active CI routing                    ubuntu-latest
real Gmail execution                 LOCAL EDGE ONLY
stable R2 signing                    TRUSTED EDGE ONLY
```

The connected GitHub integration can read branch protection but does not expose a branch-protection/ruleset write action. Therefore protection remains explicitly OPEN rather than falsely recorded as configured.

`OPS-001` remains a dependency of `G-MK0`; public repository safety does not close product governance or release gates.

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.** Q-003/Q-004/Q-005 and G-MK0 remain open.
