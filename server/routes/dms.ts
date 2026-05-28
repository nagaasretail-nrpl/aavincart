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

export async function registerDmsRoutes(app: Express): Promise<void> {
  app.get("/api/inventory-batches/alerts/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const allBatches = await db.select().from(inventoryBatches).where(eq(inventoryBatches.merchantId, merchantId));
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const reorderAlerts = allBatches.filter(b => b.reorderLevel && b.quantity <= b.reorderLevel);
      const expiryAlerts = allBatches.filter(b => b.expiryDate && new Date(b.expiryDate) <= sevenDaysFromNow);
      res.json({ reorderAlerts, expiryAlerts });
    } catch (error) {
      console.error("Inventory alerts error:", error);
      res.status(500).json({ error: "Failed to get inventory alerts" });
    }
  });

  app.get("/api/inventory-batches/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { segment } = req.query;
      const conditions: any[] = [eq(inventoryBatches.merchantId, merchantId)];
      if (segment) conditions.push(eq(inventoryBatches.segment, segment as string));
      const batches = await db.select().from(inventoryBatches).where(and(...conditions)).orderBy(desc(inventoryBatches.createdAt));
      res.json(batches);
    } catch (error) {
      console.error("List inventory batches error:", error);
      res.status(500).json({ error: "Failed to list inventory batches" });
    }
  });

  app.post("/api/inventory-batches", async (req, res) => {
    try {
      const [batch] = await db.insert(inventoryBatches).values(req.body).returning();
      res.status(201).json(batch);
    } catch (error) {
      console.error("Create inventory batch error:", error);
      res.status(500).json({ error: "Failed to create inventory batch" });
    }
  });

  app.patch("/api/inventory-batches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(inventoryBatches).set({ ...req.body, updatedAt: new Date() }).where(eq(inventoryBatches.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Batch not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update inventory batch error:", error);
      res.status(500).json({ error: "Failed to update inventory batch" });
    }
  });

  // --- 2. GRN (Goods Receipt Notes) API ---
  app.get("/api/grn/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      if (merchantId.length > 10) {
        const [grn] = await db.select().from(goodsReceiptNotes).where(eq(goodsReceiptNotes.id, merchantId));
        if (!grn) return res.status(404).json({ error: "GRN not found" });
        return res.json(grn);
      }
      const grns = await db.select().from(goodsReceiptNotes).where(eq(goodsReceiptNotes.merchantId, merchantId)).orderBy(desc(goodsReceiptNotes.createdAt));
      res.json(grns);
    } catch (error) {
      console.error("List GRNs error:", error);
      res.status(500).json({ error: "Failed to list GRNs" });
    }
  });

  app.get("/api/grn/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [grn] = await db.select().from(goodsReceiptNotes).where(eq(goodsReceiptNotes.id, id));
      if (!grn) return res.status(404).json({ error: "GRN not found" });
      res.json(grn);
    } catch (error) {
      console.error("Get GRN error:", error);
      res.status(500).json({ error: "Failed to get GRN" });
    }
  });

  app.post("/api/grn", async (req, res) => {
    try {
      const grnNumber = `GRN-${Date.now()}`;
      const [grn] = await db.insert(goodsReceiptNotes).values({ ...req.body, grnNumber }).returning();
      res.status(201).json(grn);
    } catch (error) {
      console.error("Create GRN error:", error);
      res.status(500).json({ error: "Failed to create GRN" });
    }
  });

  app.patch("/api/grn/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy } = req.body;
      const [updated] = await db.update(goodsReceiptNotes).set({ status, approvedBy, approvedAt: new Date(), updatedAt: new Date() }).where(eq(goodsReceiptNotes.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "GRN not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update GRN status error:", error);
      res.status(500).json({ error: "Failed to update GRN status" });
    }
  });

  // --- 3. Sales Returns API ---
  app.get("/api/sales-returns/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      if (merchantId.length > 10) {
        const [ret] = await db.select().from(salesReturns).where(eq(salesReturns.id, merchantId));
        if (!ret) return res.status(404).json({ error: "Return not found" });
        return res.json(ret);
      }
      const returns = await db.select().from(salesReturns).where(eq(salesReturns.merchantId, merchantId)).orderBy(desc(salesReturns.createdAt));
      res.json(returns);
    } catch (error) {
      console.error("List sales returns error:", error);
      res.status(500).json({ error: "Failed to list sales returns" });
    }
  });

  app.get("/api/sales-returns/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [ret] = await db.select().from(salesReturns).where(eq(salesReturns.id, id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      res.json(ret);
    } catch (error) {
      console.error("Get sales return error:", error);
      res.status(500).json({ error: "Failed to get sales return" });
    }
  });

  app.post("/api/sales-returns", async (req, res) => {
    try {
      const returnNumber = `RET-${Date.now()}`;
      const [ret] = await db.insert(salesReturns).values({ ...req.body, returnNumber }).returning();
      res.status(201).json(ret);
    } catch (error) {
      console.error("Create sales return error:", error);
      res.status(500).json({ error: "Failed to create sales return" });
    }
  });

  app.patch("/api/sales-returns/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy, rejectionReason } = req.body;
      const updateData: any = { status, approvedBy, approvedAt: new Date(), updatedAt: new Date() };
      if (status === "approved") {
        updateData.creditNoteNumber = `CN-${Date.now()}`;
        updateData.creditNoteAmount = req.body.creditNoteAmount;
      }
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      const [updated] = await db.update(salesReturns).set(updateData).where(eq(salesReturns.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Return not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update sales return status error:", error);
      res.status(500).json({ error: "Failed to update sales return status" });
    }
  });

  // --- 4. Collections API ---
  app.get("/api/collections/summary/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayCollections = await db.select().from(collectionsTable)
        .where(and(eq(collectionsTable.merchantId, merchantId), gte(collectionsTable.collectionDate, today), lte(collectionsTable.collectionDate, tomorrow)));
      const summary: Record<string, { count: number; total: number }> = {};
      for (const c of dayCollections) {
        if (!summary[c.paymentMode]) summary[c.paymentMode] = { count: 0, total: 0 };
        summary[c.paymentMode].count++;
        summary[c.paymentMode].total += parseFloat(c.amount);
      }
      const grandTotal = Object.values(summary).reduce((acc, v) => acc + v.total, 0);
      res.json({ date: today.toISOString().split("T")[0], summary, grandTotal, totalTransactions: dayCollections.length });
    } catch (error) {
      console.error("Collections summary error:", error);
      res.status(500).json({ error: "Failed to get collections summary" });
    }
  });

  app.get("/api/collections/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { paymentMode } = req.query;
      const conditions: any[] = [eq(collectionsTable.merchantId, merchantId)];
      if (paymentMode) conditions.push(eq(collectionsTable.paymentMode, paymentMode as string));
      const cols = await db.select().from(collectionsTable).where(and(...conditions)).orderBy(desc(collectionsTable.createdAt));
      res.json(cols);
    } catch (error) {
      console.error("List collections error:", error);
      res.status(500).json({ error: "Failed to list collections" });
    }
  });

  app.post("/api/collections", async (req, res) => {
    try {
      const [col] = await db.insert(collectionsTable).values(req.body).returning();
      res.status(201).json(col);
    } catch (error) {
      console.error("Create collection error:", error);
      res.status(500).json({ error: "Failed to create collection" });
    }
  });

  // --- 5. Outstanding Ledger API ---
  app.get("/api/outstanding/aging/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const entries = await db.select().from(outstandingLedger)
        .where(and(eq(outstandingLedger.merchantId, merchantId), eq(outstandingLedger.status, "unpaid")));
      const now = new Date();
      const aging = { "0-30": { count: 0, total: 0 }, "31-60": { count: 0, total: 0 }, "61-90": { count: 0, total: 0 }, "90+": { count: 0, total: 0 } };
      for (const e of entries) {
        const invoiceDate = e.invoiceDate ? new Date(e.invoiceDate) : new Date(e.createdAt!);
        const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = parseFloat(e.balanceAmount);
        if (daysDiff <= 30) { aging["0-30"].count++; aging["0-30"].total += balance; }
        else if (daysDiff <= 60) { aging["31-60"].count++; aging["31-60"].total += balance; }
        else if (daysDiff <= 90) { aging["61-90"].count++; aging["61-90"].total += balance; }
        else { aging["90+"].count++; aging["90+"].total += balance; }
      }
      const totalOutstanding = Object.values(aging).reduce((acc, v) => acc + v.total, 0);
      res.json({ aging, totalOutstanding, totalEntries: entries.length });
    } catch (error) {
      console.error("Outstanding aging error:", error);
      res.status(500).json({ error: "Failed to get aging analysis" });
    }
  });

  app.get("/api/outstanding/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { status } = req.query;
      const conditions: any[] = [eq(outstandingLedger.merchantId, merchantId)];
      if (status) conditions.push(eq(outstandingLedger.status, status as string));
      const entries = await db.select().from(outstandingLedger).where(and(...conditions)).orderBy(desc(outstandingLedger.createdAt));
      res.json(entries);
    } catch (error) {
      console.error("List outstanding error:", error);
      res.status(500).json({ error: "Failed to list outstanding entries" });
    }
  });

  app.post("/api/outstanding", async (req, res) => {
    try {
      const [entry] = await db.insert(outstandingLedger).values(req.body).returning();
      res.status(201).json(entry);
    } catch (error) {
      console.error("Create outstanding error:", error);
      res.status(500).json({ error: "Failed to create outstanding entry" });
    }
  });

  app.patch("/api/outstanding/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentAmount } = req.body;
      const [existing] = await db.select().from(outstandingLedger).where(eq(outstandingLedger.id, id));
      if (!existing) return res.status(404).json({ error: "Outstanding entry not found" });
      const newPaid = parseFloat(existing.paidAmount) + parseFloat(paymentAmount);
      const newBalance = parseFloat(existing.invoiceAmount) - newPaid;
      const newStatus = newBalance <= 0 ? "paid" : "partial";
      const [updated] = await db.update(outstandingLedger).set({
        paidAmount: newPaid.toFixed(2),
        balanceAmount: Math.max(0, newBalance).toFixed(2),
        status: newStatus,
        updatedAt: new Date(),
      }).where(eq(outstandingLedger.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Record payment error:", error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  // --- Credit Business Ledger Report API ---
  app.get("/api/credit-ledger/report", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate, customer, office, segment } = req.query;
      const user = req.user as any;
      let merchantId = req.query.merchantId as string || '';

      if (user) {
        if (user.merchantId) merchantId = user.merchantId;
        else if (user.role === 'admin' && !merchantId) merchantId = '';
        else if (user.unionId) merchantId = user.unionId;
      }

      const creditConditions: any[] = [eq(ordersTable.isCredit, true)];
      if (merchantId) creditConditions.push(eq(ordersTable.restaurantId, merchantId));
      if (startDate) creditConditions.push(gte(ordersTable.createdAt, new Date(startDate as string)));
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        creditConditions.push(lte(ordersTable.createdAt, end));
      }
      if (segment) creditConditions.push(eq(ordersTable.productSegment, segment as string));
      if (customer) creditConditions.push(
        or(
          sql`${ordersTable.customerName} ILIKE ${'%' + customer + '%'}`,
          sql`${ordersTable.customerEmail} ILIKE ${'%' + customer + '%'}`,
          sql`${ordersTable.customerPhone} ILIKE ${'%' + customer + '%'}`
        )
      );

      const creditOrders = await db.select().from(ordersTable)
        .where(and(...creditConditions))
        .orderBy(desc(ordersTable.createdAt));

      const outstandingConditions: any[] = [];
      if (merchantId) outstandingConditions.push(eq(outstandingLedger.merchantId, merchantId));
      if (customer) outstandingConditions.push(
        sql`${outstandingLedger.customerName} ILIKE ${'%' + customer + '%'}`
      );

      const outstandingEntries = await db.select().from(outstandingLedger)
        .where(outstandingConditions.length > 0 ? and(...outstandingConditions) : undefined)
        .orderBy(desc(outstandingLedger.createdAt));

      const collectionConditions: any[] = [];
      if (merchantId) collectionConditions.push(eq(collectionsTable.merchantId, merchantId));
      if (startDate) collectionConditions.push(gte(collectionsTable.collectionDate, new Date(startDate as string)));
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        collectionConditions.push(lte(collectionsTable.collectionDate, end));
      }
      if (customer) collectionConditions.push(
        sql`${collectionsTable.customerName} ILIKE ${'%' + customer + '%'}`
      );

      const collectionEntries = await db.select().from(collectionsTable)
        .where(collectionConditions.length > 0 ? and(...collectionConditions) : undefined)
        .orderBy(desc(collectionsTable.createdAt));

      const totalCreditIssued = creditOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
      const totalCollected = collectionEntries.reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const totalOutstanding = outstandingEntries
        .filter(e => e.status !== 'paid')
        .reduce((sum, e) => sum + parseFloat(e.balanceAmount), 0);

      const now = new Date();
      const aging = { "0-30": { count: 0, total: 0 }, "31-60": { count: 0, total: 0 }, "61-90": { count: 0, total: 0 }, "90+": { count: 0, total: 0 } };
      const overdueTotal = { count: 0, total: 0 };
      for (const e of outstandingEntries) {
        if (e.status === 'paid') continue;
        const invoiceDate = e.invoiceDate ? new Date(e.invoiceDate) : new Date(e.createdAt!);
        const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = parseFloat(e.balanceAmount);
        if (daysDiff <= 30) { aging["0-30"].count++; aging["0-30"].total += balance; }
        else if (daysDiff <= 60) { aging["31-60"].count++; aging["31-60"].total += balance; }
        else if (daysDiff <= 90) { aging["61-90"].count++; aging["61-90"].total += balance; }
        else { aging["90+"].count++; aging["90+"].total += balance; }
        if (e.dueDate && new Date(e.dueDate) < now) {
          overdueTotal.count++;
          overdueTotal.total += balance;
        }
      }

      const customerMap: Record<string, { name: string; creditTotal: number; collected: number; outstanding: number; orders: number }> = {};
      for (const o of creditOrders) {
        const key = o.customerEmail || o.customerPhone || o.customerName;
        if (!customerMap[key]) customerMap[key] = { name: o.customerName, creditTotal: 0, collected: 0, outstanding: 0, orders: 0 };
        customerMap[key].creditTotal += parseFloat(o.total);
        customerMap[key].orders++;
      }
      for (const e of outstandingEntries) {
        const key = e.customerName || e.customerId;
        if (!customerMap[key]) customerMap[key] = { name: e.customerName || e.customerId, creditTotal: 0, collected: 0, outstanding: 0, orders: 0 };
        if (e.status !== 'paid') customerMap[key].outstanding += parseFloat(e.balanceAmount);
      }
      for (const c of collectionEntries) {
        const key = c.customerName || c.customerId;
        if (!customerMap[key]) customerMap[key] = { name: c.customerName || c.customerId, creditTotal: 0, collected: 0, outstanding: 0, orders: 0 };
        customerMap[key].collected += parseFloat(c.amount);
      }

      const customerSummaries = Object.entries(customerMap).map(([key, val]) => ({
        customerId: key,
        ...val,
      })).sort((a, b) => b.outstanding - a.outstanding);

      res.json({
        summary: {
          totalCreditIssued,
          totalCollected,
          totalOutstanding,
          overdue: overdueTotal,
          creditOrderCount: creditOrders.length,
          collectionCount: collectionEntries.length,
          outstandingCount: outstandingEntries.filter(e => e.status !== 'paid').length,
        },
        aging,
        customerSummaries,
        recentCreditOrders: creditOrders.slice(0, 50),
        recentCollections: collectionEntries.slice(0, 50),
        outstandingEntries: outstandingEntries.filter(e => e.status !== 'paid').slice(0, 100),
      });
    } catch (error) {
      console.error("Credit ledger report error:", error);
      res.status(500).json({ error: "Failed to generate credit ledger report" });
    }
  });

  // --- 6. Schemes API ---
  app.get("/api/schemes/applicable", async (req, res) => {
    try {
      const { merchantId, role, segment, cartTotal, cartItems } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId is required" });
      const now = new Date();
      const allSchemes = await db.select().from(schemes)
        .where(and(eq(schemes.merchantId, merchantId as string), eq(schemes.isActive, true)));
      const applicable = allSchemes.filter(s => {
        if (new Date(s.startDate) > now || new Date(s.endDate) < now) return false;
        if (s.applicableRoles && Array.isArray(s.applicableRoles) && (s.applicableRoles as string[]).length > 0) {
          if (role && !(s.applicableRoles as string[]).includes(role as string)) return false;
        }
        if (segment && s.segment && s.segment !== segment) return false;
        if (s.minValue && cartTotal && parseFloat(cartTotal as string) < parseFloat(s.minValue)) return false;
        return true;
      });
      res.json(applicable);
    } catch (error) {
      console.error("Applicable schemes error:", error);
      res.status(500).json({ error: "Failed to get applicable schemes" });
    }
  });

  app.get("/api/schemes/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { active } = req.query;
      const conditions: any[] = [eq(schemes.merchantId, merchantId)];
      if (active === "true") conditions.push(eq(schemes.isActive, true));
      const result = await db.select().from(schemes).where(and(...conditions)).orderBy(desc(schemes.createdAt));
      res.json(result);
    } catch (error) {
      console.error("List schemes error:", error);
      res.status(500).json({ error: "Failed to list schemes" });
    }
  });

  app.post("/api/schemes", async (req, res) => {
    try {
      const [scheme] = await db.insert(schemes).values(req.body).returning();
      res.status(201).json(scheme);
    } catch (error) {
      console.error("Create scheme error:", error);
      res.status(500).json({ error: "Failed to create scheme" });
    }
  });

  app.patch("/api/schemes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(schemes).set({ ...req.body, updatedAt: new Date() }).where(eq(schemes.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Scheme not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update scheme error:", error);
      res.status(500).json({ error: "Failed to update scheme" });
    }
  });

  app.delete("/api/schemes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(schemes).set({ isActive: false, updatedAt: new Date() }).where(eq(schemes.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Scheme not found" });
      res.json(updated);
    } catch (error) {
      console.error("Deactivate scheme error:", error);
      res.status(500).json({ error: "Failed to deactivate scheme" });
    }
  });

  // --- 7. Staff Attendance API ---
  app.get("/api/staff-attendance/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { date, staffId } = req.query;
      const conditions: any[] = [eq(staffAttendance.merchantId, merchantId)];
      if (staffId) conditions.push(eq(staffAttendance.staffId, staffId as string));
      if (date) {
        const d = new Date(date as string);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        conditions.push(gte(staffAttendance.date, d));
        conditions.push(lte(staffAttendance.date, next));
      }
      const records = await db.select().from(staffAttendance).where(and(...conditions)).orderBy(desc(staffAttendance.date));
      res.json(records);
    } catch (error) {
      console.error("List staff attendance error:", error);
      res.status(500).json({ error: "Failed to list staff attendance" });
    }
  });

  app.post("/api/staff-attendance/check-in", async (req, res) => {
    try {
      const { staffId, merchantId, checkInLat, checkInLng, checkInSelfie } = req.body;
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const [record] = await db.insert(staffAttendance).values({
        staffId, merchantId, date: today, checkInTime: now,
        checkInLat, checkInLng, checkInSelfie, status: "present",
      }).returning();
      res.status(201).json(record);
    } catch (error) {
      console.error("Staff check-in error:", error);
      res.status(500).json({ error: "Failed to record check-in" });
    }
  });

  app.patch("/api/staff-attendance/:id/check-out", async (req, res) => {
    try {
      const { id } = req.params;
      const { checkOutLat, checkOutLng, checkOutSelfie } = req.body;
      const now = new Date();
      const [existing] = await db.select().from(staffAttendance).where(eq(staffAttendance.id, id));
      if (!existing) return res.status(404).json({ error: "Attendance record not found" });
      let totalHours: string | undefined;
      if (existing.checkInTime) {
        const diffMs = now.getTime() - new Date(existing.checkInTime).getTime();
        totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }
      const [updated] = await db.update(staffAttendance).set({
        checkOutTime: now, checkOutLat, checkOutLng, checkOutSelfie, totalHours,
      }).where(eq(staffAttendance.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Staff check-out error:", error);
      res.status(500).json({ error: "Failed to record check-out" });
    }
  });

  app.post("/api/staff-attendance/leave", async (req, res) => {
    try {
      const { staffId, merchantId, date, leaveType, leaveReason } = req.body;
      const leaveDate = new Date(date);
      leaveDate.setHours(0, 0, 0, 0);
      const [record] = await db.insert(staffAttendance).values({
        staffId, merchantId, date: leaveDate, status: "leave", leaveType, leaveReason,
      }).returning();
      res.status(201).json(record);
    } catch (error) {
      console.error("Apply leave error:", error);
      res.status(500).json({ error: "Failed to apply for leave" });
    }
  });

  // --- 8. Beat Plans API ---
  app.get("/api/beat-plans/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { staffId } = req.query;
      const conditions: any[] = [eq(beatPlans.merchantId, merchantId)];
      if (staffId) conditions.push(eq(beatPlans.staffId, staffId as string));
      const plans = await db.select().from(beatPlans).where(and(...conditions)).orderBy(desc(beatPlans.createdAt));
      res.json(plans);
    } catch (error) {
      console.error("List beat plans error:", error);
      res.status(500).json({ error: "Failed to list beat plans" });
    }
  });

  app.post("/api/beat-plans", async (req, res) => {
    try {
      const [plan] = await db.insert(beatPlans).values(req.body).returning();
      res.status(201).json(plan);
    } catch (error) {
      console.error("Create beat plan error:", error);
      res.status(500).json({ error: "Failed to create beat plan" });
    }
  });

  app.patch("/api/beat-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(beatPlans).set(req.body).where(eq(beatPlans.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Beat plan not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update beat plan error:", error);
      res.status(500).json({ error: "Failed to update beat plan" });
    }
  });

  app.delete("/api/beat-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(beatPlans).where(eq(beatPlans.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Beat plan not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete beat plan error:", error);
      res.status(500).json({ error: "Failed to delete beat plan" });
    }
  });

  // --- 9. Outlet Visits API ---
  app.get("/api/outlet-visits/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { staffId, date } = req.query;
      const conditions: any[] = [eq(outletVisits.merchantId, merchantId)];
      if (staffId) conditions.push(eq(outletVisits.staffId, staffId as string));
      if (date) {
        const d = new Date(date as string);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        conditions.push(gte(outletVisits.visitDate, d));
        conditions.push(lte(outletVisits.visitDate, next));
      }
      const visits = await db.select().from(outletVisits).where(and(...conditions)).orderBy(desc(outletVisits.createdAt));
      res.json(visits);
    } catch (error) {
      console.error("List outlet visits error:", error);
      res.status(500).json({ error: "Failed to list outlet visits" });
    }
  });

  app.post("/api/outlet-visits", async (req, res) => {
    try {
      const [visit] = await db.insert(outletVisits).values(req.body).returning();
      res.status(201).json(visit);
    } catch (error) {
      console.error("Create outlet visit error:", error);
      res.status(500).json({ error: "Failed to create outlet visit" });
    }
  });

  // --- 10. Vehicles API ---
  app.get("/api/vehicles/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const segment = req.query.segment as string | undefined;
      const allIds = getAllIdsForMerchant(merchantId);
      const conditions: any[] = merchantId === 'federation' ? [] : [inArray(vehicles.merchantId, allIds)];

      if (segment) {
        const segmentLower = segment.toLowerCase().replace(/\s+/g, '_');
        let compatibleTypes: string[] = [];
        if (segmentLower === 'ice_cream' || segment === 'Ice Cream') {
          compatibleTypes = ['frozen', 'insulated'];
        } else if (segmentLower === 'fresh_milk' || segment === 'Fresh Milk') {
          compatibleTypes = ['refrigerated', 'frozen'];
        }
        if (compatibleTypes.length > 0) {
          conditions.push(inArray(vehicles.vehicleType, compatibleTypes));
        }
      }

      const vlist = conditions.length > 0
        ? await db.select().from(vehicles).where(and(...conditions)).orderBy(desc(vehicles.createdAt))
        : await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
      res.json(vlist);
    } catch (error) {
      console.error("List vehicles error:", error);
      res.status(500).json({ error: "Failed to list vehicles" });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const [vehicle] = await db.insert(vehicles).values(req.body).returning();
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Create vehicle error:", error);
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.driverUserId) {
        const driverUser = await storage.getUser(updateData.driverUserId);
        if (!driverUser) {
          return res.status(400).json({ error: "Driver user not found" });
        }
        if (driverUser.role !== 'driver') {
          return res.status(400).json({ error: "Selected user is not a driver account" });
        }
        updateData.driverName = driverUser.name;
        updateData.driverPhone = driverUser.phone || updateData.driverPhone || '';
      }
      const [updated] = await db.update(vehicles).set(updateData).where(eq(vehicles.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Vehicle not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update vehicle error:", error);
      res.status(500).json({ error: "Failed to update vehicle" });
    }
  });

  app.patch("/api/vehicles/:id/location", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentLat, currentLng } = req.body;
      const [updated] = await db.update(vehicles).set({ currentLat, currentLng, lastLocationUpdate: new Date(), updatedAt: new Date() }).where(eq(vehicles.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Vehicle not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update vehicle location error:", error);
      res.status(500).json({ error: "Failed to update vehicle location" });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(vehicles).set({ isActive: false, updatedAt: new Date() }).where(eq(vehicles.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Vehicle not found" });
      res.json(updated);
    } catch (error) {
      console.error("Deactivate vehicle error:", error);
      res.status(500).json({ error: "Failed to deactivate vehicle" });
    }
  });

  // --- 11. Pick Lists API ---
  app.get("/api/pick-lists/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const lists = await db.select().from(pickLists).where(eq(pickLists.merchantId, merchantId)).orderBy(desc(pickLists.createdAt));
      res.json(lists);
    } catch (error) {
      console.error("List pick lists error:", error);
      res.status(500).json({ error: "Failed to list pick lists" });
    }
  });

  app.post("/api/pick-lists", async (req, res) => {
    try {
      const pickListNumber = `PL-${Date.now()}`;
      const [pl] = await db.insert(pickLists).values({ ...req.body, pickListNumber }).returning();
      res.status(201).json(pl);
    } catch (error) {
      console.error("Create pick list error:", error);
      res.status(500).json({ error: "Failed to create pick list" });
    }
  });

  app.patch("/api/pick-lists/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updateData: any = { status, updatedAt: new Date() };
      if (status === "dispatched") updateData.dispatchedAt = new Date();
      if (status === "completed") updateData.completedAt = new Date();
      const [updated] = await db.update(pickLists).set(updateData).where(eq(pickLists.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Pick list not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update pick list status error:", error);
      res.status(500).json({ error: "Failed to update pick list status" });
    }
  });

  // --- 12. Tally Export API ---
}
