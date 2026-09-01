# Q-008 — Recurring Financial Event Engine

**Priority:** P1  
**Status:** OPEN

## Question

How can FinanceSensor infer recurring expenses/income while distinguishing stable subscriptions from merely similar repeated purchases?

## Candidate signals

- normalized merchant;
- amount stability / tolerated drift;
- cadence (weekly/monthly/annual/etc.);
- payment instrument;
- description pattern;
- invoice/subscription evidence;
- repeated dates with calendar tolerance;
- price changes;
- missed expected occurrence.

## User value

The recurring engine should support:

```text
Detected recurring payment
Next probable occurrence
Monthly / annualized cost
Price increase
Possible missing expected charge
Possible duplicate recurring charge
```

Predicted future charges are forecasts, not observed facts.

## Failure cases

- supermarket visits misclassified as subscriptions;
- variable utility bills missed because amount changes;
- yearly subscription treated as one-off;
- merchant-name changes splitting a series;
- two independent recurring products from the same merchant merged.

## Closure criteria

- recurrence representation defined;
- cadence/amount tolerance strategy benchmarked;
- synthetic and anonymized test corpus covers variable recurring costs;
- fact vs prediction copy contract defined;
- detection confidence maps to auto-accept vs Needs Review.
