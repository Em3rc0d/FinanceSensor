package com.financesensor.lab.financesensor_mobile_shell

import android.accounts.Account
import android.accounts.AccountManager
import android.app.Activity
import android.content.Intent
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.RevokeAccessRequest
import com.google.android.gms.common.AccountPicker
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/** Alpha.2 Android trusted edge. Financial semantics remain in Dart. */
class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "com.financesensor.platform/alpha2"
        private const val REQUEST_PICK = 6302
        private const val REQUEST_AUTHORIZE = 6303
        private const val GOOGLE_ACCOUNT_TYPE = "com.google"
        private const val GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly"
        private const val GMAIL_PROFILE = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
        private const val PREFS = "financesensor_alpha2_edge_state"
        private const val DISCONNECT_BARRIER = "gmail_disconnect_barrier"
    }

    private val io = Executors.newSingleThreadExecutor()
    private val statementScanner = Alpha2StatementDiscoveryScanner()
    private var pending: MethodChannel.Result? = null
    private var pendingExplicitReconnect = false
    private var accessToken: String? = null
    private var account: Account? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        Alpha2VaultBridge(this).register(flutterEngine.dartExecutor.binaryMessenger)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler(::onCall)
    }

    private fun onCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "getState" -> getState(result)
            "connect" -> connect(result)
            "disconnect" -> disconnect(result)
            "scanFinancialSources" -> scanFinancialSources(result)
            "fetchStatementBytes" -> fetchStatementBytes(call, result)
            "releaseStatementHandle" -> {
                call.argument<String>("handle")?.let(statementScanner::release)
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun authRequest(selected: Account? = null): AuthorizationRequest {
        val builder = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(GMAIL_READONLY)))
        if (selected != null) builder.setAccount(selected)
        return builder.build()
    }

    private fun client() = Identity.getAuthorizationClient(this)
    private fun prefs() = getSharedPreferences(PREFS, MODE_PRIVATE)
    private fun barrier(): Boolean = prefs().getBoolean(DISCONNECT_BARRIER, false)
    private fun setBarrier(value: Boolean) = prefs().edit().putBoolean(DISCONNECT_BARRIER, value).apply()

    private fun getState(result: MethodChannel.Result) {
        if (barrier()) {
            clearMemory()
            result.success(state("DISCONNECTED"))
            return
        }
        client().authorize(authRequest(account))
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    clearMemory()
                    result.success(state("READY_TO_CONNECT"))
                } else {
                    verifyAuthorization(authorization, result, explicitReconnect = false)
                }
            }
            .addOnFailureListener { failAuth(result, it) }
    }

    private fun connect(result: MethodChannel.Result) {
        if (pending != null) {
            result.error("AUTH_BUSY", "Authorization already active", null)
            return
        }
        pending = result
        pendingExplicitReconnect = barrier()
        val options = AccountPicker.AccountChooserOptions.Builder()
            .setAllowableAccountsTypes(listOf(GOOGLE_ACCOUNT_TYPE))
            .setAlwaysShowAccountPicker(true)
            .build()
        try {
            startActivityForResult(AccountPicker.newChooseAccountIntent(options), REQUEST_PICK)
        } catch (_: Exception) {
            finishPending()
            result.error("ACCOUNT_PICKER_FAILED", "Google account selection unavailable", null)
        }
    }

    @Deprecated("Android Activity callback required by FlutterActivity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQUEST_PICK -> onAccountPicked(resultCode, data)
            REQUEST_AUTHORIZE -> onAuthorizationResolved(resultCode, data)
        }
    }

    private fun onAccountPicked(resultCode: Int, data: Intent?) {
        val result = pending ?: return
        if (resultCode != Activity.RESULT_OK || data == null) {
            finishPending()
            result.error("AUTH_CANCELLED", "Authorization cancelled", null)
            return
        }
        val name = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
        val type = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE)
        if (name.isNullOrBlank() || type != GOOGLE_ACCOUNT_TYPE) {
            finishPending()
            result.error("ACCOUNT_HANDLE_UNAVAILABLE", "Google account handle unavailable", null)
            return
        }
        val selected = Account(name, type)
        account = selected
        client().authorize(authRequest(selected))
            .addOnSuccessListener { authorization ->
                if (authorization.hasResolution()) {
                    val intent = authorization.pendingIntent
                    if (intent == null) {
                        finishPending()
                        result.error("AUTH_RESOLUTION_MISSING", "Google authorization unavailable", null)
                        return@addOnSuccessListener
                    }
                    try {
                        startIntentSenderForResult(intent.intentSender, REQUEST_AUTHORIZE, null, 0, 0, 0)
                    } catch (_: Exception) {
                        finishPending()
                        result.error("AUTH_RESOLUTION_FAILED", "Google authorization UI unavailable", null)
                    }
                } else {
                    val reconnect = pendingExplicitReconnect
                    finishPending()
                    verifyAuthorization(authorization, result, reconnect)
                }
            }
            .addOnFailureListener {
                finishPending()
                failAuth(result, it)
            }
    }

    private fun onAuthorizationResolved(resultCode: Int, data: Intent?) {
        val result = pending ?: return
        val reconnect = pendingExplicitReconnect
        finishPending()
        if (resultCode != Activity.RESULT_OK || data == null) {
            result.error("AUTH_CANCELLED", "Authorization cancelled", null)
            return
        }
        try {
            verifyAuthorization(client().getAuthorizationResultFromIntent(data), result, reconnect)
        } catch (error: ApiException) {
            failAuth(result, error)
        }
    }

    private fun verifyAuthorization(
        authorization: AuthorizationResult,
        result: MethodChannel.Result,
        explicitReconnect: Boolean,
    ) {
        val scopes = authorization.grantedScopes ?: emptyList()
        if (!scopes.contains(GMAIL_READONLY)) {
            clearMemory()
            result.error("SCOPE_MISMATCH", "Required Gmail scope not granted", null)
            return
        }
        val token = authorization.accessToken
        if (token.isNullOrBlank()) {
            clearMemory()
            result.error("SHORT_TOKEN_MISSING", "Short-lived token unavailable", null)
            return
        }
        accessToken = token
        io.execute {
            val probe = httpGet(GMAIL_PROFILE, token)
            if (probe.first == 401) {
                clearCachedToken(token)
                runOnUiThread { result.success(state("REAUTH_REQUIRED")) }
                return@execute
            }
            if (probe.first !in 200..299) {
                runOnUiThread { result.error("GMAIL_PROFILE_HTTP_${probe.first}", "Gmail profile unavailable", null) }
                return@execute
            }
            val profile = runCatching { JSONObject(probe.second) }.getOrNull()
            if (profile == null) {
                runOnUiThread { result.error("GMAIL_PROFILE_INVALID", "Gmail profile response invalid", null) }
                return@execute
            }
            if (explicitReconnect) setBarrier(false)
            runOnUiThread {
                result.success(
                    state("CONNECTED") + mapOf(
                        "profileReachable" to true,
                        "historyAnchorObserved" to profile.optString("historyId").isNotBlank(),
                        "sessionOnlyBearer" to true,
                    ),
                )
            }
        }
    }

    private fun scanFinancialSources(result: MethodChannel.Result) {
        if (barrier()) {
            result.success(
                mapOf(
                    "status" to "DISCONNECTED",
                    "gmailEvidence" to emptyList<Map<String, Any?>>(),
                    "statementCandidates" to emptyList<Map<String, Any?>>(),
                    "coverage" to "NONE",
                ),
            )
            return
        }
        val token = accessToken
        if (token.isNullOrBlank()) {
            result.error("REAUTH_REQUIRED", "Connect Gmail before scanning", null)
            return
        }
        io.execute {
            try {
                val transaction = Alpha2TransactionScanner.scan(token)
                val statements = statementScanner.scan(token)
                val response = mapOf(
                    "status" to "SCAN_COMPLETE",
                    "gmailEvidence" to (transaction["events"] ?: emptyList<Map<String, Any?>>()),
                    "statementCandidates" to (statements["statementCandidates"] ?: emptyList<Map<String, Any?>>()),
                    "coverage" to "GMAIL_RECENT_PLUS_TARGETED_STATEMENT_DISCOVERY",
                    "transactionMessagesInspected" to transaction["messagesInspected"],
                    "statementMessagesInspected" to statements["messagesInspected"],
                    "statementStrongCandidates" to statements["strongCandidates"],
                    "statementConflicts" to statements["conflicts"],
                    "rawGmailReturned" to false,
                    "numericConfidenceReturned" to false,
                    "attachmentBytesFetchedDuringDiscovery" to false,
                )
                runOnUiThread { result.success(response) }
            } catch (error: Alpha2TransactionScanner.ScanException) {
                if (error.safeCode == "REAUTH_REQUIRED") clearCachedToken(token)
                runOnUiThread { result.error(error.safeCode, "Financial scan stopped safely", null) }
            } catch (error: Alpha2StatementDiscoveryScanner.StatementException) {
                if (error.safeCode == "REAUTH_REQUIRED") clearCachedToken(token)
                runOnUiThread { result.error(error.safeCode, "Statement discovery stopped safely", null) }
            } catch (_: Exception) {
                runOnUiThread { result.error("ALPHA2_SCAN_FAILED", "Financial scan stopped safely", null) }
            }
        }
    }

    private fun fetchStatementBytes(call: MethodCall, result: MethodChannel.Result) {
        val handle = call.argument<String>("handle")?.trim().orEmpty()
        if (handle.isBlank()) {
            result.error("ALPHA2_STATEMENT_HANDLE_REQUIRED", "Statement handle is required", null)
            return
        }
        val token = accessToken
        if (token.isNullOrBlank() || barrier()) {
            result.error("REAUTH_REQUIRED", "Connect Gmail before fetching statement", null)
            return
        }
        io.execute {
            try {
                val bytes = statementScanner.fetch(handle, token)
                runOnUiThread { result.success(bytes) }
            } catch (error: Alpha2StatementDiscoveryScanner.StatementException) {
                if (error.safeCode == "REAUTH_REQUIRED") clearCachedToken(token)
                runOnUiThread { result.error(error.safeCode, "Statement fetch stopped safely", null) }
            } catch (_: Exception) {
                runOnUiThread { result.error("ALPHA2_STATEMENT_FETCH_FAILED", "Statement fetch stopped safely", null) }
            }
        }
    }

    private fun disconnect(result: MethodChannel.Result) {
        setBarrier(true)
        val selected = account
        val oldToken = accessToken
        clearMemory()
        if (selected == null) {
            result.success(state("DISCONNECTED"))
            return
        }
        val request = RevokeAccessRequest.builder()
            .setAccount(selected)
            .setScopes(listOf(Scope(GMAIL_READONLY)))
            .build()
        client().revokeAccess(request)
            .addOnSuccessListener {
                if (oldToken.isNullOrBlank()) {
                    result.success(state("DISCONNECTED"))
                } else {
                    io.execute {
                        val probe = httpGet(GMAIL_PROFILE, oldToken)
                        if (probe.first == 401) clearCachedToken(oldToken)
                        runOnUiThread {
                            result.success(
                                state("DISCONNECTED") + mapOf(
                                    "oldBearerDenied" to (probe.first == 401),
                                    "providerRevokeHttpStatus" to probe.first,
                                ),
                            )
                        }
                    }
                }
            }
            .addOnFailureListener {
                result.success(state("DISCONNECTED") + mapOf("providerRevokeVerified" to false))
            }
    }

    private fun state(value: String): Map<String, Any?> = mapOf(
        "state" to value,
        "scope" to "gmail.readonly",
        "accessTokenExposedToFlutter" to false,
        "refreshTokenHeldByApp" to false,
        "offlineAccessRequested" to false,
        "disconnectBarrierActive" to barrier(),
        "financialAuthority" to "DART",
    )

    private fun httpGet(url: String, token: String): Pair<Int, String> {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 12_000
                readTimeout = 12_000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Accept", "application/json")
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val bytes = stream?.use { it.readBytes() } ?: ByteArray(0)
            status to bytes.toString(Charsets.UTF_8)
        } catch (_: Exception) {
            599 to ""
        } finally {
            connection?.disconnect()
        }
    }

    private fun clearCachedToken(token: String) {
        accessToken = null
        statementScanner.clear()
        client().clearToken(ClearTokenRequest.builder().setToken(token).build())
    }

    private fun clearMemory() {
        accessToken = null
        account = null
        statementScanner.clear()
    }

    private fun finishPending() {
        pending = null
        pendingExplicitReconnect = false
    }

    private fun failAuth(result: MethodChannel.Result, throwable: Throwable) {
        clearMemory()
        if (throwable is ApiException && throwable.statusCode == 10) {
            result.error("AUTH_FAILED_10", "Android OAuth signature not registered", null)
            return
        }
        result.error("AUTH_FAILED", "Google authorization failed", null)
    }

    override fun onDestroy() {
        statementScanner.clear()
        io.shutdownNow()
        super.onDestroy()
    }
}
