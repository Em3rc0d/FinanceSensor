import Foundation
import GoogleSignIn
import UIKit

/// Reference native iOS credential boundary for FinanceSensor P2.
///
/// Security contract:
/// - Google Sign-In SDK owns durable Google credential state in Keychain.
/// - FinanceSensor never persists access/refresh tokens itself.
/// - a short-lived access token is used only in Swift process memory.
/// - UserDefaults may persist only the non-secret disconnect barrier.
/// - no Google account identifier, Gmail content, token or provider body crosses this boundary.
final class GmailCredentialBroker {
    enum ConnectionState: String {
        case disconnected = "DISCONNECTED"
        case readyToConnect = "READY_TO_CONNECT"
        case connected = "CONNECTED"
        case reauthRequired = "REAUTH_REQUIRED"
    }

    struct PublicState {
        let state: ConnectionState
        let profileReachable: Bool
        let historyAnchorObserved: Bool
        let disconnectBarrierActive: Bool
    }

    enum BrokerError: Error {
        case presentationUnavailable
        case scopeMismatch
        case shortTokenMissing
        case profileRequestFailed
        case profileUnauthorized
    }

    private static let gmailReadonly = "https://www.googleapis.com/auth/gmail.readonly"
    private static let gmailProfile = URL(string: "https://gmail.googleapis.com/gmail/v1/users/me/profile")!
    private static let disconnectBarrierKey = "gmail_disconnect_barrier"

    private let defaults: UserDefaults
    private let session: URLSession
    private var shortLivedAccessToken: String?

    init(defaults: UserDefaults = .standard, session: URLSession = .shared) {
        self.defaults = defaults
        self.session = session
    }

    private var disconnectBarrierActive: Bool {
        defaults.bool(forKey: Self.disconnectBarrierKey)
    }

    private func setDisconnectBarrier(_ active: Bool) {
        // Only a non-secret boolean may persist here.
        defaults.set(active, forKey: Self.disconnectBarrierKey)
    }

    private func clearTransientAuthority() {
        shortLivedAccessToken = nil
    }

    func authorizationState() async -> PublicState {
        if disconnectBarrierActive {
            clearTransientAuthority()
            return PublicState(
                state: .disconnected,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: true
            )
        }

        return await withCheckedContinuation { continuation in
            GIDSignIn.sharedInstance.restorePreviousSignIn { [weak self] user, error in
                guard let self else {
                    continuation.resume(returning: PublicState(
                        state: .reauthRequired,
                        profileReachable: false,
                        historyAnchorObserved: false,
                        disconnectBarrierActive: false
                    ))
                    return
                }

                guard error == nil, let user else {
                    self.clearTransientAuthority()
                    continuation.resume(returning: PublicState(
                        state: .readyToConnect,
                        profileReachable: false,
                        historyAnchorObserved: false,
                        disconnectBarrierActive: false
                    ))
                    return
                }

                Task {
                    let state = await self.validateAndProbe(user: user, explicitReconnect: false)
                    continuation.resume(returning: state)
                }
            }
        }
    }

    func authorize(from presentingViewController: UIViewController) async throws -> PublicState {
        let explicitReconnect = disconnectBarrierActive

        let result = try await GIDSignIn.sharedInstance.signIn(
            withPresenting: presentingViewController,
            hint: nil,
            additionalScopes: [Self.gmailReadonly]
        )

        return await validateAndProbe(user: result.user, explicitReconnect: explicitReconnect)
    }

    func probe() async -> PublicState {
        if disconnectBarrierActive {
            clearTransientAuthority()
            return PublicState(
                state: .disconnected,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: true
            )
        }

        guard let user = GIDSignIn.sharedInstance.currentUser else {
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: false
            )
        }

        return await validateAndProbe(user: user, explicitReconnect: false)
    }

    /// Disconnect is local-authority-first. The app remains locally disconnected
    /// even if the provider operation fails.
    func disconnect() async -> PublicState {
        setDisconnectBarrier(true)
        clearTransientAuthority()

        await withCheckedContinuation { continuation in
            GIDSignIn.sharedInstance.disconnect { _ in
                continuation.resume()
            }
        }

        return PublicState(
            state: .disconnected,
            profileReachable: false,
            historyAnchorObserved: false,
            disconnectBarrierActive: true
        )
    }

    private func validateAndProbe(user: GIDGoogleUser, explicitReconnect: Bool) async -> PublicState {
        guard user.grantedScopes?.contains(Self.gmailReadonly) == true else {
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: disconnectBarrierActive
            )
        }

        let refreshedUser: GIDGoogleUser
        do {
            refreshedUser = try await user.refreshTokensIfNeeded()
        } catch {
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: disconnectBarrierActive
            )
        }

        let token = refreshedUser.accessToken.tokenString
        guard !token.isEmpty else {
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: disconnectBarrierActive
            )
        }

        shortLivedAccessToken = token
        let probe = await probeProfile(with: token)

        switch probe {
        case .success(let historyObserved):
            if explicitReconnect {
                setDisconnectBarrier(false)
            }
            return PublicState(
                state: .connected,
                profileReachable: true,
                historyAnchorObserved: historyObserved,
                disconnectBarrierActive: disconnectBarrierActive
            )

        case .unauthorized:
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: disconnectBarrierActive
            )

        case .failed:
            clearTransientAuthority()
            return PublicState(
                state: .reauthRequired,
                profileReachable: false,
                historyAnchorObserved: false,
                disconnectBarrierActive: disconnectBarrierActive
            )
        }
    }

    private enum ProfileProbe {
        case success(historyObserved: Bool)
        case unauthorized
        case failed
    }

    private func probeProfile(with token: String) async -> ProfileProbe {
        var request = URLRequest(url: Self.gmailProfile)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return .failed }
            if http.statusCode == 401 { return .unauthorized }
            guard (200...299).contains(http.statusCode) else { return .failed }

            let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let historyObserved = (object?["historyId"] as? String)?.isEmpty == false
            return .success(historyObserved: historyObserved)
        } catch {
            return .failed
        }
    }
}
