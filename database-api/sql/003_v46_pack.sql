-- V46 Strategy Pack：DailyBar 因子、Strategy.packId、Evaluation 对象

ALTER TABLE strategy
  ADD COLUMN IF NOT EXISTS pack_id text;

ALTER TABLE daily_bar
  ADD COLUMN IF NOT EXISTS day_ret double precision,
  ADD COLUMN IF NOT EXISTS is_limit_up boolean,
  ADD COLUMN IF NOT EXISTS excluded boolean,
  ADD COLUMN IF NOT EXISTS lu_recent_20d double precision,
  ADD COLUMN IF NOT EXISTS lu_count_60d double precision,
  ADD COLUMN IF NOT EXISTS high_20d double precision,
  ADD COLUMN IF NOT EXISTS dd_from_high20 double precision,
  ADD COLUMN IF NOT EXISTS vol_ma5 double precision,
  ADD COLUMN IF NOT EXISTS vol_max_20d double precision,
  ADD COLUMN IF NOT EXISTS vol_shrink double precision,
  ADD COLUMN IF NOT EXISTS ret_3d double precision,
  ADD COLUMN IF NOT EXISTS ma60 double precision,
  ADD COLUMN IF NOT EXISTS score_zj double precision,
  ADD COLUMN IF NOT EXISTS score_zj_rank double precision;

UPDATE strategy SET pack_id = 'v44Champion' WHERE strategy_id = 'v44' AND pack_id IS NULL;

CREATE TABLE IF NOT EXISTS evaluation_run (
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
  notes text,
  domain text NOT NULL DEFAULT 'StockTrading'
);

CREATE TABLE IF NOT EXISTS evaluation_point (
  point_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES evaluation_run (run_id) ON DELETE CASCADE,
  session_date date NOT NULL,
  equity double precision NOT NULL,
  drawdown double precision,
  domain text NOT NULL DEFAULT 'StockTrading',
  UNIQUE (run_id, session_date)
);

CREATE TABLE IF NOT EXISTS evaluation_trade (
  trade_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES evaluation_run (run_id) ON DELETE CASCADE,
  ticker text NOT NULL,
  side text NOT NULL,
  entry_date date,
  exit_date date,
  entry_price double precision,
  exit_price double precision,
  pnl double precision,
  exit_reason text,
  domain text NOT NULL DEFAULT 'StockTrading'
);

CREATE INDEX IF NOT EXISTS evaluation_point_run_idx ON evaluation_point (run_id);
CREATE INDEX IF NOT EXISTS evaluation_trade_run_idx ON evaluation_trade (run_id);
