-- P2P USDT Atomic Transfer (similar to AXE, but stores USDT-specific data)
-- Deploy this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION transfer_p2p_usdt(
  sender_id UUID,
  recipient_id UUID,
  amount NUMERIC,
  tx_hash TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  sender_balance NUMERIC;
  recipient_exists BOOLEAN;
  result JSON;
BEGIN
  -- 1. Validate sender exists and has balance
  SELECT balance_usdt INTO sender_balance FROM users WHERE id = sender_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Sender not found');
  END IF;

  IF sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient USDT balance');
  END IF;

  -- 2. Validate recipient exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = recipient_id) INTO recipient_exists;
  IF NOT recipient_exists THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- 3. Begin atomic transaction (all-or-nothing)
  BEGIN
    -- 3a. Debit sender
    UPDATE users SET balance_usdt = balance_usdt - amount WHERE id = sender_id;

    -- 3b. Credit recipient
    UPDATE users SET balance_usdt = balance_usdt + amount WHERE id = recipient_id;

    -- 3c. Log transaction for sender (outgoing)
    INSERT INTO transactions (user_id, type, montant, statut, blockchain_tx)
    VALUES (sender_id, 'p2p_send', amount, 'completed', tx_hash);

    -- 3d. Log transaction for recipient (incoming)
    INSERT INTO transactions (user_id, type, montant, statut, blockchain_tx)
    VALUES (recipient_id, 'p2p_receive', amount, 'completed', tx_hash);

    -- 4. Return success with transaction details
    result := json_build_object(
      'success', true,
      'sender_id', sender_id,
      'recipient_id', recipient_id,
      'amount', amount,
      'blockchain_tx', tx_hash,
      'timestamp', NOW()
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback on any error (automatic with transaction handling)
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION transfer_p2p_usdt(UUID, UUID, NUMERIC, TEXT) TO authenticated;
