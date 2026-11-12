// Verifies the database schema end to end against a DISPOSABLE Postgres 16:
//   1. applies every migration, then the seeds twice (idempotency)
//   2. proves the integrity rules by trying to break them
//   3. rolls every migration back, checks nothing is left, and re-applies
//
// Usage: DATABASE_URL=postgres://... node scripts/verify-schema.cjs
// Refuses to run unless the host is localhost, because step 3 drops everything.
// (Set VERIFY_ALLOW_NON_LOCAL=true only for a throwaway database you own.)
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const host = new URL(url).hostname;
if (
  !["localhost", "127.0.0.1", "::1"].includes(host) &&
  process.env.VERIFY_ALLOW_NON_LOCAL !== "true"
) {
  throw new Error(
    `Refusing to run: "${host}" is not localhost. This script drops every table.`,
  );
}

const root = path.join(__dirname, "..");
const run = (script, ...args) =>
  execFileSync(process.execPath, [path.join(root, "scripts", script), ...args], {
    env: { ...process.env, ALLOW_DESTRUCTIVE_DOWN: "true" },
    encoding: "utf8",
  });

const id = () => crypto.randomUUID();
let passed = 0;
const failures = [];

async function main() {
  console.log("== up ==");
  console.log(run("migrate.cjs", "up"));
  console.log("== up again (must skip everything) ==");
  if (/apply /.test(run("migrate.cjs", "up")))
    throw new Error("second run applied something");
  console.log("== seeds, twice ==");
  run("seed.cjs");
  run("seed.cjs");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await invariants(client);
  } finally {
    await client.end();
  }

  console.log("== down, all the way ==");
  for (;;) {
    const out = run("migrate.cjs", "down");
    process.stdout.write(out);
    if (out.includes("nothing to roll back")) break;
  }
  const check = new Client({ connectionString: url });
  await check.connect();
  const left = (
    await check.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'schema_migrations'`,
    )
  ).rows;
  await check.end();
  if (left.length)
    throw new Error(`down left tables behind: ${left.map((r) => r.table_name)}`);
  console.log("== up once more after full rollback ==");
  console.log(run("migrate.cjs", "up"));

  console.log(`\n${passed} checks passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
}

// Runs sql inside a savepoint and rolls it back, so checks do not interfere.
async function attempt(client, sql, params = []) {
  await client.query("SAVEPOINT check_point");
  try {
    await client.query(sql, params);
    return null;
  } catch (error) {
    return error;
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT check_point");
  }
}

async function mustFail(client, name, sql, params, code) {
  const error = await attempt(client, sql, params);
  if (!error) failures.push(`${name}: expected a failure but it succeeded`);
  else if (code && error.code !== code)
    failures.push(`${name}: expected SQLSTATE ${code}, got ${error.code} (${error.message})`);
  else passed += 1;
}

async function mustPass(client, name, sql, params) {
  const error = await attempt(client, sql, params);
  if (error) failures.push(`${name}: unexpected failure (${error.message})`);
  else passed += 1;
}

async function invariants(client) {
  await client.query("BEGIN");
  const q = (sql, params) => client.query(sql, params);

  // --- fixture graph -------------------------------------------------------
  const [customer, owner, otherOwner, reviewer] = [id(), id(), id(), id()];
  for (const u of [customer, owner, otherOwner, reviewer])
    await q(`INSERT INTO users (id, account_status, current_mode) VALUES ($1, 'active', 'customer')`, [u]);
  const [vendor, otherVendor] = [id(), id()];
  await q(`INSERT INTO vendors (id, owner_user_id, business_type) VALUES ($1, $2, 'SUPPLIER'), ($3, $4, 'SUPPLIER')`,
    [vendor, owner, otherVendor, otherOwner]);
  const industry = (await q(`SELECT id FROM industries ORDER BY sort_order LIMIT 1`)).rows[0].id;
  const category = id();
  await q(`INSERT INTO categories (id, industry_id, current_version, lifecycle, sort_order) VALUES ($1, $2, 1, 'ACTIVE', 1)`, [category, industry]);
  await q(`INSERT INTO category_config_versions (id, category_id, version_number, name, configuration) VALUES ($1, $2, 1, 'Test', '{}')`, [id(), category]);
  const listing = id();
  await q(`INSERT INTO listings (id, vendor_id, category_id, config_version_number, listing_type, title, price_min_minor, price_currency, time_zone)
           VALUES ($1, $2, $3, 1, 'service', 'Test listing', 1000, 'INR', 'Asia/Kolkata')`, [listing, vendor, category]);

  // --- seeds ---------------------------------------------------------------
  const live = (await q(`SELECT count(*)::int n FROM market_activations WHERE status = 'live'`)).rows[0].n;
  live === 0 ? passed++ : failures.push("seed activated a market");
  const cfg = (await q(`SELECT count(*)::int n FROM config_register_items WHERE status = 'open'`)).rows[0].n;
  cfg === 19 ? passed++ : failures.push(`expected 19 open CFG items, got ${cfg}`);
  const cities = (await q(`SELECT count(*)::int n FROM cities`)).rows[0].n;
  cities === 4 ? passed++ : failures.push(`expected 4 seeded cities, got ${cities}`);

  // --- immutability --------------------------------------------------------
  await mustFail(client, "config version is immutable", `UPDATE category_config_versions SET name = 'x'`, [], "23000");
  await q(`INSERT INTO audit_events (actor_service, action, target_type, target_id) VALUES ('verify', 'test', 'x', '1')`);
  await mustFail(client, "audit update blocked", `UPDATE audit_events SET reason = 'x'`, [], "23000");
  await mustFail(client, "audit delete blocked", `DELETE FROM audit_events`, [], "23000");
  await mustFail(client, "audit truncate blocked", `TRUNCATE audit_events`, [], "23000");
  await mustFail(client, "audit needs an actor", `INSERT INTO audit_events (action, target_type, target_id) VALUES ('a','b','c')`, [], "23514");

  // --- vendor / listing rules ---------------------------------------------
  await mustFail(client, "owner cannot approve own verification",
    `INSERT INTO verifications (vendor_id, level, status, reviewer_user_id, reason, decided_at)
     VALUES ($1, 'L1', 'approved', $2, 'ok', now())`, [vendor, owner], "23000");
  await mustPass(client, "independent reviewer can approve",
    `INSERT INTO verifications (vendor_id, level, status, reviewer_user_id, reason, decided_at)
     VALUES ($1, 'L1', 'approved', $2, 'ok', now())`, [vendor, reviewer]);
  await mustFail(client, "verification level L4 is Phase 2",
    `INSERT INTO verifications (vendor_id, level) VALUES ($1, 'L4')`, [vendor], "23514");
  await mustFail(client, "decision needs a reason",
    `INSERT INTO verifications (vendor_id, level, status, reviewer_user_id, decided_at)
     VALUES ($1, 'L1', 'rejected', $2, now())`, [vendor, reviewer], "23514");
  await mustFail(client, "listing owner cannot review own listing",
    `INSERT INTO listing_reviews (listing_id, reviewer_user_id, status) VALUES ($1, $2, 'approved')`, [listing, owner], "23000");
  await mustFail(client, "price on request cannot carry a price",
    `INSERT INTO listings (vendor_id, category_id, config_version_number, listing_type, title, price_on_request, price_min_minor, price_currency)
     VALUES ($1, $2, 1, 'service', 'x', true, 5, 'INR')`, [vendor, category], "23514");
  await mustFail(client, "price needs a currency",
    `INSERT INTO listings (vendor_id, category_id, config_version_number, listing_type, title, price_min_minor)
     VALUES ($1, $2, 1, 'service', 'x', 5)`, [vendor, category], "23514");
  await mustFail(client, "listing must use an existing category version",
    `INSERT INTO listings (vendor_id, category_id, config_version_number, listing_type, title)
     VALUES ($1, $2, 99, 'service', 'x')`, [vendor, category], "23503");
  await mustFail(client, "no worldwide coverage",
    `INSERT INTO service_areas (vendor_id, coverage_type) VALUES ($1, 'worldwide')`, [vendor], "23514");
  await mustFail(client, "city coverage needs a city",
    `INSERT INTO service_areas (vendor_id, coverage_type) VALUES ($1, 'city')`, [vendor], "23514");
  await mustPass(client, "remote coverage is explicit",
    `INSERT INTO service_areas (vendor_id, coverage_type) VALUES ($1, 'remote')`, [vendor]);
  await q(`INSERT INTO availability_capacity (listing_id, starts_at, ends_at, capacity) VALUES ($1, '2030-01-01T10:00Z', '2030-01-01T11:00Z', 1)`, [listing]);
  await mustFail(client, "overlapping capacity windows blocked",
    `INSERT INTO availability_capacity (listing_id, starts_at, ends_at, capacity) VALUES ($1, '2030-01-01T10:30Z', '2030-01-01T11:30Z', 1)`, [listing], "23P01");
  await mustFail(client, "cannot over-reserve capacity",
    `UPDATE availability_capacity SET reserved = 2 WHERE listing_id = $1`, [listing], "23514");

  // --- RFQ / quote / acceptance -------------------------------------------
  const rfq = id();
  await q(`INSERT INTO rfqs (id, customer_user_id, category_id, kind, state, quote_deadline_at)
           VALUES ($1, $2, $3, 'goods', 'open', now() + interval '1 day')`, [rfq, customer, category]);
  await q(`INSERT INTO rfq_revisions (rfq_id, revision_number, requirements, category_config_version, created_by_user_id)
           VALUES ($1, 1, '{}', 1, $2)`, [rfq, customer]);
  await q(`INSERT INTO rfq_recipients (rfq_id, vendor_id) VALUES ($1, $2), ($1, $3)`, [rfq, vendor, otherVendor]);
  const [quoteA, quoteB] = [id(), id()];
  const revA = id();
  await q(`INSERT INTO quotes (id, rfq_id, vendor_id) VALUES ($1, $2, $3), ($4, $2, $5)`, [quoteA, rfq, vendor, quoteB, otherVendor]);
  await q(`INSERT INTO quote_revisions (id, quote_id, revision_number, currency, total_minor) VALUES ($1, $2, 1, 'INR', 5000), ($3, $4, 1, 'INR', 6000)`,
    [revA, quoteA, id(), quoteB]);
  await mustFail(client, "uninvited vendor cannot quote",
    `INSERT INTO quotes (rfq_id, vendor_id) VALUES ($1, $2)`, [rfq, owner], "23503");
  await mustFail(client, "quote must carry a valid currency",
    `INSERT INTO quote_revisions (quote_id, revision_number, currency, total_minor) VALUES ($1, 2, 'rupees', 1)`, [quoteA], "23514");

  await q(`UPDATE quotes SET state = 'accepted' WHERE id = $1`, [quoteA]);
  await mustFail(client, "only one accepted quote per RFQ",
    `UPDATE quotes SET state = 'accepted' WHERE id = $1`, [quoteB], "23505");
  await q(`INSERT INTO accepted_terms_snapshots (rfq_id, quote_id, quote_revision_id, immutable_terms, accepted_by_user_id)
           VALUES ($1, $2, $3, '{}', $4)`, [rfq, quoteA, revA, customer]);
  await mustFail(client, "second snapshot for the same RFQ blocked",
    `INSERT INTO accepted_terms_snapshots (rfq_id, quote_id, quote_revision_id, immutable_terms, accepted_by_user_id)
     VALUES ($1, $2, $3, '{}', $4)`, [rfq, quoteA, revA, customer], "23505");
  await mustFail(client, "snapshot must use a quote of that RFQ",
    `INSERT INTO accepted_terms_snapshots (rfq_id, quote_id, quote_revision_id, immutable_terms, accepted_by_user_id)
     VALUES ($1, $2, $3, '{}', $4)`, [id(), quoteB, revA, customer], "23503");
  await mustFail(client, "accepted terms are immutable",
    `UPDATE accepted_terms_snapshots SET immutable_terms = '{"a":1}'`, [], "23000");
  await mustFail(client, "accepted quote cannot be revised",
    `INSERT INTO quote_revisions (quote_id, revision_number, currency, total_minor) VALUES ($1, 2, 'INR', 1)`, [quoteA], "23000");
  await q(`UPDATE rfqs SET state = 'accepted' WHERE id = $1`, [rfq]);
  await mustFail(client, "accepted RFQ cannot be edited",
    `INSERT INTO rfq_revisions (rfq_id, revision_number, requirements, category_config_version, created_by_user_id)
     VALUES ($1, 2, '{}', 1, $2)`, [rfq, customer], "23000");
  await mustFail(client, "quote revisions are immutable", `UPDATE quote_revisions SET total_minor = 1`, [], "23000");

  // --- bookings -----------------------------------------------------------
  const booking = id();
  await q(`INSERT INTO bookings (id, customer_user_id, vendor_id, listing_id, booking_mode, state, idempotency_key)
           VALUES ($1, $2, $3, $4, 'scheduled', 'requested', 'key-1')`, [booking, customer, vendor, listing]);
  await mustFail(client, "duplicate booking with same idempotency key",
    `INSERT INTO bookings (customer_user_id, vendor_id, listing_id, booking_mode, state, idempotency_key)
     VALUES ($1, $2, $3, 'scheduled', 'requested', 'key-1')`, [customer, vendor, listing], "23505");
  await mustFail(client, "listing must belong to the booked vendor",
    `INSERT INTO bookings (customer_user_id, vendor_id, listing_id, booking_mode) VALUES ($1, $2, $3, 'scheduled')`,
    [customer, otherVendor, listing], "23503");
  await mustFail(client, "slot end after start",
    `INSERT INTO bookings (customer_user_id, vendor_id, listing_id, booking_mode, slot_start, slot_end, time_zone)
     VALUES ($1, $2, $3, 'scheduled', '2030-01-02T10:00Z', '2030-01-02T09:00Z', 'Asia/Kolkata')`, [customer, vendor, listing], "23514");
  await mustFail(client, "slot needs an explicit time zone",
    `INSERT INTO bookings (customer_user_id, vendor_id, listing_id, booking_mode, slot_start, slot_end)
     VALUES ($1, $2, $3, 'scheduled', '2030-01-02T10:00Z', '2030-01-02T11:00Z')`, [customer, vendor, listing], "23514");
  await q(`UPDATE bookings SET state = 'cancelled', cancelled_at = now(), cancelled_by_user_id = $2 WHERE id = $1`, [booking, customer]);
  await mustFail(client, "cancelled booking is final",
    `UPDATE bookings SET state = 'confirmed' WHERE id = $1`, [booking], "23000");
  await q(`INSERT INTO booking_events (booking_id, actor_user_id, event_type) VALUES ($1, $2, 'created')`, [booking, customer]);
  await mustFail(client, "booking events are append-only", `DELETE FROM booking_events`, [], "23000");
  await mustFail(client, "payment record needs exactly one parent",
    `INSERT INTO payment_records (mode, amount_minor, currency, status, recorded_by_user_id) VALUES ('A', 1, 'INR', 'recorded', $1)`, [customer], "23514");
  await mustFail(client, "payment mode C is Phase 2",
    `INSERT INTO payment_records (mode, booking_id, amount_minor, currency, status, recorded_by_user_id) VALUES ('C', $1, 1, 'INR', 'x', $2)`, [booking, customer], "23514");
  await mustPass(client, "Mode A record with one parent",
    `INSERT INTO payment_records (mode, booking_id, amount_minor, currency, status, recorded_by_user_id) VALUES ('A', $1, 1, 'INR', 'recorded', $2)`, [booking, customer]);

  // --- purchase orders ----------------------------------------------------
  await mustFail(client, "PO has no payment-failed state (O-06)",
    `INSERT INTO purchase_orders (accepted_terms_snapshot_id, buyer_user_id, supplier_vendor_id, state, terms_snapshot)
     SELECT id, $1, $2, 'payment_failed', '{}' FROM accepted_terms_snapshots`, [customer, vendor], "23514");
  await mustFail(client, "vendor cannot buy from itself",
    `INSERT INTO purchase_orders (accepted_terms_snapshot_id, buyer_user_id, buyer_vendor_id, supplier_vendor_id, terms_snapshot)
     SELECT id, $1, $2, $2, '{}' FROM accepted_terms_snapshots`, [customer, vendor], "23514");

  // --- contracts ----------------------------------------------------------
  const contract = id();
  await q(`INSERT INTO contracts (id, customer_user_id, vendor_id, proposer_user_id, state, current_version)
           VALUES ($1, $2, $3, $2, 'proposed', 1)`, [contract, customer, vendor]);
  const v1 = id();
  await q(`INSERT INTO contract_versions (id, contract_id, version_number, proposed_by_user_id) VALUES ($1, $2, 1, $3)`, [v1, contract, customer]);
  await q(`INSERT INTO contract_versions (contract_id, version_number, proposed_by_user_id) VALUES ($1, 2, $2)`, [contract, owner]);
  await q(`UPDATE contracts SET current_version = 2, state = 'negotiating' WHERE id = $1`, [contract]);
  await mustFail(client, "only the latest contract version can be accepted",
    `INSERT INTO contract_acceptances (contract_id, contract_version_id, party_role, accepting_user_id) VALUES ($1, $2, 'customer', $3)`,
    [contract, v1, customer], "23000");
  await mustFail(client, "contract versions are immutable", `UPDATE contract_versions SET scope = '{"a":1}'`, [], "23000");
  await mustFail(client, "no suspended contract state (O-08)",
    `UPDATE contracts SET state = 'suspended' WHERE id = $1`, [contract], "23514");
  await mustFail(client, "disputed milestone needs a case",
    `INSERT INTO milestones (contract_id, sequence_number, title, state) VALUES ($1, 1, 'm', 'disputed')`, [contract], "23514");

  // --- messaging / reviews / notifications --------------------------------
  const convo = id();
  await q(`INSERT INTO conversations (id) VALUES ($1)`, [convo]);
  await q(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`, [convo, customer]);
  await mustFail(client, "non-participant cannot send a message",
    `INSERT INTO messages (conversation_id, sender_user_id, body) VALUES ($1, $2, 'hi')`, [convo, owner], "23503");
  await mustPass(client, "participant can send a message",
    `INSERT INTO messages (conversation_id, sender_user_id, body) VALUES ($1, $2, 'hi')`, [convo, customer]);
  const txn = id();
  await q(`INSERT INTO reviews (author_user_id, vendor_id, transaction_type, transaction_id, overall_rating) VALUES ($1, $2, 'booking', $3, 5)`, [customer, vendor, txn]);
  await mustFail(client, "one review per transaction",
    `INSERT INTO reviews (author_user_id, vendor_id, transaction_type, transaction_id, overall_rating) VALUES ($1, $2, 'booking', $3, 4)`, [customer, vendor, txn], "23505");
  await mustFail(client, "rating is 1 to 5",
    `INSERT INTO reviews (author_user_id, vendor_id, transaction_type, transaction_id, overall_rating) VALUES ($1, $2, 'booking', $3, 6)`, [customer, vendor, id()], "23514");
  await mustFail(client, "no rating without reviews",
    `INSERT INTO vendor_trust_metrics (vendor_id, rating_average, rating_count) VALUES ($1, 4.5, 0)`, [vendor], "23514");
  await q(`INSERT INTO notifications (recipient_user_id, event_type, category, dedupe_key) VALUES ($1, 'e', 'c', 'd1')`, [customer]);
  await mustFail(client, "notification is not delivered twice",
    `INSERT INTO notifications (recipient_user_id, event_type, category, dedupe_key) VALUES ($1, 'e', 'c', 'd1')`, [customer], "23505");

  // --- subscriptions / billing -------------------------------------------
  const plan = id();
  await q(`INSERT INTO plans (id, name) VALUES ($1, 'verify-plan')`, [plan]);
  const pv = id();
  await q(`INSERT INTO plan_versions (id, plan_id, version_number) VALUES ($1, $2, 1)`, [pv, plan]);
  await q(`INSERT INTO subscriptions (vendor_id, plan_version_id, state) VALUES ($1, $2, 'active')`, [vendor, pv]);
  await mustFail(client, "one live subscription per vendor",
    `INSERT INTO subscriptions (vendor_id, plan_version_id, state) VALUES ($1, $2, 'active')`, [vendor, pv], "23505");
  await mustFail(client, "failed payment needs a grace end",
    `INSERT INTO subscriptions (vendor_id, plan_version_id, state) VALUES ($1, $2, 'payment_failed')`, [otherVendor, pv], "23514");
  await q(`INSERT INTO billing_events (provider, provider_event_id, event_type, payload) VALUES ('p', 'e1', 't', '{}')`);
  await mustFail(client, "billing webhook redelivery is a duplicate",
    `INSERT INTO billing_events (provider, provider_event_id, event_type, payload) VALUES ('p', 'e1', 't', '{}')`, [], "23505");
  await mustFail(client, "plan price needs a currency",
    `INSERT INTO plan_versions (plan_id, version_number, price_minor) VALUES ($1, 2, 100)`, [plan], "23514");

  // --- vendor roles (D-023, D-024) -----------------------------------------
  await mustFail(client, "business_type must be a catalogued role",
    `INSERT INTO vendors (id, owner_user_id, business_type) VALUES ($1, $2, 'NO_SUCH_ROLE')`, [id(), owner], "23503");
  await mustFail(client, "role codes are upper case",
    `INSERT INTO vendor_role_definitions (code, label) VALUES ('retailer', 'Retailer')`, [], "23514");
  // mustPass rolls its statement back, so the rows later checks depend on are inserted for real
  await q(`INSERT INTO vendor_role_definitions (code, label, offer_type) VALUES ('RETAILER', 'Retailer', 'products')`);
  await q(`INSERT INTO vendor_roles (vendor_id, role_code) VALUES ($1, 'SUPPLIER'), ($1, 'RETAILER')`, [vendor]);
  await mustFail(client, "a vendor holds a role only once",
    `INSERT INTO vendor_roles (vendor_id, role_code) VALUES ($1, 'SUPPLIER')`, [vendor], "23505");
  await mustFail(client, "a decided role needs a reviewer and a reason",
    `UPDATE vendor_roles SET status = 'verified' WHERE vendor_id = $1 AND role_code = 'RETAILER'`, [vendor], "23514");
  await mustFail(client, "a reviewer cannot decide on their own vendor's role",
    `UPDATE vendor_roles SET status = 'verified', reviewer_user_id = $2, reason = 'ok', decided_at = now()
     WHERE vendor_id = $1 AND role_code = 'RETAILER'`, [vendor, owner], "23000");
  await mustPass(client, "another user can verify the role",
    `UPDATE vendor_roles SET status = 'verified', reviewer_user_id = $2, reason = 'ok', decided_at = now()
     WHERE vendor_id = $1 AND role_code = 'RETAILER'`, [vendor, reviewer]);

  // --- accounts -----------------------------------------------------------
  await mustFail(client, "owner cannot verify own business",
    `INSERT INTO business_accounts (owner_user_id, company_name, verification_status, verified_by_user_id, verified_at, decision_reason)
     VALUES ($1, 'Co', 'verified', $1, now(), 'ok')`, [owner], "23514");
  await mustPass(client, "independent admin can verify a business",
    `INSERT INTO business_accounts (owner_user_id, company_name, verification_status, verified_by_user_id, verified_at, decision_reason)
     VALUES ($1, 'Co', 'verified', $2, now(), 'ok')`, [owner, reviewer]);
  await mustFail(client, "contact email must be lower-case",
    `INSERT INTO customer_profiles (user_id, contact_email) VALUES ($1, 'A@B.com')`, [customer], "23514");
  await mustFail(client, "contact email must look like an email",
    `INSERT INTO customer_profiles (user_id, contact_email) VALUES ($1, 'nope')`, [customer], "23514");
  await mustFail(client, "an individual has no company name",
    `INSERT INTO customer_profiles (user_id, customer_type, company_name) VALUES ($1, 'individual', 'Acme')`, [customer], "23514");
  await mustPass(client, "a business customer can carry a company name",
    `INSERT INTO customer_profiles (user_id, customer_type, company_name, contact_email) VALUES ($1, 'business', 'Acme', 'a@b.com')`, [customer]);
  await q(`INSERT INTO saved_locations (user_id, label, is_default) VALUES ($1, 'Home', true)`, [customer]);
  await mustFail(client, "one default location per user",
    `INSERT INTO saved_locations (user_id, label, is_default) VALUES ($1, 'Office', true)`, [customer], "23505");
  await mustPass(client, "several non-default locations are fine",
    `INSERT INTO saved_locations (user_id, label) VALUES ($1, 'Office'), ($1, 'Shop')`, [customer]);
  await q(`INSERT INTO account_data_requests (user_id, request_type) VALUES ($1, 'export')`, [customer]);
  await mustFail(client, "one open export request per user",
    `INSERT INTO account_data_requests (user_id, request_type) VALUES ($1, 'export')`, [customer], "23505");
  await mustFail(client, "market cannot go live without an activator",
    `UPDATE market_activations SET status = 'live'`, [], "23514");
  await q(`INSERT INTO countries (iso_code, name) VALUES ('ZZ', 'Testland')`);
  await mustFail(client, "city must belong to its region's country",
    `INSERT INTO cities (country_id, region_id, name, time_zone)
     SELECT (SELECT id FROM countries WHERE iso_code = 'ZZ'), (SELECT id FROM regions LIMIT 1), 'X', 'UTC'`, [], "23503");
  await mustPass(client, "a country without regions can hold cities",
    `INSERT INTO cities (country_id, name, time_zone)
     SELECT id, 'Solo', 'UTC' FROM countries WHERE iso_code = 'ZZ'`, []);

  // --- housekeeping triggers ---------------------------------------------
  // The trigger must override a stale / client-supplied updated_at.
  await q(`UPDATE users SET locale = '{"language":"hi"}', updated_at = '2000-01-01T00:00:00Z' WHERE id = $1`, [customer]);
  const stamped = (await q(`SELECT updated_at > '2020-01-01T00:00:00Z' AS fresh FROM users WHERE id = $1`, [customer])).rows[0].fresh;
  stamped ? passed++ : failures.push("updated_at trigger did not override a stale timestamp");

  await client.query("ROLLBACK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
