# WF-001 — FinanceSensor Signature Wireframes

These wireframes freeze **hierarchy, composition, density, navigation and interaction** before visual polish. If the product is recognizable in grayscale, the structure is doing its job.

## Signature language

FinanceSensor surfaces follow four recurring structural patterns:

1. **State first** — the primary financial answer is visually dominant.
2. **Explainable summary** — secondary information supports the answer, not decoration.
3. **Sensor signal** — Opportunity / Changed / Review are consistent interaction objects.
4. **One action** — detail screens make the next decision obvious.

---

# S-01 — Home

**Question:** ¿Cómo está mi dinero?

```text
┌────────────────────────────┐
│ Agosto                  ●  │
│                            │
│ S/ 1,520      S/ 934       │
│ Entró         Gastaste     │
│                            │
│ ──────── S/ 586 ─────────  │
│          Diferencia        │
│                            │
│ ¿Dónde se fue?             │
│ 🍔 S/241   🚕 S/164        │
│ 🛒 S/151                    │
│                            │
│ Próximos 7 días   ~S/47    │
│                            │
│ ✦ 1 oportunidad            │
│ ! 1 por revisar            │
│                            │
├────────────────────────────┤
│ Inicio   Mov.  Sensor  Tú  │
└────────────────────────────┘
```

### Contract

```text
PRIMARY DATA
money_in
money_spent
net_difference

SECONDARY
Top 3 categories
Upcoming expected/known amount
Opportunity count
Review count

SCROLL
NO
```

The Home never lists every category or every recurring charge.

---

# S-02 — Movements

**Question:** ¿Qué pasó con mi dinero?

```text
┌────────────────────────────┐
│ Movimientos          Buscar│
│                            │
│ Hoy                        │
│                            │
│ Uber                 -18.70│
│ Transporte                 │
│                            │
│ Starbucks            -17.90│
│ Comida                     │
│                            │
│ Transferencia        100.00│
│ Moviste dinero             │
│                            │
│ Ayer                       │
│ Netflix              -39.90│
│ Pago recurrente            │
│                            │
│            ⋮               │
├────────────────────────────┤
│ Inicio   Mov.  Sensor  Tú  │
└────────────────────────────┘
```

### Contract

```text
SCROLL
YES — the domain is intrinsically chronological.
```

Movement rows must expose semantic meaning, not merely raw bank signs.

---

# S-03 — Transaction Detail

**Question:** ¿Qué fue este movimiento y por qué FinanceSensor cree eso?

```text
┌────────────────────────────┐
│ ← Movimiento               │
│                            │
│ Starbucks                  │
│ S/17.90                    │
│ 31 ago · 16:42             │
│                            │
│ Categoría                  │
│ Comida                 ›   │
│                            │
│ Tipo                       │
│ Gasto                      │
│                            │
│ Detectado mediante         │
│ ✓ correo del banco         │
│ ✓ comprobante              │
│                            │
│ Confianza: Alta            │
│                            │
│ [ Cambiar categoría ]      │
│        Esto no es mío      │
└────────────────────────────┘
```

Evidence details can open a separate list if the proof does not fit.

---

# S-04 — Financial Sensor

**Question:** ¿Qué cambió o necesita mi atención?

```text
┌────────────────────────────┐
│ Financial Sensor           │
│                            │
│            ●               │
│        Todo normal         │
│                            │
│ ─────────────────────────  │
│                            │
│ ✦ Oportunidad              │
│ Puedes conservar ~S/75     │
│                            │
│ ↗ Cambio                   │
│ Delivery aumentó           │
│                            │
│ ! Revisar                  │
│ 1 movimiento               │
│                            │
├────────────────────────────┤
│ Inicio   Mov.  Sensor  Tú  │
└────────────────────────────┘
```

### Status rule

`Todo normal` does not mean the user is financially “good.” It means the engine has no material sensor condition to surface under current rules.

---

# S-05 — Opportunity

**Question:** ¿Qué oportunidad encontraste y cuánto podría representar?

```text
┌────────────────────────────┐
│ ← Oportunidad              │
│                            │
│ Delivery                   │
│                            │
│          S/197             │
│         este mes           │
│                            │
│ Habitual        S/122      │
│ Diferencia       S/75      │
│                            │
│ Volver cerca de tu nivel   │
│ habitual podría dejarte    │
│ ~S/75 adicionales.         │
│                            │
│ [ Crear un límite ]        │
│                            │
│       Está bien así        │
└────────────────────────────┘
```

This is the signature pattern:

```text
OBSERVATION → CONTEXT → MONEY IMPACT → OPTION
```

---

# S-06 — Needs Review

**Question:** ¿Qué dato necesitas que confirme?

```text
┌────────────────────────────┐
│ Necesitamos tu ayuda       │
│                            │
│          S/49.90           │
│                            │
│ 28 ago · movimiento       │
│ detectado                  │
│                            │
│ No estamos seguros de      │
│ qué fue.                   │
│                            │
│ [ Comida ] [ Transporte ]  │
│ [ Compras ] [ Otro ]       │
│                            │
│        No es mío           │
└────────────────────────────┘
```

Uncertainty must be cheap to resolve.

---

# S-07 — Recurring Summary

**Question:** ¿Qué pagos se repiten y qué viene pronto?

```text
┌────────────────────────────┐
│ Pagos que se repiten       │
│                            │
│ Total mensual              │
│ S/157.29                   │
│                            │
│ Spotify      S/20.90       │
│ Netflix      S/39.90       │
│ Google One    S/7.49       │
│ Gym          S/89.00       │
│                            │
│ Próximos 7 días            │
│ ~S/47.39                   │
│                            │
│ [ Ver todos ]              │
└────────────────────────────┘
```

The summary stays no-scroll; the complete recurring list can be sequential.

---

# S-08 — Connections

**Question:** ¿De dónde obtiene información FinanceSensor?

```text
┌────────────────────────────┐
│ Conexiones                 │
│                            │
│ Gmail Personal             │
│ ● Actualizado hace 8 min   │
│                            │
│ Gmail Trabajo              │
│ ! Necesita reconexión      │
│                            │
│ + Conectar otra fuente     │
│                            │
│ Tus conexiones pertenecen  │
│ a este espacio financiero, │
│ no a un teléfono concreto. │
└────────────────────────────┘
```

---

# S-09 — Devices

**Question:** ¿Qué dispositivos tienen acceso a este tenant?

```text
┌────────────────────────────┐
│ Dispositivos               │
│                            │
│ Este teléfono              │
│ Android · Activo           │
│                            │
│ Segundo teléfono           │
│ iPhone · Activo            │
│ Último acceso: hoy         │
│                            │
│ [ Revocar acceso ]         │
│                            │
│ + Añadir dispositivo       │
└────────────────────────────┘
```

Revocation language must explain what it can and cannot guarantee.

---

# S-10 — Privacy Inspector

**Question:** ¿Qué está procesando y guardando FinanceSensor?

```text
┌────────────────────────────┐
│ Privacidad                 │
│                            │
│ Hoy                        │
│                            │
│ Correos revisados       43 │
│ Evidencias financieras  7  │
│ Movimientos resueltos   5  │
│                            │
│ Correos guardados       0  │
│                            │
│ Sincronización             │
│ Cifrada de extremo a       │
│ extremo                 ✓  │
│                            │
│ [ Ver detalles ]           │
└────────────────────────────┘
```

Every number on this screen must be technically measurable. No privacy theater.

---

## Traceability to domain

| Screen | Reads | Mutates / emits |
|---|---|---|
| S-01 Home | PeriodSummary, CategorySummary, UpcomingSummary, SensorSummary | navigation only |
| S-02 Movements | CanonicalFinancialEvent timeline | navigation/filter state |
| S-03 Transaction Detail | CanonicalFinancialEvent, evidence relations | category/merchant correction, rejection/report |
| S-04 Sensor | Insight, Opportunity, ReviewTask | acknowledgement/navigation |
| S-05 Opportunity | Opportunity + supporting Insight | accept/dismiss/limit intent |
| S-06 Needs Review | ReviewTask + Candidate/Evidence | review resolution action |
| S-07 Recurring | RecurringPattern + occurrence summaries | confirm/dismiss later |
| S-08 Connections | Connection state | add/reconnect/pause/revoke |
| S-09 Devices | Device authorization | enrollment/revocation |
| S-10 Privacy | processing metrics + security state | deletion/privacy settings navigation |

## Freeze rule

These are **signature structure candidates**, not visual-design freeze. They must be tested on small viewports and with real data density before `SIGNATURE_WIREFRAMES PASS`.
