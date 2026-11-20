# RES-001B diagnostic prototype — test evidence

Date: 2026-11-19. Branch: `docs/res-001b-diag-export-contract`.

## What exists
- `safe_inventory.py`: isolated Python/sqlite3 proof of a count-only, allowlisted read-only aggregation contract. It is **NOT** wired into the Android app and **CANNOT** decrypt SQLCipher.
- `test_safe_inventory.py`: five synthetic tests, runnable locally with `python -m unittest -v test_safe_inventory.py` from this directory.
- `android-synthetic/`: independent Android instrumentation module. Its application id is `com.financesensor.lab.res001b.synthetic`; it does not reference or replace PocketFinances.
- This checks query structure, no row-level output, missing database fail-closed, missing schema fail-closed, and database file content/mtime unchanged across reads. Test environment: Python stdlib sqlite3. Result in authoring environment: **5/5 PASS**. This is NOT a physical Android test.

## Executed Android result (2026-11-20)
- Resolved `net.zetetic:sqlcipher-android:4.18.0`; cached AAR SHA-256 `f59aaf02ffd4de649f85a6c0d296f9a91763764c07707997834abc0cfc745222`.
- Real encrypted synthetic SQLCipher instrumentation: two consecutive standard-runner executions, each 8/8 PASS.
- Rollback-journal fixture, missing DB, wrong key, v1/v2 schema, incompatible schema, repeated opens and missing synthetic Keystore material behaved fail-closed and byte-stable where required.
- **Gate remains FAIL:** `OPEN_READONLY` changed the live WAL `-shm` bytes; after a closed WAL fixture it created a zero-length `-wal` and a 32768-byte `-shm`. These are filesystem writes and violate the zero-mutation requirement.

## Known gaps / stop conditions
- SQLite test uses a synthetic ordinary SQLite database and does not replace the Android SQLCipher result.
- These tests do not prove zero filesystem writes to sidecars, Android Keystore, process memory, logs or app state in production.
- SQLite authorizer whitelist and PRAGMA allowlist are spike-only; the Kotlin/SQLCipher equivalent must be independently implemented and reviewed.
- `KNOWN` is a broad aggregate and intentionally **does not** certify bank semantics. Future precise interpretation must have a versioned allowlist.
- `statement_sources` holds states but not reject reasons. The six historic rejections remain **UNATTRIBUTED**.
- UI 312 pending does not equal verified vault 312 UNKNOWN; no private inventory was run.

## Next technical gate (not yet PASS)
1. Define a SQLCipher/SQLite open strategy that cannot create or mutate WAL/SHM, or fail closed before open when that guarantee is unavailable.
2. Add an archived WAL bundle case after a safe strategy exists; do not normalize or checkpoint a private database as a diagnostic prerequisite.
3. Add native method behind off-by-default gate only after the read-only proof; keep raw identifiers out of Flutter bridge and logs.
4. Separate review to authorize any owned-device diagnostic APK. Do not modify or uninstall installed +2020.

**Current project status: SYNTHETIC SQL QUERY SPIKE PASS / SQLCIPHER INSTRUMENTATION PASS / WAL ZERO-WRITE GATE FAIL / OWNED DEVICE PRIVATE INVENTORY NOT_RUN.**
