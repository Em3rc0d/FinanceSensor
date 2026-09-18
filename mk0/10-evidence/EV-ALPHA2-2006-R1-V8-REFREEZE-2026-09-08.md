# EV — Alpha.2 +2006 canonical refreeze and R1 bundle v8

Date: 2026-09-08
Project: FinanceSensor
Candidate: `0.2.0-alpha.2+2006`
Evidence class: SANITIZED CI / PUBLIC-SAFE PRE-SIGNING RECEIPT

## Trigger

Owned-device testing of `+2005` reached stable-signer Google OAuth, exact `gmail.readonly` access and the BCP Savings password handoff, but exposed password prompt fan-out across multiple eligible EECC and insufficient stage observability. PR #111 repaired the prompt fan-out and PR #113 cut a successor with single-pass, privacy-safe statement outcome diagnostics.

The source/APK identity change reopens R1 trusted-edge signing and the R2 owned-device campaign. No `+2005` R1/R2 physical claim is inherited by `+2006`.

## Certified Stage A authority

PR #113 exact head:

```text
CERTIFIED_PR_HEAD=d696322ce97e66e6c401cfe045b3e3c31902d02d
```

Stage A exact-head gates:

```text
FinanceSensor Mobile Shell       run 34277196728  SUCCESS
Alpha.2 Integrated Runtime       run 34277196884  SUCCESS
```

Merge to the long-lived foundation branch:

```text
SOURCE_COMMIT=e26bab7cd87c5e686898998e867d8fb25c99db27
```

Post-merge consensus on that source SHA:

```text
Alpha.2 Integrated Runtime       run 34278019055  SUCCESS
Alpha.2 Design Freeze            run 34278023629  SUCCESS
FinanceSensor Heartbeat          run 34278019107  SUCCESS
FinanceSensor Public Readiness   run 34278019054  SUCCESS
```

## Canonical +2006 binary authority

The sole current canonical public-CI input is the post-merge Integrated Runtime artifact:

```text
CANDIDATE_ID=0.2.0-alpha.2+2006
CANONICAL_RUN_ID=34278019055
CANONICAL_JOB_ID=102235745821
CANONICAL_ARTIFACT_ID=10076715491
CANONICAL_ARTIFACT_NAME=financesensor-alpha2-2006-candidate-34278019055
CANONICAL_ARTIFACT_ZIP_SHA256=f1d958a7134bd56595bbea8680c48099fa4169f3209d17625e1000c81cee5309
CANONICAL_ARTIFACT_ZIP_BYTES=87254679
INPUT_APK_SHA256=11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179
INPUT_APK_BYTES=182102047
APK_SIGNATURE_VERIFY=PASS
APK_AAPT2_PARSE=PASS
ANDROID_MIN_SDK=31
ANDROID_TARGET_SDK=36
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
SINGLE_PASS_EECC_DIAGNOSTICS=YES
PUBLIC_CI_SIGNER=EPHEMERAL_DEBUG
TRUSTED_EDGE_RESIGN_REQUIRED=YES
```

The artifact wrapper digest was independently recomputed after download and matched GitHub. The contained APK digest and byte count also matched the embedded CI evidence.

## Deterministic R1 v8 precomputation

Before asking for another owned-device test, the public-safe handoff was independently assembled from the exact canonical `+2006` APK, exact repository signer sources and the same public `apksigner.jar` authority used by the prior certified handoff.

```text
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v8.zip
BUNDLE_SHA256=c0932d29235f5e213dd2e830c7641796fa9179795744bc71e4dc9dbc4e3dcb80
BUNDLE_BYTES=86232702
BUNDLE_FILES=8
ZIP_INTEGRITY=PASS
MANIFEST_INTEGRITY=PASS
PRIVATE_KEY_FILES=0
SECRET_LIKE_VALUE_MATCHES=0
SIGNER_PS1_GIT_BLOB=91acbc974afcd16e01a14ff531bd1503c812da5b
SIGNER_CMD_GIT_BLOB=3d01373b69051d30f88a57f26fa815e52d952d6d
APKSIGNER_SHA256=2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180
```

This local deterministic precomputation is **not certification** and is not user-facing authority. GitHub-hosted exact-head CI must independently reproduce the same v8 bytes, and the merge SHA must reproduce them again before the bundle may be handed to the trusted edge.

## Supersession boundary

`FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v7.zip` is pinned to `+2005` and is no longer safe to use for current R1/R2 execution:

```text
V7_SHA256=201cc603e2ce144b0848fbaaa793eaa669119bfeea8ffb027c8eec2fd24ef6b1
V7_SAFE_TO_USE=NO
PLUS_2005_SIGNED_APK_SHA256=530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85
PLUS_2005_PHYSICAL_RECEIPT=HISTORICAL_ONLY
PHYSICAL_CLAIM_INHERITANCE_TO_2006=FORBIDDEN
```

Earlier v3-v6 bundles remain superseded for their previously recorded reasons. The abandoned v4 must never be revived.

## Trust boundary

Public CI may compile, verify and deterministically package the public-safe handoff, but it may not perform trusted-edge signing and may not originate physical PASS.

The private `FINANCESENSOR_R2_LAB` keystore, password and private key remain only on the owned trusted edge. No OAuth token, Gmail body/MIME, real Gmail identifier, PDF password, raw statement PDF, financial plaintext, account number or merchant-level physical sample enters this evidence.

Current status:

```text
R1_TRUSTED_EDGE_SIGNING=OPEN
R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

## Next admissible transition

1. Exact-head CI reproduces v8 and validates the complete pre-signing chain.
2. The refreeze PR merges only if its expected head SHA has not moved.
3. Post-merge CI on `jett/mk0-foundation` reproduces the identical v8 bytes again.
4. Only then may v8 be handed to the owned Windows trusted edge.
5. The trusted edge signs the exact canonical input with the frozen stable signer and returns only the generated sanitized `.receipt.txt`.
6. A separate receipt-acceptance transition may then close R1 and unblock OD0. R2, physical Alpha.2, BUILD_READY and RELEASE_READY do not pass merely because signing passes.
