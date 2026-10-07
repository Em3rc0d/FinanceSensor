import 'package:flutter/services.dart';

import 'alpha2_ingress.dart';

class Alpha2SessionState {
  const Alpha2SessionState({
    required this.state,
    required this.scope,
    required this.disconnectBarrierActive,
    required this.profileReachable,
  });

  final String state;
  final String scope;
  final bool disconnectBarrierActive;
  final bool profileReachable;

  bool get connected => state == 'CONNECTED';
}

abstract interface class Alpha2Session {
  Future<Alpha2SessionState> getState();
  Future<Alpha2SessionState> connect();
  Future<Alpha2SessionState> disconnect();
}

class Alpha2PlatformSession implements Alpha2Session {
  const Alpha2PlatformSession({
    MethodChannel channel = const MethodChannel(alpha2PlatformChannelName),
  }) : _channel = channel;

  final MethodChannel _channel;

  @override
  Future<Alpha2SessionState> getState() => _invoke('getState');

  @override
  Future<Alpha2SessionState> connect() => _invoke('connect');

  @override
  Future<Alpha2SessionState> disconnect() => _invoke('disconnect');

  Future<Alpha2SessionState> _invoke(String method) async {
    final raw = await _channel.invokeMapMethod<Object?, Object?>(method) ??
        const <Object?, Object?>{};
    final scope = raw['scope'] as String? ?? '';
    final state = raw['state'] as String? ?? '';
    if (scope != 'gmail.readonly' || state.isEmpty) {
      throw StateError('ALPHA2_SESSION_CONTRACT_MISMATCH');
    }
    if (raw['accessTokenExposedToFlutter'] == true ||
        raw['refreshTokenHeldByApp'] == true ||
        raw['offlineAccessRequested'] == true) {
      throw StateError('ALPHA2_SESSION_AUTHORITY_BOUNDARY_BROKEN');
    }
    return Alpha2SessionState(
      state: state,
      scope: scope,
      disconnectBarrierActive: raw['disconnectBarrierActive'] == true,
      profileReachable: raw['profileReachable'] == true,
    );
  }
}
