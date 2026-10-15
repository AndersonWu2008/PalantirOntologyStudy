/**
 * The only module that talks to PostgreSQL.
 * HTTP routes in this file call the functions below. Nothing else should import `pg`.
 *
 * Database: docker container `stock_ontology`, database `stock_ontology`.
 * Schema: sql/001_schema.sql, matching docs/001_推导/25_整链Ontology设计.md.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import pg, { type QueryResultRow } from "pg";
import { channelFor, fillOnce, ontologySchema, strategyChannel, type WriteChannel } from "./channels.ts";

const { Pool } = pg;
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1114, (value) => value);
pg.types.setTypeParser(1184, (value) => value);
pg.types.setTypeParser(20, (value) => Number(value));

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ontology:ontology_dev@localhost:5436/stock_ontology";

const port = Number(process.env.PORT ?? 3010);

const pool = new Pool({ connectionString: databaseUrl });

type Column = { json: string; column: string };

type Resource = {
  table: string;
  columns: Column[];
  conflict: string[];
  filters: string[];
};

function cols(pairs: [string, string][]): Column[] {
  return pairs.map(([json, column]) => ({ json, column }));
}

const stockTradingDomain = "StockTrading";
const domainName = /^[A-Z][A-Za-z0-9]*$/;

const resources: Record<string, Resource> = {
  accounts: {
    table: "account",
    conflict: ["account_id"],
    filters: ["account_id", "enabled_strategy_id"],
    columns: cols([
      ["accountId", "account_id"],
      ["displayName", "display_name"],
      ["availableCash", "available_cash"],
      ["totalAssets", "total_assets"],
      ["enabledStrategyId", "enabled_strategy_id"],
    ]),
  },
  stocks: {
    table: "stock",
    conflict: ["ticker"],
    filters: ["ticker", "board", "is_st"],
    columns: cols([
      ["ticker", "ticker"],
      ["displayName", "display_name"],
      ["isSt", "is_st"],
      ["board", "board"],
    ]),
  },
  industries: {
    table: "industry",
    conflict: ["industry_id"],
    filters: ["industry_id"],
    columns: cols([
      ["industryId", "industry_id"],
      ["displayName", "display_name"],
    ]),
  },
  "tradable-ranges": {
    table: "tradable_range",
    conflict: ["index_id"],
    filters: ["index_id"],
    columns: cols([
      ["indexId", "index_id"],
      ["displayName", "display_name"],
    ]),
  },
  strategies: {
    table: "strategy",
    conflict: ["strategy_id"],
    filters: ["strategy_id", "universe_index_id"],
    columns: cols([
      ["strategyId", "strategy_id"],
      ["displayName", "display_name"],
      ["packId", "pack_id"],
      ["universeIndexId", "universe_index_id"],
      ["breadthMin", "breadth_min"],
      ["regimeMinPersistDays", "regime_min_persist_days"],
      ["exitOnRegimeFlip", "exit_on_regime_flip"],
      ["priceMin", "price_min"],
      ["priceMax", "price_max"],
      ["maxPerIndustry", "max_per_industry"],
      ["limitUpCountMin", "limit_up_count_min"],
      ["consecutiveLimitDownDays", "consecutive_limit_down_days"],
      ["limitDownPercent", "limit_down_percent"],
      ["limitUpCountPercent", "limit_up_count_percent"],
      ["chinextLimitUpPercent", "chinext_limit_up_percent"],
      ["mainLimitUpPercent", "main_limit_up_percent"],
      ["bullStopLoss", "bull_stop_loss"],
      ["bullTrailingActivate", "bull_trailing_activate"],
      ["bullTrailingStop", "bull_trailing_stop"],
      ["bullMaxHoldDays", "bull_max_hold_days"],
      ["bullMaxPositions", "bull_max_positions"],
      ["bullSinglePositionPct", "bull_single_position_pct"],
      ["bullMinScore", "bull_min_score"],
      ["bullAtrMultiple", "bull_atr_multiple"],
      ["highVolStopLoss", "high_vol_stop_loss"],
      ["highVolTrailingActivate", "high_vol_trailing_activate"],
      ["highVolTrailingStop", "high_vol_trailing_stop"],
      ["highVolMaxHoldDays", "high_vol_max_hold_days"],
      ["highVolMaxPositions", "high_vol_max_positions"],
      ["highVolSinglePositionPct", "high_vol_single_position_pct"],
      ["highVolMinScore", "high_vol_min_score"],
      ["highVolAtrMultiple", "high_vol_atr_multiple"],
      ["sidewaysStopLoss", "sideways_stop_loss"],
      ["sidewaysTrailingActivate", "sideways_trailing_activate"],
      ["sidewaysTrailingStop", "sideways_trailing_stop"],
      ["sidewaysMaxHoldDays", "sideways_max_hold_days"],
      ["sidewaysMaxPositions", "sideways_max_positions"],
      ["sidewaysSinglePositionPct", "sideways_single_position_pct"],
      ["sidewaysMinScore", "sideways_min_score"],
      ["sidewaysAtrMultiple", "sideways_atr_multiple"],
      ["bearMaxPositions", "bear_max_positions"],
      ["maShort", "ma_short"],
      ["maMid", "ma_mid"],
      ["maLong", "ma_long"],
      ["adxBullMin", "adx_bull_min"],
      ["adxBearMin", "adx_bear_min"],
      ["risingRatioBull", "rising_ratio_bull"],
      ["risingRatioBear", "rising_ratio_bear"],
      ["volWindow", "vol_window"],
      ["volPercentileHigh", "vol_percentile_high"],
      ["limitDownBearRatio", "limit_down_bear_ratio"],
      ["amountMaWindow", "amount_ma_window"],
      ["amountShrinkWarn", "amount_shrink_warn"],
      ["minHistoryDays", "min_history_days"],
      ["indexLookback", "index_lookback"],
      ["limitUpOverheat", "limit_up_overheat"],
      ["limitUpIce", "limit_up_ice"],
    ]),
  },
  "strategy-excluded-stocks": {
    table: "strategy_excluded_stock",
    conflict: ["strategy_id", "ticker"],
    filters: ["strategy_id", "ticker"],
    columns: cols([
      ["strategyId", "strategy_id"],
      ["ticker", "ticker"],
    ]),
  },
  "index-constituents": {
    table: "index_constituent",
    conflict: ["index_id", "ticker"],
    filters: ["index_id", "ticker"],
    columns: cols([
      ["indexId", "index_id"],
      ["ticker", "ticker"],
    ]),
  },
  "trading-days": {
    table: "trading_day",
    conflict: ["session_date"],
    filters: ["session_date", "is_trading_day", "regime", "entry_gate"],
    columns: cols([
      ["sessionDate", "session_date"],
      ["isTradingDay", "is_trading_day"],
      ["indexClose", "index_close"],
      ["indexVolume", "index_volume"],
      ["totalAmount", "total_amount"],
      ["breadth", "breadth"],
      ["regime", "regime"],
      ["bullHvStreak", "bull_hv_streak"],
      ["entryGate", "entry_gate"],
      ["selectionMissing", "selection_missing"],
      ["limitUpRatio", "limit_up_ratio"],
      ["limitDownRatio", "limit_down_ratio"],
      ["adx", "adx"],
      ["risingRatio", "rising_ratio"],
      ["volPercentile", "vol_percentile"],
      ["amountDeviation", "amount_deviation"],
    ]),
  },
  "daily-bars": {
    table: "daily_bar",
    conflict: ["bar_id"],
    filters: ["bar_id", "ticker", "session_date"],
    columns: cols([
      ["barId", "bar_id"],
      ["ticker", "ticker"],
      ["sessionDate", "session_date"],
      ["open", "open"],
      ["high", "high"],
      ["low", "low"],
      ["close", "close"],
      ["volume", "volume"],
      ["amount", "amount"],
      ["changePercent", "change_percent"],
      ["previousClose", "previous_close"],
      ["suspended", "suspended"],
      ["publishedIndustry", "published_industry"],
      ["limitUp", "limit_up"],
      ["limitDown", "limit_down"],
      ["ma20", "ma20"],
      ["atr14", "atr14"],
      ["volRatio", "vol_ratio"],
      ["aboveMa20", "above_ma20"],
      ["f1", "f1"],
      ["f2", "f2"],
      ["f3", "f3"],
      ["f4", "f4"],
      ["comparisonScore", "comparison_score"],
      ["comparisonRank", "comparison_rank"],
      ["limitUpCount120", "limit_up_count_120"],
      ["resolvedIndustryId", "resolved_industry_id"],
      ["dayRet", "day_ret"],
      ["isLimitUp", "is_limit_up"],
      ["excluded", "excluded"],
      ["luRecent20d", "lu_recent_20d"],
      ["luCount60d", "lu_count_60d"],
      ["high20d", "high_20d"],
      ["ddFromHigh20", "dd_from_high20"],
      ["volMa5", "vol_ma5"],
      ["volMax20d", "vol_max_20d"],
      ["volShrink", "vol_shrink"],
      ["ret3d", "ret_3d"],
      ["ma60", "ma60"],
      ["scoreZj", "score_zj"],
      ["scoreZjRank", "score_zj_rank"],
    ]),
  },
  positions: {
    table: "position",
    conflict: ["position_id"],
    filters: ["position_id", "account_id", "ticker", "exit_state"],
    columns: cols([
      ["positionId", "position_id"],
      ["accountId", "account_id"],
      ["ticker", "ticker"],
      ["quantity", "quantity"],
      ["sellableQuantity", "sellable_quantity"],
      ["entryPrice", "entry_price"],
      ["entryDate", "entry_date"],
      ["atrAtEntry", "atr_at_entry"],
      ["regimeAtEntry", "regime_at_entry"],
      ["highSinceEntry", "high_since_entry"],
      ["daysHeld", "days_held"],
      ["entryFieldsMissing", "entry_fields_missing"],
      ["exitState", "exit_state"],
      ["exitJudgedOn", "exit_judged_on"],
      ["exitReason", "exit_reason"],
    ]),
  },
  fills: {
    table: "fill",
    conflict: ["fill_id"],
    filters: ["fill_id", "account_id", "ticker", "session_date", "position_id"],
    columns: cols([
      ["fillId", "fill_id"],
      ["accountId", "account_id"],
      ["ticker", "ticker"],
      ["sessionDate", "session_date"],
      ["side", "side"],
      ["price", "price"],
      ["quantity", "quantity"],
      ["positionId", "position_id"],
    ]),
  },
  signals: {
    table: "signal",
    conflict: ["signal_id"],
    filters: ["signal_id", "strategy_id", "session_date", "ticker"],
    columns: cols([
      ["signalId", "signal_id"],
      ["strategyId", "strategy_id"],
      ["sessionDate", "session_date"],
      ["ticker", "ticker"],
      ["rank", "rank"],
      ["plannedQuantity", "planned_quantity"],
      ["plannedLimitPrice", "planned_limit_price"],
    ]),
  },
  arrangements: {
    table: "pre_open_arrangement",
    conflict: ["arrangement_id"],
    filters: ["arrangement_id", "account_id", "session_date", "strategy_id"],
    columns: cols([
      ["arrangementId", "arrangement_id"],
      ["accountId", "account_id"],
      ["sessionDate", "session_date"],
      ["strategyId", "strategy_id"],
      ["supersedesArrangementId", "supersedes_arrangement_id"],
      ["handedOverAt", "handed_over_at"],
      ["header", "header"],
      ["headerAtConfirm", "header_at_confirm"],
      ["totalAssetsShown", "total_assets_shown"],
      ["totalAssetsAtConfirm", "total_assets_at_confirm"],
      ["cashShown", "cash_shown"],
      ["cashAtConfirm", "cash_at_confirm"],
      ["continueCount", "continue_count"],
      ["positionCountAgrees", "position_count_agrees"],
      ["playbookChanged", "playbook_changed"],
      ["stopped", "stopped"],
      ["nothingToSendAcknowledged", "nothing_to_send_acknowledged"],
      ["sellConfirmedBy", "sell_confirmed_by"],
      ["sellConfirmedAt", "sell_confirmed_at"],
      ["buyConfirmedBy", "buy_confirmed_by"],
      ["buyConfirmedAt", "buy_confirmed_at"],
    ]),
  },
  "sell-lines": {
    table: "sell_line",
    conflict: ["sell_line_id"],
    filters: ["sell_line_id", "arrangement_id", "ticker", "position_id", "reason"],
    columns: cols([
      ["sellLineId", "sell_line_id"],
      ["arrangementId", "arrangement_id"],
      ["ticker", "ticker"],
      ["positionId", "position_id"],
      ["reason", "reason"],
      ["plannedQuantity", "planned_quantity"],
      ["submitQuantity", "submit_quantity"],
      ["plannedLimitPrice", "planned_limit_price"],
      ["submitLimitPrice", "submit_limit_price"],
      ["openPrice", "open_price"],
      ["openChange", "open_change"],
      ["amount", "amount"],
      ["weight", "weight"],
      ["brokerSellable", "broker_sellable"],
      ["outcome", "outcome"],
      ["outcomeAtConfirm", "outcome_at_confirm"],
      ["postponed", "postponed"],
    ]),
  },
  "buy-lines": {
    table: "buy_line",
    conflict: ["buy_line_id"],
    filters: ["buy_line_id", "arrangement_id", "ticker", "rank"],
    columns: cols([
      ["buyLineId", "buy_line_id"],
      ["arrangementId", "arrangement_id"],
      ["ticker", "ticker"],
      ["rank", "rank"],
      ["plannedQuantity", "planned_quantity"],
      ["submitQuantity", "submit_quantity"],
      ["plannedLimitPrice", "planned_limit_price"],
      ["submitLimitPrice", "submit_limit_price"],
      ["openPrice", "open_price"],
      ["openChange", "open_change"],
      ["amount", "amount"],
      ["weight", "weight"],
      ["outcome", "outcome"],
      ["outcomeAtConfirm", "outcome_at_confirm"],
      ["vetoed", "vetoed"],
    ]),
  },
  "sell-orders": {
    table: "sell_order",
    conflict: ["order_id"],
    filters: ["order_id", "sell_line_id", "content_status", "execution_status"],
    columns: cols([
      ["orderId", "order_id"],
      ["sellLineId", "sell_line_id"],
      ["quantity", "quantity"],
      ["limitPrice", "limit_price"],
      ["contentStatus", "content_status"],
      ["brokerOrderId", "broker_order_id"],
      ["executionStatus", "execution_status"],
      ["executionWrittenAt", "execution_written_at"],
    ]),
  },
  "buy-orders": {
    table: "buy_order",
    conflict: ["order_id"],
    filters: ["order_id", "buy_line_id", "content_status", "execution_status"],
    columns: cols([
      ["orderId", "order_id"],
      ["buyLineId", "buy_line_id"],
      ["quantity", "quantity"],
      ["limitPrice", "limit_price"],
      ["contentStatus", "content_status"],
      ["brokerOrderId", "broker_order_id"],
      ["executionStatus", "execution_status"],
      ["executionWrittenAt", "execution_written_at"],
    ]),
  },
  "evaluation-runs": {
    table: "evaluation_run",
    conflict: ["run_id"],
    filters: ["run_id", "strategy_id", "pack_id", "status"],
    columns: cols([
      ["runId", "run_id"],
      ["strategyId", "strategy_id"],
      ["packId", "pack_id"],
      ["displayName", "display_name"],
      ["startDate", "start_date"],
      ["endDate", "end_date"],
      ["status", "status"],
      ["annualReturn", "annual_return"],
      ["maxDrawdown", "max_drawdown"],
      ["calmar", "calmar"],
      ["winRate", "win_rate"],
      ["tradeCount", "trade_count"],
      ["finalEquity", "final_equity"],
      ["notes", "notes"],
    ]),
  },
  "evaluation-points": {
    table: "evaluation_point",
    conflict: ["point_id"],
    filters: ["point_id", "run_id", "session_date"],
    columns: cols([
      ["pointId", "point_id"],
      ["runId", "run_id"],
      ["sessionDate", "session_date"],
      ["equity", "equity"],
      ["drawdown", "drawdown"],
    ]),
  },
  "evaluation-trades": {
    table: "evaluation_trade",
    conflict: ["trade_id"],
    filters: ["trade_id", "run_id", "ticker", "side"],
    columns: cols([
      ["tradeId", "trade_id"],
      ["runId", "run_id"],
      ["ticker", "ticker"],
      ["side", "side"],
      ["entryDate", "entry_date"],
      ["exitDate", "exit_date"],
      ["entryPrice", "entry_price"],
      ["exitPrice", "exit_price"],
      ["pnl", "pnl"],
      ["exitReason", "exit_reason"],
    ]),
  },
};

for (const resource of Object.values(resources)) {
  resource.columns.push({ json: "domain", column: "domain" });
  resource.filters.push("domain");
}

function columnByJson(resource: Resource, json: string): Column | undefined {
  return resource.columns.find((column) => column.json === json);
}

function columnByName(resource: Resource, column: string): Column | undefined {
  return resource.columns.find((item) => item.column === column);
}

function toJson(resource: Resource, row: QueryResultRow): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const column of resource.columns) {
    if (column.column in row) {
      object[column.json] = row[column.column];
    }
  }
  return object;
}

function presentColumns(resource: Resource, body: Record<string, unknown>): Column[] {
  return resource.columns.filter((column) => Object.prototype.hasOwnProperty.call(body, column.json));
}

export async function healthcheck(): Promise<{ ok: true }> {
  await pool.query("SELECT 1");
  return { ok: true };
}

/** 管道收盘用：只取 OHLC/量/派生所需列，缩小 JSON */
export async function listDailyBarsWindow(
  from: string,
  to: string,
  domain = stockTradingDomain,
): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    `SELECT bar_id, ticker, session_date, open, high, low, close, volume, amount,
            change_percent, previous_close, suspended, published_industry,
            ma20, atr14, vol_ratio, above_ma20, limit_up_count_120, resolved_industry_id,
            day_ret, is_limit_up, excluded, lu_recent_20d, lu_count_60d, high_20d,
            dd_from_high20, vol_ma5, vol_max_20d, vol_shrink, score_zj, score_zj_rank, domain
     FROM daily_bar
     WHERE domain = $1 AND session_date >= $2::date AND session_date <= $3::date`,
    [domain, from, to],
  );
  const resource = resources["daily-bars"];
  return result.rows.map((row) => toJson(resource, row));
}

export async function listObjects(
  name: string,
  filters: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const resource = resources[name];
  if (!resource) {
    throw new ApiError(404, `Unknown resource ${name}`);
  }
  const where: string[] = [];
  const params: unknown[] = [];
  const rangeKeys = new Set(["sessionDateFrom", "sessionDateTo"]);
  for (const [key, value] of Object.entries(filters)) {
    if (name === "daily-bars" && rangeKeys.has(key)) {
      params.push(value);
      where.push(key === "sessionDateFrom" ? `session_date >= $${params.length}` : `session_date <= $${params.length}`);
      continue;
    }
    const column = columnByJson(resource, key) ?? columnByName(resource, key);
    if (!column || !resource.filters.includes(column.column)) {
      throw new ApiError(400, `Cannot filter ${name} by ${key}`);
    }
    params.push(value);
    where.push(`${column.column} = $${params.length}`);
  }
  const sql = `SELECT * FROM ${resource.table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  const result = await pool.query(sql, params);
  return result.rows.map((row) => toJson(resource, row));
}

export async function getObject(name: string, id: string): Promise<Record<string, unknown>> {
  const resource = resources[name];
  if (!resource) {
    throw new ApiError(404, `Unknown resource ${name}`);
  }
  if (resource.conflict.length !== 1) {
    throw new ApiError(400, `${name} has a composite key. Filter the collection instead.`);
  }
  const column = resource.conflict[0];
  const result = await pool.query(`SELECT * FROM ${resource.table} WHERE ${column} = $1`, [id]);
  const row = result.rows[0];
  if (!row) {
    throw new ApiError(404, `${name} ${id} not found`);
  }
  return toJson(resource, row);
}

function withDomain(body: Record<string, unknown>): Record<string, unknown> {
  if (body.domain == null || body.domain === "") {
    return { ...body, domain: stockTradingDomain };
  }
  if (!domainName.test(String(body.domain))) {
    throw new ApiError(400, "domain must be a PascalCase name such as StockTrading");
  }
  return body;
}

export async function saveObject(
  name: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resource = resources[name];
  if (!resource) {
    throw new ApiError(404, `Unknown resource ${name}`);
  }
  const body = withDomain(input);
  if (resource.conflict.every((column) => body[columnByName(resource, column)?.json ?? ""] != null)) {
    const params = resource.conflict.map((column) => body[columnByName(resource, column)?.json ?? ""]);
    const where = resource.conflict.map((column, index) => `${column} = $${index + 1}`).join(" AND ");
    const existing = await pool.query(`SELECT domain FROM ${resource.table} WHERE ${where}`, params);
    if (existing.rows[0] && existing.rows[0].domain !== body.domain) {
      throw new ApiError(409, "domain is already saved");
    }
  }
  const chosen = presentColumns(resource, body);
  if (chosen.length === 0) {
    throw new ApiError(400, `No writable fields for ${name}`);
  }
  for (const column of resource.conflict) {
    const json = columnByName(resource, column)?.json;
    if (!json || body[json] === undefined || body[json] === null) {
      throw new ApiError(400, `${name} requires ${json ?? column}`);
    }
  }
  const names = chosen.map((column) => column.column);
  const values = chosen.map((column) => body[column.json]);
  const placeholders = names.map((_, index) => `$${index + 1}`);
  const updates = names
    .filter((column) => !resource.conflict.includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`);
  if (updates.length === 0) {
    updates.push(`${resource.conflict[0]} = EXCLUDED.${resource.conflict[0]}`);
  }
  const conflict = resource.conflict.join(", ");
  const sql = `INSERT INTO ${resource.table} (${names.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(", ")} RETURNING *`;
  const result = await pool.query(sql, values);
  return toJson(resource, result.rows[0]);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left == null || right == null) {
    return false;
  }
  if (typeof left === "number" || typeof right === "number") {
    return Number(left) === Number(right);
  }
  return String(left) === String(right);
}

function present(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
}

async function findObject(name: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    return await getObject(name, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function applyChannel(
  name: string,
  body: Record<string, unknown>,
  channel: WriteChannel,
): Promise<Record<string, unknown>> {
  const allowed = new Set([
    ...channel.identity,
    ...channel.once,
    ...channel.replace,
    ...channel.clearable,
    ...(channel.latch ?? []),
  ]);
  for (const key of Object.keys(body)) {
    if (key === "pass" || key === "domain") {
      continue;
    }
    if (!allowed.has(key)) {
      throw new ApiError(400, `${String(body.pass)} cannot write ${key}`);
    }
  }
  for (const key of channel.identity) {
    if (body[key] === undefined || body[key] === null || body[key] === "") {
      throw new ApiError(400, `${name} requires ${key}`);
    }
  }
  const idKey = columnByName(resources[name], resources[name].conflict[0])?.json;
  if (!idKey) {
    throw new ApiError(500, `${name} has no identity column`);
  }
  const existing = await findObject(name, String(body[idKey]));
  if (!existing && channel.requireExisting) {
    throw new ApiError(400, `${name} ${String(body[idKey])} does not exist yet`);
  }
  if (existing) {
    for (const key of channel.identity) {
      if (!sameValue(existing[key], body[key])) {
        throw new ApiError(409, `${key} does not match the saved row`);
      }
    }
  } else {
    for (const key of channel.insertRequires) {
      if (!present(body, key) || body[key] === null) {
        throw new ApiError(400, `${name} requires ${key}`);
      }
    }
  }
  const patch: Record<string, unknown> = {};
  for (const key of channel.identity) {
    patch[key] = body[key];
  }
  for (const key of channel.once) {
    if (!present(body, key) || body[key] === null) {
      continue;
    }
    if (existing && existing[key] != null && !sameValue(existing[key], body[key])) {
      throw new ApiError(409, `${key} is already saved`);
    }
    patch[key] = body[key];
  }
  for (const key of channel.replace) {
    if (!present(body, key) || body[key] === null) {
      continue;
    }
    patch[key] = body[key];
  }
  for (const key of channel.clearable) {
    if (!present(body, key)) {
      continue;
    }
    patch[key] = body[key];
  }
  for (const key of channel.latch ?? []) {
    if (!present(body, key) || body[key] === null) {
      continue;
    }
    if (typeof body[key] !== "boolean") {
      throw new ApiError(400, `${key} must be boolean`);
    }
    if (existing?.[key] === true && body[key] === false) {
      throw new ApiError(409, `${key} is already saved`);
    }
    if (existing?.[key] !== true) {
      patch[key] = body[key];
    }
  }
  if (body.domain != null && existing && existing.domain !== body.domain) {
    throw new ApiError(409, "domain is already saved");
  }
  if (!existing && body.domain != null) {
    patch.domain = body.domain;
  }
  const dataKeys = Object.keys(patch).filter((key) => !channel.identity.includes(key) && key !== "domain");
  if (dataKeys.length === 0) {
    if (existing) {
      return existing;
    }
    throw new ApiError(400, `${name} has nothing to write`);
  }
  if (existing) {
    return updateColumns(name, String(body[idKey]), patch);
  }
  return saveObject(name, patch);
}

async function updateColumns(
  name: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resource = resources[name];
  const idColumn = resource.conflict[0];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [json, value] of Object.entries(patch)) {
    const column = columnByJson(resource, json);
    if (!column || column.column === idColumn) {
      continue;
    }
    params.push(value);
    sets.push(`${column.column} = $${params.length}`);
  }
  if (sets.length === 0) {
    const current = await findObject(name, id);
    if (!current) {
      throw new ApiError(404, `${name} ${id} not found`);
    }
    return current;
  }
  params.push(id);
  const result = await pool.query(
    `UPDATE ${resource.table} SET ${sets.join(", ")} WHERE ${idColumn} = $${params.length} RETURNING *`,
    params,
  );
  return toJson(resource, result.rows[0]);
}

export async function saveDailyBar(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("daily-bars", body.pass);
  if (!channel) throw new ApiError(400, "daily-bars requires pass open, close, or derived");
  return applyChannel("daily-bars", body, channel);
}

export async function saveTradingDay(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("trading-days", body.pass);
  if (!channel) throw new ApiError(400, "trading-days requires pass calendar or derived");
  return applyChannel("trading-days", body, channel);
}

export async function saveAccount(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("accounts", body.pass);
  if (!channel) throw new ApiError(400, "accounts requires pass snapshot or enable");
  return applyChannel("accounts", body, channel);
}

export async function savePosition(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("positions", body.pass);
  if (!channel) throw new ApiError(400, "positions requires pass book, entry, roll, or exit");
  return applyChannel("positions", body, channel);
}

export async function saveFill(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const once = fillOnce;
  for (const key of Object.keys(body)) {
    if (key === "domain" || key === "pass") continue;
    if (key !== "fillId" && key !== "positionId" && !once.includes(key)) {
      throw new ApiError(400, `fills cannot write ${key}`);
    }
  }
  if (body.fillId === undefined || body.fillId === null || body.fillId === "") {
    throw new ApiError(400, "fills requires fillId");
  }
  const existing = await findObject("fills", String(body.fillId));
  if (!existing) {
    for (const key of once) {
      if (!present(body, key) || body[key] === null) {
        throw new ApiError(400, `fills requires ${key}`);
      }
    }
    return saveObject("fills", body);
  }
  for (const key of once) {
    if (present(body, key) && !sameValue(existing[key], body[key])) {
      throw new ApiError(409, `${key} is already saved`);
    }
  }
  if (!present(body, "positionId") || body.positionId === null) {
    return existing;
  }
  if (existing.positionId != null && !sameValue(existing.positionId, body.positionId)) {
    throw new ApiError(409, "positionId is already saved");
  }
  if (sameValue(existing.positionId, body.positionId)) {
    return existing;
  }
  return saveObject("fills", {
    fillId: body.fillId,
    accountId: existing.accountId,
    ticker: existing.ticker,
    sessionDate: existing.sessionDate,
    side: existing.side,
    price: existing.price,
    quantity: existing.quantity,
    positionId: body.positionId,
  });
}

export async function saveStrategy(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return applyChannel(
    "strategies",
    body,
    strategyChannel(resources.strategies.columns.map((column) => column.json)),
  );
}

export async function saveArrangement(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("arrangements", body.pass);
  if (!channel) throw new ApiError(400, "arrangements requires pass page or decision");
  return applyChannel("arrangements", body, channel);
}

export async function saveSellLine(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("sell-lines", body.pass);
  if (!channel) throw new ApiError(400, "sell-lines requires pass page or decision");
  return applyChannel("sell-lines", body, channel);
}

export async function saveBuyLine(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("buy-lines", body.pass);
  if (!channel) throw new ApiError(400, "buy-lines requires pass page or decision");
  return applyChannel("buy-lines", body, channel);
}

export async function saveSignal(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const channel = channelFor("signals", "write");
  if (!channel) throw new ApiError(500, "signals has no write channel");
  return applyChannel("signals", body, channel);
}

export async function saveOrder(
  name: "sell-orders" | "buy-orders",
  lineKey: "sellLineId" | "buyLineId",
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const channel = channelFor(name, body.pass);
  if (!channel) throw new ApiError(400, `${name} requires pass content or execution`);
  if (body.pass === "content" && channel.once[0] !== lineKey) {
    throw new ApiError(500, `${name} content channel does not start at ${lineKey}`);
  }
  return applyChannel(name, body, channel);
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function saveSourceBatch(rows: Record<string, unknown>[]): Promise<{ written: number }> {
  if (rows.length === 0) return { written: 0 };
  const result = await pool.query(
    `INSERT INTO daily_bar (
       bar_id, ticker, session_date, open, high, low, close, volume, amount, change_percent, published_industry, domain
     )
     SELECT u.bar_id, u.ticker, u.session_date, u.open, u.high, u.low, u.close, u.volume, u.amount, u.change_percent, u.published_industry, u.domain
     FROM unnest(
       $1::text[], $2::text[], $3::date[], $4::float8[], $5::float8[], $6::float8[], $7::float8[], $8::float8[], $9::float8[], $10::float8[], $11::text[], $12::text[]
     ) AS u(bar_id, ticker, session_date, open, high, low, close, volume, amount, change_percent, published_industry, domain)
     ON CONFLICT (bar_id) DO UPDATE SET
       open = COALESCE(daily_bar.open, EXCLUDED.open),
       high = COALESCE(daily_bar.high, EXCLUDED.high),
       low = COALESCE(daily_bar.low, EXCLUDED.low),
       close = COALESCE(daily_bar.close, EXCLUDED.close),
       volume = COALESCE(daily_bar.volume, EXCLUDED.volume),
       amount = COALESCE(daily_bar.amount, EXCLUDED.amount),
       change_percent = COALESCE(daily_bar.change_percent, EXCLUDED.change_percent),
       published_industry = COALESCE(daily_bar.published_industry, EXCLUDED.published_industry)
     WHERE daily_bar.domain = EXCLUDED.domain
       AND (daily_bar.close IS NULL OR EXCLUDED.close IS NULL OR daily_bar.close = EXCLUDED.close)
       AND (daily_bar.change_percent IS NULL OR EXCLUDED.change_percent IS NULL OR daily_bar.change_percent = EXCLUDED.change_percent)`,
    [
      rows.map((row) => String(row.barId)),
      rows.map((row) => String(row.ticker)),
      rows.map((row) => String(row.sessionDate)),
      rows.map((row) => numOrNull(row.open)),
      rows.map((row) => numOrNull(row.high)),
      rows.map((row) => numOrNull(row.low)),
      rows.map((row) => numOrNull(row.close)),
      rows.map((row) => numOrNull(row.volume)),
      rows.map((row) => numOrNull(row.amount)),
      rows.map((row) => numOrNull(row.changePercent)),
      rows.map((row) => (row.publishedIndustry == null || row.publishedIndustry === "" || row.publishedIndustry === "unknown" ? null : String(row.publishedIndustry))),
      rows.map(() => "StockTrading"),
    ],
  );
  return { written: result.rowCount ?? 0 };
}

export async function saveDerivedBatch(rows: Record<string, unknown>[]): Promise<{ written: number }> {
  if (rows.length === 0) return { written: 0 };
  const result = await pool.query(
    `UPDATE daily_bar AS d SET
       ma20 = v.ma20,
       atr14 = v.atr14,
       vol_ratio = v.vol_ratio,
       above_ma20 = v.above_ma20,
       f1 = v.f1,
       f2 = v.f2,
       f3 = v.f3,
       f4 = v.f4,
       comparison_score = v.comparison_score,
       comparison_rank = v.comparison_rank,
       limit_up_count_120 = v.limit_up_count_120,
       resolved_industry_id = v.resolved_industry_id
     FROM unnest(
       $1::text[], $2::float8[], $3::float8[], $4::float8[], $5::boolean[], $6::float8[], $7::float8[], $8::float8[], $9::float8[], $10::float8[], $11::float8[], $12::float8[], $13::text[]
     ) AS v(bar_id, ma20, atr14, vol_ratio, above_ma20, f1, f2, f3, f4, comparison_score, comparison_rank, limit_up_count_120, resolved_industry_id)
     WHERE d.bar_id = v.bar_id AND d.domain = 'StockTrading'`,
    [
      rows.map((row) => String(row.barId)),
      rows.map((row) => numOrNull(row.ma20)),
      rows.map((row) => numOrNull(row.atr14)),
      rows.map((row) => numOrNull(row.volRatio)),
      rows.map((row) => (row.aboveMa20 == null ? null : Boolean(row.aboveMa20))),
      rows.map((row) => numOrNull(row.f1)),
      rows.map((row) => numOrNull(row.f2)),
      rows.map((row) => numOrNull(row.f3)),
      rows.map((row) => numOrNull(row.f4)),
      rows.map((row) => numOrNull(row.comparisonScore)),
      rows.map((row) => numOrNull(row.comparisonRank)),
      rows.map((row) => numOrNull(row.limitUpCount120)),
      rows.map((row) => (row.resolvedIndustryId == null ? null : String(row.resolvedIndustryId))),
    ],
  );
  return { written: result.rowCount ?? 0 };
}

export async function fillPreviousClose(): Promise<{ written: number }> {
  const result = await pool.query(
    `WITH days AS (
       SELECT session_date,
              lag(session_date) OVER (ORDER BY session_date) AS previous_date
       FROM trading_day
       WHERE domain = 'StockTrading' AND is_trading_day
     )
     UPDATE daily_bar AS today
     SET previous_close = yesterday.close
     FROM days
     JOIN daily_bar AS yesterday
       ON yesterday.domain = 'StockTrading'
      AND yesterday.session_date = days.previous_date
     WHERE today.domain = 'StockTrading'
       AND today.session_date = days.session_date
       AND today.ticker = yesterday.ticker
       AND today.previous_close IS NULL
       AND yesterday.close IS NOT NULL`,
  );
  return { written: result.rowCount ?? 0 };
}

/** 用 previous_close 与 close 补涨跌幅（百分数，与限涨跌门槛一致）。 */
export async function fillChangePercent(): Promise<{ written: number }> {
  const result = await pool.query(
    `UPDATE daily_bar
     SET change_percent = (close - previous_close) / previous_close * 100.0
     WHERE domain = 'StockTrading'
       AND change_percent IS NULL
       AND close IS NOT NULL
       AND previous_close IS NOT NULL
       AND previous_close <> 0`,
  );
  return { written: result.rowCount ?? 0 };
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*",
  });
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "Body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function queryFilters(url: URL, resource: Resource): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (resource.table === "daily_bar" && (key === "sessionDateFrom" || key === "sessionDateTo")) {
      filters[key] = value;
      continue;
    }
    const column = columnByJson(resource, key) ?? columnByName(resource, key);
    if (!column) {
      throw new ApiError(400, `Unknown query ${key}`);
    }
    filters[column.json] = value;
  }
  return filters;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, await healthcheck());
      return;
    }
    if (request.method === "GET" && url.pathname === "/resources") {
      send(response, 200, { resources: Object.keys(resources) });
      return;
    }
    if (request.method === "GET" && url.pathname === "/schema") {
      send(response, 200, ontologySchema(resources));
      return;
    }
    if (parts.length === 2 && parts[0] === "daily-bars" && parts[1] === "window" && request.method === "GET") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to) throw new ApiError(400, "daily-bars/window requires from and to");
      send(response, 200, await listDailyBarsWindow(from, to, url.searchParams.get("domain") ?? stockTradingDomain));
      return;
    }
    if (parts.length === 1 && request.method === "GET") {
      const resource = resources[parts[0]];
      if (!resource) {
        throw new ApiError(404, `Unknown resource ${parts[0]}`);
      }
      send(response, 200, await listObjects(parts[0], queryFilters(url, resource)));
      return;
    }
    if (parts.length === 1 && request.method === "POST") {
      const body = await readBody(request);
      if (parts[0] === "daily-bars") {
        send(response, 200, await saveDailyBar(body));
        return;
      }
      if (parts[0] === "trading-days") {
        send(response, 200, await saveTradingDay(body));
        return;
      }
      if (parts[0] === "accounts") {
        send(response, 200, await saveAccount(body));
        return;
      }
      if (parts[0] === "positions") {
        send(response, 200, await savePosition(body));
        return;
      }
      if (parts[0] === "fills") {
        send(response, 200, await saveFill(body));
        return;
      }
      if (parts[0] === "strategies") {
        send(response, 200, await saveStrategy(body));
        return;
      }
      if (parts[0] === "sell-orders") {
        send(response, 200, await saveOrder("sell-orders", "sellLineId", body));
        return;
      }
      if (parts[0] === "buy-orders") {
        send(response, 200, await saveOrder("buy-orders", "buyLineId", body));
        return;
      }
      if (parts[0] === "arrangements") {
        send(response, 200, await saveArrangement(body));
        return;
      }
      if (parts[0] === "sell-lines") {
        send(response, 200, await saveSellLine(body));
        return;
      }
      if (parts[0] === "buy-lines") {
        send(response, 200, await saveBuyLine(body));
        return;
      }
      if (parts[0] === "signals") {
        send(response, 200, await saveSignal(body));
        return;
      }
      send(response, 200, await saveObject(parts[0], body));
      return;
    }
    if (request.method === "POST" && parts[0] === "daily-bars" && parts[1] === "previous-close") {
      send(response, 200, await fillPreviousClose());
      return;
    }
    if (request.method === "POST" && parts[0] === "daily-bars" && parts[1] === "change-percent") {
      send(response, 200, await fillChangePercent());
      return;
    }
    if (request.method === "POST" && parts[0] === "daily-bars" && parts[1] === "batch") {
      const body = await readBody(request);
      const rows = Array.isArray(body.rows) ? body.rows as Record<string, unknown>[] : [];
      if (body.pass === "source") {
        send(response, 200, await saveSourceBatch(rows));
        return;
      }
      if (body.pass === "derived") {
        send(response, 200, await saveDerivedBatch(rows));
        return;
      }
      throw new ApiError(400, "daily-bars batch requires pass source or derived");
    }
    if (parts.length === 2 && request.method === "GET") {
      send(response, 200, await getObject(parts[0], decodeURIComponent(parts[1])));
      return;
    }
    throw new ApiError(404, "Not found");
  } catch (error) {
    if (error instanceof ApiError) {
      send(response, error.status, { error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      send(response, 400, { error: "Body is not valid JSON" });
      return;
    }
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "23503" || code === "23514" || code === "22P02" || code === "23502") {
      send(response, 400, { error: error instanceof Error ? error.message : "Invalid row" });
      return;
    }
    send(response, 500, { error: error instanceof Error ? error.message : "Database error" });
  }
});

export function publishedSchema() {
  return ontologySchema(resources);
}

if (!process.env.DATABASE_API_NO_LISTEN) {
  server.listen(port, () => {
    process.stdout.write(`database-api listening on ${port}\n`);
  });
}
