import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, autoCreateDeliveryJob, autoAssignDriverToOrder } from "./shared";
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

export async function registerAdminRoutes(app: Express): Promise<void> {
  app.get("/api/merchant/me", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      if (decoded.role === 'merchant') {
        const merchants = await storage.getMerchants();
        const merchant = merchants.find(m => m.id === decoded.id);
        if (!merchant) {
          return res.status(404).json({ error: 'Merchant not found' });
        }
        if (isMerchantSessionRevoked(merchant, decoded.iat)) {
          res.clearCookie('merchant_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
          return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        const { password, ...publicData } = merchant;
        const isGlobalAdmin = decoded.id === 'admin-1';
        return res.json({ ...publicData, role: 'merchant', isGlobalAdmin, merchantId: isGlobalAdmin ? null : decoded.id });
      }
      if (decoded.role === 'merchant_subuser') {
        const subUser = await storage.getSubUser(decoded.id);
        if (!subUser) {
          return res.status(404).json({ error: 'Sub-user not found' });
        }
        const merchants = await storage.getMerchants();
        const parentMerchant = merchants.find(m => m.id === subUser.parentId);
        if (!parentMerchant) {
          return res.status(404).json({ error: 'Parent merchant not found' });
        }
        if (isMerchantSessionRevoked(parentMerchant, decoded.iat)) {
          res.clearCookie('merchant_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
          return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        const { password, ...publicData } = parentMerchant;
        return res.json({ ...publicData, role: 'merchant_subuser', subUser: { id: subUser.id, name: subUser.name, email: subUser.email, permissions: subUser.permissions } });
      }
      if (decoded.role === 'merchant_staff') {
        const merchants = await storage.getMerchants();
        const merchant = merchants.find(m => m.id === decoded.id);
        if (!merchant) {
          return res.status(404).json({ error: 'Merchant not found for staff' });
        }
        if (isMerchantSessionRevoked(merchant, decoded.iat)) {
          res.clearCookie('merchant_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
          return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        const { password, ...publicData } = merchant;
        return res.json({ ...publicData, role: 'merchant_staff', staffId: decoded.staffId });
      }
      return res.status(401).json({ error: 'Invalid token role' });
    } catch (error) {
      console.error('Error fetching merchant me:', error);
      res.status(500).json({ error: 'Failed to fetch merchant data' });
    }
  });

  // Admin: force-logout all active sessions for a merchant by setting sessionInvalidatedAt to NOW
  app.post("/api/admin/force-logout-merchant/:merchantId", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      const now = new Date();
      await storage.updateMerchant(merchantId, { sessionInvalidatedAt: now });
      return res.json({ success: true, merchantId, invalidatedAt: now.toISOString(), message: `All sessions for ${merchant.restaurantName} have been invalidated.` });
    } catch (error) {
      console.error('Error force-logging out merchant:', error);
      res.status(500).json({ error: 'Failed to invalidate sessions' });
    }
  });

  app.post("/api/merchant/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }
      
      // First try to find a merchant with this username
      const merchants = await storage.getMerchants();
      const merchantPhoneDigits = username.replace(/\D/g, '');
      const merchantLooksLikePhone = merchantPhoneDigits.length >= 10 && !/[A-Za-z]/.test(username.trim());
      let merchant = merchants.find(m => m.username === username);
      if (!merchant && merchantLooksLikePhone) {
        merchant = merchants.find(m => m.contactPhone && m.contactPhone.replace(/\D/g, '') === merchantPhoneDigits);
      }

      if (merchant) {
        // Merchant login
        if (merchant.password !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (merchant.status !== 'active') {
          return res.status(403).json({ success: false, message: 'Your account is not active. Please contact admin.' });
        }
        
        const token = signToken({ 
          id: merchant.id,
          name: merchant.restaurantName, 
          email: merchant.contactEmail,
          role: 'merchant',
          restaurantId: merchant.restaurantSlug
        });
        
        res.cookie('merchant_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        return res.json({ 
          success: true, 
          message: 'Login successful',
          merchant: {
            id: merchant.id,
            name: merchant.restaurantName,
            email: merchant.contactEmail,
            restaurant: merchant.restaurantSlug
          }
        });
      }
      
      // If no merchant found, try to find a sub-user (by username or phone)
      let subUser = await storage.getSubUserByUsername(username);
      if (!subUser && merchantLooksLikePhone) {
        subUser = await storage.getSubUserByPhone(merchantPhoneDigits);
      }

      if (subUser && subUser.parentType === 'merchant') {
        // Verify password (stored as passwordHash but currently plain text)
        if (subUser.passwordHash !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (!subUser.isActive) {
          return res.status(403).json({ success: false, message: 'Your account is not active. Please contact your Union admin.' });
        }
        
        // Get the parent merchant for context
        const parentMerchant = merchants.find(m => m.id === subUser!.parentId);
        if (!parentMerchant) {
          return res.status(403).json({ success: false, message: 'Parent Union not found. Please contact admin.' });
        }
        
        // Update last login
        await storage.updateSubUserLastLogin(subUser.id);
        
        const token = signToken({ 
          id: subUser.id,
          name: subUser.name, 
          email: subUser.email,
          role: 'merchant_subuser',
          parentId: subUser.parentId,
          permissions: subUser.permissions
        });
        
        res.cookie('merchant_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        return res.json({ 
          success: true, 
          message: 'Login successful',
          isSubUser: true,
          subUser: {
            id: subUser.id,
            name: subUser.name,
            email: subUser.email,
            permissions: subUser.permissions
          },
          merchant: {
            id: parentMerchant.id,
            name: parentMerchant.restaurantName,
            email: parentMerchant.contactEmail,
            restaurant: parentMerchant.restaurantSlug
          }
        });
      }
      
      // Neither merchant nor sub-user found
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (error) {
      console.error('Merchant login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Union login (alias for merchant login - both District Union and Union are same)
  app.post("/api/union/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }
      
      // First try to find a merchant/union with this username or phone
      const merchants = await storage.getMerchants();
      const unionPhoneDigits = username.replace(/\D/g, '');
      const unionLooksLikePhone = unionPhoneDigits.length >= 10 && !/[A-Za-z]/.test(username.trim());
      let merchant = merchants.find(m => m.username === username);
      if (!merchant && unionLooksLikePhone) {
        merchant = merchants.find(m => m.contactPhone && m.contactPhone.replace(/\D/g, '') === unionPhoneDigits);
      }

      if (merchant) {
        // Union login
        if (merchant.password !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (merchant.status !== 'active') {
          return res.status(403).json({ success: false, message: 'Your account is not active. Please contact admin.' });
        }
        
        const token = signToken({ 
          id: merchant.id,
          name: merchant.restaurantName, 
          email: merchant.contactEmail,
          role: 'merchant',
          restaurantId: merchant.restaurantSlug
        });
        
        res.cookie('merchant_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        return res.json({ 
          success: true, 
          message: 'Login successful',
          merchant: {
            id: merchant.id,
            name: merchant.restaurantName,
            email: merchant.contactEmail,
            restaurant: merchant.restaurantSlug
          }
        });
      }
      
      // If no merchant found, try to find a sub-user
      let subUser = await storage.getSubUserByUsername(username);
      if (!subUser && unionLooksLikePhone) {
        subUser = await storage.getSubUserByPhone(unionPhoneDigits);
      }

      if (subUser && subUser.parentType === 'merchant') {
        if (subUser.passwordHash !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (!subUser.isActive) {
          return res.status(403).json({ success: false, message: 'Your account is not active. Please contact admin.' });
        }
        
        // Get parent merchant details
        const parentMerchant = merchants.find(m => m.id === subUser!.parentId);
        
        if (!parentMerchant || parentMerchant.status !== 'active') {
          return res.status(403).json({ success: false, message: 'Parent union account is not active.' });
        }
        
        const token = signToken({ 
          id: subUser.id,
          name: subUser.name, 
          email: subUser.email,
          role: 'merchant_subuser',
          parentMerchantId: subUser.parentId,
          permissions: subUser.permissions
        });
        
        res.cookie('merchant_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        return res.json({ 
          success: true, 
          message: 'Login successful',
          isSubUser: true,
          subUser: {
            id: subUser.id,
            name: subUser.name,
            email: subUser.email,
            permissions: subUser.permissions
          },
          merchant: {
            id: parentMerchant.id,
            name: parentMerchant.restaurantName,
            email: parentMerchant.contactEmail,
            restaurant: parentMerchant.restaurantSlug
          }
        });
      }
      
      // Neither merchant nor sub-user found
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (error) {
      console.error('Union login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Union API endpoints - the union routes are defined below, no rewriting needed
  
  // Union get by ID - redirect to merchant endpoint
  app.get("/api/union/:id", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ message: "Union not found" });
      }
      return res.json(merchant);
    } catch (error) {
      console.error('Union API error:', error);
      return res.status(500).json({ message: "Failed to get union" });
    }
  });
  
  // Union sub-users list
  app.get("/api/union/:merchantId/sub-users", async (req, res) => {
    try {
      const subUsers = await storage.getSubUsers('merchant', req.params.merchantId);
      res.json(subUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sub-users" });
    }
  });

  // Union sub-users create
  app.post("/api/union/:merchantId/sub-users", async (req, res) => {
    try {
      const { name, email, username, password, permissions, phone } = req.body;
      const subUser = await storage.createSubUser({
        name,
        email,
        username,
        passwordHash: password,
        parentType: 'merchant',
        parentId: req.params.merchantId,
        permissions: permissions || [],
        phone
      });
      res.json(subUser);
    } catch (error) {
      console.error('Error creating sub-user:', error);
      res.status(500).json({ message: "Failed to create sub-user" });
    }
  });

  // Union sub-users update
  app.put("/api/union/:merchantId/sub-users/:id", async (req, res) => {
    try {
      const { name, email, username, password, permissions, isActive, phone } = req.body;
      const updateData: any = { name, email, username, permissions, isActive, phone };
      if (password) {
        updateData.passwordHash = password;
      }
      const subUser = await storage.updateSubUser(req.params.id, updateData);
      res.json(subUser);
    } catch (error) {
      console.error('Error updating sub-user:', error);
      res.status(500).json({ message: "Failed to update sub-user" });
    }
  });

  // Union sub-users delete
  app.delete("/api/union/:merchantId/sub-users/:id", async (req, res) => {
    try {
      await storage.deleteSubUser(req.params.id);
      res.json({ success: true, message: "Sub-user deleted" });
    } catch (error) {
      console.error('Error deleting sub-user:', error);
      res.status(500).json({ message: "Failed to delete sub-user" });
    }
  });

  // Union menu items
  app.get("/api/union/:merchantId/menu-items", async (req, res) => {
    try {
      const merchantId = req.params.merchantId;
      const menuItems = await storage.getMenuItems(merchantId);
      
      // Check if retailer pricing is enabled for this merchant
      const merchant = await storage.getMerchant(merchantId);
      const retailerPriceEnabled = merchant?.retailerPriceEnabled === true;
      
      // Filter out retailerPrice if not enabled
      const filteredItems = menuItems.map((item: any) => {
        if (!retailerPriceEnabled) {
          const { retailerPrice, ...rest } = item;
          return rest;
        }
        return item;
      });
      
      res.json(filteredItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get menu items" });
    }
  });

  app.post("/api/union/:merchantId/menu-items", async (req, res) => {
    try {
      const menuItem = await storage.createMenuItem({ ...req.body, restaurantId: req.params.merchantId });
      res.json(menuItem);
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/union/:merchantId/menu-items/:itemId", async (req, res) => {
    try {
      const menuItem = await storage.updateMenuItem(req.params.itemId, req.body);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/union/:merchantId/menu-items/:itemId", async (req, res) => {
    try {
      const deleted = await storage.deleteMenuItem(req.params.itemId);
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json({ success: true, message: "Menu item deleted" });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  const productImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    }
  });

  app.post("/api/union/:merchantId/upload-image", productImageUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const file = req.file;
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const objectName = `media/products/${uniqueSuffix}${ext}`;
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (publicPaths.length === 0) {
        return res.status(500).json({ error: 'Object storage not configured' });
      }
      const publicPath = publicPaths[0];
      const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
      const bucketName = pathParts[0];
      const publicDir = pathParts.slice(1).join('/');
      const fullObjectName = publicDir ? `${publicDir}/${objectName}` : objectName;
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(fullObjectName);
      await objectFile.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      const objectUrl = `/public/${objectName}`;
      res.json({ url: objectUrl, originalName: file.originalname });
    } catch (error) {
      console.error('Error uploading product image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  app.get("/api/union/:merchantId/product-images", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (publicPaths.length === 0) {
        return res.json({ images: [] });
      }
      const publicPath = publicPaths[0];
      const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
      const bucketName = pathParts[0];
      const publicDir = pathParts.slice(1).join('/');
      const prefix = publicDir ? `${publicDir}/media/products/` : `media/products/`;
      const bucket = objectStorageClient.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix });
      const images = files
        .filter((f: any) => {
          const name = f.name.toLowerCase();
          return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.gif');
        })
        .map((f: any) => {
          const relativePath = publicDir ? f.name.replace(`${publicDir}/`, '') : f.name;
          return {
            url: `/public/${relativePath}`,
            name: path.basename(f.name),
            size: f.metadata?.size || 0,
          };
        })
        .sort((a: any, b: any) => b.name.localeCompare(a.name));
      res.json({ images });
    } catch (error) {
      console.error('Error listing product images:', error);
      res.json({ images: [] });
    }
  });

  app.delete("/api/union/:merchantId/product-images", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.startsWith('/public/media/products/')) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (publicPaths.length === 0) {
        return res.status(500).json({ error: 'Object storage not configured' });
      }
      const publicPath = publicPaths[0];
      const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
      const bucketName = pathParts[0];
      const publicDir = pathParts.slice(1).join('/');
      const relativePath = url.replace('/public/', '');
      const fullObjectName = publicDir ? `${publicDir}/${relativePath}` : relativePath;
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fullObjectName);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product image:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  const merchantToUnionMapping: Record<string, string> = {
    'merchant-2': 'UNI-CBE-01',
    'merchant-3': 'UNI-SLM-01',
    'merchant-4': 'UNI-MDU-01',
    'merchant-5': 'UNI-TRY-01',
    'merchant-6': 'UNI-TNJ-01',
    'merchant-7': 'UNI-ERO-01',
    'merchant-8': 'UNI-TNV-01',
    'merchant-9': 'UNI-VLR-01',
    'merchant-10': 'UNI-VPM-01',
    'merchant-11': 'UNI-KTU-01',
    'merchant-12': 'UNI-TVM-01',
    'merchant-13': 'UNI-CUD-01',
    'merchant-15': 'UNI-DGL-01',
    'merchant-16': 'UNI-THN-01',
    'merchant-17': 'UNI-VNR-01',
    'merchant-19': 'UNI-SVG-01',
    'merchant-20': 'UNI-TUT-01',
    'merchant-21': 'UNI-KYK-01',
    'merchant-22': 'UNI-NKL-01',
    'merchant-23': 'UNI-DPI-01',
    'merchant-24': 'UNI-KGI-01',
    'merchant-25': 'UNI-TPR-01',
    'merchant-26': 'UNI-KRR-01',
    'merchant-28': 'UNI-KAL-01',
    'merchant-29': 'UNI-NGR-01',
    'merchant-30': 'UNI-PUD-01',
    'merchant-31': 'UNI-TPT-01',
    'merchant-fed-01': 'FED-TCMPF-01',
    'merchant-fed-amb': 'FED-AMB-01',
    'merchant-fed-mad': 'FED-MAD-01',
    'merchant-fed-pro': 'FED-PROD-01',
    'merchant-fed-sho': 'FED-SHL-01',
  };

  function getAllIdsForMerchant(merchantId: string): string[] {
    const ids = [merchantId];
    const unionId = merchantToUnionMapping[merchantId];
    if (unionId) ids.push(unionId);
    const numericId = merchantId.replace('merchant-', '');
    if (numericId !== merchantId) ids.push(numericId);
    return ids;
  }

  function resolveDistrictUnionToMerchantId(districtUnion: string, merchants: any[]): string {
    if (!districtUnion) return '';
    // Already a merchant ID format (merchant-X)
    if (districtUnion.startsWith('merchant-')) return districtUnion;
    // Already a union ID format (UNI-XXX-XX or FED-XXX-XX)
    if (/^(UNI|FED)-/.test(districtUnion)) {
      const entry = Object.entries(merchantToUnionMapping).find(([_, uId]) => uId === districtUnion);
      return entry ? entry[0] : districtUnion;
    }
    // It's a name — try to match against merchants list
    const normalized = districtUnion.toLowerCase().trim();
    const match = merchants.find((m: any) =>
      (m.restaurantName || m.name || '').toLowerCase().trim() === normalized ||
      (m.restaurantName || m.name || '').toLowerCase().includes(normalized) ||
      normalized.includes((m.restaurantName || m.name || '').toLowerCase())
    );
    if (match) return match.id;
    // Try matching against union codes in the mapping
    for (const [mId, uId] of Object.entries(merchantToUnionMapping)) {
      if (uId.toLowerCase().includes(normalized) || normalized.includes(uId.toLowerCase())) return mId;
    }
    return districtUnion;
  }

  function getUnionCodeFromMerchantId(merchantId: string): string {
    const unionMappingCode = merchantToUnionMapping[merchantId] || '';
    const match = unionMappingCode.match(/UNI-([A-Z]+)-/) || unionMappingCode.match(/FED-([A-Z]+)-/);
    return match ? match[1] : 'AAVIN';
  }

  function getFinancialYear(date?: Date): string {
    const d = date || new Date();
    const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${String(fy).slice(2)}${String(fy + 1).slice(2)}`;
  }

  async function generateInvoiceNumber(merchantId: string): Promise<string> {
    const unionCode = getUnionCodeFromMerchantId(merchantId);
    const fyStr = getFinancialYear();
    const result = await db.execute(sql`
      INSERT INTO invoice_sequences (union_code, financial_year, last_sequence, updated_at)
      VALUES (${unionCode}, ${fyStr}, 1, NOW())
      ON CONFLICT (union_code, financial_year)
      DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1, updated_at = NOW()
      RETURNING last_sequence
    `);
    const seq = (result as any).rows?.[0]?.last_sequence || (result as any)[0]?.last_sequence || 1;
    return `${unionCode}/${fyStr}/${String(seq).padStart(5, '0')}`;
  }

  // Union orders
  app.get("/api/union/:merchantId/orders", async (req, res) => {
    try {
      const { staffOffice, staffSegments } = req.query;
      const orders = await storage.getOrders();
      const validIds = getAllIdsForMerchant(req.params.merchantId);
      let merchantOrders = orders.filter(o => validIds.includes(o.restaurantId));

      if (staffOffice && staffOffice !== 'head_office') {
        const officeList = (staffOffice as string).split(',').map(s => s.trim()).filter(Boolean);
        merchantOrders = merchantOrders.filter((o: any) => officeList.includes(o.customerOffice));
      }
      if (staffSegments) {
        const segments = (staffSegments as string).split(',');
        const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
        const allowedSegments = segments.map(s => segmentSuffixMap[s] || s);
        merchantOrders = merchantOrders.filter((o: any) => o.productSegment && allowedSegments.includes(o.productSegment));
      }

      const agentCodePattern = /^[A-Z]{2,5}[-]?\d{2,5}$/i;
      const agentCodes = new Set<string>();
      merchantOrders.forEach(o => {
        if (o.customerName && agentCodePattern.test(o.customerName)) {
          agentCodes.add(o.customerName);
        }
      });

      const businessNameMap = new Map<string, string>();
      if (agentCodes.size > 0) {
        try {
          const allUsers = await db.select({
            businessCode: usersTable.businessCode,
            businessName: usersTable.businessName,
            name: usersTable.name,
          }).from(usersTable).where(
            inArray(usersTable.businessCode, Array.from(agentCodes))
          );
          allUsers.forEach(u => {
            if (u.businessCode && (u.businessName || u.name)) {
              businessNameMap.set(u.businessCode.toUpperCase(), u.businessName || u.name);
            }
          });
        } catch {}
      }

      const enriched = merchantOrders.map(o => {
        const cn = o.customerName || '';
        if (agentCodePattern.test(cn)) {
          const resolved = businessNameMap.get(cn.toUpperCase());
          if (resolved) {
            return { ...o, customerName: resolved, agentCode: cn };
          }
        }
        return o;
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  app.patch("/api/union/:merchantId/orders/:orderId/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const validStatuses = ['pending', 'confirmed', 'accepted', 'processing', 'preparing', 'ready', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const validIds = getAllIdsForMerchant(req.params.merchantId);
      if (!validIds.includes(order.restaurantId)) {
        return res.status(403).json({ error: 'This order does not belong to your union' });
      }

      const updatedOrder = await storage.updateOrderStatus(req.params.orderId, status);
      if (['marketing_approved', 'assigned_to_delivery', 'ready', 'confirmed', 'accepted'].includes(status)) {
        autoCreateDeliveryJob(req.params.orderId);
      }
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Bulk delete orders
  app.post("/api/union/:merchantId/orders/bulk-delete", async (req, res) => {
    try {
      const { orderIds } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: "orderIds must be a non-empty array" });
      }

      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate that all orders belong to this merchant
      const validIds = getAllIdsForMerchant(req.params.merchantId);
      const orders = await storage.getOrders();
      const validOrderIds: string[] = [];

      for (const orderId of orderIds) {
        const order = orders.find(o => o.id === orderId);
        if (order && validIds.includes(order.restaurantId)) {
          validOrderIds.push(orderId);
        }
      }

      if (validOrderIds.length === 0) {
        return res.status(400).json({ error: "No valid orders found to delete" });
      }

      // Delete the orders
      await db.delete(ordersTable).where(inArray(ordersTable.id, validOrderIds));

      res.json({ success: true, deleted: validOrderIds.length });
    } catch (error) {
      console.error('Error bulk deleting orders:', error);
      res.status(500).json({ error: "Failed to bulk delete orders" });
    }
  });

  app.post("/api/union/:merchantId/orders/bulk-approve", async (req, res) => {
    try {
      const { orderIds, targetStatus } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: "orderIds must be a non-empty array" });
      }

      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const status = targetStatus || 'confirmed';
      const validStatuses = ['confirmed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'marketing_approved', 'assigned_to_delivery', 'cancelled', 'processing', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid target status' });
      }

      const validIds = getAllIdsForMerchant(req.params.merchantId);
      const orders = await storage.getOrders();
      let updated = 0;

      for (const orderId of orderIds) {
        const order = orders.find(o => o.id === orderId);
        if (order && validIds.includes(order.restaurantId)) {
          await storage.updateOrderStatus(orderId, status);
          if (status === 'assigned_to_delivery') {
            autoAssignDriverToOrder(order).catch(e => console.error('Auto-assign failed:', e));
          }
          updated++;
        }
      }

      if (updated === 0) {
        return res.status(400).json({ error: "No valid orders found to update" });
      }

      res.json({ success: true, updated, targetStatus: status });
    } catch (error) {
      console.error('Error bulk approving orders:', error);
      res.status(500).json({ error: "Failed to bulk approve orders" });
    }
  });

  app.get("/api/union/:merchantId/dashboard-stats", async (req, res) => {
    try {
      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validIds = getAllIdsForMerchant(req.params.merchantId);
      const allOrders = await storage.getOrders();
      const merchantOrders = allOrders.filter(o => validIds.includes(o.restaurantId));

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const todayOrders = merchantOrders.filter(o => o.createdAt && new Date(o.createdAt) >= todayStart);
      const yesterdayOrders = merchantOrders.filter(o => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        return d && d >= yesterdayStart && d < todayStart;
      });

      const todaySales = todayOrders.filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (parseFloat(o.total?.toString() || '0')), 0);
      const yesterdaySales = yesterdayOrders.filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (parseFloat(o.total?.toString() || '0')), 0);

      const ordersByStatus: Record<string, number> = {};
      merchantOrders.forEach(o => {
        const s = o.status || 'pending';
        ordersByStatus[s] = (ordersByStatus[s] || 0) + 1;
      });

      const segmentBreakdown: Record<string, { count: number; revenue: number }> = {};
      todayOrders.forEach(o => {
        const seg = (o as any).productSegment || 'Products';
        if (!segmentBreakdown[seg]) segmentBreakdown[seg] = { count: 0, revenue: 0 };
        segmentBreakdown[seg].count++;
        if (o.status === 'completed' || o.status === 'delivered') {
          segmentBreakdown[seg].revenue += parseFloat(o.total?.toString() || '0');
        }
      });

      const workflowPipeline: Record<string, number> = {};
      const workflowStatuses = ['pending', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered'];
      workflowStatuses.forEach(s => { workflowPipeline[s] = 0; });
      merchantOrders.forEach(o => {
        const ws = (o as any).workflowStatus || o.status || 'pending';
        if (workflowPipeline[ws] !== undefined) workflowPipeline[ws]++;
      });

      const topCustomers: { name: string; orders: number; revenue: number }[] = [];
      const customerMap = new Map<string, { name: string; orders: number; revenue: number }>();
      const agentCodePattern = /^[A-Z]{2,5}[-]?\d{2,5}$/i;
      const dashAgentCodes = new Set<string>();
      merchantOrders.forEach(o => {
        const name = o.customerName || 'Unknown';
        if (agentCodePattern.test(name)) dashAgentCodes.add(name);
        const existing = customerMap.get(name) || { name, orders: 0, revenue: 0 };
        existing.orders++;
        existing.revenue += parseFloat(o.total?.toString() || '0');
        customerMap.set(name, existing);
      });

      const dashBizMap = new Map<string, string>();
      if (dashAgentCodes.size > 0) {
        try {
          const bUsers = await db.select({
            businessCode: usersTable.businessCode,
            businessName: usersTable.businessName,
            name: usersTable.name,
          }).from(usersTable).where(inArray(usersTable.businessCode, Array.from(dashAgentCodes)));
          bUsers.forEach(u => {
            if (u.businessCode && (u.businessName || u.name)) {
              dashBizMap.set(u.businessCode.toUpperCase(), u.businessName || u.name);
            }
          });
        } catch {}
      }

      const sortedCustomers = Array.from(customerMap.values())
        .map(c => ({ ...c, name: dashBizMap.get(c.name.toUpperCase()) || c.name }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      topCustomers.push(...sortedCustomers);

      let signedInUsers = 0;
      let signedInStaff = 0;
      try {
        const recentLogs = await db.select().from(userActivityLogs)
          .where(and(
            eq(userActivityLogs.eventType, 'login'),
            gte(userActivityLogs.createdAt, todayStart)
          ));
        const uniqueUserIds = new Set(recentLogs.map(l => l.userId));
        signedInUsers = uniqueUserIds.size;
        signedInStaff = recentLogs.filter(l => l.userRole === 'union_staff' || l.userRole === 'admin' || l.userRole === 'merchant').length;
      } catch {}

      const totalRevenue = merchantOrders.filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (parseFloat(o.total?.toString() || '0')), 0);
      const deliveredForAvg = merchantOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      const avgOrderValue = deliveredForAvg > 0 ? totalRevenue / deliveredForAvg : 0;

      const deliveredCount = merchantOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
      const deliveryRate = merchantOrders.length > 0 ? Math.round((deliveredCount / merchantOrders.length) * 100) : 0;

      res.json({
        today: {
          orders: todayOrders.length,
          sales: todaySales,
          pending: todayOrders.filter(o => o.status === 'pending').length,
          delivered: todayOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length,
        },
        yesterday: {
          orders: yesterdayOrders.length,
          sales: yesterdaySales,
        },
        ordersByStatus,
        segmentBreakdown,
        workflowPipeline,
        topCustomers,
        signedInUsers,
        signedInStaff,
        totalOrders: merchantOrders.length,
        totalRevenue,
        avgOrderValue: isNaN(avgOrderValue) ? 0 : avgOrderValue,
        deliveryRate,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Bulk delete users (admin or merchant)
  app.post("/api/admin/users/bulk-delete", async (req, res) => {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "userIds must be a non-empty array" });
      }

      const authToken = req.cookies?.auth_token;
      const merchantToken = req.cookies?.merchant_token;
      let authorized = false;

      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload && payload.role === 'admin') authorized = true;
      }
      if (!authorized && merchantToken) {
        const merchants = await storage.listMerchants();
        if (merchants.some(m => m.id === merchantToken || m.name === merchantToken)) {
          authorized = true;
        }
      }

      if (!authorized) {
        return res.status(403).json({ error: 'Admin or merchant access required' });
      }

      const result = await db.delete(usersTable).where(inArray(usersTable.id, userIds));

      res.json({ success: true, deleted: userIds.length });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      res.status(500).json({ error: "Failed to bulk delete users" });
    }
  });

  // Bulk delete staff members
  app.post("/api/union/:merchantId/staff/bulk-delete", async (req, res) => {
    try {
      const { staffIds } = req.body;

      if (!Array.isArray(staffIds) || staffIds.length === 0) {
        return res.status(400).json({ error: "staffIds must be a non-empty array" });
      }

      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Delete the staff members
      await db.delete(unionStaff).where(inArray(unionStaff.id, staffIds));

      res.json({ success: true, deleted: staffIds.length });
    } catch (error) {
      console.error('Error bulk deleting staff:', error);
      res.status(500).json({ error: "Failed to bulk delete staff" });
    }
  });

  app.patch("/api/union/:merchantId/orders/:orderId/assign-driver", async (req, res) => {
    try {
      const { driverName, driverPhone } = req.body;

      const token = req.cookies?.merchant_token;
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const validIds = getAllIdsForMerchant(req.params.merchantId);
      if (!validIds.includes(order.restaurantId)) {
        return res.status(403).json({ error: 'This order does not belong to your union' });
      }

      res.json({
        ...order,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
      });
    } catch (error) {
      console.error('Error assigning driver:', error);
      res.status(500).json({ error: "Failed to assign driver" });
    }
  });

  // Union categories
  app.get("/api/union/:merchantId/categories", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.merchantId);
      const categories = Array.from(new Set(menuItems.map(item => item.category)));
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/union/:merchantId/categories", async (req, res) => {
    try {
      const { category } = req.body;
      res.json({ success: true, category });
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/union/:merchantId/categories/:categoryId", async (req, res) => {
    try {
      const { category } = req.body;
      res.json({ success: true, category });
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/union/:merchantId/categories/:categoryId", async (req, res) => {
    try {
      res.json({ success: true, message: "Category deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Union bulk upload
  app.post("/api/union/:merchantId/bulk-upload", async (req, res) => {
    try {
      res.json({ success: true, message: "Bulk upload completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk upload" });
    }
  });

  // Union mapped users - Get all users associated with this union
  app.get("/api/union/:merchantId/mapped-users", async (req, res) => {
    try {
      // Get all users that belong to this union using storage
      const allUsers = await storage.listUsers();
      const mappedUsers = allUsers
        .filter((u: any) => u.unionId === req.params.merchantId)
        .map(({ passwordHash, ...rest }: any) => ({
          ...rest,
          plainPassword: rest.plainPassword || null,
        }));
      
      res.json(mappedUsers);
    } catch (error) {
      console.error('Error fetching mapped users:', error);
      res.status(500).json({ message: "Failed to get mapped users" });
    }
  });

  // Union reset user password
  app.post("/api/union/:merchantId/reset-user-password", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const scope = getUnionScope(req);
      const callerUnionId = scope.merchantId || (req.user as any)?.unionId;
      if (!scope.isGlobalAdmin && callerUnionId && callerUnionId !== req.params.merchantId) {
        return res.status(403).json({ message: "You can only manage users in your own union" });
      }

      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: "User ID and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Get user to verify they belong to this union
      const user = await storage.getUser(userId);
      if (!user || user.unionId !== req.params.merchantId) {
        return res.status(404).json({ message: "User not found or doesn't belong to this union" });
      }
      
      const passwordHash = await hashPassword(newPassword);
      
      await storage.updateUser(userId, { passwordHash, plainPassword: newPassword });
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error('Error resetting user password:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Auto-login as user (for Union admins)
  app.post("/api/union/:merchantId/user/:userId/auto-login", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const scope = getUnionScope(req);
      const callerUnionId = scope.merchantId || (req.user as any)?.unionId;
      if (!scope.isGlobalAdmin && callerUnionId && callerUnionId !== req.params.merchantId) {
        return res.status(403).json({ message: "You can only auto-login users in your own union" });
      }

      const user = await storage.getUser(req.params.userId);
      
      if (!user || user.unionId !== req.params.merchantId) {
        return res.status(404).json({ message: "User not found or doesn't belong to this union" });
      }
      
      const autoLoginToken = signToken({
        userId: user.id,
        purpose: 'auto_login',
      });
      
      res.json({ 
        success: true, 
        token: autoLoginToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error creating auto-login session for user:', error);
      res.status(500).json({ message: "Failed to create auto-login session" });
    }
  });

  app.get("/api/auto-login/:token", async (req, res) => {
    try {
      const decoded = verifyToken(req.params.token);
      if (!decoded || !decoded.userId || decoded.purpose !== 'auto_login') {
        return res.redirect('/login');
      }
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.redirect('/login?error=not_found');
      }
      const existingAuthToken = req.cookies?.auth_token;
      if (existingAuthToken) {
        const existingPayload = verifyToken(existingAuthToken);
        if (existingPayload && existingPayload.userId) {
          const existingUser = await storage.getUser(existingPayload.userId);
          if (existingUser && existingUser.role === 'admin') {
            res.cookie('admin_session_token', existingAuthToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 24 * 60 * 60 * 1000
            });
          }
        }
      }
      const authToken = signToken({ userId: user.id, role: user.role });
      res.cookie('auth_token', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      const extUser = user as any;
      const pricingRole = extUser.pricingRole || 'MRP';
      const allRoles = [pricingRole, extUser.freshMilkPricingRole, extUser.productsPricingRole, extUser.iceCreamPricingRole].filter(Boolean);
      const hasRole = (r: string) => allRoles.includes(r);
      let dashboardPath = '/';
      const role = user.role || 'customer';
      if (role === 'wholesale_dealer' || role === 'wsd' || hasRole('WHOLESALE_DEALER')) {
        dashboardPath = '/wsd/dashboard';
      } else if (role === 'dealer' || hasRole('DEALER')) {
        dashboardPath = '/dealer/dashboard';
      } else if (role === 'retailer' || hasRole('RETAILER')) {
        dashboardPath = '/retailer/dashboard';
      } else if (['mpcs', 'hotel', 'institution', 'private_parlour', 'union_parlour', 'general_shop', 'fmd', 'inter_union', 'federation', 'agent'].includes(role)) {
        dashboardPath = '/b2b/dashboard';
      } else if (pricingRole !== 'MRP' && pricingRole !== '') {
        dashboardPath = '/b2b/dashboard';
      }
      res.redirect(dashboardPath);
    } catch (error) {
      console.error('Auto-login error:', error);
      res.redirect('/login');
    }
  });

  // Union agents
  app.get("/api/union/:merchantId/agents", async (req, res) => {
    try {
      const agents = await storage.getAgentsByUnion(req.params.merchantId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get agents" });
    }
  });

  app.get("/api/union/:merchantId/agents/stats", async (req, res) => {
    try {
      res.json({ total: 0, active: 0, inactive: 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent stats" });
    }
  });

  app.get("/api/union/:merchantId/agents/:agentId", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent" });
    }
  });

  app.post("/api/union/:merchantId/agents", async (req, res) => {
    try {
      const agent = await storage.createAgent({ ...req.body, assignedUnionId: req.params.merchantId });
      res.json(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.put("/api/union/:merchantId/agents/:agentId", async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.agentId, req.body);
      res.json(agent);
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.patch("/api/agents/:agentId", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      if (agentId.startsWith('wsd-')) {
        const realId = agentId.replace('wsd-', '');
        const updateData: any = {};
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.phone) updateData.mobileNumber = req.body.phone;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.address) updateData.address = req.body.address;
        if (req.body.city) updateData.location = req.body.city;
        if (req.body.district) updateData.districtUnion = req.body.district;
        if (req.body.status === 'active') updateData.isActive = true;
        if (req.body.status === 'inactive') updateData.isActive = false;
        if (req.body.freshMilkTier === 'WSD') updateData.hasFreshMilkAccess = true;
        if (req.body.freshMilkTier === '' || req.body.freshMilkTier === 'none') updateData.hasFreshMilkAccess = false;
        const dealer = await storage.updateWholesaleDealer(realId, updateData);
        if (dealer) {
          res.json({ ...dealer, id: agentId, agentCode: dealer.wsdCode, status: dealer.isActive ? 'active' : 'inactive' });
        } else {
          res.status(404).json({ message: "Wholesale dealer not found" });
        }
      } else {
        const agent = await storage.updateAgent(agentId, req.body);
        res.json(agent);
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.delete("/api/union/:merchantId/agents/:agentId", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.agentId);
      res.json({ success: true, message: "Agent deleted" });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Union menu item copy
  app.post("/api/union/:merchantId/menu-items/:itemId/copy", async (req, res) => {
    try {
      const originalItem = await storage.getMenuItem(req.params.itemId);
      if (!originalItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      const copiedItem = await storage.createMenuItem({
        ...originalItem,
        name: `${originalItem.name} (Copy)`,
        restaurantId: req.params.merchantId
      });
      res.json(copiedItem);
    } catch (error) {
      console.error('Error copying menu item:', error);
      res.status(500).json({ message: "Failed to copy menu item" });
    }
  });

  // ===== Union Staff Self-Registration & Approval API =====

  app.get("/api/public/mmo-offices", async (req, res) => {
    try {
      const { unionId } = req.query;
      if (!unionId || typeof unionId !== 'string') {
        return res.status(400).json({ error: "unionId is required" });
      }
      const offices = await db.select({
        id: mmoOffices.id,
        officeName: mmoOffices.officeName,
        officeCode: mmoOffices.officeCode,
      }).from(mmoOffices)
        .where(and(eq(mmoOffices.unionId, unionId), eq(mmoOffices.isActive, true)))
        .orderBy(mmoOffices.sequenceNo, mmoOffices.officeName);
      res.json(offices);
    } catch (error) {
      console.error("Error fetching public MMO offices:", error);
      res.status(500).json({ error: "Failed to fetch offices" });
    }
  });

  // Staff self-registration
  app.post("/api/union-staff/register", async (req, res) => {
    try {
      const { 
        unionId, name, phone, email, employeeId, 
        department, designationId, username, password, assignedOffice 
      } = req.body;
      
      // Require employeeId and use it as username if not explicitly provided
      if (!unionId || !name || !phone || !department || !designationId || !employeeId || !password) {
        return res.status(400).json({ message: "Missing required fields. Employee ID is required." });
      }

      if (assignedOffice === 'head_office') {
        return res.status(400).json({ message: "Head Office assignment is not available for self-registration." });
      }

      const officeMandatoryRoles = ['marketing_executive', 'data_entry_operator'];
      if (officeMandatoryRoles.includes(designationId) && !assignedOffice) {
        return res.status(400).json({ message: "MMO Office selection is required for this role." });
      }

      if (assignedOffice) {
        const validOffice = await db.select({ id: mmoOffices.id }).from(mmoOffices)
          .where(and(eq(mmoOffices.unionId, unionId), eq(mmoOffices.officeName, assignedOffice), eq(mmoOffices.isActive, true)))
          .limit(1);
        if (validOffice.length === 0) {
          return res.status(400).json({ message: "Selected MMO Office does not exist for this union." });
        }
      }
      
      // Use employeeId as username if not provided
      const actualUsername = username || employeeId;
      
      // Get designation details from schema
      const { UNION_STAFF_DESIGNATIONS } = await import("@shared/schema");
      const departmentDesignations = (UNION_STAFF_DESIGNATIONS as any)[department];
      const designation = departmentDesignations?.find((d: any) => d.id === designationId);
      
      if (!designation) {
        return res.status(400).json({ message: "Invalid department or designation" });
      }
      
      // Check if employee ID already exists
      const existingStaff = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.username, actualUsername)
      });
      
      if (existingStaff) {
        return res.status(400).json({ message: "Employee ID already registered" });
      }
      
      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create staff registration (pending approval)
      const [newStaff] = await db.insert(unionStaff).values({
        unionId,
        name,
        phone,
        email: email || null,
        employeeId: employeeId,
        department,
        designation: designation.name,
        designationId,
        level: designation.level,
        accessTier: designation.accessTier,
        salesSegment: designation.salesSegment || 'all_access',
        assignedOffice: assignedOffice || null,
        username: actualUsername,
        passwordHash,
        approvalStatus: 'pending',
        isActive: true,
      }).returning();
      
      res.status(201).json({ 
        success: true, 
        message: "Registration submitted successfully. Awaiting approval.",
        staff: { id: newStaff.id, name: newStaff.name, status: newStaff.approvalStatus }
      });
    } catch (error) {
      console.error('Staff registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Staff login
  app.post("/api/union-staff/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }
      
      // Find staff by username (employee ID) or phone number
      let staff = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.username, username)
      });
      
      // If not found by username, try phone number
      if (!staff) {
        staff = await db.query.unionStaff.findFirst({
          where: eq(unionStaff.phone, username)
        });
      }
      
      if (!staff) {
        return res.status(401).json({ success: false, message: "Invalid Employee ID/Phone or password" });
      }
      
      // Check if account is approved
      if (staff.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          success: false, 
          message: staff.approvalStatus === 'pending' 
            ? "Your account is pending approval. Please wait for your Union administrator to approve your registration."
            : "Your registration was rejected. Please contact your Union administrator."
        });
      }
      
      // Check if account is active
      if (!staff.isActive) {
        return res.status(403).json({ success: false, message: "Your account has been deactivated. Please contact your administrator." });
      }
      
      // Verify password
      const bcrypt = await import("bcryptjs");
      const validPassword = await bcrypt.compare(password, staff.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }
      
      // Update last login
      await db.update(unionStaff)
        .set({ lastLogin: new Date() })
        .where(eq(unionStaff.id, staff.id));
      
      res.json({
        success: true,
        message: "Login successful",
        staff: {
          id: staff.id,
          unionId: staff.unionId,
          name: staff.name,
          email: staff.email,
          department: staff.department,
          designation: staff.designation,
          designationId: staff.designationId,
          accessTier: staff.accessTier,
          level: staff.level,
          permissions: staff.permissions,
          assignedSegments: staff.assignedSegments,
          assignedOffice: staff.assignedOffice,
          salesSegment: staff.salesSegment,
          username: staff.username,
        }
      });
    } catch (error) {
      console.error('Staff login error:', error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  app.post("/api/union-staff/pwa-auth", async (req, res) => {
    try {
      const { unionId, staffId, username, password } = req.body;
      if (!unionId || !staffId || !username || !password) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      let staff = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.id, String(staffId))
      });
      if (!staff) {
        staff = await db.query.unionStaff.findFirst({
          where: eq(unionStaff.username, username)
        });
      }
      if (!staff) {
        return res.status(401).json({ success: false, message: "Staff not found" });
      }
      const usernameMatch = staff.username === username || staff.phone === username || staff.email === username || staff.employeeId === username;
      if (!usernameMatch) {
        return res.status(401).json({ success: false, message: "Username mismatch" });
      }
      if (staff.approvalStatus !== 'approved' || !staff.isActive) {
        return res.status(403).json({ success: false, message: "Staff account not active" });
      }
      const bcrypt = await import("bcryptjs");
      const validPassword = await bcrypt.compare(password, staff.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const merchants = await storage.getMerchants();
      const numericId = parseInt(unionId);
      const merchant = merchants.find(m => m.id === numericId || String(m.id) === String(unionId));
      if (!merchant) {
        return res.status(404).json({ success: false, message: "Union not found" });
      }
      const token = signToken({
        id: merchant.id,
        name: merchant.restaurantName,
        email: merchant.contactEmail,
        role: 'merchant_staff',
        staffId: staffId,
        restaurantId: merchant.restaurantSlug
      });
      res.cookie('merchant_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      return res.json({ success: true, merchantId: merchant.id });
    } catch (error) {
      console.error('PWA staff auth error:', error);
      res.status(500).json({ success: false, message: "Authentication failed" });
    }
  });

  // Get pending staff registrations for a union
  app.get("/api/union/:unionId/staff/pending", async (req, res) => {
    try {
      const pendingStaff = await db.query.unionStaff.findMany({
        where: and(
          eq(unionStaff.unionId, req.params.unionId),
          eq(unionStaff.approvalStatus, 'pending')
        ),
        orderBy: [desc(unionStaff.createdAt)]
      });
      res.json(pendingStaff);
    } catch (error) {
      console.error('Error fetching pending staff:', error);
      res.status(500).json({ message: "Failed to fetch pending registrations" });
    }
  });

  // Get all staff for a union
  app.get("/api/union/:unionId/staff", async (req, res) => {
    try {
      const allStaff = await db.query.unionStaff.findMany({
        where: eq(unionStaff.unionId, req.params.unionId),
        orderBy: [asc(unionStaff.level), asc(unionStaff.department)]
      });
      res.json(allStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Approve staff registration
  app.put("/api/union/:unionId/staff/:staffId/approve", async (req, res) => {
    try {
      const { approvedBy } = req.body;
      
      const [updatedStaff] = await db.update(unionStaff)
        .set({
          approvalStatus: 'approved',
          approvedBy: approvedBy || 'admin',
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId)
        ))
        .returning();
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      res.json({ success: true, staff: updatedStaff });
    } catch (error) {
      console.error('Error approving staff:', error);
      res.status(500).json({ message: "Failed to approve staff" });
    }
  });

  // Reject staff registration
  app.put("/api/union/:unionId/staff/:staffId/reject", async (req, res) => {
    try {
      const { rejectionReason, rejectedBy } = req.body;
      
      const [updatedStaff] = await db.update(unionStaff)
        .set({
          approvalStatus: 'rejected',
          rejectionReason: rejectionReason || 'Registration rejected by administrator',
          updatedAt: new Date()
        })
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId)
        ))
        .returning();
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      res.json({ success: true, staff: updatedStaff });
    } catch (error) {
      console.error('Error rejecting staff:', error);
      res.status(500).json({ message: "Failed to reject staff" });
    }
  });

  // Update staff details
  app.put("/api/union/:unionId/staff/:staffId", async (req, res) => {
    try {
      const { name, phone, email, employeeId, department, designationId, designation, level, accessTier, isActive, permissions, assignedSegments, assignedOffice, assignedOffices, newUnionId } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (employeeId !== undefined) {
        updateData.employeeId = employeeId;
        updateData.username = employeeId;
      }
      if (department !== undefined) updateData.department = department;
      if (designationId !== undefined) updateData.designationId = designationId;
      if (designation !== undefined) updateData.designation = designation;
      if (level !== undefined) updateData.level = level;
      if (accessTier !== undefined) updateData.accessTier = accessTier;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (assignedSegments !== undefined) updateData.assignedSegments = assignedSegments;
      if (assignedOffices !== undefined) {
        updateData.assignedOffice = Array.isArray(assignedOffices) ? JSON.stringify(assignedOffices) : assignedOffices;
      } else if (assignedOffice !== undefined) {
        updateData.assignedOffice = assignedOffice;
      }
      if (newUnionId && newUnionId !== req.params.unionId) updateData.unionId = newUnionId;
      if (designationId && (designationId.startsWith('agm_') || designationId === 'transport_manager')) {
        updateData.assignedSegments = ['FM', 'DP', 'IC'];
      }
      
      const [updatedStaff] = await db.update(unionStaff)
        .set(updateData)
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId)
        ))
        .returning();
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      res.json(updatedStaff);
    } catch (error) {
      console.error('Error updating staff:', error);
      res.status(500).json({ message: "Failed to update staff" });
    }
  });

  // Delete staff
  app.delete("/api/union/:unionId/staff/:staffId", async (req, res) => {
    try {
      await db.delete(unionStaff)
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId)
        ));
      
      res.json({ success: true, message: "Staff deleted successfully" });
    } catch (error) {
      console.error('Error deleting staff:', error);
      res.status(500).json({ message: "Failed to delete staff" });
    }
  });

  // Create staff (admin-created, auto-approved)
  app.post("/api/union/:unionId/staff", async (req, res) => {
    try {
      const { 
        name, phone, email, employeeId, 
        department, designationId, username, password,
        accessTier, assignedSegments
      } = req.body;
      
      if (!name || !phone || !department || !designationId || !employeeId || !username || !password) {
        return res.status(400).json({ message: "Missing required fields. Employee ID is required." });
      }
      
      const { UNION_STAFF_DESIGNATIONS } = await import("@shared/schema");
      const departmentDesignations = (UNION_STAFF_DESIGNATIONS as any)[department];
      const designation = departmentDesignations?.find((d: any) => d.id === designationId);
      
      if (!designation) {
        return res.status(400).json({ message: "Invalid department or designation" });
      }
      
      const existingStaff = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.username, username)
      });
      
      if (existingStaff) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);
      
      const [newStaff] = await db.insert(unionStaff)
        .values({
          unionId: req.params.unionId,
          name,
          phone,
          email: email || null,
          employeeId,
          department,
          designation: designation.name,
          designationId,
          level: designation.level,
          accessTier: accessTier || designation.accessTier,
          username,
          passwordHash,
          assignedSegments: assignedSegments || null,
          approvalStatus: 'approved',
          approvedBy: 'admin',
          approvedAt: new Date(),
          isActive: true,
        })
        .returning();
      
      res.json({ success: true, staff: newStaff });
    } catch (error) {
      console.error('Error creating staff:', error);
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  // Unified staff creation — unionId from auth session only
  app.post("/api/staff", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const unionId = (req.user as any)?.merchantId || (req.user as any)?.unionId || req.user?.id;
      if (!unionId) {
        return res.status(403).json({ message: "Could not determine union from session" });
      }

      const {
        name, phone, email, employeeId,
        department, designationId, username, password,
        accessTier, assignedSegments
      } = req.body;

      if (!name || !phone || !department || !designationId || !employeeId || !username || !password) {
        return res.status(400).json({ message: "Missing required fields. Employee ID is required." });
      }

      const actualUsername = username || employeeId;

      const { UNION_STAFF_DESIGNATIONS } = await import("@shared/schema");
      const departmentDesignations = (UNION_STAFF_DESIGNATIONS as any)[department];
      const designation = departmentDesignations?.find((d: any) => d.id === designationId);

      if (!designation) {
        return res.status(400).json({ message: "Invalid department or designation" });
      }

      const existingStaff = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.username, actualUsername)
      });
      if (existingStaff) {
        return res.status(400).json({ message: "Username/Employee ID already taken" });
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const [newStaff] = await db.insert(unionStaff)
        .values({
          unionId,
          name,
          phone,
          email: email || null,
          employeeId,
          department,
          designation: designation.name,
          designationId,
          level: designation.level,
          accessTier: accessTier || designation.accessTier,
          username: actualUsername,
          passwordHash,
          assignedSegments: assignedSegments || null,
          approvalStatus: 'approved',
          approvedBy: 'admin',
          approvedAt: new Date(),
          isActive: true,
        })
        .returning();

      res.json({ success: true, staff: newStaff });
    } catch (error) {
      console.error('Error creating staff (unified):', error);
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  // Unified staff listing — unionId from auth session, case-insensitive department filter
  app.get("/api/staff", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const unionId = (req.user as any)?.merchantId || (req.user as any)?.unionId || req.user?.id;
      if (!unionId) {
        return res.status(403).json({ message: "Could not determine union from session" });
      }

      let staffList = await db.query.unionStaff.findMany({
        where: eq(unionStaff.unionId, unionId),
        orderBy: [asc(unionStaff.level), asc(unionStaff.department)]
      });

      const department = req.query.department as string | undefined;
      if (department && department !== 'all') {
        const deptLower = department.toLowerCase();
        staffList = staffList.filter(s => {
          const sDept = (s.department || '').toLowerCase();
          if (deptLower === 'transport' || deptLower === 'delivery') {
            return sDept === 'transport' || sDept === 'delivery';
          }
          return sDept === deptLower;
        });
      }

      const enriched = staffList.map(s => {
        let assignedOffices: string[] = [];
        if (s.assignedOffice) {
          try { const parsed = JSON.parse(s.assignedOffice); if (Array.isArray(parsed)) assignedOffices = parsed; } catch {
            assignedOffices = [s.assignedOffice];
          }
        }
        return { ...s, assignedOffices };
      });

      res.json(enriched);
    } catch (error) {
      console.error('Error fetching staff (unified):', error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Reset staff password
  app.put("/api/union/:unionId/staff/:staffId/reset-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Hash new password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      const [updatedStaff] = await db.update(unionStaff)
        .set({
          passwordHash,
          updatedAt: new Date()
        })
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId)
        ))
        .returning();
      
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Auto-login as staff member (for Union admins)
  app.post("/api/union/:unionId/staff/:staffId/auto-login", async (req, res) => {
    try {
      const staffMember = await db.select()
        .from(unionStaff)
        .where(and(
          eq(unionStaff.id, req.params.staffId),
          eq(unionStaff.unionId, req.params.unionId),
          eq(unionStaff.approvalStatus, 'approved')
        ))
        .limit(1);
      
      if (!staffMember.length) {
        return res.status(404).json({ message: "Staff not found or not approved" });
      }
      
      const staff = staffMember[0];
      
      if (!staff.username) {
        return res.status(400).json({ message: "Staff has no username set" });
      }
      
      // Generate a temporary auto-login token (simple base64 encoded staff ID + timestamp)
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store token temporarily (in production, use Redis or database)
      // For now, we'll return the staff ID encoded with a simple signature
      const autoLoginData = {
        staffId: staff.id,
        unionId: staff.unionId,
        merchantId: staff.unionId,
        username: staff.username,
        name: staff.name,
        email: staff.email,
        role: 'staff',
        permissions: staff.permissions,
        accessTier: staff.accessTier,
        salesSegment: staff.salesSegment,
        assignedSegments: staff.assignedSegments,
        assignedOffice: staff.assignedOffice,
        department: staff.department,
        designation: staff.designation,
        designationId: staff.designationId,
        timestamp: Date.now()
      };
      
      res.json({ 
        success: true, 
        token: Buffer.from(JSON.stringify(autoLoginData)).toString('base64'),
        staff: {
          id: staff.id,
          name: staff.name,
          username: staff.username
        }
      });
    } catch (error) {
      console.error('Error creating auto-login session:', error);
      res.status(500).json({ message: "Failed to create auto-login session" });
    }
  });

  app.post("/api/union/:unionId/staff/:staffId/transfer", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, staffId } = req.params;
      const { targetUnionId, reason } = req.body;

      if (!targetUnionId) {
        return res.status(400).json({ message: "Target union ID is required" });
      }
      if (targetUnionId === unionId) {
        return res.status(400).json({ message: "Cannot transfer to the same union" });
      }

      const targetUnion = await storage.getMerchant(targetUnionId);
      if (!targetUnion) {
        return res.status(400).json({ message: "Target union does not exist" });
      }

      const staffMembers = await db.select().from(unionStaff)
        .where(and(eq(unionStaff.id, staffId), eq(unionStaff.unionId, unionId)))
        .limit(1);

      if (!staffMembers.length) {
        return res.status(404).json({ message: "Staff member not found in this union" });
      }

      const staff = staffMembers[0];
      const transferRecord = {
        fromUnionId: unionId,
        toUnionId: targetUnionId,
        transferDate: new Date().toISOString(),
        transferredBy: req.user?.id || 'admin',
        reason: reason || 'Transfer',
      };

      const existingHistory = Array.isArray(staff.transferHistory) ? staff.transferHistory : [];

      await db.update(unionStaff)
        .set({
          unionId: targetUnionId,
          transferHistory: [...existingHistory, transferRecord],
          updatedAt: new Date(),
        })
        .where(eq(unionStaff.id, staffId));

      res.json({
        success: true,
        message: `${staff.name} transferred successfully`,
        transfer: transferRecord,
      });
    } catch (error) {
      console.error('Error transferring staff:', error);
      res.status(500).json({ message: "Failed to transfer staff" });
    }
  });

}
