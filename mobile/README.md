# VendorVerse — Release 1 mobile mockup

Interactive mobile mockup of the **VendorVerse Comprehensive Product Requirements Specification** (ADRS Techno Private Limited, 19 Oct 2026).
React 19 + Vite + Tailwind CSS v4. All data except sign-in is mock data held in memory (sign-in can call the real backend auth API: copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`; the backend must list this app's origin in `CORS_ORIGINS`), but the business rules (publication gates, booking and quote state machines, subscription lifecycle, RBAC rules) are really evaluated, so the screens behave like the product would.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Demo OTP `123456` · admin authenticator `654321`. Deep links: `/#/c_home`, `/#/v_listing_gate`, `/#/ad_case` …

## Global marketplace vision (latest brief)
The mockup now covers the long-term product, with **MVP / Phase 2 / Phase 3** clearly tagged on screens and in the roadmap (`Product vision` screen, `docs/user-flows-and-roadmap.md`):
country → state → city picker with launch status and waitlists · 30-industry dynamic taxonomy with “suggest a category” and an admin taxonomy builder · geo rollout manager · supplier / manufacturer listings with MOQ, volume pricing, certifications and multi-currency · instant, scheduled, RFQ and contract bookings · 4-tier verification, trust score and 4-dimension ratings · customer (individual / business) and vendor public profiles · customer dashboard · Phase 2 checkout/escrow, payouts and commission engine.
MVP keeps the confirmed model: customers pay vendors directly; platform revenue is subscriptions and sponsored visibility.
Review pack: `docs/screen-inventory.csv` (111 screens with role, phase, spec section) and `docs/user-flows-and-roadmap.md`. The in-app **User flows** screen opens every step.

## How to explore
* **Left panel (desktop)** — role switcher and a directory of all 93 screens. Chips show the spec section (§8) and the number of scenarios (SC) each screen demonstrates.
* **Right panel (wide desktop)** — the requirements for the *current screen*: the relevant spec sections, the scenarios it demonstrates, plus tabs for all 40 scenarios (tap one to jump to the screens that show it), booking/verification state tables, roles, release gates, deferred scope and the open-configuration register (CFG-01…12).
* **“Mockup controls”** cards on some screens (grey) fire events that normally come from the other side or from the platform — vendor accepts, deadline passes, billing webhook fails, credential expires, two quote acceptances race. They are labelled as mockup-only.

## What is modelled

| Area | Behaviour |
|---|---|
| **Publication (§5.3)** | A listing is public only if six gates pass: account state, content review (not paused/restricted), subscription (active / grace / cancelled-in-period), required category verification (per-credential expiry), required fields + service area, no holds. It is *computed* from live state everywhere — search, vendor lists, sponsorship — never stored as a flag. |
| **Discovery (§7)** | Pincode/city coverage matching, ineligible listings excluded, organic ranking (relevance, area, verification, availability, responsiveness, history, smoothed rating — plan tier is not a signal), labelled sponsored slots, filters, pagination, error/retry, full no-result flow, “outside your area” labelling, honest missing-data labels, compare up to 3, favorites. |
| **Booking (§8)** | Draft → requested (category response deadline, countdown) → confirmed / declined / expired → in progress → completed-awaiting (7 days) → closed; modification (original terms stay until accepted), cancellation with policy result, vendor cancellation recorded without auto-penalty, conflicting confirmations chooser, idempotent create, atomic slot check, terms snapshot, support case linked to a closed booking. |
| **RFQ (§9)** | Category-specific RFQ schema, scanned attachments, eligible recipients, revisions, deadline extension, no-quote flow, structured quotes (price/INR, scope, inclusions, exclusions, timeline, validity), revise / withdraw / expire, atomic acceptance (one winner), immutable accepted-terms snapshot + work order. |
| **Subscription (§11)** | Active / grace (3 days) / expired / cancelled, lead-usage meter, plan limits, idempotent billing events, authorized corrections, sponsored visibility that cannot bypass gates. Plan values are **sample** (CFG-01/02). |
| **Trust (§12–13)** | Eligible-only reviews, reports → cases with severity/SLA/evidence, emergency restriction with post-review, appeals reviewed by a human, case-bound conversation access, reason-captured admin actions, self-approval blocked, audit log with correlation IDs. |
| **Accounts (§3–4)** | One identity with customer/vendor modes (mode is not a privilege), account states, deletion request flow, RBAC matrix, staff scopes, revocation, separation-of-duties demos. |
| **Sales agent** | Assigned prospective vendors only; no approval, billing or customer-transaction access; conversion performance instead of commissions. |

## Not in this release (spec §2 / §24)
Product checkout, platform-held payments, vendor staff accounts, enterprise procurement, AI workflows, field operations, advanced ad bidding. The earlier mockup’s order, payment, fee and commission screens were removed because they contradict the confirmed direct-payment model.

## Structure
`src/data.jsx` mock data + publication logic · `src/store.jsx` shared state · `src/ui.jsx` design kit · `src/registry.jsx` screen map (with spec/scenario links) · `src/specs.js` spec content · `src/screens/*` — `customer1` discovery · `customer_book` bookings · `customer_rfq` RFQs · `customer_misc` activity/chat/reviews/cases/profile · `vendor_a` onboarding & listings · `vendor_b` work, quotes, subscription · `agent` · `admin_a` queues & cases · `admin_b` subscriptions, RBAC, config, analytics, audit.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-05 11:11 | Shil1517 | Added: optional real auth API for sign-in (VITE_API_BASE_URL) | Backend auth/account APIs now exist; web and mobile share one client (OTP, session, refresh, logout, role from GET /me) and fall back to the mock when no API URL is set. |
