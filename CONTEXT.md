# Ontology

A small learning context for ontology ideas, illustrated with **沪深 A 股** trading.

## Language

### Ontology vocabulary

**Ontology**:
The typed model of a domain: object types, properties, link types, plus the objects and links that instantiate them.
_Avoid_: Schema, data model, knowledge graph (too vague here)

**Object type**:
A named kind of thing in the ontology, with a primary key, a title key, and a fixed set of properties.
_Avoid_: Entity, class, meta entity, table

**Property**:
A typed characteristic of an object type, with a base type and Ontology Manager metadata.
_Avoid_: Column, attribute, field (except when talking about JSON keys)

**Property value**:
The value of a property on one object.
_Avoid_: Cell, field value

**Primary key**:
The single property that uniquely identifies an object of that type.
_Avoid_: ID (unless naming a specific property), composite key (encode composites in one string property)

**Title key**:
The property shown as the object's display name in lists and graphs.
_Avoid_: Title property, label, name (unless it is actually the property `name`)

**API name**:
The programmatic name of an object type (PascalCase) or property (camelCase).
_Avoid_: Code name, slug (the slug is `id`)

**ID**:
The Ontology Manager identifier of a type or property (lowercase, dashes). Distinct from RID and from primary key.
_Avoid_: Primary key, apiName

**RID**:
A generated resource identifier (`ri.…`) used to reference a type or property in errors and APIs.
_Avoid_: UUID, ID

**Base type**:
The Palantir property data type (`string`, `integer`, `long`, `double`, `boolean`, `date`, `timestamp`, plus array/struct and limited types).
_Avoid_: JSON type, SQL type, data type (except Foundry dataset field types)

**Shared property**:
A property definition reused on more than one object type; values stay per object.
_Avoid_: Global column, common field

**Value type**:
A named wrapper around a base type with constraints (enum, regex, range).
_Avoid_: Enum type (unless the constraint is actually enum), scalar

**Status**:
Where a type or property sits in the Ontology lifecycle: experimental, active, deprecated, example; object types may also be promoted.
_Avoid_: State, lifecycle (too generic)

**Visibility**:
How prominently applications should show a type or property: prominent, normal, or hidden.
_Avoid_: Display flag

**Render hint**:
A flag telling applications how to search, sort, aggregate, or display a property.
_Avoid_: Index option, UI hint (too vague)

**Link type**:
A named, directed relationship between a source object type and a target object type, with cardinality.
_Avoid_: Relationship, edge, foreign key, join

**Action type**:
The definition of one operator or agent transaction that edits objects, property values, or links.
_Avoid_: Button, API, pipeline job

**Function**:
Ontology-aware logic that reads objects and returns values, object sets, or proposed edits.
_Avoid_: Factor (a function may compute a factor), script, indicator (too vague)

**Object**:
One instance of an object type, identified by its primary key.
_Avoid_: Record, row, instance (except in prose like "a few instances")

**Link**:
One instance of a link type, connecting a source primary key to a target primary key.
_Avoid_: Association, mapping

**Cardinality**:
How many objects may sit on each side of a link type: many-to-one, one-to-many, or many-to-many.
_Avoid_: Multiplicity

### Stock domain

**Industry**:
A 申万 or Eastmoney industry node used for A-share concentration limits.
_Avoid_: Sector, GICS, category, plate (板块 is a looser media term)

**Trading day**:
One A-share market session, holding market-wide regime and breadth.
_Avoid_: Date (the calendar value is a property), bar

**Daily bar**:
One stock's session: OHLCV, limit prices, turnover, and every computed indicator for that day.
_Avoid_: Quote, tick, candle, price bar (legacy study name)

**Factor**:
A computed numeric characteristic of one daily bar (the 45 registered research factors plus live ranks).
_Avoid_: Indicator object, column, alpha (the value lives on the daily bar)

**Universe**:
The index whose constituents are the tradable A-share pool (456 names).
_Avoid_: Watchlist, stock list as a property on Stock

**Market regime**:
Which of bull trend, high volatility, sideways, or bear trend the market is in on a trading day.
_Avoid_: State, mode, environment

**Take-profit**:
A sell reason: the high since entry has reached the activation level of the entry regime, and the close has fallen back from that high by the trail fraction. The trader may postpone that line. The open does not cancel it.
_Avoid_: stop-loss, regime exit, expiry

**Take-profit price**:
The high since entry times one minus the trail fraction of the entry regime. It is the planned limit kept for comparison. The page sets the actual limit from the open.
_Avoid_: stop price, a cost-plus target

**Expiry**:
A sell reason: trading days held have reached the maximum of the regime in force on the entry day.
_Avoid_: take-profit, stop-loss, a single holding-day number for every regime

**Stop-loss**:
A sell reason: the close is at or below the ATR stop fixed at entry, or a volume-spike or consecutive-limit-down risk exit fired. The trader cannot postpone that line.
_Avoid_: take-profit, regime exit, a cost-percent stop

**Stop price**:
Entry price minus the entry regime's ATR multiple times ATR measured on the entry day. Later bars do not replace that ATR.
_Avoid_: take-profit price, the latest ATR, a cost-percent level

**Regime exit**:
A sell reason: today's regime is neither bull trend nor high volatility, so the whole position is sold. The trader cannot postpone that line.
_Avoid_: reduce, a partial sale, stop-loss

**Sell line**:
One planned sell on a pre-open arrangement, for one holding, with a single reason: stop-loss, take-profit, expiry, or regime exit.
_Avoid_: order (the order exists only after the trader confirms), position

**Buy line**:
One planned new buy on a pre-open arrangement, copied from that session's signal, in an already ranked order.
_Avoid_: order, the comparison number used to rank signals

**Signal**:
The enabled strategy's proposal to newly buy one stock on the next session, with a rank among that day's proposals, a planned share count, and a maximum price. The pre-open page copies it into a buy line. It is not an order.
_Avoid_: alert, score (the comparison number is not the signal), the buy line

**Pre-open arrangement**:
The page for one account and one coming session before orders go to the broker: limit-priced sells listed above buys, each with a reason, plus a count of holdings that stay which must match the account.
_Avoid_: TomorrowPlan, order (the order exists only after he confirms), daily strategy

**Account**:
The brokerage book that holds cash and positions.
_Avoid_: Portfolio (the holdings are positions), wallet

**Position**:
A holding of one stock in one account, open or closed.
_Avoid_: Lot (we do not split tax lots in v1), inventory

**Order**:
An instruction to buy or sell a stock for an account.
_Avoid_: Trade (the fill is the trade), signal

**Strategy**:
The V44 playbook: a regime for each session, a cross-sectional comparison score, entry gates, and exit rules fixed at entry (ATR stop, trailing stop, maximum holding days).
_Avoid_: Model, engine, turtle trading, a single cost-percent stop

**Exchange**:
Shanghai Stock Exchange or Shenzhen Stock Exchange.
_Avoid_: MIC, venue, NASDAQ, NYSE

**Company**:
The legal issuer of an A-share.
_Avoid_: Issuer (use the `issuedBy` link instead), ticker, stock

**Stock**:
An A-share listed on SSE or SZSE, identified by ticker (`000001.SZ`).
_Avoid_: Security, US listing, H-share, ticker (ticker is a property)

**Price bar**:
Legacy study name for a daily bar. Use daily bar.
_Avoid_: Quote, tick, candle, trade
