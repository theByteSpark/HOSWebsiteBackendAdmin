# HOUSE OF SEYA — BACKEND + ADMIN PANEL
## Architecture & Design Document — Phase 1

**Repository:** `HOSWebsiteBackendAdmin`  
**Branch:** `feature/houseofseya-backend-admin`  
**Date:** 2026-09-22  
**Status:** Audit Complete — Awaiting Phase 2 Approval

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Frontend Audit](#2-existing-frontend-audit)
3. [Existing Data Sources](#3-existing-data-sources)
4. [Hardcoded Content Audit](#4-hardcoded-content-audit)
5. [Reference Backend Audit](#5-reference-backend-audit)
6. [Database Architecture](#6-database-architecture)
7. [Media Architecture](#7-media-architecture)
8. [REST API Architecture](#8-rest-api-architecture)
9. [Admin Panel Information Architecture](#9-admin-panel-information-architecture)
10. [Frontend Integration Strategy](#10-frontend-integration-strategy)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [VPS Architecture](#12-vps-architecture)
13. [Security Requirements](#13-security-requirements)
14. [Migration Strategy](#14-migration-strategy)
15. [Development Phases](#15-development-phases)
16. [Risks & Dependencies](#16-risks--dependencies)
17. [Recommended Build Order](#17-recommended-build-order)
---

## 1. Executive Summary

House of Seya is a premium lab-grown diamond jewellery brand sold direct-to-consumer (DTC). The existing storefront is a **React SPA** driven entirely by two static data files: `mock.js` (~53 KB) and `subcategoryContent.js` (~55 KB). All product, collection, blog, FAQ, review, store, and content page data is hardcoded.

**Goal:** Build a Node.js/Express + Prisma + PostgreSQL CMS backend and admin panel so administrators can manage all website content without editing React source code, while **preserving the existing frontend design and UX completely**.

**Phase 1 delivers:** This architecture document only.  
**Phase 2 delivers:** The backend, database, and admin panel.

---

## 2. Existing Frontend Audit

### 2.1 Route Inventory (15 routes, 12 page components)

| Route | Component | Notes |
|---|---|---|
| `/` | Home | Hero, categories, products, FAQs |
| `/collections/:slug` | Collection | Category listing |
| `/collections/:slug/:subSlug` | Collection | Subcategory listing |
| `/products/:slug` | Product | Product detail page |
| `/stores` | Stores | Store locator + appointment + contact |
| `/about` | About | Brand story / founder |
| `/reviews` | Reviews | Customer review aggregation |
| `/services/gifting` | Gifting | Gifting service page |
| `/services/customise` | Customise | Customisation service (57 KB JSX) |
| `/faqs` | DiamondEducation | **Route mismatch: renders DiamondEducation** |
| `/blogs` | Blogs | Blog / journal listing |
| `/blogs/:slug` | BlogPost | Individual blog post |
| `/pages/diamond-education` | DiamondEducation | Same component as /faqs |
| `/pages/gold-vermeil` | GoldVermeil | Gold vermeil guide |
| `/pages/:slug` | Home | **Catch-all renders Home** |

### 2.2 Component Data Consumption

**Global (every page)**
- `Header.jsx`: NAV_LINKS from mock.js; announcement bar (4 messages) hardcoded inline
- `Footer.jsx`: FOOTER_SECTIONS hardcoded in Footer.jsx; social URLs hardcoded; tagline hardcoded; WhatsApp from mock.js
- `WhatsAppButton.jsx`: WHATSAPP_NUMBER from mock.js

**Homepage (/):** HERO_SLIDES, CATEGORIES, ALL_PRODUCTS, PROMISES, HERO_TILES, FAQS, DIAMOND_SECTION_VIDEO from mock.js; diamond desktop image hardcoded in HomeSections.jsx from houseofquadri.com CDN (MUST REPLACE); Instagram feed is a non-functional placeholder; Testimonials/BlogStrip/VisitUs/PressLogos are commented out.

**Collection (/collections/:slug):** COLLECTION_BANNERS hardcoded in Collection.jsx; PRODUCTS/ALL_PRODUCTS from mock.js; TESTIMONIALS from mock.js; SUBCATEGORY_CONTENT from subcategoryContent.js (faqs + seo sections per subcategory slug).

**Product (/products/:slug):** ALL_PRODUCTS from mock.js (by slug); metal variants (Yellow/White/Rose Gold) hardcoded in Product.jsx; PROMISE_ITEMS, ORDERS_SHIPMENTS_ITEMS, RETURNS_POLICY_CARDS, PRODUCT_FAQ_GROUPS all hardcoded in Product.jsx; product detail specs (3.20g, 0.85ct, 21 pieces) are hardcoded placeholder values.

**Other pages:** Stores=STORES from mock.js (contact email/phone hardcoded in Stores.jsx); About=ABOUT_CONTENT; Reviews=TESTIMONIALS; DiamondEd=DIAMOND_EDUCATION_CONTENT; GoldVermeil=entirely hardcoded in GoldVermeil.jsx JSX; Gifting=GIFTING_CONTENT; Customise=CUSTOMISE_CONTENT; Blogs=BLOGS; BlogPost=BLOGS matched by slug.

**Subcategory content keys in subcategoryContent.js:**
solitaire-studs, halo-studs, other-studs, hoops-huggies, all-earrings, pendants, pendant-sets, mangalsutra, trinket-necklace, all-necklaces, tennis-bracelet, station-bracelet, all-bracelets

---

## 3. Data Sources: Complete Source-to-Entity Map

| Frontend Source | File | Future DB Entity |
|---|---|---|
| HERO_SLIDES | mock.js | HeroSlide |
| CATEGORIES | mock.js | ProductCategory |
| SHAPES | mock.js | SiteSettings.diamondShapes[] |
| DIAMOND_SECTION_VIDEO | mock.js | SiteSettings.diamondSectionVideo |
| PRODUCTS / ALL_PRODUCTS | mock.js (generated) | Product |
| TESTIMONIALS | mock.js | Review |
| PROMISES | mock.js | SiteSettings.promises[] |
| STORES | mock.js | Store |
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

---

## 4. Hardcoded Content Audit

### Critical — Cannot Change Without Editing Source Code

| Content | File |
|---|---|
| Announcement bar (4 messages) | Header.jsx |
| Footer brand tagline | Footer.jsx |
| Footer sections (Shop/About/Support/Policies) + all links | Footer.jsx |
| Social links (Instagram/Facebook/YouTube URLs) | Footer.jsx |
| WhatsApp number | mock.js |
| Diamond section desktop image (from houseofquadri.com CDN) | HomeSections.jsx |
| Contact email + phone | Stores.jsx |
| Metal swatch options (Yellow/White/Rose Gold) + hex colors | Product.jsx |
| Product detail specs: 3.20g, 0.85ct, 21 pieces | Product.jsx |
| Product promise items (5), shipping FAQ (3), returns policy (3 cards) | Product.jsx |
| Product FAQ groups (6 groups, ~25 Q&As) | Product.jsx |
| Collection hero banner images (3 Unsplash) + taglines | Collection.jsx |
| "The future of fine jewelry" homepage intro sentence | Home.jsx |
| Gold Vermeil entire page content | GoldVermeil.jsx |

### Current SEO State

| Item | Status |
|---|---|
| Meta titles | Only subcategoryContent.js (collections only) |
| Meta descriptions | NONE on any page |
| Open Graph tags | NONE |
| Canonical URLs | NONE |
| Structured data (JSON-LD) | NONE |

---

## 5. Reference Backend Audit

**Stack:** Node.js + Express 5 + TypeScript + Prisma + PostgreSQL  
**Purpose:** Internal inventory management (not a CMS)

### Patterns to REUSE

| Pattern | Source |
|---|---|
| TypeScript + Express 5 module-per-domain structure | src/modules/*/ |
| Prisma client singleton | src/config/db.ts |
| Type-safe env validation | src/config/env.ts |
| ApiError class with static factories (.badRequest, .notFound, etc.) | src/utils/apiError.ts |
| asyncHandler wrapper (eliminates try/catch) | src/utils/asyncHandler.ts |
| JWT dual-token (15min access + 30d refresh in HttpOnly cookie) | src/utils/jwt.ts |
| authenticate middleware (Bearer header extraction + verification) | src/middleware/authenticate.ts |
| authorize(...roles) factory middleware | src/middleware/authorize.ts |
| validateBody(zodSchema) middleware | src/middleware/validate.ts |
| Centralized error handler | src/middleware/errorHandler.ts |
| bcrypt password hashing | package.json |
| Resend for transactional email | package.json |
| CORS multi-origin allowlist | src/app.ts |

### Patterns NOT to Reuse

| Pattern | Reason |
|---|---|
| Product.quantityInStock as bare integer | HOS needs per-variant inventory |
| Product.sku as sole unique identifier | HOS needs URL slug |
| Simple Customer (single address) | HOS needs multiple shipping addresses |
| Sale/SaleItem model | HOS needs ecommerce Order with shipping + payment tracking |
| Vendor/Purchase models | Not needed in Phase 2 |
| Two-role enum (ADMIN/STAFF) | HOS needs 4-role system |
| No media library | HOS needs full MediaAsset model |
| No CMS content models | Reference has no pages/blogs/FAQs/reviews/stores |
| No slug/SEO fields | All HOS entities need slug, metaTitle, metaDescription |

---

## 6. Database Architecture

### Design Principles
1. Every entity justified by frontend audit — no speculative tables
2. Slugs on all navigable entities
3. SEO fields on all public-facing entities
4. isPublished / isActive flags on all content
5. Soft deletion (deletedAt) on products and orders
6. Full audit trail (createdAt, updatedAt) on all entities
7. Media stored as URL references (MediaAsset), never as blobs

### Proposed Prisma Schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// ADMIN USERS
enum AdminRole { SUPER_ADMIN ADMIN EDITOR ORDER_MANAGER }

model AdminUser {
  id                  String               @id @default(uuid())
  name                String
  email               String               @unique
  passwordHash        String
  role                AdminRole            @default(EDITOR)
  isActive            Boolean              @default(true)
  refreshToken        String?
  passwordResetTokens AdminPasswordReset[]
  lastLoginAt         DateTime?
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

// TAXONOMY
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
  seoSections     Json?       // [{ title, body }]
  whyUs           Json?       // [{ title, body }]
  closingTitle    String?
  closing         String?     @db.Text
  faqs            Json?       // [{ q, a }]
  ogImageUrl      String?
}

// PRODUCT CATALOG
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
  diamondGrade     String?
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

// INVENTORY
enum StockMovementType { RESTOCK SALE ADJUSTMENT RETURN }

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
}

// ORDERS & CUSTOMERS
enum OrderStatus { PENDING CONFIRMED IN_PRODUCTION READY_TO_SHIP SHIPPED DELIVERED CANCELLED RETURNED }
enum OrderChannel { WHATSAPP WEBSITE WALK_IN PHONE }
enum PaymentStatus { UNPAID PARTIAL PAID REFUNDED }

model Customer {
  id        String            @id @default(uuid())
  name      String
  email     String?
  phone     String?
  whatsapp  String?
  addresses CustomerAddress[]
  orders    Order[]
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
}

model CustomerAddress {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  label      String?
  line1      String
  line2      String?
  city       String
  state      String?
  pincode    String
  country    String   @default("India")
  isDefault  Boolean  @default(false)
}

model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique
  customerId      String
  customer        Customer      @relation(fields: [customerId], references: [id])
  status          OrderStatus   @default(PENDING)
  channel         OrderChannel  @default(WHATSAPP)
  items           OrderItem[]
  shippingAddress Json?
  subtotal        Decimal       @db.Decimal(10, 2)
  tax             Decimal       @db.Decimal(10, 2) @default(0)
  discount        Decimal       @db.Decimal(10, 2) @default(0)
  total           Decimal       @db.Decimal(10, 2)
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentMethod   String?
  notes           String?       @db.Text
  trackingNumber  String?
  courier         String?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  deletedAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  variantId   String?
  quantity    Int
  unitPrice   Decimal @db.Decimal(10, 2)
  lineTotal   Decimal @db.Decimal(10, 2)
  metalFinish String?
  notes       String?
}

// WEBSITE CONTENT
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
  rating      Int
  productName String?
  productId   String?
  verified    Boolean   @default(false)
  isPublished Boolean   @default(false)
  reviewDate  DateTime?
  source      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Store {
  id        String   @id @default(uuid())
  city      String
  image     String?
  address   String
  hours     String
  phone     String
  mapsUrl   String?
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
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
  sections    Json?
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

enum FAQContext { GENERAL PRODUCT DIAMOND_EDUCATION CUSTOMISE GIFTING COLLECTION }

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
  slug        String   @unique  // "about", "diamond-education", "gold-vermeil", "gifting", "customise"
  title       String
  content     Json
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

// Singleton — always id = "singleton"
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
  productPromises       Json?    // [{ icon, label }]
  shippingFAQ           Json?
  returnPolicyCards     Json?
  footerSections        Json?    // [{ heading, links[] }]
  freeShippingThreshold Decimal? @db.Decimal(10, 2)
  updatedAt             DateTime @updatedAt
}

model MediaAsset {
  id           String   @id @default(uuid())
  filename     String   // UUID-based e.g. "a1b2c3d4.webp"
  originalName String
  mimeType     String
  sizeBytes    Int
  url          String
  folder       String?  // "products", "categories", "blogs", "pages", "general"
  width        Int?
  height       Int?
  altText      String?
  uploadedBy   String   // AdminUser.id
  createdAt    DateTime @default(now())
}
```

### Entity Relationship Summary

```
ProductCategory --< Subcategory --< Product --< ProductImage
                                       |--< ProductVariant
                                       |--< ProductSEO
                                       `--< InventoryItem --< StockMovement

Customer --< Order --< OrderItem >-- Product
        `--< CustomerAddress

BlogPost >-- BlogCategory `-- BlogPostSEO
Page `-- PageSEO
Subcategory `-- SubcategorySEO
HeroSlide, Review, Store (standalone)
FAQ >-- FAQCategory
NavigationItem (self-referencing tree)
SiteSettings (singleton)
MediaAsset (standalone)
AdminUser --< AdminPasswordReset
```

---

## 7. Media Architecture

**Phase 2 Storage:** VPS local filesystem, Nginx serves static files.  
**Future:** Swap to Cloudflare R2 / AWS S3 by updating MediaAsset.url — no frontend changes needed.

**VPS directory structure:**
`
/var/www/houseofseya/media/
  products/   categories/   blogs/   pages/   general/   videos/
`

**Upload rules:**
- Allowed images: image/jpeg, image/png, image/webp (max 10 MB)
- Allowed video: video/mp4 (max 200 MB)
- Filenames: {uuid}.{ext} — original name stored in originalName field only
- Auth: Admin JWT required — no public upload endpoint
- Nginx serves /media/* with Cache-Control: public, max-age=31536000, immutable

---

## 8. REST API Architecture

**Base URL:** https://api.houseofseya.com/api/v1

| Symbol | Meaning |
|---|---|
| PUB | Public |
| JWT | Any valid Admin JWT |
| ADM | SUPER_ADMIN or ADMIN |
| EDI | ADMIN or EDITOR |
| ORD | ADMIN or ORDER_MANAGER |

### /auth
POST /login [PUB] | POST /refresh [PUB] | POST /logout [JWT] | POST /forgot-password [PUB] | POST /reset-password [PUB] | GET /me [JWT]

### /products
GET / [PUB] — filter: category, subcategory, inStock, published  
GET /:slug [PUB]  
POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [ADM]  
POST /:id/images [EDI] | DELETE /:id/images/:imageId [EDI] | PATCH /:id/images/reorder [EDI]  
POST /:id/variants [EDI] | PATCH /:id/variants/:variantId [EDI]

**Sample public product list item response:**
`json
{
  "id": "uuid", "slug": "solitaire-studs", "name": "Classic Solitaire Stud Earrings",
  "price": "55000.00", "inStock": true, "isMadeToOrder": false,
  "categorySlug": "earrings", "subcategorySlug": "solitaire-studs",
  "primaryImage": "https://media.houseofseya.com/products/abc.webp",
  "hoverImage": "https://media.houseofseya.com/products/def.webp"
}
`

### /categories
GET / [PUB] | GET /:slug [PUB] | POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [ADM]

### /subcategories
GET / [PUB] | GET /:slug [PUB] (includes SubcategorySEO) | POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [ADM]

### /inventory
GET / [JWT] | GET /:productId [JWT] | PATCH /:productId [ORD] | GET /:productId/movements [JWT]

### /orders
GET / [ORD] | GET /:id [ORD] | POST / [ORD] | PATCH /:id/status [ORD] | PATCH /:id/payment [ORD] | PATCH /:id/shipping [ORD] | DELETE /:id [ADM]

### /customers
GET / [ORD] | GET /:id [ORD] | POST / [ORD] | PATCH /:id [ORD]

### /blogs
GET / [PUB] | GET /:slug [PUB] | POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [EDI]  
GET /categories [PUB] | POST /categories [EDI]

### /faqs
GET / [PUB] (filter by context) | GET /categories [PUB]  
POST / [EDI] | POST /categories [EDI] | PATCH /:id [EDI] | DELETE /:id [EDI] | PATCH /reorder [EDI]

### /reviews
GET / [PUB] | POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [EDI]

### /stores
GET / [PUB] | POST / [EDI] | PATCH /:id [EDI] | DELETE /:id [EDI]

### /pages
GET /:slug [PUB] | POST / [EDI] | PATCH /:slug [EDI]

### /homepage
GET / [PUB] | PATCH /hero-slides [EDI] | PATCH /hero-tiles [EDI] | PATCH /diamond-section [EDI]

### /navigation
GET / [PUB] | PATCH / [EDI]

### /settings
GET / [PUB] (public-safe fields only) | GET /admin [JWT] | PATCH / [EDI]

### /media
GET / [JWT] | POST /upload [JWT] (multipart/form-data) | PATCH /:id [JWT] | DELETE /:id [JWT]

### /admin-users
GET / [ADM] | POST / [ADM] | PATCH /:id [ADM] | DELETE /:id [ADM] | PATCH /:id/password [JWT]

---

## 9. Admin Panel Information Architecture

Admin panel served from admin.houseofseya.com as a separate SPA.

### Navigation Structure

`
Dashboard         Recent orders, stock alerts, review queue, quick stats

Catalog
  Products        List / Create / Edit (fields, images, variants, SEO, inventory)
  Categories      Name, slug, image, banner, sort order
  Subcategories   Name, slug, SEO content block editor (all SubcategorySEO fields)

Inventory         Stock levels per product, manual adjustment, movement history

Orders
  All Orders      Filter by status, channel, date, customer; status management
  Customers       Lookup, address book, order history

Website
  Homepage        Hero slider CRUD, diamond section, dual tiles, announcement bar, promises
  Navigation      Drag-and-drop nav tree
  Header/Footer   Social links, footer sections, tagline
  Pages (CMS)     About, Diamond Education, Gold Vermeil, Gifting, Customise editors
  FAQs            CRUD organized by context
  Reviews         Moderation queue (approve/reject/edit)
  Stores          Store CRUD
  Blog            Post CRUD + categories

Settings
  General         WhatsApp, contact email/phone, shipping threshold
  SEO             Default meta title/description/OG image
  Social          Instagram, Facebook, YouTube
  Media Library   Browse/upload/delete all media assets

Admin Users       List, create, role assignment, deactivate
`

---

## 10. Frontend Integration Strategy

### Principle: Additive, Non-Breaking, Parallel

The React frontend's visual design, component structure, and UX are frozen. Migration is progressive using a feature flag: `REACT_APP_USE_API=true`.

### Migration Priority

| Phase | Content | Effort |
|---|---|---|
| A | Products, Categories, Subcategories (incl. SEO content) | Low |
| B | Homepage (hero, tiles, diamond section, promises, announcement bar) | Low |
| C | CMS Pages (About, Diamond Ed, Gold Vermeil, Gifting, Customise) | Medium (Gold Vermeil = JSX extraction) |
| D | Reviews, Blogs, FAQs | Low |
| E | Stores, Navigation, Settings (footer, social) | Low |

### Image URL Compatibility

All `<img src={...}>` patterns accept any valid URL. No component changes are needed when switching from Unsplash URLs to self-hosted media.houseofseya.com URLs.

### Data That Can Remain Static Initially

- Product page promise items (changes infrequently)
- Shipping FAQ and returns policy cards
- Diamond Education comparison + certification tables
- Press logo names

### Caching Strategy

| Data | Strategy | TTL |
|---|---|---|
| Products list | SWR stale-while-revalidate | 5 min |
| Product detail | Nginx proxy cache | 1 min |
| Homepage content | Nginx proxy cache | 5 min |
| Site settings | Nginx proxy cache | 1 hour |
| Navigation | Nginx proxy cache | 1 hour |
| Reviews / Blogs | SWR | 10 min |

---

## 11. Authentication & Authorization

### Token Strategy

`
Access Token:   JWT HS256, expires 15 min (Authorization: Bearer header)
Refresh Token:  JWT HS256, expires 30 days (HttpOnly cookie)
`

### Role Matrix

| Capability | SUPER_ADMIN | ADMIN | EDITOR | ORDER_MANAGER |
|---|---|---|---|---|
| Manage admin users | YES | NO | NO | NO |
| Full content + media | YES | YES | YES | NO |
| Orders + customers | YES | YES | NO | YES |
| Inventory adjustment | YES | YES | NO | YES |
| Site settings | YES | YES | NO | NO |
| Delete products/orders | YES | YES | NO | NO |

### Password Security

- bcrypt, cost factor 12
- Password reset: 10-min token sent via Resend email
- Generic "Invalid credentials" on all auth failures (prevents enumeration)

---

## 12. VPS Architecture

`
Internet (HTTPS)
       |
    Nginx (port 443)
       |
       +-- /              --> React storefront build (/var/www/storefront)
       +-- /api/*         --> Reverse proxy --> Node.js API :4000
       +-- /media/*       --> Static files (/var/www/houseofseya/media)

    [admin.houseofseya.com]
       +-- /              --> Admin panel build (/var/www/admin)
       +-- /api/*         --> Reverse proxy --> Node.js API :4000

    Node.js API (port 4000, localhost only)
       |
    PostgreSQL (port 5432, localhost only)
`

### Key Environment Variables

`env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://hosuser:PASSWORD@localhost:5432/houseofseya
JWT_ACCESS_SECRET=<64-char random>
JWT_REFRESH_SECRET=<64-char random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://houseofseya.com
CORS_ORIGINS=https://admin.houseofseya.com
MEDIA_BASE_URL=https://media.houseofseya.com
MEDIA_UPLOAD_DIR=/var/www/houseofseya/media
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@houseofseya.com
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=200
`

### Backup Strategy

- Daily pg_dump + gzip → retain 30 days locally → copy to Cloudflare R2 / S3
- Dedicated DB user with minimum required privileges
- PostgreSQL bound to localhost only (no external port)

---

## 13. Security Requirements

| Requirement | Implementation |
|---|---|
| HTTPS everywhere | Let's Encrypt (Certbot) with auto-renew |
| JWT in HttpOnly cookie | Prevents XSS token theft |
| CORS allowlist | Only storefront + admin domains |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options) |
| Rate limiting | express-rate-limit on auth routes (10 req/min) |
| Input validation | Zod schemas on all request bodies |
| SQL injection | Prisma parameterized queries — no raw SQL |
| File upload safety | MIME type + magic byte check + size limit |
| Path traversal | UUID filenames + strict path.join |
| Admin enumeration | Generic error message on all auth failures |
| bcrypt cost factor | 12 |
| Secrets | .env never committed — VPS environment only |

---

## 14. Migration Strategy

### Seed Script Plan

The seed script must insert all existing mock.js / subcategoryContent.js data into PostgreSQL before the frontend switches to the API.

**What gets seeded:**
- 3 ProductCategories (Earrings, Necklaces, Bracelets) + banners
- 13 Subcategories + SubcategorySEO records (from subcategoryContent.js)
- ~10 Products with ProductImages, ProductVariants, InventoryItems, ProductSEO
- 6 Reviews (TESTIMONIALS)
- 4 Stores (STORES)
- 7 BlogPosts + 4 BlogCategories (BLOGS)
- FAQs: 10 general + 6 FAQ groups (25 Q&As) from Product.jsx + collection FAQs from subcategoryContent.js
- 5 Pages (About, Diamond Education, Gold Vermeil, Gifting, Customise) with full content JSON
- 4 HeroSlides + SiteSettings singleton (all promises, announcement messages, footer sections, social links)
- NavigationItem tree (from NAV_LINKS)

**Important:** Mock product prices are randomly generated. Real prices must be provided by House of Seya before production seeding.

### Frontend Cutover Plan

1. Build and test API completely in isolation (storefront unchanged)
2. Add API client layer + React Query/SWR to storefront
3. Add REACT_APP_USE_API=false feature flag
4. Migrate Phase A through E — test each section in staging before enabling
5. QA all pages with real data
6. Enable flags in production — deploy

---

## 15. Development Phases

### Phase 2 — Backend (4-6 weeks)
- [ ] Node.js/Express/TypeScript project init with path aliases
- [ ] Prisma setup + full schema migration
- [ ] AdminUser auth module (login, refresh, logout, password reset via Resend)
- [ ] ProductCategory + Subcategory + Product modules (public GET + admin CRUD)
- [ ] MediaAsset upload endpoint + file management
- [ ] SiteSettings singleton module
- [ ] Review + Store + BlogPost + FAQ + Page modules
- [ ] Order + Customer modules
- [ ] NavigationItem + HeroSlide modules
- [ ] InventoryItem + StockMovement module
- [ ] Seed script for all mock data
- [ ] Integration tests for critical paths

### Phase 3 — Admin Panel (4-6 weeks)
- [ ] Admin SPA init (framework TBD in Phase 2 kickoff)
- [ ] Login + password reset screens
- [ ] Dashboard
- [ ] Product management (list, edit, image reorder, variants, SEO)
- [ ] Category + subcategory + SEO content block editors
- [ ] Homepage editor (hero slides, tiles, diamond section, announcement bar)
- [ ] CMS page editors (all 5 pages)
- [ ] FAQs + Reviews + Stores + Blog management
- [ ] Orders + customers screens
- [ ] Media library
- [ ] Settings screens
- [ ] Admin user management

### Phase 4 — Frontend Integration (3-4 weeks)
- [ ] API client layer + React Query/SWR
- [ ] Phase A: Products, Categories, Collections + subcategory SEO
- [ ] Phase B: Homepage content
- [ ] Phase C: Content pages (Gold Vermeil requires JSX extraction)
- [ ] Phase D: Reviews, Blogs, FAQs
- [ ] Phase E: Stores, Navigation, Settings
- [ ] SEO <head> tags on all pages
- [ ] End-to-end QA
- [ ] Remove mock.js dependencies

### Phase 5 — Production (1-2 weeks)
- [ ] VPS provisioning + Nginx + TLS
- [ ] PostgreSQL setup + backup jobs
- [ ] Deploy API + admin panel + updated storefront
- [ ] DNS cutover
- [ ] Monitoring + logging setup

---

## 16. Risks & Dependencies

| Risk | Severity | Mitigation |
|---|---|---|
| Real product data not available | HIGH | Seed mock data; real data is client deliverable |
| Diamond section desktop image from houseofquadri.com CDN | CRITICAL | Must be replaced before any public deployment |
| /faqs route renders DiamondEducation (not standalone FAQ page) | MEDIUM | Confirm with client if standalone FAQs page needed |
| WhatsApp as primary checkout (no payment gateway) | Design constraint | Architecture accounts for this (ORDER_CHANNEL = WHATSAPP) |
| Instagram feed is non-functional placeholder | LOW | Out of scope; confirmed placeholder |
| Gold Vermeil content entirely in JSX (not in mock.js) | MEDIUM | Full content extraction required in Phase 4 |
| No SEO meta tags on any current page | MEDIUM | Full SEO implementation in Phase 4 |
| Product specs (weight, ct) are hardcoded placeholder values | HIGH | Real per-product data required from client |
| Product images are Unsplash/Pexels external URLs | HIGH | Must be replaced with real product photography |

---

## 17. Recommended Build Order

`
1.  Backend project init (TypeScript, Prisma, Express, env, path aliases)
2.  Full PostgreSQL schema migration from Section 6
3.  AdminUser auth module
4.  Seed script (all mock.js + subcategoryContent.js data)
5.  Product + Category + Subcategory public GET APIs
6.  Product + Category + Subcategory admin CRUD
7.  MediaAsset upload API
8.  SiteSettings + HeroSlide + Navigation APIs
9.  Review + Store + BlogPost + FAQ + Page APIs
10. Order + Customer APIs
11. InventoryItem + StockMovement APIs
12. Admin panel auth screens
13. Admin panel product management
14. Admin panel all content editors
15. Admin panel orders + customers
16. Storefront API client layer + feature flags
17. Storefront Phase A through E migration
18. VPS deployment + DNS cutover
`

---

*This document was produced from direct audit of:*  
*- houseofseyaStaticwebsite/src/ — complete React frontend source*  
*- HOSWebsiteBackendAdmin/ — new empty target repository*  
*- houseOfSeyaInventoryManagementBackend/ — reference backend (Prisma schema + all src/)*

*All entities, routes, and fields are grounded in actual observed code. No speculative tables or fields were added beyond what the frontend audit justifies.*
