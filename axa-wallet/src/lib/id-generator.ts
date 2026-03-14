/**
 * 🆔 Generate stylized display IDs for users and transactions
 */

/**
 * Generate stylized user ID
 * Format: 4-digit + "AXE" + 4-digit
 * Example: "1548AXE5789"
 */
export function generateUserDisplayID(): string {
  const nums1 = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  const nums2 = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${nums1}AXE${nums2}`
}

/**
 * Generate stylized transaction ID
 * Format: "TX" + 5-digit + 3-digit
 * Example: "TX123459876"
 */
export function generateTransactionDisplayID(): string {
  const nums1 = Math.floor(Math.random() * 99999).toString().padStart(5, '0')
  const nums2 = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `TX${nums1}${nums2}`
}

/**
 * Ensure ID is unique (retry if collision - rare but safe)
 * @param checkFn Function to check if ID exists in DB
 * @param generateFn Function to generate new ID
 * @returns Unique ID
 */
export async function ensureUniqueID(
  checkFn: (id: string) => Promise<boolean>,
  generateFn: () => string,
  maxRetries: number = 5
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const id = generateFn()
    const exists = await checkFn(id)
    if (!exists) return id
  }
  throw new Error('Failed to generate unique ID after max retries')
}
