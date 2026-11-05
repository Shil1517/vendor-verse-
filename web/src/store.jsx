import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  VENDORS0, LISTINGS0, ORDERS0, BOOKINGS0, RFQS0, LEADS0, COMMISSIONS0, DISPUTES0, USERS0, AGENTS0, AUDIT0,
  NOTIFS0, THREADS0, SETTINGS0, REVIEWS0, CONTRACTS0, COMPANY_ORDERS0, ME,
} from './data.jsx'
import { CATS } from './data.jsx'
import { clearState, loadState, saveState } from './services/browserRepository.js'
import { COMPANIES_SEED } from './bizdata.js'
import { can, ownsCustomerRecord, ownsVendor } from './services/authorization.js'
import { authService } from './services/authService.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const stamp = () => {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${String(h).padStart(2, '0')}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

/* Hindi / English dictionary (SRS §4 Localization). Covers navigation + headline strings. */
const DICT = {
  en: {
    home: 'Home', explore: 'Explore', activity: 'Activity', quotes: 'Quotes', messages: 'Messages', profile: 'Profile',
    dashboard: 'Dashboard', work: 'Work', listings: 'Listings', more: 'More', leads: 'Leads', followups: 'Follow-ups', earnings: 'Earnings', performance: 'Performance',
    approvals: 'Approvals', users: 'Users', reports: 'Reports', buy: 'Buy', company: 'Company',
    hello: 'Hello', whatNeed: 'What do you need today?', searchPh: 'Search vendors, products, services',
    categories: 'Categories', seeAll: 'See all', featured: 'Top verified vendors', popular: 'Popular right now',
    rfqTitle: 'Need a bulk quote?', rfqBody: 'Post a requirement and get quotations from verified vendors.', rfqCta: 'Request quotation',
    login: 'Log in', continue: 'Continue', welcomeTitle: 'One marketplace for products, services & quotes',
    welcomeBody: 'Order products, book services and compare vendor quotations — all in one place.',
    browse: 'Browse without login', language: 'Language', logout: 'Log out',
    local: 'Local', nationwide: 'Nationwide', worldwide: 'Worldwide', remote: 'Remote', nearCity: 'Near your city', acrossCountry: 'Across your country', international: 'International suppliers', anywhere: 'Work from anywhere', searchLocation: 'Search location', location: 'Location', allCategories: 'All categories', allResults: 'All results', products: 'Products', services: 'Services', vendors: 'Vendors', clearAll: 'Clear all', noMatches: 'No matches found', requestQuote: 'Request quotation', marketplaceTag: 'A trusted global marketplace', heroTitle: 'Find the right vendor. Get work moving.', heroBody: 'Discover verified suppliers and service professionals, compare quotations, and talk directly to the people who can help.', searchMarketplace: 'Search marketplace', browseNeed: 'Browse by need', exploreCategories: 'Explore categories', featuredVendors: 'Featured verified vendors', browseVendors: 'Browse vendors', popularProducts: 'Products and services', viewMarketplace: 'View marketplace', universalTitle: 'Find the right kind of partner', universalBody: 'Services, products, sourcing and recurring business relationships in one place.', discoveryTitle: 'Choose how far you want to search', discoveryBody: 'Change location here on Home. Currency updates automatically when the country changes.', progressTitle: 'No confusing dead ends', progressEyebrow: 'Clear progress, at every step', businessBuying: 'Business buying', compareQuotes: 'Compare quotations', scheduled: 'Scheduled', instant: 'Instant', vendorSourcing: 'Vendor-to-vendor sourcing', statusLoading: 'Loading', statusNoMatch: 'No match yet', statusAttention: 'Needs attention', statusReview: 'In review', statusCompleted: 'Completed', statusProtected: 'Protected', globalPicks: 'GLOBAL PICKS', popularWorldwide: 'Popular worldwide', exploreAll: 'Explore all listings', verifiedQuality: 'Chosen for quality', evidenceVerified: 'Verified before they are featured', directConversations: 'Direct conversations', evidenceBased: 'Evidence-based verification', changeLocationHome: 'Change location here on Home. Other pages keep this selection read-only.', locationSearchLabel: 'Search by location', homeSearchPlaceholder: 'Try electrical supplies or home cleaning', statusLoadingBody: 'We are finding matching vendors and will keep your request visible.', statusNoMatchBody: 'No quotes received? Expand coverage or refine the requirement.', statusAttentionBody: 'Rejected, expired, cancelled or payment-failed items show the next action clearly.', statusReviewBody: 'Documents and complaints show who is reviewing them.', statusCompletedBody: 'Eligible completed orders unlock reviews and tax invoice details.', statusProtectedBody: 'Disputes, refunds and settlements remain linked to the order.',
  },
  hi: {
    local: 'स्थानीय', nationwide: 'देशव्यापी', worldwide: 'विश्वव्यापी', remote: 'रिमोट', nearCity: 'आपके शहर के पास', acrossCountry: 'पूरे देश में', international: 'अंतरराष्ट्रीय आपूर्तिकर्ता', anywhere: 'कहीं से भी काम', searchLocation: 'स्थान खोजें', location: 'स्थान', allCategories: 'सभी श्रेणियां', allResults: 'सभी परिणाम', products: 'उत्पाद', services: 'सेवाएं', vendors: 'वेंडर', clearAll: 'सभी हटाएं', noMatches: 'कोई मिलान नहीं मिला', requestQuote: 'कोटेशन मांगें', marketplaceTag: 'एक विश्वसनीय वैश्विक मार्केटप्लेस', heroTitle: 'सही वेंडर खोजें। काम शुरू करें।', heroBody: 'सत्यापित आपूर्तिकर्ताओं और सेवा विशेषज्ञों को खोजें, कोटेशन की तुलना करें और सीधे बात करें।', searchMarketplace: 'मार्केटप्लेस खोजें', browseNeed: 'ज़रूरत के अनुसार खोजें', exploreCategories: 'श्रेणियां देखें', featuredVendors: 'सत्यापित वेंडर', browseVendors: 'वेंडर देखें', popularProducts: 'उत्पाद और सेवाएं', viewMarketplace: 'मार्केटप्लेस देखें', universalTitle: 'सही भागीदार खोजें', universalBody: 'सेवाएं, उत्पाद, सोर्सिंग और नियमित व्यावसायिक संबंध एक ही जगह।', discoveryTitle: 'खोज का दायरा चुनें', discoveryBody: 'स्थान बदलने पर मुद्रा अपने आप अपडेट होगी।', progressTitle: 'कोई भ्रम नहीं', progressEyebrow: 'हर चरण में स्पष्ट प्रगति', businessBuying: 'व्यावसायिक खरीद', compareQuotes: 'कोटेशन की तुलना', scheduled: 'निर्धारित', instant: 'तुरंत', vendorSourcing: 'वेंडर से वेंडर सोर्सिंग', statusLoading: 'लोड हो रहा है', statusNoMatch: 'अभी कोई मिलान नहीं', statusAttention: 'ध्यान आवश्यक', statusReview: 'समीक्षा में', statusCompleted: 'पूरा हुआ', statusProtected: 'सुरक्षित', globalPicks: 'वैश्विक चयन', popularWorldwide: 'दुनियाभर में लोकप्रिय', exploreAll: 'सभी लिस्टिंग देखें', verifiedQuality: 'गुणवत्ता के लिए चुने गए', evidenceVerified: 'फीचर करने से पहले सत्यापित', directConversations: 'सीधी बातचीत', evidenceBased: 'दस्तावेज़ आधारित सत्यापन', changeLocationHome: 'स्थान बदलने के लिए होम का उपयोग करें।', locationSearchLabel: 'स्थान के अनुसार खोजें', homeSearchPlaceholder: 'इलेक्ट्रिकल सप्लाई या होम क्लीनिंग खोजें', statusLoadingBody: 'हम सही वेंडर खोज रहे हैं और आपका अनुरोध दिखाई देता रहेगा।', statusNoMatchBody: 'कोटेशन नहीं मिला? दायरा बढ़ाएं या आवश्यकता बदलें।', statusAttentionBody: 'अस्वीकृत, समाप्त, रद्द या भुगतान-विफल आइटम में अगला कदम दिखेगा।', statusReviewBody: 'दस्तावेज़ और शिकायतों की समीक्षा की स्थिति दिखाई देगी।', statusCompletedBody: 'पूरे हुए ऑर्डर के बाद रिव्यू और टैक्स इनवॉइस उपलब्ध होंगे।', statusProtectedBody: 'विवाद, रिफंड और सेटलमेंट ऑर्डर से जुड़े रहेंगे।',
    home: 'होम', explore: 'खोजें', activity: 'गतिविधि', messages: 'संदेश', profile: 'प्रोफ़ाइल',
    dashboard: 'डैशबोर्ड', work: 'काम', listings: 'लिस्टिंग', more: 'और', leads: 'लीड्स', followups: 'फॉलो-अप', earnings: 'कमाई', performance: 'प्रदर्शन',
    approvals: 'अनुमोदन', users: 'यूज़र', reports: 'रिपोर्ट', buy: 'खरीदें', company: 'कंपनी', services: 'सेवाएं',
    hello: 'नमस्ते', whatNeed: 'आज आपको क्या चाहिए?', searchPh: 'वेंडर, प्रोडक्ट, सेवाएं खोजें',
    categories: 'श्रेणियां', seeAll: 'सभी देखें', featured: 'शीर्ष सत्यापित वेंडर', popular: 'अभी लोकप्रिय',
    rfqTitle: 'थोक में कोटेशन चाहिए?', rfqBody: 'अपनी ज़रूरत पोस्ट करें और सत्यापित वेंडर से कोटेशन पाएं।', rfqCta: 'कोटेशन माँगें',
    login: 'लॉग इन', continue: 'आगे बढ़ें', welcomeTitle: 'प्रोडक्ट, सेवाएं और कोटेशन — एक ही मार्केटप्लेस',
    welcomeBody: 'प्रोडक्ट ऑर्डर करें, सेवाएं बुक करें और वेंडर कोटेशन की तुलना करें।',
    browse: 'बिना लॉगिन के देखें', language: 'भाषा', logout: 'लॉग आउट',
  },
}

export const COUNTRY_SETTINGS = {
  India: { country: 'IN', currency: 'INR', timeZone: 'Asia/Kolkata' },
  'United Arab Emirates': { country: 'AE', currency: 'AED', timeZone: 'Asia/Dubai' },
  'United Kingdom': { country: 'GB', currency: 'GBP', timeZone: 'Europe/London' },
  'United States': { country: 'US', currency: 'USD', timeZone: 'America/New_York' },
  Germany: { country: 'DE', currency: 'EUR', timeZone: 'Europe/Berlin' },
  China: { country: 'CN', currency: 'CNY', timeZone: 'Asia/Shanghai' },
}

export const LOCATION_PRESETS = {
  India: { state: 'Rajasthan', city: 'Jaipur' },
  'United Arab Emirates': { state: 'Dubai', city: 'Dubai' },
  'United Kingdom': { state: 'England', city: 'London' },
  'United States': { state: 'New York', city: 'New York' },
  Germany: { state: 'Bavaria', city: 'Munich' },
  China: { state: 'Guangdong', city: 'Shenzhen' },
}

const normalizeLocale = (value) => {
  const l = value || {}
  const preset = LOCATION_PRESETS[l.countryName] || LOCATION_PRESETS.India
  const states = ['Rajasthan', 'Delhi', 'Maharashtra', 'Dubai', 'England', 'New York', 'Bavaria', 'Guangdong']
  const cities = ['Jaipur', 'Delhi', 'Mumbai', 'Dubai', 'London', 'New York', 'Munich', 'Berlin', 'Shenzhen', 'Shanghai', 'Bengaluru']
  return l.countryName && l.countryName !== 'India' && (states.includes(l.state) || cities.includes(l.city)) ? { ...l, ...preset } : l
}

export function AppProvider({ children, initialMe }) {
  const seed = useMemo(() => ({
    me: { role: 'customer', loggedIn: false, guest: true, vendorId: 'v-me', name: 'Guest', accountState: 'active', buyerMode: false },
    customCategories: [],
    categoryOverrides: {},
    industries: ['Construction & Infrastructure', 'Electrical & Energy', 'Office & Technology', 'Home & Facilities', 'Food & Events', 'Professional Services'],
    lang: 'en', locale: { country: 'IN', countryName: 'India', state: 'Rajasthan', city: 'Jaipur', currency: 'INR', timeZone: 'Asia/Kolkata', coverage: 'local' }, vendors: VENDORS0, listings: LISTINGS0, orders: ORDERS0,
    bookings: BOOKINGS0, rfqs: RFQS0, leads: LEADS0, commissions: COMMISSIONS0, disputes: DISPUTES0, users: USERS0, agents: AGENTS0,
    audit: AUDIT0, notifs: NOTIFS0, threads: THREADS0, settings: SETTINGS0, reviews: REVIEWS0, saved: ['l3', 'l11', 'v7'], compare: [],
    contracts: CONTRACTS0, reviewed: [], prefs: { orders: true, bookings: true, quotes: true, promos: false, quiet: false },
  }), [])
  const restored = useMemo(() => loadState(seed), [seed])
  const [me, setMe] = useState(initialMe || restored.me)
  useEffect(() => { if (!me.loggedIn) authService.endSession() }, [me.loggedIn])
  const [lang, setLang] = useState(restored.lang)
  const [locale, setLocale] = useState(() => normalizeLocale(restored.locale))
  const [vendors, setVendors] = useState(restored.vendors)
  const [listings, setListings] = useState(restored.listings)
  const [orders, setOrders] = useState(restored.orders)
  const [bookings, setBookings] = useState(restored.bookings)
  const [rfqs, setRfqs] = useState(restored.rfqs)
  const [leads, setLeads] = useState(restored.leads)
  const [commissions, setCommissions] = useState(restored.commissions)
  const [disputes, setDisputes] = useState(restored.disputes)
  const [users, setUsers] = useState(restored.users)
  const [agents, setAgents] = useState(restored.agents)
  const [audit, setAudit] = useState(restored.audit)
  const [notifs, setNotifs] = useState(restored.notifs)
  const [threads, setThreads] = useState(restored.threads)
  const [settings, setSettings] = useState(restored.settings)
  const [reviews, setReviews] = useState(restored.reviews)
  const [saved, setSaved] = useState(restored.saved)
  const [compare, setCompare] = useState(restored.compare)
  const [toastMsg, setToast] = useState(null)
  const [contracts, setContracts] = useState(restored.contracts || CONTRACTS0)
  const [waitlist, setWaitlist] = useState(restored.waitlist || [])
  const [companies, setCompanies] = useState(restored.companies || COMPANIES_SEED)
  const [companyOrders, setCompanyOrders] = useState(restored.companyOrders || COMPANY_ORDERS0)
  const [appeals, setAppeals] = useState(restored.appeals || [])
  const [subEvents, setSubEvents] = useState(restored.subEvents || [{ id: 'e1', vendorId: 'v-me', ev: 'Renewal paid', at: '14 Oct 2026', res: 'Plan active for another month', tone: 'green' }, { id: 'e2', vendorId: 'v-me', ev: 'Invoice generated', at: '14 Oct 2026', res: 'Tax invoice available', tone: 'gray' }])
  const [reviewed, setReviewed] = useState(restored.reviewed)
  const [prefs, setPrefs] = useState(restored.prefs)
  const [customCategories, setCustomCategories] = useState(restored.customCategories || [])
  const [categoryOverrides, setCategoryOverrides] = useState(restored.categoryOverrides || {})
  const [industries, setIndustries] = useState(restored.industries || [])

  useEffect(() => {
    saveState({ me, lang, locale, vendors, listings, orders, bookings, rfqs, leads, commissions, disputes, users, agents, audit, notifs, threads, settings, reviews, saved, compare, reviewed, prefs, customCategories, categoryOverrides, industries, contracts, waitlist, companyOrders, appeals, subEvents, companies })
  }, [me, lang, locale, vendors, listings, orders, bookings, rfqs, leads, commissions, disputes, users, agents, audit, notifs, threads, settings, reviews, saved, compare, reviewed, contracts, prefs, customCategories, categoryOverrides, industries])

  const toast = useCallback((msg, tone = 'ok') => {
    const id = Date.now()
    setToast({ msg, tone, id })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600)
  }, [])

  const addAudit = useCallback((action, target, kind = 'approval', note) => {
    setAudit((a) => [{ id: 'a' + Date.now() + Math.random(), actor: ME.admin, action, target, at: stamp(), kind, note }, ...a])
  }, [])
  const notify = useCallback((role, title, body, type = 'order') => {
    setNotifs((n) => ({ ...n, [role]: [{ id: 'n' + Date.now() + Math.random(), type, title, body, time: 'Just now', read: false }, ...(n[role] || [])] }))
  }, [])
  const patch = useCallback((setter) => (id, changes) => setter((l) => l.map((x) => (x.id === id ? { ...x, ...(typeof changes === 'function' ? changes(x) : changes) } : x))), [])

  const api = useMemo(() => {
    const t = (k) => DICT[lang][k] ?? DICT.en[k] ?? k
    const vendor = (id) => vendors.find((v) => v.id === id)
    const isVerified = (id) => vendor(id)?.status === 'approved'
    return {
      me, setMe, lang, setLang, locale, setLocale, t, toast, toastMsg, addAudit, notify,
      vendors, setVendors, vendor, isVerified, patchVendor: patch(setVendors),
      listings, setListings, patchListing: patch(setListings),
      orders, setOrders, patchOrder: patch(setOrders),
      bookings, setBookings, patchBooking: patch(setBookings),
      rfqs, setRfqs, patchRfq: patch(setRfqs),
      leads, setLeads, patchLead: patch(setLeads),
      commissions, setCommissions, patchCommission: patch(setCommissions),
      disputes, setDisputes, patchDispute: patch(setDisputes),
      contracts, setContracts, patchContract: patch(setContracts), waitlist, setWaitlist, companies, setCompanies, saveCompany: (id, changes) => setCompanies((c) => ({ ...c, [id]: { ...(c[id] || { id }), ...changes } })), companyOrders, setCompanyOrders, patchCompanyOrder: patch(setCompanyOrders), appeals, setAppeals, patchAppeal: patch(setAppeals), subEvents, setSubEvents,
      users, setUsers, patchUser: patch(setUsers),
      agents, setAgents,
      audit, notifs, setNotifs, threads, setThreads,
      settings, setSettings, reviews, setReviews, reviewed, setReviewed,
      categories: [...CATS.map((c) => ({ ...c, ...(categoryOverrides[c.id] || {}) })), ...customCategories.map((c) => ({ ...c, icon: CATS[0].icon }))], customCategories, setCustomCategories, categoryOverrides, setCategoryOverrides,
      industries, setIndustries,
      saved, setSaved, compare, setCompare, prefs, setPrefs,
      toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      toggleCompare: (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id])),
      can: (permission) => can(me, permission),
      ownsVendor: (vendorId) => ownsVendor(me, vendorId),
      ownsCustomerRecord: (record) => ownsCustomerRecord(me, record),
      resetWorkspace: () => { clearState(); window.location.reload() },
      stamp,
    }
  }, [me, lang, locale, vendors, listings, orders, bookings, rfqs, leads, commissions, disputes, users, agents, audit, notifs, threads, settings, reviews, reviewed, contracts, waitlist, companies, companyOrders, appeals, subEvents, saved, compare, toastMsg, prefs, categoryOverrides, industries, waitlist, toast, addAudit, notify, patch])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

