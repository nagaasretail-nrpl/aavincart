import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, getAllIdsForMerchant, generateInvoiceNumber, merchantToUnionMapping, generateDeliveryJobId, validateDeliveryJob } from "./shared";
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

export async function registerCommerceRoutes(app: Express): Promise<void> {
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const allowedFields = ['phone', 'email', 'businessAddress', 'panNumber', 'aadhaarNumber',
        'gstNumber', 'msmeNumber', 'securityDeposit', 'name'];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      await storage.updateUser(userId, updates);
      const updated = await storage.getUser(userId);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ============ Admin Delivery Drivers Management ============
  app.get("/api/admin/delivery-drivers", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      let drivers = allUsers.filter(u => u.role === 'driver');

      if ((req as any).user?.role === 'merchant') {
        const scope = getUnionScope(req);
        if (scope.merchantId) {
          const merchantIds = getAllIdsForMerchant(scope.merchantId);
          drivers = drivers.filter(d => d.unionId && merchantIds.includes(d.unionId));
        }
      }

      res.json(drivers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        unionId: u.unionId,
        assignedSegment: u.assignedSegment,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error('Error fetching delivery drivers:', error);
      res.status(500).json({ error: 'Failed to fetch delivery drivers' });
    }
  });

  app.post("/api/admin/delivery-drivers", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { name, email, phone, password, unionId, assignedSegment, vehicleType, vehicleNumber, licenseNumber } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }
      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      const scope = getUnionScope(req);
      const effectiveUnionId = unionId || scope.merchantId || scope.unionId || null;
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: 'driver',
        pricingRole: 'MRP',
        unionId: effectiveUnionId,
        assignedSegment: assignedSegment || null,
        restaurantId: null,
      });
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error('Error creating delivery driver:', error);
      res.status(500).json({ error: 'Failed to create delivery driver' });
    }
  });

  app.patch("/api/admin/delivery-drivers/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { password, ...updates } = req.body;
      let updateData = updates;
      if (password) {
        const passwordHash = await hashPassword(password);
        updateData = { ...updates, passwordHash };
      }
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating delivery driver:', error);
      res.status(500).json({ error: 'Failed to update delivery driver' });
    }
  });

  app.delete("/api/admin/delivery-drivers/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery driver:', error);
      res.status(500).json({ error: 'Failed to delete delivery driver' });
    }
  });

  app.post("/api/admin/delivery-drivers/bulk-import", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows provided' });
      }
      const results = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] as any[] };
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name && !row.phone && !row.email) { results.skipped++; continue; }
          if (!row.name || !row.email) {
            results.errors.push({ row: i + 1, name: row.name || '', error: 'Name and email are required' });
            continue;
          }
          
          const existing = await storage.findUserByEmail(row.email);
          
          if (existing) {
            const updateData: any = { name: row.name };
            if (row.phone) updateData.phone = row.phone;
            if (row.unionId) updateData.unionId = row.unionId;
            if (row.assignedSegment) updateData.assignedSegment = row.assignedSegment;
            await storage.updateUser(existing.id, updateData);
            results.updated++;
          } else {
            const phone = String(row.phone || '').replace(/\D/g, '');
            const password = row.password || `Aavin@${phone ? phone.slice(-4) : '1234'}`;
            const passwordHash = await hashPassword(password);
            await storage.createUser({
              name: row.name,
              email: row.email,
              phone: phone || null,
              passwordHash,
              role: 'driver',
              pricingRole: 'MRP',
              unionId: row.unionId || null,
              assignedSegment: row.assignedSegment || null,
              restaurantId: null,
            });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push({ row: i + 1, name: row.name || '', error: err.message });
        }
      }
      res.json(results);
    } catch (error) {
      console.error('Error in delivery drivers bulk import:', error);
      res.status(500).json({ error: 'Failed to process delivery drivers bulk import' });
    }
  });

  // Admin Analytics
  app.get("/api/admin/analytics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        let orders = await storage.getOrders(scope.merchantId);
        if (!orders.length) {
          for (const id of validIds) {
            const moreOrders = await storage.getOrders(id);
            orders = orders.concat(moreOrders);
          }
        }
        let allUsers = await storage.listUsers();
        allUsers = allUsers.filter(u => validIds.includes((u as any).unionId || '') || validIds.includes((u as any).districtUnion || '') || validIds.includes(u.restaurantId || ''));
        const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total as string) || 0), 0);
        return res.json({
          totalOrders: orders.length,
          totalRevenue,
          totalUsers: allUsers.length,
          totalRestaurants: 1,
          recentOrders: orders.slice(-10).reverse(),
        });
      }
      const analytics = await storage.getAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics for admin:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // District Union routes — /api/unions/* are the canonical paths; /api/restaurants/* kept for backward compat
  app.get("/api/unions", async (req, res) => {
    try {
      const { cuisine, search } = req.query;
      const cacheKey = `restaurants:${cuisine || ''}:${search || ''}`;
      const cached = getCached(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      const restaurants = await storage.getRestaurants(
        cuisine as string,
        search as string
      );
      setCache(cacheKey, restaurants);
      res.set('X-Cache', 'MISS');
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching district unions:", error);
      res.status(500).json({ error: "Failed to fetch district unions" });
    }
  });

  app.get("/api/unions/:id", async (req, res) => {
    try {
      let restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        const merchant = await storage.getMerchant(req.params.id);
        if (merchant) {
          restaurant = {
            id: merchant.id,
            name: merchant.restaurantName || '',
            description: merchant.description || '',
            cuisine: 'Dairy Products',
            image: merchant.headerImage || merchant.logo || 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
            rating: "4.5",
            deliveryTime: "30-45 min",
            deliveryFee: "0.00",
            address: merchant.address || '',
            isOpen: merchant.status === 'approved' || merchant.status === 'active',
            createdAt: merchant.createdAt || null,
          };
        }
      }
      if (!restaurant) {
        return res.status(404).json({ error: "District Union not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching district union:", error);
      res.status(500).json({ error: "Failed to fetch district union" });
    }
  });

  app.get("/api/restaurants", async (req, res) => {
    try {
      const { cuisine, search } = req.query;
      const cacheKey = `restaurants:${cuisine || ''}:${search || ''}`;
      const cached = getCached(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      const restaurants = await storage.getRestaurants(
        cuisine as string,
        search as string
      );
      setCache(cacheKey, restaurants);
      res.set('X-Cache', 'MISS');
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching district unions:", error);
      res.status(500).json({ error: "Failed to fetch district unions" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      // First try in-memory storage
      let restaurant = await storage.getRestaurant(req.params.id);
      
      // If not found, check PostgreSQL merchants table
      if (!restaurant) {
        const merchant = await storage.getMerchant(req.params.id);
        if (merchant) {
          // Convert merchant to union-compatible format
          restaurant = {
            id: merchant.id,
            name: merchant.restaurantName || '',
            description: merchant.description || '',
            cuisine: 'Dairy Products',
            image: merchant.headerImage || merchant.logo || 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
            rating: "4.5",
            deliveryTime: "30-45 min",
            deliveryFee: "0.00",
            address: merchant.address || '',
            isOpen: merchant.status === 'approved' || merchant.status === 'active',
            createdAt: merchant.createdAt || null,
          };
        }
      }
      
      if (!restaurant) {
        return res.status(404).json({ error: "District Union not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching district union:", error);
      res.status(500).json({ error: "Failed to fetch district union" });
    }
  });
  
  // Lookup merchant by slug
  app.get("/api/shops/by-slug/:slug", async (req, res) => {
    try {
      const merchants = await storage.getMerchants();
      const merchant = merchants.find(m => m.restaurantSlug === req.params.slug);
      if (!merchant) {
        return res.status(404).json({ error: "Shop not found" });
      }
      // Return in union-compatible format
      res.json({
        id: merchant.id,
        name: merchant.restaurantName,
        description: merchant.description || '',
        cuisine: 'Dairy',
        image: merchant.headerImage || merchant.logo || '',
        rating: "4.5",
        deliveryTime: "30-45 min",
        deliveryFee: "0.00",
        address: merchant.address || '',
        isOpen: merchant.status === 'active',
        slug: merchant.restaurantSlug,
      });
    } catch (error) {
      console.error("Error fetching shop by slug:", error);
      res.status(500).json({ error: "Failed to fetch shop" });
    }
  });

  // Menu items routes
  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const { category } = req.query;
      const restaurantId = req.params.id;
      const menuCacheKey = `menu:${restaurantId}:${category || ''}`;
      const menuCached = getCached(menuCacheKey);
      if (menuCached) {
        res.set('X-Cache', 'HIT');
        return res.json(menuCached);
      }

      // Build reverse mapping: UNI-SLM-01 -> merchant-3
      const unionToMerchantMapping: Record<string, string> = {};
      for (const [mId, uId] of Object.entries(merchantToUnionMapping)) {
        unionToMerchantMapping[uId] = mId;
      }

      // Try merchant_products + master_products first (new system)
      const { masterProducts: mpTable, merchantProducts: mprodTable } = await import("@shared/schema");
      
      // Look up products for both the given ID and any mapped ID
      const lookupIds = [restaurantId];
      if (unionToMerchantMapping[restaurantId]) lookupIds.push(unionToMerchantMapping[restaurantId]);
      if (merchantToUnionMapping[restaurantId]) lookupIds.push(merchantToUnionMapping[restaurantId]);

      const allMerchantProds = await db.select().from(mprodTable)
        .where(inArray(mprodTable.merchantId, lookupIds));

      if (allMerchantProds.length > 0) {
        const seenMasterIds = new Set<number>();
        const dedupedProds = allMerchantProds.filter(mp => {
          if (seenMasterIds.has(mp.masterProductId)) return false;
          seenMasterIds.add(mp.masterProductId);
          return true;
        });
        const masterIds = dedupedProds.map(mp => mp.masterProductId);
        const masters = await db.select().from(mpTable)
          .where(inArray(mpTable.id, masterIds));
        const masterMap = new Map(masters.map(m => [m.id, m]));

        let items = dedupedProds
          .filter(mp => mp.isActive)
          .map(mp => {
            const master = masterMap.get(mp.masterProductId);
            if (!master || master.status !== 'active') return null;
            const mrpVal = mp.mrp || master.mrp || null;
            const dealerVal = mp.dealerPrice || master.dealerPrice || null;
            const wholesaleVal = mp.wholesalePrice || master.wholesalePrice || null;
            const fedVal = mp.federationPrice || master.federationPrice || null;
            const interUnionVal = mp.interUnionPrice || master.interUnionPrice || null;
            const retailerVal = mp.retailerPrice || master.retailerPrice || null;
            const displayPrice = mrpVal || dealerVal || wholesaleVal || fedVal || "0.00";
            return {
              id: `mp-${mp.id}`,
              restaurantId,
              name: master.name,
              description: master.description || `${master.name} - ${master.segment}`,
              price: displayPrice,
              category: master.segment || "Products",
              subcategory: master.category || null,
              image: master.image || null,
              isAvailable: true,
              productCode: master.productCode,
              gstPercent: master.gstPercent || null,
              federationPrice: fedVal,
              districtUnionPrice: interUnionVal,
              wholesalePrice: wholesaleVal,
              retailPrice: dealerVal,
              retailerPrice: retailerVal,
              mrp: mrpVal,
              unitSize: master.unitSize || null,
              unitType: master.unitType || null,
              productSegment: master.segment || null,
              hsnCode: master.hsnCode || null,
              packagingType: master.packagingType || null,
              unitsPerPackage: master.unitsPerPackage || null,
              packageWeight: master.packageWeight || null,
              packageWeightUnit: master.packageWeightUnit || null,
              createdAt: mp.createdAt,
            };
          })
          .filter(Boolean);

        if (category) {
          items = items.filter((item: any) => 
            item.category?.toLowerCase() === (category as string).toLowerCase()
          );
        }

        // Check if retailer pricing should be hidden
        const merchant = await storage.getMerchant(restaurantId);
        if (!merchant?.retailerPriceEnabled) {
          items = items.map((item: any) => {
            const { retailerPrice, ...rest } = item;
            return rest;
          });
        }
        setCache(menuCacheKey, items);
        return res.json(items);
      }

      // Fallback: try legacy menu_items table
      const legacyMenuItems = await storage.getMenuItems(restaurantId, category as string);
      const merchant = await storage.getMerchant(restaurantId);
      if (!merchant?.retailerPriceEnabled) {
        const filteredItems = legacyMenuItems.map((item: any) => {
          const { retailerPrice, ...rest } = item;
          return rest;
        });
        setCache(menuCacheKey, filteredItems);
        return res.json(filteredItems);
      }
      setCache(menuCacheKey, legacyMenuItems);
      res.json(legacyMenuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Alias: /api/unions/:id/menu → redirects to /api/restaurants/:id/menu
  app.get("/api/unions/:id/menu", (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(307, `/api/restaurants/${req.params.id}/menu${qs}`);
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const menuItem = await storage.getMenuItem(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      // Check if retailer pricing should be hidden for this merchant
      if (menuItem.restaurantId) {
        const merchant = await storage.getMerchant(menuItem.restaurantId);
        if (!merchant?.retailerPriceEnabled) {
          const { retailerPrice, ...filteredItem } = menuItem as any;
          return res.json(filteredItem);
        }
      }
      res.json(menuItem);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });

  // Merchant menu item management endpoints
  app.post("/api/merchant/:merchantId/menu-items", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { id: _id, ...bodyWithoutId } = req.body;
      const itemData = {
        ...bodyWithoutId,
        restaurantId: merchantId,
      };
      const newItem = await storage.createMenuItem(itemData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });

  app.put("/api/merchant/:merchantId/menu-items/:itemId", async (req, res) => {
    try {
      const { merchantId, itemId } = req.params;
      const updatedItem = await storage.updateMenuItem(itemId, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Simple route to update menu item by ID only (for pricing updates)
  app.put("/api/menu-items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const updatedItem = await storage.updateMenuItem(itemId, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  app.delete("/api/merchant/:merchantId/menu-items/:itemId", async (req, res) => {
    try {
      const { merchantId, itemId } = req.params;
      const success = await storage.deleteMenuItem(itemId);
      if (!success) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  app.post("/api/merchant/:merchantId/menu-items/:itemId/copy", async (req, res) => {
    try {
      const { merchantId, itemId } = req.params;
      const originalItem = await storage.getMenuItem(itemId);
      if (!originalItem) {
        return res.status(404).json({ error: "Original menu item not found" });
      }
      const { id: _originalId, ...itemWithoutId } = originalItem;
      const copiedItem = await storage.createMenuItem({
        ...itemWithoutId,
        name: `${originalItem.name} (Copy)`,
        restaurantId: merchantId,
      });
      res.status(201).json(copiedItem);
    } catch (error) {
      console.error("Error copying menu item:", error);
      res.status(500).json({ error: "Failed to copy menu item" });
    }
  });

  // Merchant orders endpoint (for POS dashboard)
  app.get("/api/merchant/:merchantId/orders", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { staffOffice, staffSegments } = req.query;
      const restaurantId = merchantId.replace('merchant-', '');
      let orders = await storage.getOrders(restaurantId);

      if (staffOffice && staffOffice !== 'head_office') {
        const officeList = (staffOffice as string).split(',').map(s => s.trim()).filter(Boolean);
        orders = orders.filter((o: any) => officeList.includes(o.customerOffice));
      }
      if (staffSegments) {
        const segments = (staffSegments as string).split(',');
        const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
        const allowedSegments = segments.map(s => segmentSuffixMap[s] || s);
        orders = orders.filter((o: any) => o.productSegment && allowedSegments.includes(o.productSegment));
      }

      res.json(orders);
    } catch (error) {
      console.error("Error fetching merchant orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Category routes
  app.get("/api/merchant/:merchantId/categories", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const categories = await storage.getCategories(merchantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/merchant/:merchantId/categories", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { name, isActive, sortOrder } = req.body;
      const category = await storage.createCategory({ merchantId, name, isActive, sortOrder });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/merchant/:merchantId/categories/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { name, isActive, sortOrder } = req.body;
      const category = await storage.updateCategory(categoryId, { name, isActive, sortOrder });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/merchant/:merchantId/categories/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const deleted = await storage.deleteCategory(categoryId);
      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Bulk price list upload
  app.post("/api/merchant/:merchantId/bulk-upload", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      const results = { created: 0, updated: 0, errors: [] as string[] };

      for (const item of items) {
        try {
          // Create category if it doesn't exist
          if (item.category) {
            const existingCategories = await storage.getCategories(merchantId);
            const categoryExists = existingCategories.some(c => c.name.toLowerCase() === item.category.toLowerCase());
            if (!categoryExists) {
              await storage.createCategory({ merchantId, name: item.category });
            }
          }

          // Create menu item
          const menuItem = await storage.createMenuItem({
            restaurantId: merchantId,
            name: item.name || item.product_name || item.item_name,
            description: item.description || item.short_description || '',
            price: item.mrp || item.price || '0',
            category: item.category || 'Uncategorized',
            image: item.image || item.photo || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop',
            isAvailable: item.available !== false,
            productCode: item.product_code || item.sku || '',
            subcategory: item.subcategory || item.sub_category || '',
            gstPercent: item.gst_percent || item.gst || '0',
            federationPrice: item.federation_price || item.federationPrice || '',
            districtUnionPrice: item.district_union_price || item.districtUnionPrice || item.inter_union_price || '',
            wholesalePrice: item.wholesale_price || item.wholesalePrice || '',
            retailPrice: item.retailer_price || item.dealer_price || item.retailPrice || '', // Note: retailer_price = Dealer price in imports
            mrp: item.mrp || item.consumer_price || item.price || '',
            unitSize: item.unit_size || item.unitSize || '',
            unitType: item.unit_type || item.unitType || '',
          });
          results.created++;
        } catch (itemError: any) {
          results.errors.push(`Failed to create "${item.name || item.product_name}": ${itemError.message}`);
        }
      }

      res.json({
        success: true,
        message: `Bulk upload complete: ${results.created} items created`,
        ...results,
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ error: "Failed to process bulk upload" });
    }
  });

  // Sub-User routes for Admin
  app.get("/api/admin/sub-users", async (req, res) => {
    try {
      const { parentId } = req.query;
      if (!parentId || typeof parentId !== 'string') {
        return res.status(400).json({ error: "Parent ID is required" });
      }
      const subUsers = await storage.getSubUsers('admin', parentId);
      // Don't return password hash
      const sanitized = subUsers.map(({ passwordHash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching admin sub-users:", error);
      res.status(500).json({ error: "Failed to fetch sub-users" });
    }
  });

  app.post("/api/admin/sub-users", async (req, res) => {
    try {
      const { parentId, name, email, phone, username, password, permissions } = req.body;
      if (!parentId || !name || !email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      // Check if username exists
      const existing = await storage.getSubUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const subUser = await storage.createSubUser({
        parentType: 'admin',
        parentId,
        name,
        email,
        phone,
        username,
        passwordHash: password, // In production, hash this
        permissions: permissions || [],
      });
      const { passwordHash, ...sanitized } = subUser;
      res.status(201).json(sanitized);
    } catch (error) {
      console.error("Error creating admin sub-user:", error);
      res.status(500).json({ error: "Failed to create sub-user" });
    }
  });

  app.put("/api/admin/sub-users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, isActive, permissions, password } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (isActive !== undefined) updates.isActive = isActive;
      if (permissions !== undefined) updates.permissions = permissions;
      if (password) updates.passwordHash = password;
      
      const subUser = await storage.updateSubUser(id, updates);
      if (!subUser) {
        return res.status(404).json({ error: "Sub-user not found" });
      }
      const { passwordHash, ...sanitized } = subUser;
      res.json(sanitized);
    } catch (error) {
      console.error("Error updating admin sub-user:", error);
      res.status(500).json({ error: "Failed to update sub-user" });
    }
  });

  app.delete("/api/admin/sub-users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSubUser(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sub-user not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting admin sub-user:", error);
      res.status(500).json({ error: "Failed to delete sub-user" });
    }
  });

  // Sub-User routes for Merchant
  app.get("/api/merchant/:merchantId/sub-users", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const subUsers = await storage.getSubUsers('merchant', merchantId);
      const sanitized = subUsers.map(({ passwordHash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching merchant sub-users:", error);
      res.status(500).json({ error: "Failed to fetch sub-users" });
    }
  });

  app.post("/api/merchant/:merchantId/sub-users", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { name, email, phone, username, password, permissions } = req.body;
      if (!name || !email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const existing = await storage.getSubUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const subUser = await storage.createSubUser({
        parentType: 'merchant',
        parentId: merchantId,
        name,
        email,
        phone,
        username,
        passwordHash: password,
        permissions: permissions || [],
      });
      const { passwordHash, ...sanitized } = subUser;
      res.status(201).json(sanitized);
    } catch (error) {
      console.error("Error creating merchant sub-user:", error);
      res.status(500).json({ error: "Failed to create sub-user" });
    }
  });

  app.put("/api/merchant/:merchantId/sub-users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, isActive, permissions, password } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (isActive !== undefined) updates.isActive = isActive;
      if (permissions !== undefined) updates.permissions = permissions;
      if (password) updates.passwordHash = password;
      
      const subUser = await storage.updateSubUser(id, updates);
      if (!subUser) {
        return res.status(404).json({ error: "Sub-user not found" });
      }
      const { passwordHash, ...sanitized } = subUser;
      res.json(sanitized);
    } catch (error) {
      console.error("Error updating merchant sub-user:", error);
      res.status(500).json({ error: "Failed to update sub-user" });
    }
  });

  app.delete("/api/merchant/:merchantId/sub-users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSubUser(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sub-user not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting merchant sub-user:", error);
      res.status(500).json({ error: "Failed to delete sub-user" });
    }
  });

  // Get mapped users (agents, dealers, retailers) for a merchant/union
  app.get("/api/merchant/:merchantId/mapped-users", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const users = await storage.listUsers();
      const mappedUsers = users.filter((u: User) => u.unionId === merchantId);
      const sanitized = mappedUsers.map(({ passwordHash, ...rest }: User) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching mapped users:", error);
      res.status(500).json({ error: "Failed to fetch mapped users" });
    }
  });

  // Reset password for a mapped user
  app.post("/api/merchant/:merchantId/reset-user-password", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ error: "User ID and password are required" });
      }
      
      // Get the user and verify they belong to this merchant
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.unionId !== merchantId) {
        return res.status(403).json({ error: "You can only reset passwords for users in your Union" });
      }
      
      // Update the password (passwordHash field)
      const updated = await storage.updateUser(userId, { passwordHash: password });
      if (!updated) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ==================== MERCHANT AGENT ROUTES ====================
  // These routes allow District Unions to manage their own agents

  // Get agents for a specific merchant/District Union
  app.get("/api/merchant/:merchantId/agents", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const agentsList = await storage.getAgentsByUnion(merchantId);

      const merchant = await storage.getMerchant(merchantId);
      const districtName = merchant?.restaurantName?.replace(/\s*District Cooperative Milk Producers Union Ltd\.?/i, '').trim() || '';

      let wsdAsAgents: any[] = [];
      if (districtName) {
        const unionWsds = await storage.getWholesaleDealersByDistrictUnion(districtName);
        const existingWsdCodes = new Set(
          agentsList.filter((a: any) => a.agentType === 'WSD').map((a: any) => a.agentCode?.toUpperCase().trim())
        );

        wsdAsAgents = unionWsds
          .filter((w: any) => !existingWsdCodes.has(w.wsdCode?.toUpperCase().trim()))
          .map((w: any) => ({
            id: `wsd-${w.id}`,
            agentCode: w.wsdCode,
            agentType: 'WSD',
            name: w.name,
            phone: w.mobileNumber || '',
            alternatePhone: null,
            email: w.email || null,
            address: w.address || '',
            city: w.location || '',
            district: w.districtUnion || districtName,
            pincode: null,
            pricingRole: 'DEALER',
            assignedUnionId: merchantId,
            officeId: null,
            routeNumber: null,
            routeName: w.team ? `${w.team} Team` : null,
            agentPoint: null,
            freshMilkTier: w.hasFreshMilkAccess ? 'WSD' : '',
            productTier: 'WSD',
            iceCreamTier: 'WSD',
            status: w.isActive ? 'active' : 'inactive',
            isActive: w.isActive,
            canDeliver: false,
            gstNumber: w.gstin || null,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            bankAccountName: null,
            bankAccountNumber: null,
            bankIfscCode: null,
            bankName: null,
            freshMilkCreditLimit: 0,
            freshMilkCreditUsed: 0,
            productsCreditLimit: 0,
            productsCreditUsed: 0,
            iceCreamCreditLimit: 0,
            iceCreamCreditUsed: 0,
            assignedSegment: null,
          }));
      }

      res.json([...agentsList, ...wsdAsAgents]);
    } catch (error) {
      console.error("Error fetching merchant agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get agent stats for merchant (must be before /:agentId to avoid route collision)
  app.get("/api/merchant/:merchantId/agents/stats", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const agents = await storage.getAgentsByUnion(merchantId);
      
      const stats = {
        total: agents.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        byTier: {} as Record<string, number>,
      };
      
      for (const agent of agents) {
        stats.byType[agent.agentType] = (stats.byType[agent.agentType] || 0) + 1;
        stats.byStatus[agent.status] = (stats.byStatus[agent.status] || 0) + 1;
        stats.byTier[agent.freshMilkTier] = (stats.byTier[agent.freshMilkTier] || 0) + 1;
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching merchant agent stats:", error);
      res.status(500).json({ error: "Failed to fetch agent stats" });
    }
  });

  // Get single agent for merchant (with union validation)
  app.get("/api/merchant/:merchantId/agents/:agentId", async (req, res) => {
    try {
      const { merchantId, agentId } = req.params;
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      // Validate agent belongs to this merchant
      if (agent.assignedUnionId !== merchantId) {
        return res.status(403).json({ error: "Agent does not belong to this District Union" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error fetching merchant agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Create agent for merchant
  app.post("/api/merchant/:merchantId/agents", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const parsed = insertAgentSchema.safeParse({
        ...req.body,
        assignedUnionId: merchantId // Force assign to this merchant
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid agent data", details: parsed.error.errors });
      }
      const agent = await storage.createAgent(parsed.data);
      res.status(201).json(agent);
    } catch (error: any) {
      console.error("Error creating merchant agent:", error);
      if (error.message?.includes("duplicate")) {
        return res.status(400).json({ error: "Agent code already exists" });
      }
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  // Update agent for merchant (with union validation)
  app.put("/api/merchant/:merchantId/agents/:agentId", async (req, res) => {
    try {
      const { merchantId, agentId } = req.params;
      const existingAgent = await storage.getAgent(agentId);
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      // Validate agent belongs to this merchant
      if (existingAgent.assignedUnionId !== merchantId) {
        return res.status(403).json({ error: "Agent does not belong to this District Union" });
      }
      // Don't allow changing union assignment
      const updateData = { ...req.body, assignedUnionId: merchantId };
      const agent = await storage.updateAgent(agentId, updateData);
      res.json(agent);
    } catch (error) {
      console.error("Error updating merchant agent:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Bulk import agents for merchant (CSV import)
  app.post("/api/merchant/:merchantId/agents/import", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { agents } = req.body;
      if (!Array.isArray(agents) || agents.length === 0) {
        return res.status(400).json({ error: 'No agents data provided' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; error: string; name?: string }[]
      };

      for (let i = 0; i < agents.length; i++) {
        try {
          const agentData = {
            ...agents[i],
            assignedUnionId: merchantId,
          };
          if (!agentData.pricingRole && agentData.agentType) {
            agentData.pricingRole = AGENT_PRICING_ROLES[agentData.agentType as keyof typeof AGENT_PRICING_ROLES] || 'DEALER';
          }
          
          const parsed = insertAgentSchema.safeParse(agentData);
          if (!parsed.success) {
            results.failed++;
            results.errors.push({ 
              row: i + 1, 
              name: agentData.name || `Row ${i + 1}`,
              error: parsed.error.errors.map(e => `${e.path}: ${e.message}`).join(', ')
            });
            continue;
          }
          
          await storage.createAgent(parsed.data);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({ 
            row: i + 1, 
            name: agents[i]?.name || `Row ${i + 1}`,
            error: error.message?.includes('duplicate') ? 'Agent code already exists' : (error.message || 'Unknown error')
          });
        }
      }

      res.json({
        message: `Imported ${results.success} agents, ${results.failed} failed`,
        ...results
      });
    } catch (error) {
      console.error('Error importing merchant agents:', error);
      res.status(500).json({ error: 'Failed to import agents' });
    }
  });

  // Delete agent for merchant (with union validation)
  app.delete("/api/merchant/:merchantId/agents/:agentId", async (req, res) => {
    try {
      const { merchantId, agentId } = req.params;
      const existingAgent = await storage.getAgent(agentId);
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      // Validate agent belongs to this merchant
      if (existingAgent.assignedUnionId !== merchantId) {
        return res.status(403).json({ error: "Agent does not belong to this District Union" });
      }
      await storage.deleteAgent(agentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting merchant agent:", error);
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const validatedOrder = insertOrderSchema.parse(req.body);

      // Session proxy guard: if a customer token is present, the order's email must match
      // the authenticated user so no one can place orders on behalf of another person.
      const authToken = req.cookies?.auth_token;
      if (authToken) {
        const sessionPayload = verifyToken(authToken);
        if (sessionPayload?.userId) {
          const sessionUser = await storage.getUser(sessionPayload.userId);
          if (sessionUser && validatedOrder.customerEmail &&
              sessionUser.email.toLowerCase() !== validatedOrder.customerEmail.toLowerCase()) {
            return res.status(403).json({
              error: "You can only place orders for yourself. Proxy ordering is not allowed."
            });
          }
        }
      }

      if (validatedOrder.paymentMethod === 'cod' || validatedOrder.paymentMethod === 'cash') {
        try {
          const { merchants: merchantsTable } = await import('../shared/schema');
          const { db } = await import('../db');
          const { ilike } = await import('drizzle-orm');

          let merchant = await storage.getMerchant(validatedOrder.restaurantId);

          if (!merchant) {
            const allMerchants = await db.select().from(merchantsTable);
            const ridNorm = (validatedOrder.restaurantId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            merchant = allMerchants.find(m => {
              const slugNorm = (m.restaurantSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const idNorm = (m.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return slugNorm === ridNorm || idNorm === ridNorm ||
                ridNorm.includes(slugNorm) || slugNorm.includes(ridNorm);
            }) || null;
          }

          if (merchant) {
            const ps = (merchant as any).paymentSettings as Record<string, boolean> | null;
            const codAllowed = ps && (ps.cod === true || ps.cash_on_delivery === true || ps.pay_on_delivery === true);
            if (!codAllowed) {
              return res.status(403).json({ error: "COD is not available for this merchant. Please choose a different payment method." });
            }
          } else {
            return res.status(403).json({ error: "COD is not available. Please choose a different payment method." });
          }
        } catch (e) {
          console.error("Error checking COD payment settings:", e);
          return res.status(403).json({ error: "Unable to verify payment method availability. Please choose a different payment method." });
        }
      }

      const pricingRole = validatedOrder.pricingRole || 'MRP';
      
      // Check if B2B order (not MRP/consumer) - these need segment-based splitting
      const isB2B = pricingRole !== 'MRP' && pricingRole !== 'RETAILER';

      // Restrict B2B users to their registered union only (fatal — order is rejected on mismatch)
      if (isB2B) {
        try {
          const { db: dbInst } = await import('../db');
          const { users: usersTable, merchants: merchantsTable } = await import('../shared/schema');
          const { eq } = await import('drizzle-orm');

          const lookupEmail = validatedOrder.customerEmail;
          const customerUser = lookupEmail
            ? await dbInst.query.users.findFirst({ where: eq(usersTable.email, lookupEmail) })
            : null;

          const registeredRestaurantId = customerUser?.restaurantId || (customerUser as any)?.unionId || null;

          if (registeredRestaurantId) {
            const orderedRestaurantId = validatedOrder.restaurantId;

            // Helper: resolve any restaurant/union ID to a canonical merchant record
            const allMerchants = await dbInst.select().from(merchantsTable);
            const resolveMerchant = (rid: string) => {
              const direct = allMerchants.find(m => m.id === rid);
              if (direct) return direct;
              const uniMatch = rid.match(/UNI-([A-Z]+)-/i);
              if (uniMatch) {
                const code = uniMatch[1].toLowerCase();
                const byCode = allMerchants.find(m =>
                  (m.restaurantSlug || '').toLowerCase().includes(code) ||
                  (m.id || '').toLowerCase().includes(code)
                );
                if (byCode) return byCode;
              }
              const ridNorm = rid.toLowerCase().replace(/[^a-z0-9]/g, '');
              return allMerchants.find(m => {
                const slugNorm = (m.restaurantSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const idNorm = (m.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return slugNorm === ridNorm || idNorm === ridNorm ||
                  ridNorm.includes(slugNorm) || slugNorm.includes(ridNorm);
              }) || null;
            };

            const registeredMerchant = resolveMerchant(registeredRestaurantId);
            const orderedMerchant = resolveMerchant(orderedRestaurantId);

            if (registeredMerchant && orderedMerchant && registeredMerchant.id !== orderedMerchant.id) {
              return res.status(403).json({
                error: `You are registered with ${registeredMerchant.restaurantName}. Orders can only be placed with your registered union.`
              });
            }
          }
        } catch (e) {
          console.error("Error checking B2B union restriction:", e);
          // If lookup itself throws (DB error), reject to be safe
          return res.status(403).json({ error: "Unable to verify union registration. Please try again." });
        }
      }

      if (isB2B && validatedOrder.items && Array.isArray(validatedOrder.items)) {
        const items = validatedOrder.items as { itemId: string; name: string; price: string; quantity: number; productSegment?: string; category?: string }[];
        
        // Look up customer's office for order routing
        let customerOffice: string | null = null;
        try {
          if (validatedOrder.customerEmail) {
            const customerUser = await db.query.users.findFirst({
              where: eq(usersTable.email, validatedOrder.customerEmail),
            });
            if (customerUser?.office) {
              customerOffice = customerUser.office;
            }
            // Prefix businessCode to customerName so route-matching (matchAgent) works
            if (customerUser && (customerUser as any).businessCode) {
              const code = ((customerUser as any).businessCode as string).toUpperCase().trim();
              const currentName = ((validatedOrder as any).customerName as string || '').trim();
              if (currentName && !currentName.toUpperCase().startsWith(code)) {
                (validatedOrder as any).customerName = `${code} ${currentName}`;
              }
            }
          }
          if (!customerOffice && validatedOrder.customerPhone) {
            const customerAgent = await db.query.agents.findFirst({
              where: eq(agentsTable.phone, validatedOrder.customerPhone),
            });
            if (customerAgent?.officeId) {
              customerOffice = customerAgent.officeId;
            }
          }
        } catch (e) {
        }
        
        // Separate items by 3 segments: Fresh Milk, Products, Ice Cream
        const segmentBuckets: Record<string, typeof items> = {
          'Fresh Milk': [],
          'Products': [],
          'Ice Cream': [],
        };
        
        const iceCreamCategories = ['Ice Cream', 'ice_cream', 'Frozen Desserts', 'Kulfi'];
        
        const freshMilkNameKeywords = ['milk', 'buttermilk', 'butter milk', 'lassi', 'chaas', 'toned', 'standardised', 'standardized', 'full cream', 'double toned', 'skimmed'];
        const iceCreamNameKeywords = ['ice cream', 'kulfi', 'frozen dessert', 'popsicle', 'sundae'];

        const classifyByName = (name: string): string | null => {
          const lower = (name || '').toLowerCase();
          if (iceCreamNameKeywords.some(k => lower.includes(k))) return 'Ice Cream';
          if (freshMilkNameKeywords.some(k => lower.includes(k))) return 'Fresh Milk';
          return null;
        };

        for (const item of items) {
          let segment = item.productSegment;

          // When segment is missing or the generic "Products" fallback, verify using:
          // 1. The item's category field (if it's explicitly not "Products")
          // 2. Name-based classification (most reliable since all milk items contain "Milk")
          // 3. DB/storage lookup as last resort
          // This prevents misclassification from old reorder items with wrong productSegment
          if (!segment || segment === 'Products') {
            // Check category field first (if explicitly set to something real)
            if (item.category && item.category !== 'Products') {
              if (item.category === 'Fresh Milk' || item.category === 'fresh_milk') {
                segment = 'Fresh Milk';
              } else if (iceCreamCategories.some(c => c.toLowerCase() === item.category!.toLowerCase())) {
                segment = 'Ice Cream';
              } else {
                segment = item.category;
              }
            } else {
              // Name-based classification — highly reliable for dairy products
              const nameSegment = classifyByName(item.name || '');
              if (nameSegment) {
                segment = nameSegment;
              } else {
                // Final fallback: storage lookup
                const lookupId = item.itemId || (item as any).id;
                const menuItem = lookupId ? await storage.getMenuItem(lookupId) : null;
                const storageSegment = menuItem?.productSegment && menuItem.productSegment !== 'Products'
                  ? menuItem.productSegment
                  : classifyByName(menuItem?.name || '');
                segment = storageSegment || 'Products';
              }
            }
          }

          if (segment === 'Fresh Milk') {
            segmentBuckets['Fresh Milk'].push({ ...item, productSegment: 'Fresh Milk' });
          } else if (segment === 'Ice Cream' || (item.category && iceCreamCategories.some(c => c.toLowerCase() === item.category!.toLowerCase()))) {
            segmentBuckets['Ice Cream'].push({ ...item, productSegment: 'Ice Cream' });
          } else {
            segmentBuckets['Products'].push({ ...item, productSegment: 'Products' });
          }
        }
        
        // Get segments that have items
        const activeSegments = Object.entries(segmentBuckets).filter(([, items]) => items.length > 0);
        
        const segmentSuffixMap: Record<string, string> = {
          'Fresh Milk': 'FM',
          'Products': 'DP',
          'Ice Cream': 'IC',
        };

        const calculateTotal = (segmentItems: typeof items) => {
          let subtotal = 0;
          let tax = 0;
          for (const item of segmentItems) {
            const itemTotal = parseFloat(item.price) * item.quantity;
            const gstPct = parseFloat((item as any).gstPercent || (item as any).gstRate || '0');
            subtotal += itemTotal;
            if (gstPct > 0) {
              const taxableValue = itemTotal / (1 + gstPct / 100);
              tax += itemTotal - taxableValue;
            }
          }
          return { subtotal, tax, total: subtotal };
        };

        const grandTotal = activeSegments.reduce((sum, [, segItems]) => {
          const t = calculateTotal(segItems);
          return sum + t.total;
        }, 0) + parseFloat(validatedOrder.deliveryFee || '0');

        const masterOrder = await storage.createMasterOrder({
          customerName: validatedOrder.customerName,
          customerEmail: validatedOrder.customerEmail,
          customerPhone: validatedOrder.customerPhone,
          restaurantId: validatedOrder.restaurantId,
          pricingRole: pricingRole,
          totalAmount: grandTotal.toFixed(2),
          segmentCount: activeSegments.length,
          deliveredCount: 0,
          status: 'open',
          customerOffice: customerOffice,
        } as any);

        const createdOrders: any[] = [];

        for (let i = 0; i < activeSegments.length; i++) {
          const [segmentName, segmentItems] = activeSegments[i];
          const totals = calculateTotal(segmentItems);
          const suffix = segmentSuffixMap[segmentName] || 'OT';
          const segDisplayId = `${masterOrder.displayId}-${suffix}`;

          const segInvoiceNo = await generateInvoiceNumber(validatedOrder.restaurantId);
          const segmentOrder = await storage.createOrder({
            ...validatedOrder,
            items: segmentItems,
            subtotal: totals.subtotal.toFixed(2),
            tax: totals.tax.toFixed(2),
            total: (i === 0 ? totals.total + parseFloat(validatedOrder.deliveryFee || '0') : totals.total).toFixed(2),
            deliveryFee: i === 0 ? validatedOrder.deliveryFee : '0.00',
            productSegment: segmentName,
            masterOrderId: masterOrder.id,
            segmentSuffix: suffix,
            displayId: segDisplayId,
            workflowStatus: 'pending',
            parentOrderId: null,
            customerOffice: customerOffice,
            invoiceNumber: segInvoiceNo,
          } as any);

          // Auto-assign segment order to the marketing manager for this segment
          const segCodeMap: Record<string, string> = { 'Fresh Milk': 'fm', 'Products': 'dp', 'Ice Cream': 'ic' };
          const segCode = segCodeMap[segmentName];
          if (segCode) {
            try {
              const marketingDesignationId = `segment_mgr_marketing_${segCode}`;
              const restId = validatedOrder.restaurantId;
              // Look up the merchant to find all possible union IDs
              const merchantRecord = await storage.getMerchant(restId);
              const possibleUnionIds = [restId];
              if (merchantRecord?.id && merchantRecord.id !== restId) possibleUnionIds.push(merchantRecord.id);
              // First try real staff (non-seeded) from the same union
              const realStaff = await db.query.unionStaff.findFirst({
                where: and(
                  eq(unionStaff.designationId, marketingDesignationId),
                  inArray(unionStaff.unionId, possibleUnionIds),
                  eq(unionStaff.approvalStatus, 'approved'),
                  eq(unionStaff.isActive, true),
                  sql`${unionStaff.department} != 'segment_workflow'`
                ),
                orderBy: [desc(unionStaff.lastLogin)],
              });
              // Fallback: try segment_workflow seeded staff from same union
              const assignStaff = realStaff || await db.query.unionStaff.findFirst({
                where: and(
                  eq(unionStaff.designationId, marketingDesignationId),
                  eq(unionStaff.department, 'segment_workflow'),
                  inArray(unionStaff.unionId, possibleUnionIds),
                  eq(unionStaff.approvalStatus, 'approved'),
                  eq(unionStaff.isActive, true),
                ),
              });
              if (assignStaff) {
                await db.update(orders)
                  .set({
                    agentId: assignStaff.id,
                    agentName: assignStaff.name,
                    workflowStatus: 'manager_review',
                    managerAssignedAt: new Date(),
                  })
                  .where(eq(orders.id, segmentOrder.id));
                (segmentOrder as any).agentId = assignStaff.id;
                (segmentOrder as any).agentName = assignStaff.name;
                (segmentOrder as any).workflowStatus = 'manager_review';
              } else {
              }
            } catch (assignErr) {
              console.error(`Failed to auto-assign ${segmentName} order:`, assignErr);
            }
          }

          createdOrders.push({ ...segmentOrder, productSegment: segmentName });
        }

        const segmentNames = activeSegments.map(([name]) => name).join(', ');
        logActivity('order_placed', { userId: validatedOrder.customerEmail || '', userName: validatedOrder.customerName, userRole: pricingRole, metadata: { masterOrderId: masterOrder.id, segments: segmentNames, total: grandTotal.toFixed(2), orderCount: createdOrders.length }, ipAddress: req.ip });
        return res.status(201).json({
          split: true,
          message: `B2B order split into ${segmentNames} segments`,
          masterOrder,
          orders: createdOrders
        });
      }
      
      // Consumer order (MRP) - single order, not split by segment
      const consumerInvoiceNo = await generateInvoiceNumber(validatedOrder.restaurantId);
      const order = await storage.createOrder({
        ...validatedOrder,
        productSegment: validatedOrder.productSegment || 'Products',
        invoiceNumber: consumerInvoiceNo,
      } as any);

      logActivity('order_placed', { userId: validatedOrder.customerEmail || '', userName: validatedOrder.customerName, userRole: 'MRP', metadata: { orderId: order.id, total: order.total }, ipAddress: req.ip });
      
      // Auto-generate E-way Bill for orders above ₹50,000
      const EWAY_BILL_THRESHOLD = 50000;
      const orderTotal = parseFloat(order.total);
      
      if (orderTotal >= EWAY_BILL_THRESHOLD) {
        try {
          // Get union details for supplier info
          const restaurant = await storage.getRestaurant(order.restaurantId);
          
          if (restaurant) {
            // Create E-way Bill automatically
            const ewayBillData = {
              orderId: order.id,
              ewayBillNumber: null, // Will be generated when API is called
              generatedDate: new Date().toISOString(),
              validUpto: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day validity
              status: 'pending' as const,
              supplyType: 'O' as const, // Outward
              subSupplyType: '1', // Supply
              docType: 'INV' as const,
              docNo: order.id,
              docDate: new Date().toISOString().split('T')[0],
              fromGstin: restaurant.gstin || '33AABCT1332L1ZK', // Default Tamil Nadu GSTN
              fromTradeName: restaurant.name,
              fromAddress: restaurant.address || '',
              fromPlace: restaurant.city || 'Chennai',
              fromPincode: restaurant.pincode || '600001',
              fromStateCode: '33', // Tamil Nadu
              toGstin: 'URP', // Unregistered person for B2C
              toTradeName: order.customerName,
              toAddress: order.deliveryAddress,
              toPlace: 'Delivery Location',
              toPincode: '600001', // Extract from address if available
              toStateCode: '33', // Tamil Nadu
              totalValue: order.subtotal,
              cgstValue: (parseFloat(order.tax) / 2).toFixed(2),
              sgstValue: (parseFloat(order.tax) / 2).toFixed(2),
              igstValue: '0.00',
              cessValue: '0.00',
              totInvValue: order.total,
              transporterId: null,
              transporterName: null,
              transMode: '1', // Road
              vehicleNo: null,
              vehicleType: 'R' as const, // Regular
              distance: 10, // Default distance in KM
              transDocNo: null,
              transDocDate: null,
            };
            
            const ewayBill = await storage.createEwayBill(ewayBillData);
            
            // Link E-way Bill to order
            await storage.updateOrder(order.id, { ewayBillId: ewayBill.id });
            
            // Return order with E-way Bill info
            return res.status(201).json({
              ...order,
              ewayBillId: ewayBill.id,
              ewayBillRequired: true,
              ewayBillStatus: 'pending'
            });
          }
        } catch (ewayError) {
          console.error("Error auto-generating E-way Bill:", ewayError);
          // Don't fail the order, just log the error
        }
      }
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid order data", 
          details: error.errors 
        });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Master Order APIs
  app.get("/api/master-orders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { restaurantId, staffOffice, staffSegments } = req.query;
      const masters = await storage.getMasterOrders(restaurantId as string | undefined);
      let result = await Promise.all(masters.map(async (m) => {
        const segmentOrders = await storage.getSegmentOrders(m.id);
        return { ...m, segmentOrders };
      }));

      if (staffOffice && staffOffice !== 'head_office') {
        const officeList = (staffOffice as string).split(',').map(s => s.trim()).filter(Boolean);
        result = result.filter((m: any) => officeList.includes(m.customerOffice));
      }

      if (staffSegments) {
        const segments = (staffSegments as string).split(',');
        const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
        const allowedSegments = segments.map(s => segmentSuffixMap[s] || s);
        result = result.map((m: any) => ({
          ...m,
          segmentOrders: (m.segmentOrders || []).filter((so: any) =>
            allowedSegments.includes(so.productSegment)
          ),
        })).filter((m: any) => m.segmentOrders.length > 0);
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching master orders:", error);
      res.status(500).json({ error: "Failed to fetch master orders" });
    }
  });

  app.get("/api/master-orders/:id", async (req, res) => {
    try {
      const master = await storage.getMasterOrder(req.params.id);
      if (!master) return res.status(404).json({ error: "Master order not found" });
      const segmentOrders = await storage.getSegmentOrders(master.id);
      res.json({ ...master, segmentOrders });
    } catch (error) {
      console.error("Error fetching master order:", error);
      res.status(500).json({ error: "Failed to fetch master order" });
    }
  });

  app.patch("/api/orders/:id/workflow", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { workflowStatus } = req.body;
      const validStatuses = ['pending', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered', 'customer_acknowledged', 'cancelled'];
      if (!validStatuses.includes(workflowStatus)) {
        return res.status(400).json({ error: `Invalid workflow status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const user = req.user as any;
      if (user.role === 'union_staff' && workflowStatus !== 'cancelled') {
        const existingOrder = await storage.getOrder(req.params.id);
        if (!existingOrder) return res.status(404).json({ error: "Order not found" });

        const suffix = (existingOrder as any).segmentSuffix as string | null;
        if (suffix) {
          const { SEGMENT_WORKFLOW_PERMISSIONS } = await import("@shared/schema");
          const segPerms = (SEGMENT_WORKFLOW_PERMISSIONS as any)[suffix];
          if (segPerms) {
            const requiredPerm = segPerms[workflowStatus];
            const staffPerms: string[] = user.permissions || [];
            const staffSegments: string[] = user.assignedSegments || [];
            const hasSegmentAccess = staffSegments.includes(suffix);
            const hasPermission = staffPerms.includes('*') ||
              (staffPerms.includes('workflow_manage') && user.accessTier === 'manager' && hasSegmentAccess) ||
              staffPerms.includes(requiredPerm);
            if (!hasPermission) {
              return res.status(403).json({ error: `You don't have permission to update ${suffix} orders to ${workflowStatus}` });
            }
          }
        }
      }

      const order = await storage.updateOrderWorkflowStatus(req.params.id, workflowStatus);
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (['marketing_approved', 'assigned_to_delivery'].includes(workflowStatus)) {
        autoCreateDeliveryJob(req.params.id);
      }

      if (order.masterOrderId) {
        const master = await storage.getMasterOrder(order.masterOrderId);
        return res.json({ order, masterOrder: master });
      }
      res.json({ order });
    } catch (error) {
      console.error("Error updating workflow status:", error);
      res.status(500).json({ error: "Failed to update workflow status" });
    }
  });

  app.get("/api/admin/master-orders", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status } = req.query;
      let masters = await storage.getMasterOrders();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        masters = masters.filter(m => validIds.includes(m.restaurantId));
      }
      if (status && status !== 'all') {
        masters = masters.filter(m => m.status === status);
      }
      const result = await Promise.all(masters.map(async (m) => {
        const segmentOrders = await storage.getSegmentOrders(m.id);
        return { ...m, segmentOrders };
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin master orders:", error);
      res.status(500).json({ error: "Failed to fetch master orders" });
    }
  });

  app.get("/api/union/:merchantId/master-orders", async (req, res) => {
    try {
      const { staffSegments } = req.query;
      const masters = await storage.getMasterOrders(req.params.merchantId);
      const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
      const allowedSegments = staffSegments 
        ? (staffSegments as string).split(',').map(s => segmentSuffixMap[s] || s)
        : null;
      const result = await Promise.all(masters.map(async (m) => {
        let segmentOrders = await storage.getSegmentOrders(m.id);
        if (allowedSegments) {
          segmentOrders = segmentOrders.filter((so: any) => 
            so.productSegment && allowedSegments.includes(so.productSegment)
          );
        }
        return { ...m, segmentOrders };
      }));
      const filtered = allowedSegments 
        ? result.filter(r => r.segmentOrders.length > 0)
        : result;
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching union master orders:", error);
      res.status(500).json({ error: "Failed to fetch master orders" });
    }
  });

  app.get("/api/orders/user/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const requestingUser = req.user!;

      if (requestingUser.id !== userId && requestingUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.json([]);
      }

      const phone = (targetUser as any).phone || (targetUser as any).mobile;
      if (!phone) {
        return res.json([]);
      }

      const orders = await storage.getOrdersByPhone(phone);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders for user:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/customer/orders", async (req, res) => {
    try {
      const { phone, email } = req.query;
      if ((!phone || typeof phone !== 'string') && (!email || typeof email !== 'string')) {
        return res.status(400).json({ error: "Phone or email is required" });
      }

      let safeEmail: string | undefined;
      if (email && typeof email === 'string') {
        const token = req.cookies?.auth_token;
        if (!token) {
          return res.status(401).json({ error: "Authentication required for email-based lookup" });
        }
        const decoded = verifyToken(token);
        if (!decoded) {
          return res.status(401).json({ error: "Invalid token" });
        }
        safeEmail = email;
      }
      
      const orders = await storage.getOrdersByPhone(
        (phone as string) || '',
        safeEmail
      );

      // Enrich orders with bank reference numbers (RRN) from payment_transactions
      // Note: payment_transactions.order_id stores Razorpay order IDs, not internal UUIDs,
      // so this lookup currently returns 0 rows. The try-catch ensures orders always return.
      let enriched = orders.map((o: any) => ({ ...o, bankRef: null }));
      try {
        if (orders.length > 0) {
          const orderIds = orders.map((o: any) => o.id);
          const idList = sql.join(orderIds.map((id: string) => sql`${id}`), sql`, `);
          const rrnRows = await db.execute(
            sql`SELECT DISTINCT ON (order_id) order_id,
                  COALESCE(rrn, raw_response->'acquirer_data'->>'rrn', raw_response->'acquirer_data'->>'bank_transaction_id') AS bank_ref
                FROM payment_transactions
                WHERE order_id = ANY(ARRAY[${idList}])
                  AND status = 'captured'
                ORDER BY order_id, created_at DESC`
          );
          const rrnMap: Record<string, string> = {};
          for (const row of rrnRows.rows as any[]) {
            if (row.bank_ref) rrnMap[row.order_id] = row.bank_ref;
          }
          enriched = orders.map((o: any) => ({ ...o, bankRef: rrnMap[o.id] || null }));
        }
      } catch (rrnErr) {
        console.error("RRN enrichment failed (non-fatal):", rrnErr);
      }
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { restaurantId, merchantId: qMerchantId, isCredit, pricingTier, pricingRole: queryPricingRole } = req.query;
      const user = req.user!;
      
      let effectiveMerchantId = (qMerchantId || restaurantId) as string;
      if (user.role === 'restaurant' && user.restaurantId) {
        effectiveMerchantId = user.restaurantId;
      } else if (user.role === 'viewer') {
        const userUnionId = (user as any).unionId;
        effectiveMerchantId = userUnionId || restaurantId as string;
      } else if (user.role === 'agent') {
        const userUnionId = (user as any).unionId;
        effectiveMerchantId = userUnionId || restaurantId as string;
      } else if (user.role === 'customer') {
        return res.status(403).json({ error: 'Customers cannot access order management' });
      }
      
      if (!effectiveMerchantId) {
        return res.json([]);
      }
      
      const validIds = getAllIdsForMerchant(effectiveMerchantId);
      let orders = await storage.getOrders();
      orders = orders.filter((o: any) => validIds.includes(o.restaurantId));
      
      // Filter by isCredit if specified
      if (isCredit === 'true') {
        orders = orders.filter((o: any) => o.isCredit === true);
      }
      
      // Filter by pricingRole (or legacy pricingTier) if specified
      const filterPricingRole = queryPricingRole || pricingTier;
      if (filterPricingRole && typeof filterPricingRole === 'string') {
        orders = orders.filter((o: any) => o.pricingRole === filterPricingRole);
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const user = req.user!;
      // Only allow union users to see their own orders, admins can see all
      if (user.role === 'restaurant' && user.restaurantId && order.restaurantId !== user.restaurantId) {
        return res.status(403).json({ error: 'Access denied' });
      } else if (user.role === 'customer') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Include E-way Bill info if available
      let ewayBill = null;
      if ((order as any).ewayBillId) {
        ewayBill = await storage.getEwayBill((order as any).ewayBillId);
      }

      // Include bank reference number (RRN) from payment transaction
      let bankRef: string | null = null;
      const txnResult = await db.execute(
        sql`SELECT rrn, raw_response->'acquirer_data'->>'rrn' AS raw_rrn,
                   raw_response->'acquirer_data'->>'bank_transaction_id' AS bank_txn_id,
                   gateway_payment_id, payment_method, vpa, bank
            FROM payment_transactions
            WHERE order_id = ${order.id} AND status = 'captured'
            ORDER BY created_at DESC LIMIT 1`
      );
      if (txnResult.rows.length > 0) {
        const txn = txnResult.rows[0] as any;
        bankRef = txn.rrn || txn.raw_rrn || txn.bank_txn_id || null;
      }

      res.json({
        ...order,
        ewayBill,
        ewayBillRequired: parseFloat(order.total) >= 50000,
        bankRef,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Generate Tax Invoice data for an order
  app.get("/api/orders/:id/invoice", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = req.user!;
      if (user.role === 'restaurant' && user.restaurantId && order.restaurantId !== user.restaurantId) {
        return res.status(403).json({ error: 'Access denied' });
      } else if (user.role === 'customer' && order.customerEmail !== user.email) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const merchant = await storage.getMerchant(order.restaurantId);

      let items: any[] = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch {
        items = [];
      }

      const { masterProducts } = await import("@shared/schema");
      const itemNames = items.map((item: any) => (item.name || '').toLowerCase().trim()).filter(Boolean);
      const allMasterProducts = itemNames.length > 0
        ? await db.select().from(masterProducts).where(sql`LOWER(TRIM(${masterProducts.name})) IN (${sql.join(itemNames.map(n => sql`${n}`), sql`, `)})`)
        : [];
      const mpByName = new Map<string, any>();
      for (const mp of allMasterProducts) {
        mpByName.set(mp.name.toLowerCase().trim(), mp);
      }

      let buyerName = order.customerName || 'Customer';
      let buyerAddress = order.deliveryAddress || '';
      let buyerGstin: string | null = null;

      const customerUser = await db.select().from(usersTable).where(eq(usersTable.email, order.customerEmail)).limit(1);
      if (customerUser.length > 0) {
        const cu = customerUser[0];
        buyerName = (cu as any).businessName || cu.name || order.customerName || 'Customer';
        buyerAddress = (cu as any).businessAddress || order.deliveryAddress || '';
        buyerGstin = (cu as any).gstNumber || null;
        if (buyerName === order.customerName && (cu as any).businessName) {
          buyerName = (cu as any).businessName;
        }
      }
      if (buyerName === order.customerName && /^[A-Z]{2,5}\d{2,5}$/i.test(buyerName)) {
        buyerName = buyerAddress || order.customerName;
      }

      let invoiceNo = (order as any).invoiceNumber;
      if (!invoiceNo) {
        invoiceNo = await generateInvoiceNumber(order.restaurantId);
        try {
          await db.update(ordersTable).set({ invoiceNumber: invoiceNo }).where(eq(ordersTable.id, order.id));
        } catch {}
      }

      const taxBreakdownMap = new Map<string, { taxableValue: number; gstRate: number; hsnCode: string }>();

      const invoiceItems = items.map((item: any, index: number) => {
        const quantity = item.quantity || 1;
        const rate = parseFloat(item.price || 0);

        let gstRate = parseFloat(item.gstRate || item.gstPercent || 0);
        let hsnCode = item.hsnCode || '';

        if ((!gstRate || gstRate === 0 || !hsnCode) && item.name) {
          const mp = mpByName.get(item.name.toLowerCase().trim());
          if (mp) {
            if (!gstRate || gstRate === 0) gstRate = parseFloat(mp.gstPercent || '0');
            if (!hsnCode) hsnCode = mp.hsnCode || '0401';
          }
        }
        if (!hsnCode) hsnCode = '0401';

        const totalWithTax = rate * quantity;
        const taxableValue = gstRate > 0 ? totalWithTax / (1 + gstRate / 100) : totalWithTax;

        const key = `${hsnCode}-${gstRate}`;
        const existing = taxBreakdownMap.get(key) || { taxableValue: 0, gstRate, hsnCode };
        taxBreakdownMap.set(key, {
          taxableValue: existing.taxableValue + taxableValue,
          gstRate,
          hsnCode,
        });

        return {
          slNo: index + 1,
          description: item.name || 'Product',
          hsnCode,
          gstRate,
          quantity,
          unit: item.unit || 'Nos',
          rate: taxableValue / quantity,
          amount: taxableValue
        };
      });

      const taxBreakdown = Array.from(taxBreakdownMap.values()).map(tax => {
        const cgstRate = tax.gstRate / 2;
        const sgstRate = tax.gstRate / 2;
        const cgstAmount = (tax.taxableValue * cgstRate) / 100;
        const sgstAmount = (tax.taxableValue * sgstRate) / 100;
        return {
          hsnCode: tax.hsnCode,
          taxableValue: tax.taxableValue,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          totalTax: cgstAmount + sgstAmount
        };
      });

      const subtotal = invoiceItems.reduce((sum: number, item: any) => sum + item.amount, 0);
      const totalCgst = taxBreakdown.reduce((sum, t) => sum + t.cgstAmount, 0);
      const totalSgst = taxBreakdown.reduce((sum, t) => sum + t.sgstAmount, 0);
      const grandTotalExact = subtotal + totalCgst + totalSgst;
      const grandTotal = Math.round(grandTotalExact);
      const roundingOff = grandTotal - grandTotalExact;

      let ewayBillNo = null;
      if ((order as any).ewayBillId) {
        const ewayBill = await storage.getEwayBill((order as any).ewayBillId);
        if (ewayBill) {
          ewayBillNo = ewayBill.ewayBillNumber;
        }
      }

      let buyerFssai: string | null = null;
      let buyerStateCode = '33';
      if (customerUser.length > 0) {
        const cu = customerUser[0];
        buyerFssai = (cu as any).fssaiLicense || null;
        const cuDistrict = (cu as any).district;
        if (cuDistrict) buyerStateCode = '33';
      }

      const invoiceData = {
        invoiceNo,
        invoiceDate: orderDate.toISOString(),
        ewayBillNo,
        deliveryNoteNo: (order as any).deliveryNoteNo || null,
        deliveryNoteDate: (order as any).deliveryNoteDate || null,
        dispatchDocNo: (order as any).dispatchDocNo || (order as any).displayId || invoiceNo,
        vehicleNo: (order as any).vehicleNo || null,
        placeOfSupply: order.deliveryAddress || 'Tamil Nadu',
        irnNo: (order as any).invoiceIrn || null,
        ackNo: (order as any).invoiceAckNo || null,
        ackDate: (order as any).invoiceAckDate || null,
        dispatchedThrough: (order as any).dispatchedThrough || null,
        billOfLading: (order as any).billOfLading || null,
        termsOfPayment: (order as any).termsOfPayment || order.paymentMethod || null,
        termsOfDelivery: (order as any).termsOfDelivery || null,
        buyerOrderNo: (order as any).buyerOrderNo || null,
        seller: {
          name: merchant?.businessName || 'The Salem Dt Co-Op Milk Producers Union Ltd',
          address: merchant?.address || 'Sithanur, Dhalavaipatty Post,\nSalem.',
          fssaiNo: (merchant as any)?.fssaiNo || '10012042000374',
          gstin: (merchant as any)?.gstin || '33AAAAT3146P1ZA',
          stateCode: '33',
          stateName: 'Tamil Nadu'
        },
        buyer: {
          name: buyerName,
          address: buyerAddress,
          gstin: buyerGstin,
          fssaiNo: buyerFssai,
          stateCode: buyerStateCode,
          stateName: 'Tamil Nadu'
        },
        consignee: {
          name: buyerName,
          address: order.deliveryAddress || buyerAddress,
          gstin: buyerGstin,
          fssaiNo: buyerFssai,
          stateCode: buyerStateCode,
          stateName: 'Tamil Nadu'
        },
        items: invoiceItems,
        taxBreakdown,
        subtotal,
        totalCgst,
        totalSgst,
        totalIgst: 0,
        roundingOff,
        grandTotal
      };

      res.json(invoiceData);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Generate E-way Bill for an order
  app.post("/api/orders/:orderId/generate-eway-bill", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = req.user!;
      // Access control - only admins and union owners can generate e-way bills
      if (user.role === 'customer') {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (user.role === 'restaurant' && user.restaurantId && order.restaurantId !== user.restaurantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const orderTotal = parseFloat(order.total);
      
      // E-way bill required only for amounts >= 50000
      if (orderTotal < 50000) {
        return res.json({
          success: false,
          message: 'E-way Bill not required for orders below ₹50,000'
        });
      }

      // Check if already has e-way bill
      if ((order as any).ewayBillId) {
        const existingBill = await storage.getEwayBill((order as any).ewayBillId);
        if (existingBill) {
          return res.json({
            success: true,
            ewayBillNo: existingBill.ewayBillNumber,
            message: 'E-way Bill already exists'
          });
        }
      }

      // Redirect to e-way bill generation page with pre-filled data
      res.json({
        success: false,
        redirect: `/admin/eway-bill/generate?orderId=${order.id}`,
        message: 'Redirecting to E-way Bill generation'
      });
    } catch (error) {
      console.error("Error generating e-way bill:", error);
      res.status(500).json({ error: "Failed to generate e-way bill" });
    }
  });

  async function autoCreateDeliveryJob(orderId: string) {
    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) return;
      const existing = await db.select().from(deliveryJobs)
        .where(and(eq(deliveryJobs.sourceType, "order"), eq(deliveryJobs.sourceId, orderId)));
      if (existing.length > 0) return;

      const totalAmount = Number(order.total || 0);
      const segment = (order as any).productSegment || "Products";
      const jobData: any = {
        jobId: generateDeliveryJobId(),
        sourceType: "order",
        sourceId: orderId,
        dispatchType: "REGULAR",
        deliveryType: "regular",
        merchantId: (order as any).merchantId || (order as any).restaurantId || "federation",
        segment,
        customerName: (order as any).customerName || "",
        customerPhone: (order as any).customerPhone || "",
        deliveryAddress: (order as any).deliveryAddress || "",
        deliveryLat: String((order as any).deliveryLat || "0"),
        deliveryLng: String((order as any).deliveryLng || "0"),
        totalAmount: String(totalAmount),
        totalBags: Math.ceil(totalAmount / 500),
        totalWeightKg: String(Math.ceil(totalAmount / 500) * 13),
        temperatureRequired: segment === "Ice Cream",
        ewayBillRequired: totalAmount >= 50000,
        gstInvoiceGenerated: !!(order as any).invoiceNumber,
        paymentConfirmed: !!(order as any).paymentMethod || (order as any).paymentStatus === "paid",
      };
      const validation = validateDeliveryJob(jobData);
      jobData.status = validation.valid ? "ready_for_trip" : "validation_failed";
      jobData.validationErrors = validation.errors.length > 0 ? validation.errors : null;
      await db.insert(deliveryJobs).values(jobData);
    } catch (e: any) {
      console.error(`Failed to auto-create delivery job for order ${orderId}:`, e.message);
    }
  }

  const DELIVERY_TRIGGER_STATUSES = ['marketing_approved', 'assigned_to_delivery', 'ready', 'confirmed', 'accepted'];

  app.patch("/api/orders/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const validStatuses = ['pending', 'confirmed', 'accepted', 'processing', 'preparing', 'ready', 'marketing_approved', 'production_approved', 'packing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const user = req.user!;
      const userUnionId = (user as any).unionId;
      
      // Viewer role is read-only - cannot update status
      if (user.role === 'viewer') {
        return res.status(403).json({ error: 'View-only access - cannot modify orders' });
      }
      
      if (user.role === 'admin') {
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        if (DELIVERY_TRIGGER_STATUSES.includes(status)) autoCreateDeliveryJob(req.params.id);
        return res.json(updatedOrder);
      }
      
      if (user.role === 'restaurant') {
        if (!user.restaurantId || order.restaurantId !== user.restaurantId) {
          return res.status(403).json({ error: 'Access denied - not your union\'s order' });
        }
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        if (DELIVERY_TRIGGER_STATUSES.includes(status)) autoCreateDeliveryJob(req.params.id);
        return res.json(updatedOrder);
      }
      
      // Driver can update orders assigned to their union + segment
      if (user.role === 'driver') {
        const driverUnionId = (user as any).unionId;
        const relevantIds = driverUnionId ? getAllIdsForMerchant(driverUnionId) : [];
        const driverStatuses = ['out_for_delivery', 'delivered'];
        if (!driverStatuses.includes(status)) {
          return res.status(403).json({ error: 'Drivers can only mark orders as out_for_delivery or delivered' });
        }
        if (relevantIds.length > 0 && !relevantIds.includes(order.restaurantId)) {
          return res.status(403).json({ error: 'Access denied - not your union\'s order' });
        }
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        return res.json(updatedOrder);
      }

      if (user.role === 'agent') {
        const agentUnionId = (user as any).unionId;
        const relevantIds = agentUnionId ? getAllIdsForMerchant(agentUnionId) : [];
        if (relevantIds.length > 0 && !relevantIds.includes(order.restaurantId)) {
          return res.status(403).json({ error: 'Access denied - not your union\'s order' });
        }
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        if (DELIVERY_TRIGGER_STATUSES.includes(status)) autoCreateDeliveryJob(req.params.id);
        return res.json(updatedOrder);
      }

      if (user.role === 'union_staff' || user.role === 'merchant') {
        const staffUnionId = (user as any).unionId || (user as any).merchantId;
        if (staffUnionId) {
          const relevantIds = getAllIdsForMerchant(staffUnionId);
          if (relevantIds.length > 0 && !relevantIds.includes(order.restaurantId)) {
            return res.status(403).json({ error: 'Access denied - not your union\'s order' });
          }
        }
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        if (DELIVERY_TRIGGER_STATUSES.includes(status)) autoCreateDeliveryJob(req.params.id);
        return res.json(updatedOrder);
      }

      if (user.role === 'customer') {
        if (order.customerEmail !== user.email) {
          return res.status(403).json({ error: 'Access denied - not your order' });
        }
        const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
        return res.json(updatedOrder);
      }
      
      // Default: deny access for unknown roles
      return res.status(403).json({ error: 'Access denied' });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Get cuisines/categories (unique list from menu items - Products segment only)
}
