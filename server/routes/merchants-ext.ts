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

export async function registerMerchantsExtRoutes(app: Express): Promise<void> {
  app.get("/api/cuisines", async (req, res) => {
    try {
      const cuisinesCached = getCached('cuisines');
      if (cuisinesCached) {
        res.set('X-Cache', 'HIT');
        return res.json(cuisinesCached);
      }
      const menuItems = await storage.getAllMenuItems();
      // Get unique categories from menu items, normalize case
      // Exclude "Fresh Milk" category - Fresh Milk segment products are not yet added
      // Fresh Milk products: Aavin Diet, Aavin Nice, Aavin Green Magic, Aavin Premium, Aavin Delite
      const excludedCategories = ['fresh milk', 'freshmilk'];
      const categorySet = new Set<string>();
      menuItems.forEach(item => {
        if (item.category) {
          // Normalize: capitalize first letter, lowercase rest for display
          const normalized = item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase();
          // Skip Fresh Milk category
          if (!excludedCategories.includes(normalized.toLowerCase())) {
            categorySet.add(normalized);
          }
        }
      });
      // Define preferred order for common categories (Products and Ice Cream segments)
      const preferredOrder = ['Milk', 'Curd', 'Paneer', 'Butter', 'Ghee', 'Buttermilk', 'Ice cream', 'Sweets', 'Beverages'];
      const categories = Array.from(categorySet).sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a);
        const bIndex = preferredOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      setCache('cuisines', categories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching cuisines:", error);
      res.status(500).json({ error: "Failed to fetch cuisines" });
    }
  });

  // Get subcategories for a given category
  app.get("/api/subcategories", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const restaurantId = req.query.restaurantId as string | undefined;
      
      let menuItems = await storage.getAllMenuItems();
      
      // Filter by union if provided
      if (restaurantId) {
        menuItems = menuItems.filter(item => item.restaurantId === restaurantId);
      }
      
      // Filter by category if provided
      if (category) {
        menuItems = menuItems.filter(item => 
          item.category?.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Get unique subcategories
      const subcategorySet = new Set<string>();
      menuItems.forEach(item => {
        if (item.subcategory) {
          subcategorySet.add(item.subcategory);
        }
      });
      
      // Sort alphabetically
      const subcategories = Array.from(subcategorySet).sort();
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });

  // ===============================================
  // KARENDERIA ADMIN API ROUTES
  // ===============================================

  // ===============================================
  // MERCHANT MANAGEMENT API
  // ===============================================

  // Public endpoint for listing district unions (for staff registration dropdown)
  app.get("/api/merchants", async (req, res) => {
    try {
      const allMerchants = await storage.getMerchants();
      const activeMerchants = allMerchants.filter(m => m.status === 'active' || m.status === 'approved');
      const districtNames = [
        "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode",
        "Kallakurichi","Kancheepuram","Karur","Krishnagiri","Madurai","Mayiladuthurai","Nagapattinam",
        "Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivagangai",
        "Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur",
        "Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"
      ];
      res.json(activeMerchants.map(m => {
        const nameStr = m.restaurantName || '';
        const addrStr = m.address || '';
        let district = '';
        for (const d of districtNames) {
          if (nameStr.toLowerCase().includes(d.toLowerCase()) || addrStr.toLowerCase().includes(d.toLowerCase())) {
            district = d;
            break;
          }
        }
        return {
          id: m.id,
          name: m.restaurantName,
          restaurantName: m.restaurantName,
          address: addrStr,
          district,
        };
      }));
    } catch (error) {
      console.error('Error fetching merchants:', error);
      res.status(500).json({ error: 'Failed to fetch merchants' });
    }
  });

  app.get("/api/admin/merchants", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const merchants = await storage.getMerchants(status);
      res.json(merchants);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      res.status(500).json({ error: 'Failed to fetch merchants' });
    }
  });

  // Public merchant registration endpoint
  app.post("/api/merchants/register", async (req, res) => {
    try {
      const existingMerchants = await storage.getMerchants();
      const emailExists = existingMerchants.some(m => m.contactEmail === req.body.contactEmail);
      if (emailExists) {
        return res.status(409).json({ error: 'A merchant with this email already exists' });
      }
      
      const merchantData = {
        merchantUuid: req.body.merchantUuid || crypto.randomUUID(),
        restaurantName: req.body.restaurantName,
        restaurantSlug: req.body.restaurantSlug,
        restaurantPhone: req.body.restaurantPhone || req.body.contactPhone,
        contactName: req.body.contactName,
        contactPhone: req.body.contactPhone,
        contactEmail: req.body.contactEmail,
        address: req.body.address || '',
        description: req.body.description || '',
        shortDescription: req.body.shortDescription || '',
        username: req.body.username,
        password: req.body.password,
        status: 'pending',
        pricingTierCode: req.body.pricingTierCode || 'MRP',
        logo: '',
        headerImage: '',
        deliveryDistanceCovered: "0.00",
        isFeatured: 0,
        isReady: 1,
        isSponsored: 0,
        isCommission: 0,
        freeDelivery: 0,
      };
      
      const validatedMerchant = insertMerchantSchema.parse(merchantData);
      const merchant = await storage.createMerchant(validatedMerchant);
      res.status(201).json({ 
        message: 'Registration submitted successfully. Pending approval.',
        merchantId: merchant.id
      });
    } catch (error: any) {
      console.error('Error registering merchant:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to register merchant' });
    }
  });

  app.get("/api/merchants/:merchantId", async (req: any, res) => {
    try {
      const token = req.cookies?.merchant_token || req.cookies?.admin_session_token || req.cookies?.auth_token;
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
      }
      const { merchantId } = req.params;
      const allMerchants = await storage.getMerchants();
      const merchant = allMerchants.find(m => m.id === merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const { password, ...publicData } = merchant;
      res.json(publicData);
    } catch (error) {
      console.error("Error fetching merchant:", error);
      res.status(500).json({ error: "Failed to fetch merchant" });
    }
  });

  app.post("/api/admin/merchants", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedMerchant = insertMerchantSchema.parse(req.body);
      const merchant = await storage.createMerchant(validatedMerchant);
      res.status(201).json(merchant);
    } catch (error) {
      console.error('Error creating merchant:', error);
      res.status(500).json({ error: 'Failed to create merchant' });
    }
  });

  // Development-only public seed endpoint for district unions
  app.post("/api/dev/seed-district-unions", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    try {
      const districtUnions = [
        { role: "District Union", union_code: "CBE", union_id: "UNI-CBE-01", union_name: "Coimbatore Union", full_name: "Coimbatore District Cooperative Milk Producers Union Ltd", email: "union.cbe@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "CUD", union_id: "UNI-CUD-01", union_name: "Cuddalore Union", full_name: "Cuddalore District Cooperative Milk Producers Union Ltd", email: "union.cud@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "DPI", union_id: "UNI-DPI-01", union_name: "Dharmapuri Union", full_name: "Dharmapuri District Cooperative Milk Producers Union Ltd", email: "union.dpi@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "DGL", union_id: "UNI-DGL-01", union_name: "Dindigul Union", full_name: "Dindigul District Cooperative Milk Producers Union Ltd", email: "union.dgl@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "ERO", union_id: "UNI-ERO-01", union_name: "Erode Union", full_name: "Erode District Cooperative Milk Producers Union Ltd", email: "union.ero@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KAL", union_id: "UNI-KAL-01", union_name: "Kallakurichi Union", full_name: "Kallakurichi District Cooperative Milk Producers Union Ltd", email: "union.kal@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KTU", union_id: "UNI-KTU-01", union_name: "Kanchipuram-Thiruvallur Union", full_name: "Kancheepuram-Thiruvallur District Cooperative Milk Producers Union Ltd", email: "union.ktu@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KYK", union_id: "UNI-KYK-01", union_name: "Kanyakumari Union", full_name: "Kanyakumari District Cooperative Milk Producers Union Ltd", email: "union.kyk@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KRR", union_id: "UNI-KRR-01", union_name: "Karur Union", full_name: "Karur District Cooperative Milk Producers Union Ltd", email: "union.krr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KGI", union_id: "UNI-KGI-01", union_name: "Krishnagiri Union", full_name: "Krishnagiri District Cooperative Milk Producers Union Ltd", email: "union.kgi@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "MDU", union_id: "UNI-MDU-01", union_name: "Madurai Union", full_name: "Madurai District Cooperative Milk Producers Union Ltd", email: "union.mdu@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "NKL", union_id: "UNI-NKL-01", union_name: "Namakkal Union", full_name: "Namakkal District Cooperative Milk Producers Union Ltd", email: "union.nkl@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "NGR", union_id: "UNI-NGR-01", union_name: "Nilgiris Union", full_name: "Nilgiris District Cooperative Milk Producers Union Ltd", email: "union.ngr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "PUD", union_id: "UNI-PUD-01", union_name: "Pudukkottai Union", full_name: "Pudukkottai District Cooperative Milk Producers Union Ltd", email: "union.pud@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "SLM", union_id: "UNI-SLM-01", union_name: "Salem Union", full_name: "Salem District Cooperative Milk Producers Union Ltd", email: "union.slm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "SVG", union_id: "UNI-SVG-01", union_name: "Sivagangai Union", full_name: "Sivagangai District Cooperative Milk Producers Union Ltd", email: "union.svg@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TNJ", union_id: "UNI-TNJ-01", union_name: "Thanjavur Union", full_name: "Thanjavur District Cooperative Milk Producers Union Ltd", email: "union.tnj@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "THN", union_id: "UNI-THN-01", union_name: "Theni Union", full_name: "Theni District Cooperative Milk Producers Union Ltd", email: "union.thn@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TUT", union_id: "UNI-TUT-01", union_name: "Thoothukudi Union", full_name: "Thoothukudi District Cooperative Milk Producers Union Ltd", email: "union.tut@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TPT", union_id: "UNI-TPT-01", union_name: "Thirupathur Union", full_name: "Thirupathur District Cooperative Milk Producers Union Ltd", email: "union.tpt@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TNV", union_id: "UNI-TNV-01", union_name: "Tirunelveli Union", full_name: "Tirunelveli District Cooperative Milk Producers Union Ltd", email: "union.tnv@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TPR", union_id: "UNI-TPR-01", union_name: "Tirupur Union", full_name: "Tirupur District Cooperative Milk Producers Union Ltd", email: "union.tpr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TVM", union_id: "UNI-TVM-01", union_name: "Thiruvannamalai Union", full_name: "Thiruvannamalai District Cooperative Milk Producers Union Ltd", email: "union.tvm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TRY", union_id: "UNI-TRY-01", union_name: "Trichy Union", full_name: "Trichy District Cooperative Milk Producers Union Ltd", email: "union.try@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VLR", union_id: "UNI-VLR-01", union_name: "Vellore Union", full_name: "Vellore District Cooperative Milk Producers Union Ltd", email: "union.vlr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VPM", union_id: "UNI-VPM-01", union_name: "Villupuram Union", full_name: "Villupuram District Cooperative Milk Producers Union Ltd", email: "union.vpm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VNR", union_id: "UNI-VNR-01", union_name: "Virudhunagar Union", full_name: "Virudhunagar District Cooperative Milk Producers Union Ltd", email: "union.vnr@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-MAD", union_id: "FED-MAD-01", union_name: "Madhavaram Dairy", full_name: "Madhavaram Dairy", email: "madhavaram.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-AMB", union_id: "FED-AMB-01", union_name: "Ambattur Dairy", full_name: "Ambattur Dairy", email: "ambattur.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-SHL", union_id: "FED-SHL-01", union_name: "Sholinganallur Dairy", full_name: "Sholinganallur Dairy", email: "sholinganallur.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-PROD", union_id: "FED-PROD-01", union_name: "Products Dairy Ambattur", full_name: "Products Dairy (Ambattur)", email: "products.dairy@aavincart.in", password: "Union@123" },
      ];

      const existingMerchants = await storage.getMerchants();
      const created: string[] = [];
      const skipped: string[] = [];

      for (const union of districtUnions) {
        const exists = existingMerchants.some(m => 
          m.username === union.union_code.toLowerCase() || 
          m.contactEmail === union.email
        );
        
        if (exists) {
          skipped.push(union.union_code);
          continue;
        }

        const merchantData = {
          merchantUuid: crypto.randomUUID(),
          restaurantName: union.full_name,
          restaurantSlug: union.union_code.toLowerCase(),
          restaurantPhone: "9843777277",
          contactName: union.union_name,
          contactPhone: "9843777277",
          contactEmail: union.email,
          address: `${union.union_name}, Tamil Nadu`,
          description: union.full_name,
          shortDescription: union.union_name,
          username: union.union_code.toLowerCase(),
          password: union.password,
          status: 'active' as const,
          pricingTierCode: union.role === 'Fed_District Union' ? 'FEDERATION' : 'INTER_UNION',
          logo: '',
          headerImage: '',
          deliveryDistanceCovered: "0.00",
          isFeatured: 0,
          isReady: 1,
          isSponsored: 0,
          isCommission: 0,
          freeDelivery: 0,
        };

        try {
          const validatedMerchant = insertMerchantSchema.parse(merchantData);
          await storage.createMerchant(validatedMerchant);
          created.push(union.union_code);
        } catch (err) {
          console.error(`Failed to create union ${union.union_code}:`, err);
          skipped.push(union.union_code);
        }
      }

      res.json({ 
        message: 'District unions seeded successfully',
        created: created.length,
        skipped: skipped.length,
        createdUnions: created,
        skippedUnions: skipped
      });
    } catch (error) {
      console.error('Error seeding district unions:', error);
      res.status(500).json({ error: 'Failed to seed district unions' });
    }
  });

  // Comprehensive demo data seeding endpoint for professional demos
  app.post("/api/dev/seed-demo-data", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    try {
      const results: any = { products: 0, orders: 0, users: 0, drivers: 0, unions: 0 };

      // Step 1: Seed master products across all 3 segments
      const demoProducts = [
        // Fresh Milk segment
        { productCode: "FM-001", name: "Aavin Full Cream Milk 500ml", segment: "Fresh Milk", category: "Toned Milk", hsnCode: "0401", gstPercent: "0", unitSize: "500", unitType: "ml", packagingType: "carton", unitsPerPackage: 24, packageWeight: "12", packageWeightUnit: "lit", federationPrice: "18", interUnionPrice: "20", wholesalePrice: "22", dealerPrice: "24", retailerPrice: "26", mrp: "28", status: "active" },
        { productCode: "FM-002", name: "Aavin Toned Milk 1L", segment: "Fresh Milk", category: "Toned Milk", hsnCode: "0401", gstPercent: "0", unitSize: "1000", unitType: "ml", packagingType: "carton", unitsPerPackage: 12, packageWeight: "12", packageWeightUnit: "lit", federationPrice: "38", interUnionPrice: "40", wholesalePrice: "42", dealerPrice: "44", retailerPrice: "47", mrp: "50", status: "active" },
        { productCode: "FM-003", name: "Aavin Standardised Milk 500ml", segment: "Fresh Milk", category: "Standardised Milk", hsnCode: "0401", gstPercent: "0", unitSize: "500", unitType: "ml", packagingType: "carton", unitsPerPackage: 24, packageWeight: "12", packageWeightUnit: "lit", federationPrice: "22", interUnionPrice: "24", wholesalePrice: "26", dealerPrice: "28", retailerPrice: "30", mrp: "32", status: "active" },
        { productCode: "FM-004", name: "Aavin Double Toned Milk 500ml", segment: "Fresh Milk", category: "Double Toned Milk", hsnCode: "0401", gstPercent: "0", unitSize: "500", unitType: "ml", packagingType: "carton", unitsPerPackage: 24, packageWeight: "12", packageWeightUnit: "lit", federationPrice: "16", interUnionPrice: "18", wholesalePrice: "20", dealerPrice: "22", retailerPrice: "24", mrp: "25", status: "active" },
        { productCode: "FM-005", name: "Aavin Buttermilk 200ml", segment: "Fresh Milk", category: "Buttermilk", hsnCode: "0403", gstPercent: "5", unitSize: "200", unitType: "ml", packagingType: "carton", unitsPerPackage: 30, packageWeight: "6", packageWeightUnit: "lit", federationPrice: "8", interUnionPrice: "9", wholesalePrice: "10", dealerPrice: "11", retailerPrice: "12", mrp: "15", status: "active" },
        { productCode: "FM-006", name: "Aavin Curd 400g", segment: "Fresh Milk", category: "Curd", hsnCode: "0403", gstPercent: "5", unitSize: "400", unitType: "g", packagingType: "tray", unitsPerPackage: 20, packageWeight: "8", packageWeightUnit: "kgs", federationPrice: "20", interUnionPrice: "22", wholesalePrice: "24", dealerPrice: "26", retailerPrice: "28", mrp: "30", status: "active" },
        // Products segment
        { productCode: "PR-001", name: "Aavin Ghee 500ml", segment: "Products", category: "Ghee", hsnCode: "0405", gstPercent: "12", unitSize: "500", unitType: "ml", packagingType: "box", unitsPerPackage: 12, packageWeight: "6", packageWeightUnit: "kgs", federationPrice: "200", interUnionPrice: "210", wholesalePrice: "220", dealerPrice: "230", retailerPrice: "240", mrp: "260", status: "active" },
        { productCode: "PR-002", name: "Aavin Butter 100g", segment: "Products", category: "Butter", hsnCode: "0405", gstPercent: "12", unitSize: "100", unitType: "g", packagingType: "box", unitsPerPackage: 30, packageWeight: "3", packageWeightUnit: "kgs", federationPrice: "40", interUnionPrice: "42", wholesalePrice: "44", dealerPrice: "46", retailerPrice: "48", mrp: "52", status: "active" },
        { productCode: "PR-003", name: "Aavin Paneer 200g", segment: "Products", category: "Paneer", hsnCode: "0406", gstPercent: "5", unitSize: "200", unitType: "g", packagingType: "tray", unitsPerPackage: 20, packageWeight: "4", packageWeightUnit: "kgs", federationPrice: "60", interUnionPrice: "64", wholesalePrice: "68", dealerPrice: "72", retailerPrice: "76", mrp: "80", status: "active" },
        { productCode: "PR-004", name: "Aavin Cheese Slice 100g", segment: "Products", category: "Cheese", hsnCode: "0406", gstPercent: "12", unitSize: "100", unitType: "g", packagingType: "box", unitsPerPackage: 24, packageWeight: "2.4", packageWeightUnit: "kgs", federationPrice: "55", interUnionPrice: "58", wholesalePrice: "62", dealerPrice: "66", retailerPrice: "70", mrp: "75", status: "active" },
        { productCode: "PR-005", name: "Aavin Skimmed Milk Powder 500g", segment: "Products", category: "Milk Powder", hsnCode: "0402", gstPercent: "5", unitSize: "500", unitType: "g", packagingType: "box", unitsPerPackage: 12, packageWeight: "6", packageWeightUnit: "kgs", federationPrice: "170", interUnionPrice: "180", wholesalePrice: "190", dealerPrice: "200", retailerPrice: "210", mrp: "230", status: "active" },
        { productCode: "PR-006", name: "Aavin Flavoured Milk Rose 200ml", segment: "Products", category: "Flavoured Milk", hsnCode: "0402", gstPercent: "12", unitSize: "200", unitType: "ml", packagingType: "carton", unitsPerPackage: 24, packageWeight: "4.8", packageWeightUnit: "lit", federationPrice: "18", interUnionPrice: "20", wholesalePrice: "22", dealerPrice: "24", retailerPrice: "26", mrp: "30", status: "active" },
        // Ice Cream segment
        { productCode: "IC-001", name: "Aavin Vanilla Cup 100ml", segment: "Ice Cream", category: "Cup", hsnCode: "2105", gstPercent: "18", unitSize: "100", unitType: "ml", packagingType: "box", unitsPerPackage: 36, packageWeight: "3.6", packageWeightUnit: "lit", federationPrice: "15", interUnionPrice: "17", wholesalePrice: "19", dealerPrice: "21", retailerPrice: "23", mrp: "25", status: "active", image: "/products/ice-cream-vanilla-cup.png" },
        { productCode: "IC-002", name: "Aavin Butterscotch Bar 65ml", segment: "Ice Cream", category: "Bar", hsnCode: "2105", gstPercent: "18", unitSize: "65", unitType: "ml", packagingType: "box", unitsPerPackage: 48, packageWeight: "3.12", packageWeightUnit: "lit", federationPrice: "12", interUnionPrice: "14", wholesalePrice: "16", dealerPrice: "18", retailerPrice: "20", mrp: "22", status: "active", image: "/products/ice-cream-butterscotch-bar.png" },
        { productCode: "IC-003", name: "Aavin Chocolate Cone", segment: "Ice Cream", category: "Cone", hsnCode: "2105", gstPercent: "18", unitSize: "110", unitType: "ml", packagingType: "box", unitsPerPackage: 24, packageWeight: "2.64", packageWeightUnit: "lit", federationPrice: "28", interUnionPrice: "30", wholesalePrice: "32", dealerPrice: "34", retailerPrice: "38", mrp: "40", status: "active", image: "/products/ice-cream-chocolate-cone.png" },
        { productCode: "IC-004", name: "Aavin Mango Dolly 80ml", segment: "Ice Cream", category: "Stick", hsnCode: "2105", gstPercent: "18", unitSize: "80", unitType: "ml", packagingType: "box", unitsPerPackage: 36, packageWeight: "2.88", packageWeightUnit: "lit", federationPrice: "8", interUnionPrice: "9", wholesalePrice: "10", dealerPrice: "11", retailerPrice: "13", mrp: "15", status: "active", image: "/products/ice-cream-mango-dolly.png" },
        { productCode: "IC-005", name: "Aavin Family Pack Vanilla 1L", segment: "Ice Cream", category: "Family Pack", hsnCode: "2105", gstPercent: "18", unitSize: "1000", unitType: "ml", packagingType: "box", unitsPerPackage: 6, packageWeight: "6", packageWeightUnit: "lit", federationPrice: "110", interUnionPrice: "115", wholesalePrice: "120", dealerPrice: "130", retailerPrice: "140", mrp: "150", status: "active", image: "/products/ice-cream-family-vanilla.png" },
        { productCode: "IC-006", name: "Aavin Kulfi Stick 80ml", segment: "Ice Cream", category: "Kulfi", hsnCode: "2105", gstPercent: "18", unitSize: "80", unitType: "ml", packagingType: "box", unitsPerPackage: 48, packageWeight: "3.84", packageWeightUnit: "lit", federationPrice: "10", interUnionPrice: "12", wholesalePrice: "14", dealerPrice: "16", retailerPrice: "18", mrp: "20", status: "active", image: "/products/ice-cream-kulfi.png" },
      ];

      // Insert master products (skip duplicates)
      for (const prod of demoProducts) {
        try {
          const existing = await db.select().from(masterProducts).where(eq(masterProducts.productCode, prod.productCode)).limit(1);
          if (existing.length === 0) {
            await db.insert(masterProducts).values(prod);
            results.products++;
          } else if (prod.image && existing[0].image !== prod.image) {
            await db.update(masterProducts).set({ image: prod.image }).where(eq(masterProducts.productCode, prod.productCode));
          }
        } catch (e) { /* skip duplicates */ }
      }

      const iceCreamImageMap: [RegExp, string][] = [
        [/vannil|vannila/i, '/products/ice-cream-vanilla-cup.png'],
        [/butter scotch/i, '/products/ice-cream-butterscotch-bar.png'],
        [/chocolate/i, '/products/ice-cream-chocolate-cone.png'],
        [/mango/i, '/products/ice-cream-mango-dolly.png'],
        [/pista/i, '/products/ice-cream-kulfi.png'],
        [/strawberry/i, '/products/ice-cream-mango-dolly.png'],
        [/cone/i, '/products/ice-cream-chocolate-cone.png'],
        [/badam/i, '/products/ice-cream-vanilla-cup.png'],
        [/ball/i, '/products/ice-cream-butterscotch-bar.png'],
        [/kulfi/i, '/products/ice-cream-kulfi.png'],
      ];
      const noImageIceCreams = await db.select().from(masterProducts)
        .where(and(eq(masterProducts.segment, 'Ice Cream'), or(isNull(masterProducts.image), eq(masterProducts.image, ''))));
      for (const ic of noImageIceCreams) {
        const match = iceCreamImageMap.find(([re]) => re.test(ic.name));
        const img = match ? match[1] : '/products/ice-cream-vanilla-cup.png';
        await db.update(masterProducts).set({ image: img }).where(eq(masterProducts.id, ic.id));
      }

      // Step 2: Seed B2B users for different roles
      const demoUsers = [
        { name: "Murugan Dairy Distributors", phone: "9876543201", email: "wsd.murugan@demo.in", role: "customer", pricingRole: "WHOLESALE_DEALER", status: "approved", gstNumber: "33ABCDE1234F1ZP" },
        { name: "Sri Lakshmi Stores", phone: "9876543202", email: "dealer.lakshmi@demo.in", role: "customer", pricingRole: "DEALER", status: "approved", gstNumber: "33FGHIJ5678K2ZQ" },
        { name: "Selvi Retail Shop", phone: "9876543203", email: "retailer.selvi@demo.in", role: "customer", pricingRole: "RETAILER", status: "approved" },
        { name: "Vel Murugan Agencies", phone: "9876543204", email: "wsd.vel@demo.in", role: "customer", pricingRole: "WHOLESALE_DEALER", status: "approved", gstNumber: "33KLMNO9012P3ZR" },
        { name: "Annamalai Hotel", phone: "9876543205", email: "institution.annamalai@demo.in", role: "customer", pricingRole: "MRP", status: "approved", isInstitution: true, institutionType: "hotel" },
        { name: "Government School Canteen", phone: "9876543206", email: "school.canteen@demo.in", role: "customer", pricingRole: "MRP", status: "approved", isInstitution: true, institutionType: "school" },
        { name: "Ramesh Kumar", phone: "9876543210", email: "consumer.ramesh@demo.in", role: "customer", pricingRole: "MRP", status: "approved" },
        { name: "Priya Sundaram", phone: "9876543211", email: "consumer.priya@demo.in", role: "customer", pricingRole: "MRP", status: "approved" },
      ];

      const hashedPw = await hashPassword("Aavincart@1978");
      for (const u of demoUsers) {
        try {
          const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email)).limit(1);
          if (existing.length === 0) {
            const isWsd = u.pricingRole === 'WHOLESALE_DEALER';
            await db.insert(usersTable).values({
              name: u.name, phone: u.phone, email: u.email, role: u.role,
              passwordHash: hashedPw, pricingRole: u.pricingRole,
              freshMilkPricingRole: isWsd ? 'DEALER' : u.pricingRole,
              productsPricingRole: u.pricingRole,
              iceCreamPricingRole: u.pricingRole,
              status: u.status, gstNumber: u.gstNumber || null,
              isInstitution: u.isInstitution || false, institutionType: u.institutionType || null,
            });
            results.users++;
          } else {
            await db.update(usersTable).set({ passwordHash: hashedPw }).where(eq(usersTable.email, u.email));
          }
        } catch (e) { /* skip */ }
      }

      // Update admin account password too
      await db.update(usersTable).set({ passwordHash: hashedPw }).where(eq(usersTable.email, "aavincart@gmail.com"));

      // Update KDS and staff user passwords
      try {
        const bcrypt = await import("bcryptjs");
        const bcryptHashedPw = await bcrypt.hash("Aavincart@1978", 10);
        await db.update(kdsUsers).set({ passwordHash: bcryptHashedPw }).where(eq(kdsUsers.username, "teststore"));
        await db.update(unionStaff).set({ passwordHash: bcryptHashedPw }).where(eq(unionStaff.username, "teststore"));
      } catch (e) { /* skip if users don't exist */ }

      // Update existing driver passwords
      const driverEmails = ["driver.9876500001@demo.in", "driver.9876500002@demo.in", "driver.9876500003@demo.in", "driver.9876500004@demo.in", "driver.9876500005@demo.in", "driver.9876500006@demo.in"];
      for (const dEmail of driverEmails) {
        try {
          await db.update(usersTable).set({ passwordHash: hashedPw }).where(eq(usersTable.email, dEmail));
        } catch (e) { /* skip */ }
      }

      // Step 3: Seed delivery drivers with GPS locations
      const driverLocations = (globalThis as any).driverLocations = (globalThis as any).driverLocations || {};
      const demoDrivers = [
        { name: "Karthik S", phone: "9876500001", segment: "Fresh Milk", vehicleNumber: "TN-38-AB-1234", vehicleType: "Refrigerated Van", lat: 11.0168, lng: 76.9558 },
        { name: "Senthil Kumar", phone: "9876500002", segment: "Fresh Milk", vehicleNumber: "TN-38-CD-5678", vehicleType: "Mini Truck", lat: 11.0250, lng: 76.9600 },
        { name: "Ravi Shankar", phone: "9876500003", segment: "Products", vehicleNumber: "TN-38-EF-9012", vehicleType: "Van", lat: 11.0100, lng: 76.9700 },
        { name: "Manikandan V", phone: "9876500004", segment: "Products", vehicleNumber: "TN-38-GH-3456", vehicleType: "Tempo", lat: 11.0300, lng: 76.9450 },
        { name: "Arun Kumar", phone: "9876500005", segment: "Ice Cream", vehicleNumber: "TN-38-IJ-7890", vehicleType: "Refrigerated Van", lat: 11.0200, lng: 76.9800 },
        { name: "Vijay Anand", phone: "9876500006", segment: "Ice Cream", vehicleNumber: "TN-38-KL-1122", vehicleType: "Refrigerated Van", lat: 11.0350, lng: 76.9350 },
      ];

      for (const d of demoDrivers) {
        try {
          const existing = await db.select().from(usersTable).where(eq(usersTable.email, `driver.${d.phone}@demo.in`)).limit(1);
          if (existing.length === 0) {
            const driverId = crypto.randomUUID();
            await db.insert(usersTable).values({
              id: driverId,
              name: d.name, phone: d.phone, email: `driver.${d.phone}@demo.in`,
              role: "driver", passwordHash: hashedPw, pricingRole: "MRP",
              status: "approved", assignedSegment: d.segment,
            });
            driverLocations[driverId] = {
              driverId: driverId, name: d.name, phone: d.phone,
              segment: d.segment, vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType,
              latitude: d.lat + (Math.random() * 0.01 - 0.005),
              longitude: d.lng + (Math.random() * 0.01 - 0.005),
              speed: Math.floor(Math.random() * 35) + 10,
              heading: Math.floor(Math.random() * 360),
              isOnline: true, updatedAt: new Date().toISOString(),
              activeRoute: `Route ${d.segment.charAt(0)}-${Math.floor(Math.random() * 5) + 1}`,
              assignedOrders: Math.floor(Math.random() * 5) + 1,
            };
            results.drivers++;
          }
        } catch (e) { /* skip */ }
      }

      // Step 4: Seed sample orders at various workflow stages (skip if demo orders exist)
      const allOrders = await storage.getOrders();
      const existingDemoOrders = allOrders.filter((o: any) => o.customerEmail?.endsWith('@demo.in'));
      const merchants = await storage.getMerchants();
      const activeRestaurants = await storage.getRestaurants();
      if (merchants.length > 0 && activeRestaurants.length > 0 && existingDemoOrders.length === 0) {
        const merchantId = merchants[0].id;
        const restaurantId = activeRestaurants[0].id;
        const orderStatuses = [
          { status: "pending", workflowStatus: "pending", segment: "Fresh Milk" },
          { status: "confirmed", workflowStatus: "marketing_approved", segment: "Fresh Milk" },
          { status: "confirmed", workflowStatus: "marketing_approved", segment: "Products" },
          { status: "confirmed", workflowStatus: "assigned_to_delivery", segment: "Ice Cream" },
          { status: "confirmed", workflowStatus: "out_for_delivery", segment: "Fresh Milk" },
          { status: "delivered", workflowStatus: "delivered", segment: "Products" },
          { status: "delivered", workflowStatus: "customer_acknowledged", segment: "Ice Cream" },
        ];

        const addresses = [
          "42, Anna Nagar, Coimbatore - 641018",
          "15/2 Gandhipuram Main Road, Coimbatore - 641012",
          "8, RS Puram, Coimbatore - 641002",
          "23 Peelamedu Industrial Area, Coimbatore - 641004",
          "67 Saibaba Colony, Coimbatore - 641011",
          "12 Race Course Road, Coimbatore - 641018",
          "34/1 Lakshmi Mills Junction, Coimbatore - 641019",
          "56 Town Hall Road, Coimbatore - 641001",
        ];

        const customerNames = ["Murugan Dairy", "Sri Lakshmi Stores", "Selvi Retail", "Vel Agencies", "Annamalai Hotel", "Ramesh Kumar", "Priya S", "Kannan Milk Agency"];
        const phones = ["9876543201", "9876543202", "9876543203", "9876543204", "9876543205", "9876543210", "9876543211", "9876543207"];
        const pricingRoles = ["WHOLESALE_DEALER", "DEALER", "RETAILER", "WHOLESALE_DEALER", "MRP", "MRP", "MRP", "DEALER"];

        for (let i = 0; i < orderStatuses.length; i++) {
          const os = orderStatuses[i];
          const items = demoProducts
            .filter(p => p.segment === os.segment)
            .slice(0, 3)
            .map(p => ({
              name: p.name, quantity: Math.floor(Math.random() * 10) + 1,
              price: p.mrp, productCode: p.productCode, productSegment: os.segment,
              gstPercent: p.gstPercent || '0',
            }));
          const subtotal = items.reduce((s, it) => s + (parseFloat(it.price) * it.quantity), 0);
          const tax = items.reduce((s, it) => {
            const gstPct = parseFloat(it.gstPercent || '0');
            if (gstPct > 0) {
              const lineTotal = parseFloat(it.price) * it.quantity;
              return s + (lineTotal - lineTotal / (1 + gstPct / 100));
            }
            return s;
          }, 0);
          const total = subtotal;

          try {
            await storage.createOrder({
              customerName: customerNames[i], customerEmail: `${customerNames[i].toLowerCase().replace(/\s+/g, '.')}@demo.in`,
              customerPhone: phones[i], restaurantId: restaurantId,
              items: items, subtotal: subtotal.toFixed(2), deliveryFee: "0.00",
              tax: tax.toFixed(2), total: total.toFixed(2),
              deliveryAddress: addresses[i], paymentMethod: i < 4 ? "credit" : "cash",
              status: os.status, orderType: i < 6 ? "B2B" : "delivery",
              pricingRole: pricingRoles[i], productSegment: os.segment,
              workflowStatus: os.workflowStatus,
            });
            results.orders++;
          } catch (e) { /* skip */ }
        }
      }

      res.json({
        message: 'Demo data seeded successfully!',
        summary: results,
        loginCredentials: {
          admin: { email: "aavincart@gmail.com", password: "Aavincart@1978", url: "/admin/login" },
          merchant: { username: "cbe (or any union code)", password: "Union@123", url: "/district-union/login" },
          staff: { username: "teststore", password: "Aavincart@1978", url: "/pwa/staff" },
          b2b_customer: { email: "wsd.murugan@demo.in", password: "Aavincart@1978", url: "/" },
          consumer: { email: "consumer.ramesh@demo.in", password: "Aavincart@1978", url: "/" },
          driver: { email: "driver.9876500001@demo.in", password: "Aavincart@1978", url: "/pwa/driver" },
          kds: { username: "teststore", password: "Aavincart@1978", url: "/kds" },
        },
        demoFlow: "Admin Panel → Merchant Portal → PWA Staff App → Tracking → Delivery → KDS"
      });
    } catch (error) {
      console.error('Error seeding demo data:', error);
      res.status(500).json({ error: 'Failed to seed demo data: ' + (error as Error).message });
    }
  });

  // Seed all district union users from spreadsheet (admin-only)
  app.post("/api/admin/seed-district-unions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const districtUnions = [
        { role: "District Union", union_code: "CBE", union_id: "UNI-CBE-01", union_name: "Coimbatore Union", full_name: "Coimbatore District Cooperative Milk Producers Union Ltd", email: "union.cbe@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "CUD", union_id: "UNI-CUD-01", union_name: "Cuddalore Union", full_name: "Cuddalore District Cooperative Milk Producers Union Ltd", email: "union.cud@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "DPI", union_id: "UNI-DPI-01", union_name: "Dharmapuri Union", full_name: "Dharmapuri District Cooperative Milk Producers Union Ltd", email: "union.dpi@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "DGL", union_id: "UNI-DGL-01", union_name: "Dindigul Union", full_name: "Dindigul District Cooperative Milk Producers Union Ltd", email: "union.dgl@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "ERO", union_id: "UNI-ERO-01", union_name: "Erode Union", full_name: "Erode District Cooperative Milk Producers Union Ltd", email: "union.ero@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KAL", union_id: "UNI-KAL-01", union_name: "Kallakurichi Union", full_name: "Kallakurichi District Cooperative Milk Producers Union Ltd", email: "union.kal@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KTU", union_id: "UNI-KTU-01", union_name: "Kanchipuram-Thiruvallur Union", full_name: "Kancheepuram-Thiruvallur District Cooperative Milk Producers Union Ltd", email: "union.ktu@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KYK", union_id: "UNI-KYK-01", union_name: "Kanyakumari Union", full_name: "Kanyakumari District Cooperative Milk Producers Union Ltd", email: "union.kyk@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KRR", union_id: "UNI-KRR-01", union_name: "Karur Union", full_name: "Karur District Cooperative Milk Producers Union Ltd", email: "union.krr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "KGI", union_id: "UNI-KGI-01", union_name: "Krishnagiri Union", full_name: "Krishnagiri District Cooperative Milk Producers Union Ltd", email: "union.kgi@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "MDU", union_id: "UNI-MDU-01", union_name: "Madurai Union", full_name: "Madurai District Cooperative Milk Producers Union Ltd", email: "union.mdu@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "NKL", union_id: "UNI-NKL-01", union_name: "Namakkal Union", full_name: "Namakkal District Cooperative Milk Producers Union Ltd", email: "union.nkl@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "NGR", union_id: "UNI-NGR-01", union_name: "Nilgiris Union", full_name: "Nilgiris District Cooperative Milk Producers Union Ltd", email: "union.ngr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "PUD", union_id: "UNI-PUD-01", union_name: "Pudukkottai Union", full_name: "Pudukkottai District Cooperative Milk Producers Union Ltd", email: "union.pud@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "SLM", union_id: "UNI-SLM-01", union_name: "Salem Union", full_name: "Salem District Cooperative Milk Producers Union Ltd", email: "union.slm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "SVG", union_id: "UNI-SVG-01", union_name: "Sivagangai Union", full_name: "Sivagangai District Cooperative Milk Producers Union Ltd", email: "union.svg@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TNJ", union_id: "UNI-TNJ-01", union_name: "Thanjavur Union", full_name: "Thanjavur District Cooperative Milk Producers Union Ltd", email: "union.tnj@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "THN", union_id: "UNI-THN-01", union_name: "Theni Union", full_name: "Theni District Cooperative Milk Producers Union Ltd", email: "union.thn@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TUT", union_id: "UNI-TUT-01", union_name: "Thoothukudi Union", full_name: "Thoothukudi District Cooperative Milk Producers Union Ltd", email: "union.tut@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TPT", union_id: "UNI-TPT-01", union_name: "Thirupathur Union", full_name: "Thirupathur District Cooperative Milk Producers Union Ltd", email: "union.tpt@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TNV", union_id: "UNI-TNV-01", union_name: "Tirunelveli Union", full_name: "Tirunelveli District Cooperative Milk Producers Union Ltd", email: "union.tnv@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TPR", union_id: "UNI-TPR-01", union_name: "Tirupur Union", full_name: "Tirupur District Cooperative Milk Producers Union Ltd", email: "union.tpr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TVM", union_id: "UNI-TVM-01", union_name: "Thiruvannamalai Union", full_name: "Thiruvannamalai District Cooperative Milk Producers Union Ltd", email: "union.tvm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "TRY", union_id: "UNI-TRY-01", union_name: "Trichy Union", full_name: "Trichy District Cooperative Milk Producers Union Ltd", email: "union.try@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VLR", union_id: "UNI-VLR-01", union_name: "Vellore Union", full_name: "Vellore District Cooperative Milk Producers Union Ltd", email: "union.vlr@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VPM", union_id: "UNI-VPM-01", union_name: "Villupuram Union", full_name: "Villupuram District Cooperative Milk Producers Union Ltd", email: "union.vpm@aavincart.in", password: "Union@123" },
        { role: "District Union", union_code: "VNR", union_id: "UNI-VNR-01", union_name: "Virudhunagar Union", full_name: "Virudhunagar District Cooperative Milk Producers Union Ltd", email: "union.vnr@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FEB-MAD", union_id: "FED-MAD-01", union_name: "Madhavaram Dairy", full_name: "Madhavaram Dairy", email: "madhavaram.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-AMB", union_id: "FED-AMB-01", union_name: "Ambattur Dairy", full_name: "Ambattur Dairy", email: "ambattur.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-SHL", union_id: "FED-SHL-01", union_name: "Sholinganallur Dairy", full_name: "Sholinganallur Dairy", email: "sholinganallur.dairy@aavincart.in", password: "Union@123" },
        { role: "Fed_District Union", union_code: "FED-PROD", union_id: "FED-PROD-01", union_name: "Products Dairy Ambattur", full_name: "Products Dairy (Ambattur)", email: "products.dairy@aavincart.in", password: "Union@123" },
      ];

      const existingMerchants = await storage.getMerchants();
      const created: string[] = [];
      const skipped: string[] = [];

      for (const union of districtUnions) {
        const exists = existingMerchants.some(m => 
          m.username === union.union_code.toLowerCase() || 
          m.contactEmail === union.email
        );
        
        if (exists) {
          skipped.push(union.union_code);
          continue;
        }

        const merchantData = {
          merchantUuid: crypto.randomUUID(),
          restaurantName: union.full_name,
          restaurantSlug: union.union_code.toLowerCase(),
          restaurantPhone: "9843777277",
          contactName: union.union_name,
          contactPhone: "9843777277",
          contactEmail: union.email,
          address: `${union.union_name}, Tamil Nadu`,
          description: union.full_name,
          shortDescription: union.union_name,
          username: union.union_code.toLowerCase(),
          password: union.password,
          status: 'active' as const,
          pricingTierCode: union.role === 'Fed_District Union' ? 'FEDERATION' : 'INTER_UNION',
          logo: '',
          headerImage: '',
          deliveryDistanceCovered: "0.00",
          isFeatured: 0,
          isReady: 1,
          isSponsored: 0,
          isCommission: 0,
          freeDelivery: 0,
        };

        try {
          const validatedMerchant = insertMerchantSchema.parse(merchantData);
          await storage.createMerchant(validatedMerchant);
          created.push(union.union_code);
        } catch (err) {
          console.error(`Failed to create union ${union.union_code}:`, err);
          skipped.push(union.union_code);
        }
      }

      res.json({ 
        message: 'District unions seeded successfully',
        created: created.length,
        skipped: skipped.length,
        createdUnions: created,
        skippedUnions: skipped
      });
    } catch (error) {
      console.error('Error seeding district unions:', error);
      res.status(500).json({ error: 'Failed to seed district unions' });
    }
  });

  app.get("/api/admin/merchants/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      res.json(merchant);
    } catch (error) {
      console.error('Error fetching merchant:', error);
      res.status(500).json({ error: 'Failed to fetch merchant' });
    }
  });

  app.put("/api/admin/merchants/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const body = { ...req.body };
      
      // Convert date strings to Date objects for validation
      const dateFields = ['dateActivated', 'lastLogin', 'membershipExpired', 'createdAt', 'updatedAt'];
      for (const field of dateFields) {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      }
      
      // Remove read-only fields that shouldn't be updated
      delete body.id;
      delete body.createdAt;
      
      const updates = insertMerchantSchema.partial().parse(body);
      const merchant = await storage.updateMerchant(req.params.id, updates);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      res.json(merchant);
    } catch (error: any) {
      console.error('Error updating merchant:', error);
      const errorMessage = error?.message || 'Failed to update merchant';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.delete("/api/admin/merchants/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteMerchant(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      res.json({ message: 'Merchant deleted successfully' });
    } catch (error) {
      console.error('Error deleting merchant:', error);
      res.status(500).json({ error: 'Failed to delete merchant' });
    }
  });

  app.patch("/api/admin/merchants/:id/payment-settings", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { razorpay, cashfree, sbi, cod } = req.body;
      const paymentSettings: Record<string, boolean> = {};
      if (typeof razorpay === 'boolean') paymentSettings.razorpay = razorpay;
      if (typeof cashfree === 'boolean') paymentSettings.cashfree = cashfree;
      if (typeof sbi === 'boolean') paymentSettings.sbi = sbi;
      if (typeof cod === 'boolean') paymentSettings.cod = cod;

      const merchant = await storage.getMerchant(id);
      if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

      const existing = ((merchant as any).paymentSettings as Record<string, boolean>) || {};
      const merged = { ...existing, ...paymentSettings };

      await storage.updateMerchant(id, { paymentSettings: merged } as any);
      res.json({ success: true, paymentSettings: merged });
    } catch (error: any) {
      console.error('Error updating payment settings:', error);
      res.status(500).json({ error: error.message || 'Failed to update payment settings' });
    }
  });

  app.get("/api/admin/merchants/:id/payment-settings", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        const scope = getMerchantScope(req);
        const callerIds = scope.merchantId ? getAllIdsForMerchant(scope.merchantId) : [];
        const requestedIds = getAllIdsForMerchant(id);
        const hasAccess = callerIds.some(cid => requestedIds.includes(cid));
        if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      }
      const merchant = await storage.getMerchant(id);
      if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
      const ps = ((merchant as any).paymentSettings as Record<string, boolean>) || {};
      res.json(ps);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch payment settings' });
    }
  });

  // ===============================================
  // CLIENT/CUSTOMER MANAGEMENT API
  // ===============================================

  app.get("/api/admin/clients", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.post("/api/admin/clients", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedClient = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedClient);
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  app.get("/api/admin/clients/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  });

  app.put("/api/admin/clients/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, updates);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.delete("/api/admin/clients/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  // ===============================================
  // MENU ITEMS MANAGEMENT API
  // ===============================================

  app.get("/api/admin/items", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.post("/api/admin/items", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedItem = insertItemSchema.parse(req.body);
      const item = await storage.createItem(validatedItem);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  app.get("/api/admin/items/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  app.put("/api/admin/items/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(req.params.id, updates);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  app.delete("/api/admin/items/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // ===============================================
  // SUBSCRIPTION PLANS MANAGEMENT API
  // ===============================================

  app.get("/api/admin/plans", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  app.post("/api/admin/plans", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedPlan = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(validatedPlan);
      res.status(201).json(plan);
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(500).json({ error: 'Failed to create plan' });
    }
  });

  app.get("/api/admin/plans/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json(plan);
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(500).json({ error: 'Failed to fetch plan' });
    }
  });

  app.put("/api/admin/plans/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(req.params.id, updates);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json(plan);
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({ error: 'Failed to update plan' });
    }
  });

  app.delete("/api/admin/plans/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deletePlan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting plan:', error);
      res.status(500).json({ error: 'Failed to delete plan' });
    }
  });

  // ===============================================
  // INVOICE MANAGEMENT API
  // ===============================================

  app.get("/api/admin/invoices", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post("/api/admin/invoices", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedInvoice = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedInvoice);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.get("/api/admin/invoices/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  app.put("/api/admin/invoices/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, updates);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  app.delete("/api/admin/invoices/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // ===============================================
  // B2B INVOICE MANAGEMENT API
  // ===============================================

  // Get B2B invoices for a merchant
  app.get("/api/merchants/:merchantId/b2b-invoices", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const invoices = await storage.getB2BInvoices(merchantId, start, end);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching B2B invoices:', error);
      res.status(500).json({ error: 'Failed to fetch B2B invoices' });
    }
  });

  // Get single B2B invoice
}
