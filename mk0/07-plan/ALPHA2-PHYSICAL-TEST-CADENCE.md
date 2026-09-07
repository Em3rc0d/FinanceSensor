# Alpha.2 — Physical Test Cadence

**Status:** ACTIVE GATE  
**Date:** 2026-09-06

## Rule

Owned-device testing is a milestone gate, not a development loop.

The user is not asked to install or execute a new APK after each implementation slice.

## Next physical candidate eligibility

A new APK may be promoted to human physical testing only when one exact source SHA passes all of the following:

```text
A-G mobile integration contract tests
canonical resolver invariants
statement discovery/fetch/parse synthetic corpus
SQLCipher/vault lifecycle synthetic tests
reconciliation deterministic replay
account graph invariants
monthly coverage state-machine tests
Sensor V1 deterministic tests
web contract + browser journey tests
sync envelope / local-first tests
privacy + build-readiness validators
Flutter analyze + unit/widget tests
Android APK build
CI receipt freeze
```

## Failure behavior

Any failing gate returns the candidate to internal engineering. It does not produce a user-facing APK request.

## Physical campaign scope

When a candidate finally crosses the gate, one bounded physical campaign validates the integrated milestone:

- install/upgrade;
- stable signer identity;
- Gmail OAuth and exact scope;
- statement discovery/import for supported physical formats;
- encrypted persistence/reopen;
- deterministic reconciliation;
- web synchronization/presentation boundary where enabled;
- revoke/disconnect lifecycle;
- no silent completeness or evidence overclaim.

A single failure invalidates only the affected gate; it does not erase already-bound static evidence.

## Readiness law

```text
CI_GREEN != PHYSICAL_PASS
PHYSICAL_PASS != BUILD_READY
BUILD_READY != RELEASE_READY
```
