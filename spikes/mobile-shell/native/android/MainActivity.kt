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
    }

    private val ioExecutor = Executors.newSingleThreadExecutor()
    private var pendingAuthorizationResult: MethodChannel.Result? = null
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

    private fun getGmailState(result: MethodChannel.Result) {
        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    result.success(state("READY_TO_CONNECT"))
                } else {
                    remember(authorization)
                    result.success(state("AUTHORIZED"))
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    private fun authorizeGmail(result: MethodChannel.Result) {
        if (pendingAuthorizationResult != null) {
            result.error("AUTH_BUSY", "An authorization flow is already active", null)
            return
        }

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    val pendingIntent = authorization.pendingIntent
                    if (pendingIntent == null) {
                        result.error("AUTH_RESOLUTION_MISSING", "Google authorization resolution is unavailable", null)
                        return@addOnSuccessListener
                    }
                    pendingAuthorizationResult = result
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
                        result.error("AUTH_RESOLUTION_FAILED", "Google authorization UI could not start", null)
                    }
                } else {
                    probeAuthorizedProfile(authorization, result)
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    @Deprecated("Android Activity callback required by FlutterActivity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_AUTHORIZE_GMAIL) return

        val result = pendingAuthorizationResult ?: return
        pendingAuthorizationResult = null

        if (resultCode != Activity.RESULT_OK || data == null) {
            result.error("AUTH_CANCELLED", "Google authorization was not completed", null)
            return
        }

        try {
            val authorization = client().getAuthorizationResultFromIntent(data)
            probeAuthorizedProfile(authorization, result)
        } catch (error: ApiException) {
            failAuthorization(result, error)
        }
    }

    private fun probeGmail(result: MethodChannel.Result) {
        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearMemory()
                    result.success(state("REAUTH_REQUIRED"))
                } else {
                    probeAuthorizedProfile(authorization, result)
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    private fun probeAuthorizedProfile(
        authorization: AuthorizationResult,
        result: MethodChannel.Result,
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

                runOnUiThread {
                    result.success(
                        state("CONNECTED") + mapOf(
                            "profileReachable" to true,
                            "historyAnchorObserved" to historyObserved,
                            "messageCount" to if (messageCount >= 0) messageCount else null,
                            "threadCount" to if (threadCount >= 0) threadCount else null,
                            "latencyMs" to latencyMs,
                            "responseBytes" to bodyBytes.size,
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
        val knownAccount = authorizedAccount
        if (knownAccount != null) {
            revoke(knownAccount, result)
            return
        }

        client().authorize(request())
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearMemory()
                    result.success(state("DISCONNECTED"))
                    return@addOnSuccessListener
                }

                remember(authorization)
                val account = authorizedAccount
                if (account == null) {
                    result.error("ACCOUNT_HANDLE_UNAVAILABLE", "Google account handle unavailable for revoke", null)
                } else {
                    revoke(account, result)
                }
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
    }

    private fun revoke(account: Account, result: MethodChannel.Result) {
        val revokeRequest = RevokeAccessRequest.builder()
            .setAccount(account)
            .setScopes(listOf(Scope(GMAIL_READONLY)))
            .build()

        client().revokeAccess(revokeRequest)
            .addOnSuccessListener {
                clearMemory()
                result.success(state("DISCONNECTED"))
            }
            .addOnFailureListener { error -> failAuthorization(result, error) }
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
    )

    private fun failAuthorization(result: MethodChannel.Result, error: Exception) {
        clearMemory()
        val code = if (error is ApiException) "AUTH_FAILED_${error.statusCode}" else "AUTH_FAILED"
        result.error(code, "Google authorization failed safely", null)
    }

    override fun onDestroy() {
        clearMemory()
        ioExecutor.shutdownNow()
        super.onDestroy()
    }
}
