# Alpha.2 +2013 — strict EECC review physical observation — 2026-09-17

## Classification

- Candidate: `0.2.0-alpha.2+2013`
- Stable-signed APK SHA-256: `4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387`
- Observation class: `OWNED_DEVICE_SANITIZED_OBSERVATION`
- Formal full physical PASS: **NO**
- Physical evidence inheritable by successor: **NO**
- Rebuild of +2013 required: **NO**
- Successor product source required: **YES**

## Sanitized observation

On the owned Android device, the exact +2013 signed application reached a real Gmail-backed runtime and materially rendered the local financial view. The session-key UX behaved profile-scoped: one key prompt was observed for BCP Savings and one for Ripley Credit, rather than one prompt per statement.

The safe dashboard counters observed after refresh were:

- Gmail observations: **4**
- EECC imported: **0**
- EECC requiring strict review: **11**
- profiles quarantined: **0**
- pending relations: **0**

All eleven statement review outcomes were collapsed by +2013 into the generic public reason `STATEMENT_STRICT_REVIEW_REQUIRED`. The product therefore could not identify, from a sanitized surface, whether a given candidate stopped at period geometry, ledger geometry, monetary-row completeness, description binding, runtime isolation, or another fail-closed parser condition.

## Privacy boundary

No screenshot, PDF bytes, decrypted PDF layout, Gmail body, Gmail message or attachment identifier, merchant name, amount, account number, PDF password, OAuth token, device serial, or financial plaintext is stored in this receipt.

The screenshots supplied during the owned-device session remain outside GitHub.

## Decision

Do **not** guess a parser relaxation from the opaque 0/11 result. Introduce an allow-listed, profile-scoped, one-primary-cause-per-reviewed-statement diagnostic surface. Unknown or future parser detail must collapse to a stable non-public-detail code.

Because that diagnostic surface is product-source code, it requires a successor candidate. +2013 signing and physical observations remain historical and non-inheritable.

The successor must preserve:

- one session password per statement profile, reused for every EECC of that profile;
- zero password persistence;
- no raw PDF/Gmail detail in public diagnostics;
- strict fail-closed parsing;
- `PHYSICAL_ALPHA2_PASS=NO`, `BUILD_READY=NO`, and `RELEASE_READY=NO` until the successor completes its own campaign.
