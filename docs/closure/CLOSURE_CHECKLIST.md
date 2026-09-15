# FinanceSensor / PocketFinances — Closure Checklist

**Snapshot:** 2026-09-15  
**This checklist is fail-closed.** An unchecked item is not implicitly satisfied.

## A. Alpha.2 +2012 authority

- [x] Product scope for `0.2.0-alpha.2+2012` merged.
- [x] Canonical unsigned `+2012` APK frozen.
- [x] R1 trusted-edge bundle v12 deterministically reproduced.
- [x] Certification ledger created and validated.
- [ ] PR #144 merged with required checks green.
- [ ] Post-merge public-readiness/consensus green on the resulting authority SHA.
- [ ] Stable-signed `+2012` identity recorded as authoritative on the base branch.

## B. Owned-device physical certification

- [ ] OD0 exact signed APK hash/bytes/signer/version verified.
- [ ] OD0 install with `adb install -r` PASS.
- [ ] OD0 launch/package verification PASS.
- [ ] R2 Gmail authorization/connectivity criterion PASS.
- [ ] R2 source discovery criterion PASS.
- [ ] R2 eligible attachment fetch criterion PASS.
- [ ] R2 session-only PDF password behavior PASS where applicable.
- [ ] R2 strict statement parser criterion PASS for every required supported profile.
- [ ] R2 persistence/runtime materialization criterion PASS.
- [ ] R2 `FINANCIAL_VIEW_MATERIALIZED` criterion PASS.
- [ ] R2 failure-isolation criterion PASS.
- [ ] R2 disconnect/secret-cleanup criterion PASS.
- [ ] R2 safe-diagnostic/no-raw-error criterion PASS.
- [ ] Consolidated sanitized physical receipt persisted.
- [ ] `PHYSICAL_ALPHA2_PASS=YES`.

## C. MK0 exit gates

- [ ] Q-003 closed by its canonical validator/evidence.
- [ ] Q-004 closed by its canonical validator/evidence.
- [ ] Q-005 closed by its canonical validator/evidence.
- [ ] A-001 closed by its canonical validator/evidence.
- [ ] SEC-001 closed by its canonical validator/evidence.
- [ ] DM-001 closed by its canonical validator/evidence.
- [ ] G-MK0 closed.
- [ ] `BUILD_READY=YES`.

## D. Documentation reconciliation

- [x] Evidence-based closure status added.
- [x] External audit reconciled against repository evidence.
- [x] Execution plan added.
- [x] Definition of Done added.
- [x] Closure index added.
- [ ] Architecture/trust-boundary documentation reconciled to shipped state.
- [ ] Canonical data/evidence model documented.
- [ ] Supported/unsupported source-profile matrix frozen.
- [ ] OAuth/Gmail scope and privacy boundary documented in final form.
- [ ] Parser registry and evidence requirements documented.
- [ ] Safe diagnostic catalog documented.
- [ ] CI/runner governance documented in final form.
- [ ] Trusted-edge signing runbook finalized.
- [ ] Owned-device certification runbook finalized.
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
- [ ] Post-release enhancements moved to the next milestone rather than left as ambiguous release blockers.

## Next controlling action

```text
PR #144
  -> post-merge consensus
  -> exact signed +2012 OD0
  -> consolidated R2 physical campaign
```

Do not begin opportunistic feature expansion while this chain remains open unless a physical/automated failure requires a new candidate remediation.
