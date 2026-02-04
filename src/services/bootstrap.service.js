import { db } from '../db'

// const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const CONFIG_PATH = '/config'
console.log('[bootstrap] ENV =', import.meta.env)
function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

function normalizeCategory(c, parentId = null) {
  return {
    ...c,
    parent_id: c.parent_id ?? parentId ?? null,
  }
}

/** Flatten nested categories (with children) into a list with parent_id set. */
function flattenCategories(items, parentId = null) {
  const out = []
  for (const c of items) {
    const node = normalizeCategory({ ...c, parent_id: c.parent_id ?? parentId })
    const { children, ...rest } = node
    out.push(rest)
    if (Array.isArray(children) && children.length > 0) {
      out.push(...flattenCategories(children, node.id))
    }
  }
  return out
}

async function syncCategories(API_BASE_URL) {
  const url = `${API_BASE_URL}${CONFIG_PATH}/categories`;
  console.log('[bootstrap] Fetching categories:', url);

  const data = await fetchJson(url);
  const raw = Array.isArray(data) ? data : data?.data ?? data?.categories ?? [];
  const list = flattenCategories(raw);

  await db.categories.clear();
  if (list.length) {
    await db.categories.bulkPut(list);
  }

  console.log('[bootstrap] Stored categories:', list.length);
}

async function syncSuppliers(API_BASE_URL) {
  const url = `${API_BASE_URL}${CONFIG_PATH}/suppliers`;
  console.log('[bootstrap] Fetching suppliers:', url);

  const data = await fetchJson(url);
  const raw = Array.isArray(data) ? data : data?.data ?? data?.suppliers ?? [];

  const list = raw.map((s) => ({
    id: s.id,
    name: s.name ?? '',
    code: s.code ?? null,
  }));

  await db.suppliers.clear();
  if (list.length) {
    await db.suppliers.bulkPut(list);
  }

  console.log('[bootstrap] Stored suppliers:', list.length);
}


/**
 * Fetches categories and suppliers from the backend and stores them in IndexedDB.
 * - GET /config/categories (and /config/subcategories)
 * - GET /config/suppliers
 * Runs on app startup. No-op when offline; existing IndexedDB data remains.
 */
// export async function bootstrap() {
//   if (!isOnline()) {
//     console.log('[bootstrap] Skipped (offline)')
//     return
//   }
//   if (!API_BASE_URL) {
//     console.log('[bootstrap] Skipped (no API_BASE_URL)')
//     return
//   }
//   try {
//     await Promise.all([syncCategories(), syncSuppliers()])
//     console.log('[bootstrap] Sync complete')
//   } catch (err) {
//     console.warn('[bootstrap] Failed to sync config:', err.message)
//   }
// }
export async function bootstrap() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  console.log('[bootstrap] API_BASE_URL =', API_BASE_URL);

  if (!API_BASE_URL) {
    console.log('[bootstrap] Skipped (no API_BASE_URL)');
    return;
  }

  if (!isOnline()) {
    console.log('[bootstrap] Skipped (offline)');
    return;
  }

  try {
    await Promise.all([
      syncCategories(API_BASE_URL),
      syncSuppliers(API_BASE_URL),
    ]);
    console.log('[bootstrap] Sync complete');
  } catch (err) {
    console.warn('[bootstrap] Failed to sync config:', err.message);
  }
}
