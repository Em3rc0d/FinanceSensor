# RES-001B diagnostic prototype — test evidence

Date: 2026-11-19. Branch: `docs/res-001b-diag-export-contract`.

## What exists
- `safe_inventory.py`: isolated Python/sqlite3 proof of a count-only, allowlisted read-only aggregation contract. It is **NOT** wired into the Android app and **CANNOT** decrypt SQLCipher.
- `test_safe_inventory.py`: five synthetic tests, runnable locally with `python -m unittest -v test_safe_inventory.py` from this directory.
- This checks query structure, no row-level output, missing database fail-closed, missing schema fail-closed, and database file content/mtime unchanged across reads. Test environment: Python stdlib sqlite3. Result in authoring environment: **5/5 PASS**. This is NOT a physical Android test.

## Known gaps / stop conditions
- SQLCipher 4.18.0 Android `net.zetetic.database.sqlcipher.SQLiteDatabase` read-only API has **not** been validated with its real dependency.
- SQLite test uses a synthetic ordinary SQLite database, not an encrypted file and not WAL. No SQLCipher proof, WAL sidecar proof, hardware keystore proof or Android physical authorization can be inferred.
- These tests do not prove zero filesystem writes to sidecars, Android Keystore, process memory, logs or app state in production.
- SQLite authorizer whitelist and PRAGMA allowlist are spike-only; the Kotlin/SQLCipher equivalent must be independently implemented and reviewed.
- `KNOWN` is a broad aggregate and intentionally **does not** certify bank semantics. Future precise interpretation must have a versioned allowlist.
- `statement_sources` holds states but not reject reasons. The six historic rejections remain **UNATTRIBUTED**.
- UI 312 pending does not equal verified vault 312 UNKNOWN; no private inventory was run.

## Next technical gate (not yet PASS)
1. Resolve pinned SQLCipher Android API and dependencies; create encrypted synthetic fixture with existing key only; inspect read-only handle semantics.
2. Test absent DB/key and schema v1/v2, no implicit create/migration, encrypted WAL and journal behaviors; verify all original files including sidecars before/after.
3. Add native method behind off-by-default gate only after the read-only proof; keep raw identifiers out of Flutter bridge and logs.
4. Separate review to authorize any owned-device diagnostic APK. Do not modify or uninstall installed +2020.

**Current project status: SYNTHETIC SQL QUERY SPIKE PASS / SQLCIPHER GATE NOT_RUN / OWNED DEVICE NOT_RUN.**
