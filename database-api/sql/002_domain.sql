-- Add the shared domain property to an existing stock_ontology database.
-- Fresh volumes already get this column from 001_schema.sql.

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
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT %L',
      table_name,
      'StockTrading'
    );
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = table_name || '_domain_name'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (domain ~ %L)',
        table_name,
        table_name || '_domain_name',
        '^[A-Z][A-Za-z0-9]*$'
      );
    END IF;
  END LOOP;
END $$;
