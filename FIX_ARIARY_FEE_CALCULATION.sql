-- ============================================================
-- FIX: Correct P2P Ariary fee calculation
-- ============================================================
-- BEFORE: v_fee_amount := (amount * fee_percentage / 100) / 1000;
-- This was WRONG: (50000 * 1 / 100) / 1000 = 500 / 1000 = 0.5 AXE (by chance correct, but formula wrong)
--
-- CORRECT: v_fee_amount := (amount / 1000) * (fee_percentage / 100);
-- Logic: 1 AXE = 1000 Ariary
--   - 50,000 Ariary = 50 AXE
--   - Fee = 50 AXE * 1% = 0.5 AXE
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
  v_result JSON;
BEGIN
  -- Validate users exist
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Get sender's Ariary balance
  SELECT balance_ariary INTO v_sender_balance FROM users WHERE id = sender_id;

  -- Check if sender has enough Ariary
  IF v_sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient Ariary balance');
  END IF;

  -- 🔥 CORRECTED FEE CALCULATION
  -- Fee in AXE = (amount in Ariary / 1000) * (fee_percentage / 100)
  -- Example: 50,000 Ariary at 1% fee = (50000/1000) * (1/100) = 50 * 0.01 = 0.5 AXE
  v_fee_amount := (amount / 1000.0) * (fee_percentage / 100.0);

  -- Check if sender has enough AXE for fee
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = sender_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for transaction fee');
  END IF;

  BEGIN
    -- Start atomic transaction
    -- 1. Debit sender Ariary
    UPDATE users SET balance_ariary = balance_ariary - amount WHERE id = sender_id;

    -- 2. Credit recipient Ariary
    UPDATE users SET balance_ariary = balance_ariary + amount WHERE id = recipient_id;

    -- 3. Debit sender AXE for fee
    UPDATE users SET balance_axe = balance_axe - v_fee_amount WHERE id = sender_id;

    -- 4. Log transactions
    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status) 
    VALUES (sender_id, 'p2p_sent', 'ariary', amount, sender_id, recipient_id, 'completed');

    INSERT INTO transactions (user_id, type, currency, amount, from_user_id, to_user_id, status) 
    VALUES (recipient_id, 'p2p_received', 'ariary', amount, sender_id, recipient_id, 'completed');

    -- 5. Record fee collection (in AXE)
    PERFORM record_fee(sender_id, 'p2p_ariary', v_fee_amount, NULL);

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
