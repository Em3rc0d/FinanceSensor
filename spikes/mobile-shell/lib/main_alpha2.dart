import 'package:flutter/material.dart';

import 'alpha2/alpha2_ingress.dart';
import 'alpha2/alpha2_pipeline.dart';
import 'alpha2/alpha2_projection.dart';
import 'alpha2/alpha2_session.dart';
import 'alpha2/alpha2_vault.dart';

void main() {
  runApp(const FinanceSensorAlpha2App());
}

class FinanceSensorAlpha2App extends StatelessWidget {
  const FinanceSensorAlpha2App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'PocketFinances',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xFF90B7FF),
        scaffoldBackgroundColor: const Color(0xFF090B10),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
        ),
        useMaterial3: true,
      ),
      home: const Alpha2Home(),
    );
  }
}

class Alpha2Home extends StatefulWidget {
  const Alpha2Home({super.key});

  @override
  State<Alpha2Home> createState() => _Alpha2HomeState();
}

class _Alpha2HomeState extends State<Alpha2Home> {
  static const String tenantId = 'LOCAL_PRIMARY';

  final Alpha2Session _session = const Alpha2PlatformSession();
  final Alpha2Pipeline _pipeline = const Alpha2Pipeline(
    ingress: Alpha2PlatformIngressSource(),
    vault: Alpha2PlatformVault(),
  );

  Alpha2SessionState? _sessionState;
  Alpha2PipelineResult? _result;
  bool _busy = true;
  String? _safeError;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final state = await _session.getState();
      if (!mounted) return;
      setState(() {
        _sessionState = state;
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _safeError = 'No se pudo verificar la sesión local.';
      });
    }
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _safeError = null;
    });
    try {
      final state = await _session.connect();
      if (!mounted) return;
      setState(() => _sessionState = state);
      if (state.connected) await _refresh();
    } catch (_) {
      if (!mounted) return;
      setState(() => _safeError = 'Google no pudo autorizar la conexión de forma segura.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refresh() async {
    if (_sessionState?.connected != true) return;
    setState(() {
      _busy = true;
      _safeError = null;
    });
    try {
      final result = await _pipeline.refresh(
        tenantId: tenantId,
        passwordProvider: _requestStatementPassword,
      );
      if (!mounted) return;
      setState(() => _result = result);
    } catch (_) {
      if (!mounted) return;
      setState(() => _safeError = 'La actualización financiera se detuvo de forma segura.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _disconnect() async {
    setState(() {
      _busy = true;
      _safeError = null;
    });
    try {
      final state = await _session.disconnect();
      if (!mounted) return;
      setState(() {
        _sessionState = state;
        _result = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _safeError = 'La desconexión no pudo verificarse.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _requestStatementPassword(
    Alpha2StatementCandidateHandle candidate,
  ) async {
    if (!mounted) return null;
    final controller = TextEditingController();
    try {
      return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Abrir estado de cuenta'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${candidate.institutionCode} · ${candidate.productType}',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'La clave se usa únicamente para abrir este PDF en esta sesión. No se guarda ni se sincroniza.',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                autofocus: true,
                obscureText: true,
                enableSuggestions: false,
                autocorrect: false,
                decoration: const InputDecoration(
                  labelText: 'Clave del PDF',
                  border: OutlineInputBorder(),
                ),
                onSubmitted: (value) {
                  if (value.isNotEmpty) Navigator.of(context).pop(value);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Ahora no'),
            ),
            FilledButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  Navigator.of(context).pop(controller.text);
                }
              },
              child: const Text('Abrir localmente'),
            ),
          ],
        ),
      );
    } finally {
      controller.clear();
      controller.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final connected = _sessionState?.connected == true;
    final projection = _result?.projection;
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 10),
              sliver: SliverToBoxAdapter(
                child: _Header(
                  connected: connected,
                  busy: _busy,
                  onConnect: _connect,
                  onRefresh: _refresh,
                  onDisconnect: _disconnect,
                ),
              ),
            ),
            if (_safeError != null)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                sliver: SliverToBoxAdapter(child: _SafeError(message: _safeError!)),
              ),
            if (_busy && projection == null)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (!connected)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: _Disconnected(),
              )
            else if (projection == null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _refresh,
                    icon: const Icon(Icons.sync),
                    label: const Text('Construir mi vista financiera'),
                  ),
                ),
              )
            else ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
                sliver: SliverToBoxAdapter(child: _Cashflow(projection: projection)),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                sliver: SliverToBoxAdapter(child: _Coverage(result: _result!)),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                sliver: SliverToBoxAdapter(
                  child: Text('Movimientos', style: Theme.of(context).textTheme.titleLarge),
                ),
              ),
              if (projection.transactions.isEmpty)
                const SliverPadding(
                  padding: EdgeInsets.all(20),
                  sliver: SliverToBoxAdapter(child: Text('Todavía no hay movimientos canónicos.')),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                  sliver: SliverList.separated(
                    itemCount: projection.transactions.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) => _TransactionTile(
                      item: projection.transactions[index],
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.connected,
    required this.busy,
    required this.onConnect,
    required this.onRefresh,
    required this.onDisconnect,
  });

  final bool connected;
  final bool busy;
  final VoidCallback onConnect;
  final VoidCallback onRefresh;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('FINANCESENSOR · POCKETFINANCES', style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 8),
        Text('Tu dinero, sin ruido.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text(
          connected
              ? 'Estados de cuenta + movimientos observados en Gmail, consolidados localmente.'
              : 'Conecta Gmail con acceso de solo lectura para construir tu vista financiera local.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white60),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            if (!connected)
              FilledButton.icon(
                onPressed: busy ? null : onConnect,
                icon: const Icon(Icons.link),
                label: const Text('Conectar Gmail'),
              )
            else ...[
              FilledButton.icon(
                onPressed: busy ? null : onRefresh,
                icon: const Icon(Icons.sync),
                label: const Text('Actualizar'),
              ),
              OutlinedButton.icon(
                onPressed: busy ? null : onDisconnect,
                icon: const Icon(Icons.link_off),
                label: const Text('Desconectar'),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _Cashflow extends StatelessWidget {
  const _Cashflow({required this.projection});
  final Alpha2PublicDashboardProjection projection;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Flujo por moneda', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('PEN y USD nunca se mezclan en un total artificial.'),
        const SizedBox(height: 12),
        if (projection.cashflow.isEmpty)
          const Card(child: Padding(padding: EdgeInsets.all(18), child: Text('Aún no hay flujo materializado.')))
        else
          ...projection.cashflow.map(
            (bucket) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(bucket.currency, style: Theme.of(context).textTheme.labelLarge),
                          _TruthChip(state: bucket.truthState.name.toUpperCase()),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _money(bucket.net, bucket.currency),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _Metric(label: 'Entró', value: _money(bucket.income, bucket.currency))),
                          Expanded(child: _Metric(label: 'Salió', value: _money(bucket.expense, bucket.currency))),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Coverage extends StatelessWidget {
  const _Coverage({required this.result});
  final Alpha2PipelineResult result;

  @override
  Widget build(BuildContext context) {
    final imported = result.statementOutcomes.where((item) => item.status == 'IMPORTED').length;
    final review = result.statementOutcomes.where((item) => item.status == 'REVIEW_REQUIRED').length;
    final quarantined = result.statementOutcomes.where((item) => item.status == 'QUARANTINED_PROFILE').length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cobertura', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            const Text('Mostramos estados y conteos; no un porcentaje global de “evidencia”.'),
            const SizedBox(height: 14),
            _CoverageRow(label: 'Gmail observado', value: '${result.gmailEvidenceCount}'),
            _CoverageRow(label: 'EECC importados', value: '$imported'),
            _CoverageRow(label: 'EECC a revisar', value: '$review'),
            _CoverageRow(label: 'Perfiles en cuarentena', value: '$quarantined'),
            _CoverageRow(label: 'Relaciones pendientes', value: '${result.runtime.pendingResolutions.length}'),
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.item});
  final Alpha2PublicTransaction item;

  @override
  Widget build(BuildContext context) {
    final sign = switch (item.flowDirection.name) {
      'outflow' => '-',
      'inflow' => '+',
      _ => '',
    };
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 5),
      title: Text(item.merchant ?? item.category ?? item.semanticType.name),
      subtitle: Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          Text('${item.occurredAt.day.toString().padLeft(2, '0')}/${item.occurredAt.month.toString().padLeft(2, '0')}/${item.occurredAt.year}'),
          _TruthChip(state: item.truthState.name.toUpperCase()),
          if (item.category != null) Text(item.category!),
        ],
      ),
      trailing: Text('$sign${_money(item.amount, item.currency)}', style: const TextStyle(fontWeight: FontWeight.w800)),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 3),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      );
}

class _CoverageRow extends StatelessWidget {
  const _CoverageRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            Expanded(child: Text(label)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
      );
}

class _TruthChip extends StatelessWidget {
  const _TruthChip({required this.state});
  final String state;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          color: Colors.white.withValues(alpha: .07),
        ),
        child: Text(_truthLabel(state), style: Theme.of(context).textTheme.labelSmall),
      );
}

class _SafeError extends StatelessWidget {
  const _SafeError({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [const Icon(Icons.info_outline), const SizedBox(width: 10), Expanded(child: Text(message))]),
        ),
      );
}

class _Disconnected extends StatelessWidget {
  const _Disconnected();
  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(30),
          child: Text('Sin conexión activa. Ningún dato financiero sale de tu dispositivo para construir esta pantalla.'),
        ),
      );
}

String _truthLabel(String state) => switch (state) {
      'RECONCILED' => 'Reconciliado',
      'POSTED' => 'Contabilizado',
      'OBSERVED' => 'Observado',
      'PARTIAL' => 'Parcial',
      _ => 'Por confirmar',
    };

String _money(double value, String currency) {
  final prefix = currency == 'PEN' ? 'S/' : currency == 'USD' ? r'$' : currency;
  return '$prefix ${value.toStringAsFixed(2)}';
}
