-- Add missing columns to config table for backoffice configuration

-- Add fee_p2p if it doesn't exist
ALTER TABLE config
ADD COLUMN IF NOT EXISTS fee_p2p NUMERIC(5,2) DEFAULT 1;

-- Add wallet_admin_fee if it doesn't exist
ALTER TABLE config
ADD COLUMN IF NOT EXISTS wallet_admin_fee TEXT DEFAULT '';

-- Add mvola_admin if it doesn't exist
ALTER TABLE config
ADD COLUMN IF NOT EXISTS mvola_admin TEXT DEFAULT '';

-- Update RLS policies if needed
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create or update policy for admin access
CREATE POLICY "Allow admin to select config" ON config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin to update config" ON config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow admin to insert config" ON config
FOR INSERT
TO authenticated
WITH CHECK (true);
