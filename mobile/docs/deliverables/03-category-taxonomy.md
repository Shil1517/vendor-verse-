# 03 · Complete Category Taxonomy

> **Detail document, not yet reviewed against the 2026-10-29 decisions** (see [../../../docs/04-decisions-log.md](../../../docs/04-decisions-log.md)). Phase labels follow the spec in [../../../docs/01-feature-spec.md](../../../docs/01-feature-spec.md) where they differ.


_Source: `src/globaldata.jsx` (`INDUSTRIES`) and `src/mvpdata.jsx` (`SCHEMA`)._

## 1. Structure

```
Industry  →  Category  →  Subcategory  →  Attribute schema (per category)
```

- Industry and category are **data, not code**. The admin taxonomy builder adds them without a release.
- Each category has: booking modes allowed (instant / scheduled / RFQ / contract), verification requirements, response deadline, cancellation policy, and a custom-field schema.
- Anyone can **suggest** a category; admin approves, merges or rejects.
- Counts shown are the mockup's sample category counts.

## 2. Industries and subcategories

### Phase 1 browse catalog — core industries

| Industry | Sample subcategories | Categories |
|---|---|---|
| Home & household services | Electrician, Plumbing, Cleaning & pest control, Carpentry, Painting, Appliance repair | 84 |
| Construction & infrastructure | Civil contractors, Interior fit-out, Electrical projects, Waterproofing, Roads & bridges | 126 |
| Events & entertainment | Catering, Decoration, Photography, Venues, Artists & DJs | 58 |
| Professional & business services | CA & tax, Legal, Architects, Consultants, Translation | 92 |
| IT, software & digital | Web & app development, IT support, Digital marketing, Cybersecurity, Cloud & DevOps | 110 |
| Wholesale, suppliers & distribution | Electrical supplies, Building materials, Packaging, Industrial machinery, Office supplies | 140 |
| Logistics, freight & shipping | Packers & movers, Freight forwarding, Courier, Customs clearance, Warehousing | 47 |
| Automotive & mobility | Car service, Towing, Driver hire, Vehicle rental, Fleet maintenance | 52 |
| Healthcare, education & wellness | Physiotherapy, Tutors, Yoga & fitness, Home nursing, Diagnostics | 73 |
| Agriculture, energy & environment | Solar installation, Agri equipment, Soil testing, Waste & recycling, Water treatment | 64 |

**Supply-building priority groups:** Home, Construction, Events, Professional, Wholesale. All 30 industries are browseable in Phase 1 under D-017; vendor listing and RFQ workflows remain configured for the existing 10 groups.

### Additional Phase 1 industries (formerly Phase 2)

| Industry | Sample subcategories | Categories |
|---|---|---|
| Manufacturing & OEM | Electronics & PCB, CNC & machining, Plastics & moulding, Metal fabrication, Auto components | 168 |
| Textiles, apparel & fashion | Garment manufacturing, Fabrics & yarn, Embroidery, Uniforms | 61 |
| Chemicals, plastics & materials | Industrial chemicals, Polymers, Adhesives, Paints & coatings | 55 |
| Food, beverage & agri-processing | Packaged food, Spices, Beverages, Cold storage | 49 |
| Education & training providers | Corporate training, Test prep, Vocational skills | 38 |
| Finance, insurance & real estate | Accounting, Insurance brokers, Property consultants, Valuation | 44 |
| Marketing, media & printing | Branding, Video production, Printing & packaging, Signage | 57 |
| Power, utilities & electrical | Transformers, Switchgear, Generators, EV charging | 41 |
| Packaging & printing | Corrugated boxes, Labels, Custom packaging | 43 |

### Additional Phase 1 industries (formerly Phase 3)

| Industry | Sample subcategories | Categories |
|---|---|---|
| Mining, metals & minerals | Steel & alloys, Aggregates, Industrial minerals | 33 |
| Hospitality, travel & tourism | Hotels, Tour operators, Travel desks | 46 |
| Real estate & property services | Facility management, Interior design, Property inspection | 36 |
| Beauty, salon & personal care | Salon at home, Spa, Makeup artists | 29 |
| Sports, fitness & recreation | Coaches, Equipment, Turf & courts | 27 |
| Security & safety services | Guards, CCTV, Fire safety | 31 |
| Telecom & networking | Network cabling, Telecom towers, ISP services | 35 |
| Aerospace & defence suppliers | Aero components, MRO | 22 |
| Marine & shipbuilding | Ship repair, Marine equipment | 19 |
| Recycling & circular economy | E-waste, Scrap trading, Upcycling | 24 |
| Jewellery, gifts & luxury | Jewellery makers, Corporate gifting | 26 |

## 3. Taxonomy clean-up needed

| Issue | Recommendation |
|---|---|
| "Packaging & printing" (P2) overlaps "Marketing, media & printing" and the "Packaging" subcategory in Wholesale | Merge print/packaging into one industry; keep Wholesale→Packaging as a product view of the same categories |
| "Real estate & property services" (P3) overlaps "Finance, insurance & real estate" (P2) | Keep property services (FM, inspection) separate from property finance/brokerage |
| "Education & training providers" (P2) overlaps "Healthcare, education & wellness" (MVP) | Tutors stay in MVP; corporate training moves under Professional services |
| Security & safety icon id is `i_print` in code | Rename id to `i_security` |
| "Healthcare" mixes regulated care with wellness | Split verification rules per category (regulated licence required for nursing/diagnostics) |

## 4. Offer type by category

| Type | Examples | Booking modes | Typical verification |
|---|---|---|---|
| **Service** | Home, Events, Professional, IT, Automotive, Health | Instant / Scheduled / RFQ / Contract | ID + address; licence if regulated |
| **Contractor** | Construction | RFQ / Contract (milestones) | GST, contractor licence, insurance |
| **Manufacturer** | Manufacturing, Textiles, Chemicals | RFQ / PO / Contract | Factory registration, ISO/CE/BIS, audit |
| **Supplier / distributor** | Wholesale, Food, Packaging | Catalogue → RFQ → PO | GST, brand authorisation, warehouse proof |

## 5. Attribute schemas (configurable per category)

Field types: short text, number, single choice, multiple choice, yes/no, file upload, date. Each field has flags: **required**, **filterable**, **compare operator** (min/max), **unit**.

| Schema | Fields (R = required, F = filterable) |
|---|---|
| Home services | Experience yrs (R,F), Tools provided (F), Service radius km (F), Mode of service (F) |
| Construction | Project size range (R), Crew size (F), Material included (F), Licence class (F) |
| Events | Min guests (R,F), Cuisine/style (F), Setup included (F) |
| Professional | Qualification (R), Registration no. (R), Languages (F), Mode of service (F) |
| IT | Tech stack (R), Team size (F), Delivery model (F) |
| Wholesale / products | Brand (F), Material (F), MOQ (R,F), Lead time days (F), Certification (F), Delivery radius |
| Logistics | Fleet size (R), Insurance cover (F), Coverage |
| Automotive | Vehicle types (R), Pick-up & drop (F), Warranty on work |
| Healthcare | Qualification (R), Session length, Home visit (F) |
| Agriculture / energy | Capacity range (R), Warranty yrs (F), Subsidy support (F) |

## 6. Governance rules

1. A category cannot go live without: at least one booking mode, a verification rule, a response deadline, and a cancellation policy.
2. Changing a schema **versions** it. Existing listings keep the version they were published under until the vendor edits them.
3. Retiring a category hides it from search and blocks new listings; existing bookings are unaffected.
4. Per-country packs (Phase 2) may override attribute labels and verification evidence but not structure.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-11 12:34 | Amit | Modified: industry phase headings and launch scope | D-017 makes the full 30-industry taxonomy browseable in Phase 1 while retaining existing workflow configuration. |
| 2026-10-29 16:27 | Shil1517 | Modified: added pointer banner | Added pointer to the new docs/ set; content review still outstanding |
