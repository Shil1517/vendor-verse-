import {
  Briefcase, Building2, Car, Cpu, Dumbbell, Factory, FlaskConical, Gem, GraduationCap, Hammer, HardHat, HeartPulse, Hotel, Landmark,
  Laptop, Megaphone, Monitor, PartyPopper, Pickaxe, Plane, Printer, Radio, Recycle, ShieldCheck, Ship, Shirt, Sparkles, Sprout,
  Truck, UtensilsCrossed, Users, Wrench, Zap,
} from 'lucide-react'

export const ME = { customer: 'Aarav Mehta', vendor: 'Rakesh Sharma', business: 'Atlas Industrial Supply Co.', agent: 'Neha Verma', admin: 'Priya Nair' }

/* ---------- categories (Super Admin managed – FR-04) ---------- */
const P1 = (id, name, hi, icon, tone, type, subs, fields, live = true, rfq = []) => ({ id, name, hi, icon, tone, type, subs, fields, live, rfq })
/* Ten Phase 1 industries (F-TAX-05). Live at go-live: Home, Construction, Events, Professional, Wholesale. */
export const CATS = [
  P1('home', 'Home & household services', 'घरेलू सेवाएं', Wrench, 'sky', 'service', ['Electrician', 'Plumbing', 'Deep Cleaning', 'Sofa & Carpet', 'Pest Control', 'Carpentry', 'Painting'], ['Experience (yrs)', 'Tools provided', 'Service radius (km)'], true, ['Scope of work', 'Property type', 'Preferred date']),
  P1('build', 'Construction & infrastructure', 'निर्माण और बुनियादी ढांचा', Hammer, 'orange', 'product', ['Cement', 'Steel & TMT', 'Bricks & Blocks', 'Plywood', 'Civil contractors'], ['Grade', 'Unit of measure', 'Delivery radius (km)'], true, ['Scope & drawings', 'Site address', 'Start date']),
  P1('event', 'Events & entertainment', 'इवेंट और मनोरंजन', UtensilsCrossed, 'rose', 'service', ['Wedding', 'Corporate', 'Decoration', 'Catering', 'Photography'], ['Min guests', 'Cuisine', 'Setup included'], true, ['Event type', 'Guest count', 'Date & venue']),
  P1('staff', 'Professional & business services', 'पेशेवर और व्यावसायिक सेवाएं', Users, 'teal', 'service', ['CA & tax', 'Legal', 'Architects', 'Consultants', 'Security staffing', 'Housekeeping staff'], ['Shift length', 'Background verified', 'Min contract'], true, ['Matter summary', 'Timeline']),
  P1('office', 'IT, software & digital', 'आईटी, सॉफ्टवेयर और डिजिटल', Monitor, 'indigo', 'product', ['Printers', 'Computers', 'IT support', 'Web & app development', 'Cybersecurity'], ['Brand', 'Model', 'Warranty (months)'], true, ['Requirement doc', 'Platforms', 'Timeline']),
  P1('elec', 'Wholesale, suppliers & distribution', 'थोक, आपूर्तिकर्ता और वितरण', Zap, 'amber', 'product', ['Wires & Cables', 'Switches & Sockets', 'Power Tools', 'Lighting', 'Boxes', 'Stationery', 'Furniture'], ['Brand', 'Warranty (months)', 'Specification'], true, ['Item & specification', 'Required by']),
  P1('print', 'Logistics, freight & shipping', 'लॉजिस्टिक्स, माल ढुलाई और शिपिंग', Truck, 'violet', 'service', ['Packers & movers', 'Freight forwarding', 'Courier', 'Warehousing'], ['Vehicle type', 'Coverage', 'Tracking'], true, ['Pickup & drop', 'Load details', 'Date']),
  P1('auto', 'Automotive & mobility', 'ऑटोमोटिव और मोबिलिटी', Car, 'slate', 'service', ['Car service', 'Towing', 'Driver hire', 'Vehicle rental'], ['Vehicle type', 'Response time', 'Coverage'], true, ['Vehicle', 'Issue', 'Date']),
  P1('clean', 'Healthcare, education & wellness', 'स्वास्थ्य, शिक्षा और वेलनेस', HeartPulse, 'emerald', 'service', ['Physiotherapy', 'Tutors', 'Yoga & fitness', 'Home nursing'], ['Qualification', 'Mode', 'Session length'], true, ['Need', 'Schedule']),
  P1('agri', 'Agriculture, energy & environment', 'कृषि, ऊर्जा और पर्यावरण', Sprout, 'lime', 'service', ['Solar installation', 'Agri equipment', 'Waste & recycling', 'Water treatment'], ['Capacity', 'Certification', 'Coverage'], true, ['Site details', 'Capacity needed', 'Timeline']),
]
/* Browse taxonomy: counts and subcategories are representative samples, not full inventories. */
export const INDUSTRIES = [
  { id: 'i_home', name: 'Home & household services', icon: Wrench, tone: 'sky', cat: 'home', cats: 84, subs: ['Electrician', 'Plumbing', 'Cleaning & pest control', 'Carpentry', 'Painting', 'Appliance repair'], phase: 'MVP' },
  { id: 'i_constr', name: 'Construction & infrastructure', icon: HardHat, tone: 'orange', cat: 'build', cats: 126, subs: ['Civil contractors', 'Interior fit-out', 'Electrical projects', 'Waterproofing', 'Roads & bridges'], phase: 'MVP' },
  { id: 'i_events', name: 'Events & entertainment', icon: PartyPopper, tone: 'rose', cat: 'event', cats: 58, subs: ['Catering', 'Decoration', 'Photography', 'Venues', 'Artists & DJs'], phase: 'MVP' },
  { id: 'i_prof', name: 'Professional & business services', icon: Briefcase, tone: 'indigo', cat: 'staff', cats: 92, subs: ['CA & tax', 'Legal', 'Architects', 'Consultants', 'Translation'], phase: 'MVP' },
  { id: 'i_it', name: 'IT, software & digital', icon: Laptop, tone: 'violet', cat: 'office', cats: 110, subs: ['Web & app development', 'IT support', 'Digital marketing', 'Cybersecurity', 'Cloud & DevOps'], phase: 'MVP' },
  { id: 'i_whole', name: 'Wholesale, suppliers & distribution', icon: Factory, tone: 'slate', cat: 'elec', cats: 140, subs: ['Electrical supplies', 'Building materials', 'Packaging', 'Industrial machinery', 'Office supplies'], phase: 'MVP' },
  { id: 'i_manu', name: 'Manufacturing & OEM', icon: Cpu, tone: 'teal', cat: 'elec', cats: 168, subs: ['Electronics & PCB', 'CNC & machining', 'Plastics & moulding', 'Metal fabrication', 'Auto components'], phase: 'MVP' },
  { id: 'i_logi', name: 'Logistics, freight & shipping', icon: Truck, tone: 'teal', cat: 'print', cats: 47, subs: ['Packers & movers', 'Freight forwarding', 'Courier', 'Customs clearance', 'Warehousing'], phase: 'MVP' },
  { id: 'i_auto', name: 'Automotive & mobility', icon: Car, tone: 'amber', cat: 'auto', cats: 52, subs: ['Car service', 'Towing', 'Driver hire', 'Vehicle rental', 'Fleet maintenance'], phase: 'MVP' },
  { id: 'i_health', name: 'Healthcare, education & wellness', icon: HeartPulse, tone: 'emerald', cat: 'clean', cats: 73, subs: ['Physiotherapy', 'Tutors', 'Yoga & fitness', 'Home nursing', 'Diagnostics'], phase: 'MVP' },
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
export const cat = (id) => CATS.find((c) => c.id === id) || CATS[0]

/* ---------- vendors ---------- */
const docs = (st = 'verified') => [
  { name: 'GST Registration Certificate', status: st },
  { name: 'PAN Card', status: st },
  { name: 'Shop & Establishment Licence', status: st },
  { name: 'Cancelled Cheque / Bank Proof', status: st },
]
const BASE_VENDORS = [
  { id: 'v-me', name: 'Sharma Electricals & Hardware', owner: 'Rakesh Sharma', cat: 'elec', city: 'Jaipur', areas: ['Jaipur', 'Sikar', 'Ajmer'], branches: 2, rating: 4.6, reviews: 128, status: 'approved', tone: 'amber', since: 2019, gstin: '08ABCPS1234F1Z5', phone: '+91 98290 11122', email: 'rakesh@sharmaelectricals.in', plan: 'Growth', docs: docs(), agent: 'Neha Verma', history: [{ s: 'submitted', at: '03 Mar 2026', by: 'Rakesh Sharma' }, { s: 'info', at: '04 Mar 2026', by: 'Priya Nair', note: 'GST certificate unclear — please re-upload' }, { s: 'submitted', at: '05 Mar 2026', by: 'Rakesh Sharma', note: 'Re-uploaded' }, { s: 'approved', at: '06 Mar 2026', by: 'Priya Nair' }] },
  { id: 'v2', name: 'BrightSpark Home Services', owner: 'Imran Khan', cat: 'home', city: 'Jaipur', areas: ['Jaipur'], branches: 1, rating: 4.8, reviews: 342, status: 'approved', tone: 'sky', since: 2018, gstin: '08AAKPK9981M1Z2', phone: '+91 99280 33445', email: 'hello@brightspark.in', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '12 Jan 2026', by: 'Priya Nair' }] },
  { id: 'v3', name: 'UrbanBuild Traders', owner: 'Mahesh Gupta', cat: 'build', city: 'Jaipur', areas: ['Jaipur', 'Tonk'], branches: 3, rating: 4.4, reviews: 96, status: 'approved', tone: 'orange', since: 2015, gstin: '08AAECU4411Q1Z9', phone: '+91 94140 55667', email: 'sales@urbanbuild.in', plan: 'Growth', docs: docs(), history: [{ s: 'approved', at: '20 Dec 2025', by: 'Priya Nair' }] },
  { id: 'v4', name: 'OfficeMart Supplies', owner: 'Sanjay Arora', cat: 'office', city: 'Delhi', areas: ['Delhi NCR'], branches: 4, rating: 4.5, reviews: 211, status: 'approved', tone: 'indigo', since: 2012, gstin: '07AAGCO7712L1Z4', phone: '+91 98110 77889', email: 'orders@officemart.in', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '02 Feb 2026', by: 'Priya Nair' }] },
  { id: 'v5', name: 'PrintWorks Studio', owner: 'Kavita Rao', cat: 'elec', city: 'Jaipur', areas: ['Jaipur'], branches: 1, rating: 4.7, reviews: 74, status: 'approved', tone: 'violet', since: 2020, gstin: '08ABJFP2290D1Z7', phone: '+91 97830 99001', email: 'studio@printworks.in', plan: 'Starter', docs: docs(), history: [{ s: 'approved', at: '18 Feb 2026', by: 'Priya Nair' }] },
  { id: 'v6', name: 'SparkleClean Co.', owner: 'Anita Joshi', cat: 'home', city: 'Jaipur', areas: ['Jaipur'], branches: 2, rating: 4.6, reviews: 188, status: 'approved', tone: 'emerald', since: 2017, gstin: '08AAJCS5530H1Z1', phone: '+91 98876 12121', email: 'care@sparkleclean.in', plan: 'Growth', docs: docs(), history: [{ s: 'approved', at: '09 Jan 2026', by: 'Priya Nair' }] },
  { id: 'v7', name: 'Royal Feast Caterers', owner: 'Deepak Soni', cat: 'event', city: 'Jaipur', areas: ['Jaipur', 'Ajmer'], branches: 1, rating: 4.9, reviews: 156, status: 'approved', tone: 'rose', since: 2014, gstin: '08AAHFR3321K1Z6', phone: '+91 98290 40404', email: 'book@royalfeast.in', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '30 Jan 2026', by: 'Priya Nair' }] },
  { id: 'v-global-1', name: 'NordicGrid Energy Solutions', owner: 'Elena Berg', cat: 'elec', city: 'Stockholm', country: 'Sweden', areas: ['Stockholm', 'Gothenburg', 'Remote'], branches: 6, rating: 4.9, reviews: 487, status: 'approved', tone: 'teal', since: 2016, gstin: 'SE559184729001', phone: '+46 8 410 220 18', email: 'hello@nordicgrid.example', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '08 Sep 2026', by: 'Global verification team' }] },
  { id: 'v-global-2', name: 'Atlas Industrial Supply Co.', owner: 'Marcus Reed', cat: 'build', city: 'Chicago', country: 'United States', areas: ['Chicago', 'Detroit', 'North America'], branches: 12, rating: 4.8, reviews: 362, status: 'approved', tone: 'orange', since: 2011, gstin: 'US-IL-884201', phone: '+1 312 555 0184', email: 'trade@atlasindustrial.example', plan: 'Growth', docs: docs(), history: [{ s: 'approved', at: '14 Aug 2026', by: 'Global verification team' }] },
  { id: 'v-global-3', name: 'Sakura Digital Workplace', owner: 'Mika Tanaka', cat: 'office', city: 'Tokyo', country: 'Japan', areas: ['Tokyo', 'Osaka', 'Asia Pacific'], branches: 8, rating: 4.7, reviews: 295, status: 'approved', tone: 'violet', since: 2018, gstin: 'JP-TK-381904', phone: '+81 3 5550 2188', email: 'partners@sakuraoffice.example', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '21 Jul 2026', by: 'Global verification team' }] },
  { id: 'v-global-4', name: 'Mosaic Facilities Group', owner: 'Amira Hassan', cat: 'home', city: 'Dubai', country: 'UAE', areas: ['Dubai', 'Abu Dhabi', 'GCC'], branches: 5, rating: 4.6, reviews: 218, status: 'approved', tone: 'emerald', since: 2019, gstin: 'AE-742019-551', phone: '+971 4 555 0192', email: 'care@mosaicfacilities.example', plan: null, docs: docs(), history: [{ s: 'approved', at: '03 Oct 2026', by: 'Global verification team' }] },
  { id: 'v-global-5', name: 'CloudBridge Remote Studio', owner: 'Lena Hoffmann', cat: 'office', city: 'Berlin', country: 'Germany', areas: ['Remote', 'Europe', 'Asia Pacific'], remote: true, branches: 2, rating: 4.8, reviews: 176, status: 'approved', tone: 'sky', since: 2020, gstin: 'DE-REMOTE-2201', phone: '+49 30 555 0188', email: 'hello@cloudbridge.example', plan: 'Pro', docs: docs(), history: [{ s: 'approved', at: '11 Oct 2026', by: 'Global verification team' }] },
  { id: 'v12', name: 'NorthStar Wholesale Network', owner: 'Arjun Malhotra', cat: 'office', city: 'Bengaluru', country: 'India', areas: ['Bengaluru', 'Hyderabad', 'Mumbai', 'India'], branches: 7, rating: 4.5, reviews: 89, status: 'approved', tone: 'indigo', since: 2018, gstin: '29NORTHSTAR01', phone: '+91 98888 22110', email: 'trade@northstar.example', plan: 'Growth', docs: docs(), history: [{ s: 'approved', at: '12 Oct 2026', by: 'Priya Nair' }] },
  // pending verification queue
  { id: 'v8', name: 'TechNova Systems', owner: 'Rohit Bansal', cat: 'office', city: 'Delhi', areas: ['Delhi NCR'], branches: 1, rating: 0, reviews: 0, status: 'submitted', tone: 'indigo', since: 2023, gstin: '07AAQCT1188R1Z3', phone: '+91 98100 20202', email: 'rohit@technova.in', plan: 'Starter', agent: 'Neha Verma', docs: [{ name: 'GST Registration Certificate', status: 'pending' }, { name: 'PAN Card', status: 'pending' }, { name: 'Shop & Establishment Licence', status: 'pending' }, { name: 'Cancelled Cheque / Bank Proof', status: 'pending' }], history: [{ s: 'submitted', at: '17 Oct 2026', by: 'Rohit Bansal' }] },
  { id: 'v9', name: 'GreenLeaf Pest Control', owner: 'Sunita Meena', cat: 'home', city: 'Jaipur', areas: ['Jaipur'], branches: 1, rating: 0, reviews: 0, status: 'info', tone: 'lime', since: 2022, gstin: '08AAUFG6644B1Z8', phone: '+91 99829 51515', email: 'sunita@greenleaf.in', plan: 'Starter', docs: [{ name: 'GST Registration Certificate', status: 'verified' }, { name: 'PAN Card', status: 'verified' }, { name: 'Pest Control Licence', status: 'rejected', note: 'Licence expired — upload renewed copy' }, { name: 'Cancelled Cheque / Bank Proof', status: 'pending' }], history: [{ s: 'submitted', at: '14 Oct 2026', by: 'Sunita Meena' }, { s: 'info', at: '15 Oct 2026', by: 'Priya Nair', note: 'Licence expired — upload renewed copy' }] },
  { id: 'v10', name: 'Kumar Plywood House', owner: 'Vikram Kumar', cat: 'build', city: 'Kota', areas: ['Kota'], branches: 1, rating: 0, reviews: 0, status: 'rejected', tone: 'orange', since: 2021, gstin: '08AAKFK8890P1Z0', phone: '+91 94141 63636', email: 'vk@kumarply.in', plan: 'Starter', docs: [{ name: 'GST Registration Certificate', status: 'rejected', note: 'GSTIN inactive on portal' }, { name: 'PAN Card', status: 'verified' }], history: [{ s: 'submitted', at: '10 Oct 2026', by: 'Vikram Kumar' }, { s: 'rejected', at: '12 Oct 2026', by: 'Priya Nair', note: 'GSTIN inactive on portal' }] },
  { id: 'v11', name: 'Metro Print Hub', owner: 'Farah Siddiqui', cat: 'elec', city: 'Jaipur', areas: ['Jaipur'], branches: 2, rating: 0, reviews: 0, status: 'submitted', tone: 'violet', since: 2024, gstin: '08AAMCM7741G1Z5', phone: '+91 98280 71717', email: 'farah@metroprint.in', plan: 'Starter', docs: [{ name: 'GST Registration Certificate', status: 'pending' }, { name: 'PAN Card', status: 'pending' }, { name: 'Shop & Establishment Licence', status: 'pending' }, { name: 'Cancelled Cheque / Bank Proof', status: 'pending' }], history: [{ s: 'submitted', at: '18 Oct 2026', by: 'Farah Siddiqui' }] },
]
export const VENDORS0 = BASE_VENDORS

/* ---------- listings ---------- */
export const LISTINGS0 = [
  { id: 'l-global-5', vendorId: 'v-global-5', cat: 'office', sub: 'Computers', type: 'service', title: 'Remote IT Operations & Cloud Support', desc: 'Remote-first IT operations, cloud monitoring and helpdesk support for distributed teams.', price: 48000, mrp: 52000, unit: 'month', stock: 1, moq: 1, lead: 5, duration: 60, variants: ['Business hours', '24/7 support'], status: 'approved', rating: 4.8, reviews: 61, tone: 'sky', specs: [['Coverage', 'Remote worldwide'], ['Response time', '4 hours'], ['Contract', 'Monthly / recurring']] },
  { id: 'l-global-6', vendorId: 'v12', cat: 'office', sub: 'Furniture', type: 'product', title: 'Ergonomic Workstation Bundle – 50 Units', desc: 'Bulk workstation desks and chairs for offices, with nationwide delivery and installation.', price: 285000, mrp: 310000, unit: 'lot', stock: 18, moq: 10, lead: 14, variants: ['Oak', 'Walnut'], status: 'approved', rating: 4.5, reviews: 34, tone: 'indigo', specs: [['MOQ', '10 units'], ['Delivery', 'Nationwide India'], ['Warranty', '3 years']] },
  { id: 'l1', vendorId: 'v-me', cat: 'elec', sub: 'Wires & Cables', type: 'product', title: 'Havells 1.5 sq mm FR Copper Wire – 90 m', desc: 'Flame-retardant, ISI-marked 1.5 sq mm single-core copper wire for residential and commercial wiring. Low smoke, long service life.', price: 1850, mrp: 2150, unit: 'coil', stock: 42, moq: 2, lead: 1, variants: ['Red', 'Black', 'Blue', 'Green'], status: 'approved', rating: 4.7, reviews: 64, tone: 'amber', specs: [['Brand', 'Havells'], ['Warranty', '12 months'], ['Specification', '1.5 sq mm · 90 m']] },
  { id: 'l2', vendorId: 'v-me', cat: 'elec', sub: 'Switches & Sockets', type: 'product', title: 'Anchor Roma Modular Switch Set (6 pcs)', desc: 'Premium modular switch set with glossy finish. Includes 6 × 6A switches, plates and fittings.', price: 640, mrp: 780, unit: 'set', stock: 120, moq: 5, lead: 1, variants: ['White', 'Ivory'], status: 'approved', rating: 4.5, reviews: 38, tone: 'amber', specs: [['Brand', 'Anchor'], ['Warranty', '24 months'], ['Specification', '6A · Modular']] },
  { id: 'l3', vendorId: 'v-me', cat: 'elec', sub: 'Power Tools', type: 'product', title: 'Bosch GSB 500 Impact Drill 500 W', desc: 'Compact 500 W impact drill with variable speed, forward/reverse and 13 mm chuck.', price: 3299, mrp: 3799, unit: 'piece', stock: 14, moq: 1, lead: 2, variants: [], status: 'approved', rating: 4.8, reviews: 52, tone: 'amber', specs: [['Brand', 'Bosch'], ['Warranty', '12 months'], ['Specification', '500 W · 13 mm']] },
  { id: 'l4', vendorId: 'v-me', cat: 'elec', sub: 'Lighting', type: 'product', title: 'Philips LED Batten 20 W (Pack of 4)', desc: '4 ft LED batten, cool daylight 6500K, 2000 lm, 3-year warranty.', price: 1120, mrp: 1400, unit: 'pack', stock: 0, moq: 1, lead: 3, variants: ['Cool white', 'Warm white'], status: 'approved', rating: 4.6, reviews: 29, tone: 'amber', specs: [['Brand', 'Philips'], ['Warranty', '36 months'], ['Specification', '20 W · 6500K']] },
  { id: 'l5', vendorId: 'v-me', cat: 'elec', sub: 'Power Tools', type: 'product', title: 'Industrial Extension Board – 6 Socket, 5 m', desc: 'Heavy-duty extension board with surge guard and master switch.', price: 780, mrp: 950, unit: 'piece', stock: 60, moq: 1, lead: 1, variants: [], status: 'pending', rating: 0, reviews: 0, tone: 'amber', specs: [['Brand', 'Polycab'], ['Warranty', '6 months'], ['Specification', '6 socket · 5 m']] },
  { id: 'l6', vendorId: 'v-me', cat: 'elec', sub: 'Switches & Sockets', type: 'product', title: 'Copper Clamp Set (assorted)', desc: 'Assorted copper cable clamps.', price: 220, mrp: 260, unit: 'set', stock: 300, moq: 10, lead: 1, variants: [], status: 'rejected', reason: 'Images are low quality and spec details are missing.', rating: 0, reviews: 0, tone: 'amber', specs: [['Brand', '—'], ['Warranty', '—'], ['Specification', '—']] },
  { id: 'l7', vendorId: 'v3', cat: 'build', sub: 'Cement', type: 'product', title: 'UltraTech PPC Cement – 50 kg bag', desc: 'Portland Pozzolana Cement for general construction. Delivered to site.', price: 395, mrp: 420, unit: 'bag', stock: 800, moq: 20, lead: 2, variants: [], status: 'approved', rating: 4.5, reviews: 41, tone: 'orange', specs: [['Grade', 'PPC 43'], ['Unit', '50 kg bag'], ['Delivery radius', '25 km']] },
  { id: 'l8', vendorId: 'v3', cat: 'build', sub: 'Steel & TMT', type: 'product', title: 'TMT Steel Bar Fe500 – 12 mm (per tonne)', desc: 'Fe500D TMT bars with high ductility. Mill test certificate provided.', price: 58500, mrp: 61000, unit: 'tonne', stock: 40, moq: 1, lead: 4, variants: ['10 mm', '12 mm', '16 mm'], status: 'approved', rating: 4.3, reviews: 18, tone: 'orange', specs: [['Grade', 'Fe500D'], ['Unit', 'Tonne'], ['Delivery radius', '40 km']] },
  { id: 'l9', vendorId: 'v4', cat: 'office', sub: 'Printers', type: 'product', title: 'HP LaserJet Pro M126nw Printer', desc: 'Wireless monochrome multifunction laser printer for small offices.', price: 14999, mrp: 17500, unit: 'piece', stock: 9, moq: 1, lead: 2, variants: [], status: 'approved', rating: 4.4, reviews: 87, tone: 'indigo', specs: [['Brand', 'HP'], ['Model', 'M126nw'], ['Warranty', '12 months']] },
  { id: 'l10', vendorId: 'v5', cat: 'elec', sub: 'Boxes', type: 'product', title: 'Custom Printed Corrugated Boxes (500 pcs)', desc: '3-ply corrugated boxes with your brand print. Free design proof.', price: 12500, mrp: 14000, unit: '500 pcs', stock: 20, moq: 1, lead: 7, variants: ['Small', 'Medium', 'Large'], status: 'approved', rating: 4.7, reviews: 33, tone: 'violet', specs: [['Material', '3-ply corrugated'], ['Min run', '500 pcs'], ['Customisation', 'Full-colour print']] },
  { id: 'l11', vendorId: 'v2', cat: 'home', sub: 'Electrician', type: 'service', title: 'Electrician – Home Wiring & Fault Visit', desc: 'Verified electrician for switch/fan/MCB repair, short-circuit diagnosis and fittings. 30-day service warranty.', price: 399, unit: 'visit', duration: 60, status: 'approved', rating: 4.8, reviews: 210, tone: 'sky', specs: [['Experience', '8+ yrs'], ['Tools provided', 'Yes'], ['Radius', '15 km']] },
  { id: 'l12', vendorId: 'v2', cat: 'home', sub: 'Plumbing', type: 'service', title: 'Plumber – Tap, Pipe & Leakage Repair', desc: 'Same-day plumbing repair with genuine spares. Pay after the job is done.', price: 349, unit: 'visit', duration: 60, status: 'approved', rating: 4.7, reviews: 132, tone: 'sky', specs: [['Experience', '6+ yrs'], ['Tools provided', 'Yes'], ['Radius', '15 km']] },
  { id: 'l13', vendorId: 'v6', cat: 'home', sub: 'Deep Cleaning', type: 'service', title: 'Deep Home Cleaning – 2 BHK', desc: 'Machine-assisted deep cleaning of kitchen, bathrooms, floors and windows by a 3-member crew.', price: 3499, unit: 'job', duration: 240, status: 'approved', rating: 4.6, reviews: 98, tone: 'emerald', specs: [['Visit duration', '4 hrs'], ['Equipment', 'Provided'], ['Eco-friendly', 'Yes']] },
  { id: 'l14', vendorId: 'v7', cat: 'event', sub: 'Wedding', type: 'service', title: 'Wedding Catering – per plate (min 100 guests)', desc: 'Multi-cuisine vegetarian buffet with live counters, crockery and service staff included.', price: 650, unit: 'plate', duration: 480, status: 'approved', rating: 4.9, reviews: 156, tone: 'rose', specs: [['Min guests', '100'], ['Cuisine', 'North Indian'], ['Setup', 'Included']] },
  { id: 'l15', vendorId: 'v6', cat: 'home', sub: 'Sofa & Carpet', type: 'service', title: 'Sofa Shampoo Cleaning – 5 seater', desc: 'Foam shampoo cleaning with stain removal and anti-bacterial treatment.', price: 899, unit: 'sofa', duration: 90, status: 'approved', rating: 4.5, reviews: 77, tone: 'emerald', specs: [['Visit duration', '90 min'], ['Equipment', 'Provided'], ['Eco-friendly', 'Yes']] },
  { id: 'l16', vendorId: 'v-me', cat: 'home', sub: 'Electrician', type: 'service', title: 'On-site Electrical Installation Service', desc: 'Fan, light and switchboard installation by Sharma Electricals technicians.', price: 799, unit: 'visit', duration: 90, status: 'approved', rating: 4.6, reviews: 41, tone: 'sky', specs: [['Experience', '10+ yrs'], ['Tools provided', 'Yes'], ['Radius', '20 km']] },
  { id: 'l-global-1', vendorId: 'v-global-1', cat: 'elec', sub: 'Lighting', type: 'product', title: 'NordicGrid Smart Solar Controller', desc: 'Commercial solar monitoring and power-control hardware for distributed energy projects.', price: 1290, unit: 'unit', stock: 86, moq: 5, lead: 8, variants: ['EU', 'Universal'], status: 'approved', rating: 4.9, reviews: 274, tone: 'teal', specs: [['Brand', 'NordicGrid'], ['Warranty', '36 months'], ['Ships to', 'Worldwide']] },
  { id: 'l-global-2', vendorId: 'v-global-2', cat: 'build', sub: 'Steel & TMT', type: 'product', title: 'Atlas Structural Fastener Kit', desc: 'Certified high-strength fasteners for commercial construction and infrastructure projects.', price: 840, unit: 'kit', stock: 240, moq: 10, lead: 12, variants: ['Metric', 'Imperial'], status: 'approved', rating: 4.8, reviews: 231, tone: 'orange', specs: [['Grade', 'A4-80'], ['Compliance', 'ASTM / ISO'], ['Ships to', 'North America + export']] },
  { id: 'l-global-3', vendorId: 'v-global-3', cat: 'office', sub: 'Computers', type: 'product', title: 'Sakura Hybrid Office Collaboration Kit', desc: 'Meeting-room camera, microphone and display bundle for distributed teams.', price: 2150, unit: 'bundle', stock: 34, moq: 1, lead: 7, variants: ['Standard', 'Enterprise'], status: 'approved', rating: 4.7, reviews: 188, tone: 'violet', specs: [['Warranty', '24 months'], ['Support', 'Remote setup'], ['Ships to', 'Asia Pacific + export']] },
  { id: 'l-global-4', vendorId: 'v-global-4', cat: 'home', sub: 'Deep Cleaning', type: 'service', title: 'International Facility Cleaning Program', desc: 'Multi-site cleaning operations with scheduled teams, reporting and regional coordination.', price: 980, unit: 'site / month', duration: 1440, status: 'approved', rating: 4.6, reviews: 166, tone: 'emerald', specs: [['Coverage', 'GCC'], ['Reporting', 'Monthly'], ['Availability', 'Scheduled contract']] },
]
export const listing = (id, list = LISTINGS0) => list.find((l) => l.id === id)

/* ---------- orders ---------- */
const H = (...steps) => steps.map(([s, at, note]) => ({ s, at, note }))
export const ORDERS0 = [
  { id: 'ORD-24020', vendorId: 'v-me', listingId: 'l2', qty: 10, variant: 'White', status: 'placed', pay: 'paid', payRef: 'pay_Q8x91A', date: '19 Oct 2026', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur 302021', history: H(['placed', '19 Oct, 09:12 AM']) },
  { id: 'ORD-24018', vendorId: 'v-me', listingId: 'l1', qty: 3, variant: 'Red', status: 'confirmed', pay: 'paid', payRef: 'pay_Q7mK20', date: '18 Oct 2026', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur 302021', history: H(['placed', '18 Oct, 04:40 PM'], ['confirmed', '18 Oct, 05:05 PM', 'Vendor confirmed stock']) },
  { id: 'ORD-24011', vendorId: 'v-me', listingId: 'l3', qty: 1, variant: '', status: 'shipped', pay: 'paid', payRef: 'pay_Q6pL11', date: '16 Oct 2026', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur 302021', tracking: 'BD-77120934', history: H(['placed', '16 Oct, 11:02 AM'], ['confirmed', '16 Oct, 11:30 AM'], ['packed', '16 Oct, 03:15 PM'], ['shipped', '17 Oct, 10:00 AM', 'Tracking BD-77120934']) },
  { id: 'ORD-23987', vendorId: 'v3', listingId: 'l7', qty: 40, variant: '', status: 'delivered', pay: 'paid', payRef: 'pay_Q3aB55', date: '09 Oct 2026', customer: 'Aarav Mehta', address: 'Plot 12, Sitapura Industrial Area, Jaipur', history: H(['placed', '09 Oct, 10:20 AM'], ['confirmed', '09 Oct, 11:00 AM'], ['packed', '10 Oct, 09:00 AM'], ['shipped', '10 Oct, 01:30 PM'], ['delivered', '11 Oct, 12:10 PM']) },
  { id: 'ORD-23954', vendorId: 'v4', listingId: 'l9', qty: 1, variant: '', status: 'delivered', pay: 'paid', payRef: 'pay_Q1cC31', date: '02 Oct 2026', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur 302021', history: H(['placed', '02 Oct, 02:10 PM'], ['confirmed', '02 Oct, 02:40 PM'], ['shipped', '03 Oct, 10:00 AM'], ['delivered', '05 Oct, 04:20 PM']) },
  { id: 'ORD-23940', vendorId: 'v5', listingId: 'l10', qty: 1, variant: 'Medium', status: 'cancelled', pay: 'refunded', payRef: 'pay_Q0dD78', date: '29 Sep 2026', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur 302021', history: H(['placed', '29 Sep, 05:00 PM'], ['cancelled', '29 Sep, 06:15 PM', 'Cancelled by customer · refund processed']) },
]

/* ---------- bookings ---------- */
export const BOOKINGS0 = [
  { id: 'BKG-1042', vendorId: 'v-me', listingId: 'l16', date: '22 Oct 2026', slot: '10:00 AM', status: 'requested', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur', notes: 'Install 3 ceiling fans in the living area.', pay: 'unpaid', total: 799, history: H(['requested', '19 Oct, 08:50 AM']) },
  { id: 'BKG-1044', vendorId: 'v-me', listingId: 'l16', date: '23 Oct 2026', slot: '04:00 PM', status: 'accepted', customer: 'Vikas Patel', address: '8, Mansarovar, Jaipur', notes: 'Switchboard replacement – 2 rooms.', pay: 'paid', total: 799, history: H(['requested', '17 Oct, 06:30 PM'], ['accepted', '17 Oct, 07:00 PM']) },
  { id: 'BKG-1045', vendorId: 'v-me', listingId: 'l16', date: '25 Oct 2026', slot: '11:00 AM', status: 'reschedule', customer: 'Meera Kapoor', address: '102, C-Scheme, Jaipur', notes: 'Customer asked to move to 27 Oct, 3 PM.', pay: 'paid', total: 799, history: H(['requested', '16 Oct, 12:00 PM'], ['accepted', '16 Oct, 12:20 PM'], ['reschedule', '18 Oct, 09:10 AM', 'Customer requested 27 Oct, 03:00 PM']) },
  { id: 'BKG-1039', vendorId: 'v2', listingId: 'l11', date: '24 Oct 2026', slot: '02:00 PM', status: 'accepted', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur', notes: 'MCB tripping repeatedly.', pay: 'paid', total: 399, history: H(['requested', '17 Oct, 10:00 AM'], ['accepted', '17 Oct, 10:25 AM']) },
  { id: 'BKG-1031', vendorId: 'v6', listingId: 'l13', date: '12 Oct 2026', slot: '09:00 AM', status: 'completed', customer: 'Aarav Mehta', address: '24, Vaishali Nagar, Jaipur', notes: '', pay: 'paid', total: 3499, history: H(['requested', '08 Oct, 04:00 PM'], ['accepted', '08 Oct, 04:30 PM'], ['in_progress', '12 Oct, 09:05 AM'], ['completed', '12 Oct, 01:20 PM']) },
]

/* ---------- RFQs ---------- */
export const RFQS0 = [
  { id: 'RFQ-311', mine: true, customer: 'Aarav Mehta', title: 'Bulk LED panel lights – 200 units for office', cat: 'elec', qty: '200 units', budget: '₹1,20,000 – ₹1,50,000', deadline: '26 Oct 2026', location: 'Jaipur', desc: '600×600 mm, 40 W, 4000K, with 2-year warranty. Delivery and installation support preferred.', files: ['Floor-plan.pdf', 'Spec-sheet.xlsx'], status: 'quoted', created: '15 Oct 2026', history: H(['open', '15 Oct, 11:00 AM'], ['quoted', '16 Oct, 02:30 PM', '3 quotations received']), quotes: [
    { id: 'q1', vendorId: 'v-me', amount: 142000, lead: 7, validity: '30 Oct 2026', notes: 'Philips panels, 2-year warranty. Free delivery within Jaipur.', status: 'submitted', history: [{ amount: 148000, at: '16 Oct, 02:30 PM' }, { amount: 142000, at: '17 Oct, 10:10 AM' }] },
    { id: 'q2', vendorId: 'v4', amount: 131500, lead: 10, validity: '28 Oct 2026', notes: 'Syska panels · installation not included.', status: 'submitted', history: [{ amount: 131500, at: '16 Oct, 06:40 PM' }] },
    { id: 'q3', vendorId: 'v8', amount: 126000, lead: 14, validity: '31 Oct 2026', notes: 'Imported panels, 1-year warranty.', status: 'submitted', history: [{ amount: 126000, at: '17 Oct, 09:00 AM' }] },
  ], chat: [{ from: 'them', vendorId: 'v-me', text: 'Can you share the installation floors? We can include a survey.', at: '17 Oct, 10:15 AM' }] },
  { id: 'RFQ-320', mine: true, customer: 'Aarav Mehta', title: 'Bulk TMT steel and cement for two construction sites', cat: 'build', cats: ['build'], categoryBudgets: { build: '₹8,00,000' }, qty: '120 tonnes steel + 800 bags cement', budget: '₹7,50,000 – ₹9,00,000', deadline: '02 Nov 2026', location: 'Jaipur, Rajasthan, India 302022', country: 'India', state: 'Rajasthan', city: 'Jaipur', pincode: '302022', desc: 'Fe500D TMT bars in 12 mm and 16 mm, PPC cement, mill test certificates, phased delivery to two sites and 30-day commercial validity.', files: ['BOQ-Sites.xlsx', 'Structural-spec.pdf'], status: 'open', created: '20 Oct 2026', history: H(['submitted', '20 Oct, 09:15 AM', 'Sent to three verified suppliers'], ['quoted', '20 Oct, 01:20 PM', '3 quotations received']), quotes: [
    { id: 'q320-1', vendorId: 'v3', amount: 842000, lead: 9, validity: '02 Nov 2026', notes: 'Fe500D TMT with mill certificates and PPC cement. Includes phased delivery within Jaipur.', status: 'submitted', history: [{ amount: 870000, at: '20 Oct, 11:05 AM' }, { amount: 842000, at: '20 Oct, 01:20 PM' }] },
    { id: 'q320-2', vendorId: 'v-me', amount: 878500, lead: 7, validity: '04 Nov 2026', notes: 'Fastest delivery with site-wise dispatch plan. Quote can be revised after final BOQ review.', status: 'submitted', history: [{ amount: 878500, at: '20 Oct, 12:10 PM' }] },
    { id: 'q320-3', vendorId: 'v4', amount: 815000, lead: 14, validity: '31 Oct 2026', notes: 'Lowest initial price; cement supply included, TMT delivery billed by phase.', status: 'submitted', history: [{ amount: 815000, at: '20 Oct, 12:45 PM' }] },
  ], chat: [{ from: 'them', vendorId: 'v3', text: 'We can revise the commercial terms if you confirm the first delivery quantity.', at: '20 Oct, 01:35 PM' }] },
  { id: 'RFQ-308', mine: true, customer: 'Aarav Mehta', title: 'Custom packaging boxes – 2,000 pcs', cat: 'elec', qty: '2,000 pcs', budget: '₹40,000 – ₹55,000', deadline: '30 Oct 2026', location: 'Jaipur', desc: 'Brown kraft mailer boxes with a two-colour logo print. Production proof approval is required before the bulk run.', files: ['Logo.png'], status: 'open', created: '18 Oct 2026', history: H(['open', '18 Oct, 03:20 PM']), quotes: [], chat: [] },
  { id: 'RFQ-315', customer: 'Nova Logistics Pvt Ltd', title: 'Electrical cabling for 3-floor warehouse', cat: 'elec', qty: '3 floors', budget: '₹3,00,000 – ₹4,00,000', deadline: '02 Nov 2026', location: 'Sitapura, Jaipur', desc: 'Complete conduit and cabling work with distribution boards. Material + labour quote required.', files: ['Layout.pdf'], status: 'open', created: '18 Oct 2026', history: H(['open', '18 Oct, 09:00 AM']), quotes: [], chat: [] },
  { id: 'RFQ-312', customer: 'Sunrise Hospitality', title: 'Industrial switchgear panels – 6 units', cat: 'elec', qty: '6 units', budget: '₹2,00,000 – ₹2,60,000', deadline: '29 Oct 2026', location: 'Jaipur', desc: 'Main LT panels with MCCB. Drawings attached.', files: ['Drawings.pdf'], status: 'quoted', created: '14 Oct 2026', history: H(['open', '14 Oct, 10:00 AM']), quotes: [{ id: 'q4', vendorId: 'v-me', amount: 238000, lead: 15, validity: '29 Oct 2026', notes: 'L&T make panels.', status: 'submitted', history: [{ amount: 238000, at: '15 Oct, 11:00 AM' }] }], chat: [] },
  { id: 'RFQ-318', customer: 'Gulmohar Residency RWA', title: 'LED street lights – 60 units', cat: 'elec', qty: '60 units', budget: '₹1,50,000 – ₹1,90,000', deadline: '05 Nov 2026', location: 'Ajmer Road, Jaipur', desc: '40 W LED street lights, IP65, 3-year warranty.', files: [], status: 'open', created: '19 Oct 2026', history: H(['open', '19 Oct, 08:00 AM']), quotes: [], chat: [] },
]

/* ---------- sales agent leads ---------- */
export const STAGES = ['New', 'Contacted', 'Interested', 'Registration Started', 'Registered/Submitted', 'Approved/Converted', 'Lost', 'Inactive']
export const STAGE_TONE = { New: 'blue', Contacted: 'purple', Interested: 'amber', 'Registration Started': 'amber', 'Registered/Submitted': 'teal', 'Approved/Converted': 'green', Lost: 'red', Inactive: 'gray' }
export const LEADS0 = [
  { id: 'ld1', type: 'vendor', name: 'Gupta Sanitary Mart', contact: 'Ashok Gupta', phone: '+91 98290 12345', cat: 'build', city: 'Jaipur', source: 'Field visit', priority: 'High', stage: 'Interested', notes: 'Owns 2 outlets, wants online orders. Needs help with GST docs.', next: { date: '21 Oct 2026', action: 'Visit shop & start onboarding' }, consent: false, docs: [], activities: [{ kind: 'visit', outcome: 'Interested', note: 'Met owner and introduced the VendorVerse marketplace.', at: '17 Oct, 12:30 PM' }, { kind: 'call', outcome: 'Connected', note: 'Intro call.', at: '15 Oct, 05:00 PM' }] },
  { id: 'ld2', type: 'vendor', name: 'TechNova Systems', contact: 'Rohit Bansal', phone: '+91 98100 20202', cat: 'office', city: 'Delhi', source: 'Referral', priority: 'High', stage: 'Registered/Submitted', notes: 'Application submitted; awaiting admin approval.', next: { date: '22 Oct 2026', action: 'Check approval status' }, consent: true, docs: ['GST Certificate', 'PAN Card'], vendorId: 'v8', activities: [{ kind: 'visit', outcome: 'Docs collected', note: 'Collected with consent.', at: '17 Oct, 11:00 AM' }] },
  { id: 'ld3', type: 'customer', name: 'Nova Logistics Pvt Ltd', contact: 'Sneha Kulkarni', phone: '+91 97830 55512', cat: 'elec', city: 'Jaipur', source: 'Cold call', priority: 'Medium', stage: 'Approved/Converted', notes: 'Registered as customer and raised RFQ-315.', next: { date: '', action: '' }, consent: true, docs: [], activities: [{ kind: 'call', outcome: 'Converted', note: 'Account created.', at: '18 Oct, 09:30 AM' }] },
  { id: 'ld4', type: 'vendor', name: 'Shree Ram Paints', contact: 'Mukesh Soni', phone: '+91 94140 77123', cat: 'home', city: 'Jaipur', source: 'Walk-in', priority: 'Medium', stage: 'Contacted', notes: 'Asked for call-back after Diwali.', next: { date: '20 Oct 2026', action: 'Call back' }, consent: false, docs: [], activities: [{ kind: 'call', outcome: 'Call back', note: 'Busy with festival orders.', at: '16 Oct, 03:10 PM' }] },
  { id: 'ld5', type: 'customer', name: 'Pinkcity Hostel', contact: 'Rahul Dev', phone: '+91 99280 80808', cat: 'home', city: 'Jaipur', source: 'Social media', priority: 'Low', stage: 'New', notes: '', next: { date: '19 Oct 2026', action: 'First call' }, consent: false, docs: [], activities: [] },
  { id: 'ld6', type: 'vendor', name: 'Rajputana Caterers', contact: 'Hari Singh', phone: '+91 98290 66554', cat: 'event', city: 'Jodhpur', source: 'Event', priority: 'High', stage: 'Registration Started', notes: 'Filled business details, documents pending.', next: { date: '20 Oct 2026', action: 'Collect FSSAI licence' }, consent: true, docs: ['PAN Card'], activities: [{ kind: 'message', outcome: 'Docs requested', note: 'WhatsApp reminder sent.', at: '18 Oct, 06:00 PM' }] },
  { id: 'ld7', type: 'vendor', name: 'Delta Hardware', contact: 'Pankaj Jain', phone: '+91 94141 99001', cat: 'elec', city: 'Sikar', source: 'Field visit', priority: 'Low', stage: 'Lost', notes: 'Not interested; prefers offline only.', next: { date: '', action: '' }, consent: false, docs: [], activities: [{ kind: 'visit', outcome: 'Declined', note: 'Not interested.', at: '10 Oct, 01:00 PM' }] },
  { id: 'ld8', type: 'customer', name: 'Anand Realty', contact: 'Anand Mehra', phone: '+91 98290 31313', cat: 'build', city: 'Jaipur', source: 'Referral', priority: 'Medium', stage: 'Interested', notes: 'Needs cement + TMT supply for 2 sites.', next: { date: '23 Oct 2026', action: 'Send vendor shortlist' }, consent: false, docs: [], activities: [{ kind: 'call', outcome: 'Interested', note: 'Wants quotations.', at: '17 Oct, 04:20 PM' }] },
  { id: 'ld9', type: 'vendor', name: 'Old City Plywood', contact: 'Zubair Ali', phone: '+91 97720 14141', cat: 'build', city: 'Jaipur', source: 'Walk-in', priority: 'Low', stage: 'Inactive', notes: 'No response for 30 days.', next: { date: '', action: '' }, consent: false, docs: [], activities: [] },
]

export const COMMISSIONS0 = [
  { id: 'cm1', lead: 'Nova Logistics Pvt Ltd', kind: 'Customer first order', amount: 250, status: 'pending', date: '18 Oct 2026' },
  { id: 'cm2', lead: 'Sharma Electricals & Hardware', kind: 'Vendor activation', amount: 500, status: 'paid', date: '06 Mar 2026' },
  { id: 'cm3', lead: 'Royal Feast Caterers', kind: 'Vendor activation', amount: 500, status: 'paid', date: '30 Jan 2026' },
  { id: 'cm4', lead: 'TechNova Systems', kind: 'Vendor activation', amount: 500, status: 'awaiting', date: '17 Oct 2026' },
  { id: 'cm5', lead: 'SparkleClean Co.', kind: 'Vendor activation', amount: 500, status: 'approved', date: '09 Jan 2026' },
]

/* ---------- disputes / support ---------- */
export const DISPUTES0 = [
  { id: 'DSP-204', ref: 'ORD-23987', kind: 'Order', title: '12 cement bags damaged on delivery', raisedBy: 'Aarav Mehta', against: 'UrbanBuild Traders', status: 'open', amount: 4740, created: '12 Oct 2026', desc: 'Bags were torn and partially wet. Photos attached.', actions: [{ by: 'System', action: 'Dispute opened and vendor notified', at: '12 Oct, 02:10 PM' }] },
  { id: 'DSP-201', ref: 'BKG-1031', kind: 'Booking', title: 'Kitchen cleaning incomplete', raisedBy: 'Aarav Mehta', against: 'SparkleClean Co.', status: 'under_review', amount: 3499, created: '13 Oct 2026', desc: 'Chimney and cabinets were skipped though included in the package.', actions: [{ by: 'System', action: 'Dispute opened', at: '13 Oct, 10:00 AM' }, { by: 'Priya Nair', action: 'Requested vendor response', at: '14 Oct, 11:30 AM' }] },
  { id: 'DSP-196', ref: 'ORD-23811', kind: 'Order', title: 'Wrong item delivered', raisedBy: 'Meera Kapoor', against: 'OfficeMart Supplies', status: 'resolved', amount: 2190, created: '03 Oct 2026', desc: 'Received A4 paper instead of A3.', actions: [{ by: 'System', action: 'Dispute opened', at: '03 Oct, 09:00 AM' }, { by: 'Priya Nair', action: 'Full refund approved — ₹2,190', at: '05 Oct, 04:00 PM' }] },
  { id: 'DSP-210', ref: 'l5', kind: 'Listing', title: 'Misleading product images reported', raisedBy: 'Platform review', against: 'Sharma Electricals & Hardware', status: 'decided', outcome: 'Listing paused until original photos are uploaded. Written warning recorded.', amount: 0, created: '16 Oct 2026', desc: 'A customer reported that the photos show a different brand.', actions: [{ by: 'System', action: 'Case opened from a customer report', at: '16 Oct, 09:00 AM' }, { by: 'Priya Nair', action: 'Decision: listing paused, warning issued', at: '17 Oct, 05:30 PM' }] },
  { id: 'DSP-208', ref: 'ORD-24005', kind: 'Order', title: 'Customer refused delivery', raisedBy: 'Sharma Electricals & Hardware', against: 'Vikas Patel', status: 'escalated', amount: 6200, created: '17 Oct 2026', desc: 'Customer denied receiving the order at the door after dispatch.', actions: [{ by: 'System', action: 'Escalated by vendor', at: '17 Oct, 05:00 PM' }] },
]

/* ---------- users (admin) ---------- */
export const USERS0 = [
  { id: 'u1', name: 'Aarav Mehta', role: 'Customer', phone: '+91 98290 00001', status: 'active', joined: '02 Feb 2026' },
  { id: 'u2', name: 'Rakesh Sharma', role: 'Vendor', phone: '+91 98290 11122', status: 'active', joined: '03 Mar 2026' },
  { id: 'u3', name: 'Neha Verma', role: 'Sales Agent', phone: '+91 97830 22233', status: 'active', joined: '10 Jan 2026' },
  { id: 'u4', name: 'Priya Nair', role: 'Super Admin', phone: '+91 98110 33344', status: 'active', joined: '01 Jan 2026' },
  { id: 'u5', name: 'Imran Khan', role: 'Vendor', phone: '+91 99280 33445', status: 'active', joined: '12 Jan 2026' },
  { id: 'u6', name: 'Meera Kapoor', role: 'Customer', phone: '+91 99290 44556', status: 'active', joined: '15 Feb 2026' },
  { id: 'u7', name: 'Vikas Patel', role: 'Customer', phone: '+91 94140 55660', status: 'suspended', joined: '20 Mar 2026' },
  { id: 'u8', name: 'Sandeep Rathore', role: 'Sales Agent', phone: '+91 98290 77889', status: 'active', joined: '05 Feb 2026' },
  { id: 'u9', name: 'Kavita Rao', role: 'Vendor', phone: '+91 97830 99001', status: 'active', joined: '18 Feb 2026' },
]

export const AGENTS0 = [
  { id: 'ag1', name: 'Neha Verma', region: 'Jaipur North', leads: 9, converted: 3, vendors: 2, customers: 1, commission: 1250, status: 'active' },
  { id: 'ag2', name: 'Sandeep Rathore', region: 'Jaipur South', leads: 14, converted: 5, vendors: 3, customers: 2, commission: 2250, status: 'active' },
  { id: 'ag3', name: 'Pooja Chauhan', region: 'Delhi NCR', leads: 11, converted: 2, vendors: 1, customers: 1, commission: 750, status: 'active' },
  { id: 'ag4', name: 'Rohan Das', region: 'Ajmer', leads: 4, converted: 0, vendors: 0, customers: 0, commission: 0, status: 'inactive' },
]

export const AUDIT0 = [
  { id: 'a1', actor: 'Priya Nair', action: 'Approved vendor', target: 'Royal Feast Caterers', at: '19 Oct 2026, 10:42 AM', kind: 'approval' },
  { id: 'a2', actor: 'Priya Nair', action: 'Rejected vendor', target: 'Kumar Plywood House', at: '12 Oct 2026, 04:10 PM', kind: 'approval', note: 'GSTIN inactive on portal' },
  { id: 'a3', actor: 'Priya Nair', action: 'Changed platform fee 1.5% → 2%', target: 'Commercial settings', at: '10 Oct 2026, 09:30 AM', kind: 'setting' },
  { id: 'a4', actor: 'System', action: 'Refund issued ₹2,190', target: 'ORD-23811', at: '05 Oct 2026, 04:01 PM', kind: 'financial' },
  { id: 'a5', actor: 'Priya Nair', action: 'Suspended listing', target: 'Plywood sheet 8×4 (l-204)', at: '03 Oct 2026, 02:15 PM', kind: 'approval' },
  { id: 'a6', actor: 'Priya Nair', action: 'Suspended user', target: 'Vikas Patel', at: '01 Oct 2026, 11:00 AM', kind: 'user' },
  { id: 'a7', actor: 'System', action: 'Payout released ₹48,200', target: 'UrbanBuild Traders', at: '30 Sep 2026, 06:00 PM', kind: 'financial' },
]

/* ---------- notifications ---------- */
const N = (id, type, title, body, time, read = false) => ({ id, type, title, body, time, read })
export const NOTIFS0 = {
  customer: [
    N('n1', 'order', 'New message', 'Sharma Electricals: Red colour available. Sharing the price list now.', '12m ago'),
    N('n2', 'rfq', 'New quotation received', 'TechNova Systems quoted ₹1,26,000 for RFQ-311.', '5h ago'),
    N('n3', 'booking', 'Vendor replied', 'BrightSpark Home Services replied to your enquiry.', 'Yesterday', true),
    N('n4', 'onboarding', 'New verified vendors near you', '3 new verified vendors joined in Jaipur.', 'Yesterday', true),
    N('n5', 'review', 'Talked to a vendor?', 'Rate UrbanBuild Traders to help other customers.', '2 days ago', true),
  ],
  vendor: [
    N('n1', 'order', 'New customer message', 'Aarav Mehta: Great, please share the best price for 3 coils.', '12m ago'),
    N('n2', 'booking', 'New enquiry', 'Priya Singh asked about Anchor Roma switch sets.', '35m ago'),
    N('n3', 'rfq', 'RFQ matches your category', 'RFQ-318 · LED street lights × 60.', '3h ago'),
    N('n4', 'onboarding', 'Listing needs changes', 'Copper Clamp Set was rejected: low quality images.', 'Yesterday', true),
    N('n5', 'review', 'New review', 'Meera Kapoor rated you 5 stars.', '2 days ago', true),
  ],
  business: [
    N('n1', 'order', 'New vendor enquiry', 'Sharma Electricals asked about bulk cable supply.', '1h ago'),
    N('n2', 'onboarding', 'Company verified', 'Your company badge is live in the Business network.', '2d ago', true),
  ],
  agent: [
    N('n1', 'onboarding', 'Vendor submitted', 'TechNova Systems submitted for approval.', '1d ago'),
    N('n2', 'followup', 'Follow-up due today', '2 follow-ups scheduled for today.', '8:00 AM'),
    N('n3', 'payment', 'Commission pending', '₹250 awaiting approval for Nova Logistics.', '2d ago', true),
  ],
  admin: [
    N('n1', 'onboarding', '2 vendors awaiting review', 'TechNova Systems, Metro Print Hub.', '10m ago'),
    N('n2', 'dispute', 'Dispute escalated', 'DSP-208 escalated by Sharma Electricals.', '1h ago'),
    N('n3', 'listing', 'Listing pending moderation', 'Industrial Extension Board 6-Socket.', '3h ago'),
    N('n4', 'listing', 'Listing flagged', 'A customer reported a misleading listing.', '2d ago', true),
  ],
}

/* ---------- messaging ---------- */
export const THREADS0 = {
  customer: [
    { id: 't1', name: 'Sharma Electricals & Hardware', vendorId: 'v-me', ctx: 'Enquiry · Havells copper wire', listingId: 'l1', unread: 1, msgs: [{ f: 'me', t: 'Hi, is this wire in stock? I need 3 coils by Thursday.', at: '10:02 AM' }, { f: 'them', t: 'Yes sir, we have stock. I can arrange delivery in Jaipur by Wednesday.', at: '10:20 AM' }, { f: 'them', t: 'Red colour available. Sharing the price list now.', at: '10:21 AM' }] },
    { id: 't2', name: 'BrightSpark Home Services', vendorId: 'v2', ctx: 'Enquiry · Electrician visit', listingId: 'l11', unread: 0, msgs: [{ f: 'me', t: 'Please bring a spare 32A MCB.', at: 'Yesterday' }, { f: 'them', t: 'Noted. Technician Imran will call before arriving.', at: 'Yesterday' }] },
    { id: 't3', name: 'UrbanBuild Traders', vendorId: 'v3', ctx: 'Enquiry · TMT steel bars', listingId: 'l8', unread: 0, msgs: [{ f: 'me', t: 'Do you supply TMT 16 mm in bulk?', at: '2 days ago' }, { f: 'them', t: 'Yes, 10 tonne minimum for free delivery.', at: '2 days ago' }] },
  ],
  business: [
    { id: 'tb1', name: 'Sharma Electricals & Hardware', bizId: 'biz1', ctx: 'Vendor enquiry', unread: 1, msgs: [{ f: 'them', t: 'Do you supply 2.5 sq mm FR cable in 50-coil lots? We can take monthly orders.', at: '09:40 AM' }] },
    { id: 'tb2', name: 'BrightSpark Home Services', bizId: 'biz1', ctx: 'Vendor enquiry', unread: 0, msgs: [{ f: 'them', t: 'Looking for a trade credit arrangement for wiring supplies.', at: 'Yesterday' }, { f: 'me', t: 'Happy to discuss. Please share your GST details.', at: 'Yesterday' }] },
  ],
  vendor: [
    { id: 't1', name: 'Aarav Mehta', ctx: 'Enquiry · Havells copper wire', listingId: 'l1', unread: 2, msgs: [{ f: 'them', t: 'Hi, is this wire in stock? I need 3 coils by Thursday.', at: '10:02 AM' }, { f: 'me', t: 'Yes sir, we can deliver by Wednesday.', at: '10:20 AM' }, { f: 'them', t: 'Great, please share the best price for 3 coils.', at: '10:41 AM' }] },
    { id: 't2', name: 'Nova Logistics Pvt Ltd', ctx: 'RFQ-315', unread: 0, msgs: [{ f: 'them', t: 'Can you visit the warehouse for a survey?', at: 'Yesterday' }, { f: 'me', t: 'Sure, Thursday 11 AM works.', at: 'Yesterday' }] },
    { id: 't3', name: 'Priya Singh', ctx: 'Enquiry · Anchor switches', listingId: 'l2', unread: 0, msgs: [{ f: 'them', t: 'Is bulk discount available on 50 sets?', at: '2 days ago' }] },
  ],
}

/* ---------- commercial settings (FR-14) ---------- */
export const SETTINGS0 = {
  platformFeePct: 2,
  convenienceFee: 15,
  gstPct: 18,
  freeDeliveryAbove: 500,
  deliveryFee: 49,
  vendorCommissionPct: 8,
  cancelWindowHrs: 24,
  returnWindowDays: 7,
  agentCommission: { amount: null, approvalRequired: true }, // model open: O-03
  /* D-007: tier names only. Values are samples until CFG-01 / CFG-02 are decided; no prices. */
  plans: [
    { id: 'p0', name: 'Free', price: null, listings: 3, leads: 10, active: true },
    { id: 'p1', name: 'Starter', price: null, listings: 10, leads: 50, active: true },
    { id: 'p2', name: 'Growth', price: null, listings: 25, leads: 150, active: true },
    { id: 'p3', name: 'Pro', price: null, listings: 'Unlimited', leads: 'Unlimited', active: true },
  ],
  coupons: [
    { id: 'cp1', code: 'WELCOME20', type: 'percent', value: 20, active: true },
    { id: 'cp2', code: 'PRO100', type: 'flat', value: 100, active: true },
  ],
  locations: [
    { city: 'Jaipur', on: true }, { city: 'Delhi NCR', on: true }, { city: 'Ajmer', on: true }, { city: 'Sikar', on: true },
    { city: 'Jodhpur', on: false }, { city: 'Kota', on: false },
  ],
  features: { messaging: true, rfq: true, reviews: true, sponsored: false, hindi: true, subscriptions: false },
  channels: { inapp: true, email: false, sms: false, push: false, whatsapp: false },
}

/* price helper used by checkout, bookings and settings */
export function calcPrice(subtotal, st, kind = 'product') {
  const platform = Math.round(subtotal * st.platformFeePct) / 100
  const conv = st.convenienceFee
  const delivery = kind === 'product' ? (subtotal >= st.freeDeliveryAbove ? 0 : st.deliveryFee) : 0
  const gst = Math.round((subtotal + platform + conv) * st.gstPct) / 100
  return { subtotal, platform, conv, delivery, gst, total: Math.round(subtotal + platform + conv + delivery + gst) }
}

/* ---------- analytics seed ---------- */
export const REPORT = {
  weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
  registrations: [42, 58, 51, 74, 69, 92],
  gmv: [210, 260, 245, 320, 355, 410],
  byCat: [['Wholesale, suppliers & distribution', 38], ['Construction & infrastructure', 27], ['Home & household services', 36], ['IT, software & digital', 12], ['Events & entertainment', 9]],
  vendorSpark: [4, 5, 5, 7, 8, 8, 10, 12],
  earnings: [['Aug', 62], ['Sep', 74], ['Oct', 51]],
}

export const VENDOR_TX = [
  { id: 'tx1', ref: 'ORD-24018', kind: 'Order', gross: 5550, fee: 444, status: 'processing', date: '18 Oct' },
  { id: 'tx2', ref: 'BKG-1044', kind: 'Booking', gross: 799, fee: 64, status: 'processing', date: '17 Oct' },
  { id: 'tx3', ref: 'ORD-24011', kind: 'Order', gross: 3299, fee: 264, status: 'processing', date: '16 Oct' },
  { id: 'tx4', ref: 'ORD-23902', kind: 'Order', gross: 12400, fee: 992, status: 'settled', date: '10 Oct' },
  { id: 'tx5', ref: 'BKG-1020', kind: 'Booking', gross: 799, fee: 64, status: 'settled', date: '08 Oct' },
  { id: 'tx6', ref: 'ORD-23880', kind: 'Order', gross: 6820, fee: 546, status: 'settled', date: '05 Oct' },
]
export const PAYOUTS = [
  { id: 'po3', amount: 18420, date: '15 Oct 2026', bank: 'HDFC ••4821', status: 'settled' },
  { id: 'po2', amount: 22150, date: '30 Sep 2026', bank: 'HDFC ••4821', status: 'settled' },
  { id: 'po1', amount: 15980, date: '15 Sep 2026', bank: 'HDFC ••4821', status: 'settled' },
]

export const REVIEWS0 = [
  { id: 'r1', by: 'Meera Kapoor', rating: 5, text: 'Quick delivery, genuine products. Will reorder.', at: '12 Oct 2026', target: 'v-me', reply: '' },
  { id: 'r2', by: 'Vikas Patel', rating: 4, text: 'Good quality wire. Packaging could be better.', at: '08 Oct 2026', target: 'v-me', reply: 'Thanks Vikas, we will improve packaging.' },
  { id: 'r3', by: 'Sunrise Hospitality', rating: 5, text: 'Great service on bulk order.', at: '30 Sep 2026', target: 'v-me', reply: '' },
  { id: 'r4', by: 'Anjali Rao', rating: 5, text: 'Very professional and on time!', at: '10 Oct 2026', target: 'v2', reply: '' },
  { id: 'r5', by: 'Rahul Dev', rating: 4, text: 'Cleaned thoroughly. Slight delay.', at: '05 Oct 2026', target: 'v6', reply: '' },
]

export const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM']
export const BUSY_SLOTS = { 0: ['10:00 AM', '03:00 PM'], 1: ['09:00 AM', '11:00 AM', '04:00 PM'], 3: ['12:00 PM', '02:00 PM', '03:00 PM'] }



/* ---------- contracts (F-CON-01/02, Phase 1 core) ---------- */
export const CONTRACTS0 = [
  { id: 'CON-501', title: 'Monthly office electrical maintenance', customer: 'Aarav Mehta', vendorId: 'v-me', status: 'proposed', value: 96000, term: '6 months', terms: 'Monthly visit, 24-hour fault response, parts billed separately.', versions: [{ by: 'customer', value: 96000, at: '18 Oct, 10:00 AM' }], milestones: [{ id: 'm1', label: 'Month 1 service report', due: '30 Nov 2026', status: 'pending' }, { id: 'm2', label: 'Month 2 service report', due: '31 Dec 2026', status: 'pending' }], payment: 'Invoice / offline terms (Mode B)' },
  { id: 'CON-498', title: 'Annual housekeeping contract', customer: 'Aarav Mehta', vendorId: 'v6', status: 'active', value: 240000, term: '12 months', terms: 'Daily housekeeping crew of 3. Monthly invoice.', versions: [{ by: 'customer', value: 250000, at: '02 Oct, 11:00 AM' }, { by: 'vendor', value: 240000, at: '03 Oct, 09:30 AM' }], milestones: [{ id: 'm1', label: 'Month 1 completed', due: '31 Oct 2026', status: 'awaiting' }, { id: 'm2', label: 'Month 2 completed', due: '30 Nov 2026', status: 'pending' }], payment: 'Invoice / offline terms (Mode B)', signed: '04 Oct 2026' },
]

/* ---------- company storefronts (F-BIZ-03, Phase 2 per D-015). Shapes follow the mobile mockup. ---------- */
export const COMPANIES0 = {
  biz1: { id: 'biz1', name: 'Atlas Industrial Supply Co.', industry: 'Wholesale, suppliers & distribution', city: 'Jaipur', employees: 240, year: 2011, capacity: '40,000 coils / month', plants: ['Jaipur', 'Neemrana'], certs: ['ISO 9001', 'BIS'], products: 'Copper cables, house wire and control cable', lead: '4 days', status: 'approved', verifiedOn: '14 Aug 2026' },
  biz3: { id: 'biz3', name: 'Aurora Packaging Industries', industry: 'Wholesale, suppliers & distribution', city: 'Jaipur', employees: 85, year: 2016, capacity: '2 million cartons / month', plants: ['Jaipur'], certs: ['ISO 9001'], products: 'Corrugated and printed cartons, contract packing', lead: '6 days', status: 'approved', verifiedOn: '02 Sep 2026' },
}
export const COMPANY_CATALOG = {
  biz1: [
    { id: 'bp1', name: 'FR copper cable 2.5 sq mm, 90 m coil', unit: 'coil', price: 1750, moq: 5, lead: '4 days', note: 'ISI-marked, flame retardant' },
    { id: 'bp2', name: 'House wire 1.5 sq mm, 90 m coil', unit: 'coil', price: 1180, moq: 5, lead: '4 days', note: 'Multi-strand copper, 5 colours' },
    { id: 'bp3', name: 'Control cable 4 core, 100 m drum', unit: 'drum', price: 5400, moq: 1, lead: '7 days', note: 'PVC sheathed, industrial use' },
  ],
  biz3: [
    { id: 'bp4', name: '5-ply corrugated carton 300x200x150', unit: 'pc', price: 16, moq: 500, lead: '6 days', note: 'Plain, kraft finish' },
    { id: 'bp5', name: 'Printed carton, 2-colour', unit: 'pc', price: 22, moq: 1000, lead: '9 days', note: 'Artwork approval before print' },
    { id: 'bp6', name: 'Kitting and contract packing', unit: 'unit', price: 8, moq: 2000, lead: '10 days', note: 'Per packed unit' },
  ],
}
export const COMPANY_ORDERS0 = [
  { id: 'CO-3002', bizId: 'biz1', buyer: 'Aarav Mehta', title: 'FR copper cable 2.5 sq mm, 90 m coil: 20 coil', item: 'bp1', qty: 20, total: 35000, address: '24, Vaishali Nagar, Jaipur 302021', by: '20 Nov 2026', terms: '50% advance, 50% before dispatch', status: 'placed', history: [{ s: 'placed', at: '28 Oct, 10:15 AM' }] },
]
