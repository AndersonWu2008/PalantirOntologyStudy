-- Tables for the object types in docs/001_推导/25_整链Ontology设计.md.
-- Columns use the ontology api names. This file runs once, on a new data volume.

CREATE TABLE account (
  account_id text PRIMARY KEY,
  display_name text NOT NULL,
  available_cash double precision NOT NULL,
  total_assets double precision NOT NULL,
  enabled_strategy_id text
);

CREATE TABLE stock (
  ticker text PRIMARY KEY,
  display_name text NOT NULL,
  is_st boolean NOT NULL DEFAULT false,
  board text CHECK (board IS NULL OR board IN ('主板', '创业板'))
);

CREATE TABLE industry (
  industry_id text PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE tradable_range (
  index_id text PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE strategy (
  strategy_id text PRIMARY KEY,
  display_name text NOT NULL,
  pack_id text,
  universe_index_id text REFERENCES tradable_range (index_id),
  breadth_min double precision,
  regime_min_persist_days integer,
  exit_on_regime_flip boolean,
  price_min double precision,
  price_max double precision,
  max_per_industry integer,
  limit_up_count_min integer,
  consecutive_limit_down_days integer,
  limit_down_percent double precision,
  limit_up_count_percent double precision,
  chinext_limit_up_percent double precision,
  main_limit_up_percent double precision,
  bull_stop_loss double precision,
  bull_trailing_activate double precision,
  bull_trailing_stop double precision,
  bull_max_hold_days integer,
  bull_max_positions integer,
  bull_single_position_pct double precision,
  bull_min_score double precision,
  bull_atr_multiple double precision,
  high_vol_stop_loss double precision,
  high_vol_trailing_activate double precision,
  high_vol_trailing_stop double precision,
  high_vol_max_hold_days integer,
  high_vol_max_positions integer,
  high_vol_single_position_pct double precision,
  high_vol_min_score double precision,
  high_vol_atr_multiple double precision,
  sideways_stop_loss double precision,
  sideways_trailing_activate double precision,
  sideways_trailing_stop double precision,
  sideways_max_hold_days integer,
  sideways_max_positions integer,
  sideways_single_position_pct double precision,
  sideways_min_score double precision,
  sideways_atr_multiple double precision,
  bear_max_positions integer,
  ma_short integer,
  ma_mid integer,
  ma_long integer,
  adx_bull_min double precision,
  adx_bear_min double precision,
  rising_ratio_bull double precision,
  rising_ratio_bear double precision,
  vol_window integer,
  vol_percentile_high double precision,
  limit_down_bear_ratio double precision,
  amount_ma_window integer,
  amount_shrink_warn double precision,
  min_history_days integer,
  index_lookback integer,
  limit_up_overheat double precision,
  limit_up_ice double precision
);

ALTER TABLE account
  ADD CONSTRAINT account_enabled_strategy_fk
  FOREIGN KEY (enabled_strategy_id) REFERENCES strategy (strategy_id);

CREATE TABLE strategy_excluded_stock (
  strategy_id text NOT NULL REFERENCES strategy (strategy_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  PRIMARY KEY (strategy_id, ticker)
);

CREATE TABLE index_constituent (
  index_id text NOT NULL REFERENCES tradable_range (index_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  PRIMARY KEY (index_id, ticker)
);

CREATE TABLE trading_day (
  session_date date PRIMARY KEY,
  is_trading_day boolean NOT NULL,
  index_close double precision,
  index_volume double precision,
  total_amount double precision,
  breadth double precision,
  regime text CHECK (regime IS NULL OR regime IN ('牛市趋势', '高波动', '震荡', '熊市趋势')),
  bull_hv_streak integer,
  entry_gate text CHECK (entry_gate IS NULL OR entry_gate IN ('允许', '关闭', '缺少')),
  selection_missing boolean,
  limit_up_ratio double precision,
  limit_down_ratio double precision,
  adx double precision,
  rising_ratio double precision,
  vol_percentile double precision,
  amount_deviation double precision
);

CREATE TABLE daily_bar (
  bar_id text PRIMARY KEY,
  ticker text NOT NULL REFERENCES stock (ticker),
  session_date date NOT NULL REFERENCES trading_day (session_date),
  open double precision,
  high double precision,
  low double precision,
  close double precision,
  volume double precision,
  amount double precision,
  change_percent double precision,
  previous_close double precision,
  suspended boolean,
  published_industry text,
  limit_up double precision,
  limit_down double precision,
  ma20 double precision,
  atr14 double precision,
  vol_ratio double precision,
  above_ma20 boolean,
  f1 double precision,
  f2 double precision,
  f3 double precision,
  f4 double precision,
  comparison_score double precision,
  comparison_rank double precision,
  limit_up_count_120 integer,
  resolved_industry_id text REFERENCES industry (industry_id),
  day_ret double precision,
  is_limit_up boolean,
  excluded boolean,
  lu_recent_20d double precision,
  lu_count_60d double precision,
  high_20d double precision,
  dd_from_high20 double precision,
  vol_ma5 double precision,
  vol_max_20d double precision,
  vol_shrink double precision,
  ret_3d double precision,
  ma60 double precision,
  score_zj double precision,
  score_zj_rank double precision,
  UNIQUE (ticker, session_date)
);

CREATE TABLE evaluation_run (
  run_id text PRIMARY KEY,
  strategy_id text NOT NULL REFERENCES strategy (strategy_id),
  pack_id text,
  display_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT '完成',
  annual_return double precision,
  max_drawdown double precision,
  calmar double precision,
  win_rate double precision,
  trade_count integer,
  final_equity double precision,
  notes text
);

CREATE TABLE evaluation_point (
  point_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES evaluation_run (run_id) ON DELETE CASCADE,
  session_date date NOT NULL,
  equity double precision NOT NULL,
  drawdown double precision,
  UNIQUE (run_id, session_date)
);

CREATE TABLE evaluation_trade (
  trade_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES evaluation_run (run_id) ON DELETE CASCADE,
  ticker text NOT NULL,
  side text NOT NULL,
  entry_date date,
  exit_date date,
  entry_price double precision,
  exit_price double precision,
  pnl double precision,
  exit_reason text
);

CREATE TABLE position (
  position_id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES account (account_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  quantity bigint NOT NULL,
  sellable_quantity bigint NOT NULL,
  entry_price double precision,
  entry_date date,
  atr_at_entry double precision,
  regime_at_entry text CHECK (regime_at_entry IS NULL OR regime_at_entry IN ('牛市趋势', '高波动', '震荡', '熊市趋势')),
  high_since_entry double precision,
  days_held integer,
  entry_fields_missing boolean,
  exit_state text CHECK (exit_state IS NULL OR exit_state IN ('继续拿', '缺少', '已写入卖出行')),
  exit_judged_on date,
  exit_reason text CHECK (exit_reason IS NULL OR exit_reason IN ('止损', '止盈', '到期', '制度离场'))
);

CREATE TABLE fill (
  fill_id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES account (account_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  session_date date NOT NULL REFERENCES trading_day (session_date),
  side text NOT NULL CHECK (side IN ('买入', '卖出')),
  price double precision NOT NULL,
  quantity bigint NOT NULL,
  position_id text REFERENCES position (position_id)
);

CREATE TABLE signal (
  signal_id text PRIMARY KEY,
  strategy_id text NOT NULL REFERENCES strategy (strategy_id),
  session_date date NOT NULL REFERENCES trading_day (session_date),
  ticker text NOT NULL REFERENCES stock (ticker),
  rank integer NOT NULL,
  planned_quantity bigint NOT NULL,
  planned_limit_price double precision NOT NULL,
  UNIQUE (strategy_id, session_date, ticker)
);

CREATE TABLE pre_open_arrangement (
  arrangement_id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES account (account_id),
  session_date date NOT NULL REFERENCES trading_day (session_date),
  strategy_id text NOT NULL REFERENCES strategy (strategy_id),
  supersedes_arrangement_id text REFERENCES pre_open_arrangement (arrangement_id),
  handed_over_at timestamptz NOT NULL,
  header text,
  header_at_confirm text,
  total_assets_shown double precision,
  total_assets_at_confirm double precision,
  cash_shown double precision,
  cash_at_confirm double precision,
  continue_count integer,
  position_count_agrees boolean,
  playbook_changed boolean,
  stopped boolean NOT NULL DEFAULT false,
  nothing_to_send_acknowledged boolean NOT NULL DEFAULT false,
  sell_confirmed_by text,
  sell_confirmed_at timestamptz,
  buy_confirmed_by text,
  buy_confirmed_at timestamptz
);

CREATE TABLE sell_line (
  sell_line_id text PRIMARY KEY,
  arrangement_id text NOT NULL REFERENCES pre_open_arrangement (arrangement_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  position_id text NOT NULL REFERENCES position (position_id),
  reason text NOT NULL CHECK (reason IN ('止损', '止盈', '到期', '制度离场')),
  planned_quantity bigint NOT NULL,
  submit_quantity bigint,
  planned_limit_price double precision NOT NULL,
  submit_limit_price double precision,
  open_price double precision,
  open_change double precision,
  amount double precision,
  weight double precision,
  broker_sellable bigint,
  outcome text,
  outcome_at_confirm text,
  postponed boolean NOT NULL DEFAULT false,
  UNIQUE (arrangement_id, ticker)
);

CREATE TABLE buy_line (
  buy_line_id text PRIMARY KEY,
  arrangement_id text NOT NULL REFERENCES pre_open_arrangement (arrangement_id),
  ticker text NOT NULL REFERENCES stock (ticker),
  rank integer NOT NULL,
  planned_quantity bigint NOT NULL,
  submit_quantity bigint,
  planned_limit_price double precision NOT NULL,
  submit_limit_price double precision,
  open_price double precision,
  open_change double precision,
  amount double precision,
  weight double precision,
  outcome text,
  outcome_at_confirm text,
  vetoed boolean NOT NULL DEFAULT false,
  UNIQUE (arrangement_id, ticker),
  UNIQUE (arrangement_id, rank)
);

CREATE TABLE sell_order (
  order_id text PRIMARY KEY,
  sell_line_id text NOT NULL REFERENCES sell_line (sell_line_id),
  quantity bigint NOT NULL,
  limit_price double precision NOT NULL,
  content_status text NOT NULL CHECK (content_status IN ('待执行', '不执行')),
  broker_order_id text,
  execution_status text NOT NULL CHECK (execution_status IN ('未执行', '已提交执行', '已受理', '被拒绝')),
  execution_written_at timestamptz
);

CREATE TABLE buy_order (
  order_id text PRIMARY KEY,
  buy_line_id text NOT NULL REFERENCES buy_line (buy_line_id),
  quantity bigint NOT NULL,
  limit_price double precision NOT NULL,
  content_status text NOT NULL CHECK (content_status IN ('待执行', '不执行')),
  broker_order_id text,
  execution_status text NOT NULL CHECK (execution_status IN ('未执行', '已提交执行', '已受理', '被拒绝')),
  execution_written_at timestamptz
);

-- Every object carries the domain it belongs to. The current domain is StockTrading.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'account', 'stock', 'industry', 'tradable_range', 'strategy', 'strategy_excluded_stock',
    'index_constituent', 'trading_day', 'daily_bar', 'position', 'fill', 'signal',
    'pre_open_arrangement', 'sell_line', 'buy_line', 'sell_order', 'buy_order'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN domain text NOT NULL DEFAULT %L',
      table_name,
      'StockTrading'
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I CHECK (domain ~ %L)',
      table_name,
      table_name || '_domain_name',
      '^[A-Z][A-Za-z0-9]*$'
    );
  END LOOP;
END $$;
