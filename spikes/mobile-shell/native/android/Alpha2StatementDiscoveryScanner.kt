package com.financesensor.lab.financesensor_mobile_shell

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

/**
 * Metadata-first Alpha.2 statement discovery.
 * Raw Gmail ids live only inside this native in-memory handle registry.
 */
class Alpha2StatementDiscoveryScanner {
    companion object {
        private const val GMAIL_MESSAGES = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
        private const val PAGE_SIZE = 100
        private const val MAX_MESSAGES_PER_PROFILE = 500
        private const val MAX_PAGES_PER_PROFILE = 20
        private const val MAX_ATTACHMENT_BYTES = 20_971_520
        private const val CONNECT_TIMEOUT_MS = 12_000
        private const val READ_TIMEOUT_MS = 12_000
        private const val PDF_MIME = "application/pdf"
        private const val BCP_SAVINGS_PROFILE = "PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1"
    }

    private data class Profile(
        val id: String,
        val institutionCode: String,
        val productType: String,
        val senderDomains: Set<String>,
        val subjectMarkers: List<String>,
        val filenameRegex: Regex,
        val requiresLocalPassword: Boolean,
        val runtimeFetchEnabled: Boolean,
    )

    private data class Descriptor(
        val attachmentId: String,
        val filename: String,
        val mimeType: String,
        val size: Int,
    )

    private data class NativeHandle(
        val handle: String,
        val messageId: String,
        val attachmentId: String,
        val profile: Profile,
        val byteLength: Int,
    )

    private val profiles = listOf(
        Profile(
            id = "PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1",
            institutionCode = "BCP",
            productType = "CREDIT_CARD",
            senderDomains = setOf("notificacionesbcp.com.pe"),
            subjectMarkers = listOf("estado de cuenta de tu tarjeta visa"),
            filenameRegex = Regex("^eecc_visa\\.pdf$", RegexOption.IGNORE_CASE),
            requiresLocalPassword = true,
            runtimeFetchEnabled = false,
        ),
        Profile(
            id = BCP_SAVINGS_PROFILE,
            institutionCode = "BCP",
            productType = "SAVINGS",
            senderDomains = setOf("notificacionesbcp.com.pe", "bcp.com.pe"),
            subjectMarkers = listOf(
                "constancia de envío de estado de cuenta",
                "constancia de solicitud de copia de estado de cuenta",
            ),
            filenameRegex = Regex("^eecc[^/\\\\]*\\.pdf$", RegexOption.IGNORE_CASE),
            requiresLocalPassword = true,
            runtimeFetchEnabled = true,
        ),
        Profile(
            id = "PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1",
            institutionCode = "BANCO_RIPLEY",
            productType = "CREDIT_CARD",
            senderDomains = setOf("bancoripley.com.pe"),
            subjectMarkers = listOf("estado de cuenta banco ripley"),
            filenameRegex = Regex("\\.pdf$", RegexOption.IGNORE_CASE),
            requiresLocalPassword = true,
            runtimeFetchEnabled = false,
        ),
    )

    private val handles = linkedMapOf<String, NativeHandle>()

    @Synchronized
    fun scan(token: String): Map<String, Any?> {
        handles.clear()
        var inspected = 0
        var strong = 0
        var conflicts = 0
        for (profile in profiles) {
            var pageToken: String? = null
            var profileInspected = 0
            var pages = 0
            while (profileInspected < MAX_MESSAGES_PER_PROFILE && pages < MAX_PAGES_PER_PROFILE) {
                val maxResults = minOf(PAGE_SIZE, MAX_MESSAGES_PER_PROFILE - profileInspected)
                val query = queryFor(profile)
                val url = buildString {
                    append(GMAIL_MESSAGES)
                    append("?labelIds=INBOX&includeSpamTrash=false&maxResults=")
                    append(maxResults)
                    append("&q=")
                    append(encode(query))
                    if (!pageToken.isNullOrBlank()) {
                        append("&pageToken=")
                        append(encode(pageToken!!))
                    }
                }
                val list = getJson(url, token)
                val messages = list.optJSONArray("messages") ?: JSONArray()
                if (messages.length() == 0) break
                pages += 1

                for (index in 0 until messages.length()) {
                    if (profileInspected >= MAX_MESSAGES_PER_PROFILE) break
                    val messageId = messages.optJSONObject(index)?.optString("id").orEmpty()
                    if (messageId.isBlank()) continue
                    profileInspected += 1
                    inspected += 1

                    val metadata = getJson(
                        "$GMAIL_MESSAGES/${encode(messageId)}?format=metadata" +
                            "&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date" +
                            "&fields=id,payload(headers(name,value))",
                        token,
                    )
                    val headers = headers(metadata)
                    val matchingProfiles = profiles.filter {
                        senderDomain(headers["from"].orEmpty()) in it.senderDomains &&
                            it.subjectMarkers.any { marker -> normalize(headers["subject"].orEmpty()).contains(normalize(marker)) }
                    }
                    if (matchingProfiles.size != 1 || matchingProfiles.single.id != profile.id) {
                        if (matchingProfiles.size > 1) conflicts += 1
                        continue
                    }

                    val mime = getJson(
                        "$GMAIL_MESSAGES/${encode(messageId)}?format=full&fields=" +
                            encode(
                                "id,payload(mimeType,filename,body(size,attachmentId)," +
                                    "parts(mimeType,filename,body(size,attachmentId)," +
                                    "parts(mimeType,filename,body(size,attachmentId)," +
                                    "parts(mimeType,filename,body(size,attachmentId)))))",
                            ),
                        token,
                    )
                    val descriptors = mutableListOf<Descriptor>()
                    collectDescriptors(mime.optJSONObject("payload"), descriptors)
                    val valid = descriptors.filter { descriptor ->
                        descriptor.mimeType.lowercase(Locale.ROOT) == PDF_MIME &&
                            descriptor.attachmentId.isNotBlank() &&
                            descriptor.size in 1..MAX_ATTACHMENT_BYTES &&
                            profile.filenameRegex.containsMatchIn(descriptor.filename)
                    }
                    if (valid.size != 1) {
                        if (valid.size > 1) conflicts += 1
                        continue
                    }
                    val descriptor = valid.single()
                    val handle = "stmt_${UUID.randomUUID()}"
                    handles[handle] = NativeHandle(
                        handle = handle,
                        messageId = messageId,
                        attachmentId = descriptor.attachmentId,
                        profile = profile,
                        byteLength = descriptor.size,
                    )
                    strong += 1
                }

                pageToken = list.optString("nextPageToken").takeIf { it.isNotBlank() }
                if (pageToken == null || messages.length() < maxResults) break
            }
        }

        return mapOf(
            "statementCandidates" to handles.values.map { item ->
                mapOf(
                    "handle" to item.handle,
                    "profileId" to item.profile.id,
                    "institutionCode" to item.profile.institutionCode,
                    "productType" to item.profile.productType,
                    "state" to "STRONG",
                    "byteLength" to item.byteLength,
                    "requiresLocalPassword" to item.profile.requiresLocalPassword,
                    "fetchEligible" to item.profile.runtimeFetchEnabled,
                )
            },
            "messagesInspected" to inspected,
            "strongCandidates" to strong,
            "conflicts" to conflicts,
            "rawMetadataReturned" to false,
            "attachmentBytesFetched" to false,
            "sessionHandleCount" to handles.size,
        )
    }

    @Synchronized
    fun fetch(handle: String, token: String): ByteArray {
        val candidate = handles[handle]
            ?: throw StatementException("ALPHA2_STATEMENT_HANDLE_NOT_FOUND")
        if (!candidate.profile.runtimeFetchEnabled) {
            throw StatementException("ALPHA2_STATEMENT_PROFILE_QUARANTINED")
        }
        val payload = getJson(
            "$GMAIL_MESSAGES/${encode(candidate.messageId)}/attachments/${encode(candidate.attachmentId)}",
            token,
        )
        val encoded = payload.optString("data")
        if (encoded.isBlank()) throw StatementException("ALPHA2_STATEMENT_ATTACHMENT_EMPTY")
        val bytes = try {
            Base64.decode(encoded, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        } catch (_: IllegalArgumentException) {
            throw StatementException("ALPHA2_STATEMENT_ATTACHMENT_INVALID_BASE64")
        }
        if (bytes.isEmpty() || bytes.size > MAX_ATTACHMENT_BYTES) {
            bytes.fill(0)
            throw StatementException("ALPHA2_STATEMENT_ATTACHMENT_SIZE_INVALID")
        }
        val pdf = bytes.size >= 5 &&
            bytes[0] == '%'.code.toByte() && bytes[1] == 'P'.code.toByte() &&
            bytes[2] == 'D'.code.toByte() && bytes[3] == 'F'.code.toByte() &&
            bytes[4] == '-'.code.toByte()
        if (!pdf) {
            bytes.fill(0)
            throw StatementException("ALPHA2_STATEMENT_PDF_SIGNATURE_INVALID")
        }
        return bytes
    }

    @Synchronized
    fun release(handle: String) {
        handles.remove(handle)
    }

    @Synchronized
    fun clear() {
        handles.clear()
    }

    private fun queryFor(profile: Profile): String {
        val sender = if (profile.senderDomains.size == 1) {
            "from:${profile.senderDomains.single()}"
        } else {
            "{${profile.senderDomains.joinToString(" ") { "from:$it" }}}"
        }
        val subject = if (profile.subjectMarkers.size == 1) {
            "subject:\"${profile.subjectMarkers.single()}\""
        } else {
            "{${profile.subjectMarkers.joinToString(" ") { "subject:\"$it\"" }}}"
        }
        val after = LocalDate.now(ZoneOffset.UTC)
            .minusDays(730)
            .format(DateTimeFormatter.ofPattern("yyyy/MM/dd"))
        return "$sender $subject has:attachment filename:pdf after:$after"
    }

    private fun collectDescriptors(part: JSONObject?, out: MutableList<Descriptor>) {
        if (part == null) return
        val body = part.optJSONObject("body")
        val attachmentId = body?.optString("attachmentId").orEmpty()
        val filename = part.optString("filename")
        val mimeType = part.optString("mimeType")
        val size = body?.optInt("size", 0) ?: 0
        if (attachmentId.isNotBlank() || filename.isNotBlank()) {
            out += Descriptor(attachmentId, filename, mimeType, size)
        }
        val children = part.optJSONArray("parts") ?: return
        for (index in 0 until children.length()) {
            collectDescriptors(children.optJSONObject(index), out)
        }
    }

    private fun headers(message: JSONObject): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val array = message.optJSONObject("payload")?.optJSONArray("headers") ?: JSONArray()
        for (index in 0 until array.length()) {
            val header = array.optJSONObject(index) ?: continue
            val name = header.optString("name").lowercase(Locale.ROOT)
            if (name in setOf("from", "subject", "date")) result[name] = header.optString("value")
        }
        return result
    }

    private fun senderDomain(from: String): String {
        val address = Regex("<?([A-Z0-9._%+-]+@([A-Z0-9.-]+))>?", RegexOption.IGNORE_CASE)
            .find(from)?.groupValues?.getOrNull(2).orEmpty()
        return address.lowercase(Locale.ROOT)
    }

    private fun normalize(value: String): String = java.text.Normalizer
        .normalize(value, java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .lowercase(Locale.ROOT)
        .replace(Regex("\\s+"), " ")
        .trim()

    private fun getJson(url: String, token: String): JSONObject {
        var connection: HttpURLConnection? = null
        try {
            connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Accept", "application/json")
            }
            val status = connection.responseCode
            if (status == 401) throw StatementException("REAUTH_REQUIRED")
            if (status !in 200..299) throw StatementException("ALPHA2_STATEMENT_GMAIL_HTTP_$status")
            val bytes = connection.inputStream.use { it.readBytes() }
            return JSONObject(bytes.toString(Charsets.UTF_8))
        } finally {
            connection?.disconnect()
        }
    }

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.toString())

    class StatementException(val safeCode: String) : RuntimeException(safeCode)
}
