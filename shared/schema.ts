import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cuisine: text("cuisine").notNull(),
  image: text("image").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(),
  deliveryTime: text("delivery_time").notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 5, scale: 2 }).notNull(),
  address: text("address").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  // Extended fields for SDCMPU product management
  productCode: varchar("product_code", { length: 50 }),
  subcategory: text("subcategory"),
  // GST and HSN Code (required for invoices, E-way Bills, and GST returns)
  hsnCode: varchar("hsn_code", { length: 8 }), // 4-8 digit HSN code
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }),
  // Multi-tier pricing (Federation/District Union/Wholesale/Retail/MRP)
  federationPrice: decimal("federation_price", { precision: 10, scale: 2 }),
  districtUnionPrice: decimal("district_union_price", { precision: 10, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }), // Dealer price (85% of MRP)
  retailerPrice: decimal("retailer_price", { precision: 10, scale: 2 }), // Retailer = MRP - ((MRP - Dealer) × 60%)
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  // Unit information
  unitSize: text("unit_size"),
  unitType: text("unit_type"),
  // Product segment: "Fresh Milk", "Products", or "Ice Cream"
  productSegment: varchar("product_segment", { length: 50 }).default("Products"),
  // B2B Case packaging (case type and units per case for bulk orders)
  packagingType: varchar("packaging_type", { length: 20 }), // Case type: 'box', 'tray', 'tub', 'bag', 'tin', 'jar', 'carton'
  unitsPerPackage: integer("units_per_package"), // Units per case - number of individual items per case
  packageWeight: decimal("package_weight", { precision: 10, scale: 2 }), // Total weight/volume per package in kgs/liters
  packageWeightUnit: varchar("package_weight_unit", { length: 10 }), // 'kgs', 'lit', 'nos'
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plainPassword: text("plain_password"),
  role: text("role").notNull(), // 'admin' | 'union' | 'customer' | 'driver' | 'production_manager' | 'marketing_manager'
  pricingRole: text("pricing_role").default("MRP"), // Legacy single pricing role (for backward compatibility)
  // Per-segment pricing roles - allows different pricing tiers for Fresh Milk, Products, and Ice Cream
  freshMilkPricingRole: text("fresh_milk_pricing_role").default("MRP"), // FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP
  productsPricingRole: text("products_pricing_role").default("MRP"), // FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP
  iceCreamPricingRole: text("ice_cream_pricing_role").default("MRP"), // FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP
  unionId: varchar("union_id"), // District Union the customer belongs to (links to merchants table)
  restaurantId: varchar("restaurant_id").references(() => restaurants.id),
  status: varchar("status", { length: 20 }).default("pending"),
  // Segment assignment for staff roles (drivers, managers)
  assignedSegment: varchar("assigned_segment", { length: 50 }), // 'Fresh Milk' | 'Products' | 'Ice Cream' | null (both/all)
  // Institution flag for schools, hospitals, offices that buy at MRP on credit
  isInstitution: boolean("is_institution").default(false),
  institutionType: varchar("institution_type", { length: 100 }), // 'school', 'hospital', 'office', 'hostel', etc.
  // Business Compliance
  gstNumber: varchar("gst_number", { length: 15 }),
  gstVerified: boolean("gst_verified").default(false),
  gstBusinessName: text("gst_business_name"),
  gstStatus: text("gst_status"),
  panNumber: varchar("pan_number", { length: 10 }),
  panVerified: boolean("pan_verified").default(false),
  fssaiLicense: varchar("fssai_license", { length: 14 }),
  fssaiVerified: boolean("fssai_verified").default(false),
  fssaiBusinessName: text("fssai_business_name"),
  tradeLicense: varchar("trade_license", { length: 50 }),
  msmeNumber: varchar("msme_number", { length: 25 }),
  msmeVerified: boolean("msme_verified").default(false),
  gstExpiryDate: varchar("gst_expiry_date", { length: 10 }),
  fssaiExpiryDate: varchar("fssai_expiry_date", { length: 10 }),
  tradeLicenseExpiryDate: varchar("trade_license_expiry_date", { length: 10 }),
  msmeExpiryDate: varchar("msme_expiry_date", { length: 10 }),
  gstRegistrationDate: varchar("gst_registration_date", { length: 10 }),
  fssaiRegistrationDate: varchar("fssai_registration_date", { length: 10 }),
  tradeLicenseRegistrationDate: varchar("trade_license_registration_date", { length: 10 }),
  msmeRegistrationDate: varchar("msme_registration_date", { length: 10 }),
  // Bank Details
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 11 }),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  accountHolderName: text("account_holder_name"),
  accountType: varchar("account_type", { length: 20 }),
  upiId: varchar("upi_id", { length: 50 }),
  district: varchar("district", { length: 100 }),
  districtUnion: varchar("district_union", { length: 100 }),
  office: varchar("office", { length: 100 }),
  businessType: varchar("business_type", { length: 50 }),
  businessTypeCode: varchar("business_type_code", { length: 10 }),
  businessRoute: varchar("business_route", { length: 200 }),
  businessPoint: varchar("business_point", { length: 200 }),
  businessCode: varchar("business_code", { length: 50 }),
  businessName: text("business_name"),
  businessAddress: text("business_address"),
  addressLat: varchar("address_lat", { length: 20 }),
  addressLng: varchar("address_lng", { length: 20 }),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryPoints = pgTable("delivery_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id", { length: 50 }),
  pointName: text("point_name").notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  route: text("route"),
  deliveryAddress: text("delivery_address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").default(false),
  locationPhotoUrl: text("location_photo_url"),
  gpsAccuracy: decimal("gps_accuracy", { precision: 8, scale: 2 }),
  accuracyGrade: varchar("accuracy_grade", { length: 10 }),
  locationSource: varchar("location_source", { length: 20 }),
  addressSource: varchar("address_source", { length: 20 }),
  isMockLocation: boolean("is_mock_location"),
  suspicionScore: integer("suspicion_score").default(0),
  capturedAt: timestamp("captured_at"),
  proofStatus: varchar("proof_status", { length: 30 }).default("pending"),
  proofHash: varchar("proof_hash", { length: 64 }),
  verifiedBy: varchar("verified_by", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  verifyNote: text("verify_note"),
  consentGiven: boolean("consent_given").default(false),
  consentAt: timestamp("consent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const masterOrders = pgTable("master_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterOrderNumber: serial("master_order_number").notNull(),
  displayId: varchar("display_id", { length: 20 }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  restaurantId: varchar("restaurant_id").notNull(),
  pricingRole: varchar("pricing_role", { length: 50 }).default("MRP"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("open"),
  segmentCount: integer("segment_count").notNull().default(1),
  deliveredCount: integer("delivered_count").notNull().default(0),
  customerOffice: varchar("customer_office", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: serial("order_number").notNull(),
  displayId: varchar("display_id", { length: 30 }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 8, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 5, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 6, scale: 2 }).notNull(),
  total: decimal("total", { precision: 8, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryInstructions: text("delivery_instructions"),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  orderType: text("order_type").notNull().default("delivery"),
  ewayBillId: varchar("eway_bill_id"),
  pricingRole: varchar("pricing_role", { length: 50 }).default("MRP"),
  productSegment: varchar("product_segment", { length: 50 }).default("Products"),
  deliveryShift: varchar("delivery_shift", { length: 20 }),
  parentOrderId: varchar("parent_order_id"),
  masterOrderId: varchar("master_order_id"),
  segmentSuffix: varchar("segment_suffix", { length: 5 }),
  workflowStatus: text("workflow_status").default("pending"),
  managerAssignedAt: timestamp("manager_assigned_at"),
  packingStartedAt: timestamp("packing_started_at"),
  deliveryStartedAt: timestamp("delivery_started_at"),
  deliveredAt: timestamp("delivered_at"),
  isCredit: boolean("is_credit").default(false),
  isMobileSale: boolean("is_mobile_sale").default(false),
  agentId: varchar("agent_id"),
  agentName: text("agent_name"),
  gpsLocation: jsonb("gps_location"),
  customerOffice: varchar("customer_office", { length: 50 }),
  invoiceIrn: text("invoice_irn"),
  invoiceAckNo: varchar("invoice_ack_no", { length: 50 }),
  invoiceAckDate: varchar("invoice_ack_date", { length: 20 }),
  vehicleNo: varchar("vehicle_no", { length: 20 }),
  dispatchDocNo: varchar("dispatch_doc_no", { length: 50 }),
  deliveryNoteNo: varchar("delivery_note_no", { length: 50 }),
  deliveryNoteDate: varchar("delivery_note_date", { length: 20 }),
  dispatchedThrough: varchar("dispatched_through", { length: 100 }),
  billOfLading: varchar("bill_of_lading", { length: 50 }),
  termsOfPayment: varchar("terms_of_payment", { length: 100 }),
  termsOfDelivery: varchar("terms_of_delivery", { length: 100 }),
  buyerOrderNo: varchar("buyer_order_no", { length: 50 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  assignedDriverId: varchar("assigned_driver_id"),
  assignedDriverName: text("assigned_driver_name"),
  assignedAt: timestamp("assigned_at"),
  deliveryStatus: varchar("delivery_status", { length: 30 }).default("pending"),
  invoiceStatus: varchar("invoice_status", { length: 30 }).default("pending"),
  paymentStatus: varchar("payment_status", { length: 30 }).default("unpaid"),
  receivableStatus: varchar("receivable_status", { length: 30 }).default("not_applicable"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory table for B2B users (WSD, Dealer, Retailer) - auto-updated on purchases
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // B2B user who owns this inventory
  productId: varchar("product_id").notNull(), // Reference to menu_items
  productName: text("product_name").notNull(), // Cached product name for quick lookup
  quantity: integer("quantity").notNull().default(0), // Current stock quantity
  unitType: text("unit_type"), // units, liters, kg, etc.
  lastPurchaseDate: timestamp("last_purchase_date"),
  lastPurchaseQty: integer("last_purchase_qty"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory transaction log for audit trail
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryId: varchar("inventory_id").notNull(),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'purchase' | 'sale' | 'adjustment'
  quantityChange: integer("quantity_change").notNull(), // positive for additions, negative for subtractions
  previousQty: integer("previous_qty").notNull(),
  newQty: integer("new_qty").notNull(),
  orderId: varchar("order_id"), // Reference to order that triggered this transaction
  notes: text("notes"),
  adjustedBy: varchar("adjusted_by"), // For manual adjustments by District Union admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(['admin', 'restaurant', 'customer', 'dealer', 'wsd', 'retailer', 'federation', 'inter_union', 'agent', 'fmd', 'driver', 'unionStaff']),
  email: z.string().email()
}).refine((data) => {
  // If user is a union operator, they must be linked to a union
  if (data.role === 'restaurant') {
    return !!data.restaurantId;
  }
  return true;
}, {
  message: "Union users must be linked to a district union",
  path: ["restaurantId"]
});

export const insertDeliveryPointSchema = createInsertSchema(deliveryPoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMasterOrderSchema = createInsertSchema(masterOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

export type Restaurant = typeof restaurants.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type User = typeof users.$inferSelect;
export type MasterOrder = typeof masterOrders.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type DeliveryPoint = typeof deliveryPoints.$inferSelect;
export type InsertMasterOrder = z.infer<typeof insertMasterOrderSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertDeliveryPoint = z.infer<typeof insertDeliveryPointSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  restaurantId: string;
  image: string;
  productSegment?: string;
  pricingRole?: string;
  gstPercent?: string;
  basePrice?: string;
  unitsPerPackage?: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: string;
  quantity: number;
}

// Extended Karenderia entities

export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantUuid: varchar("merchant_uuid").notNull().unique(),
  restaurantSlug: varchar("restaurant_slug").notNull(),
  restaurantName: varchar("restaurant_name").notNull(),
  restaurantPhone: varchar("restaurant_phone").notNull(),
  contactName: varchar("contact_name").notNull(),
  contactPhone: varchar("contact_phone").notNull(),
  contactEmail: varchar("contact_email").notNull(),
  address: text("address"),
  freeDelivery: integer("free_delivery").notNull().default(2),
  username: varchar("username").notNull(),
  password: varchar("password").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, active, inactive
  dateActivated: timestamp("date_activated").defaultNow(),
  isFeatured: integer("is_featured").notNull().default(1),
  isReady: integer("is_ready").notNull().default(1),
  isSponsored: integer("is_sponsored").notNull().default(1),
  isCommission: integer("is_commission").notNull().default(1),
  percentCommission: decimal("percent_commission", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commissionBased: varchar("commission_based").notNull().default(""),
  latitude: varchar("latitude").notNull().default(""),
  longitude: varchar("longitude").notNull().default(""),
  logo: varchar("logo").notNull().default(""),
  path: varchar("path").notNull().default(""),
  merchantType: integer("merchant_type").notNull().default(1),
  membershipExpired: timestamp("membership_expired"),
  commissionType: varchar("commission_type").notNull().default(""),
  packageId: integer("package_id").notNull().default(0),
  deliveryDistanceCovered: decimal("delivery_distance_covered", { precision: 14, scale: 2 }).notNull().default("0.00"),
  headerImage: varchar("header_image").notNull().default(""),
  description: text("description"),
  shortDescription: text("short_description"),
  closeStore: integer("close_store").notNull().default(0),
  disabledOrdering: integer("disabled_ordering").notNull().default(0),
  pauseOrdering: integer("pause_ordering").notNull().default(0),
  ordersAdded: integer("orders_added").notNull().default(0),
  orderLimit: integer("order_limit").notNull().default(0),
  itemsAdded: integer("items_added").notNull().default(0),
  itemLimit: integer("item_limit").notNull().default(0),
  lastLogin: timestamp("last_login").defaultNow(),
  selfDelivery: integer("self_delivery").default(0),
  gstNumber: varchar("gst_number"),
  paymentSettings: jsonb("payment_settings"),
  pricingTierCode: varchar("pricing_tier_code", { length: 50 }).default("MRP"),
  retailerPriceEnabled: boolean("retailer_price_enabled").default(false),
  paymentEnabled: boolean("payment_enabled").default(false),
  paymentGatewayName: varchar("payment_gateway_name", { length: 50 }),
  paymentGatewayAccountId: varchar("payment_gateway_account_id"),
  settlementType: varchar("settlement_type", { length: 30 }).default("direct_merchant"),
  paymentLiveStatus: varchar("payment_live_status", { length: 30 }).default("inactive"),
  sessionInvalidatedAt: timestamp("session_invalidated_at"),
  freeMilkEntitlementLiters: decimal("free_milk_entitlement_liters", { precision: 8, scale: 2 }).default("10.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  image: text("image"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Sub-user accounts for admins and merchants to delegate permissions
export const subUsers = pgTable("sub_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentType: varchar("parent_type").notNull(), // 'admin' | 'merchant'
  parentId: varchar("parent_id").notNull(), // admin user ID or merchant ID
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  username: varchar("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  permissions: jsonb("permissions").notNull().default([]), // Array of permission strings
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubUserSchema = createInsertSchema(subUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type SubUser = typeof subUsers.$inferSelect;
export type InsertSubUser = z.infer<typeof insertSubUserSchema>;

// Available permissions for sub-users
export const ADMIN_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View admin dashboard' },
  { key: 'merchants_view', label: 'View Merchants', description: 'View merchant listings' },
  { key: 'merchants_edit', label: 'Edit Merchants', description: 'Edit merchant details' },
  { key: 'merchants_approve', label: 'Approve Merchants', description: 'Approve new merchant applications' },
  { key: 'orders_view', label: 'View Orders', description: 'View all orders' },
  { key: 'orders_manage', label: 'Manage Orders', description: 'Update order status' },
  { key: 'users_view', label: 'View Users', description: 'View user accounts' },
  { key: 'users_manage', label: 'Manage Users', description: 'Create/edit user accounts' },
  { key: 'subusers_manage', label: 'Manage Sub-users', description: 'Create and manage sub-user accounts' },
  { key: 'reports_view', label: 'View Reports', description: 'View sales and analytics reports' },
  { key: 'settings', label: 'Settings', description: 'Access system settings' },
  { key: 'payment_gateway', label: 'Payment Gateway', description: 'Manage payment gateway settings' },
] as const;

export const UNION_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View union dashboard' },
  { key: 'products_view', label: 'View Products', description: 'View product listings' },
  { key: 'products_edit', label: 'Edit Products', description: 'Add/edit products' },
  { key: 'products_delete', label: 'Delete Products', description: 'Delete products' },
  { key: 'categories_manage', label: 'Manage Categories', description: 'Create/edit categories' },
  { key: 'orders_view', label: 'View Orders', description: 'View incoming orders' },
  { key: 'orders_manage', label: 'Manage Orders', description: 'Update order status' },
  { key: 'inventory', label: 'Inventory Management', description: 'Manage stock levels' },
  { key: 'reports_view', label: 'View Reports', description: 'View sales reports' },
  { key: 'subusers_manage', label: 'Manage Sub-users', description: 'Create and manage sub-user accounts' },
  { key: 'profile_edit', label: 'Edit Profile', description: 'Edit union profile information' },
  { key: 'price_list', label: 'Price List Upload', description: 'Upload and manage price lists' },
] as const;

// Backward compatibility alias
export const MERCHANT_PERMISSIONS = UNION_PERMISSIONS;

// Agents table for FMD, WSD, Retailers, and other distribution agents
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentCode: varchar("agent_code", { length: 20 }).notNull().unique(), // Short code like 001, 002 for login
  agentType: varchar("agent_type", { length: 20 }).notNull(), // AGENT, HOTELS, INSTUTION, PRIVATE_PARLOUR, UNION_PARLOUR, WSD
  name: text("name").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  alternatePhone: varchar("alternate_phone", { length: 15 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }), // District they operate in
  pincode: varchar("pincode", { length: 6 }),
  // Organization structure
  assignedUnionId: varchar("assigned_union_id"), // Links to District Union (merchant ID)
  officeId: varchar("office_id", { length: 100 }), // Office they belong to
  routeNumber: varchar("route_number", { length: 50 }), // Vehicle route number
  routeName: varchar("route_name", { length: 200 }), // Route name (Steel Plant I, Yercaud Hills, etc.)
  agentPoint: varchar("agent_point", { length: 200 }), // Agent Point (ESI Hospital, GMK Men's Hostel, etc.)
  // Per-segment pricing tiers (Fresh Milk, Products, Ice Cream can have different pricing)
  freshMilkTier: varchar("fresh_milk_tier", { length: 30 }).notNull().default("MRP"), // MRP, DLR, RTL, WSD, INT, FED
  productTier: varchar("product_tier", { length: 30 }).notNull().default("MRP"), // MRP, DLR, RTL, WSD, INT, FED
  iceCreamTier: varchar("ice_cream_tier", { length: 30 }).notNull().default("MRP"), // MRP, DLR, RTL, WSD, INT, FED
  // Legacy single pricing role (for backward compatibility)
  pricingRole: varchar("pricing_role", { length: 30 }).notNull().default("MRP"), // DEALER, RETAILER, WHOLESALE_DEALER, MRP
  // Account status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending (admin created), claimed (agent set password), active, inactive
  passwordHash: varchar("password_hash", { length: 255 }), // Set when agent claims account
  // Delivery capability
  canDeliver: boolean("can_deliver").default(false), // True if agent can also do deliveries
  // Credit limits for B2B (separate for each segment)
  freshMilkCreditLimit: decimal("fresh_milk_credit_limit", { precision: 12, scale: 2 }).default("0.00"),
  freshMilkCreditUsed: decimal("fresh_milk_credit_used", { precision: 12, scale: 2 }).default("0.00"),
  productsCreditLimit: decimal("products_credit_limit", { precision: 12, scale: 2 }).default("0.00"),
  productsCreditUsed: decimal("products_credit_used", { precision: 12, scale: 2 }).default("0.00"),
  iceCreamCreditLimit: decimal("ice_cream_credit_limit", { precision: 12, scale: 2 }).default("0.00"),
  iceCreamCreditUsed: decimal("ice_cream_credit_used", { precision: 12, scale: 2 }).default("0.00"),
  // Bank Details
  bankAccountName: varchar("bank_account_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 11 }),
  bankName: varchar("bank_name", { length: 100 }),
  // GST Details (if registered)
  gstNumber: varchar("gst_number", { length: 15 }),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// Agent categories (from user's data)
export const AGENT_CATEGORIES = {
  AGENT: 'AGENT',
  HOTELS: 'HOTELS',
  INSTUTION: 'INSTUTION',
  PRIVATE_PARLOUR: 'PRIVATE_PARLOUR',
  UNION_PARLOUR: 'UNION_PARLOUR',
  WSD: 'WSD',
} as const;

// 3-letter pricing tier abbreviations
export const PRICING_TIER_CODES = {
  FED: 'FED',   // Federation (50% of MRP)
  INT: 'INT',   // Inter Union (55% of MRP)
  WSD: 'WSD',   // Wholesale Dealer (65% of MRP)
  DLR: 'DLR',   // Dealer (85% of MRP)
  RTL: 'RTL',   // Retailer
  MRP: 'MRP',   // Consumer (100% of MRP)
} as const;

// Map 3-letter codes to full pricing role names
export const TIER_CODE_TO_ROLE = {
  FED: 'FEDERATION',
  INT: 'INTER_UNION',
  WSD: 'WHOLESALE_DEALER',
  DLR: 'DEALER',
  RTL: 'RETAILER',
  MRP: 'MRP',
} as const;

// Pricing tier labels with abbreviations
export const PRICING_TIER_LABELS = [
  { code: 'FED', label: 'Federation (FED)', fullName: 'FEDERATION', percent: 50 },
  { code: 'INT', label: 'Inter Union (INT)', fullName: 'INTER_UNION', percent: 55 },
  { code: 'WSD', label: 'Wholesale Dealer (WSD)', fullName: 'WHOLESALE_DEALER', percent: 65 },
  { code: 'DLR', label: 'Dealer (DLR)', fullName: 'DEALER', percent: 85 },
  { code: 'RTL', label: 'Retailer (RTL)', fullName: 'RETAILER', percent: 0 },
  { code: 'MRP', label: 'Consumer (MRP)', fullName: 'MRP', percent: 100 },
] as const;

// Agent type constants (legacy - keeping for backward compatibility)
export const AGENT_TYPES = {
  FMD: 'FMD',           // Fresh Milk Dealer
  WSD: 'WSD',           // Wholesale Dealer
  RETAILER: 'RETAILER', // Retailer
  WHOLESALE: 'WHOLESALE', // Wholesale Agent
} as const;

// Agent pricing role mapping (legacy)
export const AGENT_PRICING_ROLES = {
  FMD: 'DEALER',           // FMD gets Dealer pricing (85% of MRP)
  WSD: 'WHOLESALE_DEALER', // WSD gets Wholesale pricing (65% of MRP)
  RETAILER: 'RETAILER',    // Retailers get Retailer pricing
  WHOLESALE: 'WHOLESALE_DEALER', // Wholesale agents get Wholesale pricing
} as const;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientUuid: varchar("client_uuid").notNull().unique(),
  socialStrategy: varchar("social_strategy").notNull().default("web"),
  merchantId: integer("merchant_id").notNull().default(0),
  firstName: varchar("first_name").notNull().default(""),
  lastName: varchar("last_name").notNull().default(""),
  emailAddress: varchar("email_address").notNull().default(""),
  password: varchar("password").notNull().default(""),
  phonePrefix: varchar("phone_prefix").notNull().default(""),
  contactPhone: varchar("contact_phone").notNull().default(""),
  avatar: varchar("avatar").notNull().default(""),
  path: varchar("path").notNull().default(""),
  status: varchar("status").notNull().default("active"),
  socialId: varchar("social_id").notNull().default(""),
  socialToken: text("social_token"),
  token: varchar("token").notNull().default(""),
  mobileVerificationCode: integer("mobile_verification_code").notNull().default(0),
  accountVerified: integer("account_verified").notNull().default(0),
  verifyCodeRequested: timestamp("verify_code_requested").defaultNow(),
  resetPasswordRequest: integer("reset_password_request").notNull().default(0),
  lastLogin: timestamp("last_login").defaultNow(),
  dateCreated: timestamp("date_created").defaultNow(),
  dateModified: timestamp("date_modified").defaultNow(),
  ipAddress: varchar("ip_address").notNull().default(""),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: integer("merchant_id").notNull().default(0),
  itemName: varchar("item_name").notNull().default(""),
  slug: varchar("slug").notNull().default(""),
  itemDescription: text("item_description"),
  itemShortDescription: varchar("item_short_description").notNull().default(""),
  status: varchar("status").notNull().default(""),
  photo: varchar("photo").notNull().default(""),
  path: varchar("path").notNull().default(""),
  sequence: integer("sequence").notNull().default(0),
  isFeatured: varchar("is_featured").notNull().default(""),
  featuredPriority: integer("featured_priority"),
  nonTaxable: integer("non_taxable").notNull().default(1),
  available: integer("available").notNull().default(1),
  pointsEarned: integer("points_earned").notNull().default(0),
  pointsEnabled: integer("points_enabled").notNull().default(1),
  packagingFee: decimal("packaging_fee", { precision: 14, scale: 4 }).notNull().default("0.0000"),
  packagingIncremental: integer("packaging_incremental").notNull().default(0),
  itemToken: varchar("item_token").notNull().default(""),
  sku: varchar("sku").notNull().default(""),
  trackStock: integer("track_stock").notNull().default(1),
  supplierId: integer("supplier_id").notNull().default(0),
  metaTitle: varchar("meta_title").notNull().default(""),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  metaImage: varchar("meta_image").notNull().default(""),
  metaImagePath: varchar("meta_image_path").notNull().default(""),
  cookingRefRequired: integer("cooking_ref_required").notNull().default(0),
  ingredientsPreselected: integer("ingredients_preselected").notNull().default(0),
  availableAtSpecific: integer("available_at_specific").notNull().default(0),
  notForSale: integer("not_for_sale").notNull().default(0),
  colorHex: varchar("color_hex").notNull().default(""),
  visible: integer("visible").notNull().default(1),
  preparationTime: integer("preparation_time").notNull().default(0),
  extraPreparationTime: integer("extra_preparation_time").notNull().default(0),
  unavailableUntil: timestamp("unavailable_until"),
  dateCreated: timestamp("date_created").defaultNow(),
  dateModified: timestamp("date_modified").defaultNow(),
  ipAddress: varchar("ip_address").notNull().default(""),
});

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planName: varchar("plan_name").notNull(),
  planDescription: text("plan_description"),
  planPrice: decimal("plan_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  planDuration: integer("plan_duration").notNull().default(0), // in days
  maxItems: integer("max_items").notNull().default(0),
  maxOrders: integer("max_orders").notNull().default(0),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceReference: varchar("invoice_reference").notNull().unique(),
  merchantId: varchar("merchant_id").notNull(),
  planId: varchar("plan_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("unpaid"), // unpaid, paid, overdue, cancelled
  paymentMethod: varchar("payment_method").notNull().default(""),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  processedAmount: decimal("processed_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  fees: decimal("fees", { precision: 10, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, processing, paid, cancelled
  requestDate: timestamp("request_date").defaultNow(),
  processedDate: timestamp("processed_date"),
  paymentMethod: varchar("payment_method").notNull().default(""),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  clientId: varchar("client_id").notNull(),
  customerName: varchar("customer_name").notNull(),
  customerEmail: varchar("customer_email").notNull(),
  customerPhone: varchar("customer_phone").notNull(),
  partySize: integer("party_size").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  reservationTime: varchar("reservation_time").notNull(),
  tableNumber: varchar("table_number"),
  specialRequests: text("special_requests"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, seated, completed, cancelled, no_show
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const promos = pgTable("promos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCode: varchar("promo_code").notNull().unique(),
  promoName: varchar("promo_name").notNull(),
  description: text("description"),
  discountType: varchar("discount_type").notNull(), // percentage, fixed_amount
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  maximumDiscount: decimal("maximum_discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  usageLimit: integer("usage_limit").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  applicableFor: varchar("applicable_for").notNull().default("all"), // all, specific_merchants, specific_customers
  merchantIds: jsonb("merchant_ids"), // Array of merchant IDs for specific merchants
  status: varchar("status").notNull().default("active"), // active, inactive, expired
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // order, payment, promotion, system
  targetType: varchar("target_type").notNull(), // admin, merchant, customer, driver
  targetId: varchar("target_id"), // ID of the target user
  orderId: varchar("order_id"), // Related order ID if applicable
  merchantId: varchar("merchant_id"), // Related merchant ID if applicable
  isRead: boolean("is_read").notNull().default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  orderId: varchar("order_id").notNull(),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionType: varchar("commission_type").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, paid, withheld
  payoutId: varchar("payout_id"), // Reference to payout when paid
  earnedAt: timestamp("earned_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attributes = pgTable("attributes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  displayName: varchar("display_name").notNull(),
  type: varchar("type").notNull(), // text, select, multiselect, boolean
  options: jsonb("options"), // For select/multiselect types
  isRequired: boolean("is_required").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // email, sms, push_notification
  targetAudience: varchar("target_audience").notNull(), // all_customers, specific_customers, merchants
  subject: varchar("subject"), // For email campaigns
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  status: varchar("status").notNull().default("draft"), // draft, scheduled, sending, sent, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for all new entities
export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  dateCreated: true,
  dateModified: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  dateCreated: true,
  dateModified: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromoSchema = createInsertSchema(promos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  createdAt: true,
});

export const insertAttributeSchema = createInsertSchema(attributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// B2B Tax Invoice table for storing complete invoice details
export const b2bInvoices = pgTable("b2b_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id").notNull(),
  orderId: varchar("order_id"),
  customerId: varchar("customer_id"),
  pricingTier: varchar("pricing_tier", { length: 50 }).notNull().default("DEALER"),
  productSegment: varchar("product_segment", { length: 50 }).notNull().default("Products"), // 'Fresh Milk' | 'Products' | 'Ice Cream'
  
  // Seller Details
  sellerName: varchar("seller_name", { length: 200 }),
  sellerAddress: text("seller_address"),
  sellerCity: varchar("seller_city", { length: 100 }),
  sellerState: varchar("seller_state", { length: 100 }),
  sellerStateCode: varchar("seller_state_code", { length: 5 }),
  sellerGstin: varchar("seller_gstin", { length: 20 }),
  sellerFssai: varchar("seller_fssai", { length: 20 }),
  
  // Ship To (Consignee) Details
  shipToName: varchar("ship_to_name", { length: 200 }),
  shipToAddress: text("ship_to_address"),
  shipToCity: varchar("ship_to_city", { length: 100 }),
  shipToState: varchar("ship_to_state", { length: 100 }),
  shipToStateCode: varchar("ship_to_state_code", { length: 5 }),
  shipToGstin: varchar("ship_to_gstin", { length: 20 }),
  
  // Bill To (Buyer) Details
  billToName: varchar("bill_to_name", { length: 200 }),
  billToAddress: text("bill_to_address"),
  billToCity: varchar("bill_to_city", { length: 100 }),
  billToState: varchar("bill_to_state", { length: 100 }),
  billToStateCode: varchar("bill_to_state_code", { length: 5 }),
  billToGstin: varchar("bill_to_gstin", { length: 20 }),
  
  // Invoice Details
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  paymentTerms: varchar("payment_terms", { length: 50 }).default("Credit"),
  deliveryNote: varchar("delivery_note", { length: 50 }),
  deliveryNoteDate: timestamp("delivery_note_date"),
  dispatchDocNo: varchar("dispatch_doc_no", { length: 50 }),
  dispatchedThrough: varchar("dispatched_through", { length: 100 }),
  destination: varchar("destination", { length: 100 }),
  vehicleNo: varchar("vehicle_no", { length: 20 }),
  loadingCity: varchar("loading_city", { length: 100 }),
  dischargeCity: varchar("discharge_city", { length: 100 }),
  termsOfDelivery: varchar("terms_of_delivery", { length: 100 }).default("Door Delivery"),
  ewayBillNo: varchar("eway_bill_no", { length: 20 }),
  buyerOrderNo: varchar("buyer_order_no", { length: 50 }),
  buyerOrderDate: timestamp("buyer_order_date"),
  otherRef: varchar("other_ref", { length: 100 }),
  
  // Line Items (JSON array of items with hsn, description, qty, rate, gst, amount)
  items: jsonb("items").notNull().default([]),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  cgstAmount: decimal("cgst_amount", { precision: 14, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 14, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 14, scale: 2 }).default("0"),
  roundingOff: decimal("rounding_off", { precision: 14, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  amountInWords: text("amount_in_words"),
  
  // Status: draft, pending, pending_price (NCDFI), sent, paid, partial, overdue, cancelled
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  
  // NCDFI Bulk - provisional pricing (price confirmed later)
  isProvisionalPrice: boolean("is_provisional_price").default(false),
  priceConfirmedAt: timestamp("price_confirmed_at"),
  priceConfirmedBy: varchar("price_confirmed_by", { length: 100 }),
  
  // Payment tracking
  amountPaid: decimal("amount_paid", { precision: 14, scale: 2 }).default("0"),
  balanceDue: decimal("balance_due", { precision: 14, scale: 2 }),
  payments: jsonb("payments").$type<Array<{
    id: string;
    amount: number;
    mode: string; // cash, online, credit, razorpay
    date: string;
    reference?: string;
    notes?: string;
    recordedBy?: string;
    recordedAt?: string;
  }>>().default([]),
  
  // Credit terms
  creditDays: integer("credit_days").default(0), // 0 = due on receipt, 15, 30, 45, 60
  
  // Staff who created this invoice
  createdBy: varchar("created_by", { length: 100 }),
  createdByName: varchar("created_by_name", { length: 200 }),
  salesSegment: varchar("sales_segment", { length: 50 }),
  
  // Legacy payment fields
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  
  // Bank Details
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNo: varchar("bank_account_no", { length: 30 }),
  bankIfsc: varchar("bank_ifsc", { length: 15 }),
  bankBranch: varchar("bank_branch", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertB2BInvoiceSchema = createInsertSchema(b2bInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for all new entities
export type Merchant = typeof merchants.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Promo = typeof promos.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Earning = typeof earnings.$inferSelect;
export type Attribute = typeof attributes.$inferSelect;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type B2BInvoice = typeof b2bInvoices.$inferSelect;

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type InsertPromo = z.infer<typeof insertPromoSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type InsertAttribute = z.infer<typeof insertAttributeSchema>;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type InsertB2BInvoice = z.infer<typeof insertB2BInvoiceSchema>;

// Pricing tiers for role-based pricing calculation
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierCode: varchar("tier_code", { length: 50 }).notNull().unique(),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  description: text("description"),
  formula: varchar("formula", { length: 100 }).notNull(), // e.g., "MRP-40%", "MRP", "FEDERATION_PRICE"
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }), // e.g., 40.00 for 40% discount from MRP
  basePrice: varchar("base_price", { length: 50 }).notNull().default("mrp"), // mrp, federation, district_union, wholesale, retail
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export const paymentGateways = pgTable("payment_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentCode: varchar("payment_code").notNull().unique(),
  paymentName: varchar("payment_name").notNull(),
  onlinePayment: boolean("online_payment").notNull().default(true),
  availableForPayout: boolean("available_for_payout").notNull().default(false),
  availableForPlan: boolean("available_for_plan").notNull().default(true),
  logoType: varchar("logo_type").notNull().default("image"), // image, icon
  logoImage: varchar("logo_image").notNull().default(""),
  logoClassIcon: varchar("logo_class_icon").notNull().default(""),
  featuredImage: varchar("featured_image").notNull().default(""),
  isProduction: boolean("is_production").notNull().default(false),
  secretKey: text("secret_key").notNull().default(""),
  publishableKey: text("publishable_key").notNull().default(""),
  webhooksSigningSecret: text("webhooks_signing_secret").notNull().default(""),
  webhooksPlan: text("webhooks_plan").notNull().default(""),
  events: text("events").notNull().default("checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, subscription_schedule.canceled"),
  status: varchar("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;

// UPI Transactions table for tracking UPI payments
export const upiTransactions = pgTable("upi_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  paymentGatewayId: varchar("payment_gateway_id").notNull().references(() => paymentGateways.id),
  upiTransactionId: varchar("upi_transaction_id").unique(), // Transaction ID from SBI UPI (nullable until assigned)
  merchantTransactionId: varchar("merchant_transaction_id").notNull().unique(), // Our internal transaction ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("INR"),
  payerVPA: varchar("payer_vpa"), // Virtual Payment Address of the payer
  payeeVPA: varchar("payee_vpa"), // Merchant VPA
  qrCodeData: text("qr_code_data"), // QR code data for payment
  status: varchar("status").notNull().default("pending"), // pending, processing, success, failed, expired
  failureReason: text("failure_reason"), // Reason for failure if any
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // When the transaction expires
  webhookData: jsonb("webhook_data"), // Raw webhook data from SBI
  reconciliationStatus: varchar("reconciliation_status", { length: 20 }).default("pending"),
  linkedInvoiceId: varchar("linked_invoice_id"),
  reconciliationNote: text("reconciliation_note"),
  reconciledAt: timestamp("reconciled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUpiTransactionSchema = createInsertSchema(upiTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpiTransaction = typeof upiTransactions.$inferSelect;
export type InsertUpiTransaction = z.infer<typeof insertUpiTransactionSchema>;

// Razorpay Transactions table for tracking Razorpay payments
export const razorpayTransactions = pgTable("razorpay_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // Reference to our orders table
  razorpayOrderId: varchar("razorpay_order_id").notNull().unique(), // Razorpay's order ID
  razorpayPaymentId: varchar("razorpay_payment_id"), // Razorpay's payment ID (set after payment)
  razorpaySignature: varchar("razorpay_signature"), // Razorpay's signature for verification
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("INR"),
  status: varchar("status").notNull().default("created"), // created, authorized, captured, failed, refunded
  paymentMethod: varchar("payment_method"), // card, upi, netbanking, wallet
  bankName: varchar("bank_name"), // Bank name for netbanking/card
  cardLast4: varchar("card_last4"), // Last 4 digits of card
  vpa: varchar("vpa"), // VPA for UPI payments
  email: varchar("email"),
  contact: varchar("contact"),
  errorCode: varchar("error_code"),
  errorDescription: text("error_description"),
  errorReason: varchar("error_reason"),
  notes: jsonb("notes"), // Additional notes/metadata
  webhookData: jsonb("webhook_data"), // Raw webhook data from Razorpay
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  capturedAt: timestamp("captured_at"),
});

export const insertRazorpayTransactionSchema = createInsertSchema(razorpayTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RazorpayTransaction = typeof razorpayTransactions.$inferSelect;
export type InsertRazorpayTransaction = z.infer<typeof insertRazorpayTransactionSchema>;

export const cashfreeTransactions = pgTable("cashfree_transactions", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id"),
  cfOrderId: varchar("cf_order_id").unique(),
  paymentSessionId: text("payment_session_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR"),
  status: varchar("status", { length: 30 }).notNull().default("created"),
  cfPaymentId: varchar("cf_payment_id"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  errorMessage: text("error_message"),
  webhookData: jsonb("webhook_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCashfreeTransactionSchema = createInsertSchema(cashfreeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CashfreeTransaction = typeof cashfreeTransactions.$inferSelect;
export type InsertCashfreeTransaction = z.infer<typeof insertCashfreeTransactionSchema>;

export const cashfreePaymentLinks = pgTable("cashfree_payment_links", {
  id: serial("id").primaryKey(),
  linkId: varchar("link_id", { length: 100 }).unique().notNull(),
  linkUrl: text("link_url"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  purpose: text("purpose"),
  status: varchar("status", { length: 30 }).default("active"),
  relatedOrderId: varchar("related_order_id"),
  relatedInvoiceId: varchar("related_invoice_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  partialPayments: boolean("partial_payments").default(false),
  createdBy: varchar("created_by"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCashfreePaymentLinkSchema = createInsertSchema(cashfreePaymentLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CashfreePaymentLink = typeof cashfreePaymentLinks.$inferSelect;
export type InsertCashfreePaymentLink = z.infer<typeof insertCashfreePaymentLinkSchema>;

export const cashfreeSplitVendors = pgTable("cashfree_split_vendors", {
  id: serial("id").primaryKey(),
  vendorId: varchar("vendor_id", { length: 100 }).unique().notNull(),
  unionId: varchar("union_id", { length: 50 }),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  bankAccount: varchar("bank_account", { length: 30 }),
  ifsc: varchar("ifsc", { length: 15 }),
  upiVpa: varchar("upi_vpa", { length: 100 }),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  scheduleOption: integer("schedule_option").default(1),
  kycStatus: varchar("kyc_status", { length: 30 }),
  dashboardAccess: boolean("dashboard_access").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCashfreeSplitVendorSchema = createInsertSchema(cashfreeSplitVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CashfreeSplitVendor = typeof cashfreeSplitVendors.$inferSelect;
export type InsertCashfreeSplitVendor = z.infer<typeof insertCashfreeSplitVendorSchema>;

export const cashfreeOrderSplits = pgTable("cashfree_order_splits", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id"),
  cfOrderId: varchar("cf_order_id"),
  vendorId: varchar("vendor_id"),
  splitAmount: decimal("split_amount", { precision: 10, scale: 2 }),
  splitPercentage: decimal("split_percentage", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 30 }),
  settlementId: varchar("settlement_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashfreeOrderSplitSchema = createInsertSchema(cashfreeOrderSplits).omit({
  id: true,
  createdAt: true,
});

export type CashfreeOrderSplit = typeof cashfreeOrderSplits.$inferSelect;
export type InsertCashfreeOrderSplit = z.infer<typeof insertCashfreeOrderSplitSchema>;

export const cashfreeBeneficiaries = pgTable("cashfree_beneficiaries", {
  id: serial("id").primaryKey(),
  beneId: varchar("bene_id", { length: 100 }).unique().notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  bankAccount: varchar("bank_account", { length: 30 }),
  ifsc: varchar("ifsc", { length: 15 }),
  vpa: varchar("vpa", { length: 100 }),
  status: varchar("status", { length: 20 }).default("VERIFIED"),
  addedBy: varchar("added_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashfreeBeneficiarySchema = createInsertSchema(cashfreeBeneficiaries).omit({
  id: true,
  createdAt: true,
});

export type CashfreeBeneficiary = typeof cashfreeBeneficiaries.$inferSelect;
export type InsertCashfreeBeneficiary = z.infer<typeof insertCashfreeBeneficiarySchema>;

export const cashfreePayouts = pgTable("cashfree_payouts", {
  id: serial("id").primaryKey(),
  transferId: varchar("transfer_id", { length: 100 }).unique().notNull(),
  beneId: varchar("bene_id", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transferMode: varchar("transfer_mode", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).default("PENDING"),
  utr: varchar("utr", { length: 50 }),
  remarks: text("remarks"),
  initiatedBy: varchar("initiated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCashfreePayoutSchema = createInsertSchema(cashfreePayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CashfreePayout = typeof cashfreePayouts.$inferSelect;
export type InsertCashfreePayout = z.infer<typeof insertCashfreePayoutSchema>;

export const cashfreeSoftposTerminals = pgTable("cashfree_softpos_terminals", {
  id: serial("id").primaryKey(),
  terminalId: varchar("terminal_id", { length: 100 }).unique().notNull(),
  merchantId: varchar("merchant_id", { length: 50 }),
  terminalName: text("terminal_name"),
  terminalPhone: varchar("terminal_phone", { length: 20 }),
  deviceInfo: text("device_info"),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashfreeSoftposTerminalSchema = createInsertSchema(cashfreeSoftposTerminals).omit({
  id: true,
  createdAt: true,
});

export type CashfreeSoftposTerminal = typeof cashfreeSoftposTerminals.$inferSelect;
export type InsertCashfreeSoftposTerminal = z.infer<typeof insertCashfreeSoftposTerminalSchema>;

// E-Way Bill System Tables
export const ewayBills = pgTable("eway_bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // Reference to order
  merchantId: varchar("merchant_id").notNull(), // Reference to merchant/union
  ewayBillNumber: varchar("eway_bill_number").unique(), // E-way bill number from GST portal
  ewayBillDate: timestamp("eway_bill_date"), // Date of E-way bill generation
  validUntil: timestamp("valid_until"), // Validity expiry date
  
  // Supply details
  supplyType: varchar("supply_type").notNull().default("O"), // O=Outward, I=Inward
  subSupplyType: varchar("sub_supply_type").notNull().default("1"), // 1=Supply, 2=Import, etc.
  docType: varchar("doc_type").notNull().default("INV"), // INV=Invoice, BOE=Bill of Entry, etc.
  docNo: varchar("doc_no").notNull(), // Invoice/Document number
  docDate: timestamp("doc_date").notNull(), // Document date
  
  // From party details
  fromGstin: varchar("from_gstin").notNull(),
  fromTradeName: varchar("from_trade_name").notNull(),
  fromAddress: text("from_address").notNull(),
  fromCity: varchar("from_city").notNull(),
  fromPincode: varchar("from_pincode").notNull(),
  fromStateCode: varchar("from_state_code").notNull(), // e.g., "33" for Tamil Nadu
  
  // To party details
  toGstin: varchar("to_gstin"),
  toTradeName: varchar("to_trade_name").notNull(),
  toAddress: text("to_address").notNull(),
  toCity: varchar("to_city").notNull(),
  toPincode: varchar("to_pincode").notNull(),
  toStateCode: varchar("to_state_code").notNull(),
  
  // Item details (stored as JSON array)
  itemList: jsonb("item_list").notNull(), // Array of {productName, hsnCode, quantity, unit, taxableAmount, sgstRate, cgstRate, igstRate}
  
  // Totals
  totalValue: decimal("total_value", { precision: 14, scale: 2 }).notNull(),
  cgstValue: decimal("cgst_value", { precision: 14, scale: 2 }).notNull().default("0.00"),
  sgstValue: decimal("sgst_value", { precision: 14, scale: 2 }).notNull().default("0.00"),
  igstValue: decimal("igst_value", { precision: 14, scale: 2 }).notNull().default("0.00"),
  cessValue: decimal("cess_value", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalInvoiceValue: decimal("total_invoice_value", { precision: 14, scale: 2 }).notNull(),
  
  // Transportation details (Part B)
  transMode: varchar("trans_mode").notNull().default("1"), // 1=Road, 2=Rail, 3=Air, 4=Ship
  distance: integer("distance").notNull().default(0), // Distance in KM
  transporterId: varchar("transporter_id"), // Transporter GSTIN
  transporterName: varchar("transporter_name"),
  transDocNo: varchar("trans_doc_no"), // LR/RR/Airway Bill No
  transDocDate: timestamp("trans_doc_date"),
  vehicleNo: varchar("vehicle_no"),
  vehicleType: varchar("vehicle_type").default("R"), // R=Regular, O=Over Dimensional Cargo
  
  // Status tracking
  status: varchar("status").notNull().default("draft"), // draft, pending, generated, active, cancelled, expired, extended
  cancelReason: text("cancel_reason"),
  cancelledAt: timestamp("cancelled_at"),
  
  // Extension details
  extensionCount: integer("extension_count").notNull().default(0),
  extendedUntil: timestamp("extended_until"),
  extensionReason: text("extension_reason"),
  
  // API response data
  apiResponse: jsonb("api_response"), // Raw response from E-way bill API
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEwayBillSchema = createInsertSchema(ewayBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EwayBill = typeof ewayBills.$inferSelect;
export type InsertEwayBill = z.infer<typeof insertEwayBillSchema>;

// E-Way Bill Configuration (for storing API credentials)
export const ewayBillConfig = pgTable("eway_bill_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id"), // null for global config
  apiUsername: varchar("api_username"),
  apiPasswordHash: text("api_password_hash"), // Encrypted password
  clientId: varchar("client_id"),
  clientSecretHash: text("client_secret_hash"), // Encrypted secret
  gstin: varchar("gstin").notNull(),
  tradeName: varchar("trade_name").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  pincode: varchar("pincode").notNull(),
  stateCode: varchar("state_code").notNull(), // e.g., "33" for Tamil Nadu
  isProduction: boolean("is_production").notNull().default(false), // true for production, false for sandbox
  isActive: boolean("is_active").notNull().default(true),
  lastTokenRefresh: timestamp("last_token_refresh"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEwayBillConfigSchema = createInsertSchema(ewayBillConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EwayBillConfig = typeof ewayBillConfig.$inferSelect;
export type InsertEwayBillConfig = z.infer<typeof insertEwayBillConfigSchema>;

// E-Way Bill Logs for tracking all API interactions
export const ewayBillLogs = pgTable("eway_bill_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ewayBillId: varchar("eway_bill_id"),
  action: varchar("action").notNull(), // generate, update, cancel, extend, get_details
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  status: varchar("status").notNull(), // success, error
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address"),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEwayBillLogSchema = createInsertSchema(ewayBillLogs).omit({
  id: true,
  createdAt: true,
});

export type EwayBillLog = typeof ewayBillLogs.$inferSelect;
export type InsertEwayBillLog = z.infer<typeof insertEwayBillLogSchema>;

// HSN Codes reference table for product classification
export const hsnCodes = pgTable("hsn_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hsnCode: varchar("hsn_code").notNull().unique(),
  description: text("description").notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  category: varchar("category"), // e.g., "Dairy Products", "Milk", "Curd"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHsnCodeSchema = createInsertSchema(hsnCodes).omit({
  id: true,
  createdAt: true,
});

export type HsnCode = typeof hsnCodes.$inferSelect;
export type InsertHsnCode = z.infer<typeof insertHsnCodeSchema>;

// State codes for E-way Bill
export const INDIAN_STATE_CODES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
] as const;

// GST Returns for monthly filing
export const gstReturns = pgTable("gst_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  gstin: varchar("gstin", { length: 15 }),
  returnType: varchar("return_type", { length: 20 }).notNull().default("GSTR1"),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, generated, filed
  totalInvoices: integer("total_invoices").notNull().default(0),
  totalTaxableValue: decimal("total_taxable_value", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalCgst: decimal("total_cgst", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalSgst: decimal("total_sgst", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalIgst: decimal("total_igst", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalCess: decimal("total_cess", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalTax: decimal("total_tax", { precision: 14, scale: 2 }).notNull().default("0.00"),
  b2bData: jsonb("b2b_data"),
  b2cData: jsonb("b2c_data"),
  hsnSummary: jsonb("hsn_summary"),
  generatedAt: timestamp("generated_at"),
  filedAt: timestamp("filed_at"),
  fileReference: varchar("file_reference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGstReturnSchema = createInsertSchema(gstReturns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GstReturn = typeof gstReturns.$inferSelect;
export type InsertGstReturn = z.infer<typeof insertGstReturnSchema>;

// Delhivery Configuration - API credentials and settings
export const delhiveryConfig = pgTable("delhivery_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  environment: varchar("environment", { length: 20 }).notNull().default("staging"), // staging, production
  apiToken: text("api_token"), // Encrypted API token
  clientName: varchar("client_name", { length: 100 }), // Delhivery client name
  defaultWarehouse: varchar("default_warehouse", { length: 100 }),
  enableB2c: boolean("enable_b2c").notNull().default(true),
  enableB2b: boolean("enable_b2b").notNull().default(true),
  autoGenerateAwb: boolean("auto_generate_awb").notNull().default(true),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDelhiveryConfigSchema = createInsertSchema(delhiveryConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DelhiveryConfig = typeof delhiveryConfig.$inferSelect;
export type InsertDelhiveryConfig = z.infer<typeof insertDelhiveryConfigSchema>;

// Delhivery Warehouses - Registered pickup locations
export const delhiveryWarehouses = pgTable("delhivery_warehouses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 6 }).notNull(),
  country: varchar("country", { length: 50 }).notNull().default("India"),
  registeredWithDelhivery: boolean("registered_with_delhivery").notNull().default(false),
  delhiveryWarehouseCode: varchar("delhivery_warehouse_code", { length: 100 }),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDelhiveryWarehouseSchema = createInsertSchema(delhiveryWarehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DelhiveryWarehouse = typeof delhiveryWarehouses.$inferSelect;
export type InsertDelhiveryWarehouse = z.infer<typeof insertDelhiveryWarehouseSchema>;

// Delhivery Shipments - B2C and B2B shipments
export const delhiveryShipments = pgTable("delhivery_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  shipmentType: varchar("shipment_type", { length: 10 }).notNull(), // b2c, b2b
  waybillNumber: varchar("waybill_number", { length: 50 }), // AWB for B2C
  lrNumber: varchar("lr_number", { length: 50 }), // LR for B2B
  status: varchar("status", { length: 50 }).notNull().default("created"), // created, manifested, in_transit, out_for_delivery, delivered, cancelled, rto
  
  // Pickup details
  pickupWarehouseId: varchar("pickup_warehouse_id"),
  pickupDate: timestamp("pickup_date"),
  pickupId: varchar("pickup_id", { length: 50 }),
  
  // Delivery details
  consigneeName: varchar("consignee_name", { length: 200 }).notNull(),
  consigneePhone: varchar("consignee_phone", { length: 15 }).notNull(),
  consigneeEmail: varchar("consignee_email", { length: 200 }),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: varchar("delivery_city", { length: 100 }).notNull(),
  deliveryState: varchar("delivery_state", { length: 100 }).notNull(),
  deliveryPincode: varchar("delivery_pincode", { length: 6 }).notNull(),
  
  // Package details
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(), // in kg
  dimensions: jsonb("dimensions"), // {length, breadth, height} in cm
  productDescription: text("product_description"),
  quantity: integer("quantity").notNull().default(1),
  
  // Payment details
  paymentMode: varchar("payment_mode", { length: 20 }).notNull().default("prepaid"), // prepaid, cod
  codAmount: decimal("cod_amount", { precision: 10, scale: 2 }),
  invoiceAmount: decimal("invoice_amount", { precision: 10, scale: 2 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  
  // B2B specific fields
  ewayBillNumber: varchar("eway_bill_number", { length: 20 }),
  gstinSender: varchar("gstin_sender", { length: 15 }),
  gstinReceiver: varchar("gstin_receiver", { length: 15 }),
  invoiceDocument: text("invoice_document"), // base64 or URL
  
  // Tracking
  currentLocation: varchar("current_location", { length: 200 }),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  deliveredAt: timestamp("delivered_at"),
  trackingHistory: jsonb("tracking_history"), // Array of {timestamp, status, location, remarks}
  
  // Shipping cost
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  freightCharges: decimal("freight_charges", { precision: 10, scale: 2 }),
  
  // Label
  labelUrl: text("label_url"),
  
  // Error handling
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDelhiveryShipmentSchema = createInsertSchema(delhiveryShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DelhiveryShipment = typeof delhiveryShipments.$inferSelect;
export type InsertDelhiveryShipment = z.infer<typeof insertDelhiveryShipmentSchema>;

// Wholesale Dealers (WSD) - Salem District Union
export const wholesaleDealers = pgTable("wholesale_dealers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wsdCode: varchar("wsd_code", { length: 20 }).notNull().unique(), // WSD001, WSD002, etc.
  name: text("name").notNull(),
  address: text("address"),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  gstin: varchar("gstin", { length: 15 }),
  location: varchar("location", { length: 100 }),
  districtUnion: varchar("district_union", { length: 100 }).notNull().default("Salem"),
  email: varchar("email", { length: 100 }), // wsdcode@aavincart.com
  passwordHash: text("password_hash").notNull(), // Phone number as password
  pricingTier: varchar("pricing_tier", { length: 50 }).notNull().default("Wholesale Dealer"),
  wsdCategory: varchar("wsd_category", { length: 20 }).notNull().default("Regular"), // Regular or MPCS
  mpcsCode: varchar("mpcs_code", { length: 20 }), // MPCS society code (e.g., ED 1029, SMD 948)
  team: varchar("team", { length: 50 }), // Area team (Valapaddy, Attur, Salem, Mettur)
  contactPerson: varchar("contact_person", { length: 100 }), // Contact person name for MPCS
  hasFreshMilkAccess: boolean("has_fresh_milk_access").notNull().default(false), // Access to both Fresh Milk and Products
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWholesaleDealerSchema = createInsertSchema(wholesaleDealers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WholesaleDealer = typeof wholesaleDealers.$inferSelect;
export type InsertWholesaleDealer = z.infer<typeof insertWholesaleDealerSchema>;

// Fresh Milk Dealers (FMD) - All 27 District Unions
export const freshMilkDealers = pgTable("fresh_milk_dealers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fmdCode: varchar("fmd_code", { length: 20 }).notNull().unique(), // FMD001, FMD002, etc.
  name: text("name").notNull(),
  address: text("address"),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  gstin: varchar("gstin", { length: 15 }),
  location: varchar("location", { length: 100 }),
  districtUnion: varchar("district_union", { length: 100 }).notNull().default("Salem"),
  email: varchar("email", { length: 100 }), // fmdcode@aavincart.com
  passwordHash: text("password_hash").notNull(), // Phone number as password
  pricingTier: varchar("pricing_tier", { length: 50 }).notNull().default("Wholesale Dealer"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFreshMilkDealerSchema = createInsertSchema(freshMilkDealers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FreshMilkDealer = typeof freshMilkDealers.$inferSelect;
export type InsertFreshMilkDealer = z.infer<typeof insertFreshMilkDealerSchema>;

// Media Files for Admin Media Library
export const mediaFiles = pgTable("media_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'image' | 'video' | 'document'
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  url: text("url").notNull(), // Public URL path
  thumbnail: text("thumbnail"), // Thumbnail URL for images/videos
  uploadedBy: text("uploaded_by").notNull(), // Email of uploader
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  createdAt: true,
});

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;

// User Wallet for all users
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // One wallet per user
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transaction History
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'credit' | 'debit'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  previousBalance: decimal("previous_balance", { precision: 12, scale: 2 }).notNull(),
  newBalance: decimal("new_balance", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }), // 'order' | 'refund' | 'razorpay' | 'manual'
  referenceId: varchar("reference_id"), // Order ID, Razorpay payment ID, etc.
  razorpayPaymentId: varchar("razorpay_payment_id"),
  razorpayOrderId: varchar("razorpay_order_id"),
  status: varchar("status", { length: 20 }).notNull().default("completed"), // 'pending' | 'completed' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export type Wallet = typeof wallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

// Delivery Configuration for District Unions
export const deliveryConfiguration = pgTable("delivery_configuration", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  districtUnionId: varchar("district_union_id").notNull().unique(), // One config per District Union
  districtUnionName: text("district_union_name").notNull(),
  
  // Delivery Boy Commission Settings
  deliveryBoyPayType: varchar("delivery_boy_pay_type", { length: 20 }).notNull().default("per_delivery"), // 'per_delivery' | 'per_km'
  perDeliveryRate: decimal("per_delivery_rate", { precision: 8, scale: 2 }).notNull().default("50.00"), // ₹ per delivery
  perKmRate: decimal("per_km_rate", { precision: 8, scale: 2 }).notNull().default("10.00"), // ₹ per km
  minimumDeliveryPay: decimal("minimum_delivery_pay", { precision: 8, scale: 2 }).notNull().default("30.00"), // Minimum pay per delivery
  
  // Transport/Vehicle Settings (for larger deliveries)
  transportPayType: varchar("transport_pay_type", { length: 20 }).notNull().default("per_km"), // 'per_delivery' | 'per_km' | 'fixed_route'
  transportPerKmRate: decimal("transport_per_km_rate", { precision: 8, scale: 2 }).notNull().default("15.00"), // ₹ per km for transport
  transportFixedRouteRate: decimal("transport_fixed_route_rate", { precision: 8, scale: 2 }).notNull().default("500.00"), // Fixed rate per route
  
  // Fuel and Extra Charges
  fuelSurchargePercent: decimal("fuel_surcharge_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  nightDeliveryBonus: decimal("night_delivery_bonus", { precision: 8, scale: 2 }).notNull().default("20.00"), // Extra pay for night deliveries
  holidayBonus: decimal("holiday_bonus", { precision: 8, scale: 2 }).notNull().default("50.00"), // Extra pay on holidays
  
  // Segment-specific rates (Fresh Milk vs Products vs Ice Cream)
  freshMilkDeliveryRate: decimal("fresh_milk_delivery_rate", { precision: 8, scale: 2 }), // Optional override for Fresh Milk
  productsDeliveryRate: decimal("products_delivery_rate", { precision: 8, scale: 2 }), // Optional override for Products
  iceCreamDeliveryRate: decimal("ice_cream_delivery_rate", { precision: 8, scale: 2 }), // Optional override for Ice Cream
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeliveryConfigurationSchema = createInsertSchema(deliveryConfiguration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeliveryConfiguration = typeof deliveryConfiguration.$inferSelect;
export type InsertDeliveryConfiguration = z.infer<typeof insertDeliveryConfigurationSchema>;

// Delivery Routes for Route Optimization
export const deliveryRoutes = pgTable("delivery_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  districtUnionId: varchar("district_union_id").notNull(),
  segment: varchar("segment", { length: 50 }).notNull(), // 'Fresh Milk' | 'Products' | 'Ice Cream'
  
  // Route details
  routeDate: timestamp("route_date").notNull(),
  startLocation: text("start_location").notNull(), // Driver's starting point
  startLatitude: decimal("start_latitude", { precision: 10, scale: 7 }),
  startLongitude: decimal("start_longitude", { precision: 10, scale: 7 }),
  
  // Optimized delivery sequence
  deliverySequence: jsonb("delivery_sequence").notNull(), // Array of {orderId, sequence, address, latitude, longitude, distanceFromPrevious, estimatedTime}
  totalOrders: integer("total_orders").notNull().default(0),
  totalDistanceKm: decimal("total_distance_km", { precision: 10, scale: 2 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  
  // Completion tracking
  status: varchar("status", { length: 20 }).notNull().default("planned"), // 'planned' | 'in_progress' | 'completed'
  completedOrders: integer("completed_orders").notNull().default(0),
  actualDurationMinutes: integer("actual_duration_minutes"),
  
  // Earnings calculation
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // 'pending' | 'processed' | 'paid'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;

// Delivery Earnings for drivers
export const deliveryEarnings = pgTable("delivery_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  routeId: varchar("route_id"),
  orderId: varchar("order_id"),
  
  // Earning details
  earningType: varchar("earning_type", { length: 20 }).notNull(), // 'per_delivery' | 'per_km' | 'bonus'
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment tracking
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // 'pending' | 'processed' | 'paid'
  paidAt: timestamp("paid_at"),
  paymentReference: varchar("payment_reference"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryEarningsSchema = createInsertSchema(deliveryEarnings).omit({
  id: true,
  createdAt: true,
});

export type DeliveryEarnings = typeof deliveryEarnings.$inferSelect;
export type InsertDeliveryEarnings = z.infer<typeof insertDeliveryEarningsSchema>;

// Union Staff Hierarchy - District Union employees with self-registration
export const MMO_OFFICES = [
  { id: 'head_office', name: 'Head Office' },
  { id: 'city_mmo', name: 'City MMO' },
  { id: 'mettur_mmo', name: 'Mettur MMO' },
  { id: 'edappadi_mmo', name: 'Edappadi MMO' },
] as const;

export const UNION_STAFF_DEPARTMENTS = [
  { id: 'top_management', name: 'Top Management' },
  { id: 'operations', name: 'Operations / Production' },
  { id: 'procurement', name: 'Procurement (Milk)' },
  { id: 'engineering', name: 'Engineering / Plant' },
  { id: 'admin_hr', name: 'Administration / HR' },
  { id: 'finance', name: 'Finance & Accounts' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'production', name: 'Production' },
  { id: 'packing', name: 'Packing' },
  { id: 'delivery', name: 'Delivery / Transport' },
  { id: 'supervisory', name: 'Supervisory Staff' },
  { id: 'plant_dairy', name: 'Plant / Dairy Operations' },
  { id: 'logistics', name: 'Logistics' },
  { id: 'sales_ground', name: 'Sales (Ground Level)' },
  { id: 'office_support', name: 'Office Support' },
] as const;

export const UNION_STAFF_DESIGNATIONS = {
  // Top Management (Level 1)
  top_management: [
    { 
      id: 'gm', 
      name: 'General Manager (GM)', 
      level: 1, 
      accessTier: 'full',
      salesSegment: 'all_access',
      responsibilities: [
        'Overall marketing strategy & business growth',
        'Policy decisions and approvals',
        'Coordination with Aavin Federation / District Unions',
        'Budget planning & performance review',
        'Final authority on marketing operations'
      ],
      moduleAccess: { orders: 'full', reports: 'full', payments: 'full', users: 'full' }
    },
  ],
  // Second Level - Department Heads (Level 2)
  operations: [
    { id: 'dgm_operations', name: 'Deputy General Manager (DGM) – Operations', level: 2, accessTier: 'department_head' },
    { id: 'manager_production', name: 'Manager (Dairy / Production)', level: 3, accessTier: 'manager' },
    { id: 'am_production', name: 'Assistant Manager (AM – Production)', level: 3, accessTier: 'manager' },
    { id: 'qco', name: 'Quality Control Officer (QCO)', level: 3, accessTier: 'manager' },
    { id: 'lab_chemist', name: 'Lab Chemist / Microbiologist', level: 3, accessTier: 'staff' },
  ],
  procurement: [
    { id: 'dgm_procurement', name: 'Deputy General Manager (DGM) – Procurement', level: 2, accessTier: 'department_head' },
    { id: 'manager_procurement', name: 'Manager (Procurement)', level: 3, accessTier: 'manager' },
    { id: 'am_procurement', name: 'Assistant Manager (Procurement)', level: 3, accessTier: 'manager' },
    { id: 'field_officer', name: 'Field Officer', level: 4, accessTier: 'staff' },
    { id: 'extension_officer', name: 'Extension Officer', level: 4, accessTier: 'staff' },
    { id: 'society_supervisor', name: 'Society Supervisor', level: 4, accessTier: 'staff' },
  ],
  engineering: [
    { id: 'dgm_engineering', name: 'Deputy General Manager (DGM) – Engineering', level: 2, accessTier: 'department_head' },
    { id: 'manager_engineering', name: 'Manager (Engineering)', level: 3, accessTier: 'manager' },
    { id: 'asst_engineer', name: 'Assistant Engineer', level: 4, accessTier: 'staff' },
    { id: 'jr_engineer', name: 'Junior Engineer', level: 4, accessTier: 'staff' },
    { id: 'electrician', name: 'Electrician / Mechanic / Fitter', level: 5, accessTier: 'operational' },
  ],
  admin_hr: [
    { id: 'dgm_admin', name: 'Deputy General Manager (DGM) – Administration', level: 2, accessTier: 'department_head' },
    { id: 'manager_hr', name: 'Manager (HR/Admin)', level: 3, accessTier: 'manager' },
    { id: 'am_hr', name: 'Assistant Manager (HR)', level: 3, accessTier: 'manager' },
    { id: 'superintendent', name: 'Superintendent', level: 4, accessTier: 'staff' },
    { id: 'office_superintendent', name: 'Office Superintendent', level: 4, accessTier: 'staff' },
  ],
  finance: [
    { id: 'dgm_finance', name: 'Deputy General Manager (DGM) – Finance & Accounts', level: 2, accessTier: 'department_head' },
    { id: 'manager_accounts', name: 'Manager (Accounts)', level: 3, accessTier: 'manager' },
    { id: 'am_accounts', name: 'Assistant Manager (Accounts)', level: 3, accessTier: 'manager' },
    { id: 'accounts_officer', name: 'Accounts Officer', level: 4, accessTier: 'staff' },
    { id: 'audit_officer', name: 'Audit Officer', level: 4, accessTier: 'staff' },
    { id: 'cashier', name: 'Cashier', level: 5, accessTier: 'operational' },
  ],
  marketing: [
    { id: 'agm_marketing', name: 'Assistant General Manager – Marketing (AGM)', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'view_approve', users: 'approve' } },
    { id: 'manager_marketing', name: 'Manager – Marketing', level: 2, accessTier: 'department_head',
      moduleAccess: { orders: 'create_edit', reports: 'full', payments: 'view', users: 'view_team' } },
    { id: 'deputy_manager_marketing', name: 'Deputy Manager – Marketing', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'create_edit', reports: 'view', payments: 'view', users: 'none' } },
    { id: 'segment_mgr_marketing_fm', name: 'Segment Manager – FM (Marketing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_marketing_dp', name: 'Segment Manager – DP (Marketing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_marketing_ic', name: 'Segment Manager – IC (Marketing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'marketing_executive', name: 'Marketing Executive', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'data_entry_operator', name: 'Data Entry Operator', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view_entry', reports: 'view', payments: 'none', users: 'none' } },
  ],
  production: [
    { id: 'agm_production', name: 'Assistant General Manager – Production (AGM)', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'view_approve', users: 'approve' } },
    { id: 'manager_production_team', name: 'Manager – Production', level: 2, accessTier: 'department_head',
      moduleAccess: { orders: 'create_edit', reports: 'full', payments: 'view', users: 'view_team' } },
    { id: 'deputy_manager_production', name: 'Deputy Manager – Production', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'create_edit', reports: 'view', payments: 'view', users: 'none' } },
    { id: 'segment_mgr_production_fm', name: 'Segment Manager – FM (Production)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_production_dp', name: 'Segment Manager – DP (Production)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_production_ic', name: 'Segment Manager – IC (Production)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'production_executive', name: 'Production Executive', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
  ],
  packing: [
    { id: 'agm_packing', name: 'Assistant General Manager – Packing (AGM)', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'view_approve', users: 'approve' } },
    { id: 'manager_packing', name: 'Manager – Packing', level: 2, accessTier: 'department_head',
      moduleAccess: { orders: 'create_edit', reports: 'full', payments: 'view', users: 'view_team' } },
    { id: 'deputy_manager_packing', name: 'Deputy Manager – Packing', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'create_edit', reports: 'view', payments: 'view', users: 'none' } },
    { id: 'segment_mgr_packing_fm', name: 'Segment Manager – FM (Packing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_packing_dp', name: 'Segment Manager – DP (Packing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'segment_mgr_packing_ic', name: 'Segment Manager – IC (Packing)', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'packing_executive', name: 'Packing Executive', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
  ],
  delivery: [
    { id: 'gm_transport', name: 'General Manager – Transport (GM)', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'full', users: 'full' } },
    { id: 'agm_transport', name: 'Assistant General Manager – Transport (AGM)', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'view_approve', users: 'approve' } },
    { id: 'transport_manager', name: 'Transport Manager', level: 1, accessTier: 'full',
      moduleAccess: { orders: 'full', reports: 'full', payments: 'view', users: 'approve' } },
    { id: 'dgm_transport', name: 'Deputy General Manager – Transport (DGM)', level: 2, accessTier: 'department_head',
      moduleAccess: { orders: 'create_edit', reports: 'full', payments: 'view', users: 'view_team' } },
    { id: 'manager_transport', name: 'Manager – Transport', level: 2, accessTier: 'department_head',
      moduleAccess: { orders: 'create_edit', reports: 'full', payments: 'view', users: 'view_team' } },
    { id: 'segment_mgr_delivery_fm', name: 'Segment Manager – FM (Delivery)', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'view_team' } },
    { id: 'segment_mgr_delivery_dp', name: 'Segment Manager – DP (Delivery)', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'view_team' } },
    { id: 'segment_mgr_delivery_ic', name: 'Segment Manager – IC (Delivery)', level: 2, accessTier: 'manager',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'view_team' } },
    { id: 'deputy_manager_transport', name: 'Deputy Manager – Transport', level: 3, accessTier: 'manager',
      moduleAccess: { orders: 'create_edit', reports: 'view', payments: 'view', users: 'none' } },
    { id: 'route_planner', name: 'Route Planner', level: 3, accessTier: 'manager',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'delivery_partner', name: 'Delivery Partner', level: 3, accessTier: 'staff',
      moduleAccess: { orders: 'view_assigned', reports: 'none', payments: 'none', users: 'none' } },
    { id: 'transport_supervisor', name: 'Transport Supervisor', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'fleet_coordinator', name: 'Fleet Coordinator', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'logistics_coordinator', name: 'Logistics Coordinator', level: 4, accessTier: 'staff',
      moduleAccess: { orders: 'view_process', reports: 'view', payments: 'none', users: 'none' } },
    { id: 'transport_driver', name: 'Driver', level: 5, accessTier: 'operational' },
    { id: 'transport_helper', name: 'Helper', level: 5, accessTier: 'operational' },
  ],
  supervisory: [
    { id: 'sr_supervisor', name: 'Senior Supervisor', level: 4, accessTier: 'staff' },
    { id: 'supervisor', name: 'Supervisor', level: 4, accessTier: 'staff' },
    { id: 'sr_assistant', name: 'Senior Assistant', level: 5, accessTier: 'operational' },
    { id: 'jr_assistant', name: 'Junior Assistant', level: 5, accessTier: 'operational' },
    { id: 'clerk_typist', name: 'Clerk / Typist', level: 5, accessTier: 'operational' },
    { id: 'store_keeper', name: 'Store Keeper', level: 5, accessTier: 'operational' },
    { id: 'time_keeper', name: 'Time Keeper', level: 5, accessTier: 'operational' },
  ],
  plant_dairy: [
    { id: 'boiler_operator', name: 'Boiler Operator', level: 5, accessTier: 'operational' },
    { id: 'pasteurizer_operator', name: 'Pasteurizer Operator', level: 5, accessTier: 'operational' },
    { id: 'packing_operator', name: 'Packing Machine Operator', level: 5, accessTier: 'operational' },
    { id: 'chilling_operator', name: 'Chilling Plant Operator', level: 5, accessTier: 'operational' },
    { id: 'lab_attender', name: 'Lab Attender', level: 5, accessTier: 'operational' },
  ],
  logistics: [
    { id: 'driver', name: 'Driver', level: 5, accessTier: 'operational' },
    { id: 'helper', name: 'Helper', level: 5, accessTier: 'operational' },
    { id: 'loader', name: 'Loader / Unloader', level: 5, accessTier: 'operational' },
  ],
  sales_ground: [
    { id: 'salesman', name: 'Salesman', level: 5, accessTier: 'operational' },
    { id: 'van_assistant', name: 'Van Assistant', level: 5, accessTier: 'operational' },
    { id: 'parlour_operator', name: 'Parlour Operator', level: 5, accessTier: 'operational' },
  ],
  office_support: [
    { id: 'record_clerk', name: 'Record Clerk', level: 5, accessTier: 'operational' },
    { id: 'attender', name: 'Attender', level: 5, accessTier: 'operational' },
    { id: 'watchman', name: 'Watchman', level: 5, accessTier: 'operational' },
    { id: 'security', name: 'Security', level: 5, accessTier: 'operational' },
    { id: 'housekeeping', name: 'Housekeeping', level: 5, accessTier: 'operational' },
  ],
} as const;

// Access tiers determine what each staff member can see/do
export const UNION_STAFF_ACCESS_TIERS = {
  full: { label: 'Full Access', description: 'Complete access to all Union functions', permissions: ['*'] },
  department_head: { label: 'Department Head', description: 'Full department access + reporting', permissions: ['dashboard', 'orders_view', 'orders_manage', 'reports_view', 'inventory', 'subusers_manage'] },
  manager: { label: 'Manager', description: 'Department management + team oversight', permissions: ['dashboard', 'orders_view', 'orders_manage', 'reports_view', 'inventory'] },
  staff: { label: 'Staff', description: 'View orders and basic operations', permissions: ['dashboard', 'orders_view', 'reports_view'] },
  operational: { label: 'Operational', description: 'View-only access to relevant data', permissions: ['dashboard'] },
} as const;

// Backend-defined staff feature permissions (manually assigned by admins)
export const STAFF_FEATURE_PERMISSIONS = {
  // POS Access with pricing tier permissions
  pos_access: {
    key: 'pos_access',
    label: 'POS Access',
    description: 'Access to Point of Sale system',
    category: 'sales',
  },
  pos_counter_sale: {
    key: 'pos_counter_sale',
    label: 'Counter Sale (MRP)',
    description: 'Sell at MRP to walk-in consumers',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_tier_federation: {
    key: 'pos_tier_federation',
    label: 'Federation Pricing (45%)',
    description: 'Sell at Federation pricing tier',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_tier_inter_union: {
    key: 'pos_tier_inter_union',
    label: 'Inter-Union Pricing (55%)',
    description: 'Sell at Inter-Union pricing tier',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_tier_wholesale: {
    key: 'pos_tier_wholesale',
    label: 'Wholesale Dealer Pricing (65%)',
    description: 'Sell at Wholesale Dealer pricing tier',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_tier_dealer: {
    key: 'pos_tier_dealer',
    label: 'Dealer Pricing (85%)',
    description: 'Sell at Dealer pricing tier',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_tier_retailer: {
    key: 'pos_tier_retailer',
    label: 'Retailer Pricing (90%)',
    description: 'Sell at Retailer pricing tier',
    category: 'sales',
    parent: 'pos_access',
  },
  pos_credit_sales: {
    key: 'pos_credit_sales',
    label: 'Credit Sales',
    description: 'Allow credit sales for B2B customers',
    category: 'sales',
    parent: 'pos_access',
  },
  
  // B2B Invoice with pricing tier permissions
  b2b_invoice: {
    key: 'b2b_invoice',
    label: 'Create B2B Invoice',
    description: 'Create B2B invoices for business customers',
    category: 'invoicing',
  },
  b2b_invoice_federation: {
    key: 'b2b_invoice_federation',
    label: 'Federation Pricing (50%)',
    description: 'Create invoices at Federation pricing tier',
    category: 'invoicing',
    parent: 'b2b_invoice',
  },
  b2b_invoice_inter_union: {
    key: 'b2b_invoice_inter_union',
    label: 'Inter-Union Pricing (55%)',
    description: 'Create invoices at Inter-Union pricing tier',
    category: 'invoicing',
    parent: 'b2b_invoice',
  },
  b2b_invoice_wholesale: {
    key: 'b2b_invoice_wholesale',
    label: 'Wholesale Dealer Pricing (65%)',
    description: 'Create invoices at Wholesale Dealer pricing tier',
    category: 'invoicing',
    parent: 'b2b_invoice',
  },
  b2b_invoice_dealer: {
    key: 'b2b_invoice_dealer',
    label: 'Dealer Pricing (85%)',
    description: 'Create invoices at Dealer pricing tier',
    category: 'invoicing',
    parent: 'b2b_invoice',
  },
  b2b_invoice_retailer: {
    key: 'b2b_invoice_retailer',
    label: 'Retailer Pricing',
    description: 'Create invoices at Retailer pricing tier',
    category: 'invoicing',
    parent: 'b2b_invoice',
  },
  
  // E-way Bill Access
  eway_bill_access: {
    key: 'eway_bill_access',
    label: 'E-way Bill Access',
    description: 'Generate and manage E-way bills',
    category: 'compliance',
  },
  eway_bill_generate: {
    key: 'eway_bill_generate',
    label: 'Generate E-way Bills',
    description: 'Create new E-way bills',
    category: 'compliance',
    parent: 'eway_bill_access',
  },
  eway_bill_cancel: {
    key: 'eway_bill_cancel',
    label: 'Cancel E-way Bills',
    description: 'Cancel existing E-way bills',
    category: 'compliance',
    parent: 'eway_bill_access',
  },
  eway_bill_extend: {
    key: 'eway_bill_extend',
    label: 'Extend E-way Bill Validity',
    description: 'Extend validity of E-way bills',
    category: 'compliance',
    parent: 'eway_bill_access',
  },
  
  // GST Details
  gst_details: {
    key: 'gst_details',
    label: 'GST Details Access',
    description: 'View and manage GST information',
    category: 'compliance',
  },
  gst_returns_view: {
    key: 'gst_returns_view',
    label: 'View GST Returns',
    description: 'View GSTR-1 and other returns',
    category: 'compliance',
    parent: 'gst_details',
  },
  gst_returns_generate: {
    key: 'gst_returns_generate',
    label: 'Generate GST Returns',
    description: 'Generate GSTR-1 files for filing',
    category: 'compliance',
    parent: 'gst_details',
  },

  // Segment Workflow Management
  workflow_manage: {
    key: 'workflow_manage',
    label: 'Order Workflow Management',
    description: 'Manage segment order workflow pipeline',
    category: 'workflow',
  },
  workflow_fm_review: {
    key: 'workflow_fm_review',
    label: 'Fresh Milk – Manager Review',
    description: 'Review and approve Fresh Milk segment orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_fm_packing: {
    key: 'workflow_fm_packing',
    label: 'Fresh Milk – Packing',
    description: 'Manage packing stage for Fresh Milk orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_fm_delivery: {
    key: 'workflow_fm_delivery',
    label: 'Fresh Milk – Delivery',
    description: 'Manage delivery and confirm Fresh Milk orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_fm_production: {
    key: 'workflow_fm_production',
    label: 'Fresh Milk – Production',
    description: 'Manage production stage for Fresh Milk orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_dp_review: {
    key: 'workflow_dp_review',
    label: 'Dairy Products – Marketing Review',
    description: 'Review and approve Dairy Products segment orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_dp_production: {
    key: 'workflow_dp_production',
    label: 'Dairy Products – Production',
    description: 'Manage production stage for Dairy Products orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_dp_packing: {
    key: 'workflow_dp_packing',
    label: 'Dairy Products – Packing',
    description: 'Manage packing stage for Dairy Products orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_dp_delivery: {
    key: 'workflow_dp_delivery',
    label: 'Dairy Products – Delivery',
    description: 'Manage delivery and confirm Dairy Products orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_ic_review: {
    key: 'workflow_ic_review',
    label: 'Ice Cream – Marketing Review',
    description: 'Review and approve Ice Cream segment orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_ic_production: {
    key: 'workflow_ic_production',
    label: 'Ice Cream – Production',
    description: 'Manage production stage for Ice Cream orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_ic_packing: {
    key: 'workflow_ic_packing',
    label: 'Ice Cream – Packing',
    description: 'Manage packing stage for Ice Cream orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },
  workflow_ic_delivery: {
    key: 'workflow_ic_delivery',
    label: 'Ice Cream – Delivery',
    description: 'Manage delivery and confirm Ice Cream orders',
    category: 'workflow',
    parent: 'workflow_manage',
  },

  dms_access: {
    key: 'dms_access',
    label: 'DMS Access',
    description: 'Access to Distribution Management System',
    category: 'dms',
  },
  dms_inventory: {
    key: 'dms_inventory',
    label: 'Inventory & Batches',
    description: 'View and manage batch-wise inventory',
    category: 'dms',
    parent: 'dms_access',
  },
  dms_grn: {
    key: 'dms_grn',
    label: 'Goods Receipt Notes',
    description: 'Create and manage GRN entries',
    category: 'dms',
    parent: 'dms_access',
  },
  dms_sales_returns: {
    key: 'dms_sales_returns',
    label: 'Sales Returns',
    description: 'Process and manage sales returns',
    category: 'dms',
    parent: 'dms_access',
  },
  dms_collections: {
    key: 'dms_collections',
    label: 'Collections & Outstanding',
    description: 'Manage collections and outstanding ledger',
    category: 'dms',
    parent: 'dms_access',
  },
  dms_schemes: {
    key: 'dms_schemes',
    label: 'Schemes & Promotions',
    description: 'Manage promotional schemes',
    category: 'dms',
    parent: 'dms_access',
  },
  dms_sfa: {
    key: 'dms_sfa',
    label: 'Sales Force Automation',
    description: 'Manage SFA activities and field visits',
    category: 'dms',
    parent: 'dms_access',
  },

  transport_access: {
    key: 'transport_access',
    label: 'Transport Management Access',
    description: 'Access to Transport Management module',
    category: 'transport',
  },
  transport_dashboard: {
    key: 'transport_dashboard',
    label: 'Transport Dashboard',
    description: 'View transport dashboard and KPIs',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_hubs: {
    key: 'transport_hubs',
    label: 'Manage Hubs',
    description: 'Create and manage transport hubs',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_trips: {
    key: 'transport_trips',
    label: 'Trip Sheet Management',
    description: 'Create and manage trip sheets',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_vehicles: {
    key: 'transport_vehicles',
    label: 'Fleet Management',
    description: 'Manage vehicles and fleet',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_route_optimization: {
    key: 'transport_route_optimization',
    label: 'Route Optimization',
    description: 'Run route optimization pipeline',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_live_tracking: {
    key: 'transport_live_tracking',
    label: 'Live Tracking',
    description: 'View live vehicle tracking and GPS data',
    category: 'transport',
    parent: 'transport_access',
  },
  transport_driver_management: {
    key: 'transport_driver_management',
    label: 'Driver Management',
    description: 'Manage driver accounts and credentials',
    category: 'transport',
    parent: 'transport_access',
  },
} as const;

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  sales: { label: 'Sales & POS', order: 1 },
  invoicing: { label: 'B2B Invoicing', order: 2 },
  compliance: { label: 'Compliance (E-way Bill & GST)', order: 3 },
  workflow: { label: 'Segment Order Workflow', order: 4 },
  dms: { label: 'Distribution Management (DMS)', order: 5 },
  transport: { label: 'Transport Management', order: 6 },
} as const;

// Maps segment suffix → workflow stage → required permission key
export const SEGMENT_WORKFLOW_PERMISSIONS = {
  FM: { marketing_approved: 'workflow_fm_review', assigned_to_delivery: 'workflow_fm_delivery', out_for_delivery: 'workflow_fm_delivery', delivered: 'workflow_fm_delivery' },
  DP: { marketing_approved: 'workflow_dp_review', assigned_to_delivery: 'workflow_dp_delivery', out_for_delivery: 'workflow_dp_delivery', delivered: 'workflow_dp_delivery' },
  IC: { marketing_approved: 'workflow_ic_review', assigned_to_delivery: 'workflow_ic_delivery', out_for_delivery: 'workflow_ic_delivery', delivered: 'workflow_ic_delivery' },
} as const;

// All valid segments for workflow assignment
export const WORKFLOW_SEGMENTS = [
  { id: 'FM', label: 'Fresh Milk', color: 'blue' },
  { id: 'DP', label: 'Dairy Products', color: 'amber' },
  { id: 'IC', label: 'Ice Cream', color: 'pink' },
] as const;

export const SEGMENT_WORKFLOW_DESIGNATION_IDS = [
  'segment_mgr_marketing_fm', 'segment_mgr_marketing_dp', 'segment_mgr_marketing_ic',
  'segment_mgr_delivery_fm', 'segment_mgr_delivery_dp', 'segment_mgr_delivery_ic',
  'delivery_partner',
] as const;

export const ORDER_WORKFLOW_STAGES = [
  { id: 'pending', label: 'Order Placed', team: null },
  { id: 'marketing_approved', label: 'Marketing Approved', team: 'marketing' },
  { id: 'assigned_to_delivery', label: 'Assigned to Delivery', team: 'delivery' },
  { id: 'out_for_delivery', label: 'Out for Delivery', team: 'delivery' },
  { id: 'delivered', label: 'Delivered', team: 'delivery' },
  { id: 'customer_acknowledged', label: 'Customer Acknowledged', team: null },
] as const;

export function isSegmentWorkflowDesignation(designationId: string): boolean {
  return (SEGMENT_WORKFLOW_DESIGNATION_IDS as readonly string[]).includes(designationId);
}

export function getWorkflowTeam(designationId: string): string | null {
  if (designationId.includes('marketing')) return 'marketing';
  if (designationId.includes('production')) return 'production';
  if (designationId.includes('packing')) return 'packing';
  if (designationId.includes('delivery') || designationId === 'delivery_partner' || designationId === 'transport_manager') return 'delivery';
  return null;
}

export function getWorkflowRole(designationId: string): string | null {
  const team = getWorkflowTeam(designationId);
  if (team === 'marketing') return 'marketing';
  if (team === 'production') return 'production';
  if (team === 'packing') return 'packing';
  if (team === 'delivery') return 'delivery';
  return null;
}

export function buildWorkflowPermissions(designationId: string, segments: string[]): string[] {
  const team = getWorkflowTeam(designationId);
  if (!team || segments.length === 0) return [];

  const perms: string[] = [];
  perms.push('workflow_manage');
  for (const seg of segments) {
    const segKey = seg.toLowerCase();
    if (team === 'marketing') {
      perms.push(`workflow_${segKey}_review`);
    } else if (team === 'production') {
      perms.push(`workflow_${segKey}_production`);
    } else if (team === 'packing') {
      perms.push(`workflow_${segKey}_packing`);
    } else if (team === 'delivery') {
      perms.push(`workflow_${segKey}_delivery`);
    }
  }
  return [...new Set(perms)];
}

// Helper function to get designation details by ID
export function getDesignationById(designationId: string): {
  id: string;
  name: string;
  level: number;
  accessTier: string;
  salesSegment?: string;
  responsibilities?: readonly string[];
  moduleAccess?: { orders: string; reports: string; payments: string; users: string };
} | null {
  for (const [, designations] of Object.entries(UNION_STAFF_DESIGNATIONS)) {
    const found = (designations as readonly unknown[]).find((d: unknown) => (d as { id: string }).id === designationId);
    if (found) return found as {
      id: string;
      name: string;
      level: number;
      accessTier: string;
      salesSegment?: string;
      responsibilities?: readonly string[];
      moduleAccess?: { orders: string; reports: string; payments: string; users: string };
    };
  }
  return null;
}

// Module access levels for display
export const MODULE_ACCESS_LABELS = {
  orders: {
    full: 'Full Access (View, Create, Edit, Delete, Approve)',
    create_edit: 'Create & Edit Orders',
    view_process: 'View & Process Orders',
    view_entry: 'View & Data Entry',
    view_stock: 'View Stock Orders Only',
    view_assigned: 'View Assigned Only',
    view: 'View Only',
    none: 'No Access',
  },
  reports: {
    full: 'Full Access (View, Create, Export)',
    create: 'View & Create Reports',
    view: 'View Only',
    none: 'No Access',
  },
  payments: {
    full: 'Full Access (View, Record, Approve)',
    view_approve: 'View & Approve Payments',
    view: 'View Only',
    none: 'No Access',
  },
  users: {
    full: 'Full Access (Manage All Users)',
    approve: 'Approve Staff Registrations',
    view_team: 'View Team Members',
    none: 'No Access',
  },
} as const;

// Union Staff table for self-registration with approval workflow
export const unionStaff = pgTable("union_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id").notNull(), // Links to District Union (merchant ID)
  
  // Personal Information
  name: text("name").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  email: varchar("email", { length: 100 }),
  employeeId: varchar("employee_id", { length: 50 }), // Official employee ID if any
  
  // Department and Designation (from hierarchy)
  department: varchar("department", { length: 50 }).notNull(),
  designation: varchar("designation", { length: 100 }).notNull(),
  designationId: varchar("designation_id", { length: 50 }).notNull(),
  level: integer("level").notNull().default(5), // 1=Top, 2=DGM, 3=Manager, 4=Staff, 5=Operational
  accessTier: varchar("access_tier", { length: 30 }).notNull().default("operational"),
  
  // Custom permissions (optional override)
  permissions: jsonb("permissions").$type<string[]>().default([]),
  
  // Sales Segment - determines which customer types this staff can bill
  // federation_interunion: Federation & Inter-Union customers
  // wsd_dealer: Wholesale Dealers & Dealers
  // retail_parlour: Retailers, Mobile Sales, Parlours
  // ncdfi_bulk: NCDFI Bulk orders (price finalized later)
  // icecream_wsd: Ice Cream - WSD customers
  // icecream_dlr: Ice Cream - Dealer customers
  // icecream_retail: Ice Cream - Retail/Parlour customers
  // all_access: Can bill all customer types
  salesSegment: varchar("sales_segment", { length: 50 }).default("all_access"),
  
  // Authentication
  username: varchar("username", { length: 50 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by"), // ID of staff who approved
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Assigned segments for segment workflow staff (FM, DP, IC)
  assignedSegments: jsonb("assigned_segments").$type<string[]>().default([]),
  
  // MMO Office assignment — stores JSON array of office names, e.g. '["City MMO","Mettur MMO"]'
  assignedOffice: text("assigned_office"),
  
  // Transfer history
  transferHistory: jsonb("transfer_history").$type<Array<{fromUnionId: string; toUnionId: string; transferDate: string; transferredBy: string; reason: string}>>().default([]),

  // Monthly free milk entitlement override (null = use union default)
  monthlyEntitlementLiters: decimal("monthly_entitlement_liters", { precision: 8, scale: 2 }),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUnionStaffSchema = createInsertSchema(unionStaff).omit({
  id: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export type UnionStaff = typeof unionStaff.$inferSelect;
export type InsertUnionStaff = z.infer<typeof insertUnionStaffSchema>;

// Daily Indents for Institution credit orders
export const dailyIndents = pgTable("daily_indents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Institution customer info
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  institutionType: varchar("institution_type", { length: 100 }),
  // Delivery details
  deliveryDate: timestamp("delivery_date").notNull(), // Date for which indent is placed
  deliveryAddress: text("delivery_address"),
  deliveryInstructions: text("delivery_instructions"),
  // Items in indent
  items: jsonb("items").notNull(), // Array of {itemId, name, quantity, price, hsnCode, gstPercent, segment}
  // Segment splitting
  productSegment: varchar("product_segment", { length: 50 }).default("Products"), // 'Fresh Milk' | 'Products' | 'Ice Cream'
  // Pricing (always MRP for institutions)
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  // MMO office assignment
  mmoOffice: varchar("mmo_office", { length: 50 }), // City, Mettur, Edappadi
  // Status workflow: pending -> approved -> dispatched -> delivered / rejected
  status: varchar("status", { length: 50 }).default("pending"),
  processedBy: varchar("processed_by"), // Staff ID who processed
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  // Conversion to order
  orderId: varchar("order_id"), // Links to orders table when approved and converted
  // Union tracking
  unionId: varchar("union_id"),
  // Timestamps
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDailyIndentSchema = createInsertSchema(dailyIndents).omit({
  id: true,
  processedBy: true,
  processedAt: true,
  rejectionReason: true,
  orderId: true,
  submittedAt: true,
  updatedAt: true,
});

export type DailyIndent = typeof dailyIndents.$inferSelect;
export type InsertDailyIndent = z.infer<typeof insertDailyIndentSchema>;

// Google Maps & API Settings
export const apiSettings = pgTable("api_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  provider: varchar("provider", { length: 100 }).notNull(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  apiKey: text("api_key"),
  enabled: boolean("enabled").default(false),
  config: jsonb("config"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const insertApiSettingSchema = createInsertSchema(apiSettings).omit({
  id: true,
  updatedAt: true,
});

export type ApiSetting = typeof apiSettings.$inferSelect;
export type InsertApiSetting = z.infer<typeof insertApiSettingSchema>;

export const fcmDeviceTokens = pgTable("fcm_device_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").notNull().unique(),
  userId: varchar("user_id", { length: 255 }),
  role: varchar("role", { length: 100 }),
  merchantId: varchar("merchant_id", { length: 255 }),
  platform: varchar("platform", { length: 50 }).default('web'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFcmDeviceTokenSchema = createInsertSchema(fcmDeviceTokens).omit({
  id: true,
  updatedAt: true,
});

export type FcmDeviceToken = typeof fcmDeviceTokens.$inferSelect;
export type InsertFcmDeviceToken = z.infer<typeof insertFcmDeviceTokenSchema>;

export const userHierarchy = pgTable("user_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull(),
  parentRole: varchar("parent_role", { length: 50 }).notNull(),
  parentEmail: varchar("parent_email", { length: 255 }).notNull(),
  parentName: text("parent_name"),
  childId: varchar("child_id").notNull(),
  childRole: varchar("child_role", { length: 50 }).notNull(),
  childEmail: varchar("child_email", { length: 255 }).notNull(),
  childName: text("child_name"),
  childPhone: varchar("child_phone", { length: 20 }),
  childAddress: text("child_address"),
  childGstin: varchar("child_gstin", { length: 15 }),
  childBusinessName: text("child_business_name"),
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"),
  pricingTier: varchar("pricing_tier", { length: 50 }).notNull().default("MRP"),
  freshMilkApproved: boolean("fresh_milk_approved").notNull().default(false),
  productsApproved: boolean("products_approved").notNull().default(false),
  iceCreamApproved: boolean("ice_cream_approved").notNull().default(false),
  freshMilkPricingRole: varchar("fresh_milk_pricing_role", { length: 50 }).default("MRP"),
  productsPricingRole: varchar("products_pricing_role", { length: 50 }).default("MRP"),
  iceCreamPricingRole: varchar("ice_cream_pricing_role", { length: 50 }).default("MRP"),
  districtUnion: varchar("district_union", { length: 100 }),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }),
  rejectedReason: text("rejected_reason"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserHierarchySchema = createInsertSchema(userHierarchy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserHierarchy = typeof userHierarchy.$inferSelect;
export type InsertUserHierarchy = z.infer<typeof insertUserHierarchySchema>;

export const b2bRegistrations = pgTable("b2b_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role", { length: 50 }).notNull(),
  district: varchar("district", { length: 100 }),
  districtUnion: varchar("district_union", { length: 100 }),
  office: varchar("office", { length: 100 }),
  businessType: varchar("business_type", { length: 50 }),
  businessTypeCode: varchar("business_type_code", { length: 10 }),
  businessRoute: varchar("business_route", { length: 200 }),
  businessPoint: varchar("business_point", { length: 200 }),
  businessCode: varchar("business_code", { length: 50 }),
  businessName: text("business_name").notNull(),
  address: text("address"),
  addressLat: varchar("address_lat", { length: 20 }),
  addressLng: varchar("address_lng", { length: 20 }),
  contactName: text("contact_name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  mobile2: varchar("mobile2", { length: 20 }),
  gstin: varchar("gstin", { length: 15 }),
  panNumber: varchar("pan_number", { length: 10 }),
  fssaiLicense: varchar("fssai_license", { length: 30 }),
  msmeUdyam: varchar("msme_udyam", { length: 30 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  freshMilkSegment: boolean("fresh_milk_segment").default(false),
  productsSegment: boolean("products_segment").default(false),
  iceCreamSegment: boolean("ice_cream_segment").default(false),
  freshMilkTier: varchar("fresh_milk_tier", { length: 50 }),
  productTier: varchar("product_tier", { length: 50 }),
  iceCreamTier: varchar("ice_cream_tier", { length: 50 }),
  securityDeposit: varchar("security_deposit", { length: 20 }),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: varchar("bank_account_number", { length: 30 }),
  bankIfsc: varchar("bank_ifsc", { length: 15 }),
  bankName: text("bank_name"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  parentId: varchar("parent_id"),
  parentRole: varchar("parent_role", { length: 50 }),
  parentName: text("parent_name"),
  pricingTier: varchar("pricing_tier", { length: 50 }),
  freshMilkApproved: boolean("fresh_milk_approved").default(false),
  productsApproved: boolean("products_approved").default(false),
  iceCreamApproved: boolean("ice_cream_approved").default(false),
  freshMilkPricingRole: varchar("fresh_milk_pricing_role", { length: 50 }),
  productsPricingRole: varchar("products_pricing_role", { length: 50 }),
  iceCreamPricingRole: varchar("ice_cream_pricing_role", { length: 50 }),
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  approvalLevel: integer("approval_level").default(0),
  currentApproverLevel: integer("current_approver_level").default(5),
  approvalChain: jsonb("approval_chain").$type<{level: number; action: string; staffId: string; staffName: string; designation: string; timestamp: string; comments?: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertB2bRegistrationSchema = createInsertSchema(b2bRegistrations).omit({
  id: true,
  status: true,
  parentId: true,
  parentRole: true,
  parentName: true,
  pricingTier: true,
  freshMilkApproved: true,
  productsApproved: true,
  iceCreamApproved: true,
  freshMilkPricingRole: true,
  productsPricingRole: true,
  iceCreamPricingRole: true,
  approvedBy: true,
  approvedAt: true,
  rejectedReason: true,
  approvalLevel: true,
  currentApproverLevel: true,
  approvalChain: true,
  createdAt: true,
  updatedAt: true,
});

export type B2bRegistration = typeof b2bRegistrations.$inferSelect;
export type InsertB2bRegistration = z.infer<typeof insertB2bRegistrationSchema>;

export const b2bApprovalHistory = pgTable("b2b_approval_history", {
  id: serial("id").primaryKey(),
  registrationId: varchar("registration_id", { length: 255 }).notNull(),
  level: integer("level").notNull(),
  levelName: varchar("level_name", { length: 50 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  staffId: varchar("staff_id", { length: 255 }),
  staffName: text("staff_name"),
  staffDesignation: text("staff_designation"),
  staffDepartment: varchar("staff_department", { length: 50 }),
  unionId: varchar("union_id", { length: 255 }),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type B2bApprovalHistory = typeof b2bApprovalHistory.$inferSelect;

export const userAddresses = pgTable("user_addresses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  label: varchar("label", { length: 50 }).default("Home"),
  name: text("name"),
  phone: varchar("phone", { length: 20 }),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  landmark: text("landmark"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  country: varchar("country", { length: 50 }).default("India"),
  lat: text("lat"),
  lng: text("lng"),
  placeId: text("place_id"),
  pointId: varchar("point_id", { length: 50 }),
  pointName: varchar("point_name", { length: 255 }),
  pointRoute: varchar("point_route", { length: 255 }),
  isDefault: boolean("is_default").default(false),
  locationPhotoUrl: text("location_photo_url"),
  gpsAccuracy: decimal("gps_accuracy", { precision: 8, scale: 2 }),
  accuracyGrade: varchar("accuracy_grade", { length: 10 }),
  locationSource: varchar("location_source", { length: 20 }),
  addressSource: varchar("address_source", { length: 20 }),
  isMockLocation: boolean("is_mock_location"),
  suspicionScore: integer("suspicion_score").default(0),
  capturedAt: timestamp("captured_at"),
  proofStatus: varchar("proof_status", { length: 30 }).default("pending"),
  proofHash: varchar("proof_hash", { length: 64 }),
  verifiedBy: varchar("verified_by", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  verifyNote: text("verify_note"),
  consentGiven: boolean("consent_given").default(false),
  consentAt: timestamp("consent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

export const masterProducts = pgTable("master_products", {
  id: serial("id").primaryKey(),
  productCode: varchar("product_code", { length: 50 }).notNull().unique(),
  barcode: varchar("barcode", { length: 50 }),
  name: text("name").notNull(),
  description: text("description"),
  segment: varchar("segment", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  hsnCode: varchar("hsn_code", { length: 8 }),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default("0"),
  unitSize: text("unit_size"),
  unitType: text("unit_type"),
  image: text("image"),
  packagingType: varchar("packaging_type", { length: 20 }),
  unitsPerPackage: integer("units_per_package"),
  packageWeight: decimal("package_weight", { precision: 10, scale: 2 }),
  packageWeightUnit: varchar("package_weight_unit", { length: 10 }),
  federationPrice: decimal("federation_price", { precision: 10, scale: 2 }),
  interUnionPrice: decimal("inter_union_price", { precision: 10, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
  dealerPrice: decimal("dealer_price", { precision: 10, scale: 2 }),
  retailerPrice: decimal("retailer_price", { precision: 10, scale: 2 }),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMasterProductSchema = createInsertSchema(masterProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MasterProduct = typeof masterProducts.$inferSelect;
export type InsertMasterProduct = z.infer<typeof insertMasterProductSchema>;

export const merchantProducts = pgTable("merchant_products", {
  id: serial("id").primaryKey(),
  masterProductId: integer("master_product_id").notNull(),
  merchantId: varchar("merchant_id", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  stock: integer("stock").default(0),
  federationPrice: decimal("federation_price", { precision: 10, scale: 2 }),
  interUnionPrice: decimal("inter_union_price", { precision: 10, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
  dealerPrice: decimal("dealer_price", { precision: 10, scale: 2 }),
  retailerPrice: decimal("retailer_price", { precision: 10, scale: 2 }),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  cutoffTime: varchar("cutoff_time", { length: 10 }),
  deliveryDays: text("delivery_days"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMerchantProductSchema = createInsertSchema(merchantProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MerchantProduct = typeof merchantProducts.$inferSelect;
export type InsertMerchantProduct = z.infer<typeof insertMerchantProductSchema>;

export const businessRoutes = pgTable("business_routes", {
  id: serial("id").primaryKey(),
  routeName: text("route_name").notNull(),
  routeCode: varchar("route_code", { length: 50 }),
  merchantId: varchar("merchant_id", { length: 255 }).notNull(),
  segment: varchar("segment", { length: 20 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessRouteSchema = createInsertSchema(businessRoutes).omit({
  id: true,
  createdAt: true,
});

export type BusinessRoute = typeof businessRoutes.$inferSelect;
export type InsertBusinessRoute = z.infer<typeof insertBusinessRouteSchema>;

export const deliveryPartners = pgTable("delivery_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  email: varchar("email", { length: 100 }),
  segment: varchar("segment", { length: 20 }).notNull(),
  routeId: integer("route_id"),
  merchantId: varchar("merchant_id", { length: 255 }).notNull(),
  vehicleCapacity: varchar("vehicle_capacity", { length: 50 }),
  vehicleNumber: varchar("vehicle_number", { length: 30 }),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  driverLicense: varchar("driver_license", { length: 50 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"),
  approvedBy: varchar("approved_by"),
  isActive: boolean("is_active").notNull().default(true),
  isOnline: boolean("is_online").notNull().default(false),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeliveryPartnerSchema = createInsertSchema(deliveryPartners).omit({
  id: true,
  approvedBy: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type InsertDeliveryPartner = z.infer<typeof insertDeliveryPartnerSchema>;

// ==================== DMS MODULES ====================

// 1. Enhanced Inventory Batches - batch-wise tracking with expiry
export const inventoryBatches = pgTable("inventory_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  batchNumber: varchar("batch_number", { length: 50 }).notNull(),
  manufacturingDate: timestamp("manufacturing_date"),
  expiryDate: timestamp("expiry_date"),
  quantity: integer("quantity").notNull().default(0),
  damagedQty: integer("damaged_qty").notNull().default(0),
  unitType: text("unit_type"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  stockNorm: integer("stock_norm"),
  reorderLevel: integer("reorder_level"),
  minOrderQty: integer("min_order_qty"),
  warehouseLocation: text("warehouse_location"),
  segment: varchar("segment", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInventoryBatchSchema = createInsertSchema(inventoryBatches).omit({ id: true, createdAt: true, updatedAt: true });
export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = z.infer<typeof insertInventoryBatchSchema>;

// 2. GRN (Goods Receipt Note)
export const goodsReceiptNotes = pgTable("goods_receipt_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grnNumber: varchar("grn_number", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id").notNull(),
  supplierId: varchar("supplier_id"),
  supplierName: text("supplier_name"),
  purchaseOrderId: varchar("purchase_order_id"),
  receivedBy: varchar("received_by"),
  receivedDate: timestamp("received_date").defaultNow(),
  items: jsonb("items").notNull(),
  totalExpectedQty: integer("total_expected_qty").notNull().default(0),
  totalReceivedQty: integer("total_received_qty").notNull().default(0),
  totalDamagedQty: integer("total_damaged_qty").notNull().default(0),
  discrepancyNotes: text("discrepancy_notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGrnSchema = createInsertSchema(goodsReceiptNotes).omit({ id: true, approvedBy: true, approvedAt: true, createdAt: true, updatedAt: true });
export type GoodsReceiptNote = typeof goodsReceiptNotes.$inferSelect;
export type InsertGrn = z.infer<typeof insertGrnSchema>;

// 3. Sales Returns
export const salesReturns = pgTable("sales_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnNumber: varchar("return_number", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id").notNull(),
  orderId: varchar("order_id"),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name"),
  items: jsonb("items").notNull(),
  returnReason: text("return_reason").notNull(),
  returnType: varchar("return_type", { length: 20 }).notNull().default("with_invoice"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  creditNoteNumber: varchar("credit_note_number", { length: 50 }),
  creditNoteAmount: decimal("credit_note_amount", { precision: 12, scale: 2 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }),
  cgstAmount: decimal("cgst_amount", { precision: 12, scale: 2 }),
  sgstAmount: decimal("sgst_amount", { precision: 12, scale: 2 }),
  igstAmount: decimal("igst_amount", { precision: 12, scale: 2 }),
  taxableAmount: decimal("taxable_amount", { precision: 12, scale: 2 }),
  reverseLogisticsJobId: varchar("reverse_logistics_job_id"),
  physicalPickupRequired: boolean("physical_pickup_required").default(false),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  restockedQty: integer("restocked_qty").notNull().default(0),
  segment: varchar("segment", { length: 20 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalesReturnSchema = createInsertSchema(salesReturns).omit({ id: true, creditNoteNumber: true, approvedBy: true, approvedAt: true, createdAt: true, updatedAt: true });
export type SalesReturn = typeof salesReturns.$inferSelect;
export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;

// 4. Collection Management
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name"),
  orderId: varchar("order_id"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: varchar("payment_mode", { length: 20 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  chequeNumber: varchar("cheque_number", { length: 50 }),
  chequeDate: timestamp("cheque_date"),
  bankName: varchar("bank_name", { length: 100 }),
  collectedBy: varchar("collected_by"),
  collectionDate: timestamp("collection_date").defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("received"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true });
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

// Outstanding ledger for tracking receivables
export const outstandingLedger = pgTable("outstanding_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  invoiceDate: timestamp("invoice_date"),
  invoiceAmount: decimal("invoice_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).notNull().default("unpaid"),
  agingBucket: varchar("aging_bucket", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOutstandingSchema = createInsertSchema(outstandingLedger).omit({ id: true, createdAt: true, updatedAt: true });
export type OutstandingLedger = typeof outstandingLedger.$inferSelect;
export type InsertOutstanding = z.infer<typeof insertOutstandingSchema>;

// 5. Scheme Management
export const schemes = pgTable("schemes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  schemeType: varchar("scheme_type", { length: 30 }).notNull(),
  discountType: varchar("discount_type", { length: 20 }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minQuantity: integer("min_quantity"),
  minValue: decimal("min_value", { precision: 12, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 12, scale: 2 }),
  freeProductId: varchar("free_product_id"),
  freeProductQty: integer("free_product_qty"),
  applicableProducts: jsonb("applicable_products"),
  applicableCategories: jsonb("applicable_categories"),
  applicableRoles: jsonb("applicable_roles"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budgetAmount: decimal("budget_amount", { precision: 12, scale: 2 }),
  usedAmount: decimal("used_amount", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  segment: varchar("segment", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSchemeSchema = createInsertSchema(schemes).omit({ id: true, usedAmount: true, createdAt: true, updatedAt: true });
export type Scheme = typeof schemes.$inferSelect;
export type InsertScheme = z.infer<typeof insertSchemeSchema>;

// 6. SFA - Staff Attendance
export const staffAttendance = pgTable("staff_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  date: timestamp("date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  checkInLat: decimal("check_in_lat", { precision: 10, scale: 7 }),
  checkInLng: decimal("check_in_lng", { precision: 10, scale: 7 }),
  checkOutLat: decimal("check_out_lat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("check_out_lng", { precision: 10, scale: 7 }),
  checkInSelfie: text("check_in_selfie"),
  checkOutSelfie: text("check_out_selfie"),
  status: varchar("status", { length: 20 }).notNull().default("present"),
  leaveType: varchar("leave_type", { length: 20 }),
  leaveReason: text("leave_reason"),
  leaveApprovedBy: varchar("leave_approved_by"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffAttendanceSchema = createInsertSchema(staffAttendance).omit({ id: true, createdAt: true });
export type StaffAttendance = typeof staffAttendance.$inferSelect;
export type InsertStaffAttendance = z.infer<typeof insertStaffAttendanceSchema>;

// SFA - Beat Plans / Route Plans
export const beatPlans = pgTable("beat_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  routeId: integer("route_id"),
  routeName: text("route_name"),
  outlets: jsonb("outlets"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBeatPlanSchema = createInsertSchema(beatPlans).omit({ id: true, createdAt: true });
export type BeatPlan = typeof beatPlans.$inferSelect;
export type InsertBeatPlan = z.infer<typeof insertBeatPlanSchema>;

// SFA - Outlet Visits (GPS tracked)
export const outletVisits = pgTable("outlet_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  outletId: varchar("outlet_id").notNull(),
  outletName: text("outlet_name"),
  visitDate: timestamp("visit_date").defaultNow(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  selfieUrl: text("selfie_url"),
  notes: text("notes"),
  orderId: varchar("order_id"),
  orderAmount: decimal("order_amount", { precision: 12, scale: 2 }),
  collectionAmount: decimal("collection_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOutletVisitSchema = createInsertSchema(outletVisits).omit({ id: true, createdAt: true });
export type OutletVisit = typeof outletVisits.$inferSelect;
export type InsertOutletVisit = z.infer<typeof insertOutletVisitSchema>;

// 8. Vehicle & Logistics
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  vehicleNumber: varchar("vehicle_number", { length: 30 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 30 }).notNull(),
  capacity: varchar("capacity", { length: 50 }),
  driverUserId: varchar("driver_user_id"),
  driverName: text("driver_name"),
  driverPhone: varchar("driver_phone", { length: 15 }),
  driverLicense: varchar("driver_license", { length: 50 }),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, updatedAt: true });
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// Pick Lists for delivery
export const pickLists = pgTable("pick_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  pickListNumber: varchar("pick_list_number", { length: 50 }).notNull(),
  vehicleId: varchar("vehicle_id"),
  driverId: varchar("driver_id"),
  routeId: integer("route_id"),
  orders: jsonb("orders").notNull(),
  totalItems: integer("total_items").notNull().default(0),
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  dispatchedAt: timestamp("dispatched_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPickListSchema = createInsertSchema(pickLists).omit({ id: true, dispatchedAt: true, completedAt: true, createdAt: true, updatedAt: true });
export type PickList = typeof pickLists.$inferSelect;
export type InsertPickList = z.infer<typeof insertPickListSchema>;

export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  userId: varchar("user_id"),
  userName: varchar("user_name"),
  userRole: varchar("user_role", { length: 50 }),
  userEmail: varchar("user_email"),
  userPhone: varchar("user_phone"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true, createdAt: true });
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// ==================== AUDIT LOG ====================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: varchar("record_id", { length: 100 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  changedFields: jsonb("changed_fields"),
  previousValues: jsonb("previous_values"),
  newValues: jsonb("new_values"),
  changedByUserId: varchar("changed_by_user_id"),
  changedByName: varchar("changed_by_name"),
  changedByRole: varchar("changed_by_role", { length: 50 }),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ==================== DELIVERY PARTNER SHIFTS & WALLET ====================

export const deliveryShifts = pgTable("delivery_shifts", {
  id: serial("id").primaryKey(),
  partnerId: varchar("partner_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  location: text("location").notNull(),
  vehicleInfo: text("vehicle_info"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  scheduledStart: varchar("scheduled_start", { length: 20 }),
  scheduledEnd: varchar("scheduled_end", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryShiftSchema = createInsertSchema(deliveryShifts).omit({ id: true, createdAt: true });
export type DeliveryShift = typeof deliveryShifts.$inferSelect;
export type InsertDeliveryShift = z.infer<typeof insertDeliveryShiftSchema>;

export const deliveryWalletTransactions = pgTable("delivery_wallet_transactions", {
  id: serial("id").primaryKey(),
  partnerId: varchar("partner_id").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: varchar("reference_id", { length: 100 }),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryWalletTransactionSchema = createInsertSchema(deliveryWalletTransactions).omit({ id: true, createdAt: true });
export type DeliveryWalletTransaction = typeof deliveryWalletTransactions.$inferSelect;
export type InsertDeliveryWalletTransaction = z.infer<typeof insertDeliveryWalletTransactionSchema>;

// ==================== KITCHEN DISPLAY SYSTEM (KDS) ====================

export const kdsUsers = pgTable("kds_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  merchantId: varchar("merchant_id"),
  role: varchar("role", { length: 30 }).notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKdsUserSchema = createInsertSchema(kdsUsers).omit({ id: true, createdAt: true });
export type KdsUser = typeof kdsUsers.$inferSelect;
export type InsertKdsUser = z.infer<typeof insertKdsUserSchema>;

export const kdsSettings = pgTable("kds_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  darkTheme: boolean("dark_theme").notNull().default(false),
  screenMode: varchar("screen_mode", { length: 20 }).notNull().default("classic"),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  muteOrderSounds: boolean("mute_order_sounds").notNull().default(false),
  repeatUntilAcknowledge: boolean("repeat_until_acknowledge").notNull().default(false),
  transitionTimes: jsonb("transition_times"),
  statusColors: jsonb("status_colors"),
  orderTypeColors: jsonb("order_type_colors"),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  printerConfig: jsonb("printer_config"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKdsSettingsSchema = createInsertSchema(kdsSettings).omit({ id: true, updatedAt: true });
export type KdsSettings = typeof kdsSettings.$inferSelect;
export type InsertKdsSettings = z.infer<typeof insertKdsSettingsSchema>;

// ==================== TALLY IMPORT ====================

export const tallyImportLogs = pgTable("tally_import_logs", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id"),
  filename: text("filename"),
  ledgersFound: integer("ledgers_found").default(0),
  stockitemsFound: integer("stockitems_found").default(0),
  vouchersFound: integer("vouchers_found").default(0),
  ledgersImported: integer("ledgers_imported").default(0),
  stockitemsImported: integer("stockitems_imported").default(0),
  vouchersImported: integer("vouchers_imported").default(0),
  errors: jsonb("errors"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTallyImportLogSchema = createInsertSchema(tallyImportLogs).omit({ id: true, createdAt: true });
export type TallyImportLog = typeof tallyImportLogs.$inferSelect;
export type InsertTallyImportLog = z.infer<typeof insertTallyImportLogSchema>;

export const tallyLedgerRaw = pgTable("tally_ledger_raw", {
  id: serial("id").primaryKey(),
  importId: integer("import_id"),
  guid: text("guid"),
  name: text("name").notNull(),
  parent: text("parent"),
  gstin: text("gstin"),
  address: text("address"),
  mobile: text("mobile"),
  phone: text("phone"),
  email: text("email"),
  state: text("state"),
  pincode: text("pincode"),
  panNo: text("pan_no"),
  openingBalance: decimal("opening_balance"),
  rawData: jsonb("raw_data"),
  mappedToUserId: text("mapped_to_user_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTallyLedgerRawSchema = createInsertSchema(tallyLedgerRaw).omit({ id: true, createdAt: true });
export type TallyLedgerRaw = typeof tallyLedgerRaw.$inferSelect;
export type InsertTallyLedgerRaw = z.infer<typeof insertTallyLedgerRawSchema>;

export const tallyStockitemRaw = pgTable("tally_stockitem_raw", {
  id: serial("id").primaryKey(),
  importId: integer("import_id"),
  guid: text("guid"),
  name: text("name").notNull(),
  parent: text("parent"),
  category: text("category"),
  baseUnit: text("base_unit"),
  hsnCode: text("hsn_code"),
  gstRate: decimal("gst_rate"),
  openingQty: decimal("opening_qty"),
  openingRate: decimal("opening_rate"),
  openingValue: decimal("opening_value"),
  godown: text("godown"),
  rawData: jsonb("raw_data"),
  mappedToProductId: text("mapped_to_product_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTallyStockitemRawSchema = createInsertSchema(tallyStockitemRaw).omit({ id: true, createdAt: true });
export type TallyStockitemRaw = typeof tallyStockitemRaw.$inferSelect;
export type InsertTallyStockitemRaw = z.infer<typeof insertTallyStockitemRawSchema>;

export const tallyVoucherRaw = pgTable("tally_voucher_raw", {
  id: serial("id").primaryKey(),
  importId: integer("import_id"),
  vchKey: text("vch_key"),
  remoteId: text("remote_id"),
  voucherType: text("voucher_type").notNull(),
  voucherNumber: text("voucher_number"),
  date: timestamp("date"),
  partyLedgerName: text("party_ledger_name"),
  amount: decimal("amount"),
  narration: text("narration"),
  inventoryEntries: jsonb("inventory_entries"),
  ledgerEntries: jsonb("ledger_entries"),
  rawData: jsonb("raw_data"),
  mappedToOrderId: text("mapped_to_order_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTallyVoucherRawSchema = createInsertSchema(tallyVoucherRaw).omit({ id: true, createdAt: true });
export type TallyVoucherRaw = typeof tallyVoucherRaw.$inferSelect;
export type InsertTallyVoucherRaw = z.infer<typeof insertTallyVoucherRawSchema>;

// ==================== TRANSPORT MANAGEMENT MODULE ====================

export const transportHubs = pgTable("transport_hubs", {
  id: serial("id").primaryKey(),
  hubName: varchar("hub_name", { length: 100 }).notNull(),
  location: text("location").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  segments: text("segments").array().notNull().default(sql`ARRAY['Fresh Milk','Products','Ice Cream']`),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTransportHubSchema = createInsertSchema(transportHubs).omit({ id: true, createdAt: true, updatedAt: true });
export type TransportHub = typeof transportHubs.$inferSelect;
export type InsertTransportHub = z.infer<typeof insertTransportHubSchema>;

export const tripSheets = pgTable("trip_sheets", {
  id: serial("id").primaryKey(),
  tripId: varchar("trip_id", { length: 50 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  shift: varchar("shift", { length: 10 }).notNull(),
  hubId: integer("hub_id"),
  hubName: varchar("hub_name", { length: 100 }),
  unionId: varchar("union_id"),
  unionName: varchar("union_name", { length: 100 }),
  routeName: varchar("route_name", { length: 200 }).notNull(),
  vehicleId: varchar("vehicle_id"),
  vehicleNo: varchar("vehicle_no", { length: 30 }),
  driverId: varchar("driver_id", { length: 100 }),
  driverName: varchar("driver_name", { length: 100 }),
  driverPhone: varchar("driver_phone", { length: 15 }),
  segment: varchar("segment", { length: 30 }).notNull(),
  plannedDropPoints: integer("planned_drop_points").notNull().default(0),
  completedDropPoints: integer("completed_drop_points").notNull().default(0),
  bagsPlanned: integer("bags_planned").notNull().default(0),
  bagsLoaded: integer("bags_loaded").notNull().default(0),
  capacityBags: integer("capacity_bags").notNull().default(120),
  tonnageLoaded: decimal("tonnage_loaded", { precision: 8, scale: 3 }).default("0"),
  startTime: varchar("start_time", { length: 10 }),
  etaTime: varchar("eta_time", { length: 10 }),
  actualEndTime: varchar("actual_end_time", { length: 10 }),
  status: varchar("status", { length: 20 }).notNull().default("Planned"),
  tempMinC: decimal("temp_min_c", { precision: 5, scale: 1 }),
  tempMaxC: decimal("temp_max_c", { precision: 5, scale: 1 }),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }),
  fuelUsed: decimal("fuel_used", { precision: 8, scale: 2 }),
  actualDistanceKm: decimal("actual_distance_km", { precision: 8, scale: 2 }),
  optimizedDistanceKm: decimal("optimized_distance_km", { precision: 8, scale: 2 }),
  onTimeDeliveryPct: decimal("on_time_delivery_pct", { precision: 5, scale: 2 }),
  routeEfficiencyPct: decimal("route_efficiency_pct", { precision: 5, scale: 2 }),
  customerFeedbackScore: decimal("customer_feedback_score", { precision: 3, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTripSheetSchema = createInsertSchema(tripSheets).omit({ id: true, createdAt: true, updatedAt: true });
export type TripSheet = typeof tripSheets.$inferSelect;
export type InsertTripSheet = z.infer<typeof insertTripSheetSchema>;

export const loadManifests = pgTable("load_manifests", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  items: jsonb("items").notNull().default([]),
  totalBags: integer("total_bags").notNull().default(0),
  totalWeightKg: decimal("total_weight_kg", { precision: 10, scale: 2 }).default("0"),
  batchInfo: text("batch_info"),
  loadedBy: varchar("loaded_by", { length: 100 }),
  verifiedBy: varchar("verified_by", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoadManifestSchema = createInsertSchema(loadManifests).omit({ id: true, createdAt: true });
export type LoadManifest = typeof loadManifests.$inferSelect;
export type InsertLoadManifest = z.infer<typeof insertLoadManifestSchema>;

export const transportRoutePoints = pgTable("transport_route_points", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  sequenceNo: integer("sequence_no").notNull(),
  locationName: varchar("location_name", { length: 200 }).notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  plannedArrival: varchar("planned_arrival", { length: 10 }),
  actualArrival: varchar("actual_arrival", { length: 10 }),
  bagsToDeliver: integer("bags_to_deliver").notNull().default(0),
  bagsDelivered: integer("bags_delivered").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  geoTagConfirmed: boolean("geo_tag_confirmed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransportRoutePointSchema = createInsertSchema(transportRoutePoints).omit({ id: true, createdAt: true });
export type TransportRoutePoint = typeof transportRoutePoints.$inferSelect;
export type InsertTransportRoutePoint = z.infer<typeof insertTransportRoutePointSchema>;

export const driverPerformance = pgTable("driver_performance", {
  id: serial("id").primaryKey(),
  driverName: varchar("driver_name", { length: 100 }).notNull(),
  driverPhone: varchar("driver_phone", { length: 15 }),
  tripId: integer("trip_id").notNull(),
  tripCode: varchar("trip_code", { length: 50 }),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  dropScore: decimal("drop_score", { precision: 5, scale: 2 }),
  timeScore: decimal("time_score", { precision: 5, scale: 2 }),
  distanceScore: decimal("distance_score", { precision: 5, scale: 2 }),
  capacityScore: decimal("capacity_score", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverPerformanceSchema = createInsertSchema(driverPerformance).omit({ id: true, createdAt: true });
export type DriverPerformance = typeof driverPerformance.$inferSelect;
export type InsertDriverPerformance = z.infer<typeof insertDriverPerformanceSchema>;

export const butterMilkStops = pgTable("butter_milk_stops", {
  id: serial("id").primaryKey(),
  zone: integer("zone").notNull(),
  division: varchar("division", { length: 10 }).notNull(),
  locationType: varchar("location_type", { length: 50 }).notNull(),
  locationName: varchar("location_name", { length: 200 }).notNull(),
  address: text("address").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  originalLat: decimal("original_lat", { precision: 10, scale: 7 }),
  originalLng: decimal("original_lng", { precision: 10, scale: 7 }),
  totalPockets: integer("total_pockets").notNull().default(0),
  bags: integer("bags").notNull().default(0),
  weightKg: decimal("weight_kg", { precision: 8, scale: 2 }).notNull().default("0"),
  routeGroup: integer("route_group").notNull().default(1),
  geoCluster: varchar("geo_cluster", { length: 5 }),
  pinStatus: varchar("pin_status", { length: 10 }).notNull().default("valid"),
  isActive: boolean("is_active").notNull().default(true),
  segment: varchar("segment", { length: 30 }).default("Products"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertButterMilkStopSchema = createInsertSchema(butterMilkStops).omit({ id: true, createdAt: true });
export type ButterMilkStop = typeof butterMilkStops.$inferSelect;
export type InsertButterMilkStop = z.infer<typeof insertButterMilkStopSchema>;

export const driverLocations = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  driverId: varchar("driver_id", { length: 100 }).notNull(),
  tripId: integer("trip_id"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({ id: true, createdAt: true });
export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertDriverLocationSchema>;

export const bulkInvoices = pgTable("bulk_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id", { length: 100 }).notNull(),
  customerType: varchar("customer_type", { length: 30 }).notNull().default("corporate"),
  customerName: text("customer_name").notNull(),
  customerGstin: varchar("customer_gstin", { length: 20 }),
  customerAddress: text("customer_address"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerEmail: varchar("customer_email", { length: 100 }),
  items: jsonb("items").notNull().default([]),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  productSegment: varchar("product_segment", { length: 30 }).default("Mixed"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  deliveryRequired: boolean("delivery_required").default(true),
  deliveryAddress: text("delivery_address"),
  deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }),
  ewayBillId: varchar("eway_bill_id", { length: 50 }),
  tripId: integer("trip_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBulkInvoiceSchema = createInsertSchema(bulkInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export type BulkInvoice = typeof bulkInvoices.$inferSelect;
export type InsertBulkInvoice = z.infer<typeof insertBulkInvoiceSchema>;

export const deliveryJobs = pgTable("delivery_jobs", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 50 }).notNull(),
  sourceType: varchar("source_type", { length: 20 }).notNull(),
  sourceId: varchar("source_id", { length: 100 }).notNull(),
  dispatchType: varchar("dispatch_type", { length: 20 }).notNull().default("REGULAR"),
  deliveryType: varchar("delivery_type", { length: 20 }).notNull().default("regular"),
  merchantId: varchar("merchant_id", { length: 100 }).notNull(),
  segment: varchar("segment", { length: 30 }),
  status: varchar("status", { length: 30 }).notNull().default("pending_validation"),
  customerName: text("customer_name"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  deliveryAddress: text("delivery_address"),
  deliveryLat: varchar("delivery_lat", { length: 20 }),
  deliveryLng: varchar("delivery_lng", { length: 20 }),
  totalBags: integer("total_bags").default(0),
  totalWeightKg: decimal("total_weight_kg", { precision: 10, scale: 2 }).default("0"),
  totalVolumeLtr: decimal("total_volume_ltr", { precision: 10, scale: 2 }),
  temperatureRequired: boolean("temperature_required").default(false),
  deliveryTimeWindow: varchar("delivery_time_window", { length: 30 }),
  tripId: integer("trip_id"),
  validationErrors: jsonb("validation_errors"),
  gstInvoiceGenerated: boolean("gst_invoice_generated").default(false),
  ewayBillRequired: boolean("eway_bill_required").default(false),
  ewayBillGenerated: boolean("eway_bill_generated").default(false),
  paymentConfirmed: boolean("payment_confirmed").default(false),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryJobSchema = createInsertSchema(deliveryJobs).omit({ id: true, createdAt: true });
export type DeliveryJob = typeof deliveryJobs.$inferSelect;
export type InsertDeliveryJob = z.infer<typeof insertDeliveryJobSchema>;

export const invoiceSequences = pgTable("invoice_sequences", {
  id: serial("id").primaryKey(),
  unionCode: varchar("union_code", { length: 10 }).notNull(),
  financialYear: varchar("financial_year", { length: 5 }).notNull(),
  lastSequence: integer("last_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gstFilingPeriods = pgTable("gst_filing_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  filedAt: timestamp("filed_at"),
  lockedAt: timestamp("locked_at"),
  lockedBy: varchar("locked_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGstFilingPeriodSchema = createInsertSchema(gstFilingPeriods).omit({ id: true, createdAt: true });
export type GstFilingPeriod = typeof gstFilingPeriods.$inferSelect;

export const freshMilkRoutes = pgTable("fresh_milk_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  routeName: text("route_name").notNull(),
  areaGroup: varchar("area_group", { length: 50 }).notNull(),
  sequenceNo: integer("sequence_no").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFreshMilkRouteSchema = createInsertSchema(freshMilkRoutes).omit({ id: true, createdAt: true });
export type FreshMilkRoute = typeof freshMilkRoutes.$inferSelect;
export type InsertFreshMilkRoute = z.infer<typeof insertFreshMilkRouteSchema>;

export const freshMilkDispatches = pgTable("fresh_milk_dispatches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull(),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  dispatchDate: varchar("dispatch_date", { length: 10 }).notNull(),
  shift: varchar("shift", { length: 20 }).notNull(),
  vehicleId: varchar("vehicle_id"),
  driverId: varchar("driver_id"),
  arrivalTime: varchar("arrival_time", { length: 10 }),
  dispatchTime: varchar("dispatch_time", { length: 10 }),
  leakAllowanceLtrs: decimal("leak_allowance_ltrs", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  tripId: varchar("trip_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFreshMilkDispatchSchema = createInsertSchema(freshMilkDispatches).omit({ id: true, createdAt: true, updatedAt: true });
export type FreshMilkDispatch = typeof freshMilkDispatches.$inferSelect;
export type InsertFreshMilkDispatch = z.infer<typeof insertFreshMilkDispatchSchema>;

export const freshMilkDispatchItems = pgTable("fresh_milk_dispatch_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dispatchId: varchar("dispatch_id").notNull(),
  milkType: varchar("milk_type", { length: 20 }).notNull(),
  qtyPackets: integer("qty_packets").notNull().default(0),
  litres: decimal("litres", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFreshMilkDispatchItemSchema = createInsertSchema(freshMilkDispatchItems).omit({ id: true, createdAt: true });
export type FreshMilkDispatchItem = typeof freshMilkDispatchItems.$inferSelect;
export type InsertFreshMilkDispatchItem = z.infer<typeof insertFreshMilkDispatchItemSchema>;

export const freshMilkReturns = pgTable("fresh_milk_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  dispatchDate: varchar("dispatch_date", { length: 10 }).notNull(),
  shift: varchar("shift", { length: 20 }).notNull(),
  milkType: varchar("milk_type", { length: 20 }).notNull(),
  returnLtrs: decimal("return_ltrs", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFreshMilkReturnSchema = createInsertSchema(freshMilkReturns).omit({ id: true, createdAt: true });
export type FreshMilkReturn = typeof freshMilkReturns.$inferSelect;
export type InsertFreshMilkReturn = z.infer<typeof insertFreshMilkReturnSchema>;

export const bulkDeliveryLocations = pgTable("bulk_delivery_locations", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 100 }).notNull(),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  zone: varchar("zone", { length: 20 }),
  division: varchar("division", { length: 20 }),
  routeNo: integer("route_no").notNull(),
  locationName: text("location_name").notNull(),
  locationType: varchar("location_type", { length: 50 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  defaultSegment: varchar("default_segment", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBulkDeliveryLocationSchema = createInsertSchema(bulkDeliveryLocations).omit({ id: true, createdAt: true });
export type BulkDeliveryLocation = typeof bulkDeliveryLocations.$inferSelect;
export type InsertBulkDeliveryLocation = z.infer<typeof insertBulkDeliveryLocationSchema>;

export const manualBillBatches = pgTable("manual_bill_batches", {
  id: serial("id").primaryKey(),
  batchId: varchar("batch_id", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id", { length: 100 }).notNull(),
  unionId: varchar("union_id", { length: 50 }),
  uploadedBy: varchar("uploaded_by", { length: 100 }),
  fileName: varchar("file_name", { length: 255 }),
  totalRows: integer("total_rows").default(0),
  validRows: integer("valid_rows").default(0),
  matchedRows: integer("matched_rows").default(0),
  unmatchedRows: integer("unmatched_rows").default(0),
  errorRows: integer("error_rows").default(0),
  status: varchar("status", { length: 20 }).notNull().default("uploaded"),
  optimizationResult: jsonb("optimization_result"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertManualBillBatchSchema = createInsertSchema(manualBillBatches).omit({ id: true, createdAt: true });
export type ManualBillBatch = typeof manualBillBatches.$inferSelect;
export type InsertManualBillBatch = z.infer<typeof insertManualBillBatchSchema>;

export const manualBills = pgTable("manual_bills", {
  id: serial("id").primaryKey(),
  batchId: varchar("batch_id", { length: 50 }).notNull(),
  merchantId: varchar("merchant_id", { length: 100 }).notNull(),
  sNo: integer("s_no"),
  dispatchDate: varchar("dispatch_date", { length: 20 }),
  segment: varchar("segment", { length: 30 }),
  routeNo: integer("route_no"),
  billNo: varchar("bill_no", { length: 50 }),
  billDate: varchar("bill_date", { length: 20 }),
  customerName: varchar("customer_name", { length: 200 }),
  locationName: text("location_name"),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  totalQtyNos: integer("total_qty_nos"),
  bags: integer("bags"),
  zone: varchar("zone", { length: 50 }),
  division: varchar("division", { length: 50 }),
  remarks: text("remarks"),
  matchStatus: varchar("match_status", { length: 30 }).notNull().default("pending"),
  matchedLocationId: integer("matched_location_id"),
  validationErrors: jsonb("validation_errors"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertManualBillSchema = createInsertSchema(manualBills).omit({ id: true, createdAt: true });
export type ManualBill = typeof manualBills.$inferSelect;
export type InsertManualBill = z.infer<typeof insertManualBillSchema>;

export const mmoOffices = pgTable("mmo_offices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  officeName: varchar("office_name", { length: 150 }).notNull(),
  officeCode: varchar("office_code", { length: 50 }).notNull(),
  parentId: varchar("parent_id", { length: 255 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 15 }),
  isActive: boolean("is_active").notNull().default(true),
  sequenceNo: integer("sequence_no").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMmoOfficeSchema = createInsertSchema(mmoOffices).omit({ id: true, createdAt: true });
export type MmoOffice = typeof mmoOffices.$inferSelect;
export type InsertMmoOffice = z.infer<typeof insertMmoOfficeSchema>;

export const mmoRoutes = pgTable("mmo_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mmoOfficeId: varchar("mmo_office_id", { length: 255 }).notNull(),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  routeName: varchar("route_name", { length: 150 }).notNull(),
  routeCode: varchar("route_code", { length: 50 }).notNull(),
  areaDescription: text("area_description"),
  isActive: boolean("is_active").notNull().default(true),
  sequenceNo: integer("sequence_no").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMmoRouteSchema = createInsertSchema(mmoRoutes).omit({ id: true, createdAt: true });
export type MmoRoute = typeof mmoRoutes.$inferSelect;
export type InsertMmoRoute = z.infer<typeof insertMmoRouteSchema>;

export const mmoRouteAgents = pgTable("mmo_route_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id", { length: 255 }).notNull(),
  mmoOfficeId: varchar("mmo_office_id", { length: 255 }).notNull(),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  agentCode: varchar("agent_code", { length: 50 }).notNull(),
  agentName: varchar("agent_name", { length: 150 }).notNull(),
  pointName: varchar("point_name", { length: 200 }).notNull(),
  segment: varchar("segment", { length: 30 }).notNull().default("Fresh Milk"),
  mobileNo: varchar("mobile_no", { length: 15 }),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  sequenceNo: integer("sequence_no").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMmoRouteAgentSchema = createInsertSchema(mmoRouteAgents).omit({ id: true, createdAt: true });
export type MmoRouteAgent = typeof mmoRouteAgents.$inferSelect;
export type InsertMmoRouteAgent = z.infer<typeof insertMmoRouteAgentSchema>;

export const milkRouteAgents = pgTable("milk_route_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  officeCode: varchar("office_code", { length: 50 }).notNull(),
  routeCode: varchar("route_code", { length: 30 }).notNull(),
  routeName: text("route_name").notNull(),
  agentCode: varchar("agent_code", { length: 20 }).notNull(),
  agentName: text("agent_name").notNull(),
  supplyType: varchar("supply_type", { length: 30 }).notNull().default("Fresh Milk"),
  billable: boolean("billable").notNull().default(true),
  sequenceNo: integer("sequence_no").notNull().default(0),
  mobileNo: varchar("mobile_no", { length: 15 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMilkRouteAgentSchema = createInsertSchema(milkRouteAgents).omit({ id: true, createdAt: true });
export type MilkRouteAgent = typeof milkRouteAgents.$inferSelect;
export type InsertMilkRouteAgent = z.infer<typeof insertMilkRouteAgentSchema>;

export const milkDispatchEntries = pgTable("milk_dispatch_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  routeCode: varchar("route_code", { length: 30 }).notNull(),
  agentCode: varchar("agent_code", { length: 20 }).notNull(),
  dispatchDate: varchar("dispatch_date", { length: 10 }).notNull(),
  shift: varchar("shift", { length: 10 }).notNull(),
  fcm1000: decimal("fcm1000", { precision: 10, scale: 2 }).notNull().default("0"),
  fcm500: decimal("fcm500", { precision: 10, scale: 2 }).notNull().default("0"),
  dlt500: decimal("dlt500", { precision: 10, scale: 2 }).notNull().default("0"),
  std200: decimal("std200", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPackets: decimal("total_packets", { precision: 10, scale: 2 }).notNull().default("0"),
  enteredBy: varchar("entered_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMilkDispatchEntrySchema = createInsertSchema(milkDispatchEntries).omit({ id: true, createdAt: true, updatedAt: true });
export type MilkDispatchEntry = typeof milkDispatchEntries.$inferSelect;
export type InsertMilkDispatchEntry = z.infer<typeof insertMilkDispatchEntrySchema>;

export const milkAgentLedger = pgTable("milk_agent_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id", { length: 50 }).notNull(),
  agentCode: varchar("agent_code", { length: 20 }).notNull(),
  ledgerDate: varchar("ledger_date", { length: 10 }).notNull(),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  totalMilkValue: decimal("total_milk_value", { precision: 12, scale: 2 }).notNull().default("0"),
  remittance: decimal("remittance", { precision: 12, scale: 2 }).notNull().default("0"),
  closingBalance: decimal("closing_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMilkAgentLedgerSchema = createInsertSchema(milkAgentLedger).omit({ id: true, createdAt: true, updatedAt: true });
export type MilkAgentLedger = typeof milkAgentLedger.$inferSelect;
export type InsertMilkAgentLedger = z.infer<typeof insertMilkAgentLedgerSchema>;

export const merchantGatewayAccounts = pgTable("merchant_gateway_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  gatewayName: varchar("gateway_name", { length: 50 }).notNull().default("razorpay"),
  accountMode: varchar("account_mode", { length: 20 }).notNull().default("live"),
  keyId: text("key_id").notNull(),
  keySecretEncrypted: text("key_secret_encrypted").notNull(),
  webhookSecretEncrypted: text("webhook_secret_encrypted"),
  accountName: varchar("account_name", { length: 150 }),
  settlementName: varchar("settlement_name", { length: 150 }),
  contactName: varchar("contact_name", { length: 150 }),
  contactMobile: varchar("contact_mobile", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 150 }),
  isActive: boolean("is_active").notNull().default(true),
  autoCapture: boolean("auto_capture").notNull().default(true),
  refundEnabled: boolean("refund_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMerchantGatewayAccountSchema = createInsertSchema(merchantGatewayAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type MerchantGatewayAccount = typeof merchantGatewayAccounts.$inferSelect;
export type InsertMerchantGatewayAccount = z.infer<typeof insertMerchantGatewayAccountSchema>;

export const paymentOrders = pgTable("payment_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  routeId: varchar("route_id"),
  segment: varchar("segment", { length: 50 }),
  businessType: varchar("business_type", { length: 30 }),
  customerId: varchar("customer_id"),
  gatewayAccountId: varchar("gateway_account_id"),
  gatewayName: varchar("gateway_name", { length: 50 }).notNull().default("razorpay"),
  internalOrderNo: varchar("internal_order_no", { length: 100 }).notNull(),
  gatewayOrderId: varchar("gateway_order_id", { length: 150 }),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status", { length: 30 }).notNull().default("created"),
  checkoutSource: varchar("checkout_source", { length: 30 }),
  paymentFor: varchar("payment_for", { length: 30 }),
  accountSource: varchar("account_source", { length: 20 }).default("merchant"),
  receipt: varchar("receipt", { length: 150 }),
  notes: jsonb("notes").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentOrderSchema = createInsertSchema(paymentOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type InsertPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentOrderId: varchar("payment_order_id").notNull(),
  orderId: varchar("order_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  routeId: varchar("route_id"),
  segment: varchar("segment", { length: 50 }),
  businessType: varchar("business_type", { length: 30 }),
  gatewayName: varchar("gateway_name", { length: 50 }).notNull().default("razorpay"),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 150 }),
  gatewayOrderId: varchar("gateway_order_id", { length: 150 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  bank: varchar("bank", { length: 100 }),
  wallet: varchar("wallet", { length: 100 }),
  vpa: varchar("vpa", { length: 120 }),
  rrn: varchar("rrn", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 12, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 30 }).notNull(),
  captured: boolean("captured").default(false),
  capturedAt: timestamp("captured_at"),
  gatewayCreatedAt: timestamp("gateway_created_at"),
  rawResponse: jsonb("raw_response").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true });
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export const paymentRefunds = pgTable("payment_refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentTransactionId: varchar("payment_transaction_id").notNull(),
  orderId: varchar("order_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  gatewayRefundId: varchar("gateway_refund_id", { length: 150 }),
  refundReference: varchar("refund_reference", { length: 150 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  reason: text("reason"),
  notes: jsonb("notes").default({}),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentRefundSchema = createInsertSchema(paymentRefunds).omit({ id: true, createdAt: true });
export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type InsertPaymentRefund = z.infer<typeof insertPaymentRefundSchema>;

export const paymentWebhookLogs = pgTable("payment_webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id"),
  gatewayAccountId: varchar("gateway_account_id"),
  gatewayName: varchar("gateway_name", { length: 50 }).notNull().default("razorpay"),
  eventType: varchar("event_type", { length: 100 }),
  eventId: varchar("event_id", { length: 150 }),
  signature: text("signature"),
  payload: jsonb("payload").notNull(),
  isVerified: boolean("is_verified").default(false),
  processingStatus: varchar("processing_status", { length: 30 }).default("pending"),
  errorMessage: text("error_message"),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertPaymentWebhookLogSchema = createInsertSchema(paymentWebhookLogs).omit({ id: true, receivedAt: true });
export type PaymentWebhookLog = typeof paymentWebhookLogs.$inferSelect;
export type InsertPaymentWebhookLog = z.infer<typeof insertPaymentWebhookLogSchema>;

export const merchantSettlementImports = pgTable("merchant_settlement_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  gatewayName: varchar("gateway_name", { length: 50 }).notNull().default("razorpay"),
  settlementDate: varchar("settlement_date", { length: 10 }),
  settlementReference: varchar("settlement_reference", { length: 150 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  totalFee: decimal("total_fee", { precision: 12, scale: 2 }),
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }),
  totalNet: decimal("total_net", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 30 }),
  uploadedBy: varchar("uploaded_by"),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 20 }),
  rowCount: integer("row_count").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  importStatus: varchar("import_status", { length: 30 }).default("pending"),
  errorSummary: text("error_summary"),
  rawData: jsonb("raw_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const freeMilkRequests = pgTable("free_milk_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  unionId: varchar("union_id").notNull(),
  quantityLiters: decimal("quantity_liters", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  assignedAgentId: varchar("assigned_agent_id"),
  deliveryType: varchar("delivery_type", { length: 20 }).notNull().default("route"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFreeMilkRequestSchema = createInsertSchema(freeMilkRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type FreeMilkRequest = typeof freeMilkRequests.$inferSelect;
export type InsertFreeMilkRequest = z.infer<typeof insertFreeMilkRequestSchema>;
