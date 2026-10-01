import 'dart:math' as math;

import 'package:flutter/material.dart';

void main() => runApp(const FinanceSensorApp());

class FinanceSensorApp extends StatelessWidget {
  const FinanceSensorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FinanceSensor Mobile Shell',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7B8CFF),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF080C14),
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

  static const pages = <Widget>[
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
          children: <Widget>[
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
        children: <Widget>[
          Icon(Icons.circle, size: 6, color: Color(0xFFFFB44D)),
          SizedBox(width: 6),
          Text(
            'PRODUCT LAB · DATOS 100% SINTÉTICOS',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: .4,
              color: Color(0xFFD8A85C),
            ),
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
      builder: (BuildContext context, BoxConstraints constraints) {
        final bool compact = constraints.maxHeight < 660;
        return Padding(
          padding: EdgeInsets.fromLTRB(14, compact ? 8 : 12, 14, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              PageHeader(
                eyebrow: 'Septiembre 2026',
                title: 'Tu dinero, en contexto.',
                compact: compact,
                trailing: const LivePill(),
              ),
              SizedBox(height: compact ? 6 : 9),
              Expanded(flex: 9, child: FinancialStateCard(compact: compact)),
              SizedBox(height: compact ? 6 : 8),
              const Expanded(
                flex: 4,
                child: Row(
                  children: <Widget>[
                    Expanded(child: MetricCard(value: 'S/ 1,520', label: 'Entró dinero')),
                    SizedBox(width: 7),
                    Expanded(child: MetricCard(value: 'S/ 934', label: 'Gastaste')),
                    SizedBox(width: 7),
                    Expanded(child: MetricCard(value: '38.6%', label: 'Ahorro')),
                  ],
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              const Expanded(
                flex: 7,
                child: Row(
                  children: <Widget>[
                    Expanded(child: CategoryCard()),
                    SizedBox(width: 8),
                    Expanded(child: BudgetCard()),
                  ],
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(flex: 4, child: SensorCallout(compact: compact)),
            ],
          ),
        );
      },
    );
  }
}

class PageHeader extends StatelessWidget {
  const PageHeader({
    required this.eyebrow,
    required this.title,
    this.trailing,
    this.compact = false,
    super.key,
  });

  final String eyebrow;
  final String title;
  final Widget? trailing;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                eyebrow,
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF8FA0B9),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                title,
                style: TextStyle(
                  fontSize: compact ? 18 : 21,
                  height: 1.02,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.65,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) ...<Widget>[
          const SizedBox(width: 8),
          trailing!,
        ],
      ],
    );
  }
}

class LivePill extends StatelessWidget {
  const LivePill({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1D19),
        border: Border.all(color: const Color(0xFF214838)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text(
        '● Sensor activo',
        style: TextStyle(
          fontSize: 9,
          color: Color(0xFF8EF0BE),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class FinancialStateCard extends StatelessWidget {
  const FinancialStateCard({required this.compact, super.key});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: panelDecoration(borderColor: const Color(0xFF26344F)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(13, compact ? 8 : 11, 13, 7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Estado financiero del mes',
                    style: TextStyle(fontSize: 9, color: Color(0xFF8FA0B9)),
                  ),
                ),
                Text(
                  '6 meses',
                  style: TextStyle(fontSize: 8, color: Color(0xFF71839F)),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                Text(
                  'S/ 586',
                  style: TextStyle(
                    fontSize: compact ? 24 : 29,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1.3,
                  ),
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Text(
                      '+S/ 84 vs. agosto',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 9,
                        color: Color(0xFF91E8BB),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
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

class MetricCard extends StatelessWidget {
  const MetricCard({required this.value, required this.label, super.key});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: panelDecoration(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryCard extends StatelessWidget {
  const CategoryCard({super.key});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: panelDecoration(),
      child: const Padding(
        padding: EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('¿Dónde se fue?', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
            SizedBox(height: 4),
            Expanded(
              child: Row(
                children: <Widget>[
                  Expanded(flex: 4, child: DonutChart()),
                  SizedBox(width: 5),
                  Expanded(flex: 6, child: CategoryLegend()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryLegend extends StatelessWidget {
  const CategoryLegend({super.key});

  static const List<(String, String, Color)> rows = <(String, String, Color)>[
    ('Comida', '26%', Color(0xFF7B8CFF)),
    ('Transp.', '18%', Color(0xFF5AC8FA)),
    ('Compras', '16%', Color(0xFFFFB44D)),
    ('Servicios', '13%', Color(0xFFA777FF)),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: rows.map((row) {
        return Expanded(
          child: Row(
            children: <Widget>[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: row.$3, shape: BoxShape.circle),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  row.$1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 7.5, color: Color(0xFF9AABC2)),
                ),
              ),
              Text(row.$2, style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800)),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class BudgetCard extends StatelessWidget {
  const BudgetCard({super.key});

  static const List<(String, double)> rows = <(String, double)>[
    ('Comida', .80),
    ('Transp.', .64),
    ('Compras', .76),
    ('Servicios', .53),
  ];

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: panelDecoration(),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text('Presupuesto', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            ...rows.map((row) {
              return Expanded(
                child: Row(
                  children: <Widget>[
                    SizedBox(
                      width: 43,
                      child: Text(
                        row.$1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 7.5, color: Color(0xFF8FA0B9)),
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: row.$2,
                          minHeight: 6,
                          backgroundColor: const Color(0xFF19263B),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF7B8CFF)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${(row.$2 * 100).round()}%',
                      style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class SensorCallout extends StatelessWidget {
  const SensorCallout({required this.compact, super.key});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => showOpportunitySheet(context),
        child: Ink(
          decoration: panelDecoration(
            borderColor: const Color(0xFF3A467D),
            accent: true,
          ),
          padding: EdgeInsets.symmetric(horizontal: 10, vertical: compact ? 5 : 7),
          child: const Row(
            children: <Widget>[
              SensorOrb(size: 30),
              SizedBox(width: 9),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'FinanceSensor encontró algo',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Delivery subió 61% frente a tu nivel habitual',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 5),
              Text(
                '~S/75 ›',
                style: TextStyle(fontSize: 10, color: Color(0xFFBBC3FF), fontWeight: FontWeight.w900),
              ),
            ],
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
    final List<DemoMovement> items = demoMovements.where((DemoMovement item) {
      final String haystack = '${item.merchant} ${item.category} ${item.type}'.toLowerCase();
      return haystack.contains(query.toLowerCase());
    }).toList();

    return Column(
      children: <Widget>[
        const Padding(
          padding: EdgeInsets.fromLTRB(14, 12, 14, 8),
          child: PageHeader(eyebrow: 'Explain Everything', title: 'Movimientos'),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 5),
          child: TextField(
            onChanged: (String value) => setState(() => query = value),
            style: const TextStyle(fontSize: 11),
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Buscar movimiento',
              prefixIcon: const Icon(Icons.search, size: 18),
              filled: true,
              fillColor: const Color(0xFF0E1624),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(9, 3, 9, 12),
            itemCount: items.length,
            itemBuilder: (BuildContext context, int index) => MovementTile(item: items[index]),
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
        decoration: BoxDecoration(
          color: const Color(0xFF152035),
          borderRadius: BorderRadius.circular(11),
        ),
        child: Text(
          item.merchant.substring(0, 1),
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
        ),
      ),
      title: Text(item.merchant, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
      subtitle: Text(
        '${item.category} · ${item.confidence}',
        style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
      ),
      trailing: Text(
        formatMoney(item.amount),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: item.amount >= 0 ? const Color(0xFF42D392) : Colors.white,
        ),
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
      builder: (BuildContext context, BoxConstraints constraints) {
        final bool compact = constraints.maxHeight < 660;
        return Padding(
          padding: EdgeInsets.fromLTRB(14, compact ? 8 : 12, 14, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              PageHeader(
                eyebrow: 'Financial Sensor',
                title: 'Lo que cambió.',
                compact: compact,
                trailing: const CountPill(text: '3 señales'),
              ),
              SizedBox(height: compact ? 7 : 10),
              Expanded(
                flex: 5,
                child: DecoratedBox(
                  decoration: panelDecoration(),
                  child: Padding(
                    padding: const EdgeInsets.all(9),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        SensorOrb(size: compact ? 34 : 42),
                        const SizedBox(height: 5),
                        const Text(
                          'Hay señales para mirar',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Cambios materiales, incertidumbre y oportunidades.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 3,
                child: SignalCard(
                  icon: Icons.auto_awesome,
                  title: 'Oportunidad',
                  subtitle: 'Delivery cambió este mes',
                  amount: '~S/75',
                  onTap: () => showOpportunitySheet(context),
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 3,
                child: SignalCard(
                  icon: Icons.priority_high,
                  title: 'Necesitamos tu ayuda',
                  subtitle: '1 movimiento con baja confianza',
                  amount: 'S/49.90',
                  onTap: () => showReviewSheet(context),
                ),
              ),
              SizedBox(height: compact ? 6 : 8),
              Expanded(
                flex: 3,
                child: SignalCard(
                  icon: Icons.trending_up,
                  title: 'Cambió',
                  subtitle: 'Transporte está 18% sobre tu promedio',
                  amount: '+S/25',
                  onTap: () => showChangeSheet(context),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class CountPill extends StatelessWidget {
  const CountPill({required this.text, super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF26344F)),
        borderRadius: BorderRadius.circular(999),
        color: const Color(0xFF101827),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 9, color: Color(0xFF9EB0C9), fontWeight: FontWeight.w700),
      ),
    );
  }
}

class SignalCard extends StatelessWidget {
  const SignalCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.onTap,
    super.key,
  });

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
          decoration: panelDecoration(),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            children: <Widget>[
              Container(
                width: 31,
                height: 31,
                decoration: BoxDecoration(
                  color: const Color(0xFF172238),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 16, color: const Color(0xFFB6C0FF)),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 5),
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
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const PageHeader(eyebrow: 'Tu espacio financiero', title: 'Tú'),
          const SizedBox(height: 11),
          MenuCard(
            icon: Icons.link,
            title: 'Conexiones',
            subtitle: 'Gmail Personal · demo sin OAuth real',
            onTap: () => showConnectionsSheet(context),
          ),
          const SizedBox(height: 8),
          MenuCard(
            icon: Icons.repeat,
            title: 'Pagos recurrentes',
            subtitle: 'Próximos 7 días · ~S/47.39',
            onTap: () => showRecurringSheet(context),
          ),
          const SizedBox(height: 8),
          MenuCard(
            icon: Icons.shield_outlined,
            title: 'Privacidad',
            subtitle: '0 correos reales guardados',
            onTap: () => showPrivacySheet(context),
          ),
          const SizedBox(height: 8),
          MenuCard(
            icon: Icons.science_outlined,
            title: 'Product Lab',
            subtitle: 'No conectado a Gmail, bancos ni backend',
            onTap: () => showLabSheet(context),
          ),
          const Spacer(),
          const Text(
            'MOBILE SHELL SPIKE · NO ES PRODUCCIÓN',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 8, color: Color(0xFF556780), fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class MenuCard extends StatelessWidget {
  const MenuCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    super.key,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Ink(
          decoration: panelDecoration(),
          padding: const EdgeInsets.all(12),
          child: Row(
            children: <Widget>[
              Icon(icon, size: 20, color: const Color(0xFFABB8FF)),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 8, color: Color(0xFF8FA0B9))),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Color(0xFF697B96)),
            ],
          ),
        ),
      ),
    );
  }
}

class SensorOrb extends StatelessWidget {
  const SensorOrb({required this.size, super.key});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(
          center: Alignment(-.35, -.4),
          colors: <Color>[Color(0xFFD2D7FF), Color(0xFF7B8CFF), Color(0xFF3949A6)],
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: const Color(0xFF7B8CFF).withValues(alpha: .22),
            blurRadius: 20,
          ),
        ],
      ),
    );
  }
}

class CashFlowChart extends StatelessWidget {
  const CashFlowChart({super.key});

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(
      painter: CashFlowPainter(),
      child: SizedBox.expand(),
    );
  }
}

class CashFlowPainter extends CustomPainter {
  const CashFlowPainter();

  static const List<double> spend = <double>[770.0, 845.0, 810.0, 890.0, 831.0, 934.0];
  static const List<double> income = <double>[1280.0, 1390.0, 1320.0, 1450.0, 1405.0, 1520.0];
  static const List<String> labels = <String>['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];

  @override
  void paint(Canvas canvas, Size size) {
    const double top = 4.0;
    const double bottom = 13.0;
    final double chartHeight = math.max<double>(1.0, size.height - top - bottom);
    final Paint gridPaint = Paint()
      ..color = const Color(0xFF1D2A40)
      ..strokeWidth = 1;

    for (final double ratio in <double>[.25, .5, .75]) {
      final double y = top + chartHeight * ratio;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    Offset point(int i, double value) {
      final double x = size.width * i / (labels.length - 1);
      final double y = top + (1600.0 - value) / 1600.0 * chartHeight;
      return Offset(x, y);
    }

    void drawSeries(List<double> values, Color color) {
      final Offset first = point(0, values.first);
      final Path path = Path()..moveTo(first.dx, first.dy);
      for (int i = 1; i < values.length; i++) {
        final Offset current = point(i, values[i]);
        path.lineTo(current.dx, current.dy);
      }
      canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.2
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }

    drawSeries(income, const Color(0xFF42D392));
    drawSeries(spend, const Color(0xFF7B8CFF));

    const TextStyle style = TextStyle(fontSize: 7, color: Color(0xFF687B99));
    for (int i = 0; i < labels.length; i++) {
      final TextPainter painter = TextPainter(
        text: TextSpan(text: labels[i], style: style),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(
        canvas,
        Offset(
          size.width * i / (labels.length - 1) - painter.width / 2,
          size.height - painter.height,
        ),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class DonutChart extends StatelessWidget {
  const DonutChart({super.key});

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(painter: DonutPainter(), child: SizedBox.expand());
  }
}

class DonutPainter extends CustomPainter {
  const DonutPainter();

  static const List<double> values = <double>[.26, .18, .16, .13, .12, .15];
  static const List<Color> colors = <Color>[
    Color(0xFF7B8CFF),
    Color(0xFF5AC8FA),
    Color(0xFFFFB44D),
    Color(0xFFA777FF),
    Color(0xFF42D392),
    Color(0xFF314057),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final double diameter = math.min<double>(size.width, size.height) * .82;
    final Rect rect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: diameter,
      height: diameter,
    );
    double start = -math.pi / 2;
    for (int i = 0; i < values.length; i++) {
      final double sweep = math.pi * 2 * values[i];
      canvas.drawArc(
        rect,
        start,
        sweep,
        false,
        Paint()
          ..color = colors[i]
          ..style = PaintingStyle.stroke
          ..strokeWidth = diameter * .19,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

BoxDecoration panelDecoration({
  Color borderColor = const Color(0xFF223047),
  bool accent = false,
}) {
  return BoxDecoration(
    color: accent ? const Color(0xFF11192A) : const Color(0xFF101725),
    border: Border.all(color: borderColor),
    borderRadius: BorderRadius.circular(18),
    gradient: accent
        ? const LinearGradient(
            colors: <Color>[Color(0xFF171C35), Color(0xFF101725)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : null,
  );
}

String formatMoney(double amount) {
  final String value = amount.abs().toStringAsFixed(2);
  return amount >= 0 ? '+S/ $value' : '-S/ $value';
}

Future<void> showFinanceSheet(BuildContext context, String title, Widget child) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF0F1725),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (BuildContext context) {
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
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              child,
            ],
          ),
        ),
      );
    },
  );
}

void showOpportunitySheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Oportunidad',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: '~S/75', label: 'impacto potencial · dato sintético'),
        DetailLine(label: 'Delivery habitual', value: 'S/122'),
        DetailLine(label: 'Este mes', value: 'S/197'),
        DetailLine(label: 'Cambio', value: '+61%'),
        SizedBox(height: 12),
        DemoButton(text: 'Crear un límite'),
      ],
    ),
  );
}

void showReviewSheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Necesitamos tu ayuda',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: 'S/49.90', label: 'movimiento detectado · baja confianza'),
        DetailLine(label: 'Estado', value: 'Revisión sintética'),
        DetailLine(label: 'Acción', value: 'Clasificar o descartar'),
      ],
    ),
  );
}

void showChangeSheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Cambio detectado',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: '+18%', label: 'Transporte vs. promedio reciente'),
        DetailLine(label: 'Promedio', value: 'S/139'),
        DetailLine(label: 'Actual', value: 'S/164'),
        DetailLine(label: 'Diferencia', value: '+S/25'),
      ],
    ),
  );
}

void showMovementSheet(BuildContext context, DemoMovement item) {
  showFinanceSheet(
    context,
    'Movimiento',
    Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: formatMoney(item.amount), label: '${item.merchant} · ${item.day} · ${item.time}'),
        DetailLine(label: 'Categoría', value: item.category),
        DetailLine(label: 'Tipo', value: item.type),
        DetailLine(label: 'Confianza', value: item.confidence),
        const DetailLine(label: 'Procedencia', value: 'evidencia sintética'),
        const SizedBox(height: 12),
        const DemoButton(text: 'Cambiar categoría'),
      ],
    ),
  );
}

void showRecurringSheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Pagos recurrentes',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: '~S/47.39', label: 'próximos 7 días'),
        DetailLine(label: 'Spotify · 4 sep', value: 'S/20.90'),
        DetailLine(label: 'Google One · 5 sep', value: 'S/7.49'),
        DetailLine(label: 'Netflix · 7 sep', value: 'S/19.00'),
      ],
    ),
  );
}

void showConnectionsSheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Conexiones',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        DetailLine(label: 'Gmail Personal', value: 'Activo · simulado'),
        DetailLine(label: 'Gmail Trabajo', value: 'Reconexión · simulada'),
        SizedBox(height: 10),
        Text(
          'OAuth real está deshabilitado en Mobile Shell.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 8, color: Color(0xFF8FA0B9)),
        ),
      ],
    ),
  );
}

void showPrivacySheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Privacidad',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        BigValue(value: '0', label: 'correos reales guardados en Mobile Shell'),
        DetailLine(label: 'Datos mostrados', value: '100% sintéticos'),
        DetailLine(label: 'OAuth real', value: 'Deshabilitado'),
        DetailLine(label: 'Backend financiero', value: 'No conectado'),
      ],
    ),
  );
}

void showLabSheet(BuildContext context) {
  showFinanceSheet(
    context,
    'Product Lab',
    const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        DetailLine(label: 'Red', value: 'No utilizada'),
        DetailLine(label: 'Credenciales', value: 'Ninguna'),
        DetailLine(label: 'Datos reales', value: 'Ninguno'),
        DetailLine(label: 'BUILD_READY', value: 'NO'),
      ],
    ),
  );
}

class BigValue extends StatelessWidget {
  const BigValue({required this.value, required this.label, super.key});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: <Widget>[
          Text(value, style: const TextStyle(fontSize: 31, fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 8.5, color: Color(0xFF8FA0B9)),
          ),
        ],
      ),
    );
  }
}

class DetailLine extends StatelessWidget {
  const DetailLine({required this.label, required this.value, super.key});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFF1B2940))),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF8FA0B9))),
          ),
          const SizedBox(width: 8),
          Text(value, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class DemoButton extends StatelessWidget {
  const DemoButton({required this.text, super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$text · acción sintética')),
          );
        },
        child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class DemoMovement {
  const DemoMovement({
    required this.day,
    required this.merchant,
    required this.category,
    required this.type,
    required this.amount,
    required this.confidence,
    required this.time,
  });

  final String day;
  final String merchant;
  final String category;
  final String type;
  final double amount;
  final String confidence;
  final String time;
}

const List<DemoMovement> demoMovements = <DemoMovement>[
  DemoMovement(
    day: 'Hoy',
    merchant: 'Uber',
    category: 'Transporte',
    type: 'Gasto',
    amount: -18.70,
    confidence: 'Alta',
    time: '11:24',
  ),
  DemoMovement(
    day: 'Hoy',
    merchant: 'Starbucks',
    category: 'Comida',
    type: 'Gasto',
    amount: -17.90,
    confidence: 'Alta',
    time: '09:18',
  ),
  DemoMovement(
    day: 'Hoy',
    merchant: 'Transferencia',
    category: 'Moviste dinero',
    type: 'Transferencia interna',
    amount: 100.0,
    confidence: 'Alta',
    time: '08:02',
  ),
  DemoMovement(
    day: 'Ayer',
    merchant: 'Netflix',
    category: 'Suscripciones',
    type: 'Pago recurrente',
    amount: -39.90,
    confidence: 'Alta',
    time: '21:41',
  ),
  DemoMovement(
    day: 'Ayer',
    merchant: 'Movimiento detectado',
    category: 'Necesitamos tu ayuda',
    type: 'Sin resolver',
    amount: -49.90,
    confidence: 'Revisar',
    time: '17:13',
  ),
  DemoMovement(
    day: '30 ago',
    merchant: 'Metro',
    category: 'Compras',
    type: 'Gasto',
    amount: -86.40,
    confidence: 'Media',
    time: '19:07',
  ),
];
