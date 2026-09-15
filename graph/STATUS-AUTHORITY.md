# FinanceSensor — Status Authority Contract

## Single authority

`graph/closure-ledger.json` is the only authoritative source for graph-node state.

Markdown artifacts may describe state for human context, but they do not own state and they are not allowed to contradict the ledger.

## Why

Duplicating mutable state across many documents creates split-brain project management:

```text
ledger says ACTIVE
quarry says OPEN
status page says DRAFT
        ↓
no one knows which truth controls the gate
```

FinanceSensor therefore uses:

```text
closure-ledger.json = authority
Markdown Status      = optional projection
STATUS.md            = human summary/projection
CI                    = coherence referee
```

## Semantic aliases

Human documents may use a small number of wording aliases when meaning is identical:

```text
DRAFT     → DRAFTED
```

All other node-state declarations must match the ledger state directly.

A descriptive suffix is allowed:

```text
**Status:** DRAFT / requires Q-001 closure before freeze.
```

The machine compares the leading state token with the ledger after alias normalization.

## Enforcement

`tools/validate-artifact-status.mjs` scans graph-node artifacts for explicit `**Status:**` declarations.

If a document declares a state that conflicts with its owning node, CI fails.

Documents without a status declaration are not forced to duplicate the ledger.
