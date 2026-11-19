import 'package:flutter/material.dart';
import 'alpha2_models.dart';
import 'alpha2_registered_summary.dart';
import 'alpha2_sensor_v1.dart';

class Alpha2RegisteredSummaryView extends StatefulWidget {
  const Alpha2RegisteredSummaryView({
    super.key,
    required this.tenantId,
    required this.events,
    required this.evidence,
    required this.updatedAt,
    this.confirmedAccounts = const {},
    this.clock = DateTime.now,
  });
  final String tenantId;
  final List<Alpha2CanonicalTransaction> events;
  final List<Alpha2Evidence> evidence;
  final Set<String> confirmedAccounts;
  final DateTime updatedAt;
  final DateTime Function() clock;
  @override
  State<Alpha2RegisteredSummaryView> createState() => _SummaryState();
}

class _SummaryState extends State<Alpha2RegisteredSummaryView> {
  late DateTime _month;
  bool _allHistory = false;
  String _account = 'all';
  int _visibleLimit = 40;
  @override
  void initState() {
    super.initState();
    final now = alpha2LimaTime(widget.clock());
    _month = DateTime.utc(now.year, now.month);
  }

  void _shift(int delta) => setState(() {
    _month = DateTime.utc(_month.year, _month.month + delta);
    _allHistory = false;
    _visibleLimit = 40;
  });
  @override
  Widget build(BuildContext context) {
    final accounts =
        widget.events
            .where((e) => e.tenantId == widget.tenantId)
            .map((e) => e.accountId)
            .whereType<String>()
            .where(widget.confirmedAccounts.contains)
            .toSet()
            .toList()
          ..sort();
    final accountValue =
        _account == 'all' ||
            _account == 'unassigned' ||
            accounts.contains(_account)
        ? _account
        : 'unassigned';
    final scope = Alpha2ReportScope(
      year: _allHistory ? null : _month.year,
      month: _allHistory ? null : _month.month,
      accountId: accountValue == 'all' || accountValue == 'unassigned'
          ? null
          : accountValue,
      unassignedOnly: accountValue == 'unassigned',
    );
    final summary = Alpha2RegisteredSummary(
      tenantId: widget.tenantId,
      scope: scope,
      events: widget.events,
      confirmedAccounts: widget.confirmedAccounts,
    );
    final now = widget.clock().toUtc();
    final historyStart = now.subtract(const Duration(days: 365));
    final recurrence = deriveAlpha2RecurringCandidates(
      widget.events
          .where(
            (e) =>
                e.tenantId == widget.tenantId &&
                !e.occurredAt.toUtc().isBefore(historyStart) &&
                !e.occurredAt.toUtc().isAfter(now) &&
                Alpha2ReportScope(
                  accountId: scope.accountId,
                  unassignedOnly: scope.unassignedOnly,
                ).includes(e, widget.confirmedAccounts),
          )
          .toList(),
    );
    final categories = <String, List<Alpha2CanonicalTransaction>>{};
    for (final e in summary.transactions) {
      if (alpha2ReportKind(e.semanticType) != Alpha2ReportKind.consumption &&
          alpha2ReportKind(e.semanticType) != Alpha2ReportKind.fee)
        continue;
      final category = e.categoryName?.trim();
      if (category == null || category.isEmpty) continue;
      categories
          .putIfAbsent('${e.currency.toUpperCase()} · $category', () => [])
          .add(e);
    }
    final categoryKeys = categories.keys.toList()..sort();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Resumen registrado',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const Text(
          'No es saldo disponible. Monedas separadas; fechas en America/Lima.',
        ),
        Text(
          'Actualizado: ${_date(widget.updatedAt)} ${alpha2LimaTime(widget.updatedAt).hour.toString().padLeft(2, '0')}:${alpha2LimaTime(widget.updatedAt).minute.toString().padLeft(2, '0')}',
        ),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          children: [
            IconButton(
              tooltip: 'Mes anterior',
              onPressed: () => _shift(-1),
              icon: const Icon(Icons.chevron_left),
            ),
            Text(
              _allHistory
                  ? 'Todo el historial'
                  : '${_month.month.toString().padLeft(2, '0')}/${_month.year}',
            ),
            IconButton(
              tooltip: 'Mes siguiente',
              onPressed: () => _shift(1),
              icon: const Icon(Icons.chevron_right),
            ),
            FilterChip(
              label: const Text('Todo el historial'),
              selected: _allHistory,
              onSelected: (value) => setState(() {
                _allHistory = value;
                _visibleLimit = 40;
              }),
            ),
          ],
        ),
        DropdownButtonFormField<String>(
          key: ValueKey(accountValue),
          initialValue: accountValue,
          isExpanded: true,
          isDense: false,
          itemHeight: null,
          decoration: const InputDecoration(labelText: 'Ámbito de cuentas'),
          items: [
            const DropdownMenuItem(
              value: 'all',
              child: Text('Todas las cuentas registradas'),
            ),
            const DropdownMenuItem(
              value: 'unassigned',
              child: Text('Sin cuenta confirmada'),
            ),
            for (final account in accounts)
              DropdownMenuItem(
                value: account,
                child: Text(_accountLabel(account)),
              ),
          ],
          onChanged: (value) => setState(() {
            _account = value ?? 'all';
            _visibleLimit = 40;
          }),
        ),
        const SizedBox(height: 8),
        Text(summary.coverageLabel),
        const Text(
          'Sin movimientos registrados no significa ausencia de actividad real.',
        ),
        const SizedBox(height: 8),
        if (summary.buckets.isEmpty)
          const Text('Sin movimientos registrados en esta selección.'),
        for (final bucket in summary.buckets)
          Card(
            child: ListTile(
              title: Text(alpha2ReportLabel(bucket.kind)),
              subtitle: Text(
                '${_money(bucket.minorUnits, bucket.currency)} · ${bucket.events.length} movimientos · Ver componentes',
              ),
              onTap: () => _openComponents(context, bucket),
            ),
          ),
        const SizedBox(height: 12),
        Text(
          'Pendientes de esta selección',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        Text(
          'Categoría: ${summary.categoryPendingCount} · Interpretación: ${summary.interpretationPendingCount}',
        ),
        const Text(
          'Las decisiones y su historial se habilitarán en el siguiente contrato.',
        ),
        const SizedBox(height: 12),
        Text('Categorías', style: Theme.of(context).textTheme.titleMedium),
        const Text(
          'Consumo y comisiones de la selección; excluye retiros, pagos y transferencias.',
        ),
        if (categories.isEmpty)
          const Text('Sin consumo o comisiones con categoría registrada.'),
        for (final key in categoryKeys)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(key),
            subtitle: Text(
              _money(
                categories[key]!.fold<int>(
                  0,
                  (s, e) => s + alpha2RegisteredMinorUnits(e.amount),
                ),
                categories[key]!.first.currency,
              ),
            ),
            onTap: () => _openComponents(
              context,
              Alpha2RegisteredBucket(
                currency: categories[key]!.first.currency,
                kind: Alpha2ReportKind.consumption,
                events: categories[key]!,
              ),
            ),
          ),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('Recurrentes: ventana histórica independiente'),
          subtitle: Text(
            '${_date(historyStart)} – ${_date(now)} · Candidatos, fuera de los totales del mes',
          ),
          children: [
            if (recurrence.isEmpty)
              const Text('No hay tres ocurrencias suficientes.'),
            for (final candidate in recurrence)
              ListTile(
                title: Text(candidate.merchantCanonical),
                subtitle: Text(
                  '${candidate.occurrenceCount} ocurrencias · ${candidate.currency}',
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Movimientos de la selección',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        Text('${summary.transactions.length} movimientos en la selección'),
        for (final event in summary.transactions.take(_visibleLimit))
          _eventTile(context, event),
        if (summary.transactions.length > _visibleLimit)
          TextButton(
            onPressed: () => setState(() => _visibleLimit += 40),
            child: Text(
              'Mostrar más (${summary.transactions.length - _visibleLimit} restantes)',
            ),
          ),
      ],
    );
  }

  Widget _eventTile(
    BuildContext context,
    Alpha2CanonicalTransaction e,
  ) => ListTile(
    key: ValueKey('res-event-${e.id}'),
    contentPadding: EdgeInsets.zero,
    title: Text(
      e.merchantCanonical ??
          alpha2ReportLabel(alpha2ReportKind(e.semanticType)),
    ),
    subtitle: Text(
      '${_money(alpha2RegisteredMinorUnits(e.amount), e.currency)} · ${_date(e.occurredAt)} · ${_truth(e.truthState)} · ${widget.confirmedAccounts.contains(e.accountId) ? _accountLabel(e.accountId!) : 'Sin cuenta confirmada'}',
    ),
    onTap: () => _openEvent(context, e),
  );

  void _openComponents(BuildContext context, Alpha2RegisteredBucket bucket) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(title: Text(alpha2ReportLabel(bucket.kind))),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                '${_money(bucket.minorUnits, bucket.currency)} · ${bucket.events.length} componentes',
              ),
              const Text(
                'Suma de importes registrados de esta selección y significado. No incluye otras clases de operación ni otras monedas.',
              ),
              if (bucket.kind == Alpha2ReportKind.refund ||
                  bucket.kind == Alpha2ReportKind.reversal)
                const Text(
                  'El modelo actual no acredita vínculos de compensación: no se resta del consumo.',
                ),
              for (final event in bucket.events) _eventTile(context, event),
            ],
          ),
        ),
      ),
    );
  }

  void _openEvent(BuildContext context, Alpha2CanonicalTransaction event) {
    final sources = alpha2LocalProvenance(
      event: event,
      tenantId: widget.tenantId,
      evidence: widget.evidence,
    );
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('Origen del movimiento')),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                event.merchantCanonical ?? 'Movimiento registrado',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                _money(
                  alpha2RegisteredMinorUnits(event.amount),
                  event.currency,
                ),
              ),
              Text(
                '${alpha2ReportLabel(alpha2ReportKind(event.semanticType))} · ${_truth(event.truthState)}',
              ),
              Text('Fecha económica: ${_date(event.occurredAt)}'),
              const Text(
                'Evidencia local. La interpretación no modifica el documento original.',
              ),
              if (sources.isEmpty) const Text('Fuente no disponible.'),
              for (final source in sources)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(switch (source.channel) {
                          Alpha2EvidenceChannel.gmailTransaction =>
                            'Observación de Gmail',
                          Alpha2EvidenceChannel.statementLedger =>
                            'Estado de cuenta',
                          _ => 'Evidencia local',
                        }),
                        Text(
                          'Referencia local: ${source.evidenceId} · Institución: ${source.institutionCode ?? 'No disponible'}',
                        ),
                        Text(
                          'Importe fuente: ${_money(alpha2RegisteredMinorUnits(source.amount), source.currency)}',
                        ),
                        Text('Operación: ${_date(source.occurredAt)}'),
                        Text(
                          'Procesamiento: ${source.processedAt == null ? 'No disponible' : _date(source.processedAt!)}',
                        ),
                        Text(
                          'Periodo documental: ${source.statementPeriodId ?? 'No disponible'}',
                        ),
                        Text('Estado: ${_truth(source.truthState)}'),
                      ],
                    ),
                  ),
                ),
              if (sources.length < event.evidenceIds.toSet().length)
                const Text('Parte del origen no está disponible.'),
            ],
          ),
        ),
      ),
    );
  }
}

String _accountLabel(String id) =>
    'Cuenta …${id.length > 6 ? id.substring(id.length - 6) : id}';
String _money(int minor, String currency) =>
    '${currency.toUpperCase()} ${(minor ~/ 100)}.${(minor.abs() % 100).toString().padLeft(2, '0')}';
String _date(DateTime instant) {
  final d = alpha2LimaTime(instant);
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

String _truth(Alpha2TruthState state) => switch (state) {
  Alpha2TruthState.observed => 'Observado',
  Alpha2TruthState.posted => 'Contabilizado',
  Alpha2TruthState.reconciled => 'Conciliado',
  Alpha2TruthState.partial => 'Parcial',
  Alpha2TruthState.unknown => 'Por confirmar',
};
