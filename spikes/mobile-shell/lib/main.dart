import 'dart:math' as math;

import 'package:flutter/material.dart';

void main() => runApp(const FinanceSensorApp());

class FinanceSensorApp extends StatelessWidget {
  const FinanceSensorApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF7B8CFF);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FinanceSensor Mobile Shell',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF080C14),
        fontFamily: 'sans',
        useMaterial3: true,
      ),
      home: const FinanceSensorShell(),
    );
  }
}

class FinanceSensorShell extends StatefulWidget {
  const FinanceSensorShell({super.key});

  @override
  State<FinanceSensorShell> createState() => _FinanceSensorShellState();
}

class _FinanceSensorShellState extends State<FinanceSensorShell> {
  int index = 0;
  final pages = const [
    HomePage(),
    MovementsPage(),
    SensorPage(),
    YouPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const SyntheticBanner(),
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
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Mov.'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Sensor'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Tú'),
        ],
      ),
    );
  }
}

class SyntheticBanner extends StatelessWidget {
  const SyntheticBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 25,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: Color(0xFF17150F),
        border: Border(bottom: BorderSide(color: Color(0xFF4B3B1F))),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 6, color: Color(0xFFFFB44D)),
          SizedBox(width: 6),
          Text(
            'PRODUCT LAB · DATOS 100% SINTÉTICOS',
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: .45, color: Color(0xFFD8A85C)),
          ),
        ],
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 650;
        return Padding(
          padding: EdgeInsets.fromLTRB(14, compact ? 9 : 13, 14, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _PageHeader(
                eyebrow: 'Septiembre 2026',
                title: 'Tu dinero, en contexto.',
                trailing: const _LivePill(),
                compact: compact,
              ),
              SizedBox(height: compact ? 7 : 10),
              Expanded(
                flex: 10,
                child: _FinancialStateCard(compact: compact),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 5,
                child: const Row(
                  children: [
                    Expanded(child: _MetricCard(value: 'S/ 1,520', label: 'Entró dinero')),
                    SizedBox(width: 7),
                    Expanded(child: _MetricCard(value: 'S/ 934', label: 'Gastaste')),
                    SizedBox(width: 7),
                    Expanded(child: _MetricCard(value: '38.6%', label: 'Tasa de ahorro')),
                  ],
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 8,
                child: const Row(
                  children: [
                    Expanded(child: _CategoryCard()),
                    SizedBox(width: 8),
                    Expanded(child: _BudgetCard()),
                  ],
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 5,
                child: _SensorCallout(compact: compact),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.eyebrow, required this.title, this.trailing, this.compact = false});

  final String eyebrow;
  final String title;
  final Widget? trailing;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(eyebrow, style: const TextStyle(fontSize: 10, color: Color(0xFF8FA0B9), fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(title, style: TextStyle(fontSize: compact ? 18 : 21, height: 1.02, fontWeight: FontWeight.w800, letterSpacing: -.65)),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );
  }
}

class _LivePill extends StatelessWidget {
  const _LivePill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1D19),
        border: Border.all(color: const Color(0xFF214838)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text('● Sensor activo', style: TextStyle(fontSize: 9, color: Color(0xFF8EF0BE), fontWeight: FontWeight.w700)),
    );
  }
}

class _FinancialStateCard extends StatelessWidget {
  const _FinancialStateCard({required this.compact});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: _panelDecoration(borderColor: const Color(0xFF26344F)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(13, compact ? 8 : 11, 13, 7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Expanded(child: Text('Estado financiero del mes', style: TextStyle(fontSize: 9, color: Color(0xFF8FA0B9)))),
                Text('Actualizado ahora', style: TextStyle(fontSize: 8, color: Color(0xFF71839F))),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('S/ 586', style: TextStyle(fontSize: compact ? 24 : 29, fontWeight: FontWeight.w900, letterSpacing: -1.3)),
                const SizedBox(width: 8),
                const Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Text('+S/ 84 vs. agosto', style: TextStyle(fontSize: 9, color: Color(0xFF91E8BB), fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 2),
            const Expanded(child: CashFlowChart()),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: _panelDecoration(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, letterSpacing: -.4)),
            ),
            const SizedBox(height: 3),
            Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9))),
          ],
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: _panelDecoration(),
      child: const Padding(
        padding: EdgeInsets.all(9),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Dónde se fue?', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
            SizedBox(height: 5),
            Expanded(
              child: Row(
                children: [
                  Expanded(flex: 4, child: DonutChart()),
                  SizedBox(width: 5),
                  Expanded(flex: 6, child: _CategoryLegend()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryLegend extends StatelessWidget {
  const _CategoryLegend();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Comida', '26%', Color(0xFF7B8CFF)),
      ('Transp.', '18%', Color(0xFF5AC8FA)),
      ('Compras', '16%', Color(0xFFFFB44D)),
      ('Servicios', '13%', Color(0xFFA777FF)),
      ('Suscrip.', '12%', Color(0xFF42D392)),
    ];
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: rows
          .map(
            (row) => Expanded(
              child: Row(
                children: [
                  Container(width: 6, height: 6, decoration: BoxDecoration(color: row.$3, shape: BoxShape.circle)),
                  const SizedBox(width: 5),
                  Expanded(child: Text(row.$1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 7.5, color: Color(0xFF9AABC2)))),
                  Text(row.$2, style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  const _BudgetCard();

  @override
  Widget build(BuildContext context) {
    const rows = [('Comida', .80), ('Transp.', .64), ('Compras', .76), ('Servicios', .53)];
    return DecoratedBox(
      decoration: _panelDecoration(),
      child: Padding(
        padding: const EdgeInsets.all(9),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Presupuesto', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            ...rows.map(
              (row) => Expanded(
                child: Row(
                  children: [
                    SizedBox(width: 47, child: Text(row.$1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 7.5, color: Color(0xFF8FA0B9)))),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: row.$2,
                          minHeight: 6,
                          backgroundColor: const Color(0xFF19263B),
                          valueColor: const AlwaysStoppedAnimation(Color(0xFF7B8CFF)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 5),
                    SizedBox(width: 24, child: Text('${(row.$2 * 100).round()}%', textAlign: TextAlign.end, style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800))),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SensorCallout extends StatelessWidget {
  const _SensorCallout({required this.compact});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => showOpportunitySheet(context),
        child: Ink(
          decoration: _panelDecoration(borderColor: const Color(0xFF3A467D), accent: true),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 10, vertical: compact ? 6 : 8),
            child: Row(
              children: [
                const _SensorOrb(size: 32),
                const SizedBox(width: 9),
                const Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('FinanceSensor encontró algo', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
                      SizedBox(height: 2),
                      Text('Delivery subió 61% frente a tu nivel habitual', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 8, color: Color(0xFF8FA0B9))),
                    ],
                  ),
                ),
                const SizedBox(width: 5),
                const Text('~S/75 ›', style: TextStyle(fontSize: 10, color: Color(0xFFBBC3FF), fontWeight: FontWeight.w900)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class MovementsPage extends StatefulWidget {
  const MovementsPage({super.key});

  @override
  State<MovementsPage> createState() => _MovementsPageState();
}

class _MovementsPageState extends State<MovementsPage> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final items = demoMovements.where((item) => '${item.merchant} ${item.category} ${item.type}'.toLowerCase().contains(query.toLowerCase())).toList();
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(14, 13, 14, 8),
          child: _PageHeader(eyebrow: 'Explain Everything', title: 'Movimientos'),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 6),
          child: TextField(
            onChanged: (value) => setState(() => query = value),
            style: const TextStyle(fontSize: 11),
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Buscar movimiento',
              hintStyle: const TextStyle(color: Color(0xFF6F819D), fontSize: 10),
              prefixIcon: const Icon(Icons.search, size: 18),
              filled: true,
              fillColor: const Color(0xFF0E1624),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: Color(0xFF223047))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: Color(0xFF223047))),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(9, 4, 9, 14),
            itemCount: items.length,
            itemBuilder: (context, index) => MovementTile(item: items[index]),
          ),
        ),
      ],
    );
  }
}

class MovementTile extends StatelessWidget {
  const MovementTile({required this.item, super.key});
  final DemoMovement item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      leading: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: const Color(0xFF152035), borderRadius: BorderRadius.circular(11)),
        child: Text(item.merchant.substring(0, 1), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
      ),
      title: Text(item.merchant, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
      subtitle: Text('${item.category} · ${item.confidence}', style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9))),
      trailing: Text(
        item.amount >= 0 ? '+S/ ${item.amount.toStringAsFixed(2)}' : '-S/ ${item.amount.abs().toStringAsFixed(2)}',
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: item.amount >= 0 ? const Color(0xFF42D392) : Colors.white),
      ),
      onTap: () => showMovementSheet(context, item),
    );
  }
}

class SensorPage extends StatelessWidget {
  const SensorPage({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 650;
        return Padding(
          padding: EdgeInsets.fromLTRB(14, compact ? 9 : 13, 14, 11),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _PageHeader(eyebrow: 'Financial Sensor', title: 'Lo que cambió.', trailing: const _CountPill(text: '3 señales'), compact: compact),
              SizedBox(height: compact ? 8 : 11),
              Expanded(
                flex: 6,
                child: DecoratedBox(
                  decoration: _panelDecoration(),
                  child: Padding(
                    padding: EdgeInsets.all(compact ? 8 : 12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _SensorOrb(size: compact ? 36 : 46),
                        SizedBox(height: compact ? 5 : 8),
                        Text('Hay señales para mirar', style: TextStyle(fontSize: compact ? 12 : 14, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 3),
                        const Text(
                          'No significa “bien” o “mal”. Resume cambios materiales, incertidumbre y oportunidades.',
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 8, height: 1.35, color: Color(0xFF8FA0B9)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(height: compact ? 7 : 9),
              Expanded(flex: 4, child: _SignalCard(icon: Icons.auto_awesome, title: 'Oportunidad', subtitle: 'Delivery cambió este mes', amount: '~S/75', onTap: () => showOpportunitySheet(context))),
              SizedBox(height: compact ? 6 : 8),
              Expanded(flex: 4, child: _SignalCard(icon: Icons.priority_high, title: 'Necesitamos tu ayuda', subtitle: '1 movimiento con baja confianza', amount: 'S/49.90', onTap: () => showReviewSheet(context))),
              SizedBox(height: compact ? 6 : 8),
              Expanded(flex: 4, child: _SignalCard(icon: Icons.trending_up, title: 'Cambió', subtitle: 'Transporte está 18% sobre tu promedio', amount: '+S/25', onTap: () => showChangeSheet(context))),
            ],
          ),
        );
      },
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(border: Border.all(color: const Color(0xFF26344F)), borderRadius: BorderRadius.circular(999), color: const Color(0xFF101827)),
        child: Text(text, style: const TextStyle(fontSize: 9, color: Color(0xFF9EB0C9), fontWeight: FontWeight.w700)),
      );
}

class _SignalCard extends StatelessWidget {
  const _SignalCard({required this.icon, required this.title, required this.subtitle, required this.amount, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final String amount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: _panelDecoration(),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          child: Row(
            children: [
              Container(width: 31, height: 31, decoration: BoxDecoration(color: const Color(0xFF172238), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 16, color: const Color(0xFFB6C0FF))),
              const SizedBox(width: 9),
              Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)), const SizedBox(height: 2), Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)))])),
              const SizedBox(width: 6),
              Text(amount, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      ),
    );
  }
}

class YouPage extends StatelessWidget {
  const YouPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 11),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _PageHeader(eyebrow: 'Tu espacio financiero', title: 'Tú'),
          const SizedBox(height: 12),
          _MenuCard(icon: Icons.link, title: 'Conexiones', subtitle: 'Gmail Personal · demo sin OAuth real', onTap: () => showConnectionsSheet(context)),
          const SizedBox(height: 8),
          _MenuCard(icon: Icons.repeat, title: 'Pagos recurrentes', subtitle: 'Próximos 7 días · ~S/47.39', onTap: () => showRecurringSheet(context)),
          const SizedBox(height: 8),
          _MenuCard(icon: Icons.shield_outlined, title: 'Privacidad', subtitle: '0 correos reales guardados', onTap: () => showPrivacySheet(context)),
          const SizedBox(height: 8),
          _MenuCard(icon: Icons.science_outlined, title: 'Product Lab', subtitle: 'No conectado a Gmail, bancos ni backend', onTap: () => showLabSheet(context)),
          const Spacer(),
          const Text(
            'MOBILE SHELL SPIKE · NO ES PRODUCCIÓN',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 8, color: Color(0xFF556780), fontWeight: FontWeight.w700, letterSpacing: .4),
          ),
        ],
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(15),
          child: Ink(
            decoration: _panelDecoration(),
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(icon, size: 20, color: const Color(0xFFABB8FF)),
                const SizedBox(width: 11),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)), const SizedBox(height: 2), Text(subtitle, style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)))])),
                const Icon(Icons.chevron_right, color: Color(0xFF697B96)),
              ],
            ),
          ),
        ),
      );
}

class _SensorOrb extends StatelessWidget {
  const _SensorOrb({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(center: Alignment(-.35, -.4), colors: [Color(0xFFD2D7FF), Color(0xFF7B8CFF), Color(0xFF3949A6)]),
          boxShadow: [BoxShadow(color: const Color(0xFF7B8CFF).withValues(alpha: .22), blurRadius: 20, spreadRadius: 1)],
        ),
      );
}

class CashFlowChart extends StatelessWidget {
  const CashFlowChart({super.key});

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: CashFlowPainter(),
        child: const SizedBox.expand(),
      );
}

class CashFlowPainter extends CustomPainter {
  final spend = const [770.0, 845, 810, 890, 831, 934];
  final income = const [1280.0, 1390, 1320, 1450, 1405, 1520];
  final labels = const ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];

  @override
  void paint(Canvas canvas, Size size) {
    const top = 4.0;
    const bottom = 13.0;
    final chartHeight = math.max(1, size.height - top - bottom);
    final gridPaint = Paint()..color = const Color(0xFF1D2A40)..strokeWidth = 1;
    for (final ratio in [.25, .5, .75]) {
      final y = top + chartHeight * ratio;
      canvas.drawLine(Offset.zero.translate(0, y), Offset(size.width, y), gridPaint);
    }

    Offset point(int i, double value) {
      final x = size.width * i / (labels.length - 1);
      final y = top + (1600 - value) / 1600 * chartHeight;
      return Offset(x, y);
    }

    void drawSeries(List<double> values, Color color) {
      final path = Path()..moveTo(point(0, values.first).dx, point(0, values.first).dy);
      for (var i = 1; i < values.length; i++) {
        final p = point(i, values[i]);
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 2.2..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round);
    }

    drawSeries(income, const Color(0xFF42D392));
    drawSeries(spend, const Color(0xFF7B8CFF));

    const style = TextStyle(fontSize: 7, color: Color(0xFF687B99));
    for (var i = 0; i < labels.length; i++) {
      final painter = TextPainter(text: TextSpan(text: labels[i], style: style), textDirection: TextDirection.ltr)..layout();
      painter.paint(canvas, Offset(size.width * i / (labels.length - 1) - painter.width / 2, size.height - painter.height));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class DonutChart extends StatelessWidget {
  const DonutChart({super.key});

  @override
  Widget build(BuildContext context) => CustomPaint(painter: DonutPainter(), child: const SizedBox.expand());
}

class DonutPainter extends CustomPainter {
  final values = const [.26, .18, .16, .13, .12, .15];
  final colors = const [Color(0xFF7B8CFF), Color(0xFF5AC8FA), Color(0xFFFFB44D), Color(0xFFA777FF), Color(0xFF42D392), Color(0xFF314057)];

  @override
  void paint(Canvas canvas, Size size) {
    final diameter = math.min(size.width, size.height) * .82;
    final rect = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: diameter, height: diameter);
    var start = -math.pi / 2;
    for (var i = 0; i < values.length; i++) {
      final sweep = math.pi * 2 * values[i];
      canvas.drawArc(rect, start, sweep, false, Paint()..color = colors[i]..style = PaintingStyle.stroke..strokeWidth = diameter * .19..strokeCap = StrokeCap.butt);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

BoxDecoration _panelDecoration({Color borderColor = const Color(0xFF223047), bool accent = false}) => BoxDecoration(
      color: accent ? const Color(0xFF11192A) : const Color(0xFF101725),
      border: Border.all(color: borderColor),
      borderRadius: BorderRadius.circular(18),
      gradient: accent ? const LinearGradient(colors: [Color(0xFF171C35), Color(0xFF101725)], begin: Alignment.topLeft, end: Alignment.bottomRight) : null,
    );

Future<void> _showSheet(BuildContext context, String title, Widget child) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1725),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: const Color(0xFF34425A), borderRadius: BorderRadius.circular(99)))),
              const SizedBox(height: 13),
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              child,
            ],
          ),
        ),
      ),
    );

void showOpportunitySheet(BuildContext context) => _showSheet(
      context,
      'Oportunidad',
      const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _BigValue(value: '~S/75', label: 'impacto potencial · dato sintético'),
          _DetailLine(label: 'Delivery habitual', value: 'S/122'),
          _DetailLine(label: 'Este mes', value: 'S/197'),
          _DetailLine(label: 'Cambio', value: '+61%'),
          SizedBox(height: 12),
          _DemoButton(text: 'Crear un límite'),
          _DemoTextButton(text: 'Está bien así'),
        ],
      ),
    );

void showReviewSheet(BuildContext context) => _showSheet(
      context,
      'Necesitamos tu ayuda',
      const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _BigValue(value: 'S/49.90', label: 'movimiento detectado · baja confianza'),
          SizedBox(height: 10),
          Wrap(spacing: 7, runSpacing: 7, alignment: WrapAlignment.center, children: [
            _ChoiceChip(text: 'Comida'),
            _ChoiceChip(text: 'Transporte'),
            _ChoiceChip(text: 'Compras'),
            _ChoiceChip(text: 'Otro'),
          ]),
          SizedBox(height: 7),
          _DemoTextButton(text: 'No es mío'),
        ],
      ),
    );

void showChangeSheet(BuildContext context) => _showSheet(
      context,
      'Cambio detectado',
      const Column(mainAxisSize: MainAxisSize.min, children: [
        _BigValue(value: '+18%', label: 'Transporte vs. promedio reciente'),
        _DetailLine(label: 'Promedio', value: 'S/139'),
        _DetailLine(label: 'Actual', value: 'S/164'),
        _DetailLine(label: 'Diferencia', value: '+S/25'),
      ]),
    );

void showMovementSheet(BuildContext context, DemoMovement item) => _showSheet(
      context,
      'Movimiento',
      Column(mainAxisSize: MainAxisSize.min, children: [
        _BigValue(value: item.amount >= 0 ? '+S/ ${item.amount.toStringAsFixed(2)}' : '-S/ ${item.amount.abs().toStringAsFixed(2)}', label: '${item.merchant} · ${item.day} · ${item.time}'),
        _DetailLine(label: 'Categoría', value: item.category),
        _DetailLine(label: 'Tipo', value: item.type),
        _DetailLine(label: 'Confianza', value: item.confidence),
        const _DetailLine(label: 'Procedencia', value: 'evidencia sintética'),
        const SizedBox(height: 12),
        const _DemoButton(text: 'Cambiar categoría'),
        const _DemoTextButton(text: 'Esto no es mío'),
      ]),
    );

void showRecurringSheet(BuildContext context) => _showSheet(
      context,
      'Pagos recurrentes',
      const Column(mainAxisSize: MainAxisSize.min, children: [
        _BigValue(value: '~S/47.39', label: 'próximos 7 días'),
        _DetailLine(label: 'Spotify · 4 sep', value: 'S/20.90'),
        _DetailLine(label: 'Google One · 5 sep', value: 'S/7.49'),
        _DetailLine(label: 'Netflix · 7 sep', value: 'S/19.00'),
      ]),
    );

void showConnectionsSheet(BuildContext context) => _showSheet(
      context,
      'Conexiones',
      const Column(mainAxisSize: MainAxisSize.min, children: [
        _DetailLine(label: 'Gmail Personal', value: 'Activo · simulado'),
        _DetailLine(label: 'Gmail Trabajo', value: 'Reconexión · simulada'),
        SizedBox(height: 12),
        _DemoButton(text: 'Conectar otra fuente'),
        SizedBox(height: 8),
        Text('OAuth real está deshabilitado en Mobile Shell.', textAlign: TextAlign.center, style: TextStyle(fontSize: 8, color: Color(0xFF8FA0B9))),
      ]),
    );

void showPrivacySheet(BuildContext context) => _showSheet(
      context,
      'Privacidad',
      const Column(mainAxisSize: MainAxisSize.min, children: [
        _BigValue(value: '0', label: 'correos reales guardados en Mobile Shell'),
        _DetailLine(label: 'Datos mostrados', value: '100% sintéticos'),
        _DetailLine(label: 'OAuth real', value: 'Deshabilitado'),
        _DetailLine(label: 'Backend financiero', value: 'No conectado'),
        _DetailLine(label: 'Producción móvil', value: 'No reclamada'),
      ]),
    );

void showLabSheet(BuildContext context) => _showSheet(
      context,
      'Product Lab',
      const Column(mainAxisSize: MainAxisSize.min, children: [
        _DetailLine(label: 'Objetivo', value: 'UX + viewport'),
        _DetailLine(label: 'Red', value: 'No utilizada'),
        _DetailLine(label: 'Credenciales', value: 'Ninguna'),
        _DetailLine(label: 'Datos reales', value: 'Ninguno'),
        _DetailLine(label: 'BUILD_READY', value: 'NO'),
      ]),
    );

class _BigValue extends StatelessWidget {
  const _BigValue({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(children: [
          Text(value, style: const TextStyle(fontSize: 31, fontWeight: FontWeight.w900, letterSpacing: -1.2)),
          const SizedBox(height: 3),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 8.5, color: Color(0xFF8FA0B9))),
        ]),
      );
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF1B2940)))),
        child: Row(children: [Expanded(child: Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF8FA0B9)))), const SizedBox(width: 8), Text(value, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800))]),
      );
}

class _DemoButton extends StatelessWidget {
  const _DemoButton({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$text · acción sintética'))),
          child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
        ),
      );
}

class _DemoTextButton extends StatelessWidget {
  const _DemoTextButton({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => TextButton(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$text · acción sintética'))),
        child: Text(text, style: const TextStyle(fontSize: 10)),
      );
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$text · clasificación sintética'))),
        child: Text(text, style: const TextStyle(fontSize: 9)),
      );
}

class DemoMovement {
  const DemoMovement({required this.day, required this.merchant, required this.category, required this.type, required this.amount, required this.confidence, required this.time});
  final String day;
  final String merchant;
  final String category;
  final String type;
  final double amount;
  final String confidence;
  final String time;
}

const demoMovements = [
  DemoMovement(day: 'Hoy', merchant: 'Uber', category: 'Transporte', type: 'Gasto', amount: -18.70, confidence: 'Alta', time: '11:24'),
  DemoMovement(day: 'Hoy', merchant: 'Starbucks', category: 'Comida', type: 'Gasto', amount: -17.90, confidence: 'Alta', time: '09:18'),
  DemoMovement(day: 'Hoy', merchant: 'Transferencia', category: 'Moviste dinero', type: 'Transferencia interna', amount: 100, confidence: 'Alta', time: '08:02'),
  DemoMovement(day: 'Ayer', merchant: 'Netflix', category: 'Suscripciones', type: 'Pago recurrente', amount: -39.90, confidence: 'Alta', time: '21:41'),
  DemoMovement(day: 'Ayer', merchant: 'Movimiento detectado', category: 'Necesitamos tu ayuda', type: 'Sin resolver', amount: -49.90, confidence: 'Revisar', time: '17:13'),
  DemoMovement(day: '30 ago', merchant: 'Metro', category: 'Compras', type: 'Gasto', amount: -86.40, confidence: 'Media', time: '19:07'),
  DemoMovement(day: '30 ago', merchant: 'Bembos', category: 'Comida', type: 'Gasto', amount: -28.50, confidence: 'Alta', time: '14:35'),
];
