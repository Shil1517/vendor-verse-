import * as Auth from './screens/auth.jsx'
import * as C1 from './screens/customer1.jsx'
import * as C2 from './screens/customer2.jsx'
import * as V from './screens/vendor.jsx'
import * as A from './screens/agent.jsx'
import * as AD from './screens/admin.jsx'
import { WebsiteHome } from './screens/website-home.jsx'
import { ScopeReview } from './screens/scope.jsx'
import { VendorExplore } from './screens/vendor-explore.jsx'
import * as ACC from './screens/p1-account.jsx'
import * as BK from './screens/p1-booking.jsx'
import * as BZ from './screens/p1-business.jsx'
import * as MS from './screens/p1-misc.jsx'
import * as RV from './screens/p1-review.jsx'
import * as DP from './screens/p1-depth.jsx'
import * as SF from './screens/p2-storefront.jsx'
import * as VR from './screens/vendor-roles.jsx'


/*  id → { C: component, role, title, fr: [FR codes], bar: status-bar tone, defaultParams: route defaults for the directory }  */
const R = (id, C, role, title, fr = [], extra = {}) => [id, { id, C, role, title, fr, ...extra }]

export const SCREENS = Object.fromEntries([
  // ---- auth ----
  R('splash', Auth.Splash, 'auth', 'Splash', ['FR-01'], { bar: 'brand-dark' }),
  R('welcome', Auth.Welcome, 'auth', 'Welcome & language', ['FR-01'], { bar: 'brand' }),
  R('login', Auth.Login, 'auth', 'Log in (phone / email)', ['FR-01', 'FR-02']),
  R('otp', Auth.Otp, 'auth', 'OTP verification', ['FR-01', 'FR-02'], { defaultParams: { contact: '+91 98290 00001', role: 'customer' } }),
  R('register', Auth.Register, 'auth', 'Create account', ['FR-01', 'FR-03']),
  R('scope_review', ScopeReview, 'auth', 'MVP scope review', ['FR-05', 'FR-15']),

  // ---- customer ----
  R('c_home', WebsiteHome, 'customer', 'Marketplace', ['FR-05', 'FR-10'], { tab: true, bar: 'brand' }),
  R('c_categories', C1.Categories, 'shared', 'All categories', ['FR-04', 'FR-05']),
  R('c_category', C1.Category, 'shared', 'Category detail', ['FR-04', 'FR-05'], { defaultParams: { id: 'elec' } }),
  R('c_explore', C1.Explore, 'shared', 'Search, filters & results', ['FR-05'], { tab: true }),
  R('c_listing', C1.ListingDetail, 'shared', 'Product / service detail', ['FR-04', 'FR-05', 'FR-10'], { defaultParams: { id: 'l1' } }),
  R('c_vendor', C1.VendorProfile, 'shared', 'Vendor profile', ['FR-03', 'FR-05'], { defaultParams: { id: 'v-me' } }),
  R('c_activity', C2.Quotes, 'customer', 'Activity', ['FR-08'], { tab: true }),
  R('c_book_new', C2.BookingNew, 'customer', 'Request a service booking', ['FR-09']),
  R('c_booking', C2.BookingDetail, 'shared', 'Booking details & actions', ['FR-09', 'FR-11'], { defaultParams: { id: 'BKG-1039' } }),
  R('c_order_new', C2.OrderNew, 'shared', 'Create purchase order', ['FR-07', 'FR-09']),
  R('c_order', C2.OrderDetail, 'shared', 'Purchase order tracking', ['FR-07', 'FR-09', 'FR-11'], { defaultParams: { id: 'ORD-24020' } }),
  R('c_rfq_new', C2.RfqNew, 'shared', 'Create RFQ', ['FR-08']),
  R('c_rfq', C2.RfqDetail, 'shared', 'RFQ & compare quotations', ['FR-08', 'FR-15'], { defaultParams: { id: 'RFQ-311' } }),
  R('c_saved', C2.Saved, 'customer', 'Saved & compare', ['FR-05']),
  R('messages', C2.Messages, 'shared', 'Messages (customer and vendor)', ['FR-10'], { tab: true }),
  R('chat', C2.Chat, 'shared', 'Chat', ['FR-10'], { defaultParams: { id: 't1' } }),
  R('notifications', C2.Notifications, 'shared', 'Notifications', ['FR-10']),
  R('c_review', C2.WriteReview, 'customer', 'Rate a vendor', ['FR-11'], { defaultParams: { vendorId: 'v-me' } }),
  R('c_report', C2.IssueNew, 'customer', 'Report a problem (case)', ['FR-11']),
  R('c_cases', C2.Issues, 'customer', 'Cases', ['FR-11']),
  R('c_case', C2.IssueDetail, 'customer', 'Case status', ['FR-11', 'FR-15'], { defaultParams: { id: 'DSP-204' } }),
  R('c_profile', C2.Profile, 'customer', 'Profile', ['FR-01'], { tab: true }),
  R('c_profile_edit', C2.ProfileEdit, 'customer', 'Edit profile', ['FR-01']),
  R('c_settings', C2.CustomerSettings, 'customer', 'Settings, privacy & sessions', ['FR-01', 'FR-10']),

  // ---- vendor ----
  R('v_dash', V.VendorDashboard, 'vendor', 'Dashboard', ['FR-03', 'FR-08', 'FR-10'], { tab: true, bar: 'ink' }),
  R('v_explore', VendorExplore, 'vendor', 'Supplier marketplace', ['FR-05', 'FR-08']),
  R('v_business_onboard', V.BusinessOnboarding, 'vendor', 'Business supplier onboarding', ['FR-03', 'FR-04']),
  R('v_register', V.VendorRegister, 'shared', 'Vendor account creation', ['FR-03']),
  R('v_verify', V.VendorVerify, 'vendor', 'Verification status', ['FR-03', 'FR-15']),
  R('v_roles', VR.VendorRoles, 'vendor', 'Vendor roles', ['FR-03']),
  R('v_listings', V.VendorListings, 'vendor', 'My listings', ['FR-04'], { tab: true }),
  R('v_listing_edit', V.ListingEdit, 'vendor', 'Add / edit listing', ['FR-04'], { defaultParams: { id: 'l1' } }),
  R('v_work', V.VendorQuotes, 'vendor', 'Work', ['FR-08'], { tab: true }),
  R('v_orders', V.VendorOrders, 'vendor', 'Purchase orders', ['FR-09', 'FR-15']),
  R('v_rfq', V.VendorRfq, 'vendor', 'Submit / revise quotation', ['FR-08', 'FR-15'], { defaultParams: { id: 'RFQ-315' } }),
  R('v_perf', V.Performance, 'vendor', 'Performance reports', ['FR-13']),
  R('v_reviews', V.VendorReviews, 'vendor', 'Customer reviews', ['FR-11']),
  R('v_more', V.VendorMore, 'vendor', 'More', ['FR-02'], { tab: true }),
  R('v_profile', V.VendorProfile, 'vendor', 'Business profile & plan', ['FR-03', 'FR-14']),

  // ---- sales agent ----
  R('a_home', A.AgentHome, 'agent', 'Home & pipeline', ['FR-12'], { tab: true, bar: 'brand-dark' }),
  R('a_leads', A.Leads, 'agent', 'Prospective vendors', ['FR-12'], { tab: true }),
  R('a_lead', A.LeadDetail, 'agent', 'Lead detail', ['FR-12', 'FR-15'], { defaultParams: { id: 'ld1' } }),
  R('a_lead_new', A.LeadNew, 'agent', 'Add lead', ['FR-12']),
  R('a_log', A.LogActivity, 'agent', 'Log call / message / visit', ['FR-12'], { defaultParams: { id: 'ld1' } }),
  R('a_followups', A.Followups, 'agent', 'Follow-ups', ['FR-12'], { tab: true }),
  R('a_onboard', A.Onboard, 'agent', 'Assisted onboarding (consent)', ['FR-12', 'FR-03'], { defaultParams: { id: 'ld1' } }),
  R('a_earnings', A.AgentEarnings, 'agent', 'Commissions', ['FR-12'], { tab: true }),
  R('a_profile', A.AgentProfile, 'agent', 'Profile', ['FR-02', 'FR-12'], { tab: true }),

  // ---- super admin ----
  R('ad_dash', AD.AdminReferenceDashboard, 'admin', 'Dashboard', ['FR-13'], { tab: true, bar: 'ink' }),
  R('ad_approvals', AD.Approvals, 'admin', 'Approvals hub', ['FR-03', 'FR-04', 'FR-11'], { tab: true }),
  R('ad_vendors', AD.AdminVendors, 'admin', 'Vendor verification queue', ['FR-03']),
  R('ad_role_reviews', VR.AdminRoleReviews, 'admin', 'Vendor role reviews', ['FR-03']),
  R('ad_role_defs', VR.AdminRoleDefinitions, 'admin', 'Vendor roles catalogue', ['FR-03']),
  R('ad_vendor_new', AD.AdminVendorNew, 'admin', 'Add vendor or business supplier', ['FR-03']),
  R('ad_vendor', AD.AdminVendor, 'admin', 'Review vendor', ['FR-03', 'FR-15'], { defaultParams: { id: 'v8' } }),
  R('ad_listings', AD.AdminListings, 'admin', 'Listing moderation', ['FR-04']),
  R('ad_listing', AD.AdminListing, 'admin', 'Review listing', ['FR-04', 'FR-15'], { defaultParams: { id: 'l5' } }),
  R('ad_users', AD.UsersScreen, 'admin', 'Users', ['FR-02'], { tab: true }),
  R('ad_user', AD.UserDetail, 'admin', 'User & role', ['FR-02'], { defaultParams: { id: 'u1' } }),
  R('ad_roles', AD.Roles, 'admin', 'Roles & permissions', ['FR-02']),
  R('ad_categories', AD.AdminCategories, 'admin', 'Categories', ['FR-04']),
  R('ad_category', AD.AdminCategory, 'admin', 'Category & required fields', ['FR-04'], { defaultParams: { id: 'elec' } }),
  R('ad_agents', AD.AdminAgents, 'admin', 'Sales agents', ['FR-12']),
  R('ad_agent', AD.AdminAgent, 'admin', 'Agent & commissions', ['FR-12', 'FR-09'], { defaultParams: { id: 'ag1' } }),
  R('ad_cases', AD.AdminDisputes, 'admin', 'Cases', ['FR-11']),
  R('ad_case', AD.AdminDispute, 'admin', 'Resolve case', ['FR-11', 'FR-15'], { defaultParams: { id: 'DSP-204' } }),
  R('ad_reports', AD.AdminReports, 'admin', 'Reports & export', ['FR-13'], { tab: true }),
  R('ad_settings', AD.AdminSettings, 'admin', 'Platform settings', ['FR-14']),
  R('ad_audit', AD.AuditLog, 'admin', 'Audit log', ['FR-15']),
  R('ad_more', AD.AdminMore, 'admin', 'More', ['FR-02'], { tab: true }),
  R('ad_analytics', AD.AdminReports, 'admin', 'Analytics', ['FR-13']),
  R('ad_customers', AD.UsersScreen, 'admin', 'Customers', ['FR-02'], { defaultParams: { role: 'Customer' } }),
  R('ad_coupons', AD.AdminSettings, 'admin', 'Coupons', ['FR-14']),

  // ---- Phase 1 sync screens (docs/03-mockup-sync-matrix.md) ----
  R('acct_state', ACC.AccountState, 'shared', 'Account status'),
  R('c_delete', ACC.DeleteAccount, 'shared', 'Delete account'),
  R('c_export', ACC.ExportData, 'shared', 'Your data: export & deletion'),
  R('c_sessions', ACC.Sessions, 'shared', 'Sessions & devices'),
  R('c_notif_prefs', ACC.NotifPrefs, 'shared', 'Notification preferences'),
  R('c_contact_share', ACC.ContactShare, 'shared', 'Share contact details'),
  R('c_location', ACC.LocationPicker, 'shared', 'Choose location'),
  R('c_location_wait', ACC.LocationWait, 'shared', 'City not live: waitlist', [], { defaultParams: { city: 'Jodhpur' } }),
  R('c_cat_suggest', ACC.CatSuggest, 'vendor', 'Suggest a category'),
  R('c_explore_err', MS.ExploreError, 'shared', 'Search error & no results'),
  R('c_explore_suppliers', VendorExplore, 'shared', 'Suppliers & manufacturers'),
  R('c_listing_nodata', MS.ListingNoData, 'shared', 'Listing with missing data', [], { defaultParams: { id: 'l6' } }),
  R('c_listing_trade', MS.ListingTrade, 'shared', 'Trade details', [], { defaultParams: { id: 'l7' } }),
  R('c_product', MS.ProductPage, 'shared', 'Product page: MOQ & tiers', [], { defaultParams: { id: 'l7' } }),
  R('c_book_instant', C2.BookingNew, 'customer', 'Instant booking', [], { defaultParams: { listingId: 'l11', mode: 'instant' } }),
  R('c_book_series', C2.BookingNew, 'customer', 'Recurring booking series', [], { defaultParams: { listingId: 'l13', mode: 'recurring' } }),
  R('c_book_modify', BK.BookModify, 'customer', 'Request a booking change', [], { defaultParams: { id: 'BKG-1039' } }),
  R('c_booking_done', BK.BookingDone, 'customer', 'Confirm completion (7 days)', [], { defaultParams: { id: 'BKG-1031' } }),
  R('c_conflict', BK.Conflict, 'customer', 'Conflicting confirmations'),
  R('c_terms', BK.TermsRecord, 'shared', 'Agreed price & terms record'),
  R('c_rfq_edit', BK.RfqEdit, 'shared', 'Edit RFQ', [], { defaultParams: { id: 'RFQ-308' } }),
  R('c_rfq_none', BK.RfqNone, 'shared', 'No quotations & extend deadline', [], { defaultParams: { id: 'RFQ-308' } }),
  R('c_rfq_goods', BK.RfqGoods, 'shared', 'Goods RFQ'),
  R('c_rfq_compare', BK.RfqCompare, 'shared', 'Compare goods quotations', [], { defaultParams: { id: 'RFQ-320' } }),
  R('c_rfq_open', BK.WorkOrder, 'shared', 'Accepted terms & work order', [], { defaultParams: { id: 'RFQ-311' } }),
  R('c_orders', BK.CustomerOrders, 'shared', 'Purchase orders'),
  R('c_order_exc', BK.OrderException, 'shared', 'Delivery exception', [], { defaultParams: { id: 'ORD-24011' } }),
  R('c_contract_new', BK.ContractNew, 'customer', 'Propose a contract'),
  R('c_contract', BK.ContractCustomer, 'customer', 'Contract', [], { defaultParams: { id: 'CON-501' } }),
  R('c_review_no', MS.ReviewNotEligible, 'customer', 'Review not available yet'),
  R('c_reviews', MS.MyReviews, 'customer', 'My reviews'),
  R('c_dash', MS.CustomerDashboard, 'customer', 'Customer dashboard'),
  R('ui_states', ACC.UiStates, 'shared', 'UI states'),
  R('invoice', BZ.Invoice, 'shared', 'Tax invoice'),
  R('fees', BZ.Fees, 'shared', 'Fees explained'),
  R('vision', RV.Vision, 'auth', 'Vision'),
  R('flows', RV.Flows, 'auth', 'Flows & states'),
  R('journeys_pick', RV.JourneysPick, 'auth', 'Demo journeys'),
  R('journeys', RV.Journeys, 'auth', 'Journey walk-through', [], { defaultParams: { id: 'J1' } }),
  // Phase 2 previews carry a visible badge (D-010)
  R('c_pay', MS.PayCheckout, 'customer', 'Checkout & escrow (Phase 2)'),
  R('c_payments', MS.PayHub, 'customer', 'Payments (Phase 2)'),
  R('c_wallet', MS.Wallet2, 'customer', 'Wallet (Phase 2)'),
  R('c_refund', MS.RefundRequest, 'customer', 'Request a refund (Phase 2)'),
  R('c_refund_view', MS.RefundStatus, 'customer', 'Refund status (Phase 2)'),
  R('c_pay_fx', MS.PayFx, 'customer', 'Foreign-currency checkout (Phase 2)'),
  R('v_refunds', MS.VendorRefunds, 'vendor', 'Refunds & bank verification (Phase 2)'),
  R('v_payouts', MS.VendorPayouts, 'vendor', 'Earnings & payouts (Phase 2)'),
  R('ad_commission', MS.AdminCommission, 'admin', 'Revenue & commission (Phase 2)'),

  // ---- vendor ----
  R('v_register_type', MS.RegisterType, 'shared', 'Become a vendor'),
  R('v_register_mfr', MS.RegisterMfr, 'shared', 'Manufacturer / supplier registration'),
  R('v_register_svc', MS.RegisterSvc, 'shared', 'Service provider registration'),
  R('v_listing_gate', MS.ListingGate, 'vendor', 'Publication checklist'),
  R('v_areas', MS.ServiceAreas, 'vendor', 'Service areas'),
  R('v_avail', MS.Availability, 'vendor', 'Availability'),
  R('v_public', MS.PublicProfile, 'vendor', 'Public profile & trust', [], { defaultParams: { id: 'v-me' } }),
  R('v_booking', BK.VendorBooking, 'vendor', 'Booking requests'),
  R('v_booking_mod', BK.VendorBookingMod, 'vendor', 'Customer change request', [], { defaultParams: { id: 'BKG-1045' } }),
  R('v_leads', BK.VendorLeads, 'vendor', 'Leads'),
  R('v_order', BK.VendorOrder, 'vendor', 'Purchase order (supplier)', [], { defaultParams: { id: 'ORD-24020' } }),
  R('v_contract', BK.ContractVendor, 'vendor', 'Contract (vendor)', [], { defaultParams: { id: 'CON-501' } }),
  R('v_cases', DP.VendorCases, 'vendor', 'Cases & appeals'),
  R('v_plans', BZ.Plans, 'vendor', 'Plans'),
  R('v_sub', DP.Subscription, 'vendor', 'My subscription'),
  R('v_checkout', BZ.Checkout, 'vendor', 'Plan checkout', [], { defaultParams: { plan: 'Growth' } }),
  R('v_checkout_down', BZ.CheckoutDown, 'vendor', 'Scheduled downgrade', [], { defaultParams: { plan: 'Starter' } }),
  R('v_sponsor', BZ.Sponsor, 'vendor', 'Sponsored visibility'),
  R('v_biz_network', BZ.BizNetwork, 'vendor', 'Company network'),
  R('v_biz_profile', BZ.BizProfile, 'vendor', 'Company profile', [], { defaultParams: { id: 'biz1' } }),
  R('v_buy', BZ.BuyerHome, 'vendor', 'Buy as a business', [], { tab: true }),
  R('vb_home', BZ.BuyerHome, 'vendor', 'Buyer home'),
  R('vb_explore', VendorExplore, 'vendor', 'Find a supplier'),
  R('vb_rfq', BK.RfqGoods, 'vendor', 'Bulk RFQ'),
  R('vb_compare', BK.RfqCompare, 'vendor', 'Compare quotations', [], { defaultParams: { id: 'RFQ-320' } }),
  R('vb_order', BK.CustomerOrders, 'vendor', 'Buyer purchase orders'),

  // ---- business account (D-005) ----
  R('b_eligibility', BZ.BizEligibility, 'shared', 'Business account: eligibility'),
  R('b_register', BZ.BizRegister, 'shared', 'Register company (6 steps)'),
  R('b_company', BZ.BizCompany, 'business', 'Company', [], { tab: true }),
  R('b_home', BZ.BizHome, 'business', 'Business home', [], { tab: true }),
  R('b_services', BZ.BizServices, 'business', 'Services for vendors', [], { tab: true }),
  R('b_messages', BZ.BizMessages, 'business', 'Vendor enquiries'),
  R('b_more', BZ.BizMore, 'business', 'More', [], { tab: true }),
  R('c_companies', SF.CompanyDirectory, 'shared', 'Companies: buy directly (Phase 2)'),
  R('c_company', SF.CompanyStore, 'shared', 'Company storefront (Phase 2)', [], { defaultParams: { id: 'biz1' } }),
  R('c_company_order', SF.CompanyOrderNew, 'shared', 'Order from a company (Phase 2)', [], { defaultParams: { id: 'biz1', product: 'bp1' } }),
  R('c_company_track', SF.CompanyTrack, 'shared', 'Track a company order (Phase 2)', [], { defaultParams: { id: 'CO-3002' } }),
  R('b_orders', SF.BizOrders, 'business', 'Customer orders received (Phase 2)'),
  R('b_order', SF.BizOrder, 'business', 'Customer order: accept, process, ship (Phase 2)', [], { defaultParams: { id: 'CO-3002' } }),
  R('team', BZ.Team, 'business', 'Team (Phase 2)'),

  // ---- agent ----
  R('a_tasks', MS.AgentTasks, 'agent', 'Onboarding tasks'),
  R('a_perms', MS.AgentPerms, 'agent', 'What agents can and cannot do'),
  R('a_perf', DP.AgentPerformance, 'agent', 'Performance', [], { tab: true }),

  // ---- admin ----
  R('ad_geo', ACC.GeoManager, 'admin', 'Geo rollout manager'),
  R('ad_taxonomy', ACC.AdminTaxonomy, 'admin', 'Taxonomy builder'),
  R('ad_cat_new', ACC.AdminCatNew, 'admin', 'Create category'),
  R('ad_company', BZ.AdminCompany, 'admin', 'Company verification queue'),
  R('ad_plans', BZ.AdminPlans, 'admin', 'Plans & entitlements'),
  R('ad_sponsored', BZ.AdminSponsored, 'admin', 'Sponsored campaigns'),
  R('ad_subs', BZ.AdminSubs, 'admin', 'Subscriptions'),
  R('ad_sub', BZ.AdminSub, 'admin', 'Subscription & billing events', [], { defaultParams: { id: 'v-me' } }),
  R('ad_reviews', MS.AdminReviews, 'admin', 'Review moderation'),
  R('ad_cfg', MS.ConfigRegister, 'admin', 'Open configuration register'),
  R('ad_maintenance', MS.Maintenance, 'admin', 'Maintenance & force update'),
])

export const GROUPS = [
  { id: 'auth', label: 'Auth' },
  { id: 'customer', label: 'Customer' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'agent', label: 'Agent' },
  { id: 'admin', label: 'Admin' },
]


