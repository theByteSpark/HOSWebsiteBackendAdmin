# HOUSE OF SEYA — BUSINESS MANAGEMENT PLATFORM
## Architecture & Design Document — Phase 1 (Revised)

**Repository:** `HOSWebsiteBackendAdmin`  
**Branch:** `feature/houseofseya-backend-admin`  
**Date:** 2026-09-22 | **Revised:** 2026-09-22  
**Status:** Audit Complete — Architecture Revised — Awaiting Phase 2 Approval

---

## Revision Notes

This document supersedes the previous version. Key architectural decisions applied in this revision:

- Platform identity corrected: this is a **Business Management Platform**, not a CMS. Website content editing is Module 7 of 8.
- **Stores removed entirely** from backend, database schema, API, and admin panel. House of Seya is a fully remote business. The `/stores` frontend route is documented in the audit (factual) but produces no backend module.
- **Appointment booking** is entirely dependent on physical store selection in the current frontend. It is marked **DEFERRED** pending frontend integration review — no backend module or database entity is built for it.
- **Admin roles** updated to: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`. No store-scoped permissions.
- **Local development** uses a local PostgreSQL database. Production VPS configuration happens after local verification.
- **Media storage** uses VPS filesystem for files; PostgreSQL stores metadata and path/URL references only. No binary data in PostgreSQL. Object storage is a future migration option only.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Frontend Audit](#2-existing-frontend-audit)
3. [Data Sources: Source-to-Entity Map](#3-data-sources-source-to-entity-map)
4. [Hardcoded Content Audit](#4-hardcoded-content-audit)
5. [Reference Backend Audit](#5-reference-backend-audit)
6. [Database Architecture](#6-database-architecture)
7. [Media Architecture](#7-media-architecture)
8. [REST API Architecture](#8-rest-api-architecture)
9. [Admin Panel Information Architecture](#9-admin-panel-information-architecture)
10. [Frontend Integration Strategy](#10-frontend-integration-strategy)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Local Development vs Production Deployment](#12-local-development-vs-production-deployment)
13. [Security Requirements](#13-security-requirements)
14. [Migration & Seeding Strategy](#14-migration--seeding-strategy)
15. [Development Phases](#15-development-phases)
16. [Risks & Dependencies](#16-risks--dependencies)
17. [Recommended Build Order](#17-recommended-build-order)

---

## 1. Executive Summary

House of Seya is a premium lab-grown diamond jewellery brand operating fully remotely, direct-to-consumer (DTC). The existing production storefront is a **React SPA** (`houseofseyaStaticwebsite`) driven entirely by two static data files: `mock.js` (~53 KB) and `subcategoryContent.js` (~55 KB). All product, collection, blog, FAQ, review, and content page data is hardcoded.

**What is being built:** A complete House of Seya **Business Management Platform** comprising:

- A **Node.js/Express + TypeScript + Prisma + PostgreSQL** backend API
- A **React admin panel** (served from `admin.houseofseya.com`)
- That covers **eight business domains**: Dashboard & Analytics, Orders, Customers, Products, Inventory, Reports, Website CMS, and Settings

Website content management (the CMS) is **one of eight modules** — not the primary purpose of the system. Core business operations (orders, customers, inventory, analytics) are equally mandatory.

**What this system is NOT:**
- A customer-facing storefront (that is `houseofseyaStaticwebsite`)
- An e-commerce checkout system (orders are currently received via WhatsApp)
- A physical store management system (House of Seya has no physical offices or stores)

**Phase 1 delivers:** This architecture document only.  
**Phase 2 delivers:** The complete backend API, database, and admin panel.

**Technology stack:**
- Runtime: Node.js + TypeScript
- Framework: Express 5
- ORM: Prisma
- Database: PostgreSQL (local during development; VPS during production)
- Media: VPS filesystem (files) + PostgreSQL (metadata and path/URL references only)
- Admin panel: React SPA (framework TBD at Phase 3 kickoff)

---

## 2. Existing Frontend Audit

### 2.1 Route Inventory (15 routes, 12 page components)

Routes defined in `src/App.js`. React Router v6.

| Route | Component | Notes |
|---|---|---|
| `/` | Home | Hero, categories, products, FAQs |
| `/collections/:slug` | Collection | Category listing |
| `/collections/:slug/:subSlug` | Collection | Subcategory listing |
| `/products/:slug` | Product | Product detail page |
| `/stores` | Stores | Store locator + appointment form + contact |
| `/about` | About | Brand story / founder |
| `/reviews` | Reviews | Customer review aggregation |
| `/services/gifting` | Gifting | Gifting service page |
| `/services/customise` | Customise | Customisation service (57 KB JSX) |
| `/faqs` | DiamondEducation | Renders DiamondEducation — preserved as-is |
| `/blogs` | Blogs | Blog / journal listing |
| `/blogs/:slug` | BlogPost | Individual blog post |
| `/pages/diamond-education` | DiamondEducation | Same component as /faqs |
| `/pages/gold-vermeil` | GoldVermeil | Gold vermeil guide |
| `/pages/:slug` | Home | Catch-all — placeholder for future pages |

> **Note on /stores:** This route exists in the production frontend. It renders a store locator, appointment booking form, and contact tab. House of Seya does not operate physical stores, so this page and its content (which is entirely hardcoded and references placeholder store locations) must be reviewed during Phase 4 frontend integration. No backend store module is built.

> **Note on /faqs:** This route renders `DiamondEducation.jsx` (same component as `/pages/diamond-education`). This behavior is preserved. A standalone FAQ page is NOT introduced.

### 2.2 Component Data Consumption

**Global (every page)**
- `Header.jsx`: `NAV_LINKS` from mock.js; announcement bar (4 messages) hardcoded inline
- `Footer.jsx`: `FOOTER_SECTIONS` hardcoded; social URLs hardcoded; tagline hardcoded; `WHATSAPP_NUMBER` from mock.js
- `WhatsAppButton.jsx`: `WHATSAPP_NUMBER` from mock.js

**Homepage (/):** `HERO_SLIDES`, `CATEGORIES`, `ALL_PRODUCTS`, `PROMISES`, `HERO_TILES`, `FAQS`, `DIAMOND_SECTION_VIDEO` from mock.js; diamond section desktop image hardcoded in HomeSections.jsx from houseofquadri.com CDN (**must replace before go-live**); Instagram feed is a non-functional placeholder; Testimonials/BlogStrip/VisitUs/PressLogos are commented out.

**Collection (/collections/:slug):** `COLLECTION_BANNERS` hardcoded in Collection.jsx; `PRODUCTS`/`ALL_PRODUCTS` from mock.js; `TESTIMONIALS` from mock.js; `SUBCATEGORY_CONTENT` from subcategoryContent.js (faqs + seo per subcategory slug).

Subcategory content keys in subcategoryContent.js:
`solitaire-studs`, `halo-studs`, `other-studs`, `hoops-huggies`, `all-earrings`, `pendants`, `pendant-sets`, `mangalsutra`, `trinket-necklace`, `all-necklaces`, `tennis-bracelet`, `station-bracelet`, `all-bracelets`

**Product (/products/:slug):** `ALL_PRODUCTS` from mock.js by slug; metal variants (Yellow/White/Rose Gold) hardcoded in Product.jsx; `PROMISE_ITEMS`, `ORDERS_SHIPMENTS_ITEMS`, `RETURNS_POLICY_CARDS`, `PRODUCT_FAQ_GROUPS` all hardcoded in Product.jsx; product detail specs (3.20g, 0.85ct, 21 pieces) are **hardcoded placeholder values**.

**Other pages:**
- About: `ABOUT_CONTENT` (all images Unsplash)
- Reviews: `TESTIMONIALS` (6 reviews)
- DiamondEducation: `DIAMOND_EDUCATION_CONTENT` (4Cs, comparison tables, myths, FAQs)
- GoldVermeil: **entirely hardcoded in GoldVermeil.jsx JSX — not in mock.js**
- Gifting: `GIFTING_CONTENT`
- Customise: `CUSTOMISE_CONTENT` (5 steps with option arrays)
- Blogs: `BLOGS` (7 posts: slug, category, title, excerpt, image, body/sections)
- Stores: `STORES` (placeholder store data) — **no backend module; page under review**

---

## 3. Data Sources: Source-to-Entity Map

| Frontend Source | File | Future DB Entity |
|---|---|---|
| HERO_SLIDES | mock.js | HeroSlide |
| CATEGORIES | mock.js | ProductCategory |
| SHAPES | mock.js | SiteSettings.diamondShapes[] |
| DIAMOND_SECTION_VIDEO | mock.js | SiteSettings |
| PRODUCTS / ALL_PRODUCTS | mock.js (generated) | Product |
| TESTIMONIALS | mock.js | Review |
| PROMISES | mock.js | SiteSettings.promises[] |
| PRESS | mock.js | SiteSettings.pressNames[] |
| FAQS | mock.js | FAQ |
| HERO_TILES | mock.js | SiteSettings.heroTiles[] |
| BLOGS | mock.js | BlogPost |
| NAV_LINKS | mock.js | NavigationItem |
| WHATSAPP_NUMBER | mock.js | SiteSettings.whatsappNumber |
| ABOUT_CONTENT | mock.js | Page (slug: "about") |
| DIAMOND_EDUCATION_CONTENT | mock.js | Page (slug: "diamond-education") |
| CUSTOMISE_CONTENT | mock.js | Page (slug: "customise") |
| GIFTING_CONTENT | mock.js | Page (slug: "gifting") |
| SUBCATEGORY_CONTENT | subcategoryContent.js | SubcategorySEO |
| FOOTER_SECTIONS | Footer.jsx (hardcoded) | SiteSettings.footerSections[] |
| COLLECTION_BANNERS | Collection.jsx (hardcoded) | ProductCategory.bannerImage + .bannerTagline |
| PROMISE_ITEMS | Product.jsx (hardcoded) | SiteSettings.productPromises[] |
| ORDERS_SHIPMENTS_ITEMS | Product.jsx (hardcoded) | SiteSettings.shippingFAQ[] |
| RETURNS_POLICY_CARDS | Product.jsx (hardcoded) | SiteSettings.returnPolicyCards[] |
| PRODUCT_FAQ_GROUPS | Product.jsx (hardcoded) | FAQ (context: PRODUCT) |
| Contact email/phone | Stores.jsx (hardcoded) | SiteSettings |
| Social URLs | Footer.jsx (hardcoded) | SiteSettings |
| Announcement messages | Header.jsx (hardcoded) | SiteSettings.announcementMessages[] |
| Gold Vermeil content | GoldVermeil.jsx (hardcoded JSX) | Page (slug: "gold-vermeil") |
| STORES | mock.js | **NOT IMPLEMENTED — page under review** |

---

## 4. Hardcoded Content Audit

### 4.1 Critical — Cannot Change Without Source Code Edit

| Content | File | Notes |
|---|---|---|
| Announcement bar (4 messages) | Header.jsx | |
| Footer brand tagline | Footer.jsx | |
| Footer sections + all links | Footer.jsx | FOOTER_SECTIONS array |
| Social links (Instagram/Facebook/YouTube) | Footer.jsx | |
| WhatsApp number | mock.js | 918722447768 |
| Diamond section desktop image | HomeSections.jsx | **From houseofquadri.com CDN — MUST replace before go-live** |
| Contact email + phone | Stores.jsx | Page under review |
| Metal swatch options + hex colors | Product.jsx | Yellow/White/Rose Gold |
| Product detail specs | Product.jsx | **Placeholder values: 3.20g, 0.85ct, 21 pieces** |
| Product promises, shipping FAQ, returns policy | Product.jsx | |
| Product FAQ groups (6 groups, ~25 Q&As) | Product.jsx | |
| Collection hero banners | Collection.jsx | 3 Unsplash images + taglines |
| Gold Vermeil entire page content | GoldVermeil.jsx | Highest extraction effort |

### 4.2 Current SEO State

| Item | Status |
|---|---|
| Meta titles | subcategoryContent.js only (collections) |
| Meta descriptions | NONE on any page |
| Open Graph tags | NONE |
| Canonical URLs | NONE |
| Structured data (JSON-LD) | NONE |

---

## 5. Reference Backend Audit

**Repository:** houseOfSeyaInventoryManagementBackend  
**Stack:** Node.js + Express 5 + TypeScript + Prisma + PostgreSQL

### 5.1 Module Structure to Adopt

`
src/
  app.ts / server.ts
  config/db.ts                  Prisma client singleton
  config/env.ts                 Type-safe environment variable access
  middleware/
    authenticate.ts             JWT Bearer extraction + verification
    authorize.ts                authorize(...roles) factory middleware
    errorHandler.ts             Centralized async error handler
    validate.ts                 validateBody(zodSchema) request body validation
  modules/
    auth/                       Login, refresh, logout, password reset
    [domain]/
      [domain].routes.ts
      [domain].controller.ts
      [domain].service.ts
      [domain].schema.ts        Zod validation schemas
  utils/
    apiError.ts                 ApiError class with static factories
    asyncHandler.ts             Wraps async handlers for propagation
    jwt.ts                      Access + refresh + reset token utilities
    mailer.ts                   Resend email integration
    pagination.ts               Offset/cursor pagination helper
`

### 5.2 Patterns to REUSE

| Pattern | Notes |
|---|---|
| TypeScript + Express 5 module-per-domain structure | Adopt exactly |
| Prisma client singleton (config/db.ts) | Copy |
| Type-safe env validation (config/env.ts) | Copy |
| ApiError class with static factories | Copy |
| asyncHandler wrapper | Copy |
| JWT dual-token: 15min access + 30d refresh (HttpOnly cookie) | Copy |
| authenticate middleware (Bearer header) | Copy |
| authorize(...roles) factory | Adapt for new 4-role system |
| validateBody(schema) with Zod | Copy |
| Centralized error handler | Copy |
| bcrypt password hashing (cost factor 12) | Copy |
| Resend for transactional email | Copy |
| CORS multi-origin allowlist | Copy |

### 5.3 Patterns NOT to Reuse

| Pattern | Reason |
|---|---|
| Product.quantityInStock as bare integer | HOS needs per-variant inventory |
| Product.sku as sole unique identifier | HOS needs URL slug |
| Simple Customer (single address) | HOS needs multiple addresses, CRM fields |
| Sale/SaleItem model | HOS needs Order with shipping, payment, timeline |
| Vendor/Purchase models | Not needed |
| Two-role enum (ADMIN/STAFF) | HOS uses 4-role system |
| No media library | HOS needs MediaAsset + filesystem management |
| No CMS content models | Entirely new territory |
| No slug/SEO fields | All HOS entities need slug + SEO fields |
| No analytics/reporting | HOS requires dashboard aggregations and report APIs |
| No audit logging | HOS requires full admin action audit trail |

---

## 6. Database Architecture

### Design Principles

1. Every entity justified by the frontend audit or business operations — no speculative tables
2. Slugs on all URL-navigable entities
3. SEO fields on all public-facing entities
4. `isPublished` / `isActive` flags on all content
5. Soft deletion (`deletedAt`) on products and orders
6. Full audit trail (`createdAt`, `updatedAt`) on all entities
7. Media stored as path/URL references in `MediaAsset` — **no binary data in PostgreSQL**
8. No `Store` entity, no `storeId` foreign keys, no store-scoped fields anywhere

---

### 6.1 Proposed Prisma Schema

`prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ADMIN USERS & ACCESS CONTROL
// ============================================================

enum AdminRole {
  SUPER_ADMIN   // Full platform access + admin user management
  ADMIN         // Full content + orders + reports; cannot manage admin users
  MANAGER       // Orders, customers, inventory, reports; no content editing; no settings
  STAFF         // Orders + customers (read/update only); no reports; no content
}

model AdminUser {
  id                  String               @id @default(uuid())
  name                String
  email               String               @unique
  passwordHash        String
  role                AdminRole            @default(STAFF)
  isActive            Boolean              @default(true)
  refreshToken        String?
  permissions         Json?                // Granular overrides beyond role defaults
  lastLoginAt         DateTime?
  passwordResetTokens AdminPasswordReset[]
  auditLogs           AuditLog[]
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
}

model AdminPasswordReset {
  id         String    @id @default(uuid())
  userId     String
  user       AdminUser @relation(fields: [userId], references: [id])
  codeHash   String
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime  @default(now())
  @@index([userId])
}

// ============================================================
// AUDIT LOG
// ============================================================

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  LOGIN_FAILED
  PASSWORD_CHANGED
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  EXPORT
  PUBLISH
  UNPUBLISH
  STOCK_ADJUSTMENT
}

model AuditLog {
  id          String      @id @default(uuid())
  adminUserId String?
  admin       AdminUser?  @relation(fields: [adminUserId], references: [id])
  action      AuditAction
  entityType  String?     // "Product", "Order", "Customer", etc.
  entityId    String?
  before      Json?       // State before the action
  after       Json?       // State after the action
  note        String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())
  @@index([adminUserId])
  @@index([entityType, entityId])
  @@index([createdAt])
}

// ============================================================
// IN-APP NOTIFICATIONS
// ============================================================

enum NotificationType {
  ORDER_RECEIVED
  LOW_STOCK
  NEW_REVIEW
  STOCK_ADJUSTED
  ORDER_STATUS_CHANGED
  SYSTEM
}

model Notification {
  id          String           @id @default(uuid())
  adminUserId String?          // null = broadcast to all admins
  type        NotificationType
  title       String
  body        String
  entityType  String?
  entityId    String?
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())
  @@index([adminUserId, isRead])
  @@index([createdAt])
}

// ============================================================
// PRODUCT TAXONOMY
// ============================================================

model ProductCategory {
  id            String        @id @default(uuid())
  slug          String        @unique
  name          String
  image         String?
  bannerImage   String?
  bannerTagline String?
  sortOrder     Int           @default(0)
  isPublished   Boolean       @default(true)
  subcategories Subcategory[]
  products      Product[]
  seo           CategorySEO?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model CategorySEO {
  id              String          @id @default(uuid())
  categoryId      String          @unique
  category        ProductCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  ogImageUrl      String?
}

model Subcategory {
  id          String          @id @default(uuid())
  slug        String          @unique
  name        String
  categoryId  String
  category    ProductCategory @relation(fields: [categoryId], references: [id])
  sortOrder   Int             @default(0)
  isPublished Boolean         @default(true)
  products    Product[]
  seo         SubcategorySEO?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model SubcategorySEO {
  id              String      @id @default(uuid())
  subcategoryId   String      @unique
  subcategory     Subcategory @relation(fields: [subcategoryId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  seoHeading      String?
  seoIntro        String?     @db.Text
  seoSections     Json?       // [{ title: string; body: string }]
  whyUs           Json?       // [{ title: string; body: string }]
  closingTitle    String?
  closing         String?     @db.Text
  faqs            Json?       // [{ q: string; a: string }]
  ogImageUrl      String?
}

// ============================================================
// PRODUCT CATALOG
// ============================================================

model Product {
  id               String           @id @default(uuid())
  slug             String           @unique
  name             String
  sku              String?          @unique
  categoryId       String
  category         ProductCategory  @relation(fields: [categoryId], references: [id])
  subcategoryId    String?
  subcategory      Subcategory?     @relation(fields: [subcategoryId], references: [id])
  price            Decimal          @db.Decimal(10, 2)
  originalPrice    Decimal?         @db.Decimal(10, 2)
  description      String?          @db.Text
  shortDescription String?
  isPublished      Boolean          @default(false)
  inStock          Boolean          @default(true)
  isMadeToOrder    Boolean          @default(false)
  netWeightGrams   Decimal?         @db.Decimal(6, 2)
  totalDiamondCt   Decimal?         @db.Decimal(6, 3)
  totalDiamondPcs  Int?
  diamondGrade     String?          // e.g. "EF VVS-VS"
  images           ProductImage[]
  variants         ProductVariant[]
  inventory        InventoryItem[]
  orderItems       OrderItem[]
  seo              ProductSEO?
  sortOrder        Int              @default(0)
  deletedAt        DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model ProductImage {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  altText   String?
  sortOrder Int      @default(0)
  isHover   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model ProductVariant {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  metalFinish String   // "Yellow Gold", "White Gold", "Rose Gold"
  swatchColor String?  // hex e.g. "#E6C158"
  priceOffset Decimal? @db.Decimal(10, 2)
  isDefault   Boolean  @default(false)
  inStock     Boolean  @default(true)
}

model ProductSEO {
  id              String  @id @default(uuid())
  productId       String  @unique
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  ogImageUrl      String?
}

// ============================================================
// INVENTORY
// ============================================================

enum StockMovementType {
  RESTOCK
  SALE
  ADJUSTMENT
  RETURN
}

model InventoryItem {
  id           String          @id @default(uuid())
  productId    String
  product      Product         @relation(fields: [productId], references: [id])
  variantId    String?
  quantity     Int             @default(0)
  reorderLevel Int             @default(0)
  movements    StockMovement[]
  updatedAt    DateTime        @updatedAt
}

model StockMovement {
  id              String            @id @default(uuid())
  inventoryItemId String
  inventoryItem   InventoryItem     @relation(fields: [inventoryItemId], references: [id])
  type            StockMovementType
  quantity        Int               // positive = in, negative = out
  reason          String?
  adminUserId     String?
  createdAt       DateTime          @default(now())
  @@index([inventoryItemId, createdAt])
}

// ============================================================
// ORDERS & CUSTOMERS
// ============================================================

enum OrderStatus {
  PENDING
  CONFIRMED
  IN_PRODUCTION
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum OrderChannel {
  WHATSAPP
  WEBSITE
  PHONE
  WALK_IN
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
  REFUNDED
}

enum CustomerSource {
  WHATSAPP
  WEBSITE
  WALK_IN
  PHONE
  REFERRAL
}

model Customer {
  id              String            @id @default(uuid())
  name            String
  email           String?
  phone           String?
  whatsapp        String?
  source          CustomerSource?
  tags            String[]          // e.g. ["VIP", "Repeat Buyer"]
  notes           String?           @db.Text
  totalOrderValue Decimal           @db.Decimal(12, 2) @default(0)
  orderCount      Int               @default(0)
  addresses       CustomerAddress[]
  orders          Order[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  @@index([phone])
  @@index([email])
}

model CustomerAddress {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  label      String?  // "Home", "Work"
  line1      String
  line2      String?
  city       String
  state      String?
  pincode    String
  country    String   @default("India")
  isDefault  Boolean  @default(false)
}

model Order {
  id                    String        @id @default(uuid())
  orderNumber           String        @unique   // "HOS-2026-0001"
  customerId            String
  customer              Customer      @relation(fields: [customerId], references: [id])
  assignedToId          String?
  assignedTo            AdminUser?    @relation("OrderAssignment", fields: [assignedToId], references: [id])
  status                OrderStatus   @default(PENDING)
  channel               OrderChannel  @default(WHATSAPP)
  items                 OrderItem[]
  shippingAddress       Json?         // address snapshot at order time
  subtotal              Decimal       @db.Decimal(10, 2)
  tax                   Decimal       @db.Decimal(10, 2) @default(0)
  discount              Decimal       @db.Decimal(10, 2) @default(0)
  total                 Decimal       @db.Decimal(10, 2)
  paymentStatus         PaymentStatus @default(UNPAID)
  paymentMethod         String?
  internalNotes         String?       @db.Text
  customerNote          String?       @db.Text
  trackingNumber        String?
  courier               String?
  deliveredAt           DateTime?
  cancelledAt           DateTime?
  timeline              Json?         // [{ status, timestamp, note, adminId }]
  deletedAt             DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  @@index([status])
  @@index([customerId])
  @@index([createdAt])
  @@index([channel])
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  variantId   String?
  productName String  // snapshot of name at order time
  quantity    Int
  unitPrice   Decimal @db.Decimal(10, 2)
  lineTotal   Decimal @db.Decimal(10, 2)
  metalFinish String?
  notes       String?
}

// ============================================================
// WEBSITE CONTENT (CMS MODULE)
// ============================================================

model HeroSlide {
  id        String   @id @default(uuid())
  image     String
  tagline   String?
  title     String
  cta       String?
  href      String
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Review {
  id          String    @id @default(uuid())
  name        String
  location    String?
  quote       String    @db.Text
  imageUrl    String?
  rating      Int       // 1-5
  productName String?
  productId   String?
  verified    Boolean   @default(false)
  isPublished Boolean   @default(false)
  reviewDate  DateTime?
  source      String?   // "Google", "WhatsApp", "Direct"
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model BlogCategory {
  id    String     @id @default(uuid())
  name  String
  slug  String     @unique
  posts BlogPost[]
}

model BlogPost {
  id          String        @id @default(uuid())
  slug        String        @unique
  title       String
  excerpt     String?
  body        String?       @db.Text
  sections    Json?         // structured long-form sections array
  imageUrl    String?
  categoryId  String?
  category    BlogCategory? @relation(fields: [categoryId], references: [id])
  isPublished Boolean       @default(false)
  publishedAt DateTime?
  seo         BlogPostSEO?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model BlogPostSEO {
  id              String   @id @default(uuid())
  blogPostId      String   @unique
  blogPost        BlogPost @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  ogImageUrl      String?
}

enum FAQContext {
  GENERAL
  PRODUCT
  DIAMOND_EDUCATION
  CUSTOMISE
  GIFTING
  COLLECTION
}

model FAQCategory {
  id        String @id @default(uuid())
  name      String
  sortOrder Int    @default(0)
  faqs      FAQ[]
}

model FAQ {
  id          String      @id @default(uuid())
  categoryId  String
  category    FAQCategory @relation(fields: [categoryId], references: [id])
  question    String
  answer      String      @db.Text
  context     FAQContext  @default(GENERAL)
  sortOrder   Int         @default(0)
  isPublished Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Page {
  id          String   @id @default(uuid())
  // slugs: "about", "diamond-education", "gold-vermeil", "gifting", "customise"
  slug        String   @unique
  title       String
  content     Json     // Full structured content matching current mock.js page shapes
  isPublished Boolean  @default(false)
  seo         PageSEO?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PageSEO {
  id              String  @id @default(uuid())
  pageId          String  @unique
  page            Page    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  ogImageUrl      String?
}

// ============================================================
// NAVIGATION & SITE SETTINGS
// ============================================================

model NavigationItem {
  id        String           @id @default(uuid())
  label     String
  href      String
  parentId  String?
  parent    NavigationItem?  @relation("NavChildren", fields: [parentId], references: [id])
  children  NavigationItem[] @relation("NavChildren")
  sortOrder Int              @default(0)
  isActive  Boolean          @default(true)
}

// Singleton row — always id = "singleton"
model SiteSettings {
  id                    String   @id @default("singleton")
  whatsappNumber        String
  contactEmail          String?
  contactPhone          String?
  instagramUrl          String?
  facebookUrl           String?
  youtubeUrl            String?
  footerTagline         String?
  footerCopyright       String?
  announcementMessages  Json     // string[]
  promises              Json     // string[]
  pressNames            Json     // string[]
  heroTiles             Json?    // [{ title, cta, image, href }]
  diamondSectionImage   String?
  diamondSectionVideo   String?
  diamondSectionHeading String?
  diamondSectionBody    String?
  productPromises       Json?    // [{ label: string }]
  shippingFAQ           Json?    // orders & shipments accordion content
  returnPolicyCards     Json?    // returns policy cards
  footerSections        Json?    // [{ heading, links[] }]
  freeShippingThreshold Decimal? @db.Decimal(10, 2)
  updatedAt             DateTime @updatedAt
}

// ============================================================
// MEDIA LIBRARY
// ============================================================

model MediaAsset {
  id           String   @id @default(uuid())
  filename     String   // Generated UUID-based filename, e.g. "a1b2c3d4.webp"
  originalName String   // Original upload filename (stored for reference only)
  mimeType     String
  sizeBytes    Int
  path         String   // Server-side filesystem path, e.g. "/var/www/.../uploads/products/a1b2c3d4.webp"
  url          String   // Public URL, e.g. "https://houseofseya.com/uploads/products/a1b2c3d4.webp"
  folder       String?  // "products", "collections", "blogs", "pages", "homepage", "general"
  width        Int?
  height       Int?
  altText      String?
  uploadedBy   String   // AdminUser.id
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
`

### 6.2 Entity Relationship Summary

`
ProductCategory --< Subcategory --< Product --< ProductImage
                                       |--< ProductVariant
                                       |--< ProductSEO
                                       --< InventoryItem --< StockMovement

Customer --< Order --< OrderItem >-- Product
        --< CustomerAddress

BlogPost >-- BlogCategory -- BlogPostSEO
Page -- PageSEO
Subcategory -- SubcategorySEO
HeroSlide, Review (standalone)
FAQ >-- FAQCategory
NavigationItem (self-referencing tree)
SiteSettings (singleton)
MediaAsset (standalone)
AdminUser --< AdminPasswordReset
AdminUser --< AuditLog
Notification (standalone — adminUserId nullable for broadcasts)
`

### 6.3 Deferred / Not Implemented

| Entity | Reason |
|---|---|
| Store | House of Seya has no physical stores — no backend module |
| AppointmentRequest | The existing frontend appointment form is entirely dependent on store city selection. Deferred pending frontend integration review. The /stores page itself will be reviewed during Phase 4. |

---

## 7. Media Architecture

### 7.1 Storage Decision

**Production media files are stored on the VPS filesystem. PostgreSQL stores metadata and path/URL references only. No binary data is stored in the database.**

This is the primary and initial production implementation. Object storage (Cloudflare R2, AWS S3) is a valid future migration path — when migrated, only the `path` and `url` fields in `MediaAsset` change; the API contract and frontend URLs remain the same.

### 7.2 Directory Structure

During local development:

`
{PROJECT_ROOT}/uploads/
  products/         Product images
  collections/      Category and collection banner images
  blogs/            Blog post cover images
  pages/            About, Diamond Education, Gold Vermeil, Gifting, Customise images
  homepage/         Hero slider images, dual tile images, diamond section assets
  general/          Miscellaneous assets (press logos, brand assets)
`

In production (VPS):

`
/var/www/houseofseya/uploads/
  products/
  collections/
  blogs/
  pages/
  homepage/
  general/
`

### 7.3 Filename and Path Strategy

| Concern | Decision |
|---|---|
| Filename format | `{uuid}.{ext}` — e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp` |
| Original filename | Stored in `MediaAsset.originalName` for reference only — never used in server paths |
| Path construction | `path.join(UPLOAD_DIR, folder, filename)` — strict join, no user-controlled path segments |
| URL construction | `/uploads//` |

### 7.4 Upload Rules

| Rule | Value |
|---|---|
| Allowed image MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Allowed video MIME types | `video/mp4` |
| Max image file size | 10 MB |
| Max video file size | 200 MB |
| MIME verification | Check both `Content-Type` header and file magic bytes (first N bytes) — reject mismatches |
| Authentication | Admin JWT required — no public upload endpoint |
| Storage of binary data | **Never stored in PostgreSQL** — files written to filesystem only |

### 7.5 Security Requirements for Media

| Security Concern | Implementation |
|---|---|
| **Directory traversal** | UUID filenames + strict `path.join(UPLOAD_DIR, folder, filename)`; reject any path containing `..` or absolute path characters |
| **MIME spoofing** | Validate magic bytes of file content, not just Content-Type header; use a library like `file-type` |
| **Oversized files** | Enforce size limit in middleware before file is written to disk (streaming limit) |
| **Upload authentication** | All upload requests require a valid Admin JWT — middleware runs before multer |
| **Filename injection** | UUID filenames generated server-side; original filename stored for display only, never used in paths |
| **Deletion authorization** | DELETE requires Admin JWT; only ADMIN or SUPER_ADMIN may delete media |
| **Orphaned media** | Files deleted from the database are physically deleted from the filesystem in the same operation. A scheduled cleanup job (daily) reconciles MediaAsset records against the filesystem to remove orphans created by partial failures |
| **Public URL strategy** | Files are publicly accessible via URL (no auth on static serving) — appropriate because all media is non-sensitive brand/product content. Nginx serves the uploads directory with long-lived cache headers |
| **Backup requirement** | The uploads directory must be included in daily VPS backups alongside PostgreSQL dumps. Media files are NOT recoverable from the database alone |

### 7.6 Public URL Strategy and Nginx Serving

In production, Nginx serves the uploads directory as static files:

`
ginx
location /uploads/ {
  alias /var/www/houseofseya/uploads/;
  add_header Cache-Control "public, max-age=31536000, immutable";
  expires 1y;
}
`

Because filenames are UUIDs, cache busting is natural: a new upload of the same image produces a new UUID and a new URL. The old URL continues to work until the old file is explicitly deleted.

In local development, the Express server exposes uploads via `express.static(UPLOAD_DIR)` on the `/uploads` path.

### 7.7 Future Migration to Object Storage

If object storage is adopted later, the migration path is:

1. Upload new files to object storage instead of VPS filesystem
2. Migrate existing files from VPS filesystem to object storage
3. Update `MediaAsset.path` and `MediaAsset.url` for migrated records
4. Update Nginx to reverse-proxy `/uploads/*` to object storage (or remove the Nginx static block and use CDN URLs directly)
5. No frontend changes required — URL pattern changes but all components use the URL from `MediaAsset.url`

---

## 8. REST API Architecture

**Base URL (local dev):** `http://localhost:4000/api/v1`  
**Base URL (production):** `https://houseofseya.com/api/v1`

All responses: `Content-Type: application/json`

### 8.1 Auth Legend

| Symbol | Meaning |
|---|---|
| PUB | Public — no authentication |
| JWT | Any valid Admin JWT (any role) |
| SA | SUPER_ADMIN only |
| ADM | SUPER_ADMIN or ADMIN |
| MGR | SUPER_ADMIN, ADMIN, or MANAGER |
| STF | All authenticated admins (any role) |

### 8.2 /auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | PUB | Admin login — returns access token + sets refresh cookie |
| POST | `/refresh` | PUB | Exchange refresh cookie for new access token |
| POST | `/logout` | JWT | Invalidate refresh token |
| POST | `/forgot-password` | PUB | Send password reset email via Resend |
| POST | `/reset-password` | PUB | Complete password reset with token |
| GET | `/me` | JWT | Get current admin user profile |

### 8.3 /dashboard

All dashboard endpoints return pre-aggregated data. The frontend must NOT calculate analytics from raw order/product lists.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Full dashboard summary: revenue KPIs, order counts by status, low-stock alert count, pending review count, pending notifications count, last 10 orders, last 10 audit log entries |
| GET | `/revenue` | MGR | Revenue over time (params: `from`, `to`, `groupBy=day/week/month`) |
| GET | `/orders-by-status` | MGR | Order count grouped by OrderStatus |
| GET | `/orders-by-channel` | MGR | Order count grouped by OrderChannel |
| GET | `/top-products` | MGR | Top products by revenue or units sold (param: `metric=revenue/units`, `limit=N`) |
| GET | `/customer-stats` | MGR | New customers over time, repeat vs new ratio, average order value |
| GET | `/inventory-alerts` | JWT | Products with quantity below reorderLevel |

### 8.4 /reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/revenue` | MGR | Revenue report (date range, groupBy, breakdown by category/channel) |
| GET | `/products` | MGR | Product performance: units sold, revenue, return rate per product |
| GET | `/inventory` | MGR | Inventory snapshot: current stock, valuation, low-stock list |
| GET | `/customers` | MGR | Customer report: new/returning, top by LTV, average order value |
| GET | `/orders` | MGR | Order report: fulfillment times, status distribution, channel breakdown |
| POST | `/export` | MGR | Generate and download CSV export of any report type |
| GET | `/saved` | MGR | List saved report configurations |
| POST | `/saved` | MGR | Save a named report configuration |
| DELETE | `/saved/:id` | MGR | Delete saved report configuration |

### 8.5 /audit-log

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ADM | Paginated audit log (filter: adminUserId, action, entityType, from, to) |

### 8.6 /notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | List notifications for current admin (recent 50, unread first) |
| PATCH | `/:id/read` | JWT | Mark notification as read |
| PATCH | `/read-all` | JWT | Mark all as read |

### 8.7 /products

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | PUB | List products (filter: category, subcategory, inStock, published) |
| GET | `/:slug` | PUB | Get product by slug (includes images, variants, SEO) |
| POST | `/` | ADM | Create product |
| PATCH | `/:id` | ADM | Update product fields |
| DELETE | `/:id` | ADM | Soft-delete product |
| POST | `/:id/images` | ADM | Add image to product |
| DELETE | `/:id/images/:imageId` | ADM | Remove image |
| PATCH | `/:id/images/reorder` | ADM | Reorder product images |
| POST | `/:id/variants` | ADM | Add metal variant |
| PATCH | `/:id/variants/:variantId` | ADM | Update variant |

**Sample public product list item:**
`json
{
  "id": "uuid",
  "slug": "solitaire-studs",
  "name": "Classic Solitaire Stud Earrings",
  "price": "55000.00",
  "inStock": true,
  "isMadeToOrder": false,
  "categorySlug": "earrings",
  "subcategorySlug": "solitaire-studs",
  "primaryImage": "https://houseofseya.com/uploads/products/a1b2.webp",
  "hoverImage": "https://houseofseya.com/uploads/products/c3d4.webp"
}
`

### 8.8 /categories

`GET /` PUB | `GET /:slug` PUB | `POST /` ADM | `PATCH /:id` ADM | `DELETE /:id` ADM

### 8.9 /subcategories

`GET /` PUB | `GET /:slug` PUB (includes SubcategorySEO) | `POST /` ADM | `PATCH /:id` ADM | `DELETE /:id` ADM

### 8.10 /inventory

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Stock levels for all products |
| GET | `/alerts` | JWT | Products with quantity <= reorderLevel |
| GET | `/valuation` | MGR | Total stock value breakdown by category |
| GET | `/:productId` | JWT | Stock detail for a specific product |
| PATCH | `/:productId` | MGR | Adjust stock level (qty, reason — writes StockMovement) |
| GET | `/:productId/movements` | JWT | Stock movement history for a product |
| GET | `/export` | MGR | Export inventory snapshot as CSV |

### 8.11 /orders

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | STF | List orders (filter: status, channel, customerId, from, to, assignedToId) |
| GET | `/:id` | STF | Order detail (includes items, customer, timeline) |
| POST | `/` | MGR | Create manual order (WhatsApp/phone/walk-in) |
| PATCH | `/:id/status` | MGR | Update order status (appends to timeline) |
| PATCH | `/:id/payment` | MGR | Update payment status and method |
| PATCH | `/:id/shipping` | MGR | Update tracking number, courier, deliveredAt |
| PATCH | `/:id/assign` | MGR | Assign order to an admin user |
| PATCH | `/:id/notes` | STF | Update internal notes |
| DELETE | `/:id` | ADM | Cancel/soft-delete order |
| GET | `/export` | MGR | Export orders as CSV (with current filters) |

### 8.12 /customers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | STF | List customers (search: name, phone, email; filter: tag, source) |
| GET | `/:id` | STF | Customer profile + order summary |
| GET | `/:id/orders` | STF | Full order history for customer |
| POST | `/` | MGR | Create customer record |
| PATCH | `/:id` | MGR | Update customer (name, email, phone, whatsapp, source, notes) |
| PATCH | `/:id/tags` | MGR | Update customer tags |
| GET | `/export` | MGR | Export customer list as CSV |

### 8.13 /blogs

`GET /` PUB | `GET /:slug` PUB | `POST /` ADM | `PATCH /:id` ADM | `DELETE /:id` ADM  
`GET /categories` PUB | `POST /categories` ADM

### 8.14 /faqs

`GET /` PUB (filter by context) | `GET /categories` PUB  
`POST /` ADM | `POST /categories` ADM | `PATCH /:id` ADM | `DELETE /:id` ADM | `PATCH /reorder` ADM

### 8.15 /reviews

`GET /` PUB (published only) | `POST /` ADM | `PATCH /:id` ADM | `DELETE /:id` ADM

### 8.16 /pages

`GET /:slug` PUB | `POST /` ADM | `PATCH /:slug` ADM

### 8.17 /homepage

`GET /` PUB | `PATCH /hero-slides` ADM | `PATCH /hero-tiles` ADM | `PATCH /diamond-section` ADM

### 8.18 /navigation

`GET /` PUB | `PATCH /` ADM

### 8.19 /settings

`GET /` PUB (public-safe fields only) | `GET /admin` JWT | `PATCH /` ADM

### 8.20 /media

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | List media assets (filter: folder, mimeType) with pagination |
| POST | `/upload` | JWT | Upload file (multipart/form-data; field: `file`, `folder`) |
| PATCH | `/:id` | JWT | Update metadata (altText, folder) |
| DELETE | `/:id` | ADM | Delete asset record + physical file |

### 8.21 /admin-users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | SA | List admin users |
| POST | `/` | SA | Create admin user |
| PATCH | `/:id` | SA | Update admin user (name, role, isActive, permissions) |
| DELETE | `/:id` | SA | Deactivate admin user |
| PATCH | `/:id/password` | JWT | Change own password (or SA changes any) |

---

## 9. Admin Panel Information Architecture

The admin panel is a **React SPA** served from `admin.houseofseya.com` (production) or `localhost:3001` (local development). It is a full **Business Management Platform** with eight primary navigation modules.

### 9.1 Primary Navigation (8 Modules)

`
1. Dashboard      Analytics, KPIs, activity feed, alerts
2. Orders         Full order lifecycle management
3. Customers      CRM profiles, history, tags, notes
4. Products       Catalog management + subcategory SEO
5. Inventory      Stock management + alerts + valuation
6. Reports        Revenue, product, customer, order, inventory reports + exports
7. Website        CMS: homepage, pages, blog, FAQs, reviews, navigation
8. Settings       Admin users, roles, audit log, site config, media library
`

### 9.2 Module Detail

#### Module 1: Dashboard

| Section | Content |
|---|---|
| Revenue KPIs | Today / Last 7 days / Last 30 days / MTD / YTD with % change vs prior period |
| Order pipeline | Count by status (Pending, Confirmed, In Production, Ready to Ship, Shipped, Delivered) |
| Recent orders | Last 10 orders — click to open Order Detail |
| Low stock alerts | Products with qty <= reorderLevel |
| Pending reviews | Count of unmoderated (isPublished: false) reviews |
| Revenue chart | Line chart, switchable: 7d / 30d / 90d |
| Top products | Top 5 by revenue this month |
| Channel breakdown | Order count: WhatsApp vs Phone vs Walk-in vs Website |
| Activity feed | Last 10 AuditLog entries (who did what, when) |
| Notifications bell | Unread notification count; dropdown with recent notifications |

#### Module 2: Orders

| Screen | Key Features |
|---|---|
| Orders List | Status filter tabs, channel filter, date range picker, customer search, assignee filter |
| Order Detail | Customer panel, items list, pricing breakdown, status management, payment management, shipping + tracking, timeline of all status changes, internal notes, customer-facing note, assigned admin, direct WhatsApp link to customer |
| Create Order | Manual order entry for WhatsApp/phone/walk-in orders |
| Order Export | CSV export of current filtered view |

Order status flow: PENDING → CONFIRMED → IN_PRODUCTION → READY_TO_SHIP → SHIPPED → DELIVERED (CANCELLED and RETURNED available at any stage)

#### Module 3: Customers

| Screen | Key Features |
|---|---|
| Customers List | Search by name/phone/email, filter by tag, source, date range; shows LTV + order count |
| Customer Profile | Contact info, tags, source, internal notes, addresses, total lifetime value, order count |
| Customer Orders | Full order history inline on profile |
| Customer Export | CSV export |

#### Module 4: Products

| Screen | Key Features |
|---|---|
| Products List | Filter: category, subcategory, inStock, isPublished; sort by price, sortOrder, updatedAt; quick publish/unpublish |
| Product Editor | Fields, short description, description (rich text), pricing, diamond specs, stock toggle, made-to-order toggle; Image gallery with drag-and-drop reorder + hover image designation; Metal variants (add/remove/default/swatch color/price offset); SEO tab; Preview link |
| Categories | Name, slug, image, banner image, banner tagline, sort order |
| Subcategories | Name, slug, category, sort order; SubcategorySEO editor (meta title/description, SEO heading, intro, sections[], whyUs[], closing, FAQ pairs, ogImage) |

#### Module 5: Inventory

| Screen | Key Features |
|---|---|
| Stock Levels | Grid: product name, category, current qty, reorder level, status indicator (OK / Low / Out) |
| Low Stock Alerts | Filtered view of items at or below reorder level |
| Stock Adjustment | Select product, enter quantity change (positive or negative), enter reason; writes StockMovement + AuditLog |
| Movement History | Per-product stock movement log (type, qty, reason, admin, date) |
| Inventory Valuation | Total stock value by category (qty × price) |
| Inventory Export | CSV snapshot of current stock |

#### Module 6: Reports

| Report | Dimensions / Filters |
|---|---|
| Revenue Report | Date range, group by (day/week/month), breakdown by category or channel; chart + table |
| Product Performance | Units sold, revenue, per-product; filter by category, date range; sort by any column |
| Customer Report | New vs returning, top customers by LTV, average order value; date range |
| Order Report | Status distribution, channel breakdown, average fulfillment time; date range |
| Inventory Report | Current snapshot: stock levels, valuation, low-stock items |
| Exports | CSV/Excel download for any report type |
| Saved Reports | Save named report configurations; regenerate on demand |

#### Module 7: Website (CMS)

| Screen | Content Managed |
|---|---|
| Homepage | Hero slider (CRUD, drag-and-drop order); Diamond section (image, video, heading, body); Hero tiles (2 tiles: image, title, cta, href); Announcement bar messages; Promise marquee items; Press logo names |
| Navigation | Drag-and-drop navigation tree; add/remove/reorder items; parent-child relationships |
| Header & Footer | Social links (Instagram, Facebook, YouTube); Footer tagline; Footer sections + links |
| Pages | CMS editor for: About, Diamond Education, Gold Vermeil, Gifting, Customise — section-by-section editors matching current page structure |
| Blog | Post list, rich text editor (title, excerpt, body, sections, image, category, publishedAt, SEO) |
| FAQs | CRUD organized by context (General, Product, Diamond Education, Customise, Gifting, Collection) |
| Reviews | Moderation queue (approve/reject/edit/delete); manual review entry |
| Media Library | Grid of uploaded files; upload new files (drag-and-drop); select for use in other editors; delete |

> **Note:** The `/stores` frontend page is under review for Phase 4. No Stores editor exists in the admin panel.

#### Module 8: Settings

| Screen | Content |
|---|---|
| General | WhatsApp number, contact email, contact phone, free shipping threshold |
| Social | Instagram, Facebook, YouTube URLs |
| SEO Defaults | Default meta title template, default meta description, default OG image |
| Admin Users | List, create, edit (name, email, role, isActive, permission overrides), deactivate |
| Audit Log | Paginated full action history; filter by admin, action type, entity, date range |
| Notifications | View all; mark read; (future: notification preferences) |

---

## 10. Frontend Integration Strategy

### 10.1 Guiding Principle: Additive, Non-Breaking, Parallel

The React storefront's visual design, component structure, and UX are **frozen for Phase 2**. No redesign. Migration is progressive using a feature flag environment variable.

`javascript
// src/api/index.js
const USE_API = process.env.REACT_APP_USE_API === 'true';

export async function getProducts(category) {
  if (!USE_API) return PRODUCTS[category]; // mock.js fallback
  const res = await fetch(/api/v1/products?category=);
  return res.json();
}
`

`mock.js` remains in the repository as a fallback until all sections pass QA.

### 10.2 Migration Priority

| Phase | Content | Notes |
|---|---|---|
| A | Products, Categories, Subcategories (incl. SubcategorySEO) | Low risk — response mirrors mock.js shape |
| B | Homepage (hero, tiles, diamond section, promises, announcement bar) | Low risk |
| C | CMS Pages (About, Diamond Ed, Gold Vermeil, Gifting, Customise) | Medium — Gold Vermeil requires JSX extraction |
| D | Reviews, Blogs, FAQs | Low risk |
| E | Navigation, Settings (footer, social) | Low risk |
| F | /stores page review | Determine page future; appointment form review |

### 10.3 Image URL Compatibility

All `<img src={...}>` patterns accept any valid URL string. No component changes are required when switching from Unsplash placeholder URLs to `https://houseofseya.com/uploads/...` URLs.

### 10.4 Caching Strategy

| Data | Strategy | TTL |
|---|---|---|
| Products list | SWR stale-while-revalidate | 5 min |
| Product detail | Nginx proxy cache | 1 min |
| Homepage content | Nginx proxy cache | 5 min |
| Site settings | Nginx proxy cache | 1 hour |
| Navigation | Nginx proxy cache | 1 hour |
| Reviews / Blogs / FAQs | SWR | 10 min |

### 10.5 Authentication Boundary

The storefront remains **100% public** — no customer accounts in Phase 2. WhatsApp checkout is preserved. The admin panel at `admin.houseofseya.com` is the only authenticated interface.

---

## 11. Authentication & Authorization

### 11.1 Token Strategy

`
Access Token:  JWT HS256, 15-minute expiry — sent as Authorization: Bearer {token}
Refresh Token: JWT HS256, 30-day expiry — stored in HttpOnly, Secure, SameSite=Lax cookie
`

### 11.2 Role Definitions

| Role | Description |
|---|---|
| SUPER_ADMIN | Full platform access — only role that can manage other admin users |
| ADMIN | Full content, product, order, reporting, and settings access; cannot manage admin users |
| MANAGER | Orders, customers, inventory, and reports; cannot edit website content or settings |
| STAFF | Orders and customers — view and update status/notes only; no reports, no content, no settings |

### 11.3 Permission Matrix

| Capability | SUPER_ADMIN | ADMIN | MANAGER | STAFF |
|---|---|---|---|---|
| Manage admin users (create/edit/deactivate) | YES | NO | NO | NO |
| Site settings (WhatsApp, contact, social) | YES | YES | NO | NO |
| Full content (products, pages, blogs, FAQs) | YES | YES | NO | NO |
| Media library | YES | YES | YES | NO |
| Reviews moderation | YES | YES | YES | NO |
| Orders — view | YES | YES | YES | YES |
| Orders — create/update status/notes | YES | YES | YES | YES |
| Orders — delete/cancel | YES | YES | NO | NO |
| Customers — view + edit | YES | YES | YES | YES |
| Customers — export | YES | YES | YES | NO |
| Inventory — view | YES | YES | YES | NO |
| Inventory — adjust stock | YES | YES | YES | NO |
| Dashboard analytics | YES | YES | YES | NO |
| Reports + exports | YES | YES | YES | NO |
| Audit log | YES | YES | NO | NO |

### 11.4 Granular Permission Overrides

Individual `AdminUser` records may have a `permissions` JSON field that overrides specific capabilities beyond their role default. For example, a MANAGER who also manages review moderation can have `{ "canManageReviews": true }` without being promoted to ADMIN. Overrides are additive only — they cannot grant capabilities above the next role level.

**There are no store-scoped permissions.** Permissions apply platform-wide.

### 11.5 Password Security

- bcrypt, cost factor 12
- Password reset: time-limited token (10 minutes) sent via Resend email to registered admin email
- Generic "Invalid credentials" response on both wrong email and wrong password (prevents enumeration)
- Failed login attempts logged to AuditLog (action: LOGIN_FAILED)

### 11.6 Auth Event Audit Logging

All authentication events are written to AuditLog:

| Event | AuditAction |
|---|---|
| Successful login | LOGIN |
| Failed login attempt | LOGIN_FAILED |
| Logout | LOGOUT |
| Password change | PASSWORD_CHANGED |
| Password reset requested | PASSWORD_RESET_REQUESTED |
| Password reset completed | PASSWORD_RESET_COMPLETED |

---

## 12. Local Development vs Production Deployment

These are two separate configurations. **Production VPS configuration happens after the backend and admin panel are implemented and locally verified.**

### 12.1 Local Development Environment

**When:** During all of Phase 2 and Phase 3.

| Component | Local Configuration |
|---|---|
| Node.js API | `npm run dev` → ts-node-dev; running on `localhost:4000` |
| Database | **Local PostgreSQL instance** (e.g. installed via Homebrew/winget/Docker); database name: `houseofseya_dev` |
| Media files | `{PROJECT_ROOT}/uploads/` served by Express `express.static` on `/uploads` |
| Admin panel | `npm run dev` → Vite/CRA dev server; running on `localhost:3001` |
| Frontend (storefront) | Unmodified; `localhost:3000` |
| Environment file | `.env.local` (committed to .gitignore) |

**Local `.env.local` file:**

`env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/houseofseya_dev
JWT_ACCESS_SECRET=<random-string-for-dev>
JWT_REFRESH_SECRET=<random-string-for-dev>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3001
MEDIA_BASE_URL=http://localhost:4000
MEDIA_UPLOAD_DIR=./uploads
RESEND_API_KEY=re_test_xxx
RESEND_FROM_EMAIL=test@houseofseya.com
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=200
`

**Local development rules:**
- Never commit `.env.local` or `.env` files
- Use `prisma migrate dev` during development to evolve the schema
- Use `prisma db seed` to seed mock data locally

### 12.2 Production Deployment (VPS)

**When:** Phase 5 — after Phase 2 (backend) and Phase 3 (admin panel) are fully locally verified and tested.

| Component | Production Configuration |
|---|---|
| Server | VPS (provider TBD — e.g. DigitalOcean, Hetzner) |
| OS | Ubuntu LTS |
| Node.js API | Runs on `localhost:4000`; managed by PM2 |
| Database | **PostgreSQL on the same VPS** — `localhost:5432`, accessible only to localhost |
| Media files | VPS filesystem: `/var/www/houseofseya/uploads/`; served by Nginx |
| Admin panel | Built as static files; served by Nginx from `/var/www/admin` |
| Storefront | Built as static files (or separate server); served by Nginx from `/var/www/storefront` |
| Reverse proxy | Nginx on port 443 (HTTPS) |
| TLS | Let's Encrypt (Certbot), auto-renew |

**Production network topology:**

`
Internet (HTTPS :443)
       |
    Nginx
       |
       +-- houseofseya.com /          --> /var/www/storefront (static React build)
       +-- houseofseya.com /api/*     --> localhost:4000 (Node.js API)
       +-- houseofseya.com /uploads/* --> /var/www/houseofseya/uploads/ (static media)
       |
       +-- admin.houseofseya.com /    --> /var/www/admin (static admin panel build)
       +-- admin.houseofseya.com /api/* --> localhost:4000 (same Node.js API)

Node.js API (port 4000, localhost only)
       |
PostgreSQL (port 5432, localhost only — no external access)
`

**Production `.env` (on VPS only — never in Git):**

`env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://hosuser:STRONG_PASSWORD@localhost:5432/houseofseya
JWT_ACCESS_SECRET=<64-char cryptographically random>
JWT_REFRESH_SECRET=<64-char cryptographically random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://houseofseya.com
CORS_ORIGINS=https://admin.houseofseya.com
MEDIA_BASE_URL=https://houseofseya.com
MEDIA_UPLOAD_DIR=/var/www/houseofseya/uploads
RESEND_API_KEY=re_live_xxx
RESEND_FROM_EMAIL=noreply@houseofseya.com
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=200
`

**Production database setup:**
- Dedicated PostgreSQL user `hosuser` with minimum required privileges (no superuser)
- Database `houseofseya` owned by `hosuser`
- PostgreSQL bound to `localhost` only — not exposed externally
- `prisma migrate deploy` runs on each deployment (not `prisma migrate dev`)

**Backup strategy:**
- Daily `pg_dump houseofseya | gzip > /backups/houseofseya_.sql.gz`
- Retain 30 days of local backups
- Copy to off-site storage (Cloudflare R2 / S3 / B2) — **must include the uploads directory**
- Scheduled via cron

---

## 13. Security Requirements

| Requirement | Implementation |
|---|---|
| HTTPS everywhere | Let's Encrypt (Certbot), auto-renew (production only) |
| JWT in HttpOnly cookie | Refresh token cannot be accessed via JavaScript — prevents XSS theft |
| CORS allowlist | Only storefront + admin origins; explicit origins, no wildcard |
| Security headers | Helmet.js: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Rate limiting | express-rate-limit: 10 req/min on /auth/login and /auth/forgot-password |
| Input validation | Zod schemas on all request bodies; reject and return 400 on validation failure |
| SQL injection | Prisma parameterized queries only — no raw SQL strings |
| File upload — MIME spoofing | Validate both Content-Type header AND file magic bytes (`file-type` library) |
| File upload — directory traversal | UUID filenames + strict `path.join`; reject paths containing `..` |
| File upload — size enforcement | Streaming limit before file writes to disk |
| File deletion authorization | DELETE /media/:id requires ADMIN or SUPER_ADMIN role |
| Orphaned media cleanup | Daily reconciliation job — delete files with no matching MediaAsset record |
| Admin enumeration | Generic "Invalid credentials" on wrong email or wrong password |
| bcrypt | Cost factor 12 |
| Secrets | `.env` / `.env.local` in `.gitignore`; production secrets set on VPS environment only |
| Database | PostgreSQL bound to localhost in production; dedicated low-privilege user |
| Admin session | Refresh token stored in HttpOnly cookie; access token in memory only (not localStorage) |

---

## 14. Migration & Seeding Strategy

### 14.1 Seed Script Scope

All existing `mock.js` and `subcategoryContent.js` data is seeded into PostgreSQL. The seed script runs once against the local development database (`prisma db seed`), and again against production after deployment.

**Seed inserts:**

| Entity | Count | Source |
|---|---|---|
| ProductCategory | 3 (Earrings, Necklaces, Bracelets) + banners | mock.js CATEGORIES |
| Subcategory + SubcategorySEO | 13 subcategories with full SEO blocks | subcategoryContent.js |
| Product + images + variants + inventory | ~10 products | mock.js PRODUCTS |
| Review | 6 | mock.js TESTIMONIALS |
| BlogPost + BlogCategory | 7 posts + 4 categories | mock.js BLOGS |
| FAQ + FAQCategory | 10 general + ~25 product FAQs + collection FAQs | mock.js + Product.jsx |
| Page | 5 (about, diamond-education, gold-vermeil, gifting, customise) | mock.js + GoldVermeil.jsx |
| HeroSlide | 4 | mock.js HERO_SLIDES |
| NavigationItem | Full nav tree | mock.js NAV_LINKS |
| SiteSettings | 1 singleton | mock.js: WhatsApp, promises, announcement messages, footer sections, social, hero tiles, diamond section, etc. |
| AdminUser | 1 (SUPER_ADMIN seed user — password must be changed immediately) | Hardcoded in seed |

**Important:** Mock product prices are randomly generated. Real prices, real images, and accurate product specifications (weight, ct, piece counts) must be provided by House of Seya before production seeding.

### 14.2 Frontend Cutover Plan

1. Build and test API in isolation (storefront unchanged throughout)
2. Add API client layer + React Query or SWR to storefront
3. Introduce `REACT_APP_USE_API=false` feature flag
4. Migrate Phase A through F per section in staging — QA each before enabling
5. Enable all flags in production + deploy
6. Remove `mock.js` imports after all sections pass production QA

---

## 15. Development Phases

### Phase 2A — Backend Core (3–4 weeks)

- [ ] Node.js/Express/TypeScript project init with path aliases
- [ ] Prisma setup + full schema migration (Section 6.1)
- [ ] `config/env.ts`: type-safe env; `config/db.ts`: Prisma singleton
- [ ] Middleware: authenticate, authorize, validateBody, asyncHandler, errorHandler, ApiError
- [ ] AdminUser auth module: login, refresh, logout, forgot-password, reset-password, /me
- [ ] ProductCategory + Subcategory + SubcategorySEO modules (public GET + admin CRUD)
- [ ] Product module (public GET + admin CRUD + image management + variant management)
- [ ] MediaAsset upload module (multipart upload, filesystem write, metadata save, delete)
- [ ] SiteSettings singleton module
- [ ] HeroSlide + Navigation modules
- [ ] Seed script: all mock.js + subcategoryContent.js data

### Phase 2B — Business Operations Backend (3–4 weeks)

- [ ] Customer module (CRUD + tags + notes + export)
- [ ] Order module (CRUD + status management + timeline + payment + shipping + assignment + export)
- [ ] InventoryItem + StockMovement module (stock levels, alerts, adjustment, valuation, movement history, export)
- [ ] Dashboard aggregation API (all /dashboard endpoints with real DB aggregations)
- [ ] Reports API (all /reports endpoints + CSV export)
- [ ] AuditLog middleware integration (auto-log create/update/delete on all entities)
- [ ] Notification creation service (trigger notifications on order received, low stock, new review)
- [ ] Notification API (/notifications endpoints)

### Phase 2C — CMS Backend (2–3 weeks)

- [ ] Review module (CRUD + moderation)
- [ ] BlogPost + BlogCategory modules
- [ ] FAQ + FAQCategory modules
- [ ] Page module (5 CMS pages)
- [ ] Integration tests for all critical paths

### Phase 3A — Admin Panel Foundation (2–3 weeks)

- [ ] Admin SPA project init (framework decision at kickoff)
- [ ] Auth screens: login, forgot password, reset password
- [ ] Layout shell: primary navigation (8 modules), notification bell, user menu
- [ ] Dashboard module: all KPIs, revenue chart, order pipeline, top products, channel breakdown, activity feed, low-stock alerts

### Phase 3B — Operations Modules (4–5 weeks)

- [ ] Orders: list with filters/sorting, detail with timeline, create, status management, payment, shipping, assignment
- [ ] Customers: list, profile, order history, tags, notes, export
- [ ] Products: list, rich editor (fields + images + variants + SEO), bulk actions
- [ ] Categories + subcategories + SubcategorySEO editor
- [ ] Inventory: stock grid, alerts, adjustment modal, movement history, valuation, export

### Phase 3C — Reports Module (2–3 weeks)

- [ ] Revenue report: chart + table + export
- [ ] Product performance report + export
- [ ] Customer report + export
- [ ] Order report + export
- [ ] Inventory report + export
- [ ] Saved report configurations

### Phase 3D — Website CMS Module (3–4 weeks)

- [ ] Homepage editor (hero slides, tiles, diamond section, announcement bar, promises, press)
- [ ] Navigation editor (drag-and-drop tree)
- [ ] Header/Footer settings
- [ ] CMS page editors (About, Diamond Education, Gold Vermeil, Gifting, Customise)
- [ ] Blog management (list + rich editor)
- [ ] FAQs management (CRUD by context)
- [ ] Reviews moderation queue
- [ ] Media library (grid, upload, delete, select for use in editors)

### Phase 3E — Settings Module (1–2 weeks)

- [ ] Admin user management (list, create, edit role, deactivate, permission overrides)
- [ ] Audit log screen (paginated, filterable)
- [ ] Site settings: General, Social, SEO defaults
- [ ] Notifications screen

### Phase 4 — Frontend Integration (3–4 weeks)

- [ ] API client layer + React Query / SWR added to storefront
- [ ] Phase A: Products, Categories, Subcategories + SubcategorySEO
- [ ] Phase B: Homepage content
- [ ] Phase C: CMS pages (including Gold Vermeil JSX extraction)
- [ ] Phase D: Reviews, Blogs, FAQs
- [ ] Phase E: Navigation, Settings (footer, social, announcement bar)
- [ ] Phase F: /stores page review and decision
- [ ] SEO `<head>` tags (metaTitle, metaDescription, OG) on all pages
- [ ] End-to-end QA on all pages
- [ ] Remove mock.js dependencies

### Phase 5 — Production Deployment (1–2 weeks)

- [ ] VPS provisioning (OS setup, firewall, fail2ban)
- [ ] PostgreSQL install + database + user creation + `prisma migrate deploy`
- [ ] Backend deploy + PM2 configuration
- [ ] Admin panel build + Nginx configuration
- [ ] Storefront build + Nginx configuration
- [ ] TLS (Certbot / Let's Encrypt)
- [ ] DNS cutover
- [ ] Production seeding with real data
- [ ] Backup jobs (pg_dump + uploads directory cron)
- [ ] Monitoring + logging (Winston + logrotate)

---

## 16. Risks & Dependencies

| Risk | Severity | Mitigation |
|---|---|---|
| Real product data (names, prices, real images, accurate specs) not available | HIGH | Seed mock data; production data is client deliverable before go-live |
| Diamond section desktop image hardcoded from houseofquadri.com CDN | CRITICAL | Must be replaced with self-hosted media before production |
| Product detail specs (weight, ct, piece count) are hardcoded placeholder values | HIGH | Real per-product data required from client |
| Gold Vermeil entire page content hardcoded in JSX (not in mock.js) | MEDIUM | Full JSX-to-JSON extraction required in Phase 4C |
| /stores page: House of Seya has no physical stores — page content is placeholder | HIGH | Page and appointment form reviewed in Phase 4F; possible removal/redesign |
| No SEO meta tags on any current page | MEDIUM | Full SEO implementation in Phase 4 |
| WhatsApp as primary order intake channel (no payment gateway) | Design constraint | Architecture designed for this — manual order creation + WhatsApp link on order detail |
| Instagram feed is a non-functional placeholder in the frontend | LOW | Out of scope; preserved as placeholder |
| Admin panel framework not yet decided | LOW | Decided at Phase 3 kickoff; does not affect Phase 2 backend |

---

## 17. Recommended Build Order

`
Step  1  Backend project init (TypeScript, Express 5, Prisma, env config, path aliases)
Step  2  Full PostgreSQL schema migration (Section 6.1)
Step  3  Core middleware (authenticate, authorize, validateBody, asyncHandler, ApiError, errorHandler)
Step  4  AdminUser auth module
Step  5  Seed script (all mock.js + subcategoryContent.js data → local PostgreSQL)
Step  6  Product + Category + Subcategory public GET APIs
Step  7  Product + Category + Subcategory admin CRUD
Step  8  MediaAsset upload API
Step  9  SiteSettings + HeroSlide + Navigation APIs
Step 10  Customer + Order + OrderItem APIs
Step 11  InventoryItem + StockMovement APIs
Step 12  Dashboard aggregation API (all KPIs with real DB queries)
Step 13  Reports API + CSV export
Step 14  AuditLog middleware + Notification triggers
Step 15  Review + BlogPost + FAQ + Page CMS APIs
Step 16  Admin panel: auth screens + layout shell
Step 17  Admin panel: Dashboard module (charts + KPIs)
Step 18  Admin panel: Orders + Customers modules
Step 19  Admin panel: Products + Inventory modules
Step 20  Admin panel: Reports module
Step 21  Admin panel: Website CMS module + Media Library
Step 22  Admin panel: Settings module (admin users, audit log)
Step 23  Storefront: API client layer + feature flags
Step 24  Storefront: Phase A through F migration
Step 25  VPS provisioning + Nginx + TLS
Step 26  Production database + deploy
Step 27  DNS cutover + production seeding + monitoring
`

---

## 18. Final Verification Checklist

- [x] All 17 numbered sections (plus this section 18) are present
- [x] Dashboard module exists with full analytics requirements
- [x] Analytics and Reports are mandatory core modules
- [x] Orders module exists as a primary module
- [x] Customers module exists as a primary module
- [x] Products module exists as a primary module
- [x] Inventory module exists as a primary module
- [x] Website/CMS exists as Module 7 of 8 — not the platform's primary purpose
- [x] Admin Users and Roles exist in Settings module
- [x] Audit Log exists (database entity + API + admin screen)
- [x] Notifications exist (database entity + API + admin bell)
- [x] Store is NOT a backend module
- [x] Store entity does NOT exist in the database schema
- [x] `managedStoreIds` does NOT exist on AdminUser
- [x] `storeId` does NOT exist on any entity
- [x] `storeCity` does NOT exist on any entity
- [x] Store-scoped permissions do NOT exist
- [x] AppointmentRequest is DEFERRED — not implemented
- [x] Production VPS is marked as Phase 5 (future deployment)
- [x] Local PostgreSQL is specified for all of Phase 2 and Phase 3
- [x] VPS filesystem is the planned production media storage
- [x] PostgreSQL stores media metadata/path/URL only — no binary data
- [x] Object storage mentioned as future migration option only
- [x] /faqs route behavior is preserved (renders DiamondEducation, no standalone FAQ page introduced)
- [x] Admin roles are: SUPER_ADMIN, ADMIN, MANAGER, STAFF

---

*This document was produced from direct audit of:*  
*- `houseofseyaStaticwebsite/src/` — complete React frontend source*  
*- `HOSWebsiteBackendAdmin/` — new empty target repository*  
*- `houseOfSeyaInventoryManagementBackend/` — reference backend (Prisma schema + all src/)*

*All entities, routes, and fields are grounded in actual observed code. No speculative tables were added beyond what the frontend audit or stated business requirements justify.*
