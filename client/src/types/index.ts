export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderChannel = 'WHATSAPP' | 'WEBSITE' | 'PHONE' | 'WALK_IN';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type CustomerSource = 'WHATSAPP' | 'WEBSITE' | 'WALK_IN' | 'PHONE' | 'REFERRAL';

export interface CustomerAddress {
  id?: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  source?: CustomerSource | null;
  tags: string[];
  notes?: string | null;
  totalOrderValue: number | string;
  orderCount: number;
  addresses?: CustomerAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  metalFinish?: string | null;
  notes?: string | null;
  product?: Product;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  adminId?: string;
  adminName?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  assignedToId?: string | null;
  assignedTo?: AdminUser | null;
  status: OrderStatus;
  channel: OrderChannel;
  items: OrderItem[];
  shippingAddress?: CustomerAddress | null;
  subtotal: number | string;
  tax: number | string;
  discount: number | string;
  total: number | string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  internalNotes?: string | null;
  customerNote?: string | null;
  trackingNumber?: string | null;
  courier?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  timeline?: OrderTimelineEntry[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  image?: string | null;
  bannerImage?: string | null;
  bannerTagline?: string | null;
  sortOrder: number;
  isPublished: boolean;
  subcategories?: Subcategory[];
  _count?: {
    products?: number;
    subcategories?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  category?: ProductCategory;
  sortOrder: number;
  isPublished: boolean;
  _count?: {
    products?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isHover: boolean;
}

export interface VariantImage {
  id: string;
  variantId: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  metalFinish: string;
  swatchColor?: string | null;
  priceOffset?: number | string | null;
  isDefault: boolean;
  inStock: boolean;
  sku?: string | null;
  images: VariantImage[];
}

export interface ProductSEO {
  id?: string;
  productId?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  categoryId: string;
  category?: ProductCategory;
  subcategoryId?: string | null;
  subcategory?: Subcategory | null;
  price: number | string;
  originalPrice?: number | string | null;
  description?: string | null;
  shortDescription?: string | null;
  isPublished: boolean;
  inStock: boolean;
  isMadeToOrder: boolean;
  netWeightGrams?: number | string | null;
  totalDiamondCt?: number | string | null;
  totalDiamondPcs?: number | null;
  diamondGrade?: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  seo?: ProductSEO | null;
  sortOrder: number;
  inventory?: InventoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  adminUserId?: string | null;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  quantity: number;
  reorderLevel: number;
  movements?: StockMovement[];
  updatedAt: string;
}

export interface HeroSlide {
  id: string;
  image: string;
  tagline?: string | null;
  title: string;
  cta?: string | null;
  href: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  name: string;
  location?: string | null;
  quote: string;
  imageUrl?: string | null;
  rating: number;
  productName?: string | null;
  productId?: string | null;
  verified: boolean;
  isPublished: boolean;
  reviewDate?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FAQ {
  id: string;
  categoryId: string;
  category?: { id: string; name: string };
  question: string;
  answer: string;
  context: 'GENERAL' | 'PRODUCT' | 'DIAMOND_EDUCATION' | 'CUSTOMISE' | 'GIFTING' | 'COLLECTION';
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: any;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  id: string;
  whatsappNumber: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  footerTagline?: string | null;
  footerCopyright?: string | null;
  announcementMessages: string[];
  promises: string[];
  pressNames: string[];
  freeShippingThreshold?: number | string | null;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminUserId?: string | null;
  admin?: AdminUser | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: any;
  after?: any;
  note?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  adminUserId?: string | null;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
  url: string;
  folder?: string | null;
  altText?: string | null;
  createdAt: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  parentId?: string | null;
  children?: NavigationItem[];
  sortOrder: number;
  isActive: boolean;
}

export interface DashboardStats {
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  revenueMtd: number;
  revenueYtd: number;
  revenueChange7d?: number;
  revenueChange30d?: number;
  orderCountToday: number;
  orderCount30d: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  pendingReviewsCount: number;
  ordersByStatus: Record<string, number>;
  revenueChart?: { date: string; revenue: number; orders: number }[];
  recentOrders?: Order[];
  topProducts?: { id: string; name: string; salesCount: number; totalRevenue: number }[];
}
