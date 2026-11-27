/*
 * Deterministic vendor directory seed: ensures at least 100 approved vendors
 * exist in every marketplace category/field so category browsing and vendor
 * search always return a full vendor directory.
 */

const VERIFIED_DOCS = [
  { name: 'GST Registration Certificate', status: 'verified' },
  { name: 'PAN Card', status: 'verified' },
  { name: 'Shop & Establishment Licence', status: 'verified' },
  { name: 'Cancelled Cheque / Bank Proof', status: 'verified' },
]

const CITIES = [
  { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Indore', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { city: 'Delhi', state: 'Delhi NCR', country: 'India' },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  { city: 'Pune', state: 'Maharashtra', country: 'India' },
  { city: 'Hyderabad', state: 'Telangana', country: 'India' },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  { city: 'Gurugram', state: 'Haryana', country: 'India' },
  { city: 'Surat', state: 'Gujarat', country: 'India' },
  { city: 'Nagpur', state: 'Maharashtra', country: 'India' },
  { city: 'Kolkata', state: 'West Bengal', country: 'India' },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Dubai', state: 'Dubai', country: 'UAE' },
  { city: 'London', state: 'England', country: 'United Kingdom' },
  { city: 'Singapore', state: 'Singapore', country: 'Singapore' },
]

const OWNERS = [
  'Rajesh Sharma', 'Ananya Verma', 'Vikramaditya Singh', 'Priya Nair', 'Mohammed Tariq',
  'Sandeep Kulkarni', 'Neha Gupta', 'Arvind Patel', 'Kavita Menon', 'Rohan Deshmukh',
  'Deepak Joshi', 'Shreya Chatterjee', 'Manish Agarwal', 'Farhan Siddiqui', 'Meera Iyer',
  'Nitin Choudhary', 'Pooja Malhotra', 'Harish Tiwari', 'Aarti Saxena', 'Karan Bedi',
]

const NAME_PREFIXES = [
  'Narmada', 'Apex', 'Vanguard', 'Shree', 'Metro', 'Prime', 'Horizon', 'Royal', 'Crown', 'Sterling',
  'Bharat', 'Summit', 'Vertex', 'Pinnacle', 'Crescent', 'Aurelia', 'Surya', 'Kaveri', 'Deccan', 'Malwa',
  'Navratna', 'Trident', 'Orchid', 'Zenith', 'Atlas',
]

const FIELD_CONFIGS = [
  {
    key: 'home',
    cat: 'home',
    group: 'Home services',
    tone: 'sky',
    vendorType: 'Service provider',
    subs: ['Plumbing', 'Electrical & AC repair', 'Home cleaning', 'Carpentry', 'Painting', 'Pest Control', 'Sofa & Carpet', 'Appliance repair'],
    suffixes: ['Home Services', 'Care Solutions', 'Technicians', 'Maintenance Co.'],
  },
  {
    key: 'build',
    cat: 'build',
    group: 'Construction',
    tone: 'orange',
    vendorType: 'Contractor & supplier',
    subs: ['Hardware & building materials', 'Paints & finishing', 'Civil contractors', 'Cement', 'Steel & TMT', 'Bricks & Blocks', 'Plywood', 'Waterproofing'],
    suffixes: ['Builders & Traders', 'Infra Supply', 'Construction Co.', 'BuildMart'],
  },
  {
    key: 'event',
    cat: 'event',
    group: 'Events',
    tone: 'rose',
    vendorType: 'Event specialist',
    subs: ['Event catering', 'Wedding', 'Corporate', 'Decoration', 'Photography', 'Artists & DJs'],
    suffixes: ['Events & Hospitality', 'Caterers', 'Celebrations', 'Productions'],
  },
  {
    key: 'staff',
    cat: 'staff',
    group: 'Professional services',
    tone: 'teal',
    vendorType: 'Advisory & staffing',
    subs: ['CA & tax', 'Legal', 'Architects', 'Consultants', 'Security staffing', 'Housekeeping staff'],
    suffixes: ['& Associates', 'Advisory Group', 'Consultants', 'Partners'],
  },
  {
    key: 'office',
    cat: 'office',
    group: 'IT and digital',
    tone: 'indigo',
    vendorType: 'Technology agency',
    subs: ['Web development', 'Digital marketing', 'IT support', 'Cybersecurity', 'Cloud & DevOps', 'Computers', 'Printers'],
    suffixes: ['Tech Labs', 'Digital Studio', 'Systems', 'Cloud Solutions'],
  },
  {
    key: 'elec',
    cat: 'elec',
    group: 'Wholesale and industrial',
    tone: 'amber',
    vendorType: 'Wholesale distributor',
    subs: ['Wires & Cables', 'Switches & Sockets', 'Power Tools', 'Lighting', 'Packaging supplies', 'Industrial tools', 'Office supplies', 'Furniture'],
    suffixes: ['Wholesale Depot', 'Electricals & Supply', 'Distributors', 'Trade Corp'],
  },
  {
    key: 'manu',
    cat: 'elec',
    group: 'Manufacturing and supply',
    tone: 'slate',
    vendorType: 'Manufacturer / OEM',
    subs: ['Fabrication', 'CNC & machining', 'Metal fabrication', 'Plastics & moulding', 'Electronics & PCB', 'Raw materials', 'Auto components'],
    suffixes: ['Industries', 'Manufacturing Works', 'Precision OEM', 'Engineering Co.'],
  },
  {
    key: 'print',
    cat: 'print',
    group: 'Logistics',
    tone: 'violet',
    vendorType: 'Logistics partner',
    subs: ['Freight forwarding', 'Courier and delivery', 'Packers & movers', 'Warehousing', 'Customs clearance'],
    suffixes: ['Logistics', 'Freight Carriers', 'Express Cargo', 'Supply Chain'],
  },
  {
    key: 'auto',
    cat: 'auto',
    group: 'Automotive & mobility',
    tone: 'amber',
    vendorType: 'Mobility & fleet',
    subs: ['Car service', 'Towing', 'Driver hire', 'Vehicle rental', 'Fleet maintenance'],
    suffixes: ['Motors', 'Auto Care', 'Fleet Services', 'Mobility'],
  },
  {
    key: 'clean',
    cat: 'clean',
    group: 'Healthcare, education & wellness',
    tone: 'emerald',
    vendorType: 'Wellness & training',
    subs: ['Physiotherapy', 'Tutors', 'Yoga & fitness', 'Home nursing', 'Diagnostics'],
    suffixes: ['Wellness Clinic', 'Care Network', 'Academy', 'Health Services'],
  },
  {
    key: 'agri',
    cat: 'agri',
    group: 'Agriculture, energy & environment',
    tone: 'lime',
    vendorType: 'Clean energy & agri',
    subs: ['Solar installation', 'Agri equipment', 'Waste & recycling', 'Water treatment', 'Soil testing'],
    suffixes: ['Solar & Energy', 'AgriTech', 'Eco Solutions', 'Renewables'],
  },
]

const TARGET_PER_FIELD = 100

/**
 * Expands base vendors so every marketplace field has at least 100 approved vendors.
 */
export function buildVendorDirectory(baseVendors = []) {
  const result = [...baseVendors]

  FIELD_CONFIGS.forEach((field, fieldIdx) => {
    const existingCount = baseVendors.filter((v) => {
      if (v.status !== 'approved') return false
      if (field.key === 'manu') return v.group === 'Manufacturing and supply'
      if (field.key === 'elec') return v.cat === 'elec' && v.group !== 'Manufacturing and supply'
      return v.cat === field.cat
    }).length

    const needed = Math.max(0, TARGET_PER_FIELD - existingCount)
    for (let i = 0; i < needed; i += 1) {
      const idx = i + 1
      const prefix = NAME_PREFIXES[(i + fieldIdx * 3) % NAME_PREFIXES.length]
      const suffix = field.suffixes[Math.floor(i / NAME_PREFIXES.length) % field.suffixes.length]
      const sub = field.subs[i % field.subs.length]
      const geo = CITIES[(i * 7 + fieldIdx * 5) % CITIES.length]
      const owner = OWNERS[(i * 3 + fieldIdx * 2) % OWNERS.length]
      const isRemote = field.key === 'office' || field.key === 'staff' ? i % 4 === 0 : i % 10 === 0
      const rating = Number((4.2 + ((i * 7 + fieldIdx) % 8) * 0.1).toFixed(1))
      const reviews = 14 + ((i * 19 + fieldIdx * 11) % 340)
      const since = 2011 + ((i + fieldIdx) % 14)
      const branches = 1 + ((i + fieldIdx) % 5)
      const gstCode = String(1000 + ((i * 37 + fieldIdx * 91) % 8999))
      const areas = isRemote
        ? [geo.city, geo.state, 'Remote']
        : [geo.city, geo.state, geo.country]

      result.push({
        id: `v-${field.key}-${String(idx).padStart(3, '0')}`,
        name: `${prefix} ${sub.split('&')[0].trim()} ${suffix}`,
        owner,
        cat: field.cat,
        group: field.group,
        specialty: sub,
        subs: [sub],
        vendorType: field.vendorType,
        city: geo.city,
        state: geo.state,
        country: geo.country,
        remote: isRemote,
        areas,
        branches,
        rating,
        reviews,
        status: 'approved',
        tone: field.tone,
        since,
        gstin: `${String(10 + fieldIdx).padStart(2, '0')}VV${field.key.slice(0, 3).toUpperCase()}${gstCode}F1Z${idx % 9}`,
        phone: `+91 98${String(100 + ((i + fieldIdx * 17) % 899)).padStart(3, '0')} ${String(10000 + ((i * 137) % 89999)).padStart(5, '0')}`,
        email: `contact@${prefix.toLowerCase()}-${field.key}${idx}.vendorverse.example`,
        plan: ['Starter', 'Growth', 'Pro'][i % 3],
        docs: VERIFIED_DOCS,
        history: [{ s: 'approved', at: '15 Oct 2026', by: 'Verification team' }],
      })
    }
  })

  return result
}

export const FIELD_CATEGORY_MAP = {
  'Home services': { cat: 'home', group: 'Home services' },
  'Home & household services': { cat: 'home', group: 'Home services' },
  Construction: { cat: 'build', group: 'Construction' },
  'Construction & infrastructure': { cat: 'build', group: 'Construction' },
  Events: { cat: 'event', group: 'Events' },
  'Events & entertainment': { cat: 'event', group: 'Events' },
  'Professional services': { cat: 'staff', group: 'Professional services' },
  'Professional & business services': { cat: 'staff', group: 'Professional services' },
  'IT and digital': { cat: 'office', group: 'IT and digital' },
  'IT, software & digital': { cat: 'office', group: 'IT and digital' },
  'Wholesale and industrial': { cat: 'elec', group: 'Wholesale and industrial' },
  'Wholesale, suppliers & distribution': { cat: 'elec', group: 'Wholesale and industrial' },
  'Manufacturing and supply': { cat: 'elec', group: 'Manufacturing and supply' },
  'Manufacturing & OEM': { cat: 'elec', group: 'Manufacturing and supply' },
  Logistics: { cat: 'print', group: 'Logistics' },
  'Logistics, freight & shipping': { cat: 'print', group: 'Logistics' },
  'Automotive & mobility': { cat: 'auto', group: 'Automotive & mobility' },
  'Healthcare, education & wellness': { cat: 'clean', group: 'Healthcare, education & wellness' },
  'Agriculture, energy & environment': { cat: 'agri', group: 'Agriculture, energy & environment' },
}

/**
 * Returns popular subcategories for a marketplace group or category ID.
 */
export function getPopularSubcategories(groupOrCat) {
  if (!groupOrCat) return []
  const key = String(groupOrCat).trim().toLowerCase()
  const mapped = Object.entries(FIELD_CATEGORY_MAP).find(([name]) => name.toLowerCase() === key)?.[1]
  const byGroup = FIELD_CONFIGS.find(
    (field) => field.group.toLowerCase() === key
      || field.key === key
      || (mapped && field.group === mapped.group)
      || (mapped && !mapped.group && field.cat === mapped.cat),
  )
  return byGroup ? [...byGroup.subs] : []
}

const SUBCATEGORY_KEYWORDS = {
  'event catering': ['cater', 'buffet', 'feast', 'rasoi', 'tiffin', 'food'],
  'artists & djs': ['dj', 'artist', 'music', 'band', 'entertainment'],
  photography: ['photo', 'video', 'studio', 'camera'],
  decoration: ['decor', 'floral', 'stage', 'drape'],
  wedding: ['wedding', 'bridal', 'matrimon'],
  corporate: ['corporate', 'conference', 'summit'],
  'electrical & ac repair': ['electric', 'ac ', 'air condition', 'wiring', 'switch'],
  'home cleaning': ['clean', 'maid', 'housekeep', 'sanitiz'],
  'hardware & building materials': ['hardware', 'cement', 'steel', 'pipe', 'timber', 'ply'],
  'paints & finishing': ['paint', 'putty', 'coating', 'finish'],
}

/**
 * Strictly checks whether a vendor belongs to a selected subcategory.
 * Vendors with an explicit primary `specialty` only match that specialty,
 * preventing unrelated vendors (e.g., DJs under Event catering) from appearing.
 */
export function vendorMatchesSubcategory(vendor, subcategory) {
  if (!vendor || !subcategory || subcategory === 'all') return true
  const subLower = String(subcategory).trim().toLowerCase()
  if (vendor.specialty) {
    return String(vendor.specialty).trim().toLowerCase() === subLower
  }
  const hay = `${vendor.name || ''} ${vendor.listing?.categoryName || ''} ${vendor.listing?.title || ''} ${(vendor.subs || []).join(' ')}`.toLowerCase()
  if (hay.includes(subLower)) return true
  const aliases = SUBCATEGORY_KEYWORDS[subLower]
  if (aliases && aliases.some((kw) => hay.includes(kw))) return true
  const tokens = subLower.replace(/&/g, ' ').split(/\s+/).filter((tok) => tok.length > 2)
  return tokens.length > 0 && tokens.every((tok) => hay.includes(tok))
}
