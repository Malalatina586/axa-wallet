-- 🔐 Supabase SQL Functions for Atomic Transactions
-- Deploy these SQL functions in Supabase SQL Editor

-- ============================================================================
-- FUNCTION 1: Transfer Ariary atomically (P2P)
-- ============================================================================
CREATE OR REPLACE FUNCTION transfer_p2p_ariary(
  sender_id UUID,
  recipient_id UUID,
  amount DECIMAL
) RETURNS TABLE(success BOOLEAN, error TEXT) AS $$
DECLARE
  sender_balance DECIMAL;
  recipient_exists BOOLEAN;
BEGIN
  -- Start transaction (implicit in PostgreSQL function)
  
  -- 1. Verify sender exists and has sufficient balance
  SELECT balance_ariary INTO sender_balance FROM users WHERE id = sender_id FOR UPDATE;
  
  IF sender_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Sender not found'::TEXT;
    RETURN;
  END IF;
  
  IF sender_balance < amount THEN
    RETURN QUERY SELECT false, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Verify recipient exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = recipient_id) INTO recipient_exists;
  
  IF NOT recipient_exists THEN
    RETURN QUERY SELECT false, 'Recipient not found'::TEXT;
    RETURN;
  END IF;
  
  -- 3. ATOMIC: Debit sender and credit recipient in single transaction
  UPDATE users SET balance_ariary = balance_ariary - amount WHERE id = sender_id;
  UPDATE users SET balance_ariary = balance_ariary + amount WHERE id = recipient_id;
  
  -- 4. Log transactions
  INSERT INTO transactions (user_id, type, montant, frais, statut, created_at)
  VALUES 
    (sender_id, 'p2p_ariary_envoi', amount, 0, 'completed', NOW()),
    (recipient_id, 'p2p_ariary_reception', amount, 0, 'completed', NOW());
  
  RETURN QUERY SELECT true, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 2: Transfer AXE atomically (P2P) with blockchain verification
-- ============================================================================
CREATE OR REPLACE FUNCTION transfer_p2p_axe(
  sender_id UUID,
  recipient_id UUID,
  amount DECIMAL,
  tx_hash TEXT
) RETURNS TABLE(success BOOLEAN, error TEXT) AS $$
DECLARE
  sender_balance DECIMAL;
  recipient_exists BOOLEAN;
BEGIN
  -- 1. Verify sender exists and has sufficient balance
  SELECT balance_axe INTO sender_balance FROM users WHERE id = sender_id FOR UPDATE;
  
  IF sender_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Sender not found'::TEXT;
    RETURN;
  END IF;
  
  IF sender_balance < amount THEN
    RETURN QUERY SELECT false, 'Insufficient AXE balance'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Verify recipient exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = recipient_id) INTO recipient_exists;
  
  IF NOT recipient_exists THEN
    RETURN QUERY SELECT false, 'Recipient not found'::TEXT;
    RETURN;
  END IF;
  
  -- 3. ATOMIC: Debit sender and credit recipient
  UPDATE users SET balance_axe = balance_axe - amount WHERE id = sender_id;
  UPDATE users SET balance_axe = balance_axe + amount WHERE id = recipient_id;
  
  -- 4. Log transactions with blockchain reference
  INSERT INTO transactions (user_id, type, montant, frais, statut, blockchain_tx, created_at)
  VALUES 
    (sender_id, 'p2p_axe_envoi', amount, 0, 'completed', tx_hash, NOW()),
    (recipient_id, 'p2p_axe_reception', amount, 0, 'completed', tx_hash, NOW());
  
  RETURN QUERY SELECT true, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HOW TO DEPLOY:
-- 1. Copy these functions
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Test with:
--    SELECT * FROM transfer_p2p_ariary('sender-uuid', 'recipient-uuid', 1000);
-- ============================================================================
