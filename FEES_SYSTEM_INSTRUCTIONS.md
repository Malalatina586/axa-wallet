# 🚀 FEES SYSTEM MIGRATION - Instructions

## What's New

This migration implements a complete **AXE-based fee system** where:
1. ✅ All transaction fees are in **AXE** (creates utility for native token)
2. ✅ Fees are **automatically collected** to admin wallet
3. ✅ All fees are **tracked** in `fees_collected` table
4. ✅ Dashboard shows **real-time fee statistics**

## Changes Made

### 1. New Table: `fees_collected`
```sql
- id: Auto-increment ID
- user_id: Who paid the fee
- transaction_type: 'p2p_ariary', 'p2p_axe', 'p2p_usdt', 'depot', 'retrait', 'conversion'
- amount_axe: Fee amount in AXE
- tx_hash: Blockchain transaction hash (for AXE/USDT)
- created_at: Timestamp
```

### 2. New Config Columns
- `fee_percentage`: % fee to charge (default 1%)
- `fee_wallet_address`: Admin wallet to receive fees (0x...)
- `total_fees_collected`: Running total of all fees

### 3. Updated RPC Functions
All RPC functions now:
- ✅ Calculate fee in AXE
- ✅ Check user has AXE for fee
- ✅ Debit fee from user AXE
- ✅ Debit transaction amount from appropriate balance
- ✅ Credit recipient balance
- ✅ Record fee in `fees_collected` table
- ✅ Update `config.total_fees_collected`

**Updated Functions:**
- `transfer_p2p_ariary()` - P2P Ariary with AXE fee
- `transfer_p2p_axe()` - P2P AXE with AXE fee
- `transfer_p2p_usdt()` - P2P USDT with AXE fee

**New Functions:**
- `record_fee()` - Helper to record fee collection
- `calculate_axe_fee()` - Calculate fee amount
- `get_fees_summary()` - Get fee statistics for dashboard

## ⚙️ How to Apply

### Step 1: In Supabase Dashboard
1. Go to **SQL Editor**
2. Create new query
3. Copy entire contents from `FEES_SYSTEM_MIGRATION.sql`
4. Click **Run**
5. Wait for success ✓

### Step 2: Verify Tables Created
1. Go to **Table Editor**
2. Verify `fees_collected` table exists
3. Verify `config` table has new columns:
   - `fee_percentage`
   - `fee_wallet_address`
   - `total_fees_collected`

### Step 3: Configure Admin Settings
Via backoffice **Config Frais**:
1. Set `fee_wallet_address` = Your AXE wallet (0x...)
2. Set `fee_percentage` = 1 (percent)
3. Save

## 💰 How Fees Work Now

### Example 1: P2P Ariary with 2% fee
```
User sends: 50,000 Ariary
Fee: 50,000 * 1% / 1000 = 0.5 AXE
User is debited: 50,000 Ariary + 0.5 AXE
Recipient gets: 50,000 Ariary
Admin gets: 0.5 AXE (tracked in fees_collected)
```

### Example 2: P2P AXE with 1% fee
```
User sends: 100 AXE
Fee: 100 * 1% = 1 AXE
User is debited: 101 AXE total
Recipient gets: 100 AXE
Admin gets: 1 AXE (tracked in fees_collected)
```

### Example 3: P2P USDT with 1% fee
```
User sends: 50 USDT
Fee: 50 * 1% * 0.045 = 0.0225 AXE
User is debited: 50 USDT + 0.0225 AXE
Recipient gets: 50 USDT
Admin gets: 0.0225 AXE (tracked in fees_collected)
```

## 📊 Dashboard Stats

The Admin Dashboard will now show:
```
💰 Total Fees Collected (All Time): 145.75 AXE
📈 Fees Today: 12.5 AXE
📅 Fees This Month: 145.75 AXE

By Type:
- P2P Ariary: 45.25 AXE
- P2P AXE: 78.50 AXE
- P2P USDT: 22.00 AXE
```

## ✅ What's Still Needed

1. ✅ Migration SQL (done - in FEES_SYSTEM_MIGRATION.sql)
2. ⏳ Update WalletContext.tsx to handle fee requirement
3. ⏳ Add Fees widget to backoffice Dashboard
4. ⏳ Test with E2E scenarios

## 🔄 Test Verified

Once you apply this migration, you can test:
1. User sends P2P AXE to another user
2. Check `fees_collected` table - fee recorded ✓
3. Check `config.total_fees_collected` - updated ✓
4. Backoffice dashboard shows fee stats ✓

---

**Ready to apply?** Just copy-paste the SQL and run it in Supabase! 🚀
