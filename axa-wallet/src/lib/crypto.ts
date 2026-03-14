// 🔐 Encryption utility for sensitive data (private keys)
// Uses SubtleCrypto (Web Crypto API) for secure encryption
// ✅ No external dependencies, built-in browser support

/**
 * Derive encryption key from password using PBKDF2
 * Safe for storing encrypted private keys
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a private key with password-derived key
 * Returns base64-encoded: salt + iv + ciphertext + authTag
 */
export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const key = await deriveKey(password, salt)
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(privateKey)
    )

    // Combine: salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...combined))
  } catch (err) {
    console.error('❌ Encryption error:', err)
    throw new Error('Failed to encrypt private key')
  }
}

/**
 * Decrypt a private key with password-derived key
 */
export async function decryptPrivateKey(encryptedData: string, password: string): Promise<string> {
  try {
    const binaryString = atob(encryptedData)
    const combined = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i)
    }

    // Extract components
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const ciphertext = combined.slice(28)

    const key = await deriveKey(password, salt)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (err) {
    console.error('❌ Decryption error:', err)
    throw new Error('Failed to decrypt private key - wrong password or corrupted data')
  }
}

/**
 * Security Architecture:
 * 
 * 1. User's password is never sent to server in plaintext (HTTPS + bcrypt on server)
 * 2. Private keys are encrypted on client with password-derived key
 * 3. Only encrypted keys are stored in database
 * 4. Even with database breach, private keys remain encrypted
 * 5. User must provide password to decrypt private keys locally
 * 
 * Flow:
 * - SignUp: Generate wallet → encrypt private key with password → store encrypted
 * - SignIn: User enters password → decrypt private keys for local operations
 * - Transaction: Use decrypted key locally, never send to server
 */

export const CryptoUtils = {
  encryptPrivateKey,
  decryptPrivateKey,
}
