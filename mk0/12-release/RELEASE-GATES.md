# MK0 / 12 — Release Gates

## Build-entry gates

No full MK0 build starts until:

```text
PRODUCT_DEFINITION       PASS
MK0_SCOPE                FROZEN
P0_QUARRIES              CLOSED
TENANCY_MODEL            PASS
FINANCIAL_MODEL          PASS
EVENT_INVARIANTS         PASS
EDGE_CLOUD_BOUNDARY      PASS
PRIVACY_MODEL            PASS
THREAT_MODEL             PASS
GMAIL_FEASIBILITY        PASS
ANDROID_FEASIBILITY      PASS
MULTI_DEVICE_DESIGN      PASS
SIGNATURE_WIREFRAMES     PASS
NO_SCROLL_CONTRACT       PASS
IMPLEMENTATION_PLAN      PASS

BUILD_READY              YES
```

## Release candidate gates

### Product correctness

```text
CANONICAL_RESOLUTION     PASS
DEDUPLICATION            PASS
IDEMPOTENCY              PASS
TRANSFER_SEMANTICS       PASS
CARD_PAYMENT_SEMANTICS   PASS
REFUND_REVERSAL          PASS
CATEGORY_FOUNDATION      PASS
RECURRING_FOUNDATION     PASS
PROVENANCE               PASS
NEEDS_REVIEW             PASS
```

### Security / privacy

```text
LEAST_PRIVILEGE          PASS
TOKEN_STORAGE            PASS
LOCAL_DB_ENCRYPTION      PASS
E2EE_SYNC                PASS
TENANT_ISOLATION         PASS
DEVICE_ENROLLMENT        PASS
DEVICE_REVOCATION        PASS
LOG_REDACTION            PASS
DELETE_REVOKE_FLOW       PASS
PRIVACY_INSPECTOR        PASS
```

### Multi-device

```text
TWO_DEVICE_CONVERGENCE   PASS
DUPLICATE_DELIVERY       PASS
OFFLINE_REJOIN           PASS
VERSION_SKEW_SUPPORTED   PASS / bounded documented policy
LEASE_FAILURE_SAFE       PASS
```

### Device quality

```text
LOW_END_ANDROID          PASS
MID_RANGE_ANDROID        PASS
BATTERY_ENVELOPE         PASS
THERMAL_ENVELOPE         PASS
BACKGROUND_WORK          PASS
LOCAL_STORAGE_GROWTH     PASS
```

Thresholds must be measured/frozen before RC evaluation; placeholder PASS labels are not metrics.

### UX

```text
HOME_NO_SCROLL           PASS
SENSOR_NO_SCROLL         PASS
OPPORTUNITY_SIGNATURE    PASS
NEEDS_REVIEW_SIGNATURE   PASS
SMALL_VIEWPORT           PASS
ACCESSIBILITY_BASELINE   PASS
LOADING_EMPTY_ERROR      PASS
HUMAN_COMPREHENSION      PASS
```

### Source lifecycle

```text
GMAIL_CONNECT            PASS
GMAIL_INCREMENTAL_SYNC   PASS
GMAIL_REAUTH             PASS
GMAIL_REVOKE             PASS
SOURCE_DISCONNECT        PASS
```

## Evidence binding

Every release gate must reference physical evidence from `mk0/10-evidence/` for the exact release candidate.

Recommended binding:

```text
source commit SHA
build artifact identifier/hash
schema version
rules/parser version
app version
cloud/control-plane version
required evidence IDs
```

## Release states

```text
NOT_READY
BUILD_READY
INTEGRATION_READY
RC
RELEASE_READY
RELEASED
```

No state is inferred from schedule or enthusiasm.

## Definition of Done

```text
FINANCIAL_TRUTH          PASS
PRIVACY                  PASS
SECURITY                 PASS
MULTI_DEVICE             PASS
ANDROID_COMPATIBILITY    PASS
SOURCE_RELIABILITY       PASS
SIGNATURE_UX             PASS
EVIDENCE                 PASS
SCOPE_FROZEN             PASS

RELEASE_READY            YES
```

Anything less remains an engineering candidate, not a released financial system.
