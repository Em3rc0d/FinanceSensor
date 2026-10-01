package com.financesensor.lab.financesensor_mobile_shell

import org.json.JSONObject
import java.security.MessageDigest
import java.text.Normalizer
import java.util.Locale
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Small provider-neutral text models used on the Android edge.
 *
 * Provider identity, sender domain and bank name are intentionally absent from
 * the feature vectors. These models only interpret text shape/content. Numeric
 * values are still re-read and validated from their source spans before an
 * event can cross into durable financial evidence.
 */
internal class Alpha2EdgeMailModel private constructor(
    private val hashDim: Int,
    private val featureDim: Int,
    private val labels: List<String>,
    private val coefficients: List<DoubleArray>,
    private val intercepts: DoubleArray,
) {
    data class Prediction(val label: String, val confidence: Double)

    fun predict(text: String): Prediction {
        val x = mailFeatures(text, hashDim, featureDim)
        val scores = DoubleArray(labels.size)
        for (c in labels.indices) {
            var value = intercepts[c]
            val weights = coefficients[c]
            for (i in x.indices) value += weights[i] * x[i]
            scores[c] = value
        }
        val maxScore = scores.maxOrNull() ?: 0.0
        val expScores = scores.map { exp(it - maxScore) }
        val denominator = expScores.sum().coerceAtLeast(1e-12)
        var best = 0
        var bestP = -1.0
        for (i in expScores.indices) {
            val p = expScores[i] / denominator
            if (p > bestP) {
                bestP = p
                best = i
            }
        }
        return Prediction(labels[best], bestP)
    }

    companion object {
        fun fromJson(raw: String): Alpha2EdgeMailModel {
            val root = JSONObject(raw)
            require(root.getString("schema") == "POCKETFINANCES_EDGE_MAIL_MODEL_V1")
            val hashDim = root.getInt("hash_dim")
            val featureDim = root.getInt("feature_dim")
            require(featureDim == hashDim + 8)
            val labelArray = root.getJSONArray("labels")
            val labels = List(labelArray.length()) { labelArray.getString(it) }
            val coefficientArray = root.getJSONArray("coef")
            require(coefficientArray.length() == labels.size)
            val coefficients = List(coefficientArray.length()) { row ->
                val values = coefficientArray.getJSONArray(row)
                require(values.length() == featureDim)
                DoubleArray(values.length()) { values.getDouble(it) }
            }
            val interceptArray = root.getJSONArray("intercept")
            require(interceptArray.length() == labels.size)
            val intercepts = DoubleArray(interceptArray.length()) {
                interceptArray.getDouble(it)
            }
            return Alpha2EdgeMailModel(
                hashDim,
                featureDim,
                labels,
                coefficients,
                intercepts,
            )
        }
    }
}

internal class Alpha2EdgeStatementMailModel private constructor(
    private val hashDim: Int,
    private val featureDim: Int,
    private val coefficients: DoubleArray,
    private val intercept: Double,
) {
    fun probability(text: String): Double {
        val x = statementFeatures(text, hashDim, featureDim)
        var score = intercept
        for (i in x.indices) score += coefficients[i] * x[i]
        return 1.0 / (1.0 + exp(-score.coerceIn(-40.0, 40.0)))
    }

    companion object {
        fun fromJson(raw: String): Alpha2EdgeStatementMailModel {
            val root = JSONObject(raw)
            require(
                root.getString("schema") ==
                    "POCKETFINANCES_EDGE_STATEMENT_MAIL_MODEL_V1",
            )
            val hashDim = root.getInt("hash_dim")
            val featureDim = root.getInt("feature_dim")
            require(featureDim == hashDim + 6)
            val values = root.getJSONArray("coef")
            require(values.length() == featureDim)
            return Alpha2EdgeStatementMailModel(
                hashDim = hashDim,
                featureDim = featureDim,
                coefficients = DoubleArray(values.length()) {
                    values.getDouble(it)
                },
                intercept = root.getDouble("intercept"),
            )
        }
    }
}

private fun mailFeatures(
    value: String,
    hashDim: Int,
    featureDim: Int,
): DoubleArray {
    val text = edgeNormalize(value)
    val vector = hashedNgrams(text, hashDim, featureDim)
    val chars = text.length.coerceAtLeast(1)
    val digits = text.count { it.isDigit() }
    val offset = hashDim
    vector[offset] = min(text.length, 512).toDouble() / 512.0
    vector[offset + 1] = digits.toDouble() / chars.toDouble()
    vector[offset + 2] =
        if (listOf("S/", "PEN", "USD", "US$", "$").any(text::contains)) 1.0 else 0.0
    vector[offset + 3] =
        if (Regex("\\b\\d+[.,]\\d{2}\\b").containsMatchIn(text)) 1.0 else 0.0
    vector[offset + 4] = if ("TRANSFER" in text) 1.0 else 0.0
    vector[offset + 5] = if ("PAGO" in text) 1.0 else 0.0
    vector[offset + 6] =
        if ("COMPRA" in text || "CONSUMO" in text) 1.0 else 0.0
    vector[offset + 7] = if ("RETIRO" in text) 1.0 else 0.0
    return vector
}

private fun statementFeatures(
    value: String,
    hashDim: Int,
    featureDim: Int,
): DoubleArray {
    val text = edgeNormalize(value)
    val vector = hashedNgrams(text, hashDim, featureDim)
    val chars = text.length.coerceAtLeast(1)
    val digits = text.count { it.isDigit() }
    val offset = hashDim
    vector[offset] = min(text.length, 180).toDouble() / 180.0
    vector[offset + 1] = digits.toDouble() / chars.toDouble()
    vector[offset + 2] = if ("PDF" in text) 1.0 else 0.0
    vector[offset + 3] = if ("CUENTA" in text) 1.0 else 0.0
    vector[offset + 4] = if ("TARJETA" in text) 1.0 else 0.0
    vector[offset + 5] = if ("ESTADO" in text) 1.0 else 0.0
    return vector
}

private fun hashedNgrams(
    text: String,
    hashDim: Int,
    featureDim: Int,
): DoubleArray {
    val vector = DoubleArray(featureDim)
    val padded = "^$text$"
    for (size in intArrayOf(2, 3, 4, 5)) {
        if (padded.length < size) continue
        for (index in 0..padded.length - size) {
            vector[edgeHashIndex(padded.substring(index, index + size), hashDim)] += 1.0
        }
    }
    var sumSquares = 0.0
    for (index in 0 until hashDim) {
        sumSquares += vector[index] * vector[index]
    }
    val norm = sqrt(sumSquares)
    if (norm > 0.0) {
        for (index in 0 until hashDim) vector[index] /= norm
    }
    return vector
}

private fun edgeHashIndex(value: String, dimension: Int): Int {
    val digest = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
    val number =
        ((digest[0].toLong() and 0xffL) shl 24) or
            ((digest[1].toLong() and 0xffL) shl 16) or
            ((digest[2].toLong() and 0xffL) shl 8) or
            (digest[3].toLong() and 0xffL)
    return (number % dimension.toLong()).toInt()
}

internal fun edgeNormalize(value: String): String =
    Normalizer.normalize(value, Normalizer.Form.NFKD)
        .replace(Regex("\\p{M}+"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
        .uppercase(Locale.ROOT)
