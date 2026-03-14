-- ============================================================
-- CREATE FEES_COLLECTED TABLE
-- Deployed on: 2026-03-15
-- ============================================================

-- Create fees_collected table if it doesn't exist
CREATE TABLE IF NOT EXISTS fees_collected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'depot', 'retrait', 'p2p_ariary', 'p2p_axe', 'p2p_usdt'
  amount_axe NUMERIC(20, 8) NOT NULL DEFAULT 0,
  tx_hash VARCHAR(255) UNIQUE, -- For blockchain references
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fees_user_id ON fees_collected(user_id);
CREATE INDEX IF NOT EXISTS idx_fees_type ON fees_collected(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fees_created_at ON fees_collected(created_at);

-- Add total_fees_collected to config if not exists
ALTER TABLE config ADD COLUMN IF NOT EXISTS total_fees_collected NUMERIC(20, 8) DEFAULT 0;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON fees_collected TO anon, authenticated;
