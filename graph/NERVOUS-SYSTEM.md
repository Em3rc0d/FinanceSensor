# FinanceSensor — Engineering Nervous System

FinanceSensor does not treat requirements, architecture, tests and evidence as independent document piles. They form a bidirectionally traceable nervous system.

## Signal path

```text
PRODUCT INVARIANT
       ↓
OWNING GRAPH NODE
       ↓
DESIGN / MODEL CONTRACT
       ↓
EXECUTABLE TEST OR PHYSICAL SPIKE
       ↓
EVIDENCE ARTIFACT
       ↓
CLOSURE RECEIPT
       ↓
RELEASE GATE
```

Every downstream result can also send a signal back upstream:

```text
new evidence / failed test / contradiction
       ↓
identify invariant + owning node
       ↓
OPEN / REOPEN upstream truth
       ↓
BLOCK dependent nodes and gates
       ↓
repair
       ↓
re-run evidence
       ↓
revalidate downstream assumptions
```

This is the engineering equivalent of a nervous system: a local defect must be able to become a global stop signal when it threatens financial truth, privacy or release correctness.

## Traceability states

- `SPECIFIED` — invariant is explicitly modeled and owned, but has no executable proof yet.
- `PARTIAL` — some executable or structural evidence exists, but it does not prove the invariant across its declared scope.
- `PROVEN_AT_SPIKE` — bounded executable evidence supports the invariant in the current feasibility spike. This is not production proof.
- `PROVEN` — release-scope proof exists, owning closure conditions are satisfied, and the proof is represented by physical evidence plus closure receipt.

No invariant may jump directly from prose to `PROVEN`.

## Product vs data-model invariants

`product/PRODUCT-INVARIANTS.md` defines product law.

`mk0/05-data-model/INVARIANTS.md` defines lower-level model laws that should help implement and prove product law.

They are deliberately separate. A product invariant can map to one or more data-model invariants, architecture nodes, security nodes or UX nodes.

## Interrupts: contradictions

A contradiction is an interrupt signal.

```text
C-xxx
  ↓
interrupts one or more invariants
  ↓
revalidates owning quarry/model/architecture
  ↓
blocks gate until reconciled
```

A contradiction cannot disappear because wording changed. It needs executable/model evidence and a formal closure decision.

## Release rule

`G-MK0` may not close merely because every document exists.

For every invariant in MK0 release scope:

```text
owner exists
    +
traceability exists
    +
required proof exists
    +
contradictions resolved
    +
closure receipt exists where required
        ↓
release gate may evaluate PASS
```

## Machine-readable source

The current wiring lives in:

`graph/traceability-matrix.json`

and is validated by:

`tools/validate-traceability.mjs`

The validator compares the matrix against the actual invariant Markdown sources and closure ledger. An invariant added to Markdown without being wired into the graph must fail CI.
