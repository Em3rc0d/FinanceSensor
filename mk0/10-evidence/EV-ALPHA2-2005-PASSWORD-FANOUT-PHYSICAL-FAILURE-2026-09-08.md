# EV — Alpha.2 +2005 password fan-out physical failure

Date: 2026-09-08
Project: FinanceSensor
Observed candidate: `0.2.0-alpha.2+2005`
Stable-signed APK SHA256: `530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85`
Evidence class: SANITIZED OWNED-DEVICE OBSERVATION

## Observation

The stable-signed +2005 APK installed and launched on the owned Android device, completed real Google OAuth with the stable signer, used the exact `gmail.readonly` scope, scanned Gmail-derived financial evidence and reached the BCP Savings local password handoff.

After one local password submission, the product presented additional visually indistinguishable `BCP · SAVINGS` password dialogs. Choosing `Ahora no` allowed the refresh to complete with a partial dashboard, Gmail-observed movements and zero imported statements.

No screenshot, PDF, password, Gmail message id, attachment id, token, account number, merchant-level financial plaintext or private signing material is committed by this receipt.

## What this proves

- stable-signer Android OAuth is physically viable for the registered package/signer pair;
- Gmail read-only discovery and minimized Gmail-derived evidence are physically reachable;
- the +2003 dialog teardown defect is no longer the observed blocker;
- the +2004 global post-password fetch failure boundary is no longer the only observable behavior;
- +2005 still does **not** prove BCP Savings PDF decryption, strict parsing, SQLCipher physical persistence or complete Alpha.2 success.

## Root cause identified in +2005 orchestration

`Alpha2Pipeline.refresh` asked the password provider independently for each strong BCP Savings statement candidate. Multiple eligible EECC therefore produced repeated dialogs that were visually indistinguishable because the UI exposed only institution/product, not a persistent statement identity.

PR #111 repaired that proven fan-out defect by caching one session-only password per profile for one refresh and by caching `Ahora no` as a skip decision for the remainder of that profile in the same refresh. The cache is cleared when refresh completes and is never persisted or synchronized.

The +2005 dashboard also under-reported statement review state because only `REVIEW_REQUIRED` contributed to `EECC a revisar`; `PASSWORD_REQUIRED`, `FETCH_REJECTED` and `PDF_REJECTED` were hidden behind a misleading zero. PR #111 repaired that count.

## Successor hardening before another physical run

To avoid forcing repeated APK trials merely to discover the next boundary, successor candidate +2006 additionally projects only coarse, sanitized statement-stage gaps:

- `STATEMENT_PASSWORD_REQUIRED`
- `STATEMENT_FETCH_REJECTED`
- `STATEMENT_PDF_REJECTED`
- `STATEMENT_STRICT_REVIEW_REQUIRED`
- `STATEMENT_PERSISTENCE_REJECTED`

No provider exception text, PDF content, password, Gmail identifier or account identifier is carried by these diagnostics.

## Reopen decision

Runtime source changed after the +2005 physical observation. Under `SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN`, +2005 becomes historical for continuation and cannot donate R1/R2 physical PASS to its successor.

```text
+2005_STABLE_SIGNING=HISTORICAL_PASS
+2005_R2_CONTINUATION=STOPPED
+2005_PHYSICAL_ALPHA2_PASS=NO
+2006_CANONICAL_REFREEZE=IN_PROGRESS
R1_TRUSTED_EDGE_SIGNING=REOPEN_AFTER_NEW_CANONICAL_APK
R2_PHYSICAL_CAMPAIGN=BLOCKED
PHYSICAL_SQLCIPHER_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```
