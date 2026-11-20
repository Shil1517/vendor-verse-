/*
 * Location popup (F-GEO-01, F-GEO-02), opened from the header location control.
 *
 * Pincode first: the user types a six-digit pincode and the backend
 * (GET /geo/pincodes/:pincode, India Post behind our API) returns the state, district and the
 * city of our own hierarchy it belongs to. Country, state and city are then selected for them.
 * A pincode in a place we do not cover is reported as such and nothing is guessed.
 * "Choose manually" uses the geo APIs (countries, regions, cities with launch status).
 * Only a live city can be applied; a city that is not live offers the waitlist (F-GEO-02).
 * Without an API the header keeps opening the seed-data location screen (`c_location`).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, MapPin, Search, X } from 'lucide-react'
import { COUNTRY_SETTINGS, useApp } from '../store.jsx'
import { authService } from '../services/authService.js'

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
  const [q, setQ] = useState('')
  const [pin, setPin] = useState('')
  const [place, setPlace] = useState(null) // result of the pincode lookup
  const [pinState, setPinState] = useState(IDLE)
  const [manual, setManual] = useState(false)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [waitlisting, setWaitlisting] = useState(false)
  const [joined, setJoined] = useState([])
  const [error, setError] = useState('')
  const pinRef = useRef(null)
  const latestPin = useRef('')

  // Start clean every time the popup opens, and ask for the pincode first.
  useEffect(() => {
    if (!open) return
    setPin(''); setPlace(null); setPinState(IDLE); setError(''); setManual(false); setQ(''); setCityId(''); setRegionId('')
    setCountry(locale.country || 'IN')
    latestPin.current = ''
    authService.listCountries().then((r) => { if (r.ok) setCountries(r.countries) })
    const t = setTimeout(() => pinRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Regions and cities of the chosen country; preselect the current city on first load.
  useEffect(() => {
    if (!open) return
    let live = true
    setLoadingGeo(true)
    Promise.all([authService.listRegions(country), authService.listCities(country)]).then(([r, c]) => {
      if (!live) return
      setLoadingGeo(false)
      if (!r.ok || !c.ok) { setError((!r.ok ? r.message : c.message) || 'Could not load locations. Check your connection and try again.'); setRegions([]); setCities([]); return }
      setRegions(r.regions); setCities(c.cities)
    })
    return () => { live = false }
  }, [open, country])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const city = cities.find((c) => c.id === cityId) || null
  const visibleCities = useMemo(() => cities.filter((c) => (!regionId || c.regionId === regionId) && (!q || c.name.toLowerCase().includes(q.toLowerCase()))), [cities, regionId, q])
  const live = city?.launchStatus === 'live'

  const detect = async (value) => {
    setPinState({ busy: true, message: '', tone: 'muted' }); setPlace(null); setError('')
    const r = await authService.lookupPincode(value)
    if (latestPin.current !== value) return // the user kept typing; ignore a stale answer
    if (!r.ok) {
      setPinState({ busy: false, tone: 'warn', message: r.unknown ? `We could not find pincode ${value}. Check it, or choose your city below.` : r.unavailable ? 'We could not look up the pincode right now. Choose your city below.' : (r.message || 'Could not look up this pincode.') })
      setManual(true)
      return
    }
    const p = r.place
    setPlace(p)
    if (p.supported && p.city) {
      setCountry(p.countryCode)
      setRegionId(p.region?.id || p.city.regionId || '')
      setCityId(p.city.id)
      setPinState(IDLE)
    } else {
      setPinState({ busy: false, tone: 'warn', message: `${[p.areas[0], p.district, p.state].filter(Boolean).join(', ')} is not an area we cover yet. Choose a supported city below.` })
      setRegionId(p.region?.id || '')
      setCityId('')
      setManual(true)
    }
  }

  const onPin = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setPin(digits); latestPin.current = digits
    if (digits.length < 6) { setPlace(null); setPinState(IDLE); return }
    detect(digits)
  }

  const clearPin = () => { setPin(''); latestPin.current = ''; setPlace(null); setPinState(IDLE) }
  const pickCity = (c) => { setCityId(c.id); setRegionId(c.regionId || regionId); if (place?.city?.id !== c.id) clearPin() }
  const onCountry = (code) => { setCountry(code); setRegionId(''); setCityId(''); clearPin() }

  const joinWaitlist = async () => {
    if (!city) return
    if (!me.loggedIn) { setError('Sign in to join the waitlist.'); return }
    setWaitlisting(true); setError('')
    const r = await authService.joinCityWaitlist(city.id)
    setWaitlisting(false)
    if (!r.ok) { setError(r.message || 'Could not join the waitlist.'); return }
    setJoined((j) => [...j, city.id]); toast(`You joined the ${city.name} waitlist.`)
  }

  const apply = () => {
    const countryName = countries.find((c) => c.code === country)?.name || locale.countryName
    const region = regions.find((r) => r.id === (city.regionId || regionId))
    const fromPin = place?.city?.id === city.id
    setLocale({ ...locale, ...(COUNTRY_SETTINGS[countryName] || {}), country, countryName, state: region?.name || place?.state || null, city: city.name, cityId: city.id, pincode: fromPin ? place.postalCode : '', locality: fromPin ? place.areas[0] || '' : '' })
    toast(`Showing vendors that serve ${city.name}${fromPin ? ` ${place.postalCode}` : ''}`)
    onClose()
  }

  if (!open) return null
  const detected = place?.supported && place.city
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="loc-title">
      <div className="absolute inset-0 bg-ink-900/55" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-6 pb-4 pt-5">
          <div>
            <h2 id="loc-title" className="text-lg font-bold text-ink-900">Where do you need vendors?</h2>
            <p className="mt-0.5 text-sm text-ink-500">Enter your pincode and we will find your location</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-50"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <label className="block">
            <span className="text-[13px] font-semibold text-ink-700">Pincode</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-ink-200 px-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
              <MapPin size={16} className="text-ink-400" />
              <input ref={pinRef} value={pin} onChange={(e) => onPin(e.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="6-digit pincode, e.g. 302021" className="h-12 w-full bg-transparent text-base tracking-wide outline-none" />
              {pinState.busy && <Loader2 size={16} className="animate-spin text-ink-400" />}
            </span>
            {pinState.message && <span role="status" className={cx('mt-1.5 block text-xs font-medium', pinState.tone === 'warn' ? 'text-amber-700' : 'text-ink-500')}>{pinState.message}</span>}
          </label>

          {detected && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-emerald-900">{[place.areas[0], place.city.name].filter(Boolean).join(', ')}</p>
                <p className="truncate text-xs text-emerald-800">{[place.state, countries.find((c) => c.code === place.countryCode)?.name || 'India'].join(', ')} · {place.postalCode}</p>
              </div>
              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', place.city.launchStatus === 'live' ? 'bg-emerald-600 text-white' : 'bg-ink-100 text-ink-600')}>{place.city.launchStatus === 'live' ? 'Live' : 'Not live'}</span>
            </div>
          )}

          <div>
            <button type="button" onClick={() => setManual((m) => !m)} aria-expanded={manual} className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-700">
              Choose manually instead <ChevronDown size={16} className={cx('transition', manual && 'rotate-180')} />
            </button>
            {manual && (
              <div className="mt-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-700">Country</span>
                    <select value={country} onChange={(e) => onCountry(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">
                      {(countries.length ? countries : [{ code: country, name: locale.countryName || country }]).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-700">State / region</span>
                    <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setCityId('') }} className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">
                      <option value="">All states / regions</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-ink-700">City</span>
                    <span className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-sm"><Search size={14} className="text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city" className="w-32 bg-transparent outline-none" /></span>
                  </div>
                  <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {loadingGeo && <p className="col-span-full py-4 text-center text-sm text-ink-500">Loading cities…</p>}
                    {!loadingGeo && !visibleCities.length && <p className="col-span-full py-4 text-center text-sm text-ink-500">No cities found.</p>}
                    {visibleCities.map((c) => (
                      <button type="button" key={c.id} onClick={() => pickCity(c)} aria-pressed={c.id === cityId} className={cx('flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition', c.id === cityId ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-800 hover:bg-ink-50')}>
                        <span className="truncate">{c.name}</span>
                        <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', c.launchStatus === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500')}>{c.launchStatus === 'live' ? 'Live' : 'Not live'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {city && !live && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-sm font-bold text-amber-900">{city.name} is not live yet</p>
              <p className="mt-1 text-sm text-amber-800">Vendors outside a live area are never shown as local. Pick a live city, or join the waitlist and we will tell you when {city.name} opens.</p>
              {joined.includes(city.id)
                ? <p className="mt-3 text-sm font-semibold text-emerald-700"><Check size={14} className="mr-1 inline" />You are on the waitlist.</p>
                : <button type="button" onClick={joinWaitlist} disabled={waitlisting} className="mt-3 h-10 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60">{waitlisting ? 'Joining…' : 'Join the waitlist'}</button>}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-ink-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-ink-200 px-5 text-sm font-bold text-ink-700 hover:bg-ink-50">Cancel</button>
          <button type="button" onClick={apply} disabled={!city || !live || pinState.busy} className="h-11 flex-1 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">Use this location</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
