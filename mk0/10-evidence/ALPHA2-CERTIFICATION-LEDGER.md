# Alpha.2 certification ledger

Status: **PRE-SIGNING CONSENSUS FROZEN**

Candidate: `0.2.0-alpha.2+2012`

Head block: `4fddbd426678fc8b16449ce345d2eca0aa1df45efd22ac33a73adbb7273ffae5`

Next gate: `R1_TRUSTED_EDGE_SIGNING`

## What this is

FinanceSensor now carries a deterministic, hash-linked certification ledger for the Alpha.2 candidate. It borrows the useful integrity property of a blockchain — every block commits to its own normalized payload and the previous block hash — while remaining a normal Git/GitHub Actions engineering ledger. It is **not** a decentralized blockchain, does not use mining, tokens, peer consensus, or distributed financial data.

Git remains the durable history and GitHub Actions provides independent reproducible validation. The ledger adds an application-level chain that makes the intended certification sequence explicit and machine-verifiable.

## Block law

Each block contains:

- monotonically increasing `height`;
- a semantic `kind`;
- `parentBlockHash`;
- a sanitized `payload` containing only certification/provenance facts;
- a SHA-256 `blockHash`.

The block hash is calculated over:

`FINANCESENSOR_ALPHA2_CERT_BLOCK_V1 + "\n" + stableJson(blockWithoutBlockHash)`

`stableJson` recursively sorts object keys, preserves array order, encodes as UTF-8 JSON, and does not include display whitespace.

Changing a candidate SHA, workflow run, APK hash, bundle hash, parent hash, physical claim or readiness claim invalidates that block and every descendant pointer.

## Frozen chain

The current six-block chain records, in order:

1. +2012 product-source merge from PR #140.
2. Exact canonical build and unsigned APK freeze.
3. Canonical governance promotion from PR #141 and its seven-node pre-merge consensus.
4. Independent post-merge reproduction of the R1 v12 trusted-edge bundle.
5. Public-readiness consensus remediation from PR #142, with pre- and post-merge passes and no product/APK/bundle mutation.
6. The current pre-signing frontier.

The ledger validator recomputes every hash, verifies parent linkage, and cross-checks the block payloads against the canonical candidate, R1 handoff, R2 campaign and human-intervention gate.

## Trust boundary

The ledger contains no keystore, private key, password, OAuth token, Gmail message/body, PDF, PDF password, account number, merchant-level physical sample or raw financial plaintext.

The current head explicitly states:

- stable trusted-edge signing has **not** yet occurred for +2012;
- owned-device UAT is **not** yet allowed;
- prior +2009/+2011 physical evidence is **not inheritable**;
- `PHYSICAL_ALPHA2_PASS=false`;
- `BUILD_READY=false`;
- `RELEASE_READY=false`.

The next block may be appended only from a sanitized R1 trusted-edge signing receipt that binds the exact stable-signed +2012 APK to the expected signer identity. The private keystore and its password never leave the owned trusted edge.

After signing, later blocks may bind OD0–OD11 physical receipts and, only if every independent readiness law is satisfied, a final release receipt. A source/APK identity mutation starts a new candidate chain rather than rewriting this one.
