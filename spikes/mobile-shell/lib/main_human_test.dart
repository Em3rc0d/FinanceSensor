import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() => runApp(const FinanceSensorHumanTestApp());

class FinanceSensorHumanTestApp extends StatelessWidget {
  const FinanceSensorHumanTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FinanceSensor · Human Test Alpha',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7B8CFF),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF080C14),
        useMaterial3: true,
      ),
      home: const HumanTestShell(),
    );
  }
}

class HumanTestShell extends StatefulWidget {
  const HumanTestShell({super.key});

  @override
  State<HumanTestShell> createState() => _HumanTestShellState();
}

class _HumanTestShellState extends State<HumanTestShell> {
  final HumanTestController controller = HumanTestController();
  int index = 0;

  @override
  void initState() {
    super.initState();
    controller.refresh();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final pages = <Widget>[
          HumanHomePage(controller: controller),
          HumanMovementsPage(controller: controller),
          HumanSensorPage(controller: controller),
          HumanYouPage(controller: controller),
        ];
        return Scaffold(
          body: SafeArea(
            bottom: false,
            child: Column(
              children: <Widget>[
                const HumanTestBanner(),
                Expanded(child: IndexedStack(index: index, children: pages)),
              ],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            height: 66,
            backgroundColor: const Color(0xFF0B111D),
            indicatorColor: const Color(0xFF1A2540),
            selectedIndex: index,
            onDestinationSelected: (value) => setState(() => index = value),
            destinations: const <NavigationDestination>[
              NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
              NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Mov.'),
              NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Sensor'),
              NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Tú'),
            ],
          ),
        );
      },
    );
  }
}

class HumanTestBanner extends StatelessWidget {
  const HumanTestBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 26,
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
            'ALPHA HUMANA · DATOS REALES SOLO EN ESTA SESIÓN',
            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, letterSpacing: .3, color: Color(0xFF9ACDF1)),
          ),
        ],
      ),
    );
  }
}

class HumanTestController extends ChangeNotifier {
  static const MethodChannel _channel = MethodChannel('com.financesensor.platform/human_test');

  GmailState gmail = const GmailState(state: 'CHECKING');
  ScanState scan = const ScanState(status: 'NOT_SCANNED');
  bool busy = false;
  String? error;

  List<FinancialEvent> get events => scan.events;
  bool get connected => gmail.state == 'CONNECTED';
  bool get hasScan => scan.status == 'SCAN_COMPLETE';

  Future<void> refresh() async {
    await _run(() async {
      final raw = await _channel.invokeMapMethod<Object?, Object?>('getState');
      gmail = GmailState.fromMap(raw ?? const {});
    });
  }

  Future<void> connect() async {
    await _run(() async {
      final raw = await _channel.invokeMapMethod<Object?, Object?>('connect');
      gmail = GmailState.fromMap(raw ?? const {});
      if (gmail.state == 'CONNECTED') await scanNow();
    }, nested: false);
  }

  Future<void> scanNow() async {
    await _run(() async {
      final raw = await _channel.invokeMapMethod<Object?, Object?>('scan');
      scan = ScanState.fromMap(raw ?? const {});
    });
  }

  Future<void> disconnect() async {
    await _run(() async {
      final raw = await _channel.invokeMapMethod<Object?, Object?>('disconnect');
      gmail = GmailState.fromMap(raw ?? const {});
      scan = const ScanState(status: 'NOT_SCANNED');
    });
  }

  Future<void> _run(Future<void> Function() work, {bool nested = false}) async {
    if (busy && !nested) return;
    final ownedBusy = !busy;
    if (ownedBusy) {
      busy = true;
      error = null;
      notifyListeners();
    }
    try {
      await work();
    } on MissingPluginException {
      error = 'Este build no contiene el trusted edge Android.';
    } on PlatformException catch (exception) {
      error = _humanError(exception.code);
      if (exception.code == 'REAUTH_REQUIRED') gmail = const GmailState(state: 'REAUTH_REQUIRED');
    } finally {
      if (ownedBusy) {
        busy = false;
        notifyListeners();
      }
    }
  }

  String _humanError(String code) {
    if (code == 'AUTH_CANCELLED') return 'La autorización fue cancelada.';
    if (code == 'REAUTH_REQUIRED') return 'Gmail necesita autorización otra vez.';
    if (code == 'AUTH_FAILED_10') return 'La firma Android de esta alpha todavía no está registrada en Google.';
    if (code.startsWith('GMAIL_SCAN_HTTP_')) return 'Gmail rechazó temporalmente el barrido.';
    if (code == 'FINANCIAL_SCAN_FAILED') return 'El barrido se detuvo de forma segura.';
    return 'No pudimos completar la acción ($code).';
  }
}

class GmailState {
  const GmailState({
    required this.state,
    this.messageCount,
    this.threadCount,
    this.historyAnchorObserved = false,
    this.oldBearerDenied = false,
  });

  final String state;
  final int? messageCount;
  final int? threadCount;
  final bool historyAnchorObserved;
  final bool oldBearerDenied;

  factory GmailState.fromMap(Map<Object?, Object?> raw) {
    int? integer(String key) => raw[key] is int ? raw[key] as int : null;
    return GmailState(
      state: raw['state'] as String? ?? 'UNKNOWN',
      messageCount: integer('messageCount'),
      threadCount: integer('threadCount'),
      historyAnchorObserved: raw['historyAnchorObserved'] == true,
      oldBearerDenied: raw['oldBearerDenied'] == true,
    );
  }

  String get label {
    switch (state) {
      case 'CONNECTED': return 'Gmail conectado';
      case 'CHECKING': return 'Comprobando Gmail';
      case 'READY_TO_CONNECT': return 'Listo para conectar';
      case 'REAUTH_REQUIRED': return 'Reautorización necesaria';
      case 'DISCONNECTED': return 'Gmail desconectado';
      default: return 'Gmail no conectado';
    }
  }
}

class ScanState {
  const ScanState({
    required this.status,
    this.messagesInspected = 0,
    this.candidates = 0,
    this.fullMessagesFetched = 0,
    this.parseMisses = 0,
    this.maxMessages = 300,
    this.events = const <FinancialEvent>[],
  });

  final String status;
  final int messagesInspected;
  final int candidates;
  final int fullMessagesFetched;
  final int parseMisses;
  final int maxMessages;
  final List<FinancialEvent> events;

  factory ScanState.fromMap(Map<Object?, Object?> raw) {
    int integer(String key, [int fallback = 0]) => raw[key] is int ? raw[key] as int : fallback;
    final values = raw['events'];
    final parsed = <FinancialEvent>[];
    if (values is List) {
      for (final value in values) {
        if (value is Map) parsed.add(FinancialEvent.fromMap(value));
      }
    }
    return ScanState(
      status: raw['status'] as String? ?? 'UNKNOWN',
      messagesInspected: integer('messagesInspected'),
      candidates: integer('candidates'),
      fullMessagesFetched: integer('fullMessagesFetched'),
      parseMisses: integer('parseMisses'),
      maxMessages: integer('maxMessages', 300),
      events: parsed,
    );
  }
}

class FinancialEvent {
  const FinancialEvent({
    required this.amount,
    required this.currency,
    required this.semanticType,
    required this.merchant,
    required this.adapterId,
    required this.confidence,
  });

  final double amount;
  final String currency;
  final String semanticType;
  final String? merchant;
  final String adapterId;
  final double confidence;

  factory FinancialEvent.fromMap(Map raw) {
    final amount = raw['amount'];
    final confidence = raw['confidence'];
    return FinancialEvent(
      amount: amount is num ? amount.toDouble() : 0,
      currency: raw['currency'] as String? ?? 'PEN',
      semanticType: raw['semanticType'] as String? ?? 'UNKNOWN',
      merchant: raw['merchant'] as String?,
      adapterId: raw['adapterId'] as String? ?? 'UNKNOWN',
      confidence: confidence is num ? confidence.toDouble() : 0,
    );
  }

  bool get isExpense => semanticType == 'EXPENSE';
  bool get isCardPayment => semanticType == 'CARD_PAYMENT';
  bool get isTransfer => semanticType.contains('TRANSFER');

  String get semanticLabel {
    if (isCardPayment) return 'Pago de tarjeta';
    if (semanticType == 'EXPENSE') return 'Compra / gasto';
    if (semanticType == 'INTERNAL_TRANSFER') return 'Transferencia propia';
    if (semanticType == 'EXTERNAL_TRANSFER') return 'Transferencia';
    return 'Movimiento';
  }

  String get providerLabel {
    if (adapterId.startsWith('BCP_')) return 'BCP';
    if (adapterId.startsWith('INTERBANK_')) return 'Interbank';
    if (adapterId.startsWith('RIPLEY_')) return 'Ripley';
    return 'Fuente';
  }

  String get amountLabel {
    final marker = currency == 'USD' ? 'US\$' : 'S/';
    return '$marker ${amount.toStringAsFixed(2)}';
  }
}

class HumanHomePage extends StatelessWidget {
  const HumanHomePage({required this.controller, super.key});
  final HumanTestController controller;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 660;
        if (!controller.connected) {
          return _CenteredState(
            icon: Icons.link,
            title: 'Conecta tu primera fuente',
            body: 'La alpha usa Gmail solo lectura. El bearer vive únicamente en Android y no entra a Flutter.',
            action: FilledButton.icon(
              onPressed: controller.busy ? null : controller.connect,
              icon: const Icon(Icons.lock_open, size: 18),
              label: const Text('Conectar Gmail'),
            ),
          );
        }
        if (!controller.hasScan) {
          return _CenteredState(
            icon: Icons.radar,
            title: 'Gmail está conectado',
            body: 'Haz un barrido local y acotado para convertir notificaciones bancarias compatibles en evidencia derivada.',
            action: FilledButton.icon(
              onPressed: controller.busy ? null : controller.scanNow,
              icon: const Icon(Icons.play_arrow, size: 18),
              label: const Text('Analizar muestra reciente'),
            ),
          );
        }

        final penExpenses = controller.events.where((e) => e.isExpense && e.currency == 'PEN').fold<double>(0, (a, e) => a + e.amount);
        final usdExpenses = controller.events.where((e) => e.isExpense && e.currency == 'USD').fold<double>(0, (a, e) => a + e.amount);
        final payments = controller.events.where((e) => e.isCardPayment).length;
        final transfers = controller.events.where((e) => e.isTransfer).length;

        return Padding(
          padding: EdgeInsets.fromLTRB(14, compact ? 8 : 12, 14, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _PageHeader(eyebrow: 'Sesión local', title: 'Tu dinero, con evidencia.', compact: compact, trailing: const _LivePill()),
              SizedBox(height: compact ? 7 : 10),
              Expanded(
                flex: 8,
                child: _Panel(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        const Text('Muestra observada', style: TextStyle(fontSize: 10, color: Color(0xFF8FA0B9))),
                        const SizedBox(height: 4),
                        Text('${controller.events.length} movimientos', style: TextStyle(fontSize: compact ? 26 : 30, fontWeight: FontWeight.w900, letterSpacing: -1)),
                        const Spacer(),
                        Text('${controller.scan.messagesInspected} correos inspeccionados · ${controller.scan.fullMessagesFetched} abiertos tras metadata', style: const TextStyle(fontSize: 9, color: Color(0xFF8FA0B9))),
                        const SizedBox(height: 4),
                        const Text('No es un saldo bancario ni una foto financiera completa.', style: TextStyle(fontSize: 8, color: Color(0xFFFFC46B))),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(height: compact ? 7 : 9),
              Expanded(
                flex: 5,
                child: Row(
                  children: <Widget>[
                    Expanded(child: _Metric(value: 'S/ ${penExpenses.toStringAsFixed(2)}', label: 'Gasto PEN observado')),
                    const SizedBox(width: 7),
                    Expanded(child: _Metric(value: usdExpenses > 0 ? 'US\$ ${usdExpenses.toStringAsFixed(2)}' : '—', label: 'Gasto USD observado')),
                    const SizedBox(width: 7),
                    Expanded(child: _Metric(value: '$payments', label: 'Pagos de tarjeta')),
                  ],
                ),
              ),
              SizedBox(height: compact ? 7 : 9),
              Expanded(
                flex: 6,
                child: _Panel(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: <Widget>[
                        const _SensorOrb(),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text('Sensor conservador', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Text('$transfers transferencia(s) se mantienen separadas del gasto. ${controller.scan.parseMisses} candidato(s) quedaron sin interpretar.', style: const TextStyle(fontSize: 9, height: 1.3, color: Color(0xFF8FA0B9))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(height: compact ? 7 : 9),
              OutlinedButton.icon(
                onPressed: controller.busy ? null : controller.scanNow,
                icon: controller.busy ? const SizedBox.square(dimension: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh, size: 17),
                label: const Text('Actualizar muestra'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class HumanMovementsPage extends StatelessWidget {
  const HumanMovementsPage({required this.controller, super.key});
  final HumanTestController controller;

  @override
  Widget build(BuildContext context) {
    if (!controller.hasScan) {
      return const _CenteredState(icon: Icons.receipt_long_outlined, title: 'Aún no hay evidencia', body: 'Conecta Gmail y ejecuta el barrido desde Inicio o Tú.');
    }
    if (controller.events.isEmpty) {
      return const _CenteredState(icon: Icons.inbox_outlined, title: 'Sin movimientos compatibles', body: 'La muestra reciente no produjo evidencia financiera bajo las reglas conservadoras actuales.');
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const _PageHeader(eyebrow: 'Evidencia derivada', title: 'Movimientos'),
          const SizedBox(height: 10),
          Expanded(
            child: ListView.separated(
              itemCount: controller.events.length,
              separatorBuilder: (_, __) => const SizedBox(height: 7),
              itemBuilder: (context, index) => _MovementTile(event: controller.events[index]),
            ),
          ),
        ],
      ),
    );
  }
}

class _MovementTile extends StatelessWidget {
  const _MovementTile({required this.event});
  final FinancialEvent event;

  @override
  Widget build(BuildContext context) {
    final icon = event.isCardPayment ? Icons.credit_card : event.isTransfer ? Icons.swap_horiz : Icons.shopping_bag_outlined;
    return _Panel(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: <Widget>[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: const Color(0xFF17243A), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 18, color: const Color(0xFFAAB8FF)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(event.merchant?.isNotEmpty == true ? event.merchant! : event.semanticLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 3),
                  Text('${event.providerLabel} · ${event.semanticLabel} · ${(event.confidence * 100).round()}% evidencia', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8.2, color: Color(0xFF8FA0B9))),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(event.amountLabel, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}

class HumanSensorPage extends StatelessWidget {
  const HumanSensorPage({required this.controller, super.key});
  final HumanTestController controller;

  @override
  Widget build(BuildContext context) {
    final safe = controller.hasScan && controller.scan.parseMisses == 0;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const _PageHeader(eyebrow: 'Qué sabemos / qué no', title: 'Sensor'),
          const SizedBox(height: 10),
          _Panel(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: <Widget>[
                  _SensorOrb(active: controller.hasScan),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(controller.hasScan ? (safe ? 'Muestra procesada sin ambigüedad' : 'Hay evidencia que no interpretamos') : 'Esperando una muestra', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Text(controller.hasScan ? '${controller.scan.candidates} candidatos fuertes · ${controller.scan.parseMisses} sin parsear' : 'El Sensor no inventa conclusiones sin evidencia.', style: const TextStyle(fontSize: 9, color: Color(0xFF8FA0B9))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          _FactCard(icon: Icons.filter_alt_outlined, title: 'Metadata primero', body: controller.hasScan ? '${controller.scan.messagesInspected} mensajes vistos como metadata; solo ${controller.scan.fullMessagesFetched} candidatos fuertes requirieron FULL.' : 'El cuerpo solo se pide para firmas bancarias conocidas.'),
          const SizedBox(height: 8),
          const _FactCard(icon: Icons.memory_outlined, title: 'Sesión efímera', body: 'Esta alpha no persiste eventos ni correo. Cerrar la app elimina la muestra financiera de memoria.'),
          const SizedBox(height: 8),
          const _FactCard(icon: Icons.warning_amber_rounded, title: 'Límite deliberado', body: 'Máximo 300 mensajes recientes de INBOX. No equivale a histórico completo, saldo ni conciliación bancaria.'),
          const Spacer(),
          const Text('HUMAN TEST ALPHA · ENGINEERING CANDIDATE', textAlign: TextAlign.center, style: TextStyle(fontSize: 8, color: Color(0xFF556780), fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class HumanYouPage extends StatelessWidget {
  const HumanYouPage({required this.controller, super.key});
  final HumanTestController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const _PageHeader(eyebrow: 'Tu trusted edge', title: 'Tú'),
          const SizedBox(height: 10),
          _Panel(
            child: Padding(
              padding: const EdgeInsets.all(13),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(controller.connected ? Icons.check_circle : Icons.link, size: 20, color: controller.connected ? const Color(0xFF77E6AD) : const Color(0xFF9AA8BF)),
                      const SizedBox(width: 9),
                      Expanded(child: Text(controller.gmail.label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800))),
                    ],
                  ),
                  if (controller.error != null) ...<Widget>[
                    const SizedBox(height: 9),
                    Text(controller.error!, style: const TextStyle(fontSize: 9, color: Color(0xFFFFB4A9))),
                  ],
                  const SizedBox(height: 12),
                  if (!controller.connected)
                    FilledButton.icon(onPressed: controller.busy ? null : controller.connect, icon: const Icon(Icons.lock_open, size: 17), label: const Text('Conectar Gmail'))
                  else ...<Widget>[
                    FilledButton.icon(onPressed: controller.busy ? null : controller.scanNow, icon: const Icon(Icons.radar, size: 17), label: const Text('Analizar muestra reciente')),
                    const SizedBox(height: 7),
                    OutlinedButton.icon(onPressed: controller.busy ? null : controller.disconnect, icon: const Icon(Icons.link_off, size: 17), label: const Text('Desconectar y revocar')),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const _FactCard(icon: Icons.visibility_outlined, title: 'Permiso exacto', body: 'gmail.readonly. No enviar, borrar ni modificar correo.'),
          const SizedBox(height: 8),
          const _FactCard(icon: Icons.vpn_key_off_outlined, title: 'Custodia', body: 'Bearer corto: Android memory only. Refresh token en FinanceSensor: 0. Offline access: no solicitado.'),
          const SizedBox(height: 8),
          const _FactCard(icon: Icons.cloud_off_outlined, title: 'Datos financieros', body: 'Sin nube en esta alpha. Los eventos derivados viven solo durante la sesión local.'),
          const Spacer(),
          Text(controller.busy ? 'Procesando localmente…' : 'v0.1.0-alpha.1 · Android human test', textAlign: TextAlign.center, style: const TextStyle(fontSize: 8.5, color: Color(0xFF657894))),
        ],
      ),
    );
  }
}

class _CenteredState extends StatelessWidget {
  const _CenteredState({required this.icon, required this.title, required this.body, this.action});
  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(width: 58, height: 58, decoration: BoxDecoration(color: const Color(0xFF17243A), borderRadius: BorderRadius.circular(20)), child: Icon(icon, color: const Color(0xFFAAB8FF))),
              const SizedBox(height: 15),
              Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, letterSpacing: -.4)),
              const SizedBox(height: 7),
              Text(body, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, height: 1.45, color: Color(0xFF8FA0B9))),
              if (action != null) ...<Widget>[const SizedBox(height: 16), action!],
            ],
          ),
        ),
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.eyebrow, required this.title, this.compact = false, this.trailing});
  final String eyebrow;
  final String title;
  final bool compact;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(eyebrow, style: const TextStyle(fontSize: 10, color: Color(0xFF8FA0B9), fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(title, style: TextStyle(fontSize: compact ? 18 : 21, height: 1.02, fontWeight: FontWeight.w900, letterSpacing: -.6)),
            ],
          ),
        ),
        if (trailing != null) ...<Widget>[const SizedBox(width: 8), trailing!],
      ],
    );
  }
}

class _LivePill extends StatelessWidget {
  const _LivePill();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
    decoration: BoxDecoration(color: const Color(0xFF0C1D19), border: Border.all(color: const Color(0xFF214838)), borderRadius: BorderRadius.circular(999)),
    child: const Text('● local', style: TextStyle(fontSize: 9, color: Color(0xFF8EF0BE), fontWeight: FontWeight.w800)),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => _Panel(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900))),
          const SizedBox(height: 2),
          Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 7.8, color: Color(0xFF8FA0B9))),
        ],
      ),
    ),
  );
}

class _FactCard extends StatelessWidget {
  const _FactCard({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => _Panel(
    child: Padding(
      padding: const EdgeInsets.all(11),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 19, color: const Color(0xFF8FA6FF)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text(title, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800)),
            const SizedBox(height: 3),
            Text(body, style: const TextStyle(fontSize: 8.2, height: 1.3, color: Color(0xFF8FA0B9))),
          ])),
        ],
      ),
    ),
  );
}

class _SensorOrb extends StatelessWidget {
  const _SensorOrb({this.active = true});
  final bool active;
  @override
  Widget build(BuildContext context) => Container(
    width: 40,
    height: 40,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: active ? const LinearGradient(colors: <Color>[Color(0xFF7B8CFF), Color(0xFF5AC8FA)]) : null,
      color: active ? null : const Color(0xFF243047),
      boxShadow: active ? const <BoxShadow>[BoxShadow(color: Color(0x447B8CFF), blurRadius: 15)] : null,
    ),
    child: Icon(Icons.auto_awesome, size: 19, color: active ? Colors.white : const Color(0xFF718099)),
  );
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color(0xFF0E1522),
      border: Border.all(color: const Color(0xFF1D2A40)),
      borderRadius: BorderRadius.circular(17),
      boxShadow: const <BoxShadow>[BoxShadow(color: Color(0x22000000), blurRadius: 12, offset: Offset(0, 4))],
    ),
    child: child,
  );
}
