# EV-PHYSICAL-CAMPAIGN — P0 Harness Sanitization PASS

**Date:** 2026-09-03  
**Phase:** P0 — Harness integrity  
**Status:** PASS  
**Evidence class:** COMPOSITE PHYSICAL RECEIPTS + ADVERSARIAL ALLOWLIST  
**Q-003/Q-004/Q-005 closure:** NO  
**BUILD_READY:** NO

## Claim under test

The physical-evidence publication harness must fail closed before any real execution output can enter GitHub. P0 is limited to the evidence/publication boundary: it proves that real-device observations can be reduced to a public-safe receipt and that the sanitizer rejects raw sensitive fields.

It does **not** claim that P1–P7 product/security properties have passed and does not claim that raw local capture itself contains no sensitive material.

## Evidence composition

P0 is closed from two complementary evidence classes.

### A. Existing owned-device physical receipts

The following already-recorded physical runs used real Google/Gmail authorization on an owned Android device and committed only reduced public receipts:

| Physical source | Git blob SHA | Relevant physical publication fact |
|---|---|---|
| `EV-Q003-ANDROID-GMAIL-R1-PHYSICAL-CONNECT-PASS-2026-09-02.md` | `b9316381264d506822de130c929a78b8ff4be5c3` | raw screenshots not committed; account identity, real Gmail content and token material not recorded; exact unnecessary values redacted |
| `EV-Q003-ANDROID-R2-LOCAL-DISCONNECT-PASS-PROVIDER-REVOKE-UNVERIFIED-2026-09-02.md` | `60080dbf911ec7b6216708393d4457e3a62fe92b` | no screenshots, account identity, access token, Gmail content, history identifier value, provider response body, private signing material or financial plaintext in the public receipt |
| `EV-Q003-ANDROID-R2-STABLE-LOCAL-LIFECYCLE-PASS-2026-09-03.md` | `4d1b34f23f806709c1f50995c588ce71b51dd943` | same bounded public-output boundary held through stable install/authorize/disconnect/reconnect execution |

These physical receipts demonstrate the **real execution → local reduction/redaction → public receipt** path. Raw evidence is not imported into the repository.

### B. Executable adversarial sanitizer guard

The publication implementation is independently frozen by Git blob identity:

| Static source | Git blob SHA | Role |
|---|---|---|
| `tools/physical-evidence-sanitizer.mjs` | `c25e2b04c192cda6d31084daff3873a0f1c6cd09` | allowlist-only public evidence schema |
| `tools/validate-physical-evidence-sanitizer.mjs` | `102c77ed0f5cf43e54f5ba3de15d52684e79cce7` | adversarial toxic-field attack against the sanitizer |

The adversarial guard deliberately supplies email identity, subject/body/message identifiers, bearer material, refresh-token-shaped material, client secret, authorization code, PKCE verifier and private-key-shaped material. The test requires all raw-only fields to be absent after sanitization and explicitly records that the synthetic test itself is **not** physical evidence.

## P0 claim matrix

```text
OUTPUT_ALLOWLIST_ACTIVE
  PASS — allowlist implementation + adversarial unknown-field rejection

SECRET_VALUE_PRINTING_DISABLED
  PASS — toxic secret-shaped values do not cross the public schema; real-device receipts contain no token/private material

REAL_GMAIL_IDENTIFIERS_ABSENT_FROM_SANITIZED_OUTPUT
  PASS — owned-device receipts intentionally omit account identity, message content and exact history identifiers

PRIVATE_KEY_BYTES_ABSENT
  PASS — synthetic private-key material is rejected; physical receipts contain no private signing material

PACKET_STORAGE_EVIDENCE_REDUCED_LOCALLY
  PASS — provider response bodies/raw screenshots and other raw physical observations remain outside GitHub; only bounded facts are committed

UNNECESSARY_EXACT_IDENTIFIERS_REMOVED_OR_PSEUDONYMIZED
  PASS — exact message totals/history identifiers/account identity are redacted or not recorded when unnecessary
```

## Immutable binding

Machine-readable binding:

`graph/physical-receipts/P0-2026-09-03.json`

The P0 validator recomputes Git blob identities for every bound source. Changing a source receipt or sanitizer implementation invalidates the binding until P0 is explicitly re-reviewed and rebound.

Source baseline before this promotion:

`dcc5514aa503a32b6449e24e9ab0080b7692db33`

## Residual risks and limits

```text
P0_VALIDATES_PUBLICATION_BOUNDARY_NOT_RAW_LOCAL_CAPTURE_ABSENCE
P0_DOES_NOT_PROVE_P1_P7_PRODUCT_PROPERTIES
```

P0 proves that public evidence is minimized/sanitized before repository publication. It does not claim that transient raw material never exists on the controlled local edge while a later physical phase is being measured. That is evaluated by the applicable P1–P7 phase.

Likewise:

```text
P0 PASS != P1 PASS
P0 PASS != P2 PASS
P0 PASS != P3 PASS
P0 PASS != P4 PASS
P0 PASS != P5 PASS
P0 PASS != P6 PASS
P0 PASS != P7 PASS
P0 PASS != P8 PASS
P0 PASS != Q-003 CLOSED
P0 PASS != Q-004 CLOSED
P0 PASS != Q-005 CLOSED
P0 PASS != BUILD_READY
```

## Governing conclusion

```text
P0                                      PASS
PHYSICAL RECEIPT ORIGIN                 EXISTING OWNED-DEVICE EXECUTIONS
ALLOWLIST ADVERSARIAL GUARD             PASS / REVALIDATED BY CI
RAW PHYSICAL EVIDENCE IN GITHUB         FORBIDDEN
SANITIZED RECEIPTS IN GITHUB            ALLOWED
Q-003                                   ACTIVE
Q-004                                   ACTIVE
Q-005                                   ACTIVE
BUILD_READY                              NO
```
