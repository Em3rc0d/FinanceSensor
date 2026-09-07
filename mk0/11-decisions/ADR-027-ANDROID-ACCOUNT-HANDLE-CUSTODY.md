# ADR-027 — Android Google Account handle custody for provider revoke

**Status:** ACCEPTED FOR R2 PHYSICAL RETEST  
**Date:** 2026-09-03  
**Refines:** ADR-026

## Context

FinanceSensor R2 physically proved the Android Gmail connection path, exact `gmail.readonly` scope, Gmail profile reachability, native-only short-lived bearer custody, absence of app-held refresh authority, and a durable local disconnect barrier.

The remaining provider-level revoke gate failed closed with:

```text
ACCOUNT_HANDLE_UNAVAILABLE
```

The failing bridge obtained the short-lived bearer from `AuthorizationResult`, then attempted to recover the Android account through:

```text
AuthorizationResult.toGoogleSignInAccount()?.account
```

On the owned Android device the bearer was valid and Gmail Profile returned HTTP 2xx, while that account conversion returned no usable `Account`. Consequently FinanceSensor could not construct the required `RevokeAccessRequest` and correctly refused to claim provider revoke success.

Google Play services now marks `AuthorizationResult.toGoogleSignInAccount()` and `GoogleSignInAccount` as deprecated. The authorization API already provides the correct ownership model: `AuthorizationRequest.Builder.setAccount(Account)` specifies the account used for authorization, and `RevokeAccessRequest.Builder.setAccount(Account)` specifies the account whose authorization is revoked.

## Decision

```text
ANDROID_AUTHORIZATION_PROVIDER     = GOOGLE_AUTHORIZATION_CLIENT
ACCOUNT_HANDLE_SOURCE              = ANDROID_ACCOUNT_PICKER
ACCOUNT_IDENTIFIER_PERSISTENCE     = FORBIDDEN
ACCOUNT_IDENTIFIER_TO_FLUTTER      = FORBIDDEN
DEPRECATED_SIGNIN_ACCOUNT_BRIDGE   = FORBIDDEN
AUTHORIZATION_REQUEST_ACCOUNT      = REQUIRED_AFTER_EXPLICIT_CONNECT
REVOKE_REQUEST_ACCOUNT             = SAME_IN_MEMORY_ACCOUNT_HANDLE
ANDROID_OFFLINE_ACCESS             = REJECTED
ANDROID_APP_REFRESH_TOKEN_CUSTODY  = NONE
SHORT_LIVED_BEARER_TO_FLUTTER      = FORBIDDEN
DURABLE_DISCONNECT_BARRIER         = REQUIRED
POST_REVOKE_OLD_BEARER_DENIAL      = HTTP_401_REQUIRED
```

FinanceSensor owns the minimum account **handle lifecycle**, not Google identity data.

## Explicit Connect flow

```text
User taps Connect Gmail
        ↓
Android AccountPicker
  allowable type = com.google
        ↓
android.accounts.Account
  process memory only
        ↓
AuthorizationRequest.setAccount(account)
        ↓
AuthorizationClient.authorize()
        ↓
provider resolution if required
OR existing project-level grant reuse
        ↓
short-lived bearer in Kotlin memory
        ↓
Gmail users/me/profile
        ↓ HTTP 2xx
CONNECTED
```

The Account Picker is not a consent oracle. It exists to obtain the concrete Android `Account` handle required to keep authorization and revocation tied to the same account.

## Account custody boundary

The selected account may exist only as an `android.accounts.Account` object in native process memory.

FinanceSensor MUST NOT persist:

```text
Account.name
Account.type
Google email address
Google account ID
GoogleSignInAccount
```

The existing SharedPreferences store remains limited to the non-secret disconnect barrier boolean.

The bridge MUST NOT send to Flutter, logs, CI evidence, screenshots, or public artifacts:

```text
account name
account email
account identifier
bearer token
refresh token
authorization code
```

A coarse boolean such as `accountHandleAvailableInMemory` is permitted because it reveals no identifier or credential.

## Deprecated conversion removed

The Android bridge MUST NOT use:

```text
toGoogleSignInAccount()
GoogleSignInAccount
```

The account handle is acquired before authorization and supplied to authorization explicitly.

```text
ACCOUNT PICKER -> Account -> AuthorizationRequest.setAccount(Account)
```

This makes the revocation dependency explicit rather than attempting to infer an account from an authorization response.

## Disconnect flow

The normal same-process path is:

```text
CONNECTED
  ↓
short bearer in memory
Account handle in memory
  ↓ user taps Disconnect
local disconnect barrier = ACTIVE
  ↓
RevokeAccessRequest
  .setAccount(same Account)
  .setScopes(gmail.readonly)
  ↓
AuthorizationClient.revokeAccess()
  ↓
probe Gmail Profile with PREVIOUS bearer
  ↓
HTTP 401 => PROVIDER REVOKE VERIFIED
  ↓
clearToken(previous bearer)
clear native memory
remain DISCONNECTED
```

The local barrier is activated before any provider operation and remains authoritative even if provider revocation cannot be verified.

## Process-loss recovery

Because account identifiers are deliberately not persisted, a process restart can destroy the in-memory account handle while Google still retains provider authorization.

If the user later explicitly requests **Disconnect** and no account handle is available, FinanceSensor may launch the Android Account Picker as a recovery step:

```text
explicit Disconnect
  ↓
barrier = ACTIVE
  ↓
Account handle missing
  ↓
AccountPicker (com.google only)
  ↓
RevokeAccessRequest.setAccount(selected Account)
```

This recovery is allowed only because it is triggered by an explicit user disconnect action. Passive state observation MUST NOT launch account selection or consent UI.

If account selection is cancelled or no valid Google account handle is returned, FinanceSensor remains locally disconnected and reports provider revoke as **unverified**.

## Provider verification rule

R2 keeps the hardened evidence rule:

```text
HTTP 401  => PASS: previous bearer is unauthorized
HTTP 200  => FAIL: previous bearer is still valid
HTTP 403  => AMBIGUOUS: do not claim revoke PASS
no HTTP   => UNVERIFIED: do not claim revoke PASS
```

`revokeAccess()` task completion alone is not enough.

```text
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
PROVIDER_REVOKE_VERIFIED = PREVIOUS_BEARER_HTTP_401
```

## Stable R2 identity remains unchanged

This fix is an implementation repair inside the existing R2 identity.

```text
PHYSICAL_TEST_PACKAGE = com.financesensor.lab.gmailconnection.r2
R3_PACKAGE             = NOT CREATED
OAUTH_CLIENT_CHANGE    = NO
STABLE_SIGNER_CHANGE   = NO
SCOPE_CHANGE           = NO
```

The physical APK must continue to use the existing stable R2 lab signer outside public CI. Its private key remains forbidden from the public repository and GitHub-hosted CI.

## CI enforcement

Static validation MUST prove at minimum:

```text
AccountPicker present
allowable account type = com.google
AuthorizationRequest.setAccount(account) present
RevokeAccessRequest.setAccount(account) present
toGoogleSignInAccount absent
GoogleSignInAccount absent
putString / account persistence absent
requestOfflineAccess absent
serverAuthCode absent
bearer-to-Flutter path absent
HTTP 401 required for provider revoke verification
```

Public CI can compile and test this bridge, but cannot claim real OAuth/Gmail/provider-revoke success.

## R2 physical retest

Install the next stable-signed R2 APK over the existing R2 installation and execute:

```text
1. Connect Gmail
2. Select the intended Google account if AccountPicker is shown
3. Probar acceso Gmail
   expected: Gmail Profile HTTP 2xx
4. Desconectar y revocar acceso
5. FinanceSensor calls revokeAccess() with the owned Account handle
6. FinanceSensor probes Gmail Profile with the previous bearer
```

Required PASS screen:

```text
Barrera de desconexión   Activa
Revocación Google        Verificada
Bearer anterior          Denegado
HTTP post-revoke         401
Intentos post-revoke     1..3
Diagnóstico revoke       PREVIOUS_BEARER_UNAUTHORIZED
```

Only that physical result closes the Android provider-revoke sub-gate.

## External anchors

Official Google references reviewed for this decision:

- AuthorizationRequest.Builder: https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationRequest.Builder
- RevokeAccessRequest.Builder: https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/RevokeAccessRequest.Builder
- AuthorizationResult: https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationResult
- AccountPicker: https://developers.google.com/android/reference/com/google/android/gms/common/AccountPicker

## Governing laws

```text
ACCOUNT_HANDLE_OWNERSHIP > DEPRECATED_RESULT_INFERENCE
ACCOUNT_HANDLE_SOURCE = ANDROID_ACCOUNT_PICKER
ACCOUNT_IDENTIFIER_PERSISTENCE = FORBIDDEN
EXPLICIT_ACCOUNT_SELECTION MAY PRECEDE AUTHORIZATION
EXPLICIT_DISCONNECT MAY RECOVER ACCOUNT HANDLE
PASSIVE_STATE_REFRESH MAY NOT PROMPT
SAME_ACCOUNT_HANDLE -> AUTHORIZE + REVOKE
OLD_BEARER_HTTP_401 > REVOKE_TASK_SUCCESS
LOCAL_DISCONNECT_BARRIER > PROVIDER_FAILURE
R2_IDENTITY_STABILITY > PACKAGE_CHURN
STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS
```
