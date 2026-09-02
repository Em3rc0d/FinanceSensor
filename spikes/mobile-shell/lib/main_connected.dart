import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'main.dart' as lab;

void main() => runApp(const FinanceSensorConnectedApp());

class FinanceSensorConnectedApp extends StatelessWidget {
  const FinanceSensorConnectedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FinanceSensor Android Connection Lab',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7B8CFF),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF080C14),
        useMaterial3: true,
      ),
      home: const ConnectedFinanceSensorShell(),
    );
  }
}

class ConnectedFinanceSensorShell extends StatefulWidget {
  const ConnectedFinanceSensorShell({super.key});

  @override
  State<ConnectedFinanceSensorShell> createState() => _ConnectedFinanceSensorShellState();
}

class _ConnectedFinanceSensorShellState extends State<ConnectedFinanceSensorShell> {
  int index = 0;

  late final List<Widget> pages = <Widget>[
    const lab.HomePage(),
    const lab.MovementsPage(),
    const lab.SensorPage(),
    const ConnectedYouPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: <Widget>[
            const ConnectionLabBanner(),
            Expanded(child: IndexedStack(index: index, children: pages)),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        height: 66,
        backgroundColor: const Color(0xFF0B111D),
        indicatorColor: const Color(0xFF1A2540),
        selectedIndex: index,
        onDestinationSelected: (int value) => setState(() => index = value),
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Mov.',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome),
            label: 'Sensor',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Tú',
          ),
        ],
      ),
    );
  }
}

class ConnectionLabBanner extends StatelessWidget {
  const ConnectionLabBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 25,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: Color(0xFF101722),
        border: Border(bottom: BorderSide(color: Color(0xFF294067))),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(Icons.circle, size: 6, color: Color(0xFF5AC8FA)),
          SizedBox(width: 6),
          Text(
            'CONNECTION LAB · FINANZAS SINTÉTICAS',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: .35,
              color: Color(0xFF9ACDF1),
            ),
          ),
        ],
      ),
    );
  }
}

class ConnectedYouPage extends StatefulWidget {
  const ConnectedYouPage({super.key});

  @override
  State<ConnectedYouPage> createState() => _ConnectedYouPageState();
}

class _ConnectedYouPageState extends State<ConnectedYouPage> {
  GmailConnectionSnapshot snapshot = const GmailConnectionSnapshot(state: 'CHECKING');

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final GmailConnectionSnapshot next = await GmailPlatformBridge.getState();
    if (mounted) setState(() => snapshot = next);
  }

  Future<void> _openConnections() async {
    await showGmailConnectionSheet(context);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const lab.PageHeader(eyebrow: 'Tu espacio financiero', title: 'Tú'),
          const SizedBox(height: 11),
          lab.MenuCard(
            icon: Icons.link,
            title: 'Conexiones',
            subtitle: snapshot.menuSubtitle,
            onTap: _openConnections,
          ),
          const SizedBox(height: 8),
          lab.MenuCard(
            icon: Icons.repeat,
            title: 'Pagos recurrentes',
            subtitle: 'Próximos 7 días · ~S/47.39 sintéticos',
            onTap: () => lab.showRecurringSheet(context),
          ),
          const SizedBox(height: 8),
          lab.MenuCard(
            icon: Icons.shield_outlined,
            title: 'Privacidad',
            subtitle: 'Bearer fuera de Flutter · refresh token en app: 0',
            onTap: () => showConnectionPrivacySheet(context),
          ),
          const SizedBox(height: 8),
          lab.MenuCard(
            icon: Icons.science_outlined,
            title: 'Connection Lab',
            subtitle: 'OAuth Android real · finanzas aún sintéticas',
            onTap: () => showConnectionLabSheet(context),
          ),
          const Spacer(),
          const Text(
            'ANDROID CONNECTION SPIKE · NO ES PRODUCCIÓN',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 8, color: Color(0xFF556780), fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class GmailPlatformBridge {
  GmailPlatformBridge._();

  static const MethodChannel _channel = MethodChannel('com.financesensor.platform/gmail');

  static Future<GmailConnectionSnapshot> getState() => _invoke('getGmailState');

  static Future<GmailConnectionSnapshot> connect() => _invoke('authorizeGmail');

  static Future<GmailConnectionSnapshot> probe() => _invoke('probeGmail');

  static Future<GmailConnectionSnapshot> disconnect() => _invoke('disconnectGmail');

  static Future<GmailConnectionSnapshot> _invoke(String method) async {
    try {
      final Map<Object?, Object?>? raw = await _channel.invokeMapMethod<Object?, Object?>(method);
      return GmailConnectionSnapshot.fromMap(raw ?? const <Object?, Object?>{});
    } on MissingPluginException {
      return const GmailConnectionSnapshot(state: 'NATIVE_BRIDGE_UNAVAILABLE');
    } on PlatformException catch (error) {
      return GmailConnectionSnapshot(state: error.code);
    }
  }
}

class GmailConnectionSnapshot {
  const GmailConnectionSnapshot({
    required this.state,
    this.profileReachable = false,
    this.historyAnchorObserved = false,
    this.messageCount,
    this.threadCount,
    this.latencyMs,
    this.responseBytes,
  });

  final String state;
  final bool profileReachable;
  final bool historyAnchorObserved;
  final int? messageCount;
  final int? threadCount;
  final int? latencyMs;
  final int? responseBytes;

  bool get isConnected => state == 'CONNECTED' || state == 'AUTHORIZED';

  bool get isBusy => state == 'CHECKING';

  String get menuSubtitle {
    if (isConnected) return 'Gmail · conectado en Android';
    if (isBusy) return 'Gmail · comprobando autorización';
    if (state == 'AUTH_FAILED_10') return 'Gmail · falta registrar firma Android';
    if (state == 'NATIVE_BRIDGE_UNAVAILABLE') return 'Gmail · bridge Android no disponible';
    return 'Gmail · listo para conectar';
  }

  String get humanState {
    if (state == 'CONNECTED') return 'Conectado';
    if (state == 'AUTHORIZED') return 'Autorizado';
    if (state == 'READY_TO_CONNECT') return 'Listo para conectar';
    if (state == 'REAUTH_REQUIRED') return 'Reautorización necesaria';
    if (state == 'DISCONNECTED') return 'Desconectado';
    if (state == 'AUTH_FAILED_10') return 'Falta configurar el cliente Android';
    if (state == 'NATIVE_BRIDGE_UNAVAILABLE') return 'Bridge Android no disponible';
    if (state == 'CHECKING') return 'Comprobando';
    return 'No conectado';
  }

  factory GmailConnectionSnapshot.fromMap(Map<Object?, Object?> raw) {
    int? integer(String key) {
      final Object? value = raw[key];
      return value is int ? value : null;
    }

    return GmailConnectionSnapshot(
      state: raw['state'] as String? ?? 'UNKNOWN',
      profileReachable: raw['profileReachable'] == true,
      historyAnchorObserved: raw['historyAnchorObserved'] == true,
      messageCount: integer('messageCount'),
      threadCount: integer('threadCount'),
      latencyMs: integer('latencyMs'),
      responseBytes: integer('responseBytes'),
    );
  }
}

Future<void> showGmailConnectionSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF0F1725),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (BuildContext context) => const GmailConnectionPanel(),
  );
}

class GmailConnectionPanel extends StatefulWidget {
  const GmailConnectionPanel({super.key});

  @override
  State<GmailConnectionPanel> createState() => _GmailConnectionPanelState();
}

class _GmailConnectionPanelState extends State<GmailConnectionPanel> {
  GmailConnectionSnapshot snapshot = const GmailConnectionSnapshot(state: 'CHECKING');
  bool actionBusy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final GmailConnectionSnapshot next = await GmailPlatformBridge.getState();
    if (mounted) setState(() => snapshot = next);
  }

  Future<void> _run(Future<GmailConnectionSnapshot> Function() action) async {
    if (actionBusy) return;
    setState(() => actionBusy = true);
    final GmailConnectionSnapshot next = await action();
    if (!mounted) return;
    setState(() {
      snapshot = next;
      actionBusy = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF34425A),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 13),
            const Text('Conectar Gmail', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            const SizedBox(height: 5),
            const Text(
              'FinanceSensor pide únicamente lectura. La autorización vive en Android; el token corto no cruza a Flutter.',
              style: TextStyle(fontSize: 8.5, height: 1.35, color: Color(0xFF8FA0B9)),
            ),
            const SizedBox(height: 12),
            _ConnectionStateCard(snapshot: snapshot),
            const SizedBox(height: 10),
            const _SecurityFact(label: 'Permiso', value: 'Gmail solo lectura'),
            const _SecurityFact(label: 'Offline access', value: 'No solicitado'),
            const _SecurityFact(label: 'Refresh token en app', value: 'No'),
            const _SecurityFact(label: 'Bearer hacia Flutter', value: 'No'),
            if (snapshot.messageCount != null)
              _SecurityFact(label: 'Mensajes reportados', value: '${snapshot.messageCount}'),
            if (snapshot.latencyMs != null)
              _SecurityFact(label: 'Probe de perfil', value: '${snapshot.latencyMs} ms'),
            const SizedBox(height: 12),
            if (actionBusy)
              const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()))
            else if (!snapshot.isConnected)
              FilledButton.icon(
                onPressed: () => _run(GmailPlatformBridge.connect),
                icon: const Icon(Icons.link),
                label: const Text('Conectar Gmail'),
              )
            else ...<Widget>[
              FilledButton.tonalIcon(
                onPressed: () => _run(GmailPlatformBridge.probe),
                icon: const Icon(Icons.health_and_safety_outlined),
                label: const Text('Probar acceso Gmail'),
              ),
              const SizedBox(height: 6),
              TextButton(
                onPressed: () => _run(GmailPlatformBridge.disconnect),
                child: const Text('Desconectar y revocar acceso'),
              ),
            ],
            if (snapshot.state == 'AUTH_FAILED_10') ...<Widget>[
              const SizedBox(height: 8),
              const Text(
                'Este APK necesita un cliente OAuth Android registrado con su package name y la huella SHA-1 exacta de firma.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 8, color: Color(0xFFFFC56F)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ConnectionStateCard extends StatelessWidget {
  const _ConnectionStateCard({required this.snapshot});

  final GmailConnectionSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final bool ok = snapshot.isConnected;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ok ? const Color(0xFF0C1D19) : const Color(0xFF121A29),
        border: Border.all(color: ok ? const Color(0xFF214838) : const Color(0xFF28364F)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: <Widget>[
          Icon(
            ok ? Icons.check_circle : Icons.link_outlined,
            size: 22,
            color: ok ? const Color(0xFF8EF0BE) : const Color(0xFFA9B7CE),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(snapshot.humanState, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(
                  snapshot.historyAnchorObserved
                      ? 'Gmail respondió y se observó un ancla de historial.'
                      : 'Sin contenido financiero real cargado en la interfaz.',
                  style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SecurityFact extends StatelessWidget {
  const _SecurityFact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF1B2940)))),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF8FA0B9)))),
          const SizedBox(width: 8),
          Text(value, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

void showConnectionPrivacySheet(BuildContext context) {
  lab.showFinanceSheet(
    context,
    'Privacidad de conexión',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        lab.BigValue(value: '0', label: 'refresh tokens custodiados por FinanceSensor Android'),
        lab.DetailLine(label: 'Autorización', value: 'Google Play Services'),
        lab.DetailLine(label: 'Bearer en Flutter', value: 'Nunca'),
        lab.DetailLine(label: 'Offline access', value: 'No solicitado'),
        lab.DetailLine(label: 'Cloud Gmail plaintext', value: '0 por diseño'),
      ],
    ),
  );
}

void showConnectionLabSheet(BuildContext context) {
  lab.showFinanceSheet(
    context,
    'Connection Lab',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        lab.DetailLine(label: 'Dashboard financiero', value: 'Sintético'),
        lab.DetailLine(label: 'OAuth Android', value: 'Bridge real'),
        lab.DetailLine(label: 'Gmail profile probe', value: 'Nativo'),
        lab.DetailLine(label: 'CI ejecuta OAuth real', value: 'NO'),
        lab.DetailLine(label: 'BUILD_READY', value: 'NO'),
      ],
    ),
  );
}
