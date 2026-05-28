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
import {
  haversineDistance, groupIntoStops, optimizeRoute, checkVehicleCapacity,
  buildRouteSummary, generateTripSheetPDF, generateVehicleWiseTripSheetsPDF,
  generateOptimizedStopsExcelData, generateRouteSummaryExcelData,
  generateEditableStopsExcelData, generateTripsExcelData,
  calculateBags, computeFuel, capacityFromTons,
  splitAllRoutesIntoTrips, buildTripSummaries, splitByVehicleCount,
  parseDMSCoordinate,
  type GroupInput, type TripConfig, type TripSummary, DEFAULT_TRIP_CONFIG
} from "../bulk-delivery-engine";

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function computeDriverScore(trip: any): { score: number; dropScore: number; timeScore: number; capacityScore: number; qualityScore: number } {
  const dropScore = trip.plannedDropPoints > 0
    ? (trip.completedDropPoints / trip.plannedDropPoints) * 40 : 0;
  const capacityScore = trip.capacityBags > 0
    ? Math.min(trip.bagsLoaded / trip.capacityBags, 1) * 30 : 0;
  const qualityScore = trip.plannedDropPoints > 0
    ? (trip.completedDropPoints / trip.plannedDropPoints) * 30 : 0;
  const timeScore = 0;
  const score = Math.min(100, dropScore + capacityScore + qualityScore);
  return {
    score: Math.round(score * 100) / 100,
    dropScore: Math.round(dropScore * 100) / 100,
    timeScore: 0,
    capacityScore: Math.round(capacityScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
  };
}


export async function registerTransportRoutes(app: Express): Promise<void> {
  app.get("/api/admin/transport/hubs", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const hubs = await db.select().from(transportHubs).orderBy(asc(transportHubs.hubName));
      res.json(hubs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/hubs", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { hubName, location, lat, lng, segments, status } = req.body;
      const [hub] = await db.insert(transportHubs).values({
        hubName, location,
        lat: lat || null, lng: lng || null,
        segments: segments || ['Fresh Milk', 'Products', 'Ice Cream'],
        status: status || 'active',
      }).returning();
      res.json(hub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/transport/hubs/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [hub] = await db.update(transportHubs)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(transportHubs.id, id))
        .returning();
      res.json(hub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/transport/hubs/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(transportHubs).where(eq(transportHubs.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/trips", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const { date, hubId, segment, status, shift, search } = req.query;
      let query = db.select().from(tripSheets);
      const conditions: any[] = [];
      if (date) conditions.push(eq(tripSheets.date, date as string));
      if (hubId) conditions.push(eq(tripSheets.hubId, parseInt(hubId as string)));
      if (segment && segment !== 'All') conditions.push(eq(tripSheets.segment, segment as string));
      if (status && status !== 'All') conditions.push(eq(tripSheets.status, status as string));
      if (shift && shift !== 'All') conditions.push(eq(tripSheets.shift, shift as string));
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      const trips = await (query as any).orderBy(desc(tripSheets.createdAt));
      let result = trips;
      if (search) {
        const q = (search as string).toLowerCase();
        result = trips.filter((t: any) => {
          const hay = [t.tripId, t.routeName, t.vehicleNo, t.driverName, t.segment, t.unionName].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/trips", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const data = req.body;
      const existing = await db.select().from(tripSheets).where(eq(tripSheets.date, data.date));
      const seq = existing.length + 1;
      const tripId = generateTripId(data.hubName || 'HUB', data.date, seq);
      const tonnage = data.bagsLoaded ? (data.bagsLoaded * 13 / 1000) : 0;
      const [trip] = await db.insert(tripSheets).values({
        ...data,
        tripId,
        tonnageLoaded: String(tonnage),
        completedDropPoints: data.completedDropPoints || 0,
      }).returning();
      res.json(trip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/transport/trips/:id", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = { ...req.body, updatedAt: new Date() };
      if (data.bagsLoaded !== undefined) {
        data.tonnageLoaded = String(data.bagsLoaded * 13 / 1000);
      }
      const [trip] = await db.update(tripSheets).set(data).where(eq(tripSheets.id, id)).returning();
      res.json(trip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/transport/trips/:id/status", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status: newStatus } = req.body;
      const updateData: any = { status: newStatus, updatedAt: new Date() };
      if (newStatus === 'Completed') {
        updateData.actualEndTime = new Date().toTimeString().slice(0, 5);
      }
      const [trip] = await db.update(tripSheets).set(updateData).where(eq(tripSheets.id, id)).returning();

      if (newStatus === 'Completed' && trip.driverName) {
        const scores = computeDriverScore(trip);
        await db.insert(driverPerformance).values({
          driverName: trip.driverName,
          driverPhone: trip.driverPhone,
          tripId: trip.id,
          tripCode: trip.tripId,
          score: String(scores.score),
          dropScore: String(scores.dropScore),
          timeScore: String(scores.timeScore),
          capacityScore: String(scores.capacityScore),
          qualityScore: String(scores.qualityScore),
        });
        await db.update(tripSheets)
          .set({ performanceScore: String(scores.score) })
          .where(eq(tripSheets.id, id));
      }
      res.json(trip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/trips/:tripId/manifest", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const manifests = await db.select().from(loadManifests).where(eq(loadManifests.tripId, tripId));
      res.json(manifests);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/trips/:tripId/manifest", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const [manifest] = await db.insert(loadManifests).values({
        tripId,
        ...req.body,
      }).returning();
      res.json(manifest);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/trips/:tripId/points", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const points = await db.select().from(transportRoutePoints)
        .where(eq(transportRoutePoints.tripId, tripId))
        .orderBy(asc(transportRoutePoints.sequenceNo));
      res.json(points);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/trips/:tripId/points", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const [point] = await db.insert(transportRoutePoints).values({
        tripId,
        ...req.body,
      }).returning();
      res.json(point);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/transport/route-points/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [point] = await db.update(transportRoutePoints)
        .set(req.body)
        .where(eq(transportRoutePoints.id, id))
        .returning();
      res.json(point);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/driver-performance", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const all = await db.select().from(driverPerformance).orderBy(desc(driverPerformance.createdAt));
      const grouped = new Map<string, { driverName: string; driverPhone: string | null; totalTrips: number; avgScore: number; scores: number[] }>();
      for (const dp of all) {
        const key = dp.driverName;
        if (!grouped.has(key)) {
          grouped.set(key, { driverName: dp.driverName, driverPhone: dp.driverPhone, totalTrips: 0, avgScore: 0, scores: [] });
        }
        const g = grouped.get(key)!;
        g.totalTrips++;
        g.scores.push(Number(dp.score));
      }
      const rankings = Array.from(grouped.values()).map(g => ({
        driverName: g.driverName,
        driverPhone: g.driverPhone,
        totalTrips: g.totalTrips,
        avgScore: Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 100) / 100,
        recentScores: g.scores.slice(0, 10),
      })).sort((a, b) => b.avgScore - a.avgScore);
      res.json({ rankings, records: all });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/dashboard", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { date } = req.query;
      let conditions: any[] = [];
      if (date) conditions.push(eq(tripSheets.date, date as string));
      let query = db.select().from(tripSheets);
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      const trips = await query;

      const totalTrips = trips.length;
      const inProgress = trips.filter(t => t.status === 'In-Progress').length;
      const completed = trips.filter(t => t.status === 'Completed').length;
      const delayed = trips.filter(t => t.status === 'Delayed').length;
      const planned = trips.filter(t => t.status === 'Planned').length;

      const totalDropsPlanned = trips.reduce((s, t) => s + (t.plannedDropPoints || 0), 0);
      const totalDropsDone = trips.reduce((s, t) => s + (t.completedDropPoints || 0), 0);
      const dropSuccess = totalDropsPlanned ? Math.round((totalDropsDone / totalDropsPlanned) * 10000) / 100 : 0;

      const totalBagsLoaded = trips.reduce((s, t) => s + (t.bagsLoaded || 0), 0);
      const totalCapacity = trips.reduce((s, t) => s + (t.capacityBags || 0), 0);
      const capacityUtil = totalCapacity ? Math.round((totalBagsLoaded / totalCapacity) * 10000) / 100 : 0;

      const totalTonnage = trips.reduce((s, t) => s + Number(t.tonnageLoaded || 0), 0);

      const segments = ['Fresh Milk', 'Products', 'Ice Cream'];
      const segmentData = segments.map(seg => {
        const segTrips = trips.filter(t => t.segment === seg);
        const bags = segTrips.reduce((a, t) => a + (t.bagsLoaded || 0), 0);
        const pBags = segTrips.reduce((a, t) => a + (t.bagsPlanned || 0), 0);
        const dp = segTrips.reduce((a, t) => a + (t.plannedDropPoints || 0), 0);
        const dd = segTrips.reduce((a, t) => a + (t.completedDropPoints || 0), 0);
        return { segment: seg, loadedBags: bags, plannedBags: pBags, dropSuccess: dp ? Math.round((dd / dp) * 100) : 0, trips: segTrips.length };
      });

      const statusData = [
        { name: 'Planned', value: planned },
        { name: 'In-Progress', value: inProgress },
        { name: 'Completed', value: completed },
        { name: 'Delayed', value: delayed },
      ];

      res.json({
        totalTrips, inProgress, completed, delayed, planned,
        dropSuccess, capacityUtil,
        totalBagsLoaded, totalTonnage: Math.round(totalTonnage * 1000) / 1000,
        segmentData, statusData,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== ROUTE OPTIMIZATION PIPELINE API ====================

  const DEPOT_LAT = 13.111401;
  const DEPOT_LNG = 80.174373;
  const CHENNAI_BOUNDS = { minLat: 12.8, maxLat: 13.25, minLng: 80.0, maxLng: 80.35 };
  const VEHICLE_MAX_BAGS = 115;
  const VEHICLE_MAX_POCKETS = 5750;
  const VEHICLE_MAX_WEIGHT_KG = 1500;
  const POCKETS_PER_BAG = 50;
  const BAG_WEIGHT_KG = 13;

  function dmsToDecimal(dmsStr: string): number {
    const match = dmsStr.match(/(\d+)[°](\d+)'([\d.]+)"?\s*([NSEW])?/);
    if (match) {
      let dec = parseInt(match[1]) + parseInt(match[2]) / 60 + parseFloat(match[3]) / 3600;
      if (match[4] === 'S' || match[4] === 'W') dec = -dec;
      return dec;
    }
    return parseFloat(dmsStr.replace(/[°NSEW]/g, ''));
  }

  const SEED_STOPS = [
    { zone: 1, division: "5", locationType: "Division Office", locationName: "Division Office Zone 1", address: "NO. 1 RAMAKRISHNA NAGAR, 2ND ROAD CH - 19", lat: 13.112, lng: 80.21852, totalPockets: 565, routeGroup: 1 },
    { zone: 1, division: "11", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard TH Road", address: "TH road, Chennai", lat: 13.1566, lng: 80.3022, totalPockets: 565, routeGroup: 1 },
    { zone: 2, division: "18", locationType: "Division Office", locationName: "Division Office Manali CPCL", address: "Nedunchezian St, CPCL layout(Near CPCL Polytechnic) Manali, Chennai - 68", lat: 13.175544, lng: 80.256157, totalPockets: 379, routeGroup: 1 },
    { zone: 2, division: "20", locationType: "Division Office", locationName: "Division Office Manali MGR", address: "New MGR street, Manali, Chennai - 68", lat: 13.168441, lng: 80.253099, totalPockets: 378, routeGroup: 1 },
    { zone: 3, division: "25", locationType: "Madhavaram", locationName: "Madhavaram Local Depot", address: "Madhavaram Local Depot & Division Office MRH Road Chennai - 600060", lat: 13.1525556, lng: 80.2284722, totalPockets: 677, routeGroup: 1 },
    { zone: 3, division: "25", locationType: "Madhavaram CMDA", locationName: "Madhavaram CMDA", address: "No.23 Grand Northern Trunk RD, J Garden, Madhavaram, Chennai - 600110", lat: 13.1434444, lng: 80.2228333, totalPockets: 677, routeGroup: 1 },
    { zone: 4, division: "42", locationType: "Zonal Office 4", locationName: "Zonal Office 4 Tondiarpet", address: "No. 266, V.H Road, Old Washermenpet, Tondiarpet, Chennai 21", lat: 13.120844, lng: 80.286857, totalPockets: 1423, routeGroup: 1 },
    { zone: 4, division: "44", locationType: "Lorry Depot", locationName: "Lorry Depot Perambur", address: "No. 107, BB Road, Perambur, Chennai - 39", lat: 13.1124167, lng: 80.2525833, totalPockets: 1422, routeGroup: 1 },
    { zone: 5, division: "55", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Mint Street", address: "mint street, near angalamman kovil (Mint Flyover)", lat: 13.1055, lng: 80.280222, totalPockets: 1494, routeGroup: 1 },
    { zone: 5, division: "61", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Egmore", address: "Block-4, Veerasamy street, Egmore, Chennai 600 008", lat: 13.076254, lng: 80.257097, totalPockets: 1494, routeGroup: 1 },
    { zone: 6, division: "68", locationType: "Division Office", locationName: "Division Office Jawahar Nagar", address: "Ward Office, Jawahar Nagar 3rd Circular Road", lat: 13.113966, lng: 80.230332, totalPockets: 1209, routeGroup: 1 },
    { zone: 6, division: "73", locationType: "Division Office", locationName: "Division Office Otteri", address: "No.72, New Ferrance Road, otteri, Chennai-12", lat: 13.098819, lng: 80.257725, totalPockets: 1208, routeGroup: 1 },
    { zone: 9, division: "120", locationType: "Lorry Station", locationName: "Lorry Station Royapettah", address: "Lloyds Colony, No 6, Saivamuthiah Street, Lloyds Colony, Royapettah -600014", lat: 13.050349, lng: 80.273021, totalPockets: 1378, routeGroup: 1 },
    { zone: 9, division: "125", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Mylapore", address: "TS 09 Bov point Karaneeswarar pakoda street Mylapore", lat: 13.040784, lng: 80.275214, totalPockets: 1378, routeGroup: 1 },
    { zone: 7, division: "86B", locationType: "Near Zonal Office", locationName: "Near Zonal Office Vanagaram", address: "Vanagaram main road, ambattur, Near Ambattur Burial Ground", lat: 13.103399, lng: 80.150272, totalPockets: 1112, routeGroup: 2 },
    { zone: 7, division: "89", locationType: "Division Office", locationName: "Anna Nagar West Padi", address: "Officers colony main road, anna nagar west extn, padi", lat: 13.087366, lng: 80.194299, totalPockets: 1112, routeGroup: 2 },
    { zone: 8, division: "100", locationType: "Division Office", locationName: "Division Office Kilpauk", address: "Temple Street, Kilpauk (Division Office)", lat: 13.0832149, lng: 80.2379864, totalPockets: 1390, routeGroup: 2 },
    { zone: 8, division: "103", locationType: "Division Office", locationName: "Division Office Anna Nagar", address: "3rd Main Road, Anna nagar (Division Office)", lat: 13.085, lng: 80.210, totalPockets: 1389, routeGroup: 2 },
    { zone: 10, division: "127", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Koyambedu", address: "KALIYAMMAN KOVIL STREET KOYAMBEDU CHENNAI 600107", lat: 13.065679, lng: 80.198749, totalPockets: 1018, routeGroup: 2 },
    { zone: 10, division: "132", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Arcot Road", address: "ARCOT ROAD BHARAT PETROL BUNK KAMARAJ COLONY, CHENNAI 600024", lat: 13.052475, lng: 80.22169, totalPockets: 1018, routeGroup: 2 },
    { zone: 11, division: "145", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Nerkundram", address: "Ponnthamallee High Road, Nerkundram, Ch-107", lat: 13.072556, lng: 80.189056, totalPockets: 646, routeGroup: 2 },
    { zone: 11, division: "151", locationType: "Bov Parking Yard", locationName: "Bov Parking Yard Valasaravakkam", address: "Arcot Road, Valasavakkam, Chennai-87", lat: 13.038611, lng: 80.167472, totalPockets: 646, routeGroup: 2 },
    { zone: 12, division: "158", locationType: "Division Office", locationName: "Ward Office Nandambakkam", address: "WARD OFFICE, Chennai Trade Center, Mount Poonamallee Road, Bajanai koil street, Nandambakkam, Chennai - 600089", lat: 13.016417, lng: 80.191722, totalPockets: 551, routeGroup: 2 },
    { zone: 12, division: "160", locationType: "Division Office", locationName: "Ward Office Alandur", address: "WARD OFFICE No: 4, Bazaar Building, New street, Alandur", lat: 13.004025, lng: 80.202575, totalPockets: 551, routeGroup: 3 },
    { zone: 13, division: "169", locationType: "Lorry Station", locationName: "Saidapet Lorry Station", address: "SAIDAPET LORRY STATION", lat: 13.020465, lng: 80.225526, totalPockets: 1054, routeGroup: 3 },
    { zone: 13, division: "177", locationType: "SEVA NAGAR", locationName: "Seva Nagar", address: "SEVA NAGAR", lat: 12.986359, lng: 80.230024, totalPockets: 1054, routeGroup: 3 },
    { zone: 14, division: "182", locationType: "Bov Parking Yard", locationName: "Perungudi Bov Point", address: "PERUNGUDI BOV POINT", lat: 12.964912, lng: 80.241341, totalPockets: 704, routeGroup: 3 },
    { zone: 14, division: "190", locationType: "Division Office", locationName: "Division Office Pallikaranai", address: "VELACHERY-TAMBARAM MAIN ROAD, PALLIKARANI, CHENNAI", lat: 12.9310202, lng: 80.2028141, totalPockets: 703, routeGroup: 3 },
    { zone: 15, division: "194", locationType: "Division Office", locationName: "Division Office Injambakkam", address: "VOC Street, East Coast Road, Injampakkam", lat: 12.920073, lng: 80.251789, totalPockets: 1133, routeGroup: 3 },
    { zone: 15, division: "199", locationType: "Division Office", locationName: "Division Office Sholinganallur", address: "Nedunchezhian street, Sholinganallur", lat: 12.892547, lng: 80.22942, totalPockets: 1133, routeGroup: 3 },
  ];

  app.get("/api/admin/transport/stops", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const stops = await db.select().from(butterMilkStops).orderBy(asc(butterMilkStops.zone), asc(butterMilkStops.division));
      res.json(stops);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/seed-stops", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const existing = await db.select().from(butterMilkStops);
      if (existing.length > 0) {
        return res.json({ message: "Stops already seeded", count: existing.length });
      }
      const rows = SEED_STOPS.map(s => {
        const bags = Math.ceil(s.totalPockets / POCKETS_PER_BAG);
        const weightKg = bags * BAG_WEIGHT_KG;
        return {
          zone: s.zone,
          division: s.division,
          locationType: s.locationType,
          locationName: s.locationName,
          address: s.address,
          lat: String(s.lat),
          lng: String(s.lng),
          originalLat: String(s.lat),
          originalLng: String(s.lng),
          totalPockets: s.totalPockets,
          bags,
          weightKg: String(weightKg),
          routeGroup: s.routeGroup,
          pinStatus: 'valid' as const,
          isActive: true,
        };
      });
      await db.insert(butterMilkStops).values(rows);
      res.json({ message: "Seeded successfully", count: rows.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/transport/stops/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const allowed = ['lat', 'lng', 'totalPockets', 'pinStatus', 'geoCluster', 'isActive', 'locationName', 'address'];
      const updates: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if ((key === 'lat' || key === 'lng') && isNaN(Number(req.body[key]))) {
            return res.status(400).json({ error: `${key} must be a valid number` });
          }
          updates[key] = req.body[key];
        }
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
      const [stop] = await db.update(butterMilkStops).set(updates).where(eq(butterMilkStops.id, id)).returning();
      res.json(stop);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/validate-pins", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const stops = await db.select().from(butterMilkStops);
      const results: { id: number; pinStatus: string; reason?: string }[] = [];
      for (const stop of stops) {
        const lat = Number(stop.lat);
        const lng = Number(stop.lng);
        let status = 'valid';
        let reason = '';
        if (lat < CHENNAI_BOUNDS.minLat || lat > CHENNAI_BOUNDS.maxLat || lng < CHENNAI_BOUNDS.minLng || lng > CHENNAI_BOUNDS.maxLng) {
          status = 'error';
          reason = `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) outside Chennai bounds`;
        }
        if (lat === 0 || lng === 0) {
          status = 'error';
          reason = 'Missing coordinates';
        }
        await db.update(butterMilkStops).set({ pinStatus: status }).where(eq(butterMilkStops.id, stop.id));
        results.push({ id: stop.id, pinStatus: status, reason });
      }
      const errors = results.filter(r => r.pinStatus === 'error');
      res.json({ total: stops.length, valid: stops.length - errors.length, errors: errors.length, details: results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/compute-demand", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const stops = await db.select().from(butterMilkStops);
      let totalPockets = 0, totalBags = 0, totalWeightKg = 0;
      for (const stop of stops) {
        const bags = Math.ceil(stop.totalPockets / POCKETS_PER_BAG);
        const weightKg = bags * BAG_WEIGHT_KG;
        await db.update(butterMilkStops).set({ bags, weightKg: String(weightKg) }).where(eq(butterMilkStops.id, stop.id));
        totalPockets += stop.totalPockets;
        totalBags += bags;
        totalWeightKg += weightKg;
      }
      const minVehicles = Math.ceil(totalBags / VEHICLE_MAX_BAGS);
      res.json({
        totalStops: stops.length,
        totalPockets, totalBags, totalWeightKg,
        minVehicles,
        perStop: stops.map(s => ({
          id: s.id, locationName: s.locationName,
          pockets: s.totalPockets,
          bags: Math.ceil(s.totalPockets / POCKETS_PER_BAG),
          weightKg: Math.ceil(s.totalPockets / POCKETS_PER_BAG) * BAG_WEIGHT_KG,
        })),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/cluster", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const allStops = await db.select().from(butterMilkStops);
      const stops = allStops.filter(s => s.isActive && s.pinStatus !== 'error' && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
      if (stops.length === 0) return res.json({ clusters: [], totalVehicles: 0 });

      const points = stops.map(s => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
      const sorted = [...points].sort((a, b) => a.lat - b.lat);
      const K = 3;
      let centroids = [
        { lat: sorted[0].lat, lng: sorted[0].lng },
        { lat: sorted[Math.floor(sorted.length / 2)].lat, lng: sorted[Math.floor(sorted.length / 2)].lng },
        { lat: sorted[sorted.length - 1].lat, lng: sorted[sorted.length - 1].lng },
      ];

      let assignments: number[] = new Array(points.length).fill(0);
      for (let iter = 0; iter < 20; iter++) {
        let changed = false;
        for (let i = 0; i < points.length; i++) {
          let minDist = Infinity;
          let best = 0;
          for (let c = 0; c < K; c++) {
            const d = Math.sqrt(Math.pow(points[i].lat - centroids[c].lat, 2) + Math.pow(points[i].lng - centroids[c].lng, 2));
            if (d < minDist) { minDist = d; best = c; }
          }
          if (assignments[i] !== best) { assignments[i] = best; changed = true; }
        }
        if (!changed) break;
        for (let c = 0; c < K; c++) {
          const members = points.filter((_, i) => assignments[i] === c);
          if (members.length > 0) {
            centroids[c] = {
              lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
              lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
            };
          }
        }
      }

      const clusterLabels = ['A', 'B', 'C'];
      const centroidsByLat = centroids.map((c, i) => ({ ...c, origIdx: i })).sort((a, b) => b.lat - a.lat);
      const labelMap: Record<number, string> = {};
      centroidsByLat.forEach((c, i) => { labelMap[c.origIdx] = clusterLabels[i]; });

      for (let i = 0; i < points.length; i++) {
        const label = labelMap[assignments[i]];
        await db.update(butterMilkStops).set({ geoCluster: label }).where(eq(butterMilkStops.id, points[i].id));
      }

      const updatedStops = await db.select().from(butterMilkStops).orderBy(asc(butterMilkStops.zone));
      const clusters = clusterLabels.map(label => {
        const members = updatedStops.filter(s => s.geoCluster === label);
        const totalPockets = members.reduce((s, m) => s + m.totalPockets, 0);
        const totalBags = members.reduce((s, m) => s + m.bags, 0);
        const totalWeightKg = members.reduce((s, m) => s + Number(m.weightKg), 0);
        return {
          cluster: label,
          stopCount: members.length,
          totalPockets, totalBags, totalWeightKg: Math.round(totalWeightKg),
          vehiclesNeeded: Math.ceil(totalBags / VEHICLE_MAX_BAGS),
          stops: members,
        };
      });

      res.json({ clusters, totalVehicles: clusters.reduce((s, c) => s + c.vehiclesNeeded, 0) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/split-trips", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const allStops = await db.select().from(butterMilkStops).orderBy(asc(butterMilkStops.geoCluster));
      const stops = allStops.filter(s => s.isActive && s.pinStatus !== 'error' && s.geoCluster);

      const iceCreamStops = stops.filter(s => (s.segment || '').toLowerCase().includes('ice cream'));
      const nonIceCreamStops = stops.filter(s => !(s.segment || '').toLowerCase().includes('ice cream'));

      function buildTripsFromStops(stopsIn: typeof stops, segmentLabel: string) {
        const clusters = new Map<string, typeof stopsIn>();
        for (const stop of stopsIn) {
          const c = stop.geoCluster || 'X';
          if (!clusters.has(c)) clusters.set(c, []);
          clusters.get(c)!.push(stop);
        }
        const result: any[] = [];
        for (const [cluster, clusterStops] of clusters) {
          const sorted = clusterStops.map(s => ({
            ...s,
            angle: Math.atan2(Number(s.lng) - DEPOT_LNG, Number(s.lat) - DEPOT_LAT),
          })).sort((a, b) => a.angle - b.angle);

          let currentTrip: typeof sorted = [];
          let tPockets = 0, tBags = 0, tWeight = 0;

          for (const stop of sorted) {
            const sBags = stop.bags;
            const sWeight = Number(stop.weightKg);
            const sPockets = stop.totalPockets;

            if (currentTrip.length > 0 && (tPockets + sPockets > VEHICLE_MAX_POCKETS || tBags + sBags > VEHICLE_MAX_BAGS || tWeight + sWeight > VEHICLE_MAX_WEIGHT_KG)) {
              result.push({ cluster, segmentLabel, stops: currentTrip, totalPockets: tPockets, totalBags: tBags, totalWeightKg: Math.round(tWeight), capacityPct: Math.round((tBags / VEHICLE_MAX_BAGS) * 100) });
              currentTrip = []; tPockets = 0; tBags = 0; tWeight = 0;
            }
            currentTrip.push(stop);
            tPockets += sPockets; tBags += sBags; tWeight += sWeight;
          }
          if (currentTrip.length > 0) {
            result.push({ cluster, segmentLabel, stops: currentTrip, totalPockets: tPockets, totalBags: tBags, totalWeightKg: Math.round(tWeight), capacityPct: Math.round((tBags / VEHICLE_MAX_BAGS) * 100) });
          }
        }
        return result;
      }

      const nonIceTrips = buildTripsFromStops(nonIceCreamStops, '');
      const iceTrips = buildTripsFromStops(iceCreamStops, 'Ice Cream');

      const trips: any[] = [];
      let tripNum = 1;
      for (const t of nonIceTrips) {
        trips.push({ ...t, tripLabel: `Trip ${tripNum} (Cluster ${t.cluster})` });
        tripNum++;
      }
      for (const t of iceTrips) {
        trips.push({ ...t, tripLabel: `Trip ${tripNum} (Cluster ${t.cluster}, Ice Cream)`, temperatureControlled: true });
        tripNum++;
      }

      res.json({
        totalTrips: trips.length,
        totalVehicles: trips.length,
        trips,
        temperatureSplit: iceCreamStops.length > 0,
        iceCreamTrips: iceTrips.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/transport/optimize-trips", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { trips: inputTrips } = req.body;
      if (!inputTrips || !Array.isArray(inputTrips)) {
        return res.status(400).json({ error: "trips array required" });
      }

      const optimizedTrips = inputTrips.map((trip: any) => {
        const stops = trip.stops.map((s: any) => ({
          ...s,
          lat: Number(s.lat),
          lng: Number(s.lng),
        }));

        if (stops.length <= 1) {
          const dist = stops.length === 1 ? calculateDistance(DEPOT_LAT, DEPOT_LNG, stops[0].lat, stops[0].lng) * 2 : 0;
          return {
            ...trip,
            optimizedStops: stops.map((s: any, i: number) => ({ ...s, sequence: i + 1, distFromPrev: dist / 2, cumulativeDist: dist / 2, eta: `${Math.round(dist * 1.5)} min` })),
            totalDistKm: Math.round(dist * 10) / 10,
            totalTimeMin: Math.round(dist * 3),
            googleMapsUrl: buildGoogleMapsUrl(stops),
          };
        }

        // Nearest neighbor
        const visited = new Set<number>();
        const ordered: typeof stops = [];
        let currentLat = DEPOT_LAT, currentLng = DEPOT_LNG;

        for (let i = 0; i < stops.length; i++) {
          let minDist = Infinity, closest = -1;
          for (let j = 0; j < stops.length; j++) {
            if (visited.has(j)) continue;
            const d = calculateDistance(currentLat, currentLng, stops[j].lat, stops[j].lng);
            if (d < minDist) { minDist = d; closest = j; }
          }
          visited.add(closest);
          ordered.push(stops[closest]);
          currentLat = stops[closest].lat;
          currentLng = stops[closest].lng;
        }

        // 2-opt improvement
        if (ordered.length > 3) {
          let improved = true;
          let iterations = 0;
          while (improved && iterations < 100) {
            improved = false;
            iterations++;
            for (let i = 0; i < ordered.length - 1; i++) {
              for (let j = i + 2; j < ordered.length; j++) {
                const prevI = i === 0 ? { lat: DEPOT_LAT, lng: DEPOT_LNG } : ordered[i - 1];
                const currDist = calculateDistance(prevI.lat, prevI.lng, ordered[i].lat, ordered[i].lng) +
                  calculateDistance(ordered[j].lat, ordered[j].lng, j + 1 < ordered.length ? ordered[j + 1].lat : DEPOT_LAT, j + 1 < ordered.length ? ordered[j + 1].lng : DEPOT_LNG);
                const newDist = calculateDistance(prevI.lat, prevI.lng, ordered[j].lat, ordered[j].lng) +
                  calculateDistance(ordered[i].lat, ordered[i].lng, j + 1 < ordered.length ? ordered[j + 1].lat : DEPOT_LAT, j + 1 < ordered.length ? ordered[j + 1].lng : DEPOT_LNG);
                if (newDist < currDist - 0.001) {
                  const segment = ordered.slice(i, j + 1).reverse();
                  ordered.splice(i, j - i + 1, ...segment);
                  improved = true;
                }
              }
            }
          }
        }

        let totalDist = 0;
        let prevLat = DEPOT_LAT, prevLng = DEPOT_LNG;
        const optimizedStops = ordered.map((s: any, idx: number) => {
          const dist = calculateDistance(prevLat, prevLng, s.lat, s.lng);
          totalDist += dist;
          prevLat = s.lat; prevLng = s.lng;
          return {
            ...s,
            sequence: idx + 1,
            distFromPrev: Math.round(dist * 10) / 10,
            cumulativeDist: Math.round(totalDist * 10) / 10,
            eta: `${Math.round(totalDist * 3)} min`,
          };
        });

        const returnDist = calculateDistance(prevLat, prevLng, DEPOT_LAT, DEPOT_LNG);
        totalDist += returnDist;

        return {
          ...trip,
          optimizedStops,
          totalDistKm: Math.round(totalDist * 10) / 10,
          totalTimeMin: Math.round(totalDist * 3),
          googleMapsUrl: buildGoogleMapsUrl(ordered),
        };
      });

      const totalKm = optimizedTrips.reduce((s: number, t: any) => s + t.totalDistKm, 0);
      const totalTime = optimizedTrips.reduce((s: number, t: any) => s + t.totalTimeMin, 0);

      res.json({
        totalTrips: optimizedTrips.length,
        totalKm: Math.round(totalKm * 10) / 10,
        totalTimeMin: totalTime,
        trips: optimizedTrips,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== BULK STOPS IMPORT (T003) ====================

  app.post("/api/admin/transport/stops/bulk", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { stops: stopsData } = req.body;
      if (!Array.isArray(stopsData) || stopsData.length === 0) {
        return res.status(400).json({ error: "Provide an array of stops" });
      }
      const POCKETS_PER_BAG_LOCAL = 50;
      const BAG_WEIGHT_KG_LOCAL = 13;
      const rows = stopsData.map((s: any) => {
        const pockets = parseInt(s.totalPockets) || 0;
        const bags = Math.ceil(pockets / POCKETS_PER_BAG_LOCAL);
        const weightKg = bags * BAG_WEIGHT_KG_LOCAL;
        return {
          zone: parseInt(s.zone) || 0,
          division: String(s.division || ""),
          locationType: s.locationType || "Delivery Point",
          locationName: String(s.locationName || ""),
          address: String(s.address || ""),
          lat: String(s.lat || "0"),
          lng: String(s.lng || "0"),
          originalLat: String(s.lat || "0"),
          originalLng: String(s.lng || "0"),
          totalPockets: pockets,
          bags,
          weightKg: String(weightKg),
          routeGroup: parseInt(s.routeGroup) || 1,
          pinStatus: 'pending' as const,
          isActive: true,
        };
      });
      await db.insert(butterMilkStops).values(rows);
      res.json({ message: "Imported successfully", count: rows.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== DELIVERY JOBS API (T007) ====================

  function generateDeliveryJobId(): string {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}` : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`;
    const seq = Date.now().toString().slice(-6);
    return `DJ/${fy}/${seq}`;
  }

  function validateDeliveryJob(job: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (job.sourceType === "bulk_invoice") {
      if (!job.deliveryLat || !job.deliveryLng || job.deliveryLat === "0" || job.deliveryLng === "0") {
        errors.push("Missing delivery coordinates (lat/lng)");
      }
      if (job.ewayBillRequired && !job.ewayBillGenerated) {
        errors.push("E-way bill required but not generated (amount >= ₹50,000)");
      }
      if (!job.paymentConfirmed) {
        errors.push("Payment mode not confirmed");
      }
    }
    return { valid: errors.length === 0, errors };
  }

  app.get("/api/delivery-jobs/:merchantId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { status, dispatchType, segment, deliveryType, dateFrom, dateTo } = req.query;
      const allIds = merchantId === 'federation' ? [] : getAllIdsForMerchant(merchantId);
      let conditions: any[] = merchantId === 'federation' ? [] : [inArray(deliveryJobs.merchantId, allIds)];
      if (status) conditions.push(eq(deliveryJobs.status, status as string));
      if (dispatchType) conditions.push(eq(deliveryJobs.dispatchType, dispatchType as string));
      if (segment) conditions.push(eq(deliveryJobs.segment, segment as string));
      if (deliveryType) conditions.push(eq(deliveryJobs.deliveryType, deliveryType as string));
      const jobs = conditions.length > 0
        ? await db.select().from(deliveryJobs).where(and(...conditions)).orderBy(desc(deliveryJobs.createdAt))
        : await db.select().from(deliveryJobs).orderBy(desc(deliveryJobs.createdAt));
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/delivery-jobs/ready-for-trip/:merchantId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { deliveryType } = req.query;
      const allIds = getAllIdsForMerchant(merchantId);
      let conditions: any[] = [eq(deliveryJobs.status, "ready_for_trip")];
      if (merchantId !== 'federation') conditions.push(inArray(deliveryJobs.merchantId, allIds));
      if (deliveryType) conditions.push(eq(deliveryJobs.deliveryType, deliveryType as string));
      const jobs = await db.select().from(deliveryJobs).where(and(...conditions)).orderBy(desc(deliveryJobs.createdAt));
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/delivery-jobs/exceptions/:merchantId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { deliveryType } = req.query;
      const allIds = getAllIdsForMerchant(merchantId);
      let conditions: any[] = [eq(deliveryJobs.status, "validation_failed")];
      if (merchantId !== 'federation') conditions.push(inArray(deliveryJobs.merchantId, allIds));
      if (deliveryType) conditions.push(eq(deliveryJobs.deliveryType, deliveryType as string));
      const jobs = await db.select().from(deliveryJobs).where(and(...conditions)).orderBy(desc(deliveryJobs.createdAt));
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/delivery-jobs/from-order/:orderId", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) return res.status(404).json({ error: "Order not found" });

      const existing = await db.select().from(deliveryJobs)
        .where(and(eq(deliveryJobs.sourceType, "order"), eq(deliveryJobs.sourceId, orderId)));
      if (existing.length > 0) {
        const existingJob = existing[0];
        const refreshUpdates: any = {};
        refreshUpdates.paymentConfirmed = (order as any).paymentStatus === "paid" || (order as any).paymentMethod === "cod" || (order as any).paymentMode === "cod";
        refreshUpdates.gstInvoiceGenerated = !!(order as any).invoiceNumber;
        refreshUpdates.customerName = (order as any).customerName || existingJob.customerName;
        await db.update(deliveryJobs).set(refreshUpdates).where(eq(deliveryJobs.id, existingJob.id));
        const [refreshedJob] = await db.select().from(deliveryJobs).where(eq(deliveryJobs.id, existingJob.id));
        const validation = validateDeliveryJob(refreshedJob);
        const statusUpdates: any = {
          status: validation.valid ? "ready_for_trip" : "validation_failed",
          validationErrors: validation.errors.length > 0 ? validation.errors : null,
        };
        const [updated] = await db.update(deliveryJobs).set(statusUpdates).where(eq(deliveryJobs.id, existingJob.id)).returning();
        return res.json({ message: "Delivery job already exists", job: updated });
      }

      const totalAmount = Number(order.total || 0);
      const ewayRequired = totalAmount >= 50000;
      const segment = (order as any).productSegment || "Products";

      const jobData: any = {
        jobId: generateDeliveryJobId(),
        sourceType: "order",
        sourceId: orderId,
        dispatchType: "REGULAR",
        deliveryType: "regular",
        merchantId: (order as any).merchantId || (order as any).restaurantId || "federation",
        segment,
        customerName: (order as any).customerName || (order as any).name || "",
        customerPhone: (order as any).customerPhone || (order as any).phone || "",
        deliveryAddress: (order as any).deliveryAddress || (order as any).address || "",
        deliveryLat: String((order as any).deliveryLat || "0"),
        deliveryLng: String((order as any).deliveryLng || "0"),
        totalAmount: String(totalAmount),
        totalBags: Math.ceil(totalAmount / 500),
        totalWeightKg: String(Math.ceil(totalAmount / 500) * 13),
        temperatureRequired: segment === "Ice Cream",
        ewayBillRequired: ewayRequired,
        gstInvoiceGenerated: !!(order as any).invoiceNumber,
        paymentConfirmed: !!(order as any).paymentMethod || (order as any).paymentStatus === "paid",
      };

      const validation = validateDeliveryJob(jobData);
      jobData.status = validation.valid ? "ready_for_trip" : "validation_failed";
      jobData.validationErrors = validation.errors.length > 0 ? validation.errors : null;

      const [job] = await db.insert(deliveryJobs).values(jobData).returning();
      res.json(job);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/delivery-jobs/from-bulk-invoice/:invoiceId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const [invoice] = await db.select().from(bulkInvoices).where(eq(bulkInvoices.id, invoiceId));
      if (!invoice) return res.status(404).json({ error: "Bulk invoice not found" });

      const existing = await db.select().from(deliveryJobs)
        .where(and(eq(deliveryJobs.sourceType, "bulk_invoice"), eq(deliveryJobs.sourceId, invoiceId)));
      if (existing.length > 0) return res.json({ message: "Delivery job already exists", job: existing[0] });

      const totalAmount = Number(invoice.totalAmount || 0);
      const ewayRequired = totalAmount >= 50000;
      const customerType = invoice.customerType || "corporate";
      let dispatchType = "BULK";
      if (customerType === "inter_union") dispatchType = "INTER_UNION";
      else if (customerType === "corporate" || customerType === "government") dispatchType = "CORPORATE";

      const segment = invoice.productSegment || "Products";

      const jobData: any = {
        jobId: generateDeliveryJobId(),
        sourceType: "bulk_invoice",
        sourceId: invoiceId,
        dispatchType,
        deliveryType: "bulk",
        merchantId: invoice.merchantId,
        segment,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone || "",
        deliveryAddress: invoice.deliveryAddress || invoice.customerAddress || "",
        deliveryLat: String(invoice.deliveryLat || "0"),
        deliveryLng: String(invoice.deliveryLng || "0"),
        totalAmount: String(totalAmount),
        totalBags: Math.ceil(totalAmount / 500),
        totalWeightKg: String(Math.ceil(totalAmount / 500) * 13),
        temperatureRequired: segment === "Ice Cream",
        ewayBillRequired: ewayRequired,
        ewayBillGenerated: !!invoice.ewayBillId,
        gstInvoiceGenerated: true,
        paymentConfirmed: true,
      };

      const validation = validateDeliveryJob(jobData);
      jobData.status = validation.valid ? "ready_for_trip" : "validation_failed";
      jobData.validationErrors = validation.errors.length > 0 ? validation.errors : null;

      const [job] = await db.insert(deliveryJobs).values(jobData).returning();
      res.json(job);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/delivery-jobs/:id/status", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const validStatuses = ['pending_validation', 'validation_failed', 'ready_for_trip', 'assigned', 'in_transit', 'delivered', 'failed'];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });
      const [job] = await db.update(deliveryJobs).set({ status }).where(eq(deliveryJobs.id, id)).returning();
      res.json(job);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/delivery-jobs/:id/assign-trip", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { tripId } = req.body;
      if (!tripId) return res.status(400).json({ error: "tripId required" });
      const [job] = await db.update(deliveryJobs).set({ tripId, status: "assigned" }).where(eq(deliveryJobs.id, id)).returning();
      res.json(job);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/delivery-jobs/:id/revalidate", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [job] = await db.select().from(deliveryJobs).where(eq(deliveryJobs.id, id));
      if (!job) return res.status(404).json({ error: "Job not found" });

      const refreshUpdates: any = {};
      if (job.sourceType === "order" && job.sourceId) {
        const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, job.sourceId));
        if (order) {
          refreshUpdates.paymentConfirmed = !!(order as any).paymentMethod || (order as any).paymentStatus === "paid";
          refreshUpdates.gstInvoiceGenerated = !!(order as any).invoiceNumber;
          refreshUpdates.customerName = (order as any).customerName || job.customerName;
        }
      }

      if (Object.keys(refreshUpdates).length > 0) {
        await db.update(deliveryJobs).set(refreshUpdates).where(eq(deliveryJobs.id, id));
      }

      const [refreshedJob] = await db.select().from(deliveryJobs).where(eq(deliveryJobs.id, id));
      const validation = validateDeliveryJob(refreshedJob);
      const updates: any = {
        status: validation.valid ? "ready_for_trip" : "validation_failed",
        validationErrors: validation.errors.length > 0 ? validation.errors : null,
      };
      const [updated] = await db.update(deliveryJobs).set(updates).where(eq(deliveryJobs.id, id)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/delivery-jobs/stats/:merchantId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { deliveryType: dtFilter } = req.query;
      const allIds = getAllIdsForMerchant(merchantId);
      let conditions: any[] = [];
      if (merchantId !== 'federation') conditions.push(inArray(deliveryJobs.merchantId, allIds));
      if (dtFilter) conditions.push(eq(deliveryJobs.deliveryType, dtFilter as string));
      const allJobs = conditions.length > 0
        ? await db.select().from(deliveryJobs).where(and(...conditions))
        : await db.select().from(deliveryJobs);
      const stats = {
        total: allJobs.length,
        pendingValidation: allJobs.filter(j => j.status === "pending_validation").length,
        validationFailed: allJobs.filter(j => j.status === "validation_failed").length,
        readyForTrip: allJobs.filter(j => j.status === "ready_for_trip").length,
        assigned: allJobs.filter(j => j.status === "assigned").length,
        inTransit: allJobs.filter(j => j.status === "in_transit").length,
        delivered: allJobs.filter(j => j.status === "delivered").length,
        failed: allJobs.filter(j => j.status === "failed").length,
        missingAddress: allJobs.filter(j => {
          const errors = j.validationErrors as string[] | null;
          return errors?.some(e => e.includes("coordinates"));
        }).length,
        missingEwayBill: allJobs.filter(j => {
          const errors = j.validationErrors as string[] | null;
          return errors?.some(e => e.includes("E-way bill"));
        }).length,
        missingPayment: allJobs.filter(j => {
          const errors = j.validationErrors as string[] | null;
          return errors?.some(e => e.includes("Payment"));
        }).length,
      };
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/delivery/performance/federation", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const allTrips = await db.select().from(tripSheets);
      const unionMap = new Map<string, { unionId: string; unionName: string; totalTrips: number; delivered: number; delayed: number; totalBags: number; onTimeDropsPlanned: number; onTimeDropsDone: number }>();

      for (const trip of allTrips) {
        const uid = trip.unionId || "unknown";
        const uname = trip.unionName || uid;
        if (!unionMap.has(uid)) {
          unionMap.set(uid, { unionId: uid, unionName: uname, totalTrips: 0, delivered: 0, delayed: 0, totalBags: 0, onTimeDropsPlanned: 0, onTimeDropsDone: 0 });
        }
        const entry = unionMap.get(uid)!;
        entry.totalTrips++;
        if (trip.status === "Completed") entry.delivered++;
        if (trip.status === "Delayed") entry.delayed++;
        entry.totalBags += trip.bagsLoaded || 0;
        entry.onTimeDropsPlanned += trip.plannedDropPoints || 0;
        entry.onTimeDropsDone += trip.completedDropPoints || 0;
      }

      const unions = Array.from(unionMap.values())
        .map(u => ({
          unionId: u.unionId,
          unionName: u.unionName,
          totalTrips: u.totalTrips,
          delivered: u.delivered,
          onTimePercent: u.onTimeDropsPlanned > 0 ? Math.round((u.onTimeDropsDone / u.onTimeDropsPlanned) * 100) : 0,
          delayed: u.delayed,
          totalBags: u.totalBags,
          rank: 0,
        }))
        .sort((a, b) => b.onTimePercent - a.onTimePercent || b.delivered - a.delivered);

      unions.forEach((u, i) => { u.rank = i + 1; });

      const totalTrips = unions.reduce((s, u) => s + u.totalTrips, 0);
      const totalDelivered = unions.reduce((s, u) => s + u.delivered, 0);
      const totalDelayed = unions.reduce((s, u) => s + u.delayed, 0);
      const totalBags = unions.reduce((s, u) => s + u.totalBags, 0);
      const totalPlanned = Array.from(unionMap.values()).reduce((s, u) => s + u.onTimeDropsPlanned, 0);
      const totalDone = Array.from(unionMap.values()).reduce((s, u) => s + u.onTimeDropsDone, 0);
      const fedOnTime = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

      res.json({
        unions,
        totals: {
          totalTrips,
          delivered: totalDelivered,
          onTimePercent: fedOnTime,
          delayed: totalDelayed,
          totalBags,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== DRIVER PERFORMANCE SCORING (T011) ====================

  app.post("/api/admin/transport/compute-score/:tripId", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.id, tripId));
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const planned = trip.plannedDropPoints || 1;
      const completed = trip.completedDropPoints || 0;
      const onTimePct = planned > 0 ? Math.min(100, (completed / planned) * 100) : 0;

      const actualDist = Number(trip.actualDistanceKm || 0);
      const optimizedDist = Number(trip.optimizedDistanceKm || 0);
      const routeEffPct = optimizedDist > 0 && actualDist > 0 ? Math.min(100, (optimizedDist / actualDist) * 100) : 100;

      const fuelUsed = Number(trip.fuelUsed || 0);
      let fuelScore = 50;
      if (fuelUsed > 0 && actualDist > 0) {
        const expectedFuel = actualDist * 0.08;
        const fuelRatio = expectedFuel / fuelUsed;
        fuelScore = Math.min(100, Math.max(0, fuelRatio * 100));
      }

      const feedbackScore = Number(trip.customerFeedbackScore || 4.0);
      const feedbackPct = (feedbackScore / 5) * 100;

      const compositeScore = Math.round(
        (onTimePct * 0.40) +
        (routeEffPct * 0.30) +
        (fuelScore * 0.15) +
        (feedbackPct * 0.15)
      );

      const [updated] = await db.update(tripSheets).set({
        performanceScore: String(compositeScore),
        onTimeDeliveryPct: String(Math.round(onTimePct)),
        routeEfficiencyPct: String(Math.round(routeEffPct)),
      }).where(eq(tripSheets.id, tripId)).returning();

      res.json({
        tripId: trip.tripId,
        driverName: trip.driverName,
        compositeScore,
        breakdown: {
          onTimeDelivery: { weight: "40%", value: Math.round(onTimePct), contribution: Math.round(onTimePct * 0.40) },
          routeEfficiency: { weight: "30%", value: Math.round(routeEffPct), contribution: Math.round(routeEffPct * 0.30) },
          fuelEfficiency: { weight: "15%", value: Math.round(fuelScore), contribution: Math.round(fuelScore * 0.15), fuelUsed: fuelUsed || "not recorded" },
          customerFeedback: { weight: "15%", value: feedbackPct, contribution: Math.round(feedbackPct * 0.15), rating: feedbackScore },
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== SSE LIVE TRACKING (T012) ====================

  const liveTrackingSubscribers = new Map<string, Set<any>>();

  app.get("/api/delivery/live-stream/:merchantId", requireAuth, async (req: AuthenticatedRequest, res) => {
    const { merchantId } = req.params;

    const scope = getUnionScope(req);
    if (!scope.isGlobalAdmin) {
      if (!scope.merchantId) {
        return res.status(403).json({ error: "Access denied: no union scope found for user" });
      }
      if (scope.merchantId !== merchantId) {
        return res.status(403).json({ error: "Access denied: cannot access another union's live stream" });
      }
    }

    const effectiveMerchantId = scope.isGlobalAdmin ? merchantId : scope.merchantId!;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: "connected", merchantId: effectiveMerchantId })}\n\n`);

    if (!liveTrackingSubscribers.has(effectiveMerchantId)) {
      liveTrackingSubscribers.set(effectiveMerchantId, new Set());
    }
    liveTrackingSubscribers.get(effectiveMerchantId)!.add(res);

    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      liveTrackingSubscribers.get(effectiveMerchantId)?.delete(res);
    });
  });

  function broadcastLocationUpdate(merchantId: string, locationData: any) {
    const alertData = { ...locationData, alerts: [] as string[] };

    if (locationData.speed !== undefined && Number(locationData.speed) < 1 && locationData.tripStatus === "In-Progress") {
      alertData.alerts.push("IDLE: Vehicle stationary for active trip");
    }
    if (locationData.delayMinutes && locationData.delayMinutes > 15) {
      alertData.alerts.push(`DELAY: ${locationData.delayMinutes} min behind schedule`);
    }
    if (locationData.deviationMeters && locationData.deviationMeters > 500) {
      alertData.alerts.push(`DEVIATION: ${locationData.deviationMeters}m off planned route`);
    }

    const message = `data: ${JSON.stringify({ type: "location_update", ...alertData })}\n\n`;
    const channels = new Set([merchantId, "federation"]);
    for (const channel of channels) {
      const subscribers = liveTrackingSubscribers.get(channel);
      if (subscribers) {
        for (const subscriber of subscribers) {
          try { subscriber.write(message); } catch (e) { subscribers.delete(subscriber); }
        }
      }
    }
  }

  // ==================== PRODUCTS DAIRY AMBATTUR SEED API ====================

  const ROUTE1_STOPS = [
    { zone: 1, div: "5", name: "Division Office Zone 1", address: "NO. 1 RAMAKRISHNA NAGAR, 2ND ROAD CH - 19", lat: 13.112, lng: 80.21852, pockets: 565, bags: 11 },
    { zone: 1, div: "11", name: "Bov Parking Yard TH Road", address: "TH road, Chennai", lat: 13.1566, lng: 80.3022, pockets: 565, bags: 11 },
    { zone: 2, div: "18", name: "Division Office Manali CPCL", address: "Nedunchezian St, CPCL layout, Manali, Chennai-68", lat: 13.175544, lng: 80.256157, pockets: 379, bags: 8 },
    { zone: 2, div: "20", name: "Division Office Manali MGR", address: "New MGR street, Manali, Chennai-68", lat: 13.168441, lng: 80.253099, pockets: 378, bags: 8 },
    { zone: 3, div: "25", name: "Madhavaram Local Depot", address: "Madhavaram Local Depot, MRH Road Chennai-600060", lat: 13.1525556, lng: 80.2284722, pockets: 677, bags: 14 },
    { zone: 3, div: "25", name: "Madhavaram CMDA", address: "No.23 Grand Northern Trunk RD, Madhavaram, Chennai-600110", lat: 13.1434444, lng: 80.2228333, pockets: 677, bags: 14 },
    { zone: 4, div: "42", name: "Zonal Office 4 Tondiarpet", address: "No. 266, V.H Road, Old Washermenpet, Tondiarpet, Chennai 21", lat: 13.120844, lng: 80.286857, pockets: 1423, bags: 28 },
    { zone: 4, div: "44", name: "Lorry Depot Perambur", address: "No. 107, BB Road, Perambur, Chennai-39", lat: 13.1124167, lng: 80.2525833, pockets: 1422, bags: 28 },
    { zone: 5, div: "55", name: "Bov Parking Yard Mint Street", address: "Mint street, near angalamman kovil (Mint Flyover)", lat: 13.1055, lng: 80.280222, pockets: 1494, bags: 30 },
    { zone: 5, div: "61", name: "Bov Parking Yard Egmore", address: "Block-4, Veerasamy street, Egmore, Chennai 600 008", lat: 13.076254, lng: 80.257097, pockets: 1494, bags: 30 },
    { zone: 6, div: "68", name: "Division Office Jawahar Nagar", address: "Ward Office, Jawahar Nagar 3rd Circular Road", lat: 13.113966, lng: 80.230332, pockets: 1209, bags: 24 },
    { zone: 6, div: "73", name: "Division Office Otteri", address: "No.72, New Ferrance Road, otteri, Chennai-12", lat: 13.098819, lng: 80.257725, pockets: 1208, bags: 24 },
    { zone: 9, div: "120", name: "Lorry Station Royapettah", address: "Lloyds Colony, Saivamuthiah Street, Royapettah-600014", lat: 13.050349, lng: 80.273021, pockets: 1378, bags: 28 },
    { zone: 9, div: "125", name: "Bov Parking Yard Mylapore", address: "TS 09 Bov point Karaneeswarar pakoda street Mylapore", lat: 13.040784, lng: 80.275214, pockets: 1378, bags: 28 },
  ];

  const ROUTE2_STOPS = [
    { zone: 7, div: "86B", name: "Near Zonal Office Vanagaram", address: "Vanagaram main road, ambattur, Near Ambattur Burial Ground", lat: 13.103399, lng: 80.150272, pockets: 1112, bags: 22 },
    { zone: 7, div: "89", name: "Anna Nagar West Padi", address: "Officers colony main road, anna nagar west extn, padi", lat: 13.087366, lng: 80.194299, pockets: 1112, bags: 22 },
    { zone: 8, div: "100", name: "Division Office Kilpauk", address: "Temple Street, Kilpauk (Division Office)", lat: 13.0832149, lng: 80.2379864, pockets: 1390, bags: 28 },
    { zone: 8, div: "103", name: "Division Office Anna Nagar", address: "3rd Main Road, Anna nagar (Division Office)", lat: 13.085, lng: 80.210, pockets: 1389, bags: 28 },
    { zone: 10, div: "127", name: "Bov Parking Yard Koyambedu", address: "KALIYAMMAN KOVIL STREET KOYAMBEDU CHENNAI 600107", lat: 13.065679, lng: 80.198749, pockets: 1018, bags: 20 },
    { zone: 10, div: "132", name: "Bov Parking Yard Arcot Road", address: "ARCOT ROAD BHARAT PETROL BUNK KAMARAJ COLONY, CHENNAI 600024", lat: 13.052475, lng: 80.22169, pockets: 1018, bags: 20 },
    { zone: 11, div: "145", name: "Bov Parking Yard Nerkundram", address: "Ponnthamallee High Road, Nerkundram, Ch-107", lat: 13.072556, lng: 80.189056, pockets: 646, bags: 13 },
    { zone: 11, div: "151", name: "Bov Parking Yard Valasaravakkam", address: "Arcot Road, Valasavakkam, Chennai-87", lat: 13.038611, lng: 80.167472, pockets: 646, bags: 13 },
    { zone: 12, div: "158", name: "Ward Office Nandambakkam", address: "WARD OFFICE, Chennai Trade Center, Mount Poonamallee Road, Nandambakkam, Chennai-600089", lat: 13.016417, lng: 80.191722, pockets: 551, bags: 11 },
    { zone: 12, div: "160", name: "Ward Office Alandur", address: "WARD OFFICE No: 4, Bazaar Building, New street, Alandur", lat: 13.004025, lng: 80.202575, pockets: 551, bags: 11 },
  ];

  const ROUTE3_STOPS = [
    { zone: 13, div: "169", name: "Saidapet Lorry Station", address: "SAIDAPET LORRY STATION", lat: 13.020465, lng: 80.225526, pockets: 1054, bags: 21 },
    { zone: 13, div: "177", name: "Seva Nagar", address: "SEVA NAGAR", lat: 12.986359, lng: 80.230024, pockets: 1054, bags: 21 },
    { zone: 14, div: "182", name: "Perungudi Bov Point", address: "PERUNGUDI BOV POINT", lat: 12.964912, lng: 80.241341, pockets: 704, bags: 14 },
    { zone: 14, div: "190", name: "Division Office Pallikaranai", address: "VELACHERY-TAMBARAM MAIN ROAD, PALLIKARANI, CHENNAI", lat: 12.9310202, lng: 80.2028141, pockets: 703, bags: 14 },
    { zone: 15, div: "194", name: "Division Office Injambakkam", address: "VOC Street, East Coast Road, Injampakkam", lat: 12.920073, lng: 80.251789, pockets: 1133, bags: 23 },
    { zone: 15, div: "199", name: "Division Office Sholinganallur", address: "Nedunchezhian street, Sholinganallur", lat: 12.892547, lng: 80.22942, pockets: 1133, bags: 23 },
  ];

  app.post("/api/admin/transport/seed-products-ambattur", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const existingHubs = await db.select().from(transportHubs).where(eq(transportHubs.hubName, "Products Dairy Ambattur Transport Hub"));
      const existingVehicles = await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, "TN-01-AQ-1001"));
      if (existingHubs.length > 0 || existingVehicles.length > 0) {
        return res.json({ message: "Products Dairy Ambattur demo data already exists", alreadySeeded: true });
      }

      const today = new Date().toISOString().slice(0, 10);
      const merchantId = "FED-PROD-01";

      const [hub] = await db.insert(transportHubs).values({
        hubName: "Products Dairy Ambattur Transport Hub",
        location: "Ambattur Industrial Estate, Chennai - 600058",
        lat: "13.111401",
        lng: "80.174373",
        segments: ["Products", "Ice Cream"],
        status: "active",
      }).returning();

      const vehicleData = [
        { vehicleNumber: "TN-01-AQ-1001", vehicleType: "refrigerated", capacity: "2 Ton", driverName: "Murugan S", driverPhone: "9840011001", driverLicense: "TN-0120210045678", route: 1 },
        { vehicleNumber: "TN-01-AQ-1002", vehicleType: "refrigerated", capacity: "2 Ton", driverName: "Kannan R", driverPhone: "9840011002", driverLicense: "TN-0120210045679", route: 1 },
        { vehicleNumber: "TN-01-AQ-2001", vehicleType: "frozen", capacity: "2 Ton", driverName: "Selvam K", driverPhone: "9840022001", driverLicense: "TN-0120210045680", route: 2 },
        { vehicleNumber: "TN-01-AQ-2002", vehicleType: "frozen", capacity: "2 Ton", driverName: "Raju M", driverPhone: "9840022002", driverLicense: "TN-0120210045681", route: 2 },
        { vehicleNumber: "TN-01-AQ-3001", vehicleType: "insulated", capacity: "2 Ton", driverName: "Kumar P", driverPhone: "9840033001", driverLicense: "TN-0120210045682", route: 3 },
        { vehicleNumber: "TN-01-AQ-3002", vehicleType: "insulated", capacity: "2 Ton", driverName: "Senthil V", driverPhone: "9840033002", driverLicense: "TN-0120210045683", route: 3 },
      ];

      const createdVehicles = await db.insert(vehicles).values(
        vehicleData.map(v => ({
          merchantId,
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType,
          capacity: v.capacity,
          driverName: v.driverName,
          driverPhone: v.driverPhone,
          driverLicense: v.driverLicense,
          currentLat: "13.111401",
          currentLng: "80.174373",
          status: "available",
          isActive: true,
        }))
      ).returning();

      const tripConfigs = [
        {
          routeName: "Route 1 - North Chennai (Zones 1-6, 9)",
          vehicle: vehicleData[0],
          vehicleId: createdVehicles[0].id,
          stops: ROUTE1_STOPS,
          totalPockets: 14247,
          totalBags: 285,
          startTime: "04:00",
          etaTime: "08:30",
          tripCode: `BM-R1-${today.replace(/-/g, '')}`,
        },
        {
          routeName: "Route 2 - Central/West Chennai (Zones 7-8, 10-12)",
          vehicle: vehicleData[2],
          vehicleId: createdVehicles[2].id,
          stops: ROUTE2_STOPS,
          totalPockets: 8882,
          totalBags: 178,
          startTime: "04:00",
          etaTime: "07:30",
          tripCode: `BM-R2-${today.replace(/-/g, '')}`,
        },
        {
          routeName: "Route 3 - South Chennai (Zones 12-15)",
          vehicle: vehicleData[4],
          vehicleId: createdVehicles[4].id,
          stops: ROUTE3_STOPS,
          totalPockets: 6332,
          totalBags: 127,
          startTime: "04:00",
          etaTime: "07:00",
          tripCode: `BM-R3-${today.replace(/-/g, '')}`,
        },
      ];

      const createdTrips = [];
      const createdManifests = [];
      const createdPoints = [];

      for (const tc of tripConfigs) {
        const tonnage = (tc.totalBags * 13) / 1000;
        const [trip] = await db.insert(tripSheets).values({
          tripId: tc.tripCode,
          date: today,
          shift: "AM",
          hubId: hub.id,
          hubName: hub.hubName,
          unionId: merchantId,
          unionName: "Products Dairy Ambattur",
          routeName: tc.routeName,
          vehicleId: tc.vehicleId,
          vehicleNo: tc.vehicle.vehicleNumber,
          driverName: tc.vehicle.driverName,
          driverPhone: tc.vehicle.driverPhone,
          segment: "Products",
          plannedDropPoints: tc.stops.length,
          completedDropPoints: 0,
          bagsPlanned: tc.totalBags,
          bagsLoaded: tc.totalBags,
          capacityBags: 120,
          tonnageLoaded: String(tonnage),
          startTime: tc.startTime,
          etaTime: tc.etaTime,
          status: "Planned",
          tempMinC: "2.0",
          tempMaxC: "6.0",
          notes: `Buttermilk delivery - ${tc.routeName}. ${tc.stops.length} stops, ${tc.totalPockets} pockets, ${tc.totalBags} bags.`,
        }).returning();

        createdTrips.push(trip);

        const [manifest] = await db.insert(loadManifests).values({
          tripId: trip.id,
          items: tc.stops.map(s => ({ location: s.name, bags: s.bags, pockets: s.pockets, zone: s.zone, division: s.div })),
          totalBags: tc.totalBags,
          totalWeightKg: String(tc.totalBags * 13),
          batchInfo: `Buttermilk Batch ${today} - ${tc.tripCode}`,
          loadedBy: tc.vehicle.driverName,
          verifiedBy: "Supervisor - Ambattur",
          status: "verified",
        }).returning();

        createdManifests.push(manifest);

        let baseHour = 4;
        let baseMin = 0;
        for (let i = 0; i < tc.stops.length; i++) {
          const s = tc.stops[i];
          baseMin += 15 + Math.floor(Math.random() * 10);
          if (baseMin >= 60) { baseHour += Math.floor(baseMin / 60); baseMin = baseMin % 60; }
          const arrivalTime = `${String(baseHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')}`;

          const [pt] = await db.insert(transportRoutePoints).values({
            tripId: trip.id,
            sequenceNo: i + 1,
            locationName: `Z${s.zone}/D${s.div} - ${s.name}`,
            lat: String(s.lat),
            lng: String(s.lng),
            plannedArrival: arrivalTime,
            bagsToDeliver: s.bags,
            bagsDelivered: 0,
            status: "pending",
            geoTagConfirmed: false,
            notes: `${s.pockets} pockets, ${s.bags} bags - ${s.address}`,
          }).returning();

          createdPoints.push(pt);
        }
      }

      res.json({
        message: "Products Dairy Ambattur demo data seeded successfully",
        hub: { id: hub.id, name: hub.hubName },
        vehicles: createdVehicles.map(v => ({ id: v.id, number: v.vehicleNumber, driver: v.driverName, type: v.vehicleType })),
        trips: createdTrips.map(t => ({ id: t.id, tripId: t.tripId, route: t.routeName, bags: t.bagsPlanned, stops: t.plannedDropPoints })),
        manifests: createdManifests.length,
        routePoints: createdPoints.length,
        summary: {
          totalPockets: 14247 + 8882 + 6332,
          totalBags: 285 + 178 + 127,
          totalWeightKg: (285 + 178 + 127) * 13,
          totalStops: ROUTE1_STOPS.length + ROUTE2_STOPS.length + ROUTE3_STOPS.length,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== SEED DRIVERS FOR PRODUCTS DAIRY AMBATTUR ====================
  app.post("/api/admin/transport/seed-drivers-ambattur", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const passwordHash = await hashPassword("Amb@123");

      const driverData = [
        { name: "Murugan S", code: "AMB-DRV-001", phone: "9840011001", vehicleNo: "TN-01-AQ-1001" },
        { name: "Kannan R", code: "AMB-DRV-002", phone: "9840011002", vehicleNo: "TN-01-AQ-1002" },
        { name: "Selvam K", code: "AMB-DRV-003", phone: "9840022001", vehicleNo: "TN-01-AQ-2001" },
        { name: "Raju M", code: "AMB-DRV-004", phone: "9840022002", vehicleNo: "TN-01-AQ-2002" },
        { name: "Kumar P", code: "AMB-DRV-005", phone: "9840033001", vehicleNo: "TN-01-AQ-3001" },
        { name: "Senthil V", code: "AMB-DRV-006", phone: "9840033002", vehicleNo: "TN-01-AQ-3002" },
      ];

      const existingDriver = await storage.findUserByEmail("AMB-DRV-001");
      if (existingDriver) {
        return res.json({ message: "Ambattur driver accounts already exist", alreadySeeded: true });
      }

      const createdDrivers = [];
      for (const d of driverData) {
        const driverId = `amb-driver-${d.code.toLowerCase()}`;
        const user = await storage.createUser({
          id: driverId,
          name: d.name,
          email: d.code,
          passwordHash,
          role: "driver",
          phone: d.phone,
          unionId: "FED-PROD-01",
          assignedSegment: "Products",
          status: "approved",
        });

        await db.update(tripSheets)
          .set({ driverId: driverId })
          .where(and(
            eq(tripSheets.driverName, d.name),
            eq(tripSheets.unionId, "FED-PROD-01")
          ));

        createdDrivers.push({
          name: d.name,
          code: d.code,
          phone: d.phone,
          vehicle: d.vehicleNo,
          password: "Amb@123",
        });
      }

      res.json({
        message: "6 Ambattur driver accounts created successfully",
        drivers: createdDrivers,
        loginUrl: "/driver/login",
        note: "Use driver code (e.g., AMB-DRV-001) and password Amb@123 to login",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.post("/api/admin/transport/seed-drivers-salem", async (_req, res) => {
    try {
      const passwordHash = await hashPassword("Aavin@2024");

      const driverData = [
        { name: "Rajesh Kumar", email: "rajesh.slm@aavincart.com", phone: "9876543210", vehicleNo: "TN-30-AB-1234", segment: "Fresh Milk" },
        { name: "Suresh Babu", email: "suresh.slm@aavincart.com", phone: "9876543211", vehicleNo: "TN-30-CD-5678", segment: "Ice Cream" },
        { name: "Murugan S", email: "murugan.slm@aavincart.com", phone: "9876543212", vehicleNo: "TN-30-EF-9012", segment: "Products" },
      ];

      const createdDrivers = [];
      for (const d of driverData) {
        const driverId = `slm-driver-${d.email.split('@')[0]}`;
        const existing = await storage.findUserByEmail(d.email);
        if (existing) {
          createdDrivers.push({ name: d.name, email: d.email, status: "already_exists" });
          continue;
        }
        const user = await storage.createUser({
          id: driverId,
          name: d.name,
          email: d.email,
          passwordHash,
          role: "driver",
          phone: d.phone,
          unionId: "UNI-SLM-01",
          assignedSegment: d.segment,
          status: "approved",
        });

        await db.update(vehicles)
          .set({ driverUserId: driverId })
          .where(and(
            eq(vehicles.driverName, d.name),
            eq(vehicles.merchantId, "UNI-SLM-01")
          ));

        await db.update(tripSheets)
          .set({ driverId: driverId })
          .where(and(
            eq(tripSheets.driverName, d.name),
            inArray(tripSheets.unionId, ["UNI-SLM-01", "merchant-3"])
          ));

        createdDrivers.push({
          name: d.name,
          email: d.email,
          phone: d.phone,
          vehicle: d.vehicleNo,
          password: "Aavin@2024",
          loginUrl: "/pwa/driver",
        });
      }

      res.json({
        message: "3 Salem driver accounts created successfully",
        drivers: createdDrivers,
      });
    } catch (e: any) {
      console.error('Error seeding Salem drivers:', e);
      res.status(500).json({ error: e.message });
    }
  });


  app.post("/api/admin/transport/link-salem-drivers", async (_req, res) => {
    try {
      const driverLinks = [
        { userId: "slm-driver-rajesh.slm", name: "Rajesh Kumar" },
        { userId: "slm-driver-suresh.slm", name: "Suresh Babu" },
        { userId: "slm-driver-murugan.slm", name: "Murugan S" },
      ];

      const results = [];
      for (const d of driverLinks) {
        const vResult = await db.update(vehicles)
          .set({ driverUserId: d.userId })
          .where(and(
            eq(vehicles.driverName, d.name),
            eq(vehicles.merchantId, "UNI-SLM-01")
          ));
        
        const tResult = await db.update(tripSheets)
          .set({ driverId: d.userId })
          .where(and(
            eq(tripSheets.driverName, d.name),
            or(eq(tripSheets.unionId, "UNI-SLM-01"), eq(tripSheets.unionId, "merchant-3"))
          ));

        results.push({ name: d.name, userId: d.userId, vehiclesUpdated: true, tripsUpdated: true });
      }

      res.json({ success: true, results });
    } catch (e: any) {
      console.error('Link drivers error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== DRIVER TRIP API ENDPOINTS ====================

  app.get("/api/driver/my-trip", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const today = new Date().toISOString().slice(0, 10);

      let trips = await db.select().from(tripSheets)
        .where(and(
          eq(tripSheets.driverId, user.id),
          or(eq(tripSheets.status, "Planned"), eq(tripSheets.status, "In Progress"))
        ))
        .orderBy(desc(tripSheets.createdAt))
        .limit(1);

      if (trips.length === 0) {
        trips = await db.select().from(tripSheets)
          .where(and(
            eq(tripSheets.driverName, user.name),
            eq(tripSheets.unionId, user.unionId || ""),
            or(eq(tripSheets.status, "Planned"), eq(tripSheets.status, "In Progress"))
          ))
          .orderBy(desc(tripSheets.createdAt))
          .limit(1);
      }

      if (trips.length === 0) {
        return res.json({ trip: null, message: "No active trip assigned" });
      }

      const trip = trips[0];

      const points = await db.select().from(transportRoutePoints)
        .where(eq(transportRoutePoints.tripId, trip.id))
        .orderBy(asc(transportRoutePoints.sequenceNo));

      const manifest = await db.select().from(loadManifests)
        .where(eq(loadManifests.tripId, trip.id))
        .limit(1);

      const totalBags = points.reduce((sum, p) => sum + (p.bagsToDeliver || 0), 0);
      const totalWeightKg = totalBags * 13;
      const deliveredStops = points.filter(p => p.status === 'delivered').length;

      const depotLat = DEPOT_LAT;
      const depotLng = DEPOT_LNG;
      const waypoints = points.map(p => `${p.lat},${p.lng}`).join('|');
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${depotLat},${depotLng}&destination=${depotLat},${depotLng}&waypoints=${waypoints}&travelmode=driving`;

      res.json({
        trip: {
          ...trip,
          googleMapsUrl,
        },
        stops: points,
        manifest: manifest[0] || null,
        summary: {
          totalStops: points.length,
          deliveredStops,
          pendingStops: points.length - deliveredStops,
          totalBags,
          totalWeightKg,
          progress: points.length > 0 ? Math.round((deliveredStops / points.length) * 100) : 0,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/driver/start-trip", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const { tripId } = req.body;
      if (!tripId) return res.status(400).json({ error: 'tripId required' });

      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.id, tripId));
      if (!trip) return res.status(404).json({ error: 'Trip not found' });
      if (trip.driverId !== user.id) return res.status(403).json({ error: 'This trip is not assigned to you' });

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      await db.update(tripSheets)
        .set({ status: "In Progress", startTime: timeStr, updatedAt: now })
        .where(eq(tripSheets.id, tripId));

      res.json({ success: true, message: "Trip started", startTime: timeStr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/driver/location", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const { latitude, longitude, speed, heading } = req.body;
      if (latitude == null || longitude == null) {
        return res.status(400).json({ error: 'latitude and longitude required' });
      }
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      const activeTrips = await db.select({ id: tripSheets.id }).from(tripSheets)
        .where(and(eq(tripSheets.driverId, user.id), eq(tripSheets.status, "In Progress")))
        .limit(1);
      const activeTripId = activeTrips.length > 0 ? activeTrips[0].id : null;

      await db.insert(driverLocations).values({
        driverId: user.id,
        tripId: activeTripId,
        latitude: String(lat),
        longitude: String(lng),
        speed: speed != null ? String(parseFloat(speed) || 0) : null,
        heading: heading != null ? String(parseFloat(heading) || 0) : null,
      });

      if (activeTripId) {
        const [activeTrip] = await db.select().from(tripSheets).where(eq(tripSheets.id, activeTripId));
        if (activeTrip?.unionId) {
          broadcastLocationUpdate(activeTrip.unionId, {
            driverId: user.id,
            driverName: activeTrip.driverName,
            tripId: activeTrip.tripId,
            vehicleNo: activeTrip.vehicleNo,
            tripStatus: activeTrip.status,
            lat, lng,
            speed: speed != null ? parseFloat(speed) : 0,
            heading: heading != null ? parseFloat(heading) : 0,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/driver/stop/:pointId/deliver", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const pointId = parseInt(req.params.pointId);
      if (isNaN(pointId)) return res.status(400).json({ error: 'Invalid pointId' });

      const [point] = await db.select().from(transportRoutePoints).where(eq(transportRoutePoints.id, pointId));
      if (!point) return res.status(404).json({ error: 'Stop not found' });

      const [tripOwner] = await db.select().from(tripSheets).where(eq(tripSheets.id, point.tripId));
      if (!tripOwner || tripOwner.driverId !== user.id) {
        return res.status(403).json({ error: 'This stop is not assigned to you' });
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      await db.update(transportRoutePoints)
        .set({
          status: "delivered",
          bagsDelivered: point.bagsToDeliver,
          actualArrival: timeStr,
          geoTagConfirmed: true,
        })
        .where(eq(transportRoutePoints.id, pointId));

      const tripPoints = await db.select().from(transportRoutePoints)
        .where(eq(transportRoutePoints.tripId, point.tripId));
      const deliveredCount = tripPoints.filter(p => p.id === pointId || p.status === 'delivered').length;

      await db.update(tripSheets)
        .set({ completedDropPoints: deliveredCount, updatedAt: now })
        .where(eq(tripSheets.id, point.tripId));

      res.json({
        success: true,
        message: `Stop delivered at ${timeStr}`,
        deliveredCount,
        totalStops: tripPoints.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/driver/complete-trip", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'driver') {
        return res.status(403).json({ error: 'Driver access required' });
      }

      const { tripId } = req.body;
      if (!tripId) return res.status(400).json({ error: 'tripId required' });

      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.id, tripId));
      if (!trip) return res.status(404).json({ error: 'Trip not found' });
      if (trip.driverId !== user.id) return res.status(403).json({ error: 'This trip is not assigned to you' });

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      await db.update(tripSheets)
        .set({ status: "Completed", actualEndTime: timeStr, updatedAt: now })
        .where(eq(tripSheets.id, tripId));

      res.json({ success: true, message: "Trip completed", endTime: timeStr });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/transport/live-tracking", requireAuth, requireRole('admin', 'merchant'), async (_req, res) => {
    try {
      const activeTrips = await db.select().from(tripSheets)
        .where(or(eq(tripSheets.status, "In Progress"), eq(tripSheets.status, "Planned")));

      const trackingData = [];
      for (const trip of activeTrips) {
        const points = await db.select().from(transportRoutePoints)
          .where(eq(transportRoutePoints.tripId, trip.id))
          .orderBy(asc(transportRoutePoints.sequenceNo));

        let lastLocation = null;
        if (trip.driverId) {
          const locations = await db.select().from(driverLocations)
            .where(eq(driverLocations.driverId, trip.driverId))
            .orderBy(desc(driverLocations.createdAt))
            .limit(1);
          if (locations.length > 0) {
            lastLocation = {
              lat: locations[0].latitude,
              lng: locations[0].longitude,
              speed: locations[0].speed,
              updatedAt: locations[0].createdAt,
            };
          }
        }

        const deliveredStops = points.filter(p => p.status === 'delivered').length;
        const totalBags = points.reduce((sum, p) => sum + (p.bagsToDeliver || 0), 0);

        trackingData.push({
          trip: {
            id: trip.id,
            tripId: trip.tripId,
            routeName: trip.routeName,
            vehicleNo: trip.vehicleNo,
            driverName: trip.driverName,
            driverPhone: trip.driverPhone,
            status: trip.status,
            startTime: trip.startTime,
            etaTime: trip.etaTime,
          },
          stops: points,
          lastLocation,
          summary: {
            totalStops: points.length,
            deliveredStops,
            pendingStops: points.length - deliveredStops,
            totalBags,
            totalWeightKg: totalBags * 13,
            progress: points.length > 0 ? Math.round((deliveredStops / points.length) * 100) : 0,
          },
        });
      }

      const speedValues = trackingData
        .filter((t: any) => t.lastLocation?.speed)
        .map((t: any) => Number(t.lastLocation.speed));
      const avgSpeed = speedValues.length > 0
        ? Math.round(speedValues.reduce((a: number, b: number) => a + b, 0) / speedValues.length * 10) / 10
        : 0;

      const totalDelivered = trackingData.reduce((s: number, t: any) => s + (t.summary?.deliveredStops || 0), 0);
      const totalStopsAll = trackingData.reduce((s: number, t: any) => s + (t.summary?.totalStops || 0), 0);
      const onTimePercent = totalStopsAll > 0 ? Math.round((totalDelivered / totalStopsAll) * 100) : 0;

      const totalDistanceKm = trackingData.reduce((s: number, t: any) => {
        const stops = t.stops || [];
        let dist = 0;
        for (let i = 1; i < stops.length; i++) {
          const lat1 = Number(stops[i - 1].lat) * Math.PI / 180;
          const lat2 = Number(stops[i].lat) * Math.PI / 180;
          const dLat = lat2 - lat1;
          const dLng = (Number(stops[i].lng) - Number(stops[i - 1].lng)) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
          dist += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return s + dist;
      }, 0);

      for (const item of trackingData) {
        const stopCoords = (item.stops || [])
          .filter((s: any) => s.lat && s.lng)
          .map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }));
        (item as any).routeUrl = buildGoogleMapsUrl(stopCoords);
      }

      res.json({
        tracking: trackingData,
        timestamp: new Date().toISOString(),
        depot: { lat: DEPOT_LAT, lng: DEPOT_LNG },
        fleetStats: {
          avgSpeedKmh: avgSpeed,
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
          onTimePercent,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== TRANSPORT MANAGER PWA API ====================

  const TRANSPORT_DESIGNATIONS = [
    'gm_transport', 'agm_transport', 'dgm_transport', 'manager_transport',
    'deputy_manager_transport', 'route_planner', 'transport_supervisor',
    'fleet_coordinator', 'transport_driver', 'transport_helper',
    'transport_manager', 'segment_mgr_delivery_fm', 'segment_mgr_delivery_dp',
    'segment_mgr_delivery_ic', 'delivery_partner',
    'gm', 'dgm_operations',
  ];
  const TRANSPORT_DEPARTMENTS = ['transport', 'delivery', 'logistics'];

  app.post("/api/transport-manager/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }

      let staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.username, username) });
      if (!staff) {
        staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.phone, username) });
      }
      if (!staff) {
        staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.employeeId, username) });
      }

      if (!staff) {
        return res.status(401).json({ success: false, message: "Invalid Employee ID or password" });
      }

      const desigId = (staff.designationId || '').toLowerCase();
      const desigName = (staff.designation || '').toLowerCase();
      const dept = (staff.department || '').toLowerCase();

      const isTransportStaff =
        TRANSPORT_DESIGNATIONS.includes(desigId) ||
        TRANSPORT_DEPARTMENTS.includes(dept) ||
        desigId.includes('transport') || desigId.includes('delivery') ||
        desigName.includes('transport') || desigName.includes('delivery');

      if (!isTransportStaff) {
        return res.status(403).json({ success: false, message: "Access denied. This app is for Transport & Delivery management staff." });
      }

      if (staff.approvalStatus !== 'approved') {
        return res.status(403).json({ success: false, message: "Your account is pending approval." });
      }
      if (!staff.isActive) {
        return res.status(403).json({ success: false, message: "Your account has been deactivated." });
      }

      const bcrypt = await import("bcryptjs");
      const validPassword = await bcrypt.compare(password, staff.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      await db.update(unionStaff).set({ lastLogin: new Date() }).where(eq(unionStaff.id, staff.id));

      const token = signToken({ transportManagerId: staff.id, unionId: staff.unionId, role: 'transport_manager' });
      res.cookie('transport_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });

      const authToken = signToken({ staffId: staff.id });
      res.cookie('auth_token', authToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });

      res.json({
        success: true,
        manager: {
          id: staff.id,
          unionId: staff.unionId,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          designation: staff.designation,
          designationId: staff.designationId,
          accessTier: staff.accessTier,
          assignedSegments: staff.assignedSegments,
        }
      });
    } catch (error) {
      console.error('Transport manager login error:', error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  async function requireTransportAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.transport_token;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.transportManagerId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.id, payload.transportManagerId) });
    if (!staff) {
      return res.status(401).json({ error: "Manager not found" });
    }
    (req as any).transportManager = {
      id: staff.id,
      unionId: staff.unionId,
      name: staff.name,
      designation: staff.designation,
      designationId: staff.designationId,
      accessTier: staff.accessTier,
      assignedSegments: staff.assignedSegments,
    };
    next();
  }

  app.get("/api/transport-manager/me", requireTransportAuth, (req, res) => {
    res.json((req as any).transportManager);
  });

  app.post("/api/transport-manager/logout", (_req, res) => {
    res.clearCookie('transport_token', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    res.clearCookie('admin_session_token', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    res.json({ success: true });
  });

  app.get("/api/transport-manager/dashboard", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const today = new Date().toISOString().split('T')[0];
      const allTrips = allIds.length > 0
        ? await db.select().from(tripSheets).where(inArray(tripSheets.unionId, allIds))
        : await db.select().from(tripSheets);
      const todayTrips = allTrips.filter(t => t.date === today);

      const activeTrips = todayTrips.filter(t => t.status === 'In Progress' || t.status === 'In-Progress').length;
      const completedTrips = todayTrips.filter(t => t.status === 'Completed').length;
      const plannedTrips = todayTrips.filter(t => t.status === 'Planned').length;
      const delayedTrips = todayTrips.filter(t => t.status === 'Delayed').length;

      const allVehicles = allIds.length > 0
        ? await db.select().from(vehicles).where(inArray(vehicles.merchantId, allIds))
        : await db.select().from(vehicles);
      const vehiclesOut = allVehicles.filter(v => v.status === 'Active' || v.status === 'active').length;
      const totalVehicles = allVehicles.length;

      const pendingDeliveryJobs = allIds.length > 0
        ? await db.select().from(deliveryJobs).where(and(inArray(deliveryJobs.merchantId, allIds), eq(deliveryJobs.status, 'ready_for_trip')))
        : [];
      const pendingJobsCount = pendingDeliveryJobs.length;

      const totalBags = todayTrips.reduce((s, t) => s + (t.bagsLoaded || 0), 0);
      const totalDropsPlanned = todayTrips.reduce((s, t) => s + (t.plannedDropPoints || 0), 0);
      const totalDropsDone = todayTrips.reduce((s, t) => s + (t.completedDropPoints || 0), 0);
      const onTimePercent = totalDropsPlanned > 0 ? Math.round((totalDropsDone / totalDropsPlanned) * 100) : 0;

      const segments = ['Fresh Milk', 'Products', 'Ice Cream'];
      const segmentBreakdown = segments.map(seg => ({
        segment: seg,
        trips: todayTrips.filter(t => t.segment === seg).length,
        bags: todayTrips.filter(t => t.segment === seg).reduce((s, t) => s + (t.bagsLoaded || 0), 0),
      }));

      const recentTrips = todayTrips.slice(0, 5).map(t => ({
        id: t.id,
        tripId: t.tripId,
        routeName: t.routeName,
        driverName: t.driverName,
        vehicleNo: t.vehicleNo,
        status: t.status,
        segment: t.segment,
        bagsLoaded: t.bagsLoaded,
      }));

      res.json({
        kpi: { activeTrips, completedTrips, plannedTrips, delayedTrips, vehiclesOut, totalVehicles, totalBags, onTimePercent, totalTripsToday: todayTrips.length, pendingJobsCount },
        segmentBreakdown,
        recentTrips,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/trips", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const { date, status, segment } = req.query;
      let conditions: any[] = [];
      if (allIds.length > 0) conditions.push(inArray(tripSheets.unionId, allIds));
      if (date) conditions.push(eq(tripSheets.date, date as string));
      if (status) conditions.push(eq(tripSheets.status, status as string));
      if (segment) conditions.push(eq(tripSheets.segment, segment as string));

      let query = db.select().from(tripSheets).orderBy(desc(tripSheets.createdAt));
      if (conditions.length > 0) query = query.where(and(...conditions)) as any;
      const trips = await query;

      const tripsWithPoints = await Promise.all(trips.map(async (trip) => {
        const points = await db.select().from(transportRoutePoints)
          .where(eq(transportRoutePoints.tripId, trip.id))
          .orderBy(asc(transportRoutePoints.sequenceNo));
        const delivered = points.filter(p => p.status === 'delivered').length;
        return {
          ...trip,
          totalStops: points.length,
          deliveredStops: delivered,
          progress: points.length > 0 ? Math.round((delivered / points.length) * 100) : 0,
        };
      }));

      res.json(tripsWithPoints);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/trips/:id", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const conditions: any[] = [eq(tripSheets.id, parseInt(req.params.id))];
      if (allIds.length > 0) conditions.push(inArray(tripSheets.unionId, allIds));
      const trip = await db.select().from(tripSheets).where(and(...conditions)).limit(1);
      if (trip.length === 0) return res.status(404).json({ error: "Trip not found" });

      const points = await db.select().from(transportRoutePoints)
        .where(eq(transportRoutePoints.tripId, trip[0].id))
        .orderBy(asc(transportRoutePoints.sequenceNo));

      const manifest = await db.select().from(loadManifests)
        .where(eq(loadManifests.tripId, trip[0].id));

      res.json({ trip: trip[0], points, manifest });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/transport-manager/trips/:id/status", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const { status } = req.body;
      const validStatuses = ['Planned', 'Dispatched', 'In Progress', 'In-Progress', 'Completed', 'Delayed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      if (allIds.length > 0) {
        const trip = await db.select().from(tripSheets).where(and(eq(tripSheets.id, parseInt(req.params.id)), inArray(tripSheets.unionId, allIds))).limit(1);
        if (trip.length === 0) return res.status(403).json({ error: "Not authorized to update this trip" });
      }

      await db.update(tripSheets).set({ status }).where(eq(tripSheets.id, parseInt(req.params.id)));
      res.json({ success: true, message: `Trip status updated to ${status}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/fleet", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const allVehicles = allIds.length > 0
        ? await db.select().from(vehicles).where(inArray(vehicles.merchantId, allIds))
        : await db.select().from(vehicles);

      const vehiclesWithTrips = await Promise.all(allVehicles.map(async (v) => {
        const activeTrip = await db.select().from(tripSheets)
          .where(and(
            eq(tripSheets.vehicleNo, v.vehicleNumber),
            or(eq(tripSheets.status, 'In Progress'), eq(tripSheets.status, 'In-Progress'), eq(tripSheets.status, 'Planned'))
          ))
          .limit(1);

        return {
          ...v,
          currentTrip: activeTrip.length > 0 ? {
            id: activeTrip[0].id,
            routeName: activeTrip[0].routeName,
            status: activeTrip[0].status,
            driverName: activeTrip[0].driverName,
          } : null,
        };
      }));

      res.json(vehiclesWithTrips);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/drivers", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      let perf;
      if (allIds.length > 0) {
        const unionTrips = await db.select({ id: tripSheets.id }).from(tripSheets).where(inArray(tripSheets.unionId, allIds));
        const unionTripIds = unionTrips.map(t => t.id);
        if (unionTripIds.length > 0) {
          perf = await db.select().from(driverPerformance)
            .where(inArray(driverPerformance.tripId, unionTripIds))
            .orderBy(desc(driverPerformance.overallScore));
        } else {
          perf = [];
        }
      } else {
        perf = await db.select().from(driverPerformance).orderBy(desc(driverPerformance.overallScore));
      }
      res.json(perf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/live-tracking", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      const allIds = unionId ? getAllIdsForMerchant(unionId) : [];
      const statusConditions = or(eq(tripSheets.status, "In Progress"), eq(tripSheets.status, "Planned"), eq(tripSheets.status, "In-Progress"));
      const activeTrips = allIds.length > 0
        ? await db.select().from(tripSheets).where(and(inArray(tripSheets.unionId, allIds), statusConditions))
        : await db.select().from(tripSheets).where(statusConditions);

      const trackingData = [];
      for (const trip of activeTrips) {
        const points = await db.select().from(transportRoutePoints)
          .where(eq(transportRoutePoints.tripId, trip.id))
          .orderBy(asc(transportRoutePoints.sequenceNo));

        let lastLocation = null;
        if (trip.driverId) {
          const locations = await db.select().from(driverLocations)
            .where(eq(driverLocations.driverId, trip.driverId))
            .orderBy(desc(driverLocations.createdAt))
            .limit(1);
          if (locations.length > 0) {
            lastLocation = {
              lat: locations[0].latitude,
              lng: locations[0].longitude,
              speed: locations[0].speed,
              updatedAt: locations[0].createdAt,
            };
          }
        }

        const deliveredStops = points.filter(p => p.status === 'delivered').length;
        const totalBags = points.reduce((sum, p) => sum + (p.bagsToDeliver || 0), 0);

        trackingData.push({
          trip: {
            id: trip.id,
            tripId: trip.tripId,
            routeName: trip.routeName,
            vehicleNo: trip.vehicleNo,
            driverName: trip.driverName,
            driverPhone: trip.driverPhone,
            status: trip.status,
            segment: trip.segment,
            startTime: trip.startTime,
            etaTime: trip.etaTime,
          },
          stops: points.map(p => ({ id: p.id, lat: Number(p.lat), lng: Number(p.lng), locationName: p.locationName, status: p.status, bagsToDeliver: p.bagsToDeliver })),
          lastLocation,
          summary: {
            totalStops: points.length,
            deliveredStops,
            pendingStops: points.length - deliveredStops,
            totalBags,
            progress: points.length > 0 ? Math.round((deliveredStops / points.length) * 100) : 0,
          },
        });
      }

      res.json({
        tracking: trackingData,
        timestamp: new Date().toISOString(),
        depot: { lat: DEPOT_LAT, lng: DEPOT_LNG },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== STRICT DISPATCH & CLOSE TRIP API (T003) ====================

  async function requireTransportOrAdminAuth(req: Request, res: Response, next: NextFunction) {
    const transportToken = req.cookies?.transport_token;
    const authToken = req.cookies?.auth_token;

    if (transportToken) {
      const payload = verifyToken(transportToken);
      if (payload && payload.transportManagerId) {
        const staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.id, payload.transportManagerId) });
        if (staff) {
          (req as any).transportAuth = {
            type: 'transport_manager',
            id: staff.id,
            unionId: staff.unionId,
            name: staff.name,
          };
          return next();
        }
      }
    }

    if (authToken) {
      const payload = verifyToken(authToken);
      if (payload) {
        if (payload.role === 'merchant' || payload.role === 'merchant_subuser' || payload.role === 'merchant_staff') {
          return res.status(403).json({ error: 'Merchant accounts have read-only access to transport operations. Only Transport Managers or Admins can dispatch/close trips.' });
        }
        if (payload.userId) {
          const user = await storage.getUser(payload.userId);
          if (user && user.role === 'admin') {
            const isGlobal = user.email === 'aavincart@gmail.com' || !payload.isSubUser;
            (req as any).transportAuth = {
              type: 'admin',
              id: user.id,
              unionId: isGlobal ? null : (payload.parentId || (user as any).merchantId || null),
              name: user.name,
              isGlobalAdmin: isGlobal && !payload.isSubUser,
            };
            return next();
          }
        }
        if (payload.staffId) {
          const staff = await db.query.unionStaff.findFirst({ where: eq(unionStaff.id, payload.staffId) });
          if (staff) {
            const desigId = (staff.designationId || '').toLowerCase();
            const dept = (staff.department || '').toLowerCase();
            const isTransport = TRANSPORT_DESIGNATIONS.includes(desigId) ||
              TRANSPORT_DEPARTMENTS.includes(dept) ||
              desigId.includes('transport') || desigId.includes('delivery');
            if (isTransport) {
              (req as any).transportAuth = {
                type: 'transport_manager',
                id: staff.id,
                unionId: staff.unionId,
                name: staff.name,
              };
              return next();
            }
          }
        }
      }
    }

    return res.status(401).json({ error: 'Authentication required. Use transport_token or admin auth_token.' });
  }

  function getTransportUnionScope(req: Request): { isGlobalAdmin: boolean; unionId: string | null } {
    const auth = (req as any).transportAuth;
    if (!auth) return { isGlobalAdmin: false, unionId: null };
    if (auth.isGlobalAdmin) return { isGlobalAdmin: true, unionId: null };
    return { isGlobalAdmin: false, unionId: auth.unionId || null };
  }

  app.post("/api/transport/dispatch/:tripId", requireTransportOrAdminAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) return res.status(400).json({ error: "Invalid trip ID" });

      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.id, tripId));
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const scope = getTransportUnionScope(req);
      if (!scope.isGlobalAdmin && scope.unionId && trip.unionId) {
        const validIds = getAllIdsForMerchant(scope.unionId);
        if (!validIds.includes(trip.unionId)) {
          return res.status(403).json({ error: "Access denied: trip belongs to a different union" });
        }
      }

      const reasons: string[] = [];

      if (!trip.driverName && !trip.driverId) {
        reasons.push("No driver assigned");
      }

      if (!trip.vehicleNo) {
        reasons.push("No vehicle assigned");
      }

      const jobs = await db.select().from(deliveryJobs).where(eq(deliveryJobs.tripId, trip.id));

      if (jobs.length === 0) {
        reasons.push("Trip has 0 delivery jobs");
      }

      for (const job of jobs) {
        if (job.deliveryType === "bulk") {
          const isManualBill = job.sourceType === 'manual_bill';

          if (!job.gstInvoiceGenerated && !isManualBill) {
            reasons.push(`Job ${job.jobId} missing invoice`);
          }

          if (!isManualBill) {
            const lat = job.deliveryLat ? String(job.deliveryLat).trim() : '';
            const lng = job.deliveryLng ? String(job.deliveryLng).trim() : '';
            if (!lat || !lng || lat === '0' || lng === '0') {
              reasons.push(`Job ${job.jobId} missing delivery coordinates (lat/lng)`);
            }
          }

          if (job.ewayBillRequired && !job.ewayBillGenerated) {
            reasons.push(`Job ${job.jobId} requires E-way Bill (order >= ₹50,000)`);
          }
        }
      }

      if (reasons.length > 0) {
        return res.json({ blocked: true, reasons });
      }

      const [updated] = await db.update(tripSheets).set({
        status: 'In Progress',
        updatedAt: new Date(),
      }).where(eq(tripSheets.id, tripId)).returning();

      res.json({ success: true, trip: updated });
    } catch (e: any) {
      console.error('Dispatch trip error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/transport/close-trip/:tripId", requireTransportOrAdminAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) return res.status(400).json({ error: "Invalid trip ID" });

      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.id, tripId));
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const scope = getTransportUnionScope(req);
      if (!scope.isGlobalAdmin && scope.unionId && trip.unionId) {
        const validIds = getAllIdsForMerchant(scope.unionId);
        if (!validIds.includes(trip.unionId)) {
          return res.status(403).json({ error: "Access denied: trip belongs to a different union" });
        }
      }

      const points = await db.select().from(transportRoutePoints)
        .where(eq(transportRoutePoints.tripId, trip.id));

      const pendingStops = points.filter(p => p.status !== 'delivered' && p.status !== 'failed');
      if (pendingStops.length > 0) {
        return res.json({ blocked: true, reason: `${pendingStops.length} stops still pending` });
      }

      const delivered_count = points.filter(p => p.status === 'delivered').length;
      const failed_count = points.filter(p => p.status === 'failed').length;
      const total = delivered_count + failed_count;
      const completion_rate = total > 0 ? Math.round((delivered_count / total) * 10000) / 100 : 0;

      const updateData: any = {
        status: 'Completed',
        actualEndTime: new Date().toTimeString().slice(0, 5),
        completedDropPoints: delivered_count,
        updatedAt: new Date(),
      };

      const [updated] = await db.update(tripSheets).set(updateData).where(eq(tripSheets.id, tripId)).returning();

      const scores = computeDriverScore({ ...updated, completedDropPoints: delivered_count });
      const performanceScore = scores.score;

      await db.update(tripSheets)
        .set({ performanceScore: String(performanceScore) })
        .where(eq(tripSheets.id, tripId));

      if (trip.driverName) {
        await db.insert(driverPerformance).values({
          driverName: trip.driverName,
          driverPhone: trip.driverPhone,
          tripId: trip.id,
          tripCode: trip.tripId,
          score: String(scores.score),
          dropScore: String(scores.dropScore),
          timeScore: String(scores.timeScore),
          capacityScore: String(scores.capacityScore),
          qualityScore: String(scores.qualityScore),
        });
      }

      res.json({
        success: true,
        trip: { ...updated, performanceScore: String(performanceScore) },
        summary: { delivered_count, failed_count, completion_rate },
        performanceScore,
      });
    } catch (e: any) {
      console.error('Close trip error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/delivery-jobs", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      if (!unionId) return res.status(403).json({ error: "No union assigned" });
      const allIds = getAllIdsForMerchant(unionId);
      const { status, deliveryType } = req.query;
      let conditions: any[] = [inArray(deliveryJobs.merchantId, allIds)];
      if (status) conditions.push(eq(deliveryJobs.status, status as string));
      if (deliveryType) conditions.push(eq(deliveryJobs.deliveryType, deliveryType as string));

      const jobs = await db.select().from(deliveryJobs).where(and(...conditions)).orderBy(desc(deliveryJobs.createdAt));
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/transport-manager/vehicles-list", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      if (!unionId) return res.status(403).json({ error: "No union assigned" });
      const allIds = getAllIdsForMerchant(unionId);
      const allVehicles = await db.select().from(vehicles).where(inArray(vehicles.merchantId, allIds));
      res.json(allVehicles);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/transport-manager/create-trip", requireTransportAuth, async (req, res) => {
    try {
      const mgr = (req as any).transportManager;
      const unionId = mgr.unionId;
      if (!unionId) return res.status(403).json({ error: "No union assigned" });
      const allIds = getAllIdsForMerchant(unionId);
      const { jobIds, vehicleId, routeName, segment, shift } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: "Select at least one delivery job" });
      }
      if (!vehicleId) {
        return res.status(400).json({ error: "Select a vehicle" });
      }

      const vehicle = await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), inArray(vehicles.merchantId, allIds))).limit(1);
      if (vehicle.length === 0) {
        return res.status(404).json({ error: "Vehicle not found or not in your union" });
      }
      const v = vehicle[0];

      const jobs = await db.select().from(deliveryJobs).where(and(inArray(deliveryJobs.id, jobIds), inArray(deliveryJobs.merchantId, allIds), eq(deliveryJobs.status, 'ready_for_trip')));
      if (jobs.length === 0) {
        return res.status(404).json({ error: "No eligible delivery jobs found (must be ready_for_trip and in your union)" });
      }
      if (jobs.length !== jobIds.length) {
        const foundIds = jobs.map(j => j.id);
        const missing = jobIds.filter((id: number) => !foundIds.includes(id));
        return res.status(400).json({ error: `${missing.length} job(s) are not eligible — they may already be assigned or belong to another union` });
      }

      const today = new Date().toISOString().split('T')[0];
      const existing = await db.select().from(tripSheets).where(eq(tripSheets.date, today));
      const seq = existing.length + 1;
      const tripId = generateTripId('HUB', today, seq);

      const jobSegment = segment || jobs[0].segment || 'Fresh Milk';
      const jobShift = shift || 'AM';
      const tripRouteName = routeName || `${jobSegment} - ${jobShift} Route ${seq}`;

      const primaryUnionId = allIds.find(id => id.startsWith('UNI-') || id.startsWith('FED-')) || unionId || 'federation';

      const [trip] = await db.insert(tripSheets).values({
        tripId,
        date: today,
        shift: jobShift,
        segment: jobSegment,
        routeName: tripRouteName,
        vehicleNo: v.vehicleNumber,
        vehicleId: String(v.id),
        driverName: v.driverName || '',
        driverPhone: v.driverPhone || '',
        unionId: primaryUnionId,
        plannedDropPoints: jobs.length,
        completedDropPoints: 0,
        bagsPlanned: jobs.reduce((s, j) => s + (j.totalBags || 0), 0),
        bagsLoaded: 0,
        capacityBags: v.capacity || 120,
        hubName: 'Default Hub',
        hubId: 1,
        status: 'Planned',
      }).returning();

      for (const job of jobs) {
        await db.update(deliveryJobs).set({ status: 'assigned', tripId: trip.id }).where(eq(deliveryJobs.id, job.id));
      }

      let seqNo = 1;
      for (const job of jobs) {
        await db.insert(transportRoutePoints).values({
          tripId: trip.id,
          sequenceNo: seqNo++,
          locationName: job.customerName || `Stop ${seqNo}`,
          lat: job.deliveryLat || '0',
          lng: job.deliveryLng || '0',
          bagsToDeliver: job.totalBags || 0,
          status: 'pending',
          notes: `Job: ${job.jobId} | ${job.deliveryAddress || ''}`,
        });
      }

      res.json({ success: true, trip, assignedJobs: jobs.length });
    } catch (e: any) {
      console.error('Create trip error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== END TRANSPORT MANAGER PWA API ====================

  function buildGoogleMapsUrl(stops: { lat: number; lng: number }[]): string {
    if (stops.length === 0) return '';
    const origin = `${DEPOT_LAT},${DEPOT_LNG}`;
    const dest = origin;
    const waypoints = stops.map(s => `${s.lat},${s.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
  }

  // ===== BULK INVOICES API =====

}
