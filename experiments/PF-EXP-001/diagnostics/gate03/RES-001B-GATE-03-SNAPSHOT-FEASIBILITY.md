# RES-001B-GATE-03 — WAL snapshot feasibility (2026-11-24)

**Status: SQLITE_SYNTHETIC_EXPLORED / ANDROID_SQLCIPHER_NOT_RUN / PRIVATE_INVENTORY_BLOCKED.**

## Rationale
GATE-02 qualified SQLCipher 4.18.0 read-only SQL behavior, but `OPEN_READONLY` changed original `-shm` and could create `-wal/-shm` files. Never reopen the live private vault directly for diagnostics.

## Local synthetic experimentation
Two *ordinary SQLite* (Python stdlib) test suites were executed in the authoring environment:
- `test_snapshot_sqlite.py`: **4 PASS / 1 FAIL**. The same-connection `Connection.backup()` produced a consistent logical snapshot, but altered the original `-shm` hash. The source main database and `-wal` remained unchanged in the observed case. Thus a backup API cannot be assumed to meet zero-source-byte-mutation.
- `test_quiesced_archive_sqlite.py`: **3/3 PASS**. With one controlled connection and no concurrent writers/checkpoints, copying the source main DB, WAL and SHM into a separate temporary directory yielded a readable consistent archive, left source hashes stable, and later source changes did not affect the archive. Copying only main DB in WAL mode failed as expected.

**Interpretation:** This is an encouraging *candidate*, not proof of safety on a real Android SQLCipher vault. A real app may have other threads, processes and connections; a partial/torn bundle can be invalid or stale. Ordinary SQLite test results do NOT certify encryption, SQLCipher compatibility, Android key handling or lifecycle.

## Candidate implementation authority
Only the app process, after explicit user consent, can request an isolated encrypted diagnostic snapshot. It MUST first prove exclusive coordination with all users of the original DB, including pending imports, external processes, in-flight transactions and checkpoint workers. No new connection to the source is allowed merely to take this snapshot. Lock ordering, Android process lifecycle (kill/crash mid-copy), disk space, atomic promotion of copy, ownership, and cleanup must be specified.

No `sqlcipher_export()` or `sqlite3_backup` path can be approved by mere documentation: either may change WAL shared-memory metadata. Avoid plaintext copies, key exports, cloud files, external storage, adb pull, and modification of production `Alpha2VaultBridge` until the synthetic Android test is certified.

## Mandatory Android synthetic matrix (GATE-03A)
1. Same *pinned* `net.zetetic:sqlcipher-android:4.18.0` and isolated `com.financesensor.lab.res001b.synthetic` harness used by GATE-02.
2. With DB connection active, block all writes/checkpoints via an explicit coordinator. Create consistent encrypted snapshot of main DB plus live WAL and relevant sidecars under a **private disposable test directory**. Source and destination must use synthetic keys only.
3. Verify source/main/WAL/SHM/journal hashes and existence before/after, with no unrelated writer activity. Prove SQLCipher can open the snapshot and verify `PRAGMA integrity_check`, row count, and representative transactional invariants.
4. Re-test with source in rollback mode, WAL closed, WAL live, WAL archived, and with multiple concurrently active *controlled* reader/writer connections.
5. Negative tests: source changes mid-copy, interruption/cancellation, power/process kill simulation, partial sidecars, missing/corrupt WAL, wrong key, unexpected schema, low disk, permission errors, replay, multiple snapshot requests. Every failure must stop without exposing a partial snapshot or touching the source.
6. Show encrypted-at-rest disposition of snapshot files and secure in-app lifecycle cleanup. Never send any copied DB to Flutter or external interfaces. Validate that no raw key, account ID, transaction ID, description, date or amount is emitted in logs/results.
7. Existing wrapped DEK and hardware-backed AndroidKeyStore may be *used only within the synthetic harness* after separate no-create tests. No attempt to pull raw production keys.
8. Only once GATE-03A passes may an off-by-default native aggregation bridge be implemented; then require a distinct production review and owned-device authorization.

## Candidate decision
- **In-place SQLCipher read-only:** REJECTED for required no-source-mutation guarantee (GATE-02).
- **Existing-connection backup API:** FAIL on ordinary SQLite WAL `-shm` mutation; no private use.
- **Coordinated WAL bundle archive:** EXPERIMENTAL CANDIDATE, synthetic SQLite only, no Android proof.
- **Private vault diagnostics:** **NOT AUTHORIZED**.
- **Six historic rejection causes:** Cannot be inferred from `statement_sources`; separate local receipt/replay investigation remains necessary.

## Exit criteria
A reproducible Android SQLCipher instrumented run establishes atomicity, no unauthorized source mutation, encryption, correct WAL replay, crash safety and cleanup in all required scenarios. If quiescence cannot be established, **STOP** and choose a less intrusive design (in-process aggregate calculation using a previously active connection, after reviewing its writes and side effects).

Do not merge PR #174 or build/install a personal APK on the strength of these Python tests.