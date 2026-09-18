# FinanceSensor / PocketFinances — Closure Checklist

**Snapshot:** 2026-09-17  
**This checklist is fail-closed.** An unchecked item is not implicitly satisfied.

## A. Alpha.2 +2014 authority

- [x] Safe strict-review diagnostics merged in PR #151.
- [x] Candidate `0.2.0-alpha.2+2014` cut in PR #152.
- [x] Strict parser / geometry / PDF-reader identities held unchanged from +2013 by validator.
- [x] Canonical unsigned +2014 APK frozen from post-merge Integrated Runtime.
- [x] Canonical unsigned APK SHA-256 frozen as `72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3`.
- [x] R1 trusted-edge bundle v14 generated and byte-exactly reproduced.
- [x] R1 v14 bundle SHA-256 frozen as `eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be`.
- [x] PR #153 merged with post-merge Integrated Runtime / R1 / Public Readiness green.
- [x] PR #154 reconciled prebuild readiness after the candidate identity change.
- [x] Final authority head `77b459f742eb2f0bcd16485a415c66bf59f40e0f` has Heartbeat, Public Readiness and Human Test Alpha green.
- [ ] Exact +2014 trusted-edge signing PASS persisted.
- [ ] Stable-signed +2014 APK hash/bytes/signer frozen on the base branch.

## B. Owned-device physical certification

These remain blocked until A/R1 signing is closed.

- [ ] OD0 handoff regenerated for the exact signed +2014 identity.
- [ ] OD0 exact signed APK hash/bytes/signer/version verified.
- [ ] OD0 data-preserving `adb install -r` PASS.
- [ ] OD0 launch/package verification PASS.
- [ ] R2 Gmail authorization/connectivity criterion PASS.
- [ ] R2 source discovery criterion PASS.
- [ ] R2 eligible attachment fetch criterion PASS.
- [ ] R2 session-only PDF password behavior PASS where applicable.
- [ ] R2 strict statement parser/probe criterion PASS for every required supported profile.
- [ ] R2 safe review-cause diagnostics observed for strict-review statements.
- [ ] R2 persistence/runtime materialization criterion PASS.
- [ ] R2 `FINANCIAL_VIEW_MATERIALIZED` criterion PASS.
- [ ] R2 failure-isolation criterion PASS.
- [ ] R2 disconnect/secret-cleanup criterion PASS.
- [ ] R2 safe-diagnostic/no-raw-error criterion PASS.
- [ ] Consolidated sanitized physical receipt persisted.
- [ ] `PHYSICAL_ALPHA2_PASS=YES`.

## C. MK0 exit gates

- [ ] Q-003 closed by canonical validator/evidence.
- [ ] Q-004 closed by canonical validator/evidence.
- [ ] Q-005 closed by canonical validator/evidence.
- [ ] A-001 closed by canonical validator/evidence.
- [ ] SEC-001 closed by canonical validator/evidence.
- [ ] DM-001 closed by canonical validator/evidence.
- [ ] G-MK0 closed.
- [ ] `BUILD_READY=YES`.

## D. Documentation reconciliation

- [x] Historical 2026-09-15 status preserved as a historical snapshot.
- [x] Current 2026-09-17 +2014 status added.
- [x] Closure README reconciled to the current frontier.
- [x] Execution plan reconciled to the current frontier.
- [x] Definition of Done retained as the project completion contract.
- [x] External audit separated from repository authority.
- [ ] Architecture/trust-boundary documentation reconciled to final shipped state.
- [ ] Canonical data/evidence model documented in final shipped form.
- [ ] Supported/unsupported source-profile matrix frozen for release.
- [ ] OAuth/Gmail scope and privacy boundary documented in final release form.
- [ ] Parser registry and evidence requirements documented in final release form.
- [ ] Safe diagnostic catalog documented in final release form.
- [ ] CI/runner governance documented in final release form.
- [ ] Trusted-edge signing runbook finalized after +2014 signing PASS.
- [ ] Owned-device certification runbook finalized after physical campaign evidence.
- [ ] Build/release runbook finalized.
- [ ] Installation/onboarding/troubleshooting guide finalized.
- [ ] Known limitations document finalized.
- [ ] Requirement/gate/test/evidence traceability manifest finalized.

## E. Release candidate

- [ ] `BUILD_READY=YES` before RC freeze.
- [ ] Exact RC source SHA frozen.
- [ ] Exact signed distributable hash/bytes/signer frozen.
- [ ] Full automated regression green on RC SHA.
- [ ] Reproducible build evidence captured.
- [ ] Supported install/upgrade path validated.
- [ ] Persistence compatibility / replay / idempotency expectations validated.
- [ ] Final bounded physical smoke/UAT PASS.
- [ ] No open P0/P1 release blocker.
- [ ] Release notes match the exact RC.
- [ ] Evidence manifest complete.
- [ ] `RELEASE_READY=YES`.

## F. Release closure

- [ ] Release/tag identifies exact source and signed artifact authority.
- [ ] User-facing artifact is the certified artifact.
- [ ] Install/update/rollback instructions published.
- [ ] Known limitations published.
- [ ] Final completion receipt persisted.
- [ ] Post-release enhancements moved to the next milestone.

## Next controlling action

```text
R1 trusted-edge sign exact +2014
  -> freeze signed identity
  -> unlock +2014 OD0
  -> execute consolidated R2 campaign
  -> inspect safe review-cause evidence
```

Do not begin opportunistic feature expansion while this chain remains open. If physical evidence requires a source change, cut a successor candidate and reset non-inheritable physical evidence.
