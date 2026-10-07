# FinanceSensor / PocketFinances — Audit Reconciliation

**Date:** 2026-09-15  
**Purpose:** reconcile the external project-audit report with evidence currently available in the repository.

## 1. How to read the external audit

The external audit correctly identifies useful project-management dimensions: scope, deliverables, schedule, resources, risks, quality, validation, documentation and closure.

However, several entries in that audit are explicitly examples/templates rather than observations of this repository. They must not be imported as project facts.

Examples that are **not authoritative FinanceSensor facts** include sample rows such as:

- `Documento de requisitos — 01/06/2026 — pendiente`;
- `Módulo de Login — 15/07/2026 — completado`;
- `Integración del API — 70 %`;
- `Manual de usuario final — no iniciado`;
- sample task/hour allocations;
- generic frontend/backend dependency diagrams;
- generic multi-week closure durations.

The repository and its durable evidence take precedence.

## 2. Reconciled findings

| Audit dimension | External audit concern | Repository-backed interpretation | Closure action |
|---|---|---|---|
| Scope | Final scope/EDT not accessible | Product scope exists implicitly across MK0 gates, candidate contracts, parser/profile allowlists and PR governance, but is fragmented | Consolidate a single supported-scope and out-of-scope contract before release |
| Deliverables | Formal list missing | Release artifacts, trusted-edge bundles, validators, receipts, Android runtime and physical gates exist | Build one release deliverables/evidence manifest |
| Schedule | Baseline/deviation unavailable | Repository history is highly traceable by PR/run/SHA, but not expressed as a traditional Gantt | Use gate/dependency roadmap as authoritative execution schedule; avoid fabricated calendar precision |
| Budget | Cost data unavailable | No repository evidence supports a formal cost variance claim | Keep financial project-management accounting UNVERIFIED unless an actual budget source is added |
| Resources | RACI unavailable | Execution is largely owner/automation-driven, but no formal RACI is proven | Document operational roles only where evidence exists; do not invent staffing |
| Risks | Risk register missing | Risks are encoded in fail-closed gates, candidate invalidation, secret boundaries, parser strictness and physical certification | Consolidate risks/mitigations into release documentation |
| Quality | Formal test evidence reportedly missing | Current repository has extensive validators, CI gates, regression tests and public-readiness governance | Trace requirements/gates to tests and runs in one evidence manifest |
| Documentation | Fragmented / incomplete | Confirmed debt: important truth is spread across PR bodies, receipts, scripts and validators | `docs/closure/` becomes the consolidation layer; reconcile other docs before release |
| Acceptance/UAT | Formal acceptance evidence missing | Physical owned-device acceptance is explicitly modeled and intentionally cannot be synthesized by public CI | Finish exact signed `+2012` OD0/R2 campaign and persist sanitized receipts |
| Closure | No final closeout | Correct: project still has `BUILD_READY=NO` and `RELEASE_READY=NO` | Follow `EXECUTION_PLAN.md` and `DEFINITION_OF_DONE.md` |

## 3. Actual current frontier

The current candidate is:

```text
0.2.0-alpha.2+2012
```

Canonical unsigned identity:

```text
source authority: b75cc39318ee749a1123971f19d895d71e35bd91
run:              34983489697
artifact:         10402582806
apk sha256:       74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e
apk bytes:        182538547
```

R1 trusted-edge bundle v12:

```text
sha256: d6c9538b0c84d0bdabc966847cd7f6d340bd17eea68bf69e65d3d2a852585642
bytes:  86659710
```

PR #143 created the hash-linked certification ledger. PR #144 is the current stable-signing/OD0 transition and proposes:

```text
signed apk sha256: 05ee3efd70bb07fe11bde6a21140c03de3ffa872b5f90e7a1014b5106b4b3000
signed bytes:      182563366
signer sha1:        63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
```

Until the applicable gates close, the project remains:

```text
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

## 4. What the audit missed because it did not have repository authority

The project already has controls substantially more specific than the generic report suggests:

- exact APK/source identity freezing;
- non-inheritance of physical evidence after candidate mutation;
- trusted-edge/private signing separation;
- public CI that cannot synthesize a private/physical PASS;
- deterministic certification ledger;
- strict parser allowlisting rather than generic financial parsing;
- safe failure isolation and sanitized diagnostic codes;
- session-only statement password handling;
- PDF byte cleanup/zeroization boundaries;
- physical certification modeled as a bounded gate campaign;
- automated readiness/consensus checks.

These controls must be retained during closure rather than replaced by generic PM artifacts.

## 5. Real documentation gaps to close

The external audit is directionally correct that documentation is the largest relative debt. The useful remediation is not to manufacture documents for their own sake, but to consolidate existing engineering truth.

Required before release:

1. Product scope and supported/unsupported source-profile matrix.
2. Architecture and trust-boundary document.
3. Canonical financial data/evidence model.
4. Persistence and migration/idempotency contract.
5. OAuth/Gmail scope and privacy boundary.
6. Statement parser registry and evidence requirements.
7. Safe error/diagnostic catalog.
8. CI/runner governance.
9. Trusted-edge signing runbook.
10. Owned-device certification runbook.
11. Build/release runbook.
12. Installation/onboarding/troubleshooting guide.
13. Known limitations.
14. Requirement/gate/test/evidence traceability manifest.
15. Final release/closure receipt.

## 6. Audit policy going forward

Future audits must use the following evidence hierarchy:

```text
1. Exact immutable artifact/source identity
2. Machine-readable gate/receipt/validator result
3. CI run tied to exact SHA
4. Sanitized trusted-edge / owned-device receipt
5. Repository documentation describing the evidence
6. PR narrative / human explanation
7. Generic planning assumptions
```

A lower layer may explain a higher layer, but must never override it.

## 7. Result

The external audit is accepted as a **documentation/management checklist**, not as an authoritative status snapshot.

The authoritative project closure path is now:

```text
PROJECT_STATUS_2026-09-15.md
        +
EXECUTION_PLAN.md
        +
DEFINITION_OF_DONE.md
        +
repository certification evidence
```

No sample percentage, sample date or generic deliverable from the external report should be used to claim actual FinanceSensor progress unless independently proven in the repository.
