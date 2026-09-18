# Sync / Cryptography / Mobile Background Sources — 2026 Snapshot

**Research snapshot:** 2026-09-01  
**Purpose:** provenance for Q-005, SEC-001 and parasympathetic scheduling.  
**Rule:** these sources guide candidate architecture; they do not replace production cryptographic review or physical Android/iOS evidence.

## HPKE

### RFC 9180 — Hybrid Public Key Encryption

https://www.rfc-editor.org/info/rfc9180/

Observed 2026-09-01:

- HPKE defines a hybrid public-key encryption scheme composed from KEM + KDF + AEAD primitives;
- the RFC provides interoperable suites using ECDH/X25519, HKDF/SHA2 and authenticated encryption;
- it supports authenticated additional data/context binding;
- FinanceSensor should prefer an audited HPKE implementation/library for device-specific tenant-key distribution rather than inventing a production wrapper from raw primitives.

Important: the Node Q-005 spike composes primitives only to prove bounded protocol properties. It is **not** a production HPKE implementation.

## Authenticated encryption

### NIST SP 800-38D — GCM / GMAC

https://csrc.nist.gov/pubs/sp/800/38/d/final

Observed 2026-09-01:

- GCM is specified as an authenticated-encryption mode with associated data;
- authenticated additional data is useful for binding non-secret routing headers to ciphertext integrity;
- NIST's publication page notes that SP 800-38D is planned for revision.

Implication: AES-GCM is a valid spike primitive, but the production AEAD suite must be refreshed/reviewed at security freeze rather than permanently frozen from this research snapshot.

## Android background work

### WorkManager constraints

https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work

Observed 2026-09-01:

Android WorkManager supports deferring persistent work under constraints including:

```text
network type
battery not low
requires charging
device idle
storage not low
```

Implication: FinanceSensor can encode parasympathetic behavior using OS-supported constraints instead of permanent polling/wake loops.

## Apple BackgroundTasks

### BackgroundTasks framework

https://developer.apple.com/documentation/BackgroundTasks

Observed 2026-09-01:

- Apple provides system-scheduled background task mechanisms for refresh, processing and selected longer user-initiated work;
- the OS controls when background execution is granted.

### BGProcessingTask

https://developer.apple.com/documentation/backgroundtasks/bgprocessingtask

Observed 2026-09-01:

- background processing work can run for minutes but can be interrupted by the system;
- apps need an expiration handler/cleanup strategy;
- processing tasks run under OS-selected conditions.

### BGProcessingTaskRequest

https://developer.apple.com/documentation/backgroundtasks/bgprocessingtaskrequest

Observed 2026-09-01:

- processing requests can express requirements such as network connectivity and external power.

Implication: FinanceSensor must checkpoint bounded work and treat interruption as normal rather than assuming continuous execution.

## Architecture decisions supported by this snapshot

```text
CUSTOM_PRODUCTION_KEY_WRAP      REJECT
AUDITED_HPKE_IMPLEMENTATION     CANDIDATE / REVIEW REQUIRED
AEAD_WITH_AAD                   REQUIRED PROPERTY
ALGORITHM_FREEZE                NOT YET
PERMANENT_MOBILE_POLL_LOOP      REJECT
ANDROID_CONSTRAINED_WORK        CANDIDATE
IOS_SYSTEM_SCHEDULED_WORK       REQUIRED REALITY
CRASH_SAFE_CHECKPOINTING        REQUIRED
EVENTUAL_FRESHNESS              ACCEPTED
```

## Revalidation triggers

Re-mine these sources when any of the following occurs:

```text
production crypto implementation is selected
Android minimum SDK/background strategy is frozen
iOS minimum version/background strategy is frozen
key-wrap or AEAD algorithm changes
security review identifies a protocol flaw
platform background APIs materially change
hardware-backed key-storage assumptions change
Q-005 is proposed for closure
12 months pass since the last full review
```
