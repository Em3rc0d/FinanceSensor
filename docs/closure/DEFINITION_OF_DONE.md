# FinanceSensor / PocketFinances — Definition of Done

This file defines what **finished** means for the project. It prevents code-complete, CI-green, signed, physically-tested and release-ready from being treated as synonyms.

## 1. State model

### CODE_COMPLETE

The implementation required by the scoped milestone exists and its automated tests pass.

`CODE_COMPLETE` does **not** imply physical correctness, build readiness or release readiness.

### PHYSICAL_ALPHA2_PASS

The exact frozen and signed Alpha.2 candidate has completed the repository-defined owned-device campaign with all mandatory physical acceptance criteria passing.

Required properties:

- evidence is bound to one exact candidate identity;
- evidence from older candidates is not inherited;
- the real Gmail/local statement flow is exercised only on the trusted owned-device boundary;
- only sanitized receipts enter GitHub;
- financial/dashboard materialization is explicitly observed where required;
- unsupported/unknown statement structures remain fail-closed.

### BUILD_READY

`BUILD_READY=YES` requires:

- `PHYSICAL_ALPHA2_PASS=YES`;
- Q-003/Q-004/Q-005 closed according to their repository definitions;
- A-001/SEC-001/DM-001 closed according to their repository definitions;
- G-MK0 closed;
- full automated consensus green on the applicable authority SHA;
- no known blocking defect hidden by a waiver or by documentation wording;
- build path and resulting artifact identity reproducible/documented.

### RELEASE_READY

`RELEASE_READY=YES` requires `BUILD_READY=YES` plus:

- frozen release source SHA;
- frozen signed distributable identity;
- release-level automated regression green;
- required final physical validation PASS;
- installation/upgrade behavior validated for the supported path;
- rollback/recovery instructions documented;
- privacy/secrets review complete;
- final evidence manifest complete;
- known limitations documented;
- release notes generated from the shipped state;
- no open P0/P1 release blocker.

## 2. Project-level completion contract

The first planned release is considered **finished** only when every item below is true.

### Product

- The supported Android user journey works end-to-end for the explicitly supported source/profile set.
- Gmail authorization uses only the approved scope/boundary.
- Eligible transaction/statement evidence reaches the canonical financial model and user-visible financial view.
- Unsupported evidence cannot be silently misparsed as trusted financial truth.
- Candidate-local statement failure cannot erase already-safe evidence.
- User-visible failures use safe diagnostics and recovery paths.

### Data and privacy

- No private signing key/keystore enters the repository or public CI.
- No OAuth token, real Gmail content, raw statement, statement password or financial plaintext is committed as release evidence.
- Session-only secrets are cleared according to the runtime contract.
- Persistence behavior required by the milestone is validated.
- Data migrations/compatibility represented by DM-001 and related validators are closed.

### Security

- SEC-001 and all prerequisite security gates are closed.
- Trust boundaries are documented and match implementation.
- Logs/diagnostics do not leak raw secrets or financial content.
- Public CI cannot synthesize private/physical PASS.

### Quality

- Q-003/Q-004/Q-005 and dependent quality gates are closed.
- Unit/integration/regression suites are green on the exact release authority.
- Negative/fail-closed tests exist for unsafe parsing and boundary violations relevant to the supported scope.
- Physical tests cover the gap that automation cannot legitimately prove.

### Delivery

- `BUILD_READY=YES`.
- Exact distributable hash/size/signing identity are frozen.
- `RELEASE_READY=YES`.
- Release artifact, release notes and evidence manifest refer to the same source/product identity.

### Documentation

The repository contains current, non-contradictory documentation for:

- project status and scope;
- architecture and trust boundaries;
- data model;
- supported/unsupported source-profile matrix;
- build/CI governance;
- trusted-edge signing;
- owned-device certification;
- install/onboarding;
- troubleshooting and safe diagnostic codes;
- known limitations;
- release procedure;
- requirement/gate/evidence traceability.

Documentation must distinguish PROVEN, PLANNED, OUT_OF_SCOPE and UNVERIFIED claims.

## 3. Non-goals for declaring this release finished

The release does not need infinite bank coverage, every possible PDF format or every future analytics feature.

A feature that is not part of the frozen release scope may remain future work when:

1. it is explicitly marked out-of-scope or planned;
2. its absence does not violate a current requirement;
3. unsupported input fails safely;
4. the limitation is documented.

Android Alpha.2 evidence must never be used to claim iOS completion.

## 4. Release blocker rules

The following always block completion:

- a required gate is FAIL/BLOCKED/OPEN;
- a physical result is FAIL or required-but-unproven;
- release documentation contradicts the artifact actually shipped;
- source/artifact identity changed after the evidence was produced;
- secret/privacy boundary is violated;
- a known P0/P1 defect can corrupt, omit, expose or materially misrepresent financial evidence in the supported path;
- build/release PASS would depend on a manual assertion that cannot be tied to durable evidence.

## 5. Final completion receipt

The final project/release receipt must contain at minimum:

```text
release_version=
source_sha=
signed_artifact_sha256=
signed_artifact_bytes=
signer_identity=
automated_consensus_run=
physical_campaign_receipt=
Q_003=
Q_004=
Q_005=
A_001=
SEC_001=
DM_001=
G_MK0=
BUILD_READY=YES
RELEASE_READY=YES
known_limitations_document=
evidence_manifest=
```

If any required field cannot be truthfully filled, the project is not yet in the finished release state.
