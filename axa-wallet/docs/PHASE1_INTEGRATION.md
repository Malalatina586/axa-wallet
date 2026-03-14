# 🔐 PHASE 1 - SECURITY CRITICAL FIXES
## Integration Guide

---

## ✅ What Was Fixed

### 1️⃣ API Keys Not Exposed
- **Before**: Supabase keys hardcoded in `supabase.ts`
- **After**: Keys in `.env.local` (never committed to git)
- **File**: `.env.local` (add to `.gitignore`!)

### 2️⃣ Private Keys Encrypted
- **Before**: Wallet private keys stored as plaintext in DB
- **After**: Encrypted with AES-256-GCM using PBKDF2 key derivation
- **Files**: `src/lib/crypto.ts`
- **Security**: Even if DB compromised, keys remain encrypted

### 3️⃣ Atomic P2P Transactions
- **Before**: Two separate SQL updates (could fail partially)
- **After**: Single database transaction (all or nothing)
- **Files**: `src/lib/atomic-transactions.ts` + SQL RPC functions
- **Security**: Prevents: sender debited → receiver not credited

### 4️⃣ Blockchain Verification
- **Before**: AXE transfers assumed successful without verification
- **After**: Wait for 2 blockchain confirmations before DB update
- **Files**: `src/lib/blockchain-verification.ts`
- **Security**: Prevents: user debited → on-chain transfer fails

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Setup Environment Variables

```bash
# .env.local (create this file - NEVER commit it!)
VITE_SUPABASE_URL=https://bozaertrmldtacnkfvan.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Add to `.gitignore`:**
```
.env.local
.env.*.local
```

### Step 2: Deploy RPC Functions to Supabase

1. Go to: **Supabase Dashboard → SQL Editor**
2. Copy content from: `docs/SQL_RPC_FUNCTIONS.sql`
3. Paste and run each function
4. Verify:
   ```sql
   SELECT * FROM transfer_p2p_ariary(
     'sender-uuid', 
     'recipient-uuid', 
     1000
   );
   ```

### Step 3: Integrate Crypto into AuthContext

In `src/contexts/AuthContext.tsx`, when creating new user:

```typescript
import { encryptPrivateKey } from '../lib/crypto'

// When signup completes and wallet is generated:
const encryptedKey = await encryptPrivateKey(privateKey, userPassword)

// Store encrypted key in database:
await supabase.from('users').update({
  wallet_private_key: encryptedKey // Now encrypted!
}).eq('id', user.id)
```

### Step 4: Decrypt Private Keys When Needed

In `WalletContext.tsx`, when user performs blockchain transaction:

```typescript
import { decryptPrivateKey } from '../lib/crypto'

// After user authentication:
const decryptedKey = await decryptPrivateKey(encryptedPrivateKey, userPassword)

// Use decrypted key for signing (never send to server!)
// Key is only in memory, never stored plaintext
```

### Step 5: Use Atomic Transactions for P2P

Update `WalletContext.tsx`:

```typescript
import { atomicTransferP2PAriary, validateP2PTransfer } from '../lib/atomic-transactions'

async function sendP2PAriary(recipientUID: string, montantAriary: number) {
  // Pre-check
  const valid = await validateP2PTransfer(
    session.user.id,
    recipientUID,
    montantAriary,
    'ariary'
  )
  
  if (!valid.valid) {
    return { error: valid.error }
  }
  
  // Atomic transfer (uses RPC function)
  return await atomicTransferP2PAriary(
    session.user.id,
    recipientUID,
    montantAriary
  )
}
```

### Step 6: Use Blockchain Verification for AXE Transfers

In `WalletContext.tsx`:

```typescript
import { sendVerifiedAXETransfer } from '../lib/blockchain-verification'

async function sendAXE(recipientAddress: string, amountAXE: number) {
  // 1. Decrypt private key
  const privateKey = await decryptPrivateKey(encryptedPK, userPassword)
  
  // 2. Create signer
  const signer = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl))
  
  // 3. Send with blockchain verification
  const result = await sendVerifiedAXETransfer(
    signer,
    AXE_TOKENADDRESS,
    recipientAddress,
    ethers.parseEther(amountAXE.toString()),
    (status) => console.log(status) // Show progress to user
  )
  
  if (result.success && result.txHash) {
    // Database will be updated by RPC function
    // (which was called atomically after blockchain confirmation)
  }
}
```

---

## ⚙️ Migration Guide (If Existing Users)

For users who already have plaintext private keys:

```sql
-- Run once to encrypt all existing keys
UPDATE users 
SET wallet_private_key = encrypt_key(wallet_private_key, user_password)
WHERE wallet_private_key IS NOT NULL 
  AND wallet_private_key NOT LIKE '[ENCRYPTED]%';
```

---

## 🧪 Testing

### Test P2P Atomic Transfer:
```typescript
const result = await atomicTransferP2PAriary(
  'sender-uuid',
  'recipient-uuid',
  5000
)
console.assert(result.success === true, 'Transfer should succeed')
```

### Test Blockchain Verification:
```typescript
const result = await verifyBlockchainTransaction(
  '0x123abc...'
)
console.assert(result.verified === true, 'TxHash should verify')
```

### Test Encryption:
```typescript
const encrypted = await encryptPrivateKey('0x123abc...', 'password123')
const decrypted = await decryptPrivateKey(encrypted, 'password123')
console.assert(decrypted === '0x123abc...', 'Encryption should be symmetrical')
```

---

## 📊 Security Checklist

- ✅ API keys not in source code
- ✅ Private keys encrypted at rest
- ✅ Private keys only decrypted on client-side
- ✅ P2P transactions atomic (no partial updates)
- ✅ Blockchain transfers verified before DB update
- ✅ No transaction without confirmation
- ✅ All sensitive operations logged

---

## 🚨 Important Notes

1. **`.env.local` MUST be in `.gitignore`**
   - Never commit environment variables
   - Each environment (dev/staging/prod) has its own `.env.local`

2. **Private Key Decryption**
   - Only happens when user explicitly authorizes
   - Key stays in browser memory, never sent to server
   - Lost if user forgets password (no recovery!)

3. **Database Backup**
   - Encrypted private keys are safe if DB is backed up
   - But keep password-recovery mechanism!

4. **Blockchain Confirmations**
   - Waiting for 2 confirmations = ~30 seconds average
   - Show progress to user!
   - If user closes browser, check `blockchain_tx` table for tx status

---

## 📝 Next Steps (PHASE 2)

- [ ] Load fees from database (not hardcoded)
- [ ] Real exchange rate API integration
- [ ] Admin approval workflow UI
- [ ] Theme persistence (localStorage)
- [ ] Real-time notifications (Supabase subscriptions)

