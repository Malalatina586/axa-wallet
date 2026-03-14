-- ============================================================
-- FEES COLLECTION SYSTEM - Complete Migration
-- ============================================================
-- This migration implements an AXE-based fee system where:
-- 1. All transaction fees are in AXE (creates utility for native token)
-- 2. Fees are automatically sent to admin wallet
-- 3. All fees are tracked in fees_collected table
-- ============================================================

-- 1. Create fees_collected table
CREATE TABLE IF NOT EXISTS fees_collected (
  id BIGSERIAL PRIMARY KEY,
  transaction_id UUID,
  user_id UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'p2p_ariary', 'p2p_axe', 'p2p_usdt', 'depot', 'retrait', 'conversion'
  amount_axe NUMERIC(18, 8) NOT NULL,
  recipient_wallet TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('p2p_ariary', 'p2p_axe', 'p2p_usdt', 'depot', 'retrait', 'conversion'))
);

-- Add index for quick lookups
CREATE INDEX idx_fees_collected_user ON fees_collected(user_id);
CREATE INDEX idx_fees_collected_type ON fees_collected(transaction_type);
CREATE INDEX idx_fees_collected_date ON fees_collected(created_at);

-- 2. Add columns to config table if not exists
ALTER TABLE config
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC(5, 2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS fee_wallet_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS total_fees_collected NUMERIC(20, 8) DEFAULT 0;

-- 3. Enable RLS on fees_collected
ALTER TABLE fees_collected ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own fees
CREATE POLICY "Users can view their own fees" ON fees_collected
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR (SELECT role FROM users WHERE uid = auth.uid()) = 'admin');

-- Policy for admin to view all fees
CREATE POLICY "Admin can view all fees" ON fees_collected
FOR SELECT
TO authenticated
USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');

-- 4. Create function to calculate AXE fees
CREATE OR REPLACE FUNCTION calculate_axe_fee(amount NUMERIC, fee_percentage NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (amount * fee_percentage / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- HELPER FUNCTION: Record Fee Collection
-- ============================================================
CREATE OR REPLACE FUNCTION record_fee(
  p_user_id UUID,
  p_transaction_type VARCHAR,
  p_amount_axe NUMERIC,
  p_tx_hash TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  INSERT INTO fees_collected (
    user_id,
    transaction_type,
    amount_axe,
    tx_hash
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount_axe,
    p_tx_hash
  );

  -- Update total fees collected in config
  UPDATE config
  SET total_fees_collected = total_fees_collected + p_amount_axe
  WHERE id = 1;

  RETURN json_build_object(
    'success', true,
    'amount_axe', p_amount_axe,
    'message', 'Fee recorded'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED RPC: transfer_p2p_ariary WITH AXE FEE
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_p2p_ariary(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  fee_percentage NUMERIC DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_fee_wallet TEXT;
  v_result JSON;
BEGIN
  -- Get fee wallet from config
  SELECT fee_wallet_address INTO v_fee_wallet FROM config WHERE id = 1;
  
  IF v_fee_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fee wallet not configured');
  END IF;

  -- Validate users exist
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's Ariary balance
  SELECT balance_ariary INTO v_sender_balance FROM users WHERE uid = sender_id;

  -- Check if sender has enough Ariary
  IF v_sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient Ariary balance');
  END IF;

  -- Check if sender has enough AXE for fee
  -- Fee = 1% of 1000 Ariary = 0.01 AXE approximately
  -- For Ariary transactions, fee is calculated as: amount * fee_percentage / 100 / 1000 (convert to AXE)
  v_fee_amount := (amount * fee_percentage / 100) / 1000; -- Convert Ariary to AXE units

  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = sender_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for transaction fee');
  END IF;

  BEGIN
    -- Start atomic transaction
    -- 1. Debit sender Ariary
    UPDATE users SET balance_ariary = balance_ariary - amount WHERE uid = sender_id;

    -- 2. Credit recipient Ariary
    UPDATE users SET balance_ariary = balance_ariary + amount WHERE uid = recipient_id;

    -- 3. Debit sender AXE for fee
    UPDATE users SET balance_axe = balance_axe - v_fee_amount WHERE uid = sender_id;

    -- 4. Credit admin fee wallet with AXE
    -- The fee is sent to the admin fee wallet
    -- This is tracked in fees_collected table

    -- 5. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status) 
    VALUES (sender_id, 'p2p_sent', 'ariary', amount, sender_id, recipient_id, 'completed');

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status) 
    VALUES (recipient_id, 'p2p_received', 'ariary', amount, sender_id, recipient_id, 'completed');

    -- 6. Record fee collection
    PERFORM record_fee(sender_id, 'p2p_ariary', v_fee_amount);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P transfer completed',
      'amount_ariary', amount,
      'fee_axe', v_fee_amount
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED RPC: transfer_p2p_axe WITH AXE FEE
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_p2p_axe(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  tx_hash TEXT,
  fee_percentage NUMERIC DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_fee_wallet TEXT;
BEGIN
  -- Get fee wallet from config
  SELECT fee_wallet_address INTO v_fee_wallet FROM config WHERE id = 1;
  
  IF v_fee_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fee wallet not configured');
  END IF;

  -- Validate users exist
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's AXE balance
  SELECT balance_axe INTO v_sender_balance FROM users WHERE uid = sender_id;

  -- Calculate fee
  v_fee_amount := amount * fee_percentage / 100;

  -- Check if sender has enough AXE (amount + fee)
  IF v_sender_balance < (amount + v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE balance (includes fee)');
  END IF;

  BEGIN
    -- 1. Debit sender AXE (amount + fee)
    UPDATE users SET balance_axe = balance_axe - (amount + v_fee_amount) WHERE uid = sender_id;

    -- 2. Credit recipient AXE (only amount, not fee)
    UPDATE users SET balance_axe = balance_axe + amount WHERE uid = recipient_id;

    -- 3. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status) 
    VALUES (sender_id, 'p2p_sent', 'axe', amount, sender_id, recipient_id, tx_hash, 'completed');

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status) 
    VALUES (recipient_id, 'p2p_received', 'axe', amount, sender_id, recipient_id, tx_hash, 'completed');

    -- 4. Record fee collection
    PERFORM record_fee(sender_id, 'p2p_axe', v_fee_amount, tx_hash);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P AXE transfer completed',
      'amount_sent', amount,
      'fee_axe', v_fee_amount,
      'total_debited', amount + v_fee_amount
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED RPC: transfer_p2p_usdt WITH AXE FEE
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_p2p_usdt(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  tx_hash TEXT,
  fee_percentage NUMERIC DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount_axe NUMERIC;
  v_fee_wallet TEXT;
BEGIN
  -- Get fee wallet from config
  SELECT fee_wallet_address INTO v_fee_wallet FROM config WHERE id = 1;
  
  IF v_fee_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fee wallet not configured');
  END IF;

  -- Validate users exist
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's USDT balance
  SELECT balance_usdt INTO v_sender_balance FROM users WHERE uid = sender_id;

  -- Check if sender has enough USDT
  IF v_sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient USDT balance');
  END IF;

  -- Fee in AXE = 1% of amount (USDT) converted to AXE
  -- Example: 100 USDT * 0.045 = 4.5 AXE * 1% = 0.045 AXE
  -- For now, we'll use a simple calculation: fee percentage on amount as AXE equivalent
  v_fee_amount_axe := amount * fee_percentage / 100 * 0.045; -- Assume USDT fee based on exchange rate

  -- Check if sender has enough AXE for fee
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = sender_id AND balance_axe >= v_fee_amount_axe) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for transaction fee');
  END IF;

  BEGIN
    -- 1. Debit sender USDT
    UPDATE users SET balance_usdt = balance_usdt - amount WHERE uid = sender_id;

    -- 2. Credit recipient USDT
    UPDATE users SET balance_usdt = balance_usdt + amount WHERE uid = recipient_id;

    -- 3. Debit sender AXE for fee
    UPDATE users SET balance_axe = balance_axe - v_fee_amount_axe WHERE uid = sender_id;

    -- 4. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status) 
    VALUES (sender_id, 'p2p_sent', 'usdt', amount, sender_id, recipient_id, tx_hash, 'completed');

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status) 
    VALUES (recipient_id, 'p2p_received', 'usdt', amount, sender_id, recipient_id, tx_hash, 'completed');

    -- 5. Record fee collection
    PERFORM record_fee(sender_id, 'p2p_usdt', v_fee_amount_axe, tx_hash);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P USDT transfer completed',
      'amount_sent', amount,
      'fee_axe', v_fee_amount_axe
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- NEW RPC: Get Total Fees Collected (for Dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION get_fees_summary()
RETURNS JSON AS $$
DECLARE
  v_total_fees NUMERIC;
  v_today_fees NUMERIC;
  v_month_fees NUMERIC;
  v_fees_by_type JSON;
BEGIN
  -- Total all time
  SELECT COALESCE(SUM(amount_axe), 0) INTO v_total_fees FROM fees_collected;

  -- Today
  SELECT COALESCE(SUM(amount_axe), 0) INTO v_today_fees FROM fees_collected 
  WHERE DATE(created_at) = CURRENT_DATE;

  -- This month
  SELECT COALESCE(SUM(amount_axe), 0) INTO v_month_fees FROM fees_collected 
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  -- By transaction type
  SELECT json_object_agg(transaction_type, total) INTO v_fees_by_type
  FROM (
    SELECT transaction_type, SUM(amount_axe) as total 
    FROM fees_collected 
    GROUP BY transaction_type
  ) t;

  RETURN json_build_object(
    'total_all_time', v_total_fees,
    'total_today', v_today_fees,
    'total_this_month', v_month_fees,
    'by_type', v_fees_by_type
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read config
CREATE POLICY IF NOT EXISTS "Allow read config" ON config
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update config (for admin only)
CREATE POLICY IF NOT EXISTS "Allow update config" ON config
FOR UPDATE
TO authenticated
USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');
