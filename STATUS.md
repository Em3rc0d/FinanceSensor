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

`graph/closure-ledger.json` remains the authoritative source for node closure state. `graph/q003-evidence.json`, `graph/q004-evidence.json` and `graph/q005-evidence.json` carry the finer physical/provider/privacy/distributed proof boundaries.

## Physical closure campaign

P0 — Harness Integrity is physically closed. P2 now has a receipt-bound Android sub-boundary while the overall cross-platform phase remains open.

```text
P0 HARNESS INTEGRITY                    PHYSICAL PASS / BOUND COMPOSITE RECEIPT
P0 REQUIRED CLAIMS                      6 / 6 BOUND
PHYSICAL SOURCE RECEIPTS                3 OWNED-DEVICE RUNS
ADVERSARIAL SANITIZER GUARD             PASS / CI REVALIDATED
RAW PHYSICAL EVIDENCE IN GITHUB         FORBIDDEN
PUBLIC RECEIPT                          SANITIZED / MINIMIZED

P2 ANDROID PROTECTED OAUTH CUSTODY      PHYSICAL PASS / BOUND RECEIPT
P2 RESTORE BEHAVIOR                     CONTRACT PASS
P2 IOS PROTECTED OAUTH CUSTODY          STATIC READY / PHYSICAL OPEN
P2 PASSED CLAIMS                        2 / 6
P2 OPEN CLAIMS                          4 / 6
P2 OVERALL                              PHYSICAL_EVIDENCE_REQUIRED
```

The P0 PASS is not inferred from CI. `graph/physical-receipts/P0-2026-09-03.json` binds the real-device R1/R2 public receipts and sanitizer implementation/guard by immutable Git blob SHA. CI only revalidates that binding.

The Android P2 custody PASS is likewise not inferred from a static Kotlin scan. `graph/physical-receipts/P2-ANDROID-2026-09-03.json` binds existing owned-device R1/R2 observations to the Android native credential boundary. FinanceSensor Android holds no app refresh token, sends no bearer to Flutter, persists only the disconnect-barrier boolean, and keeps the short-lived bearer in native process memory.

ADR-028 freezes the cross-platform interpretation:

```text
PROTECTED_CUSTODY != APP_MUST_STORE_REFRESH_TOKEN
NO_APP_HELD_LONG_LIVED_AUTHORITY > NEW_TOKEN_VAULT
ANDROID_P2_CUSTODY_PASS != GOOGLE_PROVIDER_REVOKE_PASS
IOS_STATIC_READY != IOS_PHYSICAL_PASS
P2_PARTIAL_PASS != P2_PASS
```

P0 proves the publication/sanitization boundary; P2 Android proves Android credential custody. Neither closes the remaining product/provider/mobile phases.

```text
P0 PASS != P1..P8 PASS
P2 ANDROID PASS != P2 PASS
P0/P2 PARTIAL PROGRESS != Q-003 CLOSED
P0/P2 PARTIAL PROGRESS != Q-004 CLOSED
P0 PASS != Q-005 CLOSED
P0/P2 PARTIAL PROGRESS != BUILD_READY
```

## Financial heart

```text
CANONICAL RESOLVER           101 / 101 PASS
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

Q-005 remains `ACTIVE`: the 116/116 result is bounded `PROVEN_AT_SPIKE`, not release-grade production/mobile/crypto/witness proof.

After P0 closure:

```text
P0 HARNESS INTEGRITY                       PHYSICAL PASS
P3 TRANSPORT/STORAGE/DELETION/BACKUP       PHYSICAL OPEN
P4 MOBILE CRYPTO INTEROPERABILITY          PHYSICAL OPEN
P5 WITNESS CRASH/PARTITION                 PHYSICAL OPEN
P6 ALL-DEVICES-LOST RECOVERY               PHYSICAL OPEN
Q-005 OPEN PHYSICAL PHASES                 4
Q-005 OPEN PHYSICAL CLAIMS                 29
P8 CLOSURE RECEIPT                         BLOCKED BY PRIOR PHASES
Q-005                                      ACTIVE
```

## Gmail / financial ingress

Contract-level ingress remains green:

```text
PHYSICAL INGRESS / OAUTH / HISTORY TESTS   75 / 75 PASS
CANONICAL RESOLVER                          101 / 101 PASS
GMAIL HISTORICAL CONTRACT                   PASS
ISSUER ADAPTERS                             BCP / INTERBANK / RIPLEY
REAL HISTORICAL GMAIL COVERAGE              PHYSICAL OPEN
```

### Android R2 physical connection and P2 custody boundary

The Android R2 lab physically established the mobile connection and local credential-custody path while keeping provider revoke separate:

```text
PACKAGE                                    com.financesensor.lab.gmailconnection.r2
EXACT SCOPE                                gmail.readonly
ANDROID GMAIL CONNECT                      PHYSICAL PASS
GMAIL PROFILE                              HTTP 2xx PHYSICAL PASS
BEARER TO FLUTTER                          NO
APP REFRESH TOKEN CUSTODY                  NO
OFFLINE ACCESS                             NO
SHORT BEARER CUSTODY                       KOTLIN PROCESS MEMORY ONLY
ACCOUNT HANDLE CUSTODY                     MEMORY ONLY
PERSISTED AUTH STATE                       DISCONNECT BARRIER BOOLEAN ONLY
DURABLE LOCAL DISCONNECT BARRIER           PHYSICAL PASS
P2 ANDROID PROTECTED OAUTH CUSTODY          PHYSICAL PASS / BOUND RECEIPT
ACCOUNT_HANDLE_UNAVAILABLE ROOT CAUSE      IDENTIFIED
ACCOUNT HANDLE BRIDGE REPAIR               CI PASS
DEPRECATED SIGN-IN ACCOUNT INFERENCE       REMOVED
STABLE R2 SIGNING IDENTITY                 FROZEN
GOOGLE PROVIDER REVOKE                     PHYSICAL OPEN
REQUIRED OLD-BEARER RESULT                 HTTP 401
```

The repaired native bridge obtains an Android `Account` handle explicitly through AccountPicker, binds `AuthorizationRequest.setAccount(account)`, and reuses the same in-memory handle for `RevokeAccessRequest`. Google account identifiers are not persisted.

The implementation repair compiled and tested successfully in public CI, but the CI APK uses an ephemeral compile-only signer. It is not valid evidence for the already registered stable R2 OAuth identity.

Therefore:

```text
ANDROID_P2_CUSTODY_PASS       != GOOGLE_PROVIDER_REVOKE_PASS
ACCOUNT_HANDLE_BRIDGE_CI_PASS != GOOGLE_PROVIDER_REVOKE_PASS
CI_APK_BUILD_PASS             != PHYSICAL_R2_PROVIDER_REVOKE_PASS
REVOKE_TASK_SUCCESS           != PROVIDER_REVOKE_VERIFIED
PROVIDER_REVOKE_VERIFIED      = PREVIOUS_BEARER_HTTP_401
```

### iOS P2 boundary

The iOS credential architecture is frozen against the current Google Sign-In SDK surface, but it is not physically proven and is intentionally untouched by the Gmail historical viewer work.

```text
IOS GOOGLE AUTHORITY                     GOOGLE SIGN-IN SDK
IOS DURABLE GOOGLE CREDENTIAL STATE      SDK / KEYCHAIN
FINANCESENSOR TOKEN DUPLICATION          FORBIDDEN
TOKEN IN USERDEFAULTS                    FORBIDDEN
TOKEN TO FLUTTER                         FORBIDDEN
RESTORE                                  BARRIER-GUARDED
DISCONNECT                               BARRIER FIRST + SDK DISCONNECT
IOS BRIDGE                               STATIC READY
IOS PHYSICAL CUSTODY                     OPEN
IOS TOUCHED BY GMAIL HISTORY WORK        0
```

`spikes/mobile-shell/native/ios/GmailCredentialBroker.swift` remains a reference bridge and `tools/validate-ios-gmail-custody.mjs` remains only a static fail-closed guard. No iPhone action is part of the current test frontier.

### Gmail historical viewer / first-run readiness

ADR-031 freezes historical mailbox coverage and ADR-032 freezes the Windows controlled DEV viewer. The executable path is now static-ready but intentionally not promoted to real Gmail PASS before user execution.

```text
COVERAGE MODE                           ALL_AVAILABLE_ACTIVE_MAILBOX
COMPLETENESS QUERY                      OMITTED
AGGREGATE MESSAGE LIMIT                 NONE
SPAM / TRASH                            EXCLUDED BY DEFAULT
METADATA                                EVERY ENUMERATED MESSAGE
FULL BODY                               STRONG CANDIDATES ONLY
MESSAGE CONCURRENCY                     6 DEFAULT / 10 HARD MAX
PAGE COMMIT                             ALL UNIQUE MESSAGE TASKS TERMINAL
INVALID PAGE CURSOR                     RESTART + SOURCE-ID DEDUP
INCREMENTAL ANCHOR                      MESSAGE-DERIVED historyId
VIEWER TRANSACTION ID                   STABLE DERIVED PROJECTION ID
LOCAL DERIVED STATE                     AES-256-GCM
STATE KEY PROTECTION                    WINDOWS DPAPI CURRENT USER
WINDOWS DPAPI PREFLIGHT                 BEFORE CREDENTIAL PICKER / PHYSICAL OPEN
WSL / UNC ONE-CLICK LAUNCH              STATIC READY VIA CMD PUSHD
DASHBOARD                               127.0.0.1 + PROCESS SESSION SECRET
OAUTH CLIENT                            EXISTING FINANCESENSOR DESKTOP DEV ONLY
OAUTH SCOPE                             gmail.readonly EXACT
DURABLE REFRESH TOKEN                   FORBIDDEN
DURABLE RAW GMAIL BODY                  FORBIDDEN
REAL OAUTH                              PHYSICAL OPEN
REAL HISTORICAL GMAIL COVERAGE          PHYSICAL OPEN
IOS TOUCHED                             0
```

The historical CI proves synthetic/static properties only. In particular:

```text
CONCURRENCY != COVERAGE RELAXATION
CI CONCURRENCY PASS != REAL PROVIDER PERFORMANCE PASS
VIEWER STATIC READY != REAL GMAIL PASS
DPAPI STATIC READY != WINDOWS DPAPI PHYSICAL PASS
PREVIEW != COMPLETE
COMPLETE GMAIL EVIDENCE != BANK LEDGER COMPLETENESS
CONNECTED CHATGPT GMAIL != FINANCESENSOR OAUTH PHYSICAL PASS
```

### Q-003 closure state

Q-003 remains `ACTIVE`. Shared P0 is PASS; Android P2 credential custody is physically PASS; Level C v7 proves DEV feasibility; Android R2 proves physical mobile connectivity; and the Windows Gmail historical viewer is now static-ready for a controlled owned-account run. Production/provider and cross-platform gates remain open.

```text
P0 HARNESS INTEGRITY                          PHYSICAL PASS / BOUND RECEIPT
P2 ANDROID CREDENTIAL CUSTODY                 PHYSICAL PASS / BOUND RECEIPT
P2 IOS CREDENTIAL CUSTODY                     STATIC READY / PHYSICAL OPEN
LEVEL C PHYSICAL EXECUTION                    PASS
ANDROID R2 PHYSICAL CONNECTIVITY              PASS
ANDROID R2 ACCOUNT-HANDLE BRIDGE              CI PASS / PHYSICAL RETEST OPEN
GMAIL HISTORY VIEWER                          STATIC READY / REAL GMAIL OPEN
REAL HISTORICAL GMAIL COVERAGE                OPEN
WINDOWS DPAPI REAL PREFLIGHT                  OPEN UNTIL USER RUN
ANDROID PROVIDER REVOKE HTTP 401               OPEN
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE     OPEN
REQUEST PAYLOAD BYTE ACCOUNTING               OPEN
PER-ENDPOINT LATENCY EVIDENCE                 OPEN
CROSS-PLATFORM PROTECTED CREDENTIAL HANDLING  OPEN
PUBLIC RESTRICTED-SCOPE VERIFICATION          OPEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION    OPEN
Q-003                                         ACTIVE
```

## Privacy boundary

The static Q-004 privacy model is machine-validated rather than merely documented:

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

Q-004 remains `ACTIVE`. P0 is closed and two P2 claims are resolved, but iOS/cross-platform credential custody and P3 remain physical work.

```text
P0 HARNESS INTEGRITY                          PHYSICAL PASS / BOUND RECEIPT
P2 ANDROID PROTECTED OAUTH CUSTODY            PHYSICAL PASS / BOUND RECEIPT
P2 RESTORE BEHAVIOR                           CONTRACT PASS
P2 IOS PROTECTED OAUTH CUSTODY                PHYSICAL OPEN
P2 CROSS-PLATFORM OPEN CLAIMS                 4
P2 OVERALL                                    PHYSICAL_EVIDENCE_REQUIRED
P3 TRANSPORT/STORAGE/DELETION/BACKUP          PHYSICAL OPEN / BLOCKED BY P2 PASS
P4 MOBILE CRYPTO                              PHYSICAL OPEN FOR E2EE DISPLAY CLAIM
P2+P3 OPEN PHYSICAL CLAIMS                    12
Q-004                                         ACTIVE
```

The open physical set is derived from unresolved claims in `graph/physical-closure-campaign.json`; a partially proven phase may expose `passedClaims` without being promoted to phase PASS. The Q-004 validator fails if the subgraph drifts from that state.

Stable trust boundaries remain:

```text
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
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
