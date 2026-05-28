import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, getAllIdsForMerchant } from "./shared";
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

import * as delhiveryService from "../delhivery";

export async function registerComplianceRoutes(app: Express): Promise<void> {
  app.get("/api/pricing-tiers", async (req, res) => {
    try {
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
      const tiers = await storage.getPricingTiers(isActive);
      res.json(tiers);
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      res.status(500).json({ error: 'Failed to fetch pricing tiers' });
    }
  });

  // Get pricing tier by ID
  app.get("/api/pricing-tiers/:id", async (req, res) => {
    try {
      const tier = await storage.getPricingTier(req.params.id);
      if (!tier) {
        return res.status(404).json({ error: 'Pricing tier not found' });
      }
      res.json(tier);
    } catch (error) {
      console.error('Error fetching pricing tier:', error);
      res.status(500).json({ error: 'Failed to fetch pricing tier' });
    }
  });

  // Get pricing tier by code
  app.get("/api/pricing-tiers/code/:tierCode", async (req, res) => {
    try {
      const tier = await storage.getPricingTierByCode(req.params.tierCode);
      if (!tier) {
        return res.status(404).json({ error: 'Pricing tier not found' });
      }
      res.json(tier);
    } catch (error) {
      console.error('Error fetching pricing tier:', error);
      res.status(500).json({ error: 'Failed to fetch pricing tier' });
    }
  });

  // Calculate price for a product based on tier
  const calculatePriceSchema = z.object({
    mrp: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))),
    tierCode: z.string().min(1),
    federationPrice: z.union([z.string(), z.number()]).optional().transform(val => val ? parseFloat(String(val)) : undefined),
    districtUnionPrice: z.union([z.string(), z.number()]).optional().transform(val => val ? parseFloat(String(val)) : undefined),
    wholesalePrice: z.union([z.string(), z.number()]).optional().transform(val => val ? parseFloat(String(val)) : undefined),
    retailPrice: z.union([z.string(), z.number()]).optional().transform(val => val ? parseFloat(String(val)) : undefined),
  });

  app.post("/api/pricing-tiers/calculate", async (req, res) => {
    try {
      const result = calculatePriceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
      }

      const { mrp, tierCode, federationPrice, districtUnionPrice, wholesalePrice, retailPrice } = result.data;

      const tier = await storage.getPricingTierByCode(tierCode);
      if (!tier) {
        return res.status(400).json({ error: `Unknown pricing tier: ${tierCode}` });
      }

      const calculatedPrice = await storage.calculateTierPrice(
        mrp,
        tierCode,
        { federationPrice, districtUnionPrice, wholesalePrice, retailPrice }
      );

      res.json({ 
        tierCode,
        mrp,
        calculatedPrice,
        formula: tier.formula
      });
    } catch (error) {
      console.error('Error calculating tier price:', error);
      res.status(500).json({ error: 'Failed to calculate price' });
    }
  });

  // Admin: Create pricing tier
  app.post("/api/admin/pricing-tiers", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const result = insertPricingTierSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid pricing tier data', details: result.error.errors });
      }
      const tier = await storage.createPricingTier(result.data);
      res.status(201).json(tier);
    } catch (error) {
      console.error('Error creating pricing tier:', error);
      res.status(500).json({ error: 'Failed to create pricing tier' });
    }
  });

  // Admin: Update pricing tier
  app.patch("/api/admin/pricing-tiers/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const result = insertPricingTierSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid pricing tier data', details: result.error.errors });
      }
      const tier = await storage.updatePricingTier(req.params.id, result.data);
      if (!tier) {
        return res.status(404).json({ error: 'Pricing tier not found' });
      }
      res.json(tier);
    } catch (error) {
      console.error('Error updating pricing tier:', error);
      res.status(500).json({ error: 'Failed to update pricing tier' });
    }
  });

  // Admin: Delete pricing tier
  app.delete("/api/admin/pricing-tiers/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const deleted = await storage.deletePricingTier(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Pricing tier not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting pricing tier:', error);
      res.status(500).json({ error: 'Failed to delete pricing tier' });
    }
  });

  // Admin: Export pricing tiers to Excel
  app.get("/api/admin/pricing-tiers/export", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const tiers = await storage.getPricingTiers();
      const headers = ['Tier Code', 'Tier Name', 'Description', 'Formula', 'Discount %', 'Base Price', 'Sort Order', 'Status'];
      const rows = tiers.map(t => [
        t.tierCode || '', t.tierName || '', t.description || '', t.formula || '',
        t.discountPercent || '', t.basePrice || '', String(t.sortOrder ?? ''),
        t.isActive ? 'Active' : 'Inactive',
      ]);
      const buf = await xlsxWriteAoa([{ name: 'Pricing Tiers', data: [headers, ...rows] }]);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Pricing_Tiers_Export_${date}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error('Error exporting pricing tiers:', error);
      res.status(500).json({ error: 'Failed to export pricing tiers' });
    }
  });

  // ============================================
  // E-WAY BILL MANAGEMENT ROUTES
  // ============================================

  // Get Indian state codes
  app.get("/api/eway-bill/state-codes", (req, res) => {
    res.json(INDIAN_STATE_CODES);
  });

  // Get HSN codes list
  app.get("/api/eway-bill/hsn-codes", async (req, res) => {
    try {
      const { category, search } = req.query;
      const hsnCodes = await storage.getHsnCodes(
        category as string | undefined,
        search as string | undefined
      );
      res.json(hsnCodes);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
      res.status(500).json({ error: 'Failed to fetch HSN codes' });
    }
  });

  // Admin: Get all HSN codes
  app.get("/api/admin/hsn-codes", requireAuth, async (req, res) => {
    try {
      const { category, search } = req.query;
      const hsnCodes = await storage.getHsnCodes(
        category as string | undefined,
        search as string | undefined
      );
      res.json(hsnCodes);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
      res.status(500).json({ error: 'Failed to fetch HSN codes' });
    }
  });

  // Admin: Add HSN code
  app.post("/api/admin/hsn-codes", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const result = insertHsnCodeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid HSN code data', details: result.error.errors });
      }
      const hsnCode = await storage.createHsnCode(result.data);
      res.status(201).json(hsnCode);
    } catch (error) {
      console.error('Error creating HSN code:', error);
      res.status(500).json({ error: 'Failed to create HSN code' });
    }
  });

  // Get E-way Bill configuration (excludes sensitive credentials)
  app.get("/api/admin/eway-bill/config", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const config = await storage.getEwayBillConfig();
      if (config) {
        // Remove sensitive fields from response - never expose hashed credentials
        const safeConfig = {
          id: config.id,
          merchantId: config.merchantId,
          apiUsername: config.apiUsername,
          clientId: config.clientId,
          gstin: config.gstin,
          tradeName: config.tradeName,
          address: config.address,
          city: config.city,
          pincode: config.pincode,
          stateCode: config.stateCode,
          isProduction: config.isProduction,
          isActive: config.isActive,
          lastTokenRefresh: config.lastTokenRefresh,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          // Indicate if credentials are configured (without exposing values)
          hasApiPassword: !!config.apiPasswordHash,
          hasClientSecret: !!config.clientSecretHash,
        };
        res.json(safeConfig);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error('Error fetching E-way Bill config:', error);
      res.status(500).json({ error: 'Failed to fetch E-way Bill configuration' });
    }
  });

  // Save E-way Bill configuration (with secure credential hashing)
  app.post("/api/admin/eway-bill/config", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      // Accept apiPassword and clientSecret as plaintext inputs (separate from hash fields)
      const { apiPassword, clientSecret, ...rest } = req.body;
      
      const result = insertEwayBillConfigSchema.safeParse(rest);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid configuration data', details: result.error.errors });
      }
      
      const configData = { ...result.data };
      
      // Hash sensitive credentials unconditionally if provided
      // Always hash - never accept pre-hashed values from client
      if (apiPassword && typeof apiPassword === 'string' && apiPassword.length > 0) {
        configData.apiPasswordHash = await hashPassword(apiPassword);
      }
      if (clientSecret && typeof clientSecret === 'string' && clientSecret.length > 0) {
        configData.clientSecretHash = await hashPassword(clientSecret);
      }
      
      const config = await storage.saveEwayBillConfig(configData);
      
      // Return safe response without exposing hashed credentials
      res.status(201).json({
        id: config.id,
        merchantId: config.merchantId,
        gstin: config.gstin,
        tradeName: config.tradeName,
        isProduction: config.isProduction,
        isActive: config.isActive,
        message: 'E-way Bill configuration saved successfully'
      });
    } catch (error) {
      console.error('Error saving E-way Bill config:', error);
      res.status(500).json({ error: 'Failed to save E-way Bill configuration' });
    }
  });

  // Get all E-way Bills with filters
  app.get("/api/admin/eway-bills", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status, merchantId, fromDate, toDate, search } = req.query;
      const ewayBills = await storage.getEwayBills({
        status: status as string | undefined,
        merchantId: merchantId as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        search: search as string | undefined
      });
      res.json(ewayBills);
    } catch (error) {
      console.error('Error fetching E-way Bills:', error);
      res.status(500).json({ error: 'Failed to fetch E-way Bills' });
    }
  });

  // Get single E-way Bill details
  app.get("/api/admin/eway-bills/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      res.json(ewayBill);
    } catch (error) {
      console.error('Error fetching E-way Bill:', error);
      res.status(500).json({ error: 'Failed to fetch E-way Bill' });
    }
  });

  // Create draft E-way Bill
  app.post("/api/admin/eway-bills", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const result = insertEwayBillSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid E-way Bill data', details: result.error.errors });
      }
      const ewayBill = await storage.createEwayBill(result.data);
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: ewayBill.id,
        action: 'create_draft',
        requestData: req.body,
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.status(201).json(ewayBill);
    } catch (error) {
      console.error('Error creating E-way Bill:', error);
      res.status(500).json({ error: 'Failed to create E-way Bill' });
    }
  });

  // Update E-way Bill (before generation)
  app.patch("/api/admin/eway-bills/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      if (ewayBill.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft E-way Bills can be edited' });
      }
      
      const result = insertEwayBillSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid E-way Bill data', details: result.error.errors });
      }
      
      const updated = await storage.updateEwayBill(req.params.id, result.data);
      res.json(updated);
    } catch (error) {
      console.error('Error updating E-way Bill:', error);
      res.status(500).json({ error: 'Failed to update E-way Bill' });
    }
  });

  // Generate E-way Bill (call GST API)
  app.post("/api/admin/eway-bills/:id/generate", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      if (ewayBill.status !== 'draft' && ewayBill.status !== 'pending') {
        return res.status(400).json({ error: 'E-way Bill has already been generated or cancelled' });
      }
      
      // Validate mandatory fields for E-way Bill generation (GST compliance)
      const mandatoryFields = {
        supplyType: 'Supply Type',
        docType: 'Document Type',
        docNo: 'Document Number',
        docDate: 'Document Date',
        fromGstin: 'From GSTIN',
        fromTradeName: 'From Trade Name',
        fromPlace: 'From Place',
        fromPincode: 'From Pincode',
        fromStateCode: 'From State Code',
        toTradeName: 'To Trade Name',
        toPlace: 'To Place',
        toPincode: 'To Pincode',
        toStateCode: 'To State Code',
        totalValue: 'Total Value',
        transMode: 'Transport Mode'
      };
      
      const missingFields: string[] = [];
      for (const [field, label] of Object.entries(mandatoryFields)) {
        if (!ewayBill[field as keyof typeof ewayBill]) {
          missingFields.push(label);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: 'Missing mandatory fields for E-way Bill generation',
          missingFields
        });
      }
      
      // Validate total value threshold (₹50,000 for inter-state or specified goods)
      const EWAY_BILL_THRESHOLD = 50000;
      const totalValue = parseFloat(ewayBill.totInvValue || ewayBill.totalValue || '0');
      if (totalValue < EWAY_BILL_THRESHOLD) {
        // Allow but warn for intra-state (threshold may not apply)
        if (ewayBill.fromStateCode !== ewayBill.toStateCode) {
          console.warn(`E-way Bill generated for inter-state movement below ₹${EWAY_BILL_THRESHOLD} threshold`);
        }
      }
      
      // Get E-way Bill config for API credentials
      const config = await storage.getEwayBillConfig();
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'E-way Bill API is not configured. Please configure API credentials first.' });
      }
      
      // In production, this would call the actual GST E-way Bill API
      // For now, simulate the API call
      const ewayBillNumber = `${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(0, 12);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + Math.ceil((ewayBill.distance || 100) / 200)); // 200 KM per day validity
      
      const updated = await storage.updateEwayBill(req.params.id, {
        status: 'active',
        ewayBillNumber,
        ewayBillDate: new Date(),
        validUntil,
        apiResponse: {
          ewbNo: ewayBillNumber,
          ewbDt: new Date().toISOString(),
          validUpto: validUntil.toISOString(),
          status: 'ACT'
        }
      });
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: req.params.id,
        action: 'generate',
        requestData: { ewayBillId: req.params.id },
        responseData: updated?.apiResponse as any,
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error generating E-way Bill:', error);
      res.status(500).json({ error: 'Failed to generate E-way Bill' });
    }
  });

  // Update Part B (transporter/vehicle details)
  app.post("/api/admin/eway-bills/:id/update-partb", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      if (ewayBill.status !== 'active') {
        return res.status(400).json({ error: 'Only active E-way Bills can have Part B updated' });
      }
      
      const { vehicleNo, transporterId, transporterName, transDocNo, transDocDate, transMode } = req.body;
      
      const updated = await storage.updateEwayBill(req.params.id, {
        vehicleNo,
        transporterId,
        transporterName,
        transDocNo,
        transDocDate: transDocDate ? new Date(transDocDate) : undefined,
        transMode
      });
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: req.params.id,
        action: 'update_partb',
        requestData: req.body,
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating Part B:', error);
      res.status(500).json({ error: 'Failed to update Part B' });
    }
  });

  // Extend E-way Bill validity
  app.post("/api/admin/eway-bills/:id/extend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      if (ewayBill.status !== 'active') {
        return res.status(400).json({ error: 'Only active E-way Bills can be extended' });
      }
      
      // Check if within extension window (8 hours before or after expiry)
      const now = new Date();
      const validUntil = new Date(ewayBill.validUntil!);
      const hoursDiff = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 8) {
        return res.status(400).json({ error: 'E-way Bill can only be extended within 8 hours of expiry' });
      }
      
      const { reason, additionalDistance } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Extension reason is required' });
      }
      
      // Calculate new validity (200 KM per day)
      const newValidUntil = new Date(validUntil);
      const additionalDays = Math.ceil((additionalDistance || 200) / 200);
      newValidUntil.setDate(newValidUntil.getDate() + additionalDays);
      
      const updated = await storage.updateEwayBill(req.params.id, {
        status: 'extended',
        extensionCount: (ewayBill.extensionCount || 0) + 1,
        extendedUntil: newValidUntil,
        validUntil: newValidUntil,
        extensionReason: reason
      });
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: req.params.id,
        action: 'extend',
        requestData: req.body,
        responseData: { newValidUntil: newValidUntil.toISOString() },
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error extending E-way Bill:', error);
      res.status(500).json({ error: 'Failed to extend E-way Bill' });
    }
  });

  // Cancel E-way Bill
  app.post("/api/admin/eway-bills/:id/cancel", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const ewayBill = await storage.getEwayBillById(req.params.id);
      if (!ewayBill) {
        return res.status(404).json({ error: 'E-way Bill not found' });
      }
      if (ewayBill.status === 'cancelled') {
        return res.status(400).json({ error: 'E-way Bill is already cancelled' });
      }
      if (ewayBill.status === 'active' || ewayBill.status === 'extended') {
        // Check 24 hour cancellation window
        const ewbDate = new Date(ewayBill.ewayBillDate!);
        const now = new Date();
        const hoursDiff = (now.getTime() - ewbDate.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          return res.status(400).json({ error: 'E-way Bill can only be cancelled within 24 hours of generation' });
        }
      }
      
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
      }
      
      const updated = await storage.updateEwayBill(req.params.id, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date()
      });
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: req.params.id,
        action: 'cancel',
        requestData: req.body,
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error cancelling E-way Bill:', error);
      res.status(500).json({ error: 'Failed to cancel E-way Bill' });
    }
  });

  // Get E-way Bill logs
  app.get("/api/admin/eway-bills/:id/logs", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const logs = await storage.getEwayBillLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching E-way Bill logs:', error);
      res.status(500).json({ error: 'Failed to fetch E-way Bill logs' });
    }
  });

  // Generate E-way Bill from order
  app.post("/api/admin/orders/:orderId/generate-eway-bill", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get E-way Bill config
      const config = await storage.getEwayBillConfig();
      if (!config) {
        return res.status(400).json({ error: 'E-way Bill is not configured' });
      }
      
      // Check if order value is above ₹50,000 threshold
      const totalValue = parseFloat(order.total as string);
      if (totalValue < 50000) {
        return res.status(400).json({ error: 'E-way Bill is only required for orders above ₹50,000' });
      }
      
      // Get transport details from request
      const { toGstin, toTradeName, toAddress, toCity, toPincode, toStateCode, vehicleNo, transporterId, transporterName, distance } = req.body;
      
      // Create E-way Bill draft from order
      const orderItems = order.items as any[];
      const itemList = orderItems.map(item => ({
        productName: item.name,
        hsnCode: '0401', // Default HSN for dairy products
        quantity: item.quantity,
        unit: 'NOS',
        taxableAmount: parseFloat(item.price) * item.quantity,
        sgstRate: 2.5,
        cgstRate: 2.5,
        igstRate: 0
      }));
      
      const subtotal = parseFloat(order.subtotal as string);
      const tax = parseFloat(order.tax as string);
      
      const ewayBillData = {
        orderId: order.id,
        merchantId: order.restaurantId,
        docNo: `INV-${order.id.slice(0, 8)}`,
        docDate: new Date(order.createdAt!),
        fromGstin: config.gstin,
        fromTradeName: config.tradeName,
        fromAddress: config.address,
        fromCity: config.city,
        fromPincode: config.pincode,
        fromStateCode: config.stateCode,
        toGstin: toGstin || '',
        toTradeName: toTradeName || order.customerName,
        toAddress: toAddress || order.deliveryAddress,
        toCity: toCity || '',
        toPincode: toPincode || '',
        toStateCode: toStateCode || '33', // Default Tamil Nadu
        itemList,
        totalValue: subtotal.toString(),
        cgstValue: (tax / 2).toString(),
        sgstValue: (tax / 2).toString(),
        igstValue: '0',
        cessValue: '0',
        totalInvoiceValue: totalValue.toString(),
        vehicleNo,
        transporterId,
        transporterName,
        distance: distance || 0,
        status: 'draft'
      };
      
      const ewayBill = await storage.createEwayBill(ewayBillData as any);
      
      // Log the action
      await storage.createEwayBillLog({
        ewayBillId: ewayBill.id,
        action: 'create_from_order',
        requestData: { orderId: order.id },
        status: 'success',
        userId: (req as AuthenticatedRequest).user?.id
      });
      
      res.status(201).json(ewayBill);
    } catch (error) {
      console.error('Error generating E-way Bill from order:', error);
      res.status(500).json({ error: 'Failed to generate E-way Bill from order' });
    }
  });

  // E-way Bill Dashboard Stats
  app.get("/api/admin/eway-bill/stats", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const stats = await storage.getEwayBillStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching E-way Bill stats:', error);
      res.status(500).json({ error: 'Failed to fetch E-way Bill stats' });
    }
  });

  // =============================================
  // GST RETURNS MODULE
  // Monthly GST filing for merchants (except customers)
  // =============================================

  // List GST returns for current user/merchant
  app.get("/api/gst-returns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Customers cannot access GST returns
      if (user.pricingRole === 'MRP' || user.role === 'customer') {
        return res.status(403).json({ error: 'GST Returns not available for consumers' });
      }
      
      const merchantId = user.restaurantId || user.id;
      const returns = await storage.getGstReturnsByMerchant(merchantId);
      res.json(returns);
    } catch (error) {
      console.error('Error fetching GST returns:', error);
      res.status(500).json({ error: 'Failed to fetch GST returns' });
    }
  });

  // Generate GST return for a specific month/year
  app.post("/api/gst-returns/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Customers cannot access GST returns
      if (user.pricingRole === 'MRP' || user.role === 'customer') {
        return res.status(403).json({ error: 'GST Returns not available for consumers' });
      }
      
      const { month, year, gstin } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
      }
      
      const merchantId = user.restaurantId || user.id;
      
      // Get orders for the specified month/year for this merchant (including all ID variants)
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const validIds = getAllIdsForMerchant(merchantId);
      const orders = await storage.getOrdersByMerchantAndDateRange(validIds, startDate, endDate);
      
      // Calculate GST summary
      let totalTaxableValue = 0;
      let totalTax = 0;
      const b2bData: any[] = [];
      const b2cData: any[] = [];
      const hsnSummary: Record<string, any> = {};
      
      for (const order of orders) {
        const subtotal = parseFloat(order.subtotal as string);
        const tax = parseFloat(order.tax as string);
        
        totalTaxableValue += subtotal;
        totalTax += tax;
        
        // For simplicity, treat all as B2C (small unregistered buyers)
        // In real implementation, you'd check if buyer has GSTIN for B2B
        b2cData.push({
          invoiceNo: order.id.substring(0, 16),
          invoiceDate: order.createdAt,
          taxableValue: subtotal,
          cgst: tax / 2,
          sgst: tax / 2,
          total: parseFloat(order.total as string)
        });
        
        // HSN Summary - aggregate by HSN code
        const items = order.items as any[];
        for (const item of items) {
          const hsnCode = '04010100'; // Default HSN for dairy products
          if (!hsnSummary[hsnCode]) {
            hsnSummary[hsnCode] = {
              hsnCode,
              description: 'Dairy Products',
              quantity: 0,
              taxableValue: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              totalTax: 0
            };
          }
          const itemTotal = parseFloat(item.price) * item.quantity;
          const itemTax = itemTotal * 0.05; // 5% GST
          hsnSummary[hsnCode].quantity += item.quantity;
          hsnSummary[hsnCode].taxableValue += itemTotal;
          hsnSummary[hsnCode].cgst += itemTax / 2;
          hsnSummary[hsnCode].sgst += itemTax / 2;
          hsnSummary[hsnCode].totalTax += itemTax;
        }
      }
      
      // Check if return already exists for this period
      const existingReturn = await storage.getGstReturnByPeriod(merchantId, month, year);
      
      const gstReturnData = {
        merchantId,
        gstin: gstin || '',
        returnType: 'GSTR1',
        periodMonth: month,
        periodYear: year,
        status: 'generated',
        totalInvoices: orders.length,
        totalTaxableValue: totalTaxableValue.toFixed(2),
        totalCgst: (totalTax / 2).toFixed(2),
        totalSgst: (totalTax / 2).toFixed(2),
        totalIgst: '0.00',
        totalCess: '0.00',
        totalTax: totalTax.toFixed(2),
        b2bData,
        b2cData,
        hsnSummary: Object.values(hsnSummary),
        generatedAt: new Date()
      };
      
      let gstReturn;
      if (existingReturn) {
        // Update existing return
        gstReturn = await storage.updateGstReturn(existingReturn.id, gstReturnData);
      } else {
        // Create new return
        gstReturn = await storage.createGstReturn(gstReturnData);
      }
      
      res.json(gstReturn);
    } catch (error) {
      console.error('Error generating GST return:', error);
      res.status(500).json({ error: 'Failed to generate GST return' });
    }
  });

  // Get specific GST return
  app.get("/api/gst-returns/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const gstReturn = await storage.getGstReturnById(req.params.id);
      if (!gstReturn) {
        return res.status(404).json({ error: 'GST Return not found' });
      }
      
      // Verify ownership
      const merchantId = user.restaurantId || user.id;
      if (gstReturn.merchantId !== merchantId && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(gstReturn);
    } catch (error) {
      console.error('Error fetching GST return:', error);
      res.status(500).json({ error: 'Failed to fetch GST return' });
    }
  });

  // Download GSTR-1 JSON for GST portal upload
  app.get("/api/gst-returns/:id/download", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const gstReturn = await storage.getGstReturnById(req.params.id);
      if (!gstReturn) {
        return res.status(404).json({ error: 'GST Return not found' });
      }
      
      // Verify ownership
      const merchantId = user.restaurantId || user.id;
      if (gstReturn.merchantId !== merchantId && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Generate GSTR-1 JSON format for GST portal
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fp = `${monthNames[gstReturn.periodMonth - 1]}${gstReturn.periodYear}`;
      
      const gstr1Json = {
        gstin: gstReturn.gstin || '',
        fp: fp, // Filing period e.g. "Jan2026"
        gt: parseFloat(gstReturn.totalTaxableValue as string) + parseFloat(gstReturn.totalTax as string),
        cur_gt: parseFloat(gstReturn.totalTaxableValue as string) + parseFloat(gstReturn.totalTax as string),
        
        // B2B Sales (Business to Business) - registered buyers
        b2b: (gstReturn.b2bData as any[])?.map((inv: any) => ({
          ctin: inv.buyerGstin || '',
          inv: [{
            inum: inv.invoiceNo,
            idt: new Date(inv.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-'),
            val: inv.total,
            pos: '33', // Tamil Nadu
            rchrg: 'N',
            inv_typ: 'R',
            itms: [{
              num: 1,
              itm_det: {
                txval: inv.taxableValue,
                rt: 5,
                camt: inv.cgst,
                samt: inv.sgst,
                csamt: 0
              }
            }]
          }]
        })) || [],
        
        // B2C Small - unregistered buyers (invoice < 2.5L)
        b2cs: [{
          sply_ty: 'INTRA',
          pos: '33', // Tamil Nadu
          typ: 'OE',
          txval: parseFloat(gstReturn.totalTaxableValue as string),
          rt: 5,
          camt: parseFloat(gstReturn.totalCgst as string),
          samt: parseFloat(gstReturn.totalSgst as string),
          csamt: 0
        }],
        
        // HSN Summary
        hsn: {
          data: (gstReturn.hsnSummary as any[])?.map((hsn: any) => ({
            num: 1,
            hsn_sc: hsn.hsnCode,
            desc: hsn.description,
            uqc: 'NOS',
            qty: hsn.quantity,
            txval: hsn.taxableValue,
            rt: 5,
            camt: hsn.cgst,
            samt: hsn.sgst,
            iamt: 0,
            csamt: 0
          })) || []
        }
      };
      
      const filename = `GSTR1_${gstReturn.gstin || 'DRAFT'}_${fp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(gstr1Json);
    } catch (error) {
      console.error('Error downloading GST return:', error);
      res.status(500).json({ error: 'Failed to download GST return' });
    }
  });

  // Mark GST return as filed
  app.post("/api/gst-returns/:id/mark-filed", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const gstReturn = await storage.getGstReturnById(req.params.id);
      if (!gstReturn) {
        return res.status(404).json({ error: 'GST Return not found' });
      }
      
      // Verify ownership
      const merchantId = user.restaurantId || user.id;
      if (gstReturn.merchantId !== merchantId && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { fileReference } = req.body;
      
      const updated = await storage.updateGstReturn(gstReturn.id, {
        status: 'filed',
        filedAt: new Date(),
        fileReference: fileReference || ''
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error marking GST return as filed:', error);
      res.status(500).json({ error: 'Failed to mark GST return as filed' });
    }
  });

  // Admin: List all GST returns
  app.get("/api/admin/gst-returns", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { month, year, status } = req.query;
      const returns = await storage.getAllGstReturns({
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
        status: status as string
      });
      res.json(returns);
    } catch (error) {
      console.error('Error fetching all GST returns:', error);
      res.status(500).json({ error: 'Failed to fetch GST returns' });
    }
  });

  // ============ DELHIVERY SHIPPING ROUTES ============

  // Get Delhivery Config
  app.get("/api/admin/delhivery/config", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (config) {
        const { apiToken, webhookSecret, ...safeConfig } = config;
        res.json({ ...safeConfig, hasApiToken: !!apiToken });
      } else {
        res.json({ hasApiToken: false });
      }
    } catch (error) {
      console.error('Error fetching Delhivery config:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  // Save Delhivery Config
  app.post("/api/admin/delhivery/config", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.saveDelhiveryConfig({
        ...req.body,
        merchantId
      });
      const { apiToken, webhookSecret, ...safeConfig } = config;
      res.json({ ...safeConfig, hasApiToken: !!apiToken });
    } catch (error) {
      console.error('Error saving Delhivery config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  // Get Warehouses
  app.get("/api/admin/delhivery/warehouses", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const warehouses = await storage.getDelhiveryWarehouses(merchantId);
      res.json(warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
  });

  // Create Warehouse
  app.post("/api/admin/delhivery/warehouses", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const warehouse = await storage.createDelhiveryWarehouse({
        ...req.body,
        merchantId
      });
      res.json(warehouse);
    } catch (error) {
      console.error('Error creating warehouse:', error);
      res.status(500).json({ error: 'Failed to create warehouse' });
    }
  });

  // Update Warehouse
  app.patch("/api/admin/delhivery/warehouses/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const warehouse = await storage.updateDelhiveryWarehouse(req.params.id, req.body);
      res.json(warehouse);
    } catch (error) {
      console.error('Error updating warehouse:', error);
      res.status(500).json({ error: 'Failed to update warehouse' });
    }
  });

  // Delete Warehouse
  app.delete("/api/admin/delhivery/warehouses/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteDelhiveryWarehouse(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      res.status(500).json({ error: 'Failed to delete warehouse' });
    }
  });

  // Register Warehouse with Delhivery
  app.post("/api/admin/delhivery/warehouses/:id/register", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const warehouse = await storage.getDelhiveryWarehouse(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      const result = await delhiveryService.registerWarehouse(config, {
        name: warehouse.name,
        phone: warehouse.phone,
        address: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
        pincode: warehouse.pincode
      });

      if (result.success) {
        await storage.updateDelhiveryWarehouse(warehouse.id, {
          registeredWithDelhivery: true,
          delhiveryWarehouseCode: result.data?.code || warehouse.name
        });
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error registering warehouse:', error);
      res.status(500).json({ error: 'Failed to register warehouse' });
    }
  });

  // Get Shipments
  app.get("/api/admin/delhivery/shipments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const { status, shipmentType } = req.query;
      const shipments = await storage.getDelhiveryShipments(merchantId, {
        status: status as string,
        shipmentType: shipmentType as string
      });
      res.json(shipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      res.status(500).json({ error: 'Failed to fetch shipments' });
    }
  });

  // Get Single Shipment
  app.get("/api/admin/delhivery/shipments/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const shipment = await storage.getDelhiveryShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }
      res.json(shipment);
    } catch (error) {
      console.error('Error fetching shipment:', error);
      res.status(500).json({ error: 'Failed to fetch shipment' });
    }
  });

  // Public Pincode Serviceability Check (for checkout page)
}
