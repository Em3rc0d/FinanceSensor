# MK0 / 10 — Evidence Contract

## Principle

A feature is not closed because it worked once on a developer device. FinanceSensor requires **physical, reproducible evidence** tied to a source state and expected result.

## Evidence artifact template

```text
Evidence ID
Claim under test
Requirement / invariant
Input commit SHA
Build/artifact identifier
Schema version
Device / OS / hardware
Source/test dataset
Preconditions
Procedure
Expected result
Observed result
Metrics
Screenshots/log extracts (redacted)
Artifact hashes where applicable
PASS / FAIL
Known limitations
Reviewer/date
```

## Planned MK0 evidence

| Evidence ID | Claim |
|---|---|
| EV-MK0-001 | Gmail OAuth/source ingestion works under selected production-feasible scope model |
| EV-MK0-002 | Reprocessing source artifacts is idempotent |
| EV-MK0-003 | Overlapping email evidence resolves to one canonical transaction |
| EV-MK0-004 | Two real same-amount purchases are not falsely merged |
| EV-MK0-005 | Internal transfer does not change income/expense totals |
| EV-MK0-006 | Card settlement does not double-count purchases |
| EV-MK0-007 | Refund/reversal semantics produce correct state |
| EV-MK0-008 | Low/mid Android meets frozen performance envelope |
| EV-MK0-009 | Local financial store is encrypted at rest under selected design |
| EV-MK0-010 | Cloud sync payload contains no normal-path financial plaintext |
| EV-MK0-011 | Two devices converge to equivalent state |
| EV-MK0-012 | Revoked device cannot obtain future authorized sync state |
| EV-MK0-013 | Home passes minimum viewport no-scroll contract |
| EV-MK0-014 | Sensor passes minimum viewport no-scroll contract |
| EV-MK0-015 | Needs Review preserves uncertainty without forced guessing |
| EV-MK0-016 | Production logs/crash telemetry contain no prohibited financial/email plaintext in tested flows |
| EV-MK0-017 | Disconnect/logout/delete flows honor the defined lifecycle |
| EV-MK0-018 | Privacy Inspector claims match measured processing behavior |

## Evidence storage

Evidence files should live beside this contract using stable IDs, for example:

```text
EV-MK0-003-canonical-resolution.md
EV-MK0-008-low-end-android.md
EV-MK0-011-multi-device-convergence.md
```

Large binary evidence may live in release artifacts or approved artifact storage, with immutable hashes referenced from the Markdown record.

## Redaction rule

Evidence must not become a privacy leak.

Never commit:

- real OAuth credentials;
- raw personal email bodies;
- full bank/card/account identifiers;
- encryption keys;
- sensitive private financial screenshots unless safely anonymized/redacted.

Use synthetic fixtures or deliberately sanitized samples whenever possible.

## Evidence state

```text
PLANNED
RUNNING
PASS
FAIL
SUPERSEDED
```

A superseded result remains historically traceable; it is not silently overwritten.

## Release rule

`RELEASE_READY = YES` only when every evidence artifact required by the frozen release gate is PASS for the exact release candidate or is explicitly documented as not applicable by an approved decision.
