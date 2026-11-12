import {
  Wrench, HardHat, PartyPopper, Briefcase, Laptop, Factory, Truck, Car, HeartPulse, Sprout, Shirt, FlaskConical, Cpu, UtensilsCrossed, GraduationCap, Landmark, Megaphone, Zap, Pickaxe,
  Building2, Hotel, Sparkles, Dumbbell, Printer, ShieldCheck, Radio, Plane, Ship, Recycle, Gem,
} from 'lucide-react'

/* =====================================================================================
   Global-marketplace layer: geography, currencies, taxonomy, trust tiers, contracts,
   payments (Phase 2), roadmap.  "MVP" = launch cities + priority categories,
   "P2" = Phase 2, "P3" = Phase 3.
   ===================================================================================== */

/* ---------- Geography: Country → State → City, each with a launch status ---------- */
const C = (n, s = 'soon', extra = {}) => ({ n, s, ...extra })
/* the remaining Indian states & union territories — supply is built city by city, so these start as waitlists */
const REST = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada'], 'Arunachal Pradesh': ['Itanagar'], 'Assam': ['Guwahati'], 'Bihar': ['Patna'], 'Chhattisgarh': ['Raipur'], 'Goa': ['Panaji'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'], 'Haryana': ['Faridabad', 'Ambala'], 'Himachal Pradesh': ['Shimla'], 'Jharkhand': ['Ranchi'], 'Kerala': ['Kochi', 'Thiruvananthapuram'],
  'Madhya Pradesh': ['Bhopal', 'Indore'], 'Manipur': ['Imphal'], 'Meghalaya': ['Shillong'], 'Mizoram': ['Aizawl'], 'Nagaland': ['Kohima'], 'Odisha': ['Bhubaneswar'], 'Punjab': ['Ludhiana', 'Amritsar'],
  'Sikkim': ['Gangtok'], 'Tamil Nadu': ['Chennai', 'Coimbatore'], 'Telangana': ['Hyderabad'], 'Tripura': ['Agartala'], 'Uttarakhand': ['Dehradun'], 'West Bengal': ['Kolkata'],
  'Andaman & Nicobar Islands': ['Port Blair'], 'Chandigarh': ['Chandigarh'], 'Dadra & Nagar Haveli and Daman & Diu': ['Daman'], 'Jammu & Kashmir': ['Srinagar', 'Jammu'], 'Ladakh': ['Leh'],
  'Lakshadweep': ['Kavaratti'], 'Puducherry': ['Puducherry'],
}
const IN_REST = Object.entries(REST).sort(([a], [b]) => a.localeCompare(b)).map(([name, cs]) => ({ name, cities: cs.map((n, i) => C(n, 'later', { wait: 12 + ((name.length * 7 + i * 13) % 90) })) }))
const GEO_BASE = [
  { code: 'IN', name: 'India', flag: '🇮🇳', cur: 'INR', launch: 'live', langs: ['English', 'हिन्दी'], vendors: 412, states: [
    { name: 'Rajasthan', cities: [C('Jaipur', 'live', { vendors: 268 }), C('Ajmer', 'live', { vendors: 52 }), C('Sikar', 'live', { vendors: 31 }), C('Jodhpur', 'soon', { wait: 184 }), C('Kota', 'soon', { wait: 96 }), C('Udaipur', 'soon', { wait: 73 })] },
    { name: 'Delhi NCR', cities: [C('Delhi NCR', 'live', { vendors: 61 }), C('Gurugram', 'soon', { wait: 240 }), C('Noida', 'soon', { wait: 188 })] },
    { name: 'Maharashtra', cities: [C('Mumbai', 'soon', { wait: 612 }), C('Pune', 'soon', { wait: 344 })] },
    { name: 'Karnataka', cities: [C('Bengaluru', 'soon', { wait: 521 })] },
    { name: 'Uttar Pradesh', cities: [C('Lucknow', 'later', { wait: 44 }), C('Kanpur', 'later', { wait: 21 }), C('Varanasi', 'later', { wait: 18 })] },
    ...IN_REST,
  ] },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', cur: 'AED', launch: 'soon', langs: ['English', 'العربية'], vendors: 0, states: [
    { name: 'Dubai', cities: [C('Dubai', 'soon', { wait: 402 })] }, { name: 'Abu Dhabi', cities: [C('Abu Dhabi', 'later', { wait: 118 })] },
  ] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', cur: 'SGD', launch: 'later', langs: ['English'], vendors: 0, states: [{ name: 'Singapore', cities: [C('Singapore', 'later', { wait: 77 })] }] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', cur: 'GBP', launch: 'later', langs: ['English'], vendors: 0, states: [{ name: 'England', cities: [C('London', 'later', { wait: 133 }), C('Manchester', 'later', { wait: 41 })] }] },
  { code: 'US', name: 'United States', flag: '🇺🇸', cur: 'USD', launch: 'later', langs: ['English', 'Español'], vendors: 0, states: [
    { name: 'California', cities: [C('Los Angeles', 'later', { wait: 90 })] }, { name: 'Texas', cities: [C('Houston', 'later', { wait: 62 })] }, { name: 'New York', cities: [C('New York', 'later', { wait: 150 })] },
  ] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', cur: 'EUR', launch: 'later', langs: ['Deutsch', 'English'], vendors: 0, states: [{ name: 'Bavaria', cities: [C('Munich', 'later', { wait: 38 })] }, { name: 'Berlin', cities: [C('Berlin', 'later', { wait: 52 })] }] },
  { code: 'CN', name: 'China', flag: '🇨🇳', cur: 'CNY', launch: 'later', langs: ['中文', 'English'], vendors: 0, states: [{ name: 'Guangdong', cities: [C('Shenzhen', 'later', { wait: 29 })] }] },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', cur: 'AUD', launch: 'later', langs: ['English'], vendors: 0, states: [{ name: 'New South Wales', cities: [C('Sydney', 'later', { wait: 35 })] }] },
]
import { WORLD, EXTRA_CUR } from './geodata.jsx'
import { VENDOR_TYPES } from './mvpdata.jsx'
const W = (str) => str.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [st, cs] = x.split(':'); return { name: st.trim(), cities: cs.split('|').map((c, k) => C(c.trim(), 'later', { wait: 8 + ((st.length * 11 + k * 17) % 120) })) } })
const EXTRA = WORLD.map(([code, name, flag, cur, langs, st]) => ({ code, name, flag, cur, launch: 'later', langs, vendors: 0, states: W(st) }))
/* keep the hand-tuned launch data, then add every other region worldwide (all start as waitlists) */
export const GEO = (() => {
  const out = GEO_BASE.map((c) => {
    const ex = EXTRA.find((e) => e.code === c.code)
    if (!ex) return c
    const have = new Set(c.states.map((s) => s.name))
    const merged = c.states.map((s) => { const e = ex.states.find((x) => x.name === s.name); if (!e) return s; const names = new Set(s.cities.map((x) => x.n)); return { ...s, cities: [...s.cities, ...e.cities.filter((x) => !names.has(x.n))] } })
    return { ...c, states: [...merged, ...ex.states.filter((s) => !have.has(s.name))] }
  })
  const codes = new Set(out.map((c) => c.code))
  return [...out, ...EXTRA.filter((e) => !codes.has(e.code)).sort((a, b) => a.name.localeCompare(b.name))]
})()
export const country = (code) => GEO.find((c) => c.code === code) || GEO[0]
export const LAUNCH_LABEL = { live: 'Live', soon: 'Coming soon', later: 'Planned' }

/* ---------- Currencies (display conversion is illustrative — rates come from a provider later) ---------- */
export const CUR = {
  INR: { sym: '₹', per: 1, name: 'Indian rupee' }, USD: { sym: '$', per: 0.012, name: 'US dollar' }, AED: { sym: 'AED ', per: 0.044, name: 'UAE dirham' }, GBP: { sym: '£', per: 0.0094, name: 'Pound sterling' },
  EUR: { sym: '€', per: 0.011, name: 'Euro' }, CNY: { sym: '¥', per: 0.086, name: 'Chinese yuan' }, SGD: { sym: 'S$', per: 0.016, name: 'Singapore dollar' }, AUD: { sym: 'A$', per: 0.018, name: 'Australian dollar' },
}
Object.entries(EXTRA_CUR).forEach(([k, [sym, per, name]]) => { CUR[k] = { sym, per, name } })
export const fmtC = (n, cur = 'INR') => {
  const c = CUR[cur] || CUR.INR
  const v = Number(n) || 0
  return c.sym + (cur === 'INR' ? Math.round(v).toLocaleString('en-IN') : v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2))
}
export const convert = (n, from = 'INR', to = 'INR') => (n / (CUR[from] || CUR.INR).per) * (CUR[to] || CUR.INR).per

/* ---------- Taxonomy: unlimited, admin-extensible Industry → Category → Subcategory ---------- */
export const INDUSTRIES = [
  { id: 'i_home', name: 'Home & household services', icon: Wrench, tone: 'sky', cat: 'home', cats: 84, subs: ['Electrician', 'Plumbing', 'Cleaning & pest control', 'Carpentry', 'Painting', 'Appliance repair'], phase: 'MVP' },
  { id: 'i_constr', name: 'Construction & infrastructure', icon: HardHat, tone: 'orange', cat: 'constr', cats: 126, subs: ['Civil contractors', 'Interior fit-out', 'Electrical projects', 'Waterproofing', 'Roads & bridges'], phase: 'MVP' },
  { id: 'i_events', name: 'Events & entertainment', icon: PartyPopper, tone: 'rose', cat: 'events', cats: 58, subs: ['Catering', 'Decoration', 'Photography', 'Venues', 'Artists & DJs'], phase: 'MVP' },
  { id: 'i_prof', name: 'Professional & business services', icon: Briefcase, tone: 'indigo', cat: 'prof', cats: 92, subs: ['CA & tax', 'Legal', 'Architects', 'Consultants', 'Translation'], phase: 'MVP' },
  { id: 'i_it', name: 'IT, software & digital', icon: Laptop, tone: 'violet', cat: 'it', cats: 110, subs: ['Web & app development', 'IT support', 'Digital marketing', 'Cybersecurity', 'Cloud & DevOps'], phase: 'MVP' },
  { id: 'i_whole', name: 'Wholesale, suppliers & distribution', icon: Factory, tone: 'slate', cat: 'whole', cats: 140, subs: ['Electrical supplies', 'Building materials', 'Packaging', 'Industrial machinery', 'Office supplies'], phase: 'MVP' },
  { id: 'i_manu', name: 'Manufacturing & OEM', icon: Cpu, tone: 'teal', cat: 'whole', cats: 168, subs: ['Electronics & PCB', 'CNC & machining', 'Plastics & moulding', 'Metal fabrication', 'Auto components'], phase: 'MVP' },
  { id: 'i_logi', name: 'Logistics, freight & shipping', icon: Truck, tone: 'teal', cat: 'logi', cats: 47, subs: ['Packers & movers', 'Freight forwarding', 'Courier', 'Customs clearance', 'Warehousing'], phase: 'MVP' },
  { id: 'i_auto', name: 'Automotive & mobility', icon: Car, tone: 'amber', cat: 'auto', cats: 52, subs: ['Car service', 'Towing', 'Driver hire', 'Vehicle rental', 'Fleet maintenance'], phase: 'MVP' },
  { id: 'i_health', name: 'Healthcare, education & wellness', icon: HeartPulse, tone: 'emerald', cat: 'health', cats: 73, subs: ['Physiotherapy', 'Tutors', 'Yoga & fitness', 'Home nursing', 'Diagnostics'], phase: 'MVP' },
  { id: 'i_agri', name: 'Agriculture, energy & environment', icon: Sprout, tone: 'lime', cat: 'agri', cats: 64, subs: ['Solar installation', 'Agri equipment', 'Soil testing', 'Waste & recycling', 'Water treatment'], phase: 'MVP' },
  { id: 'i_textile', name: 'Textiles, apparel & fashion', icon: Shirt, tone: 'rose', cats: 61, subs: ['Garment manufacturing', 'Fabrics & yarn', 'Embroidery', 'Uniforms'], phase: 'MVP' },
  { id: 'i_chem', name: 'Chemicals, plastics & materials', icon: FlaskConical, tone: 'violet', cats: 55, subs: ['Industrial chemicals', 'Polymers', 'Adhesives', 'Paints & coatings'], phase: 'MVP' },
  { id: 'i_food', name: 'Food, beverage & agri-processing', icon: UtensilsCrossed, tone: 'amber', cats: 49, subs: ['Packaged food', 'Spices', 'Beverages', 'Cold storage'], phase: 'MVP' },
  { id: 'i_edu', name: 'Education & training providers', icon: GraduationCap, tone: 'indigo', cats: 38, subs: ['Corporate training', 'Test prep', 'Vocational skills'], phase: 'MVP' },
  { id: 'i_fin', name: 'Finance, insurance & real estate', icon: Landmark, tone: 'slate', cats: 44, subs: ['Accounting', 'Insurance brokers', 'Property consultants', 'Valuation'], phase: 'MVP' },
  { id: 'i_media', name: 'Marketing, media & printing', icon: Megaphone, tone: 'rose', cats: 57, subs: ['Branding', 'Video production', 'Printing & packaging', 'Signage'], phase: 'MVP' },
  { id: 'i_energy', name: 'Power, utilities & electrical', icon: Zap, tone: 'amber', cats: 41, subs: ['Transformers', 'Switchgear', 'Generators', 'EV charging'], phase: 'MVP' },
  { id: 'i_mining', name: 'Mining, metals & minerals', icon: Pickaxe, tone: 'orange', cats: 33, subs: ['Steel & alloys', 'Aggregates', 'Industrial minerals'], phase: 'MVP' },
  { id: 'i_hosp', name: 'Hospitality, travel & tourism', icon: Hotel, tone: 'sky', cats: 46, subs: ['Hotels', 'Tour operators', 'Travel desks'], phase: 'MVP' },
  { id: 'i_real', name: 'Real estate & property services', icon: Building2, tone: 'teal', cats: 36, subs: ['Facility management', 'Interior design', 'Property inspection'], phase: 'MVP' },
  { id: 'i_beauty', name: 'Beauty, salon & personal care', icon: Sparkles, tone: 'rose', cats: 29, subs: ['Salon at home', 'Spa', 'Makeup artists'], phase: 'MVP' },
  { id: 'i_sport', name: 'Sports, fitness & recreation', icon: Dumbbell, tone: 'emerald', cats: 27, subs: ['Coaches', 'Equipment', 'Turf & courts'], phase: 'MVP' },
  { id: 'i_print', name: 'Security & safety services', icon: ShieldCheck, tone: 'indigo', cats: 31, subs: ['Guards', 'CCTV', 'Fire safety'], phase: 'MVP' },
  { id: 'i_telecom', name: 'Telecom & networking', icon: Radio, tone: 'violet', cats: 35, subs: ['Network cabling', 'Telecom towers', 'ISP services'], phase: 'MVP' },
  { id: 'i_aero', name: 'Aerospace & defence suppliers', icon: Plane, tone: 'slate', cats: 22, subs: ['Aero components', 'MRO'], phase: 'MVP' },
  { id: 'i_marine', name: 'Marine & shipbuilding', icon: Ship, tone: 'sky', cats: 19, subs: ['Ship repair', 'Marine equipment'], phase: 'MVP' },
  { id: 'i_env', name: 'Recycling & circular economy', icon: Recycle, tone: 'lime', cats: 24, subs: ['E-waste', 'Scrap trading', 'Upcycling'], phase: 'MVP' },
  { id: 'i_lux', name: 'Jewellery, gifts & luxury', icon: Gem, tone: 'amber', cats: 26, subs: ['Jewellery makers', 'Corporate gifting'], phase: 'MVP' },
  { id: 'i_print2', name: 'Packaging & printing', icon: Printer, tone: 'violet', cats: 43, subs: ['Corrugated boxes', 'Labels', 'Custom packaging'], phase: 'MVP' },
]
export const LAUNCH_CATS = ['home', 'constr', 'events', 'prof', 'whole']          // priority categories at launch
export const CAT_REQUESTS0 = [
  { id: 'cr1', name: 'Drone services & aerial survey', parent: 'Agriculture, energy & environment', by: 'GreenSun Solar Solutions (vendor)', votes: 14, status: 'pending', attrs: ['Licence number', 'Payload kg', 'Area per day (acres)'], at: '17 Oct 2026' },
  { id: 'cr2', name: 'EV charger installation', parent: 'Power, utilities & electrical', by: 'Sharma Electrical Works (vendor)', votes: 22, status: 'pending', attrs: ['Charger types', 'kW range', 'Warranty (yrs)'], at: '18 Oct 2026' },
  { id: 'cr3', name: 'Pet grooming at home', parent: 'Home & household services', by: 'Aarav Mehta (customer)', votes: 9, status: 'pending', attrs: ['Pet types', 'Home visit'], at: '16 Oct 2026' },
  { id: 'cr4', name: 'Contract garment manufacturing', parent: 'Textiles, apparel & fashion', by: 'Admin (planned)', votes: 41, status: 'approved', attrs: ['MOQ', 'Fabric types', 'Certifications'], at: '02 Oct 2026' },
]

/* ---------- Trust: 4 verification tiers + multi-dimension ratings ---------- */
export const TIERS = [
  { n: 0, name: 'Unverified', short: 'Unverified', tone: 'gray', needs: ['Account created'], desc: 'Profile only. Cannot publish where verification is required.' },
  { n: 1, name: 'Contact verified', short: 'Tier 1', tone: 'blue', needs: ['Phone OTP', 'Email confirmed'], desc: 'Identity of the account owner’s contact details confirmed.' },
  { n: 2, name: 'Identity verified', short: 'Tier 2', tone: 'teal', needs: ['Government photo ID', 'Address proof'], desc: 'Owner identity reviewed by a human reviewer.' },
  { n: 3, name: 'Business verified', short: 'Tier 3', tone: 'green', needs: ['Registration / GST or local equivalent', 'Tax ID', 'Category licence'], desc: 'Business registration and licences reviewed and valid.' },
  { n: 4, name: 'Audited partner', short: 'Tier 4', tone: 'green', needs: ['Site / facility audit', 'Quality certification (e.g. ISO)', 'Trade references'], desc: 'Premium trust: on-site or remote audit plus certifications. Phase 2.' },
]
export const RATING_DIMS = [['quality', 'Quality of work'], ['comms', 'Communication'], ['time', 'Timeliness'], ['value', 'Value for money']]
export const trustScore = (v) => {
  const t = (v.tier || 0) * 14
  const r = v.rating > 0 ? Math.min(v.rating, 5) * 8 : 12
  const j = Math.min((v.jobs || 0) / 400, 1) * 16
  const rs = v.resp ? Math.max(0, 8 - parseFloat(v.resp) * 1.2) : 0
  return Math.min(99, Math.round(t + r + j + rs))
}

/* ---------- Booking types ---------- */
export const BOOKING_TYPES = {
  instant: { label: 'Instant', desc: 'Confirmed immediately where the vendor keeps a reliable live schedule', phase: 'MVP', note: 'Select categories only' },
  scheduled: { label: 'Scheduled', desc: 'Pick a date and time; the vendor accepts or declines before the deadline', phase: 'MVP' },
  rfq: { label: 'RFQ', desc: 'Describe the work once and compare structured quotations', phase: 'MVP' },
  contract: { label: 'Contract', desc: 'Recurring or long-term work with SLAs, milestones and renewal', phase: 'MVP' },
}

/* ---------- Contracts (Phase 2) ---------- */
const H2 = (...x) => x.map(([s, at, note, by]) => ({ s, at, note, by }))
export const CONTRACT_TYPES = { recurring: 'Recurring service', supply: 'Supply agreement', amc: 'Annual maintenance (AMC)', project: 'Project with milestones' }
export const CONTRACTS0 = [
  { id: 'CT-501', customer: 'Aarav Mehta', vendorId: 'v6', listingId: 'l13', title: 'Monthly home deep-clean — 12 months', type: 'recurring', term: '12 months', start: '01 Nov 2026', freq: 'Monthly', price: 3299, cur: 'INR', priceNote: 'per visit', sla: 'Crew arrives within 30 min of the slot · free re-clean within 48 h of a complaint', paymentTerms: 'Direct to vendor after each visit (MVP) · escrow per visit (Phase 2)', autoRenew: true, state: 'active', done: 1, total: 12, milestones: [], docs: ['Contract-CT-501.pdf'], history: H2(['proposed', '24 Oct, 10:00 AM', '', 'Aarav Mehta'], ['active', '25 Oct, 02:00 PM', 'Both parties e-signed', 'SparkleClean Co.']) },
  { id: 'CT-498', customer: 'Aarav Mehta', vendorId: 'v4', listingId: 'l21', title: 'Quarterly electrical supplies — 6 months', type: 'supply', term: '6 months', start: '15 Nov 2026', freq: 'Quarterly', price: 185000, cur: 'INR', priceNote: 'per shipment (est.)', sla: '7-day dispatch · replacement of defective units within 10 days', paymentTerms: 'Net 30 invoice (direct)', autoRenew: false, state: 'negotiating', counter: { by: 'Vendor', price: 198000, note: 'Includes free delivery and 10-day replacement of defective units' }, done: 0, total: 2, milestones: [], docs: [], history: H2(['proposed', '19 Oct, 11:30 AM', '', 'Aarav Mehta'], ['negotiating', '20 Oct, 03:00 PM', 'Vendor countered ₹1,98,000', 'OfficeMart Industrial Supplies']) },
  { id: 'CT-490', customer: 'Nova Logistics Pvt Ltd', vendorId: 'v-me', listingId: 'l2', title: 'Warehouse electrical AMC — annual', type: 'amc', term: '12 months', start: '01 Dec 2026', freq: 'Quarterly inspection', price: 96000, cur: 'INR', priceNote: 'per year', sla: 'Fault visit within 4 h · quarterly preventive check', paymentTerms: 'Half-yearly invoices (direct)', autoRenew: true, state: 'proposed', done: 0, total: 4, milestones: [], docs: [], history: H2(['proposed', '16 Oct, 09:00 AM', 'Sent to vendor — awaiting response', 'Nova Logistics Pvt Ltd']) },
  { id: 'CT-477', customer: 'Sunrise Hospitality', vendorId: 'v-me', listingId: 'l2', title: 'Guest-house rewiring — 3 milestones', type: 'project', term: '45 days', start: '05 Oct 2026', freq: 'Milestone based', price: 238000, cur: 'INR', priceNote: 'fixed', sla: 'Handover with test certificate; 1-year workmanship warranty', paymentTerms: '30% start · 40% mid · 30% handover (direct; escrow in Phase 2)', autoRenew: false, state: 'active', done: 1, total: 3, milestones: [['Survey & design', 'done', '10 Oct'], ['Wiring — floors 1–2', 'progress', '28 Oct'], ['Testing & handover', 'todo', '19 Nov']], docs: ['Contract-CT-477.pdf', 'Test-plan.pdf'], history: H2(['proposed', '28 Sep, 10:00 AM', 'Created from accepted quote RFQ-284', 'Sunrise Hospitality'], ['active', '03 Oct, 05:00 PM', 'Both parties e-signed', 'Sharma Electrical Works']) },
  { id: 'CT-452', customer: 'Aarav Mehta', vendorId: 'v7', listingId: 'l18', title: 'Corporate lunch catering — 3 months', type: 'recurring', term: '3 months', start: '01 Jul 2026', freq: 'Weekly', price: 42000, cur: 'INR', priceNote: 'per week', sla: 'Hot delivery by 12:45 · menu rotation every 2 weeks', paymentTerms: 'Direct (weekly)', autoRenew: false, state: 'completed', done: 13, total: 13, milestones: [], docs: ['Contract-CT-452.pdf'], history: H2(['active', '28 Jun, 04:00 PM', '', 'Royal Feast Caterers'], ['completed', '30 Sep, 06:00 PM', 'Term ended — thanks!', 'System']) },
]

/* ---------- Payments, commission & payouts (Phase 2 — MVP is direct payment to vendor) ---------- */
export const PAY_METHODS = [
  { id: 'upi', name: 'UPI', sub: 'GPay, PhonePe, Paytm · India', country: 'IN' }, { id: 'card', name: 'Credit / debit card', sub: 'Visa, Mastercard, RuPay, Amex · global', country: '*' },
  { id: 'bank', name: 'Bank transfer / ACH / SEPA', sub: 'Local rails per country', country: '*' }, { id: 'wallet', name: 'VendorVerse wallet', sub: 'Refund credits and top-ups', country: '*' },
  { id: 'lc', name: 'Letter of credit / trade finance', sub: 'Large cross-border orders', country: '*' },
]
export const PAYMENTS0 = [
  { id: 'PY-9004', ref: 'CT-501 · visit 1', vendor: 'SparkleClean Co.', amount: 3299, cur: 'INR', fee: 66, status: 'released', method: 'UPI', at: '25 Oct 2026' },
  { id: 'PY-9003', ref: 'BKG-2099', vendor: 'SparkleClean Co.', amount: 3499, cur: 'INR', fee: 70, status: 'held', method: 'Card ••4821', at: '19 Oct 2026' },
  { id: 'PY-9002', ref: 'RFQ-290 · milestone 1', vendor: 'Royal Feast Caterers', amount: 85500, cur: 'INR', fee: 1710, status: 'held', method: 'Bank transfer', at: '12 Oct 2026' },
  { id: 'PY-9001', ref: 'BKG-2055', vendor: 'BrightSpark Home Services', amount: 399, cur: 'INR', fee: 0, status: 'refunded', method: 'UPI', at: '18 Sep 2026' },
]
export const PAYOUTS0 = [
  { id: 'PO-31', amount: 41820, cur: 'INR', status: 'paid', at: '15 Oct 2026', bank: 'HDFC ••4821', items: 14 },
  { id: 'PO-30', amount: 38260, cur: 'INR', status: 'paid', at: '30 Sep 2026', bank: 'HDFC ••4821', items: 12 },
  { id: 'PO-32', amount: 17340, cur: 'INR', status: 'scheduled', at: '31 Oct 2026', bank: 'HDFC ••4821', items: 6 },
]
export const COMMISSION0 = [
  { id: 'cm1', scope: 'Home services', region: 'India', rate: 8, min: 20, cap: 2500, tax: 'GST 18% on fee' },
  { id: 'cm2', scope: 'Construction', region: 'India', rate: 3, min: 100, cap: 25000, tax: 'GST 18% on fee' },
  { id: 'cm3', scope: 'Events', region: 'India', rate: 5, min: 100, cap: 15000, tax: 'GST 18% on fee' },
  { id: 'cm4', scope: 'Wholesale & manufacturing', region: 'Global', rate: 1.5, min: 25, cap: 50000, tax: 'Per-country VAT / GST' },
  { id: 'cm5', scope: 'Professional services', region: 'India', rate: 6, min: 50, cap: 5000, tax: 'GST 18% on fee' },
]

/* ---------- Roadmap: MVP vs Phase 2 vs Phase 3 ---------- */
export const PHASES = { MVP: { label: 'MVP', tone: 'green', when: 'Launch · selected cities & categories' }, P2: { label: 'Phase 2', tone: 'blue', when: 'After launch stabilises' }, P3: { label: 'Phase 3', tone: 'purple', when: 'Long-term vision' } }
export const ROADMAP = [
  { pillar: '1 · Branding & homepage', items: [['Global brand, region-aware homepage, intent tabs (hire / source / contract)', 'MVP'], ['Multi-language UI: English + Hindi', 'MVP'], ['Arabic, Spanish, French, German, Chinese + RTL', 'P2'], ['Personalised homepage & AI search', 'P3']] },
  { pillar: '2 · Dynamic unlimited categories', items: [['Admin taxonomy builder: industry → category → subcategory → attributes', 'MVP'], ['Vendor / customer “suggest a category” with admin approval', 'MVP'], ['10 priority categories live; 30 industries browsable', 'MVP'], ['Per-country category packs & localized attribute schemas', 'P2'], ['ML-assisted category mapping from free text', 'P3']] },
  { pillar: '3 · Country, state & city search', items: [['Country → state → city → pincode picker with launch status', 'MVP'], ['Live cities: Jaipur, Ajmer, Sikar, Delhi NCR; waitlist elsewhere', 'MVP'], ['Service-coverage scopes: city, state, country, global', 'MVP'], ['More Indian metros + UAE / Singapore', 'P2'], ['UK, US, EU, APAC launch with local compliance', 'P3']] },
  { pillar: '4 · Customer & vendor profiles', items: [['Customer: individual / business account, addresses, completeness meter', 'MVP'], ['Vendor public profile: company, certifications, capabilities, gallery, catalogue', 'MVP'], ['Multi-user vendor teams & roles', 'P2'], ['Enterprise customer accounts, approval chains, cost centres', 'P3']] },
  { pillar: '5 · Instant, scheduled, RFQ & contract bookings', items: [['Scheduled booking (request → accept)', 'MVP'], ['Structured RFQ with revisions & locked accepted terms', 'MVP'], ['Instant booking in select categories with live availability', 'MVP'], ['Contract bookings: recurring, supply, AMC, milestones, e-sign (demonstrated; e-sign is a stub)', 'MVP'], ['Multi-vendor project plans & tenders', 'P3']] },
  { pillar: '6 · Verification & ratings', items: [['Tier 1–3 verification, expiry tracking, reviewer queue', 'MVP'], ['Verified-transaction reviews with 4 rating dimensions + trust score', 'MVP'], ['Tier 4 audited partner (site audit, ISO, references)', 'P2'], ['Third-party KYB / registry integrations per country', 'P2'], ['Fraud-signal ML & continuous monitoring', 'P3']] },
  { pillar: '7 · Global suppliers & manufacturers', items: [['Supplier / manufacturer listings: MOQ, volume tiers, lead time, certifications', 'MVP'], ['Domestic RFQ for goods', 'MVP'], ['Cross-border: incoterms, export markets, multi-currency quotes', 'P2'], ['Samples workflow, customs & trade-document vault', 'P2'], ['Trade finance, inspection & freight bundles', 'P3']] },
  { pillar: '8 · Dashboards', items: [['Customer, vendor and admin dashboards (operational)', 'MVP'], ['Geo rollout manager & category-by-city launch matrix', 'MVP'], ['Revenue dashboard: subscriptions & sponsorship', 'MVP'], ['Commission & payout analytics, cohort / funnel analytics', 'P2'], ['Predictive demand & pricing benchmarks', 'P3']] },
  { pillar: '9 · Payments, commission & subscriptions', items: [['Vendor subscription plans, renewal, grace, sponsored visibility', 'MVP'], ['Customers pay vendors directly (no platform-held funds)', 'MVP'], ['In-app checkout, escrow & milestone release, wallet, invoices', 'P2'], ['Commission engine by category & country, vendor payouts, tax handling', 'P2'], ['Multi-currency settlement, trade finance, BNPL', 'P3']] },
  { pillar: '10 · Responsive web & mobile', items: [['Android, iOS and responsive web with identical business rules', 'MVP'], ['Accessibility target WCAG 2.2 AA', 'MVP'], ['Offline field tools for vendors & agents', 'P3']] },
]
export const ARCH = [
  ['Multi-region by design', 'Country is a first-class dimension of every record (listing, vendor, user, tax, currency, language). Regions can be switched on one by one.'],
  ['Config over code', 'Categories, attributes, booking modes, verification rules, commission and cancellation policy are versioned configuration — no new release to add an industry.'],
  ['Localization', 'Language, currency, number/date formats and RTL are separate from business logic; state codes stay language-neutral.'],
  ['Compliance per country', 'Tax IDs (GST / VAT / EIN), licences, data-residency and consumer-law rules are modelled per country pack.'],
  ['Marketplace money model', 'MVP: subscriptions + sponsored visibility, customer pays vendor directly. Phase 2: escrow, commission and payouts via a licensed PSP.'],
  ['Scale & safety', 'Tenant isolation, idempotent writes, atomic acceptance, audit trail and search that respects coverage at any scale.'],
]

/* ---------- Vendors / listings that make the marketplace global ---------- */
const dc = (names, st = 'verified') => names.map((name) => ({ name, status: st, expires: '31 Dec 2028' }))
const sub = (plan, until) => ({ plan, status: 'active', renews: until, paidUntil: until, autoRenew: true, leads: 20 })
export const GLOBAL_VENDORS = [
  { id: 'v21', name: 'Shenzhen BrightTech Manufacturing', owner: 'Li Wei', cat: 'whole', city: 'Shenzhen', country: 'CN', areas: ['Worldwide'], branches: 2, acct: 'active', ver: 'approved', tier: 4, kind: 'manufacturer', tone: 'teal', since: 2009, gstin: 'USCC 9144030069…', phone: '+86 755 0000 1234', email: 'sales@brighttech.example', resp: '4 hrs', jobs: 860, rating: 4.7, reviews: 214, langs: ['English', '中文'], docs: dc(['Business licence (CN)', 'ISO 9001', 'CE / RoHS']), sub: sub('Pro', '31 Mar 2027'), history: [{ s: 'approved', at: '02 Sep 2026', by: 'Arjun Rao', note: 'Remote audit passed' }] },
  { id: 'v22', name: 'Gulf Gate Freight Forwarding', owner: 'Omar Al Farsi', cat: 'logi', city: 'Dubai', country: 'AE', areas: ['Dubai', 'Abu Dhabi'], branches: 3, acct: 'active', ver: 'approved', tier: 3, kind: 'service', tone: 'sky', since: 2012, gstin: 'TRN 1002…', phone: '+971 4 000 1234', email: 'ops@gulfgate.example', resp: '2 hrs', jobs: 1320, rating: 4.5, reviews: 301, langs: ['English', 'العربية'], docs: dc(['Trade licence (DED)', 'Customs broker licence']), sub: sub('Growth', '31 Jan 2027'), history: [{ s: 'approved', at: '14 Aug 2026', by: 'Arjun Rao' }] },
  { id: 'v23', name: 'Bavaria Precision Parts GmbH', owner: 'Klaus Weber', cat: 'whole', city: 'Munich', country: 'DE', areas: ['Worldwide'], branches: 1, acct: 'active', ver: 'approved', tier: 4, kind: 'manufacturer', tone: 'slate', since: 1994, gstin: 'USt-IdNr DE8123…', phone: '+49 89 000 1234', email: 'export@bavaria-parts.example', resp: '6 hrs', jobs: 540, rating: 4.9, reviews: 88, langs: ['Deutsch', 'English'], docs: dc(['Handelsregister', 'ISO 9001', 'IATF 16949']), sub: sub('Pro', '31 Mar 2027'), history: [{ s: 'approved', at: '20 Aug 2026', by: 'Priya Nair', note: 'Site audit report received' }] },
  { id: 'v24', name: 'Lone Star Steel Fabricators', owner: 'Jake Miller', cat: 'constr', city: 'Houston', country: 'US', areas: ['Houston'], branches: 2, acct: 'active', ver: 'approved', tier: 3, kind: 'contractor', tone: 'orange', since: 2003, gstin: 'EIN 74-…', phone: '+1 713 000 1234', email: 'bids@lonestar-steel.example', resp: '5 hrs', jobs: 210, rating: 4.6, reviews: 57, langs: ['English', 'Español'], docs: dc(['State contractor licence', 'Insurance certificate']), sub: sub('Growth', '28 Feb 2027'), history: [{ s: 'approved', at: '01 Sep 2026', by: 'Arjun Rao' }] },
  { id: 'v25', name: 'Pune AutoComponents Exports', owner: 'Rahul Kulkarni', cat: 'whole', city: 'Pune', country: 'IN', areas: ['Pune', 'Mumbai'], branches: 2, acct: 'active', ver: 'approved', tier: 3, kind: 'manufacturer', tone: 'amber', since: 2007, gstin: '27AAGCP4412M1Z8', phone: '+91 98220 12345', email: 'export@puneauto.example', resp: '3 hrs', jobs: 430, rating: 4.4, reviews: 112, langs: ['English', 'Hindi'], docs: dc(['GST certificate', 'PAN card', 'IEC (import-export code)']), sub: sub('Pro', '30 Nov 2026'), history: [{ s: 'approved', at: '10 Jul 2026', by: 'Arjun Rao' }] },
  { id: 'v26', name: 'Aurora Packaging Industries', owner: 'Meena Shah', cat: 'whole', city: 'Jaipur', country: 'IN', areas: ['Jaipur', 'Delhi NCR', 'Ajmer'], branches: 1, acct: 'active', ver: 'approved', tier: 3, kind: 'manufacturer', tone: 'violet', since: 2015, gstin: '08AAKCA7782B1Z3', phone: '+91 98290 76767', email: 'orders@aurorapack.example', resp: '2 hrs', jobs: 295, rating: 4.6, reviews: 74, langs: ['English', 'Hindi'], docs: dc(['GST certificate', 'PAN card']), sub: sub('Growth', '30 Nov 2026'), history: [{ s: 'approved', at: '05 Aug 2026', by: 'Arjun Rao' }] },
]
const GL = (o) => ({ review: 'approved', paused: false, restricted: false, hold: null, sponsored: false, pins: null, priceMax: null, portfolio: 4, type: 'product', avail: 'none', ...o })
export const GLOBAL_LISTINGS = [
  GL({ id: 'l30', vendorId: 'v21', cat: 'whole', sub: 'Electrical supplies', title: 'LED panel lights & drivers — OEM / ODM manufacturing', desc: 'Factory-direct LED panel lights, downlights and drivers with your branding. In-house tooling, 100% ageing test, 3-year warranty on request.', priceMin: 6.8, priceMax: 14, cur: 'USD', unit: 'pc', basis: 'Volume pricing — see tiers', areas: ['Worldwide'], scope: 'global', rating: 4.7, reviews: 214, tone: 'teal', exp: '15+ yrs', resp: 4, jobs: 860, specs: [['Brand', 'OEM / white label'], ['Min order quantity', '500 pcs'], ['Delivery radius', 'Worldwide (sea / air)']], trade: { moq: 500, unit: 'pcs', tiers: [[500, 14], [2000, 10.5], [10000, 6.8]], leadDays: 25, incoterms: ['EXW', 'FOB Shenzhen', 'CIF'], certs: ['CE', 'RoHS', 'ISO 9001'], samples: 'Paid samples, 7 days', origin: 'China', hs: '9405.42', capacity: '300k units / month' } }),
  GL({ id: 'l31', vendorId: 'v22', cat: 'logi', sub: 'Freight', type: 'service', title: 'Sea & air freight — UAE ⇄ India ⇄ GCC', desc: 'Door-to-door freight forwarding with customs clearance, consolidation (LCL) and bonded warehousing in Jebel Ali.', priceMin: null, cur: 'AED', unit: 'shipment', basis: 'Quote per shipment', areas: ['Dubai', 'Abu Dhabi'], scope: 'country', countries: ['AE', 'IN', 'SA'], rating: 4.5, reviews: 301, tone: 'sky', exp: '14+ yrs', resp: 2, jobs: 1320, specs: [['Fleet size', 'Partner network, 40 carriers'], ['Insurance cover', 'Cargo all-risk'], ['Coverage', 'UAE · India · GCC']], trade: { moq: null, leadDays: 6, incoterms: ['FOB', 'CIF', 'DAP', 'DDP'], certs: ['FIATA', 'AEO'], origin: 'UAE', ports: 'Jebel Ali · Mundra · Nhava Sheva' } }),
  GL({ id: 'l32', vendorId: 'v23', cat: 'whole', sub: 'Industrial machinery', title: 'CNC-machined precision components (aluminium / steel / titanium)', desc: 'Tolerances to ±0.005 mm. Prototype to series. Full material traceability and PPAP documentation for automotive.', priceMin: 4.2, priceMax: 180, cur: 'EUR', unit: 'pc', basis: 'Depends on drawing, material and volume', areas: ['Worldwide'], scope: 'global', rating: 4.9, reviews: 88, tone: 'slate', exp: '30+ yrs', resp: 6, jobs: 540, specs: [['Brand', 'Build-to-print'], ['Min order quantity', '100 pcs (prototype: 5)'], ['Delivery radius', 'Worldwide']], trade: { moq: 100, unit: 'pcs', tiers: [[100, 18], [1000, 9.5], [10000, 4.2]], leadDays: 21, incoterms: ['EXW', 'FCA Munich', 'DAP'], certs: ['ISO 9001', 'IATF 16949', 'ISO 14001'], samples: 'Prototype batch of 5', origin: 'Germany', hs: '8466.94', capacity: '1.2M parts / year' } }),
  GL({ id: 'l33', vendorId: 'v24', cat: 'constr', sub: 'Civil contractors', type: 'service', title: 'Structural steel fabrication & erection — commercial', desc: 'AISC-certified fabrication shop with in-house detailing, welding and field erection for commercial and industrial buildings.', priceMin: null, cur: 'USD', unit: 'project', basis: 'Bid per project', areas: ['Houston'], scope: 'country', countries: ['US'], rating: 4.6, reviews: 57, tone: 'orange', exp: '20+ yrs', resp: 5, jobs: 210, specs: [['Project size range', '$150k – $20M'], ['Crew size', '40–120'], ['Material included', 'Yes']], trade: { moq: null, leadDays: 45, certs: ['AISC', 'AWS D1.1'], origin: 'United States' } }),
  GL({ id: 'l34', vendorId: 'v25', cat: 'whole', sub: 'Industrial machinery', title: 'Forged & machined auto components — export grade', desc: 'Crankshafts, connecting rods, gear blanks and transmission parts for OEM and aftermarket. Exporting to 22 countries.', priceMin: 340, priceMax: 5200, cur: 'INR', unit: 'pc', basis: 'Per part, volume tiers apply', areas: ['Pune', 'Mumbai'], scope: 'global', rating: 4.4, reviews: 112, tone: 'amber', exp: '19+ yrs', resp: 3, jobs: 430, specs: [['Brand', 'OEM / aftermarket'], ['Min order quantity', '1,000 pcs'], ['Delivery radius', 'Worldwide']], trade: { moq: 1000, unit: 'pcs', tiers: [[1000, 5200], [5000, 1800], [25000, 340]], leadDays: 35, incoterms: ['FOB Nhava Sheva', 'CIF', 'EXW Pune'], certs: ['IATF 16949', 'ISO 9001'], samples: 'Free for qualified buyers', origin: 'India', hs: '8708.99', capacity: '600k parts / month' } }),
  GL({ id: 'l35', vendorId: 'v26', cat: 'whole', sub: 'Packaging', title: 'Custom corrugated & rigid boxes — manufacturer', desc: '3-ply to 7-ply corrugated, rigid gift boxes and mailers with full-colour print. Free dieline and digital proof.', priceMin: 11, priceMax: 64, cur: 'INR', unit: 'pc', basis: 'Per box by size and run', areas: ['Jaipur', 'Delhi NCR', 'Ajmer'], scope: 'city', rating: 4.6, reviews: 74, tone: 'violet', exp: '11+ yrs', resp: 2, jobs: 295, specs: [['Brand', 'Custom print'], ['Min order quantity', '500 pcs'], ['Delivery radius', '400 km']], trade: { moq: 500, unit: 'pcs', tiers: [[500, 64], [2000, 28], [10000, 11]], leadDays: 9, incoterms: ['EXW', 'Delivered'], certs: ['FSC', 'ISO 9001'], samples: 'Free digital proof', origin: 'India', capacity: '2M boxes / month' } }),
]
export const KIND_LABEL = Object.fromEntries(Object.entries(VENDOR_TYPES).map(([id, t]) => [id, t.label])) // derived: add roles in mvpdata.jsx (D-024)

/* Vendor roles (D-023): a vendor holds one or more roles; a role is public only once verified (D-020, D-021).
   Records with `roles: [{ id, status }]` use per-role status; seeded vendors without `roles` fall back to their single `kind`. */
export const vendorRoles = (v) => (v?.roles ? v.roles : v?.kind ? [{ id: v.kind, status: 'verified' }] : [])
export const publicRoleLabels = (v) => vendorRoles(v).filter((r) => r.status === 'verified').map((r) => KIND_LABEL[r.id]).filter(Boolean)

/* ---------- Postal-code detection: pincode / ZIP / postcode → country, state, city ---------- */
const IN_PIN = { 302: ['Jaipur', 'Rajasthan'], 303: ['Jaipur', 'Rajasthan'], 305: ['Ajmer', 'Rajasthan'], 332: ['Sikar', 'Rajasthan'], 342: ['Jodhpur', 'Rajasthan'], 324: ['Kota', 'Rajasthan'], 313: ['Udaipur', 'Rajasthan'],
  110: ['Delhi NCR', 'Delhi NCR'], 122: ['Gurugram', 'Delhi NCR'], 201: ['Noida', 'Delhi NCR'], 400: ['Mumbai', 'Maharashtra'], 401: ['Mumbai', 'Maharashtra'], 411: ['Pune', 'Maharashtra'], 560: ['Bengaluru', 'Karnataka'], 226: ['Lucknow', 'Uttar Pradesh'] }
const US_ZIP = { 900: ['Los Angeles', 'California'], 770: ['Houston', 'Texas'], 100: ['New York', 'New York'], 101: ['New York', 'New York'] }
const GB_AREA = { SW: 'London', E: 'London', EC: 'London', W: 'London', N: 'London', SE: 'London', NW: 'London', WC: 'London', M: 'Manchester' }
/* postal circle (first two digits) → state, for pincodes outside the launch cities (mockup approximation) */
const IN_PREFIX2 = (n) => {
  const t = [[11, 'Delhi NCR'], [12, 'Haryana'], [13, 'Haryana'], [14, 'Punjab'], [15, 'Punjab'], [16, 'Punjab'], [17, 'Himachal Pradesh'], [18, 'Jammu & Kashmir'], [19, 'Jammu & Kashmir'], [20, 'Uttar Pradesh'], [21, 'Uttar Pradesh'], [22, 'Uttar Pradesh'], [23, 'Uttar Pradesh'], [24, 'Uttarakhand'], [25, 'Uttar Pradesh'], [26, 'Uttarakhand'], [27, 'Uttar Pradesh'], [28, 'Uttar Pradesh'], [30, 'Rajasthan'], [31, 'Rajasthan'], [32, 'Rajasthan'], [33, 'Rajasthan'], [34, 'Rajasthan'], [36, 'Gujarat'], [37, 'Gujarat'], [38, 'Gujarat'], [39, 'Gujarat'], [40, 'Maharashtra'], [41, 'Maharashtra'], [42, 'Maharashtra'], [43, 'Maharashtra'], [44, 'Maharashtra'], [45, 'Madhya Pradesh'], [46, 'Madhya Pradesh'], [47, 'Madhya Pradesh'], [48, 'Madhya Pradesh'], [49, 'Chhattisgarh'], [50, 'Telangana'], [51, 'Andhra Pradesh'], [52, 'Andhra Pradesh'], [53, 'Andhra Pradesh'], [56, 'Karnataka'], [57, 'Karnataka'], [58, 'Karnataka'], [59, 'Karnataka'], [60, 'Tamil Nadu'], [61, 'Tamil Nadu'], [62, 'Tamil Nadu'], [63, 'Tamil Nadu'], [64, 'Tamil Nadu'], [67, 'Kerala'], [68, 'Kerala'], [69, 'Kerala'], [70, 'West Bengal'], [71, 'West Bengal'], [72, 'West Bengal'], [73, 'West Bengal'], [74, 'West Bengal'], [75, 'Odisha'], [76, 'Odisha'], [77, 'Odisha'], [78, 'Assam'], [79, 'Assam'], [80, 'Bihar'], [81, 'Bihar'], [82, 'Jharkhand'], [83, 'Jharkhand'], [84, 'Bihar'], [85, 'Bihar'], [14, 'Punjab']]
  return t.find(([k]) => k === n)?.[1] || null
}
export function lookupPin(raw) {
  const p = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ')
  let hit = null
  if (/^[1-9]\d{5}$/.test(p)) { const x = IN_PIN[+p.slice(0, 3)]; if (x) hit = { country: 'IN', city: x[0], state: x[1] }
    else { const st = IN_PREFIX2(+p.slice(0, 2)); const sd = st && GEO[0].states.find((z) => z.name === st); hit = sd ? { country: 'IN', city: sd.cities[0].n, state: sd.name } : { country: 'IN', unknown: true } } }
  else if (/^\d{5}$/.test(p)) { const x = US_ZIP[+p.slice(0, 3)]; hit = x ? { country: 'US', city: x[0], state: x[1] } : null }
  else if (/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/.test(p)) { const a = p.match(/^[A-Z]{1,2}/)[0]; const city = GB_AREA[a]; hit = city ? { country: 'GB', city, state: 'England' } : null }
  if (!hit) return null
  const c = GEO.find((g) => g.code === hit.country)
  if (hit.unknown) return { ...hit, country: 'IN', status: 'unknown' }
  const ct = c.states.flatMap((s) => s.cities).find((x) => x.n === hit.city)
  return { ...hit, pin: p, status: ct?.s || 'later', flag: c.flag, countryName: c.name }
}

/* =====================================================================================
   Billing & fee transparency — one place computes every amount that is shown
   ===================================================================================== */
export const TAX0 = [
  { code: 'IN', name: 'India', label: 'GST', rate: 18, note: 'On platform fees and subscriptions; vendor’s own GST is on their invoice' },
  { code: 'AE', name: 'United Arab Emirates', label: 'VAT', rate: 5, note: '' }, { code: 'GB', name: 'United Kingdom', label: 'VAT', rate: 20, note: '' },
  { code: 'DE', name: 'Germany', label: 'VAT', rate: 19, note: 'Reverse charge for valid EU VAT IDs' }, { code: 'SG', name: 'Singapore', label: 'GST', rate: 9, note: '' },
  { code: 'US', name: 'United States', label: 'Sales tax', rate: 0, note: 'Collected per state where required' }, { code: 'AU', name: 'Australia', label: 'GST', rate: 10, note: '' },
]
export const COUPONS = { LAUNCH20: { pct: 20, label: '20% off your first billing cycle', first: true }, WELCOME10: { pct: 10, label: '10% off', first: true } }
export const PLAN_PRICE = { Free: 0, Starter: 499, Growth: 1499, Pro: 3999 }
/* proration: unused days of the current paid plan become a credit when upgrading */
export function planInvoice({ plan, cycle = 'monthly', taxRate = 18, taxLabel = 'GST', coupon = null, current = null, daysLeft = 0 }) {
  const mult = cycle === 'yearly' ? 12 : 1
  const list = plan.price * mult
  const yearlyDisc = cycle === 'yearly' ? plan.price * 2 : 0
  const afterCycle = list - yearlyDisc
  const credit = current && current.price > 0 && current.price < plan.price ? Math.round((current.price / 30) * Math.min(daysLeft, 30)) : 0
  const c = coupon && COUPONS[coupon] ? COUPONS[coupon] : null
  const couponAmt = c ? Math.round(((afterCycle - credit) * c.pct) / 100) : 0
  const subtotal = Math.max(0, afterCycle - credit - couponAmt)
  const tax = Math.round((subtotal * taxRate) / 100)
  const lines = [[`${plan.name} plan × ${cycle === 'yearly' ? '12 months' : '1 month'}`, list]]
  if (yearlyDisc) lines.push(['Yearly billing — 2 months free', -yearlyDisc])
  if (credit) lines.push(['Credit for unused days on current plan', -credit])
  if (couponAmt) lines.push([`Coupon ${coupon} — ${c.label}`, -couponAmt])
  return { lines, subtotal, tax, taxRate, taxLabel, total: subtotal + tax, credit, yearlyDisc, couponAmt, renewsAt: cycle === 'yearly' ? 'in 12 months' : 'in 1 month' }
}
/* what a customer pays vs what the vendor receives (Phase 2 commission is paid by the vendor, never added to the customer's price) */
export function feeSplit({ amount, rate = 8, min = 20, cap = 2500, taxRate = 18 }) {
  const commission = Math.min(cap, Math.max(min, Math.round((amount * rate) / 100)))
  const commissionTax = Math.round((commission * taxRate) / 100)
  return { customerPays: amount, platformFee: 0, commission, commissionTax, vendorNet: amount - commission - commissionTax, effective: amount ? ((commission + commissionTax) / amount) * 100 : 0 }
}

export const INVOICES0 = [
  { id: 'INV-2026-1041', kind: 'subscription', vendorId: 'v-me', title: 'Growth plan — 1 month', date: '14 Oct 2026', cur: 'INR', lines: [['Growth plan × 1 month', 1499]], subtotal: 1499, taxLabel: 'GST', taxRate: 18, tax: 270, total: 1769, status: 'paid', method: 'UPI · rakesh@okhdfc', seller: 'ADRS Techno Private Limited', sellerTax: 'GSTIN 08AAGCA1234F1Z5', buyer: 'Sharma Electrical Works', buyerTax: 'GSTIN 08ABCPS1234F1Z5', place: 'Rajasthan (08)' },
  { id: 'INV-2026-0912', kind: 'subscription', vendorId: 'v-me', title: 'Growth plan — 1 month', date: '14 Sep 2026', cur: 'INR', lines: [['Growth plan × 1 month', 1499]], subtotal: 1499, taxLabel: 'GST', taxRate: 18, tax: 270, total: 1769, status: 'paid', method: 'UPI · rakesh@okhdfc', seller: 'ADRS Techno Private Limited', sellerTax: 'GSTIN 08AAGCA1234F1Z5', buyer: 'Sharma Electrical Works', buyerTax: 'GSTIN 08ABCPS1234F1Z5', place: 'Rajasthan (08)' },
]
export const REFUNDS0 = [
  { id: 'RF-71', paymentId: 'PY-9001', ref: 'BKG-2055', vendor: 'BrightSpark Home Services', amount: 399, cur: 'INR', reason: 'Plans changed', status: 'refunded', at: '18 Sep 2026', policy: 'Free cancellation — more than 24 h before start', steps: [['requested', '18 Sep, 08:00 PM', 'Customer'], ['approved', '18 Sep, 08:01 PM', 'Auto — within the free cancellation window'], ['refunded', '18 Sep, 08:05 PM', 'Returned to UPI']] },
]
export const WALLET0 = { balance: 1200, txns: [{ id: 'w3', t: 'Refund credit · RF-71', n: 399, at: '18 Sep 2026' }, { id: 'w2', t: 'Top-up · UPI', n: 1000, at: '02 Sep 2026' }, { id: 'w1', t: 'Paid · BKG-2010', n: -199, at: '21 Aug 2026' }] }
export const BANKS0 = [{ id: 'bk1', bank: 'HDFC Bank', acct: '••4821', holder: 'Sharma Electrical Works', ifsc: 'HDFC0000123', status: 'verified', primary: true }]
