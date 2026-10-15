# Ontology

A small study app for ontology concepts. The domain is **沪深 A 股交易**: 456 只股票、日行情与全部计算指标、制度、信号与订单。设计说明在 `docs/000_Stock_Object_Type/`。

`old/` is an earlier archive and is not this project.

## Layout

```
ontology/
  index.json              # catalog of types in this ontology
  schema/                 # Palantir-aligned JSON Schema + TypeScript types
  object-types/           # object type definitions
  shared-properties/      # properties reused across object types
  value-types/            # constrained wrappers around base types
  link-types/             # link type definitions (source, target, cardinality)
  instances/
    objects/              # objects (instances of object types)
    links/                # links (instances of link types)
CONTEXT.md                # glossary — Palantir terms + stock domain
docs/000_Guideline/         # 培训材料与上位规矩，按 01–16 顺序读
docs/000_Overview/           # 中文教程：从最终目标反推到下载与 Foundry 施工
docs/000_Stock_Object_Type/  # trading Ontology design (object/property/link/action/function)
```

## A-share catalog (design)

See `docs/000_Stock_Object_Type/`. Live types: Stock, Company, Exchange (SSE/SZSE), Industry, Index (456-name pool), TradingDay, DailyBar (all indicators), Account, Strategy, Signal, Order, Fill, Position. Do not add GICS Sector or non-A-share venues.

Existing JSON under `ontology/` is a leftover study slice and must be replaced by this catalog.

Objects in this slice: Technology and Financials; NASDAQ and NYSE; Apple, Microsoft, JPMorgan; AAPL, MSFT, JPM; four daily price bars.
