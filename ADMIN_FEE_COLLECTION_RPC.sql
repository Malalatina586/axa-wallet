-- ============================================================
-- RPC FUNCTIONS FOR ADMIN FEE COLLECTION ON APPROVAL
-- ============================================================

-- Approve P2P Ariary and collect fees
CREATE OR REPLACE FUNCTION approve_p2p_ariary_with_fee(
  p_transaction_id UUID,
  p_user_id UUID,
  p_fee_percentage NUMERIC DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_transaction_data RECORD;
  v_fee_amount NUMERIC;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction_data 
  FROM transactions 
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF v_transaction_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  -- Calculate fee: amount_ariary -> AXE
  -- 1 AXE = 1000 Ariary
  v_fee_amount := (v_transaction_data.amount / 1000.0) * (p_fee_percentage / 100.0);

  -- Check if user has enough AXE for fee
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for fee collection');
  END IF;

  BEGIN
    -- 1. Deduct fee from user
    UPDATE users 
    SET balance_axe = balance_axe - v_fee_amount 
    WHERE id = p_user_id;

    -- 2. Mark as approved
    UPDATE transactions 
    SET status = 'completed' 
    WHERE id = p_transaction_id;

    -- 3. Record fee
    INSERT INTO fees_collected (user_id, transaction_type, amount_axe)
    VALUES (p_user_id, 'p2p_ariary_approved', v_fee_amount);

    -- 4. Update total fees
    UPDATE config 
    SET total_fees_collected = total_fees_collected + v_fee_amount 
    WHERE id = 1;

    RETURN json_build_object(
      'success', true,
      'fee_amount', v_fee_amount,
      'message', 'P2P Ariary approved with fee collected'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- Approve Dépôt and collect fees
CREATE OR REPLACE FUNCTION approve_depot_with_fee(
  p_depot_id UUID,
  p_user_id UUID,
  p_montant_ariary NUMERIC,
  p_fee_percentage NUMERIC DEFAULT 2
)
RETURNS JSON AS $$
DECLARE
  v_fee_amount NUMERIC;
BEGIN
  -- Calculate fee: montant_ariary -> AXE
  v_fee_amount := (p_montant_ariary / 1000.0) * (p_fee_percentage / 100.0);

  -- Check if user has enough AXE for fee
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for fee collection');
  END IF;

  BEGIN
    -- 1. Deduct fee from user
    UPDATE users 
    SET balance_axe = balance_axe - v_fee_amount 
    WHERE id = p_user_id;

    -- 2. Mark as approved
    UPDATE depots 
    SET statut = 'approved' 
    WHERE id = p_depot_id;

    -- 3. Record fee
    INSERT INTO fees_collected (user_id, transaction_type, amount_axe)
    VALUES (p_user_id, 'depot', v_fee_amount);

    -- 4. Update total fees
    UPDATE config 
    SET total_fees_collected = total_fees_collected + v_fee_amount 
    WHERE id = 1;

    RETURN json_build_object(
      'success', true,
      'fee_amount', v_fee_amount,
      'message', 'Dépôt approved with fee collected'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- Approve Retrait and collect fees
CREATE OR REPLACE FUNCTION approve_retrait_with_fee(
  p_retrait_id UUID,
  p_user_id UUID,
  p_montant_ariary NUMERIC,
  p_fee_percentage NUMERIC DEFAULT 3
)
RETURNS JSON AS $$
DECLARE
  v_fee_amount NUMERIC;
BEGIN
  -- Calculate fee: montant_ariary -> AXE
  v_fee_amount := (p_montant_ariary / 1000.0) * (p_fee_percentage / 100.0);

  -- Check if user has enough AXE for fee
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND balance_axe >= v_fee_amount) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AXE for fee collection');
  END IF;

  BEGIN
    -- 1. Deduct fee from user
    UPDATE users 
    SET balance_axe = balance_axe - v_fee_amount 
    WHERE id = p_user_id;

    -- 2. Mark as approved
    UPDATE retraits 
    SET statut = 'approved' 
    WHERE id = p_retrait_id;

    -- 3. Record fee
    INSERT INTO fees_collected (user_id, transaction_type, amount_axe)
    VALUES (p_user_id, 'retrait', v_fee_amount);

    -- 4. Update total fees
    UPDATE config 
    SET total_fees_collected = total_fees_collected + v_fee_amount 
    WHERE id = 1;

    RETURN json_build_object(
      'success', true,
      'fee_amount', v_fee_amount,
      'message', 'Retrait approved with fee collected'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;
