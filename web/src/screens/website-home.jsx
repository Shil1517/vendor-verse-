import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Building2, ChevronLeft, ChevronRight, FileText, Hammer, Heart, Lightbulb, MapPin, MessageCircle, Monitor, Package, Search, ShieldCheck, Sparkles, Star, Store, Truck, Wrench, Zap, X } from 'lucide-react'
import { COUNTRY_SETTINGS, useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { CATS, cat } from '../data.jsx'
import { authService } from '../services/authService.js'
import { Avatar, Button, Card, Thumb, cx, fmt, GRAD } from '../ui.jsx'
import { openAuthDialog } from '../components/MarketplaceAuthDialog.jsx'
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

const HOME_CATEGORIES = [
  { name: 'Plumbing', image: 'plumbing.jpg', search: 'Plumbing', categoryName: 'Home services' },
  { name: 'Electrical & AC repair', image: 'electrical-ac-repair.jpg', search: 'Electrical AC repair', categoryName: 'Home services' },
  { name: 'Home cleaning', image: 'home-cleaning.jpg', search: 'Home cleaning', categoryName: 'Home services' },
  { name: 'Carpentry', image: 'carpentry.jpg', search: 'Carpentry', categoryName: 'Home services' },
  { name: 'Event catering', image: 'event-catering.jpg', search: 'Event catering', categoryName: 'Events' },
  { name: 'Hardware & building materials', image: 'hardware-building-materials.jpg', search: 'Hardware building materials', categoryName: 'Construction' },
  { name: 'Paints & finishing', image: 'paints-finishing.jpg', search: 'Paints finishing', categoryName: 'Construction' },
]
const HOME_PALETTES = [
  ['#EDE6D6','#0E1B2C','#A67C2E'], ['#E3E8E4','#1F5E4D','#D9C08A'], ['#F0E4D8','#8C5A3C','#14243A'], ['#E4E6EC','#2B3F63','#E5D2A5'],
  ['#F3EAD0','#A67C2E','#0E1B2C'], ['#DFE6E8','#34566A','#EAD9B8'], ['#EADCD6','#7A2E3A','#F6EEDF'], ['#E4E8DA','#4F6B3A','#2A2218'],
]
const VENDOR_IMAGES = {
  'Royal Rasoi Caterers': {
    src: '/royal-rasoi-catering-under-130kb.jpg',
    alt: 'Professional catering and buffet setup by Royal Rasoi Caterers',
  },
  'Pink City Hardware Supply': {
    src: '/pink-city-hardware-under-130kb.jpg',
    alt: 'Realistic hardware store interior with building materials and tools at Pink City Hardware Supply',
  },
  'Choudhary Woodworks': {
    src: '/choudhary-woodworks-under-130kb.jpg',
    alt: 'Realistic woodworking workshop with carpenter crafting wooden furniture at Choudhary Woodworks',
  },
}
const DEFAULT_VENDOR_IMAGES = [
  {
    src: '/royal-rasoi-catering-under-130kb.jpg',
    alt: 'Professional catering and buffet setup by Royal Rasoi Caterers',
  },
  {
    src: '/pink-city-hardware-under-130kb.jpg',
    alt: 'Realistic hardware store interior with building materials and tools at Pink City Hardware Supply',
  },
  {
    src: '/choudhary-woodworks-under-130kb.jpg',
    alt: 'Realistic woodworking workshop with carpenter crafting wooden furniture at Choudhary Woodworks',
  },
]
const HOME_VENDOR_SAMPLES = [
  { name:'Royal Rasoi Caterers', category:'Event catering', location:'India, India', level:2, sponsored:false, coverage:'Offers public listings', price:'Offers public listings', ships:'', reviews:'Public vendor', contract:false, image:'/royal-rasoi-catering-under-130kb.jpg', imageAlt:'Professional catering and buffet setup by Royal Rasoi Caterers' },
  { name:'Pink City Hardware Supply', category:'Hardware and building materials', location:'India, India', level:2, coverage:'Offers public listings', price:'Offers public listings', ships:'', reviews:'Public vendor', contract:false, image:'/pink-city-hardware-under-130kb.jpg', imageAlt:'Realistic hardware store interior with building materials and tools at Pink City Hardware Supply' },
  { name:'Apex Fabrication Works', category:'Manufacturer', location:'Pune, India', level:2, coverage:'Ships to your country', price:'Min. order: Not provided', ships:'India, UAE', reviews:'No reviews yet', contract:true },
  { name:'Choudhary Woodworks', category:'Carpentry', location:'India, India', level:2, coverage:'Price on request', price:'Price on request', ships:'', reviews:'Public vendor', contract:false, image:'/choudhary-woodworks-under-130kb.jpg', imageAlt:'Realistic woodworking workshop with carpenter crafting wooden furniture at Choudhary Woodworks' },
  { name:'Meridian Design Remote', category:'Professional services', location:'Lisbon, Portugal', level:1, coverage:'Remote delivery', price:'EUR 60 per hour', ships:'', reviews:'No reviews yet', contract:false },
  { name:'Kestrel Logistics', category:'Logistics', location:'Dubai, UAE', level:3, coverage:'Coverage: UAE, India', price:'Price on request', ships:'UAE, India', reviews:'No reviews yet', contract:true },
  { name:'Oakline Joinery', category:'Construction', location:'Bhopal, India', level:2, coverage:'Serves your city', price:'Price on request', ships:'', reviews:'No reviews yet', contract:false },
  { name:'Pixel Harbour', category:'IT and digital', location:'Bengaluru, India', level:2, coverage:'Remote delivery', price:'Price on request', ships:'', reviews:'4.5 from 9 reviews', contract:true },
]
const HOME_PRODUCTS = [
  { name:'Atlas Structural Fastener Kit', category:'Construction & infrastructure', vendor:'Atlas Industrial Supply Co.', city:'Chicago', price:'840', unit:'kit', icon:Hammer, color:'#A67C2E' },
  { name:'Electrician – Home Wiring & Fault Visit', category:'Home & household services', vendor:'BrightSpark Home Services', city:'Jaipur', price:'399', unit:'visit', icon:Wrench, color:'#2B3F63', featured:true },
  { name:'Sakura Hybrid Office Collaboration Kit', category:'IT, software & digital', vendor:'Sakura Digital Workplace', city:'Tokyo', price:'2,150', unit:'bundle', icon:Monitor, color:'#7A2E3A' },
  { name:'NordicGrid Smart Solar Controller', category:'Wholesale, suppliers & distribution', vendor:'NordicGrid Energy Solutions', city:'Stockholm', price:'1,290', unit:'unit', icon:Zap, color:'#1F5E4D' },
  { name:'Kestrel Pallet Freight Booking', category:'Logistics', vendor:'Kestrel Logistics', city:'Dubai', price:'4,800', unit:'pallet', icon:Truck, color:'#34566A' },
  { name:'Lumen Event Lighting Package', category:'Events', vendor:'Lumen Events Co.', city:'Bhopal', price:'15,000', unit:'event', icon:Lightbulb, color:'#4F6B3A' },
]
const HOME_SEARCHES = ['Interior fit-out', 'Event planning', 'Home cleaning', 'Web development', 'Packaging supplier', 'Freight and logistics']
const HOME_PLACES = [['Use my current location','Asks for permission'],['Bhopal, India','Live'],['Indore, India','Not live yet'],['Dubai, UAE','Not live yet'],['Remote or worldwide','Remote-capable vendors']]
const formatMinorPrice = (price) => {
  if (price?.state === 'on_request') return 'Price on request'
  if (price?.state !== 'stated') return 'Price not provided'
  const amount = price.minMinor ?? price.maxMinor
  if (amount == null) return 'Price not provided'
  const currency = price.currency || 'INR'
  try {
    const digits = new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
    const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount) / (10 ** digits))
    return price.unit ? `${formatted} /${price.unit}` : formatted
  } catch { return `${amount} ${currency}` }
}

function HomeHeroIllustration() {
  return <img className="vv-storefront-illustration" src="/hero-marketplace.jpg" alt="Illustrated marketplace with shops, products, vendors and customers" />
}

function HomeVendorArt({ index }) {
  const [bg, one, two] = HOME_PALETTES[index % HOME_PALETTES.length]
  const mode=(index*3)%3
  return <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="100" height="100" fill={bg}/>{mode===0?<><path d="M22 100V58a28 28 0 0 1 56 0v42z" fill={one}/><circle cx="74" cy="26" r="11" fill={two}/></>:mode===1?<><circle cx="46" cy="54" r="30" fill={one}/><rect x="58" y="60" width="30" height="40" fill={two}/></>:<><rect x="16" y="46" width="30" height="54" fill={one}/><rect x="50" y="26" width="34" height="74" fill={two}/><circle cx="30" cy="30" r="9" fill={one}/></>}</svg>
}

function HomeCategoryArt({ index }) {
  const [bg] = HOME_PALETTES[index % HOME_PALETTES.length]
  const colors=['#A67C2E','#1F5E4D','#7A2E3A','#2B3F63','#C98B6B','#4F6B3A','#D9B66A','#0E1B2C']
  return <svg viewBox="0 0 400 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="290" fill={bg}/>{Array.from({length:5},(_,j)=>{const x=-10+j*86+((index+j)%3)*8,h=120+((index*37+j*53)%110),y=290-h,c=colors[(index+j*3)%8],m=(index+j)%3;return m===0?<path key={j} d={`M${x} 290V${y+41}a41 41 0 0 1 82 0V290z`} fill={c}/>:<g key={j}><rect x={x} y={y} width="82" height={h} rx="6" fill={c}/>{m===2&&<circle cx={x+41} cy={y+30} r="14" fill={bg}/>}</g>})}</svg>
}

export function WebsiteHome() {
  const nav = useNav()
  const { me, toast, locale } = useApp()
  const isRemote = authService.isRemote
  const [query, setQuery] = useState('')
  const [where, setWhere] = useState('Bhopal, India')
  const [suggestField, setSuggestField] = useState('')
  const [detail, setDetail] = useState(null)
  const [savedVendors, setSavedVendors] = useState([])
  const [savedProducts, setSavedProducts] = useState([1])
  const [homeData, setHomeData] = useState({ loading: isRemote, categories: [], listings: [], cityId: null })
  const [remoteFavorites, setRemoteFavorites] = useState([])
  const [compared, setCompared] = useState([])
  const categoryRail = useRef(null)
  const productRail = useRef(null)
  const [categoryEdges, setCategoryEdges] = useState({ start:true, end:false })
  const [productEdges, setProductEdges] = useState({ start:true, end:false })
  useEffect(() => {
    if (!isRemote) return
    let active = true
    const load = async () => {
      const countryCode = locale?.country || 'IN'
      const [citiesResult, categoriesResult] = await Promise.all([
        authService.listCities(countryCode),
        authService.listCategories({ countryCode }),
      ])
      const city = citiesResult.ok ? citiesResult.cities.find((item) => item.name.toLowerCase() === (locale?.city || '').toLowerCase()) : null
      const listingsResult = await authService.searchListings({ countryCode, ...(city ? { cityId: city.id } : {}), limit: 20 })
      if (active) setHomeData({ loading: false, categories: categoriesResult.ok ? categoriesResult.categories : [], listings: listingsResult.ok ? listingsResult.items : [], cityId: city?.id || null })
    }
    load().catch(() => active && setHomeData({ loading: false, categories: [], listings: [], cityId: null }))
    return () => { active = false }
  }, [isRemote, locale?.country, locale?.city])
  useEffect(() => {
    if (!isRemote || !me.loggedIn) { setRemoteFavorites([]); return }
    let active = true
    authService.listFavorites().then((result) => { if (active && result.ok) setRemoteFavorites(result.favorites.map((item) => item.vendorId || item.id)) })
    return () => { active = false }
  }, [isRemote, me.loggedIn])
  const updateEdges = (ref,setEdges) => { const el=ref.current; if(!el)return; setEdges({start:el.scrollLeft<4,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-4}) }
  const slide = (ref, direction, setEdges) => { const el=ref.current; if(!el)return; const card=el.firstElementChild; const step=(card?.getBoundingClientRect().width||300)+20; const amount=Math.max(1,Math.round(el.clientWidth/step))*step; el.scrollBy({left:direction*amount,behavior:'smooth'}); window.setTimeout(()=>updateEdges(ref,setEdges),350) }
  const onSearch = (e) => { e.preventDefault(); setSuggestField(''); nav.go('c_explore', { ...(query.trim()?{q:query.trim()}:{}), location:where.trim() }) }
  const startVendorRegistration = () => {
    if (me.loggedIn) { nav.go('v_register'); return }
    openAuthDialog('signup', 'vendor')
  }
  // Footer links: guests get the sign-in dialog instead of being dropped onto the old standalone login/phone-style pages.
  const goSignedIn = (id) => { if (!me.loggedIn) { openAuthDialog('signin'); return } nav.go(id) }
  const openVendorDashboard = () => {
    if (!me.loggedIn) { openAuthDialog('signin', 'vendor'); return }
    if (['vendor', 'business'].includes(me.role)) { nav.go(me.role === 'business' ? 'b_home' : 'v_dash'); return }
    startVendorRegistration()
  }
  const chooseSuggestion = (value, field) => { if(field==='q'){setQuery(value);setSuggestField('w');document.getElementById('home-where')?.focus()} else {setWhere(value==='Use my current location'?'Near me':value);setSuggestField('');if(value==='Use my current location')toast('Location is used only with your consent and never blocks search.');else if(/Indore|Dubai/.test(value))toast(`${value.split(',')[0]} is not live yet. Showing nearby markets and remote vendors.`)} }
  const suggestions = suggestField==='q' ? HOME_SEARCHES.filter((item)=>!query||item.toLowerCase().includes(query.toLowerCase())).map((item)=>[item,'']) : HOME_PLACES.filter(([item])=>!where||item.toLowerCase().includes(where.toLowerCase())||where.toLowerCase()==='bhopal, india')
  const toggleVendorSaved = async (vendor, index) => {
    if (!isRemote) { const isSaved=savedVendors.includes(index); setSavedVendors((items)=>isSaved?items.filter((item)=>item!==index):[...items,index]); toast(isSaved?'Removed from favorites.':'Saved. The vendor is not notified.'); return }
    if (!me.loggedIn) { openAuthDialog('signin'); return }
    const isSaved = remoteFavorites.includes(vendor.id)
    const result = isSaved ? await authService.removeFavorite(vendor.id) : await authService.addFavorite(vendor.id)
    if (!result.ok) { toast(result.message || 'Could not update favorites.'); return }
    setRemoteFavorites((items) => isSaved ? items.filter((id) => id !== vendor.id) : [...items, vendor.id])
  }
  const toggleProductSaved = async (product, index) => {
    if (isRemote) return toggleVendorSaved({ id: product.vendor.id }, index)
    setSavedProducts((items)=>items.includes(index)?items.filter((item)=>item!==index):[...items,index]);toast(savedProducts.includes(index)?'Removed from favorites.':'Saved. The vendor is not notified.')
  }
  const categories = HOME_CATEGORIES.map((item) => {
    const match = isRemote ? homeData.categories.find((category) => category.name?.trim().toLowerCase() === item.categoryName.toLowerCase()) : null
    return { ...item, ...(match || {}) }
  })
  const vendorCards = isRemote ? [...new Map(homeData.listings.map((listing) => [listing.vendor.id, {
    id: listing.vendor.id,
    name: listing.vendor.name,
    category: listing.categoryName,
    location: locale?.city ? `${locale.city}, ${locale.countryName || locale.country}` : (locale?.countryName || locale?.country),
    coverage: listing.matchedOn.find((match) => match.startsWith('coverage:'))?.slice(9) || 'Available in this market',
    price: listing.price?.state === 'on_request' ? 'Price on request' : listing.price?.state === 'not_provided' ? 'Price not provided' : 'Offers public listings',
    reviews: 'Public vendor',
    level: 0,
    image: VENDOR_IMAGES[listing.vendor.name]?.src,
    imageAlt: VENDOR_IMAGES[listing.vendor.name]?.alt,
  }])).values()].slice(0, 3) : [0,1,3].map((index) => {
    const v = HOME_VENDOR_SAMPLES[index]
    return {
      ...v,
      sampleIndex: index,
      image: v.image || VENDOR_IMAGES[v.name]?.src,
      imageAlt: v.imageAlt || VENDOR_IMAGES[v.name]?.alt,
    }
  })
  const productCards = isRemote ? homeData.listings.slice(0, 12).map((listing) => ({ id: listing.id, title: listing.title, category: listing.categoryName, vendor: listing.vendor, price: listing.price, icon: listing.listingType === 'service' ? Wrench : Package })) : HOME_PRODUCTS
  const toggleCompared = (index) => setCompared((items)=>{if(items.includes(index))return items.filter((item)=>item!==index);if(items.length>=3){toast('You can compare up to three vendors.');return items}return [...items,index]})
  return <div className="vv-c-home vv-mock-home h-full overflow-y-auto">
    <section className="vv-mock-hero">
      <div className="vv-mock-hero-copy"><h1>Find your next trusted vendor.</h1><p>Service providers, contractors, suppliers and manufacturers, verified and ready to work with you, anywhere.</p>
        <form onSubmit={onSearch} onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget))setSuggestField('')}} className="vv-mock-search" role="search" autoComplete="off">
          <label><b>What</b><input id="home-what" value={query} onFocus={()=>setSuggestField('q')} onChange={(e)=>{setQuery(e.target.value);setSuggestField('q')}} placeholder="Vendors, services or products" onKeyDown={(e)=>e.key==='Escape'&&setSuggestField('')}/></label>
          <label><b>Where</b><input id="home-where" value={where} onFocus={()=>setSuggestField('w')} onChange={(e)=>{setWhere(e.target.value);setSuggestField('w')}} placeholder="City, state or country" onKeyDown={(e)=>e.key==='Escape'&&setSuggestField('')}/></label>
          <button className="vv-mock-search-submit" aria-label="Search"><Search size={21}/></button>
          {suggestField&&<div className="vv-mock-suggestions"><div className="vv-mock-suggestions-title">{suggestField==='q'?'Popular searches':'Suggested places'}</div>{suggestions.length?suggestions.map(([value,meta])=><button type="button" key={value} onMouseDown={(e)=>e.preventDefault()} onClick={()=>chooseSuggestion(value,suggestField)}>{value}<small>{meta}</small></button>):<div className="vv-mock-suggestions-empty">No suggestions. Press Enter to search anyway.</div>}</div>}
        </form>
        <div className="vv-mock-hero-actions"><button className="vv-mock-hero-primary" onClick={()=>nav.go('c_explore',{mode:'vendors'})}>Browse new vendors</button><button className="vv-mock-hero-link" onClick={startVendorRegistration}>Are you a vendor? Become a vendor</button></div>
      </div><div className="vv-mock-hero-art"><HomeHeroIllustration/></div>
    </section>
    <main className="vv-mock-content">
      <section className="vv-mock-intro"><div><h2>Every industry. Every vendor type. One marketplace.</h2><p>Customers pay vendors directly. Badges show what was verified, never what was paid for, and missing information is always shown honestly.</p><button className="vv-mock-primary" onClick={()=>nav.go('c_rfq_new')}>Post a request</button></div><div className="vv-mock-modes">{[['Instant','Fixed price, reliable availability.'],['Scheduled','Pick a date. The vendor accepts.'],['RFQ','Compare structured quotations.'],['Contract','Versioned terms, both parties accept.']].map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="vv-mock-how"><div className="vv-mock-how-heading"><div><span className="vv-mock-eyebrow">The VendorVerse way</span><h2>From first search to finished work.</h2></div><p>Everything you need to find the right partner, make a clear decision, and keep the work moving.</p></div><div className="vv-mock-how-grid">{[[Search,'01','Discover the right fit','Search products, services and vendors by what you need and where you need it.'],[ShieldCheck,'02','Choose with confidence','Compare pricing, coverage and verification badges with the details vendors have shared.'],[MessageCircle,'03','Work directly','Request a quote, schedule a booking or start a contract with the vendor you choose.']].map(([Icon,number,title,body])=><article key={number}><span className="vv-mock-step-icon"><Icon size={20}/></span><span className="vv-mock-step-number">{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="vv-mock-category-section"><div className="vv-mock-section-heading vv-mock-category-heading"><h2>Explore categories</h2><div><button aria-label="Previous categories" disabled={categoryEdges.start} onClick={()=>slide(categoryRail,-1,setCategoryEdges)}><ChevronLeft/></button><button aria-label="Next categories" disabled={categoryEdges.end} onClick={()=>slide(categoryRail,1,setCategoryEdges)}><ChevronRight/></button></div></div><div className="vv-mock-category-rail" ref={categoryRail} onScroll={()=>updateEdges(categoryRail,setCategoryEdges)}>{categories.map((category)=><button className="vv-mock-category" key={category.image} onClick={()=>nav.go('c_explore',category.id?{categoryId:category.id}:{q:category.search})}><span className="vv-mock-category-art"><img src={`/category-images/${category.image}`} alt="" loading="lazy" /></span><b>{category.name}</b></button>)}</div></section>
      <section className="vv-mock-vendor-section"><div className="vv-mock-section-heading vv-mock-vendor-heading"><div><h2>{isRemote?'Vendors in this market':'New vendors'}</h2><p>{isRemote?'Vendors with public listings available to browse':'Recently published and verified'}</p></div><button className="vv-mock-text-button" onClick={()=>nav.go('c_explore',{mode:'vendors'})}>See all <ArrowRight size={17}/></button></div><div className="vv-mock-vendors">{vendorCards.map((vendor,index)=>{const sampleIndex=vendor.sampleIndex ?? index; const isSaved=isRemote?remoteFavorites.includes(vendor.id):savedVendors.includes(sampleIndex);return <article className="vv-mock-vendor-card" key={vendor.id || vendor.name}>
        <button className="vv-mock-vendor-image" onClick={()=>isRemote?nav.go('c_vendor',{id:vendor.id}):setDetail({type:'vendor',item:vendor,index:sampleIndex})} aria-label={`Open ${vendor.name}`}>{(()=>{const imgSrc=vendor.image||VENDOR_IMAGES[vendor.name]?.src||DEFAULT_VENDOR_IMAGES[index]?.src;const imgAlt=vendor.imageAlt||VENDOR_IMAGES[vendor.name]?.alt||DEFAULT_VENDOR_IMAGES[index]?.alt||`${vendor.name} photograph`;return imgSrc?<img src={imgSrc} alt={imgAlt} loading="lazy" decoding="async" className="vv-mock-vendor-photo"/>:<HomeVendorArt index={index}/>})()}<span className={`vv-mock-tag ${vendor.sponsored?'is-sponsored':''}`}>{vendor.sponsored?'Sponsored':isRemote?'Public vendor':'New'}</span></button>
        <button className="vv-mock-heart" aria-label={`${isSaved?'Unsave':'Save'} ${vendor.name}`} aria-pressed={isSaved} onClick={()=>toggleVendorSaved(vendor,sampleIndex)}><Heart size={19} fill={isSaved?'currentColor':'none'}/></button>
        <button className="vv-mock-vendor-name" onClick={()=>isRemote?nav.go('c_vendor',{id:vendor.id}):setDetail({type:'vendor',item:vendor,index:sampleIndex})}>{vendor.name}</button><div className="vv-mock-vendor-meta">{vendor.category} · {vendor.location}</div>
        <div className="vv-mock-vendor-badges">{!isRemote&&<span className="vv-mock-tag is-ok">L{vendor.level} {['','Contact verified','Business verified','Credential verified'][vendor.level]}</span>}<span className="vv-mock-tag">{vendor.reviews}</span></div>
        <div className="vv-mock-vendor-coverage">{vendor.coverage}</div><div className="vv-mock-vendor-bottom"><b>{vendor.price}</b>{!isRemote&&<label><input type="checkbox" checked={compared.includes(sampleIndex)} onChange={()=>toggleCompared(sampleIndex)}/> Compare</label>}</div>
      </article>})}{isRemote&&!vendorCards.length&&!homeData.loading&&<p className="vv-mock-empty">No public vendors have listings in this market yet.</p>}</div></section>
      <section className="vv-mock-product-section"><div className="vv-mock-section-heading vv-mock-product-heading"><div><span className="vv-mock-eyebrow">Popular this week</span><h2>Products and services</h2></div><button className="vv-mock-text-button" onClick={()=>nav.go('c_explore')}>View marketplace <ArrowRight size={17}/></button><button className="vv-mock-rail-arrow" aria-label="Previous products" disabled={productEdges.start} onClick={()=>slide(productRail,-1,setProductEdges)}><ChevronLeft/></button><button className="vv-mock-rail-arrow" aria-label="Next products" disabled={productEdges.end} onClick={()=>slide(productRail,1,setProductEdges)}><ChevronRight/></button></div>
        <div className="vv-mock-product-rail" ref={productRail} onScroll={()=>updateEdges(productRail,setProductEdges)}>{productCards.map((product,index)=>{const remote=isRemote; const Icon=product.icon; const name=remote?product.title:product.name; const vendor=remote?product.vendor:{name:product.vendor,city:product.city}; const price=remote?formatMinorPrice(product.price): `₹${product.price}`; const saved=remote?remoteFavorites.includes(product.vendor.id):savedProducts.includes(index); return <article className="vv-mock-product-card" key={product.id || name}>
          <button className="vv-mock-product-main" onClick={()=>remote?nav.go('c_listing',{id:product.id}):setDetail({type:'product',item:product,index})}><span className="vv-mock-product-media"><span className="vv-mock-tag">{product.category}</span><span className="vv-mock-product-icon" style={{'--product-color':remote?'#34566A':product.color}}><Icon size={38} strokeWidth={1.7}/></span></span><span className="vv-mock-product-info"><b>{name}</b><small>{vendor.name}{vendor.city?` · ${vendor.city}`:''}</small><span className="vv-mock-product-price">{price}{!remote&&<small> /{product.unit}</small>}</span></span></button>
          <button className="vv-mock-heart vv-mock-product-heart" aria-label={`${saved?'Unsave':'Save'} ${name}`} aria-pressed={saved} onClick={()=>toggleProductSaved(product,index)}><Heart size={19} fill={saved?'currentColor':'none'}/></button>
        </article>})}</div></section>
      <footer className="vv-mock-footer"><div><b>VENDOR<span>VERSE</span></b><p>Products, services and quotations from verified vendors worldwide.</p></div><div><h3>Marketplace</h3><button onClick={()=>nav.go('c_explore')}>Browse products and services</button><button onClick={()=>nav.go('c_explore',{mode:'vendors'})}>New vendors</button><button onClick={()=>goSignedIn('c_rfq_new')}>Post a request</button></div><div><h3>Vendors</h3><button onClick={startVendorRegistration}>Become a vendor</button><button onClick={openVendorDashboard}>Vendor dashboard</button></div><div><h3>Support</h3><button onClick={()=>goSignedIn('c_cases')}>Help &amp; support</button><button onClick={()=>goSignedIn('c_profile')}>My account</button><button onClick={()=>goSignedIn('c_profile')}>Terms &amp; privacy</button></div><div className="vv-mock-footer-bottom"><span>© 2026 VendorVerse · Products, services and quotations</span><button onClick={()=>goSignedIn('c_cases')}>Help &amp; support</button><button onClick={()=>goSignedIn('c_profile')}>My account</button></div><p className="vv-mock-footer-note">Mockup · all vendors, figures and dates are sample data · customers pay vendors directly in Release 1</p></footer>
    </main>
    {detail&&<div className="vv-mock-dialog-backdrop" role="presentation" onMouseDown={(e)=>e.target===e.currentTarget&&setDetail(null)}><section className="vv-mock-dialog" role="dialog" aria-modal="true" aria-label={detail.item.name}><div className="vv-mock-dialog-visual">{detail.type==='vendor'?<HomeVendorArt index={detail.index}/>:<span className="vv-mock-product-icon" style={{'--product-color':detail.item.color}}>{(()=>{const Icon=detail.item.icon;return <Icon size={64} strokeWidth={1.6}/>})()}</span>}</div><div className="vv-mock-dialog-content"><div className="vv-mock-dialog-top"><span className="vv-mock-tag is-ok">{detail.type==='vendor'?`L${detail.item.level} ${['','Contact verified','Business verified','Credential verified'][detail.item.level]}`:detail.item.category}</span><button aria-label="Close details" onClick={()=>setDetail(null)}><X size={18}/></button></div><h2>{detail.item.name}</h2><p className="vv-mock-dialog-subtitle">{detail.type==='vendor'?`${detail.item.category} · ${detail.item.location}`:`${detail.item.vendor} · ${detail.item.city}`}</p>{detail.type==='vendor'?<table><tbody><tr><td>Coverage</td><td>{detail.item.coverage}</td></tr><tr><td>Ships to</td><td>{detail.item.ships||'Not applicable'}</td></tr><tr><td>Pricing</td><td>{detail.item.price}</td></tr><tr><td>Reviews</td><td>{detail.item.reviews}</td></tr><tr><td>Availability</td><td>Not listed</td></tr><tr><td>Booking</td><td>RFQ{detail.item.contract?', Contract':''}</td></tr></tbody></table>:<table><tbody><tr><td>Price tiers</td><td>₹{detail.item.price} (1–499) · ₹{Math.round(Number(detail.item.price.replace(',',''))*.94).toLocaleString('en-IN')} (500–999) · ₹{Math.round(Number(detail.item.price.replace(',',''))*.9).toLocaleString('en-IN')} (1,000+)</td></tr><tr><td>Minimum order</td><td>500 /{detail.item.unit}</td></tr><tr><td>Lead time</td><td>21 days</td></tr><tr><td>Ships to</td><td>India, UAE</td></tr><tr><td>Certifications</td><td>ISO 9001 (verified)</td></tr></tbody></table>}<div className="vv-mock-dialog-actions"><button className="vv-mock-primary" onClick={()=>{setDetail(null);nav.go(detail.type==='vendor'?'c_rfq_new':'c_rfq_new')}}>Request quote</button>{detail.type==='product'&&<button onClick={()=>{setDetail(null);toast('Sample request sent.')}}>Request sample</button>}{detail.type==='vendor'&&<button onClick={()=>{setDetail(null);nav.go('c_book_new')}}>Book scheduled</button>}</div></div></section></div>}
  </div>
}
