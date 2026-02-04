/**
 * Calculates discount percentage from MRP and final price.
 *
 * @param {number} mrp - Maximum retail price (original price)
 * @param {number} finalPrice - Price after discount
 * @returns {number} Discount percentage 0–100, rounded to 2 decimals. Returns 0 for invalid inputs.
 */
export function getDiscountPercentage(mrp, finalPrice) {
  const m = Number(mrp)
  const f = Number(finalPrice)

  if (Number.isNaN(m) || Number.isNaN(f)) {
    return 0
  }
  if (m <= 0) {
    return 0
  }
  if (f >= m) {
    return 0
  }
  if (f < 0) {
    return 100
  }

  const pct = ((m - f) / m) * 100
  return Math.round(pct * 100) / 100
}
