# Action types

An action is one operator (or agent) transaction that edits the Ontology. Bundle a business operation, not one property write. Do not use actions to recompute the 45 factors or MA overlays — that is `computeAllFactors` / pipeline writing DailyBar.

## Trading

| apiName | What it edits | Parameters | Submission criteria |
|---------|---------------|------------|---------------------|
| `ApproveSignal` | Signal.status → approved | signal | Signal is proposed; strategy enabled |
| `RejectSignal` | Signal.status → rejected | signal, reason | Signal is proposed |
| `SubmitBuyOrder` | creates Order; optional Position | account, stock, quantity or weight, optional signal | `gateOpen`, not limit-up today, industry cap, account cash, stock not ST |
| `SubmitSellOrder` | creates Order; updates Position | account, position, quantity | Position open, quantity ≤ shares |
| `CancelOrder` | Order.status → cancelled | order | Order still working |
| `ClosePosition` | sell residual; Position.status → closed | position | Position open |
| `ReducePosition` | sell fraction | position, fraction | Position open |

`SubmitBuyOrder` should be **one** action (order + link to signal + cash check), not `SetOrderQty` + `SetOrderSide` + `LinkSignal` (action sprawl).

## Book / strategy control

| apiName | What it edits |
|---------|---------------|
| `PauseTrading` | Account or Strategy property `tradingPaused` + reason |
| `ResumeTrading` | Clears pause |
| `EnableStrategy` / `DisableStrategy` | Strategy.enabled |
| `MarkSpecialTreatment` | Stock.specialTreatment — used when an announcement hits before the vendor field updates |

Risk.py “pause new entries for 1 day” is either this action (operator) or a function-backed action fired by a monitor. The **rule** is a function; the **commit** is an action.

## What is not an action

| Process | Mechanism |
|---------|-----------|
| Download K-line / 腾讯实时 | Pipeline |
| `refresh_factors` | Pipeline + functions writing DailyBar |
| Nightly regime label | Function writing TradingDay.regime |
| LightGBM train | Offline job; may write Strategy metadata later |
| Computing ATR | Function |

## Function-backed actions

`SubmitBuyOrder` should be function-backed:

1. Function `sizePosition` → share count from weight and last close.  
2. Function `preTradeRisk` → pass/fail + reasons.  
3. On pass, create Order (and Position if new).

Operators still *take* the action; they do not type raw share counts if they prefer weight.
