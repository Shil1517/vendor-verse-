/*
 * SAMPLE listings for the Explore screen (F-DSC-02). Shown only while the real search
 * returns nothing, so the screen is never empty during design review. Every card is
 * labelled "Sample". These are placeholder values, not real vendors or prices, and must
 * be removed once real listings exist.
 */

/** Top-level groups, in the order of the marketplace header. Each lists its subcategories. */
export const SAMPLE_GROUPS = {
  'Home services': ['Plumbing', 'Electrical and AC repair', 'Home cleaning', 'Carpentry'],
  Construction: ['Hardware and building materials', 'Paints and finishing', 'Civil contractors'],
  Events: ['Event catering', 'Photography', 'Decoration'],
  'Professional services': ['Accounting and tax', 'Legal advisory'],
  'IT and digital': ['Web development', 'Digital marketing'],
  'Wholesale and industrial': ['Industrial tools', 'Packaging supplies'],
  'Manufacturing and supply': ['Fabrication', 'Raw materials'],
  Logistics: ['Freight', 'Courier and delivery'],
}

// [group, category, type, title, vendor, city, min price (INR), max price (INR), unit, instant, new vendor]
const ROWS = [
  ['Home services', 'Plumbing', 'service', 'Leak repair and pipe fitting', 'Narmada Home Care', 'Bhopal', 400, 1500, 'visit', true, false],
  ['Home services', 'Plumbing', 'product', 'CPVC pipe and fittings kit', 'Aqua Fix Traders', 'Indore', 850, 2400, 'kit', false, true],
  ['Home services', 'Electrical and AC repair', 'service', 'Split AC service and gas refill', 'CoolBreeze Services', 'Bhopal', 600, 2200, 'unit', true, false],
  ['Home services', 'Electrical and AC repair', 'service', 'Home wiring and switchboard repair', 'Volt Masters', 'Jaipur', 500, 3000, 'visit', false, false],
  ['Home services', 'Home cleaning', 'service', 'Deep cleaning for a 2 BHK flat', 'SparkNest Cleaners', 'Delhi', 2500, 4500, 'job', true, true],
  ['Home services', 'Home cleaning', 'service', 'Sofa and carpet shampooing', 'FreshFold Care', 'Bhopal', 700, 1800, 'job', false, false],
  ['Home services', 'Carpentry', 'service', 'Modular wardrobe fitting', 'WoodCraft Works', 'Jaipur', 8000, 25000, 'job', false, false],
  ['Home services', 'Carpentry', 'product', 'Solid sheesham study table', 'Heritage Furnishers', 'Saharanpur', 9500, 14000, 'piece', false, true],
  ['Construction', 'Hardware and building materials', 'product', 'TMT steel bars, 12 mm', 'Bharat Steel Depot', 'Raipur', 58000, 64000, 'tonne', false, false],
  ['Construction', 'Hardware and building materials', 'product', 'Portland cement, 50 kg bag', 'Shree Cement Agency', 'Bhopal', 340, 410, 'bag', true, false],
  ['Construction', 'Paints and finishing', 'service', 'Interior wall painting', 'RangRez Painters', 'Delhi', 12, 22, 'sq ft', false, true],
  ['Construction', 'Paints and finishing', 'product', 'Exterior emulsion, 20 L', 'ColourHub Supplies', 'Pune', 3800, 5200, 'drum', true, false],
  ['Construction', 'Civil contractors', 'service', 'Boundary wall and plastering', 'Sai Build Co.', 'Nagpur', 450, 900, 'sq ft', false, false],
  ['Events', 'Event catering', 'service', 'Wedding buffet catering, 200 guests', 'Annapurna Caterers', 'Bhopal', 450, 900, 'plate', false, false],
  ['Events', 'Event catering', 'service', 'Corporate lunch boxes', 'Tiffin Tales', 'Gurugram', 180, 320, 'box', true, true],
  ['Events', 'Photography', 'service', 'Wedding photo and video package', 'Frame Story Studio', 'Jaipur', 35000, 90000, 'event', false, false],
  ['Events', 'Decoration', 'service', 'Stage and floral decoration', 'Bloom and Drape', 'Indore', 15000, 60000, 'event', false, true],
  ['Professional services', 'Accounting and tax', 'service', 'GST filing for small businesses', 'Mehta and Associates', 'Mumbai', 1500, 4000, 'month', true, false],
  ['Professional services', 'Legal advisory', 'service', 'Company registration and agreements', 'LexBridge Advisors', 'Delhi', 6000, 15000, 'case', false, true],
  ['IT and digital', 'Web development', 'service', 'Business website, up to 8 pages', 'PixelForge Labs', 'Bengaluru', 25000, 80000, 'project', false, false],
  ['IT and digital', 'Digital marketing', 'service', 'Social media management', 'GrowthLoop Digital', 'Pune', 12000, 40000, 'month', false, true],
  ['Wholesale and industrial', 'Industrial tools', 'product', 'Cordless drill set, industrial grade', 'ToolMart Wholesale', 'Ludhiana', 4200, 7800, 'set', true, false],
  ['Wholesale and industrial', 'Packaging supplies', 'product', 'Corrugated boxes, bulk lot of 500', 'PackRight Industries', 'Ahmedabad', 9000, 16000, 'lot', false, false],
  ['Manufacturing and supply', 'Fabrication', 'service', 'Custom steel fabrication', 'Anvil and Arc Works', 'Rajkot', 800, 2500, 'kg', false, true],
  ['Manufacturing and supply', 'Raw materials', 'product', 'HDPE granules, 25 kg bag', 'Polymer Source Co.', 'Vadodara', 2800, 3600, 'bag', false, false],
  ['Logistics', 'Freight', 'service', 'Full truck load, intercity', 'RoadLine Carriers', 'Nagpur', 18000, 65000, 'trip', false, false],
  ['Logistics', 'Courier and delivery', 'service', 'Same-day local delivery', 'ZipRun Couriers', 'Bhopal', 60, 250, 'parcel', true, true],
]

export const SAMPLE_LISTINGS = ROWS.map(([group, categoryName, listingType, title, vendorName, city, min, max, unit, instantBooking, isNew], i) => ({
  id: `sample-${i + 1}`,
  sample: true,
  group,
  categoryName,
  listingType,
  title,
  vendor: { name: vendorName },
  city,
  price: { state: 'stated', currency: 'INR', minMinor: min * 100, maxMinor: max * 100, unit },
  instantBooking,
  isNew,
}))
