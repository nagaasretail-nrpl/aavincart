import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, getAllIdsForMerchant, merchantToUnionMapping } from "./shared";
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

export async function registerErpSettingsRoutes(app: Express): Promise<void> {
  app.get("/api/mmo/daily-indents", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Security: Only admin, staff, or union roles can view MMO indents
      const allowedRoles = ['admin', 'staff', 'restaurant', 'production_manager', 'marketing_manager'];
      if (!allowedRoles.includes(user.role || '')) {
        return res.status(403).json({ error: 'Access denied. Staff access required.' });
      }
      
      const { status, segment, mmoOffice, date } = req.query;
      
      let query = sql`SELECT * FROM daily_indents WHERE 1=1`;
      
      // Security: Non-admin users MUST have a unionId and can only see indents for their union
      if (user.role !== 'admin') {
        if (!user.unionId) {
          return res.status(403).json({ error: 'Access denied. Union association required.' });
        }
        query = sql`${query} AND union_id = ${user.unionId}`;
      }
      
      if (status) {
        query = sql`${query} AND status = ${status as string}`;
      } else {
        // Default to pending
        query = sql`${query} AND status = 'pending'`;
      }
      if (segment) {
        query = sql`${query} AND product_segment = ${segment as string}`;
      }
      if (mmoOffice) {
        query = sql`${query} AND mmo_office = ${mmoOffice as string}`;
      }
      if (date) {
        query = sql`${query} AND DATE(delivery_date) = DATE(${new Date(date as string)})`;
      }
      
      query = sql`${query} ORDER BY delivery_date ASC, submitted_at ASC LIMIT 100`;
      
      const result = await db.execute(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching MMO indents:', error);
      res.status(500).json({ error: 'Failed to fetch indents' });
    }
  });
  
  // Approve/reject an indent (MMO staff action - admin/staff only)
  app.patch("/api/mmo/daily-indents/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Security: Only admin, staff, or union roles can update indents
      const allowedRoles = ['admin', 'staff', 'restaurant', 'production_manager', 'marketing_manager'];
      if (!allowedRoles.includes(user.role || '')) {
        return res.status(403).json({ error: 'Access denied. Staff access required.' });
      }
      
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      
      if (!status || !['approved', 'rejected', 'dispatched', 'delivered'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Security: Non-admin users MUST have unionId and can only update indents for their union
      let result;
      if (user.role !== 'admin') {
        if (!user.unionId) {
          return res.status(403).json({ error: 'Access denied. Union association required.' });
        }
        result = await db.execute(
          sql`UPDATE daily_indents 
              SET status = ${status},
                  processed_by = ${user.id},
                  processed_at = NOW(),
                  rejection_reason = ${rejectionReason || null},
                  updated_at = NOW()
              WHERE id = ${id} AND union_id = ${user.unionId}
              RETURNING *`
        );
      } else {
        result = await db.execute(
          sql`UPDATE daily_indents 
              SET status = ${status},
                  processed_by = ${user.id},
                  processed_at = NOW(),
                  rejection_reason = ${rejectionReason || null},
                  updated_at = NOW()
              WHERE id = ${id}
              RETURNING *`
        );
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Indent not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating indent:', error);
      res.status(500).json({ error: 'Failed to update indent' });
    }
  });

  // ===============================================
  // MOBILE APP - getAttributes ENDPOINT
  // ===============================================

  const JWT_SECRET = 'aavincart-mobile-config-secret';

  app.post("/api/getAttributes", async (req, res) => {
    try {
      let googleMapsApiKey = process.env.GOOGLE_API_KEY || '';

      try {
        const dbSettings = await storage.getApiSettings('google_maps');
        const activeKey = dbSettings.find(s => s.enabled && s.apiKey);
        if (activeKey && activeKey.apiKey) {
          googleMapsApiKey = activeKey.apiKey;
        }
      } catch (dbErr) {
      }

      const mapsConfig = {
        key: googleMapsApiKey,
        provider: "google.maps",
        zoom: 15,
        language: "en",
        default_lat: 11.6643,
        default_lng: 78.1460,
        icon_destination: "/images/pin-destination.png",
        icon_merchant: "/images/pin-merchant.png",
        icon_rider: "/images/pin-rider.png",
      };

      const languageData = {
        locale: "en",
        rtl: false,
        data: [
          { code: "en", title: "English", description: "English language", rtl: 0 },
          { code: "ta", title: "தமிழ்", description: "Tamil language", rtl: 0 },
        ],
      };

      const realtimeData = {
        enabled: false,
      };

      const mapsConfigToken = jwt.sign(mapsConfig, JWT_SECRET);
      const languageDataToken = jwt.sign(languageData, JWT_SECRET);
      const realtimeToken = jwt.sign(realtimeData, JWT_SECRET);

      res.json({
        code: 1,
        msg: "success",
        details: {
          phone_default_data: {
            phone_prefix: "+91",
            country_code: "IN",
          },
          login_method: "phone",
          data: {
            search_mode: "address",
            distance_unit: "km",
          },
          tips_list: [],
          maps_config: mapsConfigToken,
          language_data: languageDataToken,
          realtime: realtimeToken,
          money_config: {
            currency_symbol: "₹",
            currency_code: "INR",
            decimal_places: 2,
            thousand_separator: ",",
            decimal_separator: ".",
            position: "left",
          },
          invite_friend_settings: {
            enabled: true,
            title: "Join Aavincart",
            text: "Order fresh Aavin milk and dairy products on Aavincart! Use my referral link to sign up.",
            url: typeof req !== 'undefined' ? `${req.protocol}://${req.get('host')}` : "https://aavincart.replit.app",
          },
          enabled_language: true,
          addons_use_checkbox: false,
          category_use_slide: true,
          app_enabled_google_login: false,
          app_enabled_fb_login: false,
          app_enabled_apple_login: false,
          multicurrency_enabled: false,
          multicurrency_hide_payment: false,
          multicurrency_enabled_force: false,
          default_currency_code: "INR",
          currency_list: [
            { code: "INR", symbol: "₹", name: "Indian Rupee" },
          ],
          points_enabled: false,
          captcha_settings: { enabled: false },
          booking_status_list: [],
          use_thresholds: false,
          digitalwallet_enabled: false,
          digitalwallet_enabled_topup: false,
          chat_enabled: false,
          appversion_data: {
            android: { version: "1.0.0", force_update: false },
            ios: { version: "1.0.0", force_update: false },
          },
          enabled_include_utensils: false,
          enabled_review: true,
          address_format_use: "default",
          password_reset_options: ["phone"],
          signup_resend_counter: 60,
          cancel_order_enabled: true,
          online_services: ["delivery", "pickup"],
          default_service: "delivery",
          delivery_option: ["standard"],
          phone_prefix_data: {
            IN: {
              phonecode: "91",
              country_name: "India",
              flag: "🇮🇳",
            },
          },
        },
      });
    } catch (error) {
      console.error('Error in getAttributes:', error);
      res.status(500).json({ code: 2, msg: "Failed to load settings" });
    }
  });

  // ===============================================
  // DRIVER APP - getSettings ENDPOINT
  // ===============================================

  app.post("/api/getSettings", async (req, res) => {
    try {
      let googleMapsApiKey = process.env.GOOGLE_API_KEY || '';

      try {
        const dbSettings = await storage.getApiSettings('google_maps');
        const activeKey = dbSettings.find(s => s.enabled && s.apiKey);
        if (activeKey && activeKey.apiKey) {
          googleMapsApiKey = activeKey.apiKey;
        }
      } catch (dbErr) {
      }

      const mapsConfig = {
        key: googleMapsApiKey,
        provider: "google.maps",
        zoom: 15,
        language: "en",
        default_lat: 11.6643,
        default_lng: 78.1460,
        icon_destination: "/images/pin-destination.png",
        icon_merchant: "/images/pin-merchant.png",
        icon_rider: "/images/pin-rider.png",
      };

      const phoneSettings = {
        phone_prefix: "+91",
        country_code: "IN",
        phone_length: 10,
      };

      const langData = {
        locale: "en",
        rtl: false,
      };

      const realtimeData = {
        enabled: false,
        provider: "",
      };

      const mapsConfigToken = jwt.sign(mapsConfig, JWT_SECRET);
      const phoneSettingsToken = jwt.sign(phoneSettings, JWT_SECRET);
      const langDataToken = jwt.sign(langData, JWT_SECRET);
      const realtimeDataToken = jwt.sign(realtimeData, JWT_SECRET);

      res.json({
        code: 1,
        msg: "success",
        details: {
          maps_config: mapsConfigToken,
          phone_settings: phoneSettingsToken,
          lang_data: langDataToken,
          server_time: new Date().toISOString(),
          data: {
            distance_unit: "km",
            search_mode: "address",
          },
          calendar_data: {
            first_day: 1,
            date_format: "DD/MM/YYYY",
            time_format: "hh:mm A",
          },
          timezone: "Asia/Kolkata",
          break_duration: [
            { label: "15 minutes", value: 15 },
            { label: "30 minutes", value: 30 },
            { label: "1 hour", value: 60 },
            { label: "2 hours", value: 120 },
          ],
          realtime_data: realtimeDataToken,
          money_config: {
            currency_symbol: "₹",
            currency_code: "INR",
            decimal_places: 2,
            thousand_separator: ",",
            decimal_separator: ".",
            position: "left",
          },
          cashin_denomination: [10, 20, 50, 100, 200, 500, 2000],
          legal_menu: [
            { label: "Terms & Conditions", slug: "terms" },
            { label: "Privacy Policy", slug: "privacy" },
          ],
          vehicle_maker: [
            { id: 1, name: "Ashok Leyland" },
            { id: 2, name: "Tata Motors" },
            { id: 3, name: "Mahindra" },
            { id: 4, name: "Eicher" },
            { id: 5, name: "Hero" },
            { id: 6, name: "TVS" },
            { id: 7, name: "Bajaj" },
          ],
          vehicle_type: [
            { id: 1, name: "Milk Van" },
            { id: 2, name: "Refrigerated Truck" },
            { id: 3, name: "Three Wheeler" },
            { id: 4, name: "Two Wheeler" },
            { id: 5, name: "Mini Truck" },
          ],
        },
      });
    } catch (error) {
      console.error('Error in getSettings:', error);
      res.status(500).json({ code: 2, msg: "Failed to load settings" });
    }
  });

  // ===============================================
  // MERCHANT APP LOGIN - /api/Login endpoint
  // ===============================================
  // The merchant web app calls POST /api/Login with form-urlencoded data (username & password)
  app.post("/api/Login", async (req, res) => {
    try {
      const username = req.body.username;
      const password = req.body.password;
      
      if (!username || !password) {
        return res.json({ code: 2, msg: "Username and password are required" });
      }
      
      const merchants = await storage.getMerchants();
      const merchant = merchants.find(m => m.username === username);
      
      if (!merchant) {
        return res.json({ code: 2, msg: "Invalid username or password" });
      }
      
      if (merchant.password !== password) {
        return res.json({ code: 2, msg: "Invalid username or password" });
      }
      
      if (merchant.status !== 'active') {
        return res.json({ code: 2, msg: "Your account is not active. Please contact admin." });
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
        code: 1,
        msg: "Login successful",
        details: {
          user_data: token,
          user_token: token,
          user_settings: {
            id: merchant.id,
            first_name: merchant.restaurantName || '',
            last_name: '',
            email_address: merchant.contactEmail || '',
            phone_prefix: '+91',
            contact_number: merchant.contactPhone || '',
            contact_number_without_prefix: merchant.contactPhone || '',
            profile_photo: '',
            role: 'merchant',
            merchant_id: merchant.id,
            merchant_name: merchant.restaurantName,
            restaurant_slug: merchant.restaurantSlug,
          },
          menu_access: {
            dashboard: true,
            orders: true,
            products: true,
            categories: true,
            settings: true,
            reports: true,
            staff: true,
            delivery: true,
          },
          app_settings: {
            currency: '₹',
            currency_code: 'INR',
            app_name: 'Aavincart Union',
            merchant_id: merchant.id,
          },
        },
      });
    } catch (error: any) {
      console.error('Merchant Login error:', error);
      return res.json({ code: 2, msg: error.message || "Login failed" });
    }
  });

  // Also handle /api/authenticate for merchant session verification  
  app.post("/api/authenticate", async (req, res) => {
    try {
      const token = req.body.token || req.cookies?.merchant_token;
      if (!token) {
        return res.json({ code: 2, msg: "Not authenticated" });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.json({ code: 2, msg: "Invalid or expired token" });
      }
      return res.json({ code: 1, msg: "Authenticated", details: { user_data: token, user_token: token } });
    } catch (error: any) {
      return res.json({ code: 2, msg: "Authentication failed" });
    }
  });

  // ===============================================
  // MERCHANT APP - interfacemerchant ENDPOINTS
  // ===============================================

  // Merchant Login via interfacemerchant path (used by built merchant web app)
  app.post("/api/interfacemerchant/Login", async (req, res) => {
    req.url = "/api/Login";
    app.handle(req, res);
  });

  // Merchant authenticate via interfacemerchant path
  app.post("/api/interfacemerchant/authenticate", async (req, res) => {
    req.url = "/api/authenticate";
    app.handle(req, res);
  });

  app.post("/api/interfacemerchant/getAttributes", async (req, res) => {
    try {
      let googleMapsApiKey = process.env.GOOGLE_API_KEY || '';

      try {
        const dbSettings = await storage.getApiSettings('google_maps');
        const activeKey = dbSettings.find(s => s.enabled && s.apiKey);
        if (activeKey && activeKey.apiKey) {
          googleMapsApiKey = activeKey.apiKey;
        }
      } catch (dbErr) {
      }

      const mapsConfig = {
        key: googleMapsApiKey,
        provider: "google.maps",
        zoom: 15,
        language: "en",
        default_lat: 11.6643,
        default_lng: 78.1460,
        icon_destination: "/images/pin-destination.png",
        icon_merchant: "/images/pin-merchant.png",
        icon_rider: "/images/pin-rider.png",
      };

      const languageData = {
        locale: "en",
        rtl: false,
      };

      const realtimeData = {
        enabled: false,
      };

      const mapsConfigToken = jwt.sign(mapsConfig, JWT_SECRET);
      const languageDataToken = jwt.sign(languageData, JWT_SECRET);
      const realtimeToken = jwt.sign(realtimeData, JWT_SECRET);

      const orderStatuses = [
        { id: "pending", label: "Pending" },
        { id: "accepted", label: "Accepted" },
        { id: "preparing", label: "Preparing" },
        { id: "ready", label: "Ready for Pickup" },
        { id: "out_for_delivery", label: "Out for Delivery" },
        { id: "delivered", label: "Delivered" },
        { id: "cancelled", label: "Cancelled" },
      ];

      res.json({
        code: 1,
        msg: "success",
        details: {
          language_data: languageDataToken,
          money_config: {
            currency_symbol: "₹",
            currency_code: "INR",
            decimal_places: 2,
            thousand_separator: ",",
            decimal_separator: ".",
            position: "left",
          },
          realtime: realtimeToken,
          legal_menu: [
            { label: "Terms & Conditions", slug: "terms" },
            { label: "Privacy Policy", slug: "privacy" },
          ],
          language_list: [
            { code: "en", name: "English" },
            { code: "ta", name: "Tamil" },
          ],
          last_order: null,
          rejection_list: [
            { id: 1, label: "Out of stock" },
            { id: 2, label: "Store closed" },
            { id: 3, label: "Too busy" },
            { id: 4, label: "Customer request" },
            { id: 5, label: "Other" },
          ],
          dish_list: [
            { id: "milk", label: "Milk" },
            { id: "curd", label: "Curd" },
            { id: "buttermilk", label: "Buttermilk" },
            { id: "ghee", label: "Ghee" },
            { id: "paneer", label: "Paneer" },
            { id: "ice_cream", label: "Ice Cream" },
            { id: "flavoured_milk", label: "Flavoured Milk" },
            { id: "cheese", label: "Cheese" },
            { id: "butter", label: "Butter" },
          ],
          status_list: orderStatuses.map(s => ({ label: s.label, value: s.id })),
          status_list_raw: orderStatuses,
          booking_status_list: [],
          booking_status_list_value: [],
          bank_status_list: [
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ],
          multi_option: {
            enabled: false,
          },
          two_flavor_properties: [],
          promo_type: [
            { id: "percentage", label: "Percentage" },
            { id: "fixed", label: "Fixed Amount" },
          ],
          cuisine: [
            { id: 1, label: "Dairy" },
            { id: 2, label: "Fresh Milk" },
            { id: 3, label: "Products" },
          ],
          services: [
            { id: "delivery", label: "Delivery" },
            { id: "pickup", label: "Pickup" },
          ],
          tags: [
            { id: 1, label: "Aavin" },
            { id: 2, label: "Fresh" },
            { id: 3, label: "Organic" },
          ],
          unit: [
            { id: "ml", label: "ml" },
            { id: "l", label: "Litre" },
            { id: "g", label: "Gram" },
            { id: "kg", label: "Kilogram" },
            { id: "pcs", label: "Pieces" },
            { id: "pack", label: "Pack" },
          ],
          featured: [
            { id: 1, label: "Featured" },
            { id: 0, label: "Not Featured" },
          ],
          two_flavor_options: [],
          tips: [10, 20, 50, 100],
          tip_type: [
            { id: "percentage", label: "Percentage" },
            { id: "fixed", label: "Fixed" },
          ],
          day_list: [
            { id: 0, label: "Sunday" },
            { id: 1, label: "Monday" },
            { id: 2, label: "Tuesday" },
            { id: 3, label: "Wednesday" },
            { id: 4, label: "Thursday" },
            { id: 5, label: "Friday" },
            { id: 6, label: "Saturday" },
          ],
          day_week: [
            { id: 1, label: "Monday" },
            { id: 2, label: "Tuesday" },
            { id: 3, label: "Wednesday" },
            { id: 4, label: "Thursday" },
            { id: 5, label: "Friday" },
            { id: 6, label: "Saturday" },
            { id: 0, label: "Sunday" },
          ],
          registration_settings: {
            require_approval: true,
          },
          phone_default_data: {
            phone_prefix: "+91",
            country_code: "IN",
          },
          printer_list: [],
          app_version_android: "1.0.0",
          app_version_ios: "1.0.0",
          android_download_url: "",
          ios_download_url: "",
          enabled_language: [
            { code: "en", name: "English" },
            { code: "ta", name: "Tamil" },
          ],
          time_range: { start: "00:00", end: "23:59" },
          time_interval: 30,
          time_interval_list: [15, 30, 45, 60],
          salary_type: [
            { id: "monthly", label: "Monthly" },
            { id: "weekly", label: "Weekly" },
            { id: "daily", label: "Daily" },
          ],
          employment_type: [
            { id: "full_time", label: "Full Time" },
            { id: "part_time", label: "Part Time" },
            { id: "contract", label: "Contract" },
          ],
          commission_type: [
            { id: "percentage", label: "Percentage" },
            { id: "fixed", label: "Fixed" },
          ],
          customer_status: [
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
            { id: "blocked", label: "Blocked" },
          ],
          maps_config: mapsConfigToken,
          phone_prefix_data: {
            IN: {
              phonecode: "91",
              country_name: "India",
              flag: "🇮🇳",
            },
          },
          delayed_min_list: {
            "1": { id: 5, value: "5 minutes" },
            "2": { id: 10, value: "10 minutes" },
            "3": { id: 15, value: "15 minutes" },
            "4": { id: 30, value: "30 minutes" },
            "5": { id: 45, value: "45 minutes" },
            "6": { id: 60, value: "60 minutes" },
          },
          settings_data: null,
        },
      });
    } catch (error) {
      console.error('Error in merchant getAttributes:', error);
      res.status(500).json({ code: 2, msg: "Failed to load settings" });
    }
  });

  app.post("/api/interfacemerchant/getSettings", (req, res) => {
    try {
      res.json({
        code: 1,
        msg: "success",
        details: {
          merchant_tax_number: "",
          merchant_two_flavor_option: 0,
          merchant_extenal: "",
          merchant_close_store: 0,
          merchant_enabled_voucher: 0,
          merchant_enabled_tip: 0,
          merchant_default_tip: 0,
          merchant_tip_type: "percentage",
          tips_in_transactions: 0,
        },
      });
    } catch (error) {
      console.error('Error in merchant getSettings:', error);
      res.status(500).json({ code: 2, msg: "Failed to load settings" });
    }
  });

  app.post("/api/interfacemerchant/getlocationAutocomplete", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.json({ code: 2, msg: "Maps API key not configured" });
      const q = req.body.q || '';
      if (!q) return res.json({ code: 1, msg: "success", details: { data: [] } });
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&components=country:in&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        const predictions = (data.predictions || []).map((p: any) => ({
          id: p.place_id,
          description: p.description,
          main_text: p.structured_formatting?.main_text || '',
          secondary_text: p.structured_formatting?.secondary_text || '',
        }));
        res.json({ code: 1, msg: "success", details: { data: predictions } });
      } else {
        res.json({ code: 2, msg: data.error_message || "Autocomplete failed" });
      }
    } catch (error) {
      res.status(500).json({ code: 2, msg: "Failed to get autocomplete results" });
    }
  });

  app.post("/api/interfacemerchant/reverseGeocoding", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.json({ code: 2, msg: "Maps API key not configured" });
      const lat = req.body.lat;
      const lng = req.body.lng;
      if (!lat || !lng) return res.json({ code: 2, msg: "Latitude and longitude required" });
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];
        const getComponent = (type: string) => {
          const comp = components.find((c: any) => c.types.includes(type));
          return comp ? comp.long_name : '';
        };
        res.json({
          code: 1, msg: "success",
          details: {
            address_details: {
              formatted_address: result.formatted_address,
              place_text: getComponent('sublocality_level_1') || getComponent('locality') || getComponent('administrative_area_level_2'),
              address: {
                street: getComponent('route') || getComponent('sublocality_level_2') || '',
                city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
                state: getComponent('administrative_area_level_1') || '',
                country: getComponent('country') || '',
                postal_code: getComponent('postal_code') || '',
              },
              lat: parseFloat(lat), lng: parseFloat(lng),
              place_id: result.place_id,
            },
          },
        });
      } else {
        res.json({ code: 2, msg: data.error_message || "Geocoding failed" });
      }
    } catch (error) {
      res.status(500).json({ code: 2, msg: "Failed to reverse geocode" });
    }
  });

  app.post("/api/interfacemerchant/getLocationDetails", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.json({ code: 2, msg: "Maps API key not configured" });
      const placeId = req.body.place_id;
      if (!placeId) return res.json({ code: 2, msg: "Place ID required" });
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components,name&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const components = result.address_components || [];
        const getComponent = (type: string) => {
          const comp = components.find((c: any) => c.types.includes(type));
          return comp ? comp.long_name : '';
        };
        res.json({
          code: 1, msg: "success",
          details: {
            data: {
              formatted_address: result.formatted_address,
              place_text: result.name || getComponent('sublocality_level_1') || getComponent('locality'),
              address: {
                street: getComponent('route') || getComponent('sublocality_level_2') || '',
                city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
                state: getComponent('administrative_area_level_1') || '',
                country: getComponent('country') || '',
                postal_code: getComponent('postal_code') || '',
              },
              lat: result.geometry?.location?.lat || 0,
              lng: result.geometry?.location?.lng || 0,
              place_id: placeId,
            },
          },
        });
      } else {
        res.json({ code: 2, msg: data.error_message || "Failed to get place details" });
      }
    } catch (error) {
      res.status(500).json({ code: 2, msg: "Failed to get location details" });
    }
  });

  // ===============================================
  // MOBILE APP - Google Places API Proxy Endpoints
  // ===============================================

  app.post("/api/getlocationAutocomplete", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.json({ code: 2, msg: "Maps API key not configured" });
      }

      const q = req.body.q || '';
      if (!q) {
        return res.json({ code: 1, msg: "success", details: { data: [] } });
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&components=country:in&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        const predictions = (data.predictions || []).map((p: any) => ({
          id: p.place_id,
          description: p.description,
          main_text: p.structured_formatting?.main_text || '',
          secondary_text: p.structured_formatting?.secondary_text || '',
        }));
        res.json({ code: 1, msg: "success", details: { data: predictions } });
      } else {
        console.error('Places Autocomplete error:', data.status, data.error_message);
        res.json({ code: 2, msg: data.error_message || "Autocomplete failed" });
      }
    } catch (error) {
      console.error('Error in getlocationAutocomplete:', error);
      res.status(500).json({ code: 2, msg: "Failed to get autocomplete results" });
    }
  });

  app.post("/api/reverseGeocoding", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.json({ code: 2, msg: "Maps API key not configured" });
      }

      const lat = req.body.lat;
      const lng = req.body.lng;
      if (!lat || !lng) {
        return res.json({ code: 2, msg: "Latitude and longitude required" });
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];

        const getComponent = (type: string) => {
          const comp = components.find((c: any) => c.types.includes(type));
          return comp ? comp.long_name : '';
        };

        const addressDetails = {
          formatted_address: result.formatted_address,
          place_text: getComponent('sublocality_level_1') || getComponent('locality') || getComponent('administrative_area_level_2'),
          address: {
            street: getComponent('route') || getComponent('sublocality_level_2') || '',
            city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
            state: getComponent('administrative_area_level_1') || '',
            country: getComponent('country') || '',
            postal_code: getComponent('postal_code') || '',
          },
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          place_id: result.place_id,
        };

        res.json({ code: 1, msg: "success", details: { address_details: addressDetails } });
      } else {
        console.error('Reverse geocoding error:', data.status, data.error_message);
        res.json({ code: 2, msg: data.error_message || "Geocoding failed" });
      }
    } catch (error) {
      console.error('Error in reverseGeocoding:', error);
      res.status(500).json({ code: 2, msg: "Failed to reverse geocode" });
    }
  });

  const geocodeCache = new Map<string, { data: any; timestamp: number }>();
  const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000;
  let nominatimLastCall = 0;

  app.post("/api/geocode/reverse", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });

      const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
      const cached = geocodeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_TTL) {
        return res.json({ ...cached.data, source: "cache" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (apiKey) {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.status === 'OK' && data.results?.length > 0) {
            const result = data.results[0];
            const components = result.address_components || [];
            const getComp = (type: string) => {
              const c = components.find((c: any) => c.types.includes(type));
              return c ? c.long_name : '';
            };
            const parsed = {
              formatted: result.formatted_address,
              street: getComp('route') || getComp('sublocality_level_2') || getComp('sublocality_level_1') || '',
              city: getComp('locality') || getComp('administrative_area_level_2') || '',
              state: getComp('administrative_area_level_1') || '',
              pincode: getComp('postal_code') || '',
              country: getComp('country') || 'India',
              placeId: result.place_id || '',
              source: "google",
            };
            geocodeCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
            return res.json(parsed);
          }
        } catch (e) {
          console.error('Google geocode failed, trying Nominatim:', e);
        }
      }

      const now = Date.now();
      if (now - nominatimLastCall < 1100) {
        await new Promise(r => setTimeout(r, 1100 - (now - nominatimLastCall)));
      }
      nominatimLastCall = Date.now();
      try {
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
          headers: { 'User-Agent': 'AavinCart/1.0' },
        });
        const nomData = await nomRes.json();
        if (nomData.address) {
          const a = nomData.address;
          const parsed = {
            formatted: nomData.display_name || '',
            street: a.road || a.neighbourhood || '',
            city: a.city || a.town || a.village || a.county || '',
            state: a.state || '',
            pincode: a.postcode || '',
            country: a.country || 'India',
            placeId: '',
            source: "nominatim",
          };
          geocodeCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
          return res.json(parsed);
        }
      } catch (e) {
        console.error('Nominatim geocode failed:', e);
      }

      res.json({ formatted: null, street: '', city: '', state: '', pincode: '', country: 'India', placeId: '', source: "failed" });
    } catch (error) {
      console.error('Reverse geocode error:', error);
      res.status(500).json({ error: "Geocoding failed" });
    }
  });

  app.patch("/api/admin/address/:id/proof-status", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const addressId = parseInt(req.params.id);
      if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });
      const { status, note } = req.body;
      if (!status || !['verified', 'rejected', 'rejected_need_retake'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: verified, rejected, rejected_need_retake" });
      }
      await db.update(userAddresses).set({
        proofStatus: status,
        verifiedBy: req.user?.id || 'admin',
        verifiedAt: new Date(),
        verifyNote: note || null,
        updatedAt: new Date(),
      }).where(eq(userAddresses.id, addressId));
      res.json({ success: true, message: `Address proof marked as ${status}` });
    } catch (error) {
      console.error('Error updating proof status:', error);
      res.status(500).json({ error: "Failed to update proof status" });
    }
  });

  app.patch("/api/admin/delivery-point/:id/proof-status", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const pointId = req.params.id;
      const { status, note } = req.body;
      if (!status || !['verified', 'rejected', 'rejected_need_retake'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: verified, rejected, rejected_need_retake" });
      }
      await db.update(deliveryPointsTable).set({
        proofStatus: status,
        verifiedBy: req.user?.id || 'admin',
        verifiedAt: new Date(),
        verifyNote: note || null,
        updatedAt: new Date(),
      }).where(eq(deliveryPointsTable.id, pointId));
      res.json({ success: true, message: `Delivery point proof marked as ${status}` });
    } catch (error) {
      console.error('Error updating delivery point proof status:', error);
      res.status(500).json({ error: "Failed to update proof status" });
    }
  });

  app.get("/api/admin/address-proofs", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const typeFilter = req.query.type as string | undefined;

      const results: any[] = [];

      if (!typeFilter || typeFilter === 'delivery_points') {
        const dpRows = await db.select().from(deliveryPointsTable);
        for (const dp of dpRows) {
          if (!dp.locationPhotoUrl && !dp.proofHash) continue;
          if (statusFilter && dp.proofStatus !== statusFilter) continue;
          const userRow = await db.select().from(usersTable).where(eq(usersTable.id, dp.userId)).limit(1);
          results.push({
            id: dp.id,
            type: 'delivery_point',
            userId: dp.userId,
            userName: userRow[0]?.name || 'Unknown',
            userEmail: userRow[0]?.email || '',
            userRole: userRow[0]?.role || '',
            pointName: dp.pointName,
            address: dp.deliveryAddress,
            latitude: dp.latitude,
            longitude: dp.longitude,
            locationPhotoUrl: dp.locationPhotoUrl,
            gpsAccuracy: dp.gpsAccuracy,
            accuracyGrade: dp.accuracyGrade,
            locationSource: dp.locationSource,
            addressSource: dp.addressSource,
            isMockLocation: dp.isMockLocation,
            suspicionScore: dp.suspicionScore,
            capturedAt: dp.capturedAt,
            proofStatus: dp.proofStatus,
            proofHash: dp.proofHash,
            verifiedBy: dp.verifiedBy,
            verifiedAt: dp.verifiedAt,
            verifyNote: dp.verifyNote,
            consentGiven: dp.consentGiven,
            consentAt: dp.consentAt,
            createdAt: dp.createdAt,
          });
        }
      }

      if (!typeFilter || typeFilter === 'user_addresses') {
        const addrRows = await db.select().from(userAddresses);
        for (const addr of addrRows) {
          if (!addr.locationPhotoUrl && !addr.proofHash) continue;
          if (statusFilter && addr.proofStatus !== statusFilter) continue;
          const userRow = await db.select().from(usersTable).where(eq(usersTable.id, addr.userId)).limit(1);
          results.push({
            id: addr.id,
            type: 'user_address',
            userId: addr.userId,
            userName: userRow[0]?.name || 'Unknown',
            userEmail: userRow[0]?.email || '',
            userRole: userRow[0]?.role || '',
            pointName: addr.label || addr.pointName || 'Address',
            address: [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
            latitude: addr.lat,
            longitude: addr.lng,
            locationPhotoUrl: addr.locationPhotoUrl,
            gpsAccuracy: addr.gpsAccuracy,
            accuracyGrade: addr.accuracyGrade,
            locationSource: addr.locationSource,
            addressSource: addr.addressSource,
            isMockLocation: addr.isMockLocation,
            suspicionScore: addr.suspicionScore,
            capturedAt: addr.capturedAt,
            proofStatus: addr.proofStatus,
            proofHash: addr.proofHash,
            verifiedBy: addr.verifiedBy,
            verifiedAt: addr.verifiedAt,
            verifyNote: addr.verifyNote,
            consentGiven: addr.consentGiven,
            consentAt: addr.consentAt,
            createdAt: addr.createdAt,
          });
        }
      }

      results.sort((a, b) => {
        const order: Record<string, number> = { pending: 0, rejected_need_retake: 1, rejected: 2, verified: 3 };
        return (order[a.proofStatus] ?? 4) - (order[b.proofStatus] ?? 4);
      });

      res.json(results);
    } catch (error) {
      console.error('Error fetching address proofs:', error);
      res.status(500).json({ error: "Failed to fetch address proofs" });
    }
  });

  app.post("/api/getLocationDetails", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.json({ code: 2, msg: "Maps API key not configured" });
      }

      const placeId = req.body.place_id;
      if (!placeId) {
        return res.json({ code: 2, msg: "Place ID required" });
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components,name&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const components = result.address_components || [];

        const getComponent = (type: string) => {
          const comp = components.find((c: any) => c.types.includes(type));
          return comp ? comp.long_name : '';
        };

        const locationData = {
          formatted_address: result.formatted_address,
          place_text: result.name || getComponent('sublocality_level_1') || getComponent('locality'),
          address: {
            street: getComponent('route') || getComponent('sublocality_level_2') || '',
            city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
            state: getComponent('administrative_area_level_1') || '',
            country: getComponent('country') || '',
            postal_code: getComponent('postal_code') || '',
          },
          lat: result.geometry?.location?.lat || 0,
          lng: result.geometry?.location?.lng || 0,
          place_id: placeId,
        };

        res.json({ code: 1, msg: "success", details: { data: locationData } });
      } else {
        console.error('Place details error:', data.status, data.error_message);
        res.json({ code: 2, msg: data.error_message || "Failed to get place details" });
      }
    } catch (error) {
      console.error('Error in getLocationDetails:', error);
      res.status(500).json({ code: 2, msg: "Failed to get location details" });
    }
  });

  // ============ Merchant Registration API ============

  app.post("/api/merchant/register", async (req, res) => {
    try {
      const { unionName, district, contactPerson, contactEmail, contactPhone, officeAddress, username, password } = req.body;

      if (!unionName || !district || !contactPerson || !contactEmail || !username || !password) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled' });
      }

      const merchants = await storage.getMerchants();
      const existingMerchant = merchants.find(m => m.username === username);
      if (existingMerchant) {
        return res.status(409).json({ success: false, message: 'This Union Code is already taken' });
      }

      const existingEmail = merchants.find(m => m.contactEmail === contactEmail);
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'A union with this email already exists' });
      }

      const slug = unionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const merchant = await storage.createMerchant({
        restaurantName: unionName,
        restaurantSlug: slug,
        username,
        password,
        contactEmail,
        contactPhone: contactPhone || '',
        address: officeAddress || '',
        status: 'pending',
      });

      res.json({ success: true, message: 'Registration submitted for approval. You will be notified once approved.', merchantId: merchant.id });
    } catch (error) {
      console.error('Merchant registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
  });

  // ============ Driver APIs ============

  app.post("/api/driver/signup", async (req, res) => {
    try {
      const { name, phone, email, unionId, assignedSegment, vehicleType, vehicleNumber, licenseNumber, password } = req.body;

      if (!name || !email || !password || !unionId || !assignedSegment) {
        return res.status(400).json({ success: false, message: 'Name, email, password, union, and delivery segment are required' });
      }

      const existingUser = await storage.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'A driver with this email already exists' });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        name,
        phone: phone || null,
        email,
        passwordHash,
        role: 'driver',
        pricingRole: 'MRP',
        unionId,
        assignedSegment,
        restaurantId: null,
      });

      res.json({ success: true, message: 'Driver registered successfully', driverCode: email, driverId: user.id });
    } catch (error) {
      console.error('Driver signup error:', error);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
  });

  app.post("/api/driver/login", async (req, res) => {
    try {
      const { driverCode, password } = req.body;

      if (!driverCode || !password) {
        return res.status(400).json({ success: false, message: 'Driver code/email and password are required' });
      }

      const phoneDigits = driverCode.replace(/\D/g, '');
      const looksLikePhone = phoneDigits.length >= 10 && !/[A-Za-z]/.test(driverCode.trim());

      let user = await storage.findUserByEmail(driverCode);
      if (!user && looksLikePhone) {
        user = await storage.findUserByPhone(phoneDigits);
      }

      if (!user || user.role !== 'driver') {
        return res.status(401).json({ success: false, message: 'Invalid driver credentials' });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid driver credentials' });
      }

      const token = signToken({
        userId: user.id,
        role: 'driver',
        unionId: user.unionId,
        assignedSegment: user.assignedSegment,
      });

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        driver: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          unionId: user.unionId,
          assignedSegment: user.assignedSegment,
        }
      });
    } catch (error) {
      console.error('Driver login error:', error);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  });

  app.get("/api/driver/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ error: 'Driver access required' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      unionId: user.unionId,
      assignedSegment: user.assignedSegment,
    });
  });

  app.post("/api/driver/logout", (_req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
  });

  app.get("/api/driver/deliveries", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const driverSegment = user.assignedSegment;
      const driverUnionId = user.unionId;

      const allOrders = await storage.getOrders();
      const relevantIds = driverUnionId ? getAllIdsForMerchant(driverUnionId) : [];

      const deliveries = allOrders
        .filter((order: any) => {
          if (relevantIds.length > 0 && !relevantIds.includes(order.restaurantId)) {
            return false;
          }
          if (!['pending', 'confirmed', 'accepted', 'preparing', 'ready'].includes(order.status)) {
            return false;
          }
          if (driverSegment && order.items && Array.isArray(order.items)) {
            const segmentMap: Record<string, string[]> = {
              'Fresh Milk': ['0401'],
              'Products': ['0402', '0403', '0404', '0405', '1901', '2105', '2106', '1704', '1806', '1905', '2202'],
              'Ice Cream': ['2105']
            };
            const segmentHsnCodes = segmentMap[driverSegment] || [];
            const hasSegmentItem = order.items.some((item: any) => {
              if (item.segment === driverSegment) return true;
              if (item.hsnCode && segmentHsnCodes.includes(item.hsnCode)) return true;
              if (item.category) {
                const cat = item.category.toLowerCase();
                if (driverSegment === 'Fresh Milk' && (cat.includes('milk') || cat.includes('curd') || cat.includes('buttermilk'))) return true;
                if (driverSegment === 'Products' && (cat.includes('butter') || cat.includes('ghee') || cat.includes('paneer') || cat.includes('cheese') || cat.includes('chocolate') || cat.includes('biscuit') || cat.includes('beverage'))) return true;
                if (driverSegment === 'Ice Cream' && cat.includes('ice cream')) return true;
              }
              const name = (item.name || '').toLowerCase();
              if (driverSegment === 'Fresh Milk' && (name.includes('milk') || name.includes('curd') || name.includes('buttermilk'))) return true;
              if (driverSegment === 'Ice Cream' && name.includes('ice cream')) return true;
              return false;
            });
            if (!hasSegmentItem) return false;
          }
          return true;
        })
        .map((order: any) => ({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          total: order.total,
          items: order.items,
          createdAt: order.createdAt,
          segment: driverSegment,
        }));

      res.json({ deliveries, segment: driverSegment, total: deliveries.length });
    } catch (error) {
      console.error('Error fetching driver deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
  });

  // ==========================================
  // Unified API Settings Management (All Providers)
  // ==========================================

  // Admin: Get ALL API settings (Google Maps, Firebase, Social Login, etc.)
  app.get("/api/admin/all-api-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const settings = await storage.getApiSettings();
      res.json({ settings });
    } catch (error) {
      console.error('Error getting all API settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // Admin: Save/update ALL API settings (bulk upsert for any provider)
  app.post("/api/admin/all-api-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { services } = req.body;
      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ error: 'Services array is required' });
      }

      const results: any[] = [];
      for (const service of services) {
        if (!service.serviceName || !service.provider) continue;
        const saved = await storage.saveApiSetting({
          provider: service.provider,
          serviceName: service.serviceName,
          apiKey: typeof service.apiKey === 'string' ? service.apiKey : null,
          enabled: typeof service.enabled === 'boolean' ? service.enabled : false,
          config: service.config || null,
          updatedBy: req.user?.email || 'admin',
        });
        results.push(saved);
      }

      res.json({ settings: results, message: 'API settings saved successfully' });
    } catch (error) {
      console.error('Error saving API settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Public: Unified app settings endpoint for mobile apps
  // Returns all active API keys organized by category
  app.get("/api/config/app-settings", async (_req, res) => {
    try {
      const allSettings = await storage.getApiSettings();

      const getKey = (provider: string, service: string) => {
        const setting = allSettings.find(s => s.provider === provider && s.serviceName === service && s.enabled);
        return setting?.apiKey || '';
      };

      const mapsApiKey = getKey('google', 'maps_javascript') || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';
      const placesApiKey = getKey('google', 'places') || process.env.GOOGLE_PLACES_API_KEY || mapsApiKey;
      const geocodingApiKey = getKey('google', 'geocoding') || mapsApiKey;
      const directionsApiKey = getKey('google', 'directions') || mapsApiKey;
      const distanceMatrixApiKey = getKey('google', 'distance_matrix') || mapsApiKey;

      const firebaseApiKey = getKey('firebase', 'firebase_api') || mapsApiKey;
      const firebaseProjectId = getKey('firebase', 'firebase_project_id') || 'aavincart-33edd';
      const firebaseMessagingSenderId = getKey('firebase', 'firebase_messaging_sender_id') || '';
      const firebaseAppId = getKey('firebase', 'firebase_app_id') || '';

      const googleOAuthClientId = getKey('social', 'google_oauth_client_id') || '';
      const facebookAppId = getKey('social', 'facebook_app_id') || '';

      const heroVideoUrl = getKey('media', 'hero_video') || '';

      res.json({
        google_maps: {
          maps_javascript: mapsApiKey,
          places: placesApiKey,
          geocoding: geocodingApiKey,
          directions: directionsApiKey,
          distance_matrix: distanceMatrixApiKey,
          has_keys: !!mapsApiKey,
        },
        firebase: {
          api_key: firebaseApiKey,
          project_id: firebaseProjectId,
          auth_domain: `${firebaseProjectId}.firebaseapp.com`,
          storage_bucket: `${firebaseProjectId}.firebasestorage.app`,
          messaging_sender_id: firebaseMessagingSenderId,
          app_id: firebaseAppId,
        },
        social_login: {
          google_client_id: googleOAuthClientId,
          facebook_app_id: facebookAppId,
        },
        maps_config: {
          key: mapsApiKey,
          provider: 'google.maps',
          zoom: '16',
          language: 'en',
          default_lat: '11.6643',
          default_lng: '78.1460',
          icon_destination: '/images/marker-destination.png',
          icon_merchant: '/images/marker-merchant.png',
          icon_rider: '/images/marker-rider.png',
        },
        heroVideo: heroVideoUrl || undefined,
      });
    } catch (error) {
      console.error('Error getting app settings:', error);
      res.status(500).json({ error: 'Failed to get app settings' });
    }
  });

  // ==========================================
  // Google Maps & API Settings (Legacy endpoints)
  // ==========================================

  // Admin: Get all API settings (or filter by provider)
  app.get("/api/admin/google-maps-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const settings = await storage.getApiSettings("google");
      res.json({ settings });
    } catch (error) {
      console.error('Error getting Google Maps settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // Admin: Save/update Google Maps API settings (bulk upsert)
  app.post("/api/admin/google-maps-settings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { services } = req.body;
      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ error: 'Services array is required' });
      }

      const validServiceNames = ['maps_javascript', 'places', 'geocoding', 'directions', 'distance_matrix'];
      const results: any[] = [];
      for (const service of services) {
        if (!service.serviceName || typeof service.serviceName !== 'string') {
          continue;
        }
        if (!validServiceNames.includes(service.serviceName)) {
          continue;
        }
        const saved = await storage.saveApiSetting({
          provider: "google",
          serviceName: service.serviceName,
          apiKey: typeof service.apiKey === 'string' ? service.apiKey : null,
          enabled: typeof service.enabled === 'boolean' ? service.enabled : false,
          config: service.config || null,
          updatedBy: req.user?.email || 'admin',
        });
        results.push(saved);
      }

      res.json({ settings: results, message: 'Google Maps settings saved successfully' });
    } catch (error) {
      console.error('Error saving Google Maps settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Admin: Toggle a specific API service on/off
  app.patch("/api/admin/google-maps-settings/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid setting ID' });
      }
      const { enabled, apiKey, config } = req.body;
      const updates: any = {};
      if (typeof enabled === 'boolean') updates.enabled = enabled;
      if (typeof apiKey === 'string') updates.apiKey = apiKey;
      if (config !== undefined) updates.config = config;

      const updated = await storage.updateApiSetting(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json({ setting: updated });
    } catch (error) {
      console.error('Error updating Google Maps setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Public: Get active Google Maps API config for frontend/mobile apps
  app.get("/api/config/maps", async (_req, res) => {
    try {
      const allSettings = await storage.getApiSettings("google");
      const enabledServices = allSettings
        .filter(s => s.enabled)
        .map(s => ({
          serviceName: s.serviceName,
          apiKey: s.apiKey,
          config: s.config,
        }));

      const mapsKey = allSettings.find(s => s.serviceName === 'maps_javascript' && s.enabled)?.apiKey
        || allSettings.find(s => s.serviceName === 'maps_api' && s.enabled)?.apiKey
        || process.env.GOOGLE_MAPS_API_KEY
        || process.env.GOOGLE_API_KEY
        || '';

      const placesKey = allSettings.find(s => s.serviceName === 'places' && s.enabled)?.apiKey
        || process.env.GOOGLE_PLACES_API_KEY
        || mapsKey;

      const geocodingKey = allSettings.find(s => s.serviceName === 'geocoding' && s.enabled)?.apiKey
        || mapsKey;

      const directionsKey = allSettings.find(s => s.serviceName === 'directions' && s.enabled)?.apiKey
        || mapsKey;

      const distanceMatrixKey = allSettings.find(s => s.serviceName === 'distance_matrix' && s.enabled)?.apiKey
        || mapsKey;

      res.json({
        mapsApiKey: mapsKey,
        placesApiKey: placesKey,
        geocodingApiKey: geocodingKey,
        directionsApiKey: directionsKey,
        distanceMatrixApiKey: distanceMatrixKey,
        services: enabledServices,
        hasKeys: !!mapsKey,
      });
    } catch (error) {
      console.error('Error getting maps config:', error);
      res.status(500).json({ error: 'Failed to get maps configuration' });
    }
  });

  // Admin: Test Google Maps API key validity
  app.post("/api/admin/google-maps-test", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { apiKey, service } = req.body;
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
      }

      let testUrl = '';
      switch (service) {
        case 'geocoding':
          testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Chennai,India&key=${apiKey}`;
          break;
        case 'places':
          testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Aavin&inputtype=textquery&key=${apiKey}`;
          break;
        case 'directions':
          testUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=Chennai&destination=Madurai&key=${apiKey}`;
          break;
        case 'distance_matrix':
          testUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=Chennai&destinations=Madurai&key=${apiKey}`;
          break;
        default:
          testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Chennai&key=${apiKey}`;
      }

      const response = await fetch(testUrl);
      const data = await response.json() as any;

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        res.json({ valid: true, status: data.status, message: 'API key is valid and working' });
      } else if (data.status === 'REQUEST_DENIED') {
        res.json({ valid: false, status: data.status, message: data.error_message || 'API key is invalid or the API is not enabled' });
      } else {
        res.json({ valid: false, status: data.status, message: data.error_message || 'Unable to verify API key' });
      }
    } catch (error) {
      console.error('Error testing Google Maps API:', error);
      res.status(500).json({ error: 'Failed to test API key' });
    }
  });

  // ==================== Firebase FCM Push Notification Routes ====================

  const { registerDeviceToken, removeDeviceToken, sendToUser, sendToRole, sendToMerchant, sendToAll, getFirebaseAdmin } = await import('../firebase');

  app.post("/api/fcm/register", async (req, res) => {
    try {
      const { token, userId, role, merchantId, platform } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'FCM token is required' });
      }
      await registerDeviceToken(token, { userId, role, merchantId, platform });
      res.json({ success: true, message: 'Device registered for push notifications' });
    } catch (error: any) {
      console.error('FCM register error:', error);
      res.status(500).json({ error: 'Failed to register device token' });
    }
  });

  app.post("/api/fcm/unregister", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'FCM token is required' });
      }
      await removeDeviceToken(token);
      res.json({ success: true, message: 'Device unregistered from push notifications' });
    } catch (error: any) {
      console.error('FCM unregister error:', error);
      res.status(500).json({ error: 'Failed to unregister device token' });
    }
  });

  app.post("/api/fcm/send", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { target, targetId, title, body, icon, clickAction, data } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      const payload = { title, body, icon, clickAction, data };
      let result;

      switch (target) {
        case 'user':
          if (!targetId) return res.status(400).json({ error: 'targetId required for user target' });
          result = await sendToUser(targetId, payload);
          break;
        case 'role':
          if (!targetId) return res.status(400).json({ error: 'targetId required for role target' });
          result = await sendToRole(targetId, payload);
          break;
        case 'merchant':
          if (!targetId) return res.status(400).json({ error: 'targetId required for merchant target' });
          result = await sendToMerchant(targetId, payload);
          break;
        case 'all':
          result = await sendToAll(payload);
          break;
        default:
          return res.status(400).json({ error: 'Invalid target. Use: user, role, merchant, or all' });
      }

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('FCM send error:', error);
      res.status(500).json({ error: 'Failed to send push notification' });
    }
  });

  app.get("/api/fcm/status", async (_req, res) => {
    const firebaseInitialized = getFirebaseAdmin() !== null;
    res.json({ 
      enabled: firebaseInitialized,
      projectId: firebaseInitialized ? 'aavincart-33edd' : null,
    });
  });

  app.get("/api/config/firebase", async (_req, res) => {
    try {
      const allSettings = await storage.getApiSettings("firebase");
      const getVal = (service: string, fallback: string) => {
        const s = allSettings.find(s => s.serviceName === service && s.enabled);
        return s?.apiKey || fallback;
      };

      const projectId = getVal('firebase_project_id', 'aavincart-33edd');
      res.json({
        apiKey: getVal('firebase_api', process.env.GOOGLE_API_KEY || 'AIzaSyDn_0YCQXAsrX6IZPxJOAjyUkCDEAAaEmE'),
        authDomain: `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: `${projectId}.firebasestorage.app`,
        messagingSenderId: getVal('firebase_messaging_sender_id', '109824428848'),
        appId: getVal('firebase_app_id', '1:109824428848:web:aavincart33edd'),
      });
    } catch (error) {
      res.json({
        apiKey: process.env.GOOGLE_API_KEY || "AIzaSyDn_0YCQXAsrX6IZPxJOAjyUkCDEAAaEmE",
        authDomain: "aavincart-33edd.firebaseapp.com",
        projectId: "aavincart-33edd",
        storageBucket: "aavincart-33edd.firebasestorage.app",
        messagingSenderId: "109824428848",
        appId: "1:109824428848:web:aavincart33edd",
      });
    }
  });

  // ===== Mobile App Store Menu & Merchant Info Endpoints =====

  function getBaseUrl(req: any): string {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
    return `${protocol}://${host}`;
  }

  function getAbsoluteUrl(req: any, path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${getBaseUrl(req)}${cleanPath}`;
  }

  async function findRestaurantIdForMerchant(merchant: any): Promise<string> {
    const restaurants = await storage.getRestaurants();
    const merchantName = (merchant.restaurantName || '').toLowerCase();
    
    const districtNames = [
      'chennai', 'coimbatore', 'salem', 'madurai', 'trichy', 'tiruchirappalli',
      'thanjavur', 'erode', 'tirunelveli', 'vellore', 'villupuram',
      'kanchipuram', 'kancheepuram', 'thiruvallur', 'thiruvannamalai', 'tiruvannamalai',
      'cuddalore', 'nagapattinam', 'dindigul', 'theni', 'virudhunagar',
      'ramanathapuram', 'sivaganga', 'sivagangai', 'thoothukudi',
      'kanyakumari', 'namakkal', 'dharmapuri', 'krishnagiri',
      'tiruppur', 'tirupur', 'karur', 'pudukkottai', 'nilgiris',
      'kallakurichi', 'thirupathur', 'madhavaram', 'ambattur', 'sholinganallur',
      'federation',
    ];
    
    const merchantDistrict = districtNames.find(d => merchantName.includes(d));
    if (merchantDistrict) {
      const matchedRestaurant = restaurants.find(r => {
        const rName = r.name.toLowerCase();
        return rName.includes(merchantDistrict);
      });
      if (matchedRestaurant) {
        return matchedRestaurant.id;
      }
    }
    
    for (const r of restaurants) {
      const rName = r.name.toLowerCase();
      const rDistrict = districtNames.find(d => rName.includes(d));
      if (rDistrict && merchantName.includes(rDistrict)) {
        return r.id;
      }
    }
    
    return merchant.id;
  }

  function findMerchantBySlug(allMerchants: any[], slug: string): any {
    let merchant = allMerchants.find((m: any) => m.restaurantSlug === slug);
    if (!merchant) merchant = allMerchants.find((m: any) => m.id === slug);
    if (!merchant) {
      const slugLower = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      merchant = allMerchants.find((m: any) => {
        const genSlug = (m.restaurantName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return genSlug === slugLower || genSlug.includes(slugLower) || slugLower.includes(genSlug.substring(0, 10));
      });
    }
    return merchant || null;
  }

  async function getMenuItemsForMobile(merchantId: string, restaurantId: string): Promise<any[]> {
    const { masterProducts: mpTable, merchantProducts: mprodTable } = await import("@shared/schema");
    const lookupIds = [restaurantId];
    if (merchantId !== restaurantId) lookupIds.push(merchantId);
    const unionId = merchantToUnionMapping[merchantId];
    if (unionId && !lookupIds.includes(unionId)) lookupIds.push(unionId);

    const allMerchantProds = await db.select().from(mprodTable)
      .where(inArray(mprodTable.merchantId, lookupIds));

    if (allMerchantProds.length > 0) {
      const masterIds = allMerchantProds.map(mp => mp.masterProductId);
      const masters = await db.select().from(mpTable)
        .where(inArray(mpTable.id, masterIds));
      const masterMap = new Map(masters.map(m => [m.id, m]));

      return allMerchantProds
        .filter(mp => mp.isActive)
        .map(mp => {
          const master = masterMap.get(mp.masterProductId);
          if (!master || master.status !== 'active') return null;
          const mrpVal = mp.mrp || master.mrp || null;
          const dealerVal = mp.dealerPrice || master.dealerPrice || null;
          const wholesaleVal = mp.wholesalePrice || master.wholesalePrice || null;
          const fedVal = mp.federationPrice || master.federationPrice || null;
          const interUnionVal = mp.interUnionPrice || master.interUnionPrice || null;
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
            mrp: mrpVal,
            unitSize: master.unitSize || null,
            unitType: master.unitType || null,
            productSegment: master.segment || null,
            hsnCode: master.hsnCode || null,
            packagingType: master.packagingType || null,
            unitsPerPackage: master.unitsPerPackage || null,
            packageWeight: master.packageWeight || null,
            packageWeightUnit: master.packageWeightUnit || null,
          };
        })
        .filter(Boolean);
    }

    const legacyItems = await storage.getMenuItems(restaurantId);
    if (legacyItems.length > 0) return legacyItems;

    return Array.from((storage as any).menuItems?.values?.() || [])
      .filter((item: any) => item.restaurantId === restaurantId);
  }

  // POST /api/geStoreMenu - Get menu items for a merchant by slug (mobile app)
}
