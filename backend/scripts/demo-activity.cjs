// DEMO DATA ONLY. Adds sample bookings and RFQs in different states through the
// real API (so every row passes the same rules as the apps), for the Activity
// and Work screens of the demo accounts. Run after scripts/seed-demo.cjs against
// a RUNNING backend. Safe to re-run: bookings use fixed idempotency keys and RFQs
// are skipped when one with the same title already exists.
//
// Usage: node scripts/demo-activity.cjs [http://127.0.0.1:3001/v1]

const base = process.argv[2] ?? "http://127.0.0.1:3001/v1";
const PHONE = {
  riya: "+919000000010", arjun: "+919000000011", kavya: "+919000000012",
  plumber: "+919000000021", cool: "+919000000022", pipes: "+919000000023", hw: "+919000000024",
  clean: "+919000000025", cater: "+919000000026", paint: "+919000000027", carp: "+919000000028",
};

async function call(method, path, { token, body, headers } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data };
}
const must = (label, r, ...ok) => {
  if (!ok.includes(r.status)) throw new Error(`${label}: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 250)}`);
  console.log(`ok  ${label}`);
  return r.data;
};

async function signIn(phone) {
  const c = await call("POST", "/auth/otp/request", { body: { channel: "phone", identifier: phone } });
  const v = await call("POST", "/auth/otp/verify", { body: { challengeId: c.data.challengeId, code: "123456" } });
  if (!v.data.accessToken) throw new Error(`sign-in failed for ${phone}`);
  return v.data.accessToken;
}

const tokens = {};
let listings = [];
const listing = (title) => {
  const found = listings.find((l) => l.title.startsWith(title));
  if (!found) throw new Error(`listing not found: ${title} (run seed-demo.cjs first)`);
  return found;
};
const vendorId = async (token) => (await call("GET", "/vendors/mine", { token })).data.vendors?.[0]?.id
  ?? (await call("GET", "/vendors/mine", { token })).data[0]?.id;

async function freeWindow(token, listingId, skip = 0) {
  const r = await call("GET", `/listings/${listingId}/capacity`, { token });
  const free = (r.data.windows ?? r.data).filter((w) => w.capacity - w.reserved > 0);
  return free[skip];
}
const day = (n, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setUTCHours(hour, 30, 0, 0); // hour is UTC; 04:30 UTC = 10:00 IST
  return d.toISOString();
};

async function booking(label, customer, item, key, extra = {}) {
  const l = listing(item);
  const slot = l.instantBooking ? await freeWindow(tokens.owner[l.vendor.id], l.id, extra.skip ?? 0) : null;
  const body = {
    listingId: l.id, mode: "scheduled", timeZone: "Asia/Kolkata",
    slotStart: slot?.startsAt ?? day(extra.days ?? 3, 4), slotEnd: slot?.endsAt ?? day(extra.days ?? 3, 6),
  };
  const created = must(`${label}: request`, await call("POST", "/remote-bookings", { token: tokens[customer], headers: { "idempotency-key": key }, body }), 200, 201);
  return (created.bookings?.[0] ?? created).id;
}

async function rfq(label, customer, body, vendorKeys, deadlineDays = 4) {
  const mine = (await call("GET", "/me/rfqs", { token: tokens[customer] })).data;
  const list = mine.rfqs ?? mine.items ?? mine;
  const existing = list.find?.((r) => r.requirements?.title === body.requirements.title);
  if (existing) { console.log(`skip ${label}: already exists`); return null; }
  const draft = must(`${label}: draft`, await call("POST", "/rfqs", { token: tokens[customer], body }), 201);
  const vendorIds = await Promise.all(vendorKeys.map((k) => vendorId(tokens[k])));
  must(`${label}: open`, await call("POST", `/rfqs/${draft.id}/open`, {
    token: tokens[customer],
    body: { quoteDeadlineAt: new Date(Date.now() + deadlineDays * 86400000).toISOString(), vendorIds },
  }), 200, 201);
  return { id: draft.id, vendorIds };
}
const quote = async (label, token, rfqId, vendor, fields) =>
  must(`${label}: quote`, await call("POST", `/rfqs/${rfqId}/quotes`, { token, body: { vendorId: vendor, currency: "INR", ...fields } }), 201);

(async () => {
  for (const [k, phone] of Object.entries(PHONE)) tokens[k] = await signIn(phone);
  listings = (await call("GET", "/discover/listings?countryCode=IN&limit=50")).data.items;
  // vendor id -> owner's token, to read capacity windows.
  tokens.owner = {};
  for (const k of ["plumber", "cool", "pipes", "hw", "clean", "cater", "paint", "carp"]) tokens.owner[await vendorId(tokens[k])] = tokens[k];

  // --- Bookings in different states ---
  const pending = await booking("pending booking (deep cleaning)", "riya", "Full home deep cleaning", "demo-activity-b1", { skip: 6 });
  const confirmed = await booking("confirmed booking (AC service)", "riya", "AC servicing", "demo-activity-b2", { skip: 7 });
  must("confirmed: vendor accepts", await call("POST", `/remote-bookings/${confirmed}/accept`, { token: tokens.cool }), 200, 409);
  const done = await booking("completed booking (sofa)", "riya", "Sofa and carpet", "demo-activity-b3", { skip: 8 });
  must("completed: accept", await call("POST", `/remote-bookings/${done}/accept`, { token: tokens.clean }), 200, 409);
  must("completed: start", await call("POST", `/remote-bookings/${done}/start`, { token: tokens.clean }), 200, 409);
  must("completed: vendor marks complete", await call("POST", `/remote-bookings/${done}/complete`, { token: tokens.clean, body: {} }), 200, 409);
  const kavya = await booking("Kavya's booking (wiring repair)", "kavya", "Wiring and switchboard", "demo-activity-b4", { days: 5 });
  must("Kavya's booking: vendor accepts", await call("POST", `/remote-bookings/${kavya}/accept`, { token: tokens.cool }), 200, 409);
  const declined = await booking("declined booking (furniture repair)", "arjun", "Furniture repair", "demo-activity-b5", { days: 6 });
  must("declined: vendor declines", await call("POST", `/remote-bookings/${declined}/decline`, { token: tokens.carp, body: { reason: "Fully booked that week" } }), 200, 409);

  // --- RFQs: a service RFQ with a quote waiting, and a goods RFQ to compare ---
  const wardrobe = listing("Custom wardrobe");
  const r1 = await rfq("service RFQ (wardrobe)", "riya", {
    categoryId: wardrobe.categoryId, kind: "service",
    requirements: { title: "Wardrobe for master bedroom", description: "Floor to ceiling, 3 doors, laminate finish, Jaipur Vaishali Nagar." },
  }, ["carp"]);
  if (r1) await quote("wardrobe", tokens.carp, r1.id, r1.vendorIds[0], { totalMinor: 4800000, scope: "Plywood wardrobe, 8 x 7 ft, laminate finish, installed.", inclusions: ["Materials", "Installation"], exclusions: ["Loft storage"] });

  const cement = listing("PPC cement");
  const r2 = await rfq("goods RFQ (building materials)", "arjun", {
    categoryId: cement.categoryId, kind: "goods",
    requirements: { title: "Cement and CPVC pipes for 2 BHK build", description: "Delivery to Mansarovar, Jaipur. Need within 10 days.", quantity: "200 bags cement, 150 CPVC pipes" },
  }, ["hw", "pipes", "paint"]);
  if (r2) {
    await quote("goods RFQ", tokens.hw, r2.id, r2.vendorIds[0], {
      totalMinor: 7800000 + 0, scope: "Cement, delivered", validUntil: new Date(Date.now() + 5 * 86400000).toISOString(),
      lines: [{ description: "PPC cement, 50 kg bag", quantity: 200, unit: "bag", unitPriceMinor: 39000, lineTotalMinor: 7800000 }],
    });
    await quote("goods RFQ", tokens.pipes, r2.id, r2.vendorIds[1], {
      totalMinor: 3300000, scope: "CPVC pipes, delivered", validUntil: new Date(Date.now() + 5 * 86400000).toISOString(),
      lines: [{ description: "CPVC pipe 1 inch, 3 m length", quantity: 150, unit: "piece", unitPriceMinor: 22000, lineTotalMinor: 3300000 }],
    });
  }

  const wedding = listing("Wedding catering");
  await rfq("catering RFQ (no quotes yet)", "kavya", {
    categoryId: wedding.categoryId, kind: "service",
    requirements: { title: "Engagement dinner for 150 guests", description: "Vegetarian buffet, evening, Jaipur." },
  }, ["cater"], 6);

  console.log("\nDemo activity ready. Sign in as Riya (+919000000010), Arjun (+919000000011) or Kavya (+919000000012); vendors +919000000021 to +919000000028. OTP 123456.");
})().catch((error) => { console.error("failed:", error.message); process.exit(1); });
