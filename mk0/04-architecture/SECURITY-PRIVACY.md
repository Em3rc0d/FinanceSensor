# MK0 / 04 — Security & Privacy Architecture

## Objective

FinanceSensor handles highly sensitive financial and email-derived data. Security/privacy are release properties, not later hardening tasks.

## Target privacy contract

```text
Email bodies              DEVICE ONLY by default
Attachments               DEVICE ONLY by default
Financial ledger          DEVICE PLAINTEXT ONLY
AI inference              DEVICE by default
Embeddings/features       DEVICE by default unless separately approved
OAuth tokens              OS secure storage
Cloud financial payload   E2EE ciphertext
Operational telemetry     no financial plaintext
```

Every exception requires an explicit ADR and user-impact review.

## Threat surfaces

### Source access

- OAuth token theft;
- excessive scopes;
- refresh-token persistence;
- revoked authorization not honored;
- malicious/malformed email/attachment content.

### Local device

- lost/stolen phone;
- rooted/jailbroken device;
- unencrypted backups;
- screenshots/notifications leaking amounts;
- logs and crash dumps;
- database extraction;
- memory exposure.

### Cloud

- tenant isolation failure;
- metadata leakage;
- encrypted-envelope replacement/replay;
- account takeover;
- device enrollment abuse;
- unauthorized key provisioning.

### Multi-device

- stale revoked device;
- replay conflicts;
- all trusted devices lost;
- malicious device mutation;
- key rotation failure.

## Key hierarchy candidate

Not yet cryptographically frozen:

```text
Tenant master/data secret
├── ledger encryption context
├── evidence encryption context
└── sync/backup context

Device keypair A
Device keypair B
...
```

Tenant secret can be wrapped to authorized devices. The exact primitives, derivation, secure-hardware use and recovery mechanism require a dedicated security ADR after Q-005.

## Device enrollment candidate

```text
User authenticates
      ↓
new device establishes device keypair
      ↓
tenant membership verified
      ↓
trusted enrollment/recovery path
      ↓
tenant key material provisioned/wrapped
      ↓
E2EE state can be decrypted locally
```

The architecture must distinguish account authentication from authorization to decrypt tenant financial state.

## Device revocation

Revocation must address:

- new sync access;
- connection-execution privileges;
- future key rotation;
- push tokens;
- sessions;
- local wipe request where platform capabilities allow;
- clear limitation that an already-compromised device may have copied prior plaintext.

No security document should promise retroactive deletion from an attacker-controlled device.

## Data minimization matrix

Every persisted data field must eventually specify:

| Property | Required value |
|---|---|
| purpose | why it exists |
| sensitivity | raw-email / derived-financial / control-metadata |
| location | device / cloud / both |
| encryption | at-rest / E2EE / OS secure storage |
| retention | duration / event trigger |
| deletion | user/account/source/device behavior |
| telemetry allowed | yes/no and transformed form |

## Logging rule

Production logs must never casually contain:

- email bodies;
- attachment text;
- full financial descriptions;
- card/account numbers;
- OAuth credentials;
- encryption secrets;
- unredacted source artifacts.

Structured identifiers used for diagnostics should be opaque and tenant-safe.

## Notifications

Default push notifications should avoid unnecessary sensitive detail on lock screens.

Candidate pattern:

> FinanceSensor encontró algo para revisar.

Detailed amount/merchant visibility becomes a user-controlled preference.

## Privacy Inspector

A future/early trust surface should expose measurable facts such as:

- source connections;
- last processing time;
- raw-content retention state;
- sync encryption state;
- devices with tenant access;
- amount of plaintext financial content uploaded (target: zero for the normal path).

## Account deletion

Deletion design must separately cover:

1. cloud control-plane identity/metadata;
2. opaque sync envelopes;
3. source tokens;
4. device-local database;
5. tenant encryption material;
6. backups/recovery material;
7. legally required minimal records, if any later exist.

## Security gates

Before MK0 release:

```text
THREAT_MODEL              PASS
LEAST_PRIVILEGE           PASS
TOKEN_STORAGE             PASS
LOCAL_DB_ENCRYPTION       PASS
E2EE_SYNC                 PASS
DEVICE_ENROLLMENT         PASS
DEVICE_REVOCATION         PASS
LOG_REDACTION             PASS
DELETE_FLOW               PASS
PRIVACY_INSPECTOR_TRUTH   PASS
```
