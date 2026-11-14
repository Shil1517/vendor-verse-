// DEMO DATA ONLY. Never run against production.
//
// Seeds a small, realistic marketplace so the web and mobile apps have something
// to search, book and send RFQs against: Jaipur goes live, three categories,
// four verified vendors, seven approved listings, and demo sign-in accounts.
// Idempotent: every row has a fixed id derived from its name and is upserted,
// so re-running resets the demo rows and leaves everything else alone.
//
// This is deliberately NOT in db/seeds/ (which runs on every environment).
// Values here (prices, deadlines, templates) are demo values, not product
// decisions (CFG items stay open).
//
// Usage: node --env-file=.env scripts/seed-demo.cjs
//   DATABASE_URL and DATABASE_SSL come from the environment. Refuses to run
//   when NODE_ENV=production.
//
// Sign in with any phone below using OTP 123456 (OTP_PROVIDER=local-test only).
// Admin and Sales Agent sign-in additionally needs ALLOW_PRIVILEGED_OTP_SIGNIN=true in
// the backend environment (demo only; the real MFA step is not built yet).

const { createHash } = require("node:crypto");
const { Client } = require("pg");

const id = (name) => {
  const bytes = createHash("sha1").update(`vendorverse-demo:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const INDUSTRY = {
  home: "16af86dd-926e-5ad0-a610-8645a78fd165",
  wholesale: "6b2521cd-7457-5dec-adc4-6d2589711044",
  events: "45bfd247-b012-58dc-a970-ac651c9c8272",
};

const USERS = [
  { key: "admin", phone: "+919000000001", name: "Demo Admin", mode: "customer", role: "SUPER_ADMIN" },
  { key: "agent", phone: "+919000000002", name: "Demo Sales Agent", mode: "customer", role: "SALES_AGENT" },
  { key: "riya", phone: "+919000000010", name: "Riya Sharma", mode: "customer" },
  { key: "arjun", phone: "+919000000011", name: "Arjun Mehta", mode: "customer" },
  { key: "v_plumb", phone: "+919000000021", name: "Rakesh Sharma", mode: "vendor" },
  { key: "v_cool", phone: "+919000000022", name: "Imran Khan", mode: "vendor" },
  { key: "v_pipes", phone: "+919000000023", name: "Sunita Agarwal", mode: "vendor" },
  { key: "v_hw", phone: "+919000000024", name: "Vikram Singh", mode: "vendor" },
  { key: "v_clean", phone: "+919000000025", name: "Meena Joshi", mode: "vendor" },
  { key: "v_cater", phone: "+919000000026", name: "Farhan Qureshi", mode: "vendor" },
  { key: "v_paint", phone: "+919000000027", name: "Deepak Gupta", mode: "vendor" },
  { key: "v_carp", phone: "+919000000028", name: "Anil Choudhary", mode: "vendor" },
  { key: "arjun2", phone: "+919000000012", name: "Kavya Nair", mode: "customer" },
];

const baseConfig = (extra) => ({
  marketRules: [{ countryCode: "IN", enabled: true }],
  attributeSchema: { required: [] },
  ...extra,
});

const CATEGORIES = [
  {
    key: "plumbing",
    industry: INDUSTRY.home,
    name: "Plumbing",
    aliases: ["plumber", "pipe repair", "leak"],
    configuration: baseConfig({
      bookingModes: ["INSTANT", "SCHEDULED"],
      rfqFulfillmentType: "booking",
      responseDeadlineSeconds: 3600,
      responseDeadlineHours: 1,
    }),
  },
  {
    key: "electrical",
    industry: INDUSTRY.home,
    name: "Electrical and AC repair",
    aliases: ["electrician", "ac service", "wiring"],
    configuration: baseConfig({
      bookingModes: ["INSTANT", "SCHEDULED"],
      rfqFulfillmentType: "work_order",
      responseDeadlineSeconds: 3600,
      responseDeadlineHours: 1,
    }),
  },
  {
    key: "hardware",
    industry: INDUSTRY.wholesale,
    name: "Hardware and building materials",
    aliases: ["pipes", "cement", "fittings", "switches"],
    configuration: baseConfig({ bookingModes: [] }),
  },
  {
    key: "cleaning",
    industry: INDUSTRY.home,
    name: "Home cleaning",
    aliases: ["deep cleaning", "sofa cleaning", "maid"],
    configuration: baseConfig({
      bookingModes: ["INSTANT", "SCHEDULED"],
      rfqFulfillmentType: "booking",
      responseDeadlineSeconds: 3600,
      responseDeadlineHours: 1,
    }),
  },
  {
    key: "catering",
    industry: INDUSTRY.events,
    name: "Event catering",
    aliases: ["caterer", "wedding food", "party catering"],
    configuration: baseConfig({
      bookingModes: ["SCHEDULED"],
      rfqFulfillmentType: "work_order",
      responseDeadlineSeconds: 7200,
      responseDeadlineHours: 2,
    }),
  },
  {
    key: "paints",
    industry: INDUSTRY.wholesale,
    name: "Paints and finishing",
    aliases: ["paint", "putty", "primer"],
    configuration: baseConfig({ bookingModes: [] }),
  },
  {
    key: "carpentry",
    industry: INDUSTRY.home,
    name: "Carpentry",
    aliases: ["carpenter", "furniture repair", "modular kitchen"],
    configuration: baseConfig({
      bookingModes: ["SCHEDULED"],
      rfqFulfillmentType: "work_order",
      responseDeadlineSeconds: 7200,
      responseDeadlineHours: 2,
    }),
  },
];

const VENDORS = [
  { key: "plumb", owner: "v_plumb", role: "SERVICE_PROVIDER", legal: "Sharma Plumbing Works", trading: "Sharma Plumbing Works", about: "Jaipur plumbers for leaks, fittings and bathroom work. Same-day visits.", categories: ["plumbing"] },
  { key: "cool", owner: "v_cool", role: "SERVICE_PROVIDER", legal: "CoolAir Services", trading: "CoolAir Services", about: "AC servicing, gas refill and electrical repairs across Jaipur.", categories: ["electrical"] },
  { key: "pipes", owner: "v_pipes", role: "MANUFACTURER", legal: "Jaipur Pipes and Fittings Pvt Ltd", trading: "Jaipur Pipes and Fittings", about: "Manufacturer of CPVC and PVC pipes and fittings.", categories: ["hardware"] },
  { key: "hw", owner: "v_hw", role: "SUPPLIER", legal: "Pink City Hardware Supply", trading: "Pink City Hardware Supply", about: "Cement, switches, paints and general hardware for contractors.", categories: ["hardware"] },
  { key: "clean", owner: "v_clean", role: "SERVICE_PROVIDER", legal: "SparkHome Cleaning Co", trading: "SparkHome Cleaning", about: "Deep cleaning for homes, sofas and kitchens in Jaipur.", categories: ["cleaning"] },
  { key: "cater", owner: "v_cater", role: "SERVICE_PROVIDER", legal: "Royal Rasoi Caterers", trading: "Royal Rasoi Caterers", about: "Weddings, corporate lunches and house parties, vegetarian and non-vegetarian menus.", categories: ["catering"] },
  { key: "paint", owner: "v_paint", role: "SUPPLIER", legal: "Gupta Paints and Hardware", trading: "Gupta Paints", about: "Interior and exterior paints, putty and primers for contractors and homes.", categories: ["paints", "hardware"] },
  { key: "carp", owner: "v_carp", role: "CONTRACTOR", legal: "Choudhary Woodworks", trading: "Choudhary Woodworks", about: "Furniture repair, modular kitchens and wardrobes made on site.", categories: ["carpentry"] },
];

const LISTINGS = [
  { key: "leak", vendor: "plumb", category: "plumbing", type: "service", title: "Leak repair and pipe fitting", description: "Tap, pipe and tank leak repair. Visit within the booked slot.", min: 49900, max: 149900, unit: "visit", instant: true },
  { key: "bath", vendor: "plumb", category: "plumbing", type: "service", title: "Bathroom fittings installation", description: "Basin, shower and geyser fittings installed and tested.", onRequest: true },
  { key: "acs", vendor: "cool", category: "electrical", type: "service", title: "AC servicing and gas refill", description: "Split and window AC deep clean, gas check and refill.", min: 69900, unit: "service", instant: true },
  { key: "wire", vendor: "cool", category: "electrical", type: "service", title: "Wiring and switchboard repair", description: "Fault finding, rewiring and switchboard replacement.", min: 39900, max: 99900, unit: "visit" },
  { key: "cpvc", vendor: "pipes", category: "hardware", type: "product", title: "CPVC pipe 1 inch, 3 m length", description: "ISI-grade CPVC pipe for hot and cold water lines. Bulk rates on request.", min: 18000, max: 24000, unit: "piece" },
  { key: "cement", vendor: "hw", category: "hardware", type: "product", title: "PPC cement, 50 kg bag", description: "Portland pozzolana cement, delivered across Jaipur.", min: 39000, unit: "bag" },
  { key: "deepclean", vendor: "clean", category: "cleaning", type: "service", title: "Full home deep cleaning", description: "Floors, kitchen, bathrooms and windows for a 2 or 3 BHK home.", min: 299900, max: 599900, unit: "home", instant: true },
  { key: "sofa", vendor: "clean", category: "cleaning", type: "service", title: "Sofa and carpet shampooing", description: "Machine shampoo and stain treatment, dry within a day.", min: 79900, unit: "set", instant: true },
  { key: "wedding", vendor: "cater", category: "catering", type: "service", title: "Wedding catering, per plate", description: "Multi-cuisine buffet with live counters, minimum 100 guests.", min: 85000, max: 220000, unit: "plate" },
  { key: "lunch", vendor: "cater", category: "catering", type: "service", title: "Corporate lunch boxes", description: "Fresh vegetarian lunch boxes delivered to your office.", min: 18000, unit: "box" },
  { key: "emulsion", vendor: "paint", category: "paints", type: "product", title: "Interior emulsion paint, 20 L", description: "Washable matt finish, available in 200 shades.", min: 520000, max: 780000, unit: "bucket" },
  { key: "putty", vendor: "paint", category: "paints", type: "product", title: "Wall putty, 40 kg", description: "White cement based wall putty for smooth finish.", min: 98000, unit: "bag" },
  { key: "tmt", vendor: "paint", category: "hardware", type: "product", title: "TMT steel bar 12 mm", description: "Fe 500D TMT bars, price per tonne on request.", onRequest: true },
  { key: "wardrobe", vendor: "carp", category: "carpentry", type: "service", title: "Custom wardrobe, made on site", description: "Plywood wardrobe with laminate finish, measured and installed.", onRequest: true },
  { key: "furnrepair", vendor: "carp", category: "carpentry", type: "service", title: "Furniture repair and polishing", description: "Door, bed and table repair, polish and hinge replacement.", min: 49900, unit: "visit" },
  { key: "switch", vendor: "hw", category: "hardware", type: "product", title: "Modular switch and socket set", description: "Pack of 12 modular switches and sockets, white finish." },
];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false });
  await client.connect();
  const q = (sql, params) => client.query(sql, params);
  try {
    await q("BEGIN");

    // Users and sign-in identifiers (phone is verified so OTP sign-in works).
    for (const u of USERS) {
      const uid = id(`user:${u.key}`);
      await q(
        `INSERT INTO users (id, account_status, current_mode, locale)
         VALUES ($1, 'active', $2, '{"country":"IN","language":"en","timeZone":"Asia/Kolkata","currency":"INR"}'::jsonb)
         ON CONFLICT (id) DO UPDATE SET account_status = 'active', current_mode = EXCLUDED.current_mode`,
        [uid, u.mode],
      );
      await q(
        `INSERT INTO user_identifiers (id, user_id, channel, normalized_value, verified_at)
         VALUES ($1, $2, 'phone', $3, CURRENT_TIMESTAMP)
         ON CONFLICT (channel, normalized_value) DO NOTHING`,
        [id(`ident:${u.key}`), uid, u.phone],
      );
      // RBAC role: admin and agent get theirs; everyone else is a customer, and vendor owners also a vendor.
      for (const role of u.role ? [u.role] : u.key.startsWith("v_") ? ["CUSTOMER", "VENDOR"] : ["CUSTOMER"]) {
        await q(
          `INSERT INTO user_role_assignments (id, user_id, role_code, grant_reason)
           SELECT $1, $2, $3, 'Demo data'
           WHERE NOT EXISTS (SELECT 1 FROM user_role_assignments
                             WHERE user_id = $2 AND role_code = $3 AND revoked_at IS NULL)`,
          [id(`role:${u.key}:${role}`), uid, role],
        );
      }
      if (u.role === "SALES_AGENT") {
        await q(
          `INSERT INTO sales_agent_profiles (user_id, status) VALUES ($1, 'active') ON CONFLICT (user_id) DO NOTHING`,
          [uid],
        );
      }
      await q(
        `INSERT INTO customer_profiles (user_id, display_name) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [uid, u.name],
      );
    }
    const admin = id("user:admin");

    // Jaipur goes live, plus a country-wide live row for searches without a city.
    const country = (await q(`SELECT id FROM countries WHERE iso_code = 'IN'`)).rows[0]?.id;
    if (!country) throw new Error("Run `npm run db:seed` first: India geography is missing");
    const jaipur = (await q(`SELECT id, region_id FROM cities WHERE country_id = $1 AND name = 'Jaipur'`, [country])).rows[0];
    await q(
      `UPDATE market_activations
       SET status = 'live', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
           activated_by_user_id = $2, enabled_languages = '["en"]'::jsonb,
           currencies = '["INR"]'::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE city_id = $1`,
      [jaipur.id, admin],
    );
    const countryRow = await q(`SELECT 1 FROM market_activations WHERE country_id = $1 AND city_id IS NULL`, [country]);
    if (countryRow.rowCount === 0) {
      await q(
        `INSERT INTO market_activations (country_id, status, activated_at, activated_by_user_id, enabled_languages, currencies)
         VALUES ($1, 'live', CURRENT_TIMESTAMP, $2, '["en"]'::jsonb, '["INR"]'::jsonb)`,
        [country, admin],
      );
    } else {
      await q(
        `UPDATE market_activations SET status = 'live', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
                activated_by_user_id = $2 WHERE country_id = $1 AND city_id IS NULL`,
        [country, admin],
      );
    }

    // Categories (version 1, ACTIVE) with their configuration.
    for (const c of CATEGORIES) {
      const cid = id(`category:${c.key}`);
      await q(
        // always_show: the public category browse hides a category with no
        // listings-module-eligible listing unless a Super Admin sets it (F-TAX-01).
        `INSERT INTO categories (id, industry_id, current_version, lifecycle, sort_order, always_show)
         VALUES ($1, $2, 1, 'ACTIVE', $3, true)
         ON CONFLICT (id) DO UPDATE SET lifecycle = 'ACTIVE', always_show = true`,
        [cid, c.industry, CATEGORIES.indexOf(c) + 1],
      );
      await q(
        `INSERT INTO category_config_versions (id, category_id, version_number, name, aliases, configuration, created_by_user_id)
         VALUES ($1, $2, 1, $3, $4::jsonb, $5::jsonb, $6)
         ON CONFLICT (category_id, version_number) DO NOTHING`, // versions are immutable
        [id(`categoryconfig:${c.key}`), cid, c.name, JSON.stringify(c.aliases), JSON.stringify(c.configuration), admin],
      );
    }

    // Vendors, profiles, verified roles, categories.
    for (const v of VENDORS) {
      const vid = id(`vendor:${v.key}`);
      await q(
        `INSERT INTO vendors (id, owner_user_id, business_type, legal_name, registration_country)
         VALUES ($1, $2, $3, $4, 'IN')
         ON CONFLICT (id) DO UPDATE SET business_type = EXCLUDED.business_type, legal_name = EXCLUDED.legal_name`,
        [vid, id(`user:${v.owner}`), v.role, v.legal],
      );
      await q(
        `INSERT INTO vendor_profiles (vendor_id, trading_name, description, languages)
         VALUES ($1, $2, $3, '["en","hi"]'::jsonb)
         ON CONFLICT (vendor_id) DO UPDATE SET trading_name = EXCLUDED.trading_name, description = EXCLUDED.description`,
        [vid, v.trading, v.about],
      );
      await q(
        `INSERT INTO vendor_roles (vendor_id, role_code, status, reviewer_user_id, reason, decided_at)
         VALUES ($1, $2, 'verified', $3, 'Demo data: verified for the demo marketplace', CURRENT_TIMESTAMP)
         ON CONFLICT (vendor_id, role_code)
         DO UPDATE SET status = 'verified', reviewer_user_id = EXCLUDED.reviewer_user_id,
                       reason = EXCLUDED.reason, decided_at = CURRENT_TIMESTAMP`,
        [vid, v.role, admin],
      );
      for (const category of v.categories) {
        await q(
          `INSERT INTO vendor_categories (vendor_id, category_id, config_version_number)
           VALUES ($1, $2, 1) ON CONFLICT (vendor_id, category_id) DO NOTHING`,
          [vid, id(`category:${category}`)],
        );
      }
      // Vendor-wide coverage: the whole Jaipur city.
      await q(
        `INSERT INTO service_areas (id, vendor_id, coverage_type, country_id, region_id, city_id)
         VALUES ($1, $2, 'city', $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [id(`area:${v.key}`), vid, country, jaipur.region_id, jaipur.id],
      );
    }

    // Listings: approved, priced where the vendor stated a price.
    for (const l of LISTINGS) {
      const lid = id(`listing:${l.key}`);
      await q(
        `INSERT INTO listings
           (id, vendor_id, category_id, config_version_number, listing_type, title, description,
            content_state, price_on_request, price_min_minor, price_max_minor, price_currency,
            price_unit, time_zone, instant_booking_enabled)
         VALUES ($1, $2, $3, 1, $4, $5, $6, 'approved', $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, content_state = 'approved',
           price_on_request = EXCLUDED.price_on_request, price_min_minor = EXCLUDED.price_min_minor,
           price_max_minor = EXCLUDED.price_max_minor, price_currency = EXCLUDED.price_currency,
           price_unit = EXCLUDED.price_unit, time_zone = EXCLUDED.time_zone,
           instant_booking_enabled = EXCLUDED.instant_booking_enabled, updated_at = CURRENT_TIMESTAMP`,
        [
          lid, id(`vendor:${l.vendor}`), id(`category:${l.category}`), l.type, l.title, l.description,
          Boolean(l.onRequest), l.min ?? null, l.max ?? null,
          l.min != null || l.max != null ? "INR" : null, l.min != null || l.max != null ? l.unit : null,
          l.type === "service" ? "Asia/Kolkata" : null, Boolean(l.instant),
        ],
      );
      if (l.type === "service") {
        await q(
          `INSERT INTO availability_rules (id, listing_id, availability_model, time_zone, weekly_schedule)
           VALUES ($1, $2, 'slots', 'Asia/Kolkata', '{}'::jsonb) ON CONFLICT (id) DO NOTHING`,
          [id(`rule:${l.key}`), lid],
        );
      }
      if (l.instant) {
        // Two bookable windows a day for the next 14 days (IST). Existing windows
        // are kept so reservations are not wiped on re-run.
        await q(
          `INSERT INTO availability_capacity (id, listing_id, starts_at, ends_at, capacity)
           SELECT md5($1 || d::text || s.slot)::uuid, $2,
                  ((current_date + d) + s.start_time) AT TIME ZONE 'Asia/Kolkata',
                  ((current_date + d) + s.end_time) AT TIME ZONE 'Asia/Kolkata', 2
           FROM generate_series(1, 14) AS d
           CROSS JOIN (VALUES ('am', time '10:00', time '12:00'), ('pm', time '14:00', time '16:00'))
                AS s(slot, start_time, end_time)
           ON CONFLICT DO NOTHING`,
          [`cap:${l.key}`, lid],
        );
      }
    }

    await q("COMMIT");
    console.log("Demo data seeded. Sign in with OTP 123456:");
    for (const u of USERS) console.log(`  ${u.phone}  ${u.name}${u.key.startsWith("v_") ? " (vendor owner)" : u.key === "admin" ? " (Super Admin)" : u.key === "agent" ? " (Sales Agent)" : " (customer)"}`);
  } catch (error) {
    await q("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
