# RES-001B-GATE-02 — Android SQLCipher encrypted read-only qualification

Status: **HARNESS_COMMITTED / ANDROID_EXECUTION_NOT_RUN / GATE_OPEN**  
Date: 2026-11-20.

## Source evidence
- Existing `Alpha2VaultBridge.kt` uses `net.zetetic.database.sqlcipher.SQLiteDatabase`, advertises `SQLCIPHER_VERSION = "4.18.0"`, and currently calls `openOrCreateDatabase` plus `ensureSchema`; that route is forbidden for diagnostic reads.
- SQLCipher Android public API exposes `SQLiteDatabase.openDatabase(path, byte[] passphrase, factory, OPEN_READONLY, hook)`. Verify this signature in the **resolved pinned 4.18.0 AAR** at build time, rather than relying on the upstream default branch.
- Test harness committed to `android-synthetic/Res001bSqlcipherReadonlyInstrumentedTest.kt`; isolated instrumentation source is **not** wired into production, not compiled, and not executed in this environment.

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
| Public API contract identified | RESEARCH_ONLY |
| Synthetic SQLCipher Android test source | CREATED_UNEXECUTED |
| Pinned AAR compilation / instrumentation | NOT_RUN |
| Encrypted read-only open / malformed key | NOT_RUN |
| WAL/SHM behavior and no-write guarantee | NOT_RUN |
| Android hardware Keystore read-only path | NOT_RUN |
| Safe native aggregate MethodChannel | NOT_IMPLEMENTED |
| Physical owned-device inventory | NOT_AUTHORIZED |

**STOP:** No real-device diagnostic APK; no merge marking certified; no SQLCipher schema mutations or silent migrations. Existing installed +2020 remains unchanged.

**Exit criterion:** Actual Android instrumentation pass with full WAL cases, Keystore no-create tests, zero mutation proof, reviewed logs and reproducible receipts. Once complete, change this status with captured test evidence; never infer from source review alone.
