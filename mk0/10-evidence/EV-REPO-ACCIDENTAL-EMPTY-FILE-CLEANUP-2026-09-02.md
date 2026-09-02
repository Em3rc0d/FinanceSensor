# Repository hygiene note — accidental empty file cleanup

Date: 2026-09-02

During PR-description reconciliation, an unintended empty file named `README.__NONEXISTENT__` was created on `jett/mk0-foundation` by an erroneous repository write call.

It was detected immediately and deleted in the next repository mutation before any product/code decision used it.

```text
ACCIDENTAL FILE CONTENT       empty
PRODUCT SEMANTICS AFFECTED    NO
RUNTIME CODE AFFECTED         NO
EVIDENCE/SECRETS EXPOSED      NO
FINAL TREE CONTAINS FILE      NO
```

The two commits are retained in history rather than rewritten so the repository audit trail remains truthful.
