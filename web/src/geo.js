/* Geography for the web picker. Data copied from the mobile mockup's geodata so both clients list the same regions.
   Launch status: live = India launch cities (D-008); every other region is a waitlist. */
/* Worldwide regions for the mockup: code, name, flag, currency, languages, "Region:City|City;Region:City". Every region starts as a waitlist. */
export const WORLD = [
  ['US', 'United States', '🇺🇸', 'USD', ['English', 'Español'], 'Alabama:Birmingham;Alaska:Anchorage;Arizona:Phoenix;Arkansas:Little Rock;California:Los Angeles|San Francisco|San Diego;Colorado:Denver;Connecticut:Hartford;Delaware:Wilmington;Florida:Miami|Orlando;Georgia:Atlanta;Hawaii:Honolulu;Idaho:Boise;Illinois:Chicago;Indiana:Indianapolis;Iowa:Des Moines;Kansas:Wichita;Kentucky:Louisville;Louisiana:New Orleans;Maine:Portland;Maryland:Baltimore;Massachusetts:Boston;Michigan:Detroit;Minnesota:Minneapolis;Mississippi:Jackson;Missouri:Kansas City|St. Louis;Montana:Billings;Nebraska:Omaha;Nevada:Las Vegas;New Hampshire:Manchester;New Jersey:Newark;New Mexico:Albuquerque;New York:New York|Buffalo;North Carolina:Charlotte;North Dakota:Fargo;Ohio:Columbus|Cleveland;Oklahoma:Oklahoma City;Oregon:Portland;Pennsylvania:Philadelphia|Pittsburgh;Rhode Island:Providence;South Carolina:Charleston;South Dakota:Sioux Falls;Tennessee:Nashville;Texas:Houston|Dallas|Austin;Utah:Salt Lake City;Vermont:Burlington;Virginia:Richmond;Washington:Seattle;West Virginia:Charleston;Wisconsin:Milwaukee;Wyoming:Cheyenne;District of Columbia:Washington DC'],
  ['GB', 'United Kingdom', '🇬🇧', 'GBP', ['English'], 'England:London|Manchester|Birmingham|Leeds|Bristol;Scotland:Edinburgh|Glasgow;Wales:Cardiff|Swansea;Northern Ireland:Belfast'],
  ['AE', 'United Arab Emirates', '🇦🇪', 'AED', ['English', 'العربية'], 'Dubai:Dubai;Abu Dhabi:Abu Dhabi|Al Ain;Sharjah:Sharjah;Ajman:Ajman;Umm Al Quwain:Umm Al Quwain;Ras Al Khaimah:Ras Al Khaimah;Fujairah:Fujairah'],
  ['DE', 'Germany', '🇩🇪', 'EUR', ['Deutsch', 'English'], 'Baden-Württemberg:Stuttgart;Bavaria:Munich|Nuremberg;Berlin:Berlin;Brandenburg:Potsdam;Bremen:Bremen;Hamburg:Hamburg;Hesse:Frankfurt;Lower Saxony:Hanover;Mecklenburg-Vorpommern:Rostock;North Rhine-Westphalia:Cologne|Düsseldorf;Rhineland-Palatinate:Mainz;Saarland:Saarbrücken;Saxony:Dresden|Leipzig;Saxony-Anhalt:Magdeburg;Schleswig-Holstein:Kiel;Thuringia:Erfurt'],
  ['CN', 'China', '🇨🇳', 'CNY', ['中文', 'English'], 'Beijing:Beijing;Shanghai:Shanghai;Tianjin:Tianjin;Chongqing:Chongqing;Guangdong:Shenzhen|Guangzhou;Zhejiang:Hangzhou|Ningbo;Jiangsu:Nanjing|Suzhou;Sichuan:Chengdu;Hubei:Wuhan;Shandong:Jinan|Qingdao;Fujian:Xiamen;Henan:Zhengzhou;Hunan:Changsha;Liaoning:Shenyang;Shaanxi:Xian;Hebei:Shijiazhuang;Anhui:Hefei;Yunnan:Kunming'],
  ['AU', 'Australia', '🇦🇺', 'AUD', ['English'], 'New South Wales:Sydney;Victoria:Melbourne;Queensland:Brisbane|Gold Coast;Western Australia:Perth;South Australia:Adelaide;Tasmania:Hobart;Australian Capital Territory:Canberra;Northern Territory:Darwin'],
  ['CA', 'Canada', '🇨🇦', 'CAD', ['English', 'Français'], 'Ontario:Toronto|Ottawa;Quebec:Montréal|Québec City;British Columbia:Vancouver|Victoria;Alberta:Calgary|Edmonton;Manitoba:Winnipeg;Saskatchewan:Saskatoon|Regina;Nova Scotia:Halifax;New Brunswick:Moncton;Newfoundland and Labrador:St Johns;Prince Edward Island:Charlottetown;Yukon:Whitehorse;Northwest Territories:Yellowknife;Nunavut:Iqaluit'],
  ['SG', 'Singapore', '🇸🇬', 'SGD', ['English'], 'Singapore:Singapore'],
  ['SA', 'Saudi Arabia', '🇸🇦', 'SAR', ['العربية', 'English'], 'Riyadh:Riyadh;Makkah:Jeddah|Mecca;Eastern Province:Dammam|Al Khobar;Madinah:Medina'],
  ['QA', 'Qatar', '🇶🇦', 'QAR', ['العربية', 'English'], 'Doha:Doha;Al Rayyan:Al Rayyan'],
  ['KW', 'Kuwait', '🇰🇼', 'KWD', ['العربية', 'English'], 'Capital:Kuwait City;Hawalli:Hawalli'],
  ['OM', 'Oman', '🇴🇲', 'OMR', ['العربية', 'English'], 'Muscat:Muscat;Dhofar:Salalah'],
  ['BH', 'Bahrain', '🇧🇭', 'BHD', ['العربية', 'English'], 'Capital:Manama'],
  ['MY', 'Malaysia', '🇲🇾', 'MYR', ['English', 'Bahasa'], 'Kuala Lumpur:Kuala Lumpur;Selangor:Shah Alam;Penang:George Town;Johor:Johor Bahru'],
  ['ID', 'Indonesia', '🇮🇩', 'IDR', ['Bahasa', 'English'], 'Jakarta:Jakarta;West Java:Bandung;East Java:Surabaya;Bali:Denpasar'],
  ['TH', 'Thailand', '🇹🇭', 'THB', ['ไทย', 'English'], 'Bangkok:Bangkok;Chiang Mai:Chiang Mai;Phuket:Phuket'],
  ['VN', 'Vietnam', '🇻🇳', 'VND', ['Tiếng Việt', 'English'], 'Hanoi:Hanoi;Ho Chi Minh City:Ho Chi Minh City;Da Nang:Da Nang'],
  ['JP', 'Japan', '🇯🇵', 'JPY', ['日本語', 'English'], 'Tokyo:Tokyo;Osaka:Osaka;Aichi:Nagoya;Kanagawa:Yokohama;Fukuoka:Fukuoka;Hokkaido:Sapporo'],
  ['KR', 'South Korea', '🇰🇷', 'KRW', ['한국어', 'English'], 'Seoul:Seoul;Busan:Busan;Incheon:Incheon'],
  ['FR', 'France', '🇫🇷', 'EUR', ['Français', 'English'], 'Île-de-France:Paris;Auvergne-Rhône-Alpes:Lyon;Provence-Alpes-Côte d Azur:Marseille|Nice;Occitanie:Toulouse;Nouvelle-Aquitaine:Bordeaux;Hauts-de-France:Lille;Grand Est:Strasbourg;Brittany:Rennes'],
  ['IT', 'Italy', '🇮🇹', 'EUR', ['Italiano', 'English'], 'Lombardy:Milan;Lazio:Rome;Campania:Naples;Piedmont:Turin;Veneto:Venice;Tuscany:Florence;Emilia-Romagna:Bologna;Sicily:Palermo'],
  ['ES', 'Spain', '🇪🇸', 'EUR', ['Español', 'English'], 'Madrid:Madrid;Catalonia:Barcelona;Andalusia:Seville|Málaga;Valencia:Valencia;Basque Country:Bilbao'],
  ['NL', 'Netherlands', '🇳🇱', 'EUR', ['Nederlands', 'English'], 'North Holland:Amsterdam;South Holland:Rotterdam|The Hague;Utrecht:Utrecht;North Brabant:Eindhoven'],
  ['CH', 'Switzerland', '🇨🇭', 'CHF', ['Deutsch', 'Français', 'English'], 'Zürich:Zürich;Geneva:Geneva;Bern:Bern;Basel-Stadt:Basel'],
  ['TR', 'Türkiye', '🇹🇷', 'TRY', ['Türkçe', 'English'], 'Istanbul:Istanbul;Ankara:Ankara;İzmir:İzmir;Bursa:Bursa'],
  ['BR', 'Brazil', '🇧🇷', 'BRL', ['Português', 'English'], 'São Paulo:São Paulo;Rio de Janeiro:Rio de Janeiro;Minas Gerais:Belo Horizonte;Paraná:Curitiba;Bahia:Salvador;Distrito Federal:Brasília'],
  ['MX', 'Mexico', '🇲🇽', 'MXN', ['Español', 'English'], 'Mexico City:Mexico City;Jalisco:Guadalajara;Nuevo León:Monterrey;Puebla:Puebla'],
  ['ZA', 'South Africa', '🇿🇦', 'ZAR', ['English'], 'Gauteng:Johannesburg|Pretoria;Western Cape:Cape Town;KwaZulu-Natal:Durban;Eastern Cape:Gqeberha'],
  ['NG', 'Nigeria', '🇳🇬', 'NGN', ['English'], 'Lagos:Lagos;Abuja FCT:Abuja;Rivers:Port Harcourt;Kano:Kano'],
  ['KE', 'Kenya', '🇰🇪', 'KES', ['English', 'Kiswahili'], 'Nairobi:Nairobi;Mombasa:Mombasa;Kisumu:Kisumu'],
  ['EG', 'Egypt', '🇪🇬', 'EGP', ['العربية', 'English'], 'Cairo:Cairo;Alexandria:Alexandria;Giza:Giza'],
  ['BD', 'Bangladesh', '🇧🇩', 'BDT', ['বাংলা', 'English'], 'Dhaka:Dhaka;Chattogram:Chattogram;Khulna:Khulna'],
  ['LK', 'Sri Lanka', '🇱🇰', 'LKR', ['සිංහල', 'English'], 'Western:Colombo;Central:Kandy;Southern:Galle'],
  ['NP', 'Nepal', '🇳🇵', 'NPR', ['नेपाली', 'English'], 'Bagmati:Kathmandu;Gandaki:Pokhara;Lumbini:Bhairahawa'],
  ['PK', 'Pakistan', '🇵🇰', 'PKR', ['English'], 'Punjab:Lahore;Sindh:Karachi;Islamabad Capital:Islamabad'],
]

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

/* Look a city up by name so every screen sets the same country, state and currency in the shared location. */
export function findCity(name) {
  for (const c of GEO) for (const s of c.states) if (s.cities.some((x) => x.n === name)) return { country: c.code, countryName: c.name, state: s.name, city: name, currency: c.cur }
  return null
}
