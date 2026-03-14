-- ============================================================
-- SETUP FLEXIBLE STAKING WITH HOURLY REWARD CALCULATION
-- Deployed on: 2026-03-15
-- ============================================================

-- Create staking_positions table to track staking history
CREATE TABLE IF NOT EXISTS staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL,
  type VARCHAR(50) DEFAULT 'flexible', -- 'flexible' or 'fixed'
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  claimed_rewards NUMERIC(20, 8) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create staking_config table for flexible staking parameters
CREATE TABLE IF NOT EXISTS staking_config (
  id BIGINT PRIMARY KEY DEFAULT 1,
  apy NUMERIC(5, 2) DEFAULT 12, -- Annual Percentage Yield
  type VARCHAR(50) DEFAULT 'flexible', -- 'flexible' or 'fixed'
  duration_days INTEGER DEFAULT 0, -- 0 for flexible
  bonus_percentage NUMERIC(5, 2) DEFAULT 0, -- Bonus for fixed staking
  min_amount NUMERIC(20, 8) DEFAULT 100,
  max_amount NUMERIC(20, 8) DEFAULT 1000000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default flexible staking config if not exists
INSERT INTO staking_config (id, apy, type, duration_days, bonus_percentage, min_amount, max_amount)
VALUES (1, 12, 'flexible', 0, 0, 100, 1000000)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_staking_user_id ON staking_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_active ON staking_positions(user_id, ended_at) 
WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staking_started_at ON staking_positions(started_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON staking_positions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON staking_config TO anon, authenticated;

-- RPC Function: Calculate hourly rewards for a user
CREATE OR REPLACE FUNCTION calculate_staking_rewards(p_user_id UUID)
RETURNS TABLE(
  total_staked NUMERIC,
  hourly_reward NUMERIC,
  daily_reward NUMERIC,
  total_claimable NUMERIC
) AS $$
DECLARE
  v_total_staked NUMERIC;
  v_apy NUMERIC;
  v_hourly_reward NUMERIC;
  v_daily_reward NUMERIC;
  v_total_claimable NUMERIC;
BEGIN
  -- Get total active staked amount
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_staked
  FROM staking_positions
  WHERE user_id = p_user_id AND ended_at IS NULL;

  -- Get APY from config
  SELECT apy INTO v_apy FROM staking_config WHERE id = 1;

  -- Calculate hourly reward: (staked * APY / 365 / 24) / 100
  v_hourly_reward := (v_total_staked * v_apy / 365 / 24) / 100;

  -- Calculate daily reward: hourly * 24
  v_daily_reward := v_hourly_reward * 24;

  -- Get total claimable (rewards since started, not yet claimed)
  SELECT COALESCE(SUM(
    (EXTRACT(EPOCH FROM NOW() - started_at) / 3600) * 
    ((v_total_staked * v_apy / 365 / 24) / 100)
  ), 0)
  INTO v_total_claimable
  FROM staking_positions
  WHERE user_id = p_user_id AND ended_at IS NULL;

  RETURN QUERY
  SELECT v_total_staked, v_hourly_reward, v_daily_reward, v_total_claimable;
END;
$$ LANGUAGE plpgsql;

-- RPC Function: Claim staking rewards
CREATE OR REPLACE FUNCTION claim_staking_rewards(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_claimable_amount NUMERIC;
  v_hourly_epoch NUMERIC;
BEGIN
  -- Calculate claimable rewards
  SELECT COALESCE(SUM(
    (EXTRACT(EPOCH FROM NOW() - started_at) / 3600) * 
    ((COALESCE((SELECT SUM(amount) FROM staking_positions WHERE user_id = p_user_id AND ended_at IS NULL), 0) 
      * (SELECT apy FROM staking_config WHERE id = 1) / 365 / 24) / 100)
  ), 0)
  INTO v_claimable_amount
  FROM staking_positions
  WHERE user_id = p_user_id AND ended_at IS NULL;

  IF v_claimable_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No claimable rewards');
  END IF;

  BEGIN
    -- 1. Add rewards to user balance
    UPDATE users 
    SET balance_axe = balance_axe + v_claimable_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 2. Mark positions as fully claimed
    UPDATE staking_positions
    SET claimed_rewards = claimed_rewards + v_claimable_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND ended_at IS NULL;

    -- 3. Record transaction
    INSERT INTO transactions (user_id, type, amount, currency, statut, note)
    VALUES (p_user_id, 'stake_claim', v_claimable_amount, 'AXE', 'completed', 
            'Staking rewards claimed');

    RETURN json_build_object(
      'success', true,
      'amount_claimed', v_claimable_amount,
      'message', 'Rewards claimed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- RPC Function: End staking position (unstake)
CREATE OR REPLACE FUNCTION end_staking_position(p_user_id UUID, p_position_id UUID)
RETURNS JSON AS $$
DECLARE
  v_position RECORD;
BEGIN
  -- Get staking position
  SELECT * INTO v_position 
  FROM staking_positions 
  WHERE id = p_position_id AND user_id = p_user_id;

  IF v_position IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staking position not found');
  END IF;

  IF v_position.ended_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Position already ended');
  END IF;

  BEGIN
    -- At unstake: rewards are automatically transferred to balance_axe in app
    -- Just mark position as ended
    UPDATE staking_positions
    SET ended_at = NOW(),
        updated_at = NOW()
    WHERE id = p_position_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Unstaking completed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;
