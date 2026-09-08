import 'package:flutter/material.dart';

/// Session-only password prompt for a bank statement PDF.
///
/// The TextField intentionally has no externally-owned TextEditingController.
/// Flutter therefore owns the editing controller for exactly the lifetime of
/// the field/dialog route. This prevents a caller from disposing controller
/// state as soon as showDialog's result future completes while the route is
/// still running its reverse transition.
class Alpha2StatementPasswordDialog extends StatefulWidget {
  const Alpha2StatementPasswordDialog({
    super.key,
    required this.institutionCode,
    required this.productType,
  });

  final String institutionCode;
  final String productType;

  @override
  State<Alpha2StatementPasswordDialog> createState() =>
      _Alpha2StatementPasswordDialogState();
}

class _Alpha2StatementPasswordDialogState
    extends State<Alpha2StatementPasswordDialog> {
  String _sessionValue = '';
  bool _completed = false;

  void _submit([String? submittedValue]) {
    if (_completed || !mounted) return;
    final value = submittedValue ?? _sessionValue;
    if (value.isEmpty) return;
    _completed = true;
    Navigator.of(context).pop(value);
  }

  void _cancel() {
    if (_completed || !mounted) return;
    _completed = true;
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    // Dart Strings cannot be reliably zeroized. This only drops this widget's
    // reference; no memory-zeroization claim is made.
    _sessionValue = '';
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Abrir estado de cuenta'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${widget.institutionCode} · ${widget.productType}',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'La clave se usa únicamente para abrir este PDF en esta sesión. No se guarda ni se sincroniza.',
          ),
          const SizedBox(height: 16),
          TextField(
            autofocus: true,
            obscureText: true,
            enableSuggestions: false,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Clave del PDF',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) => _sessionValue = value,
            onSubmitted: _submit,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _cancel,
          child: const Text('Ahora no'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Abrir localmente'),
        ),
      ],
    );
  }
}

Future<String?> showAlpha2StatementPasswordDialog({
  required BuildContext context,
  required String institutionCode,
  required String productType,
}) {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (_) => Alpha2StatementPasswordDialog(
      institutionCode: institutionCode,
      productType: productType,
    ),
  );
}
