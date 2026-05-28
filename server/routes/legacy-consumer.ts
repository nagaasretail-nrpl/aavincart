import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, generateInvoiceNumber } from "./shared";
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

export async function registerLegacyConsumerRoutes(app: Express): Promise<void> {
  app.post("/api/geStoreMenu", async (req, res) => {
    try {
      const { slug, currency_code, client_uuid } = req.body;
      if (!slug) {
        return res.json({ code: 2, msg: "slug is required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      const restaurantId = await findRestaurantIdForMerchant(merchant);
      const menuItems = await getMenuItemsForMobile(merchant.id, restaurantId);
      
      let userPricingRole = 'MRP';
      let userSegmentRoles: any = {};
      const authToken = req.headers.authorization?.replace('token ', '');
      if (authToken) {
        try {
          const decoded: any = jwt.verify(authToken, JWT_SECRET);
          if (decoded.userId) {
            const allUsers = await storage.listUsers();
            const loggedUser = allUsers.find((u: any) => u.id === decoded.userId);
            if (loggedUser) {
              userPricingRole = loggedUser.pricingRole || 'MRP';
              userSegmentRoles = {
                freshMilk: loggedUser.freshMilkPricingRole || loggedUser.pricingRole || 'MRP',
                products: loggedUser.productsPricingRole || loggedUser.pricingRole || 'MRP',
                iceCream: loggedUser.iceCreamPricingRole || loggedUser.pricingRole || 'MRP',
              };
            }
          }
        } catch (e) {}
      }

      function getPriceForRole(item: any, role: string): number {
        const segment = (item.productSegment || item.category || '').toLowerCase();
        let effectiveRole = role;
        if (Object.keys(userSegmentRoles).length > 0) {
          if (segment.includes('fresh') || segment.includes('milk')) {
            effectiveRole = userSegmentRoles.freshMilk || role;
          } else if (segment.includes('ice')) {
            effectiveRole = userSegmentRoles.iceCream || role;
          } else {
            effectiveRole = userSegmentRoles.products || role;
          }
        }
        const r = effectiveRole.toUpperCase();
        if (r === 'FEDERATION' || r === 'FED') return parseFloat(item.federationPrice || item.mrp || item.price || '0');
        if (r === 'INTER_UNION' || r === 'INT') return parseFloat(item.districtUnionPrice || item.mrp || item.price || '0');
        if (r === 'WHOLESALE_DEALER' || r === 'WSD') return parseFloat(item.wholesalePrice || item.mrp || item.price || '0');
        if (r === 'DEALER' || r === 'DLR') return parseFloat(item.retailPrice || item.mrp || item.price || '0');
        if (r === 'RETAILER' || r === 'RTL') return parseFloat(item.retailPrice || item.mrp || item.price || '0');
        return parseFloat(item.mrp || item.price || '0');
      }

      const categoryMap: Record<string, any[]> = {};
      for (const item of menuItems) {
        const cat = item.category || 'Uncategorized';
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(item);
      }

      const categories: any[] = [];
      const allItems: Record<string, any[]> = {};
      let catIndex = 0;

      for (const [catName, items] of Object.entries(categoryMap)) {
        const catId = `cat_${catIndex}`;
        const catUiid = `category_${catIndex}`;
        
        const itemList = items.map((item: any) => {
          const price = getPriceForRole(item, userPricingRole);
          const formattedPrice = `₹${price.toFixed(2)}`;
          
          return {
            item_uuid: item.id,
            item_id: item.id,
            item_name: item.name,
            item_description: item.description || (item.unitSize ? `${item.unitSize} ${item.unitType || ''}`.trim() : ''),
            url_image: getAbsoluteUrl(req, item.image || `/media/products/${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`),
            lowest_price: formattedPrice,
            lowest_price_raw: price,
            lowest_price_discount: '',
            lowest_price_discount_raw: 0,
            available: item.isAvailable !== false,
            is_favorite: false,
            dish_list: [],
            has_discount: false,
            promo_data: null,
            item_unavailable: '',
            total_allergens: 0,
            is_promo_free_item: false,
            multi_option: false,
            multi_option_raw: "no",
          };
        });

        categories.push({
          cat_id: catId,
          category_uiid: catUiid,
          category_name: catName,
          item_list: itemList,
          available: true,
          total_items: itemList.length,
        });

        allItems[catId] = itemList;
        catIndex++;
      }

      res.json({
        code: 1,
        msg: "success",
        details: {
          data: {
            category: categories,
            items: allItems,
            items_not_available: [],
            category_not_available: [],
            dish: [],
          }
        }
      });
    } catch (error) {
      console.error('Error in geStoreMenu:', error);
      res.status(500).json({ code: 2, msg: "Failed to load menu" });
    }
  });

  // Helper function for merchant info response
  function buildMerchantInfoResponse(merchant: any, userLat?: number, userLng?: number, baseUrl?: string) {
    const mLat = parseFloat(merchant.latitude || '0');
    const mLng = parseFloat(merchant.longitude || '0');
    let distKm = 0;
    let distLabel = '';
    if (userLat && userLng && mLat && mLng) {
      const R = 6371;
      const dLat = (mLat - userLat) * Math.PI / 180;
      const dLon = (mLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(userLat * Math.PI / 180) * Math.cos(mLat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distLabel = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
    }

    const makeAbsolute = (path: string) => {
      if (!path) return '';
      if (path.startsWith('http')) return path;
      return baseUrl ? `${baseUrl}${path.startsWith('/') ? path : '/' + path}` : path;
    };

    const logoPath = merchant.logo ? (merchant.logo.startsWith('/') || merchant.logo.startsWith('http') ? merchant.logo : `/public/media/${merchant.logo}`) : '/media/products/fresh-milk.png';
    const headerPath = merchant.headerImage ? (merchant.headerImage.startsWith('/') || merchant.headerImage.startsWith('http') ? merchant.headerImage : `/public/media/${merchant.headerImage}`) : logoPath;
    const logoUrl = makeAbsolute(logoPath);
    const headerUrl = makeAbsolute(headerPath);

    return {
      code: 1,
      msg: "success",
      details: {
        data: {
          merchant_id: merchant.id,
          merchant_uuid: merchant.id,
          restaurant_name: merchant.restaurantName,
          restaurant_slug: merchant.restaurantSlug,
          merchant_address: merchant.address || merchant.city || '',
          url_logo: logoUrl,
          url_header: headerUrl,
          has_header: !!merchant.headerImage,
          ratings: "4.5",
          review_count: 0,
          saved_store: false,
          cuisine: merchant.cuisineType || 'Dairy Products',
          cuisines: merchant.cuisineType || 'Dairy Products',
          latitude: merchant.latitude,
          longitude: merchant.longitude,
          phone: merchant.phone || '',
          email: merchant.email || '',
          open_status: 1,
          available: true,
          services: ["delivery"],
          share: {
            title: merchant.restaurantName,
            text: `Order dairy products from ${merchant.restaurantName}`,
            url: `https://aavincart.in/store/${merchant.restaurantSlug}`,
            dialogTitle: 'Share this store',
          },
        },
        menu_display_type: "all",
        estimation_time: "30 min",
        standard_estimation_time: "30 min",
        enabled_age_verification: false,
        distance: {
          label: distLabel,
          km: distKm,
        },
        open_at: null,
        opening_hours: [
          { day: "Monday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Tuesday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Wednesday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Thursday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Friday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Saturday", open: "06:00 AM", close: "10:00 PM" },
          { day: "Sunday", open: "06:00 AM", close: "10:00 PM" },
        ],
        gallery: [],
        review_details: null,
        partial_review: null,
        promo_list: [],
        booking_settings: { booking_enabled: false },
      }
    };
  }

  // GET /api/getMerchantInfo - Get merchant/union details (mobile app)
  app.get("/api/getMerchantInfo", async (req, res) => {
    try {
      const slug = req.query.slug as string;
      const latitude = parseFloat(req.query.latitude as string) || undefined;
      const longitude = parseFloat(req.query.longitude as string) || undefined;
      
      if (!slug) {
        return res.json({ code: 2, msg: "slug is required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      res.json(buildMerchantInfoResponse(merchant, latitude, longitude, getBaseUrl(req)));
    } catch (error) {
      console.error('Error in getMerchantInfo:', error);
      res.status(500).json({ code: 2, msg: "Failed to load merchant info" });
    }
  });

  // GET /api/getMerchantInfo2 - Authenticated version (same logic)
  app.get("/api/getMerchantInfo2", async (req, res) => {
    try {
      const slug = req.query.slug as string;
      const latitude = parseFloat(req.query.latitude as string) || undefined;
      const longitude = parseFloat(req.query.longitude as string) || undefined;
      
      if (!slug) {
        return res.json({ code: 2, msg: "slug is required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      res.json(buildMerchantInfoResponse(merchant, latitude, longitude, getBaseUrl(req)));
    } catch (error) {
      console.error('Error in getMerchantInfo2:', error);
      res.status(500).json({ code: 2, msg: "Failed to load merchant info" });
    }
  });

  // GET /api/getMerchantInfoAuth - Alias for getMerchantInfo2
  app.get("/api/getMerchantInfoAuth", async (req, res) => {
    try {
      const slug = req.query.slug as string;
      const latitude = parseFloat(req.query.latitude as string) || undefined;
      const longitude = parseFloat(req.query.longitude as string) || undefined;
      
      if (!slug) {
        return res.json({ code: 2, msg: "slug is required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      res.json(buildMerchantInfoResponse(merchant, latitude, longitude, getBaseUrl(req)));
    } catch (error) {
      console.error('Error in getMerchantInfoAuth:', error);
      res.status(500).json({ code: 2, msg: "Failed to load merchant info" });
    }
  });

  // POST /api/getMenuItem - Get single item details (mobile app)
  app.post("/api/getMenuItem", async (req, res) => {
    try {
      const params = new URLSearchParams(req.body?.toString?.() || '');
      const slug = params.get('slug') || req.body?.slug;
      const itemUuid = params.get('item_uuid') || req.body?.item_uuid;
      const catId = params.get('cat_id') || req.body?.cat_id;

      if (!slug || !itemUuid) {
        return res.json({ code: 2, msg: "slug and item_uuid are required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      const restaurantId = await findRestaurantIdForMerchant(merchant);
      const menuItems = await getMenuItemsForMobile(merchant.id, restaurantId);
      let item = menuItems.find((mi: any) => mi.id === itemUuid);
      if (!item) {
        const singleItem = await storage.getMenuItem(itemUuid);
        if (singleItem) item = singleItem;
      }
      if (!item) {
        return res.json({ code: 2, msg: "Item not found" });
      }

      let itemPrice = parseFloat(item.mrp || item.price || '0');
      const authTokenItem = req.headers.authorization?.replace('token ', '');
      if (authTokenItem) {
        try {
          const decoded: any = jwt.verify(authTokenItem, JWT_SECRET);
          if (decoded.userId) {
            const allUsersItem = await storage.listUsers();
            const loggedUserItem = allUsersItem.find((u: any) => u.id === decoded.userId);
            if (loggedUserItem) {
              const seg = (item.productSegment || item.category || '').toLowerCase();
              let effRole = loggedUserItem.pricingRole || 'MRP';
              if (seg.includes('fresh') || seg.includes('milk')) effRole = loggedUserItem.freshMilkPricingRole || effRole;
              else if (seg.includes('ice')) effRole = loggedUserItem.iceCreamPricingRole || effRole;
              else effRole = loggedUserItem.productsPricingRole || effRole;
              const r = effRole.toUpperCase();
              if (r === 'FEDERATION' || r === 'FED') itemPrice = parseFloat(item.federationPrice || item.mrp || item.price || '0');
              else if (r === 'INTER_UNION' || r === 'INT') itemPrice = parseFloat(item.districtUnionPrice || item.mrp || item.price || '0');
              else if (r === 'WHOLESALE_DEALER' || r === 'WSD') itemPrice = parseFloat(item.wholesalePrice || item.mrp || item.price || '0');
              else if (r === 'DEALER' || r === 'DLR' || r === 'RETAILER' || r === 'RTL') itemPrice = parseFloat(item.retailPrice || item.mrp || item.price || '0');
            }
          }
        } catch (e) {}
      }
      const price = itemPrice;
      const catName = item.category || 'Uncategorized';
      const imageUrl = getAbsoluteUrl(req, item.image || `/media/products/${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);

      const itemResponse = {
        item_id: item.id,
        item_uuid: item.id,
        item_token: item.id,
        item_name: item.name,
        item_description: item.description || '',
        url_image: imageUrl,
        available: item.isAvailable !== false,
        multi_option: false,
        multi_option_raw: "no",
        cat_id: catId || item.categoryId || 'cat_0',
        save_item: false,
        cooking_ref_required: false,
        ingredients_preselected: false,
        item_addons: {},
        price: {
          "1": {
            item_size_id: 1,
            size_name: item.unitSize ? `${item.unitSize} ${item.unitType || ''}`.trim() : 'Standard',
            pretty_price: `₹${price.toFixed(2)}`,
            pretty_price_after_discount: `₹${price.toFixed(2)}`,
            original_price: price,
            price: price,
            price_after_discount: price,
            discount: 0,
            earning_points: 0,
            earning_points_label: '',
          }
        },
      };

      res.json({
        code: 1,
        msg: "success",
        details: {
          merchant_id: merchant.id,
          restaurant_name: merchant.restaurantName,
          sold_out_options: {},
          default_sold_out_options: "remove",
          cart_details: null,
          data: {
            items: itemResponse,
            meta: null,
            meta_details: { cooking_ref: {}, ingredients: {} },
            addons: {},
            addon_items: {},
          }
        }
      });
    } catch (error) {
      console.error('Error in getMenuItem:', error);
      res.status(500).json({ code: 2, msg: "Failed to load item details" });
    }
  });

  // POST /api/getMenuItem2 - Authenticated version (same logic)
  app.post("/api/getMenuItem2", async (req, res) => {
    try {
      const params = new URLSearchParams(req.body?.toString?.() || '');
      const slug = params.get('slug') || req.body?.slug;
      const itemUuid = params.get('item_uuid') || req.body?.item_uuid;
      const catId2 = params.get('cat_id') || req.body?.cat_id;

      if (!slug || !itemUuid) {
        return res.json({ code: 2, msg: "slug and item_uuid are required" });
      }

      const allMerchants = await storage.getMerchants('active');
      const merchant = findMerchantBySlug(allMerchants, slug);
      if (!merchant) {
        return res.json({ code: 2, msg: "Merchant not found" });
      }

      const restaurantId2 = await findRestaurantIdForMerchant(merchant);
      const menuItems2 = await getMenuItemsForMobile(merchant.id, restaurantId2);
      let item = menuItems2.find((mi: any) => mi.id === itemUuid);
      if (!item) {
        const singleItem = await storage.getMenuItem(itemUuid);
        if (singleItem) item = singleItem;
      }
      if (!item) {
        return res.json({ code: 2, msg: "Item not found" });
      }

      let itemPrice2 = parseFloat(item.mrp || item.price || '0');
      const authToken2 = req.headers.authorization?.replace('token ', '');
      if (authToken2) {
        try {
          const decoded: any = jwt.verify(authToken2, JWT_SECRET);
          if (decoded.userId) {
            const allUsersItem2 = await storage.listUsers();
            const loggedUser2 = allUsersItem2.find((u: any) => u.id === decoded.userId);
            if (loggedUser2) {
              const seg2 = (item.productSegment || item.category || '').toLowerCase();
              let effRole2 = loggedUser2.pricingRole || 'MRP';
              if (seg2.includes('fresh') || seg2.includes('milk')) effRole2 = loggedUser2.freshMilkPricingRole || effRole2;
              else if (seg2.includes('ice')) effRole2 = loggedUser2.iceCreamPricingRole || effRole2;
              else effRole2 = loggedUser2.productsPricingRole || effRole2;
              const r2 = effRole2.toUpperCase();
              if (r2 === 'FEDERATION' || r2 === 'FED') itemPrice2 = parseFloat(item.federationPrice || item.mrp || item.price || '0');
              else if (r2 === 'INTER_UNION' || r2 === 'INT') itemPrice2 = parseFloat(item.districtUnionPrice || item.mrp || item.price || '0');
              else if (r2 === 'WHOLESALE_DEALER' || r2 === 'WSD') itemPrice2 = parseFloat(item.wholesalePrice || item.mrp || item.price || '0');
              else if (r2 === 'DEALER' || r2 === 'DLR' || r2 === 'RETAILER' || r2 === 'RTL') itemPrice2 = parseFloat(item.retailPrice || item.mrp || item.price || '0');
            }
          }
        } catch (e) {}
      }
      const price = itemPrice2;
      const catName = item.category || 'Uncategorized';
      const imageUrl = getAbsoluteUrl(req, item.image || `/media/products/${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);

      const itemResponse2 = {
        item_id: item.id,
        item_uuid: item.id,
        item_token: item.id,
        item_name: item.name,
        item_description: item.description || '',
        url_image: imageUrl,
        available: item.isAvailable !== false,
        multi_option: false,
        multi_option_raw: "no",
        cat_id: catId2 || item.categoryId || 'cat_0',
        save_item: false,
        cooking_ref_required: false,
        ingredients_preselected: false,
        item_addons: {},
        price: {
          "1": {
            item_size_id: 1,
            size_name: item.unitSize ? `${item.unitSize} ${item.unitType || ''}`.trim() : 'Standard',
            pretty_price: `₹${price.toFixed(2)}`,
            pretty_price_after_discount: `₹${price.toFixed(2)}`,
            original_price: price,
            price: price,
            price_after_discount: price,
            discount: 0,
            earning_points: 0,
            earning_points_label: '',
          }
        },
      };

      res.json({
        code: 1,
        msg: "success",
        details: {
          merchant_id: merchant.id,
          restaurant_name: merchant.restaurantName,
          sold_out_options: {},
          default_sold_out_options: "remove",
          cart_details: null,
          data: {
            items: itemResponse2,
            meta: null,
            meta_details: { cooking_ref: {}, ingredients: {} },
            addons: {},
            addon_items: {},
          }
        }
      });
    } catch (error) {
      console.error('Error in getMenuItem2:', error);
      res.status(500).json({ code: 2, msg: "Failed to load item details" });
    }
  });

  // GET /api/PromoCheck - Check promo eligibility (mobile app)
  app.get("/api/PromoCheck", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: {} } });
  });

  // POST /api/SimilarItems - Get similar items (mobile app)
  app.post("/api/SimilarItems", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [] } });
  });

  // POST /api/servicesList - Available services (mobile app)
  app.post("/api/servicesList", async (req, res) => {
    res.json({
      code: 1, msg: "success",
      details: { data: [{ service_code: "delivery", service_name: "Delivery", enabled: true }] }
    });
  });

  // POST /api/getCartList - Get cart items (mobile app)
  app.post("/api/getCartList", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: { items: [], subtotal: "0.00", total: "0.00" } } });
  });

  // GET /api/getCartList - Get cart items (mobile app)
  app.get("/api/getCartList", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: { items: [], subtotal: "0.00", total: "0.00" } } });
  });

  // ===== Mobile App /api/interface/* Routes =====
  // Mobile app uses baseURL: api_base_url + "/interface", so all calls go to /api/interface/*

  // In-memory cart storage for mobile sessions
  const mobileCarts: Record<string, { items: any[]; merchantSlug: string; updatedAt: number }> = {};

  // Add to cart
  // Helper: build cart response matching mobile CartStore format
  function buildCartResponse(cartId: string, cart: any, includeCheckout = false) {
    const items = cart?.items || [];
    const subtotal = items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.qty), 0);
    const itemCount = items.reduce((sum: number, i: any) => sum + i.qty, 0);
    const deliveryFee = 0;
    const tax = includeCheckout ? items.reduce((sum: number, i: any) => {
      const gstPct = parseFloat(i.gstPercent || '0');
      if (gstPct > 0) {
        const lineTotal = parseFloat(i.price) * i.qty;
        return sum + (lineTotal - lineTotal / (1 + gstPct / 100));
      }
      return sum;
    }, 0) : 0;
    const total = subtotal + deliveryFee;

    const formattedItems = items.map((i: any, idx: number) => {
      const unitPrice = parseFloat(i.price) || 0;
      const lineTotal = unitPrice * i.qty;
      return {
        row: i.row || idx + 1,
        cart_row: i.row || idx + 1,
        item_id: i.item_token,
        item_token: i.item_token,
        cat_id: i.cat_id || '',
        item_name: i.item_name || 'Product',
        qty: i.qty,
        price: {
          value: `₹${unitPrice.toFixed(2)}`,
          raw: unitPrice,
          size_name: i.size_name || '',
        },
        subtotal_pretty: `₹${lineTotal.toFixed(2)}`,
        total: { value: `₹${lineTotal.toFixed(2)}`, raw: lineTotal },
        url_image: i.image || '',
        photo: i.image || '',
        special_instructions: i.special_instructions || '',
        attributes: null,
        addons: [],
        is_free: false,
      };
    });

    const summary = [
      { name: "Subtotal", value: `₹${subtotal.toFixed(2)}`, raw: subtotal },
    ];
    if (includeCheckout) {
      summary.push({ name: "Delivery Fee", value: deliveryFee === 0 ? "Free" : `₹${deliveryFee.toFixed(2)}`, raw: deliveryFee });
      summary.push({ name: "Tax", value: `₹${tax.toFixed(2)}`, raw: tax });
    }
    summary.push({ name: "Total", value: `₹${total.toFixed(2)}`, raw: total });

    const merchantSlug = cart?.merchantSlug || '';
    return {
      code: 1, msg: "success",
      details: {
        cart_uuid: cartId,
        items_count: itemCount,
        store_open: true,
        store_open_message: "",
        enabled_select_time: false,
        show_schedule: false,
        merchant_id: merchantSlug,
        data: {
          items: formattedItems,
          merchant: { restaurant_name: merchantSlug, merchant_address: '', slug: merchantSlug },
          subtotal: { value: `₹${subtotal.toFixed(2)}`, raw: subtotal },
          total: { value: `₹${total.toFixed(2)}`, raw: total },
          summary,
        },
        services: [
          { label: "Delivery", value: "delivery" },
          { label: "Pickup", value: "pickup" },
        ],
        delivery_option: "delivery",
        delivery_option2: [
          { name: "Standard Delivery", value: "now", estimation: "30-45 min" },
          { name: "Schedule for Later", value: "schedule", estimation: "" },
        ],
        delivery_option_list: ["now", "schedule"],
        estimation_time: "30-45 min",
        estimation_time_pretty: "Estimated 30-45 min",
        distance_pretty: "",
        distance_pretty1: "",
        delivery_address: {
          name: "",
          address: "",
          address_details: "",
          address_label: "",
          complete_address: "",
          is_address_found: false,
          instructions: "",
          state_name: "",
          city_name: "",
          area_name: "",
          zip_code: "",
          country_name: "India",
          lat: 0,
          lng: 0,
          place_id: "",
          point_id: "",
          point_name: "",
          point_route: "",
        },
        payment_list: [
          { payment_code: "cod", payment_name: "Cash on Delivery", payment_uuid: "cod_default", attr1: "Cash on Delivery", attr2: "Pay when you receive", logo: "", logo_image: "" },
          { payment_code: "razorpay", payment_name: "Razorpay (UPI/Cards)", payment_uuid: "razorpay_default", attr1: "Razorpay", attr2: "Pay online via UPI, Cards, Netbanking", logo: "", logo_image: "" },
          { payment_code: "credit", payment_name: "Credit (B2B)", payment_uuid: "credit_default", attr1: "Credit Account", attr2: "Order on credit against your limit", logo: "", logo_image: "" },
        ],
        payment_method: { payment_code: "cod", payment_name: "Cash on Delivery", payment_uuid: "cod_default", attr1: "Cash on Delivery", attr2: "Pay when you receive", logo: "", logo_image: "" },
        transaction_info: {
          transaction_type: "delivery",
          transaction_type_pretty: "Delivery",
          whento_deliver: "now",
          delivery_date: null,
          delivery_time: null,
        },
      },
    };
  }

  function getItemPriceForRole(itemData: any, pricingRole: string): string {
    if (!itemData) return '0';
    switch (pricingRole) {
      case 'FEDERATION':
        return itemData.federationPrice || itemData.mrp || itemData.price || '0';
      case 'INTER_UNION':
        return itemData.districtUnionPrice || itemData.mrp || itemData.price || '0';
      case 'WHOLESALE_DEALER':
        return itemData.wholesalePrice || itemData.mrp || itemData.price || '0';
      case 'DEALER':
        return itemData.retailPrice || itemData.mrp || itemData.price || '0';
      case 'RETAILER':
        return itemData.retailerPrice || itemData.mrp || itemData.price || '0';
      case 'MRP':
      default:
        return itemData.mrp || itemData.price || '0';
    }
  }

  app.post("/api/addCartItems", async (req, res) => {
    try {
      const { slug, cart_uuid, item_token, item_qty, cat_id, item_size_id, special_instructions, if_sold_out } = req.body;
      const cartId = cart_uuid || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      if (!mobileCarts[cartId]) {
        mobileCarts[cartId] = { items: [], merchantSlug: slug || '', updatedAt: Date.now() };
      }
      const cart = mobileCarts[cartId];
      
      let itemData: any = null;
      if (item_token) {
        const allItems = await storage.getAllMenuItems();
        itemData = allItems.find((i: any) => i.id === item_token || i.id === item_size_id);
      }

      let pricingRole = 'MRP';
      try {
        const token = req.cookies?.auth_token;
        if (token) {
          const payload = verifyToken(token);
          if (payload) {
            if (payload.userId) {
              const user = await storage.getUser(payload.userId);
              if (user) {
                const shortCodeMap: Record<string, string> = { 'WSD': 'WHOLESALE_DEALER', 'DLR': 'DEALER', 'RTL': 'RETAILER', 'FED': 'FEDERATION', 'INT': 'INTER_UNION' };
                const rawRole = (user as any).pricingRole || (user as any).productsPricingRole || 'MRP';
                pricingRole = shortCodeMap[rawRole] || rawRole;
              }
            } else if (payload.agentId) {
              const agentId = payload.agentId as string;
              if (agentId.startsWith('wsd-')) {
                pricingRole = 'WHOLESALE_DEALER';
              } else {
                const agent = await storage.getAgent(agentId);
                if (agent) {
                  const tierMap: Record<string, string> = { 'WSD': 'WHOLESALE_DEALER', 'DLR': 'DEALER', 'RTL': 'RETAILER', 'FED': 'FEDERATION', 'INT': 'INTER_UNION' };
                  pricingRole = tierMap[agent.productTier || ''] || 'DEALER';
                }
              }
            }
          }
        }
      } catch (e) {
      }

      const itemPrice = getItemPriceForRole(itemData, pricingRole);
      
      const qty = parseInt(item_qty) || 1;
      const existingIdx = cart.items.findIndex((i: any) => i.item_token === item_token && i.item_size_id === item_size_id);
      
      if (existingIdx >= 0) {
        cart.items[existingIdx].qty = qty;
        cart.items[existingIdx].price = itemPrice;
        cart.items[existingIdx].special_instructions = special_instructions || '';
      } else {
        cart.items.push({
          row: cart.items.length + 1,
          item_token,
          item_size_id: item_size_id || item_token,
          cat_id: cat_id || '',
          qty,
          special_instructions: special_instructions || '',
          if_sold_out: if_sold_out || 'remove',
          item_name: itemData?.name || 'Product',
          price: itemPrice,
          image: itemData?.image || '',
          size_name: itemData?.sizeName || 'Regular',
        });
      }
      cart.updatedAt = Date.now();
      
      res.json(buildCartResponse(cartId, cart));
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ code: 2, msg: "Failed to add item to cart" });
    }
  });

  // Get cart
  app.post("/api/getCart", async (req, res) => {
    try {
      const { cart_uuid } = req.body;
      const cart = cart_uuid ? mobileCarts[cart_uuid] : null;
      res.json(buildCartResponse(cart_uuid || '', cart));
    } catch (error) {
      res.json(buildCartResponse('', null));
    }
  });

  app.post("/api/getCartCheckout", async (req, res) => {
    try {
      const { cart_uuid } = req.body;
      const cart = cart_uuid ? mobileCarts[cart_uuid] : null;
      res.json(buildCartResponse(cart_uuid || '', cart, true));
    } catch (error) {
      res.json(buildCartResponse('', null, true));
    }
  });

  // Clear cart
  app.post("/api/clearCart", async (req, res) => {
    const { cart_uuid } = req.body;
    if (cart_uuid && mobileCarts[cart_uuid]) {
      delete mobileCarts[cart_uuid];
    }
    res.json({ code: 1, msg: "Cart cleared" });
  });

  // Remove cart item
  app.post("/api/removeCartItem", async (req, res) => {
    try {
      const { cart_uuid, row } = req.body;
      if (cart_uuid && mobileCarts[cart_uuid]) {
        mobileCarts[cart_uuid].items = mobileCarts[cart_uuid].items.filter((i: any) => i.row !== parseInt(row));
        mobileCarts[cart_uuid].items.forEach((item: any, idx: number) => { item.row = idx + 1; });
      }
      const items = mobileCarts[cart_uuid]?.items || [];
      const subtotal = items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.qty), 0);
      res.json({ code: 1, msg: "Item removed", details: { items, subtotal: subtotal.toFixed(2), total: subtotal.toFixed(2) } });
    } catch (error) {
      res.json({ code: 1, msg: "Item removed", details: { items: [], subtotal: "0.00", total: "0.00" } });
    }
  });

  const paymentMethods = [
    { payment_code: "cod", payment_name: "Cash on Delivery", payment_uuid: "cod_default", attr1: "Cash on Delivery", attr2: "Pay when you receive", logo: "", logo_image: "", credentials: null },
    { payment_code: "razorpay", payment_name: "Razorpay (UPI/Cards)", payment_uuid: "razorpay_default", attr1: "Razorpay", attr2: "Pay online via UPI, Cards, Netbanking", logo: "", logo_image: "", credentials: { merchant_id: "razorpay" } },
    { payment_code: "credit", payment_name: "Credit (B2B)", payment_uuid: "credit_default", attr1: "Credit Account", attr2: "Order on credit against your limit", logo: "", logo_image: "", credentials: null },
  ];

  app.post("/api/PaymentList", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: paymentMethods } });
  });

  app.get("/api/fetchPaymentmethod", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: paymentMethods, saved_payment: null } });
  });

  app.post("/api/SavedPaymentProvider", async (req, res) => {
    const { payment_code } = req.body;
    const method = paymentMethods.find(m => m.payment_code === payment_code) || paymentMethods[0];
    res.json({ code: 1, msg: "Payment method saved", details: { payment_uuid: method.payment_uuid } });
  });

  app.post("/api/SavedPaymentList", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: paymentMethods } });
  });

  app.post("/api/SetDefaultPayment", async (req, res) => {
    res.json({ code: 1, msg: "Payment method updated" });
  });

  app.post("/api/updateCartItems", async (req, res) => {
    try {
      const cart_uuid = req.body.cart_uuid;
      const row = parseInt(req.body.cart_row || req.body.row) || 0;
      const qty = parseInt(req.body.item_qty || req.body.qty) || 1;
      if (cart_uuid && mobileCarts[cart_uuid]) {
        const item = mobileCarts[cart_uuid].items.find((i: any) => i.row === row);
        if (item) {
          if (qty <= 0) {
            mobileCarts[cart_uuid].items = mobileCarts[cart_uuid].items.filter((i: any) => i.row !== row);
            mobileCarts[cart_uuid].items.forEach((it: any, idx: number) => { it.row = idx + 1; });
          } else {
            item.qty = qty;
          }
        }
      }
      const cart = cart_uuid ? mobileCarts[cart_uuid] : null;
      res.json(buildCartResponse(cart_uuid || '', cart));
    } catch (error) {
      res.json({ code: 2, msg: "Failed to update cart" });
    }
  });

  app.post("/api/setTransactionType", async (req, res) => {
    res.json({ code: 1, msg: "Transaction type updated" });
  });

  app.post("/api/setDeliveryNow", async (req, res) => {
    res.json({ code: 1, msg: "Delivery set to now" });
  });

  app.post("/api/getDeliveryDateTime", async (req, res) => {
    res.json({
      code: 1, msg: "success",
      details: {
        opening_hours: {
          dates: [
            { date: new Date().toISOString().split('T')[0], label: "Today" },
            { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], label: "Tomorrow" },
          ],
          time_ranges: [
            { start_time: "06:00", end_time: "09:00", pretty_time: "6:00 AM - 9:00 AM" },
            { start_time: "12:00", end_time: "15:00", pretty_time: "12:00 PM - 3:00 PM" },
            { start_time: "17:00", end_time: "20:00", pretty_time: "5:00 PM - 8:00 PM" },
          ],
        },
      },
    });
  });

  app.post("/api/getDeliveryDetails", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { delivery_fee: "0.00", free_delivery_above: "0.00", estimated_time: "30 min" } });
  });

  app.post("/api/loadPromo", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [] } });
  });

  app.post("/api/applyPromo", async (req, res) => {
    res.json({ code: 2, msg: "No promotions available" });
  });

  app.post("/api/removePromo", async (req, res) => {
    res.json({ code: 1, msg: "Promo removed" });
  });

  app.post("/api/PlaceOrder", async (req, res) => {
    try {
      const { cart_uuid, payment_uuid } = req.body;
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const paymentMethod = paymentMethods.find(m => m.payment_uuid === payment_uuid) || paymentMethods[0];

      if (cart_uuid && mobileCarts[cart_uuid]) {
        delete mobileCarts[cart_uuid];
      }

      if (paymentMethod.payment_code === 'cod' || paymentMethod.payment_code === 'credit') {
        res.json({
          code: 1, msg: "Order placed successfully",
          details: {
            order_uuid: orderId,
            payment_code: paymentMethod.payment_code,
            payment_instructions: { method: "offline" },
          },
        });
      } else {
        res.json({
          code: 1, msg: "Order placed",
          details: {
            order_uuid: orderId,
            payment_code: paymentMethod.payment_code,
            payment_instructions: { method: "redirect" },
            payment_url: `/payment/${orderId}`,
          },
        });
      }
    } catch (error) {
      res.json({ code: 2, msg: "Failed to place order" });
    }
  });

  app.post("/api/applyPromoCode", async (req, res) => {
    res.json({ code: 2, msg: "Invalid promo code" });
  });

  app.post("/api/removePromo", async (req, res) => {
    res.json({ code: 1, msg: "Promo removed" });
  });

  // Tips
  app.post("/api/loadTips", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [] } });
  });

  app.post("/api/checkoutAddTips", async (req, res) => {
    res.json({ code: 1, msg: "Tip added" });
  });

  // Get phone
  app.post("/api/getPhone", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { phone: "" } });
  });

  // Save transaction info (place order)
  app.post("/api/saveTransactionInfo", async (req, res) => {
    try {
      const { cart_uuid, payment_code } = req.body;
      const cart = cart_uuid ? mobileCarts[cart_uuid] : null;
      if (!cart || cart.items.length === 0) {
        return res.json({ code: 2, msg: "Cart is empty" });
      }
      
      const subtotal = cart.items.reduce((sum: number, i: any) => sum + (parseFloat(i.price) * i.qty), 0);
      const deliveryFee = 0;
      const tax = cart.items.reduce((sum: number, i: any) => {
        const gstPct = parseFloat(i.gstPercent || '0');
        if (gstPct > 0) {
          const lineTotal = parseFloat(i.price) * i.qty;
          return sum + (lineTotal - lineTotal / (1 + gstPct / 100));
        }
        return sum;
      }, 0);
      const total = subtotal + deliveryFee;
      
      const paymentMethodMap: Record<string, string> = { razorpay: 'razorpay', cod: 'cod', credit: 'credit' };
      
      const order = await storage.createOrder({
        restaurantId: cart.merchantSlug || 'merchant-3',
        items: cart.items.map((i: any) => ({ id: i.item_token, name: i.item_name, quantity: i.qty, price: i.price })),
        total: total.toString(),
        subtotal: subtotal.toString(),
        deliveryFee: deliveryFee.toString(),
        tax: tax.toString(),
        status: 'pending',
        customerName: req.body.customer_name || '',
        customerEmail: req.body.customer_email || '',
        customerPhone: req.body.customer_phone || '',
        deliveryAddress: req.body.delivery_address || '',
        paymentMethod: paymentMethodMap[payment_code] || 'cod',
        paymentStatus: payment_code === 'credit' ? 'credit' : 'pending',
        invoiceNumber: await generateInvoiceNumber(cart.restaurantId || 'merchant-3'),
      });
      
      if (cart_uuid) delete mobileCarts[cart_uuid];
      
      if (payment_code === 'razorpay') {
        const keyId = process.env.RAZORPAY_KEY_ID;
        res.json({
          code: 1, msg: "Order created",
          details: {
            order_id: order.id,
            payment_code: 'razorpay',
            razorpay_key: keyId,
            amount: Math.round(total * 100),
            currency: 'INR',
            order_uuid: order.id,
          }
        });
      } else {
        res.json({
          code: 1, msg: payment_code === 'credit' ? "Order placed on credit" : "Order placed successfully",
          details: { order_id: order.id, order_uuid: order.id, payment_code }
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);
      res.json({ code: 2, msg: "Failed to place order" });
    }
  });

  // Transaction info (order status)
  app.post("/api/TransactionInfo", async (req, res) => {
    try {
      const { order_uuid } = req.body;
      if (order_uuid) {
        const order = await storage.getOrder(order_uuid);
        if (order) {
          return res.json({
            code: 1, msg: "success",
            details: {
              order_id: order.id,
              status: order.status,
              total: order.total,
              payment_method: order.paymentMethod,
              payment_status: order.paymentStatus,
            }
          });
        }
      }
      res.json({ code: 2, msg: "Order not found" });
    } catch (error) {
      res.json({ code: 2, msg: "Failed to get order info" });
    }
  });

  // Save transaction type
  app.post("/api/saveTransactionType", async (req, res) => {
    res.json({ code: 1, msg: "success" });
  });

  // Services list
  app.post("/api/servicesList", async (req, res) => {
    res.json({
      code: 1, msg: "success",
      details: { data: [{ service_code: "delivery", service_name: "Delivery", enabled: true }] }
    });
  });

  // Similar items
  app.post("/api/SimilarItems", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [] } });
  });

  // Reviews
  app.post("/api/getReview", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [], total: 0 } });
  });

  // Item featured
  app.post("/api/itemfeatured", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: [] } });
  });

  // Cuisine list
  app.post("/api/CuisineList", async (req, res) => {
    res.json({
      code: 1, msg: "success",
      details: {
        data: [
          { cuisine_id: "1", cuisine_name: "Fresh Milk", cuisine_photo: "/media/products/fresh-milk.png" },
          { cuisine_id: "2", cuisine_name: "Curd & Buttermilk", cuisine_photo: "/media/products/curd-buttermilk.png" },
          { cuisine_id: "3", cuisine_name: "Ice Cream", cuisine_photo: "/media/products/ice-cream.png" },
          { cuisine_id: "4", cuisine_name: "Ghee & Butter", cuisine_photo: "/media/products/ghee-butter.png" },
        ]
      }
    });
  });

  // Footer
  app.post("/api/getFooter", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { data: {} } });
  });

  // Note: /api/geStoreMenu, /api/getMenuItem, /api/getMenuItem2, /api/getMerchantFeed
  // are already registered above. Mobile /api/interface/* calls are rewritten via URL rewrite middleware.

  app.post("/api/getFeaturedMerchant", async (req, res) => {
    try {
      const { featured, place_id } = req.body;
      const feed = await buildMerchantFeedResponse(undefined, undefined, 1, 10, featured || 'popular');
      res.json(feed);
    } catch (error) {
      res.json({ code: 1, msg: "success", details: { data: [] } });
    }
  });

  // Location endpoints - forward to merchant location routes
  app.post("/api/getlocationAutocomplete", async (req, res) => {
    req.url = "/api/merchant/getlocationAutocomplete";
    app.handle(req, res);
  });

  app.post("/api/reverseGeocoding", async (req, res) => {
    req.url = "/api/merchant/reverseGeocoding";
    app.handle(req, res);
  });

  app.post("/api/getLocationDetails", async (req, res) => {
    req.url = "/api/merchant/getLocationDetails";
    app.handle(req, res);
  });

  // Helper: build mobile-app compatible login response
  function buildMobileLoginResponse(user: any) {
    const role = user.role || 'customer';
    const firstName = user.name?.split(' ')[0] || user.businessName || '';
    const lastName = user.name?.split(' ').slice(1).join(' ') || '';
    const token = signToken({
      userId: user.id,
      role,
      first_name: firstName,
      last_name: lastName,
      email_address: user.email || '',
      contact_number: user.phone || '',
      business_name: user.businessName || user.name || '',
    });
    const isB2B = ['wsd', 'wholesale_dealer', 'dealer', 'retailer', 'federation', 'inter_union', 'agent'].includes(role);
    const b2bInfo: any = {};
    if (isB2B) {
      b2bInfo.is_b2b = true;
      b2bInfo.b2b_role = role;
      b2bInfo.pricing_role = user.pricingRole || 'MRP';
      b2bInfo.fresh_milk_pricing_role = user.freshMilkPricingRole || user.pricingRole || 'MRP';
      b2bInfo.products_pricing_role = user.productsPricingRole || user.pricingRole || 'MRP';
      b2bInfo.ice_cream_pricing_role = user.iceCreamPricingRole || user.pricingRole || 'MRP';
      b2bInfo.merchant_id = user.merchantId || '';
      b2bInfo.business_name = user.businessName || user.name || '';
      b2bInfo.gst_number = user.gstNumber || '';
      b2bInfo.segments = [];
      if (user.freshMilkPricingRole && user.freshMilkPricingRole !== 'MRP') b2bInfo.segments.push('Fresh Milk');
      if (user.productsPricingRole && user.productsPricingRole !== 'MRP') b2bInfo.segments.push('Products');
      if (user.iceCreamPricingRole && user.iceCreamPricingRole !== 'MRP') b2bInfo.segments.push('Ice Cream');
      if (b2bInfo.segments.length === 0) b2bInfo.segments = ['Fresh Milk', 'Products', 'Ice Cream'];
    }
    return {
      code: 1,
      msg: "Login successful",
      details: {
        user_data: token,
        user_token: token,
        user_settings: {
          id: user.id,
          first_name: user.name?.split(' ')[0] || '',
          last_name: user.name?.split(' ').slice(1).join(' ') || '',
          email_address: user.email || '',
          phone_prefix: '+91',
          contact_number: user.phone || '',
          contact_number_without_prefix: user.phone || '',
          profile_photo: '',
          role: role,
          ...b2bInfo,
        },
      },
    };
  }

  async function findB2BUserByInput(input: string): Promise<any | undefined> {
    let user = await storage.findUserByEmail(input);
    if (user) return user;

    const allUsers = await storage.listUsers();

    const phoneDigits = input.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      user = allUsers.find((u: any) => u.phone === phoneDigits || u.email === `${phoneDigits}@b2b.aavincart.com`);
      if (user) return user;
    }

    const upperInput = input.toUpperCase();
    user = allUsers.find((u: any) => (u as any).businessCode && (u as any).businessCode.toUpperCase() === upperInput);
    if (user) return user;

    const emailVariant = `${input.toLowerCase()}@aavincart.com`;
    user = allUsers.find((u: any) => u.email === emailVariant);
    if (user) return user;

    return undefined;
  }

  // User login via email (mobile app)
  app.post("/api/userLogin", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.json({ code: 2, msg: "Email and password are required" });
      }

      // Try agent code login
      const agentCodePattern = /^[A-Za-z]{2,4}[-]?\d{3,5}$/;
      if (agentCodePattern.test(username.replace('-', ''))) {
        let agentCode = username.toUpperCase();
        if (!agentCode.includes('-')) {
          const match = agentCode.match(/^([A-Z]+)(\d+)$/);
          if (match) agentCode = `${match[1]}-${match[2]}`;
        }
        const agent = await storage.getAgentByCode(agentCode);
        if (agent && agent.passwordHash) {
          const isValid = await verifyPassword(password, agent.passwordHash);
          if (isValid) {
            if (agent.status === 'claimed') await storage.updateAgent(agent.id, { status: 'active' });
            const tierToPricingRole = (tier: string | null | undefined): string => {
              if (!tier) return 'DEALER';
              const mapping: Record<string, string> = { 'WSD': 'WHOLESALE_DEALER', 'DLR': 'DEALER', 'RTL': 'RETAILER', 'FED': 'FEDERATION', 'INT': 'INTER_UNION', 'MRP': 'MRP' };
              return mapping[tier.toUpperCase()] || tier.toUpperCase();
            };
            return res.json(buildMobileLoginResponse({
              id: agent.id, name: agent.name, email: `${agentCode.toLowerCase().replace('-', '')}@aavincart.com`,
              role: 'agent', phone: agent.phone || '',
              pricingRole: tierToPricingRole(agent.productTier),
              freshMilkPricingRole: tierToPricingRole(agent.freshMilkTier),
              productsPricingRole: tierToPricingRole(agent.productTier),
              iceCreamPricingRole: tierToPricingRole(agent.productTier),
              businessName: agent.businessName || agent.name || '',
              agentCode: agent.agentCode,
              agentType: agent.agentType,
              merchantId: agent.assignedUnionId,
              address: agent.address || '',
            }));
          }
        }
      }

      // Try B2B user login with multiple lookup strategies
      const user = await findB2BUserByInput(username);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.json({ code: 2, msg: "Invalid email or password" });
      }
      return res.json(buildMobileLoginResponse(user));
    } catch (error: any) {
      console.error("Mobile login error:", error);
      res.json({ code: 2, msg: error.message || "Login failed" });
    }
  });

  // User login via phone number (mobile app)
  app.post("/api/userLoginPhone", async (req, res) => {
    try {
      const { mobile_prefix, mobile_number, password } = req.body;
      if (!mobile_number || !password) {
        return res.json({ code: 2, msg: "Phone number and password are required" });
      }

      // Try agent code login (user might enter agent code in phone field)
      const agentCodePattern = /^[A-Za-z]{2,4}[-]?\d{3,5}$/;
      if (agentCodePattern.test(mobile_number.replace('-', ''))) {
        let agentCode = mobile_number.toUpperCase();
        if (!agentCode.includes('-')) {
          const match = agentCode.match(/^([A-Z]+)(\d+)$/);
          if (match) agentCode = `${match[1]}-${match[2]}`;
        }
        const agent = await storage.getAgentByCode(agentCode);
        if (agent && agent.passwordHash) {
          const isValid = await verifyPassword(password, agent.passwordHash);
          if (isValid) {
            if (agent.status === 'claimed') await storage.updateAgent(agent.id, { status: 'active' });
            const tierToPricingRole = (tier: string | null | undefined): string => {
              if (!tier) return 'DEALER';
              const mapping: Record<string, string> = { 'WSD': 'WHOLESALE_DEALER', 'DLR': 'DEALER', 'RTL': 'RETAILER', 'FED': 'FEDERATION', 'INT': 'INTER_UNION', 'MRP': 'MRP' };
              return mapping[tier.toUpperCase()] || tier.toUpperCase();
            };
            return res.json(buildMobileLoginResponse({
              id: agent.id, name: agent.name, email: `${agentCode.toLowerCase().replace('-', '')}@aavincart.com`,
              role: 'agent', phone: agent.phone || mobile_number,
              pricingRole: tierToPricingRole(agent.productTier),
              freshMilkPricingRole: tierToPricingRole(agent.freshMilkTier),
              productsPricingRole: tierToPricingRole(agent.productTier),
              iceCreamPricingRole: tierToPricingRole(agent.productTier),
              businessName: agent.businessName || agent.name || '',
              agentCode: agent.agentCode,
              agentType: agent.agentType,
              merchantId: agent.assignedUnionId,
              address: agent.address || '',
            }));
          }
        }
      }

      // Try finding user by phone number
      const allUsers = await storage.listUsers();
      const phoneClean = mobile_number.replace(/\D/g, '');
      let user = allUsers.find((u: any) => {
        const uPhone = ((u as any).phone || '').replace(/\D/g, '');
        return uPhone && (uPhone === phoneClean || uPhone.endsWith(phoneClean) || phoneClean.endsWith(uPhone));
      });

      if (user && await verifyPassword(password, user.passwordHash)) {
        return res.json(buildMobileLoginResponse(user));
      }

      // Also try business code, email, and other lookup strategies
      const fallbackUser = await findB2BUserByInput(mobile_number);
      if (fallbackUser && await verifyPassword(password, fallbackUser.passwordHash)) {
        return res.json(buildMobileLoginResponse(fallbackUser));
      }

      return res.json({ code: 2, msg: "Invalid phone number or password" });
    } catch (error: any) {
      console.error("Mobile phone login error:", error);
      res.json({ code: 2, msg: error.message || "Login failed" });
    }
  });

  // User registration (mobile app consumer signup)
  app.post("/api/registerUser", async (req, res) => {
    try {
      const { first_name, last_name, email_address, password, cpassword, mobile_prefix, mobile_number } = req.body;

      if (!first_name || !last_name) {
        return res.json({ code: 2, msg: "First name and last name are required" });
      }
      if (!email_address || !/.+@.+\..+/.test(email_address)) {
        return res.json({ code: 2, msg: "A valid email address is required" });
      }
      if (!password || password.length < 6) {
        return res.json({ code: 2, msg: "Password must be at least 6 characters" });
      }
      if (password !== cpassword) {
        return res.json({ code: 2, msg: "Passwords do not match" });
      }

      const existingUser = await storage.findUserByEmail(email_address.toLowerCase());
      if (existingUser) {
        return res.json({ code: 2, msg: "An account with this email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const fullName = `${first_name} ${last_name}`.trim();
      const phone = mobile_number ? (mobile_prefix || '+91').replace('+', '') + mobile_number : '';

      const newUser = await storage.createUser({
        name: fullName,
        email: email_address.toLowerCase(),
        passwordHash,
        phone: phone || null,
        role: 'customer',
        pricingRole: 'MRP',
        freshMilkPricingRole: 'MRP',
        productsPricingRole: 'MRP',
        iceCreamPricingRole: 'MRP',
      });

      return res.json(buildMobileLoginResponse(newUser));
    } catch (error: any) {
      console.error("User registration error:", error);
      res.json({ code: 2, msg: error.message || "Registration failed" });
    }
  });

  // Address management
  app.post("/api/saveClientAddress", async (req, res) => {
    res.json({ code: 1, msg: "Address saved" });
  });

  app.post("/api/fetchCustomerAddresses", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '');
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const addresses = await db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
      const formatted = addresses.map(a => ({
        address_uuid: String(a.id),
        place_id: a.placeId || String(a.id),
        address: {
          formatted_address: [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', '),
          address1: a.addressLine1 || '',
          address2: a.addressLine2 || '',
          landmark: a.landmark || '',
          city: a.city || '',
          state: a.state || '',
          pincode: a.pincode || '',
          country: a.country || 'India',
          lat: a.lat || '',
          lng: a.lng || '',
        },
        label: a.label || 'Home',
        name: a.name || '',
        phone: a.phone || '',
        is_default: a.isDefault || false,
        point_id: a.pointId || '',
        point_name: a.pointName || '',
        point_route: a.pointRoute || '',
        location_photo_url: a.locationPhotoUrl || null,
      }));
      res.json({ code: 1, msg: "success", details: { data: formatted } });
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.json({ code: 1, msg: "success", details: { data: [] } });
    }
  });

  app.post("/api/getAddresses", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '') || req.cookies?.auth_token;
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const addresses = await db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
      const formatted = addresses.map(a => ({
        address_uuid: String(a.id),
        place_id: a.placeId || String(a.id),
        address: {
          formatted_address: [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', '),
          address1: a.addressLine1 || '',
          address2: a.addressLine2 || '',
          landmark: a.landmark || '',
          city: a.city || '',
          state: a.state || '',
          pincode: a.pincode || '',
          country: a.country || 'India',
          lat: a.lat || '',
          lng: a.lng || '',
        },
        label: a.label || 'Home',
        name: a.name || '',
        phone: a.phone || '',
        is_default: a.isDefault || false,
        point_id: a.pointId || '',
        point_name: a.pointName || '',
        point_route: a.pointRoute || '',
        location_photo_url: a.locationPhotoUrl || null,
      }));
      res.json({ code: 1, msg: "success", details: { data: formatted } });
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.json({ code: 1, msg: "success", details: { data: [] } });
    }
  });

  const saveAddressHandler = async (req: any, res: any) => {
    try {
      const token = req.headers.authorization?.replace('token ', '') || req.cookies?.auth_token;
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const b = req.body;
      const address_uuid = b.address_uuid;
      const label = b.label || b.address_label || 'Home';
      const name = b.name || b.location_name || '';
      const phone = b.phone || '';
      const address_line1 = b.address_line1 || b.street_number || b.house_number || '';
      const address_line2 = b.address_line2 || b.street_name || '';
      const landmark = b.landmark || b.location_name || '';
      const city = b.city || b.city_id || '';
      const state = b.state || b.state_id || '';
      const pincode = b.pincode || b.postal_code || b.zip_code || '';
      const country = b.country || 'India';
      const lat = b.lat || b.latitude || null;
      const lng = b.lng || b.longitude || null;
      const place_id = b.place_id || '';
      const point_id = b.point_id || '';
      const point_name = b.point_name || '';
      const point_route = b.point_route || '';
      const is_default = b.is_default || false;
      const formatted_address = b.formatted_address || '';
      const location_photo_url = b.location_photo_url || null;
      const gps_accuracy = b.gps_accuracy || b.gpsAccuracy || null;
      const accuracy_grade = b.accuracy_grade || b.accuracyGrade || null;
      const location_source = b.location_source || b.locationSource || null;
      const address_source = b.address_source || b.addressSource || null;
      const is_mock_location = b.is_mock_location ?? b.isMockLocation ?? null;
      const suspicion_score = b.suspicion_score || b.suspicionScore || 0;
      const captured_at = b.captured_at || b.capturedAt || null;
      const proof_hash = b.proof_hash || b.proofHash || null;
      const consent_given = b.consent_given ?? b.consentGiven ?? false;
      const proof_status = location_photo_url && gps_accuracy ? "pending" : null;

      if (is_default) {
        await db.update(userAddresses).set({ isDefault: false }).where(eq(userAddresses.userId, userId));
      }

      if (address_uuid) {
        const updateData: any = {
          label: label || 'Home', name, phone,
          addressLine1: address_line1, addressLine2: address_line2, landmark,
          city, state, pincode, country: country || 'India',
          lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
          placeId: place_id, pointId: point_id, pointName: point_name, pointRoute: point_route,
          isDefault: is_default || false,
          locationPhotoUrl: location_photo_url,
          updatedAt: new Date(),
        };
        if (gps_accuracy) updateData.gpsAccuracy = String(gps_accuracy);
        if (accuracy_grade) updateData.accuracyGrade = accuracy_grade;
        if (location_source) updateData.locationSource = location_source;
        if (address_source) updateData.addressSource = address_source;
        if (is_mock_location !== null) updateData.isMockLocation = is_mock_location;
        if (suspicion_score) updateData.suspicionScore = suspicion_score;
        if (captured_at) updateData.capturedAt = new Date(captured_at);
        if (proof_status) updateData.proofStatus = proof_status;
        if (proof_hash) updateData.proofHash = proof_hash;
        if (consent_given) { updateData.consentGiven = consent_given; updateData.consentAt = new Date(); }
        await db.update(userAddresses).set(updateData)
          .where(and(eq(userAddresses.id, parseInt(address_uuid)), eq(userAddresses.userId, userId)));
        res.json({ code: 1, msg: "Address updated successfully" });
      } else {
        const existingCount = await db.select().from(userAddresses).where(eq(userAddresses.userId, userId));
        const shouldBeDefault = is_default || existingCount.length === 0;

        const insertData: any = {
          userId, label: label || 'Home', name, phone,
          addressLine1: address_line1, addressLine2: address_line2, landmark,
          city, state, pincode, country: country || 'India',
          lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
          placeId: place_id, pointId: point_id, pointName: point_name, pointRoute: point_route,
          isDefault: shouldBeDefault,
          locationPhotoUrl: location_photo_url,
        };
        if (gps_accuracy) insertData.gpsAccuracy = String(gps_accuracy);
        if (accuracy_grade) insertData.accuracyGrade = accuracy_grade;
        if (location_source) insertData.locationSource = location_source;
        if (address_source) insertData.addressSource = address_source;
        if (is_mock_location !== null) insertData.isMockLocation = is_mock_location;
        if (suspicion_score) insertData.suspicionScore = suspicion_score;
        if (captured_at) insertData.capturedAt = new Date(captured_at);
        if (proof_status) insertData.proofStatus = proof_status;
        if (proof_hash) insertData.proofHash = proof_hash;
        if (consent_given) { insertData.consentGiven = consent_given; insertData.consentAt = new Date(); }
        const [newAddr] = await db.insert(userAddresses).values(insertData).returning();
        res.json({ code: 1, msg: "Address saved successfully", details: { address_uuid: String(newAddr.id) } });
      }
    } catch (error) {
      console.error("Error saving address:", error);
      res.status(500).json({ code: 2, msg: "Failed to save address" });
    }
  };
  app.post("/api/saveAddress", saveAddressHandler);
  app.post("/api/SavedAddress", saveAddressHandler);
  app.post("/api/apilocations/saveAddress", saveAddressHandler);

  app.post("/api/deleteAddress", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '');
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const { address_uuid } = req.body;
      if (!address_uuid) {
        return res.json({ code: 2, msg: "Address ID required" });
      }
      await db.delete(userAddresses).where(and(eq(userAddresses.id, parseInt(address_uuid)), eq(userAddresses.userId, userId)));
      res.json({ code: 1, msg: "Address deleted" });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ code: 2, msg: "Failed to delete address" });
    }
  });

  app.post("/api/setDefaultAddress", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '');
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const { address_uuid } = req.body;
      await db.update(userAddresses).set({ isDefault: false }).where(eq(userAddresses.userId, userId));
      await db.update(userAddresses).set({ isDefault: true }).where(and(eq(userAddresses.id, parseInt(address_uuid)), eq(userAddresses.userId, userId)));
      res.json({ code: 1, msg: "Default address set" });
    } catch (error) {
      console.error("Error setting default:", error);
      res.status(500).json({ code: 2, msg: "Failed to set default address" });
    }
  });

  app.post("/api/SavePlaceByID", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '');
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const { place_id } = req.body;
      const existing = await db.select().from(userAddresses).where(and(eq(userAddresses.userId, userId), eq(userAddresses.placeId, place_id || '')));
      if (existing.length === 0 && place_id) {
        await db.insert(userAddresses).values({ userId, placeId: place_id, label: 'Other' });
      }
      res.json({ code: 1, msg: "Place saved" });
    } catch (error) {
      res.json({ code: 1, msg: "Place saved" });
    }
  });

  app.post("/api/validateCoordinates", async (req, res) => {
    res.json({ code: 1, msg: "success", details: { valid: true } });
  });

  app.post("/api/checkoutAddress", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('token ', '');
      let userId = 'guest';
      if (token) {
        try { const decoded: any = jwt.verify(token, JWT_SECRET); userId = decoded.userId; } catch(e) {}
      }
      const { address_uuid } = req.body;
      if (address_uuid) {
        const [addr] = await db.select().from(userAddresses).where(and(eq(userAddresses.id, parseInt(address_uuid)), eq(userAddresses.userId, userId)));
        if (addr) {
          return res.json({
            code: 1, msg: "success",
            details: {
              delivery_address: {
                name: addr.name || '',
                address: [addr.addressLine1, addr.addressLine2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
                address_details: [addr.addressLine1, addr.landmark].filter(Boolean).join(', '),
                address_label: addr.label || 'Home',
                complete_address: [addr.addressLine1, addr.addressLine2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
                is_address_found: true,
                instructions: '',
                state_name: addr.state || '',
                city_name: addr.city || '',
                area_name: addr.landmark || '',
                zip_code: addr.pincode || '',
                country_name: addr.country || 'India',
                lat: parseFloat(addr.lat || '0'),
                lng: parseFloat(addr.lng || '0'),
                place_id: addr.placeId || String(addr.id),
                point_id: addr.pointId || '',
                point_name: addr.pointName || '',
                point_route: addr.pointRoute || '',
              }
            }
          });
        }
      }
      res.json({ code: 1, msg: "success" });
    } catch (error) {
      res.json({ code: 1, msg: "success" });
    }
  });

  // Phone/email verification
  app.post("/api/RequestEmailCode", async (req, res) => {
    res.json({ code: 1, msg: "Code sent" });
  });

  app.post("/api/verifyCode", async (req, res) => {
    res.json({ code: 1, msg: "Verified" });
  });

  app.post("/api/ChangePhone", async (req, res) => {
    res.json({ code: 1, msg: "Phone updated" });
  });

  // ===== Mobile App Feed Endpoints =====
  // Helper to build merchant feed response from DB merchants
  async function buildMerchantFeedResponse(userLat?: number, userLng?: number, page: number = 1, pageSize: number = 20, featuredId?: string, baseUrl?: string) {
    const allMerchants = await storage.getMerchants('active');
    
    // Filter to only merchants with lat/lng
    let merchants = allMerchants.filter((m: any) => {
      const lat = parseFloat(m.latitude);
      const lng = parseFloat(m.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    // Calculate distance from user and sort by nearest
    const merchantsWithDistance = merchants.map((m: any) => {
      const mLat = parseFloat(m.latitude);
      const mLng = parseFloat(m.longitude);
      let distance = 0;
      if (userLat && userLng) {
        distance = calculateDistance(userLat, userLng, mLat, mLng);
      }
      return { ...m, distance };
    }).sort((a: any, b: any) => a.distance - b.distance);

    // Identify the nearest District Union for the user's location
    // District unions = any merchant that is NOT a federation or dairy plant
    const federationDairySlugs = ['federation', 'dairy', 'fed-amb', 'fed-mad', 'fed-sho', 'fed-pro'];
    const isFederationOrDairy = (m: any) => {
      const slug = (m.restaurantSlug || '').toLowerCase();
      const name = (m.restaurantName || '').toLowerCase();
      return federationDairySlugs.some(s => slug.includes(s)) || 
             name.includes('federation') || name.includes('dairy') ||
             slug.includes('ambattur') || slug.includes('sholinganallur') || slug.includes('madhavaram');
    };
    const districtUnions = merchantsWithDistance.filter((m: any) => !isFederationOrDairy(m));
    const federationAndDairies = merchantsWithDistance.filter((m: any) => isFederationOrDairy(m));

    // The user's respected union is the nearest district union
    const respectedUnion = districtUnions.length > 0 ? [districtUnions[0]] : [];

    let filtered: any[];
    if (featuredId === 'popular') {
      // "Popular Near You" - show only the user's respected district union
      filtered = respectedUnion;
    } else if (featuredId === 'new') {
      // "New" section - show federation dairies if nearby
      filtered = federationAndDairies.slice(0, 5);
    } else {
      // Default feed ("Explore Unions") - show only the user's respected union
      filtered = respectedUnion;
    }

    // Paginate
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedMerchants = filtered.slice(startIdx, endIdx);
    const isLastPage = endIdx >= filtered.length;

    const data = paginatedMerchants.map((m: any) => {
      const distKm = m.distance;
      let distancePretty = '';
      let distanceShort = '';
      if (distKm < 1) {
        distancePretty = `${Math.round(distKm * 1000)} m`;
        distanceShort = `${Math.round(distKm * 1000)} m`;
      } else {
        distancePretty = `${distKm.toFixed(1)} km`;
        distanceShort = `${distKm.toFixed(1)} km`;
      }

      const isUnion = m.restaurantSlug?.startsWith('aavin-') && !m.restaurantSlug?.includes('dairy') && !m.restaurantSlug?.includes('federation');
      const isDairy = m.restaurantSlug?.includes('dairy') || m.restaurantSlug?.includes('ambattur') || m.restaurantSlug?.includes('sholinganallur') || m.restaurantSlug?.includes('madhavaram');
      const isFederation = m.restaurantSlug?.includes('federation');

      let cuisineList = ['Dairy Products'];
      if (isUnion) cuisineList = ['Fresh Milk', 'Dairy Products', 'Ice Cream'];
      else if (isDairy) cuisineList = ['Fresh Milk', 'Products'];
      else if (isFederation) cuisineList = ['All Products'];

      const generatedSlug = m.restaurantSlug || m.id || (m.restaurantName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      return {
        merchant_id: m.id,
        restaurant_name: m.restaurantName,
        restaurant_slug: generatedSlug,
        url_logo: (() => {
          const logoPath = m.logo ? (m.logo.startsWith('/') || m.logo.startsWith('http') ? m.logo : `/public/media/${m.logo}`) : `/media/products/fresh-milk.png`;
          if (logoPath.startsWith('http')) return logoPath;
          return baseUrl ? `${baseUrl}${logoPath}` : logoPath;
        })(),
        url_header: (() => {
          if (!m.headerImage) return '';
          const headerPath = m.headerImage.startsWith('/') || m.headerImage.startsWith('http') ? m.headerImage : `/public/media/${m.headerImage}`;
          if (headerPath.startsWith('http')) return headerPath;
          return baseUrl ? `${baseUrl}${headerPath}` : headerPath;
        })(),
        has_header: !!m.headerImage,
        cuisine: cuisineList,
        cuisines: cuisineList.join(', '),
        reviews: { ratings: "4.5", total: "100" },
        estimation: "30",
        estimation2: "30 min",
        distance: distKm,
        distance_pretty: distancePretty,
        distance_short: distanceShort,
        available: true,
        open_status: 1,
        saved_store: 0,
        free_delivery: false,
        services: ["delivery"],
        latitude: m.latitude,
        longitude: m.longitude,
        address: m.address || '',
      };
    });

    return {
      code: 1,
      msg: "success",
      details: {
        data,
        is_last_page: isLastPage,
        total: filtered.length,
        page,
      }
    };
  }

  // POST /api/getMerchantFeed - Mobile app merchant list by GPS coordinates
  app.post("/api/getMerchantFeed", async (req, res) => {
    try {
      const { coordinates, page = 1, list_type, featured_id, rows } = req.body;
      let userLat: number | undefined;
      let userLng: number | undefined;
      
      if (coordinates) {
        if (typeof coordinates === 'string') {
          const parts = coordinates.split(',');
          userLat = parseFloat(parts[0]);
          userLng = parseFloat(parts[1]);
        } else if (typeof coordinates === 'object') {
          userLat = parseFloat(coordinates.lat || coordinates.latitude);
          userLng = parseFloat(coordinates.lng || coordinates.longitude);
        }
      }

      const pageSize = (rows && rows > 0) ? rows : 20;
      const result = await buildMerchantFeedResponse(userLat, userLng, parseInt(page) || 1, pageSize, featured_id, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getMerchantFeed:', error);
      res.status(500).json({ code: 2, msg: "Failed to load merchant feed" });
    }
  });

  // POST /api/getMerchantFeedAuth - Authenticated version (same logic for now)
  app.post("/api/getMerchantFeedAuth", async (req, res) => {
    try {
      const { coordinates, page = 1, list_type, featured_id, rows } = req.body;
      let userLat: number | undefined;
      let userLng: number | undefined;
      
      if (coordinates) {
        if (typeof coordinates === 'string') {
          const parts = coordinates.split(',');
          userLat = parseFloat(parts[0]);
          userLng = parseFloat(parts[1]);
        } else if (typeof coordinates === 'object') {
          userLat = parseFloat(coordinates.lat || coordinates.latitude);
          userLng = parseFloat(coordinates.lng || coordinates.longitude);
        }
      }

      const pageSize = (rows && rows > 0) ? rows : 20;
      const result = await buildMerchantFeedResponse(userLat, userLng, parseInt(page) || 1, pageSize, featured_id, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getMerchantFeedAuth:', error);
      res.status(500).json({ code: 2, msg: "Failed to load merchant feed" });
    }
  });

  // POST /api/getFeedV1 - Location-based merchant feed (city/area based)
  app.post("/api/getFeedV1", async (req, res) => {
    try {
      const { page = 1 } = req.body;
      const result = await buildMerchantFeedResponse(undefined, undefined, parseInt(page) || 1, 20, undefined, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getFeedV1:', error);
      res.status(500).json({ code: 2, msg: "Failed to load feed" });
    }
  });

  // GET /api/getFeedV1 - Same as POST but for GET requests
  app.get("/api/getFeedV1", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await buildMerchantFeedResponse(undefined, undefined, page, 20, undefined, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getFeedV1 GET:', error);
      res.status(500).json({ code: 2, msg: "Failed to load feed" });
    }
  });

  // POST /api/getFeedAuthV1 - Authenticated location-based feed
  app.post("/api/getFeedAuthV1", async (req, res) => {
    try {
      const { page = 1 } = req.body;
      const result = await buildMerchantFeedResponse(undefined, undefined, parseInt(page) || 1, 20, undefined, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getFeedAuthV1:', error);
      res.status(500).json({ code: 2, msg: "Failed to load feed" });
    }
  });

  // GET /api/getFeedAuthV1 - Same as POST but for GET requests
  app.get("/api/getFeedAuthV1", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await buildMerchantFeedResponse(undefined, undefined, page, 20, undefined, getBaseUrl(req));
      res.json(result);
    } catch (error) {
      console.error('Error in getFeedAuthV1 GET:', error);
      res.status(500).json({ code: 2, msg: "Failed to load feed" });
    }
  });

  // Category image mapping for dairy products
  const categoryImageMap: Record<string, string> = {
    'fresh milk': '/media/products/fresh-milk.png',
    'milk': '/media/products/fresh-milk.png',
    'tetra milk': '/media/products/tetra-milk.png',
    'curd': '/media/products/curd.png',
    'curd & buttermilk': '/media/products/curd-buttermilk.png',
    'butter milk': '/media/products/curd-buttermilk.png',
    'buttermilk': '/media/products/curd-buttermilk.png',
    'ice cream': '/media/products/ice-cream.png',
    'ghee': '/media/products/ghee.png',
    'ghee & butter': '/media/products/ghee-butter.png',
    'butter': '/media/products/butter.png',
    'paneer': '/media/products/paneer.png',
    'paneer & cheese': '/media/products/paneer-cheese.png',
    'flavoured milk': '/media/products/flavoured-milk.png',
    'flavored milk': '/media/products/flavored-milk.png',
    'milk shake': '/media/products/milk-shake.png',
    'milkshake': '/media/products/milk-shake.png',
    'sweets': '/media/products/sweets.png',
    'milk powder': '/media/products/milk-powder.png',
    'khova': '/media/products/khova.png',
    'khoya': '/media/products/khova.png',
  };

  function getCategoryImage(categoryName: string): string {
    const key = categoryName.toLowerCase().trim();
    return categoryImageMap[key] || `/media/products/${key.replace(/[^a-z0-9]/g, '-')}.png`;
  }

  // GET /api/getBanner - Home page banner data
  app.get("/api/getBanner", async (req, res) => {
    try {
      const bUrl = getBaseUrl(req);
      const allMenuItems = await storage.getAllMenuItems();
      const categoryCounts: Record<string, number> = {};
      const categoryDisplayName: Record<string, string> = {};
      for (const item of allMenuItems) {
        const cat = item.category || 'Uncategorized';
        const normalizedKey = cat.toLowerCase().trim();
        categoryCounts[normalizedKey] = (categoryCounts[normalizedKey] || 0) + 1;
        if (!categoryDisplayName[normalizedKey]) {
          categoryDisplayName[normalizedKey] = cat.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      }
      const cuisineList = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([normalizedKey, count], index) => {
          const imgPath = getCategoryImage(normalizedKey);
          return {
            cuisine_id: index + 1,
            cuisine_name: categoryDisplayName[normalizedKey] || normalizedKey,
            featured_image: imgPath.startsWith('http') ? imgPath : `${bUrl}${imgPath}`,
            total_restaurants: count,
          };
        });

      res.json({
        code: 1,
        msg: "success",
        details: {
          data: [],
          food_list: [],
          merchant_list: [],
          cuisine_list: cuisineList,
        }
      });
    } catch (error) {
      console.error('Error in getBanner:', error);
      res.json({ code: 1, msg: "success", details: { data: [], food_list: [], merchant_list: [], cuisine_list: [] } });
    }
  });

  // GET /api/getFeaturedItems - Popular products for home page
  app.get("/api/getFeaturedItems", async (req, res) => {
    try {
      const bUrl = getBaseUrl(req);
      const allMenuItems = await storage.getAllMenuItems();
      const featured = allMenuItems.slice(0, 10).map((item: any) => {
        const price = parseFloat(item.mrp || item.price || '0');
        const catName = (item.category || 'uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const imgPath = item.image || `/media/products/${catName}.png`;
        return {
          item_uuid: item.id,
          item_id: item.id,
          item_name: item.name,
          url_image: imgPath.startsWith('http') ? imgPath : `${bUrl}${imgPath}`,
          cat_id: `cat_0`,
          merchant_id: item.merchantId,
          merchant_name: '',
          lowest_price: `₹${price.toFixed(2)}`,
          is_eligible: true,
          promo: null,
        };
      });

      res.json({
        code: 1,
        msg: "success",
        details: { data: featured }
      });
    } catch (error) {
      console.error('Error in getFeaturedItems:', error);
      res.json({ code: 1, msg: "success", details: { data: [] } });
    }
  });

  // POST /api/CuisineList - Mobile app cuisine/category list (pulls from real data)
  app.post("/api/CuisineList", async (req, res) => {
    try {
      const allMenuItems = await storage.getAllMenuItems();
      
      const categoryCounts: Record<string, number> = {};
      const categoryDisplayName: Record<string, string> = {};
      for (const item of allMenuItems) {
        const cat = item.category || 'Uncategorized';
        const normalizedKey = cat.toLowerCase().trim();
        categoryCounts[normalizedKey] = (categoryCounts[normalizedKey] || 0) + 1;
        if (!categoryDisplayName[normalizedKey]) {
          categoryDisplayName[normalizedKey] = cat.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      }

      const bUrl = getBaseUrl(req);
      const cuisines = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([normalizedKey, count], index) => {
          const imgPath = getCategoryImage(normalizedKey);
          const absoluteImg = imgPath.startsWith('http') ? imgPath : `${bUrl}${imgPath}`;
          return {
            cuisine_id: index + 1,
            cuisine_name: categoryDisplayName[normalizedKey] || normalizedKey,
            featured_image: absoluteImg,
            total_restaurants: count,
          };
        });

      res.json({
        code: 1,
        msg: "success",
        details: {
          data: cuisines,
          data_raw: cuisines,
          cuisine_list: cuisines,
        }
      });
    } catch (error) {
      console.error('Error in CuisineList:', error);
      res.status(500).json({ code: 2, msg: "Failed to load cuisine list" });
    }
  });

  // ===============================================
  // MOBILE APP - getPage ENDPOINT (Privacy, Terms, About)
  // ===============================================
  app.post("/api/getPage", async (req, res) => {
    const { page_id } = req.body;
    const pages: Record<string, { title: string; long_content: string }> = {
      page_privacy_policy: {
        title: "Privacy Policy",
        long_content: `
<h2>Privacy Policy - Aavincart</h2>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<p>Tamil Nadu Cooperative Milk Producers' Federation Limited (TCMPF), operating under the brand name "Aavin", is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how Aavincart collects, uses, and safeguards your data.</p>

<h3>1. Information We Collect</h3>
<ul>
<li><strong>Personal Information:</strong> Name, phone number, email address, delivery addresses, and business details (for B2B customers).</li>
<li><strong>Location Data:</strong> GPS coordinates for delivery services and nearest District Union detection.</li>
<li><strong>Order Information:</strong> Purchase history, payment details, and delivery preferences.</li>
<li><strong>Device Information:</strong> Device type, operating system, and push notification tokens.</li>
</ul>

<h3>2. How We Use Your Information</h3>
<ul>
<li>Processing and delivering your orders for milk and dairy products.</li>
<li>Communicating order status, delivery updates, and promotional offers.</li>
<li>Improving our products and services.</li>
<li>B2B account management including credit limits and pricing tiers.</li>
<li>Generating invoices, E-way Bills, and GST returns as required by law.</li>
</ul>

<h3>3. Data Sharing</h3>
<p>We do not sell your personal information. We may share data with:</p>
<ul>
<li>District Cooperative Milk Producers' Unions for order fulfillment.</li>
<li>Delivery partners for order delivery.</li>
<li>Payment processors (Razorpay) for transaction processing.</li>
<li>Government authorities as required by Indian law.</li>
</ul>

<h3>4. Data Security</h3>
<p>We implement industry-standard security measures to protect your data, including encryption, secure servers, and access controls.</p>

<h3>5. Your Rights</h3>
<p>You have the right to access, update, or delete your personal information. Contact us at <strong>support@aavin.tn.gov.in</strong> for any privacy-related requests.</p>

<h3>6. Contact Us</h3>
<p>Tamil Nadu Cooperative Milk Producers' Federation Ltd.<br>
Aavin Illam, Madhavaram Milk Colony,<br>
Chennai - 600 051, Tamil Nadu, India<br>
Phone: 044-2555 1746</p>
`
      },
      page_terms: {
        title: "Terms and Conditions",
        long_content: `
<h2>Terms and Conditions - Aavincart</h2>
<p><strong>Last Updated:</strong> January 1, 2025</p>
<p>Welcome to Aavincart, the official ordering platform of Tamil Nadu Cooperative Milk Producers' Federation (TCMPF / Aavin). By using this application, you agree to these terms.</p>

<h3>1. Eligibility</h3>
<p>You must be at least 18 years old to use this platform. B2B customers must provide valid business registration documents.</p>

<h3>2. Products and Pricing</h3>
<ul>
<li>All products are sourced from Aavin District Cooperative Milk Producers' Unions.</li>
<li>Prices are subject to change based on Federation guidelines.</li>
<li>B2B pricing tiers (Federation, Inter-Union, WSD, Dealer, Retailer) are assigned based on your registered business category.</li>
<li>MRP is applicable for all consumer (B2C) purchases.</li>
</ul>

<h3>3. Orders and Delivery</h3>
<ul>
<li>Orders are subject to product availability at your nearest District Union.</li>
<li>Delivery times are estimated and may vary based on location and demand.</li>
<li>Fresh milk products have specific delivery windows to ensure quality.</li>
<li>B2B orders may be split by product segment (Fresh Milk, Products, Ice Cream).</li>
</ul>

<h3>4. Payments</h3>
<ul>
<li>We accept online payments via Razorpay (UPI, Cards, Netbanking), Cash on Delivery, and Credit (for approved B2B customers).</li>
<li>B2B credit terms are subject to approval and credit limit assignment by the respective District Union.</li>
<li>All prices are in Indian Rupees (INR) and inclusive of applicable GST.</li>
</ul>

<h3>5. Returns and Refunds</h3>
<ul>
<li>Perishable dairy products may be returned only if delivered in damaged or spoiled condition.</li>
<li>Report quality issues within 2 hours of delivery.</li>
<li>Refunds will be processed to the original payment method within 5-7 business days.</li>
</ul>

<h3>6. B2B Terms</h3>
<ul>
<li>B2B registrations require approval from the respective District Union or Federation.</li>
<li>Credit limits and payment terms are at the discretion of the assigning authority.</li>
<li>E-way Bills are generated automatically for interstate transactions as per GST regulations.</li>
</ul>

<h3>7. Intellectual Property</h3>
<p>All content, logos, and trademarks on this platform belong to TCMPF (Aavin) and may not be reproduced without permission.</p>

<h3>8. Limitation of Liability</h3>
<p>TCMPF shall not be liable for delays caused by force majeure events, including natural disasters, strikes, or government restrictions.</p>

<h3>9. Governing Law</h3>
<p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Chennai, Tamil Nadu.</p>

<h3>10. Contact</h3>
<p>Tamil Nadu Cooperative Milk Producers' Federation Ltd.<br>
Aavin Illam, Madhavaram Milk Colony,<br>
Chennai - 600 051, Tamil Nadu<br>
Email: support@aavin.tn.gov.in | Phone: 044-2555 1746</p>
`
      },
      page_aboutus: {
        title: "About Us",
        long_content: `
<h2>About Aavincart - Tamil Nadu Cooperative Milk Producers' Federation</h2>

<h3>Who We Are</h3>
<p>Tamil Nadu Cooperative Milk Producers' Federation Limited (TCMPF), popularly known as <strong>Aavin</strong>, is the apex body of the dairy cooperative movement in Tamil Nadu. Established to empower dairy farmers and ensure quality dairy products reach every household, Aavin has grown to become one of India's most trusted dairy brands.</p>

<h3>Our Network</h3>
<ul>
<li><strong>27 District Cooperative Milk Producers' Unions</strong> across Tamil Nadu</li>
<li><strong>4 Federation Dairies</strong> for processing and production</li>
<li><strong>3.85 Lakh+ Farmers</strong> contributing to daily milk procurement</li>
<li><strong>Thousands of Retail Outlets</strong> ensuring last-mile delivery</li>
</ul>

<h3>What is Aavincart?</h3>
<p>Aavincart is the official digital ordering platform of TCMPF, designed to modernize the distribution network and improve operational efficiency across the federation's supply chain. The platform serves:</p>
<ul>
<li><strong>Consumers:</strong> Order fresh Aavin milk, curd, buttermilk, ghee, paneer, ice cream, and more for home delivery.</li>
<li><strong>B2B Partners:</strong> Wholesale dealers, agents, retailers, and institutions can place bulk orders with role-based pricing.</li>
<li><strong>District Unions:</strong> Manage inventory, process orders, and coordinate deliveries through the merchant dashboard.</li>
</ul>

<h3>Our Products</h3>
<p>Aavin offers a wide range of dairy products across three segments:</p>
<ul>
<li><strong>Fresh Milk:</strong> Standardized Milk, Toned Milk, Full Cream Milk, Flavoured Milk</li>
<li><strong>Dairy Products:</strong> Curd, Buttermilk, Ghee, Paneer, Cheese, Butter, Milk Powder, Khoa, Peda</li>
<li><strong>Ice Cream:</strong> Wide variety of flavours including Vanilla, Chocolate, Butterscotch, Mango, Pista, and seasonal specials</li>
</ul>

<h3>Our Mission</h3>
<p>To provide pure, wholesome dairy products to consumers at fair prices while ensuring remunerative prices to milk producers, thereby improving the socio-economic conditions of dairy farmers in Tamil Nadu.</p>

<h3>Contact Us</h3>
<p><strong>Tamil Nadu Cooperative Milk Producers' Federation Ltd.</strong><br>
Aavin Illam, Madhavaram Milk Colony,<br>
Chennai - 600 051, Tamil Nadu, India<br>
Phone: 044-2555 1746<br>
Email: support@aavin.tn.gov.in<br>
Website: www.aavin.tn.gov.in</p>
`
      },
    };

    const page = pages[page_id];
    if (page) {
      res.json({ code: 1, msg: "success", details: page });
    } else {
      res.json({ code: 2, msg: "Page not found", details: null });
    }
  });

  // ===============================================
  // MOBILE APP - Saved Payment (GET) ENDPOINT
  // ===============================================
  app.get("/api/Savedpayment", async (req, res) => {
    res.json({
      code: 1, msg: "success",
      details: {
        data: {
          "Available Payment Methods": [
            { payment_uuid: "razorpay_1", attr1: "Razorpay (UPI/Cards/Netbanking)", attr2: "Pay online", payment_code: "razorpay", as_default: 1, logo_url: "" },
            { payment_uuid: "cod_1", attr1: "Cash on Delivery", attr2: "Pay when delivered", payment_code: "cod", as_default: 0, logo_url: "" },
          ]
        }
      }
    });
  });

  // ===============================================
  // MOBILE APP - Save Notification Settings ENDPOINT
  // ===============================================
  app.post("/api/saveNotifications", async (req, res) => {
    const { push } = req.body;
    res.json({
      code: 1,
      msg: push === "1" || push === 1 ? "Push notifications enabled" : "Push notifications disabled",
      details: {
        user_settings: {
          app_push_notifications: push === "1" || push === 1,
        }
      }
    });
  });

  // ========================
  // DMS (Distribution Management System) API Routes
  // ========================

}
