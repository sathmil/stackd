import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchOrCreateBrand, createProduct, createProductVariant, updateProduct, updateProductVariant, fetchFeatureFlag, fetchAllBrands, fetchVariantById } from '../lib/api/products'
import { compressImage, uploadImage } from '../lib/storage'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const CATEGORIES = [
  ['energy_drink', 'Energy drink'],
  ['protein_bar', 'Protein bar'],
  ['protein_powder', 'Protein powder'],
  ['pre_workout', 'Pre-workout'],
  ['greens_powder', 'Greens powder'],
  ['supplement', 'Supplement'],
  ['snack', 'Snack'],
  ['other', 'Other'],
]

const inputStyle = {
  background: '#1a1a1a',
  border: '0.5px solid #252525',
  borderRadius: 8,
  padding: '11px 13px',
  fontSize: 14,
  color: '#ccc',
  outline: 'none',
  width: '100%',
  ...sans,
}

const labelStyle = { fontSize: 11, color: '#555', ...sans }

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function AddProduct() {
  const { variantId } = useParams()
  const isEditing = !!variantId
  const navigate = useNavigate()
  const user = useCurrentUser()

  const { data: flagData, loading: flagLoading } = useAsync(() => (isEditing ? Promise.resolve({ data: null, error: null }) : fetchFeatureFlag('product_submission')), [isEditing])
  const { data: brands } = useAsync(() => fetchAllBrands(), [])
  const { data: existing, loading: existingLoading } = useAsync(() => (isEditing ? fetchVariantById(variantId) : Promise.resolve({ data: null, error: null })), [isEditing, variantId])

  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('energy_drink')
  const [description, setDescription] = useState('')
  const [flavor, setFlavor] = useState('')
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
  const fileInputRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!existing) return
    const product = existing.products
    setBrandName(product.brands?.name || product.brand_name)
    setProductName(product.name)
    setCategory(product.category)
    setDescription(product.description || '')
    setFlavor(existing.flavor || '')
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
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageAlt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
        const blob = await compressImage(imageFile)
        const path = `${user.id}/${existing.product_id}-${Date.now()}.webp`
        const { url, error: uploadError } = await uploadImage(blob, 'product-images', path)
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
        setError(variantError.message)
        return
      }

      trackEvent('product_edit', { product_id: product.id, variant_id: variant.id })
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
      const blob = await compressImage(imageFile)
      const path = `${user.id}/${product.id}-${Date.now()}.webp`
      const { url, error: uploadError } = await uploadImage(blob, 'product-images', path)
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
      setError(variantError.message)
      return
    }

    trackEvent('product_add', { product_id: product.id, variant_id: variant.id, category })
    setDone(variant)
  }

  if (flagLoading || (isEditing && existingLoading)) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>
  }

  if (!isEditing && flagData && flagData.enabled === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Add a product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, textAlign: 'center', padding: 24, ...sans }}>
          Adding new products is temporarily turned off. Check back soon.
        </div>
      </div>
    )
  }

  if (isEditing && (!existing || existing.created_by !== user?.id || existing.products.status !== 'pending')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Edit product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, textAlign: 'center', padding: 24, ...sans }}>
          {existing && existing.products.status !== 'pending' ? "This product has already been reviewed, so it can't be edited here." : "You can only edit products you've submitted yourself."}
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title={isEditing ? 'Edit product' : 'Add a product'} onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 17, color: '#e8e4dc' }}>{isEditing ? 'Changes saved' : 'Submitted for review'}</div>
          {!isEditing && (
            <div style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6, maxWidth: 280 }}>
              Thanks -- this product will show up in search once it's approved. Until then it's marked "Pending review" and only you can see it.
            </div>
          )}
          <button
            onClick={() => navigate(`/product/${done.id}`, { replace: true })}
            style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '12px 24px', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}
          >
            {isEditing ? 'Back to product' : 'View product'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title={isEditing ? 'Edit product' : 'Add a product'} onBack={() => navigate(-1)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Brand">
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Celsius" list="brand-options" style={inputStyle} />
          <datalist id="brand-options">
            {brands?.map((b) => (
              <option key={b.id} value={b.name} />
            ))}
          </datalist>
        </Field>

        <Field label="Product name">
          <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Celsius Sparkling" style={inputStyle} />
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <div style={{ height: '0.5px', background: '#1e1e1e' }} />
        <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>This variant</div>

        <Field label="Flavor (optional)">
          <input value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="e.g. Peach Vibe" style={inputStyle} />
        </Field>

        <Field label="Photo (optional)">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ccc', cursor: 'pointer', textAlign: 'left', ...sans }}
          >
            {imageFile ? imageFile.name : imagePreview ? 'Choose a different photo' : 'Choose photo'}
          </button>
        </Field>

        {imagePreview && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <img src={imagePreview} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} />
              <button onClick={handleRemoveImage} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ff6b6b', ...sans, padding: 0 }}>
                Remove photo
              </button>
            </div>
            <Field label="Describe the photo (required for accessibility)">
              <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="e.g. Can of Celsius Peach Vibe" style={inputStyle} />
            </Field>
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Calories (optional)">
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Protein g (optional)">
              <input type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Carbs g (optional)">
              <input type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Fat g (optional)">
              <input type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Sugar g (optional)">
              <input type="number" value={sugarG} onChange={(e) => setSugarG(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Fiber g (optional)">
              <input type="number" value={fiberG} onChange={(e) => setFiberG(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Caffeine mg (optional)">
              <input type="number" value={caffeineMg} onChange={(e) => setCaffeineMg(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Sodium mg (optional)">
              <input type="number" value={sodiumMg} onChange={(e) => setSodiumMg(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <Field label="Ingredients (optional)">
          <textarea value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: '#f0ece4',
            color: '#111',
            borderRadius: 20,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            ...serif,
            letterSpacing: '-0.01em',
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {submitting ? 'Please wait...' : isEditing ? 'Save changes' : 'Submit for review'}
        </button>
      </div>
    </div>
  )
}
