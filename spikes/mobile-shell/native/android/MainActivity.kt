package com.financesensor.lab.financesensor_mobile_shell

import android.accounts.Account
import android.app.Activity
import android.content.Intent
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.RevokeAccessRequest
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "com.financesensor.platform/gmail"
        private const val REQUEST_AUTHORIZE_GMAIL = 6103
        private const val GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly"
        private const val GMAIL_PROFILE = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
        private const val CONNECTION_PREFS = "financesensor_connection_state"
        private const val DISCONNECT_BARRIER_KEY = "gmail_disconnect_barrier"
    }

    private val ioExecutor = Executors.newSingleThreadExecutor()
    private var pendingAuthorizationResult: MethodChannel.Result? = null
    private var pendingAuthorizationWasExplicitReconnect = false
    private var shortLivedAccessToken: String? = null
    private var authorizedAccount: Account? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getGmailState" -> getGmailState(result)
                    "authorizeGmail" -> authorizeGmail(result)
                    "probeGmail" -> probeGmail(result)
                    "disconnectGmail" -> disconnectGmail(result)
                    else -> result.notImplemented()
                }
            }
    }

    private fun request(): AuthorizationRequest = AuthorizationRequest.builder()
        .setRequestedScopes(listOf(Scope(GMAIL_READONLY)))
        .build()

    private fun client() = Identity.getAuthorizationClient(this)

    private fun connectionPrefs() = getSharedPreferences(CONNECTION_PREFS, MODE_PRIVATE)

    private fun isDisconnectBarrierActive(): Boolean =
        connectionPrefs().getBoolean(DISCONNECT_BARRIER_KEY, false)

    private fun setDisconnectBarrierActive(active: Boolean) {
        connectionPrefs().edit().putBoolean(DISCONNECT_BARRIER_KEY, active).apply()
    }

    private fun getGmailState(result: MethodChannel.Result) {
        if (isDisconnectBarrierActive()) {
            clearMemory()
            result.success(state("DISCONNECTED"))
            return
        }

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearMemory()
                    result.success(state("READY_TO_CONNECT"))
                } else {
                    probeAuthorizedProfile(
                        authorization,
                        result,
                        explicitReconnect = false,
                        consentResolutionObserved = false,
                    )
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    private fun authorizeGmail(result: MethodChannel.Result) {
        if (pendingAuthorizationResult != null) {
            result.error("AUTH_BUSY", "An authorization flow is already active", null)
            return
        }

        val reconnectAfterDisconnect = isDisconnectBarrierActive()

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    val pendingIntent = authorization.pendingIntent
                    if (pendingIntent == null) {
                        result.error("AUTH_RESOLUTION_MISSING", "Google authorization resolution is unavailable", null)
                        return@addOnSuccessListener
                    }
                    pendingAuthorizationResult = result
                    pendingAuthorizationWasExplicitReconnect = reconnectAfterDisconnect
                    try {
                        startIntentSenderForResult(
                            pendingIntent.intentSender,
                            REQUEST_AUTHORIZE_GMAIL,
                            null,
                            0,
                            0,
                            0,
                        )
                    } catch (_: Exception) {
                        pendingAuthorizationResult = null
                        pendingAuthorizationWasExplicitReconnect = false
                        result.error("AUTH_RESOLUTION_FAILED", "Google authorization UI could not start", null)
                    }
                } else {
                    probeAuthorizedProfile(
                        authorization,
                        result,
                        explicitReconnect = reconnectAfterDisconnect,
                        consentResolutionObserved = false,
                    )
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error, preserveDisconnectBarrier = reconnectAfterDisconnect) }
    }

    @Deprecated("Android Activity callback required by FlutterActivity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_AUTHORIZE_GMAIL) return

        val result = pendingAuthorizationResult ?: return
        val explicitReconnect = pendingAuthorizationWasExplicitReconnect
        pendingAuthorizationResult = null
        pendingAuthorizationWasExplicitReconnect = false

        if (resultCode != Activity.RESULT_OK || data == null) {
            result.error("AUTH_CANCELLED", "Google authorization was not completed", null)
            return
        }

        try {
            val authorization = client().getAuthorizationResultFromIntent(data)
            probeAuthorizedProfile(
                authorization,
                result,
                explicitReconnect = explicitReconnect,
                consentResolutionObserved = true,
            )
        } catch (error: ApiException) {
            failAuthorization(result, error, preserveDisconnectBarrier = explicitReconnect)
        }
    }

    private fun probeGmail(result: MethodChannel.Result) {
        if (isDisconnectBarrierActive()) {
            clearMemory()
            result.success(state("DISCONNECTED"))
            return
        }

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearMemory()
                    result.success(state("REAUTH_REQUIRED"))
                } else {
                    probeAuthorizedProfile(
                        authorization,
                        result,
                        explicitReconnect = false,
                        consentResolutionObserved = false,
                    )
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    private fun probeAuthorizedProfile(
        authorization: AuthorizationResult,
        result: MethodChannel.Result,
        explicitReconnect: Boolean,
        consentResolutionObserved: Boolean,
    ) {
        val granted = authorization.grantedScopes ?: emptyList()
        if (!granted.contains(GMAIL_READONLY)) {
            clearMemory()
            result.error("SCOPE_MISMATCH", "Required Gmail scope was not granted", null)
            return
        }

        val token = authorization.accessToken
        if (token.isNullOrBlank()) {
            clearMemory()
            result.error("SHORT_TOKEN_MISSING", "Google returned no short-lived access token", null)
            return
        }

        remember(authorization)

        ioExecutor.execute {
            var connection: HttpURLConnection? = null
            try {
                val started = System.nanoTime()
                connection = (URL(GMAIL_PROFILE).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Accept", "application/json")
                }

                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val bodyBytes = stream?.use { it.readBytes() } ?: ByteArray(0)
                val latencyMs = ((System.nanoTime() - started) / 1_000_000L).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()

                if (status == 401) {
                    shortLivedAccessToken = null
                    client().clearToken(ClearTokenRequest.builder().setToken(token).build())
                    runOnUiThread {
                        result.success(
                            state("REAUTH_REQUIRED") + mapOf(
                                "profileReachable" to false,
                                "latencyMs" to latencyMs,
                                "responseBytes" to bodyBytes.size,
                            ),
                        )
                    }
                    return@execute
                }

                if (status !in 200..299) {
                    runOnUiThread {
                        result.error("GMAIL_PROFILE_HTTP_$status", "Gmail profile probe failed", null)
                    }
                    return@execute
                }

                val profile = JSONObject(bodyBytes.toString(Charsets.UTF_8))
                val historyObserved = profile.optString("historyId").isNotBlank()
                val messageCount = profile.optInt("messagesTotal", -1)
                val threadCount = profile.optInt("threadsTotal", -1)

                if (explicitReconnect) {
                    setDisconnectBarrierActive(false)
                }

                runOnUiThread {
                    result.success(
                        state("CONNECTED") + mapOf(
                            "profileReachable" to true,
                            "historyAnchorObserved" to historyObserved,
                            "messageCount" to if (messageCount >= 0) messageCount else null,
                            "threadCount" to if (threadCount >= 0) threadCount else null,
                            "latencyMs" to latencyMs,
                            "responseBytes" to bodyBytes.size,
                            "disconnectBarrierActive" to isDisconnectBarrierActive(),
                            "explicitReconnect" to explicitReconnect,
                            "consentResolutionObserved" to consentResolutionObserved,
                            "providerGrantReused" to (explicitReconnect && !consentResolutionObserved),
                        ),
                    )
                }
            } catch (_: Exception) {
                runOnUiThread {
                    result.error("GMAIL_PROFILE_FAILED", "Gmail profile probe failed safely", null)
                }
            } finally {
                connection?.disconnect()
            }
        }
    }

    private fun disconnectGmail(result: MethodChannel.Result) {
        setDisconnectBarrierActive(true)
        val knownAccount = authorizedAccount
        val knownToken = shortLivedAccessToken

        if (knownAccount != null) {
            revoke(knownAccount, knownToken, result)
            return
        }

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearReturnedToken(authorization)
                    clearMemory()
                    result.success(
                        state("DISCONNECTED_VERIFIED") + mapOf(
                            "providerRevokeVerified" to true,
                            "disconnectBarrierActive" to true,
                            "providerRevokeReason" to "NO_ACTIVE_GRANT",
                        ),
                    )
                    return@addOnSuccessListener
                }

                remember(authorization)
                val account = authorizedAccount
                val token = shortLivedAccessToken
                if (account == null) {
                    clearReturnedToken(authorization)
                    clearMemory()
                    result.success(
                        state("DISCONNECTED") + mapOf(
                            "providerRevokeVerified" to false,
                            "disconnectBarrierActive" to true,
                            "providerRevokeReason" to "ACCOUNT_HANDLE_UNAVAILABLE",
                        ),
                    )
                } else {
                    revoke(account, token, result)
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error, preserveDisconnectBarrier = true) }
    }

    private fun revoke(account: Account, token: String?, result: MethodChannel.Result) {
        val revokeRequest = RevokeAccessRequest.builder()
            .setAccount(account)
            .setScopes(listOf(Scope(GMAIL_READONLY)))
            .build()

        client().revokeAccess(revokeRequest)
            .addOnSuccessListener {
                verifyPreviousBearerDenied(token, result)
            }
            .addOnFailureListener { error -> failAuthorization(result, error, preserveDisconnectBarrier = true) }
    }

    private fun verifyPreviousBearerDenied(token: String?, result: MethodChannel.Result) {
        if (token.isNullOrBlank()) {
            clearMemory()
            result.success(
                state("DISCONNECTED") + mapOf(
                    "providerRevokeVerified" to false,
                    "disconnectBarrierActive" to true,
                    "providerRevokeReason" to "NO_PREVIOUS_TOKEN_TO_PROBE",
                ),
            )
            return
        }

        ioExecutor.execute {
            var connection: HttpURLConnection? = null
            try {
                val started = System.nanoTime()
                connection = (URL(GMAIL_PROFILE).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Accept", "application/json")
                }

                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val bodyBytes = stream?.use { it.readBytes() } ?: ByteArray(0)
                val latencyMs = ((System.nanoTime() - started) / 1_000_000L).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
                val denied = status == 401 || status == 403

                clearCachedToken(token) {
                    clearMemory()
                    runOnUiThread {
                        result.success(
                            state(if (denied) "DISCONNECTED_VERIFIED" else "DISCONNECTED") + mapOf(
                                "providerRevokeVerified" to denied,
                                "oldTokenDeniedAfterRevoke" to denied,
                                "providerRevokeHttpStatus" to status,
                                "providerRevokeLatencyMs" to latencyMs,
                                "providerRevokeResponseBytes" to bodyBytes.size,
                                "disconnectBarrierActive" to true,
                                "providerRevokeReason" to if (denied) "PREVIOUS_BEARER_DENIED" else "PREVIOUS_BEARER_NOT_DENIED",
                            ),
                        )
                    }
                }
            } catch (_: Exception) {
                clearCachedToken(token) {
                    clearMemory()
                    runOnUiThread {
                        result.success(
                            state("DISCONNECTED") + mapOf(
                                "providerRevokeVerified" to false,
                                "disconnectBarrierActive" to true,
                                "providerRevokeReason" to "POST_REVOKE_PROBE_FAILED",
                            ),
                        )
                    }
                }
            } finally {
                connection?.disconnect()
            }
        }
    }

    private fun clearCachedToken(token: String?, done: () -> Unit) {
        if (token.isNullOrBlank()) {
            done()
            return
        }

        client().clearToken(ClearTokenRequest.builder().setToken(token).build())
            .addOnCompleteListener { done() }
    }

    private fun clearReturnedToken(authorization: AuthorizationResult) {
        val token = authorization.accessToken
        if (!token.isNullOrBlank()) {
            client().clearToken(ClearTokenRequest.builder().setToken(token).build())
        }
    }

    @Suppress("DEPRECATION")
    private fun remember(authorization: AuthorizationResult) {
        shortLivedAccessToken = authorization.accessToken
        authorizedAccount = authorization.toGoogleSignInAccount()?.account
    }

    private fun clearMemory() {
        shortLivedAccessToken = null
        authorizedAccount = null
    }

    private fun state(name: String): Map<String, Any?> = mapOf(
        "state" to name,
        "provider" to "GOOGLE_AUTHORIZATION_CLIENT",
        "scope" to GMAIL_READONLY,
        "accessTokenExposedToFlutter" to false,
        "refreshTokenHeldByApp" to false,
        "offlineAccessRequested" to false,
        "profileReachable" to false,
        "historyAnchorObserved" to false,
        "disconnectBarrierActive" to isDisconnectBarrierActive(),
        "providerRevokeVerified" to false,
        "oldTokenDeniedAfterRevoke" to false,
        "explicitReconnect" to false,
        "consentResolutionObserved" to false,
        "providerGrantReused" to false,
    )

    private fun failAuthorization(
        result: MethodChannel.Result,
        error: Exception,
        preserveDisconnectBarrier: Boolean = false,
    ) {
        clearMemory()
        if (!preserveDisconnectBarrier) {
            setDisconnectBarrierActive(false)
        }
        val code = if (error is ApiException) "AUTH_FAILED_${error.statusCode}" else "AUTH_FAILED"
        result.error(code, "Google authorization failed safely", null)
    }

    override fun onDestroy() {
        clearMemory()
        ioExecutor.shutdownNow()
        super.onDestroy()
    }
}