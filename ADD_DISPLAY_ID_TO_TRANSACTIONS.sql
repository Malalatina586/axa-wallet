-- ============================================================
-- ADD display_id TO TRANSACTION TRACKING
-- ============================================================

-- Update transfer_p2p_ariary to accept and store display_id
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

  -- Use provided display_id or generate one
  v_display_id := COALESCE(display_id, 'TX' || LPAD((RANDOM()*99999)::TEXT, 5, '0') || LPAD((RANDOM()*999)::TEXT, 3, '0'));

  -- CORRECTED FEE CALCULATION
  -- Fee in AXE = (amount in Ariary / 1000) * (fee_percentage / 100)
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

-- Similar updates for transfer_p2p_axe and transfer_p2p_usdt can be applied
-- Pattern is the same: add display_id parameter and include in transaction inserts
