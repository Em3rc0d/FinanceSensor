# ADR-006 — Local persistence and encryption technology

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL STORAGE VALIDATION REQUIRED  
**Date:** 2026-09-02

## Context

FinanceSensor is local-first. Its canonical financial event log, materialized financial state and derived intelligence are plaintext only while executing inside an authorized device process. Durable production persistence cannot be ordinary plaintext SQLite.

ADR-009 selected SQLite as the persistence family while deliberately leaving the encrypted driver and key mechanism open under this ADR.

## Decision drivers

- SQLite semantics and mature mobile tooling;
- full-database encryption rather than ad-hoc field-by-field coverage;
- Android and iOS availability;
- deterministic local migrations and queries;
- no long-lived database key embedded in Dart/source/configuration;
- compatibility with Android Keystore and Apple Keychain/Secure Enclave custody;
- explicit deletion/crypto-shred semantics;
- acceptable performance on compact/low-end Android hardware.

## Options considered

### Plain SQLite + OS filesystem protection only

Rejected for production financial storage.

OS full-disk/file protection is useful defense in depth, but FinanceSensor requires an application-controlled cryptographic boundary and crypto-shred path for its local financial database.

### Application-level field encryption over ordinary SQLite

Not selected as the primary MK0 mechanism.

It creates broad schema/query complexity and makes it easier for newly added sensitive fields/indexes to bypass encryption accidentally. Selective value-level protection may still be used for exceptional fields, but it cannot replace full database encryption.

### SQLite + SQLCipher

Selected.

SQLCipher is a SQLite-compatible encrypted database implementation providing transparent 256-bit AES encryption of database pages and supports Android and Apple platforms.

## Decision

```text
DATABASE FAMILY                 SQLite
PRODUCTION DATABASE ENCRYPTION  SQLCipher 4.x family
DATABASE KEY                    random 256-bit DEK
DEK DURABLE PLAINTEXT           FORBIDDEN
DEK IN SOURCE / DART CONFIG     FORBIDDEN
DEK WRAP AUTHORITY              platform-native protected key facility
ANDROID WRAP CUSTODY            Android Keystore / StrongBox preferred
IOS WRAP CUSTODY                Keychain-protected / Secure Enclave-backed authority where compatible
PLAINTEXT PRODUCTION DB         FORBIDDEN
DATABASE BACKUP PLAINTEXT       FORBIDDEN
```

The exact SQLCipher patch release is dependency-pinned at implementation time and revalidated before release. The architecture binds to the SQLCipher 4.x compatibility family, not to an unbounded `latest` dependency.

## Key lifecycle

### First creation

```text
CSPRNG
  ↓
256-bit Database Encryption Key (DEK)
  ↓
open/create SQLCipher database
  ↓
wrap DEK under platform protected authority
  ↓
persist only wrapped DEK representation
```

The raw DEK exists only transiently in process memory when opening the database.

### Normal open

```text
wrapped DEK
  ↓ native protected-key operation
raw DEK in bounded memory
  ↓
SQLCipher open
  ↓
zero/release transient buffers where runtime/library permits
```

The Flutter/Dart product layer MUST NOT own durable DEK custody.

### Device authority deletion

Deletion of local financial state requires both:

1. deletion of the SQLCipher database/WAL/SHM and related local artifacts; and
2. deletion/invalidation of the protected authority capable of unwrapping the DEK.

Where deletion semantics differ by platform/filesystem, the physical campaign must record the actual behavior rather than claim secure erasure of flash cells.

## Journal / temporary-file rule

Production configuration must validate encryption behavior for:

- main database;
- WAL;
- shared-memory/journal sidecars;
- temporary tables/files;
- migration backups;
- crash recovery artifacts.

A green main-database encryption test is insufficient if sidecars can contain recoverable financial plaintext.

## Backup rule

FinanceSensor must not depend on ordinary OS backup of an independently decryptable local ledger.

Platform backup/exclusion behavior must be tested. If an encrypted DB is included in device backup, restored material must remain unusable without the protected/wrapped key authority appropriate to the restored authorization state.

ADR-023 remains authoritative for tenant deletion and resurrection barriers.

## Migration rule

Schema migrations MUST be transactional where supported and test:

```text
OLD ENCRYPTED DB
  ↓ migrate
NEW ENCRYPTED DB
  ↓ integrity_check
PASS
```

Migration tooling may use synthetic fixtures in CI. Real financial databases remain controlled-edge only.

## Flutter boundary

Flutter may use a typed repository API but not become the encryption authority.

Conceptual layering:

```text
Dart domain/repository
      ↓
typed persistence adapter
      ↓
SQLCipher-backed SQLite
      ↓
platform-native protected DEK unwrap
```

No package may silently fall back to plaintext SQLite if SQLCipher initialization fails.

```text
SQLCIPHER_UNAVAILABLE
      ↓
FAIL CLOSED / STORAGE UNAVAILABLE
```

Never:

```text
SQLCIPHER_UNAVAILABLE
      ↓
OPEN PLAINTEXT SQLITE
```

## Physical evidence required

Android:

- database header/content is not ordinary readable SQLite/plaintext;
- WAL/journal/temp plaintext inspection;
- wrapped-key storage inspection;
- app restart/reboot open;
- disconnect/delete removes authority;
- backup/restore behavior;
- representative API-31 low-end performance.

iOS:

- same database/sidecar inspection;
- Keychain/protected authority behavior;
- backup/restore behavior;
- disconnect/delete behavior.

Cross-platform:

- schema compatibility contract;
- deterministic migrations;
- no production key value in logs/crash output.

## Consequences

Positive:

- preserves SQLite model and query ergonomics;
- full-database coverage by default;
- independent application-level encrypted-at-rest boundary;
- clear crypto-shred authority;
- cross-platform mobile family.

Costs/risks:

- native binary dependency and supply-chain review;
- SQLCipher version/license choice must be checked before commercial release;
- database key handling must cross a native boundary carefully;
- performance and sidecar behavior require physical testing.

## External anchors reviewed

Reviewed 2026-09-02:

- Zetetic SQLCipher product/about/design documentation: SQLCipher provides transparent encrypted SQLite storage with 256-bit AES and mobile support.
- Zetetic SQLCipher 4.18.0 documentation/release surface for current Android/Apple integration.
- ADR-009, ADR-021 and FinanceSensor security/privacy architecture.

## Governing laws

```text
LOCAL_FIRST != PLAINTEXT_AT_REST
SQLITE_FAMILY != ORDINARY_SQLITE_PRODUCTION
DATABASE_KEY != DART_SECRET
FILESYSTEM_ENCRYPTION != FINANCESENSOR_DB_ENCRYPTION
SQLCIPHER_FAILURE => FAIL_CLOSED
DB_ENCRYPTED != SIDE_CARS_PROVEN_SAFE
DECISION_ACCEPTED != PHYSICAL_STORAGE_PROVEN
```

## Supersedes / superseded by

Resolves ADR-006 tracked in `ADR-INDEX.md`. Physical local-storage proof remains part of Q-004/Q-005 and the physical closure campaign.
