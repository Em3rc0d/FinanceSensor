# FinanceSensor — Closure Graph Protocol

FinanceSensor is developed as a **bidirectionally traceable closure graph**, not as a linear pile of documents.

> We must be able to enter the network through any critical decision, traverse it in both directions, reach its origin and planned proof, return through another route, and the story must still close.

This is a blockchain-like engineering metaphor, **not a literal blockchain implementation**. The objective is tamper-resistant reasoning through explicit provenance, evidence, dependency and revalidation semantics.

## Fundamental chain

```text
STEP → WORK → EVIDENCE → AUDIT → GATE → NEXT STEP
```

A node cannot become `CLOSED` because work exists. It closes only when its claims are supported by evidence and its downstream implications remain consistent.

## Bidirectional validation

If node A enables node B:

```text
A ──validates──▶ B
```

then B must also be able to point back to A:

```text
A ◀──dependsOn── B
```

Later evidence can invalidate an earlier assumption. Therefore closure is not immutable truth; it is **auditable truth with revalidation semantics**.

```text
A CLOSED
   ↓
B produces contradictory evidence
   ↓
A → REOPENED
B → BLOCKED
all downstream gates → BLOCKED
```

## Node states

- `OPEN` — unresolved work remains.
- `ACTIVE` — bounded work is being executed.
- `DRAFTED` — artifact exists but evidence is insufficient for closure.
- `PASS` — a non-terminal supporting node has passed its current criteria.
- `CLOSED` — closure criteria, evidence and receipt are complete.
- `BLOCKED` — cannot advance because a prerequisite is not closed or a contradiction exists.
- `REOPENED` — previously closed node invalidated by later evidence.

`CLOSED` is the strongest state. `PASS` is not equivalent to `CLOSED` unless the node contract explicitly says so.

## R0–R9 protocol

### R0 — Graph protocol
Define node semantics, allowed states and closure rules.

### R1 — Inventory
Every critical claim, artifact, quarry, architecture decision, model decision, spike, test and gate gets a stable node identity.

### R2 — Claims
Each node states what it claims to establish and what it explicitly does not establish.

### R3 — Bidirectional traceability
Every dependency edge must be navigable forward and backward.

### R4 — Cycle validation
Where two or more nodes mutually constrain one another, the cycle must converge without contradiction.

### R5 — Contradiction audit
New evidence is checked against upstream claims instead of being forced into the existing design.

### R6 — Revalidation semantics
A contradictory downstream result can reopen an upstream node and must block dependent gates.

### R7 — Architecture reconciliation
Architecture, data model, privacy, sync, UX and implementation must agree on the same domain invariants.

### R8 — Closure audit
A node cannot close without closure criteria, evidence and a closure receipt.

### R9 — Closure receipt
The receipt records the claim, evidence, audit result, known residual risk, affected downstream nodes and closure commit/ref.

## Take-the-Hummer rule

The project does **not** enter unrestricted implementation while the graph is still structurally open.

```text
P0 prerequisites CLOSED
        ↓
feasibility evidence PASS
        ↓
architecture reconciled
        ↓
data model reconciled
        ↓
security/privacy reconciled
        ↓
signature UX reconciled
        ↓
closure audit
        ↓
BUILD_READY = YES
```

Until then, only bounded spikes and proof-producing work are allowed.

## Failure semantics

A failed test is not hidden or weakened to preserve progress.

```text
failure
  ↓
identify owning node
  ↓
mark node OPEN / REOPENED
  ↓
propagate BLOCKED downstream
  ↓
repair root cause
  ↓
produce regression evidence
  ↓
revalidate graph
```

The graph exists specifically to prevent `lots of movement ≠ actual progress`.
