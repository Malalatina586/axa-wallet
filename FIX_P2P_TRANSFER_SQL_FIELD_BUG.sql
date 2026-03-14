-- ============================================================
-- CRITICAL FIX: P2P Transfer RPC Functions - SQL Field Bug
-- ============================================================
-- Issue: RPCs were checking `uid` field but users table uses `id` field
-- Result: Transfers appeared successful but users were never found
-- Fix: Replace all `uid` references with `id` in transfer RPCs
-- ============================================================

-- FIX transfer_p2p_ariary
CREATE OR REPLACE FUNCTION transfer_p2p_ariary(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  fee_percentage NUMERIC DEFAULT 1,
  display_id VARCHAR(25) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_display_id VARCHAR(25);
BEGIN
  -- Validate users exist (FIXED: uid -> id)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's Ariary balance (FIXED: uid -> id)
  SELECT balance_ariary INTO v_sender_balance FROM users WHERE id = sender_id;

  -- Check if sender has enough Ariary
  IF v_sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient Ariary balance');
  END IF;

  -- Use provided display_id or generate one
  v_display_id := COALESCE(display_id, 'TX' || LPAD((RANDOM()*99999)::TEXT, 5, '0') || LPAD((RANDOM()*999)::TEXT, 3, '0'));

  -- Calculate fee: (amount_ariary / 220) * (fee_percentage / 100)
  v_fee_amount := (amount / 220.0) * (fee_percentage / 100.0);

  -- Check if sender has enough AXE for fee (FIXED: uid -> id)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for transaction fee');
  END IF;

  BEGIN
    -- Start atomic transaction
    -- 1. Debit sender Ariary (FIXED: uid -> id)
    UPDATE users SET balance_ariary = balance_ariary - amount WHERE id = sender_id;

    -- 2. Credit recipient Ariary (FIXED: uid -> id)
    UPDATE users SET balance_ariary = balance_ariary + amount WHERE id = recipient_id;

    -- 3. Debit sender AXE for fee (FIXED: uid -> id)
    UPDATE users SET balance_axe = balance_axe - v_fee_amount WHERE id = sender_id;

    -- 4. Log transactions with display_id
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status, display_id) 
    VALUES (sender_id, 'p2p_sent', 'ariary', amount, sender_id, recipient_id, 'completed', v_display_id);

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status, display_id) 
    VALUES (recipient_id, 'p2p_received', 'ariary', amount, sender_id, recipient_id, 'completed', v_display_id);

    -- 5. Record fee collection (in AXE)
    PERFORM record_fee(sender_id, 'p2p_ariary', v_fee_amount, NULL);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P transfer completed',
      'amount_ariary', amount,
      'fee_axe', v_fee_amount,
      'display_id', v_display_id
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================

-- FIX transfer_p2p_axe
CREATE OR REPLACE FUNCTION transfer_p2p_axe(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  tx_hash TEXT,
  fee_percentage NUMERIC DEFAULT 1,
  display_id VARCHAR(25) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_fee_wallet TEXT;
  v_display_id VARCHAR(25);
BEGIN
  -- Get fee wallet from config
  SELECT fee_wallet_address INTO v_fee_wallet FROM config WHERE id = 1;
  
  IF v_fee_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fee wallet not configured');
  END IF;

  -- Validate users exist (FIXED: uid -> id)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's AXE balance (FIXED: uid -> id)
  SELECT balance_axe INTO v_sender_balance FROM users WHERE id = sender_id;

  -- Calculate fee
  v_fee_amount := amount * fee_percentage / 100;

  -- Check if sender has enough AXE (amount + fee) (FIXED: uid -> id)
  IF v_sender_balance < (amount + v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE balance (includes fee)');
  END IF;

  -- Use provided display_id or generate one
  v_display_id := COALESCE(display_id, 'TX' || LPAD((RANDOM()*99999)::TEXT, 5, '0') || LPAD((RANDOM()*999)::TEXT, 3, '0'));

  BEGIN
    -- 1. Debit sender AXE (amount + fee) (FIXED: uid -> id)
    UPDATE users SET balance_axe = balance_axe - (amount + v_fee_amount) WHERE id = sender_id;

    -- 2. Credit recipient AXE (only amount, not fee) (FIXED: uid -> id)
    UPDATE users SET balance_axe = balance_axe + amount WHERE id = recipient_id;

    -- 3. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status, display_id) 
    VALUES (sender_id, 'p2p_sent', 'axe', amount, sender_id, recipient_id, tx_hash, 'completed', v_display_id);

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status, display_id) 
    VALUES (recipient_id, 'p2p_received', 'axe', amount, sender_id, recipient_id, tx_hash, 'completed', v_display_id);

    -- 4. Record fee collection
    PERFORM record_fee(sender_id, 'p2p_axe', v_fee_amount, tx_hash);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P AXE transfer completed',
      'amount_sent', amount,
      'fee_axe', v_fee_amount,
      'total_debited', amount + v_fee_amount,
      'display_id', v_display_id
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================

-- FIX transfer_p2p_usdt
CREATE OR REPLACE FUNCTION transfer_p2p_usdt(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  tx_hash TEXT,
  fee_percentage NUMERIC DEFAULT 1,
  display_id VARCHAR(25) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_fee_amount NUMERIC;
  v_fee_wallet TEXT;
  v_display_id VARCHAR(25);
BEGIN
  -- Get fee wallet from config
  SELECT fee_wallet_address INTO v_fee_wallet FROM config WHERE id = 1;
  
  IF v_fee_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fee wallet not configured');
  END IF;

  -- Validate users exist (FIXED: uid -> id)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's USDT balance (FIXED: uid -> id)
  SELECT balance_usdt INTO v_sender_balance FROM users WHERE id = sender_id;

  -- Calculate fee (in AXE, where fee_percentage is 1% by default)
  v_fee_amount := (amount * 0.045) * fee_percentage / 100;

  -- Check if sender has enough USDT (FIXED: uid -> id)
  IF v_sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient USDT balance');
  END IF;

  -- Check if sender has enough AXE for fee (FIXED: uid -> id)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for transaction fee');
  END IF;

  -- Use provided display_id or generate one
  v_display_id := COALESCE(display_id, 'TX' || LPAD((RANDOM()*99999)::TEXT, 5, '0') || LPAD((RANDOM()*999)::TEXT, 3, '0'));

  BEGIN
    -- 1. Debit sender USDT (FIXED: uid -> id)
    UPDATE users SET balance_usdt = balance_usdt - amount WHERE id = sender_id;

    -- 2. Credit recipient USDT (FIXED: uid -> id)
    UPDATE users SET balance_usdt = balance_usdt + amount WHERE id = recipient_id;

    -- 3. Debit sender AXE for fee (FIXED: uid -> id)
    UPDATE users SET balance_axe = balance_axe - v_fee_amount WHERE id = sender_id;

    -- 4. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status, display_id) 
    VALUES (sender_id, 'p2p_sent', 'usdt', amount, sender_id, recipient_id, tx_hash, 'completed', v_display_id);

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, tx_hash, status, display_id) 
    VALUES (recipient_id, 'p2p_received', 'usdt', amount, sender_id, recipient_id, tx_hash, 'completed', v_display_id);

    -- 5. Record fee collection (in AXE)
    PERFORM record_fee(sender_id, 'p2p_usdt', v_fee_amount, tx_hash);

    RETURN json_build_object(
      'success', true,
      'message', 'P2P USDT transfer completed',
      'amount_sent', amount,
      'fee_axe', v_fee_amount,
      'total_fee_usd', v_fee_amount * 0.045,
      'display_id', v_display_id
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GRANT permissions
GRANT EXECUTE ON FUNCTION transfer_p2p_ariary(UUID, UUID, NUMERIC, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_p2p_axe(UUID, UUID, NUMERIC, TEXT, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_p2p_usdt(UUID, UUID, NUMERIC, TEXT, NUMERIC, VARCHAR) TO authenticated;
