import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, getAllIdsForMerchant, resolveDistrictUnionToMerchantId } from "./shared";
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, getCached, setCache, invalidateCache } from "./utils";
import { z } from "zod";
import { randomUUID, createHmac, timingSafeEqual, randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import ExcelJS from "exceljs";
import {
  unionStaff, userAddresses, users as usersTable, agents as agentsTable,
  businessRoutes, deliveryPartners, b2bRegistrations,
  inventoryBatches, goodsReceiptNotes, salesReturns,
  collections as collectionsTable, outstandingLedger, schemes,
  staffAttendance, beatPlans, outletVisits, vehicles, pickLists,
  orders as ordersTable, userActivityLogs, deliveryShifts, deliveryWalletTransactions,
  kdsUsers, kdsSettings, deliveryPoints as deliveryPointsTable,
  tallyImportLogs, tallyLedgerRaw, tallyStockitemRaw, tallyVoucherRaw,
  deliveryRoutes, userHierarchy, invoiceSequences,
  transportHubs, tripSheets, loadManifests, transportRoutePoints,
  driverPerformance, butterMilkStops, driverLocations,
  bulkInvoices, deliveryJobs, gstFilingPeriods,
  upiTransactions, cashfreeSoftposTerminals, cashfreePaymentLinks,
  cashfreeBeneficiaries as cashfreeBeneficiariesTable,
  cashfreePayouts as cashfreePayoutsTable,
  bulkDeliveryLocations, manualBillBatches, manualBills,
  milkRouteAgents, milkDispatchEntries, milkAgentLedger,
  mmoOffices, mmoRoutes, mmoRouteAgents,
  insertMmoOfficeSchema, insertMmoRouteSchema, insertMmoRouteAgentSchema,
  auditLogs,
  type Restaurant, type MenuItem, type Order, type User,
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
  type PricingTier, type InsertPricingTier,
  type EwayBill, type InsertEwayBill,
  type GstReturn, type InsertGstReturn,
  type DelhiveryConfig, type InsertDelhiveryConfig,
  type WholesaleDealer, type FreshMilkDealer,
  type MediaFile, type InsertMediaFile,
  type Agent, type InsertAgent,
  type MasterOrder, type InsertMasterOrder, masterOrders,
  type Wallet, type InsertWallet,
  type WalletTransaction, type InsertWalletTransaction, wallets, walletTransactions,
  type B2BInvoice, type InsertB2BInvoice, b2bInvoices,
  type ApiSetting, deliveryConfiguration, deliveryRoutes as deliveryRoutesTable,
  type UserHierarchy, type InsertUserHierarchy,
  type B2bRegistration, type InsertB2bRegistration,
  type FreshMilkRoute, type InsertFreshMilkRoute,
  type FreshMilkDispatch, type InsertFreshMilkDispatch,
  type FreshMilkReturn, type InsertFreshMilkReturn,
  UNION_STAFF_DESIGNATIONS, AGENT_TYPES, AGENT_PRICING_ROLES,
  insertMmoOfficeSchema as insertMmoOffice,
  pricingTiers, ewayBills, ewayBillConfig, ewayBillLogs, hsnCodes, gstReturns,
  users, restaurants, menuItems, orders, merchants, clients, items, plans,
  invoices, payouts, reservations, promos, notifications, earnings,
  attributes, marketingCampaigns, paymentGateways, upiTransactions as upiTransactionsTable,
} from "@shared/schema";
import { objectStorageClient, ObjectStorageService } from "../replit_integrations/object_storage";
import { logAudit, diffObjects } from "../audit";

export async function registerCatalogRoutes(app: Express): Promise<void> {
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getAllMenuItems();
      // Filter out retailer pricing for merchants that don't have it enabled
      const merchantCache: Record<string, boolean | undefined> = {};
      const filteredItems = await Promise.all(menuItems.map(async (item: any) => {
        if (!item.restaurantId) return item;
        // Cache merchant lookup to avoid repeated queries
        if (!(item.restaurantId in merchantCache)) {
          const merchant = await storage.getMerchant(item.restaurantId);
          merchantCache[item.restaurantId] = merchant?.retailerPriceEnabled;
        }
        if (!merchantCache[item.restaurantId]) {
          const { retailerPrice, ...filteredItem } = item;
          return filteredItem;
        }
        return item;
      }));
      res.json(filteredItems);
    } catch (error) {
      console.error('Error fetching all menu items:', error);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  });

  // Admin Menu Item Management
  app.get("/api/admin/restaurants/:id/menu-items", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.id);
      res.json(menuItems);
    } catch (error) {
      console.error('Error fetching menu items for admin:', error);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  });

  app.post("/api/admin/restaurants/:restaurantId/menu-items", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const menuItemData = { ...req.body, restaurantId: req.params.restaurantId };
      const validatedMenuItem = insertMenuItemSchema.parse(menuItemData);
      const menuItem = await storage.createMenuItem(validatedMenuItem);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid menu item data', details: error.errors });
      }
      console.error('Error creating menu item:', error);
      res.status(500).json({ error: 'Failed to create menu item' });
    }
  });

  app.patch("/api/admin/menu-items/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      // Validate updates against partial schema
      const updates = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(req.params.id, updates);
      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid menu item data', details: error.errors });
      }
      console.error('Error updating menu item:', error);
      res.status(500).json({ error: 'Failed to update menu item' });
    }
  });

  app.delete("/api/admin/menu-items/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteMenuItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({ error: 'Failed to delete menu item' });
    }
  });

  app.get("/api/admin/duplicate-products", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const allRestaurants = await storage.getRestaurants();
      const duplicates: Array<{
        name: string;
        restaurantId: string;
        restaurantName: string;
        items: any[];
      }> = [];

      for (const restaurant of allRestaurants) {
        const items = await storage.getMenuItems(restaurant.id);
        const nameMap = new Map<string, any[]>();
        for (const item of items) {
          const key = item.name.trim().toLowerCase();
          if (!nameMap.has(key)) nameMap.set(key, []);
          nameMap.get(key)!.push(item);
        }
        for (const [, group] of nameMap) {
          if (group.length > 1) {
            duplicates.push({
              name: group[0].name,
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              items: group,
            });
          }
        }
      }

      res.json(duplicates);
    } catch (error) {
      console.error('Error fetching duplicate products:', error);
      res.status(500).json({ error: 'Failed to fetch duplicate products' });
    }
  });

  // Admin Order Management
  app.get("/api/admin/orders", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status, restaurantId } = req.query;
      const scope = getUnionScope(req);
      const effectiveRestaurantId = scope.isGlobalAdmin ? (restaurantId as string) : scope.merchantId!;
      let orders = await storage.getOrders(effectiveRestaurantId);
      if (!scope.isGlobalAdmin && !restaurantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId!);
        orders = orders.filter(o => validIds.includes(o.restaurantId));
      }
      if (status) {
        orders = orders.filter(order => order.status === status);
      }
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders for admin:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Manual order recovery endpoint — creates a confirmed+paid order from a captured Razorpay payment
  // that was not auto-processed (e.g. missing cartSnapshot). Writes full audit trail automatically.
  app.post("/api/admin/order-recovery", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const {
        gatewayPaymentId,   // pay_XXXX
        gatewayOrderId,     // order_XXXX
        paymentOrderId,     // payment_orders.id (UUID)
        customerName,
        customerPhone,
        customerEmail,
        restaurantId,
        items,              // [{id, name, price, itemId, quantity, category, restaurantId, productSegment}]
        total,
        paymentMethod,      // 'razorpay'
        vpa,                // UPI address if applicable
        capturedAt,         // ISO timestamp
        recoveryReason,     // human explanation
        agentName,
        deliveryAddress,
      } = req.body;

      if (!gatewayPaymentId || !items || !total || !customerPhone || !restaurantId) {
        return res.status(400).json({ error: "gatewayPaymentId, items, total, customerPhone, restaurantId are required" });
      }

      const subtotal = Number(total);
      const segmentSuffix = items[0]?.productSegment === 'Fresh Milk' ? 'FM'
        : items[0]?.productSegment === 'Ice Cream' ? 'IC' : 'DP';

      // Derive next display_id
      const lastOrder = await db.execute(
        sql`SELECT display_id FROM orders WHERE display_id LIKE ${`ORD%${segmentSuffix}`} ORDER BY created_at DESC LIMIT 1`
      );
      const lastDisplayId = (lastOrder.rows[0] as any)?.display_id || `ORD0000-${segmentSuffix}`;
      const lastNum = parseInt(lastDisplayId.replace('ORD', '').replace(`-${segmentSuffix}`, ''), 10) || 0;
      const displayId = `ORD${String(lastNum + 1).padStart(4, '0')}-${segmentSuffix}`;

      const capturedTs = capturedAt ? new Date(capturedAt) : new Date();

      // Create the order
      const [newOrder] = await db.execute(
        sql`INSERT INTO orders (
          id, customer_name, customer_email, customer_phone,
          restaurant_id, items, subtotal, delivery_fee, tax, total,
          delivery_address, payment_method, status, order_type,
          product_segment, pricing_role, agent_name, display_id,
          segment_suffix, workflow_status, payment_status,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${customerName}, ${customerEmail || `${customerPhone}@b2b.aavincart.com`}, ${customerPhone},
          ${restaurantId},
          ${JSON.stringify(items)}::jsonb,
          ${subtotal}, 0, 0, ${subtotal},
          ${deliveryAddress || 'Salem, Tamil Nadu'},
          ${paymentMethod || 'razorpay'},
          'confirmed', 'delivery',
          ${items[0]?.productSegment || 'Fresh Milk'}, 'MRP',
          ${agentName || customerName},
          ${displayId}, ${segmentSuffix}, 'pending', 'paid',
          ${capturedTs.toISOString()}, NOW()
        ) RETURNING id, display_id`
      );
      const orderId = (newOrder as any).id;

      // Update payment_orders to captured
      if (paymentOrderId) {
        await db.execute(
          sql`UPDATE payment_orders SET status = 'captured', amount_paid = ${subtotal}, amount_due = 0, updated_at = NOW() WHERE id = ${paymentOrderId}`
        );
      }

      // Insert payment_transactions record
      await db.execute(
        sql`INSERT INTO payment_transactions (
          id, payment_order_id, order_id, merchant_id, gateway_name,
          gateway_payment_id, gateway_order_id, payment_method, vpa,
          amount, fee, tax, net_amount, status, captured, captured_at,
          gateway_created_at, created_at
        ) VALUES (
          gen_random_uuid(),
          ${paymentOrderId || null}, ${orderId}, ${restaurantId}, 'razorpay',
          ${gatewayPaymentId}, ${gatewayOrderId || null},
          ${paymentMethod || 'razorpay'}, ${vpa || null},
          ${subtotal}, 0, 0, ${subtotal},
          'captured', true,
          ${capturedTs.toISOString()}, ${capturedTs.toISOString()},
          NOW()
        )`
      );

      // Write audit log
      const adminUser = (req as any).user;
      await db.insert(auditLogs).values({
        tableName: 'orders',
        recordId: orderId,
        action: 'MANUAL_RECOVERY',
        changedFields: ['display_id', 'customer_name', 'total', 'payment_status', 'gateway_payment_id'],
        previousValues: { note: 'Order did not exist — payment captured but auto-processing failed' } as any,
        newValues: {
          displayId,
          customerName,
          customerPhone,
          total: subtotal,
          items: items.map((i: any) => `${i.name} x${i.quantity}`).join(', '),
          paymentStatus: 'paid',
          gatewayPaymentId,
          gatewayOrderId: gatewayOrderId || null,
          recoveryReason: recoveryReason || 'Manual recovery by admin',
          recoveredAt: new Date().toISOString(),
        } as any,
        changedByUserId: adminUser?.id || null,
        changedByName: adminUser?.name || adminUser?.email || 'Admin',
        changedByRole: 'admin',
        ipAddress: req.headers['x-forwarded-for'] as string || req.ip || null,
      });

      console.log(`[ORDER RECOVERY] ${displayId} — ${customerName} (${customerPhone}) — ₹${subtotal} — ${gatewayPaymentId} — recovered by ${adminUser?.email || 'admin'}`);

      res.json({
        success: true,
        orderId,
        displayId,
        message: `Order ${displayId} recovered and audit log written`,
      });
    } catch (error) {
      console.error("[ORDER RECOVERY] Error:", error);
      res.status(500).json({ error: "Failed to recover order" });
    }
  });

  app.get("/api/admin/orders/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin) {
        const validIds = getAllIdsForMerchant(scope.merchantId!);
        if (!validIds.includes(order.restaurantId)) {
          return res.status(403).json({ error: 'Access denied: order belongs to another union' });
        }
      }
      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  app.patch("/api/admin/orders/:id/status", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const currentOrder = await storage.getOrder(req.params.id);
      if (!currentOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const statusScope = getUnionScope(req);
      if (!statusScope.isGlobalAdmin) {
        const validIds = getAllIdsForMerchant(statusScope.merchantId!);
        if (!validIds.includes(currentOrder.restaurantId)) {
          return res.status(403).json({ error: 'Access denied: order belongs to another union' });
        }
      }
      
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      await logAudit(req, "orders", req.params.id, "UPDATE", { changedFields: ["status"], previousValues: { status: currentOrder.status }, newValues: { status } });
      
      // Auto-update B2B user inventory when order is delivered
      if (status === 'delivered' && order.pricingRole && order.pricingRole !== 'MRP') {
        try {
          // Find the user by email
          const user = await storage.findUserByEmail(order.customerEmail);
          if (user) {
            // B2B roles that should have inventory tracking (support both formats)
            const b2bRoles = ['WHOLESALE_DEALER', 'WSD', 'DEALER', 'DLR', 'RETAILER', 'RTL'];
            if (user.pricingRole && b2bRoles.includes(user.pricingRole)) {
              // Update inventory for each item in the order
              const orderItems = order.items as any[];
              for (const item of orderItems) {
                await storage.addToInventory(
                  user.id,
                  item.itemId || item.id,
                  item.name,
                  item.quantity,
                  order.id,
                  item.unitType
                );
              }
            }
          }
        } catch (invError) {
          console.error('Error updating inventory on order delivery:', invError);
          // Don't fail the order status update if inventory update fails
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  app.put("/api/admin/orders/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });

  app.get("/api/admin/users/stats", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      let allUsers = await storage.listUsers();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        allUsers = allUsers.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
      }
      const protectedRoles = ['admin', 'merchant', 'driver'];
      const b2bUsers = allUsers.filter(u => !protectedRoles.includes(u.role));
      
      const byUnion: Record<string, number> = {};
      b2bUsers.forEach(u => {
        const union = (u as any).districtUnion || (u as any).unionId || 'Unassigned';
        byUnion[union] = (byUnion[union] || 0) + 1;
      });
      
      const byRole: Record<string, number> = {
        wsd: 0, dealer: 0, retailer: 0, mpcs: 0,
        hotel: 0, institution: 0, private_parlour: 0,
        union_parlour: 0, general_shop: 0,
      };
      b2bUsers.forEach(u => {
        const bt = ((u as any).businessType || '').toUpperCase();
        let key = 'general_shop';
        if (bt === 'WSD') key = 'wsd';
        else if (bt === 'DLR' || bt === 'DEALER') key = 'dealer';
        else if (bt === 'MPCS') key = 'mpcs';
        else if (bt === 'HOTELS' || bt === 'HOTEL') key = 'hotel';
        else if (bt === 'INSTUTION' || bt === 'INSTITUTION') key = 'institution';
        else if (bt === 'PRIVATE PARLOUR') key = 'private_parlour';
        else if (bt === 'UNION PARLOUR') key = 'union_parlour';
        else if (bt === 'GENERAL SHOP' || bt === 'RETAIL') key = 'general_shop';
        else if (bt === 'RETAILER' || bt === 'RTL') key = 'retailer';
        else {
          const role = u.role || '';
          if (role === 'wholesale_dealer' || role === 'wsd') key = 'wsd';
          else if (role === 'dealer') key = 'dealer';
          else if (role === 'retailer') key = 'retailer';
          else if (role === 'mpcs') key = 'mpcs';
          else if (role === 'hotel') key = 'hotel';
          else if (role === 'institution') key = 'institution';
          else if (role === 'private_parlour') key = 'private_parlour';
          else if (role === 'union_parlour') key = 'union_parlour';
          else key = 'general_shop';
        }
        byRole[key]++;
      });
      
      const merchants = await storage.getMerchants();
      const districtUnionCount = merchants.length;
      
      res.json({
        total: b2bUsers.length,
        districtUnions: districtUnionCount,
        byRole,
        byUnion,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  function getDateRange(range: string | undefined): { startDate: Date; endDate: Date | null } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;

    switch (range) {
      case 'yesterday': {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }
    return { startDate, endDate };
  }

  function buildDateCondition(column: any, startDate: Date, endDate: Date | null) {
    if (endDate) {
      return and(gte(column, startDate), lte(column, endDate));
    }
    return gte(column, startDate);
  }

  app.get("/api/admin/user-metrics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = getDateRange(range as string);

      const signedInResult = await db.select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .where(buildDateCondition(usersTable.lastLogin, startDate, endDate));

      const signupsResult = await db.select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .where(buildDateCondition(usersTable.createdAt, startDate, endDate));

      res.json({
        signedInCount: Number(signedInResult[0]?.count || 0),
        signupsCount: Number(signupsResult[0]?.count || 0),
        range: range || 'today',
      });
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      res.status(500).json({ error: 'Failed to fetch user metrics' });
    }
  });

  app.get("/api/admin/user-metrics/signed-in", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { range, search } = req.query;
      const { startDate, endDate } = getDateRange(range as string);

      let results = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        unionId: usersTable.unionId,
        districtUnion: usersTable.districtUnion,
        businessType: usersTable.businessType,
        lastLogin: usersTable.lastLogin,
      })
        .from(usersTable)
        .where(buildDateCondition(usersTable.lastLogin, startDate, endDate))
        .orderBy(desc(usersTable.lastLogin));

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.toLowerCase().trim();
        results = results.filter(u =>
          (u.name && u.name.toLowerCase().includes(s)) ||
          (u.email && u.email.toLowerCase().includes(s)) ||
          (u.phone && u.phone.includes(s)) ||
          (u.role && u.role.toLowerCase().includes(s)) ||
          (u.districtUnion && u.districtUnion.toLowerCase().includes(s))
        );
      }

      res.json(results);
    } catch (error) {
      console.error('Error fetching signed-in users:', error);
      res.status(500).json({ error: 'Failed to fetch signed-in users' });
    }
  });

  app.get("/api/admin/user-metrics/signups", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { range, search } = req.query;
      const { startDate, endDate } = getDateRange(range as string);

      let results = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        unionId: usersTable.unionId,
        districtUnion: usersTable.districtUnion,
        businessType: usersTable.businessType,
        createdAt: usersTable.createdAt,
      })
        .from(usersTable)
        .where(buildDateCondition(usersTable.createdAt, startDate, endDate))
        .orderBy(desc(usersTable.createdAt));

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.toLowerCase().trim();
        results = results.filter(u =>
          (u.name && u.name.toLowerCase().includes(s)) ||
          (u.email && u.email.toLowerCase().includes(s)) ||
          (u.phone && u.phone.includes(s)) ||
          (u.role && u.role.toLowerCase().includes(s)) ||
          (u.districtUnion && u.districtUnion.toLowerCase().includes(s))
        );
      }

      res.json(results);
    } catch (error) {
      console.error('Error fetching signups:', error);
      res.status(500).json({ error: 'Failed to fetch signups' });
    }
  });

  // B2B business routes and points lookup (for dropdowns)
  app.get("/api/b2b/routes-points", async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const b2bRoles = ['wholesale_dealer', 'dealer', 'retailer', 'inter_union', 'federation', 'wsd', 'dealer_/_agent', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop_/_retail', 'b2b'];
      const b2bUsers = allUsers.filter((u: any) => b2bRoles.includes(u.role));

      const routeSet = new Set<string>();
      const pointSet = new Set<string>();
      const routePointMap: Record<string, Set<string>> = {};
      const codeMap: Record<string, { route: string; point: string }> = {};

      for (const u of b2bUsers) {
        const route = (u as any).businessRoute?.trim();
        const point = (u as any).businessPoint?.trim();
        const code = (u as any).businessCode?.trim();

        if (route) {
          routeSet.add(route);
          if (!routePointMap[route]) routePointMap[route] = new Set();
          if (point) routePointMap[route].add(point);
        }
        if (point) pointSet.add(point);
        if (code && route) {
          codeMap[code] = { route: route || '', point: point || '' };
        }
      }

      const routePointMapSerialized: Record<string, string[]> = {};
      for (const [route, points] of Object.entries(routePointMap)) {
        routePointMapSerialized[route] = Array.from(points).sort();
      }

      res.json({
        routes: Array.from(routeSet).sort(),
        points: Array.from(pointSet).sort(),
        routePointMap: routePointMapSerialized,
        codeMap,
      });
    } catch (error) {
      console.error('Error fetching routes/points:', error);
      res.status(500).json({ error: 'Failed to fetch routes and points' });
    }
  });

  // B2B Duplicate Detection API
  app.get("/api/admin/b2b-users/duplicates", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      let users = await storage.listUsers();
      const scope = getUnionScope(req);
      const { merchantId } = req.query;

      if (merchantId) {
        const validIds = getAllIdsForMerchant(merchantId as string);
        users = users.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
      } else if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        users = users.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
      }

      const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2bUsers = users.filter(u => b2bRoles.includes(u.role) || (u as any).businessName);
      const allMerchants = await storage.getMerchants();

      const duplicateGroups: any[] = [];
      const processed = new Set<string>();

      for (const user of b2bUsers) {
        if (processed.has(String(user.id))) continue;
        const dupes: any[] = [];

        for (const other of b2bUsers) {
          if (String(other.id) === String(user.id)) continue;
          if (processed.has(String(other.id))) continue;
          let matchReason = '';

          // Same businessCode
          if ((user as any).businessCode && (user as any).businessCode === (other as any).businessCode) {
            matchReason = `Same dealer code: ${(user as any).businessCode}`;
          }
          // Same phone
          else if ((user as any).phone && (user as any).phone === (other as any).phone) {
            matchReason = `Same phone: ${(user as any).phone}`;
          }
          // Same GSTIN
          else if ((user as any).gstNumber && (user as any).gstNumber.length > 5 &&
                   (user as any).gstNumber.toUpperCase() === ((other as any).gstNumber || '').toUpperCase()) {
            matchReason = `Same GSTIN: ${(user as any).gstNumber}`;
          }
          else if ((user as any).businessName && (other as any).businessName &&
                   (user as any).businessName.toLowerCase().trim() === (other as any).businessName.toLowerCase().trim()) {
            const uUnion = (user as any).unionId || (user as any).districtUnion || '';
            const oUnion = (other as any).unionId || (other as any).districtUnion || '';
            const uResolved = uUnion.startsWith('merchant-') || /^(UNI|FED)-/.test(uUnion) ? uUnion : resolveDistrictUnionToMerchantId(uUnion, allMerchants);
            const oResolved = oUnion.startsWith('merchant-') || /^(UNI|FED)-/.test(oUnion) ? oUnion : resolveDistrictUnionToMerchantId(oUnion, allMerchants);
            if (uResolved === oResolved && uResolved) {
              matchReason = `Same business name in same union: ${(user as any).businessName}`;
            }
          }

          if (matchReason) {
            dupes.push({ ...other, matchReason, phone: (other as any).phone, businessCode: (other as any).businessCode, businessName: (other as any).businessName });
          }
        }

        if (dupes.length > 0) {
          const group = {
            primary: { id: user.id, name: user.name, email: user.email, phone: (user as any).phone, role: user.role, businessCode: (user as any).businessCode, businessName: (user as any).businessName, districtUnion: (user as any).districtUnion, createdAt: (user as any).createdAt },
            duplicates: dupes.map(d => ({ id: d.id, name: d.name, email: d.email, phone: d.phone, role: d.role, businessCode: d.businessCode, businessName: d.businessName, districtUnion: (d as any).districtUnion, matchReason: d.matchReason, createdAt: (d as any).createdAt })),
          };
          duplicateGroups.push(group);
          processed.add(String(user.id));
          dupes.forEach(d => processed.add(String(d.id)));
        }
      }

      res.json({ success: true, totalGroups: duplicateGroups.length, groups: duplicateGroups });
    } catch (error) {
      console.error('Duplicate detection error:', error);
      res.status(500).json({ success: false, message: 'Failed to detect duplicates' });
    }
  });

  // B2B Duplicate Check for Registration Approval (pre-check)
  app.get("/api/admin/b2b-registrations/:id/duplicate-check", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

      const users = await storage.listUsers();
      const duplicates: any[] = [];
      const regPhone = registration.phone || '';
      const regEmail = (registration.email || '').toLowerCase();
      const regBusinessName = (registration.businessName || '').toLowerCase().trim();
      const regGstin = (registration.gstin || '').toUpperCase();
      const regBusinessCode = (registration as any).businessCode || '';

      for (const u of users) {
        let reasons: string[] = [];
        if (regPhone && (u as any).phone === regPhone) reasons.push('Same phone');
        if (regEmail && u.email?.toLowerCase() === regEmail) reasons.push('Same email');
        if (regBusinessCode && (u as any).businessCode === regBusinessCode) reasons.push(`Same dealer code: ${regBusinessCode}`);
        if (regGstin.length > 5 && ((u as any).gstNumber || '').toUpperCase() === regGstin) reasons.push(`Same GSTIN: ${regGstin}`);
        if (regBusinessName && (u as any).businessName?.toLowerCase().trim() === regBusinessName) reasons.push('Same business name');
        if (reasons.length > 0) {
          duplicates.push({ id: u.id, name: u.name, email: u.email, phone: (u as any).phone, role: u.role, businessCode: (u as any).businessCode, businessName: (u as any).businessName, districtUnion: (u as any).districtUnion, reasons });
        }
      }

      res.json({ success: true, hasDuplicates: duplicates.length > 0, duplicates });
    } catch (error) {
      console.error('Duplicate check error:', error);
      res.status(500).json({ success: false, message: 'Failed to check duplicates' });
    }
  });

  // Admin User Management
  app.get("/api/admin/users", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { type } = req.query;
      let users = await storage.listUsers();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        users = users.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
      }
      
      const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2cRoles = ['customer', 'consumer'];
      
      if (type === 'b2c') {
        users = users.filter(u => b2cRoles.includes(u.role) || (!b2bRoles.includes(u.role) && u.role !== 'admin' && u.role !== 'driver' && u.role !== 'restaurant'));
      } else if (type === 'b2b') {
        const b2bPricingRoles = ['WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'INTER_UNION', 'FEDERATION', 'AGENT', 'FMD'];
        users = users.filter(u => 
          b2bRoles.includes(u.role) || 
          (u.pricingRole && b2bPricingRoles.includes(u.pricingRole)) ||
          (u.freshMilkPricingRole && b2bPricingRoles.includes(u.freshMilkPricingRole)) ||
          (u.productsPricingRole && b2bPricingRoles.includes(u.productsPricingRole)) ||
          ((u as any).iceCreamPricingRole && b2bPricingRoles.includes((u as any).iceCreamPricingRole)) ||
          ((u as any).businessName && (u as any).businessName.length > 0 && u.role !== 'admin' && u.role !== 'merchant' && u.role !== 'driver')
        );
      }
      
      const safeUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || '',
        role: user.role,
        pricingRole: user.pricingRole || '',
        pricingTier: (user as any).pricingTier || '',
        freshMilkPricingRole: user.freshMilkPricingRole || '',
        productsPricingRole: user.productsPricingRole || '',
        iceCreamPricingRole: user.iceCreamPricingRole || '',
        unionId: user.unionId || '',
        status: (user as any).status || 'approved',
        restaurantId: user.restaurantId,
        district: (user as any).district || '',
        districtUnion: (user as any).districtUnion || '',
        office: (user as any).office || '',
        businessType: (user as any).businessType || '',
        businessTypeCode: (user as any).businessTypeCode || '',
        businessRoute: (user as any).businessRoute || '',
        businessPoint: (user as any).businessPoint || '',
        businessCode: (user as any).businessCode || '',
        businessName: (user as any).businessName || '',
        businessAddress: (user as any).businessAddress || '',
        addressLat: (user as any).addressLat || '',
        addressLng: (user as any).addressLng || '',
        gstNumber: user.gstNumber || '',
        panNumber: user.panNumber || '',
        aadhaarNumber: (user as any).aadhaarNumber || '',
        msmeNumber: (user as any).msmeNumber || '',
        securityDeposit: (user as any).securityDeposit || '',
        fssaiLicense: user.fssaiLicense || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users for admin:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Customer search for POS and Invoice - search by name, phone, email, or ID
  // Optionally filter by pricing role (for POS customer type selection)
  app.get("/api/customers/search", async (req, res) => {
    try {
      const { q, role, type } = req.query;
      
      // Allow no search term - in that case, return all customers of the specified role
      const hasSearchTerm = q && typeof q === 'string' && q.length >= 1;
      const searchTerm = hasSearchTerm ? (q as string).toLowerCase() : '';
      
      // For Inter Union and Federation types, search merchants instead of users
      if (type === 'district' || type === 'inter_union') {
        // Search other District Unions (merchants)
        const merchants = await db.execute(
          sql`SELECT id, gstin, email, phone FROM merchants WHERE status IN ('approved', 'active') LIMIT 50`
        );
        const matchedMerchants = (merchants.rows as any[])
          .filter(m => {
            // If no search term, include all
            if (!hasSearchTerm) return true;
            return m.id?.toLowerCase().includes(searchTerm) ||
              m.gstin?.toLowerCase().includes(searchTerm) ||
              m.email?.toLowerCase().includes(searchTerm);
          })
          .slice(0, 20)
          .map(m => ({
            id: m.id,
            name: m.id.replace('merchant-', 'District Union ').replace(/-/g, ' '),
            email: m.email,
            phone: m.phone,
            pricingRole: 'INTER_UNION',
            gstin: m.gstin,
            isUnion: true,
          }));
        return res.json(matchedMerchants);
      }
      
      if (type === 'federation') {
        // Search Federation Dairies (merchants with fed- in ID)
        const merchants = await db.execute(
          sql`SELECT id, gstin, email, phone FROM merchants WHERE (id LIKE '%fed%' OR id LIKE '%ambattur%') AND status IN ('approved', 'active') LIMIT 50`
        );
        const matchedMerchants = (merchants.rows as any[])
          .filter(m => {
            // If no search term, include all
            if (!hasSearchTerm) return true;
            return m.id?.toLowerCase().includes(searchTerm) ||
              m.gstin?.toLowerCase().includes(searchTerm) ||
              m.email?.toLowerCase().includes(searchTerm);
          })
          .slice(0, 20)
          .map(m => ({
            id: m.id,
            name: m.id.replace('merchant-', '').replace(/-/g, ' ').toUpperCase() + ' (Federation)',
            email: m.email,
            phone: m.phone,
            pricingRole: 'FEDERATION',
            gstin: m.gstin,
            isFederation: true,
          }));
        return res.json(matchedMerchants);
      }
      
      const users = await storage.listUsers();
      
      // Map frontend customerType to backend pricingRole
      let pricingRoleFilter: string | null = null;
      if (role === 'wholesale' || role === 'WHOLESALE_DEALER') {
        pricingRoleFilter = 'WHOLESALE_DEALER';
      } else if (role === 'dealer' || role === 'DEALER') {
        pricingRoleFilter = 'DEALER';
      } else if (role === 'retailer' || role === 'RETAILER') {
        pricingRoleFilter = 'RETAILER';
      }
      
      const matchedUsers = users
        .filter(user => {
          // If role filter specified, first filter by pricingRole
          if (pricingRoleFilter && user.pricingRole !== pricingRoleFilter) {
            return false;
          }
          
          // If no search term provided, include all users of this role
          if (!hasSearchTerm) return true;
          
          // Otherwise filter by search term
          const matchesSearch = 
            user.name?.toLowerCase().includes(searchTerm) ||
            user.phone?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm) ||
            user.id?.toLowerCase().includes(searchTerm);
          
          return matchesSearch;
        })
        .slice(0, 50)
        .map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          pricingRole: user.pricingRole,
          unionId: user.unionId,
          isInstitution: (user as any).isInstitution || false,
          institutionType: (user as any).institutionType || null,
        }));
      
      res.json(matchedUsers);
    } catch (error) {
      console.error('Error searching customers:', error);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  });

  // Auto-login endpoint for union dashboard access
  // Validates merchantId, generates JWT, sets cookie
  app.post("/api/merchant/auto-login", async (req, res) => {
    try {
      const authToken = req.cookies?.auth_token || req.cookies?.admin_session_token;
      if (!authToken) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const decoded = verifyToken(authToken);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      const isAdmin = decoded.role === 'admin' || decoded.isGlobalAdmin;
      if (!isAdmin) {
        const userId = decoded.userId || decoded.id;
        if (userId) {
          const callerUser = await storage.getUser(userId);
          if (!callerUser || callerUser.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
          }
        } else {
          return res.status(403).json({ error: 'Admin access required' });
        }
      }

      const { merchantId } = req.body;
      
      if (!merchantId || typeof merchantId !== 'string' || !merchantId.startsWith('merchant-')) {
        return res.status(400).json({ error: 'Invalid merchant ID' });
      }
      
      const merchantCheck = await db.execute(
        sql`SELECT id FROM merchants WHERE id = ${merchantId} AND status IN ('approved', 'active') LIMIT 1`
      );
      
      if (merchantCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Merchant not found or not active' });
      }
      
      const merchant = merchantCheck.rows[0] as { id: string };
      
      const token = signToken({
        id: merchant.id,
        merchantId: merchant.id,
        role: 'merchant',
        autoLogin: true
      });
      
      res.cookie('merchant_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.json({ success: true, merchantId: merchant.id });
    } catch (error) {
      console.error('Error in auto-login:', error);
      res.status(500).json({ error: 'Auto-login failed' });
    }
  });

  app.put("/api/merchant/settings", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const decoded = verifyToken(token);
      if (!decoded || decoded.role !== 'merchant') {
        return res.status(403).json({ error: 'Merchant access required' });
      }
      const merchantId = decoded.id;
      const allowedFields = [
        'restaurantPhone', 'contactName', 'contactPhone', 'contactEmail',
        'address', 'description', 'shortDescription', 'gstNumber',
        'latitude', 'longitude', 'closeStore', 'disabledOrdering',
        'pauseOrdering', 'freeDelivery', 'selfDelivery',
        'deliveryDistanceCovered', 'logo', 'headerImage',
      ];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      const merchant = await storage.updateMerchant(merchantId, updates);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      const { password, ...publicData } = merchant;
      res.json(publicData);
    } catch (error) {
      console.error('Error updating merchant settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Product search for Invoice and POS - search by name, HSN code, or product code
  // Requires authentication via merchant_token or auth_token cookie
  // Scoped: Union staff see their own products + Federation products; Admins see all
  app.get("/api/products/search", async (req: AuthenticatedRequest, res) => {
    try {
      // Check authentication via cookies only (secure auth flow)
      const merchantToken = req.cookies?.merchant_token;
      const authToken = req.cookies?.auth_token;
      
      let isAuthenticated = false;
      let isAdmin = false;
      let merchantId: string | null = null;
      
      if (merchantToken) {
        const payload = verifyToken(merchantToken);
        if (payload && (payload.id || payload.role === 'merchant' || payload.role === 'merchant_subuser')) {
          isAuthenticated = true;
          merchantId = payload.merchantId || payload.id || null;
        }
      }
      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload && (payload.userId || payload.agentId || payload.role === 'admin')) {
          isAuthenticated = true;
          if (payload.role === 'admin') {
            isAdmin = true;
          }
        }
      }
      
      if (!isAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if retailer pricing is enabled for this merchant
      let retailerPriceEnabled = false;
      if (merchantId) {
        const merchant = await storage.getMerchant(merchantId);
        retailerPriceEnabled = merchant?.retailerPriceEnabled === true;
      }
      // Admins can always see retailer pricing
      if (isAdmin) {
        retailerPriceEnabled = true;
      }
      
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.length < 1) {
        return res.json([]);
      }
      
      const searchTerm = `%${q.toLowerCase()}%`;
      
      let menuItems;
      if (isAdmin) {
        // Admins can search all products
        menuItems = await db.execute(
          sql`SELECT id, name, description, category, hsn_code, product_code, price, mrp, 
              federation_price, district_union_price, wholesale_price, retail_price, gst_percent, restaurant_id 
              FROM menu_items 
              WHERE (LOWER(name) LIKE ${searchTerm} 
                 OR LOWER(hsn_code) LIKE ${searchTerm}
                 OR LOWER(product_code) LIKE ${searchTerm}
                 OR LOWER(category) LIKE ${searchTerm})
              LIMIT 15`
        );
      } else {
        // Union staff can only search their own products + Federation products (FED-PROD-01)
        // This maintains multi-tenant isolation while allowing access to shared Federation catalog
        menuItems = await db.execute(
          sql`SELECT id, name, description, category, hsn_code, product_code, price, mrp, 
              federation_price, district_union_price, wholesale_price, retail_price, gst_percent, restaurant_id 
              FROM menu_items 
              WHERE (LOWER(name) LIKE ${searchTerm} 
                 OR LOWER(hsn_code) LIKE ${searchTerm}
                 OR LOWER(product_code) LIKE ${searchTerm}
                 OR LOWER(category) LIKE ${searchTerm})
              AND (restaurant_id = 'FED-PROD-01' OR restaurant_id LIKE 'UNI-%' OR restaurant_id LIKE 'sdcmpu-%')
              LIMIT 15`
        );
      }
      
      const matchedProducts = menuItems.rows.map((item: any) => {
        const product: any = {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          hsnCode: item.hsn_code,
          productCode: item.product_code,
          price: item.price,
          mrp: item.mrp || item.price,
          federationPrice: item.federation_price,
          districtUnionPrice: item.district_union_price,
          wholesalePrice: item.wholesale_price,
          gstPercent: item.gst_percent,
          restaurantId: item.restaurant_id,
        };
        // Only include retailer price if enabled for this merchant
        if (retailerPriceEnabled) {
          product.retailPrice = item.retail_price;
          product.retailerPrice = item.retailer_price;
        }
        return product;
      });
      
      res.json(matchedProducts);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  });

  // Get customers by pricing role for POS quick-select dropdown
  app.get("/api/customers/by-role", async (req, res) => {
    try {
      const { pricingRole } = req.query;
      if (!pricingRole || typeof pricingRole !== 'string') {
        return res.json([]);
      }
      
      const users = await storage.listUsers();
      
      // Filter users by pricing role and map to customer data
      // Only include customer accounts (not admin/staff)
      const matchedUsers = users
        .filter(user => {
          // Skip admin, staff, and other non-customer roles
          if (user.role === 'admin' || user.role === 'staff' || user.role === 'restaurant') return false;
          
          const userRole = user.pricingRole?.toUpperCase()?.replace(/\s+/g, '_');
          const queryRole = pricingRole.toUpperCase().replace(/\s+/g, '_');
          
          // Match exact role or common aliases for all pricing tiers
          if (userRole === queryRole) return true;
          if (queryRole === 'WHOLESALE_DEALER' && (userRole === 'WSD' || userRole === 'WHOLESALE_DEALER' || userRole === 'WHOLESALE')) return true;
          if (queryRole === 'DEALER' && (userRole === 'DLR' || userRole === 'DEALER')) return true;
          if (queryRole === 'RETAILER' && (userRole === 'RTL' || userRole === 'RETAILER')) return true;
          if (queryRole === 'FEDERATION' && (userRole === 'FED' || userRole === 'FEDERATION')) return true;
          if (queryRole === 'INTER_UNION' && (userRole === 'INT' || userRole === 'INTER_UNION' || userRole === 'INTERUNION')) return true;
          return false;
        })
        .slice(0, 20)
        .map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          pricingRole: user.pricingRole,
          unionId: user.unionId,
          isInstitution: (user as any).isInstitution || false,
          institutionType: (user as any).institutionType || null,
        }));
      
      res.json(matchedUsers);
    } catch (error) {
      console.error('Error fetching customers by role:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  // Get delivery agents/drivers for mobile sales POS
  app.get("/api/delivery-agents", requireAuth, async (req, res) => {
    try {
      const users = await storage.listUsers();
      
      // Filter users who are drivers or have delivery-related roles
      const agents = users
        .filter(user => {
          // Include drivers, FMD agents, WSD agents
          if (user.role === 'driver') return true;
          const pricingRole = user.pricingRole?.toUpperCase();
          if (pricingRole === 'FMD' || pricingRole === 'WSD' || pricingRole === 'AGENT') return true;
          // Include staff with delivery permissions
          const permissions = (user as any).permissions || [];
          if (permissions.includes('delivery_access')) return true;
          return false;
        })
        .map(user => ({
          id: user.id,
          name: user.name,
          phone: user.phone || '',
          role: user.role || user.pricingRole,
        }));
      
      res.json(agents);
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
      res.status(500).json({ error: 'Failed to fetch delivery agents' });
    }
  });

  app.post("/api/admin/users", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        if (!userData.unionId) userData.unionId = scope.merchantId;
        if (!userData.restaurantId) userData.restaurantId = scope.merchantId;
      }

      const passwordHash = await hashPassword(password);
      const userWithHash = { ...userData, passwordHash };
      
      const validatedUser = insertUserSchema.parse(userWithHash);
      const user = await storage.createUser(validatedUser);
      
      const { passwordHash: _, ...safeUser } = user;
      await logAudit(req, "users", user.id, "CREATE", { newValues: { name: safeUser.name, email: safeUser.email, role: safeUser.role } });
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid user data', details: error.errors });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { password, ...updates } = req.body;
      
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const targetUser = await storage.getUser(req.params.id);
        if (targetUser) {
          const validIds = getAllIdsForMerchant(scope.merchantId);
          const userUnion = (targetUser as any).unionId || targetUser.restaurantId || '';
          if (!validIds.includes(userUnion)) {
            return res.status(403).json({ error: 'You can only modify users in your own union' });
          }
        }
      }

      let updateData = updates;
      if (password) {
        const passwordHash = await hashPassword(password);
        updateData = { ...updates, passwordHash };
      }
      
      const oldUser = await storage.getUser(req.params.id);
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const { passwordHash: _, ...safeUser } = user;
      const diff = diffObjects(oldUser as any, user as any);
      await logAudit(req, "users", req.params.id, "UPDATE", diff);
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.patch("/api/admin/users/:id/approve", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const { action } = req.body;
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
      }
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updated = await storage.updateUser(req.params.id, { status: newStatus });
      if (!updated) return res.status(404).json({ error: 'User not found' });
      await logAudit(req, "users", req.params.id, "UPDATE", { changedFields: ["status"], previousValues: { status: "pending" }, newValues: { status: newStatus } });
      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error('Error approving/rejecting user:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  // ============ Admin B2B Users Bulk Delete ============
  app.delete("/api/admin/users/bulk-delete", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const protectedRoles = ['admin', 'merchant', 'driver'];
      const b2bUsers = allUsers.filter(u => !protectedRoles.includes(u.role));
      let deleted = 0;
      for (const user of b2bUsers) {
        await storage.deleteUser(user.id);
        deleted++;
      }
      await logAudit(req, "users", "bulk", "DELETE", { newValues: { deletedCount: deleted, type: "bulk-delete-b2b" } });
      res.json({ success: true, deleted, message: `Deleted ${deleted} B2B/customer users` });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      res.status(500).json({ error: 'Failed to delete users' });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const targetUser = await storage.getUser(req.params.id);
        if (targetUser) {
          const validIds = getAllIdsForMerchant(scope.merchantId);
          const userUnion = (targetUser as any).unionId || targetUser.restaurantId || '';
          if (!validIds.includes(userUnion)) {
            return res.status(403).json({ error: 'You can only delete users in your own union' });
          }
        }
      }
      const user = await storage.getUser(req.params.id);
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      await logAudit(req, "users", req.params.id, "DELETE", { previousValues: { name: user?.name, email: user?.email, role: user?.role } });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.post("/api/admin/users/:id/reset-password", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(req.params.id, { passwordHash });
      await logAudit(req, "users", req.params.id, "UPDATE", { changedFields: ["password"], newValues: { action: "password-reset", userName: user.name } });
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.get("/api/admin/audit-logs", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { auditLogs } = await import("@shared/schema");
      const { tableName, action, userId, startDate, endDate, page = '1', limit = '50' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [];
      if (tableName) conditions.push(eq(auditLogs.tableName, tableName));
      if (action) conditions.push(eq(auditLogs.action, action));
      if (userId) conditions.push(sql`${auditLogs.changedByName} ILIKE ${'%' + userId + '%'}`);
      if (startDate) { const d = new Date(startDate); if (!isNaN(d.getTime())) conditions.push(gte(auditLogs.createdAt, d)); }
      if (endDate) { const d = new Date(endDate); if (!isNaN(d.getTime())) conditions.push(lte(auditLogs.createdAt, d)); }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause);
      const total = Number(countResult?.count || 0);

      const logs = await db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(limitNum).offset(offset);

      res.json({
        logs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  app.post("/api/admin/users/:id/auto-login", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        if ((user as any).unionId !== scope.merchantId) {
          return res.status(403).json({ error: 'You can only auto-login users in your own union' });
        }
      }
      const token = signToken({ userId: user.id, role: user.role, purpose: 'auto_login' });
      res.json({
        success: true,
        token,
        autoLoginUrl: `/api/auto-login/${token}`,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error('Error creating auto-login:', error);
      res.status(500).json({ error: 'Failed to create auto-login session' });
    }
  });

  // ============ Admin Staff Management ============
  app.get("/api/admin/all-staff", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { unionId, department, segment, status, search } = req.query;
      let staffList = await db.select().from(unionStaff);
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        staffList = staffList.filter(s => validIds.includes(s.unionId));
      }
      if (unionId && unionId !== 'all') staffList = staffList.filter(s => s.unionId === unionId);
      if (department && department !== 'all') {
        const deptLower = (department as string).toLowerCase();
        staffList = staffList.filter(s => {
          const sDept = (s.department || '').toLowerCase();
          if (deptLower === 'transport' || deptLower === 'delivery') {
            return sDept === 'transport' || sDept === 'delivery';
          }
          return sDept === deptLower;
        });
      }
      if (segment && segment !== 'all') staffList = staffList.filter(s => (s.assignedSegments as string[] || []).includes(segment as string));
      if (status === 'active') staffList = staffList.filter(s => s.isActive);
      else if (status === 'inactive') staffList = staffList.filter(s => !s.isActive);
      else if (status === 'pending') staffList = staffList.filter(s => s.approvalStatus === 'pending');
      if (search) {
        const q = (search as string).toLowerCase();
        staffList = staffList.filter(s => s.name.toLowerCase().includes(q) || (s.phone || '').includes(q) || (s.employeeId || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
      }
      const merchants = await storage.getMerchants();
      const unionMap: Record<string, string> = {};
      merchants.forEach((m: any) => { unionMap[m.id] = m.restaurantName || m.contactName; });
      const enriched = staffList.map(s => ({ ...s, unionName: unionMap[s.unionId] || s.unionId, passwordHash: undefined }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching all staff:', error);
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  });

  app.patch("/api/admin/staff/:id/status", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, approvalStatus } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (approvalStatus && validStatuses.includes(approvalStatus)) { updates.approvalStatus = approvalStatus; if (approvalStatus === 'approved') updates.approvedAt = new Date(); }
      await db.update(unionStaff).set(updates).where(eq(unionStaff.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update staff status' });
    }
  });

  app.post("/api/admin/staff/bulk-status", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { staffIds, isActive } = req.body;
      if (!Array.isArray(staffIds) || staffIds.length === 0) return res.status(400).json({ error: 'No staff IDs' });
      if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be boolean' });
      for (const id of staffIds) {
        await db.update(unionStaff).set({ isActive, updatedAt: new Date() }).where(eq(unionStaff.id, id));
      }
      res.json({ success: true, updated: staffIds.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk update' });
    }
  });

  // ============ Driver Location Tracking ============
  app.post("/api/delivery-partners/update-location", async (req, res) => {
    try {
      const { driverId, latitude, longitude } = req.body;
      if (!driverId || latitude === undefined || longitude === undefined) return res.status(400).json({ error: 'Missing fields' });
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ error: 'Invalid coordinates' });
      const driverToken = req.cookies?.driver_token;
      if (driverToken) {
        try {
          const decoded = jwt.verify(driverToken, process.env.JWT_SECRET || "your-secret-key") as any;
          if (decoded.driverId && decoded.driverId !== driverId) return res.status(403).json({ error: 'Driver ID mismatch' });
        } catch (e) {}
      }
      const existing = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.id, driverId) });
      if (!existing) return res.status(404).json({ error: 'Driver not found' });
      await db.update(deliveryPartners).set({ updatedAt: new Date() }).where(eq(deliveryPartners.id, driverId));
      if (!globalThis.driverLocations) globalThis.driverLocations = {};
      (globalThis as any).driverLocations[driverId] = { latitude: lat, longitude: lng, updatedAt: new Date().toISOString(), name: existing.name, phone: existing.phone, segment: existing.segment, vehicleNumber: existing.vehicleNumber, isOnline: existing.isOnline };
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update location' });
    }
  });

  app.get("/api/admin/driver-locations", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const drivers = await db.select().from(deliveryPartners).where(eq(deliveryPartners.isActive, true));
      const locations = (globalThis as any).driverLocations || {};
      const routes = await db.select().from(deliveryRoutes);
      const activeRoutes = routes.filter(r => r.status === 'in_progress' || r.status === 'planned');
      const result = drivers.map(d => ({
        id: d.id, name: d.name, phone: d.phone, segment: d.segment, vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType, isOnline: d.isOnline,
        location: locations[d.id] || null,
        activeRoute: activeRoutes.find(r => r.driverId === d.id) || null,
        passwordHash: undefined,
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch driver locations' });
    }
  });

  app.get("/api/staff/driver-locations", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      const drivers = await db.select().from(deliveryPartners).where(eq(deliveryPartners.isActive, true));
      const allIds = merchantId ? getAllIdsForMerchant(merchantId) : [];
      const merchantDrivers = merchantId ? drivers.filter(d => allIds.includes(d.merchantId)) : drivers;
      const locations = (globalThis as any).driverLocations || {};
      const routes = await db.select().from(deliveryRoutes);
      const activeRoutes = routes.filter(r => r.status === 'in_progress' || r.status === 'planned');
      const allOrders = await db.select().from(ordersTable).where(
        sql`${ordersTable.status} IN ('assigned_to_delivery', 'out_for_delivery')`
      );
      const result = merchantDrivers.map(d => {
        const loc = locations[d.id];
        const driverOrders = allOrders.filter(o => o.assignedDriverId === d.id);
        return {
          id: d.id, name: d.name, phone: d.phone, segment: d.segment,
          vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType,
          isOnline: d.isOnline,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null,
          speed: loc?.speed || null,
          heading: loc?.heading || null,
          lastUpdate: loc?.updatedAt || null,
          activeRoute: activeRoutes.find(r => r.driverId === d.id)?.name || null,
          assignedOrders: driverOrders.length,
          status: d.isOnline ? 'online' : 'offline',
        };
      });

      if (result.length === 0) {
        const demoDriverUsers = await db.select().from(usersTable).where(eq(usersTable.role, 'driver'));
        for (const du of demoDriverUsers) {
          const loc = locations[du.id];
          if (loc) {
            result.push({
              id: du.id, name: du.name || 'Driver', phone: du.phone || '', segment: (du as any).assignedSegment || loc.segment || 'Fresh Milk',
              vehicleNumber: loc.vehicleNumber || '', vehicleType: loc.vehicleType || 'Van',
              isOnline: loc.isOnline ?? true,
              latitude: loc.latitude || null,
              longitude: loc.longitude || null,
              speed: loc.speed || null,
              heading: loc.heading || null,
              lastUpdate: loc.updatedAt || new Date().toISOString(),
              activeRoute: loc.activeRoute || null,
              assignedOrders: loc.assignedOrders || 0,
              status: loc.isOnline ? 'online' : 'offline',
            });
          }
        }
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch driver locations' });
    }
  });

  // ============ Merchant Delivery Management ============

  app.get("/api/merchant/delivery-drivers", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      if (!merchantId) return res.status(400).json({ error: 'No merchant ID' });

      const allIds = getAllIdsForMerchant(merchantId);
      const drivers = await db.select().from(deliveryPartners).where(eq(deliveryPartners.isActive, true));
      const merchantDrivers = drivers.filter(d => allIds.includes(d.merchantId));

      const locations = (globalThis as any).driverLocations || {};
      const routes = await db.select().from(deliveryRoutes);
      const activeRoutes = routes.filter(r => r.status === 'in_progress' || r.status === 'planned');

      const allOrders = await db.select().from(ordersTable).where(
        sql`${ordersTable.status} IN ('assigned_to_delivery', 'out_for_delivery')`
      );

      const result = merchantDrivers.map(d => {
        const loc = locations[d.id];
        const driverOrders = allOrders.filter(o => o.assignedDriverId === d.id);
        const route = activeRoutes.find(r => r.driverId === d.id);
        return {
          id: d.id, name: d.name, phone: d.phone, segment: d.segment,
          vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType,
          isOnline: d.isOnline, approvalStatus: d.approvalStatus,
          totalDeliveries: d.totalDeliveries, totalEarnings: d.totalEarnings,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null,
          lastUpdate: loc?.updatedAt || null,
          activeRoute: route?.name || null,
          activeRouteId: route?.id || null,
          assignedOrders: driverOrders.length,
          status: d.isOnline ? 'online' : 'offline',
        };
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching merchant drivers:', error);
      res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  });

  app.post("/api/merchant/delivery-drivers", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      if (!merchantId) return res.status(400).json({ error: 'No merchant ID' });

      const { name, phone, segment, vehicleNumber, vehicleType, vehicleCapacity, email } = req.body;
      if (!name || !phone || !segment) return res.status(400).json({ error: 'Name, phone, and segment are required' });

      const driver = await db.insert(deliveryPartners).values({
        name, phone, segment, merchantId,
        vehicleNumber: vehicleNumber || null,
        vehicleType: vehicleType || null,
        vehicleCapacity: vehicleCapacity || null,
        email: email || null,
        approvalStatus: 'approved',
        isActive: true,
      }).returning();
      res.status(201).json(driver[0]);
    } catch (error) {
      console.error('Error creating merchant driver:', error);
      res.status(500).json({ error: 'Failed to create driver' });
    }
  });

  app.patch("/api/merchant/delivery-drivers/:id", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      if (!merchantId) return res.status(400).json({ error: 'No merchant ID' });

      const { name, phone, segment, vehicleNumber, vehicleType, vehicleCapacity, isActive } = req.body;
      const updated = await db.update(deliveryPartners).set({
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(segment !== undefined && { segment }),
        ...(vehicleNumber !== undefined && { vehicleNumber }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(vehicleCapacity !== undefined && { vehicleCapacity }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      }).where(eq(deliveryPartners.id, req.params.id)).returning();
      if (!updated.length) return res.status(404).json({ error: 'Driver not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating merchant driver:', error);
      res.status(500).json({ error: 'Failed to update driver' });
    }
  });

  app.post("/api/merchant/orders/:orderId/assign-driver", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }

      const { driverId } = req.body;
      if (!driverId) return res.status(400).json({ error: 'Driver ID required' });

      const driver = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.id, driverId) });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const updated = await db.update(ordersTable).set({
        assignedDriverId: driverId,
        assignedDriverName: driver.name,
        assignedAt: new Date(),
        status: 'assigned_to_delivery',
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, req.params.orderId)).returning();

      if (!updated.length) return res.status(404).json({ error: 'Order not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error assigning driver:', error);
      res.status(500).json({ error: 'Failed to assign driver' });
    }
  });

  app.post("/api/merchant/orders/:orderId/reassign-driver", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }

      const { driverId } = req.body;
      if (!driverId) return res.status(400).json({ error: 'Driver ID required' });

      const driver = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.id, driverId) });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const updated = await db.update(ordersTable).set({
        assignedDriverId: driverId,
        assignedDriverName: driver.name,
        assignedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, req.params.orderId)).returning();

      if (!updated.length) return res.status(404).json({ error: 'Order not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error reassigning driver:', error);
      res.status(500).json({ error: 'Failed to reassign driver' });
    }
  });

  app.post("/api/admin/orders/:orderId/assign-driver", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { driverId } = req.body;
      if (!driverId) return res.status(400).json({ error: 'Driver ID required' });

      const driver = await db.query.deliveryPartners.findFirst({ where: eq(deliveryPartners.id, driverId) });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const updated = await db.update(ordersTable).set({
        assignedDriverId: driverId,
        assignedDriverName: driver.name,
        assignedAt: new Date(),
        status: 'assigned_to_delivery',
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, req.params.orderId)).returning();

      if (!updated.length) return res.status(404).json({ error: 'Order not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error admin assigning driver:', error);
      res.status(500).json({ error: 'Failed to assign driver' });
    }
  });

  async function autoAssignDriverToOrder(order: any) {
    try {
      if (order.assignedDriverId) return;
      const segment = order.productSegment || 'Products';
      const merchantId = order.restaurantId;
      const allIds = getAllIdsForMerchant(merchantId);
      const drivers = await db.select().from(deliveryPartners).where(
        sql`${deliveryPartners.isActive} = true AND ${deliveryPartners.approvalStatus} = 'approved'`
      );
      const segmentDrivers = drivers.filter(d =>
        allIds.includes(d.merchantId) && d.segment.toLowerCase() === segment.toLowerCase()
      );
      if (segmentDrivers.length === 0) {
        const anyMerchantDrivers = drivers.filter(d => allIds.includes(d.merchantId));
        if (anyMerchantDrivers.length === 0) return;
        const onlineDrivers = anyMerchantDrivers.filter(d => d.isOnline);
        const chosen = onlineDrivers.length > 0
          ? onlineDrivers[Math.floor(Math.random() * onlineDrivers.length)]
          : anyMerchantDrivers[Math.floor(Math.random() * anyMerchantDrivers.length)];
        await db.update(ordersTable).set({
          assignedDriverId: chosen.id,
          assignedDriverName: chosen.name,
          assignedAt: new Date(),
        }).where(eq(ordersTable.id, order.id));
        return;
      }
      const onlineSegment = segmentDrivers.filter(d => d.isOnline);
      const chosen = onlineSegment.length > 0
        ? onlineSegment[Math.floor(Math.random() * onlineSegment.length)]
        : segmentDrivers[Math.floor(Math.random() * segmentDrivers.length)];
      await db.update(ordersTable).set({
        assignedDriverId: chosen.id,
        assignedDriverName: chosen.name,
        assignedAt: new Date(),
      }).where(eq(ordersTable.id, order.id));
    } catch (err) {
      console.error('Auto-assign driver error:', err);
    }
  }

  app.get("/api/merchant/delivery-summary", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      if (!merchantId) return res.status(400).json({ error: 'No merchant ID' });

      const allIds = getAllIdsForMerchant(merchantId);
      const drivers = await db.select().from(deliveryPartners).where(eq(deliveryPartners.isActive, true));
      const merchantDrivers = drivers.filter(d => allIds.includes(d.merchantId));
      const onlineDrivers = merchantDrivers.filter(d => d.isOnline);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const allOrders = await db.select().from(ordersTable).where(
        sql`${ordersTable.restaurantId} = ANY(${allIds}) AND ${ordersTable.createdAt} >= ${todayStart}`
      );
      const assignedOrders = allOrders.filter(o => o.assignedDriverId);
      const outForDelivery = allOrders.filter(o => o.status === 'out_for_delivery');
      const delivered = allOrders.filter(o => o.status === 'delivered');
      const pendingAssignment = allOrders.filter(o =>
        ['marketing_approved', 'assigned_to_delivery'].includes(o.status || '') && !o.assignedDriverId
      );

      res.json({
        totalDrivers: merchantDrivers.length,
        onlineDrivers: onlineDrivers.length,
        offlineDrivers: merchantDrivers.length - onlineDrivers.length,
        todayOrders: allOrders.length,
        assignedOrders: assignedOrders.length,
        outForDelivery: outForDelivery.length,
        delivered: delivered.length,
        pendingAssignment: pendingAssignment.length,
        segmentBreakdown: {
          freshMilk: merchantDrivers.filter(d => d.segment.toLowerCase().includes('milk') || d.segment.toLowerCase() === 'fresh_milk').length,
          products: merchantDrivers.filter(d => d.segment.toLowerCase() === 'products').length,
          iceCream: merchantDrivers.filter(d => d.segment.toLowerCase().includes('ice') || d.segment.toLowerCase() === 'ice_cream').length,
        },
      });
    } catch (error) {
      console.error('Error fetching delivery summary:', error);
      res.status(500).json({ error: 'Failed to fetch delivery summary' });
    }
  });

  app.post("/api/merchant/seed-test-drivers", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      let decoded: any;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const merchantId = decoded.restaurantId || decoded.merchantId;
      if (!merchantId) return res.status(400).json({ error: 'No merchant ID' });

      const testDrivers = [
        { name: 'Rajesh Kumar', phone: '9876543210', segment: 'Fresh Milk', vehicleNumber: 'TN-01-AB-1234', vehicleType: 'Mini Truck', isOnline: true },
        { name: 'Suresh Babu', phone: '9876543211', segment: 'Fresh Milk', vehicleNumber: 'TN-01-CD-5678', vehicleType: 'Van', isOnline: true },
        { name: 'Murugan S', phone: '9876543212', segment: 'Products', vehicleNumber: 'TN-01-EF-9012', vehicleType: 'Tempo', isOnline: true },
        { name: 'Kannan P', phone: '9876543213', segment: 'Products', vehicleNumber: 'TN-01-GH-3456', vehicleType: 'Mini Truck', isOnline: false },
        { name: 'Senthil M', phone: '9876543214', segment: 'Ice Cream', vehicleNumber: 'TN-01-IJ-7890', vehicleType: 'Refrigerated Van', isOnline: true },
        { name: 'Prabhu D', phone: '9876543215', segment: 'Ice Cream', vehicleNumber: 'TN-01-KL-2345', vehicleType: 'Refrigerated Van', isOnline: false },
      ];

      const created = [];
      for (const td of testDrivers) {
        const existing = await db.query.deliveryPartners.findFirst({
          where: sql`${deliveryPartners.phone} = ${td.phone} AND ${deliveryPartners.merchantId} = ${merchantId}`
        });
        if (!existing) {
          const [driver] = await db.insert(deliveryPartners).values({
            ...td, merchantId, approvalStatus: 'approved', isActive: true, vehicleCapacity: '500 kg',
          }).returning();
          created.push(driver);
        } else {
          created.push(existing);
        }
      }

      const baseLat = 11.0168;
      const baseLng = 76.9558;
      if (!(globalThis as any).driverLocations) (globalThis as any).driverLocations = {};
      created.forEach((driver, idx) => {
        if (driver.isOnline) {
          (globalThis as any).driverLocations[driver.id] = {
            latitude: baseLat + (Math.random() - 0.5) * 0.05,
            longitude: baseLng + (Math.random() - 0.5) * 0.05,
            speed: Math.random() * 30 + 10,
            heading: Math.random() * 360,
            updatedAt: new Date(Date.now() - Math.floor(Math.random() * 300000)),
          };
        }
      });

      res.json({ message: `Seeded ${created.length} test drivers`, drivers: created });
    } catch (error) {
      console.error('Error seeding test drivers:', error);
      res.status(500).json({ error: 'Failed to seed test drivers' });
    }
  });

  // ============ Sales Analytics ============
  app.get("/api/admin/sales-analytics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate, role, unionId } = req.query;
      let allOrders = await db.select().from(ordersTable);
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        allOrders = allOrders.filter(o => validIds.includes(o.restaurantId));
      }
      if (startDate) allOrders = allOrders.filter(o => new Date(o.createdAt!) >= new Date(startDate as string));
      if (endDate) allOrders = allOrders.filter(o => new Date(o.createdAt!) <= new Date(endDate as string));
      const allUsers = await storage.listUsers();
      const userMap: Record<string, any> = {};
      allUsers.forEach(u => { userMap[u.email] = u; });
      const b2bRoles = ['wholesale_dealer', 'wsd', 'dealer', 'retailer', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop', 'inter_union', 'federation', 'agent', 'fmd'];
      let b2cOrders: any[] = [];
      let b2bOrders: any[] = [];
      allOrders.forEach(o => {
        const user = userMap[o.customerEmail];
        const isB2B = user && b2bRoles.includes(user.role);
        if (isB2B) b2bOrders.push({ ...o, user });
        else b2cOrders.push({ ...o, user });
      });
      if (role && role !== 'all') {
        if (role === 'b2c') b2bOrders = [];
        else if (role === 'b2b') b2cOrders = [];
        else b2bOrders = b2bOrders.filter(o => o.user?.role === role || o.user?.businessType?.toUpperCase() === (role as string).toUpperCase());
      }
      if (unionId && unionId !== 'all') {
        b2bOrders = b2bOrders.filter(o => o.user?.unionId === unionId || o.user?.districtUnion === unionId);
      }
      const userSales: Record<string, { name: string; email: string; role: string; businessType: string; unionId: string; orderCount: number; totalRevenue: number; lastOrderDate: string | null }> = {};
      [...b2cOrders, ...b2bOrders].forEach(o => {
        const key = o.customerEmail;
        if (!userSales[key]) {
          userSales[key] = { name: o.customerName, email: o.customerEmail, role: o.user?.role || 'customer', businessType: o.user?.businessType || '', unionId: o.user?.unionId || '', orderCount: 0, totalRevenue: 0, lastOrderDate: null };
        }
        userSales[key].orderCount++;
        userSales[key].totalRevenue += parseFloat(o.total as string) || 0;
        const od = o.createdAt ? new Date(o.createdAt).toISOString() : null;
        if (od && (!userSales[key].lastOrderDate || od > userSales[key].lastOrderDate!)) userSales[key].lastOrderDate = od;
      });
      const dailySales: Record<string, { date: string; b2c: number; b2b: number; total: number; orders: number }> = {};
      allOrders.forEach(o => {
        const date = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : 'unknown';
        if (!dailySales[date]) dailySales[date] = { date, b2c: 0, b2b: 0, total: 0, orders: 0 };
        const amt = parseFloat(o.total as string) || 0;
        const user = userMap[o.customerEmail];
        if (user && b2bRoles.includes(user.role)) dailySales[date].b2b += amt;
        else dailySales[date].b2c += amt;
        dailySales[date].total += amt;
        dailySales[date].orders++;
      });
      res.json({
        summary: {
          totalB2CRevenue: b2cOrders.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0),
          totalB2BRevenue: b2bOrders.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0),
          totalB2COrders: b2cOrders.length,
          totalB2BOrders: b2bOrders.length,
          totalRevenue: allOrders.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0),
          totalOrders: allOrders.length,
        },
        userSales: Object.values(userSales).sort((a, b) => b.totalRevenue - a.totalRevenue),
        dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
      });
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      res.status(500).json({ error: 'Failed to fetch sales analytics' });
    }
  });

  // ============ B2B User Statistics ============
  app.get("/api/admin/b2b-stats", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      let allUsers = await storage.listUsers();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        allUsers = allUsers.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
      }
      const b2bRoles = ['wholesale_dealer', 'wsd', 'dealer', 'retailer', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2bUsers = allUsers.filter(u => b2bRoles.includes(u.role));
      const b2cUsers = allUsers.filter(u => u.role === 'customer');
      const byRole: Record<string, number> = {};
      const byStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0, inactive: 0 };
      const byUnion: Record<string, { name: string; count: number }> = {};
      const merchants = await storage.getMerchants();
      const unionMap: Record<string, string> = {};
      merchants.forEach((m: any) => { unionMap[m.id] = m.restaurantName || m.contactName; });
      b2bUsers.forEach(u => {
        const bt = (u as any).businessType || u.role;
        byRole[bt] = (byRole[bt] || 0) + 1;
        const st = (u as any).status || 'approved';
        byStatus[st] = (byStatus[st] || 0) + 1;
        const uid = (u as any).unionId || 'unassigned';
        if (!byUnion[uid]) byUnion[uid] = { name: unionMap[uid] || uid, count: 0 };
        byUnion[uid].count++;
      });
      const recentRegistrations = b2bUsers.filter(u => {
        const created = (u as any).createdAt;
        if (!created) return false;
        return new Date(created) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }).length;
      res.json({
        totalB2B: b2bUsers.length,
        totalB2C: b2cUsers.length,
        totalAll: allUsers.length,
        byRole,
        byStatus,
        byUnion,
        recentRegistrations,
        pendingApprovals: byStatus.pending || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch B2B stats' });
    }
  });

  app.get("/api/admin/b2b-users-map", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const allUsers = await db.select().from(usersTable);
      const b2bRoles = ['wholesale_dealer', 'wsd', 'dealer', 'retailer', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2bPricingRoles = ['WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'INTER_UNION', 'FEDERATION', 'AGENT', 'FMD'];
      const b2bUsers = allUsers.filter(u =>
        b2bRoles.includes(u.role) ||
        (u.pricingRole && b2bPricingRoles.includes(u.pricingRole)) ||
        (u.businessType && u.businessType.length > 0) ||
        (u.businessName && u.businessName.length > 0 && u.role !== 'admin' && u.role !== 'driver' && u.role !== 'merchant')
      ).filter(u => u.role !== 'admin' && u.role !== 'driver' && u.role !== 'merchant');

      const allAddresses = await db.select().from(userAddresses);
      const addrByUser: Record<string, any[]> = {};
      allAddresses.forEach(a => {
        if (!addrByUser[a.userId]) addrByUser[a.userId] = [];
        addrByUser[a.userId].push(a);
      });

      const merchants = await storage.getMerchants();
      const unionMap: Record<string, string> = {};
      merchants.forEach((m: any) => { unionMap[m.id] = m.restaurantName || m.contactName; });

      const mapUsers = b2bUsers.map(u => {
        const addrs = addrByUser[u.id] || [];
        const photoAddr = addrs.find(a => a.locationPhotoUrl && a.lat && a.lng);
        const anyAddr = addrs.find(a => a.lat && a.lng);
        let lat = u.addressLat ? parseFloat(u.addressLat) : null;
        let lng = u.addressLng ? parseFloat(u.addressLng) : null;
        let locationSource = 'user_profile';
        let photoUrl: string | null = null;

        if (photoAddr) {
          lat = parseFloat(photoAddr.lat);
          lng = parseFloat(photoAddr.lng);
          locationSource = 'geotag_photo';
          photoUrl = photoAddr.locationPhotoUrl;
        } else if (anyAddr) {
          lat = parseFloat(anyAddr.lat);
          lng = parseFloat(anyAddr.lng);
          locationSource = 'saved_address';
        }

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

        const bt = (u.businessType || '').toUpperCase();
        let tier = u.pricingRole || 'MRP';
        if (!u.pricingRole) {
          if (bt === 'WSD' || u.role === 'wholesale_dealer' || u.role === 'wsd') tier = 'WHOLESALE_DEALER';
          else if (bt === 'DLR' || bt === 'DEALER' || u.role === 'dealer') tier = 'DEALER';
          else if (bt === 'RETAILER' || bt === 'RTL' || u.role === 'retailer') tier = 'RETAILER';
          else if (bt === 'MPCS' || u.role === 'mpcs') tier = 'MPCS';
          else if (bt === 'HOTELS' || bt === 'HOTEL' || u.role === 'hotel') tier = 'HOTEL';
          else if (bt === 'INSTUTION' || bt === 'INSTITUTION' || u.role === 'institution') tier = 'INSTITUTION';
          else if (bt === 'PRIVATE PARLOUR' || u.role === 'private_parlour') tier = 'PRIVATE_PARLOUR';
          else if (bt === 'UNION PARLOUR' || u.role === 'union_parlour') tier = 'UNION_PARLOUR';
          else tier = 'MRP';
        }

        return {
          id: u.id,
          name: u.businessName || u.name || 'Unknown',
          phone: u.phone,
          businessCode: u.businessCode,
          businessType: u.businessType || u.role,
          tier,
          unionId: u.unionId,
          unionName: unionMap[u.unionId || ''] || u.districtUnion || '',
          lat,
          lng,
          locationSource,
          photoUrl,
          status: u.status || 'approved',
        };
      }).filter(Boolean);

      res.json(mapUsers);
    } catch (error) {
      console.error('B2B users map error:', error);
      res.status(500).json({ error: 'Failed to fetch B2B users map data' });
    }
  });

  // ============ B2B User Profile Lookup ============
  app.get("/api/admin/b2b-lookup/:code", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { code } = req.params;
      const allUsers = await storage.listUsers();
      let user = allUsers.find(u => (u as any).businessCode === code || (u as any).id === code || (u as any).email === code || (u as any).phone === code || (u as any).gstNumber === code);
      if (!user) {
        const q = code.toLowerCase();
        user = allUsers.find(u => (u as any).businessCode?.toLowerCase() === q || (u as any).name?.toLowerCase().includes(q));
      }
      if (!user) return res.status(404).json({ error: 'User not found' });
      const userId = (user as any).id;
      const userOrders = await db.select().from(ordersTable).where(eq(ordersTable.customerEmail, user.email));
      const hierarchy = await db.select().from(userHierarchy).where(or(eq(userHierarchy.parentId, userId), eq(userHierarchy.childId, userId)));
      const merchants = await storage.getMerchants();
      const unionName = merchants.find((m: any) => m.id === (user as any).unionId)?.restaurantName || (user as any).unionId || '';
      const ordersSummary = {
        totalOrders: userOrders.length,
        totalRevenue: userOrders.reduce((s, o) => s + (parseFloat(o.total as string) || 0), 0),
        lastOrderDate: userOrders.length > 0 ? userOrders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0].createdAt : null,
        bySegment: { 'Fresh Milk': 0, 'Products': 0, 'Ice Cream': 0 } as Record<string, number>,
        recentOrders: userOrders.slice(0, 10).map(o => ({ id: o.id, displayId: o.displayId, total: o.total, status: o.status, segment: o.productSegment, createdAt: o.createdAt })),
      };
      userOrders.forEach(o => {
        const seg = o.productSegment || 'Products';
        ordersSummary.bySegment[seg] = (ordersSummary.bySegment[seg] || 0) + (parseFloat(o.total as string) || 0);
      });
      const parentRelations = hierarchy.filter(h => h.childId === userId).map(h => ({ id: h.parentId, name: h.parentName, role: h.parentRole, email: h.parentEmail }));
      const childRelations = hierarchy.filter(h => h.parentId === userId).map(h => ({ id: h.childId, name: h.childName, role: h.childRole, email: h.childEmail, status: h.approvalStatus }));
      res.json({
        user: { ...user, passwordHash: undefined },
        unionName,
        ordersSummary,
        hierarchy: { parents: parentRelations, children: childRelations },
      });
    } catch (error) {
      console.error('Error in B2B lookup:', error);
      res.status(500).json({ error: 'Failed to lookup user' });
    }
  });

  // ============ Union-level B2B User Approval ============
  app.get("/api/staff/b2b-users", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      const merchantId = decoded.merchantId || decoded.id;
      if (!merchantId) return res.status(401).json({ error: 'Invalid token' });
      const b2bRoles = ['wholesale_dealer', 'wsd', 'dealer', 'retailer', 'mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2bPricingRoles = ['WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'INTER_UNION', 'FEDERATION', 'AGENT', 'FMD'];
      const merchantIdStr = String(merchantId);
      const possibleIds = [merchantIdStr, `merchant-${merchantIdStr}`];
      if (merchantIdStr.startsWith('merchant-')) possibleIds.push(merchantIdStr.replace('merchant-', ''));
      const unionCondition = or(
        inArray(usersTable.unionId, possibleIds),
        inArray(sql`CAST(${usersTable.unionId} AS text)`, possibleIds)
      );
      const b2bUsers = await db.select().from(usersTable).where(
        and(
          unionCondition,
          or(
            inArray(usersTable.role, b2bRoles),
            inArray(usersTable.pricingRole, b2bPricingRoles),
            sql`${usersTable.businessType} IS NOT NULL AND ${usersTable.businessType} != ''`,
            sql`${usersTable.businessName} IS NOT NULL AND ${usersTable.businessName} != ''`
          )
        )
      );
      const excludeRoles = ['admin', 'driver', 'restaurant', 'merchant'];
      const filtered = b2bUsers.filter(u => !excludeRoles.includes(u.role));
      res.json(filtered.map(u => ({ ...u, passwordHash: undefined })));
    } catch (error) {
      console.error('B2B users fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch union B2B users' });
    }
  });

  app.get("/api/staff/b2b-users/:id/sales", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      const { id } = req.params;
      const user = await db.query.users.findFirst({ where: eq(usersTable.id, id) });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const userOrders = await db.select().from(ordersTable).where(
        or(
          eq(ordersTable.customerPhone, user.phone || ''),
          eq(ordersTable.customerEmail, user.email || '')
        )
      );
      const totalSales = userOrders.reduce((sum, o) => sum + parseFloat(String(o.total || 0)), 0);
      const totalOrders = userOrders.length;
      const lastOrder = userOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
      const segmentBreakdown: Record<string, { orders: number; total: number }> = {};
      userOrders.forEach(o => {
        const seg = (o as any).productSegment || 'general';
        if (!segmentBreakdown[seg]) segmentBreakdown[seg] = { orders: 0, total: 0 };
        segmentBreakdown[seg].orders++;
        segmentBreakdown[seg].total += parseFloat(String(o.total || 0));
      });
      const recentOrders = userOrders.slice(0, 10).map(o => ({
        id: o.id, total: o.total, status: o.status, createdAt: o.createdAt,
        segment: (o as any).productSegment, items: o.items
      }));
      res.json({ totalSales, totalOrders, lastOrderDate: lastOrder?.createdAt || null, segmentBreakdown, recentOrders });
    } catch (error: any) {
      console.error('B2B sales data error:', error?.message || error);
      res.status(500).json({ error: 'Failed to fetch user sales data' });
    }
  });

  app.patch("/api/staff/b2b-users/:id/approve", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      const merchantId = decoded.merchantId || decoded.id;
      const { id } = req.params;
      const { status: newStatus, rejectionReason } = req.body;
      const user = await db.query.users.findFirst({ where: eq(usersTable.id, id) });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const mIdStr = String(merchantId);
      const userUnion = String(user.unionId || '');
      const authorized = userUnion === mIdStr || userUnion === `merchant-${mIdStr}` || `merchant-${userUnion}` === mIdStr;
      if (!authorized) return res.status(403).json({ error: 'Not authorized for this user' });
      const updates: any = { status: newStatus, updatedAt: new Date() };
      await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  app.get("/api/staff/b2b-users/:id/addresses", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      const { id } = req.params;
      const addresses = await db.select().from(userAddresses).where(eq(userAddresses.userId, id));
      res.json(addresses.map(a => ({
        id: a.id,
        label: a.label || 'Home',
        addressLine1: a.addressLine1,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        lat: a.lat,
        lng: a.lng,
        locationPhotoUrl: a.locationPhotoUrl,
      })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch addresses' });
    }
  });

  // ============ Admin B2B Users Bulk Import ============
  app.post("/api/admin/users/bulk-import", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows provided' });
      }

      const allMerchants = await storage.getMerchants();

      const TIER_TO_ROLE: Record<string, string> = {
        'DLR': 'dealer', 'WSD': 'wsd', 'RTL': 'retailer',
        'FED': 'federation', 'INT': 'inter_union', 'MRP': 'customer',
      };

      const TIER_TO_PRICING: Record<string, string> = {
        'DLR': 'DEALER', 'WSD': 'WHOLESALE_DEALER', 'RTL': 'RETAILER',
        'FED': 'FEDERATION', 'INT': 'INTER_UNION', 'MRP': 'MRP',
        'DEALER': 'DEALER', 'WHOLESALE_DEALER': 'WHOLESALE_DEALER',
        'RETAILER': 'RETAILER', 'FEDERATION': 'FEDERATION',
        'INTER_UNION': 'INTER_UNION',
      };

      const ROLE_NORMALIZE: Record<string, string> = {
        'FEDERATION': 'federation', 'INTER_UNION': 'inter_union',
        'WHOLESALE_DEALER': 'wsd', 'WSD': 'wsd', 'DEALER': 'dealer',
        'DLR': 'dealer', 'RETAILER': 'retailer', 'RTL': 'retailer',
        'MRP': 'customer', 'AGENT': 'agent', 'FMD': 'fmd',
        'federation': 'federation', 'inter_union': 'inter_union',
        'wsd': 'wsd', 'wholesale_dealer': 'wsd', 'dealer': 'dealer',
        'retailer': 'retailer', 'agent': 'agent', 'fmd': 'fmd',
      };

      const results = {
        total: rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as { row: number; businessName: string; error: string }[],
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.businessName && !row.phone) {
            results.skipped++;
            continue;
          }

          if (!row.businessName) {
            results.errors.push({ row: i + 1, businessName: '', error: 'Business Name is required' });
            continue;
          }

          const phone = String(row.phone || '').replace(/\D/g, '');

          const businessTypeUpper = (row.businessType || '').toUpperCase().trim();
          const BTYPE_TO_ROLE: Record<string, string> = {
            'WSD': 'wsd', 'WHOLESALE_DEALER': 'wsd', 'WHOLESALE DEALER': 'wsd',
            'DLR': 'dealer', 'DEALER': 'dealer', 'AGENT': 'dealer',
            'PRIVATE PARLOUR': 'dealer', 'UNION PARLOUR': 'dealer',
            'HOTELS': 'dealer', 'HOTEL': 'dealer',
            'INSTUTION': 'dealer', 'INSTITUTION': 'dealer',
            'GENERAL SHOP': 'dealer', 'GENERAL SHOP / RETAIL': 'dealer',
            'MPCS': 'dealer', 'RETAILER': 'retailer',
            'FEDERATION': 'federation', 'INTER_UNION': 'inter_union',
          };

          const role = BTYPE_TO_ROLE[businessTypeUpper] ||
            ROLE_NORMALIZE[row.role || row.pricingTier || 'dealer'] || 'dealer';

          const pricingRole = TIER_TO_PRICING[row.pricingTier?.toUpperCase()] ||
            TIER_TO_PRICING[row.role?.toUpperCase()] ||
            TIER_TO_PRICING[businessTypeUpper] || 'DEALER';

          const freshMilkTier = (row.freshMilkTier || '').toUpperCase();
          const productsTier = (row.productsTier || '').toUpperCase();
          const iceCreamTier = (row.iceCreamTier || '').toUpperCase();

          const name = row.contactName || row.businessName || `B2B-${row.businessCode || i + 1}`;
          const uniqueId = row.businessCode || `b2b${i + 1}`;
          const email = row.email || `${phone || uniqueId}@b2b.aavincart.com`;

          const defaultPassword = `Aavin@${phone ? phone.slice(-4) : '1234'}`;
          const passwordHash = await hashPassword(defaultPassword);

          const isWsdUser = pricingRole === 'WHOLESALE_DEALER';
          const defaultFreshMilkRole = isWsdUser ? 'DEALER' : pricingRole;
          const defaultProductsRole = pricingRole;
          const defaultIceCreamRole = pricingRole;

          const userData: any = {
            name,
            email,
            passwordHash,
            plainPassword: defaultPassword,
            role,
            phone: phone || undefined,
            pricingRole,
            freshMilkPricingRole: freshMilkTier && freshMilkTier !== 'X' ?
              (TIER_TO_PRICING[freshMilkTier] || defaultFreshMilkRole) : defaultFreshMilkRole,
            productsPricingRole: productsTier && productsTier !== 'X' ?
              (TIER_TO_PRICING[productsTier] || defaultProductsRole) : defaultProductsRole,
            iceCreamPricingRole: iceCreamTier && iceCreamTier !== 'X' ?
              (TIER_TO_PRICING[iceCreamTier] || defaultIceCreamRole) : defaultIceCreamRole,
            district: row.district || '',
            districtUnion: row.districtUnion || '',
            unionId: row.districtUnion ? (() => {
              const resolved = resolveDistrictUnionToMerchantId(row.districtUnion, allMerchants);
              return resolved.startsWith('merchant-') ? resolved : undefined;
            })() : undefined,
            office: row.office || '',
            businessType: row.businessType || '',
            businessTypeCode: row.businessTypeCode || '',
            businessRoute: row.businessRoute || '',
            businessPoint: row.businessPoint || '',
            businessCode: row.businessCode || '',
            businessName: row.businessName || '',
            businessAddress: row.address || '',
            gstNumber: row.gstin || undefined,
            panNumber: row.pan || undefined,
            aadhaarNumber: row.aadhaar || undefined,
            msmeNumber: row.msme || undefined,
            securityDeposit: row.securityDeposit || undefined,
            freshMilkTier: freshMilkTier && freshMilkTier !== 'X' ? freshMilkTier : undefined,
            productTier: productsTier && productsTier !== 'X' ? productsTier : undefined,
            status: 'approved',
          };

          // Check if user with same businessCode (or phone as fallback) already exists
          let existing = null;
          if (row.businessCode) {
            const result = await db.select().from(usersTable).where(eq(usersTable.businessCode, row.businessCode)).limit(1);
            existing = result.length > 0 ? result[0] : null;
          }
          
          // If no businessCode, try matching by phone
          if (!existing && phone) {
            const result = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
            existing = result.length > 0 ? result[0] : null;
          }

          if (existing) {
            // Update existing user - exclude passwordHash and email
            const updateData: any = {
              name: userData.name,
              role: userData.role,
              phone: userData.phone || existing.phone,
              pricingRole: userData.pricingRole,
              freshMilkPricingRole: userData.freshMilkPricingRole || existing.freshMilkPricingRole,
              productsPricingRole: userData.productsPricingRole || existing.productsPricingRole,
              district: userData.district || existing.district,
              districtUnion: userData.districtUnion || existing.districtUnion,
              unionId: userData.unionId || existing.unionId,
              office: userData.office || existing.office,
              businessType: userData.businessType || existing.businessType,
              businessTypeCode: userData.businessTypeCode || existing.businessTypeCode,
              businessRoute: userData.businessRoute || existing.businessRoute,
              businessPoint: userData.businessPoint || existing.businessPoint,
              businessCode: userData.businessCode || existing.businessCode,
              businessName: userData.businessName || existing.businessName,
              businessAddress: userData.businessAddress || existing.businessAddress,
              gstNumber: userData.gstNumber || existing.gstNumber,
              panNumber: userData.panNumber || existing.panNumber,
              aadhaarNumber: userData.aadhaarNumber || existing.aadhaarNumber,
              msmeNumber: userData.msmeNumber || existing.msmeNumber,
              securityDeposit: userData.securityDeposit || existing.securityDeposit,
              freshMilkTier: userData.freshMilkTier || existing.freshMilkTier,
              productTier: userData.productTier || existing.productTier,
              status: userData.status || existing.status,
              updatedAt: new Date(),
            };

            // Remove undefined values to only update non-empty fields
            Object.keys(updateData).forEach(key => {
              if (updateData[key] === undefined) {
                delete updateData[key];
              }
            });

            await db.update(usersTable).set(updateData).where(eq(usersTable.id, existing.id));
            results.updated++;
          } else {
            // Create new user
            const user = await storage.createUser(userData);
            results.created++;
          }
        } catch (err) {
          results.errors.push({
            row: i + 1,
            businessName: row.businessName || '',
            error: (err as Error).message,
          });
        }
      }

      await logAudit(req, "users", "bulk-import", "CREATE", { newValues: { created: results.created, updated: results.updated, skipped: results.skipped, errors: results.errors.length, total: results.total } });
      res.json({
        success: true,
        message: `Import complete: ${results.created} users created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
        ...results,
      });
    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({ error: 'Failed to process bulk import' });
    }
  });

  // ============ Seed B2B Users from Excel File ============
  app.post("/api/admin/seed-excel", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const jsonPath = path.join(process.cwd(), 'attached_assets', 'B2B_Users_Sample_Import.json');
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as any[][];
      if (!data || data.length === 0) { res.status(400).json({ error: 'No data found' }); return; }

      const headers = data[0] as string[];
      const rows = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length < 3) continue;

        const businessName = row[9] ? String(row[9]).trim() : '';
        if (!businessName) continue;

        rows.push({
          businessName,
          phone: row[11] ? String(row[11]).replace(/\D/g, '') : '',
          businessType: row[4] ? String(row[4]).trim() : '',
          businessTypeCode: row[5] ? String(row[5]).trim() : '',
          businessRoute: row[6] ? String(row[6]).trim() : '',
          businessPoint: row[7] ? String(row[7]).trim() : '',
          businessCode: row[8] ? String(row[8]).trim() : '',
          contactName: row[10] ? String(row[10]).trim() : '',
          email: row[12] ? String(row[12]).trim() : '',
          district: row[1] ? String(row[1]).trim() : '',
          districtUnion: row[2] ? String(row[2]).trim() : '',
          office: row[3] ? String(row[3]).trim() : '',
          gstin: row[15] ? String(row[15]).trim() : '',
          pan: row[16] ? String(row[16]).trim() : '',
          aadhaar: row[17] ? String(row[17]).trim() : '',
          msme: row[18] ? String(row[18]).trim() : '',
          securityDeposit: row[19] ? String(row[19]).trim() : '',
          address: row[20] ? String(row[20]).trim() : '',
          freshMilkTier: row[21] ? String(row[21]).trim() : '',
          productsTier: row[22] ? String(row[22]).trim() : '',
          iceCreamTier: row[23] ? String(row[23]).trim() : '',
        });
      }

      // Use the same bulk import logic internally
      const TIER_TO_PRICING: Record<string, string> = {
        'DLR': 'DEALER', 'WSD': 'WHOLESALE_DEALER', 'RTL': 'RETAILER',
        'FED': 'FEDERATION', 'INT': 'INTER_UNION', 'MRP': 'MRP',
      };
      const BTYPE_TO_ROLE: Record<string, string> = {
        'WSD': 'wsd', 'WHOLESALE_DEALER': 'wsd',
        'DLR': 'dealer', 'DEALER': 'dealer',
        'PRIVATE PARLOUR': 'dealer', 'UNION PARLOUR': 'dealer',
        'HOTELS': 'dealer', 'HOTEL': 'dealer',
        'INSTUTION': 'dealer', 'INSTITUTION': 'dealer',
        'GENERAL SHOP': 'dealer', 'MPCS': 'dealer',
        'RETAILER': 'retailer',
      };

      let created = 0, errors: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const businessTypeUpper = r.businessType.toUpperCase().trim();
          const role = BTYPE_TO_ROLE[businessTypeUpper] || 'dealer';
          const phone = r.phone || '';
          const uniqueId = r.businessCode || `b2b${i + 1}`;
          const email = r.email || `${phone || uniqueId}@b2b.aavincart.com`;
          const name = r.contactName || r.businessName;
          const defaultPassword = `Aavin@${phone ? phone.slice(-4) : '1234'}`;
          const passwordHash = await hashPassword(defaultPassword);

          const fmTier = r.freshMilkTier.toUpperCase();
          const prTier = r.productsTier.toUpperCase();
          const icTier = r.iceCreamTier.toUpperCase();

          const pricingRole = TIER_TO_PRICING[fmTier] || TIER_TO_PRICING[prTier] || 'DEALER';

          await storage.createUser({
            name, email, passwordHash, plainPassword: defaultPassword, role,
            phone: phone || undefined,
            pricingRole,
            freshMilkPricingRole: fmTier && fmTier !== 'X' ? (TIER_TO_PRICING[fmTier] || pricingRole) : undefined,
            productsPricingRole: prTier && prTier !== 'X' ? (TIER_TO_PRICING[prTier] || pricingRole) : undefined,
            district: r.district, districtUnion: r.districtUnion, office: r.office,
            businessType: r.businessType, businessTypeCode: r.businessTypeCode || '',
            businessRoute: r.businessRoute, businessPoint: r.businessPoint,
            businessCode: r.businessCode, businessName: r.businessName,
            businessAddress: r.address || '',
            gstNumber: r.gstin || undefined,
            panNumber: r.pan || undefined,
            aadhaarNumber: r.aadhaar || undefined,
            msmeNumber: r.msme || undefined,
            securityDeposit: r.securityDeposit || undefined,
            freshMilkTier: fmTier && fmTier !== 'X' ? fmTier : undefined,
            productTier: prTier && prTier !== 'X' ? prTier : undefined,
            unionId: r.districtUnion || '',
            status: 'active',
          });
          created++;
        } catch (err) {
          errors.push({ row: i + 1, name: r.businessName, error: (err as Error).message });
        }
      }

      res.json({ success: true, total: rows.length, created, errors: errors.length, errorDetails: errors.slice(0, 20) });
    } catch (error) {
      console.error('Error seeding from Excel:', error);
      res.status(500).json({ error: 'Failed to seed from Excel: ' + (error as Error).message });
    }
  });

  // ============ Merchant People API (B2B users belonging to a union) ============
  app.get("/api/merchant/:merchantId/people", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }

      const allUsers = await storage.listUsers();
      const unionName = merchant.restaurantName || '';

      const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];
      const people = allUsers
        .filter(u => {
          const isB2B = b2bRoles.includes(u.role) ||
            (u.pricingRole && u.pricingRole !== 'MRP') ||
            (u.freshMilkPricingRole && u.freshMilkPricingRole !== 'MRP') ||
            (u.productsPricingRole && u.productsPricingRole !== 'MRP') ||
            (u.iceCreamPricingRole && u.iceCreamPricingRole !== 'MRP');
          if (!isB2B) return false;
          const matchesUnion = !u.districtUnion || 
            u.districtUnion.toLowerCase().includes(unionName.toLowerCase().replace(' district union', '').replace(' union', '').trim()) ||
            unionName.toLowerCase().includes((u.districtUnion || '').toLowerCase());
          return matchesUnion;
        })
        .map(u => ({
          id: u.id, name: u.name, email: u.email, phone: u.phone,
          role: u.role, pricingRole: u.pricingRole,
          freshMilkPricingRole: u.freshMilkPricingRole,
          productsPricingRole: u.productsPricingRole,
          iceCreamPricingRole: u.iceCreamPricingRole,
          status: u.status || 'active',
          district: u.district, districtUnion: u.districtUnion, office: u.office,
          businessType: u.businessType, businessTypeCode: u.businessTypeCode,
          businessRoute: u.businessRoute, businessPoint: u.businessPoint,
          businessCode: u.businessCode, businessName: u.businessName,
          businessAddress: u.businessAddress,
          gstNumber: u.gstNumber, panNumber: u.panNumber,
          aadhaarNumber: u.aadhaarNumber, msmeNumber: u.msmeNumber,
          securityDeposit: u.securityDeposit,
          profileComplete: !!(u.phone && u.businessAddress && (u.panNumber || u.gstNumber)),
          createdAt: u.createdAt,
        }));

      res.json(people);
    } catch (error) {
      console.error('Error fetching merchant people:', error);
      res.status(500).json({ error: 'Failed to fetch people' });
    }
  });

  // ============ Union-scoped User Management ============
  app.get("/api/merchant/:merchantId/users", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { type } = req.query;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }

      const allUsers = await storage.listUsers();
      const unionName = merchant.restaurantName || '';

      const b2bRoles = ['dealer', 'wholesale_dealer', 'wsd', 'retailer', 'inter_union', 'federation', 'agent', 'fmd'];
      const b2cRoles = ['customer', 'consumer'];
      const b2bPricingRoles = ['WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'INTER_UNION', 'FEDERATION', 'AGENT', 'FMD'];

      const isUnionUser = (u: any) => {
        if (u.unionId === merchantId) return true;
        if (u.restaurantId === merchantId) return true;
        if (!u.districtUnion) return false;
        const cleanUnion = unionName.toLowerCase().replace(/district cooperative milk producers union.*$/i, '').replace(/ union.*$/i, '').replace(/ ltd.*$/i, '').trim();
        return u.districtUnion.toLowerCase().includes(cleanUnion) || cleanUnion.includes(u.districtUnion.toLowerCase());
      };

      let users = allUsers.filter(u => u.role !== 'admin' && u.role !== 'driver' && u.role !== 'restaurant' && isUnionUser(u));

      if (type === 'b2c') {
        users = users.filter(u => b2cRoles.includes(u.role) || (!b2bRoles.includes(u.role) && u.role !== 'merchant'));
      } else if (type === 'b2b') {
        users = users.filter(u => 
          b2bRoles.includes(u.role) || 
          (u.pricingRole && b2bPricingRoles.includes(u.pricingRole)) ||
          (u.freshMilkPricingRole && b2bPricingRoles.includes(u.freshMilkPricingRole)) ||
          (u.productsPricingRole && b2bPricingRoles.includes(u.productsPricingRole)) ||
          ((u as any).iceCreamPricingRole && b2bPricingRoles.includes((u as any).iceCreamPricingRole)) ||
          ((u as any).businessName && (u as any).businessName.length > 0 && u.role !== 'merchant')
        );
      }

      const safeUsers = users.map(user => ({
        id: user.id, name: user.name, email: user.email,
        phone: (user as any).phone || '',
        role: user.role,
        pricingRole: user.pricingRole || '',
        pricingTier: (user as any).pricingTier || '',
        freshMilkPricingRole: user.freshMilkPricingRole || '',
        productsPricingRole: user.productsPricingRole || '',
        iceCreamPricingRole: user.iceCreamPricingRole || '',
        unionId: user.unionId || '',
        status: (user as any).status || 'approved',
        district: (user as any).district || '',
        districtUnion: (user as any).districtUnion || '',
        office: (user as any).office || '',
        businessType: (user as any).businessType || '',
        businessTypeCode: (user as any).businessTypeCode || '',
        businessRoute: (user as any).businessRoute || '',
        businessPoint: (user as any).businessPoint || '',
        businessCode: (user as any).businessCode || '',
        businessName: (user as any).businessName || '',
        businessAddress: (user as any).businessAddress || '',
        addressLat: (user as any).addressLat || '',
        addressLng: (user as any).addressLng || '',
        gstNumber: user.gstNumber || '',
        panNumber: user.panNumber || '',
        aadhaarNumber: (user as any).aadhaarNumber || '',
        msmeNumber: (user as any).msmeNumber || '',
        securityDeposit: (user as any).securityDeposit || '',
        fssaiLicense: user.fssaiLicense || '',
        plainPassword: (user as any).plainPassword || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching union users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.patch("/api/merchant/:merchantId/users/:userId", async (req, res) => {
    try {
      const { merchantId, userId } = req.params;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

      const allowedFields = ['name', 'phone', 'email', 'status', 'role', 'pricingRole',
        'freshMilkPricingRole', 'productsPricingRole', 'iceCreamPricingRole',
        'businessAddress', 'panNumber', 'aadhaarNumber', 'gstNumber', 'msmeNumber',
        'securityDeposit', 'businessType', 'businessRoute', 'businessPoint', 'businessName'];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updated = await storage.updateUser(userId, updates);
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete("/api/merchant/:merchantId/users/:userId", requireAuth, async (req, res) => {
    try {
      const { merchantId, userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user || user.unionId !== merchantId) {
        return res.status(404).json({ error: 'User not found or does not belong to this union' });
      }
      const success = await storage.deleteUser(userId);
      if (!success) return res.status(500).json({ error: 'Failed to delete user' });
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.patch("/api/merchant/:merchantId/users/:userId/approve", async (req, res) => {
    try {
      const { merchantId, userId } = req.params;
      const { action } = req.body;
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
      }
      const updated = await storage.updateUser(userId, { 
        status: action === 'approve' ? 'active' : 'rejected' 
      });
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, status: action === 'approve' ? 'active' : 'rejected' });
    } catch (error) {
      console.error('Error approving/rejecting user:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  app.get("/api/b2b/lookup-by-code", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { businessCode } = req.query;
      if (!businessCode || typeof businessCode !== 'string') {
        return res.status(400).json({ error: "Business code is required" });
      }
      const [registration] = await db.select().from(b2bRegistrations)
        .where(eq(b2bRegistrations.businessCode, businessCode.toUpperCase()))
        .limit(1);
      if (!registration) {
        return res.json({ businessRoute: '', businessPoint: '' });
      }
      res.json({
        businessRoute: registration.businessRoute || '',
        businessPoint: registration.businessPoint || '',
      });
    } catch (error) {
      console.error("Error looking up business code:", error);
      res.status(500).json({ error: "Failed to lookup business code" });
    }
  });

  app.get("/api/b2b/routes-and-points", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const regRoutes = await db.selectDistinct({ businessRoute: b2bRegistrations.businessRoute })
        .from(b2bRegistrations)
        .where(sql`${b2bRegistrations.businessRoute} IS NOT NULL AND ${b2bRegistrations.businessRoute} != ''`);
      const brRoutes = await db.selectDistinct({ routeName: businessRoutes.routeName })
        .from(businessRoutes)
        .where(sql`${businessRoutes.routeName} IS NOT NULL AND ${businessRoutes.routeName} != ''`);
      const userRoutes = await db.selectDistinct({ businessRoute: usersTable.businessRoute })
        .from(usersTable)
        .where(sql`${usersTable.businessRoute} IS NOT NULL AND ${usersTable.businessRoute} != ''`);
      const dpRoutes = await db.selectDistinct({ route: deliveryPointsTable.route })
        .from(deliveryPointsTable)
        .where(sql`${deliveryPointsTable.route} IS NOT NULL AND ${deliveryPointsTable.route} != ''`);

      const allRoutes = new Set<string>();
      regRoutes.forEach(r => r.businessRoute && allRoutes.add(r.businessRoute));
      brRoutes.forEach(r => r.routeName && allRoutes.add(r.routeName));
      userRoutes.forEach(r => r.businessRoute && allRoutes.add(r.businessRoute));
      dpRoutes.forEach(r => r.route && allRoutes.add(r.route));

      const regPoints = await db.selectDistinct({ businessPoint: b2bRegistrations.businessPoint })
        .from(b2bRegistrations)
        .where(sql`${b2bRegistrations.businessPoint} IS NOT NULL AND ${b2bRegistrations.businessPoint} != ''`);
      const userPoints = await db.selectDistinct({ businessPoint: usersTable.businessPoint })
        .from(usersTable)
        .where(sql`${usersTable.businessPoint} IS NOT NULL AND ${usersTable.businessPoint} != ''`);
      const dpPoints = await db.selectDistinct({ pointName: deliveryPointsTable.pointName })
        .from(deliveryPointsTable)
        .where(sql`${deliveryPointsTable.pointName} IS NOT NULL AND ${deliveryPointsTable.pointName} != ''`);
      const addrPoints = await db.selectDistinct({ pointName: userAddresses.pointName })
        .from(userAddresses)
        .where(sql`${userAddresses.pointName} IS NOT NULL AND ${userAddresses.pointName} != ''`);

      const routeFilter = req.query.route as string | undefined;

      const allPoints = new Set<string>();
      if (routeFilter) {
        const pointsForRoute = await db.selectDistinct({ businessPoint: b2bRegistrations.businessPoint })
          .from(b2bRegistrations)
          .where(and(
            eq(b2bRegistrations.businessRoute, routeFilter),
            sql`${b2bRegistrations.businessPoint} IS NOT NULL AND ${b2bRegistrations.businessPoint} != ''`
          ));
        pointsForRoute.forEach(p => p.businessPoint && allPoints.add(p.businessPoint));
        const dpPointsForRoute = await db.selectDistinct({ pointName: deliveryPointsTable.pointName })
          .from(deliveryPointsTable)
          .where(and(
            eq(deliveryPointsTable.route, routeFilter),
            sql`${deliveryPointsTable.pointName} IS NOT NULL AND ${deliveryPointsTable.pointName} != ''`
          ));
        dpPointsForRoute.forEach(p => p.pointName && allPoints.add(p.pointName));
        const userPointsForRoute = await db.selectDistinct({ businessPoint: usersTable.businessPoint })
          .from(usersTable)
          .where(and(
            eq(usersTable.businessRoute, routeFilter),
            sql`${usersTable.businessPoint} IS NOT NULL AND ${usersTable.businessPoint} != ''`
          ));
        userPointsForRoute.forEach(p => p.businessPoint && allPoints.add(p.businessPoint));
      } else {
        regPoints.forEach(p => p.businessPoint && allPoints.add(p.businessPoint));
        userPoints.forEach(p => p.businessPoint && allPoints.add(p.businessPoint));
        dpPoints.forEach(p => p.pointName && allPoints.add(p.pointName));
        addrPoints.forEach(p => p.pointName && allPoints.add(p.pointName));
      }

      res.json({
        routes: Array.from(allRoutes).sort(),
        points: Array.from(allPoints).sort(),
      });
    } catch (error) {
      console.error("Error fetching routes and points:", error);
      res.status(500).json({ error: "Failed to fetch routes and points" });
    }
  });

  // ============ User Profile Update (self-service) ============
}
