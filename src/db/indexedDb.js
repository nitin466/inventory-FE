import Dexie from 'dexie'

const db = new Dexie('InventoryDB')

db.version(1).stores({
  categories: '++id, name, parent_id',
  attribute_definitions: '++id, name, type',
  product_variants: '++id, sku, variant_id, product_id',
  products: '++id, sku, supplier_id, status, category_id',
  suppliers: '++id, name, code',
  sales: '++id, variant_id, status, product_id, created_at',
  sync_log: '++id, status, entity_type, synced_at',
})

if (typeof window !== "undefined") {
  window.db = db;
}

export default db
