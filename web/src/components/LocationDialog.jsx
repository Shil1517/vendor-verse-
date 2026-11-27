/*
 * Location popup (F-GEO-01, F-GEO-02), opened from the header location control.
 *
 * Supports:
 * 1. Browser geolocation ("Use my current location") which automatically detects and sets the location.
 * 2. Pincode / postal-code lookup which detects and sets any valid pincode location immediately.
 * 3. Manual country > state > city selection (or typing any custom city) with remote API + offline GEO fallback.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useApp } from '../store.jsx'
import { GEO } from '../geo.js'
import { authService } from '../services/authService.js'
import { buildLocalePatch, detectLocationByBrowser, resolvePincodeLocation } from '../services/locationService.js'

const cx = (...parts) => parts.filter(Boolean).join(' ')
const IDLE = { busy: false, message: '', tone: 'muted' }

export function LocationDialog({ open, onClose }) {
  const { locale, setLocale, toast, me } = useApp()
  const [country, setCountry] = useState(locale.country || 'IN')
  const [countries, setCountries] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])
  const [regionId, setRegionId] = useState('')
  const [cityId, setCityId] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [q, setQ] = useState('')
  const [pin, setPin] = useState('')
  const [place, setPlace] = useState(null)
  const [pinState, setPinState] = useState(IDLE)
  const [locating, setLocating] = useState(false)
  const [manual, setManual] = useState(false)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [waitlisting, setWaitlisting] = useState(false)
  const [joined, setJoined] = useState([])
  const [error, setError] = useState('')
  const pinRef = useRef(null)
  const latestPin = useRef('')

  const fallbackCountries = useMemo(() => GEO.map((c) => ({ code: c.code, name: c.name })), [])
  const fallbackGeoFor = (code) => {
    const entry = GEO.find((c) => c.code === code) || GEO[0]
    const nextRegions = entry.states.map((s) => ({ id: s.name, name: s.name }))
    const nextCities = entry.states.flatMap((s) =>
      s.cities.map((c) => ({
        id: `${entry.code}:${s.name}:${c.n}`,
        name: c.n,
        regionId: s.name,
        launchStatus: c.s === 'live' ? 'live' : 'not_live',
      })),
    )
    return { nextRegions, nextCities }
  }

  // Start clean every time the popup opens, pre-filling current pincode/city if set.
  useEffect(() => {
    if (!open) return
    setPin(locale.pincode || '')
    setPlace(null)
    setPinState(IDLE)
    setError('')
    setManual(false)
    setQ('')
    setCustomCity(locale.city || '')
    setCityId(locale.cityId || '')
    setRegionId('')
    setCountry(locale.country || 'IN')
    latestPin.current = locale.pincode || ''
    if (authService.isRemote) {
      authService.listCountries().then((r) => setCountries(r.ok && r.countries?.length ? r.countries : fallbackCountries))
    } else {
      setCountries(fallbackCountries)
    }
    const t = setTimeout(() => pinRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Regions and cities of the chosen country (remote API with local GEO fallback).
  useEffect(() => {
    if (!open) return
    let live = true
    if (!authService.isRemote) {
      const { nextRegions, nextCities } = fallbackGeoFor(country)
      setRegions(nextRegions)
      setCities(nextCities)
      setLoadingGeo(false)
      return undefined
    }
    setLoadingGeo(true)
    Promise.all([authService.listRegions(country), authService.listCities(country)]).then(([r, c]) => {
      if (!live) return
      setLoadingGeo(false)
      if (!r.ok || !c.ok) {
        const { nextRegions, nextCities } = fallbackGeoFor(country)
        setRegions(nextRegions)
        setCities(nextCities)
        return
      }
      setRegions(r.regions)
      setCities(c.cities)
    })
    return () => { live = false }
  }, [open, country])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const selectedApiCity = cities.find((c) => c.id === cityId) || null
  const visibleCities = useMemo(
    () => cities.filter((c) => (!regionId || c.regionId === regionId) && (!q || c.name.toLowerCase().includes(q.toLowerCase()))),
    [cities, regionId, q],
  )
  const resolvedCityName = selectedApiCity?.name || place?.resolvedCity || customCity.trim()
  const isNotLiveCity = Boolean(selectedApiCity && selectedApiCity.launchStatus !== 'live')

  const applyPlaceToWebsite = (patch, { closeAfter = false } = {}) => {
    const nextLocale = { ...locale, ...buildLocalePatch(patch, locale) }
    setLocale(nextLocale)
    toast(`Location set to ${nextLocale.city}${nextLocale.pincode ? ` ${nextLocale.pincode}` : ''}`)
    if (closeAfter) onClose()
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    setError('')
    const result = await detectLocationByBrowser()
    setLocating(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    applyPlaceToWebsite({ ...result.place, source: 'geo' }, { closeAfter: true })
  }

  const detect = async (value) => {
    setPinState({ busy: true, message: 'Detecting location…', tone: 'muted' })
    setPlace(null)
    setError('')
    const r = await resolvePincodeLocation(value)
    if (latestPin.current !== value) return
    if (!r.ok) {
      setPinState({ busy: false, tone: 'warn', message: r.message || `Could not detect pincode ${value}.` })
      setManual(true)
      return
    }
    const p = r.place
    setPlace(p)
    setCountry(p.countryCode || 'IN')
    setRegionId(p.region?.id || p.city?.regionId || '')
    setCityId(p.city?.id || '')
    setCustomCity(p.resolvedCity || '')
    setPinState({ busy: false, message: 'Location detected and applied.', tone: 'ok' })

    // Automatically apply detected pincode location so typing a pincode sets it immediately.
    const nextPatch = {
      country: p.countryCode || 'IN',
      countryName: p.countryName || 'India',
      state: p.region?.name || p.state || '',
      city: p.resolvedCity || p.city?.name || p.district || '',
      cityId: p.city?.id || null,
      pincode: p.postalCode,
      locality: p.areas?.[0] || '',
      source: 'pincode',
    }
    setLocale((prev) => ({ ...prev, ...buildLocalePatch(nextPatch, prev) }))
    toast(`Location set to ${nextPatch.city} ${nextPatch.pincode}`)
  }

  const onPin = (raw) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8)
    const digitsOnly = cleaned.replace(/\D/g, '')
    setPin(cleaned)
    latestPin.current = cleaned
    if (/^[1-9]\d{5}$/.test(digitsOnly) && /^\d+$/.test(cleaned.trim())) {
      latestPin.current = digitsOnly
      detect(digitsOnly)
      return
    }
    if (cleaned.trim().length < 5) {
      setPlace(null)
      setPinState(IDLE)
      return
    }
    if (/^\d{5}$/.test(cleaned.trim()) || /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/.test(cleaned.trim())) {
      detect(cleaned.trim())
    }
  }

  const clearPin = () => { setPin(''); latestPin.current = ''; setPlace(null); setPinState(IDLE) }
  const pickCity = (c) => {
    setCityId(c.id)
    setCustomCity(c.name)
    setRegionId(c.regionId || regionId)
    if (place?.city?.id !== c.id && place?.resolvedCity !== c.name) clearPin()
  }
  const pickCustomCity = (name) => {
    setCityId('')
    setCustomCity(name.trim())
    clearPin()
  }
  const onCountry = (code) => { setCountry(code); setRegionId(''); setCityId(''); setCustomCity(''); clearPin() }

  const joinWaitlist = async () => {
    if (!selectedApiCity) return
    if (!me.loggedIn) { setError('Sign in to join the waitlist.'); return }
    setWaitlisting(true); setError('')
    const r = await authService.joinCityWaitlist(selectedApiCity.id)
    setWaitlisting(false)
    if (!r.ok) { setError(r.message || 'Could not join the waitlist.'); return }
    setJoined((j) => [...j, selectedApiCity.id])
    toast(`You joined the ${selectedApiCity.name} waitlist.`)
  }

  const apply = () => {
    const countryName = countries.find((c) => c.code === country)?.name || locale.countryName
    const region = regions.find((r) => r.id === (selectedApiCity?.regionId || regionId))
    const fromPin = Boolean(place && (place.city?.id === selectedApiCity?.id || place.resolvedCity === resolvedCityName))
    applyPlaceToWebsite(
      {
        country,
        countryName,
        state: region?.name || place?.state || '',
        city: resolvedCityName,
        cityId: selectedApiCity?.id || place?.city?.id || null,
        pincode: fromPin ? place.postalCode : '',
        locality: fromPin ? place.areas?.[0] || '' : '',
        source: fromPin ? 'pincode' : 'manual',
      },
      { closeAfter: true },
    )
  }

  if (!open) return null
  const detectedLabel = place ? [place.areas?.[0], place.resolvedCity].filter(Boolean).join(', ') : ''
  const detectedSub = place ? [place.state, countries.find((c) => c.code === place.countryCode)?.name || place.countryName || 'India'].filter(Boolean).join(', ') : ''
  const customQueryMatch = q.trim() && !visibleCities.some((c) => c.name.toLowerCase() === q.trim().toLowerCase())

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="loc-title">
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(14,27,44,0.32)] ring-1 ring-white/60">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 bg-gradient-to-br from-[#fff8f2] via-white to-brand-50/50 px-6 pb-5 pt-6 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-900 text-white shadow-lg shadow-ink-900/15"><MapPin size={20} /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Set your delivery area</p>
              <h2 id="loc-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">Where do you need vendors?</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">Find suppliers and services available where you are.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-100 bg-white text-ink-500 shadow-sm transition hover:bg-ink-50 hover:text-ink-900"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-7">
          {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{error}</p>}

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-ink-900 px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(14,27,44,0.16)] transition hover:-translate-y-0.5 hover:bg-ink-800 disabled:opacity-60"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {locating ? 'Detecting your current location…' : 'Use my current location'}
          </button>

          <label className="block">
            <span className="text-[13px] font-bold text-ink-700">Pincode or postal code</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50/40 px-4 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100/70">
              <MapPin size={17} className="text-brand-600" />
              <input ref={pinRef} value={pin} onChange={(e) => onPin(e.target.value)} inputMode="text" autoComplete="postal-code" maxLength={8} placeholder="Enter 6-digit pincode, e.g. 462001" className="h-13 w-full bg-transparent text-base tracking-wide text-ink-900 outline-none placeholder:text-ink-400" />
              {pinState.busy && <Loader2 size={16} className="animate-spin text-ink-400" />}
            </span>
            {pinState.message && <span role="status" className={cx('mt-1.5 block text-xs font-medium', pinState.tone === 'warn' ? 'text-amber-700' : pinState.tone === 'ok' ? 'text-emerald-700' : 'text-ink-500')}>{pinState.message}</span>}
          </label>

          {place && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-emerald-900">{detectedLabel || place.resolvedCity}</p>
                <p className="truncate text-xs text-emerald-800">{detectedSub} · {place.postalCode}</p>
              </div>
              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', place.launchStatus === 'live' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 ring-1 ring-emerald-200')}>{place.launchStatus === 'live' ? 'Live' : 'Set'}</span>
            </div>
          )}

          <div className={cx('rounded-2xl border transition', manual ? 'border-brand-200 bg-brand-50/40' : 'border-ink-100 bg-ink-50/50')}>
            <button type="button" onClick={() => setManual((m) => !m)} aria-expanded={manual} className="flex min-h-14 w-full items-center justify-between px-4 text-left text-sm font-bold text-ink-800">
              <span>Choose a city manually</span><ChevronDown size={18} className={cx('text-brand-700 transition', manual && 'rotate-180')} />
            </button>
            {manual && (
              <div className="space-y-4 border-t border-brand-100 px-4 pb-4 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-700">Country</span>
                    <select value={country} onChange={(e) => onCountry(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">
                      {(countries.length ? countries : [{ code: country, name: locale.countryName || country }]).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-700">State / region</span>
                    <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setCityId(''); setCustomCity('') }} className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">
                      <option value="">All states / regions</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-ink-700">City</span>
                    <span className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-sm"><Search size={14} className="text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or type city" className="w-36 bg-transparent outline-none" /></span>
                  </div>
                  <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {loadingGeo && <p className="col-span-full py-4 text-center text-sm text-ink-500">Loading cities…</p>}
                    {customQueryMatch && (
                      <button type="button" onClick={() => pickCustomCity(q)} aria-pressed={!cityId && customCity.toLowerCase() === q.trim().toLowerCase()} className={cx('col-span-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition', !cityId && customCity.toLowerCase() === q.trim().toLowerCase() ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-dashed border-ink-300 text-ink-800 hover:bg-ink-50')}>
                        <span className="truncate">Use “{q.trim()}”</span>
                        <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800">Custom</span>
                      </button>
                    )}
                    {!loadingGeo && !visibleCities.length && !customQueryMatch && <p className="col-span-full py-4 text-center text-sm text-ink-500">Type a city name above to set it.</p>}
                    {visibleCities.map((c) => (
                      <button type="button" key={c.id} onClick={() => pickCity(c)} aria-pressed={c.id === cityId} className={cx('flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition', c.id === cityId ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-800 hover:bg-ink-50')}>
                        <span className="truncate">{c.name}</span>
                        <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', c.launchStatus === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500')}>{c.launchStatus === 'live' ? 'Live' : 'Nationwide'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isNotLiveCity && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-sm font-bold text-amber-900">{selectedApiCity.name} local services are coming soon</p>
              <p className="mt-1 text-sm text-amber-800">You can still set {selectedApiCity.name} as your location to browse nationwide and remote vendors, or join the local launch waitlist.</p>
              {authService.isRemote && (joined.includes(selectedApiCity.id)
                ? <p className="mt-3 text-sm font-semibold text-emerald-700"><Check size={14} className="mr-1 inline" />You are on the waitlist.</p>
                : <button type="button" onClick={joinWaitlist} disabled={waitlisting} className="mt-3 h-10 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60">{waitlisting ? 'Joining…' : 'Join the waitlist'}</button>)}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-ink-100 bg-ink-50/70 px-6 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-ink-200 bg-white px-5 text-sm font-bold text-ink-700 transition hover:bg-ink-50">Cancel</button>
          <button type="button" onClick={apply} disabled={!resolvedCityName || pinState.busy} className="h-12 flex-1 rounded-2xl bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(183,136,47,0.2)] transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">Use this location</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
