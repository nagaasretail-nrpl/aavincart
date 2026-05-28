import {
  type Restaurant, type MenuItem, type Order, type User,
  deliveryPoints as deliveryPointsTable,
  type DeliveryPoint, type InsertRestaurant, type InsertMenuItem,
  type InsertOrder, type InsertUser, type InsertDeliveryPoint,
  type Merchant, type Client, type Item, type Plan, type Invoice,
  type Payout, type Reservation, type Promo, type Notification,
  type Earning, type Attribute, type MarketingCampaign,
  type PaymentGateway, type UpiTransaction,
  type InsertMerchant, type InsertClient, type InsertItem, type InsertPlan,
  type InsertInvoice, type InsertPayout, type InsertReservation,
  type InsertPromo, type InsertNotification, type InsertEarning,
  type InsertAttribute, type InsertMarketingCampaign,
  type InsertPaymentGateway, type InsertUpiTransaction,
  type RazorpayTransaction, type InsertRazorpayTransaction,
  type CashfreeTransaction, type InsertCashfreeTransaction,
  cashfreeTransactions, type CashfreePaymentLink, type InsertCashfreePaymentLink,
  cashfreePaymentLinks, type CashfreeSplitVendor, type InsertCashfreeSplitVendor,
  cashfreeSplitVendors, type CashfreeOrderSplit, type InsertCashfreeOrderSplit,
  cashfreeOrderSplits, type CashfreeBeneficiary, type InsertCashfreeBeneficiary,
  cashfreeBeneficiaries, type CashfreePayout, type InsertCashfreePayout,
  cashfreePayouts, type CashfreeSoftposTerminal, type InsertCashfreeSoftposTerminal,
  cashfreeSoftposTerminals, type PricingTier, type InsertPricingTier,
  type EwayBill, type InsertEwayBill, type EwayBillConfig, type InsertEwayBillConfig,
  type EwayBillLog, type InsertEwayBillLog, type HsnCode,
  type GstReturn, type InsertGstReturn, type InsertHsnCode,
  type DelhiveryConfig, type InsertDelhiveryConfig,
  type DelhiveryWarehouse, type InsertDelhiveryWarehouse,
  type DelhiveryShipment, type InsertDelhiveryShipment,
  delhiveryConfig, delhiveryWarehouses, delhiveryShipments,
  type WholesaleDealer, wholesaleDealers,
  type FreshMilkDealer, freshMilkDealers,
  type MediaFile, type InsertMediaFile, mediaFiles,
  type Agent, type InsertAgent, agents,
  type Inventory, type InsertInventory, type InventoryTransaction,
  type InsertInventoryTransaction, inventory, inventoryTransactions,
  type MasterOrder, type InsertMasterOrder, masterOrders,
  type Wallet, type InsertWallet, type WalletTransaction,
  type InsertWalletTransaction, wallets, walletTransactions,
  type DeliveryConfiguration, type InsertDeliveryConfiguration,
  type DeliveryRoute, type InsertDeliveryRoute,
  type DeliveryEarnings, type InsertDeliveryEarnings,
  deliveryConfiguration, deliveryRoutes, deliveryEarnings,
  type B2BInvoice, type InsertB2BInvoice, b2bInvoices,
  type ApiSetting, type InsertApiSetting, apiSettings,
  type UserHierarchy, type InsertUserHierarchy, userHierarchy,
  type B2bRegistration, type InsertB2bRegistration, b2bRegistrations,
  type B2bApprovalHistory, b2bApprovalHistory,
  type FreshMilkRoute, type InsertFreshMilkRoute,
  type FreshMilkDispatch, type InsertFreshMilkDispatch,
  type FreshMilkDispatchItem, type InsertFreshMilkDispatchItem,
  type FreshMilkReturn, type InsertFreshMilkReturn,
  users, restaurants, menuItems, orders, merchants, clients, items, plans,
  invoices, payouts, reservations, promos, notifications, earnings,
  attributes, marketingCampaigns, paymentGateways, upiTransactions,
  pricingTiers, ewayBills, ewayBillConfig, ewayBillLogs, hsnCodes, gstReturns,
  orders as ordersTable
} from "@shared/schema";
import { eq, desc, asc, like, or, sql, and, inArray } from "drizzle-orm";
import { db } from "../../db";
import { randomUUID } from "crypto";
import { OrderRepository } from './orders';

export abstract class UserRepository extends OrderRepository {
  async deleteRestaurant(id: string): Promise<boolean> {
    // First check if union exists
    if (!this.restaurants.has(id)) return false;
    
    // Remove all menu items belonging to this union
    const menuItemsToDelete = Array.from(this.menuItems.entries())
      .filter(([_, item]) => item.restaurantId === id)
      .map(([itemId]) => itemId);
    
    menuItemsToDelete.forEach(itemId => {
      this.menuItems.delete(itemId);
    });
    
    // Remove users linked to this union (or set their restaurantId to null)
    Array.from(this.users.entries()).forEach(([userId, user]) => {
      if (user.restaurantId === id) {
        const updated = { ...user, restaurantId: null };
        this.users.set(userId, updated);
      }
    });
    
    // Finally remove the union
    return this.restaurants.delete(id);
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    try {
      const result = await db.delete(menuItems).where(eq(menuItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting menu item from database:', error);
      return this.menuItems.delete(id);
    }
  }

  // User methods
  async listUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async findUserByPhone(phone: string): Promise<User | undefined> {
    const digits = phone.replace(/\D/g, '');
    const [user] = await db.select().from(users).where(eq(users.phone, digits)).limit(1);
    if (user) return user;
    // Fallback: normalize stored values in case they contain formatting
    const all = await db.select().from(users).where(sql`phone IS NOT NULL`);
    return all.find(u => u.phone && u.phone.replace(/\D/g, '') === digits);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      restaurantId: user.restaurantId || null,
    }).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getDeliveryPoints(userId: string): Promise<DeliveryPoint[]> {
    return db.select().from(deliveryPointsTable).where(eq(deliveryPointsTable.userId, userId));
  }

  async getDeliveryPoint(id: string): Promise<DeliveryPoint | undefined> {
    const [point] = await db.select().from(deliveryPointsTable).where(eq(deliveryPointsTable.id, id)).limit(1);
    return point;
  }

  async createDeliveryPoint(point: InsertDeliveryPoint): Promise<DeliveryPoint> {
    const existing = await this.getDeliveryPoints(point.userId);
    const shouldBeDefault = existing.length === 0 ? true : (point.isDefault ?? false);
    if (shouldBeDefault && existing.length > 0) {
      await db.update(deliveryPointsTable)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(deliveryPointsTable.userId, point.userId));
    }
    const [newPoint] = await db.insert(deliveryPointsTable).values({
      userId: point.userId,
      businessId: point.businessId || null,
      pointName: point.pointName,
      contactName: point.contactName || null,
      contactPhone: point.contactPhone || null,
      route: point.route || null,
      deliveryAddress: point.deliveryAddress,
      latitude: point.latitude || null,
      longitude: point.longitude || null,
      isDefault: shouldBeDefault,
    }).returning();
    return newPoint;
  }

  async updateDeliveryPoint(id: string, point: Partial<InsertDeliveryPoint>): Promise<DeliveryPoint | undefined> {
    const existing = await this.getDeliveryPoint(id);
    if (!existing) return undefined;
    if (point.isDefault === true) {
      await db.update(deliveryPointsTable)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(deliveryPointsTable.userId, existing.userId), sql`${deliveryPointsTable.id} != ${id}`));
    }
    const [updated] = await db.update(deliveryPointsTable)
      .set({ ...point, updatedAt: new Date() })
      .where(eq(deliveryPointsTable.id, id))
      .returning();
    return updated;
  }

  async deleteDeliveryPoint(id: string): Promise<boolean> {
    const result = await db.delete(deliveryPointsTable).where(eq(deliveryPointsTable.id, id));
    return true;
  }

  // Analytics methods
  async getPlatformMetrics(range?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByDay: { date: string; count: number; revenue: number }[];
    topRestaurants: { restaurantId: string; name: string; orderCount: number; revenue: number }[];
    avgDeliveryTime: number;
    orderStatusBreakdown: { status: string; count: number }[];
  }> {
    const orders = Array.from(this.orders.values());
    const restaurants = Array.from(this.restaurants.values());
    
    // Calculate basic metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    
    // Orders by day (last 7 days)
    const today = new Date();
    const ordersByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => 
        order.createdAt && new Date(order.createdAt).toISOString().split('T')[0] === dateStr
      );
      
      ordersByDay.push({
        date: dateStr,
        count: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + parseFloat(order.total), 0)
      });
    }
    
    // Top unions by order count
    const restaurantStats = new Map<string, { name: string; orderCount: number; revenue: number }>();
    restaurants.forEach(restaurant => {
      restaurantStats.set(restaurant.id, {
        name: restaurant.name,
        orderCount: 0,
        revenue: 0
      });
    });
    
    orders.forEach(order => {
      const stats = restaurantStats.get(order.restaurantId);
      if (stats) {
        stats.orderCount++;
        stats.revenue += parseFloat(order.total);
      }
    });
    
    const topRestaurants = Array.from(restaurantStats.entries())
      .map(([restaurantId, stats]) => ({ restaurantId, ...stats }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);
    
    // Average delivery time (mock calculation)
    const avgDeliveryTime = 28; // minutes - mock value
    
    // Order status breakdown
    const statusCounts = new Map<string, number>();
    orders.forEach(order => {
      statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
    });
    
    const orderStatusBreakdown = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }));
    
    return {
      totalOrders,
      totalRevenue,
      ordersByDay,
      topRestaurants,
      avgDeliveryTime,
      orderStatusBreakdown
    };
  }

  // Admin Analytics for Karenderia dashboard
  async getAdminAnalytics(): Promise<{
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
    roleWiseOrders: {
      federation: number;
      interUnion: number;
      wholesaleDealer: number;
      dealer: number;
      retailer: number;
      mrp: number;
    };
    segmentWiseOrders: {
      freshMilk: number;
      products: number;
      iceCream: number;
    };
    segmentRoleOrders: {
      freshMilk: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
      products: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
      iceCream: { federation: number; interUnion: number; wholesaleDealer: number; dealer: number; retailer: number; mrp: number };
    };
  }> {
    const merchants = Array.from(this.merchants.values());
    const orders = await this.getOrders(); // Get orders from PostgreSQL database
    const clients = Array.from(this.clients.values());
    const invoices = Array.from(this.invoices.values());
    const earnings = Array.from(this.earnings.values());
    const restaurants = Array.from(this.restaurants.values());

    // Calculate metrics
    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const totalMerchants = merchants.filter(m => m.status === 'active').length;
    const totalCommission = earnings.reduce((sum, earning) => sum + parseFloat(earning.commissionAmount), 0);
    const totalSubscriptions = invoices.filter(i => i.status === 'paid').length;

    // Time-based calculations (mock for now)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const commissionWeek = earnings.filter(e => 
      e.createdAt && new Date(e.createdAt) >= weekAgo
    ).reduce((sum, earning) => sum + parseFloat(earning.commissionAmount), 0);

    const commissionMonth = earnings.filter(e => 
      e.createdAt && new Date(e.createdAt) >= monthAgo
    ).reduce((sum, earning) => sum + parseFloat(earning.commissionAmount), 0);

    const subscriptionsMonth = invoices.filter(i => 
      i.paymentDate && new Date(i.paymentDate) >= monthAgo
    ).length;

    const ordersReceived = orders.length;
    const ordersDelivered = orders.filter(o => o.status === 'delivered').length;
    const newCustomers = clients.filter(c => 
      c.dateCreated && new Date(c.dateCreated) >= monthAgo
    ).length;

    // Total refunds (mock calculation)
    const totalRefund = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded')
      .reduce((sum, order) => sum + parseFloat(order.total), 0);

    // Recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(order => {
        const restaurant = restaurants.find(r => r.id === order.restaurantId);
        return {
          id: order.id,
          status: order.status,
          total: parseFloat(order.total),
          customerEmail: order.customerEmail,
          restaurantName: restaurant?.name || 'Unknown Union',
          createdAt: order.createdAt || new Date().toISOString(),
          productSegment: (order as any).productSegment || '',
          pricingRole: (order as any).pricingRole || 'MRP',
        };
      });

    // Top customers by order count
    const customerStats = new Map<string, { name: string; email: string; totalOrders: number; totalSpent: number }>();
    orders.forEach(order => {
      const existing = customerStats.get(order.customerEmail) || {
        name: order.customerName || order.customerEmail.split('@')[0],
        email: order.customerEmail,
        totalOrders: 0,
        totalSpent: 0
      };
      existing.totalOrders++;
      existing.totalSpent += parseFloat(order.total);
      customerStats.set(order.customerEmail, existing);
    });
    
    const topCustomers = Array.from(customerStats.entries())
      .map(([email, stats]) => ({
        id: email,
        name: stats.name,
        email: stats.email,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10);

    // Role-wise order counts
    const roleWiseOrders = {
      federation: orders.filter(o => (o as any).pricingRole === 'FEDERATION').length,
      interUnion: orders.filter(o => (o as any).pricingRole === 'INTER_UNION').length,
      wholesaleDealer: orders.filter(o => (o as any).pricingRole === 'WHOLESALE_DEALER').length,
      dealer: orders.filter(o => (o as any).pricingRole === 'DEALER').length,
      retailer: orders.filter(o => (o as any).pricingRole === 'RETAILER').length,
      mrp: orders.filter(o => !(o as any).pricingRole || (o as any).pricingRole === 'MRP').length,
    };

    // Segment-wise order counts
    const segmentWiseOrders = {
      freshMilk: orders.filter(o => (o as any).productSegment === 'Fresh Milk').length,
      products: orders.filter(o => (o as any).productSegment === 'Products').length,
      iceCream: orders.filter(o => (o as any).productSegment === 'Ice Cream').length,
    };

    // Segment + Role cross-tabulation
    const getSegmentRoleCounts = (segment: string) => {
      const segOrders = orders.filter(o => (o as any).productSegment === segment);
      return {
        federation: segOrders.filter(o => (o as any).pricingRole === 'FEDERATION').length,
        interUnion: segOrders.filter(o => (o as any).pricingRole === 'INTER_UNION').length,
        wholesaleDealer: segOrders.filter(o => (o as any).pricingRole === 'WHOLESALE_DEALER').length,
        dealer: segOrders.filter(o => (o as any).pricingRole === 'DEALER').length,
        retailer: segOrders.filter(o => (o as any).pricingRole === 'RETAILER').length,
        mrp: segOrders.filter(o => !(o as any).pricingRole || (o as any).pricingRole === 'MRP').length,
      };
    };

    const segmentRoleOrders = {
      freshMilk: getSegmentRoleCounts('Fresh Milk'),
      products: getSegmentRoleCounts('Products'),
      iceCream: getSegmentRoleCounts('Ice Cream'),
    };

    return {
      totalSales,
      totalMerchants,
      totalCommission,
      totalSubscriptions,
      commissionWeek,
      commissionMonth,
      subscriptionsMonth,
      ordersReceived,
      ordersDelivered,
      newCustomers,
      totalRefund,
      recentOrders,
      topCustomers,
      roleWiseOrders,
      segmentWiseOrders,
      segmentRoleOrders,
    };
  }

  // Categories CRUD
  async getCategories(merchantId: string): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number}[]> {
    return Array.from(this.categories.values())
      .filter(cat => cat.merchantId === merchantId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getCategory(id: string): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number} | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: {merchantId: string; name: string; isActive?: boolean; sortOrder?: number}): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number}> {
    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const existingCats = Array.from(this.categories.values()).filter(c => c.merchantId === category.merchantId);
    const newCategory = {
      id,
      merchantId: category.merchantId,
      name: category.name,
      isActive: category.isActive ?? true,
      sortOrder: category.sortOrder ?? existingCats.length + 1,
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<{name: string; isActive: boolean; sortOrder: number}>): Promise<{id: string; merchantId: string; name: string; isActive: boolean; sortOrder: number} | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Sub-Users CRUD
  async getSubUsers(parentType: string, parentId: string): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date}[]> {
    return Array.from(this.subUsers.values())
      .filter(user => user.parentType === parentType && user.parentId === parentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSubUser(id: string): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date} | undefined> {
    return this.subUsers.get(id);
  }

  async getSubUserByUsername(username: string): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date} | undefined> {
    return Array.from(this.subUsers.values()).find(user => user.username === username);
  }

  async getSubUserByPhone(phone: string): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date} | undefined> {
    const digits = phone.replace(/\D/g, '');
    return Array.from(this.subUsers.values()).find(user => user.phone && user.phone.replace(/\D/g, '') === digits);
  }

  async createSubUser(subUser: {parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; permissions?: string[]}): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date}> {
    const id = `subuser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const newSubUser = {
      id,
      parentType: subUser.parentType,
      parentId: subUser.parentId,
      name: subUser.name,
      email: subUser.email,
      phone: subUser.phone,
      username: subUser.username,
      passwordHash: subUser.passwordHash,
      isActive: true,
      permissions: subUser.permissions || [],
      createdAt: now,
      updatedAt: now,
    };
    this.subUsers.set(id, newSubUser);
    return newSubUser;
  }

  async updateSubUser(id: string, updates: Partial<{name: string; email: string; phone: string; isActive: boolean; permissions: string[]; passwordHash: string}>): Promise<{id: string; parentType: string; parentId: string; name: string; email: string; phone?: string; username: string; passwordHash: string; isActive: boolean; permissions: string[]; lastLogin?: Date; createdAt: Date; updatedAt: Date} | undefined> {
    const existing = this.subUsers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.subUsers.set(id, updated);
    return updated;
  }

  async deleteSubUser(id: string): Promise<boolean> {
    return this.subUsers.delete(id);
  }

  async updateSubUserLastLogin(id: string): Promise<void> {
    const existing = this.subUsers.get(id);
    if (existing) {
      existing.lastLogin = new Date();
      this.subUsers.set(id, existing);
    }
  }

  // Merchants CRUD - Using Database
}
