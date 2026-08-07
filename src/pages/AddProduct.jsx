import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, CheckCircle2, ImagePlus, X } from 'lucide-react'
import { NavBar, Skeleton } from '../components/ui'
import ImageCropModal from '../components/ImageCropModal'
import { categoryIcon } from '../utils/categoryIcon'
import { categoryColor } from '../utils/categoryColor'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import {
  fetchOrCreateBrand,
  createProduct,
  createProductVariant,
  updateProduct,
  updateProductVariant,
  fetchFeatureFlag,
  fetchAllBrands,
  fetchVariantById,
  triggerIngredientAnalysis,
} from '../lib/api/products'
import { uploadImage } from '../lib/storage'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const CATEGORIES = [
  ['energy_drink', 'Energy drink'],
  ['protein_bar', 'Protein bar'],
  ['protein_powder', 'Protein powder'],
  ['protein_shake', 'Protein shake (RTD)'],
  ['pre_workout', 'Pre-workout'],
  ['greens_powder', 'Greens powder'],
  ['supplement', 'Supplement'],
  ['snack', 'Snack'],
  ['other', 'Other'],
]

const inputStyle = {
  background: 'var(--bg-nav)',
  border: '0.5px solid var(--border-input)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  color: 'var(--text-input)',
  outline: 'none',
  width: '100%',
  ...sans,
}

const labelStyle = { fontSize: 12, color: 'var(--text-muted)', ...sans }

const STEPS = ['Basics', 'Variant', 'Nutrition']

function StepProgress({ step }) {
  const progressPct = (Math.min(step, STEPS.length - 1) / (STEPS.length - 1)) * 100
  return (
    <div style={{ position: 'relative', padding: '20px 20px 6px' }}>
      {/* Connector line spans exactly between the first and last circle's
          centers -- with N equal flex columns each circle sits at column
          center, so those centers land at (100% / N) * (i + 0.5); for the
          first/last of 3 columns that's 1/6 and 5/6 of the row's width. */}
      <div style={{ position: 'absolute', top: 34, left: 'calc(100% / 6)', right: 'calc(100% / 6)', height: 2, background: 'var(--border-subtle)', borderRadius: 1 }} />
      <div
        style={{
          position: 'absolute',
          top: 34,
          left: 'calc(100% / 6)',
          right: 'calc(100% / 6)',
          height: 2,
          borderRadius: 1,
          background: 'var(--tier-purple)',
          transform: `scaleX(${progressPct / 100})`,
          transformOrigin: 'left',
        }}
      />
      <div style={{ position: 'relative', display: 'flex' }}>
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  ...sans,
                  background: done || active ? 'var(--tier-purple)' : 'var(--bg-nav)',
                  border: `0.5px solid ${done || active ? 'var(--tier-purple)' : 'var(--border)'}`,
                  color: done || active ? '#fff' : 'var(--text-quiet)',
                }}
              >
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--text-input)' : 'var(--text-quiet)',
                  ...sans,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function NutrientField({ label, unit, value, onChange }) {
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input type="number" value={value} onChange={onChange} style={{ ...inputStyle, paddingRight: unit ? 40 : 14 }} />
        {unit && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: 'var(--text-quiet)', ...sans, pointerEvents: 'none' }}>
            {unit}
          </span>
        )}
      </div>
    </Field>
  )
}

/**
 * Custom-styled replacement for `<input list>` + `<datalist>` -- the native
 * datalist popup is rendered by the OS/browser chrome, not the page, so it
 * can't be themed at all (see the plain white-on-black system list this
 * replaced). Suggestions are filtered client-side against `options` as the
 * user types.
 */
function AutocompleteInput({ value, onChange, options, placeholder }) {
  const [focused, setFocused] = useState(false)
  const blurTimeout = useRef(null)

  const query = value.trim().toLowerCase()
  const suggestions = query ? options.filter((o) => o.toLowerCase().includes(query) && o.toLowerCase() !== query).slice(0, 8) : options.slice(0, 8)

  const handleBlur = () => {
    // Delay so a suggestion's onClick fires before the list unmounts --
    // blur happens first and would otherwise remove the button being clicked.
    blurTimeout.current = setTimeout(() => setFocused(false), 120)
  }

  useEffect(() => () => clearTimeout(blurTimeout.current), [])

  return (
    <div style={{ position: 'relative' }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={handleBlur} placeholder={placeholder} autoComplete="off" style={inputStyle} />
      {focused && suggestions.length > 0 && (
        <div
          className="stackd-elevated"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-modal)',
            border: '0.5px solid var(--border)',
            borderRadius: 12,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 20,
            padding: 6,
          }}
        >
          {suggestions.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt)
                setFocused(false)
              }}
              className="stackd-press"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderRadius: 8,
                padding: '10px 10px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-input)',
                cursor: 'pointer',
                ...sans,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StepCard({ children }) {
  return (
    <div className="stackd-elevated" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {children}
    </div>
  )
}

export default function AddProduct() {
  const { variantId } = useParams()
  const isEditing = !!variantId
  const navigate = useNavigate()
  const location = useLocation()
  const user = useCurrentUser()

  const { data: flagData, loading: flagLoading } = useAsync(() => (isEditing ? Promise.resolve({ data: null, error: null }) : fetchFeatureFlag('product_submission')), [isEditing])
  const { data: brands } = useAsync(() => fetchAllBrands(), [])
  const { data: existing, loading: existingLoading } = useAsync(() => (isEditing ? fetchVariantById(variantId) : Promise.resolve({ data: null, error: null })), [isEditing, variantId])

  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('energy_drink')
  const [description, setDescription] = useState('')
  const [flavor, setFlavor] = useState('')
  // Prefilled when arriving from Scan.jsx after a barcode didn't match any
  // existing variant -- saved so the next scan of the same product finds it.
  const [upc, setUpc] = useState(location.state?.upc || '')
  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [sugarG, setSugarG] = useState('')
  const [fiberG, setFiberG] = useState('')
  const [caffeineMg, setCaffeineMg] = useState('')
  const [sodiumMg, setSodiumMg] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageAlt, setImageAlt] = useState('')
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const fileInputRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!existing) return
    const product = existing.products
    setBrandName(product.brands?.name || product.brand_name)
    setProductName(product.name)
    setCategory(product.category)
    setDescription(product.description || '')
    setFlavor(existing.flavor || '')
    setUpc(existing.upc || '')
    setCalories(existing.calories ?? '')
    setProteinG(existing.protein_g ?? '')
    setCarbsG(existing.carbs_g ?? '')
    setFatG(existing.fat_g ?? '')
    setSugarG(existing.sugar_g ?? '')
    setFiberG(existing.fiber_g ?? '')
    setCaffeineMg(existing.caffeine_mg ?? '')
    setSodiumMg(existing.sodium_mg ?? '')
    setIngredientsText(existing.ingredients_text || '')
    if (existing.image_url) {
      setImagePreview(existing.image_url)
      setImageAlt(existing.image_alt || '')
    }
  }, [existing])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (file) setPendingImageFile(file)
  }

  const handleImageCropped = (blob) => {
    setPendingImageFile(null)
    setImageFile(blob)
    setImagePreview(URL.createObjectURL(blob))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageAlt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNext = () => {
    setError('')
    if (step === 0 && (!brandName.trim() || !productName.trim())) {
      setError('Brand and product name are required.')
      return
    }
    if (step === 1 && imagePreview && !imageAlt.trim()) {
      setError('Add a short description of the image (alt text).')
      return
    }
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    setError('')
    if (step > 0) setStep((s) => s - 1)
    else navigate(-1)
  }

  const handleSubmit = async () => {
    setError('')
    if (!brandName.trim() || !productName.trim()) {
      setError('Brand and product name are required.')
      return
    }
    if (imagePreview && !imageAlt.trim()) {
      setError('Add a short description of the image (alt text).')
      return
    }

    setSubmitting(true)

    const { data: brand, error: brandError } = await fetchOrCreateBrand(brandName)
    if (brandError) {
      setSubmitting(false)
      setError(brandError.message)
      return
    }

    if (isEditing) {
      const { data: product, error: productError } = await updateProduct(existing.product_id, {
        brandId: brand.id,
        brandName: brand.name,
        name: productName.trim(),
        category,
        description,
      })
      if (productError) {
        setSubmitting(false)
        setError(productError.message)
        return
      }

      let imageUrl = existing.image_url
      if (imageFile) {
        const path = `${user.id}/${existing.product_id}-${Date.now()}.webp`
        const { url, error: uploadError } = await uploadImage(imageFile, 'product-images', path)
        if (uploadError) {
          setSubmitting(false)
          setError('Image upload failed. Try again.')
          return
        }
        imageUrl = url
      } else if (imagePreview == null) {
        imageUrl = null
      }

      const { data: variant, error: variantError } = await updateProductVariant(variantId, {
        flavor: flavor.trim() || null,
        upc: upc.trim() || null,
        image_url: imageUrl,
        image_alt: imageUrl ? imageAlt.trim() || null : null,
        calories: calories === '' ? null : Number(calories),
        protein_g: proteinG === '' ? null : Number(proteinG),
        carbs_g: carbsG === '' ? null : Number(carbsG),
        fat_g: fatG === '' ? null : Number(fatG),
        sugar_g: sugarG === '' ? null : Number(sugarG),
        fiber_g: fiberG === '' ? null : Number(fiberG),
        caffeine_mg: caffeineMg === '' ? null : Number(caffeineMg),
        sodium_mg: sodiumMg === '' ? null : Number(sodiumMg),
        ingredients_text: ingredientsText.trim() || null,
      })
      setSubmitting(false)
      if (variantError) {
        setError(variantError.message.includes('duplicate') ? 'That barcode is already linked to another product.' : variantError.message)
        return
      }

      trackEvent('product_edit', { product_id: product.id, variant_id: variant.id })
      if (variant.ingredients_text) triggerIngredientAnalysis(variant.id)
      setDone(variant)
      return
    }

    const { data: product, error: productError } = await createProduct({
      brandId: brand.id,
      brandName: brand.name,
      name: productName.trim(),
      category,
      description,
      createdBy: user.id,
    })
    if (productError) {
      setSubmitting(false)
      setError(productError.message.includes('duplicate') ? 'This product already exists for this brand.' : productError.message)
      return
    }

    let imageUrl = null
    if (imageFile) {
      const path = `${user.id}/${product.id}-${Date.now()}.webp`
      const { url, error: uploadError } = await uploadImage(imageFile, 'product-images', path)
      if (uploadError) {
        setSubmitting(false)
        setError('Image upload failed. Try again.')
        return
      }
      imageUrl = url
    }

    const { data: variant, error: variantError } = await createProductVariant({
      product_id: product.id,
      flavor: flavor.trim() || null,
      image_url: imageUrl,
      image_alt: imageUrl ? imageAlt.trim() || null : null,
      calories: calories === '' ? null : Number(calories),
      protein_g: proteinG === '' ? null : Number(proteinG),
      carbs_g: carbsG === '' ? null : Number(carbsG),
      fat_g: fatG === '' ? null : Number(fatG),
      sugar_g: sugarG === '' ? null : Number(sugarG),
      fiber_g: fiberG === '' ? null : Number(fiberG),
      caffeine_mg: caffeineMg === '' ? null : Number(caffeineMg),
      sodium_mg: sodiumMg === '' ? null : Number(sodiumMg),
      ingredients_text: ingredientsText.trim() || null,
      created_by: user.id,
    })
    setSubmitting(false)
    if (variantError) {
      setError(variantError.message.includes('duplicate') ? 'That barcode is already linked to another product.' : variantError.message)
      return
    }

    trackEvent('product_add', { product_id: product.id, variant_id: variant.id, category })
    if (variant.ingredients_text) triggerIngredientAnalysis(variant.id)
    setDone(variant)
  }

  if (flagLoading || (isEditing && existingLoading)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title={isEditing ? 'Edit product' : 'Add a product'} onBack={() => navigate(-1)} />
        <Skeleton variant="detail" />
      </div>
    )
  }

  if (!isEditing && flagData && flagData.enabled === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Add a product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, textAlign: 'center', padding: 24, ...sans }}>
          Adding new products is temporarily turned off. Check back soon.
        </div>
      </div>
    )
  }

  if (isEditing && (!existing || existing.created_by !== user?.id || existing.products.status !== 'pending')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Edit product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, textAlign: 'center', padding: 24, ...sans }}>
          {existing && existing.products.status !== 'pending' ? "This product has already been reviewed, so it can't be edited here." : "You can only edit products you've submitted yourself."}
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title={isEditing ? 'Edit product' : 'Add a product'} onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-effect-bg)',
              border: '1px solid var(--color-effect-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={34} color="var(--color-effect)" strokeWidth={2} />
          </div>
          <div style={{ ...serif, fontWeight: 700, fontSize: 24, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{isEditing ? 'Changes saved' : 'Submitted for review'}</div>
          {!isEditing && (
            <div style={{ fontSize: 14, color: 'var(--text-body)', ...sans, lineHeight: 1.6, maxWidth: 280 }}>
              Thanks -- this product will show up in search once it's approved. Until then it's marked "Pending review" and only you can see it.
            </div>
          )}
          <button
            onClick={() => navigate(`/product/${done.id}`, { replace: true })}
            className="stackd-press"
            style={{
              marginTop: 8,
              background: 'var(--text-heading)',
              color: 'var(--bg-nav)',
              borderRadius: 20,
              padding: '13px 28px',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              ...serif,
            }}
          >
            {isEditing ? 'Back to product' : 'View product'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title={isEditing ? 'Edit product' : 'Add a product'} onBack={handleBack} />
      <StepProgress step={step} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {step === 0 && (
          <StepCard>
            <Field label="Brand">
              <AutocompleteInput value={brandName} onChange={setBrandName} options={brands?.map((b) => b.name) || []} placeholder="e.g. Celsius" />
            </Field>

            <Field label="Product name">
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Celsius Sparkling" style={inputStyle} />
            </Field>

            <Field label="Category">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(([value, label]) => {
                  const Icon = categoryIcon(value)
                  const color = categoryColor(value)
                  const on = category === value
                  return (
                    <button
                      key={value}
                      onClick={() => setCategory(value)}
                      className="stackd-press"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'left',
                        ...sans,
                        background: on ? `${color}26` : 'var(--bg-nav)',
                        border: `0.5px solid ${on ? color : 'var(--border-input)'}`,
                        color: on ? color : 'var(--text-input)',
                      }}
                    >
                      <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Description (optional)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </Field>
          </StepCard>
        )}

        {step === 1 && (
          <StepCard>
            <Field label="Flavor (optional)">
              <input value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="e.g. Peach Vibe" style={inputStyle} />
            </Field>

            <Field label="Barcode / UPC (optional)">
              <input value={upc} onChange={(e) => setUpc(e.target.value)} placeholder="e.g. 812345678901" inputMode="numeric" style={inputStyle} />
            </Field>

            <Field label="Photo (optional)">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              {imagePreview ? (
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', background: 'var(--bg-nav)', border: '0.5px solid var(--border-input)', borderRadius: 12, padding: 16 }}>
                  <img src={imagePreview} alt="" style={{ height: 96, borderRadius: 8, objectFit: 'contain' }} />
                  <button
                    onClick={handleRemoveImage}
                    className="stackd-press"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--bg-subtle)',
                      border: '0.5px solid var(--border)',
                      color: 'var(--tier-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} strokeWidth={2.25} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="stackd-press"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'var(--bg-nav)',
                    border: '1.5px dashed var(--border-strong)',
                    borderRadius: 12,
                    padding: '22px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-quiet)',
                    cursor: 'pointer',
                    ...sans,
                  }}
                >
                  <ImagePlus size={22} strokeWidth={1.75} />
                  Tap to choose a photo
                </button>
              )}
            </Field>

            {imagePreview && (
              <Field label="Describe the photo (required for accessibility)">
                <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="e.g. Can of Celsius Peach Vibe" style={inputStyle} />
              </Field>
            )}
          </StepCard>
        )}

        {step === 2 && (
          <StepCard>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <NutrientField label="Calories (optional)" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <NutrientField label="Protein (optional)" unit="g" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <NutrientField label="Carbs (optional)" unit="g" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <NutrientField label="Fat (optional)" unit="g" value={fatG} onChange={(e) => setFatG(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <NutrientField label="Sugar (optional)" unit="g" value={sugarG} onChange={(e) => setSugarG(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <NutrientField label="Fiber (optional)" unit="g" value={fiberG} onChange={(e) => setFiberG(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <NutrientField label="Caffeine (optional)" unit="mg" value={caffeineMg} onChange={(e) => setCaffeineMg(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <NutrientField label="Sodium (optional)" unit="mg" value={sodiumMg} onChange={(e) => setSodiumMg(e.target.value)} />
              </div>
            </div>

            <Field label="Ingredients (optional)">
              <textarea value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 84 }} />
            </Field>
          </StepCard>
        )}

        {error && <div style={{ fontSize: 13, color: 'var(--tier-red)', ...sans }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 20 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'none',
                border: '0.5px solid var(--border-strong)',
                color: 'var(--text-input)',
                borderRadius: 20,
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                ...sans,
              }}
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'var(--text-heading)',
                color: 'var(--bg-nav)',
                borderRadius: 20,
                padding: '14px 0',
                fontSize: 16,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                ...serif,
                letterSpacing: '-0.01em',
              }}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: 'var(--text-heading)',
                color: 'var(--bg-nav)',
                borderRadius: 20,
                padding: '14px 0',
                fontSize: 16,
                fontWeight: 700,
                border: 'none',
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                ...serif,
                letterSpacing: '-0.01em',
              }}
            >
              {submitting ? 'Please wait...' : isEditing ? 'Save changes' : 'Submit for review'}
              {!submitting && <CheckCircle2 size={17} />}
            </button>
          )}
        </div>
      </div>

      {pendingImageFile && <ImageCropModal file={pendingImageFile} onCancel={() => setPendingImageFile(null)} onCropped={handleImageCropped} />}
    </div>
  )
}
