# Alpha.2 Web Dashboard Lab

This is the first **web companion** for the Alpha.2 canonical financial projection. It is not a second financial engine and it is not authorized to ingest Gmail, parse statements, reconcile transactions, classify evidence, or calculate coverage independently.

## Authority

```text
Android trusted edge -> Dart canonical runtime -> minimized public projection
                                              -> existing E2EE sync envelope
                                              -> client decrypts
                                              -> this web renderer
```

The web surface consumes only `ALPHA2_PUBLIC_DASHBOARD_V1` after client-side decryption. The relay/cloud normal path must not receive financial plaintext.

## UX contract

The first dashboard deliberately prioritizes:

- **Entró / Salió / Neto per currency** instead of a cross-currency fake total;
- recent canonical movements with truth labels (`Observado`, `Contabilizado`, `Reconciliado`);
- source coverage as explicit counts/states rather than an unqualified percentage;
- recurrence **candidates**, never guaranteed subscriptions;
- knowledge gaps and review blockers as visible product state.

The lab intentionally contains no `confidence`, `matchScore`, `evidencePercent`, raw Gmail identifiers, MIME/body data, PDF bytes or PDF password.

`WEB_RENDERER_AUTHORITY=NONE`

`FINANCIAL_AUTHORITY=DART`

`BUILD_READY=NO`

`RELEASE_READY=NO`
