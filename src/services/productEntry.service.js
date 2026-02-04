import { db } from '../db'
import { getNextSKU } from '../utils/skuGenerator'

/**
 * @param {Object} input
 * @param {number} input.categoryId
 * @param {number} [input.subcategoryId]
 * @param {Object} input.attributes
 * @param {Object} input.pricing
 * @param {number} input.pricing.mrp
 * @param {number} input.pricing.defaultSellingPrice
 * @param {number} input.pricing.maxDiscountPercent
 * @param {number} input.supplierId
 * @param {number} input.purchasePrice
 * @param {number} input.quantity
 * @returns {Promise<{ variantId: number, skuList: string[] }>}
 */
export async function saveProductEntry(input) {
  const {
    categoryId,
    subcategoryId,
    attributes,
    pricing,
    supplierId,
    purchasePrice,
    quantity,
  } = input

  const effectiveCategoryId = subcategoryId ?? categoryId
  const n = Math.max(0, Number(quantity) || 0)
  const skuPrefix = 'CAT'

  const skuList = []
  for (let i = 0; i < n; i++) {
    const sku = await getNextSKU(skuPrefix)
    skuList.push(sku)
  }

  return db.transaction('rw', db.products, db.product_variants, db.sync_log, async () => {
    const productIds = []
    for (const sku of skuList) {
      const id = await db.products.add({
        sku,
        supplier_id: supplierId,
        status: 'active',
        category_id: effectiveCategoryId,
        purchasePrice,
      })
      productIds.push(id)
    }

    const firstProductId = productIds[0]
    const variantId = await db.product_variants.add({
      sku: skuList[0] ?? null,
      variant_id: null,
      product_id: firstProductId,
      categoryId,
      subcategoryId,
      attributes: attributes ?? {},
      mrp: pricing?.mrp,
      defaultSellingPrice: pricing?.defaultSellingPrice,
      maxDiscountPercent: pricing?.maxDiscountPercent,
    })

    await db.product_variants.update(variantId, { variant_id: variantId })

    const now = new Date().toISOString()
    await db.sync_log.add({
      entity_type: 'product_variant',
      status: 'pending',
      synced_at: now,
    })
    for (let i = 0; i < productIds.length; i++) {
      await db.sync_log.add({
        entity_type: 'product',
        status: 'pending',
        synced_at: now,
      })
    }

    return { variantId, skuList }
  })
}
