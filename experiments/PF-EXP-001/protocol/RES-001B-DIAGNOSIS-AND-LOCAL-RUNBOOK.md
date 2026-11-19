# RES-001B — diagnóstico previo y ejecución local
Fecha: 2026-11-19. Fuente inspeccionada: main 8baa8670e234264cbc282fb0d4c43fccee84aab1.
Estado: CODE_DIAGNOSIS_COMPLETE / PRIVATE_CASES_NOT_RUN / DESIGN_OPEN.
No modifica código, datos persistidos ni gates físicos.

## Hallazgos comprobados en código

1. En spikes/mobile-shell/lib/alpha2/alpha2_statement_geometry.dart, _savingsSemantic solo reconoce ingreso cuando hay abono y texto PLANILLA/SUELDO/REMUNERACION, y comisión cuando hay cargo y COMISION/MANTENIMIENTO/MANT. Para el resto devuelve unknown. La dirección cargo/abono sí se conserva. Por tanto un gran conjunto de filas UNKNOWN puede deberse a cobertura semántica deliberadamente limitada, no a pérdida de todas las filas. No se acredita que cada caso físico pertenezca a esta causa sin rastrear sus fuentes.
2. El mismo parser BCP ahorro guarda processDate en occurredAt y extrae valueDate, pero no lo conserva en processedAt. No confundir automáticamente fecha valor con fecha de consumo: el significado bancario de las dos columnas debe verificarse antes de corregir el contrato. La implementación sintetiza fechas documentales a las12:00 UTC; son un convenio técnico, no hora observada.
3. En Alpha2TransactionScanner.kt, la fecha occurredAt deriva de Gmail internalDate, convertido a Instant. No se extrae la fecha de operación del cuerpo. Es fecha de recepción usada como proxy; si falta, usa Instant.EPOCH. No debe presentarse como fecha económica acreditada.
4. RES-001A convierte a Lima al filtrar y presentar. La interfaz anterior mostraba directamente los componentes del DateTime. Un instante UTC cerca de medianoche puede cambiar de día en Lima; esto no prueba por sí solo cuál es la fecha de operación real. Las fechas documentales sin hora requieren una base temporal distinta de los instantes.
5. El decodificador de bóveda _semantic acepta variantes camelCase y UPPER_SNAKE_CASE de las semánticas existentes; no hay evidencia en este análisis de que un cambio de mayúsculas sea la causa general de UNKNOWN.

## Consecuencias y límites

No clasificar un cargo como compra solo por ser débito, ni un abono como salario solo por ser crédito. No declarar pérdida de significado en la bóveda sin comparar entrada y salida. No corregir filas existentes mediante borrado, intercambio global de fechas o regeneración de identidad. Reimportar una fuente IMPORTED no reescribe sus filas: una reparación persistida necesita diseño específico y respaldo.
Los seis rechazos físicos no se explican solo con un contador: no se atribuyen aquí todos a Ripley sin diagnósticos actuales por documento. Las capturas no permiten cerrar la causa de cada rechazo.

## Instrucción para Codex en la laptop

Ejecutar sobre el checkout que produjo el APK usado en la campaña; verificar commit, patch local, package/version y hash del APK. Conservar cambios y datos. No recompilar inicialmente. No subir PDFs, bases de datos, contraseñas, tokens, texto de correos, descripciones, importes personales, hashes de documentos privados ni identificadores bancarios. El trabajo privado y su manifiesto permanecen fuera de Git.

### A. Fechas

Conservar privadamente por caso: fecha original del documento/cuerpo, instante de recepción, valor recibido por Dart, valor almacenado y día presentado en UTC/Lima. Identificar la fuente de cada campo: OPERATION_DATE_ONLY, PROCESS_DATE_ONLY, VALUE_DATE_ONLY, OPERATION_INSTANT, MESSAGE_RECEIVED_INSTANT o UNKNOWN. Estos nombres son vocabulario propuesto de diagnóstico, no un esquema ya implementado.
Contrastar las compras cuyo día difiere entre pantallas, sin inferir el día correcto por el formato previo. Si no se dispone del mensaje original, marcar causa documental NOT_RUN; usar fixtures sintéticos para probar el mecanismo de conversión.
Salida pública permitida: conteos por base temporal y tipo de diferencia, estado PASS/FAIL/NOT_RUN y fixtures sintéticos. Ninguna fecha privada de fila es necesaria en el informe público.

### B. Semántica

Agrupar en privado por perfil/parser/version, canal, semanticType y flowDirection. Elegir al menos un caso de cada rama observada (ingreso reconocido, comisión reconocida, cargo desconocido, abono desconocido). Seguir fila -> parse -> mapa enviado a bóveda -> readSafeEvidence -> decodificador -> evento canónico -> resumen.
Comparar semántica y dirección sin usar el nombre del comercio como prueba de consumo. Publicar solo conteos y códigos como PARSER_UNKNOWN, DECODE_MISMATCH, RUNTIME_MISMATCH o INSUFFICIENT_SOURCE_CONTEXT. Si el parser ya emite UNKNOWN y se conserva, no reportar pérdida de datos.
No pedir al titular revisar todas las filas. Primero resolver causas comunes; preguntar únicamente por propiedad de cuentas, destino/beneficiario o uso personal/compartido que la evidencia no determine.

### C. Rechazos

Inventariar privadamente cada documento rechazado, perfil, versión del lector/parser y códigos seguros actuales. Reproducir con Alpha2SafeStructuredPdfReader y el adaptador Dart real: el parser Node no sustituye la autoridad móvil. Abrir PDFs localmente con mecanismo privado; no escribir claves en logs ni argumentos.
Identificar fila/encabezado/ciclo que impide interpretar, manteniendo evidencia privada. Crear fixture sintético equivalente antes de corregir. Verificar retry tras rechazo, segundo replay y conteo/efecto estables. No convertir rechazos en importaciones parciales.
Salida pública: IDs seudónimos de campaña no reversibles a documentos, perfil, códigos, versión, caso sintético de regresión y resultado; nunca contenido crudo.

### D. Acceso a datos

No dar por hecho que adb permite leer la bóveda SQLCipher. Si no hay exportación de diagnóstico segura ni acceso local autorizado, registrar esa limitación. Usar documentos originales disponibles o un harness aislado; no desinstalar, borrar datos, desactivar cifrado ni exportar claves para facilitar inspección. Una instrumentación adicional requiere evaluar el código y su alcance antes de usar datos reales.

## Diseño que debe cerrarse antes de BUILD de B

- Base temporal explícita y migración conservadora para datos legacy; recepción no equivale a operación, fecha valor no equivale a consumo.
- ReviewDecision persistente y append-only, tenant/actor/objetivo/versiones/motivo, idempotencia y conflictos; deshacer añade decisión y conserva evidencia.
- Vinculación de cuenta validada por tenant, moneda y tipo; una asignación no decide el significado del movimiento.
- Clasificación económica con evidencia y abstención. La dirección es un atributo, no la clasificación completa.
- API de resolver/posponer/deshacer, historial, migración transaccional, restauración y borrado.
- Política para reparar interpretaciones previas sin duplicar efectos ni alterar documentos; cambios de fecha no regeneran identidades.
- Reembolso vinculado exige relación económica acreditada y compensación acumulada acotada; no inferir por similitud.
- Pantallas humanas sin términos de contratos internos; agrupar pendientes por causa/impacto y conservar incertidumbre.

Salida requerida de laptop: informe sanitizado de causas, fixtures sintéticos, pruebas ejecutadas y límites. Con ello completar el diseño B y su aceptación; este documento no autoriza fingir cierre físico ni exige una nueva APK.
