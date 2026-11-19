# EV — Alpha.2 +2008 canonical promotion and R1/R2 reset — 2026-09-14

## Authority

- Candidate: `0.2.0-alpha.2+2008`
- Source merge: `45b605d29fe0b90f528e4f0f952ab878080b2f0b`
- Certified PR head: `db1852fb938df79608d1969799cc6c11216743b8`
- Workflow: `Alpha.2 Integrated Runtime`
- Run: `34874126273`
- Job: `104076982845`
- Artifact: `10360246203`
- Artifact name: `financesensor-alpha2-2008-candidate-34874126273`
- Artifact ZIP SHA-256: `f517fac8277bfdfe589758712cb30d3199e8a9415d6a5ea08b4903cee8e03cca`
- Artifact ZIP bytes: `87661508`
- APK SHA-256: `eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238`
- APK bytes: `182515867`
- Package: `com.financesensor.lab.gmailconnection.r2`
- Scope: `gmail.readonly`
- Android baseline: min 31 / target 36 / compile 37

The post-merge artifact passed APK signature verification and aapt2 parsing and carries the +2008 post-password safe-stop diagnostics. Public CI uses an ephemeral debug signer; trusted-edge re-sign remains mandatory.

## Post-merge consensus

The exact +2008 source merge completed the authoritative Integrated Runtime, Heartbeat, Public Readiness, Mobile Shell and R2 contract runs successfully. The resulting APK is therefore eligible to become the single canonical unsigned input for the next R1 signing campaign.

## Reopen law applied

`SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN` applies. The +2007 stable-signed APK and its OD0/OD1/OD2 PASS observations plus OD3 INCONCLUSIVE observation remain historical and non-inheritable.

Current state after promotion:

- R0 canonical chain: CLOSED on +2008.
- R1 trusted-edge signing: OPEN / user trusted edge required.
- R2 owned-device campaign: BLOCKED_BY_R1.
- OD0..OD11 current +2008 PASS count: zero.
- Q-003/Q-004/Q-005: ACTIVE.
- G-MK0: OPEN.
- BUILD_READY: NO.
- RELEASE_READY: NO.

## Privacy and signing boundary

No keystore, password, private key, OAuth token, Gmail identity, raw statement PDF, PDF password, screenshots, merchant-level samples, account number or financial plaintext is included in this receipt. The public-safe v10 handoff bundle is generated from the exact canonical input and contains only the canonical APK, public signing tooling, scripts, CI evidence, source receipt and integrity manifest. Physical signing remains local to the owned Windows trusted edge.
