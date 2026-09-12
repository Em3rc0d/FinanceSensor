import 'package:flutter/material.dart';

import 'alpha2_dashboard_insights.dart';
import 'alpha2_projection.dart';

/// Read-only product surface over the minimized Alpha.2 projection.
///
/// This widget never computes canonical truth, reconciliation, coverage or
/// recurrence. It only renders already-derived public data plus deterministic
/// category/gap grouping for presentation.
class Alpha2FinanceInsightsSections extends StatelessWidget {
  const Alpha2FinanceInsightsSections({
    super.key,
    required this.projection,
  });

  final Alpha2PublicDashboardProjection projection;

  @override
  Widget build(BuildContext context) {
    final categories = summarizeAlpha2Categories(projection);
    final gaps = summarizeAlpha2KnowledgeGaps(projection);
    final recurring = projection.recurringCandidates;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Categorías', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('Solo egresos de caja; pagos de tarjeta y transferencias no inflan estas cifras.'),
        const SizedBox(height: 10),
        if (categories.isEmpty)
          const _EmptyInsight(
            text: 'Todavía no hay egresos con categoría suficiente.',
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  for (var index = 0; index < categories.length; index++) ...[
                    _InsightRow(
                      title: categories[index].category,
                      subtitle:
                          '${categories[index].transactionCount} movimiento${categories[index].transactionCount == 1 ? '' : 's'} · ${categories[index].currency}',
                      value: _money(
                        categories[index].expense,
                        categories[index].currency,
                      ),
                    ),
                    if (index != categories.length - 1)
                      const Divider(height: 18),
                  ],
                ],
              ),
            ),
          ),
        const SizedBox(height: 22),
        Text('Recurrentes', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('Patrones observados; son candidatos, no compromisos futuros.'),
        const SizedBox(height: 10),
        if (recurring.isEmpty)
          const _EmptyInsight(
            text: 'Aún no hay tres ocurrencias suficientes para marcar un patrón.',
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  for (var index = 0; index < recurring.length; index++) ...[
                    _InsightRow(
                      title: recurring[index].merchantCanonical,
                      subtitle:
                          '${_cadence(recurring[index].cadence)} · ${recurring[index].occurrenceCount} ocurrencias · Observado',
                      value: _money(
                        recurring[index].medianAmount,
                        recurring[index].currency,
                      ),
                    ),
                    if (index != recurring.length - 1)
                      const Divider(height: 18),
                  ],
                ],
              ),
            ),
          ),
        const SizedBox(height: 22),
        Text('Lo que falta confirmar', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('FinanceSensor muestra los vacíos en vez de convertirlos en certeza falsa.'),
        const SizedBox(height: 10),
        if (gaps.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline),
                  SizedBox(width: 10),
                  Expanded(child: Text('No hay gaps conocidos en la proyección actual.')),
                ],
              ),
            ),
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  for (var index = 0; index < gaps.length; index++) ...[
                    _GapRow(
                      title: _gapLabel(gaps[index].reason),
                      count: gaps[index].count,
                    ),
                    if (index != gaps.length - 1)
                      const Divider(height: 18),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _InsightRow extends StatelessWidget {
  const _InsightRow({
    required this.title,
    required this.subtitle,
    required this.value,
  });

  final String title;
  final String subtitle;
  final String value;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.white60),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      );
}

class _GapRow extends StatelessWidget {
  const _GapRow({required this.title, required this.count});

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          const Icon(Icons.info_outline, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(title)),
          if (count > 1)
            Text('×$count', style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      );
}

class _EmptyInsight extends StatelessWidget {
  const _EmptyInsight({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(text),
        ),
      );
}

String _cadence(String cadence) => switch (cadence.toUpperCase()) {
      'WEEKLY' => 'Semanal',
      'MONTHLY' => 'Mensual',
      'QUARTERLY' => 'Trimestral',
      'YEARLY' => 'Anual',
      _ => 'Patrón',
    };

String _gapLabel(String reason) => switch (reason) {
      'ACCOUNT_MAPPING_REQUIRED' => 'Falta confirmar a qué cuenta pertenece un EECC',
      'CATEGORY_SIGNAL_INSUFFICIENT' => 'Hay movimientos sin categoría suficiente',
      'MISSING_STATEMENT' => 'Falta un estado de cuenta esperado',
      'BLOCKING_CONFLICT' => 'Hay un conflicto que requiere revisión',
      'UNRESOLVED_ITEM' => 'Hay movimientos pendientes de reconciliar',
      'STATEMENT_PASSWORD_REQUIRED' => 'La clave del EECC fue omitida en esta actualización',
      'STATEMENT_REAUTH_REQUIRED' => 'Gmail requiere volver a autorizarse para descargar EECC',
      'STATEMENT_FETCH_NETWORK_RETRY_EXHAUSTED' => 'La descarga del EECC agotó los reintentos de red',
      'STATEMENT_FETCH_RATE_LIMITED' => 'Gmail limitó temporalmente la descarga del EECC',
      'STATEMENT_FETCH_SERVICE_TEMPORARY' => 'Gmail no pudo entregar temporalmente el EECC',
      'STATEMENT_FETCH_ACCESS_REJECTED' => 'Gmail rechazó el acceso al adjunto del EECC',
      'STATEMENT_ATTACHMENT_NOT_FOUND' => 'El adjunto del EECC ya no está disponible en Gmail',
      'STATEMENT_ATTACHMENT_INVALID' => 'Gmail devolvió un adjunto de EECC inválido o incompleto',
      'STATEMENT_PDF_SIGNATURE_INVALID' => 'El adjunto recibido no tiene una firma PDF válida',
      'STATEMENT_FETCH_REJECTED' => 'No se pudo descargar un EECC desde Gmail',
      'STATEMENT_PDF_REJECTED' => 'El PDF o su clave no pudieron abrirse localmente',
      'STATEMENT_STRICT_REVIEW_REQUIRED' => 'El EECC llegó al parser estricto y requiere revisión',
      'STATEMENT_PERSISTENCE_REJECTED' => 'El EECC no pudo guardarse en el almacén cifrado',
      _ => 'Hay información pendiente de confirmar',
    };

String _money(double value, String currency) {
  final prefix = currency == 'PEN' ? 'S/' : currency == 'USD' ? r'$' : currency;
  return '$prefix ${value.toStringAsFixed(2)}';
}
