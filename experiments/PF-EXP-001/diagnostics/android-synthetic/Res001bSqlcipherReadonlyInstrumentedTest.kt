package com.financesensor.lab.res001bdiagnostics

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.zetetic.database.sqlcipher.SQLiteDatabase
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest

/**
 * ISOLATED INSTRUMENTATION SPIKE ONLY; NOT wired into installed application.
 * Requires SQLCipher Android 4.18.0 and AndroidJUnit4.
 * This test creates a new synthetic database in the test app's private cache only.
 * No production VaultBridge, Keystore alias, key preferences, or real vault access.
 */
@RunWith(AndroidJUnit4::class)
class Res001bSqlcipherReadonlyInstrumentedTest {
    private fun cacheDir(): File =
        InstrumentationRegistry.getInstrumentation().targetContext.cacheDir

    private fun digest(file: File): String {
        val hash = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { stream ->
            val buffer = ByteArray(8192)
            while (true) {
                val read = stream.read(buffer)
                if (read < 0) break
                hash.update(buffer, 0, read)
            }
        }
        return hash.digest().joinToString("") { "%02x".format(it) }
    }

    private data class Fingerprint(val size: Long, val sha256: String)

    private fun snapshot(base: File): Map<String, Fingerprint> {
        val names = listOf(base.path, base.path + "-wal", base.path + "-shm", base.path + "-journal")
        return names.filter { File(it).exists() }.associate { name ->
            val f = File(name)
            f.name to Fingerprint(f.length(), digest(f))
        }
    }

    @Test fun encryptedReadOnlyConnectionPreservesSyntheticFixture() {
        System.loadLibrary("sqlcipher")
        val directory = File(cacheDir(), "res001b-synthetic-" + System.nanoTime())
        assertTrue(directory.mkdirs())
        val dbFile = File(directory, "synthetic.db")
        // Synthetic fixed passphrase is valid ONLY for disposable test fixture.
        val passphrase = "RES-001B-SYNTHETIC-TEST-KEY".toByteArray(Charsets.UTF_8)
        try {
            SQLiteDatabase.openOrCreateDatabase(dbFile, passphrase, null, null, null).use { writable ->
                writable.execSQL("CREATE TABLE vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
                writable.execSQL("INSERT INTO vault_meta VALUES ('schema_version','2')")
                writable.execSQL("CREATE TABLE statement_sources (source_receipt_id TEXT, terminal_state TEXT)")
                writable.execSQL("CREATE TABLE derived_evidence (evidence_id TEXT, semantic_type TEXT, flow_direction TEXT, evidence_channel TEXT, account_id TEXT, processed_at TEXT)")
                writable.execSQL("INSERT INTO statement_sources VALUES ('synthetic-receipt','IMPORTED')")
                writable.execSQL("INSERT INTO derived_evidence VALUES ('synthetic-row','UNKNOWN','OUTFLOW','STATEMENT_LEDGER',NULL,NULL)")
            }
            val before = snapshot(dbFile)
            val readonly = SQLiteDatabase.openDatabase(
                dbFile.absolutePath, passphrase, null, SQLiteDatabase.OPEN_READONLY, null
            )
            readonly.use { db ->
                assertTrue("SQLCipher must report true read-only connection", db.isReadOnly)
                db.rawQuery("SELECT COUNT(*) FROM derived_evidence", emptyArray()).use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    assertEquals(1, cursor.getInt(0))
                }
                try {
                    db.execSQL("UPDATE derived_evidence SET semantic_type='fee'")
                    fail("Read-only handle accepted a write")
                } catch (_: Exception) {
                    // Expected: update blocked by native SQLCipher connection.
                }
            }
            assertEquals("Original DB/sidecars changed during read-only operation", before, snapshot(dbFile))
        } finally {
            passphrase.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun readOnlyDoesNotCreateMissingDatabase() {
        System.loadLibrary("sqlcipher")
        val directory = File(cacheDir(), "res001b-missing-" + System.nanoTime())
        assertTrue(directory.mkdirs())
        val missing = File(directory, "missing.db")
        val passphrase = "SYNTHETIC-ONLY".toByteArray(Charsets.UTF_8)
        try {
            try {
                SQLiteDatabase.openDatabase(
                    missing.absolutePath, passphrase, null, SQLiteDatabase.OPEN_READONLY, null
                ).use { fail("Missing database unexpectedly opened") }
            } catch (_: Exception) {
                assertFalse("Read-only open created missing database", missing.exists())
            }
        } finally {
            passphrase.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun wrongKeyFailsClosed() {
        System.loadLibrary("sqlcipher")
        val directory = File(cacheDir(), "res001b-wrong-key-" + System.nanoTime())
        assertTrue(directory.mkdirs())
        val file = File(directory, "synthetic.db")
        val correct = "SYNTHETIC-CORRECT".toByteArray()
        val wrong = "SYNTHETIC-WRONG".toByteArray()
        try {
            SQLiteDatabase.openOrCreateDatabase(file, correct, null, null, null).use { db ->
                db.execSQL("CREATE TABLE t (value TEXT)")
                db.execSQL("INSERT INTO t VALUES ('synthetic')")
            }
            val before = snapshot(file)
            try {
                SQLiteDatabase.openDatabase(file.absolutePath, wrong, null, SQLiteDatabase.OPEN_READONLY, null).use { db ->
                    db.rawQuery("SELECT COUNT(*) FROM t", emptyArray()).use { it.moveToFirst() }
                }
                fail("Wrong encryption key unexpectedly succeeded")
            } catch (_: Exception) {
                assertEquals(before, snapshot(file))
            }
        } finally {
            correct.fill(0)
            wrong.fill(0)
            directory.deleteRecursively()
        }
    }
}
