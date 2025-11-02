-- Create api_usage table for tracking OpenRouter API costs
-- PRD requirement: Log kosztów API (tracking budżetu)

CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id TEXT,
  operation_type TEXT, -- e.g., 'offer_extraction', 'price_check'
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Enable RLS (but allow all authenticated users to read their own data)
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own API usage
CREATE POLICY "Users can view their own API usage"
  ON api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert API usage logs
CREATE POLICY "Service role can insert API usage"
  ON api_usage
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE api_usage IS 'Tracks OpenRouter API usage and costs for budget monitoring (PRD US-022)';
COMMENT ON COLUMN api_usage.endpoint IS 'API endpoint called (e.g., chat/completions)';
COMMENT ON COLUMN api_usage.model IS 'Model used (e.g., gpt-4o-mini, claude-haiku)';
COMMENT ON COLUMN api_usage.tokens_used IS 'Total tokens used in the request';
COMMENT ON COLUMN api_usage.cost_usd IS 'Estimated cost in USD';
COMMENT ON COLUMN api_usage.operation_type IS 'Type of operation (offer_extraction, price_check, etc.)';

