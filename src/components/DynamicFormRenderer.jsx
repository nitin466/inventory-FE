import { useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import './DynamicFormRenderer.css'

const DATA_TYPES = {
  string: 'string',
  number: 'number',
  decimal: 'decimal',
  boolean: 'boolean',
  enum: 'enum',
}

function getDataType(def) {
  return def.dataType ?? def.data_type ?? def.type ?? 'string'
}

function getInitialValue(dataType) {
  switch (dataType) {
    case DATA_TYPES.boolean:
      return false
    case DATA_TYPES.number:
    case DATA_TYPES.decimal:
    case DATA_TYPES.enum:
      return ''
    default:
      return ''
  }
}

function toInputValue(raw, dataType) {
  if (raw === '' || raw == null || raw === undefined) return ''
  if (dataType === DATA_TYPES.boolean) return raw
  return String(raw)
}

function parseValue(dataType, raw) {
  if (raw === '' || raw == null) return null
  switch (dataType) {
    case DATA_TYPES.boolean:
      return Boolean(raw)
    case DATA_TYPES.number:
      return Number.isInteger(Number(raw)) ? Number(raw) : null
    case DATA_TYPES.decimal:
      return Number(raw)
    case DATA_TYPES.enum:
    default:
      return String(raw)
  }
}

function getRequiredError(def, value) {
  if (def.required !== true) return null
  if (value === '' || value === null || value === undefined) {
    return `${def.label ?? def.name} is required`
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${def.label ?? def.name} is required`
  }
  return null
}

const DynamicFormRenderer = forwardRef(function DynamicFormRenderer(
  {
    attributeDefinitions = [],
    value = null,
    onChange,
    ...rest
  },
  ref
) {
  const initialValues = useMemo(() => {
    const next = {}
    attributeDefinitions.forEach((def) => {
      const key = def.name ?? def.id
      if (key == null) return
      const existing = value && value[key]
      const dataType = getDataType(def)
      next[key] =
        existing !== undefined && existing !== null
          ? existing
          : getInitialValue(dataType)
    })
    return next
  }, [attributeDefinitions])

  const [values, setValues] = useState(initialValues)

  const buildAttributesJson = useCallback(
    (vals) => {
      const attributes_json = {}
      attributeDefinitions.forEach((def) => {
        const key = def.name ?? def.id
        if (key == null) return
        const dataType = getDataType(def)
        const raw = vals[key]
        const parsed = parseValue(dataType, raw)
        if (parsed !== null && parsed !== '') {
          attributes_json[key] = parsed
        }
      })
      return attributes_json
    },
    [attributeDefinitions]
  )

  const getValidationResult = useCallback(
    (vals) => {
      const errors = []
      attributeDefinitions.forEach((def) => {
        const key = def.name ?? def.id
        if (key == null) return
        const dataType = getDataType(def)
        const raw = vals[key]
        const parsed = parseValue(dataType, raw)
        const msg = getRequiredError(def, parsed ?? raw)
        if (msg) errors.push(msg)
      })
      return { valid: errors.length === 0, errors }
    },
    [attributeDefinitions]
  )

  const notifyChange = useCallback(
    (vals) => {
      setValues(vals)
      const attributes_json = buildAttributesJson(vals)
      const { valid, errors } = getValidationResult(vals)
      // Defer parent update to avoid setState-during-render (updating ProductEntryPage while rendering this component)
      queueMicrotask(() => {
        onChange?.(attributes_json, { valid, errors })
      })
    },
    [onChange, buildAttributesJson, getValidationResult]
  )

  const handleChange = useCallback(
    (key, dataType, e) => {
      const raw =
        dataType === DATA_TYPES.boolean
          ? e.target.checked
          : (e.target.value ?? '')
      const next = { ...values, [key]: raw }
      setValues(next)
      notifyChange(next)
    },
    [notifyChange, values]
  )

  const validate = useCallback(() => {
    const { valid } = getValidationResult(values)
    return valid
  }, [getValidationResult, values])

  const getAttributesJson = useCallback(
    () => {
      const attributes_json = buildAttributesJson(values)
      const { valid, errors } = getValidationResult(values)
      return { attributes_json, valid, errors }
    },
    [buildAttributesJson, getValidationResult, values]
  )

  useImperativeHandle(ref, () => ({
    validate,
    getAttributesJson,
    getValidationResult: () => getValidationResult(values),
  }), [validate, getAttributesJson, getValidationResult, values])

  const renderInput = (def) => {
    const key = def.name ?? def.id
    if (key == null) return null
    const dataType = getDataType(def)
    const label = def.label ?? def.name ?? String(key)
    const raw = values[key] ?? getInitialValue(dataType)
    const valueStr = toInputValue(raw, dataType)

    if (dataType === DATA_TYPES.boolean) {
      return (
        <label key={key} className="dyn-form__field dyn-form__field--checkbox">
          <input
            type="checkbox"
            checked={Boolean(raw)}
            onChange={(e) => handleChange(key, dataType, e)}
            aria-required={def.required === true}
          />
          <span className="dyn-form__label">{label}</span>
          {def.required && <span className="dyn-form__required">*</span>}
        </label>
      )
    }

    if (dataType === DATA_TYPES.enum && Array.isArray(def.enumValues)) {
      return (
        <div key={key} className="dyn-form__field">
          <label className="dyn-form__label">
            {label}
            {def.required && <span className="dyn-form__required">*</span>}
          </label>
          <select
            className="dyn-form__select"
            value={valueStr}
            onChange={(e) => handleChange(key, dataType, e)}
            required={def.required === true}
            aria-required={def.required === true}
          >
            <option value="">Select...</option>
            {def.enumValues.map((opt) => {
              const optValue =
                typeof opt === 'object' && opt != null
                  ? (opt.value ?? opt.id ?? String(opt.label ?? opt.name ?? ''))
                  : String(opt)
              const optLabel =
                typeof opt === 'object' && opt != null
                  ? String(opt.label ?? opt.name ?? optValue)
                  : String(opt)
              return (
                <option key={optValue} value={optValue}>
                  {optLabel}
                </option>
              )
            })}
          </select>
        </div>
      )
    }

    if (dataType === DATA_TYPES.number) {
      return (
        <div key={key} className="dyn-form__field">
          <label className="dyn-form__label">
            {label}
            {def.required && <span className="dyn-form__required">*</span>}
          </label>
          <input
            type="number"
            step="1"
            value={valueStr}
            onChange={(e) => handleChange(key, dataType, e)}
            required={def.required === true}
            aria-required={def.required === true}
          />
        </div>
      )
    }

    if (dataType === DATA_TYPES.decimal) {
      return (
        <div key={key} className="dyn-form__field">
          <label className="dyn-form__label">
            {label}
            {def.required && <span className="dyn-form__required">*</span>}
          </label>
          <input
            type="number"
            step="any"
            value={valueStr}
            onChange={(e) => handleChange(key, dataType, e)}
            required={def.required === true}
            aria-required={def.required === true}
          />
        </div>
      )
    }

    return (
      <div key={key} className="dyn-form__field">
        <label className="dyn-form__label">
          {label}
          {def.required && <span className="dyn-form__required">*</span>}
        </label>
        <input
          type="text"
          value={valueStr}
          onChange={(e) => handleChange(key, dataType, e)}
          required={def.required === true}
          aria-required={def.required === true}
        />
      </div>
    )
  }

  return (
    <form
      className="dyn-form"
      onSubmit={(e) => e.preventDefault()}
      noValidate
      {...rest}
    >
      {attributeDefinitions.map(renderInput)}
    </form>
  )
})

export default DynamicFormRenderer
export { DynamicFormRenderer }
