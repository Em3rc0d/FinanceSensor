package com.financesensor.lab.financesensor_mobile_shell

import android.content.ContentValues
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import net.zetetic.database.sqlcipher.SQLiteDatabase
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec

/**
 * Alpha.2 encrypted local vault.
 *
 * Public-CI boundary: this class may compile in GitHub-hosted CI, but CI does
 * not execute Android Keystore or inspect physical SQLCipher files. Those are
 * separate owned-device gates.
 */
class Alpha2VaultBridge(private val context: Context) {
    companion object {
        const val CHANNEL = "com.financesensor.platform/alpha2_vault"
        private const val SQLCIPHER_VERSION = "4.18.0"
        private const val KEYSTORE = "AndroidKeyStore"
        private const val WRAP_ALIAS = "financesensor.alpha2.vault.wrap.v1"
        private const val PREFS = "financesensor_alpha2_vault_meta"
        private const val WRAPPED_DEK = "wrapped_dek_v1"
        private const val DATABASE_NAME = "financesensor-alpha2.db"
        private const val SCHEMA_VERSION = 1
        private const val DEK_BYTES = 32
    }

    private val lock = Any()
    private var database: SQLiteDatabase? = null

    fun register(messenger: BinaryMessenger) {
        MethodChannel(messenger, CHANNEL).setMethodCallHandler(::onCall)
    }

    private fun onCall(call: MethodCall, result: MethodChannel.Result) {
        try {
            when (call.method) {
                "initialize" -> result.success(initialize())
                "commitEvidenceBatch" -> result.success(commitEvidenceBatch(call))
                "readSafeEvidence" -> result.success(readSafeEvidence())
                "cryptoShred" -> {
                    cryptoShred()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        } catch (error: VaultException) {
            result.error(error.safeCode, error.message, null)
        } catch (_: Exception) {
            result.error("ALPHA2_VAULT_FAILED", "Encrypted vault operation failed safely", null)
        }
    }

    private fun initialize(): Map<String, Any?> = synchronized(lock) {
        if (database == null) database = openEncryptedDatabase()
        mapOf(
            "sqlcipherVersion" to SQLCIPHER_VERSION,
            "encryptedOpenOnly" to true,
            "platformWrappedDek" to true,
            "plaintextFallback" to false,
            "hardwareBackedKey" to isHardwareBackedWrapKey(),
            "schemaVersion" to SCHEMA_VERSION,
            "rawDekExposedToFlutter" to false,
        )
    }

    private fun openEncryptedDatabase(): SQLiteDatabase {
        System.loadLibrary("sqlcipher")
        val wrapKey = getOrCreateHardwareBackedWrapKey()
        val dek = loadOrCreateDek(wrapKey)
        try {
            val dbFile = File(context.noBackupFilesDir, DATABASE_NAME)
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, dek, null, null, null)
            ensureSchema(db)
            return db
        } catch (_: Exception) {
            throw VaultException("ALPHA2_SQLCIPHER_OPEN_FAILED", "Encrypted database could not be opened")
        } finally {
            dek.fill(0)
        }
    }

    private fun ensureSchema(db: SQLiteDatabase) {
        db.beginTransaction()
        try {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS vault_meta (
                  key TEXT PRIMARY KEY NOT NULL,
                  value TEXT NOT NULL
                )
                """.trimIndent(),
            )
            val existing = db.rawQuery("SELECT value FROM vault_meta WHERE key='schema_version'", emptyArray()).use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
            if (existing != null && existing != SCHEMA_VERSION.toString()) {
                throw VaultException("ALPHA2_VAULT_SCHEMA_VERSION_MISMATCH", "Vault schema mismatch")
            }
            db.execSQL(
                "INSERT OR REPLACE INTO vault_meta(key,value) VALUES('schema_version',?)",
                arrayOf(SCHEMA_VERSION.toString()),
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS statement_sources (
                  source_receipt_id TEXT PRIMARY KEY NOT NULL,
                  terminal_state TEXT NOT NULL CHECK(terminal_state IN ('IMPORTED','QUARANTINED','FAILED','DISCARDED'))
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS derived_evidence (
                  evidence_id TEXT PRIMARY KEY NOT NULL,
                  source_receipt_id TEXT NOT NULL,
                  tenant_id TEXT NOT NULL,
                  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
                  currency TEXT NOT NULL,
                  occurred_at TEXT NOT NULL,
                  semantic_type TEXT NOT NULL,
                  evidence_channel TEXT NOT NULL,
                  truth_state TEXT NOT NULL,
                  institution_code TEXT,
                  account_id TEXT,
                  instrument_id TEXT,
                  merchant_canonical TEXT,
                  statement_period_id TEXT,
                  category_name TEXT,
                  flow_direction TEXT NOT NULL,
                  FOREIGN KEY(source_receipt_id) REFERENCES statement_sources(source_receipt_id)
                )
                """.trimIndent(),
            )
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun commitEvidenceBatch(call: MethodCall): Map<String, Any?> = synchronized(lock) {
        val db = database ?: openEncryptedDatabase().also { database = it }
        val sourceReceiptId = call.argument<String>("sourceReceiptId")?.trim().orEmpty()
        val terminalState = call.argument<String>("terminalState")?.trim()?.uppercase().orEmpty()
        val rows = call.argument<List<Map<String, Any?>>>("evidence") ?: emptyList()
        if (sourceReceiptId.isBlank()) throw VaultException("ALPHA2_VAULT_SOURCE_RECEIPT_REQUIRED", "Source receipt is required")
        if (terminalState !in setOf("IMPORTED", "QUARANTINED", "FAILED", "DISCARDED")) {
            throw VaultException("ALPHA2_VAULT_TERMINAL_STATE_INVALID", "Terminal state invalid")
        }

        val replay = db.rawQuery(
            "SELECT terminal_state FROM statement_sources WHERE source_receipt_id=?",
            arrayOf(sourceReceiptId),
        ).use { cursor -> cursor.moveToFirst() }
        if (replay) return@synchronized mapOf("replayed" to true, "rowCount" to 0)

        db.beginTransaction()
        try {
            // Parent receipt and derived rows are committed in one SQL transaction.
            val source = ContentValues().apply {
                put("source_receipt_id", sourceReceiptId)
                put("terminal_state", terminalState)
            }
            db.insertOrThrow("statement_sources", null, source)

            for (row in rows) {
                validateSafeRow(row)
                val values = ContentValues().apply {
                    put("evidence_id", row["evidenceId"] as String)
                    put("source_receipt_id", sourceReceiptId)
                    put("tenant_id", row["tenantId"] as String)
                    put("amount_minor", ((row["amount"] as Number).toDouble() * 100.0).toLong())
                    put("currency", (row["currency"] as String).uppercase())
                    put("occurred_at", row["occurredAt"] as String)
                    put("semantic_type", row["semanticType"] as String)
                    put("evidence_channel", row["channel"] as String)
                    put("truth_state", row["truthState"] as String)
                    putNullable("institution_code", row["institutionCode"])
                    putNullable("account_id", row["accountId"])
                    putNullable("instrument_id", row["instrumentId"])
                    putNullable("merchant_canonical", row["merchantCanonical"])
                    putNullable("statement_period_id", row["statementPeriodId"])
                    putNullable("category_name", row["categoryName"])
                    put("flow_direction", row["flowDirection"] as String)
                }
                db.insertOrThrow("derived_evidence", null, values)
            }
            db.setTransactionSuccessful()
        } catch (_: VaultException) {
            throw
        } catch (_: Exception) {
            throw VaultException("ALPHA2_VAULT_ATOMIC_COMMIT_FAILED", "Evidence batch rolled back")
        } finally {
            db.endTransaction()
        }
        mapOf("replayed" to false, "rowCount" to rows.size)
    }

    private fun readSafeEvidence(): List<Map<String, Any?>> = synchronized(lock) {
        val db = database ?: openEncryptedDatabase().also { database = it }
        db.rawQuery(
            """
            SELECT evidence_id, tenant_id, amount_minor, currency, occurred_at,
                   semantic_type, evidence_channel, truth_state, institution_code,
                   account_id, instrument_id, merchant_canonical, statement_period_id,
                   category_name, flow_direction
            FROM derived_evidence ORDER BY evidence_id
            """.trimIndent(),
            emptyArray(),
        ).use { cursor ->
            val result = mutableListOf<Map<String, Any?>>()
            while (cursor.moveToNext()) {
                result += mapOf(
                    "evidenceId" to cursor.getString(0),
                    "tenantId" to cursor.getString(1),
                    "amountMinor" to cursor.getLong(2),
                    "currency" to cursor.getString(3),
                    "occurredAt" to cursor.getString(4),
                    "semanticType" to cursor.getString(5),
                    "channel" to cursor.getString(6),
                    "truthState" to cursor.getString(7),
                    "institutionCode" to cursor.stringOrNull(8),
                    "accountId" to cursor.stringOrNull(9),
                    "instrumentId" to cursor.stringOrNull(10),
                    "merchantCanonical" to cursor.stringOrNull(11),
                    "statementPeriodId" to cursor.stringOrNull(12),
                    "categoryName" to cursor.stringOrNull(13),
                    "flowDirection" to cursor.getString(14),
                )
            }
            result
        }
    }

    private fun validateSafeRow(row: Map<String, Any?>) {
        val forbidden = setOf(
            "rawPdf", "decryptedText", "ocrPages", "layoutGeometry", "rawRows",
            "password", "gmailBody", "rawGmailMessageId", "rawAttachmentId", "rawDek",
        )
        if (row.keys.any { it in forbidden }) throw VaultException("ALPHA2_VAULT_RAW_FIELD_FORBIDDEN", "Raw field rejected")
        for (key in listOf("evidenceId", "tenantId", "currency", "occurredAt", "semanticType", "channel", "truthState", "flowDirection")) {
            if ((row[key] as? String).isNullOrBlank()) throw VaultException("ALPHA2_VAULT_ROW_INVALID", "Evidence row invalid")
        }
        val amount = (row["amount"] as? Number)?.toDouble()
        if (amount == null || !amount.isFinite() || amount <= 0.0) throw VaultException("ALPHA2_VAULT_ROW_INVALID", "Evidence row invalid")
    }

    private fun getOrCreateHardwareBackedWrapKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getKey(WRAP_ALIAS, null) as? SecretKey)?.let { existing ->
            if (!isHardwareBacked(existing)) throw VaultException("ALPHA2_KEYSTORE_SOFTWARE_FALLBACK_FORBIDDEN", "Hardware-backed key unavailable")
            return existing
        }

        fun generate(strongBox: Boolean): SecretKey {
            val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
            val builder = KeyGenParameterSpec.Builder(
                WRAP_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
            if (strongBox) builder.setIsStrongBoxBacked(true)
            generator.init(builder.build())
            return generator.generateKey()
        }

        val key = runCatching { generate(true) }.getOrElse {
            // TEE-backed is an accepted security class; software fallback remains forbidden.
            generate(false)
        }
        if (!isHardwareBacked(key)) {
            runCatching { keyStore.deleteEntry(WRAP_ALIAS) }
            throw VaultException("ALPHA2_KEYSTORE_SOFTWARE_FALLBACK_FORBIDDEN", "Hardware-backed key unavailable")
        }
        return key
    }

    private fun isHardwareBackedWrapKey(): Boolean {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        val key = keyStore.getKey(WRAP_ALIAS, null) as? SecretKey ?: return false
        return isHardwareBacked(key)
    }

    private fun isHardwareBacked(key: SecretKey): Boolean = try {
        val factory = SecretKeyFactory.getInstance(key.algorithm, KEYSTORE)
        val info = factory.getKeySpec(key, KeyInfo::class.java) as KeyInfo
        info.isInsideSecureHardware
    } catch (_: Exception) {
        false
    }

    private fun loadOrCreateDek(wrapKey: SecretKey): ByteArray {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val encoded = prefs.getString(WRAPPED_DEK, null)
        if (encoded != null) return unwrapDek(wrapKey, encoded)
        val dek = ByteArray(DEK_BYTES).also { SecureRandom().nextBytes(it) }
        try {
            val wrapped = wrapDek(wrapKey, dek)
            if (!prefs.edit().putString(WRAPPED_DEK, wrapped).commit()) {
                throw VaultException("ALPHA2_DEK_WRAP_PERSIST_FAILED", "Wrapped DEK could not be persisted")
            }
            return dek.copyOf()
        } finally {
            dek.fill(0)
        }
    }

    private fun wrapDek(key: SecretKey, dek: ByteArray): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val ciphertext = cipher.doFinal(dek)
        val envelope = ByteArray(1 + cipher.iv.size + ciphertext.size)
        envelope[0] = cipher.iv.size.toByte()
        System.arraycopy(cipher.iv, 0, envelope, 1, cipher.iv.size)
        System.arraycopy(ciphertext, 0, envelope, 1 + cipher.iv.size, ciphertext.size)
        return Base64.encodeToString(envelope, Base64.NO_WRAP)
    }

    private fun unwrapDek(key: SecretKey, encoded: String): ByteArray {
        try {
            val envelope = Base64.decode(encoded, Base64.NO_WRAP)
            val ivLength = envelope.firstOrNull()?.toInt()?.and(0xff) ?: 0
            if (ivLength !in 12..16 || envelope.size <= 1 + ivLength) throw IllegalArgumentException()
            val iv = envelope.copyOfRange(1, 1 + ivLength)
            val ciphertext = envelope.copyOfRange(1 + ivLength, envelope.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
            val dek = cipher.doFinal(ciphertext)
            if (dek.size != DEK_BYTES) {
                dek.fill(0)
                throw IllegalArgumentException()
            }
            return dek
        } catch (_: Exception) {
            throw VaultException("ALPHA2_DEK_UNWRAP_FAILED", "Database key authority unavailable")
        }
    }

    private fun cryptoShred() = synchronized(lock) {
        database?.close()
        database = null
        // Remove key authority first. Restored ciphertext/wrapped DEK then remains unusable.
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        if (keyStore.containsAlias(WRAP_ALIAS)) keyStore.deleteEntry(WRAP_ALIAS)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit()
        val base = File(context.noBackupFilesDir, DATABASE_NAME)
        listOf(base, File(base.path + "-wal"), File(base.path + "-shm"), File(base.path + "-journal")).forEach { file ->
            runCatching { if (file.exists()) file.delete() }
        }
    }

    private fun ContentValues.putNullable(key: String, value: Any?) {
        if (value == null) putNull(key) else put(key, value.toString())
    }

    private fun android.database.Cursor.stringOrNull(index: Int): String? = if (isNull(index)) null else getString(index)

    class VaultException(val safeCode: String, message: String) : RuntimeException(message)
}
