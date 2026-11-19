# EV — Alpha.2 +2008 R1 v10 post-merge freeze — 2026-09-14

## Authority

- Candidate: `0.2.0-alpha.2+2008`
- Product source commit: `45b605d29fe0b90f528e4f0f952ab878080b2f0b`
- Canonical unsigned APK SHA-256: `eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238`
- Canonical unsigned APK bytes: `182515867`
- Canonical promotion merge SHA: `9e38048f88ac9b54589ab5ae7a42e64ed83f1db6`
- Post-merge R1 workflow run: `34882888075`
- Post-merge R1 artifact ID: `10364270078`
- Wrapper artifact digest: `sha256:4dd8bd89cd7850e57d2abeb295fc551382a0342a36ca49698a650c983b9ca364`
- Wrapper artifact bytes: `86267875`

## Frozen trusted-edge handoff

- Inner bundle: `FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v10.zip`
- SHA-256: `598b5e7f10f43eb1c1a1b3a9f1df57328e185825d860a13b3f41a75d8201c213`
- Bytes: `86635935`
- Files: `8`
- Private-key files: `0`
- Secret-like matches: `0`
- Signer PS1 Git blob: `d782f03bb97ca0910436500080bcaf10efc00161`
- Signer CMD Git blob: `3d01373b69051d30f88a57f26fa815e52d952d6d`
- `apksigner.jar` SHA-256: `2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180`

The post-merge artifact was downloaded and its inner bundle was independently hashed after extraction. Its deterministic inner SHA-256 and byte count match the prior exact-head reproduction while the outer `actions/upload-artifact` wrapper digest differs as expected.

## Trust boundary

`R1_V10_FROZEN_BYTES=PASS` means only that the public-safe handoff is deterministic and frozen. It does **not** mean the private trusted-edge signing happened.

- Private signing material in CI: `0`
- Public CI originated physical PASS: `0`
- R1 trusted-edge signing: `PENDING_USER_TRUSTED_EDGE`
- R2 physical campaign: `BLOCKED_BY_R1`
- OD0: `BLOCKED_BY_R1`
- Q-003/Q-004/Q-005: `ACTIVE`
- G-MK0: `OPEN`
- BUILD_READY: `NO`
- RELEASE_READY: `NO`

No raw Gmail identity, statement PDF, PDF password, financial plaintext, OAuth token, private key or keystore is recorded by this receipt.
