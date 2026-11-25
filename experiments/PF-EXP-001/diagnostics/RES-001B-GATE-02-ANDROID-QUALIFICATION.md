# RES-001B-GATE-02 — Android SQLCipher encrypted read-only qualification

Status: **ANDROID_EXECUTED / WAL_ZERO_WRITE_FAIL / GATE_BLOCKED**
Date: 2026-11-20.

## Source evidence
- Existing `Alpha2VaultBridge.kt` uses `net.zetetic.database.sqlcipher.SQLiteDatabase`, advertises `SQLCIPHER_VERSION = "4.18.0"`, and currently calls `openOrCreateDatabase` plus `ensureSchema`; that route is forbidden for diagnostic reads.
- SQLCipher Android public API exposes `SQLiteDatabase.openDatabase(path, byte[] passphrase, factory, OPEN_READONLY, hook)`. Verify this signature in the **resolved pinned 4.18.0 AAR** at build time, rather than relying on the upstream default branch.
- Executable isolated module lives in `android-synthetic/`; canonical test source is under `app/src/androidTest/java/com/financesensor/lab/res001bdiagnostics/`. It is not wired into production.

## Executed evidence — 2026-11-20

- Android dependency graph resolved exactly `net.zetetic:sqlcipher-android:4.18.0` and transitive `androidx.sqlite:sqlite:2.7.0`.
- AAR SHA-256: `f59aaf02ffd4de649f85a6c0d296f9a91763764c07707997834abc0cfc745222`.
- AGP 9.1.1 / Gradle 9.3.1 / compile SDK 37; separate application id `com.financesensor.lab.res001b.synthetic`.
- Instrumented device API 35; no private data or production package APIs used.
- Final standard-runner executions: 8/8 PASS twice consecutively. JUnit XML SHA-256: `6727736fab0993aea1d84ce10d337de3a70e0ba591509f02cc048ecf3d72cb21`.
- Python count-only spike after deterministic connection cleanup: 5/5 PASS.
- Installed PocketFinances remained `versionCode=2020` before and after.

## Demonstrated outcomes

| Case | Result | Evidence |
|---|---|---|
| SQLCipher coordinate 4.18.0 | PASS | Gradle graph and AAR digest |
| Encrypted fixture / native cipher 4.x | PASS | Instrumented `PRAGMA cipher_version` family check |
| Rollback-mode `OPEN_READONLY` | PASS | 3 repeated reads; DB/WAL/SHM/journal fingerprints stable; SQL UPDATE rejected |
| Missing database | PASS | Refused; no DB or sidecar created |
| Wrong key | PASS | Refused; all fingerprints stable |
| Schema v1/v2 | PASS | Accepted without migration; fingerprints stable |
| Unexpected schema | PASS | Refused without migration; fingerprints stable |
| Missing synthetic Keystore alias/wrapped DEK | PASS | Readiness inspection created neither alias nor preference |
| Live WAL zero-write | **FAIL** | Main DB and WAL stable, but `-shm` content changed |
| Closed WAL zero-write | **FAIL** | Main DB stable, but read-only open created empty `-wal` and 32768-byte `-shm` |
| Archived WAL bundle | NOT_RUN | Unsafe to certify until a no-sidecar-write strategy exists |
| Production aggregate bridge | NOT_RUN | Not implemented; gate blocks it |

The 8/8 test result means the harness reproduced both safe behavior and the expected WAL incompatibility. It does **not** mean the quality gate passed.

## Executing locally on an authorized Android test environment
1. Inspect checked-out dependency lock and resolved artifact: exactly `net.zetetic:sqlcipher-android:4.18.0` (or prove why a different coordinate maps to the declared version). Record SHA of AAR and repository commit, without secrets.
2. Use a **separate synthetic Android instrumentation-test module** with `androidTestImplementation("androidx.test.ext:junit:1.2.1")` and `testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"`, plus the project's pinned SQLCipher Android dependency. Do not add debug hooks or change the production app's package.
3. Copy this Kotlin class under the test module's `src/androidTest/java/com/financesensor/lab/res001bdiagnostics/` path. Adapt only test-module package/runner wiring. Run `./gradlew :<synthetic-module>:connectedAndroidTest` on emulator/device with **no private bank app data**. Capture instrumented JUnit XML summary and sanitized SHA of test source.
4. Check native SQLCipher behavior: read-only flag truly reports `isReadOnly`, write statement throws, wrong key throws, missing file not created, no synthetic DB or sidecar changes.
5. **Add required WAL and v1/v2 schema cases** before certifying: WAL writer open vs closed, cold start with sidecars absent/present, read-only open/close, serial and repeated opens, unexpected schema, and archived state. Compare existence/size/content SHA of main DB, `-wal`, `-shm`, `-journal` and schema contents before/after. Record any benign mmap/access-time effect separately; no unconditional claims.
6. Verify read-only key path separately in a **synthetic hardware-backed Keystore test**: missing alias and wrapped DEK must fail without creation; key cannot be returned to Dart or logs. Never copy original key material outside app sandbox. This test is NOT implemented yet.
7. Only then implement aggregate query and bridge method behind an off-by-default flag; verify privacy/small-cell suppression and tenant binding. The Python SQLite spike does **not** replace SQLCipher and cannot be connected to private data.

## Gates

| Gate | Status |
|---|---|
| Public API contract identified | PASS |
| Synthetic SQLCipher Android test source | PASS |
| Pinned AAR compilation / instrumentation | PASS |
| Encrypted read-only open / malformed key | PASS (non-WAL) |
| WAL/SHM behavior and no-write guarantee | **FAIL** |
| Android hardware Keystore no-create readiness | PASS (synthetic missing material only) |
| Existing hardware-backed key path | NOT_RUN |
| Safe native aggregate MethodChannel | NOT_IMPLEMENTED |
| Physical owned-device inventory | NOT_AUTHORIZED |

**STOP:** No real-device diagnostic APK; no merge marking certified; no SQLCipher schema mutations or silent migrations. Existing installed +2020 remains unchanged.

**Exit criterion remains unmet:** WAL zero-mutation must be demonstrated, including archived sidecars, before any production bridge or private inventory. Current `OPEN_READONLY` behavior is insufficient.
