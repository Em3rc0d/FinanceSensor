package com.financesensor.lab.financesensor_mobile_shell

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Instant
import java.util.Locale

/**
 * Alpha.2 transaction-notification scanner.
 *
 * Unlike the legacy human-test scanner this surface never exports a numeric
 * confidence. It returns OBSERVED evidence plus an opaque stable receipt hash.
 */
object Alpha2TransactionScanner {
    private const val GMAIL_MESSAGES = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    private const val MAX_MESSAGES = 300
    private const val PAGE_SIZE = 100
    private const val CONNECT_TIMEOUT_MS = 12_000
    private const val READ_TIMEOUT_MS = 12_000

    private data class Candidate(
        val adapterId: String,
        val institutionCode: String,
    )

    private data class Money(val amount: Double, val currency: String)

    private data class DerivedEvent(
        val sourceReceiptId: String,
        val amount: Double,
        val currency: String,
        val direction: String,
        val semanticType: String,
        val merchantCanonical: String?,
        val occurredAt: String,
        val institutionCode: String,
        val adapterId: String,
    ) {
        fun toMap(): Map<String, Any?> = mapOf(
            "sourceReceiptId" to sourceReceiptId,
            "tenantId" to "LOCAL_PRIMARY",
            "amount" to amount,
            "currency" to currency,
            "direction" to direction,
            "semanticType" to semanticType,
            "merchantCanonical" to merchantCanonical,
            "occurredAt" to occurredAt,
            "institutionCode" to institutionCode,
            "adapterId" to adapterId,
            "truthState" to "OBSERVED",
        )
    }

    fun scan(token: String): Map<String, Any?> {
        var inspected = 0
        var candidates = 0
        var fullFetched = 0
        var rejected = 0
        var parseMisses = 0
        var pageToken: String? = null
        val events = mutableListOf<DerivedEvent>()

        while (inspected < MAX_MESSAGES) {
            val remaining = MAX_MESSAGES - inspected
            val maxResults = minOf(PAGE_SIZE, remaining)
            val listUrl = buildString {
                append(GMAIL_MESSAGES)
                append("?labelIds=INBOX&maxResults=")
                append(maxResults)
                if (!pageToken.isNullOrBlank()) {
                    append("&pageToken=")
                    append(encode(pageToken!!))
                }
            }
            val list = getJson(listUrl, token)
            val messages = list.optJSONArray("messages") ?: JSONArray()
            if (messages.length() == 0) break

            for (index in 0 until messages.length()) {
                if (inspected >= MAX_MESSAGES) break
                val messageId = messages.optJSONObject(index)?.optString("id").orEmpty()
                if (messageId.isBlank()) continue
                inspected += 1

                val metadata = getJson(
                    "$GMAIL_MESSAGES/${encode(messageId)}?format=metadata" +
                        "&metadataHeaders=From&metadataHeaders=Subject" +
                        "&fields=id,internalDate,payload(headers(name,value))",
                    token,
                )
                val headers = headers(metadata)
                val candidate = classify(headers["from"].orEmpty(), headers["subject"].orEmpty())
                if (candidate == null) {
                    rejected += 1
                    continue
                }
                candidates += 1

                val full = getJson("$GMAIL_MESSAGES/${encode(messageId)}?format=full", token)
                fullFetched += 1
                val body = bodyText(full.optJSONObject("payload"))
                val internalMillis = metadata.optString("internalDate").toLongOrNull()
                val occurredAt = internalMillis?.let { Instant.ofEpochMilli(it).toString() }
                    ?: Instant.EPOCH.toString()
                val event = extract(
                    candidate = candidate,
                    rawBody = body,
                    occurredAt = occurredAt,
                    sourceReceiptId = opaqueReceipt(messageId),
                )
                if (event == null) parseMisses += 1 else events += event
            }

            pageToken = list.optString("nextPageToken").takeIf { it.isNotBlank() }
            if (pageToken == null || messages.length() < maxResults) break
        }

        return mapOf(
            "status" to "SCAN_COMPLETE",
            "messagesInspected" to inspected,
            "candidates" to candidates,
            "fullMessagesFetched" to fullFetched,
            "metadataRejected" to rejected,
            "parseMisses" to parseMisses,
            "eventsCount" to events.size,
            "events" to events.map { it.toMap() },
            "maxMessages" to MAX_MESSAGES,
            "coverage" to "RECENT_INBOX_BOUNDED_SAMPLE",
            "sessionOnly" to true,
            "rawContentReturned" to false,
            "rawContentPersisted" to false,
            "numericConfidenceReturned" to false,
        )
    }

    private fun classify(from: String, subject: String): Candidate? {
        val domain = senderAddress(from).substringAfter('@', "").lowercase(Locale.ROOT)
        val normalizedSubject = normalize(subject).lowercase(Locale.ROOT)
        if (domain == "notificacionesbcp.com.pe") {
            return when {
                normalizedSubject.contains("realizaste un consumo con tu tarjeta") -> Candidate("BCP_CARD_PURCHASE", "BCP")
                normalizedSubject.contains("realizaste un retiro en un cajero automatico") -> Candidate("BCP_ATM_WITHDRAWAL", "BCP")
                normalizedSubject.contains("constancia de transferencia entre mis cuentas") -> Candidate("BCP_INTERNAL_TRANSFER", "BCP")
                normalizedSubject.contains("constancia de transferencia a otros bancos") -> Candidate("BCP_EXTERNAL_TRANSFER", "BCP")
                normalizedSubject.contains("constancia de pago de tarjeta de credito propia") -> Candidate("BCP_CARD_PAYMENT", "BCP")
                normalizedSubject.contains("constancia de pago de servicio") -> Candidate("BCP_SERVICE_PAYMENT", "BCP")
                else -> null
            }
        }
        if (domain == "netinterbank.com.pe") {
            return when {
                normalizedSubject.contains("realizaste un consumo con tu tarjeta interbank") -> Candidate("INTERBANK_CARD_PURCHASE", "INTERBANK")
                normalizedSubject.contains("constancia de pago plin") -> Candidate("INTERBANK_PLIN_PAYMENT", "INTERBANK")
                normalizedSubject == "constancia de transferencia" -> Candidate("INTERBANK_TRANSFER", "INTERBANK")
                normalizedSubject == "constancia de pago" -> Candidate("INTERBANK_SERVICE_PAYMENT", "INTERBANK")
                else -> null
            }
        }
        if (domain == "notificaciones.bancoripley.com.pe" && normalizedSubject.contains("pago tarjeta ripley exitoso")) {
            return Candidate("RIPLEY_CARD_PAYMENT", "BANCO_RIPLEY")
        }
        return null
    }

    private fun extract(
        candidate: Candidate,
        rawBody: String,
        occurredAt: String,
        sourceReceiptId: String,
    ): DerivedEvent? {
        val body = htmlToText(rawBody)
        val parsed = when (candidate.adapterId) {
            "BCP_CARD_PURCHASE" -> bcpPurchase(body)
            "BCP_ATM_WITHDRAWAL" -> simpleOut(body, listOf("total retirado", "retiro de"), "Cajero automático", "CASH_WITHDRAWAL")
            "BCP_INTERNAL_TRANSFER" -> simpleOut(body, listOf("monto transferido", "monto enviado", "monto"), null, "INTERNAL_TRANSFER")
            "BCP_EXTERNAL_TRANSFER" -> simpleOut(body, listOf("monto transferido", "monto enviado", "monto"), null, "EXTERNAL_TRANSFER")
            "BCP_CARD_PAYMENT", "RIPLEY_CARD_PAYMENT" -> simpleOut(body, listOf("monto total", "monto pagado", "monto"), "Pago de tarjeta", "CARD_PAYMENT")
            "BCP_SERVICE_PAYMENT", "INTERBANK_SERVICE_PAYMENT" -> simpleOut(
                body,
                listOf("total pagado", "monto pagado", "monto", "importe", "recibo"),
                field(body, listOf("empresa", "comercio", "establecimiento")) ?: "Pago de servicio",
                "SERVICE_PAYMENT",
            )
            "INTERBANK_CARD_PURCHASE" -> interbankPurchase(body)
            "INTERBANK_PLIN_PAYMENT" -> simpleOut(body, listOf("monto enviado", "monto", "importe"), null, "EXTERNAL_TRANSFER")
            "INTERBANK_TRANSFER" -> simpleOut(body, listOf("monto transferido", "monto enviado", "monto"), null, "EXTERNAL_TRANSFER")
            else -> null
        } ?: return null

        return DerivedEvent(
            sourceReceiptId = sourceReceiptId,
            amount = parsed.first.amount,
            currency = parsed.first.currency,
            direction = "OUT",
            semanticType = parsed.third,
            merchantCanonical = parsed.second?.let(::normalizeMerchant),
            occurredAt = occurredAt,
            institutionCode = candidate.institutionCode,
            adapterId = candidate.adapterId,
        )
    }

    private fun bcpPurchase(text: String): Triple<Money, String?, String>? {
        val regex = Regex(
            "realizaste\\s+un\\s+consumo\\s+de\\s*(PEN|USD|US\\$|S\\/.?|\\$)\\s*([0-9][0-9.,\\u00A0 ]*)\\s+con\\s+tu\\s+tarjeta[\\s\\S]{0,120}?\\s+en\\s+([^\\n.]{1,100})",
            RegexOption.IGNORE_CASE,
        )
        val match = regex.find(text) ?: return null
        val money = money(match.groupValues[1], match.groupValues[2]) ?: return null
        return Triple(money, normalize(match.groupValues[3]).takeIf { it.isNotBlank() }, "EXPENSE")
    }

    private fun interbankPurchase(text: String): Triple<Money, String?, String>? {
        val money = moneyAfter(text, listOf("monto")) ?: firstMoney(text) ?: return null
        val merchant = Regex("comercio\\s*:\\s*(.+?)(?=\\s+monto\\s*:|[;\\n\\r]|$)", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.getOrNull(1)?.let(::normalize)?.takeIf { it.isNotBlank() }
        return Triple(money, merchant, "EXPENSE")
    }

    private fun simpleOut(text: String, labels: List<String>, merchant: String?, semantic: String): Triple<Money, String?, String>? {
        val money = moneyAfter(text, labels) ?: firstMoney(text) ?: return null
        return Triple(money, merchant, semantic)
    }

    private fun moneyAfter(text: String, labels: List<String>): Money? {
        for (label in labels) {
            val pattern = Regex(
                "${Regex.escape(label)}\\s*[:#-]?\\s*(PEN|USD|US\\$|S\\/.?|\\$)\\s*([0-9][0-9.,\\u00A0 ]*)",
                RegexOption.IGNORE_CASE,
            )
            val match = pattern.find(text) ?: continue
            money(match.groupValues[1], match.groupValues[2])?.let { return it }
        }
        return null
    }

    private fun firstMoney(text: String): Money? {
        val match = Regex("\\b(PEN|USD|US\\$|S\\/.?|\\$)\\s*([0-9][0-9.,\\u00A0 ]*)", RegexOption.IGNORE_CASE)
            .find(text) ?: return null
        return money(match.groupValues[1], match.groupValues[2])
    }

    private fun money(marker: String, raw: String): Money? {
        val token = raw.replace('\u00A0', ' ').replace(" ", "").replace(Regex("[^0-9.,]"), "").trimEnd('.', ',')
        if (token.isBlank() || token.none { it.isDigit() }) return null
        val lastDot = token.lastIndexOf('.')
        val lastComma = token.lastIndexOf(',')
        var decimal: Char? = null
        if (lastDot >= 0 && lastComma >= 0) {
            decimal = if (lastDot > lastComma) '.' else ','
        } else {
            val separator = maxOf(lastDot, lastComma)
            if (separator >= 0) {
                val trailing = token.length - separator - 1
                if (trailing == 1 || trailing == 2) decimal = token[separator]
            }
        }
        val normalized = if (decimal != null) {
            val index = token.lastIndexOf(decimal)
            token.substring(0, index).replace(".", "").replace(",", "") + "." +
                token.substring(index + 1).replace(".", "").replace(",", "")
        } else {
            token.replace(".", "").replace(",", "")
        }
        val amount = normalized.toDoubleOrNull() ?: return null
        if (!amount.isFinite() || amount <= 0.0) return null
        val lowerMarker = marker.lowercase(Locale.ROOT)
        val currency = if ((lowerMarker.contains("usd") || lowerMarker.contains("us$") || lowerMarker == "$") && !lowerMarker.contains("s/")) "USD" else "PEN"
        return Money(amount, currency)
    }

    private fun field(text: String, labels: List<String>): String? {
        for (label in labels) {
            val match = Regex("${Regex.escape(label)}\\s*[:#-]?\\s*([^\\n\\r;]{1,120})", RegexOption.IGNORE_CASE).find(text)
            val value = match?.groupValues?.getOrNull(1)?.let(::normalize)?.takeIf { it.isNotBlank() }
            if (value != null) return value
        }
        return null
    }

    private fun headers(message: JSONObject): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val array = message.optJSONObject("payload")?.optJSONArray("headers") ?: JSONArray()
        for (index in 0 until array.length()) {
            val header = array.optJSONObject(index) ?: continue
            val name = header.optString("name").lowercase(Locale.ROOT)
            if (name == "from" || name == "subject") result[name] = header.optString("value")
        }
        return result
    }

    private fun bodyText(payload: JSONObject?): String {
        if (payload == null) return ""
        val parts = payload.optJSONArray("parts")
        if (parts != null && parts.length() > 0) {
            val plain = mutableListOf<String>()
            val html = mutableListOf<String>()
            collectBodies(payload, plain, html)
            return if (plain.isNotEmpty()) plain.joinToString("\n") else html.joinToString("\n")
        }
        return decodeBody(payload.optJSONObject("body")?.optString("data").orEmpty())
    }

    private fun collectBodies(part: JSONObject, plain: MutableList<String>, html: MutableList<String>) {
        val mime = part.optString("mimeType").lowercase(Locale.ROOT)
        val data = part.optJSONObject("body")?.optString("data").orEmpty()
        if (data.isNotBlank()) {
            when {
                mime.startsWith("text/plain") -> plain += decodeBody(data)
                mime.startsWith("text/html") -> html += decodeBody(data)
            }
        }
        val children = part.optJSONArray("parts") ?: return
        for (index in 0 until children.length()) {
            children.optJSONObject(index)?.let { collectBodies(it, plain, html) }
        }
    }

    private fun decodeBody(data: String): String {
        if (data.isBlank()) return ""
        return try {
            String(Base64.decode(data, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING), Charsets.UTF_8)
        } catch (_: IllegalArgumentException) {
            ""
        }
    }

    private fun htmlToText(value: String): String = value
        .replace(Regex("<style\\b[^>]*>[\\s\\S]*?</style>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<script\\b[^>]*>[\\s\\S]*?</script>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<(?:br|p|div|li|tr|td|th|h[1-6])\\b[^>]*>", RegexOption.IGNORE_CASE), "\n")
        .replace(Regex("<[^>]+>"), " ")
        .replace("&nbsp;", " ", ignoreCase = true)
        .replace("&#160;", " ", ignoreCase = true)
        .replace("&amp;", "&", ignoreCase = true)
        .replace(Regex("[ \\t]+"), " ")
        .replace(Regex("\\n[ \\t]+"), "\n")
        .replace(Regex("\\n{3,}"), "\n\n")
        .trim()

    private fun senderAddress(from: String): String {
        val angle = Regex("<([^>]+)>").find(from)?.groupValues?.getOrNull(1)
        if (!angle.isNullOrBlank()) return angle.trim()
        return Regex("([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})", RegexOption.IGNORE_CASE)
            .find(from)?.groupValues?.getOrNull(1)?.trim().orEmpty()
    }

    private fun normalize(value: String): String = value.replace(Regex("\\s+"), " ").trim()

    private fun normalizeMerchant(value: String): String = normalize(value).lowercase(Locale.ROOT)
        .replace(Regex("[^a-z0-9áéíóúüñ]+", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("\\s+"), " ")
        .trim()

    private fun opaqueReceipt(messageId: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("gmail-msg-v1|$messageId".toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }.take(40)
    }

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
            if (status == 401) throw ScanException("REAUTH_REQUIRED")
            if (status !in 200..299) throw ScanException("ALPHA2_GMAIL_HTTP_$status")
            val bytes = connection.inputStream.use { it.readBytes() }
            return JSONObject(bytes.toString(Charsets.UTF_8))
        } finally {
            connection?.disconnect()
        }
    }

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.toString())

    class ScanException(val safeCode: String) : RuntimeException(safeCode)
}
