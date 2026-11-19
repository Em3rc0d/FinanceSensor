# PF-RES-001 — Comprensión financiera verificable
Fecha: 2026-11-19. Base auditada: 35d1edbe976dc76ffd75a7172190bd4c1037729f.
Estado: RES-001A_IMPLEMENTED / AUTOMATED_VALIDATION; PHYSICAL_OPEN. RES-001B permanece DESIGN_OPEN. No acredita cierre físico ni release.

## Autoridad y alcance
Continúa RECOVER-2026-11-19 y PF-EXP-001 bajo GALACTIC → DISCOVER → ABSTRACT → GRAVITY → CONTRACT → BUILD → VALIDATE. Trazabilidad: DC-03 interpretación, DC-04 procedencia, DC-05 cobertura, DC-08 tiempo, DC-20 pendientes. La visión completa no se convierte en backlog inmediato.
Se divide la ejecución para no introducir persistencia de decisiones sin diseño: RES-001A es lectura explicable; RES-001B, posterior, será resolución con historia. Este contrato habilita implementar A; B permanece DESIGN_OPEN.

## Evidencia de código
- alpha2_sensor_v1.dart: deriveAlpha2CashflowByCurrency suma income y expense/fee/cashWithdrawal/servicePayment; excluye cardPayment, transferencias, refund y reversal. No representa por sí sola caja bancaria ni consumo neto.
- alpha2_projection.dart: buildAlpha2PublicProjection recibe toda la lista canónica y no aplica selección temporal o de cuenta. La entrada podría acotarse antes, pero el builder no garantiza ese límite.
- main_alpha2.dart: _Cashflow presenta ese agregado como Flujo/Entró/Salió.
- deriveAlpha2KnowledgeGaps consulta categoría para cada evento, incluidas semánticas que no necesitan categoría de consumo.
- La proyección pública minimizada no transporta vínculos suficientes para un detalle completo de fuente. La inspección local de evidencia debe permanecer fuera de la exportación pública.
Estas son observaciones de código; no prueban importes del corpus privado.

## RES-001A — decisiones cerradas
1. Vista inicial: Resumen registrado, con leyenda No es saldo disponible. Mostrar Ingresos registrados, Consumo identificado, Comisiones identificadas, Retiros de efectivo y Operaciones pendientes de interpretar por separado; no presentar un neto como saldo ni flujo de caja. Una compra a crédito es consumo, no egreso de caja confirmado. Retiros no son consumo sin evidencia de destino.
2. Reembolsos/reversiones solo compensan consumo cuando existe vínculo canónico válido y límite acumulativo; sin vínculo se muestran separados y pendientes. No inferir compensación por proximidad.
3. Periodo obligatorio con límites [inicio, fin), fecha económica occurredAt y zona America/Lima. Elegir el mes actual mediante reloj inyectable. Opción Todo el historial debe quedar explícita. No usar fecha de recepción como fecha económica. Mantener processedAt como dato distinto.
4. Ámbito: Todas las cuentas registradas o cuenta confirmada. Mostrar operaciones sin cuenta como grupo separado. No asignarlas por banco/importe. Permitir verlas explícitamente, sin agregarlas a una cuenta seleccionada.
5. La misma selección gobierna resumen, categorías y movimientos. Recurrencias usan una ventana histórica explícita independiente, nunca presentada como parte del total del mes.
6. Calcular nuevos agregados en unidades menores enteras y conservar moneda; no modificar identidades ni evidencia para corregir presentación. No cambiar silenciosamente el significado del contrato público ALPHA2_PUBLIC_DASHBOARD_V1: usar un view-model local nuevo; cualquier cambio del contrato público requiere versión y consumidores revisados.
7. Tocar una cifra abre sus componentes exactos, incluidos/excluidos y regla de cálculo. Tocar movimiento muestra procedencia local, fechas disponibles, estado de verdad y semántica. Fuente ausente se declara; no fabricar enlaces. Nunca exportar IDs Gmail, PDFs ni secretos mediante la proyección pública.
8. Categoría faltante solo genera tarea para consumo/comisiones/servicios elegibles. Transferencias, pagos de tarjeta, ingreso, retiro y semántica desconocida no generan automáticamente tarea de categoría: desconocidos van a interpretación. Un dato desconocido nunca se convierte en Otros sin decisión.
9. Cobertura de la selección: no heredar RECONCILED de un mes a otros periodos/cuentas. Si la cobertura no coincide con el ámbito, mantener parcial y explicar qué falta. Sin movimientos no equivale a cero actividad real.
10. UI: cabecera compacta con periodo, ámbito y actualización; resumen y acceso a pendientes; detalle progresivo. Textos legibles, escalado de fuente y lectores de pantalla. Sin diagnósticos técnicos en la vista principal.

## Arquitectura de A
Agregar selector/view-model local puro de alcance y componentes, reutilizando transacciones canónicas y evidenceInputs. Evitar cambiar importación, migración o reconciliación como efecto secundario del filtro.
El detalle de procedencia se resuelve localmente desde el runtime canónico a evidencia segura, con aislamiento de tenant; si no existe enlace se muestra No disponible. No hacer llamadas Gmail para abrir una cifra.
Archivos afectados a evaluar: alpha2_sensor_v1.dart, alpha2_projection.dart, alpha2_dashboard_insights.dart, alpha2_dashboard_sections.dart, main_alpha2.dart y tests. Mantener validadores históricos.
Los filtros no escriben datos ni exigen migración. B sí necesita especificación de persistencia antes de build.

## Criterios verificables de A
| ID | Caso | Resultado |
|---|---|---|
| A01 | Dos meses, dos cuentas, PEN/USD y cuenta desconocida | Componentes y lista comparten selección exacta; monedas separadas |
| A02 | Límite de mes en UTC versus Lima | Inclusión por fecha económica en zona declarada y fin exclusivo |
| A03 | Compra100 a crédito y pago100 | Consumo100, pago separado, sin consumo200 ni caja inventada |
| A04 | Retiro100 y transferencia100 | Ninguno aparece como consumo sin evidencia adicional |
| A05 | Reembolso parcial vinculado y sin vincular | Compensación acotada solo del primero; segundo separado |
| A06 | Total sin categoría, transferencia y desconocido | Tarea de categoría solo para elegibles; desconocido pide interpretación |
| A07 | Abrir cifra y movimiento | Suma exacta de componentes y origen verificable; fuente ausente explícita |
| A08 | Mes conciliado y otro parcial | No hereda estado conciliado a otro ámbito |
| A09 | Repetir filtros, refrescar y reiniciar | No crea evidencia ni cambia importes/IDs; sin pérdida de datos |
| A10 | Texto ampliado y lector de pantalla | Acciones legibles, alcanzables y etiquetadas |
Validación: pruebas unitarias de selectores/semántica, widgets para navegación/alcance, analyze y suite Flutter completa. Validar sanitización de proyección pública y regresiones de importación. Ejecutar en laptop si Flutter no está disponible aquí; no sustituir Dart con Node.

## RES-001B — diseño pendiente y dependencia
Debe definir ReviewDecision persistente con identidad estable de objetivo, tenant, actor, versión previa/nueva, motivo, estado y fechas; corrección y reversión son nuevas decisiones, no edición de evidencia.
Estados conceptuales: OPEN → DEFERRED o RESOLVED; reapertura ante evidencia contradictoria; posponer no resuelve incertidumbre. Idempotencia y concurrencia deben diseñarse antes de persistir.
Operaciones previstas: vincular cuenta compatible, aclarar significado, categorizar, posponer, deshacer, reintentar extracción cuando corresponda. Resolver mapeo debe validar tenant/moneda/tipo; no aceptar un nodeId arbitrario.
Salida de diseño B: esquema/migración y rollback, API de comandos, conflictos/replay, política de restauración/borrado, wireframes y pruebas. No implementar B usando mapas de memoria ni etiquetas que simulen persistencia.

## Campaña física separada
Sobre la instalación y fuentes privadas de laptop/teléfono:
- Registrar versión/APK/certificado y respaldo recuperable antes de actualización. No borrar datos de la app.
- Ejecutar migración real schema1→2 en Android/SQLCipher: filas/importes/fechas preservados, processedAt antiguo null, nueva escritura y lectura correctas. Si solo existe schema2, el gate schema1 requiere fixture de prueba aislado; no degradar la bóveda real.
- Probar documentos exactos que fallaron Ripley/BCP y comparar filas/fechas/importes/moneda con referencia independiente.
- Replay/retry, reinicio y conservación de decisiones. Diferenciar muestra de formatos de compatibilidad universal.
- Exportar solo recibo sanitizado con PASS/FAIL/NOT_RUN y límites; claves/PDFs/bases permanecen locales.
Esta campaña no se ha ejecutado en esta sesión. No usar el certificado del APK como prueba de corrección financiera.

## Cierre
A cierra con implementación y aceptación específica, no por existencia de este archivo. Integrar un candidato local tras pruebas; sin APKs por slice ni Actions para APKs.
La comparación de esfuerzo humano y conciliación completa de PF-EXP-001 permanecen abiertas; no se declaran GO público, G-MK0 cerrado ni releaseReady.


## Recibo de implementación — RES-001A, 2026-11-19
Implementado en alpha2_registered_summary.dart y alpha2_registered_summary_view.dart, integrado en main_alpha2.dart. La evidencia segura disponible en pipeline se expone solo al detalle local; ALPHA2_PUBLIC_DASHBOARD_V1 no cambia. Periodo/cuenta, clases económicas y categorías derivan del mismo conjunto; recurrencias tienen ventana separada de365 días. Historial visible carga40 movimientos por bloque, sin limitar los totales. Diagnóstico global queda desplegable y distingue importación nueva de replay.

Límite explícito de A05: el modelo canónico vigente no transporta un vínculo económico de reembolso/reversión a compra. Todos se muestran separados; no se fabricó una relación ni se usó coincidencia de importe como autoridad. El caso vinculado continúa sin integración hasta existir esa autoridad de dominio. La cobertura del resumen se mantiene parcial al no disponer de certificado exacto de ámbito.

Pruebas y límites: ver ../receipts/RES-001A-BUILD-VALIDATE-2026-11-19.json. Validación automatizada no cierra corpus privado, migración SQLCipher física, restauración nativa ni uso real de lector de pantalla. Este cambio no genera APK.
