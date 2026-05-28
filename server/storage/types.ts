import { readFileSync } from 'fs';
import { 
  type Restaurant, 
  type MenuItem, 
  type Order, 
  type User,
  deliveryPoints as deliveryPointsTable,
  type DeliveryPoint,
  type InsertRestaurant, 
  type InsertMenuItem, 
  type InsertOrder,
  type InsertUser,
  type InsertDeliveryPoint,
  // Karenderia entities
  type Merchant,
  type Client,
  type Item,
  type Plan,
  type Invoice,
  type Payout,
  type Reservation,
  type Promo,
  type Notification,
  type Earning,
  type Attribute,
  type MarketingCampaign,
  type PaymentGateway,
  type UpiTransaction,
  type InsertMerchant,
  type InsertClient,
  type InsertItem,
  type InsertPlan,
  type InsertInvoice,
  type InsertPayout,
  type InsertReservation,
  type InsertPromo,
  type InsertNotification,
  type InsertEarning,
  type InsertAttribute,
  type InsertMarketingCampaign,
  type InsertPaymentGateway,
  type InsertUpiTransaction,
  type RazorpayTransaction,
  type InsertRazorpayTransaction,
  type CashfreeTransaction,
  type InsertCashfreeTransaction,
  cashfreeTransactions,
  type CashfreePaymentLink,
  type InsertCashfreePaymentLink,
  cashfreePaymentLinks,
  type CashfreeSplitVendor,
  type InsertCashfreeSplitVendor,
  cashfreeSplitVendors,
  type CashfreeOrderSplit,
  type InsertCashfreeOrderSplit,
  cashfreeOrderSplits,
  type CashfreeBeneficiary,
  type InsertCashfreeBeneficiary,
  cashfreeBeneficiaries,
  type CashfreePayout,
  type InsertCashfreePayout,
  cashfreePayouts,
  type CashfreeSoftposTerminal,
  type InsertCashfreeSoftposTerminal,
  cashfreeSoftposTerminals,
  type PricingTier,
  type InsertPricingTier,
  // E-way Bill entities
  type EwayBill,
  type InsertEwayBill,
  type EwayBillConfig,
  type InsertEwayBillConfig,
  type EwayBillLog,
  type InsertEwayBillLog,
  type HsnCode,
  // GST Returns
  type GstReturn,
  type InsertGstReturn,
  type InsertHsnCode,
  // Delhivery entities
  type DelhiveryConfig,
  type InsertDelhiveryConfig,
  type DelhiveryWarehouse,
  type InsertDelhiveryWarehouse,
  type DelhiveryShipment,
  type InsertDelhiveryShipment,
  delhiveryConfig,
  delhiveryWarehouses,
  delhiveryShipments,
  // Wholesale Dealers
  type WholesaleDealer,
  wholesaleDealers,
  // Fresh Milk Dealers
  type FreshMilkDealer,
  freshMilkDealers,
  // Media Files
  type MediaFile,
  type InsertMediaFile,
  mediaFiles,
  // Agents
  type Agent,
  type InsertAgent,
  agents,
  // Inventory
  type Inventory,
  type InsertInventory,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  inventory,
  inventoryTransactions,
  // Master Orders
  type MasterOrder,
  type InsertMasterOrder,
  masterOrders,
  // Wallet
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  wallets,
  walletTransactions,
  // Delivery Configuration
  type DeliveryConfiguration,
  type InsertDeliveryConfiguration,
  type DeliveryRoute,
  type InsertDeliveryRoute,
  type DeliveryEarnings,
  type InsertDeliveryEarnings,
  deliveryConfiguration,
  deliveryRoutes,
  deliveryEarnings,
  // B2B Invoices
  type B2BInvoice,
  type InsertB2BInvoice,
  b2bInvoices,
  // API Settings
  type ApiSetting,
  type InsertApiSetting,
  apiSettings,
  // User Hierarchy
  type UserHierarchy,
  type InsertUserHierarchy,
  userHierarchy,
  // B2B Registrations
  type B2bRegistration,
  type InsertB2bRegistration,
  b2bRegistrations,
  type B2bApprovalHistory,
  b2bApprovalHistory,
  // Fresh Milk Dispatch
  type FreshMilkRoute,
  type InsertFreshMilkRoute,
  type FreshMilkDispatch,
  type InsertFreshMilkDispatch,
  type FreshMilkDispatchItem,
  type InsertFreshMilkDispatchItem,
  type FreshMilkReturn,
  type InsertFreshMilkReturn,
  // Database table imports  
  users,
  restaurants,
  menuItems,
  orders,
  merchants,
  clients,
  items,
  plans,
  invoices,
  payouts,
  reservations,
  promos,
  notifications,
  earnings,
  attributes,
  marketingCampaigns,
  paymentGateways,
  upiTransactions,
  pricingTiers,
  ewayBills,
  ewayBillConfig,
  ewayBillLogs,
  hsnCodes,
  gstReturns,
  orders as ordersTable
} from "@shared/schema";
import { randomUUID, scrypt, scryptSync } from "crypto";
import { promisify } from "util";
import { eq, desc, asc, like, or, sql, and, inArray } from "drizzle-orm";
import { db } from "../db";

export interface IStorage {
  // District Unions
  getRestaurants(cuisine?: string, searchQuery?: string): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: string): Promise<boolean>;

  // Menu Items
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItems(restaurantId: string, category?: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Master Orders
  createMasterOrder(masterOrder: InsertMasterOrder): Promise<MasterOrder>;
  getMasterOrder(id: string): Promise<MasterOrder | undefined>;
  getMasterOrders(restaurantId?: string): Promise<MasterOrder[]>;
  updateMasterOrder(id: string, data: Partial<InsertMasterOrder>): Promise<MasterOrder | undefined>;
  getSegmentOrders(masterOrderId: string): Promise<Order[]>;

  // Orders
  getOrders(restaurantId?: string): Promise<Order[]>;
  getOrdersByPhone(phone: string, email?: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder & { ewayBillId?: string }>): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderWorkflowStatus(id: string, workflowStatus: string): Promise<Order | undefined>;

  // Users
  listUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;
  findUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Delivery Points
  getDeliveryPoints(userId: string): Promise<DeliveryPoint[]>;
  getDeliveryPoint(id: string): Promise<DeliveryPoint | undefined>;
  createDeliveryPoint(point: InsertDeliveryPoint): Promise<DeliveryPoint>;
  updateDeliveryPoint(id: string, point: Partial<InsertDeliveryPoint>): Promise<DeliveryPoint | undefined>;
  deleteDeliveryPoint(id: string): Promise<boolean>;

  // Analytics
  getPlatformMetrics(range?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByDay: { date: string; count: number; revenue: number }[];
    topRestaurants: { restaurantId: string; name: string; orderCount: number; revenue: number }[];
    avgDeliveryTime: number;
    orderStatusBreakdown: { status: string; count: number }[];
  }>;

  // Admin Analytics for Karenderia
  getAdminAnalytics(): Promise<{
    totalSales: number;
    totalMerchants: number;
    totalCommission: number;
    totalSubscriptions: number;
    commissionWeek: number;
    commissionMonth: number;
    subscriptionsMonth: number;
    ordersReceived: number;
    ordersDelivered: number;
    newCustomers: number;
    totalRefund: number;
    recentOrders: Array<{
      id: string;
      status: string;
      total: number;
      customerEmail: string;
      restaurantName: string;
      createdAt: string;
      productSegment?: string;
      pricingRole?: string;
    }>;
    topCustomers: Array<{
      id: string;
      name: string;
      email: string;
      totalOrders: number;
      totalSpent: number;
    }>;
    roleWiseOrders?: {
      federation: number;
      interUnion: number;
      wholesaleDealer: number;
      dealer: number;
      retailer: number;
      mrp: number;
    };
    segmentWiseOrders?: {
      freshMilk: number;
      products: number;
      iceCream: number;
    };
    segmentRoleOrders?: {
      freshMilk: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
      products: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
      iceCream: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
    };
  }>;

  // Categories
  getCategories(merchantId: string): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number}[]>;
  getCategory(id: string): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number} | undefined>;
  createCategory(category: {merchantId: string; name: string; isActive?: boolean; sortOrder?: number}): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number}>;
  updateCategory(id: string, category: Partial<{name: string; isActive: boolean; sortOrder: number}>): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number} | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Merchants (Karenderia style)
  getMerchants(status?: string): Promise<Merchant[]>;
  getMerchant(id: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, merchant: Partial<InsertMerchant>): Promise<Merchant | undefined>;
  deleteMerchant(id: string): Promise<boolean>;

  // Clients (Customers)
  getClients(status?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Items (Menu items extended)
  getItems(merchantId?: string, status?: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;

  // Plans (Memberships)
  getPlans(status?: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Invoices
  getInvoices(merchantId?: string, status?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // B2B Invoices
  getB2BInvoices(merchantId: string, startDate?: Date, endDate?: Date): Promise<B2BInvoice[]>;
  getB2BInvoice(id: string): Promise<B2BInvoice | undefined>;
  createB2BInvoice(invoice: InsertB2BInvoice): Promise<B2BInvoice>;
  updateB2BInvoice(id: string, invoice: Partial<InsertB2BInvoice>): Promise<B2BInvoice | undefined>;
  deleteB2BInvoice(id: string): Promise<boolean>;
  getNextB2BInvoiceNo(merchantId: string, segment: string): Promise<string>;

  // Payouts
  getPayouts(merchantId?: string, status?: string): Promise<Payout[]>;
  getPayout(id: string): Promise<Payout | undefined>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  updatePayout(id: string, payout: Partial<InsertPayout>): Promise<Payout | undefined>;
  deletePayout(id: string): Promise<boolean>;

  // Reservations
  getReservations(merchantId?: string, status?: string): Promise<Reservation[]>;
  getReservation(id: string): Promise<Reservation | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation | undefined>;
  deleteReservation(id: string): Promise<boolean>;

  // Promos
  getPromos(status?: string): Promise<Promo[]>;
  getPromo(id: string): Promise<Promo | undefined>;
  createPromo(promo: InsertPromo): Promise<Promo>;
  updatePromo(id: string, promo: Partial<InsertPromo>): Promise<Promo | undefined>;
  deletePromo(id: string): Promise<boolean>;

  // Notifications
  getNotifications(targetType?: string, targetId?: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;

  // Earnings
  getEarnings(merchantId?: string, status?: string): Promise<Earning[]>;
  getEarning(id: string): Promise<Earning | undefined>;
  createEarning(earning: InsertEarning): Promise<Earning>;
  updateEarning(id: string, earning: Partial<InsertEarning>): Promise<Earning | undefined>;
  deleteEarning(id: string): Promise<boolean>;

  // Attributes
  getAttributes(isActive?: boolean): Promise<Attribute[]>;
  getAttribute(id: string): Promise<Attribute | undefined>;
  createAttribute(attribute: InsertAttribute): Promise<Attribute>;
  updateAttribute(id: string, attribute: Partial<InsertAttribute>): Promise<Attribute | undefined>;
  deleteAttribute(id: string): Promise<boolean>;

  // Marketing Campaigns
  getMarketingCampaigns(status?: string): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string): Promise<boolean>;

  // Payment Gateways
  getPaymentGateways(status?: string): Promise<PaymentGateway[]>;
  getPaymentGateway(id: string): Promise<PaymentGateway | undefined>;
  createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined>;
  deletePaymentGateway(id: string): Promise<boolean>;

  // UPI Transactions
  getUpiTransactions(orderId?: string, status?: string): Promise<UpiTransaction[]>;
  getUpiTransaction(id: string): Promise<UpiTransaction | undefined>;
  getUpiTransactionByMerchantId(merchantTransactionId: string): Promise<UpiTransaction | undefined>;
  createUpiTransaction(transaction: InsertUpiTransaction): Promise<UpiTransaction>;
  updateUpiTransaction(id: string, transaction: Partial<InsertUpiTransaction>): Promise<UpiTransaction | undefined>;
  deleteUpiTransaction(id: string): Promise<boolean>;

  // Razorpay Transactions
  getRazorpayTransactions(): Promise<RazorpayTransaction[]>;
  getRazorpayTransaction(id: string): Promise<RazorpayTransaction | undefined>;
  getRazorpayTransactionByOrderId(razorpayOrderId: string): Promise<RazorpayTransaction | undefined>;
  getRazorpayTransactionByPaymentId(razorpayPaymentId: string): Promise<RazorpayTransaction | undefined>;
  createRazorpayTransaction(transaction: InsertRazorpayTransaction): Promise<RazorpayTransaction>;
  updateRazorpayTransaction(id: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined>;
  updateRazorpayTransactionByOrderId(razorpayOrderId: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined>;
  updateRazorpayTransactionByPaymentId(razorpayPaymentId: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined>;

  // Cashfree Transactions
  getCashfreeTransactions(): Promise<CashfreeTransaction[]>;
  getCashfreeTransactionByCfOrderId(cfOrderId: string): Promise<CashfreeTransaction | undefined>;
  createCashfreeTransaction(tx: InsertCashfreeTransaction): Promise<CashfreeTransaction>;
  updateCashfreeTransaction(id: number, tx: Partial<InsertCashfreeTransaction>): Promise<CashfreeTransaction | undefined>;
  updateCashfreeTransactionByCfOrderId(cfOrderId: string, tx: Partial<InsertCashfreeTransaction>): Promise<CashfreeTransaction | undefined>;

  // Cashfree Payment Links
  getCashfreePaymentLinks(): Promise<CashfreePaymentLink[]>;
  getCashfreePaymentLink(linkId: string): Promise<CashfreePaymentLink | undefined>;
  createCashfreePaymentLink(link: InsertCashfreePaymentLink): Promise<CashfreePaymentLink>;
  updateCashfreePaymentLink(linkId: string, link: Partial<InsertCashfreePaymentLink>): Promise<CashfreePaymentLink | undefined>;

  // Cashfree Split Vendors
  getCashfreeSplitVendors(): Promise<CashfreeSplitVendor[]>;
  getCashfreeSplitVendor(vendorId: string): Promise<CashfreeSplitVendor | undefined>;
  createCashfreeSplitVendor(vendor: InsertCashfreeSplitVendor): Promise<CashfreeSplitVendor>;
  updateCashfreeSplitVendor(vendorId: string, vendor: Partial<InsertCashfreeSplitVendor>): Promise<CashfreeSplitVendor | undefined>;

  // Cashfree Order Splits
  getCashfreeOrderSplits(orderId?: string): Promise<CashfreeOrderSplit[]>;
  createCashfreeOrderSplit(split: InsertCashfreeOrderSplit): Promise<CashfreeOrderSplit>;

  // Cashfree Beneficiaries
  getCashfreeBeneficiaries(): Promise<CashfreeBeneficiary[]>;
  getCashfreeBeneficiary(beneId: string): Promise<CashfreeBeneficiary | undefined>;
  createCashfreeBeneficiary(bene: InsertCashfreeBeneficiary): Promise<CashfreeBeneficiary>;
  deleteCashfreeBeneficiary(beneId: string): Promise<boolean>;

  // Cashfree Payouts
  getCashfreePayouts(): Promise<CashfreePayout[]>;
  getCashfreePayout(transferId: string): Promise<CashfreePayout | undefined>;
  createCashfreePayout(payout: InsertCashfreePayout): Promise<CashfreePayout>;
  updateCashfreePayout(transferId: string, payout: Partial<InsertCashfreePayout>): Promise<CashfreePayout | undefined>;

  // Cashfree SoftPOS Terminals
  getCashfreeSoftposTerminals(merchantId?: string): Promise<CashfreeSoftposTerminal[]>;
  createCashfreeSoftposTerminal(terminal: InsertCashfreeSoftposTerminal): Promise<CashfreeSoftposTerminal>;

  // Pricing Tiers
  getPricingTiers(isActive?: boolean): Promise<PricingTier[]>;
  getPricingTier(id: string): Promise<PricingTier | undefined>;
  getPricingTierByCode(tierCode: string): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: string, tier: Partial<InsertPricingTier>): Promise<PricingTier | undefined>;
  deletePricingTier(id: string): Promise<boolean>;
  calculateTierPrice(mrp: number, tierCode: string, productPrices?: { federationPrice?: number; districtUnionPrice?: number; wholesalePrice?: number; retailPrice?: number }): Promise<number>;

  // E-way Bill
  getEwayBills(filters?: { status?: string; merchantId?: string; fromDate?: Date; toDate?: Date; search?: string }): Promise<EwayBill[]>;
  getEwayBillById(id: string): Promise<EwayBill | undefined>;
  createEwayBill(ewayBill: InsertEwayBill): Promise<EwayBill>;
  updateEwayBill(id: string, ewayBill: Partial<InsertEwayBill>): Promise<EwayBill | undefined>;
  deleteEwayBill(id: string): Promise<boolean>;
  getEwayBillStats(): Promise<{ total: number; active: number; expired: number; cancelled: number; draft: number }>;

  // E-way Bill Configuration
  getEwayBillConfig(merchantId?: string): Promise<EwayBillConfig | undefined>;
  saveEwayBillConfig(config: InsertEwayBillConfig): Promise<EwayBillConfig>;

  // E-way Bill Logs
  getEwayBillLogs(ewayBillId?: string): Promise<EwayBillLog[]>;
  createEwayBillLog(log: InsertEwayBillLog): Promise<EwayBillLog>;

  // HSN Codes
  getHsnCodes(category?: string, search?: string): Promise<HsnCode[]>;
  getHsnCode(hsnCode: string): Promise<HsnCode | undefined>;
  createHsnCode(hsnCode: InsertHsnCode): Promise<HsnCode>;
  
  // Order by ID helper
  getOrderById(id: string): Promise<Order | undefined>;
  
  // GST Returns
  getGstReturnsByMerchant(merchantId: string): Promise<GstReturn[]>;
  getGstReturnById(id: string): Promise<GstReturn | undefined>;
  getGstReturnByPeriod(merchantId: string, month: number, year: number): Promise<GstReturn | undefined>;
  createGstReturn(gstReturn: Partial<InsertGstReturn>): Promise<GstReturn>;
  updateGstReturn(id: string, gstReturn: Partial<InsertGstReturn>): Promise<GstReturn | undefined>;
  getAllGstReturns(filters?: { month?: number; year?: number; status?: string }): Promise<GstReturn[]>;
  getOrdersByMerchantAndDateRange(merchantId: string | string[], startDate: Date, endDate: Date): Promise<Order[]>;

  // Delhivery Config
  getDelhiveryConfig(merchantId: string): Promise<DelhiveryConfig | undefined>;
  saveDelhiveryConfig(config: Partial<InsertDelhiveryConfig>): Promise<DelhiveryConfig>;

  // Delhivery Warehouses
  getDelhiveryWarehouses(merchantId: string): Promise<DelhiveryWarehouse[]>;
  getDelhiveryWarehouse(id: string): Promise<DelhiveryWarehouse | undefined>;
  createDelhiveryWarehouse(warehouse: InsertDelhiveryWarehouse): Promise<DelhiveryWarehouse>;
  updateDelhiveryWarehouse(id: string, warehouse: Partial<InsertDelhiveryWarehouse>): Promise<DelhiveryWarehouse | undefined>;
  deleteDelhiveryWarehouse(id: string): Promise<boolean>;

  // Delhivery Shipments
  getDelhiveryShipments(merchantId: string, filters?: { status?: string; shipmentType?: string }): Promise<DelhiveryShipment[]>;
  getDelhiveryShipment(id: string): Promise<DelhiveryShipment | undefined>;
  getDelhiveryShipmentByOrder(orderId: string): Promise<DelhiveryShipment | undefined>;
  getDelhiveryShipmentByWaybill(waybill: string): Promise<DelhiveryShipment | undefined>;
  createDelhiveryShipment(shipment: InsertDelhiveryShipment): Promise<DelhiveryShipment>;
  updateDelhiveryShipment(id: string, shipment: Partial<InsertDelhiveryShipment>): Promise<DelhiveryShipment | undefined>;

  // Wholesale Dealers (WSD)
  getAllWholesaleDealers(): Promise<WholesaleDealer[]>;
  getWholesaleDealersByDistrictUnion(districtUnion: string): Promise<WholesaleDealer[]>;
  getWholesaleDealerById(id: string): Promise<WholesaleDealer | undefined>;
  getWholesaleDealerByCode(wsdCode: string): Promise<WholesaleDealer | undefined>;
  getWholesaleDealerByPhone(phone: string): Promise<WholesaleDealer | undefined>;
  updateWholesaleDealerLastLogin(id: string): Promise<void>;
  updateWholesaleDealer(id: string, data: Partial<InsertWholesaleDealer>): Promise<WholesaleDealer | undefined>;

  // Fresh Milk Dealers (FMD)
  getAllFreshMilkDealers(): Promise<FreshMilkDealer[]>;
  getFreshMilkDealerById(id: string): Promise<FreshMilkDealer | undefined>;
  getFreshMilkDealerByCode(fmdCode: string): Promise<FreshMilkDealer | undefined>;
  updateFreshMilkDealerLastLogin(id: string): Promise<void>;

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentByCode(agentCode: string): Promise<Agent | undefined>;
  getAgentByPhone(phone: string): Promise<Agent | undefined>;
  getAgentsByType(agentType: string): Promise<Agent[]>;
  getAgentsByUnion(unionId: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;

  // Media Files
  getMediaFiles(): Promise<MediaFile[]>;
  getMediaFile(id: string): Promise<MediaFile | undefined>;
  createMediaFile(file: InsertMediaFile): Promise<MediaFile>;
  deleteMediaFile(id: string): Promise<boolean>;

  // Inventory Management (B2B users)
  getInventoryByUserId(userId: string): Promise<Inventory[]>;
  getInventoryById(id: string): Promise<Inventory | undefined>;
  getInventoryByUserAndProduct(userId: string, productId: string): Promise<Inventory | undefined>;
  getAllInventory(): Promise<Inventory[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: string, quantity: number, transactionType: string, adjustedBy?: string, notes?: string): Promise<Inventory | undefined>;
  addToInventory(userId: string, productId: string, productName: string, quantity: number, orderId?: string, unitType?: string): Promise<Inventory>;
  
  // Inventory Transactions
  getInventoryTransactions(inventoryId: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;

  // Wallet
  getWalletByUserId(userId: string): Promise<Wallet | undefined>;
  getOrCreateWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit', description?: string, referenceType?: string, referenceId?: string, razorpayPaymentId?: string, razorpayOrderId?: string): Promise<Wallet | undefined>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;

  // Delivery Configuration
  getDeliveryConfiguration(districtUnionId: string): Promise<DeliveryConfiguration | undefined>;
  getAllDeliveryConfigurations(): Promise<DeliveryConfiguration[]>;
  createDeliveryConfiguration(config: InsertDeliveryConfiguration): Promise<DeliveryConfiguration>;
  updateDeliveryConfiguration(districtUnionId: string, config: Partial<InsertDeliveryConfiguration>): Promise<DeliveryConfiguration | undefined>;

  // Delivery Routes
  getDeliveryRoutesByDriver(driverId: string, date?: Date): Promise<DeliveryRoute[]>;
  getDeliveryRoutesByUnion(districtUnionId: string, date?: Date): Promise<DeliveryRoute[]>;
  getDeliveryRoute(id: string): Promise<DeliveryRoute | undefined>;
  createDeliveryRoute(route: InsertDeliveryRoute): Promise<DeliveryRoute>;
  updateDeliveryRoute(id: string, route: Partial<InsertDeliveryRoute>): Promise<DeliveryRoute | undefined>;

  // Delivery Earnings
  getDeliveryEarningsByDriver(driverId: string): Promise<DeliveryEarnings[]>;
  createDeliveryEarning(earning: InsertDeliveryEarnings): Promise<DeliveryEarnings>;
  updateDeliveryEarningPayment(id: string, status: string, reference?: string): Promise<DeliveryEarnings | undefined>;

  // API Settings
  getApiSettings(provider?: string): Promise<ApiSetting[]>;
  getApiSetting(id: number): Promise<ApiSetting | undefined>;
  getApiSettingByService(provider: string, serviceName: string): Promise<ApiSetting | undefined>;
  saveApiSetting(setting: InsertApiSetting): Promise<ApiSetting>;
  updateApiSetting(id: number, setting: Partial<InsertApiSetting>): Promise<ApiSetting | undefined>;
  deleteApiSetting(id: number): Promise<boolean>;

  // User Hierarchy
  getUserHierarchyByParent(parentId: string): Promise<UserHierarchy[]>;
  getUserHierarchyByChild(childId: string): Promise<UserHierarchy[]>;
  getUserHierarchyById(id: string): Promise<UserHierarchy | undefined>;
  createUserHierarchy(data: InsertUserHierarchy): Promise<UserHierarchy>;
  updateUserHierarchy(id: string, data: Partial<InsertUserHierarchy>): Promise<UserHierarchy | undefined>;
  deleteUserHierarchy(id: string): Promise<boolean>;
  getUserHierarchyByParentEmail(parentEmail: string): Promise<UserHierarchy[]>;
  getUserHierarchyByChildEmail(childEmail: string): Promise<UserHierarchy | undefined>;

  // B2B Registrations
  getB2bRegistrations(status?: string): Promise<B2bRegistration[]>;
  getB2bRegistrationById(id: string): Promise<B2bRegistration | undefined>;
  createB2bRegistration(data: InsertB2bRegistration): Promise<B2bRegistration>;
  updateB2bRegistration(id: string, data: Partial<B2bRegistration>): Promise<B2bRegistration | undefined>;
  deleteB2bRegistration(id: string): Promise<boolean>;
  // B2B Approval History
  createB2bApprovalHistory(data: Omit<B2bApprovalHistory, 'id' | 'createdAt'>): Promise<B2bApprovalHistory>;
  getB2bApprovalHistory(registrationId: string): Promise<B2bApprovalHistory[]>;

  // Fresh Milk Routes
  getFreshMilkRoutes(unionId?: string): Promise<FreshMilkRoute[]>;
  getFreshMilkRoute(id: string): Promise<FreshMilkRoute | undefined>;
  createFreshMilkRoute(route: InsertFreshMilkRoute): Promise<FreshMilkRoute>;
  updateFreshMilkRoute(id: string, route: Partial<InsertFreshMilkRoute>): Promise<FreshMilkRoute | undefined>;
  deleteFreshMilkRoute(id: string): Promise<boolean>;

  // Fresh Milk Dispatches
  getFreshMilkDispatches(filters: { unionId?: string; date?: string; shift?: string; routeId?: string }): Promise<FreshMilkDispatch[]>;
  getFreshMilkDispatch(id: string): Promise<FreshMilkDispatch | undefined>;
  createFreshMilkDispatch(dispatch: InsertFreshMilkDispatch): Promise<FreshMilkDispatch>;
  updateFreshMilkDispatch(id: string, dispatch: Partial<InsertFreshMilkDispatch>): Promise<FreshMilkDispatch | undefined>;
  deleteFreshMilkDispatch(id: string): Promise<boolean>;

  // Fresh Milk Dispatch Items
  getFreshMilkDispatchItems(dispatchId: string): Promise<FreshMilkDispatchItem[]>;
  createFreshMilkDispatchItem(item: InsertFreshMilkDispatchItem): Promise<FreshMilkDispatchItem>;
  updateFreshMilkDispatchItem(id: string, item: Partial<InsertFreshMilkDispatchItem>): Promise<FreshMilkDispatchItem | undefined>;
  deleteFreshMilkDispatchItemsByDispatch(dispatchId: string): Promise<boolean>;

  // Fresh Milk Returns
  getFreshMilkReturns(filters: { unionId?: string; date?: string; shift?: string }): Promise<FreshMilkReturn[]>;
  createFreshMilkReturn(ret: InsertFreshMilkReturn): Promise<FreshMilkReturn>;
  updateFreshMilkReturn(id: string, ret: Partial<InsertFreshMilkReturn>): Promise<FreshMilkReturn | undefined>;
}

