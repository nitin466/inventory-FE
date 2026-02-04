import { db } from '../db'

const STORAGE_KEY_PREFIX = 'sku_seq'
const SEQ_LENGTH = 6
const MAX_ATTEMPTS = 10000

function storageKey(prefix, year) {
  return `${STORAGE_KEY_PREFIX}_${prefix}_${year}`
}

function getLastNumber(prefix, year) {
  try {
    const key = storageKey(prefix, year)
    const raw = localStorage.getItem(key)
    return raw !== null ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

function setLastNumber(prefix, year, num) {
  try {
    localStorage.setItem(storageKey(prefix, year), String(num))
  } catch (e) {
    console.warn('[skuGenerator] Failed to persist last number:', e)
  }
}

function padSequence(num) {
  return String(num).padStart(SEQ_LENGTH, '0')
}

export function formatSKU(prefix, year, sequence) {
  return `${prefix}-${year}-${padSequence(sequence)}`
}

async function skuExists(sku) {
  const [inProducts, inVariants] = await Promise.all([
    db.products.where('sku').equals(sku).count(),
    db.product_variants.where('sku').equals(sku).count(),
  ])
  return inProducts > 0 || inVariants > 0
}

/**
 * Generates the next unique SKU in format PREFIX-YYYY-XXXXXX.
 * Uses localStorage to persist the last sequence number per prefix/year.
 * Ensures uniqueness against products and product_variants in IndexedDB.
 *
 * @param {string} [prefix='CAT'] - Category or prefix (e.g. 'CAT', 'WIDGET')
 * @returns {Promise<string>} Next unique SKU, e.g. 'CAT-2025-000001'
 */
export async function getNextSKU(prefix = 'CAT') {
  const normalized = String(prefix).toUpperCase().replace(/\s+/g, '-') || 'CAT'
  const year = new Date().getFullYear()

  let last = getLastNumber(normalized, year)
  let attempts = 0

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1
    last += 1
    const sku = formatSKU(normalized, year, last)

    const exists = await skuExists(sku)
    if (!exists) {
      setLastNumber(normalized, year, last)
      return sku
    }
  }

  throw new Error(
    `[skuGenerator] Could not generate unique SKU after ${MAX_ATTEMPTS} attempts`
  )
}
