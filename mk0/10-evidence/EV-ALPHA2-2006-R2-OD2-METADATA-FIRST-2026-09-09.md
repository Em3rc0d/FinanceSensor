# EV — Alpha.2 +2006 R2 OD2 metadata-first discovery

Date: 2026-09-09

## Authority

```text
CANDIDATE=0.2.0-alpha.2+2006
SOURCE_COMMIT=e26bab7cd87c5e686898998e867d8fb25c99db27
SIGNED_APK_SHA256=36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0
SIGNED_APK_BYTES=182125094
ANDROID_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

## Physical refresh observation

After OD1 fresh OAuth, the operator invoked `Actualizar` on the same installed candidate. The refresh entered its busy state and returned to the interactive dashboard. The sanitized post-refresh state was:

```text
GMAIL_OBSERVED=6
STATEMENTS_IMPORTED=0
STATEMENTS_TO_REVIEW=8
QUARANTINED_PROFILE_COUNT=3
KNOWN_GAPS=14
STATEMENT_GMAIL_DOWNLOAD_FAILURES=8
```

No raw Gmail identity, statement bytes, transaction values, account identifiers, or statement password are retained here.

## Frozen call-path proof

The exact +2006 runtime separates discovery from attachment retrieval:

1. native statement discovery scans Gmail metadata/MIME descriptors and emits strong statement candidates as opaque handles;
2. attachment bytes are not retrieved by the discovery scan;
3. raw Gmail message/attachment identity remains in the native handle registry rather than crossing into Dart;
4. the Dart pipeline quarantines non-strong or non-fetch-eligible candidates before `fetchStatementPdf` can be invoked;
5. attachment retrieval is a separate native call reached only after the strong-candidate/fetch-eligibility boundary.

The physical refresh reached eight sanitized `FETCH_REJECTED` outcomes. In the frozen call path that outcome can only occur after metadata discovery and eligibility evaluation, and before parser/persistence execution.

Therefore the combined frozen-source contract plus the physical refresh closes OD2 without claiming OD3.

```text
OD0=PASS
OD1=PASS
OD2_METADATA_FIRST_DISCOVERY=PASS
OD3_BOUNDED_FETCH=OPEN
OD3_CURRENT_BLOCKER=ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED
OD4..OD11=BLOCKED_BY_PRIOR_GATE
```

## Important boundary

The eight download failures are **not** treated as wrong-password or parser failures. The +2006 single-pass diagnostic mapping assigns `FETCH_REJECTED` to the Gmail attachment download stage, while password, parser and persistence failures have separate stages.

OD3 remains open because this run did not produce a successful allowed-profile attachment retrieval and the current UI intentionally does not expose the lower-level sanitized native fetch code needed to distinguish an HTTP rejection from another native attachment-fetch rejection.

A source/APK identity change would reopen R1/R2 under the frozen campaign law, so no diagnostic UI patch is introduced merely to manufacture more evidence for the existing +2006 candidate.
