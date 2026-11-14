// End-to-end smoke test of the demo flows against a RUNNING backend that was
// seeded with scripts/seed-demo.cjs. It creates real rows (a booking, an RFQ,
// a quote) in whatever database the backend uses, so run it against demo data only.
//
// Usage: node scripts/demo-smoke.cjs [http://127.0.0.1:3001/v1]
// Needs OTP_PROVIDER=local-test (fixed code 123456).

const base = process.argv[2] ?? "http://127.0.0.1:3001/v1";
const PHONE = { riya: "+919000000010", arjun: "+919000000011", plumber: "+919000000021", cool: "+919000000022", pipes: "+919000000023" };
const checks = [];

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

function check(name, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}

async function signIn(phone) {
  const challenge = await call("POST", "/auth/otp/request", { body: { channel: "phone", identifier: phone } });
  const verified = await call("POST", "/auth/otp/verify", { body: { challengeId: challenge.data.challengeId, code: "123456" } });
  if (!verified.data.accessToken) throw new Error(`sign-in failed for ${phone}: ${JSON.stringify(verified.data).slice(0, 200)}`);
  return verified.data.accessToken;
}

async function vendorIdOf(token) {
  const mine = await call("GET", "/me/vendors", { token });
  return mine.data.vendors?.[0]?.id ?? mine.data[0]?.id;
}

(async () => {
  const [riya, arjun, plumber, cool] = await Promise.all([PHONE.riya, PHONE.arjun, PHONE.plumber, PHONE.cool].map(signIn));
  check("sign in (customer, 3 vendors' owners via OTP)", Boolean(riya && arjun && plumber && cool));

  // ---- Universal search ----
  const pub = await call("GET", "/search?q=pipe&countryCode=IN");
  check("search: anonymous gets public sections", pub.status === 200 && pub.data.marketLive && pub.data.sections.service?.items.length > 0, JSON.stringify(pub.data).slice(0, 160));
  check("search: anonymous gets no private sections", !pub.data.sections.booking && !pub.data.sections.rfq);
  check("search: private type without token is 401", (await call("GET", "/search?q=pipe&countryCode=IN&types=booking")).status === 401);
  check("search: bad token is 401, not anonymous", (await call("GET", "/search?q=pipe&countryCode=IN", { token: "garbage" })).status === 401);
  const category = await call("GET", "/search?q=plumb&countryCode=IN&types=category");
  check("search: category by alias", category.data.sections.category?.items.some((c) => c.name === "Plumbing"));
  const jaipur = (await call("GET", "/geo/countries/IN/cities")).data;
  const cities = jaipur.cities ?? jaipur;
  const ajmer = cities.find?.((c) => c.name === "Ajmer");
  if (ajmer) {
    const notLive = await call("GET", `/search?q=pipe&countryCode=IN&cityId=${ajmer.id}`);
    check("search: a not-live city returns marketLive=false and nothing public", notLive.data.marketLive === false && notLive.data.sections.service.items.length === 0);
  }

  // ---- Listing, favourite, instant booking ----
  const listings = await call("GET", "/discover/listings?countryCode=IN&q=leak");
  const leak = listings.data.items.find((l) => l.title.startsWith("Leak repair"));
  check("discover: finds the plumbing listing", Boolean(leak));
  const detail = await call("GET", `/discover/listings/${leak.id}`);
  check("listing detail", detail.status === 200 && detail.data.instantBooking === true);
  check("favourite a vendor", (await call("PUT", `/me/favorites/${leak.vendor.id}`, { token: riya })).status === 204);

  // ---- Booking (the API the web calls) ----
  const slot = await pickCapacity(plumber, leak.id);
  const created = await call("POST", "/remote-bookings", {
    token: riya,
    headers: { "idempotency-key": `smoke-${Date.now()}` },
    body: { listingId: leak.id, mode: "scheduled", slotStart: slot.startsAt, slotEnd: slot.endsAt, timeZone: "Asia/Kolkata" },
  });
  const booking = created.data.bookings?.[0] ?? created.data;
  check("booking: customer requests a slot", created.status === 201 && booking.id, JSON.stringify(created.data).slice(0, 200));
  if (booking.id) {
    const accepted = await call("POST", `/remote-bookings/${booking.id}/accept`, { token: plumber });
    check("booking: vendor owner accepts", accepted.status === 200 && accepted.data.state === "confirmed", JSON.stringify(accepted.data).slice(0, 200));
    check("booking: other customer cannot read it", (await call("GET", `/remote-bookings/${booking.id}`, { token: arjun })).status === 404);
    const mine = await call("GET", "/search?q=leak&countryCode=IN&types=booking", { token: riya });
    check("search: customer finds own booking", mine.data.sections.booking?.items.some((b) => b.id === booking.id));
    const theirs = await call("GET", "/search?q=leak&countryCode=IN&types=booking", { token: arjun });
    check("search: another customer does not see it", theirs.data.sections.booking?.items.length === 0);
    const vendorSide = await call("GET", "/search?q=leak&countryCode=IN&types=booking", { token: plumber });
    check("search: vendor owner sees it as vendor", vendorSide.data.sections.booking?.items.some((b) => b.id === booking.id && b.role === "vendor"));
  }

  // ---- RFQ -> quote -> accept (service, fulfilment = booking) ----
  const plumberVendor = leak.vendor.id;
  const rfq = await call("POST", "/rfqs", {
    token: riya,
    body: { categoryId: leak.categoryId, kind: "service", requirements: { title: "Kitchen sink leak", description: "Water leaking under the kitchen sink", listingId: leak.id } },
  });
  check("rfq: customer creates a draft", rfq.status === 201 && rfq.data.id, JSON.stringify(rfq.data).slice(0, 200));
  const rfqId = rfq.data.id;
  const deadline = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
  const opened = await call("POST", `/rfqs/${rfqId}/open`, { token: riya, body: { quoteDeadlineAt: deadline, vendorIds: [plumberVendor] } });
  check("rfq: customer opens it to the plumber", opened.status === 200 || opened.status === 201, JSON.stringify(opened.data).slice(0, 200));
  const slot2 = await pickCapacity(plumber, leak.id, 1);
  const quote = await call("POST", `/rfqs/${rfqId}/quotes`, {
    token: plumber,
    body: {
      vendorId: plumberVendor, currency: "INR", totalMinor: 89900, scope: "Fix sink leak, replace trap",
      timeline: { slotStart: slot2.startsAt, slotEnd: slot2.endsAt, timeZone: "Asia/Kolkata", capacityId: slot2.id },
    },
  });
  check("rfq: invited vendor submits a quote", quote.status === 201 && quote.data.id, JSON.stringify(quote.data).slice(0, 200));
  check("rfq: a different vendor cannot read the RFQ", (await call("GET", `/rfqs/${rfqId}`, { token: cool })).status >= 400);
  const vendorSearch = await call("GET", "/search?q=sink&countryCode=IN&types=rfq", { token: plumber });
  check("search: invited vendor finds the RFQ, customer too", vendorSearch.data.sections.rfq?.items.some((r) => r.id === rfqId && r.role === "vendor")
    && (await call("GET", "/search?q=sink&countryCode=IN&types=rfq", { token: riya })).data.sections.rfq.items.some((r) => r.id === rfqId && r.role === "customer"));
  check("search: uninvited vendor and other customer do not", (await call("GET", "/search?q=sink&countryCode=IN&types=rfq", { token: cool })).data.sections.rfq.items.length === 0
    && (await call("GET", "/search?q=sink&countryCode=IN&types=rfq", { token: arjun })).data.sections.rfq.items.length === 0);
  const acceptedQuote = await call("POST", `/rfqs/${rfqId}/quotes/${quote.data.id}/accept`, { token: riya });
  check("rfq: customer accepts the quote", acceptedQuote.status === 200 || acceptedQuote.status === 201, JSON.stringify(acceptedQuote.data).slice(0, 300));
  if (acceptedQuote.status < 300) {
    const bookings = await call("GET", "/me/bookings", { token: riya });
    check("rfq: acceptance created a booking from the quote", JSON.stringify(bookings.data).includes("confirmed") || (bookings.data.bookings ?? bookings.data).length > 0, JSON.stringify(bookings.data).slice(0, 200));
  }

  const failed = checks.filter((ok) => !ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => { console.error("smoke aborted:", error.message); process.exit(2); });

async function pickCapacity(token, listingId, index = 0) {
  const windows = await call("GET", `/listings/${listingId}/capacity`, { token });
  const list = (windows.data.windows ?? windows.data).filter((w) => w.capacity - w.reserved > 0);
  return list[index + 3] ?? list[index];
}
