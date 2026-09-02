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
| ADR-001 | Tenant as financial ownership boundary | PROPOSED | Q-009 review |
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

**Next available ADR:** `ADR-026`.

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
DATABASE DEK CUSTODY IN DART       FORBIDDEN
EXPORTABLE SECURITY FALLBACK       FORBIDDEN
ANDROID MINIMUM                    API 31 under ADR-013
WEB/DESKTOP PRODUCT SCOPE          NOT CREATED BY FLUTTER CAPABILITY
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
GMAIL REFRESH TOKEN IN CLOUD     FORBIDDEN
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
INDEPENDENT TRUSTED ANCHOR            REQUIRED FOR ROLLBACK CLAIM
SIGNED APPEND-ONLY CONTINUITY         SPIKE-ACCEPTED
ROLLBACK/FORK/GAP RELATIVE TO ANCHOR  FAIL CLOSED
NO INDEPENDENT ANCHOR                 INDETERMINATE_FRESHNESS
GLOBAL-LATEST FRESHNESS               UNPROVEN
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
CONFIRMATION QUORUM                   2 OF 3
MINIMUM FAILURE DOMAINS               2
MINIMUM RELAY-INDEPENDENT WITNESS     1
VALID CONTRADICTION                    CANNOT BE VOTED AWAY
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
