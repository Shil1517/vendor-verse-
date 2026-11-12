import * as Auth from './screens/auth.jsx'
import * as C1 from './screens/customer1.jsx'
import { Explore } from './screens/explore.jsx'
import * as CB from './screens/customer_book.jsx'
import * as CR from './screens/customer_rfq.jsx'
import * as CM from './screens/customer_misc.jsx'
import * as VA from './screens/vendor_a.jsx'
import * as VB from './screens/vendor_b.jsx'
import * as A from './screens/agent.jsx'
import * as AA from './screens/admin_a.jsx'
import * as AB from './screens/admin_b.jsx'
import * as G from './screens/global.jsx'
import * as CT from './screens/contracts.jsx'
import * as PY from './screens/payments.jsx'
import * as PF from './screens/profiles.jsx'
import * as AC from './screens/admin_c.jsx'
import * as MV from './screens/mvp.jsx'
import * as CBD from './screens/catbuilder.jsx'
import * as OP from './screens/ops.jsx'
import * as BZ from './screens/business.jsx'
import * as VR from './screens/vendor_roles.jsx'
import * as CZ from './screens/customer_biz.jsx'
import { Messages as G0 } from './screens/customer_misc.jsx'

/*  id → { C: component, role, title, sec: [spec sections], sc: [scenario ids], bar: status-bar tone, demo: params used when jumping from the directory }  */
const R = (id, C, role, title, sec = [], sc = [], extra = {}) => [id, { id, C, role, title, sec, sc, ...extra }]

export const SCREENS = Object.fromEntries([
  // ---- auth ----
  R('splash', Auth.Splash, 'auth', 'Splash', ['S2'], [], { bar: 'brand-dark' }),
  R('welcome', Auth.Welcome, 'auth', 'Welcome & language', ['S2', 'S17'], ['SC-035'], { bar: 'brand' }),
  R('login', Auth.Login, 'auth', 'Log in (phone / email)', ['S3', 'S16'], ['SC-032']),
  R('otp', Auth.Otp, 'auth', 'OTP & admin MFA', ['S3', 'S4', 'S16'], ['SC-032'], { demo: { contact: '+91 98290 00001', role: 'customer' } }),
  R('register', Auth.Register, 'auth', 'Create account (one identity)', ['S1', 'S3']),
  R('acct_state', Auth.AccountState, 'shared', 'Account states', ['S3'], ['SC-039', 'SC-040'], { demo: { state: 'restricted' } }),
  R('vision', G.Vision, 'shared', 'Product vision & roadmap', ['V1', 'V10']),
  R('fees', PY.Fees, 'shared', 'Pricing & fees — who pays what', ['V9', 'S11']),
  R('invoice', PY.Invoice, 'shared', 'Tax invoice', ['V9', 'S11'], [], { demo: { id: 'INV-2026-1041' } }),
  R('flows', G.Flows, 'shared', 'User flows & screen inventory', ['V10']),

  // ---- customer ----
  R('c_home', C1.CustomerHome, 'customer', 'Home', ['S7', 'S8'], ['SC-001', 'SC-005', 'SC-014'], { tab: true, bar: 'brand-dark' }),
  R('c_location', G.Location, 'customer', 'Country · state · city picker', ['S7', 'V3'], ['SC-001', 'SC-002']),
  R('c_location_wait', G.Location, 'customer', 'City not live — waitlist', ['V3'], ['SC-002'], { demo: { country: 'IN', state: 'Maharashtra', city: 'Mumbai' } }),
  R('c_categories', G.Categories, 'customer', 'All industries & categories', ['S6', 'V2']),
  R('c_cat_suggest', G.CategorySuggest, 'customer', 'Suggest a category', ['V2'], [], { demo: { name: 'Drone services' } }),
  R('c_dash', PF.CustomerDash, 'customer', 'My dashboard', ['V8', 'V4']),
  R('c_listing_trade', C1.ListingDetail, 'customer', 'Supplier listing — trade details', ['V7', 'V1'], ['SC-003'], { demo: { id: 'l30' } }),
  R('c_explore_suppliers', Explore, 'customer', 'Search — suppliers & manufacturers', ['V7', 'S7'], ['SC-001'], { demo: { kind: 'manufacturer' } }),
  R('c_book_instant', CB.BookNew, 'customer', 'Instant booking', ['V5', 'S8'], ['SC-013'], { demo: { id: 'l12', mode: 'instant' } }),
  R('c_contract_new', CT.ContractNew, 'customer', 'Propose a contract', ['V5'], [], { demo: { vendorId: 'v6', listingId: 'l13' } }),
  R('c_contract', CT.ContractDetail, 'customer', 'Contract — terms, e-sign, milestones', ['V5'], [], { demo: { id: 'CT-477' } }),
  R('c_pay', PY.Checkout, 'customer', 'Checkout & escrow', ['V9'], [], { demo: { ref: 'BKG-2099', amount: 3499, vendorId: 'v6' } }),
  R('c_payments', PY.PaymentsHub, 'customer', 'Payments, methods & invoices', ['V9']),
  R('c_pay_fx', PY.Checkout, 'customer', 'Checkout — foreign currency (FX shown)', ['V9', 'V7'], [], { demo: { ref: 'RFQ-300 · supplier order', amount: 120, cur: 'USD', vendorId: 'v21' } }),
  R('c_refund', PY.Refund, 'customer', 'Request a refund', ['V9'], [], { demo: { pay: 'PY-9003' } }),
  R('c_refund_view', PY.Refund, 'customer', 'Refund status', ['V9'], [], { demo: { id: 'RF-71' } }),
  R('c_wallet', PY.WalletScreen, 'customer', 'Wallet & top-up', ['V9']),
  R('c_category', C1.Category, 'customer', 'Category detail', ['S6', 'S7'], ['SC-001'], { demo: { id: 'home' } }),
  R('c_explore', Explore, 'customer', 'Search, filters & ranking', ['S7'], ['SC-001', 'SC-002', 'SC-003', 'SC-034'], { tab: true }),
  R('c_explore_err', Explore, 'customer', 'Search — error / offline state', ['S7', 'S19'], ['SC-002'], { demo: { state: 'error' } }),
  R('c_listing', C1.ListingDetail, 'customer', 'Listing detail', ['S7', 'S8', 'S14'], ['SC-003', 'SC-008'], { demo: { id: 'l12' } }),
  R('c_listing_nodata', C1.ListingDetail, 'customer', 'Listing — missing data labels', ['S7'], ['SC-003'], { demo: { id: 'l15' } }),
  R('c_vendor', C1.VendorProfile, 'customer', 'Vendor profile', ['S5', 'S7', 'S12'], ['SC-003', 'SC-008'], { demo: { id: 'v2' } }),
  R('c_saved', CM.Saved, 'customer', 'Favorites & compare (3)', ['S7'], ['SC-004', 'SC-005'], { demo: { tab: 'compare' } }),
  R('c_activity', CM.Activity, 'customer', 'Activity: bookings & RFQs', ['S8', 'S9'], ['SC-011', 'SC-014'], { tab: true }),
  R('c_book_new', CB.BookNew, 'customer', 'Request a booking', ['S8', 'S19'], ['SC-011', 'SC-013', 'SC-014'], { demo: { id: 'l12' } }),
  R('c_booking', CB.BookingDetail, 'customer', 'Booking detail & timeline', ['S8'], ['SC-011', 'SC-012', 'SC-018', 'SC-019'], { demo: { id: 'BKG-2101' } }),
  R('c_booking_done', CB.BookingDetail, 'customer', 'Booking — confirm completion (7 days)', ['S8'], ['SC-018', 'SC-019'], { demo: { id: 'BKG-2088' } }),
  R('c_book_modify', CB.BookModify, 'customer', 'Request booking change', ['S8'], ['SC-015', 'SC-016'], { demo: { id: 'BKG-2099' } }),
  R('c_conflict', CB.Conflict, 'customer', 'Conflicting confirmations', ['S8'], ['SC-014'], { demo: { req: 'REQ-77' } }),
  R('c_rfq_new', CR.RfqNew, 'customer', 'Create RFQ', ['S9'], ['SC-020']),
  R('c_rfq', CR.RfqDetail, 'customer', 'RFQ, quotes & atomic accept', ['S9'], ['SC-022', 'SC-023', 'SC-024', 'SC-025'], { demo: { id: 'RFQ-311' } }),
  R('c_rfq_open', CR.RfqDetail, 'customer', 'RFQ — accepted terms snapshot', ['S9', 'S14'], ['SC-021', 'SC-025'], { demo: { id: 'RFQ-290' } }),
  R('c_rfq_none', CR.RfqDetail, 'customer', 'RFQ — no quotes received', ['S9'], ['SC-020'], { demo: { id: 'RFQ-285' } }),
  R('c_rfq_edit', CR.RfqEdit, 'customer', 'Edit RFQ (revision)', ['S9'], ['SC-021'], { demo: { id: 'RFQ-311' } }),
  R('messages', CM.Messages, 'shared', 'Messages (customer & vendor)', ['S10'], ['SC-026'], { tab: true }),
  R('chat', CM.Chat, 'shared', 'Chat — linked, private', ['S10', 'S16'], ['SC-033'], { demo: { id: 't1' } }),
  R('notifications', CM.Notifications, 'shared', 'Notifications', ['S10'], ['SC-036']),
  R('c_review', CM.WriteReview, 'customer', 'Rate a vendor (eligible only)', ['S12'], ['SC-030'], { demo: { vendorId: 'v2', via: 'BKG-2071' } }),
  R('c_review_no', CM.WriteReview, 'customer', 'Review — not eligible', ['S12'], ['SC-030'], { demo: { vendorId: 'v3' } }),
  R('c_report', CM.Report, 'customer', 'Report / raise an issue', ['S12'], ['SC-029', 'SC-019', 'SC-028'], { demo: { type: 'listing', id: 'l27', label: 'Budget car service' } }),
  R('c_cases', CM.Cases, 'customer', 'Support cases', ['S12'], ['SC-019', 'SC-028']),
  R('c_case', CM.CaseDetail, 'customer', 'Case status & evidence', ['S12'], ['SC-019'], { demo: { id: 'CS-204' } }),
  R('c_profile', CM.Profile, 'customer', 'Profile & mode switch', ['S1', 'S3'], ['SC-035'], { tab: true }),
  R('c_profile_edit', PF.ProfileEdit, 'customer', 'Profile — individual / business', ['S3', 'V4']),
  R('c_settings', CM.Settings, 'customer', 'Notifications, privacy & sessions', ['S10', 'S16'], ['SC-036']),
  R('c_delete', CM.DeleteAccount, 'customer', 'Delete account', ['S3', 'S14', 'S16'], ['SC-040']),

  // ---- vendor ----
  R('v_dash', VA.VendorDashboard, 'vendor', 'Dashboard', ['S5', 'S8', 'S11'], ['SC-012', 'SC-026'], { tab: true, bar: 'ink' }),
  R('v_register', VA.VendorRegister, 'vendor', 'Onboarding wizard — choose type', ['S5', 'S6'], ['SC-008']),
  R('v_register_mfr', VA.VendorRegister, 'vendor', 'Onboarding — manufacturer path', ['S5', 'S6'], ['SC-008'], { demo: { type: 'manufacturer' } }),
  R('v_register_svc', VA.VendorRegister, 'vendor', 'Onboarding — service provider path', ['S5', 'S6'], ['SC-008'], { demo: { type: 'service' } }),
  R('v_verify', VA.VendorVerify, 'vendor', 'Verification status', ['S5'], ['SC-008', 'SC-009']),
  R('v_roles', VR.VendorRoles, 'vendor', 'Vendor roles — add, status, remove', ['S5'], ['SC-008']),
  R('v_listings', VA.VendorListings, 'vendor', 'My listings & plan limit', ['S5', 'S11'], ['SC-006', 'SC-007'], { tab: true }),
  R('v_listing_gate', VA.ListingGate, 'vendor', 'Publication checklist (6 gates)', ['S5'], ['SC-006', 'SC-007', 'SC-008', 'SC-009', 'SC-010'], { demo: { id: 'l3' } }),
  R('v_listing_edit', VA.ListingEdit, 'vendor', 'Add / edit listing', ['S5', 'S6'], ['SC-010'], { demo: { id: 'l1' } }),
  R('v_areas', VA.ServiceAreas, 'vendor', 'Service areas', ['S7'], ['SC-001']),
  R('v_avail', VA.Availability, 'vendor', 'Availability', ['S8'], ['SC-013', 'SC-003']),
  R('v_work', VB.VendorWork, 'vendor', 'Work: bookings & RFQs', ['S8', 'S9'], ['SC-012'], { tab: true }),
  R('v_booking', VB.VendorBooking, 'vendor', 'Booking request & actions', ['S8'], ['SC-011', 'SC-012', 'SC-013', 'SC-015', 'SC-016', 'SC-017'], { demo: { id: 'BKG-2090' } }),
  R('v_booking_mod', VB.VendorBooking, 'vendor', 'Booking — change requested', ['S8'], ['SC-015', 'SC-016'], { demo: { id: 'BKG-2085' } }),
  R('v_rfq', VB.VendorRfq, 'vendor', 'Submit / revise quotation', ['S9'], ['SC-022', 'SC-023', 'SC-024'], { demo: { id: 'RFQ-315' } }),
  R('v_sub', VB.Subscription, 'vendor', 'Subscription & billing events', ['S11'], ['SC-026', 'SC-027', 'SC-037', 'SC-006']),
  R('v_plans', VB.Plans, 'vendor', 'Compare plans (sample)', ['S11']),
  R('v_sponsor', VB.Sponsor, 'vendor', 'Sponsored visibility', ['S7', 'S11'], ['SC-034']),
  R('v_reviews', VB.VendorReviews, 'vendor', 'Customer reviews', ['S12'], ['SC-030']),
  R('v_cases', VB.VendorCases, 'vendor', 'Moderation & appeals', ['S12'], ['SC-029', 'SC-038']),
  R('v_perf', VB.Performance, 'vendor', 'Performance metrics', ['S18', 'S8']),
  R('v_buy', MV.VendorBuy, 'vendor', 'Buy — from vendors & companies (vendor account)', ['V4', 'S7', 'S9'], [], { tab: true }),
  R('v_more', VB.VendorMore, 'vendor', 'More', ['S3'], [], { tab: true }),
  R('v_profile', VB.VendorProfile, 'vendor', 'Business profile', ['S3', 'S10']),
  R('v_public', PF.VendorProfileEdit, 'vendor', 'Public profile & trust', ['V4', 'V6']),
  R('v_contract', CT.ContractDetail, 'vendor', 'Contract — respond, counter, sign', ['V5'], [], { demo: { id: 'CT-490' } }),
  R('v_payouts', PY.VendorPayouts, 'vendor', 'Earnings, payouts & commission', ['V9']),
  R('v_checkout', PY.PlanCheckout, 'vendor', 'Plan checkout — tax, coupon, proration', ['V9', 'S11'], ['SC-037'], { demo: { plan: 'Pro' } }),
  R('v_checkout_down', PY.PlanCheckout, 'vendor', 'Plan change — scheduled downgrade', ['V9', 'S11'], [], { demo: { plan: 'Starter' } }),
  R('v_refunds', PY.VendorPayouts, 'vendor', 'Refund requests & bank verification', ['V9'], [], { demo: { tab: 'refunds' } }),

  // ---- sales agent ----
  R('a_home', A.AgentHome, 'agent', 'Home & pipeline', ['S3'], [], { tab: true, bar: 'brand-dark' }),
  R('a_leads', A.Leads, 'agent', 'Prospective vendors', ['S3'], ['SC-031'], { tab: true }),
  R('a_lead', A.LeadDetail, 'agent', 'Lead detail', ['S3', 'S5'], ['SC-033'], { demo: { id: 'ld8' } }),
  R('a_lead_new', A.LeadNew, 'agent', 'Add lead', ['S3']),
  R('a_log', A.LogActivity, 'agent', 'Log call / message / visit', ['S3'], [], { demo: { id: 'ld1' } }),
  R('a_followups', A.Followups, 'agent', 'Follow-ups', ['S3'], [], { tab: true }),
  R('a_onboard', A.Onboard, 'agent', 'Assisted onboarding (consent)', ['S3', 'S5', 'S16'], ['SC-008'], { demo: { id: 'ld1' } }),
  R('a_perf', A.AgentPerformance, 'agent', 'Conversion performance', ['S3', 'S11'], [], { tab: true }),
  R('a_profile', A.AgentProfile, 'agent', 'Profile', ['S3', 'S4'], [], { tab: true }),

  // ---- super admin ----
  R('ad_dash', AA.AdminDashboard, 'admin', 'Dashboard', ['S13'], ['SC-026'], { tab: true, bar: 'ink' }),
  R('ad_approvals', AA.Approvals, 'admin', 'Operational queues', ['S13'], [], { tab: true }),
  R('ad_vendors', AA.AdminVendors, 'admin', 'Verification queue', ['S5', 'S13'], ['SC-008', 'SC-009']),
  R('ad_role_reviews', VR.AdminRoleReviews, 'admin', 'Vendor role reviews', ['S5', 'S13'], ['SC-008', 'SC-009']),
  R('ad_role_defs', VR.AdminRoleDefinitions, 'admin', 'Vendor roles catalogue', ['S5', 'S13']),
  R('ad_vendor', AA.AdminVendor, 'admin', 'Review vendor evidence', ['S4', 'S5', 'S13'], ['SC-008', 'SC-032'], { demo: { id: 'v8' } }),
  R('ad_listings', AA.AdminListings, 'admin', 'Listing review queue', ['S5', 'S13'], ['SC-010']),
  R('ad_listing', AA.AdminListing, 'admin', 'Review listing & duplicates', ['S5', 'S13'], ['SC-007', 'SC-010'], { demo: { id: 'l5' } }),
  R('ad_cases', AA.AdminCases, 'admin', 'Trust & support cases', ['S12', 'S13'], ['SC-029'], { demo: { tab: 'trust' } }),
  R('ad_case', AA.AdminCase, 'admin', 'Resolve case', ['S12', 'S13', 'S4'], ['SC-029', 'SC-033', 'SC-038'], { demo: { id: 'CS-212' } }),
  R('ad_reviews', AA.AdminReviews, 'admin', 'Review moderation & appeals', ['S12'], ['SC-038', 'SC-030']),
  R('ad_subs', AB.AdminSubs, 'admin', 'Subscription monitoring', ['S11', 'S13'], ['SC-026', 'SC-027']),
  R('ad_sub', AB.AdminSub, 'admin', 'Billing investigation', ['S11', 'S15'], ['SC-037'], { demo: { id: 'v17' } }),
  R('ad_sponsored', AB.AdminSponsored, 'admin', 'Sponsored campaigns', ['S11'], ['SC-034']),
  R('ad_users', AB.UsersScreen, 'admin', 'Users', ['S3'], ['SC-040'], { tab: false }),
  R('ad_user', AB.UserDetail, 'admin', 'User & account state', ['S3', 'S4'], ['SC-040'], { demo: { id: 'u10' } }),
  R('ad_roles', AB.Roles, 'admin', 'Roles & permissions (RBAC)', ['S4'], ['SC-031', 'SC-032', 'SC-033', 'SC-039']),
  R('ad_categories', AB.AdminCategories, 'admin', 'Categories & workflows', ['S6']),
  R('ad_category', AB.AdminCategory, 'admin', 'Category configuration', ['S6'], [], { demo: { id: 'home' } }),
  R('ad_plans', AB.AdminPlans, 'admin', 'Plans & entitlements', ['S11']),
  R('ad_settings', AB.AdminSettings, 'admin', 'Platform settings', ['S10', 'S13', 'S17']),
  R('ad_analytics', AB.AdminAnalytics, 'admin', 'Analytics', ['S18'], [], { tab: true }),
  R('ad_audit', AB.AuditLog, 'admin', 'Audit log', ['S13', 'S16']),
  R('ad_agents', AB.AdminAgents, 'admin', 'Sales agents', ['S3']),
  R('ad_agent', AB.AdminAgent, 'admin', 'Agent detail', ['S3'], [], { demo: { id: 'ag1' } }),
  R('ad_cfg', AB.AdminCfg, 'admin', 'Open configuration register', ['S2'], []),
  R('ad_geo', AC.AdminGeo, 'admin', 'Geo rollout manager', ['V3', 'V8']),
  R('c_product', MV.ProductDetail, 'customer', 'Product — MOQ, tiers, delivery', ['S7', 'S9'], ['SC-001'], { demo: { id: 'l40' } }),
  R('c_rfq_goods', MV.RfqGoods, 'customer', 'Goods RFQ — quantity, specs, delivery', ['S9'], ['SC-020'], { demo: { listingId: 'l40', qty: 100 } }),
  R('c_rfq_compare', CR.RfqDetail, 'customer', 'Compare quotations (goods)', ['S9'], ['SC-022', 'SC-023'], { demo: { id: 'RFQ-320' } }),
  R('c_companies', CZ.CompanyDirectory, 'customer', 'Companies — buy directly', ['V4', 'S9']),
  R('c_company', CZ.CompanyStore, 'customer', 'Company storefront & products', ['V4', 'S9'], [], { demo: { id: 'biz1' } }),
  R('c_company_order', CZ.CompanyOrderNew, 'customer', 'Order from a company', ['V4', 'S9'], [], { demo: { id: 'biz1', product: 'bp1' } }),
  R('c_orders', MV.Orders, 'customer', 'Purchase orders', ['S9']),
  R('c_order', MV.OrderDetail, 'customer', 'Purchase order — status timeline', ['S9'], [], { demo: { id: 'PO-3002' } }),
  R('c_order_failed', MV.OrderDetail, 'customer', 'Purchase order — payment failed', ['S9', 'S11'], [], { demo: { id: 'PO-2971' } }),
  R('c_order_exc', MV.OrderDetail, 'customer', 'Purchase order — delivery exception', ['S9'], [], { demo: { id: 'PO-2955' } }),
  R('v_leads', MV.Leads, 'vendor', 'Leads: requests, RFQs, orders', ['S8', 'S9']),
  R('v_orders', MV.Orders, 'vendor', 'Purchase orders received', ['S9']),
  R('v_order', MV.OrderDetail, 'vendor', 'Order — accept, process, ship', ['S9'], [], { demo: { id: 'PO-3003' } }),
  R('vb_home', MV.VendorBuy, 'vendor', 'Buy tab — home (vendor as buyer)', ['V4'], [], { as: 'vbuyer' }),
  R('vb_explore', Explore, 'customer', 'Buyer mode — find a supplier', ['V4', 'S7'], [], { as: 'vbuyer', demo: { kind: 'manufacturer' } }),
  R('vb_rfq', MV.RfqGoods, 'customer', 'Buyer mode — bulk RFQ', ['V4', 'S9'], [], { as: 'vbuyer', demo: { listingId: 'l40', qty: 300 } }),
  R('vb_compare', CR.RfqDetail, 'customer', 'Buyer mode — compare & accept', ['V4', 'S9'], [], { as: 'vbuyer', demo: { id: 'RFQ-330' } }),
  R('vb_order', MV.OrderDetail, 'customer', 'Buyer mode — track purchase order', ['V4', 'S9'], [], { as: 'vbuyer', demo: { id: 'PO-3001', as: 'buyer' } }),
  R('journeys', MV.Journeys, 'shared', 'Demonstration journeys & checklist', ['V10']),
  R('journeys_pick', MV.JourneysPick, 'shared', 'Choose a journey', ['V10']),
  R('ui_states', MV.UiStates, 'shared', 'Loading, empty, error & other states', ['S19']),
  R('team', OP.Team, 'customer', 'Business team & roles', ['V4'], [], { phase: 'P2' }),
  R('c_reviews', OP.MyReviews, 'customer', 'My reviews (given & pending)', ['S12']),
  R('a_tasks', OP.AgentTasks, 'agent', 'Assigned onboarding tasks', ['S3']),
  R('a_perms', OP.AgentPerms, 'agent', 'What agents can and cannot do', ['S3', 'S16']),
  R('ad_country', OP.AdminCountry, 'admin', 'Country packs', ['V3', 'V10']),
  R('b_eligibility', BZ.BizEligibility, 'business', 'Business account — owner eligibility (3+ yrs, registered)', ['V4', 'S3']),
  R('b_home', BZ.BizHome, 'business', 'Business home', ['V4', 'V7'], [], { tab: true, bar: 'brand' }),
  R('b_messages', G0, 'business', 'Vendor enquiries (messages)', ['S10']),
  R('b_company', BZ.CompanyView, 'business', 'Company profile & verification', ['V4', 'V7', 'S5'], [], { tab: true }),
  R('b_register', BZ.CompanyForm, 'business', 'Company form (6 steps)', ['V4', 'V7', 'S5'], ['SC-008']),
  R('b_orders', MV.Orders, 'business', 'Customer orders received', ['V4', 'S9']),
  R('b_order', MV.OrderDetail, 'business', 'Customer order — accept, process, ship', ['V4', 'S9'], [], { demo: { id: 'PO-3002' } }),
  R('b_services', BZ.BizServices, 'business', 'Services for vendors', ['V4', 'V7'], [], { tab: true }),
  R('b_more', BZ.BizMore, 'business', 'More (separate account)', ['V4'], [], { tab: true }),
  R('v_biz_network', BZ.BizNetwork, 'vendor', 'Business network (vendor portal)', ['V4', 'S10']),
  R('v_biz_profile', BZ.BizPublic, 'vendor', 'Business profile — message only', ['V4', 'S10'], [], { demo: { id: 'biz1' } }),
  R('ad_company', BZ.AdminCompany, 'admin', 'Company verification queue', ['V4', 'S5']),
  R('ad_cat_new', CBD.CatNew, 'admin', 'Create category (configuration)', ['S6', 'V2']),
  R('ad_taxonomy', AC.AdminTaxonomy, 'admin', 'Taxonomy builder', ['V2', 'S6'], [], { demo: { tab: 'requests' } }),
  R('ad_commission', PY.AdminCommission, 'admin', 'Revenue & commission', ['V9', 'V8'], [], { demo: {} }),
  R('ad_more', AB.AdminMore, 'admin', 'More', ['S4'], [], { tab: true }),
])

export const GROUPS = [
  { id: 'auth', label: 'Auth' },
  { id: 'customer', label: 'Customer' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'agent', label: 'Agent' },
  { id: 'business', label: 'Business' },
  { id: 'admin', label: 'Admin' },
]

/* Which release each screen belongs to — the roadmap stays honest (MVP / Phase 2 / Phase 3) */
const P2_SCREENS = ['team', 'c_pay', 'c_pay_fx', 'c_payments', 'c_refund', 'c_refund_view', 'c_wallet', 'v_payouts', 'v_refunds', 'ad_commission']
if (typeof window !== 'undefined') window.__SCREENS = SCREENS
export const phaseOf = (id) => (P2_SCREENS.includes(id) ? 'P2' : 'MVP')
