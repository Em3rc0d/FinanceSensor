# EV — Alpha.2 +2004 R1 v6 refreeze

Date: 2026-09-08
Project: FinanceSensor
Candidate: `0.2.0-alpha.2+2004`
Evidence class: SANITIZED REPOSITORY / PUBLIC-CI DESIGN AND BINARY AUTHORITY

## Why R1/R2 reopened

The stable-signed `+2003` owned-device campaign reached the EECC password flow and exposed a Flutter dialog-lifecycle assertion. PR #103 repaired the controller ownership/teardown lifecycle and passed exact post-merge Android workflows. Because runtime source and APK identity changed, the frozen reopen law applies: the `+2003` trusted-edge signing PASS remains historical, but neither its signed APK nor any R2 physical observation may be inherited by `+2004`.

## Canonical +2004 authority

Stage A PR #104 merged as `8030a8a2946f7ea288290f64662e52a928d851a3`.

Post-merge canonical authority:

- candidate: `0.2.0-alpha.2+2004`
- source commit: `8030a8a2946f7ea288290f64662e52a928d851a3`
- workflow: `Alpha.2 Integrated Runtime`
- run: `34243314002`
- job: `102118791920`
- artifact: `10063170773`
- artifact ZIP SHA256: `346e51e507f0f2328508747afc69234be4217046783ef25bfe872203da848d75`
- canonical input APK SHA256: `14d8134bd6686291155d411e8938af632f1bba0d6ba1b94b5f86b35b13fbc1c1`
- canonical input APK bytes: `182091971`
- minSdk: `31`
- targetSdk: `36`
- package: `com.financesensor.lab.gmailconnection.r2`
- exact Gmail scope: `gmail.readonly`

Independent artifact download reproduced the GitHub artifact digest and inner APK SHA/bytes. ZIP integrity passed.

Post-merge consensus on the Stage A SHA:

- Alpha.2 Integrated Runtime `34243314002`: SUCCESS
- Alpha.2 Design Freeze `34243319410`: SUCCESS
- FinanceSensor Heartbeat `34243313877`: SUCCESS
- FinanceSensor Public Readiness `34243313903`: SUCCESS

## R1 v6 frozen handoff

The trusted-edge signer is repinned to the canonical `+2004` input only. Current signer authorities:

- PowerShell signer Git blob: `f8090c669f1532698b65043d91cb63cdefa2b589`
- CMD signer Git blob: `3d01373b69051d30f88a57f26fa815e52d952d6d`
- expected stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- password handoff: redirected native-process stdin only
- direct password pipe: forbidden
- private signing material in public CI: forbidden

Initial deterministic v6 generation on PR #105:

- observed PR head: `bee7518dec724863e60d25733a824791846d5c6d`
- R1 run: `34246846876`
- job: `102130898420`
- artifact: `10064357867`
- artifact wrapper SHA256: `2dc25ab17a6562a7978f2c81ea7e2f6c29e750074b5f74f90db4afcc45e9ed42`
- inner bundle: `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v6.zip`
- inner v6 SHA256: `6c5c2baa20f7a266d5ec2b45f225124a0a15e7381776c739f091fead5023cd1d`
- inner v6 bytes: `86227316`
- files: `8`
- private-key files: `0`
- secret-like matches: `0`
- ZIP structure: PASS
- ZIP integrity: PASS
- manifest integrity: PASS
- packaged PowerShell Git blob: `f8090c669f1532698b65043d91cb63cdefa2b589`
- packaged CMD Git blob: `3d01373b69051d30f88a57f26fa815e52d952d6d`
- packaged canonical APK SHA256: `14d8134bd6686291155d411e8938af632f1bba0d6ba1b94b5f86b35b13fbc1c1`
- packaged canonical APK bytes: `182091971`
- packaged apksigner SHA256: `2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180`

The downloaded Actions wrapper matched GitHub's artifact digest exactly. The inner v6 ZIP was independently extracted and audited outside Actions. These exact inner bytes are now frozen in `graph/alpha2-r1-signing-handoff.json` and the R1 workflow must reproduce the same SHA256 and byte size on the final exact PR head before merge.

Public CI may build and validate this handoff bundle but cannot originate a physical signing PASS. A future physical receipt must be generated only by the trusted Windows edge with the private R2 keystore and must bind the current `+2004` source/APK identity.

## Current state

- `+2003 R1 trusted-edge signing`: HISTORICAL PASS ONLY
- `+2003 R2 campaign`: STOPPED / NO CONTINUATION
- `+2004 canonical APK`: CLOSED / AUTHORITATIVE
- `+2004 R1 v6 bundle`: READY_FROZEN
- `+2004 R1 trusted-edge physical signing`: OPEN
- `+2004 R2 physical campaign`: BLOCKED_BY_R1
- OD0: BLOCKED_BY_R1_SIGNING
- Q-003 / Q-004 / Q-005: ACTIVE
- G-MK0: OPEN
- PHYSICAL_ALPHA2_PASS: NO
- BUILD_READY: NO
- RELEASE_READY: NO

No private key, keystore, keystore password, OAuth token, Gmail body, PDF, PDF password, raw financial plaintext, account number, or user screenshot is committed by this evidence.
