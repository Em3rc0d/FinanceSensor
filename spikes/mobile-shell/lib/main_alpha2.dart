import 'package:flutter/material.dart';

import 'alpha2/alpha2_dashboard_sections.dart';
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
    final sessionPasswords = <String, String>{};
    setState(() {
      _busy = true;
      _safeError = null;
    });
    try {
      final result = await _pipeline.refresh(
        tenantId: tenantId,
        passwordProvider: (candidate) async {
          final cached = sessionPasswords[candidate.profileId];
          if (cached != null && cached.isNotEmpty) return cached;
          final password = await _requestStatementPassword(candidate);
          if (password != null && password.isNotEmpty) {
            sessionPasswords[candidate.profileId] = password;
          }
          return password;
        },
      );
      if (!mounted) return;
      setState(() {
        _result = result;
        _safeError = alpha2StatementOutcomeNotice(result);
      });
    } on Alpha2PipelineFailure catch (error) {
      if (!mounted) return;
      setState(() => _safeError = alpha2SafeRefreshMessage(error.safeCode));
    } catch (_) {
      if (!mounted) return;
      setState(
        () => _safeError = alpha2SafeRefreshMessage('A2_UNCLASSIFIED_SAFE_STOP'),
      );
    } finally {
      sessionPasswords.clear();
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
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => Alpha2StatementPasswordDialog(candidate: candidate),
    );
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
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                sliver: SliverToBoxAdapter(
                  child: Alpha2FinanceInsightsSections(projection: projection),
                ),
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

class Alpha2StatementPasswordDialog extends StatefulWidget {
  const Alpha2StatementPasswordDialog({
    super.key,
    required this.candidate,
  });

  final Alpha2StatementCandidateHandle candidate;

  @override
  State<Alpha2StatementPasswordDialog> createState() =>
      _Alpha2StatementPasswordDialogState();
}

class _Alpha2StatementPasswordDialogState
    extends State<Alpha2StatementPasswordDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.clear();
    _controller.dispose();
    super.dispose();
  }

  void _submit(String value) {
    if (value.isEmpty || !mounted) return;
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    final candidate = widget.candidate;
    return AlertDialog(
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
            'La clave se usa únicamente durante esta actualización para abrir los EECC compatibles de este perfil. No se guarda ni se sincroniza.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            autofocus: true,
            obscureText: true,
            enableSuggestions: false,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Clave del PDF',
              border: OutlineInputBorder(),
            ),
            onSubmitted: _submit,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Ahora no'),
        ),
        FilledButton(
          onPressed: () => _submit(_controller.text),
          child: const Text('Abrir localmente'),
        ),
      ],
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
    final review = result.statementOutcomes
        .where(
          (item) => const <String>{
            'REVIEW_REQUIRED',
            'PDF_REJECTED',
            'FETCH_REJECTED',
          }.contains(item.status),
        )
        .length;
    final quarantined = result.statementOutcomes.where((item) => item.status == 'QUARANTINED_PROFILE').length;
    final monthly = result.productGate.monthlyClose;
    final pendingMappings = result.productGate.ownershipDecisions
        .where((item) => item.ownedNodeId == null)
        .length;
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
            _CoverageRow(
              label: 'Estado mensual',
              value: _monthlyStatusLabel(monthly?.status.name),
            ),
            if (result.productGate.accountMappingRequired)
              _CoverageRow(
                label: 'Mapeo de cuenta',
                value: pendingMappings > 0
                    ? 'Requerido · $pendingMappings'
                    : 'Requerido',
              )
            else if (result.productGate.ownershipDecisions.isNotEmpty)
              const _CoverageRow(label: 'Mapeo de cuenta', value: 'Confirmado'),
            _CoverageRow(label: 'Gmail observado', value: '${result.gmailEvidenceCount}'),
            _CoverageRow(label: 'EECC importados', value: '$imported'),
            _CoverageRow(label: 'EECC a revisar', value: '$review'),
            _CoverageRow(label: 'Perfiles en cuarentena', value: '$quarantined'),
            _CoverageRow(label: 'Relaciones pendientes', value: '${result.runtime.pendingResolutions.length}'),
            _CoverageRow(label: 'Gaps conocidos', value: '${result.projection.knowledgeGaps.length}'),
            if (result.productGate.blockingReasons.isNotEmpty)
              _CoverageRow(
                label: 'Bloqueos de cierre',
                value: '${result.productGate.blockingReasons.length}',
              ),
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
          if (item.accountDisplay != null) Text('Cuenta ${item.accountDisplay}'),
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

String? alpha2StatementOutcomeNotice(Alpha2PipelineResult result) {
  final outcomes = result.statementOutcomes;
  if (outcomes.any((item) => item.status == 'FETCH_REJECTED')) {
    return 'Uno o más adjuntos de EECC no pudieron recuperarse de Gmail. La actualización continuó sin inventar datos. Código local: A2_STATEMENT_FETCH_REJECTED.';
  }
  if (outcomes.any((item) => item.status == 'PDF_REJECTED')) {
    return 'Uno o más EECC no pudieron abrirse con la clave indicada o el lector PDF los rechazó. Código local: A2_STATEMENT_PDF_REJECTED.';
  }
  if (outcomes.any((item) => item.status == 'REVIEW_REQUIRED')) {
    return 'El EECC se abrió, pero el parser estricto no pudo certificar toda su estructura. No se importaron filas dudosas. Código local: A2_STATEMENT_STRICT_REVIEW.';
  }
  return null;
}

String alpha2SafeRefreshMessage(String safeCode) {
  final lead = switch (safeCode) {
    'A2_SESSION_REAUTH_REQUIRED' =>
      'La sesión de Gmail necesita volver a autorizarse.',
    'A2_PASSWORD_PROVIDER' =>
      'El diálogo local de la clave no pudo completar su ciclo de forma segura.',
    'A2_STATEMENT_HANDLE_RELEASE' =>
      'La custodia temporal del EECC no pudo cerrarse como se esperaba.',
    'A2_STATEMENT_VAULT_WRITE' ||
    'A2_GMAIL_VAULT_WRITE' ||
    'A2_VAULT_INITIALIZE' ||
    'A2_VAULT_READ' ||
    'A2_VAULT_SAFE_ROW_REJECTED' =>
      'El almacenamiento cifrado detuvo la actualización para proteger la consistencia.',
    'A2_STATEMENT_STRICT_PARSE' =>
      'El parser estricto del EECC detuvo la actualización sin importar datos dudosos.',
    'A2_CANONICAL_RUNTIME' || 'A2_PRODUCT_GATE' || 'A2_PUBLIC_PROJECTION' =>
      'La consolidación local detectó un estado que no puede materializar de forma segura.',
    'A2_INGRESS_SCAN' || 'A2_GMAIL_EVIDENCE_REJECTED' =>
      'La lectura financiera de Gmail se detuvo antes de consolidar datos.',
    _ => 'La actualización financiera se detuvo de forma segura.',
  };
  return '$lead Código local: $safeCode.';
}

String _truthLabel(String state) => switch (state) {
      'RECONCILED' => 'Reconciliado',
      'POSTED' => 'Contabilizado',
      'OBSERVED' => 'Observado',
      'PARTIAL' => 'Parcial',
      _ => 'Por confirmar',
    };

String _monthlyStatusLabel(String? state) => switch (state) {
      'reconciled' => 'Reconciliado',
      'reviewRequired' => 'Revisión requerida',
      'waitingForStatements' => 'Esperando EECC',
      'importing' => 'Importando',
      'reconciling' => 'Reconciliando',
      'reopened' => 'Reabierto',
      'openLive' => 'Mes abierto',
      _ => 'Sin cierre evaluado',
    };

String _money(double value, String currency) {
  final prefix = currency == 'PEN' ? 'S/' : currency == 'USD' ? r'$' : currency;
  return '$prefix ${value.toStringAsFixed(2)}';
}
