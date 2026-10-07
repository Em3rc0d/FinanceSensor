# EV — Alpha.2 +2007 R2 OD2 metadata-first statement discovery

Date: 2026-09-14  
Candidate: `0.2.0-alpha.2+2007`  
Stable signed APK SHA256: `40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab`

## Result

`OD2_METADATA_FIRST_STATEMENT_DISCOVERY = PASS`

This gate closes from a compound proof on the exact stable-signed +2007 candidate. It does not infer OD3 or later physical success.

## Owned-device observation

After the fresh OD1 reconnect on the same installed +2007 APK, FinanceSensor returned from Google into the connected app and progressed to the local statement-opening handoff for the allowed savings profile. Raw screenshots are intentionally not committed.

That handoff is significant because the frozen +2007 pipeline invokes the local handoff only after the native scanner has returned a candidate that is `STRONG`, `fetchEligible`, and bound to the strict savings profile. Attachment byte retrieval occurs later and only after local authority is supplied.

## Frozen source-order proof

`spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt` enforces the discovery order:

1. bounded Gmail list query;
2. `format=metadata` with only `From`, `Subject`, and `Date`;
3. one-profile metadata match;
4. `format=full` partial response containing MIME descriptor fields (`mimeType`, `filename`, `body(size,attachmentId)`) but not body data;
5. exactly one valid PDF descriptor becomes an opaque native `STRONG` handle;
6. scan returns `attachmentBytesFetched=false` and `rawMetadataReturned=false`;
7. raw Gmail message/attachment identifiers remain inside the native in-memory handle registry.

The scanner's attachment endpoint exists only in `fetch(handle, token)`, which rejects non-enabled profiles before any attachment request.

`spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart` enforces the cross-layer order:

1. `ingress.scan()` returns minimized evidence and statement candidate handles;
2. non-`STRONG`, non-fetch-eligible, and non-BCP-savings candidates are quarantined before the local opening handoff;
3. the local opening handoff runs before `ingress.fetchStatementBytes(...)`;
4. attachment bytes therefore cannot be fetched before the observed strong-candidate handoff.

The existing Alpha.2 discovery validator also locks `metadataHeaderGateBeforeMimeProjection=true`, `mimeProjectionBodyDataSelected=false`, download eligibility at `STRONG`, and raw sender/subject/filename exclusion.

## Claims closed

- `METADATA_FIRST_PASS`
- `ATTACHMENT_BYTES_NOT_FETCHED_BEFORE_STRONG_CANDIDATE`
- `RAW_GMAIL_IDENTITY_REMAINS_NATIVE_ONLY`

## Boundary

OD3 remains open. The observed local handoff proves the scanner reached a permitted strong candidate before fetch; it does not prove that attachment retrieval subsequently succeeded on the owned device.

No Google identity, token, Gmail message/attachment identifier, MIME body, statement file, local opening secret, financial plaintext, account identifier, or raw screenshot is committed.

`Q-003`, `Q-004`, `Q-005`, `G-MK0`, `BUILD_READY`, and `RELEASE_READY` remain open/false.
