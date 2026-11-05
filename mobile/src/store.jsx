import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from './services/authService.js'
import {
  VENDORS0, LISTINGS0, BOOKINGS0, RFQS0, LEADS0, CASES0, APPEALS0, USERS0, STAFF0, AGENTS0, AUDIT0,
  NOTIFS0, THREADS0, SETTINGS0, REVIEWS0, SUB_EVENTS, CAMPAIGNS0, ME, ME_C, MY_LOC, isPublished, gatesFor,
} from './data.jsx'
import { GEO, CONTRACTS0, PAYMENTS0, PAYOUTS0, COMMISSION0, CAT_REQUESTS0, CUR, TAX0, INVOICES0, REFUNDS0, WALLET0, BANKS0 } from './globaldata.jsx'
import { ORDERS0, TEAM0, TASKS0, COMPANY0 } from './mvpdata.jsx'
import { BOOKINGS_EXTRA, RFQS_EXTRA } from './mvpseed.jsx'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const stamp = () => {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${String(h).padStart(2, '0')}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}
export const NOW_LABEL = '19 Oct, 01:25 PM'

/* English / Hindi dictionary (spec §2.1 — launch languages; language-neutral state codes are kept in data) */
const DICT = {
  en: {
    home: 'Home', explore: 'Explore', activity: 'Activity', messages: 'Messages', profile: 'Profile',
    dashboard: 'Dashboard', work: 'Work', listings: 'Listings', buy: 'Buy', more: 'More', leads: 'Leads', followups: 'Follow-ups', performance: 'Performance',
    approvals: 'Queues', users: 'Users', reports: 'Analytics', company: 'Company', services: 'Services', orders: 'Orders',
    hello: 'Hello', whatNeed: 'Find a trusted vendor near you', searchPh: 'Search services, vendors or a pincode',
    categories: 'Categories', seeAll: 'See all', featured: 'Verified vendors near you', sponsoredLabel: 'Sponsored',
    rfqTitle: 'Need a quote for a bigger job?', rfqBody: 'Describe the work once and compare structured quotations from eligible vendors.', rfqCta: 'Request quotation',
    login: 'Log in', welcomeTitle: 'Every vendor. Every industry. Worldwide.',
    welcomeBody: 'The global marketplace for every industry — find service providers, suppliers, manufacturers and contractors, then book, request quotes or sign contracts.',
    browse: 'Browse without login', language: 'Language', logout: 'Log out', book: 'Request booking', rfq: 'Request quote',
    bookings: 'Bookings', quotes: 'Quotes', subscription: 'Subscription', switchVendor: 'Switch to vendor mode', switchCustomer: 'Switch to customer mode',
  },
  hi: {
    home: 'होम', explore: 'खोजें', activity: 'गतिविधि', messages: 'संदेश', profile: 'प्रोफ़ाइल',
    dashboard: 'डैशबोर्ड', work: 'काम', listings: 'लिस्टिंग', buy: 'खरीदें', more: 'और', leads: 'लीड्स', followups: 'फॉलो-अप', performance: 'प्रदर्शन',
    approvals: 'कतारें', users: 'यूज़र', reports: 'एनालिटिक्स', company: 'कंपनी', services: 'सेवाएँ', orders: 'ऑर्डर',
    hello: 'नमस्ते', whatNeed: 'अपने पास भरोसेमंद वेंडर खोजें', searchPh: 'सेवा, वेंडर या पिनकोड खोजें',
    categories: 'श्रेणियां', seeAll: 'सभी देखें', featured: 'आपके पास सत्यापित वेंडर', sponsoredLabel: 'प्रायोजित',
    rfqTitle: 'बड़े काम के लिए कोटेशन चाहिए?', rfqBody: 'काम एक बार बताएं और योग्य वेंडर के कोटेशन की तुलना करें।', rfqCta: 'कोटेशन माँगें',
    login: 'लॉग इन', welcomeTitle: 'हर वेंडर। हर उद्योग। पूरी दुनिया।',
    welcomeBody: 'हर उद्योग के लिए वैश्विक मार्केटप्लेस — सेवा प्रदाता, सप्लायर, निर्माता और ठेकेदार खोजें; बुक करें, कोटेशन माँगें या अनुबंध करें।',
    browse: 'बिना लॉगिन के देखें', language: 'भाषा', logout: 'लॉग आउट', book: 'बुकिंग माँगें', rfq: 'कोटेशन माँगें',
    bookings: 'बुकिंग', quotes: 'कोटेशन', subscription: 'सब्सक्रिप्शन', switchVendor: 'वेंडर मोड में जाएं', switchCustomer: 'ग्राहक मोड में जाएं',
  },
}
/* Hindi labels for the state codes shown in badges (codes themselves stay language-neutral) */
export const STATE_HI = {
  requested: 'अनुरोध भेजा', confirmed: 'पुष्टि हुई', declined: 'अस्वीकृत', expired: 'समय समाप्त', in_progress: 'जारी है', awaiting: 'पुष्टि की प्रतीक्षा', closed: 'बंद', cancelled: 'रद्द',
  open: 'खुला', accepted: 'स्वीकृत', approved: 'स्वीकृत', rejected: 'अस्वीकृत', pending: 'लंबित',
}

export function AppProvider({ children, initialMe }) {
  const [me, setMe] = useState(initialMe || { role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '', hasVendor: true, bizId: null })
  useEffect(() => { if (!me.loggedIn) authService.endSession() }, [me.loggedIn])
  const [lang, setLang] = useState('en')
  const [loc, setLoc] = useState(MY_LOC)
  const [vendors, setVendors] = useState(VENDORS0)
  const [listings, setListings] = useState(LISTINGS0)
  const [bookings, setBookings] = useState([...BOOKINGS0, ...BOOKINGS_EXTRA, { id: 'BKG-2095', listingId: 'l19', vendorId: 'v12', customer: 'Rakesh Sharma', date: '23 Oct 2026', slot: '11:00 AM', tz: 'IST', addr: 'Video consult', notes: 'GST notice reply for my firm.', state: 'confirmed', price: 'From ₹1,500 per month', policy: 'standard', req: 'REQ-80', history: [{ s: 'requested', at: '18 Oct, 05:00 PM', by: 'Rakesh Sharma' }, { s: 'confirmed', at: '18 Oct, 06:10 PM', by: 'Mehra & Associates (CA)' }] }])
  const [rfqs, setRfqs] = useState([...RFQS0, ...RFQS_EXTRA])
  const [leads, setLeads] = useState(LEADS0)
  const [cases, setCases] = useState(CASES0)
  const [appeals, setAppeals] = useState(APPEALS0)
  const [users, setUsers] = useState(USERS0)
  const [staff, setStaff] = useState(STAFF0)
  const [agents, setAgents] = useState(AGENTS0)
  const [audit, setAudit] = useState(AUDIT0)
  const [notifs, setNotifs] = useState(NOTIFS0)
  const [threads, setThreads] = useState({ ...THREADS0, customer: [...THREADS0.customer.map((t) => ({ owner: ME_C, ...t })), { id: 't9', owner: 'Rakesh Sharma', name: 'Mehra & Associates (CA)', vendorId: 'v12', link: { type: 'booking', id: 'BKG-2095', label: 'Booking BKG-2095' }, listingId: 'l19', unread: 0, contact: false, msgs: [{ f: 'them', t: 'Confirmed for 23 Oct, 11 AM on video. Please keep the notice copy ready.', at: '18 Oct' }] }] })
  const [settings, setSettings] = useState(SETTINGS0)
  const [reviews, setReviews] = useState(REVIEWS0)
  const [subEvents, setSubEvents] = useState(SUB_EVENTS)
  const [campaigns, setCampaigns] = useState(CAMPAIGNS0)
  const [saved, setSaved] = useState(['v2', 'v20', 'v12'])
  const [compare, setCompare] = useState([])
  const [toastMsg, setToast] = useState(null)
  const [reviewed, setReviewed] = useState([])
  const [prefs, setPrefs] = useState({ booking: true, rfq: true, messages: true, saved: true, promos: false })
  const [contactShare, setContactShare] = useState({ t5: true })
  const [deletion, setDeletion] = useState(null)
  const [geo, setGeo] = useState(GEO)
  const [contracts, setContracts] = useState(CONTRACTS0)
  const [payments, setPayments] = useState(PAYMENTS0)
  const [payouts, setPayouts] = useState(PAYOUTS0)
  const [commission, setCommission] = useState(COMMISSION0)
  const [catRequests, setCatRequests] = useState(CAT_REQUESTS0)
  const [waitlist, setWaitlist] = useState([])
  const [dispCur, setDispCur] = useState('local')
  const [customCats, setCustomCats] = useState([])
  const [taxes, setTaxes] = useState(TAX0)
  const [orders, setOrders] = useState(ORDERS0)
  const [team, setTeam] = useState(TEAM0)
  const [companies, setCompanies] = useState(COMPANY0)
  const [tasks, setTasks] = useState(TASKS0)
  const [journey, setJourney] = useState(null)
  const [catsVer, setCatsVer] = useState(0)
  const [invoices, setInvoices] = useState(INVOICES0)
  const [refunds, setRefunds] = useState(REFUNDS0)
  const [wallet, setWallet] = useState(WALLET0)
  const [banks, setBanks] = useState(BANKS0)

  const toast = useCallback((msg, tone = 'ok') => {
    const id = Date.now()
    setToast({ msg, tone, id })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2800)
  }, [])

  const addAudit = useCallback((action, target, kind = 'enforcement', reason = '', actor = ME.admin) => {
    setAudit((a) => [{ id: 'a' + Date.now() + Math.random(), actor, action, target, at: stamp(), kind, reason, corr: 'c-' + Math.random().toString(16).slice(2, 6) }, ...a])
  }, [])
  const notify = useCallback((role, title, body, type = 'booking', to) => {
    setNotifs((n) => ({ ...n, [role]: [{ id: 'n' + Date.now() + Math.random(), type, title, body, time: 'Just now', read: false, to }, ...(n[role] || [])] }))
  }, [])
  const patch = useCallback((setter) => (id, changes) => setter((l) => l.map((x) => (x.id === id ? { ...x, ...(typeof changes === 'function' ? changes(x) : changes) } : x))), [])

  const api = useMemo(() => {
    const t = (k) => DICT[lang][k] ?? DICT.en[k] ?? k
    const vendor = (id) => vendors.find((v) => v.id === id)
    const isVerified = (id) => vendor(id)?.ver === 'approved' && !vendor(id)?.docs.some((d) => d.status === 'expired')
    const published = (l) => isPublished(l, vendor(l.vendorId))
    const gates = (l) => gatesFor(l, vendor(l.vendorId))
    const mine = me.role === 'vendor' ? listings.filter((l) => l.vendorId === me.vendorId) : []
    return {
      me, setMe, lang, setLang, t, toast, toastMsg, addAudit, notify, loc, setLoc,
      vendors, setVendors, vendor, isVerified, patchVendor: patch(setVendors),
      listings, setListings, patchListing: patch(setListings), published, gates, mine,
      bookings, setBookings, patchBooking: patch(setBookings),
      rfqs, setRfqs, patchRfq: patch(setRfqs),
      leads, setLeads, patchLead: patch(setLeads),
      cases, setCases, patchCase: patch(setCases), appeals, setAppeals, patchAppeal: patch(setAppeals),
      users, setUsers, patchUser: patch(setUsers), staff, setStaff, agents, setAgents,
      audit, notifs, setNotifs, threads, setThreads, settings, setSettings,
      reviews, setReviews, reviewed, setReviewed, subEvents, setSubEvents, campaigns, setCampaigns, patchCampaign: patch(setCampaigns),
      saved, setSaved, compare, setCompare, prefs, setPrefs, contactShare, setContactShare, deletion, setDeletion,
      toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      toggleCompare: (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id])),
      stamp,
      orders, setOrders, patchOrder: patch(setOrders), companies, setCompanies, saveCompany: (id, ch) => setCompanies((c) => ({ ...c, [id]: { ...(c[id] || { id }), ...ch } })), team, setTeam, tasks, setTasks, patchTask: patch(setTasks), journey, setJourney, catsVer, touchCats: () => setCatsVer((v) => v + 1),
      taxes, setTaxes, invoices, setInvoices, refunds, setRefunds, patchRefund: patch(setRefunds), wallet, setWallet, banks, setBanks, patchBank: patch(setBanks),
      geo, setGeo, contracts, setContracts, patchContract: patch(setContracts), payments, setPayments, payouts, setPayouts, commission, setCommission, catRequests, setCatRequests, patchCatRequest: patch(setCatRequests), waitlist, setWaitlist, dispCur, setDispCur, customCats, setCustomCats,
      /* Simulated billing-provider callbacks: every change recomputes publication for all of the vendor's listings */
      setSubStatus: (vendorId, status, extra = {}) => {
        setVendors((vs) => vs.map((v) => (v.id === vendorId ? { ...v, sub: { ...v.sub, status, ...extra } } : v)))
      },
    }
  }, [me, lang, loc, vendors, listings, bookings, rfqs, leads, cases, appeals, users, staff, agents, audit, notifs, threads, settings, reviews, reviewed, subEvents, campaigns, saved, compare, toastMsg, prefs, contactShare, deletion, geo, contracts, payments, payouts, commission, catRequests, waitlist, dispCur, customCats, orders, companies, team, tasks, journey, catsVer, taxes, invoices, refunds, wallet, banks, toast, addAudit, notify, patch])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
