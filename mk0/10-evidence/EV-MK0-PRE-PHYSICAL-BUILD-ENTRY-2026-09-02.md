# EV-MK0 — Pre-Physical Build Entry Receipt — 2026-09-02

Status: PASS FOR PRE-PHYSICAL BUILD ENTRY  
Scope: synthetic mobile product/UX + documentary threat-model closure only  
Production physical closure: OPEN

## Tested source snapshot

```text
BRANCH            jett/mk0-foundation
TESTED_HEAD_SHA   fd43bf75fed9c3b7e29b84670adb4e8d0056c62c
FLUTTER            3.44.7
DART               3.12.2
ANDROID_MIN_SDK    31
ANDROID_TARGET_SDK 36
```

## Independent CI evidence

### FinanceSensor Mobile Shell

```text
WORKFLOW_RUN_ID 33686943556
JOB_ID          100436549043
CONCLUSION      SUCCESS
flutter analyze PASS
flutter test    7 / 7 PASS
APK build       PASS
```

Executed signature viewport checks:

```text
360x800  Home no-scroll + critical answers visible            PASS
360x800  Sensor no-scroll + 3 material signals visible        PASS
360x800  Opportunity primary option visible without scroll     PASS
360x800  Needs Review decision context visible                 PASS
393x852  Movements intrinsic chronological scroll              PASS
393x852  Sensor opportunity/review/change flows                PASS
430x900  You / synthetic privacy boundary                      PASS
```

### FinanceSensor Heartbeat

```text
WORKFLOW_RUN_ID 33686943595
VITAL_SIGNS_JOB 100436549096  SUCCESS
ANDROID_APK_JOB 100436549337  SUCCESS
```

The Heartbeat independently repeated `analyze`, viewport tests and Android debug APK compilation on the same tested source snapshot.

### FinanceSensor Public Readiness

```text
WORKFLOW_RUN_ID 33686943609
CONCLUSION      SUCCESS
```

The public-repository safety certificate passed on the same tested source snapshot.

## Debug APK evidence

```text
ARTIFACT_NAME       financesensor-mobile-shell-android-debug
ARTIFACT_ID         9868628121
APK_BYTES           150396010
APK_SHA256          0d66c91defa4e7047b93a2bc96939413f3d4b687566eb2305574c75886238649
ARTIFACT_ZIP_BYTES  68161817
ARTIFACT_ZIP_SHA256 e6120876af23b977ecbbe431ebc2d94b5ca057b2376fa0705933b01c4272c415
```

The APK is a DEBUG-ONLY synthetic Mobile Shell. It is evidence that the selected product stack, Android baseline and signature layout compile together. It is not a production/release artifact.

## Synthetic / trust-boundary facts

```text
NETWORK_DEPENDENCIES=0
REAL_OAUTH_SURFACE=0
REAL_GMAIL_SURFACE=0
REAL_FINANCIAL_DATA=0
APK_RELEASE_CLAIMED=0
BUILD_READY_CLAIMED_BY_MOBILE_SHELL=0
```

No real Gmail authorization, Gmail content, OAuth secret, financial plaintext or production cryptographic authority was placed into GitHub Actions.

## Documentary closure bound by this receipt

The following build-entry questions are now sufficiently frozen to stop being pre-physical blockers:

```text
THREAT_MODEL          PASS_FOR_BUILD_ENTRY
SIGNATURE_WIREFRAMES  PASS_FOR_BUILD_ENTRY
NO_SCROLL_CONTRACT    PASS_FOR_BUILD_ENTRY
```

Threat inventory authority:
- `mk0/04-architecture/THREAT-MODEL.md`

Signature UX authority:
- `mk0/03-design/PRODUCT-DESIGN.md`
- `mk0/06-wireframes/SIGNATURE-WIREFRAMES.md`

Viewport authority:
- `mk0/06-wireframes/VIEWPORT-CONTRACT.md`
- `spikes/mobile-shell/test/widget_test.dart`

## Explicit non-claims

```text
PRE_PHYSICAL_BUILD_ENTRY=PASS
PRE_PHYSICAL_DOCUMENT_BLOCKERS=0
PHYSICAL_ANDROID_USABILITY=OPEN
MOBILE_OAUTH_PHYSICAL_PROVEN=NO
MOBILE_CRYPTO_PHYSICAL_PROVEN=NO
LOCAL_STORAGE_PHYSICAL_PROVEN=NO
SECURITY_PHYSICALLY_PROVEN=NO
WF_001=CLOSURE_OPEN
SEC_001=CLOSURE_OPEN
Q003_Q004_Q005=ACTIVE
G_MK0=BLOCKED
BUILD_READY=NO
```

This receipt does **not** promote `WF-001`, `SEC-001`, `Q-003`, `Q-004`, `Q-005` or `G-MK0` in the closure ledger.

## Laws preserved

```text
APK_BUILD_PASS != BUILD_READY
SYNTHETIC_WIDGET_PASS != PHYSICAL_ANDROID_PASS
DOCUMENT_COMPLETE != SECURITY_PROVEN
PUBLIC_REPOSITORY != FINANCESENSOR_TRUSTED_EDGE
GITHUB_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```

## Next gate

Track A pre-physical documentary closure is exhausted. The remaining build-entry distance is dominated by the P0-P8 physical/provider campaign and downstream closure receipts.
