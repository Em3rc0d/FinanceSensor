# Q-003 / Q-004 / Q-005 — Physical Closure Campaign

**Status:** EXECUTION PLAN  
**Date:** 2026-09-02  
**Rule:** no real credential, Gmail content, financial plaintext, recovery secret or mobile private key enters GitHub/CI.

## Mission

Convert the remaining MK0 production assumptions into **physical evidence** without reopening already-settled architecture.

The campaign starts only from frozen contracts:

- ADR-017..020 — Gmail/OAuth/provider boundary;
- ADR-021 — mobile production crypto profile;
- ADR-022 — production witness topology/quorum;
- ADR-023 — disconnect/deletion/backup semantics;
- ADR-024 — Recovery Kit anchor refresh semantics.

```text
DESIGN DECISION CLOSED
        !=
PHYSICAL PROPERTY PROVEN
```

Q-003/Q-004/Q-005 remain ACTIVE until their physical gates pass and closure receipts are issued.

## Trust boundary

Physical runs occur only on a controlled local edge / owned physical devices.

```text
GitHub-hosted CI     synthetic + sanitized contract verification only
public repository   source + synthetic fixtures + sanitized evidence only
controlled edge     real Gmail/OAuth and real-device physical evidence
physical devices    protected-key/keystore/keychain/recovery evidence
```

Raw run artifacts stay local. Only sanitized receipts with aggregate counters and non-sensitive PASS/FAIL facts may be committed.

## Phase P0 — Harness integrity

### Goal

Prove the measurement harness itself cannot leak the evidence it is intended to measure.

### Gates

- output allowlist is active;
- secret-value printing disabled;
- real Gmail addresses/subjects/message IDs absent from sanitized output;
- recovery/private key bytes absent;
- packet/storage evidence is reduced locally before commit;
- timestamps/IDs are rounded or pseudonymized when exact values are unnecessary.

### PASS receipt

`EV-PHYSICAL-CAMPAIGN-P0-HARNESS-SANITIZATION-<date>.md`

## Phase P1 — Q-003 Gmail production lifecycle

Run the current Level-C successor harness on the controlled edge.

### Required physical observations

```text
successful refresh-token use before revoke
refresh succeeds with intended minimum scope
request payload bytes accounted per endpoint
response bytes accounted per endpoint
per-endpoint latency recorded
provider revoke succeeds
old refresh authority denied after revoke
no real Gmail content in logs/result artifact
```

### Required endpoint classes

At minimum record bounded metrics for the real endpoints actually exercised by the production path, including OAuth token/revoke and Gmail profile/history/message metadata/full retrieval where applicable.

### PASS receipt

`EV-Q003-PRODUCTION-LIFECYCLE-PHYSICAL-<date>.md`

### Q-003 remains blocked after P1 by

- production mobile credential custody;
- public restricted-scope verification/provider process;
- provider determination of security-assessment applicability;
- production consent/disclosure package.

## Phase P2 — Mobile OAuth credential custody + Q-004 local privacy

Execute on representative Android and iOS devices.

### Android

- OAuth long-lived authority stored through protected platform facility;
- ordinary app database/files contain no token plaintext;
- logs/crash reports contain no token/Gmail/financial plaintext;
- disconnect removes protected credential;
- reinstall/restore behavior documented;
- device lock/authentication behavior documented.

### iOS

- OAuth long-lived authority stored through Keychain-protected facility;
- ordinary app database/files contain no token plaintext;
- logs/crash reports contain no token/Gmail/financial plaintext;
- disconnect removes protected credential;
- backup/restore/accessibility behavior documented.

### PASS receipts

- `EV-Q003-Q004-ANDROID-CREDENTIAL-CUSTODY-<date>.md`
- `EV-Q003-Q004-IOS-CREDENTIAL-CUSTODY-<date>.md`

## Phase P3 — Real transport / storage / deletion inspection

### Network inspection

Verify the normal cloud path does not transmit:

```text
raw email body
attachment bytes
subject text
merchant plaintext
amount plaintext
category plaintext
financial insight plaintext
OAuth credential plaintext
Tenant Root Key
Recovery Private Key
```

Expected cloud-visible classes must match `PRIVACY-DATA-MATRIX.json`.

### Storage inspection

Inspect app files/database/cache/temp locations after:

- retrieval;
- extraction;
- sync;
- disconnect;
- Gmail-derived erase;
- tenant deletion.

Raw Gmail content must not survive its bounded processing stage.

### Cloud deletion

Verify ADR-023 against the selected control-plane implementation:

```text
cloud envelope deletion
control-metadata deletion
witness namespace retirement/deletion
deletion resurrection barrier
account-linked diagnostic deletion
```

### Backup restore test

Restore a backup created before tenant deletion and prove:

```text
DELETED TENANT AUTHORITY DOES NOT RETURN
```

The selected provider’s applicable backup retention must be finite and `<= 35 days` or the release claim fails.

### PASS receipt

`EV-Q004-REAL-PRIVACY-DELETION-PHYSICAL-<date>.md`

## Phase P4 — Q-005 mobile production crypto interoperability

Use ADR-021 as the fixed test profile.

### Required matrix

```text
Android wrap   → iOS unwrap
 iOS wrap      → Android unwrap
Android sign   → iOS verify
 iOS sign      → Android verify
```

### Negative matrix

Each direction must fail closed for:

```text
wrong tenant scope
wrong epoch
wrong recipient
wrong authorizer
wrong protocol context
tampered HPKE package
tampered signature
replayed immutable identity with changed payload
```

### Protected-key evidence

- Android Keystore physical key use;
- StrongBox path where available;
- secure TEE fallback evidence where StrongBox unavailable;
- Apple Secure Enclave/Keychain protected key use;
- no silent exportable-key fallback.

### PASS receipt

`EV-Q005-MOBILE-CRYPTO-INTEROP-PHYSICAL-<date>.md`

## Phase P5 — Q-005 witness, crash and partition campaign

Deploy the ADR-022 topology:

```text
3 witnesses
2-of-3 confirmation
>=2 failure domains
>=1 relay-independent witness
```

### Failure campaign

- one witness unavailable → confirmation remains possible;
- two witnesses unavailable → explicit `WITNESS_UNCONFIRMED`;
- witness ahead of relay → `RELAY_BEHIND_WITNESS`;
- same-sequence divergence → fail closed;
- parent mismatch/gap/rollback → fail closed;
- crash during checkpoint write;
- crash between checkpoint persistence and anchor advancement;
- restart after each crash point;
- long offline device rejoin;
- network partition + later convergence;
- witness replacement/bootstrap.

No failure may create a false “latest” claim.

### PASS receipt

`EV-Q005-WITNESS-CRASH-PARTITION-PHYSICAL-<date>.md`

## Phase P6 — All-devices-lost recovery campaign

Execute ADR-014 + ADR-015 + ADR-022 + ADR-024 on physical devices.

### Disaster scenario

1. establish tenant with multiple devices and several key epochs;
2. export valid Recovery Kit;
3. lose/revoke every active device;
4. recover onto a fresh device;
5. verify complete lost-device inventory;
6. verify recovered history and Revocation Barriers;
7. rotate Tenant Root Key;
8. rotate Recovery Key;
9. create N+1 RecoveryCoverage;
10. export and integrity-check a new N+1 Recovery Kit;
11. confirm user custody;
12. prove old device/old kit cannot authorize future epoch;
13. resume future sync only after all gates pass.

### Recovery Kit leakage inspection

Inspect:

- file export;
- QR/export representation if used;
- share sheet;
- temp files;
- OS backup behavior;
- telemetry/crash logs;
- import and cleanup.

### PASS receipt

`EV-Q005-ALL-DEVICES-LOST-RECOVERY-PHYSICAL-<date>.md`

## Phase P7 — Provider / policy closure

This phase is evidence from provider processes, not a code assertion.

### Q-003

- public restricted-scope verification state recorded;
- Google determines security-assessment applicability for the actual architecture;
- required assessment completed if applicable;
- production consent/disclosure package matches actual data path.

### Rule

```text
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
```

### PASS receipt

`EV-Q003-GOOGLE-PRODUCTION-VERIFICATION-<date>.md`

## Phase P8 — Closure receipts

Only after physical evidence exists:

### Q-003 receipt must bind

- exact production OAuth architecture;
- physical lifecycle evidence;
- mobile credential evidence;
- provider verification/assessment outcome;
- residual provider/platform risks.

### Q-004 receipt must bind

- final data matrix;
- real transport/storage inspection;
- deletion/backup evidence;
- telemetry redaction evidence;
- Privacy Inspector measurable claims;
- residual metadata/backup risks.

### Q-005 receipt must bind

- production crypto profile + tested library versions;
- cross-platform interop;
- protected mobile key/anchor evidence;
- witness topology/quorum evidence;
- crash/partition behavior;
- physical recovery/cutover;
- deletion/retention behavior;
- metadata leakage analysis;
- security review findings/residual risks.

Only then may the closure graph change:

```text
Q-003 ACTIVE → CLOSED
Q-004 ACTIVE → CLOSED
Q-005 ACTIVE → CLOSED
```

and only then may A-001/SEC-001/DM-001 be promoted according to their own receipts.

## Campaign stop rules

Stop and reopen design if any physical run shows:

- plaintext financial/Gmail data crossing the forbidden cloud boundary;
- exportable long-lived production private key fallback;
- cross-tenant authorization acceptance;
- rollback/fork accepted as current;
- recovery resuming before new recovery coverage/kit exists;
- deleted tenant resurrected by backup restoration;
- provider policy requirement incompatible with ADR-020;
- evidence tooling cannot sanitize output safely.

## Final law

```text
DOCUMENTED != VERIFIED
SPIKE PASS != PHYSICAL PASS
PHYSICAL PASS != CLOSED
CLOSED REQUIRES RECEIPT + RESIDUAL RISK
BUILD_READY REQUIRES THE GRAPH, NOT OPTIMISM
```