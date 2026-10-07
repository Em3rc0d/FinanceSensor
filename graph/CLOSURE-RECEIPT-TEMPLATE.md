# Closure Receipt — <NODE-ID>

**Node:** `<NODE-ID>`  
**Title:** `<title>`  
**Closed at:** `<UTC timestamp>`  
**Closed on ref/commit:** `<ref / SHA>`

## Claim being closed

State exactly what this node proves.

## Explicit non-claims

State what this node does **not** prove so downstream work cannot over-read the result.

## Upstream dependencies checked

- `<NODE-ID>` — state / evidence / compatibility result.

## Evidence

- `<path or immutable reference>` — what it proves.

## Audit result

```text
CLAIM_VALID             PASS | FAIL
DEPENDENCIES_VALID      PASS | FAIL
CONTRADICTIONS          NONE | LISTED
REVALIDATION_REQUIRED   NO | YES
DOWNSTREAM_UNBLOCKED    NO | YES
```

## Contradiction audit

Document any evidence that could conflict with upstream assumptions. If a conflict exists, do not close this node; reopen the owning upstream node.

## Residual risks

List what remains uncertain after closure.

## Downstream nodes affected

- `<NODE-ID>` — `UNBLOCKED | STILL_BLOCKED | REVALIDATE`

## Revalidation triggers

Define future observations that would reopen this node.

## Closure decision

```text
NODE_STATUS = CLOSED
```

A receipt without physical evidence is invalid.
