import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Building2, ChevronLeft, ChevronRight, FileText, Heart, MapPin, MessageCircle, Package, Search, ShieldCheck, Sparkles, Star, Store } from 'lucide-react'
import { COUNTRY_SETTINGS, useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, cat } from '../data.jsx'
import { Avatar, Button, Card, Thumb, cx, fmt, GRAD } from '../ui.jsx'
import './website-home.css'

const vendorCover = (v) => v.cover || ({ elec: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80', build: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80', office: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80', clean: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80' }[v.cat] || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80')

const COVERAGE = [
  ['local', 'Local', 'Near your city'],
  ['nationwide', 'Nationwide', 'Across your country'],
  ['worldwide', 'Worldwide', 'International suppliers'],
  ['remote', 'Remote', 'Work from anywhere'],
]
const VENDOR_TYPES = ['Service providers', 'Contractors', 'Manufacturers / OEM', 'Suppliers & distributors', 'Wholesalers & exporters', 'Rental & equipment', 'Professional & IT agencies']
const LANDING_SHOWCASE = [
  { src: '/screens/global-business-network-interface.png', alt: 'VendorVerse global business network with trusted vendors and worldwide connections' },
]

function HeroMotion() {
  const stageRef = useRef(null)
  const tiltRef = useRef(null)
  useEffect(() => {
    const stage = stageRef.current
    const tilt = tiltRef.current
    const hero = stage?.closest('.vv-market-hero')
    if (!hero || !tilt || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (event) => {
      const rect = hero.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - .5
      const y = (event.clientY - rect.top) / rect.height - .5
      tilt.style.setProperty('--vv-ry', `${x * 40}deg`)
      tilt.style.setProperty('--vv-rx', `${-18 - y * 24}deg`)
    }
    const reset = () => { tilt.style.setProperty('--vv-ry', '0deg'); tilt.style.setProperty('--vv-rx', '-18deg') }
    hero.addEventListener('mousemove', move)
    hero.addEventListener('mouseleave', reset)
    return () => { hero.removeEventListener('mousemove', move); hero.removeEventListener('mouseleave', reset) }
  }, [])
  return (
    <div ref={stageRef} className="vv-hero-stage" aria-hidden="true">
      <div ref={tiltRef} className="vv-hero-tilt"><div className="vv-hero-scene">
        <div className="vv-hero-ring" /><div className="vv-hero-ring vv-hero-ring-b" /><div className="vv-hero-ring vv-hero-ring-c" />
        <div className="vv-hero-cube">{Array.from({ length: 6 }, (_, i) => <div className="vv-hero-cube-face" key={i}><svg viewBox="0 0 40 36"><path d="M2 3h9l9 20 9-20h9L24 33h-8z" fill="#fff" /></svg></div>)}</div>
        <div className="vv-hero-orbit">{[[0, ShieldCheck], [90, Package], [180, Store], [270, Building2]].map(([angle, Icon]) => <div className="vv-hero-node" style={{ '--node-angle': `${angle}deg` }} key={angle}><span className="vv-hero-node-icon"><Icon size={18} /></span></div>)}</div>
      </div></div>
    </div>
  )
}

function HeroImageCarousel() {
  const [active, setActive] = useState(0)
  const change = (step) => setActive((current) => (current + step + LANDING_SHOWCASE.length) % LANDING_SHOWCASE.length)
  useEffect(() => {
    if (LANDING_SHOWCASE.length < 2) return undefined
    const timer = window.setInterval(() => setActive((current) => (current + 1) % LANDING_SHOWCASE.length), 5200)
    return () => window.clearInterval(timer)
  }, [])
  return <div className="vv-hero-showcase" aria-label="VendorVerse platform preview" aria-live={LANDING_SHOWCASE.length > 1 ? 'polite' : 'off'}>
    {LANDING_SHOWCASE.map((image, index) => <img key={image.src} className={cx('vv-hero-image', index === active && 'is-active')} src={image.src} alt={image.alt} fetchPriority="high" decoding="async" />)}
    {LANDING_SHOWCASE.length > 1 && <>
      <button type="button" className="vv-hero-showcase-arrow vv-hero-showcase-arrow-left" onClick={() => change(-1)} aria-label="Show previous preview"><ChevronLeft size={18} /></button>
      <button type="button" className="vv-hero-showcase-arrow vv-hero-showcase-arrow-right" onClick={() => change(1)} aria-label="Show next preview"><ChevronRight size={18} /></button>
      <div className="vv-hero-showcase-dots">
        {LANDING_SHOWCASE.map((image, index) => <button key={image.src} type="button" className={cx(index === active && 'is-active')} onClick={() => setActive(index)} aria-label={`Show preview ${index + 1}`} aria-pressed={index === active} />)}
      </div>
    </>}
  </div>
}

function FeaturedVendorCard({ vendor, nav }) {
  return <Card onClick={() => nav.go('c_vendor', { id: vendor.id })} className="group overflow-hidden !p-0 transition hover:-translate-y-1 hover:shadow-xl"><div className={cx('relative h-28 bg-gradient-to-br', GRAD[vendor.tone])}><div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" /><span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-ink-900"><Star size={13} className="fill-amber-400 text-amber-400" />{vendor.rating.toFixed(1)}</span></div><div className="px-4 pb-4"><div className="-mt-7 grid size-14 place-items-center rounded-2xl border-4 border-white bg-white shadow"><Avatar name={vendor.name} size={42} /></div><h3 className="mt-2 truncate font-extrabold text-ink-900">{vendor.name}</h3><p className="text-xs font-semibold text-brand-700">{vendor.country || 'India'} · Global vendor</p><p className="mt-1 text-sm text-ink-500">{cat(vendor.cat).name} · {vendor.city}</p><div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs"><span className="inline-flex items-center gap-1 font-bold text-emerald-700"><BadgeCheck size={15} /> Verified</span><span className="text-ink-500">{vendor.reviews} reviews</span></div></div></Card>
}

function PopularListingCard({ listing, vendor, nav, saved, toggleSaved }) {
  return <article className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:-translate-y-1 hover:shadow-xl"><button onClick={() => nav.go('c_listing', { id: listing.id })} className="relative flex h-40 w-full items-center justify-center bg-ink-50"><Thumb tone={listing.tone} icon={cat(listing.cat).icon} size={82} /><span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink-600">{cat(listing.cat).name}</span></button><div className="p-4"><button onClick={() => nav.go('c_listing', { id: listing.id })} className="line-clamp-2 min-h-10 text-left text-sm font-extrabold text-ink-900 hover:text-brand-700">{listing.title}</button><button onClick={() => nav.go('c_vendor', { id: vendor?.id })} className="mt-1 block text-xs text-ink-500 hover:text-brand-700">{vendor?.name || 'Local vendor'} · {vendor?.city}</button><div className="mt-4 flex items-center justify-between"><span className="text-lg font-black text-ink-900">{fmt(listing.price)}<span className="ml-1 text-xs font-medium text-ink-500">/{listing.unit}</span></span><button onClick={() => toggleSaved(listing.id)} aria-label={saved.includes(listing.id) ? 'Remove from saved' : 'Save listing'} className={cx('grid size-9 place-items-center rounded-full border transition', saved.includes(listing.id) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-ink-200 text-ink-500 hover:border-rose-200 hover:text-rose-600')}><Heart size={17} className={saved.includes(listing.id) ? 'fill-current' : ''} /></button></div></div></article>
}

function HomeCardGrid({ children }) {
  return <div className="vv-home-card-grid">{children}</div>
}

export function WebsiteHome() {
  const nav = useNav()
  const { me, listings, vendors, saved, toggleSaved, locale, setLocale, t } = useApp()
  const [query, setQuery] = useState('')
  const featured = vendors.filter((v) => v.status === 'approved').sort((a, b) => b.rating - a.rating).slice(0, 4)
  const popular = useMemo(() => listings.filter((l) => l.status === 'approved').sort((a, b) => b.reviews - a.reviews).slice(0, 4), [listings])
  const statusCards = [['statusLoading', 'statusLoadingBody'], ['statusNoMatch', 'statusNoMatchBody'], ['statusAttention', 'statusAttentionBody'], ['statusReview', 'statusReviewBody'], ['statusCompleted', 'statusCompletedBody'], ['statusProtected', 'statusProtectedBody']]
  const search = (e) => { e.preventDefault(); nav.go('c_explore', query.trim() ? { q: query.trim() } : {}) }

  return (
    <div className="vv-c-home h-full overflow-y-auto">
      <section className="vv-market-hero relative overflow-hidden text-white">
        <div className="vv-hero-waves"><div><svg viewBox="0 0 2400 60" preserveAspectRatio="none"><path d="M0 30C150 0 350 60 600 30S1050 0 1200 30C1350 0 1550 60 1800 30S2250 0 2400 30V60H0z" fill="rgba(255,255,255,.5)" /></svg></div><div><svg viewBox="0 0 2400 60" preserveAspectRatio="none"><path d="M0 38C200 10 400 60 600 38S1000 10 1200 38C1400 10 1600 60 1800 38S2200 10 2400 38V60H0z" fill="rgba(255,255,255,.55)" /></svg></div></div>
        <div className="absolute -right-28 -top-32 size-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-[35%] size-[26rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="vv-market-hero-inner relative mx-auto grid max-w-[1440px] items-center gap-10 px-6 py-14 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <span className="vv-hero-tag"><Sparkles size={14} /> {t('marketplaceTag')}</span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[58px]">{t('heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{t('heroBody')}</p>
            <form onSubmit={search} className="vv-market-search mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3"><Search size={20} className="shrink-0 text-ink-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try ‘electrical supplies’ or ‘home cleaning’" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400" /></div>
              <Button type="submit" className="h-12 rounded-xl px-6">{t('searchMarketplace')} <ArrowRight size={17} /></Button>
            </form>
            <div className="vv-market-facts mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/65"><span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {locale.city || 'Jaipur'}, {locale.state || 'Rajasthan'}, {locale.countryName || 'India'}</span><span>Evidence-based verification</span><span>Direct conversations</span></div>
          </div>
          <div className="vv-hero-side relative hidden min-h-[370px] lg:block">
            <HeroImageCarousel />
            <div className="vv-hero-feature-panel absolute right-10 top-8 w-[min(100%,440px)] rotate-2 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-teal-100">{t('globalPicks')}</p><p className="mt-1 text-lg font-extrabold">{t('popularWorldwide')}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-teal-300/20 text-teal-200"><Store size={21} /></span></div>
              <div className="mt-5 space-y-3">
                {popular.slice(0, 3).map((l) => { const vendor = vendors.find((v) => v.id === l.vendorId); return <button key={l.id} onClick={() => nav.go('c_listing', { id: l.id })} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:bg-white/15"><Thumb tone={l.tone} icon={cat(l.cat).icon} size={52} round="rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{l.title}</span><span className="mt-1 flex items-center gap-1 text-xs text-white/65">{vendor?.name || 'Verified vendor'} <BadgeCheck size={13} className="text-teal-300" /></span></span><span className="text-sm font-extrabold">{fmt(l.price)}</span></button> })}
              </div>
              <button onClick={() => nav.go('c_explore')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-bold text-teal-100 hover:bg-white/10">{t('exploreAll')} <ArrowRight size={16} /></button>
            </div>
            <div className="vv-hero-proof absolute bottom-6 left-0 flex items-center gap-3 rounded-2xl border border-white/20 bg-white p-3.5 text-ink-900 shadow-xl"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={22} /></span><span><span className="block text-sm font-extrabold">Verified before they’re featured</span><span className="mt-0.5 block text-xs text-ink-500">Local businesses, reviewed by our team</span></span></div>
          </div>
        </div>
      </section>

      <div className="vv-market-content mx-auto max-w-[1440px] space-y-14 px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <section className="rounded-[2rem] border border-brand-100 bg-brand-50/60 p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">Your discovery location</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">Choose how far you want to search</h2><p className="mt-1 text-sm text-ink-600">Change location here on Home. Currency updates automatically when the country changes.</p></div><div className="grid gap-2 sm:grid-cols-3"><select aria-label="Country" value={locale.countryName || 'India'} onChange={(e) => { const countryName = e.target.value; setLocale({ ...locale, ...COUNTRY_SETTINGS[countryName], countryName }) }} className="h-11 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-brand-200">{Object.keys(COUNTRY_SETTINGS).map((country) => <option key={country}>{country}</option>)}</select><select aria-label="State" value={locale.state || 'Rajasthan'} onChange={(e) => setLocale({ ...locale, state: e.target.value })} className="h-11 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-brand-200"><option>Rajasthan</option><option>Delhi</option><option>Maharashtra</option><option>Bavaria</option><option>Guangdong</option></select><select aria-label="City" value={locale.city || 'Jaipur'} onChange={(e) => setLocale({ ...locale, city: e.target.value })} className="h-11 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-brand-200"><option>Jaipur</option><option>Delhi</option><option>Mumbai</option><option>Berlin</option><option>Shenzhen</option><option>Bengaluru</option></select></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{COVERAGE.map(([id, label, body]) => <button key={id} onClick={() => setLocale({ ...locale, coverage: id })} className={cx('rounded-2xl border p-3 text-left transition', (locale.coverage || 'local') === id ? 'border-brand-500 bg-white shadow-md ring-2 ring-brand-100' : 'border-brand-100 bg-white/60 hover:bg-white')}><span className="block text-sm font-extrabold text-ink-900">{t(label.toLowerCase())}</span><span className="mt-1 block text-xs text-ink-500">{t({ 'Near your city': 'nearCity', 'Across your country': 'acrossCountry', 'International suppliers': 'international', 'Work from anywhere': 'anywhere' }[body])}</span></button>)}</div>
        </section>

        <section><div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">{t('marketplaceTag')}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">{t('universalTitle')}</h2><p className="mt-1 text-sm text-ink-500">{t('universalBody')}</p></div><div className="flex flex-wrap gap-2">{VENDOR_TYPES.map((type) => <button key={type} onClick={() => nav.go('c_explore', { q: type })} className="rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800">{type}</button>)}</div></section>

        <section className="grid gap-3 md:grid-cols-4"><Card className="!border-sky-100 !bg-sky-50/60"><p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">Instant</p><p className="mt-1 text-sm font-extrabold">Book now</p><p className="mt-1 text-xs text-ink-600">For available service providers.</p></Card><Card className="!border-violet-100 !bg-violet-50/60"><p className="text-xs font-extrabold uppercase tracking-wide text-violet-700">Scheduled</p><p className="mt-1 text-sm font-extrabold">Choose a time</p><p className="mt-1 text-xs text-ink-600">Availability and vendor response.</p></Card><Card onClick={() => nav.go('c_rfq_new')} className="!border-amber-100 !bg-amber-50/60"><p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">RFQ</p><p className="mt-1 text-sm font-extrabold">Compare quotations</p><p className="mt-1 text-xs text-ink-600">MOQ, lead time and revisions.</p></Card><Card onClick={() => nav.go('v_explore', { mode: 'all' })} className="!border-emerald-100 !bg-emerald-50/60"><p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">Business buying</p><p className="mt-1 text-sm font-extrabold">Vendor-to-vendor sourcing</p><p className="mt-1 text-xs text-ink-600">Act as buyer and supplier.</p></Card></section>

        <section><div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">{t('progressEyebrow')}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">{t('progressTitle')}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{statusCards.map(([title, body]) => <Card key={title} className="!p-4"><div className="flex items-start gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand-500" /><div><p className="text-sm font-extrabold text-ink-900">{t(title)}</p><p className="mt-1 text-xs leading-relaxed text-ink-500">{t(body)}</p></div></div></Card>)}</div></section>
        <section className="vv-market-categories">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">Browse by need</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">Explore categories</h2></div><button onClick={() => nav.go('c_categories')} className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">All categories <ArrowRight size={16} /></button></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATS.slice(0, 6).map((c) => <button key={c.id} onClick={() => nav.go('c_category', { id: c.id })} className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"><Thumb tone={c.tone} icon={c.icon} size={46} round="rounded-xl" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-ink-900">{c.name}</span><span className="mt-0.5 block text-xs text-ink-500">{c.type === 'service' ? 'Services' : 'Products'}</span></span></button>)}
          </div>
        </section>

        <section className="vv-market-vendors">
          <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">Chosen for quality</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">Featured verified vendors</h2></div><button onClick={() => nav.go('c_explore', { mode: 'vendors' })} className="flex items-center gap-1 text-sm font-bold text-brand-700">Browse vendors <ArrowRight size={16} /></button></div>
           <HomeCardGrid>
           <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((v) => <Card key={v.id} onClick={() => nav.go('c_vendor', { id: v.id })} className="group overflow-hidden !p-0 transition hover:-translate-y-1 hover:shadow-xl"><div className={cx('relative h-28 bg-gradient-to-br', GRAD[v.tone])}><div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" /><span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-ink-900"><Star size={13} className="fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}</span></div><div className="px-4 pb-4"><div className="-mt-7 grid size-14 place-items-center rounded-2xl border-4 border-white bg-white shadow"><Avatar name={v.name} size={42} /></div><h3 className="mt-2 truncate font-extrabold text-ink-900">{v.name}</h3><p className="text-xs font-semibold text-brand-700">{v.country || 'India'} · Global vendor</p><p className="mt-1 text-sm text-ink-500">{cat(v.cat).name} · {v.city}</p><div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs"><span className="inline-flex items-center gap-1 font-bold text-emerald-700"><BadgeCheck size={15} /> Verified</span><span className="text-ink-500">{v.reviews} reviews</span></div></div></Card>)}
           </div>
           </HomeCardGrid>
         </section>

        <section className="rounded-[2rem] bg-ink-50 p-6 sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-10"><div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">For larger requirements</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">One request. Multiple quotations.</h2><p className="mt-2 text-sm leading-relaxed text-ink-600">Share what you need and compare responses from vendors that fit your requirements.</p></div><div className="mt-5 flex flex-wrap gap-3 lg:mt-0"><Button onClick={() => nav.go('c_rfq_new')}><FileText size={17} /> Create an RFQ</Button><Button variant="secondary" onClick={() => nav.go('messages')}><MessageCircle size={17} /> Talk to vendors</Button></div></section>

        <section>
          <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-700">Popular this week</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">Products and services</h2></div><button onClick={() => nav.go('c_explore')} className="flex items-center gap-1 text-sm font-bold text-brand-700">View marketplace <ArrowRight size={16} /></button></div>
           <HomeCardGrid>
           <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {popular.map((l) => { const v = vendors.find((x) => x.id === l.vendorId); return <article key={l.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:-translate-y-1 hover:shadow-xl"><button onClick={() => nav.go('c_listing', { id: l.id })} className="relative flex h-40 w-full items-center justify-center bg-ink-50"><Thumb tone={l.tone} icon={cat(l.cat).icon} size={82} /><span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink-600">{cat(l.cat).name}</span></button><div className="p-4"><button onClick={() => nav.go('c_listing', { id: l.id })} className="line-clamp-2 min-h-10 text-left text-sm font-extrabold text-ink-900 hover:text-brand-700">{l.title}</button><button onClick={() => nav.go('c_vendor', { id: v?.id })} className="mt-1 block text-xs text-ink-500 hover:text-brand-700">{v?.name || 'Local vendor'} · {v?.city}</button><div className="mt-4 flex items-center justify-between"><span className="text-lg font-black text-ink-900">{fmt(l.price)}<span className="ml-1 text-xs font-medium text-ink-500">/{l.unit}</span></span><button onClick={() => toggleSaved(l.id)} aria-label={saved.includes(l.id) ? 'Remove from saved' : 'Save listing'} className={cx('grid size-9 place-items-center rounded-full border transition', saved.includes(l.id) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-ink-200 text-ink-500 hover:border-rose-200 hover:text-rose-600')}><Heart size={17} className={saved.includes(l.id) ? 'fill-current' : ''} /></button></div></div></article> })}
           </div>
           </HomeCardGrid>
         </section>

        <footer className="flex flex-col gap-4 border-t border-ink-100 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 VendorVerse · Products, services and quotations</span><div className="flex gap-5"><button onClick={() => nav.go('c_cases')} className="hover:text-brand-700">Help & support</button><button onClick={() => nav.go(me.guest ? 'login' : 'c_profile')} className="hover:text-brand-700">{me.guest ? 'Sign in' : 'My account'}</button></div></footer>
      </div>
    </div>
  )
}
