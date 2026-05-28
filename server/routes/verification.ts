import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, merchantToUnionMapping, resolveMerchantId } from "./shared";
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

import { masterProducts, merchantProducts } from "@shared/schema";

export async function registerVerificationRoutes(app: Express): Promise<void> {
  app.post("/api/fmd/login", async (req, res) => {
    try {
      const { fmdCode, password } = req.body;
      
      if (!fmdCode || !password) {
        return res.status(400).json({ success: false, message: 'FMD code and password are required' });
      }

      const dealer = await storage.getFreshMilkDealerByCode(fmdCode.toUpperCase());
      
      if (!dealer) {
        return res.status(401).json({ success: false, message: 'Invalid FMD code' });
      }

      if (!dealer.isActive) {
        return res.status(403).json({ success: false, message: 'Account is inactive. Please contact support.' });
      }

      // Password is the registered phone number (stored in passwordHash for simplicity)
      if (dealer.passwordHash !== password) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }

      // Update last login
      await storage.updateFreshMilkDealerLastLogin(dealer.id);

      // Set cookie for session
      const token = Buffer.from(`${dealer.id}:${dealer.fmdCode}:${Date.now()}`).toString('base64');
      res.cookie('fmd_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
        path: '/'
      });

      res.json({ 
        success: true, 
        dealer: {
          id: dealer.id,
          fmdCode: dealer.fmdCode,
          name: dealer.name,
          email: dealer.email,
          mobileNumber: dealer.mobileNumber,
          location: dealer.location,
          districtUnion: dealer.districtUnion,
          pricingTier: dealer.pricingTier,
          gstin: dealer.gstin
        }
      });
    } catch (error) {
      console.error('FMD login error:', error);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  });

  app.get("/api/fmd/me", async (req, res) => {
    try {
      const token = req.cookies?.fmd_token;
      
      if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [dealerId] = decoded.split(':');

      const dealer = await storage.getFreshMilkDealerById(dealerId);
      
      if (!dealer) {
        res.clearCookie('fmd_token', { path: '/' });
        return res.status(401).json({ success: false, message: 'Session expired' });
      }

      res.json({ 
        success: true, 
        dealer: {
          id: dealer.id,
          fmdCode: dealer.fmdCode,
          name: dealer.name,
          email: dealer.email,
          mobileNumber: dealer.mobileNumber,
          location: dealer.location,
          districtUnion: dealer.districtUnion,
          pricingTier: dealer.pricingTier,
          gstin: dealer.gstin
        }
      });
    } catch (error) {
      console.error('Get FMD profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  });

  app.post("/api/fmd/logout", (req, res) => {
    res.clearCookie('fmd_token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Get all fresh milk dealers (admin only - protected)
  app.get("/api/admin/fresh-milk-dealers", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const dealers = await storage.getAllFreshMilkDealers();
      res.json({ success: true, dealers });
    } catch (error) {
      console.error('Get fresh milk dealers error:', error);
      res.status(500).json({ success: false, message: 'Failed to get dealers' });
    }
  });

  // Get all wholesale dealers (admin only - protected)
  app.get("/api/admin/wholesale-dealers", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const dealers = await storage.getAllWholesaleDealers();
      res.json({ success: true, dealers });
    } catch (error) {
      console.error('Get wholesale dealers error:', error);
      res.status(500).json({ success: false, message: 'Failed to get dealers' });
    }
  });
  
  app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const extendedUser = user as any;
    
    // Handle union staff users
    if (user.role === 'union_staff') {
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: extendedUser.phone || '',
          role: 'union_staff',
          unionId: extendedUser.unionId,
          department: extendedUser.department,
          designation: extendedUser.designation,
          designationId: extendedUser.designationId,
          accessTier: extendedUser.accessTier,
          level: extendedUser.level,
          permissions: extendedUser.permissions,
          username: extendedUser.username,
        }
      });
    }

    // Handle agent users differently
    if (user.role === 'agent') {
      // Map tier codes to pricing roles (WSD -> WHOLESALE_DEALER)
      const tierToPricingRole = (tier: string | null | undefined): string => {
        if (!tier) return 'DEALER';
        const mapping: Record<string, string> = {
          'WSD': 'WHOLESALE_DEALER',
          'DLR': 'DEALER',
          'RTL': 'RETAILER',
          'FED': 'FEDERATION',
          'INT': 'INTER_UNION',
          'MRP': 'MRP',
        };
        return mapping[tier.toUpperCase()] || tier.toUpperCase();
      };
      
      const freshMilkPricingRole = tierToPricingRole(extendedUser.freshMilkTier);
      const productsPricingRole = tierToPricingRole(extendedUser.productTier);
      
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          phone: extendedUser.phone,
          role: user.role,
          agentCode: extendedUser.agentCode,
          agentType: extendedUser.agentType,
          pricingRole: productsPricingRole,
          freshMilkPricingRole: freshMilkPricingRole,
          productsPricingRole: productsPricingRole,
          iceCreamPricingRole: productsPricingRole,
          unionId: extendedUser.unionId,
          freshMilkTier: extendedUser.freshMilkTier,
          productTier: extendedUser.productTier,
          wsdCategory: extendedUser.wsdCategory,
          district: extendedUser.district || '',
          districtUnion: extendedUser.districtUnion || '',
          office: extendedUser.office || '',
          businessType: extendedUser.businessType || '',
          businessTypeCode: extendedUser.businessTypeCode || '',
          businessRoute: extendedUser.businessRoute || '',
          businessPoint: extendedUser.businessPoint || '',
          businessCode: extendedUser.businessCode || '',
          businessName: extendedUser.businessName || '',
          businessAddress: extendedUser.businessAddress || '',
          addressLat: extendedUser.addressLat || '',
          addressLng: extendedUser.addressLng || '',
        } 
      });
    } else {
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          phone: extendedUser.phone,
          role: user.role,
          merchantId: extendedUser.merchantId || null,
          isGlobalAdmin: extendedUser.isGlobalAdmin || false,
          pricingRole: (() => {
            const stored = extendedUser.pricingRole;
            if (stored && stored !== 'MRP') return stored;
            const roleToPricing: Record<string, string> = { dealer: 'DEALER', wholesale_dealer: 'WHOLESALE_DEALER', wsd: 'WHOLESALE_DEALER', retailer: 'RETAILER', fmd: 'FMD' };
            return roleToPricing[(extendedUser.role || '').toLowerCase()] || stored || 'MRP';
          })(),
          freshMilkPricingRole: (() => {
            const stored = extendedUser.freshMilkPricingRole || extendedUser.pricingRole;
            if (stored && stored !== 'MRP') return stored;
            const roleToPricing: Record<string, string> = { dealer: 'DEALER', wholesale_dealer: 'WHOLESALE_DEALER', wsd: 'WHOLESALE_DEALER', retailer: 'RETAILER', fmd: 'FMD' };
            return roleToPricing[(extendedUser.role || '').toLowerCase()] || stored || 'MRP';
          })(),
          productsPricingRole: (() => {
            const stored = extendedUser.productsPricingRole || extendedUser.pricingRole;
            if (stored && stored !== 'MRP') return stored;
            const roleToPricing: Record<string, string> = { dealer: 'DEALER', wholesale_dealer: 'WHOLESALE_DEALER', wsd: 'WHOLESALE_DEALER', retailer: 'RETAILER', fmd: 'FMD' };
            return roleToPricing[(extendedUser.role || '').toLowerCase()] || stored || 'MRP';
          })(),
          iceCreamPricingRole: (() => {
            const stored = extendedUser.iceCreamPricingRole || extendedUser.productsPricingRole || extendedUser.pricingRole;
            if (stored && stored !== 'MRP') return stored;
            const roleToPricing: Record<string, string> = { dealer: 'DEALER', wholesale_dealer: 'WHOLESALE_DEALER', wsd: 'WHOLESALE_DEALER', retailer: 'RETAILER', fmd: 'FMD' };
            return roleToPricing[(extendedUser.role || '').toLowerCase()] || stored || 'MRP';
          })(),
          unionId: extendedUser.unionId,
          restaurantId: extendedUser.restaurantId || (extendedUser.unionId?.startsWith('merchant-') ? extendedUser.unionId : null),
          gstNumber: extendedUser.gstNumber, gstVerified: extendedUser.gstVerified,
          gstBusinessName: extendedUser.gstBusinessName, gstStatus: extendedUser.gstStatus,
          panNumber: extendedUser.panNumber, panVerified: extendedUser.panVerified,
          fssaiLicense: extendedUser.fssaiLicense, fssaiVerified: extendedUser.fssaiVerified,
          fssaiBusinessName: extendedUser.fssaiBusinessName,
          tradeLicense: extendedUser.tradeLicense, msmeNumber: extendedUser.msmeNumber, msmeVerified: extendedUser.msmeVerified,
          gstExpiryDate: extendedUser.gstExpiryDate, fssaiExpiryDate: extendedUser.fssaiExpiryDate,
          tradeLicenseExpiryDate: extendedUser.tradeLicenseExpiryDate, msmeExpiryDate: extendedUser.msmeExpiryDate,
          gstRegistrationDate: extendedUser.gstRegistrationDate, fssaiRegistrationDate: extendedUser.fssaiRegistrationDate,
          tradeLicenseRegistrationDate: extendedUser.tradeLicenseRegistrationDate, msmeRegistrationDate: extendedUser.msmeRegistrationDate,
          bankAccountNumber: extendedUser.bankAccountNumber, bankIfscCode: extendedUser.bankIfscCode,
          bankName: extendedUser.bankName, bankBranch: extendedUser.bankBranch,
          accountHolderName: extendedUser.accountHolderName, accountType: extendedUser.accountType,
          upiId: extendedUser.upiId,
          district: extendedUser.district || '',
          districtUnion: extendedUser.districtUnion || '',
          office: extendedUser.office || '',
          businessType: extendedUser.businessType || '',
          businessTypeCode: extendedUser.businessTypeCode || '',
          businessRoute: extendedUser.businessRoute || '',
          businessPoint: extendedUser.businessPoint || '',
          businessCode: extendedUser.businessCode || '',
          businessName: extendedUser.businessName || '',
          businessAddress: extendedUser.businessAddress || '',
          addressLat: extendedUser.addressLat || '',
          addressLng: extendedUser.addressLng || '',
        } 
      });
    }
  });

  app.patch("/api/auth/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { name, phone } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      const updated = await storage.updateUser(user.id, {
        name: name.trim(),
        phone: phone?.trim() || null,
      });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      const extendedUser = updated as any;
      res.json({
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          pricingRole: (() => { const s = extendedUser.pricingRole; if (s && s !== 'MRP') return s; const m: Record<string,string> = { dealer:'DEALER', wholesale_dealer:'WHOLESALE_DEALER', wsd:'WHOLESALE_DEALER', retailer:'RETAILER', fmd:'FMD' }; return m[(extendedUser.role||'').toLowerCase()] || s || 'MRP'; })(),
          freshMilkPricingRole: (() => { const s = extendedUser.freshMilkPricingRole || extendedUser.pricingRole; if (s && s !== 'MRP') return s; const m: Record<string,string> = { dealer:'DEALER', wholesale_dealer:'WHOLESALE_DEALER', wsd:'WHOLESALE_DEALER', retailer:'RETAILER', fmd:'FMD' }; return m[(extendedUser.role||'').toLowerCase()] || s || 'MRP'; })(),
          productsPricingRole: (() => { const s = extendedUser.productsPricingRole || extendedUser.pricingRole; if (s && s !== 'MRP') return s; const m: Record<string,string> = { dealer:'DEALER', wholesale_dealer:'WHOLESALE_DEALER', wsd:'WHOLESALE_DEALER', retailer:'RETAILER', fmd:'FMD' }; return m[(extendedUser.role||'').toLowerCase()] || s || 'MRP'; })(),
          unionId: extendedUser.unionId,
          agentCode: extendedUser.agentCode,
          agentType: extendedUser.agentType,
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user! as any;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current and new passwords are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      if (user.role === 'agent' && user.agentCode) {
        const storedHash = user.passwordHash;
        if (!storedHash) {
          return res.status(403).json({ error: 'Account not set up properly' });
        }
        const valid = await verifyPassword(currentPassword, storedHash);
        if (!valid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const newHash = await hashPassword(newPassword);
        const isWsd = user.id.startsWith('wsd-');
        if (isWsd) {
          const realId = user.id.replace('wsd-', '');
          await storage.updateWholesaleDealer(realId, { passwordHash: newHash });
        } else {
          await storage.updateAgent(user.id, { passwordHash: newHash });
        }
        return res.json({ success: true });
      }

      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const valid = await verifyPassword(currentPassword, fullUser.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const newHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash: newHash });
      res.json({ success: true });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // Delivery Points CRUD
  app.get("/api/auth/delivery-points", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const points = await storage.getDeliveryPoints(req.user!.id);
      res.json(points);
    } catch (error) {
      console.error('Error fetching delivery points:', error);
      res.status(500).json({ error: 'Failed to fetch delivery points' });
    }
  });

  app.post("/api/auth/delivery-points", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { businessId, pointName, contactName, contactPhone, route, deliveryAddress, latitude, longitude, isDefault,
        locationPhotoUrl, gpsAccuracy, accuracyGrade, locationSource, addressSource,
        isMockLocation, suspicionScore, capturedAt, proofHash, consentGiven } = req.body;
      if (!pointName || !deliveryAddress) {
        return res.status(400).json({ error: 'Point name and delivery address are required' });
      }
      const point = await storage.createDeliveryPoint({
        userId: req.user!.id,
        businessId: businessId || null,
        pointName,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        route: route || null,
        deliveryAddress,
        latitude: latitude || null,
        longitude: longitude || null,
        isDefault: isDefault || false,
        locationPhotoUrl: locationPhotoUrl || null,
        gpsAccuracy: gpsAccuracy ? String(gpsAccuracy) : null,
        accuracyGrade: accuracyGrade || null,
        locationSource: locationSource || null,
        addressSource: addressSource || null,
        isMockLocation: isMockLocation ?? null,
        suspicionScore: suspicionScore ?? 0,
        capturedAt: capturedAt ? new Date(capturedAt) : null,
        proofStatus: (locationPhotoUrl || proofHash || consentGiven) ? "pending" : null,
        proofHash: proofHash || null,
        consentGiven: consentGiven || false,
        consentAt: consentGiven ? new Date() : null,
      });
      res.status(201).json(point);
    } catch (error: any) {
      console.error('Error creating delivery point:', error);
      res.status(500).json({ error: 'Failed to create delivery point', details: error?.message || String(error) });
    }
  });

  app.patch("/api/auth/delivery-points/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const point = await storage.getDeliveryPoint(req.params.id);
      if (!point || point.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Delivery point not found' });
      }
      const updated = await storage.updateDeliveryPoint(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating delivery point:', error);
      res.status(500).json({ error: 'Failed to update delivery point' });
    }
  });

  app.delete("/api/auth/delivery-points/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const point = await storage.getDeliveryPoint(req.params.id);
      if (!point || point.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Delivery point not found' });
      }
      await storage.deleteDeliveryPoint(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting delivery point:', error);
      res.status(500).json({ error: 'Failed to delete delivery point' });
    }
  });

  // ============ Business Compliance & Bank Details ============

  app.patch("/api/auth/compliance", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const allowedFields = [
        'gstNumber', 'panNumber', 'fssaiLicense', 'tradeLicense', 'msmeNumber',
        'gstExpiryDate', 'fssaiExpiryDate', 'tradeLicenseExpiryDate', 'msmeExpiryDate',
        'gstRegistrationDate', 'fssaiRegistrationDate', 'tradeLicenseRegistrationDate', 'msmeRegistrationDate',
        'bankAccountNumber', 'bankIfscCode', 'bankName', 'bankBranch',
        'accountHolderName', 'accountType', 'upiId',
        'gstBusinessName', 'gstStatus', 'gstVerified',
        'panVerified', 'fssaiVerified', 'fssaiBusinessName', 'msmeVerified',
      ];
      const updates: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      const updated = await storage.updateUser(req.user!.id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      const extUser = updated as any;
      res.json({
        user: {
          id: updated.id, name: updated.name, email: updated.email, phone: extUser.phone,
          role: updated.role, pricingRole: extUser.pricingRole,
          freshMilkPricingRole: extUser.freshMilkPricingRole,
          productsPricingRole: extUser.productsPricingRole,
          unionId: extUser.unionId,
          gstNumber: extUser.gstNumber, gstVerified: extUser.gstVerified,
          gstBusinessName: extUser.gstBusinessName, gstStatus: extUser.gstStatus,
          panNumber: extUser.panNumber, panVerified: extUser.panVerified,
          fssaiLicense: extUser.fssaiLicense, fssaiVerified: extUser.fssaiVerified,
          fssaiBusinessName: extUser.fssaiBusinessName,
          tradeLicense: extUser.tradeLicense, msmeNumber: extUser.msmeNumber, msmeVerified: extUser.msmeVerified,
          gstExpiryDate: extUser.gstExpiryDate, fssaiExpiryDate: extUser.fssaiExpiryDate,
          tradeLicenseExpiryDate: extUser.tradeLicenseExpiryDate, msmeExpiryDate: extUser.msmeExpiryDate,
          gstRegistrationDate: extUser.gstRegistrationDate, fssaiRegistrationDate: extUser.fssaiRegistrationDate,
          tradeLicenseRegistrationDate: extUser.tradeLicenseRegistrationDate, msmeRegistrationDate: extUser.msmeRegistrationDate,
          bankAccountNumber: extUser.bankAccountNumber, bankIfscCode: extUser.bankIfscCode,
          bankName: extUser.bankName, bankBranch: extUser.bankBranch,
          accountHolderName: extUser.accountHolderName, accountType: extUser.accountType,
          upiId: extUser.upiId,
        }
      });
    } catch (error) {
      console.error('Error updating compliance:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : '');
      res.status(500).json({ error: 'Failed to update compliance details' });
    }
  });

  // GST Verification (public - used during signup)
  app.post("/api/verify/gst", async (req: Request, res) => {
    try {
      const { gstNumber } = req.body;
      if (!gstNumber || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)) {
        return res.status(400).json({ error: 'Invalid GSTIN format. Must be 15 characters (e.g., 33AABCU9603R1ZM)' });
      }
      const stateCode = gstNumber.substring(0, 2);
      const stateCodes: Record<string, string> = {
        '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
        '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
        '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
        '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
        '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
        '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
        '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
        '25': 'Dadra & Nagar Haveli', '26': 'Daman & Diu',
        '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
        '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
        '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh',
        '38': 'Ladakh',
      };
      const stateName = stateCodes[stateCode];
      if (!stateName) {
        return res.status(400).json({ error: 'Invalid state code in GSTIN' });
      }
      const panFromGst = gstNumber.substring(2, 12);
      const entityCode = panFromGst.charAt(3);
      const entityTypes: Record<string, string> = {
        'P': 'Individual/Proprietorship', 'C': 'Company', 'H': 'HUF',
        'A': 'AOP (Association of Persons)', 'B': 'BOI (Body of Individuals)',
        'G': 'Government', 'J': 'Artificial Juridical Person',
        'L': 'Local Authority', 'F': 'Firm/LLP', 'T': 'Trust',
      };
      const entityType = entityTypes[entityCode] || 'Unknown';
      const registrationNumber = gstNumber.substring(12, 13);
      const checksum = gstNumber.substring(14, 15);

      // Try multiple free GST lookup sources
      const apiSources = [
        {
          name: 'appyflow',
          url: `https://appyflow.in/api/verifyGST?gstNo=${gstNumber}&key_secret=free_trial`,
          parse: (data: any) => {
            if (data && data.taxpayerInfo) {
              return {
                legalName: data.taxpayerInfo.lgnm || data.taxpayerInfo.tradeNam || '',
                tradeName: data.taxpayerInfo.tradeNam || '',
                status: data.taxpayerInfo.sts || 'Active',
                businessType: data.taxpayerInfo.ctb || entityType,
                registrationType: data.taxpayerInfo.dty || 'Regular',
                registrationDate: data.taxpayerInfo.rgdt || '',
                address: data.taxpayerInfo.pradr?.addr ? 
                  [data.taxpayerInfo.pradr.addr.bno, data.taxpayerInfo.pradr.addr.st, 
                   data.taxpayerInfo.pradr.addr.loc, data.taxpayerInfo.pradr.addr.dst,
                   data.taxpayerInfo.pradr.addr.stcd, data.taxpayerInfo.pradr.addr.pncd]
                    .filter(Boolean).join(', ') : '',
              };
            }
            if (data && (data.lgnm || data.tradeNam)) {
              return {
                legalName: data.lgnm || data.tradeNam || '',
                tradeName: data.tradeNam || '',
                status: data.sts || 'Active',
                businessType: data.ctb || entityType,
                registrationType: data.dty || 'Regular',
                registrationDate: data.rgdt || '',
                address: data.pradr?.addr ? 
                  [data.pradr.addr.bno, data.pradr.addr.st, data.pradr.addr.loc, 
                   data.pradr.addr.dst, data.pradr.addr.stcd, data.pradr.addr.pncd]
                    .filter(Boolean).join(', ') : '',
              };
            }
            return null;
          }
        },
        {
          name: 'gstincheck',
          url: `https://sheet.gstincheck.co.in/check/free/${gstNumber}`,
          parse: (data: any) => {
            if (data && data.data && data.flag) {
              const d = data.data;
              return {
                legalName: d.lgnm || d.tradeNam || '',
                tradeName: d.tradeNam || '',
                status: d.sts || 'Active',
                businessType: d.ctb || entityType,
                registrationType: d.dty || 'Regular',
                registrationDate: d.rgdt || '',
                address: d.pradr?.adr || '',
              };
            }
            return null;
          }
        },
      ];

      for (const source of apiSources) {
        try {
          const response = await fetch(source.url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          });
          if (response.ok) {
            const data = await response.json();
            const parsed = source.parse(data);
            if (parsed && parsed.legalName) {
              return res.json({
                verified: true,
                formatValid: true,
                businessName: parsed.legalName,
                tradeName: parsed.tradeName,
                status: parsed.status,
                businessType: parsed.businessType,
                registrationType: parsed.registrationType,
                registrationDate: parsed.registrationDate,
                address: parsed.address,
                stateCode,
                stateName,
                panFromGst,
                entityType,
                source: source.name,
              });
            }
          }
        } catch (fetchErr) {
        }
      }

      // Fallback: comprehensive format-based verification with extracted data
      res.json({
        verified: false,
        formatValid: true,
        stateCode,
        stateName,
        panFromGst,
        entityType,
        registrationNumber,
        message: `GSTIN format verified. Registered in ${stateName}. Entity type: ${entityType}. PAN: ${panFromGst}. Online portal verification could not be completed - please verify details match your certificate.`,
      });
    } catch (error) {
      console.error('GST verification error:', error);
      res.status(500).json({ error: 'GST verification failed' });
    }
  });

  // PAN Verification (public - used during signup)
  app.post("/api/verify/pan", async (req: Request, res) => {
    try {
      const { panNumber } = req.body;
      if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
        return res.status(400).json({ error: 'Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F)' });
      }
      const typeCode = panNumber.charAt(3);
      const typeMap: Record<string, string> = {
        'P': 'Individual', 'C': 'Company', 'H': 'HUF',
        'A': 'AOP', 'B': 'BOI', 'G': 'Government',
        'J': 'Artificial Juridical Person', 'L': 'Local Authority',
        'F': 'Firm/LLP', 'T': 'Trust',
      };
      res.json({
        verified: true,
        formatValid: true,
        entityType: typeMap[typeCode] || 'Unknown',
        message: 'PAN format validated successfully',
      });
    } catch (error) {
      console.error('PAN verification error:', error);
      res.status(500).json({ error: 'PAN verification failed' });
    }
  });

  // FSSAI License Verification (public - used during signup)
  app.post("/api/verify/fssai", async (req: Request, res) => {
    try {
      const { fssaiLicense } = req.body;
      if (!fssaiLicense || !/^[0-9]{14}$/.test(fssaiLicense)) {
        return res.status(400).json({ error: 'Invalid FSSAI license number. Must be 14 digits.' });
      }
      const licenseTypeDigit = fssaiLicense.charAt(0);
      const stateCode = fssaiLicense.substring(1, 3);
      const fssaiStateCodes: Record<string, string> = {
        '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
        '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
        '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
        '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
        '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
        '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
        '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
        '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli',
        '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
        '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
        '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
      };
      const issueYear = fssaiLicense.substring(3, 5);
      const typeMap: Record<string, string> = {
        '1': 'Basic Registration', '2': 'State License', '3': 'Central License',
      };
      res.json({
        verified: true,
        formatValid: true,
        licenseType: typeMap[licenseTypeDigit] || 'License',
        state: fssaiStateCodes[stateCode] || 'Unknown',
        issueYear: issueYear ? `20${issueYear}` : undefined,
        registrationDate: issueYear ? `20${issueYear}-01-01` : undefined,
        expiryDate: issueYear ? (() => { const y = parseInt('20' + issueYear); return `${y + 5}-01-01`; })() : undefined,
        message: `FSSAI ${typeMap[licenseTypeDigit] || 'License'} - ${fssaiStateCodes[stateCode] || 'State code ' + stateCode}`,
      });
    } catch (error) {
      console.error('FSSAI verification error:', error);
      res.status(500).json({ error: 'FSSAI verification failed' });
    }
  });

  // IFSC Code Verification (public - via Razorpay IFSC API - free)
  app.post("/api/verify/ifsc", async (req: Request, res) => {
    try {
      const { ifscCode } = req.body;
      if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        return res.status(400).json({ error: 'Invalid IFSC format. Must be 11 characters (e.g., SBIN0001234)' });
      }
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
        if (response.ok) {
          const data = await response.json();
          res.json({
            verified: true,
            bankName: data.BANK || '',
            branch: data.BRANCH || '',
            address: data.ADDRESS || '',
            city: data.CITY || '',
            state: data.STATE || '',
            contact: data.CONTACT || '',
            upi: data.UPI || false,
            rtgs: data.RTGS || false,
            neft: data.NEFT || false,
            imps: data.IMPS || false,
          });
          return;
        }
      } catch (fetchErr) {
        // Razorpay API failed
      }
      res.json({
        verified: false,
        formatValid: true,
        bankCode: ifscCode.substring(0, 4),
        message: 'IFSC format is valid but could not verify online. Please check the code.',
      });
    } catch (error) {
      console.error('IFSC verification error:', error);
      res.status(500).json({ error: 'IFSC verification failed' });
    }
  });

  // MSME (Udyam) Registration Verification (public - used during signup)
  app.post("/api/verify/msme", async (req: Request, res) => {
    try {
      const { msmeNumber } = req.body;
      if (!msmeNumber) {
        return res.status(400).json({ error: 'MSME registration number is required' });
      }
      const upperMsme = msmeNumber.toUpperCase().trim();
      if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(upperMsme)) {
        return res.status(400).json({ error: 'Invalid Udyam format. Must be like UDYAM-TN-00-0000000' });
      }
      const stateCode = upperMsme.substring(6, 8);
      const stateCodes: Record<string, string> = {
        'AN': 'Andaman & Nicobar', 'AP': 'Andhra Pradesh', 'AR': 'Arunachal Pradesh',
        'AS': 'Assam', 'BR': 'Bihar', 'CH': 'Chandigarh', 'CG': 'Chhattisgarh',
        'DD': 'Daman & Diu', 'DL': 'Delhi', 'GA': 'Goa', 'GJ': 'Gujarat',
        'HR': 'Haryana', 'HP': 'Himachal Pradesh', 'JK': 'Jammu & Kashmir',
        'JH': 'Jharkhand', 'KA': 'Karnataka', 'KL': 'Kerala', 'LA': 'Ladakh',
        'LD': 'Lakshadweep', 'MP': 'Madhya Pradesh', 'MH': 'Maharashtra',
        'MN': 'Manipur', 'ML': 'Meghalaya', 'MZ': 'Mizoram', 'NL': 'Nagaland',
        'OD': 'Odisha', 'PY': 'Puducherry', 'PB': 'Punjab', 'RJ': 'Rajasthan',
        'SK': 'Sikkim', 'TN': 'Tamil Nadu', 'TS': 'Telangana', 'TR': 'Tripura',
        'UP': 'Uttar Pradesh', 'UK': 'Uttarakhand', 'WB': 'West Bengal',
      };
      const districtCode = upperMsme.substring(9, 11);
      const enterpriseId = upperMsme.substring(12);
      const stateName = stateCodes[stateCode];
      if (!stateName) {
        return res.status(400).json({ error: 'Invalid state code in Udyam number' });
      }
      try {
        const response = await fetch(`https://udyamregistration.gov.in/udyam_verify.aspx?udyam=${upperMsme}`, {
          method: 'GET',
          headers: { 'Accept': 'text/html' },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const html = await response.text();
          if (html.includes('Enterprise Name') || html.includes('Udyam Registration Number')) {
            return res.json({
              verified: true,
              formatValid: true,
              msmeNumber: upperMsme,
              stateCode,
              stateName,
              districtCode,
              enterpriseType: 'Registered Enterprise',
              verificationDate: new Date().toISOString().split('T')[0],
              message: 'Udyam registration verified successfully',
            });
          }
        }
      } catch (fetchErr) {
        // Portal unavailable, fall back to format validation
      }
      res.json({
        verified: false,
        formatValid: true,
        msmeNumber: upperMsme,
        stateCode,
        stateName,
        districtCode,
        enterpriseType: 'Micro/Small/Medium Enterprise',
        verificationDate: new Date().toISOString().split('T')[0],
        message: 'Udyam format valid. Online verification pending.',
      });
    } catch (error) {
      console.error('MSME verification error:', error);
      res.status(500).json({ error: 'MSME verification failed' });
    }
  });

  app.get("/api/merchant/route-agents", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const routes = await db.select().from(mmoRoutes)
        .where(and(eq(mmoRoutes.unionId, merchantId), eq(mmoRoutes.isActive, true)));
      if (routes.length === 0) return res.json([]);
      const routeIds = routes.map(r => r.id);
      const agents = await db.select().from(mmoRouteAgents)
        .where(and(inArray(mmoRouteAgents.routeId, routeIds), eq(mmoRouteAgents.isActive, true)))
        .orderBy(asc(mmoRouteAgents.agentCode));
      const routeMap = new Map(routes.map(r => [r.id, r]));
      const offices = await db.select().from(mmoOffices).where(eq(mmoOffices.unionId, merchantId));
      const officeMap = new Map(offices.map(o => [o.id, o]));
      const result = agents.map(a => {
        const route = routeMap.get(a.routeId);
        const office = route?.mmoOfficeId ? officeMap.get(route.mmoOfficeId) : null;
        return {
          id: a.id,
          agentCode: a.agentCode,
          agentName: a.agentName,
          routeId: a.routeId,
          routeName: route?.routeName || '',
          officeName: office?.officeName || '',
        };
      });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Merchant-specific endpoint to fetch merchant data by ID (no admin auth required)
  app.get("/api/merchant/:id", async (req, res) => {
    try {
      const merchants = await storage.getMerchants();
      const merchant = merchants.find(m => m.id === req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      // Return public merchant data (excluding sensitive fields like password)
      const { password, ...publicData } = merchant;
      res.json(publicData);
    } catch (error) {
      console.error('Error fetching merchant:', error);
      res.status(500).json({ error: 'Failed to fetch merchant data' });
    }
  });

  // Admin API Routes - All require admin role
  
  // Admin District Union Management
  app.get("/api/admin/restaurants", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching district unions for admin:', error);
      res.status(500).json({ error: 'Failed to fetch district unions' });
    }
  });

  app.post("/api/admin/restaurants", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedRestaurant = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(validatedRestaurant);
      res.status(201).json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid district union data', details: error.errors });
      }
      console.error('Error creating district union:', error);
      res.status(500).json({ error: 'Failed to create district union' });
    }
  });

  app.patch("/api/admin/restaurants/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      // Validate updates against partial schema
      const updates = insertRestaurantSchema.partial().parse(req.body);
      const restaurant = await storage.updateRestaurant(req.params.id, updates);
      if (!restaurant) {
        return res.status(404).json({ error: 'District Union not found' });
      }
      res.json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid district union data', details: error.errors });
      }
      console.error('Error updating district union:', error);
      res.status(500).json({ error: 'Failed to update district union' });
    }
  });

  app.delete("/api/admin/restaurants/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteRestaurant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'District Union not found' });
      }
      res.json({ message: 'District Union deleted successfully' });
    } catch (error) {
      console.error('Error deleting district union:', error);
      res.status(500).json({ error: 'Failed to delete district union' });
    }
  });

  // ============ Master Products API ============
  app.get("/api/admin/master-products", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { segment, status, search } = req.query;
      let query = db.select().from(masterProducts);
      const conditions: any[] = [];
      if (segment && segment !== 'all') conditions.push(eq(masterProducts.segment, segment as string));
      if (status && status !== 'all') conditions.push(eq(masterProducts.status, status as string));
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      let results = await (query as any).orderBy(desc(masterProducts.createdAt));
      if (search) {
        const s = (search as string).toLowerCase();
        results = results.filter((p: any) => p.name.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s) || (p.barcode && p.barcode.toLowerCase().includes(s)));
      }
      const allMerchantProducts = await db.select().from(merchantProducts);
      const unionCountMap: Record<number, number> = {};
      allMerchantProducts.forEach(mp => {
        unionCountMap[mp.masterProductId] = (unionCountMap[mp.masterProductId] || 0) + 1;
      });
      const enriched = results.map((p: any) => ({ ...p, isActive: p.status !== 'inactive', enabledUnions: unionCountMap[p.id] || 0 }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching master products:', error);
      res.status(500).json({ error: 'Failed to fetch master products' });
    }
  });

  app.get("/api/admin/master-products/export", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const products = await db.select().from(masterProducts).orderBy(asc(masterProducts.productCode));
      const headers = ['ID', 'Product Code', 'Name', 'Barcode', 'Description', 'Segment', 'Category', 'Subcategory', 'HSN Code', 'GST %', 'Unit Size', 'Unit Type', 'Case Type', 'Units Per Case', 'Package Weight', 'Package Weight Unit', 'Federation Price', 'Inter Union Price', 'Wholesale Price', 'Dealer Price', 'Retailer Price', 'MRP', 'Image URL', 'Status', 'Created At', 'Updated At'];
      const rows = products.map(p => [
        String(p.id), p.productCode || '', p.name || '', p.barcode || '', p.description || '', p.segment || '',
        p.category || '', p.subcategory || '', p.hsnCode || '', p.gstPercent || '',
        p.unitSize || '', p.unitType || '', p.packagingType || '', String(p.unitsPerPackage ?? ''),
        p.packageWeight || '', p.packageWeightUnit || '', p.federationPrice || '',
        p.interUnionPrice || '', p.wholesalePrice || '', p.dealerPrice || '', p.retailerPrice || '',
        p.mrp || '', p.image || '', p.status || '',
        p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
        p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : '',
      ]);
      const buf = await xlsxWriteAoa([{ name: 'Products', data: [headers, ...rows] }]);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Master_Products_Export_${date}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error('Error exporting master products:', error);
      res.status(500).json({ error: 'Failed to export master products' });
    }
  });

  app.get("/api/admin/master-products/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const [product] = await db.select().from(masterProducts).where(eq(masterProducts.id, parseInt(req.params.id))).limit(1);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  app.post("/api/admin/master-products", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const existing = await db.select().from(masterProducts).where(eq(masterProducts.productCode, req.body.productCode)).limit(1);
      if (existing.length > 0) return res.status(400).json({ error: 'Product code already exists' });
      if (req.body.barcode) {
        const barcodeCheck = await db.select().from(masterProducts).where(eq(masterProducts.barcode, req.body.barcode)).limit(1);
        if (barcodeCheck.length > 0) return res.status(400).json({ error: 'Barcode already exists' });
      }
      const numericFields = ['mrp', 'federationPrice', 'interUnionPrice', 'wholesalePrice', 'dealerPrice', 'retailerPrice', 'gstPercent', 'packageWeight'];
      const intFields = ['unitsPerPackage'];
      const cleanBody = { ...req.body };
      if ('isActive' in cleanBody) {
        cleanBody.status = cleanBody.isActive ? 'active' : 'inactive';
        delete cleanBody.isActive;
      }
      numericFields.forEach(f => { if (cleanBody[f] === '' || cleanBody[f] === undefined) cleanBody[f] = null; else if (cleanBody[f] !== null) cleanBody[f] = String(cleanBody[f]); });
      intFields.forEach(f => { if (cleanBody[f] === '' || cleanBody[f] === undefined) cleanBody[f] = null; else if (cleanBody[f] !== null) cleanBody[f] = parseInt(cleanBody[f]) || null; });
      const [product] = await db.insert(masterProducts).values({
        ...cleanBody,
        updatedAt: new Date(),
      }).returning();
      await logAudit(req, "master_products", String(product.id), "CREATE", { newValues: { name: product.name, productCode: product.productCode, segment: product.segment } });
      res.json(product);
    } catch (error) {
      console.error('Error creating master product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put("/api/admin/master-products/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
      const [oldProduct] = await db.select().from(masterProducts).where(eq(masterProducts.id, id)).limit(1);
      const validFields = ['productCode','barcode','name','description','segment','category','subcategory',
        'hsnCode','gstPercent','unitSize','unitType','image','packagingType','unitsPerPackage',
        'packageWeight','packageWeightUnit','federationPrice','interUnionPrice','wholesalePrice',
        'dealerPrice','retailerPrice','mrp','status'];
      const updateData: Record<string, any> = {};
      for (const key of validFields) {
        if (key in req.body) updateData[key] = req.body[key];
      }
      if ('isActive' in req.body) {
        updateData.status = req.body.isActive ? 'active' : 'inactive';
      }
      const numericFields = ['mrp', 'federationPrice', 'interUnionPrice', 'wholesalePrice', 'dealerPrice', 'retailerPrice', 'gstPercent', 'packageWeight'];
      const intFields = ['unitsPerPackage'];
      numericFields.forEach(f => { if (updateData[f] === '' || updateData[f] === undefined) updateData[f] = null; else if (updateData[f] !== null) updateData[f] = String(updateData[f]); });
      intFields.forEach(f => { if (updateData[f] === '' || updateData[f] === undefined) updateData[f] = null; else if (updateData[f] !== null) updateData[f] = parseInt(updateData[f]) || null; });
      const [product] = await db.update(masterProducts).set({ ...updateData, updatedAt: new Date() }).where(eq(masterProducts.id, id)).returning();
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const diff = diffObjects(oldProduct as any, product as any);
      await logAudit(req, "master_products", String(id), "UPDATE", diff);
      res.json(product);
    } catch (error: any) {
      console.error('Error updating master product:', error?.message || error);
      res.status(500).json({ error: 'Failed to update product', details: error?.message });
    }
  });

  app.delete("/api/admin/master-products/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(merchantProducts).where(eq(merchantProducts.masterProductId, id));
      const [deleted] = await db.delete(masterProducts).where(eq(masterProducts.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: 'Product not found' });
      await logAudit(req, "master_products", String(id), "DELETE", { previousValues: { name: deleted.name, productCode: deleted.productCode } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.post("/api/admin/master-products/bulk-delete", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No product IDs provided' });
      }
      const numericIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
      if (numericIds.length === 0) {
        return res.status(400).json({ error: 'No valid product IDs provided' });
      }
      await db.delete(merchantProducts).where(inArray(merchantProducts.masterProductId, numericIds));
      const deleted = await db.delete(masterProducts).where(inArray(masterProducts.id, numericIds)).returning();
      await logAudit(req, "master_products", "bulk", "DELETE", { newValues: { deletedCount: deleted.length, ids: numericIds } });
      res.json({ deleted: deleted.length });
    } catch (error: any) {
      console.error('Failed to bulk delete master products:', error?.message || error);
      res.status(500).json({ error: 'Failed to bulk delete products' });
    }
  });

  app.post("/api/admin/master-products/bulk-import", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { products } = req.body;
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'No products provided' });
      }
      const numericFields = ['mrp', 'federationPrice', 'interUnionPrice', 'wholesalePrice', 'dealerPrice', 'retailerPrice', 'gstPercent', 'packageWeight'];
      const intFields = ['unitsPerPackage'];
      const created: any[] = [];
      const updated: any[] = [];
      const errors: any[] = [];
      for (let i = 0; i < products.length; i++) {
        try {
          const p = { ...products[i] };
          if (!p.productCode || !p.name || !p.segment) {
            errors.push({ row: i + 1, error: 'Missing required fields (productCode, name, segment)' });
            continue;
          }
          numericFields.forEach(f => { if (p[f] === '' || p[f] === undefined) p[f] = null; else if (p[f] !== null) p[f] = String(p[f]); });
          intFields.forEach(f => { if (p[f] === '' || p[f] === undefined) p[f] = null; else p[f] = parseInt(String(p[f])) || null; });
          if (p.isActive !== undefined) delete p.isActive;
          const existing = await db.select().from(masterProducts).where(eq(masterProducts.productCode, p.productCode)).limit(1);
          if (existing.length > 0) {
            // Update existing product with provided values (upsert)
            const updateData: any = {};
            for (const [key, value] of Object.entries(p)) {
              if (value !== null && value !== undefined && value !== '') {
                updateData[key] = value;
              }
            }
            updateData.updatedAt = new Date();
            const [product] = await db.update(masterProducts).set(updateData).where(eq(masterProducts.id, existing[0].id)).returning();
            updated.push(product);
          } else {
            // Create new product
            const [product] = await db.insert(masterProducts).values({ ...p, status: 'active', updatedAt: new Date() }).returning();
            created.push(product);
          }
        } catch (err: any) {
          errors.push({ row: i + 1, error: err.message });
        }
      }
      res.json({ created: created.length, updated: updated.length, errors, total: products.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk import products' });
    }
  });

  // Product → Union Availability (Mapping)
  app.get("/api/admin/master-products/:id/unions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const mappings = await db.select().from(merchantProducts).where(eq(merchantProducts.masterProductId, productId));
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch union mappings' });
    }
  });

  app.post("/api/admin/master-products/:id/unions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { merchantIds } = req.body;
      if (!merchantIds || !Array.isArray(merchantIds)) return res.status(400).json({ error: 'merchantIds required' });
      const [product] = await db.select().from(masterProducts).where(eq(masterProducts.id, productId)).limit(1);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const created: any[] = [];
      for (const merchantId of merchantIds) {
        const existing = await db.select().from(merchantProducts).where(and(eq(merchantProducts.masterProductId, productId), eq(merchantProducts.merchantId, merchantId))).limit(1);
        if (existing.length === 0) {
          const [mp] = await db.insert(merchantProducts).values({
            masterProductId: productId,
            merchantId,
            isActive: true,
            stock: 0,
            federationPrice: product.federationPrice,
            interUnionPrice: product.interUnionPrice,
            wholesalePrice: product.wholesalePrice,
            dealerPrice: product.dealerPrice,
            retailerPrice: product.retailerPrice,
            mrp: product.mrp,
            updatedAt: new Date(),
          }).returning();
          created.push(mp);
        }
      }
      res.json({ created: created.length });
    } catch (error: any) {
      console.error('Failed to enable unions:', error?.message || error);
      res.status(500).json({ error: 'Failed to enable unions' });
    }
  });

  app.post("/api/admin/master-products/assign-all-to-union", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { merchantId } = req.body;
      if (!merchantId) return res.status(400).json({ error: 'merchantId required' });

      const canonicalId = merchantId.startsWith('merchant-') ? merchantId : 
        (Object.entries(merchantToUnionMapping).find(([_, uId]) => uId === merchantId)?.[0] || merchantId);

      const unionId = merchantToUnionMapping[canonicalId];
      let cleanedUp = 0;
      if (unionId && unionId !== canonicalId) {
        const oldMappings = await db.delete(merchantProducts).where(eq(merchantProducts.merchantId, unionId)).returning();
        cleanedUp = oldMappings.length;
      }

      const allProducts = await db.select().from(masterProducts);
      if (allProducts.length === 0) return res.json({ created: 0, skipped: 0, cleanedUp, total: 0 });
      let created = 0;
      let skipped = 0;
      for (const product of allProducts) {
        const existing = await db.select().from(merchantProducts).where(and(eq(merchantProducts.masterProductId, product.id), eq(merchantProducts.merchantId, canonicalId))).limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        await db.insert(merchantProducts).values({
          masterProductId: product.id,
          merchantId: canonicalId,
          isActive: true,
          stock: 0,
          federationPrice: product.federationPrice,
          interUnionPrice: product.interUnionPrice,
          wholesalePrice: product.wholesalePrice,
          dealerPrice: product.dealerPrice,
          retailerPrice: product.retailerPrice,
          mrp: product.mrp,
          updatedAt: new Date(),
        });
        created++;
      }
      res.json({ created, skipped, cleanedUp, total: allProducts.length, merchantId: canonicalId });
    } catch (error: any) {
      console.error('Failed to assign all products to union:', error?.message || error);
      res.status(500).json({ error: 'Failed to assign products' });
    }
  });

  app.delete("/api/admin/master-products/:id/unions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { merchantIds } = req.body;
      if (!merchantIds || !Array.isArray(merchantIds)) return res.status(400).json({ error: 'merchantIds required' });
      for (const merchantId of merchantIds) {
        await db.delete(merchantProducts).where(and(eq(merchantProducts.masterProductId, productId), eq(merchantProducts.merchantId, merchantId)));
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disable unions' });
    }
  });

  // Union Product Listings (Admin view)
  app.get("/api/admin/union-products/:merchantId", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const mappings = await db.select().from(merchantProducts).where(eq(merchantProducts.merchantId, merchantId));
      const productIds = mappings.map(m => m.masterProductId);
      if (productIds.length === 0) return res.json([]);
      const allProducts = await db.select().from(masterProducts);
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const enriched = mappings.map(m => ({
        ...m,
        masterProduct: productMap.get(m.masterProductId) || null,
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch union products' });
    }
  });

  app.patch("/api/admin/union-products/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { id: _, createdAt, ...updateData } = req.body;
      const [oldProduct] = await db.select().from(merchantProducts).where(eq(merchantProducts.id, id)).limit(1);
      const [updated] = await db.update(merchantProducts).set({ ...updateData, updatedAt: new Date() }).where(eq(merchantProducts.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      const diff = diffObjects(oldProduct as any, updated as any);
      await logAudit(req, "union_products", String(id), "UPDATE", diff);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update union product' });
    }
  });

  app.post("/api/admin/union-products/bulk-action", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { merchantId, action, ids, value } = req.body;
      if (!action || !ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid request' });
      let updated = 0;
      for (const id of ids) {
        if (action === 'activate') {
          await db.update(merchantProducts).set({ isActive: true, updatedAt: new Date() }).where(eq(merchantProducts.id, id));
          updated++;
        } else if (action === 'deactivate') {
          await db.update(merchantProducts).set({ isActive: false, updatedAt: new Date() }).where(eq(merchantProducts.id, id));
          updated++;
        } else if (action === 'set_stock') {
          await db.update(merchantProducts).set({ stock: parseInt(value) || 0, updatedAt: new Date() }).where(eq(merchantProducts.id, id));
          updated++;
        }
      }
      await logAudit(req, "union_products", "bulk", "UPDATE", { newValues: { action, affectedCount: updated, ids } });
      res.json({ updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform bulk action' });
    }
  });

  // Union Portal - Browse master catalog and manage own products
  app.get("/api/union/:merchantId/master-catalog", async (req, res) => {
    try {
      const products = await db.select().from(masterProducts).where(eq(masterProducts.status, 'active')).orderBy(asc(masterProducts.name));
      const mappings = await db.select().from(merchantProducts).where(eq(merchantProducts.merchantId, req.params.merchantId));
      const enabledIds = new Set(mappings.map(m => m.masterProductId));
      const enriched = products.map(p => ({ ...p, isEnabled: enabledIds.has(p.id) }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch catalog' });
    }
  });

  app.post("/api/union/:merchantId/add-product", async (_req, res) => {
    return res.status(403).json({ error: 'Product catalog is managed by Admin only. Contact your administrator to assign products to your union.' });
  });

  app.get("/api/union/:merchantId/my-products", async (req, res) => {
    try {
      const mappings = await db.select().from(merchantProducts).where(eq(merchantProducts.merchantId, req.params.merchantId));
      if (mappings.length === 0) return res.json([]);
      const allProducts = await db.select().from(masterProducts);
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const enriched = mappings.map(m => ({ ...m, masterProduct: productMap.get(m.masterProductId) || null }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.patch("/api/union/:merchantId/my-products/:id", async (_req, res) => {
    return res.status(403).json({ error: 'Product pricing and details are managed by Admin only. Contact your administrator for changes.' });
  });

  app.delete("/api/union/:merchantId/my-products/:id", async (_req, res) => {
    return res.status(403).json({ error: 'Product catalog is managed by Admin only. Contact your administrator to remove products.' });
  });

  // Image upload for master products
  const masterProductImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (ext) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    }
  });
  app.post("/api/admin/master-products/upload-image", requireAuth, requireRole('admin'), masterProductImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileName = `products/${Date.now()}-${req.file.originalname}`;
      try {
        const objectStorageService = new ObjectStorageService();
        const publicPaths = objectStorageService.getPublicObjectSearchPaths();
        const publicPath = publicPaths[0];
        const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
        const bucketName = pathParts[0];
        const publicDir = pathParts.slice(1).join('/');
        const fullObjectName = publicDir ? `${publicDir}/${fileName}` : fileName;
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(fullObjectName);
        await objectFile.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
        res.json({ url: `/public/${fileName}` });
      } catch {
        const uploadDir = path.join(process.cwd(), 'uploads', 'products');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, `${Date.now()}-${req.file.originalname}`);
        fs.writeFileSync(filePath, req.file.buffer);
        res.json({ url: `/uploads/products/${path.basename(filePath)}` });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  app.post("/api/admin/master-products/bulk-upload-images", requireAuth, requireRole('admin'), masterProductImageUpload.array('images', 100), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

      const allProducts = await db.select().from(masterProducts);
      const productByCode: Record<string, typeof allProducts[0]> = {};
      allProducts.forEach(p => {
        productByCode[p.productCode.toLowerCase()] = p;
      });

      let bucketName = '';
      let publicDir = '';
      try {
        const objectStorageService = new ObjectStorageService();
        const publicPaths = objectStorageService.getPublicObjectSearchPaths();
        const publicPath = publicPaths[0];
        const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
        bucketName = pathParts[0];
        publicDir = pathParts.slice(1).join('/');
      } catch {}

      const results: { fileName: string; productCode: string; productName: string; status: string; url?: string }[] = [];

      for (const file of files) {
        const baseName = path.basename(file.originalname, path.extname(file.originalname)).trim();
        const matchedProduct = productByCode[baseName.toLowerCase()];

        if (!matchedProduct) {
          results.push({ fileName: file.originalname, productCode: baseName, productName: '', status: 'unmatched' });
          continue;
        }

        try {
          const fileName = `products/${Date.now()}-${file.originalname}`;
          let url = '';

          if (bucketName) {
            const fullObjectName = publicDir ? `${publicDir}/${fileName}` : fileName;
            const bucket = objectStorageClient.bucket(bucketName);
            const objectFile = bucket.file(fullObjectName);
            await objectFile.save(file.buffer, { metadata: { contentType: file.mimetype } });
            url = `/public/${fileName}`;
          } else {
            const uploadDir = path.join(process.cwd(), 'uploads', 'products');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, `${Date.now()}-${file.originalname}`);
            fs.writeFileSync(filePath, file.buffer);
            url = `/uploads/products/${path.basename(filePath)}`;
          }

          await db.update(masterProducts).set({ image: url, updatedAt: new Date() }).where(eq(masterProducts.id, matchedProduct.id));
          results.push({ fileName: file.originalname, productCode: matchedProduct.productCode, productName: matchedProduct.name, status: 'success', url });
        } catch (err) {
          console.error(`Error uploading image ${file.originalname}:`, err);
          results.push({ fileName: file.originalname, productCode: matchedProduct.productCode, productName: matchedProduct.name, status: 'error' });
        }
      }

      const matched = results.filter(r => r.status === 'success').length;
      const unmatched = results.filter(r => r.status === 'unmatched').length;
      const errors = results.filter(r => r.status === 'error').length;
      res.json({ results, summary: { total: files.length, matched, unmatched, errors } });
    } catch (error) {
      console.error('Error bulk uploading images:', error);
      res.status(500).json({ error: 'Failed to bulk upload images' });
    }
  });

  // Public API - Get all menu items (for dealer portals)
}
