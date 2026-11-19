# FinanceSensor — One-shot statement sweep contract

## User goal

Run the physical statement campaign once, not one profile at a time.

```text
ONE LOCAL SESSION
  -> discover Gmail statement profiles
  -> collect session-only password per enabled profile
  -> audit every enabled Gmail profile in one POST
  -> report enabled results + blocked profiles together
  -> never write audit evidence to the vault
```

## Safety boundary

- Gmail scope remains exactly `gmail.readonly`.
- PDF passwords are accepted only by the local process and are cleared after the sweep.
- Decrypted PDF bytes, plaintext and layout geometry remain non-durable.
- A profile without a physically enabled adapter remains `BLOCKED`; the sweep never falls back to another bank parser.
- One profile failure does not suppress the results of the other profiles.
- Interbank local-file ingestion remains a separate source lane until its file selector is wired into the same sweep UI.

## Promotion rule

`ONE_SHOT_SWEEP` is an execution convenience only. It does not promote a profile, weaken reconciliation, or turn a blocked adapter into support.

`BUILD_READY=false`
`IOS_TOUCHED=0`
