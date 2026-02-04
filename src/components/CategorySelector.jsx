import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import './CategorySelector.css'

function safeSelectValue(v) {
  if (v == null || v === '') return ''
  if (typeof v === 'number' && Number.isNaN(v)) return ''
  return String(v)
}

function CategorySelector({ value, onChange }) {
  const [categories, setCategories] = useState([])
  const categoryId = safeSelectValue(value?.categoryId)
  const subcategoryId = safeSelectValue(value?.subcategoryId)

  const loadCategories = useCallback(() => {
    db.categories.toArray().then((list) => setCategories(list))
  }, [])

  useEffect(() => {
    loadCategories()
    const t = setTimeout(loadCategories, 500)
    return () => clearTimeout(t)
  }, [loadCategories])

  const topLevel = categories.filter(
    (c) => c.parent_id == null || c.parent_id === 0 || c.parent_id === ''
  )
  const subcategories = categories.filter(
    (c) => c.parent_id != null && String(c.parent_id) === String(categoryId)
  )

  const handleCategoryChange = (e) => {
    const next = e.target.value ?? ''
    onChange?.({ categoryId: next, subcategoryId: '' })
  }

  const handleSubcategoryChange = (e) => {
    const next = e.target.value ?? ''
    onChange?.({ categoryId, subcategoryId: next })
  }

  return (
    <div className="category-selector">
      <div className="category-selector__field">
        <label className="category-selector__label">Category</label>
        <select
          className="category-selector__select"
          value={categoryId}
          onChange={handleCategoryChange}
          aria-label="Category"
        >
          <option value="">Select category</option>
          {topLevel.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {topLevel.length > 0 && (
        <div className="category-selector__field">
          <label className="category-selector__label">Subcategory</label>
          <select
            className="category-selector__select"
            value={subcategoryId}
            onChange={handleSubcategoryChange}
            aria-label="Subcategory"
            disabled={!categoryId}
          >
            <option value="">Select subcategory</option>
            {subcategories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export default CategorySelector
