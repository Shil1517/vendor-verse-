import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowRight, Layers, Loader2, Search, Store, X } from 'lucide-react'
import { useApp } from '../store.jsx'
import { CATS, VENDORS0, cat } from '../data.jsx'
import { expandQueryTerms, findMatchingCategoryHint } from '../data/vendorSeed.js'
import { authService } from '../services/authService.js'
import { cx, fmt } from '../ui.jsx'

const DEFAULT_SUGGESTION_LIMIT = 6
const SEARCH_SUGGESTION_LIMIT = 7

function formatSuggestionPrice(price, unit) {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return unit ? `${fmt(price)} /${unit}` : fmt(price)
  }
  if (!price || typeof price !== 'object') return ''
  if (price.state === 'on_request') return 'Price on request'
  if (price.state !== 'stated') return ''
  const amount = price.minMinor ?? price.maxMinor
  if (amount == null) return ''
  const currency = price.currency || 'INR'
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const digits = formatter.resolvedOptions().maximumFractionDigits
    const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount) / (10 ** digits))
    const resolvedUnit = price.unit || unit
    return resolvedUnit ? `${formatted} /${resolvedUnit}` : formatted
  } catch {
    return `${amount} ${currency}`
  }
}

/**
 * Normalizes a local, remote, or sample listing into a uniform suggestion item.
 */
export function normalizeSuggestionItem(raw, resolveVendor) {
  if (!raw) return null
  const isSample = Boolean(raw.sample) || String(raw.id || '').startsWith('sample-')
  const vendorObj = typeof raw.vendor === 'object' && raw.vendor !== null
    ? raw.vendor
    : (typeof resolveVendor === 'function' ? resolveVendor(raw.vendorId) : null)
  const categoryName = raw.categoryName || raw.sub || (raw.cat ? cat(raw.cat)?.name : '') || 'Marketplace'
  const listingType = raw.listingType || raw.type || 'product'
  return {
    id: raw.id,
    title: raw.title || raw.name || '',
    category: categoryName,
    group: raw.group || (raw.cat ? cat(raw.cat)?.name : '') || '',
    vendorName: vendorObj?.name || raw.vendorName || '',
    city: raw.city || vendorObj?.city || '',
    type: listingType,
    priceLabel: formatSuggestionPrice(raw.price, raw.unit),
    rating: Number(raw.rating ?? raw.ratingAvg ?? 0) || 0,
    reviews: Number(raw.reviews ?? raw.reviewCount ?? 0) || 0,
    desc: raw.desc || '',
    sample: isSample,
  }
}

/**
 * Normalizes a local, remote, or sample vendor into a uniform navbar suggestion item.
 */
export function normalizeVendorSuggestion(raw, { sample = false } = {}) {
  if (!raw || !raw.name) return null
  const categoryName = raw.group || raw.categoryName || (raw.cat ? cat(raw.cat)?.name : '') || 'Verified vendor'
  const specialty = raw.specialty || (Array.isArray(raw.subs) ? raw.subs[0] : '') || raw.vendorType || (Array.isArray(raw.roles) ? raw.roles[0] : '') || ''
  return {
    kind: 'vendor',
    id: raw.id,
    title: raw.name,
    category: categoryName,
    catId: raw.cat || '',
    specialty,
    subs: Array.isArray(raw.subs) ? raw.subs : [],
    vendorType: raw.vendorType || '',
    city: raw.city || '',
    country: raw.country || 'India',
    areas: Array.isArray(raw.areas) ? raw.areas : [],
    rating: Number(raw.rating ?? raw.ratingAvg ?? 0) || 0,
    reviews: Number(raw.reviews ?? raw.reviewCount ?? 0) || 0,
    verified: raw.status === 'approved' || Boolean(raw.verified) || !sample,
    sample: Boolean(sample || raw.sample),
  }
}

/**
 * Ranks and filters product/service suggestions for both empty-click and typed states.
 */
export function rankProductSuggestions(items, query, limit = DEFAULT_SUGGESTION_LIMIT) {
  const list = (items || []).filter((item) => item && item.title)
  const trimmed = String(query || '').trim().toLowerCase()
  if (!trimmed) {
    const sorted = [...list].sort((a, b) => {
      const aProduct = a.type === 'product' ? 1 : 0
      const bProduct = b.type === 'product' ? 1 : 0
      if (aProduct !== bProduct) return bProduct - aProduct
      if (b.rating !== a.rating) return b.rating - a.rating
      return b.reviews - a.reviews
    })
    return sorted.slice(0, limit)
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const scored = []
  for (const item of list) {
    const title = item.title.toLowerCase()
    const category = (item.category || '').toLowerCase()
    const group = (item.group || '').toLowerCase()
    const vendor = (item.vendorName || '').toLowerCase()
    const desc = (item.desc || '').toLowerCase()
    const type = (item.type || '').toLowerCase()
    const combined = `${title} ${category} ${group} ${vendor} ${desc} ${type}`
    if (!tokens.every((token) => combined.includes(token))) continue

    let score = 0
    if (title === trimmed) score += 160
    else if (title.startsWith(trimmed)) score += 120
    else if (title.includes(trimmed)) score += 90
    if (tokens.every((token) => title.includes(token))) score += 45
    if (tokens.some((token) => category.includes(token) || group.includes(token))) score += 28
    if (tokens.some((token) => vendor.includes(token))) score += 20
    if (item.type === 'product') score += 6
    score += Math.min(item.rating, 5)
    scored.push({ item, score })
  }

  scored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating)
  return scored.slice(0, limit).map((entry) => entry.item)
}

/**
 * Ranks and filters vendor suggestions for empty-click (diverse across fields) and typed queries.
 */
export function rankVendorSuggestions(items, query, { city = '', country = '', limit = DEFAULT_SUGGESTION_LIMIT } = {}) {
  const list = (items || []).filter((item) => item && item.title)
  const trimmed = String(query || '').trim().toLowerCase()
  const cityLower = String(city || '').trim().toLowerCase()
  const countryLower = String(country || '').trim().toLowerCase()

  if (!trimmed) {
    const sorted = [...list].sort((a, b) => {
      const aCity = cityLower && a.city.toLowerCase() === cityLower ? 1 : 0
      const bCity = cityLower && b.city.toLowerCase() === cityLower ? 1 : 0
      if (aCity !== bCity) return bCity - aCity
      const aCountry = countryLower && a.country.toLowerCase() === countryLower ? 1 : 0
      const bCountry = countryLower && b.country.toLowerCase() === countryLower ? 1 : 0
      if (aCountry !== bCountry) return bCountry - aCountry
      if (b.rating !== a.rating) return b.rating - a.rating
      return b.reviews - a.reviews
    })

    // Pick one top vendor per field first so suggested vendors span multiple categories.
    const picked = []
    const seenCategories = new Set()
    for (const vendor of sorted) {
      const key = vendor.category || vendor.catId
      if (!seenCategories.has(key)) {
        seenCategories.add(key)
        picked.push(vendor)
        if (picked.length >= limit) return picked
      }
    }
    for (const vendor of sorted) {
      if (!picked.includes(vendor)) {
        picked.push(vendor)
        if (picked.length >= limit) break
      }
    }
    return picked
  }

  const expandedQueries = expandQueryTerms(trimmed)
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const scored = []
  for (const item of list) {
    const name = item.title.toLowerCase()
    const category = (item.category || '').toLowerCase()
    const specialty = (item.specialty || '').toLowerCase()
    const subs = (item.subs || []).join(' ').toLowerCase()
    const vendorType = (item.vendorType || '').toLowerCase()
    const place = `${item.city || ''} ${item.country || ''} ${(item.areas || []).join(' ')}`.toLowerCase()
    const combined = `${name} ${category} ${specialty} ${subs} ${vendorType} ${place}`
    const directHit = tokens.every((token) => combined.includes(token))
    const aliasHit = !directHit && expandedQueries.some((alias) => alias !== trimmed && combined.includes(alias))
    if (!directHit && !aliasHit) continue

    let score = 0
    if (name === trimmed) score += 180
    else if (name.startsWith(trimmed)) score += 130
    else if (name.includes(trimmed)) score += 95
    if (tokens.every((token) => name.includes(token))) score += 45
    if (tokens.some((token) => specialty.includes(token) || subs.includes(token))) score += 40
    if (aliasHit && expandedQueries.some((alias) => specialty.includes(alias) || subs.includes(alias))) score += 38
    if (tokens.some((token) => category.includes(token))) score += 32
    if (tokens.some((token) => vendorType.includes(token))) score += 18
    if (cityLower && item.city.toLowerCase() === cityLower) score += 16
    if (tokens.some((token) => place.includes(token))) score += 14
    score += Math.min(item.rating, 5)
    scored.push({ item, score })
  }

  scored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating || b.item.reviews - a.item.reviews)
  return scored.slice(0, limit).map((entry) => entry.item)
}

function HighlightMatch({ text, query }) {
  const trimmed = query.trim()
  if (!trimmed) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(trimmed.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="vv-nav-search-mark">{text.slice(idx, idx + trimmed.length)}</mark>
      {text.slice(idx + trimmed.length)}
    </>
  )
}

/**
 * Vendor-focused marketplace navbar search with click-to-suggest vendors and live typed recommendations.
 */
export function NavbarProductSearch({
  value,
  onChange,
  onSubmitSearch,
  onSelectProduct,
  onSelectCategory,
  placeholder = 'Search vendors, fields or services...',
}) {
  const { vendors, locale } = useApp()
  const isRemote = authService.isRemote
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [remoteState, setRemoteState] = useState({ loading: false, items: null, categories: [] })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listboxId = useId()
  const trimmed = value.trim()

  const localVendors = useMemo(() => {
    const source = (!isRemote && vendors?.length) ? vendors : VENDORS0
    return source
      .filter((v) => v.status === 'approved')
      .map((v) => normalizeVendorSuggestion(v, { sample: isRemote }))
      .filter(Boolean)
  }, [isRemote, vendors])

  useEffect(() => {
    if (!open || !isRemote) return undefined
    let active = true
    const delay = trimmed ? 220 : 0
    setRemoteState((prev) => ({ ...prev, loading: true }))
    const timer = window.setTimeout(async () => {
      try {
        const countryCode = locale?.country || 'IN'
        const cityId = locale?.cityId || undefined
        if (trimmed.length >= 2) {
          const [uniRes, listRes] = await Promise.all([
            authService.universalSearch({ q: trimmed, countryCode, cityId, types: ['vendor', 'category'], limit: 8 }),
            authService.searchListings({ q: trimmed, countryCode, cityId, limit: 8 }),
          ])
          if (!active) return
          const byId = new Map()
          const uniVendors = uniRes.ok ? (uniRes.sections?.vendor?.items || []) : []
          const uniCategories = uniRes.ok ? (uniRes.sections?.category?.items || []) : []
          uniVendors.forEach((v) => {
            const norm = normalizeVendorSuggestion(v, { sample: false })
            if (norm) byId.set(norm.id || norm.title, norm)
          })
          const listingVendors = listRes.ok ? (listRes.items || []) : []
          listingVendors.forEach((l) => {
            if (l.vendor?.name) {
              const norm = normalizeVendorSuggestion({
                id: l.vendor.id,
                name: l.vendor.name,
                categoryName: l.categoryName,
                city: l.city || l.vendor.city,
                roles: l.vendor.roles,
                ratingAvg: l.vendor.ratingAvg,
                reviewCount: l.vendor.reviewCount,
                status: 'approved',
              }, { sample: false })
              if (norm && !byId.has(norm.id || norm.title)) byId.set(norm.id || norm.title, norm)
            }
          })
          setRemoteState({ loading: false, items: [...byId.values()], categories: uniCategories })
        } else {
          const listRes = await authService.searchListings({ countryCode, cityId, limit: 12 })
          if (!active) return
          const byId = new Map()
          if (listRes.ok && Array.isArray(listRes.items)) {
            listRes.items.forEach((l) => {
              if (l.vendor?.name) {
                const norm = normalizeVendorSuggestion({
                  id: l.vendor.id,
                  name: l.vendor.name,
                  categoryName: l.categoryName,
                  city: l.city || l.vendor.city,
                  roles: l.vendor.roles,
                  ratingAvg: l.vendor.ratingAvg,
                  reviewCount: l.vendor.reviewCount,
                  status: 'approved',
                }, { sample: false })
                if (norm && !byId.has(norm.id || norm.title)) byId.set(norm.id || norm.title, norm)
              }
            })
          }
          setRemoteState({ loading: false, items: [...byId.values()], categories: [] })
        }
      } catch {
        if (active) setRemoteState({ loading: false, items: [], categories: [] })
      }
    }, delay)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, isRemote, trimmed, locale?.country, locale?.cityId])

  useEffect(() => {
    if (!open) return undefined
    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const matchingCategory = useMemo(() => {
    if (!trimmed) return null
    const hint = findMatchingCategoryHint(trimmed)
    if (hint) return hint
    const remoteCat = remoteState.categories?.[0]
    if (remoteCat?.name) {
      const fromRemote = findMatchingCategoryHint(remoteCat.name)
      if (fromRemote) return fromRemote
      return { id: remoteCat.id, name: remoteCat.name, group: remoteCat.name, subcategory: '' }
    }
    const lower = trimmed.toLowerCase()
    const catMatch = CATS.find((c) =>
      c.name.toLowerCase().includes(lower)
      || c.subs.some((s) => s.toLowerCase().includes(lower))
    )
    if (!catMatch) return null
    return { id: catMatch.id, name: catMatch.name, group: catMatch.name, subcategory: '' }
  }, [trimmed, remoteState.categories])

  const suggestions = useMemo(() => {
    const limit = trimmed ? SEARCH_SUGGESTION_LIMIT : DEFAULT_SUGGESTION_LIMIT
    const opts = { city: locale?.city, country: locale?.countryName, limit }
    if (isRemote && Array.isArray(remoteState.items) && remoteState.items.length > 0) {
      return rankVendorSuggestions(remoteState.items, trimmed, opts)
    }
    return rankVendorSuggestions(localVendors, trimmed, opts)
  }, [isRemote, remoteState.items, localVendors, trimmed, locale?.city, locale?.countryName])

  const showCategoryShortcut = Boolean(trimmed && matchingCategory)
  const showSearchAllOption = Boolean(trimmed)
  const optionOffset = showCategoryShortcut ? 1 : 0
  const totalOptions = optionOffset + suggestions.length + (showSearchAllOption ? 1 : 0)

  useEffect(() => {
    setActiveIndex(-1)
  }, [trimmed, open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (open && activeIndex >= 0) {
      if (showCategoryShortcut && activeIndex === 0) {
        setOpen(false)
        setActiveIndex(-1)
        onSelectCategory?.(matchingCategory)
        return
      }
      const vendorIdx = activeIndex - optionOffset
      if (vendorIdx >= 0 && vendorIdx < suggestions.length) {
        const picked = suggestions[vendorIdx]
        setOpen(false)
        setActiveIndex(-1)
        onSelectProduct?.(picked)
        return
      }
    }
    setOpen(false)
    setActiveIndex(-1)
    onSubmitSearch?.(trimmed)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      if (totalOptions > 0) setActiveIndex((prev) => (prev + 1) % totalOptions)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) setOpen(true)
      if (totalOptions > 0) setActiveIndex((prev) => (prev <= 0 ? totalOptions - 1 : prev - 1))
    }
  }

  const chooseVendor = (item) => {
    setOpen(false)
    setActiveIndex(-1)
    onSelectProduct?.(item)
  }

  const chooseCategory = (catItem) => {
    setOpen(false)
    setActiveIndex(-1)
    onSelectCategory?.(catItem)
  }

  const chooseSearchAll = () => {
    setOpen(false)
    setActiveIndex(-1)
    onSubmitSearch?.(trimmed)
  }

  return (
    <div ref={containerRef} className={cx('vv-mock-header-search', open && 'is-open')}>
      <form className="vv-nav-search-form" onSubmit={handleSubmit} role="search" autoComplete="off">
        <Search size={16} className="vv-nav-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          role="combobox"
          aria-label="Search vendors, fields or services"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange?.(event.target.value)
            if (!open) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            className="vv-nav-search-clear"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange?.('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="vv-nav-search-submit" aria-label="Search vendors">
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </form>

      {open && (
        <div
          id={listboxId}
          className="vv-mock-suggestions vv-nav-suggestions"
          role="listbox"
          aria-label={trimmed ? 'Recommended vendors' : 'Suggested vendors'}
        >
          <div className="vv-mock-suggestions-head">
            <span className="vv-mock-suggestions-title">
              {trimmed ? 'Recommended vendors' : 'Suggested vendors'}
            </span>
            <div className="vv-nav-suggestions-head-right">
              {isRemote && remoteState.loading && (
                <span className="vv-nav-suggestions-loading" aria-live="polite">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  <span>Updating</span>
                </span>
              )}
              <button
                type="button"
                className="vv-mock-suggestions-close"
                aria-label="Close vendor suggestions"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  setActiveIndex(-1)
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="vv-mock-suggestions-list">
            {showCategoryShortcut && (
              <button
                id={`${listboxId}-opt-0`}
                type="button"
                role="option"
                aria-selected={activeIndex === 0}
                className={cx('vv-mock-suggestion-item vv-nav-suggestion-item', activeIndex === 0 && 'is-active')}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(0)}
                onClick={() => chooseCategory(matchingCategory)}
              >
                <span className="vv-mock-suggestion-ico" aria-hidden="true">
                  <Layers size={15} />
                </span>
                <span className="vv-nav-suggestion-copy">
                  <span className="vv-mock-suggestion-label">View vendors in {matchingCategory.name}</span>
                  <span className="vv-nav-suggestion-sub">
                    {matchingCategory.subcategory && matchingCategory.group && matchingCategory.group !== matchingCategory.name
                      ? `${matchingCategory.group} · Browse verified ${matchingCategory.name.toLowerCase()} vendors`
                      : 'Browse verified vendors in this field'}
                  </span>
                </span>
                <small className="vv-mock-suggestion-meta">Category</small>
                <ArrowRight size={14} className="vv-mock-suggestion-arrow" aria-hidden="true" />
              </button>
            )}

            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const optionIndex = optionOffset + idx
                const isActive = activeIndex === optionIndex
                const metaLabel = item.sample
                  ? 'Sample'
                  : (item.rating > 0 ? `${item.rating.toFixed(1)} ★ · Verified` : 'Verified')
                return (
                  <button
                    key={`${item.id || item.title}-${idx}`}
                    id={`${listboxId}-opt-${optionIndex}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cx('vv-mock-suggestion-item vv-nav-suggestion-item', isActive && 'is-active')}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    onClick={() => chooseVendor(item)}
                  >
                    <span className="vv-mock-suggestion-ico" aria-hidden="true">
                      <Store size={15} />
                    </span>
                    <span className="vv-nav-suggestion-copy">
                      <span className="vv-mock-suggestion-label">
                        <HighlightMatch text={item.title} query={trimmed} />
                      </span>
                      <span className="vv-nav-suggestion-sub">
                        {item.category}
                        {item.specialty ? ` · ${item.specialty}` : ''}
                        {item.city ? ` · ${item.city}` : ''}
                      </span>
                    </span>
                    <small className={cx('vv-mock-suggestion-meta', !item.sample && item.verified && 'is-live')}>
                      {metaLabel}
                    </small>
                    <ArrowRight size={14} className="vv-mock-suggestion-arrow" aria-hidden="true" />
                  </button>
                )
              })
            ) : (
              <div className="vv-mock-suggestions-empty">
                No matching vendors found for “{trimmed}”.
              </div>
            )}

            {showSearchAllOption && (
              <button
                id={`${listboxId}-opt-${optionOffset + suggestions.length}`}
                type="button"
                role="option"
                aria-selected={activeIndex === optionOffset + suggestions.length}
                className={cx(
                  'vv-mock-suggestion-item vv-nav-suggestion-item vv-nav-suggestion-search-all',
                  activeIndex === optionOffset + suggestions.length && 'is-active',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(optionOffset + suggestions.length)}
                onClick={chooseSearchAll}
              >
                <span className="vv-mock-suggestion-ico" aria-hidden="true">
                  <Search size={14} />
                </span>
                <span className="vv-nav-suggestion-copy">
                  <span className="vv-mock-suggestion-label">Browse all vendors for “{trimmed}”</span>
                </span>
                <small className="vv-mock-suggestion-meta">Vendors</small>
                <ArrowRight size={14} className="vv-mock-suggestion-arrow" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
