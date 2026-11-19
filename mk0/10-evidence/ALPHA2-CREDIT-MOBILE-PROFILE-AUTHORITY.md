# Alpha.2 credit mobile profile authority

Status: **STATIC IMPLEMENTATION / PHYSICAL PROOF OPEN**

Candidate target: `0.2.0-alpha.2+2012`.

## Product objective

The owned-device financial view already materializes safe Gmail-observed data and BCP Savings is being promoted through a strict profile-specific parser. The remaining physically observed statement profiles are BCP Credit and Banco Ripley Credit. This slice increases useful coverage without introducing a universal statement parser or exporting private statement contents.

## Banco Ripley Credit

Public authority: Banco Ripley, **Conoce cómo leer tu Estado de Cuenta**:

`https://www.bancoripley.com.pe/pdf/como-leer-eecc.pdf`

The public template documents a ledger section named `Tus movimientos del mes` with the header family:

- Fecha de consumo
- Fecha de proceso
- N° Ticket
- Descripción
- T/A
- Monto
- TEA
- N° de cuotas
- Valor cuota
- Capital
- Interés
- Total

The same public guide explains that the row `Total` is the billed-period movement amount: a negative amount represents an abono/pago/extorno and a positive amount represents a consumo/cuota/comisión/seguro. It also shows summary, formula and points sections that must not be interpreted as ledger movements.

`A2_RIPLEY_CREDIT_STRICT_V1` therefore:

1. requires the `Tus movimientos del mes` ledger anchor;
2. resolves the ledger headers from one geometric header family;
3. treats only that ledger `Total` column as movement amount authority;
4. requires a date and description for every monetary row;
5. excludes formula/summary/points sections;
6. fails the whole statement closed when an unexplained monetary ledger row remains;
7. emits no physical-pass claim until the exact signed candidate is exercised on the owned Android device.

No user PDF, extracted text, real amount, card identifier or merchant sample was used as repository evidence for this adapter.

## BCP Credit

BCP Credit is physically discovered by its already-frozen Gmail allowlist, but the public material available to this project does not provide enough exact geometric evidence to promote a financial row parser safely.

`A2_BCP_CREDIT_STRUCTURAL_PROBE_V1` is therefore diagnostic only. After local password unlock it may inspect the in-memory layout and return only:

- a coarse page-count bucket; and
- a bit mask describing the presence or absence of a fixed whitelist of public statement concepts.

It **cannot emit** transaction evidence, raw text, dates, amounts, merchants, account/card identifiers or coordinates. Its only dynamic code shape is:

`BCP_CREDIT_STRUCTURAL_V1_P(?:0|1|2_4|5P)_M[0-9A-F]{3}`

This allows one owned-device UAT to tell engineering which strict adapter family is needed without transferring the user's statement outside the device.

## Interbank Savings

A synthetic/static Interbank Savings geometry adapter exists in MK0, but no allowlisted Gmail identity is currently certified for the mobile scanner. It remains runtime-disabled. We will not invent sender domains, subjects or attachment identities merely to increase a coverage count.

## Secret custody

Statement keys remain profile-scoped and session-only in app memory. They are cleared on disconnect/disposal and invalidated when all usable PDFs for a profile fail the open/password boundary. No DNI derivation or storage is implemented, and keys are never committed, logged, synchronized or sent to public CI.

## Promotion law

`STATIC_READY != PHYSICAL_PASS`.

A profile becomes physically supported only after the exact stable-signed APK demonstrates on the owned Android device that it opens the real statement, imports only valid rows, preserves dedup/reconciliation rules, and leaks no raw financial content into diagnostics or logs.
