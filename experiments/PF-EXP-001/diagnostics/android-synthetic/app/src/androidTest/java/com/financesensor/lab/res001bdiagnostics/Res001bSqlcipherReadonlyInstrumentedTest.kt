package com.financesensor.lab.res001bdiagnostics

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.zetetic.database.sqlcipher.SQLiteDatabase
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest

/**
 * Disposable, isolated instrumentation only. It never references the production
 * package, database, preferences, Keystore alias, documents, or user data.
 */
@RunWith(AndroidJUnit4::class)
class Res001bSqlcipherReadonlyInstrumentedTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Before fun loadSqlcipherForIsolatedTestProcess() {
        System.loadLibrary("sqlcipher")
    }

    private data class Fingerprint(
        val exists: Boolean,
        val size: Long,
        val sha256: String?,
        val modified: Long,
    )

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

    private fun related(base: File): List<File> = listOf(
        base,
        File(base.path + "-wal"),
        File(base.path + "-shm"),
        File(base.path + "-journal"),
    )

    private fun snapshot(base: File): Map<String, Fingerprint> = related(base).associate { file ->
        file.name to if (file.exists()) {
            Fingerprint(true, file.length(), digest(file), file.lastModified())
        } else {
            Fingerprint(false, 0, null, 0)
        }
    }

    private fun fixtureDir(name: String): File =
        File(context.cacheDir, "$name-${System.nanoTime()}").also { assertTrue(it.mkdirs()) }

    private fun createFixture(
        file: File,
        key: ByteArray,
        schemaVersion: String,
        wal: Boolean = false,
    ): SQLiteDatabase {
        val db = SQLiteDatabase.openOrCreateDatabase(file, key, null, null, null)
        if (wal) assertTrue("WAL could not be enabled", db.enableWriteAheadLogging())
        db.execSQL("CREATE TABLE vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        db.execSQL("INSERT INTO vault_meta VALUES ('schema_version', ?)", arrayOf(schemaVersion))
        db.execSQL("CREATE TABLE derived_evidence (evidence_id TEXT PRIMARY KEY, semantic_type TEXT NOT NULL)")
        db.execSQL("INSERT INTO derived_evidence VALUES ('synthetic-row', 'UNKNOWN')")
        return db
    }

    private fun openValidatedReadOnly(file: File, key: ByteArray): SQLiteDatabase {
        require(file.isFile) { "RES001B_DB_MISSING" }
        val db = SQLiteDatabase.openDatabase(
            file.absolutePath,
            key,
            null,
            SQLiteDatabase.OPEN_READONLY,
            null,
        )
        try {
            check(db.isReadOnly) { "RES001B_NOT_READONLY" }
            val version = db.rawQuery(
                "SELECT value FROM vault_meta WHERE key='schema_version'",
                emptyArray(),
            ).use { cursor ->
                check(cursor.moveToFirst()) { "RES001B_SCHEMA_MISSING" }
                cursor.getString(0)
            }
            check(version == "1" || version == "2") { "RES001B_SCHEMA_INCOMPATIBLE" }
            return db
        } catch (error: Throwable) {
            db.close()
            throw error
        }
    }

    private fun assertReadWorksAndWriteFails(db: SQLiteDatabase) {
        db.rawQuery("SELECT COUNT(*) FROM derived_evidence", emptyArray()).use { cursor ->
            assertTrue(cursor.moveToFirst())
            assertEquals(1, cursor.getInt(0))
        }
        try {
            db.execSQL("UPDATE derived_evidence SET semantic_type='FEE'")
            fail("Read-only handle accepted a write")
        } catch (_: Exception) {
            // Required failure.
        }
    }

    @Test fun dependencyLoadsEncryptedDatabaseAndReportsCipher4x() {
        val directory = fixtureDir("dependency")
        val file = File(directory, "synthetic.db")
        val key = "RES001B-DEPENDENCY-SYNTHETIC".toByteArray()
        try {
            createFixture(file, key, "2").use { db ->
                val version = db.rawQuery("PRAGMA cipher_version", emptyArray()).use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    cursor.getString(0)
                }
                assertTrue("Unexpected native SQLCipher family: $version", version.startsWith("4."))
            }
        } finally {
            key.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun closedRollbackFixtureIsByteStableAcrossRepeatedReadOnlyOpens() {
        val directory = fixtureDir("closed")
        val file = File(directory, "synthetic.db")
        val key = "RES001B-CLOSED-SYNTHETIC".toByteArray()
        try {
            createFixture(file, key, "2").close()
            val before = snapshot(file)
            repeat(3) { openValidatedReadOnly(file, key).use(::assertReadWorksAndWriteFails) }
            assertEquals(before, snapshot(file))
        } finally {
            key.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun missingDatabaseReadOnlyOpenCreatesNothing() {
        val directory = fixtureDir("missing")
        val missing = File(directory, "missing.db")
        val key = "RES001B-MISSING-SYNTHETIC".toByteArray()
        try {
            try {
                openValidatedReadOnly(missing, key).use { fail("Missing database opened") }
            } catch (_: Exception) {
                assertEquals(emptyMap<String, Fingerprint>().keys, snapshot(missing).filterValues { it.exists }.keys)
            }
        } finally {
            key.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun wrongKeyFailsWithoutChangingDatabaseOrSidecars() {
        val directory = fixtureDir("wrong-key")
        val file = File(directory, "synthetic.db")
        val correct = "RES001B-CORRECT-SYNTHETIC".toByteArray()
        val wrong = "RES001B-WRONG-SYNTHETIC".toByteArray()
        try {
            createFixture(file, correct, "2").close()
            val before = snapshot(file)
            try {
                openValidatedReadOnly(file, wrong).use { fail("Wrong key opened database") }
            } catch (_: Exception) {
                assertEquals(before, snapshot(file))
            }
        } finally {
            correct.fill(0)
            wrong.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun schemaV1AndV2OpenWithoutMigrationAndUnexpectedSchemaFailsClosed() {
        for (version in listOf("1", "2", "99")) {
            val directory = fixtureDir("schema-$version")
            val file = File(directory, "synthetic.db")
            val key = "RES001B-SCHEMA-$version-SYNTHETIC".toByteArray()
            try {
                createFixture(file, key, version).close()
                val before = snapshot(file)
                if (version == "99") {
                    try {
                        openValidatedReadOnly(file, key).use { fail("Unexpected schema accepted") }
                    } catch (_: Exception) { /* required */ }
                } else {
                    openValidatedReadOnly(file, key).use(::assertReadWorksAndWriteFails)
                }
                assertEquals("Schema $version fixture changed", before, snapshot(file))
            } finally {
                key.fill(0)
                directory.deleteRecursively()
            }
        }
    }

    @Test fun liveWalReadOnlyOpenMutatesShmAndIsNotQualifiedForZeroWriteGate() {
        val directory = fixtureDir("live-wal")
        val file = File(directory, "synthetic.db")
        val key = "RES001B-LIVE-WAL-SYNTHETIC".toByteArray()
        try {
            createFixture(file, key, "2", wal = true).use { writer ->
                writer.execSQL("INSERT INTO derived_evidence VALUES ('synthetic-row-2', 'UNKNOWN')")
                assertTrue(File(file.path + "-wal").exists())
                assertTrue(File(file.path + "-shm").exists())
                val before = snapshot(file)
                openValidatedReadOnly(file, key).use { db ->
                    assertTrue(db.isReadOnly)
                    db.rawQuery("SELECT COUNT(*) FROM derived_evidence", emptyArray()).use { cursor ->
                        assertTrue(cursor.moveToFirst())
                        assertEquals(2, cursor.getInt(0))
                    }
                }
                val after = snapshot(file)
                assertEquals(before.getValue(file.name), after.getValue(file.name))
                assertEquals(before.getValue(file.name + "-wal"), after.getValue(file.name + "-wal"))
                assertNotEquals(
                    "OPEN_READONLY unexpectedly left live WAL shared memory byte-stable",
                    before.getValue(file.name + "-shm"),
                    after.getValue(file.name + "-shm"),
                )
                assertEquals(before.getValue(file.name + "-journal"), after.getValue(file.name + "-journal"))
            }
        } finally {
            key.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun closedWalReadOnlyOpenCreatesSidecarsAndIsNotQualifiedForZeroWriteGate() {
        val directory = fixtureDir("closed-wal")
        val file = File(directory, "synthetic.db")
        val key = "RES001B-CLOSED-WAL-SYNTHETIC".toByteArray()
        try {
            createFixture(file, key, "2", wal = true).close()
            val before = snapshot(file)
            openValidatedReadOnly(file, key).use(::assertReadWorksAndWriteFails)
            val after = snapshot(file)
            assertEquals(before.getValue(file.name), after.getValue(file.name))
            assertFalse(before.getValue(file.name + "-wal").exists)
            assertFalse(before.getValue(file.name + "-shm").exists)
            assertTrue("OPEN_READONLY did not create the observed empty WAL", after.getValue(file.name + "-wal").exists)
            assertTrue("OPEN_READONLY did not create the observed SHM", after.getValue(file.name + "-shm").exists)
            assertEquals(0, after.getValue(file.name + "-wal").size)
            assertEquals(before.getValue(file.name + "-journal"), after.getValue(file.name + "-journal"))
        } finally {
            key.fill(0)
            directory.deleteRecursively()
        }
    }

    @Test fun missingSyntheticKeystoreAliasIsNotCreatedByReadinessCheck() {
        val alias = "res001b.synthetic.missing.${System.nanoTime()}"
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val before = store.aliases().toList().toSet()
        assertFalse(store.containsAlias(alias))
        val preferences = context.getSharedPreferences("res001b_synthetic_readiness", 0)
        assertFalse(preferences.contains("wrapped_dek"))
        // Diagnostic readiness must only inspect. It must never call KeyGenerator or edit preferences.
        val ready = store.containsAlias(alias) && preferences.contains("wrapped_dek")
        assertFalse(ready)
        val after = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.aliases().toList().toSet()
        assertEquals(before, after)
        assertFalse(preferences.contains("wrapped_dek"))
    }
}
