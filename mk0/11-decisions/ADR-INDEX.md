# MK0 / 11 — Architecture Decision Record Index

No implementation assumption becomes permanent architecture without an ADR when the decision is consequential, difficult to reverse or changes a product invariant.

## ADR template

```text
ADR-### — Title
Status: PROPOSED | ACCEPTED | SPIKE-ACCEPTED | SUPERSEDED | REJECTED
Date
Context
Decision drivers
Options considered
Decision
Consequences
Risks
Security/privacy impact
Data-model impact
UX impact
Test/evidence required
Supersedes / superseded by
```

## Planned / active ADRs

| ADR | Decision | Status | Remaining evidence / blocker |
|---|---|---|---|
| ADR-001 | Tenant as financial ownership boundary | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL TENANT ISOLATION REQUIRED | RLS/adversarial tenant-isolation evidence |
| ADR-002 | Cloud Control Plane + Edge Data Plane | PROPOSED | Q-004/Q-005 closure |
| ADR-003 | Gmail provider adapter vs generic IMAP-first | PROPOSED | Q-003 closure |
| ADR-004 | Canonical event taxonomy | BLOCKED | legacy ADR formalization; Q-001 already CLOSED |
| ADR-005 | Transaction fingerprint/resolver strategy | BLOCKED | legacy ADR formalization; Q-002 already CLOSED |
| ADR-006 | Local persistence/encryption technology | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL STORAGE VALIDATION REQUIRED | Q-004/Q-005 storage evidence |
| ADR-007 | Sync event model and ordering | BLOCKED | Q-005 physical sync evidence |
| ADR-008 | E2EE key hierarchy and production crypto | BLOCKED | Q-005/security review; narrowed by ADR-021 |
| ADR-009 | Mobile implementation stack | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL MOBILE VALIDATION REQUIRED | Q-003/Q-004/Q-005 mobile evidence |
| ADR-010 | Control-plane runtime/cloud platform | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL CLOUD VALIDATION REQUIRED | Q-004/Q-005 cloud/deletion/witness evidence |
| ADR-011 | Classification stack | OPEN | extraction/resolver implementation spike |
| ADR-012 | Analytics/telemetry privacy boundary | PROPOSED | Q-004 |
| ADR-013 | Minimum supported Android baseline | ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL DEVICE MATRIX REQUIRED | Q-003/Q-005 Android evidence |
| ADR-014 | All-devices-lost recovery without server master key | SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED | Q-005 physical/production evidence |
| ADR-015 | Trusted checkpoint / anti-rollback model | SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED | Q-005 physical anchor/witness evidence |
| ADR-016 | Opaque independent witness freshness | SPIKE-ACCEPTED / PRODUCTION POLICY RESOLVED BY ADR-022 | Q-005 physical witness evidence |
| ADR-017 | Gmail mobile OAuth boundary | SPIKE-ACCEPTED / DESKTOP LEVEL-C PHYSICAL PASS / MOBILE PRODUCTION OPEN | Q-003/Q-004 mobile credential evidence |
| ADR-018 | Gmail partial-sync anchor provenance | ACCEPTED FOR LEVEL-C HARNESS / PRODUCTION INITIAL-SYNC OPEN | Q-003 production onboarding |
| ADR-019 | Gmail bootstrap without Search-index dependency | ACCEPTED FOR LEVEL-C HARNESS / PRODUCTION INITIAL-SYNC OPEN | Q-003 production onboarding |
| ADR-020 | Gmail restricted-data server boundary | ACCEPTED FOR MK0 ARCHITECTURE / GOOGLE APPLICABILITY DETERMINATION REQUIRED | Q-003/Q-004 production verification |
| ADR-021 | Mobile production crypto profile | ACCEPTED FOR PHYSICAL VALIDATION / NOT YET PRODUCTION-PROVEN | Q-005 mobile interop/protected-key evidence |
| ADR-022 | Production opaque witness topology and quorum | ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL DEPLOYMENT REQUIRED | Q-005 witness deployment/failure evidence |
| ADR-023 | Disconnect, tenant deletion and backup semantics | ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL VERIFICATION REQUIRED | Q-004/Q-005 cloud/mobile/backup evidence |
| ADR-024 | Recovery Kit checkpoint-anchor refresh semantics | ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL VALIDATION REQUIRED | Q-005 physical recovery/export evidence |
| ADR-025 | Mobile-first product surface | ACCEPTED FOR PRODUCT DIRECTION / IMPLEMENTATION STACK RESOLVED BY ADR-009 | physical mobile evidence |
| ADR-026 | Android Google Authorization boundary | ACCEPTED FOR PHYSICAL VALIDATION / PARTIAL PHYSICAL EVIDENCE | provider revoke retest / production lifecycle |
| ADR-027 | Android Google Account handle custody | ACCEPTED FOR R2 PHYSICAL RETEST | provider revoke retest |
| ADR-028 | Mobile OAuth custody semantics | ACCEPTED FOR P2 / ANDROID PHYSICAL EVIDENCE / IOS PHYSICAL OPEN | cross-platform P2 evidence |
| ADR-029 | MK0 Closure Lab evidence infrastructure | ACCEPTED FOR MK0 EVIDENCE EXECUTION / NOT PRODUCT BUILD AUTHORITY | dedicated synthetic provider environment |
| ADR-030 | Restore-domain-independent deletion barrier | ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL P3 VALIDATION REQUIRED | provider backup/delete/restore campaign |
| ADR-031 | Gmail historical onboarding coverage | ACCEPTED FOR PRODUCTION DESIGN / REAL HISTORICAL COMPLETE OPEN | owned-mailbox nextPageToken exhaustion |
| ADR-032 | Windows local Gmail history viewer | ACCEPTED FOR DEV PHYSICAL HARNESS / REAL COVERAGE OPEN | owned Windows historical completion |
| ADR-033 | Financial source coverage asymmetry and statement lane | ACCEPTED FOR MK0 DESIGN / STATEMENT PHYSICAL PARSE OPEN | encrypted statement local parse + reconciliation |
| ADR-034 | Mobile statement PDF runtime | ACCEPTED FOR MOBILE STATIC SPIKE / PHYSICAL DEVICE VALIDATION REQUIRED | Android encrypted-PDF runtime + owned-device statement proof; iOS remains open |
| ADR-035 | Statement ETL and monthly reconciliation | ACCEPTED FOR MK0 DESIGN / REAL FORMAT EVIDENCE OPEN | sanitized multi-bank format corpus + Android monthly-close proof |
| ADR-036 | Alpha.2 financial memory and Gmail statement discovery | ACCEPTED FOR BOUNDED DESIGN FREEZE / IMPLEMENTATION AND PHYSICAL PROOF OPEN | Alpha.2-A implementation, encrypted-vault proof and multi-profile physical campaign |
| ADR-037 | Dual-source authority and canonical web projection | ACCEPTED FOR ALPHA.2 DESIGN / IMPLEMENTATION OPEN | integrated A-G mobile runtime + canonical web/sync evidence |

**Next available ADR:** `ADR-038`.

## MK0 implementation baseline resolved on 2026-09-02

The following choices are now frozen strongly enough to begin controlled implementation once the closure graph permits it:

```text
PRIMARY PRODUCT                    MOBILE APPLICATION
PRODUCT UI / VIEW STATE            FLUTTER / DART
ANDROID SECURITY BRIDGE            KOTLIN
IOS SECURITY BRIDGE                SWIFT
ANDROID minSdk                     31 / Android 12
2026 Android targetSdk floor       36
LOCAL DATABASE                     SQLite + SQLCipher 4.x family
DATABASE DEK                       256-bit random / native protected wrap
PRIMARY CONTROL PLANE              Supabase / PostgreSQL
TENANT AUTHORIZATION               membership + RLS
GMAIL DATA PLANE                   DEVICE LOCAL
GMAIL REFRESH AUTHORITY IN CLOUD   FORBIDDEN
FINANCIAL PLAINTEXT IN CLOUD       FORBIDDEN NORMAL PATH
OPAQUE E2EE RELAY                  ALLOWED / SERVER CANNOT DECRYPT
EXPORTABLE PRIVATE-KEY FALLBACK    FORBIDDEN
PLAINTEXT SQLITE FALLBACK          FORBIDDEN
```

This is an **implementation decision baseline**, not a declaration that Q-003/Q-004/Q-005 are closed.

## ADR-001 evidence boundary

ADR-001 freezes the conceptual ownership/authorization boundary without claiming physical RLS isolation:

```text
USER                                PRODUCT AUTHENTICATION IDENTITY
TENANT                              FINANCIAL OWNERSHIP + ISOLATION BOUNDARY
MEMBERSHIP                          USER AUTHORIZATION INTO TENANT
DEVICE                              CRYPTOGRAPHIC / EXECUTION AUTHORITY
CONNECTION                          TENANT-OWNED SOURCE CONFIGURATION
USER != TENANT                      REQUIRED
DEVICE != TENANT                    REQUIRED
CONNECTION != TENANT                REQUIRED
TENANT_ID == USER_ID                FORBIDDEN AS SCHEMA INVARIANT
PHYSICAL RLS ISOLATION              OPEN
```

Evidence/decision:

- `ADR-001-TENANT-FINANCIAL-OWNERSHIP-BOUNDARY.md`
- `ADR-010-CONTROL-PLANE-RUNTIME-CLOUD.md`
- `../05-data-model/CORE-DATA-MODEL.md`
- `../../graph/build-readiness.json`

Acceptance closes the build-entry tenancy-design decision. It does not close real cross-tenant isolation testing.

## ADR-006 evidence boundary

ADR-006 resolves local encrypted persistence:

```text
DATABASE FAMILY                  SQLITE
PRODUCTION ENCRYPTION            SQLCIPHER 4.x FAMILY
DATABASE KEY                     RANDOM 256-BIT DEK
DURABLE DEK IN DART              FORBIDDEN
PLATFORM-PROTECTED DEK WRAP      REQUIRED
PLAINTEXT SQLITE FALLBACK        FORBIDDEN
DB/WAL/JOURNAL/TEMP              PHYSICAL INSPECTION REQUIRED
```

Evidence/decision:

- `ADR-006-LOCAL-PERSISTENCE-ENCRYPTION.md`
- `ADR-009-MOBILE-IMPLEMENTATION-STACK.md`
- `../04-architecture/SECURITY-PRIVACY.md`

Acceptance freezes technology and key ownership. It does not claim physical storage/backup behavior is proven.

## ADR-009 evidence boundary

ADR-009 resolves the mobile framework while preserving native ownership of security-sensitive operations:

```text
PRODUCT UI / VIEW STATE           FLUTTER / DART
ANDROID SECURITY BRIDGE           KOTLIN
IOS SECURITY BRIDGE               SWIFT
LOCAL DATABASE                    SQLITE + SQLCIPHER under ADR-006
LONG-LIVED OAUTH CUSTODY IN DART  FORBIDDEN
LONG-LIVED PRIVATE KEYS IN DART   FORBIDDEN
DATABASE DEK CUSTODY IN DART      FORBIDDEN
EXPORTABLE SECURITY FALLBACK      FORBIDDEN
ANDROID MINIMUM                   API 31 under ADR-013
WEB/DESKTOP PRODUCT SCOPE         NOT CREATED BY FLUTTER CAPABILITY
```

Evidence/decision:

- `ADR-009-MOBILE-IMPLEMENTATION-STACK.md`
- `ADR-006-LOCAL-PERSISTENCE-ENCRYPTION.md`
- `ADR-013-MINIMUM-SUPPORTED-ANDROID-BASELINE.md`
- `ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `ADR-021-MOBILE-PRODUCTION-CRYPTO-PROFILE.md`
- `ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md`
- `../../tools/validate-mobile-stack.mjs`

## ADR-010 evidence boundary

ADR-010 selects Supabase as the first control plane while explicitly denying it financial/Gmail authority:

```text
PRIMARY CONTROL PLANE            SUPABASE
CONTROL DB                       POSTGRESQL
ACCOUNT AUTH                     SUPABASE AUTH / FINANCESENSOR IDENTITY
TENANT AUTHORIZATION             OWNERSHIP/MEMBERSHIP + RLS
SERVICE ROLE IN MOBILE           FORBIDDEN
GMAIL API EXECUTION IN CLOUD     FORBIDDEN
GMAIL REFRESH_TOKEN IN CLOUD     FORBIDDEN
FINANCIAL PLAINTEXT NORMAL PATH  FORBIDDEN
OPAQUE E2EE RELAY                ALLOWED
INDEPENDENT WITNESS              OUTSIDE RELAY FAILURE DOMAIN REQUIRED
BACKUP CONFIG                    MUST REMAIN <= ADR-023 35-DAY CEILING
```

Evidence/decision:

- `ADR-010-CONTROL-PLANE-RUNTIME-CLOUD.md`
- `ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `ADR-022-PRODUCTION-WITNESS-QUORUM.md`
- `ADR-023-DISCONNECT-DELETION-BACKUP-SEMANTICS.md`

Provider selection does not provision production infrastructure and does not prove RLS/deletion/backup behavior.

## ADR-013 evidence boundary

ADR-013 freezes the Android authority baseline:

```text
MIN SDK                          31
MINIMUM OS                       ANDROID 12
2026 TARGET SDK FLOOR            36
API 37                           COMPATIBILITY TARGET
STRONGBOX                        PREFERRED WHERE AVAILABLE
TEE-BACKED KEYSTORE              ACCEPTED FALLBACK SECURITY CLASS
EXPORTABLE/SOFTWARE AUTHORITY    NO SILENT FALLBACK
```

The baseline is driven by Android Keystore protected key-agreement capability required by ADR-021. Physical devices must still prove actual key protection and performance.

## ADR-014 evidence boundary

ADR-014 freezes only the logical recovery ownership and hardening model:

```text
SERVER MASTER KEY               REJECTED
PASSWORD-ONLY RECOVERY          REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY         ACCEPTED AT SPIKE LEVEL
RECOVERY PRIVATE KEY            USER-HELD / OFFLINE
PER-EPOCH RECOVERY COVERAGE     REQUIRED
POST-RECOVERY DEVICE HARDENING  REQUIRED
TENANT + RECOVERY ROTATION      REQUIRED
```

Evidence:

- `ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`
- `../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `../../spikes/e2ee-sync/test/recovery.test.js`

## ADR-015 evidence boundary

```text
RELAY AS SOLE TRUST ANCHOR           REJECTED
INDEPENDENT TRUSTED ANCHOR           REQUIRED FOR ROLLBACK CLAIM
SIGNED APPEND-ONLY CONTINUITY        SPIKE-ACCEPTED
ROLLBACK/FORK/GAP RELATIVE TO ANCHOR FAIL CLOSED
NO INDEPENDENT ANCHOR                INDETERMINATE_FRESHNESS
GLOBAL-LATEST FRESHNESS              UNPROVEN
```

Evidence:

- `ADR-015-TRUSTED-CHECKPOINT-ANTI-ROLLBACK.md`
- `../04-architecture/TRUSTED-CHECKPOINT.md`
- `../05-data-model/TRUSTED-CHECKPOINT-MODEL.md`
- `../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`
- `../../spikes/e2ee-sync/test/checkpoint.test.js`

## ADR-016 / ADR-022 evidence boundary

```text
REAL TENANT ID AT WITNESS             FORBIDDEN
FINANCIAL PLAINTEXT AT WITNESS        FORBIDDEN
FINANCIAL CIPHERTEXT AT WITNESS       FORBIDDEN
PER-WITNESS OPAQUE LOG ID             REQUIRED
CONFIGURED WITNESSES                  3
CONFIRMATION QUORUM                    2 OF 3
MINIMUM FAILURE DOMAINS               2
MINIMUM RELAY-INDEPENDENT WITNESS     1
VALID CONTRADICTION                   CANNOT BE VOTED AWAY
```

Evidence/decision:

- `ADR-016-OPAQUE-WITNESS-FRESHNESS.md`
- `ADR-022-PRODUCTION-WITNESS-QUORUM.md`
- `../04-architecture/WITNESS-FRESHNESS.md`
- `../../spikes/e2ee-sync/test/witness.test.js`

## ADR-017 evidence boundary

```text
MINIMUM SCOPE CANDIDATE            gmail.readonly
GMAIL DATA PLANE                   EDGE-LOCAL
NORMAL CLOUD REFRESH-TOKEN CUSTODY REJECTED
SHORT-LIVED TOKEN PROVIDER         CONTRACT TESTED
REAL PROVIDER REACHABILITY         PASS
DESKTOP DEV LEVEL-C CONSENT        PHYSICAL PASS
PROVIDER REVOCATION                PHYSICAL PASS
PRODUCTION MOBILE CREDENTIAL       OPEN
```

Evidence:

- `ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `../10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`
- `../10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`
- `../../spikes/physical-ingress/test/gmail-rest-provider.test.js`

## ADR-018 / ADR-019 evidence boundary

```text
/profile.historyId AS BOOTSTRAP ANCHOR       REJECTED
MESSAGE.historyId PROVENANCE                 REQUIRED
IMMEDIATE Gmail Search q DEPENDENCY          REJECTED
BOUNDED RECENT-INBOX SUBJECT WINDOW          LEVEL-C ACCEPTED
LEVEL-C HARNESS                              != PRODUCTION INITIAL-SYNC UX
```

## ADR-020 evidence boundary

```text
GMAIL OAUTH AUTHORITY ON SERVER              FORBIDDEN
SERVER-SIDE Gmail API CALLS                  FORBIDDEN
RAW Gmail PROCESSING ON SERVER               FORBIDDEN
GENERALIZED AI TRAINING FROM Gmail DATA      FORBIDDEN
E2EE OPAQUE RELAY                            ALLOWED BY ARCHITECTURE
E2EE RELAY => GOOGLE ASSESSMENT EXEMPT       NOT PROVEN
GOOGLE APPLICABILITY DETERMINATION           REQUIRED BEFORE PUBLIC LAUNCH
```

## ADR-021 evidence boundary

```text
HPKE             RFC 9180 BASE MODE
KEM              DHKEM(P-256, HKDF-SHA256)
KDF              HKDF-SHA256
WRAP AEAD        AES-128-GCM
DEVICE SIGNING   ECDSA P-256 + SHA-256 PROFILE
DOMAIN AEAD      AES-256-GCM + HKDF-SHA256 SUBKEYS
PROTECTED KEYS   REQUIRED
NODE SPIKE       NOT PRODUCTION CRYPTO
```

## ADR-023 evidence boundary

```text
DISCONNECT GMAIL                 REVOKE AUTHORITY + RETAIN USER DERIVED STATE
DISCONNECT + ERASE               EXPLICIT DESTRUCTIVE OPERATION
DELETE TENANT                    CRYPTO-SHRED + CLOUD/WITNESS DELETE
BACKUP RESTORE                   MUST NOT RESURRECT AUTHORITY
BACKUP MAX PHYSICAL RETENTION    <= 35 DAYS
```

## ADR-024 evidence boundary

```text
RECOVERY KIT ANCHOR             MINIMUM TRUSTED ANCHOR, NOT GLOBAL LATEST
REFRESH EVERY CHECKPOINT        REJECTED
RECOVERY KEY ROTATION           NEW KIT REQUIRED
POST-RECOVERY N+1 CUTOVER       NEW KIT REQUIRED
OLD KIT AFTER ROTATION          HISTORICAL-ONLY
SAFE_TO_RESUME                  REQUIRES NEW KIT EXPORT + INTEGRITY + CUSTODY
```

## ADR-025 evidence boundary

```text
PRIMARY PRODUCT                 MOBILE APPLICATION
FIRST PHYSICAL PRODUCT TARGET   ANDROID
REQUIRED PRODUCTION TARGET      IOS
WEB                             FUTURE COMPANION OPTION
DESKTOP                         NO FIRST-CLASS PRODUCT COMMITMENT
MOBILE BI                       ACCEPTED PRODUCT LANGUAGE
DESKTOP BI SHRUNK TO PHONE      REJECTED
IMPLEMENTATION STACK            RESOLVED BY ADR-009
ANDROID BASELINE                API 31 under ADR-013
```

Evidence/design:

- `ADR-025-MOBILE-FIRST-PRODUCT-SURFACE.md`
- `../03-design/PRODUCT-DESIGN.md`
- `../../product/ROADMAP.md`
- `../../product/labs/mobile-bi/README.md`
- `../../tools/validate-mobile-product-lab.mjs`

## ADR-034 evidence boundary

ADR-034 selects the statement PDF runtime only for the mobile static spike and keeps physical promotion closed:

```text
PRODUCT SURFACE                    FLUTTER MOBILE APP
PRIMARY PHYSICAL TARGET            ANDROID
REQUIRED PRODUCTION TARGETS        ANDROID + IOS
MOBILE PDF RUNTIME                 PDFRX 2.4.8 / PDFIUM
STATEMENT PARSE NETWORK            FORBIDDEN
PASSWORD PERSISTENCE               FORBIDDEN
PASSWORD MEMORY ZEROIZATION        NOT CLAIMED IN DART
OWNED MUTABLE PDF WORKING BUFFER   ZERO AFTER DISPOSE REQUIRED
WINDOWS STATEMENT HARNESS          MK0 EVIDENCE ONLY
DESKTOP HARNESS PASS               != MOBILE PRODUCT PASS
ANDROID APK BUILD PASS             != REAL STATEMENT PARSE PASS
MOBILE STATEMENT PHYSICAL PASS     OPEN
```

Evidence/decision:

- `ADR-034-MOBILE-STATEMENT-PDF-RUNTIME.md`
- `ADR-033-FINANCIAL-SOURCE-COVERAGE-ASYMMETRY.md`
- `../../graph/mobile-statement-ingress.json`
- `../../spikes/mobile-shell/lib/statement_ingress/`
- `../../tools/validate-mobile-statement-ingress.mjs`

## ADR-036 evidence boundary

ADR-036 freezes Alpha.2 as an automatic, local and evidence-linked financial memory:

```text
PRIMARY STATEMENT PATH          TARGETED GMAIL DISCOVERY
FALLBACK PATHS                  SHARE/OPEN + LOCAL FILE
AUTOMATIC DOWNLOAD              UNIQUE STRONG CANDIDATES ONLY
RAW PDF/TEXT DURABILITY         FORBIDDEN
PASSWORD DURABILITY             FORBIDDEN
GENERIC PARSER FALLBACK         FORBIDDEN
LOCAL VAULT                     SQLCIPHER / PLATFORM-WRAPPED DEK
AMOUNT-ONLY MATCH               FORBIDDEN
GLOBAL UNQUALIFIED COVERAGE %   FORBIDDEN
SENSOR V1                       DETERMINISTIC / NO ADVICE
ALPHA.2 PHYSICAL PASS           OPEN
BUILD_READY                     UNCHANGED / false
```

Evidence/decision:

- `ADR-036-ALPHA2-FINANCIAL-MEMORY.md`
- `../03-design/ALPHA2-FINANCIAL-MEMORY-UX.md`
- `../07-plan/ALPHA2-IMPLEMENTATION-AND-CERTIFICATION.md`
- `../../graph/alpha2-design-freeze.json`
- `../../tools/validate-alpha2-design-freeze.mjs`

## Decision discipline

An ADR is required when a choice affects one or more of:

- security boundary;
- financial correctness;
- tenant isolation;
- persistent schema;
- sync protocol;
- external API lock-in;
- device compatibility;
- recovery/deletion guarantees;
- signature interaction contract.

Minor implementation detail does not need an ADR.

## Rule

If code and ADR disagree, either the code is wrong or the ADR must be explicitly superseded. Silent architectural drift is not accepted.

`SPIKE-ACCEPTED` is intentionally weaker than release-grade `PROVEN`.
