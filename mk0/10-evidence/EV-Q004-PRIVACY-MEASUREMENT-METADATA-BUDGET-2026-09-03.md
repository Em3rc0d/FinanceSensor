# EV-Q004 — Privacy measurement and metadata leakage budget

**Date:** 2026-09-03  
**Node:** Q-004  
**Status:** STATIC_CI_PASS_PHYSICAL_OPEN  
**Q-004 closure:** NO

## Purpose

Convert two Q-004 privacy promises from narrative requirements into executable contracts before physical P2/P3/P4 evidence is collected:

1. the S-10 Privacy Inspector may show only values that have a defined measurement authority;
2. cloud-visible metadata is deny-by-default and exhaustively budgeted across the existing privacy inventory.

This receipt records static/CI evidence only. It does not claim physical storage, network, deletion, backup, credential-custody or mobile-crypto privacy PASS.

## Privacy inventory

The three authoritative matrices remain the source inventory:

```text
PRIVACY-DATA-MATRIX.json          19 classes
PRIVACY-RECOVERY-MATRIX.json       5 classes
PRIVACY-DELETION-MATRIX.json       1 class
TOTAL                             25 classes
```

The metadata validator derives the cloud partition from the matrices rather than maintaining a second independent classification source:

```text
CLOUD_VISIBLE_CLASSES             12
CLOUD_FORBIDDEN_CLASSES           13
TOTAL                             25
UNCLASSIFIED_VISIBLE_FIELD        FAIL
```

## Metadata leakage budget

`mk0/04-architecture/PRIVACY-METADATA-BUDGET.json` freezes four cloud-visible surfaces:

```text
CONTROL_PLANE
E2EE_RELAY
INDEPENDENT_WITNESS
TELEMETRY
```

The visible class set is exhaustive and deny-by-default. Any new matrix class that becomes cloud-visible without being assigned to an explicit surface fails CI.

Critical boundaries include:

```text
GMAIL_CREDENTIAL                    CLOUD FORBIDDEN
GMAIL RAW CONTENT                   CLOUD FORBIDDEN
FINANCIAL PLAINTEXT                 CLOUD FORBIDDEN
TENANT ROOT KEY PLAINTEXT           CLOUD FORBIDDEN
DEVICE PRIVATE KEY                  CLOUD FORBIDDEN
RECOVERY PRIVATE KEY                CLOUD FORBIDDEN

INDEPENDENT WITNESS                 OPAQUE CHECKPOINT METADATA ONLY
REAL TENANT ID AT WITNESS           FORBIDDEN
FINANCIAL CIPHERTEXT AT WITNESS     FORBIDDEN
CROSS-WITNESS IDENTIFIER            FORBIDDEN

TELEMETRY                           DIAG-TELEMETRY CLASS ONLY
UNCLASSIFIED OBSERVED FIELD         FAIL
```

Physical validation remains bound to P3, including `FORBIDDEN_PLAINTEXT_ABSENT_FROM_NORMAL_CLOUD_PATH` and per-surface byte/accounting observations.

## Privacy Inspector measurement contract

`mk0/04-architecture/PRIVACY-MEASUREMENT-CONTRACT.json` binds S-10 to explicit measurement sources.

Main visible claims:

```text
Correos revisados                  LOCAL_INGRESS_ENUMERATION_COUNTER
Evidencias financieras            LOCAL_EXTRACTION_COMMIT_COUNTER
Movimientos resueltos             CANONICAL_RESOLVER_COMMIT_COUNTER
Correos guardados                  PHYSICAL_STORAGE_INSPECTION / P3
Cifrada de extremo a extremo ✓     PHYSICAL_MOBILE_CRYPTO_INTEROP / P4
```

Fail-closed display rules:

```text
MISSING_RUNTIME_COUNTER            != 0
MISSING_STORAGE_SAMPLE             != 0
MISSING_NETWORK_SAMPLE             != 0
ARCHITECTURE_ASSERTION             != MEASURED_ZERO
CI_PASS                            != PHYSICAL_ZERO
E2EE_DESIGN                        != VERIFIED_CHECKMARK
```

Therefore S-10 cannot display `Correos guardados = 0` until the matching P3 physical storage claim passes, and cannot display the E2EE verification checkmark until every required P4 mobile crypto interoperability claim passes.

## Executable guards

New/extended guards:

- `tools/validate-privacy-metadata-budget.mjs`
- `tools/validate-privacy-measurement.mjs`
- `tools/validate-privacy-matrix.mjs` imports both guards inside the existing Privacy boundary ECG.

The S-10 semantic binding deliberately ignores only wireframe box-drawing/layout glyphs and whitespace. It does not weaken the required labels or measurement semantics.

## CI evolution and guard behavior

The first static integration correctly failed closed because the E2EE label spans two visual lines in the ASCII wireframe.

```text
RUN 33766800480    Privacy boundary ECG    FAIL
CAUSE              E2EE label binding rejected
```

A first whitespace-only normalization remained intentionally insufficient because the visual line boundary also contains box-drawing glyphs:

```text
RUN 33767104065    Privacy boundary ECG    FAIL
CAUSE              E2EE label binding still rejected
```

The final narrowly scoped normalization strips only layout box glyphs plus whitespace before semantic matching:

```text
IMPLEMENTATION_HEAD                    2eff5430e52db02ca312cd9359f1dcdc79e4b0f6
HEARTBEAT_RUN                          33767408622
VITAL_SIGNS_JOB                        100688871384
PRIVACY_BOUNDARY_ECG                   PASS
ALL_VITAL_SIGNS                        PASS
```

The successful Privacy boundary ECG includes:

```text
FINANCESENSOR_PRIVACY_METADATA_BUDGET     PASS
PRIVACY_CLASSES                           25
CLOUD_VISIBLE_CLASSES                     12
CLOUD_FORBIDDEN_CLASSES                   13
METADATA_SURFACES                         4
UNCLASSIFIED_OBSERVED_FIELD               FAIL
PHYSICAL_NETWORK_PRIVACY_PASS_CLAIMED_BY_CI 0

FINANCESENSOR_PRIVACY_MEASUREMENT_CONTRACT PASS
UNMEASURED_ZERO_PROMOTION                 FORBIDDEN
UNMEASURED_E2EE_VERIFIED_PROMOTION        FORBIDDEN
PHYSICAL_PRIVACY_PASS_CLAIMED_BY_CI       0
```

Public repository safety also passed on the same implementation head:

```text
PUBLIC_READINESS_RUN                  33767408675
RESULT                                SUCCESS
CURRENT_TREE_EXPOSURE_GUARD           PASS
CI_TRUST_BOUNDARY_GUARD               PASS
FULL_REACHABLE_HISTORY_SECRET_AUDIT   PASS
```

## Physical boundary remains open

Static evidence does not close the physical campaign.

Q-004 still requires the exact P0 + P2 + P3 physical claims, including:

- physical harness sanitization;
- Android and iOS protected OAuth custody;
- absence of token/Gmail/financial plaintext from ordinary storage and logs;
- protected credential deletion/restore behavior;
- physical cloud-path plaintext inspection;
- proof raw Gmail content is not durable;
- cloud envelope/control metadata/witness deletion;
- deletion resurrection barrier;
- backup non-resurrection and <=35-day retention ceiling.

The S-10 E2EE checkmark additionally depends on P4, owned by Q-005 physical crypto interoperability.

## Governing conclusion

```text
PRIVACY_INVENTORY                    MACHINE_VALIDATED
METADATA_LEAKAGE_BUDGET              STATIC_CI_PASS / P3 OPEN
PRIVACY_INSPECTOR_MEASUREMENT        STATIC_CI_PASS / P3+P4 OPEN
PRIVACY_THEATER                      FAIL_CLOSED
PHYSICAL_P0                          OPEN
PHYSICAL_P2                          OPEN
PHYSICAL_P3                          OPEN
PHYSICAL_P4                          OPEN FOR E2EE DISPLAY CLAIM
Q004                                 ACTIVE
BUILD_READY                          NO
```
