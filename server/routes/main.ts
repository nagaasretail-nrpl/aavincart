import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import compression from "compression";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull } from "drizzle-orm";
import { unionStaff, userAddresses, users as usersTable, agents as agentsTable, businessRoutes, deliveryPartners, b2bRegistrations, inventoryBatches, goodsReceiptNotes, salesReturns, collections as collectionsTable, outstandingLedger, schemes, staffAttendance, beatPlans, outletVisits, vehicles, pickLists, orders as ordersTable, userActivityLogs, deliveryShifts, deliveryWalletTransactions, kdsUsers, kdsSettings, deliveryPoints as deliveryPointsTable, tallyImportLogs, tallyLedgerRaw, tallyStockitemRaw, tallyVoucherRaw, deliveryRoutes, userHierarchy, invoiceSequences, transportHubs, tripSheets, loadManifests, transportRoutePoints, driverPerformance, butterMilkStops, driverLocations, bulkInvoices, deliveryJobs, gstFilingPeriods, upiTransactions, cashfreeSoftposTerminals, cashfreePaymentLinks, cashfreeBeneficiaries as cashfreeBeneficiariesTable, cashfreePayouts as cashfreePayoutsTable, bulkDeliveryLocations, manualBillBatches, manualBills, milkRouteAgents, milkDispatchEntries, milkAgentLedger, mmoOffices, mmoRoutes, mmoRouteAgents, insertMmoOfficeSchema, insertMmoRouteSchema, insertMmoRouteAgentSchema, auditLogs } from "@shared/schema";
import ExcelJS from "exceljs";


// Route module imports
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, getCached, setCache, invalidateCache } from "./utils";
import { requireAuth, requireRole, getUnionScope, logActivity, signToken, verifyToken, hashPassword, verifyPassword } from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, getAllIdsForMerchant, generateDeliveryJobId, validateDeliveryJob } from "./shared";

import { haversineDistance, groupIntoStops, optimizeRoute, checkVehicleCapacity, buildRouteSummary, generateTripSheetPDF, generateVehicleWiseTripSheetsPDF, generateOptimizedStopsExcelData, generateRouteSummaryExcelData, generateEditableStopsExcelData, generateTripsExcelData, calculateBags, computeFuel, capacityFromTons, splitAllRoutesIntoTrips, buildTripSummaries, splitByVehicleCount, parseDMSCoordinate, type GroupInput, type TripConfig, type TripSummary, DEFAULT_TRIP_CONFIG } from "../bulk-delivery-engine";
import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";
import { registerObjectStorageRoutes, objectStorageClient, ObjectStorageService } from "../replit_integrations/object_storage";
import { logAudit, diffObjects } from "../audit";

import { 
  insertOrderSchema, 
  insertRestaurantSchema, 
  insertMenuItemSchema, 
  insertUserSchema, 
  type User,
  // Karenderia schema imports
  insertMerchantSchema,
  insertClientSchema,
  insertItemSchema,
  insertPlanSchema,
  insertInvoiceSchema,
  insertPayoutSchema,
  insertReservationSchema,
  insertPromoSchema,
  insertNotificationSchema,
  insertEarningSchema,
  insertAttributeSchema,
  insertMarketingCampaignSchema,
  insertPaymentGatewaySchema,
  insertUpiTransactionSchema,
  insertPricingTierSchema,
  // E-way Bill imports
  insertEwayBillSchema,
  insertEwayBillConfigSchema,
  insertEwayBillLogSchema,
  insertHsnCodeSchema,
  INDIAN_STATE_CODES,
  // Agent imports
  insertAgentSchema,
  AGENT_TYPES,
  AGENT_PRICING_ROLES
} from "@shared/schema";
import { z } from "zod";
import { createHmac, timingSafeEqual, randomUUID, randomBytes } from "crypto";

import { registerAuthRoutes } from "./auth";
import { registerAdminRoutes } from "./admin";
import { registerStaffRoutes } from "./staff";
import { registerVerificationRoutes } from "./verification";
import { registerCatalogRoutes } from "./catalog";
import { registerCommerceRoutes } from "./commerce";
import { registerMerchantsExtRoutes } from "./merchants-ext";
import { registerPaymentsRoutes } from "./payments";
import { registerComplianceRoutes } from "./compliance";
import { registerLogisticsOpsRoutes } from "./logistics-ops";
import { registerErpSettingsRoutes } from "./erp-settings";
import { registerLegacyConsumerRoutes } from "./legacy-consumer";
import { registerDmsRoutes } from "./dms";
import { registerTallyRoutes } from "./tally";
import { registerTransportRoutes } from "./transport";

export async function registerMainRoutes(app: Express): Promise<void> {
  app.use(compression());

  // One-time DB backfill: copy union_id → restaurant_id for B2B users who only have union_id set
  db.execute(sql`
    UPDATE users
    SET restaurant_id = union_id
    WHERE union_id LIKE 'merchant-%'
      AND (restaurant_id IS NULL OR restaurant_id = '')
  `).then((result: any) => {
    const count = result?.rowCount ?? result?.rowsAffected ?? 0;
    if (count > 0) console.log(`[startup] Backfilled restaurant_id from union_id for ${count} users`);
  }).catch((err: any) => {
    console.error('[startup] restaurant_id backfill failed:', err.message);
  });

  // Security: force-logout Salem (merchant-3) if not already invalidated
  db.execute(sql`
    UPDATE merchants
    SET session_invalidated_at = NOW()
    WHERE id = 'merchant-3'
      AND (session_invalidated_at IS NULL)
  `).then((result: any) => {
    const count = result?.rowCount ?? result?.rowsAffected ?? 0;
    if (count > 0) console.log('[startup] Force-logout applied to Salem union (merchant-3) — all existing sessions invalidated');
  }).catch((err: any) => {
    console.error('[startup] Salem force-logout failed:', err.message);
  });

  registerObjectStorageRoutes(app);

  app.get("/download/aavin-cart-review.pptx", (_req, res) => {
    const filePath = path.join(process.cwd(), "generated", "aavin-cart-review.pptx");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Disposition", 'attachment; filename="Aavin-Cart-DMS-Review-2026.pptx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Report not generated yet" });
    }
  });

  // Authentication routes

  // Mount domain route modules
  await registerAuthRoutes(app);
  await registerAdminRoutes(app);
  await registerStaffRoutes(app);
  await registerVerificationRoutes(app);
  await registerCatalogRoutes(app);
  await registerCommerceRoutes(app);
  await registerMerchantsExtRoutes(app);
  await registerPaymentsRoutes(app);
  await registerComplianceRoutes(app);
  await registerLogisticsOpsRoutes(app);
  await registerErpSettingsRoutes(app);
  await registerLegacyConsumerRoutes(app);
  await registerDmsRoutes(app);
  await registerTallyRoutes(app);
  await registerTransportRoutes(app);

  // Remaining routes: bulk-invoices, eway-bill (transport), orders, cashfree (tail)
  app.get("/api/bulk-invoices/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { status, customerType, segment, startDate, endDate } = req.query;
      const conditions: any[] = [eq(bulkInvoices.merchantId, merchantId)];
      if (status) conditions.push(eq(bulkInvoices.status, status as string));
      if (customerType) conditions.push(eq(bulkInvoices.customerType, customerType as string));
      if (segment) conditions.push(eq(bulkInvoices.productSegment, segment as string));
      if (startDate) conditions.push(gte(bulkInvoices.createdAt, new Date(startDate as string)));
      if (endDate) conditions.push(lte(bulkInvoices.createdAt, new Date(endDate as string)));
      const results = await db.select().from(bulkInvoices).where(and(...conditions)).orderBy(desc(bulkInvoices.createdAt));
      res.json(results);
    } catch (error) {
      console.error("List bulk invoices error:", error);
      res.status(500).json({ error: "Failed to fetch bulk invoices" });
    }
  });

  app.get("/api/bulk-invoices/detail/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [invoice] = await db.select().from(bulkInvoices).where(eq(bulkInvoices.id, id));
      if (!invoice) return res.status(404).json({ error: "Bulk invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Get bulk invoice error:", error);
      res.status(500).json({ error: "Failed to fetch bulk invoice" });
    }
  });

  app.post("/api/bulk-invoices", async (req, res) => {
    try {
      const { merchantId, customerType, customerName, customerGstin, customerAddress, customerPhone, customerEmail, deliveryRequired, deliveryAddress, deliveryLat, deliveryLng, notes } = req.body;
      if (!merchantId || !customerName) {
        return res.status(400).json({ error: "merchantId and customerName are required" });
      }
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({ error: "At least one line item is required" });
      }

      const now = new Date();
      const fy = now.getMonth() >= 3 ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}` : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`;
      const [maxResult] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(bulkInvoices).where(eq(bulkInvoices.merchantId, merchantId));
      const seq = (maxResult?.maxId || 0) + 1;
      const invoiceNumber = `BI/${fy}/${String(seq).padStart(4, "0")}`;
      const items = req.body.items;
      let subtotal = 0;
      let gstAmount = 0;
      for (const item of items) {
        const lineAmount = parseFloat(item.unitPrice || 0) * (item.quantity || 1);
        const gstRate = parseFloat(item.gstRate || 0);
        const taxable = lineAmount / (1 + gstRate / 100);
        subtotal += taxable;
        gstAmount += lineAmount - taxable;
        item.amount = lineAmount;
      }
      const totalAmount = subtotal + gstAmount;
      const segments = [...new Set(items.map((i: any) => i.segment).filter(Boolean))];
      const productSegment = segments.length === 1 ? segments[0] : segments.length > 1 ? "Mixed" : "Mixed";

      const [invoice] = await db.insert(bulkInvoices).values({
        merchantId,
        customerType: customerType || "corporate",
        customerName,
        customerGstin: customerGstin || null,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        deliveryRequired: deliveryRequired !== false,
        deliveryAddress: deliveryAddress || null,
        deliveryLat: deliveryLat || null,
        deliveryLng: deliveryLng || null,
        notes: notes || null,
        invoiceNumber,
        items,
        subtotal: subtotal.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        productSegment,
        status: "draft",
      }).returning();
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create bulk invoice error:", error);
      res.status(500).json({ error: "Failed to create bulk invoice" });
    }
  });

  app.patch("/api/bulk-invoices/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const validTransitions: Record<string, string[]> = {
        draft: ["confirmed", "cancelled"],
        confirmed: ["dispatched", "cancelled"],
        dispatched: ["delivered"],
        delivered: [],
        cancelled: [],
      };
      const [current] = await db.select().from(bulkInvoices).where(eq(bulkInvoices.id, id));
      if (!current) return res.status(404).json({ error: "Bulk invoice not found" });
      if (!validTransitions[current.status]?.includes(status)) {
        return res.status(400).json({ error: `Cannot transition from '${current.status}' to '${status}'` });
      }
      const [updated] = await db.update(bulkInvoices)
        .set({ status, updatedAt: new Date() })
        .where(eq(bulkInvoices.id, id))
        .returning();

      if (status === "confirmed" && current.deliveryRequired) {
        try {
          const existingJob = await db.select().from(deliveryJobs)
            .where(and(eq(deliveryJobs.sourceType, "bulk_invoice"), eq(deliveryJobs.sourceId, id)));
          if (existingJob.length === 0) {
            const totalAmount = Number(current.totalAmount || 0);
            const ewayRequired = totalAmount >= 50000;
            const customerType = current.customerType || "corporate";
            let dispatchType = "BULK";
            if (customerType === "inter_union") dispatchType = "INTER_UNION";
            else if (customerType === "corporate" || customerType === "government") dispatchType = "CORPORATE";
            const seg = current.productSegment || "Products";
            const jobData: any = {
              jobId: generateDeliveryJobId(),
              sourceType: "bulk_invoice",
              sourceId: id,
              dispatchType,
              merchantId: current.merchantId,
              segment: seg,
              customerName: current.customerName,
              customerPhone: current.customerPhone || "",
              deliveryAddress: current.deliveryAddress || current.customerAddress || "",
              deliveryLat: String(current.deliveryLat || "0"),
              deliveryLng: String(current.deliveryLng || "0"),
              totalAmount: String(totalAmount),
              totalBags: Math.ceil(totalAmount / 500),
              totalWeightKg: String(Math.ceil(totalAmount / 500) * 13),
              temperatureRequired: seg === "Ice Cream",
              ewayBillRequired: ewayRequired,
              ewayBillGenerated: !!current.ewayBillId,
              gstInvoiceGenerated: true,
              paymentConfirmed: true,
            };
            const validation = validateDeliveryJob(jobData);
            jobData.status = validation.valid ? "ready_for_trip" : "validation_failed";
            jobData.validationErrors = validation.errors.length > 0 ? validation.errors : null;
            await db.insert(deliveryJobs).values(jobData);
          }
        } catch (e) { /* silent — delivery job creation is best-effort */ }
      }

      res.json(updated);
    } catch (error) {
      console.error("Update bulk invoice status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/bulk-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [current] = await db.select().from(bulkInvoices).where(eq(bulkInvoices.id, id));
      if (!current) return res.status(404).json({ error: "Bulk invoice not found" });
      if (current.status !== "draft") {
        return res.status(400).json({ error: "Only draft invoices can be deleted" });
      }
      await db.delete(bulkInvoices).where(eq(bulkInvoices.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete bulk invoice error:", error);
      res.status(500).json({ error: "Failed to delete bulk invoice" });
    }
  });

  app.patch("/api/bulk-invoices/:id/assign-trip", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { tripId } = req.body;
      const [updated] = await db.update(bulkInvoices)
        .set({ tripId, status: "dispatched", updatedAt: new Date() })
        .where(eq(bulkInvoices.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Bulk invoice not found" });
      res.json(updated);
    } catch (error) {
      console.error("Assign trip error:", error);
      res.status(500).json({ error: "Failed to assign trip" });
    }
  });

  app.post("/api/bulk-invoices/:id/generate-eway-bill", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [invoice] = await db.select().from(bulkInvoices).where(eq(bulkInvoices.id, id));
      if (!invoice) return res.status(404).json({ error: "Bulk invoice not found" });
      if (parseFloat(invoice.totalAmount) < 50000) {
        return res.status(400).json({ error: "E-way Bill is required only for invoices >= 50,000" });
      }
      const items = Array.isArray(invoice.items) ? invoice.items : [];
      const ewayItems = items.map((item: any) => ({
        productName: item.name || item.productName || "Product",
        hsnCode: item.hsnCode || "0401",
        quantity: item.quantity || 1,
        unit: item.unit || "NOS",
        taxableValue: parseFloat(item.amount || 0) / (1 + parseFloat(item.gstRate || 0) / 100),
        gstRate: parseFloat(item.gstRate || 0),
      }));
      const ewayBillNumber = `BI${String(Math.floor(Math.random() * 1000000000000)).padStart(12, "0")}`;
      const validFrom = new Date();
      const validTo = new Date(validFrom.getTime() + 24 * 60 * 60 * 1000);
      const [updated] = await db.update(bulkInvoices)
        .set({ ewayBillId: ewayBillNumber, updatedAt: new Date() })
        .where(eq(bulkInvoices.id, id))
        .returning();
      res.json({
        ewayBillNumber,
        validFrom,
        validTo,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        items: ewayItems,
        invoice: updated,
      });
    } catch (error) {
      console.error("Generate E-way bill error:", error);
      res.status(500).json({ error: "Failed to generate E-way bill" });
    }
  });

  // ==================== FINANCE MODULE ENHANCEMENTS ====================

  // --- Payment Reconciliation ---
  app.get("/api/admin/payment-reconciliation", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(upiTransactions.createdAt, new Date(startDate as string)));
      if (endDate) conditions.push(lte(upiTransactions.createdAt, new Date(endDate as string)));
      if (status && status !== "all") conditions.push(eq(upiTransactions.reconciliationStatus, status as string));
      let txns = await db.select().from(upiTransactions)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(upiTransactions.createdAt));
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const orderIds = txns.map(t => t.orderId);
        const uniqueOrderIds = [...new Set(orderIds)];
        const orderOwnerMap: Record<string, string> = {};
        for (const oid of uniqueOrderIds) {
          const order = await storage.getOrderById(oid);
          if (order) orderOwnerMap[oid] = order.restaurantId;
        }
        txns = txns.filter(t => validIds.includes(orderOwnerMap[t.orderId] || ''));
      }
      const matched = txns.filter(t => t.reconciliationStatus === "matched").length;
      const unmatched = txns.filter(t => t.reconciliationStatus === "unmatched").length;
      const duplicate = txns.filter(t => t.reconciliationStatus === "duplicate").length;
      const pending = txns.filter(t => t.reconciliationStatus === "pending").length;
      const totalAmount = txns.reduce((s, t) => s + parseFloat(t.amount), 0);
      const matchedAmount = txns.filter(t => t.reconciliationStatus === "matched").reduce((s, t) => s + parseFloat(t.amount), 0);
      res.json({
        transactions: txns,
        summary: { total: txns.length, matched, unmatched, duplicate, pending, totalAmount: Math.round(totalAmount * 100) / 100, matchedAmount: Math.round(matchedAmount * 100) / 100 }
      });
    } catch (error) {
      console.error("Payment reconciliation error:", error);
      res.status(500).json({ error: "Failed to fetch reconciliation data" });
    }
  });

  app.patch("/api/admin/payment-reconciliation/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { reconciliationStatus, linkedInvoiceId, reconciliationNote } = req.body;
      const [updated] = await db.update(upiTransactions).set({
        reconciliationStatus,
        linkedInvoiceId,
        reconciliationNote,
        reconciledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(upiTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Transaction not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update reconciliation error:", error);
      res.status(500).json({ error: "Failed to update reconciliation status" });
    }
  });

  // --- Collections FIFO Allocation ---
  app.post("/api/collections/allocate-fifo", async (req, res) => {
    try {
      const { merchantId } = req.body;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const outstanding = await db.select().from(outstandingLedger)
        .where(and(eq(outstandingLedger.merchantId, merchantId), eq(outstandingLedger.status, "outstanding")))
        .orderBy(asc(outstandingLedger.createdAt));
      const unallocated = await db.select().from(collectionsTable)
        .where(and(eq(collectionsTable.merchantId, merchantId), eq(collectionsTable.status, "received")))
        .orderBy(asc(collectionsTable.collectionDate));
      let allocatedCount = 0;
      let settledCount = 0;
      const collBalances = unallocated.map(c => ({ ...c, remaining: parseFloat(c.amount) }));
      for (const ledgerEntry of outstanding) {
        let owed = parseFloat(ledgerEntry.amount || "0");
        if (owed <= 0) continue;
        for (let i = 0; i < collBalances.length && owed > 0.01; i++) {
          const coll = collBalances[i];
          if (coll.remaining <= 0.01) continue;
          const apply = Math.min(owed, coll.remaining);
          owed -= apply;
          coll.remaining -= apply;
          allocatedCount++;
          if (coll.remaining <= 0.01) {
            await db.update(collectionsTable).set({ status: "allocated", remarks: `FIFO allocated to ${ledgerEntry.invoiceNumber || ledgerEntry.id}` }).where(eq(collectionsTable.id, coll.id));
          }
        }
        if (owed <= 0.01) {
          await db.update(outstandingLedger).set({ status: "settled" }).where(eq(outstandingLedger.id, ledgerEntry.id));
          settledCount++;
        }
      }
      res.json({ success: true, allocatedCount, settledCount, remainingOutstanding: outstanding.length - settledCount });
    } catch (error) {
      console.error("FIFO allocation error:", error);
      res.status(500).json({ error: "Failed to allocate collections" });
    }
  });

  // --- Earnings P&L Summary ---
  app.get("/api/admin/earnings/summary", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate, merchantId } = req.query;
      const scope = getUnionScope(req);
      const effectiveMerchantId = scope.isGlobalAdmin ? (merchantId as string | undefined) : scope.merchantId;
      const orderConditions: any[] = [];
      if (effectiveMerchantId) orderConditions.push(eq(ordersTable.restaurantId, effectiveMerchantId));
      if (startDate) orderConditions.push(gte(ordersTable.createdAt, new Date(startDate as string)));
      if (endDate) orderConditions.push(lte(ordersTable.createdAt, new Date(endDate as string)));
      const allOrders = await db.select().from(ordersTable).where(orderConditions.length ? and(...orderConditions) : undefined);
      const grossSales = allOrders.reduce((s, o) => s + parseFloat(o.total), 0);
      const totalTax = allOrders.reduce((s, o) => s + parseFloat(o.tax), 0);
      const deliveryFees = allOrders.reduce((s, o) => s + parseFloat(o.deliveryFee), 0);
      const retConditions: any[] = [];
      if (effectiveMerchantId) retConditions.push(eq(salesReturns.merchantId, effectiveMerchantId));
      if (startDate) retConditions.push(gte(salesReturns.createdAt, new Date(startDate as string)));
      if (endDate) retConditions.push(lte(salesReturns.createdAt, new Date(endDate as string)));
      retConditions.push(eq(salesReturns.status, "approved"));
      const returns = await db.select().from(salesReturns).where(and(...retConditions));
      const totalReturns = returns.reduce((s, r) => s + parseFloat(r.creditNoteAmount || r.totalAmount), 0);
      const netSales = grossSales - totalReturns;
      const ordersCount = allOrders.length;
      const avgOrderValue = ordersCount > 0 ? grossSales / ordersCount : 0;
      const codOrders = allOrders.filter(o => o.paymentMethod === "cod" || o.paymentMethod === "cash");
      const onlineOrders = allOrders.filter(o => o.paymentMethod !== "cod" && o.paymentMethod !== "cash");
      res.json({
        grossSales: Math.round(grossSales * 100) / 100,
        totalReturns: Math.round(totalReturns * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        taxCollected: Math.round(totalTax * 100) / 100,
        deliveryFees: Math.round(deliveryFees * 100) / 100,
        ordersCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        codRevenue: Math.round(codOrders.reduce((s, o) => s + parseFloat(o.total), 0) * 100) / 100,
        onlineRevenue: Math.round(onlineOrders.reduce((s, o) => s + parseFloat(o.total), 0) * 100) / 100,
        returnsCount: returns.length,
      });
    } catch (error) {
      console.error("Earnings summary error:", error);
      res.status(500).json({ error: "Failed to generate earnings summary" });
    }
  });

  // --- Sales Returns: Enhanced approval with GST calculation ---
  app.patch("/api/sales-returns/:id/approve-with-gst", async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy, creditNoteAmount, physicalPickupRequired } = req.body;
      const [ret] = await db.select().from(salesReturns).where(eq(salesReturns.id, id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      const items = Array.isArray(ret.items) ? ret.items as any[] : [];
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let avgGstRate = 0;
      for (const item of items) {
        const gstRate = parseFloat(item.gstPercent || item.gstRate || "5");
        const price = parseFloat(item.price || "0") * (item.quantity || 1);
        const taxable = price / (1 + gstRate / 100);
        const gstAmt = price - taxable;
        totalTaxable += taxable;
        totalCgst += gstAmt / 2;
        totalSgst += gstAmt / 2;
        avgGstRate = gstRate;
      }
      const creditNoteNum = `CN-${Date.now()}`;
      const finalAmount = creditNoteAmount || parseFloat(ret.totalAmount);
      let reverseLogisticsJobId = null;
      if (physicalPickupRequired) {
        reverseLogisticsJobId = `RLJ-${Date.now()}`;
      }
      const [updated] = await db.update(salesReturns).set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        creditNoteNumber: creditNoteNum,
        creditNoteAmount: String(finalAmount),
        gstRate: String(avgGstRate),
        taxableAmount: String(Math.round(totalTaxable * 100) / 100),
        cgstAmount: String(Math.round(totalCgst * 100) / 100),
        sgstAmount: String(Math.round(totalSgst * 100) / 100),
        igstAmount: "0",
        reverseLogisticsJobId,
        physicalPickupRequired: physicalPickupRequired || false,
        updatedAt: new Date(),
      }).where(eq(salesReturns.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Approve return with GST error:", error);
      res.status(500).json({ error: "Failed to approve sales return" });
    }
  });

  // --- Sales Returns: Create Pickup Job (Reverse Logistics) ---
  app.post("/api/sales-returns/:id/create-pickup-job", async (req, res) => {
    try {
      const { id } = req.params;
      const [ret] = await db.select().from(salesReturns).where(eq(salesReturns.id, id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      if (ret.status !== "approved") return res.status(400).json({ error: "Return must be approved first" });
      const jobId = `RLJ-${Date.now()}`;
      const [updated] = await db.update(salesReturns).set({
        reverseLogisticsJobId: jobId,
        physicalPickupRequired: true,
        updatedAt: new Date(),
      }).where(eq(salesReturns.id, id)).returning();
      res.json({ success: true, reverseLogisticsJobId: jobId, salesReturn: updated });
    } catch (error) {
      console.error("Create pickup job error:", error);
      res.status(500).json({ error: "Failed to create pickup job" });
    }
  });

  // --- GST Filing Period Management ---
  app.get("/api/gstr/periods/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const periods = await db.select().from(gstFilingPeriods)
        .where(eq(gstFilingPeriods.merchantId, merchantId))
        .orderBy(desc(gstFilingPeriods.year), desc(gstFilingPeriods.month));
      res.json(periods);
    } catch (error) {
      console.error("Get GST periods error:", error);
      res.status(500).json({ error: "Failed to fetch GST filing periods" });
    }
  });

  app.post("/api/gstr/lock-period", async (req, res) => {
    try {
      const { merchantId, month, year, lockedBy } = req.body;
      if (!merchantId || !month || !year) return res.status(400).json({ error: "merchantId, month, year required" });
      const existing = await db.select().from(gstFilingPeriods)
        .where(and(eq(gstFilingPeriods.merchantId, merchantId), eq(gstFilingPeriods.month, month), eq(gstFilingPeriods.year, year)));
      if (existing.length > 0) {
        const [updated] = await db.update(gstFilingPeriods).set({
          status: "locked",
          lockedAt: new Date(),
          lockedBy: lockedBy || "admin",
        }).where(eq(gstFilingPeriods.id, existing[0].id)).returning();
        return res.json(updated);
      }
      const [created] = await db.insert(gstFilingPeriods).values({
        merchantId,
        month: parseInt(month),
        year: parseInt(year),
        status: "locked",
        lockedAt: new Date(),
        lockedBy: lockedBy || "admin",
      }).returning();
      res.json(created);
    } catch (error) {
      console.error("Lock GST period error:", error);
      res.status(500).json({ error: "Failed to lock GST period" });
    }
  });

  app.post("/api/gstr/mark-filed", async (req, res) => {
    try {
      const { merchantId, month, year } = req.body;
      if (!merchantId || !month || !year) return res.status(400).json({ error: "merchantId, month, year required" });
      const existing = await db.select().from(gstFilingPeriods)
        .where(and(eq(gstFilingPeriods.merchantId, merchantId), eq(gstFilingPeriods.month, month), eq(gstFilingPeriods.year, year)));
      if (existing.length > 0) {
        const [updated] = await db.update(gstFilingPeriods).set({
          status: "filed",
          filedAt: new Date(),
        }).where(eq(gstFilingPeriods.id, existing[0].id)).returning();
        return res.json(updated);
      }
      const [created] = await db.insert(gstFilingPeriods).values({
        merchantId,
        month: parseInt(month),
        year: parseInt(year),
        status: "filed",
        filedAt: new Date(),
        lockedAt: new Date(),
        lockedBy: "admin",
      }).returning();
      res.json(created);
    } catch (error) {
      console.error("Mark GST period filed error:", error);
      res.status(500).json({ error: "Failed to mark period as filed" });
    }
  });

  // --- E-way Bill Delivery Block Check ---
  app.get("/api/eway-bill/delivery-check/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) return res.status(404).json({ error: "Order not found" });
      const total = parseFloat(order.total);
      const needsEwayBill = total >= 50000;
      const hasEwayBill = !!order.ewayBillId;
      const blocked = needsEwayBill && !hasEwayBill;
      res.json({
        orderId,
        total,
        needsEwayBill,
        hasEwayBill,
        ewayBillId: order.ewayBillId,
        blocked,
        message: blocked ? `Delivery blocked: E-way Bill required for orders >= ₹50,000 (Order total: ₹${total.toLocaleString()})` : "Delivery allowed",
      });
    } catch (error) {
      console.error("E-way delivery check error:", error);
      res.status(500).json({ error: "Failed to check E-way bill status" });
    }
  });

  // --- Enhanced Tally Export with Filters ---
  app.get("/api/tally/export-filtered/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, includeApprovedOnly, includeCreditNotes, includePayments } = req.query;
      const conditions: any[] = [eq(ordersTable.restaurantId, merchantId)];
      if (startDate) conditions.push(gte(ordersTable.createdAt, new Date(startDate as string)));
      if (endDate) conditions.push(lte(ordersTable.createdAt, new Date(endDate as string)));
      if (includeApprovedOnly === "true") {
        conditions.push(or(eq(ordersTable.status, "delivered"), eq(ordersTable.status, "customer_acknowledged")));
      }
      const ordersList = await db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt));
      const biConditions: any[] = [eq(bulkInvoices.merchantId, merchantId)];
      if (startDate) biConditions.push(gte(bulkInvoices.createdAt, new Date(startDate as string)));
      if (endDate) biConditions.push(lte(bulkInvoices.createdAt, new Date(endDate as string)));
      if (includeApprovedOnly === "true") {
        biConditions.push(or(eq(bulkInvoices.status, "confirmed"), eq(bulkInvoices.status, "dispatched"), eq(bulkInvoices.status, "delivered")));
      }
      const bulkInvoicesList = await db.select().from(bulkInvoices).where(and(...biConditions)).orderBy(desc(bulkInvoices.createdAt));
      let vouchers = "";
      for (const order of ordersList) {
        const items = Array.isArray(order.items) ? order.items : [];
        let ledgerEntries = "";
        for (const item of items as any[]) {
          ledgerEntries += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(item.name || "Product")}</LEDGERNAME><AMOUNT>-${item.price || 0}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
        }
        vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${formatTallyDate(order.createdAt)}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${order.displayId || order.id}</VOUCHERNUMBER><PARTYLEDGERNAME>${escapeXml(order.customerName)}</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(order.customerName)}</LEDGERNAME><AMOUNT>${order.total}</AMOUNT></ALLLEDGERENTRIES.LIST>${ledgerEntries}</VOUCHER></TALLYMESSAGE>`;
      }
      for (const bi of bulkInvoicesList) {
        if (bi.status === "cancelled") continue;
        const biItems = Array.isArray(bi.items) ? bi.items : [];
        let ledgerEntries = "";
        for (const item of biItems as any[]) {
          ledgerEntries += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(item.name || item.productName || "Product")}</LEDGERNAME><AMOUNT>-${item.amount || 0}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
        }
        vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${formatTallyDate(bi.createdAt)}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${bi.invoiceNumber}</VOUCHERNUMBER><PARTYLEDGERNAME>${escapeXml(bi.customerName)}</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(bi.customerName)}</LEDGERNAME><AMOUNT>${bi.totalAmount}</AMOUNT></ALLLEDGERENTRIES.LIST>${ledgerEntries}</VOUCHER></TALLYMESSAGE>`;
      }
      if (includeCreditNotes === "true") {
        const retConditions: any[] = [eq(salesReturns.merchantId, merchantId), eq(salesReturns.status, "approved")];
        if (startDate) retConditions.push(gte(salesReturns.createdAt, new Date(startDate as string)));
        if (endDate) retConditions.push(lte(salesReturns.createdAt, new Date(endDate as string)));
        const returnsList = await db.select().from(salesReturns).where(and(...retConditions));
        for (const ret of returnsList) {
          vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Credit Note" ACTION="Create"><DATE>${formatTallyDate(ret.createdAt)}</DATE><VOUCHERTYPENAME>Credit Note</VOUCHERTYPENAME><VOUCHERNUMBER>${ret.creditNoteNumber || ret.returnNumber}</VOUCHERNUMBER><PARTYLEDGERNAME>${escapeXml(ret.customerName || "Customer")}</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(ret.customerName || "Customer")}</LEDGERNAME><AMOUNT>-${ret.creditNoteAmount || ret.totalAmount}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`;
        }
      }
      if (includePayments === "true") {
        const payConditions: any[] = [];
        if (startDate) payConditions.push(gte(upiTransactions.createdAt, new Date(startDate as string)));
        if (endDate) payConditions.push(lte(upiTransactions.createdAt, new Date(endDate as string)));
        payConditions.push(eq(upiTransactions.status, "success"));
        const payments = await db.select().from(upiTransactions).where(and(...payConditions));
        for (const pay of payments) {
          vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Receipt" ACTION="Create"><DATE>${formatTallyDate(pay.createdAt)}</DATE><VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME><VOUCHERNUMBER>${pay.merchantTransactionId}</VOUCHERNUMBER><PARTYLEDGERNAME>Bank Account</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>Bank Account</LEDGERNAME><AMOUNT>-${pay.amount}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`;
        }
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${vouchers}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Filtered Tally export error:", error);
      res.status(500).json({ error: "Failed to export filtered Tally data" });
    }
  });

  // --- Order 4-way Status Update ---
  app.patch("/api/orders/:id/finance-status", async (req, res) => {
    try {
      const { id } = req.params;
      const { deliveryStatus, invoiceStatus, paymentStatus, receivableStatus } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (deliveryStatus) updates.deliveryStatus = deliveryStatus;
      if (invoiceStatus) updates.invoiceStatus = invoiceStatus;
      if (paymentStatus) updates.paymentStatus = paymentStatus;
      if (receivableStatus) updates.receivableStatus = receivableStatus;
      const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Order not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update finance status error:", error);
      res.status(500).json({ error: "Failed to update order finance status" });
    }
  });

  // --- COD Delay Detection ---
  app.get("/api/admin/cod-delays", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const scope = getUnionScope(req);
      const codConditions: any[] = [
        or(eq(ordersTable.paymentMethod, "cod"), eq(ordersTable.paymentMethod, "cash")),
        eq(ordersTable.status, "delivered"),
        eq(ordersTable.paymentStatus, "unpaid"),
        lte(ordersTable.deliveredAt, threeDaysAgo),
      ];
      if (!scope.isGlobalAdmin && scope.merchantId) {
        codConditions.push(eq(ordersTable.restaurantId, scope.merchantId));
      }
      const codOrders = await db.select().from(ordersTable)
        .where(and(...codConditions))
        .orderBy(asc(ordersTable.deliveredAt));
      const delays = codOrders.map(o => ({
        ...o,
        daysOverdue: Math.floor((Date.now() - (o.deliveredAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)),
      }));
      res.json({ count: delays.length, orders: delays });
    } catch (error) {
      console.error("COD delays error:", error);
      res.status(500).json({ error: "Failed to fetch COD delays" });
    }
  });

  // --- GSTR-1 Enhanced with Credit Notes ---
  app.get("/api/gstr/gstr1-enhanced/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ error: "month and year are required" });
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);
      const periodLock = await db.select().from(gstFilingPeriods)
        .where(and(eq(gstFilingPeriods.merchantId, merchantId), eq(gstFilingPeriods.month, m), eq(gstFilingPeriods.year, y)));
      const isLocked = periodLock.length > 0 && (periodLock[0].status === "locked" || periodLock[0].status === "filed");
      const ordersList = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, merchantId), gte(ordersTable.createdAt, startDate), lte(ordersTable.createdAt, endDate)));
      const bulkInvoicesList = await db.select().from(bulkInvoices)
        .where(and(eq(bulkInvoices.merchantId, merchantId), gte(bulkInvoices.createdAt, startDate), lte(bulkInvoices.createdAt, endDate)));
      const returnsList = await db.select().from(salesReturns)
        .where(and(eq(salesReturns.merchantId, merchantId), eq(salesReturns.status, "approved"), gte(salesReturns.approvedAt, startDate), lte(salesReturns.approvedAt, endDate)));
      const b2b: any[] = [];
      const b2c: any[] = [];
      const creditNotes: any[] = [];
      for (const order of ordersList) {
        const items = Array.isArray(order.items) ? order.items : [];
        let orderGst = 0;
        let orderTaxable = 0;
        for (const item of items as any[]) {
          const gstRate = parseFloat(item.gstPercent || "0");
          const price = parseFloat(item.price || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          orderGst += price - taxable;
          orderTaxable += taxable;
        }
        const entry = { invoiceNumber: order.displayId || order.id, invoiceDate: order.createdAt, customerName: order.customerName, taxableValue: Math.round(orderTaxable * 100) / 100, gstAmount: Math.round(orderGst * 100) / 100, total: parseFloat(order.total) };
        if (parseFloat(order.total) > 250000) b2b.push(entry); else b2c.push(entry);
      }
      for (const bi of bulkInvoicesList) {
        if (bi.status === "cancelled") continue;
        const biItems = Array.isArray(bi.items) ? bi.items : [];
        let biGst = 0;
        let biTaxable = 0;
        for (const item of biItems as any[]) {
          const gstRate = parseFloat(item.gstRate || "0");
          const price = parseFloat(item.unitPrice || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          biGst += price - taxable;
          biTaxable += taxable;
        }
        const entry = { invoiceNumber: bi.invoiceNumber, invoiceDate: bi.createdAt, customerName: bi.customerName, taxableValue: Math.round(biTaxable * 100) / 100, gstAmount: Math.round(biGst * 100) / 100, total: parseFloat(bi.totalAmount), source: "bulk_invoice" };
        if (bi.customerGstin) b2b.push(entry); else b2c.push(entry);
      }
      for (const ret of returnsList) {
        creditNotes.push({
          creditNoteNumber: ret.creditNoteNumber,
          originalInvoice: ret.orderId,
          customerName: ret.customerName,
          taxableAmount: parseFloat(ret.taxableAmount || "0"),
          cgst: parseFloat(ret.cgstAmount || "0"),
          sgst: parseFloat(ret.sgstAmount || "0"),
          igst: parseFloat(ret.igstAmount || "0"),
          totalAmount: parseFloat(ret.creditNoteAmount || ret.totalAmount),
          returnDate: ret.approvedAt,
        });
      }
      const totalInvoices = ordersList.length + bulkInvoicesList.filter(b => b.status !== "cancelled").length;
      res.json({
        period: `${month}/${year}`,
        isLocked,
        periodStatus: periodLock.length > 0 ? periodLock[0].status : "open",
        b2b, b2c, creditNotes, totalInvoices,
        creditNotesCount: creditNotes.length,
        creditNotesTotal: Math.round(creditNotes.reduce((s, cn) => s + cn.totalAmount, 0) * 100) / 100,
      });
    } catch (error) {
      console.error("Enhanced GSTR-1 error:", error);
      res.status(500).json({ error: "Failed to generate enhanced GSTR-1 data" });
    }
  });

  // ==================== CASHFREE PAYMENT LINKS ROUTES ====================

  app.post("/api/cashfree/payment-links", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, purpose, customerName, customerEmail, customerPhone, partialPayments, expiresAt, relatedOrderId, relatedInvoiceId } = req.body;
      if (!amount || !customerName || !customerPhone) {
        return res.status(400).json({ error: "amount, customerName, and customerPhone are required" });
      }

      const { generateOrderId, isCashfreeReady, getCashfreePG, CF_API_VERSION, getPGBaseUrl } = await import("../cashfree");
      const linkId = `LINK-${generateOrderId()}`;

      let linkUrl = null;
      let cfLinkData: any = null;

      if (isCashfreeReady()) {
        try {
          const headers: Record<string, string> = {
            "x-client-id": process.env.CASHFREE_CLIENT_ID || "",
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET || "",
            "x-api-version": CF_API_VERSION,
            "Content-Type": "application/json",
          };
          const baseUrl = getPGBaseUrl();
          const linkPayload: any = {
            link_id: linkId,
            link_amount: amount,
            link_currency: "INR",
            link_purpose: purpose || "Payment",
            customer_details: {
              customer_name: customerName,
              customer_phone: customerPhone,
              customer_email: customerEmail || undefined,
            },
            link_partial_payments: partialPayments || false,
            link_expiry_time: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            link_notify: { send_sms: true, send_email: !!customerEmail },
          };

          const cfRes = await fetch(`${baseUrl}/links`, {
            method: "POST",
            headers,
            body: JSON.stringify(linkPayload),
          });
          cfLinkData = await cfRes.json();
          if (cfLinkData?.link_url) {
            linkUrl = cfLinkData.link_url;
          }
        } catch (cfErr) {
          console.error("[Cashfree] Payment link API error:", cfErr);
        }
      }

      if (!linkUrl) {
        const env = process.env.CASHFREE_ENV || "sandbox";
        linkUrl = env === "production"
          ? `https://payments.cashfree.com/links/${linkId}`
          : `https://payments-test.cashfree.com/links/${linkId}`;
      }

      const [record] = await db.insert(cashfreePaymentLinks).values({
        linkId,
        linkUrl,
        amount: String(amount),
        purpose: purpose || null,
        status: "active",
        relatedOrderId: relatedOrderId || null,
        relatedInvoiceId: relatedInvoiceId || null,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone,
        partialPayments: partialPayments || false,
        createdBy: req.user?.id || null,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }).returning();

      res.json({ ...record, linkUrl, cfData: cfLinkData });
    } catch (error) {
      console.error("Create payment link error:", error);
      res.status(500).json({ error: "Failed to create payment link" });
    }
  });

  app.get("/api/cashfree/payment-links", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      let links;
      if (statusFilter) {
        links = await db.query.cashfreePaymentLinks.findMany({
          where: eq(cashfreePaymentLinks.status, statusFilter),
          orderBy: [desc(cashfreePaymentLinks.createdAt)],
        });
      } else {
        links = await db.query.cashfreePaymentLinks.findMany({
          orderBy: [desc(cashfreePaymentLinks.createdAt)],
        });
      }
      res.json(links);
    } catch (error) {
      console.error("List payment links error:", error);
      res.status(500).json({ error: "Failed to list payment links" });
    }
  });

  app.get("/api/cashfree/payment-links/:linkId/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { linkId } = req.params;
      const link = await db.query.cashfreePaymentLinks.findFirst({
        where: eq(cashfreePaymentLinks.linkId, linkId),
      });
      if (!link) {
        return res.status(404).json({ error: "Payment link not found" });
      }

      const { isCashfreeReady, CF_API_VERSION, getPGBaseUrl } = await import("../cashfree");

      if (isCashfreeReady()) {
        try {
          const headers: Record<string, string> = {
            "x-client-id": process.env.CASHFREE_CLIENT_ID || "",
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET || "",
            "x-api-version": CF_API_VERSION,
          };
          const baseUrl = getPGBaseUrl();
          const cfRes = await fetch(`${baseUrl}/links/${linkId}`, { headers });
          const cfData = await cfRes.json();

          if (cfData?.link_status) {
            const newStatus = cfData.link_status.toLowerCase();
            if (newStatus !== link.status) {
              await db.update(cashfreePaymentLinks)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(cashfreePaymentLinks.linkId, linkId));
            }
            return res.json({ ...link, status: newStatus, cfData });
          }
        } catch (cfErr) {
          console.error("[Cashfree] Fetch link status error:", cfErr);
        }
      }

      res.json(link);
    } catch (error) {
      console.error("Fetch payment link status error:", error);
      res.status(500).json({ error: "Failed to fetch payment link status" });
    }
  });

  app.post("/api/cashfree/payment-links/:linkId/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { linkId } = req.params;
      const link = await db.query.cashfreePaymentLinks.findFirst({
        where: eq(cashfreePaymentLinks.linkId, linkId),
      });
      if (!link) {
        return res.status(404).json({ error: "Payment link not found" });
      }
      if (link.status !== "active") {
        return res.status(400).json({ error: "Only active links can be cancelled" });
      }

      const { isCashfreeReady, CF_API_VERSION, getPGBaseUrl } = await import("../cashfree");

      if (isCashfreeReady()) {
        try {
          const headers: Record<string, string> = {
            "x-client-id": process.env.CASHFREE_CLIENT_ID || "",
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET || "",
            "x-api-version": CF_API_VERSION,
            "Content-Type": "application/json",
          };
          const baseUrl = getPGBaseUrl();
          await fetch(`${baseUrl}/links/${linkId}/cancel`, {
            method: "POST",
            headers,
          });
        } catch (cfErr) {
          console.error("[Cashfree] Cancel link API error:", cfErr);
        }
      }

      const [updated] = await db.update(cashfreePaymentLinks)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(cashfreePaymentLinks.linkId, linkId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Cancel payment link error:", error);
      res.status(500).json({ error: "Failed to cancel payment link" });
    }
  });

  // ==================== CASHFREE SOFTPOS ROUTES ====================

  app.post("/api/cashfree/softpos/terminals", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { terminalId, terminalName, terminalPhone, merchantId, deviceInfo } = req.body;
      if (!terminalId || !terminalName) {
        return res.status(400).json({ error: "terminalId and terminalName are required" });
      }
      const existing = await db.query.cashfreeSoftposTerminals.findFirst({
        where: eq(cashfreeSoftposTerminals.terminalId, terminalId),
      });
      if (existing) {
        return res.status(409).json({ error: "Terminal ID already exists" });
      }
      const [terminal] = await db.insert(cashfreeSoftposTerminals).values({
        terminalId,
        terminalName,
        terminalPhone: terminalPhone || null,
        merchantId: merchantId || null,
        deviceInfo: deviceInfo || null,
        status: "ACTIVE",
      }).returning();
      res.json(terminal);
    } catch (error) {
      console.error("SoftPOS register terminal error:", error);
      res.status(500).json({ error: "Failed to register terminal" });
    }
  });

  app.get("/api/cashfree/softpos/terminals", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantIdFilter = req.query.merchantId as string | undefined;
      let terminals;
      if (merchantIdFilter) {
        terminals = await db.query.cashfreeSoftposTerminals.findMany({
          where: eq(cashfreeSoftposTerminals.merchantId, merchantIdFilter),
          orderBy: [desc(cashfreeSoftposTerminals.createdAt)],
        });
      } else {
        terminals = await db.query.cashfreeSoftposTerminals.findMany({
          orderBy: [desc(cashfreeSoftposTerminals.createdAt)],
        });
      }
      res.json(terminals);
    } catch (error) {
      console.error("SoftPOS list terminals error:", error);
      res.status(500).json({ error: "Failed to list terminals" });
    }
  });

  app.patch("/api/cashfree/softpos/terminals/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!status || !["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const [updated] = await db.update(cashfreeSoftposTerminals)
        .set({ status })
        .where(eq(cashfreeSoftposTerminals.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "Terminal not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("SoftPOS update terminal error:", error);
      res.status(500).json({ error: "Failed to update terminal" });
    }
  });

  app.post("/api/cashfree/softpos/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, orderId, terminalId, customerName, customerPhone } = req.body;
      if (!amount || !terminalId) {
        return res.status(400).json({ error: "amount and terminalId are required" });
      }

      const terminal = await db.query.cashfreeSoftposTerminals.findFirst({
        where: eq(cashfreeSoftposTerminals.terminalId, terminalId),
      });
      if (!terminal || terminal.status !== "ACTIVE") {
        return res.status(400).json({ error: "Terminal not found or inactive" });
      }

      const { generateOrderId, getPGBaseUrl, CF_API_VERSION } = await import("../cashfree");
      const cfOrderId = generateOrderId();
      const softposOrderId = orderId || cfOrderId;

      const softposDeepLink = `cashfree://softpos?order_id=${cfOrderId}&amount=${amount}&terminal_id=${terminalId}`;
      const intentUrl = `intent://softpos?order_id=${cfOrderId}&amount=${amount}&terminal_id=${terminalId}#Intent;scheme=cashfree;package=com.cashfree.softpos;end`;

      const orderRecord = {
        id: cfOrderId,
        orderId: softposOrderId,
        terminalId,
        amount: String(amount),
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "",
        status: "created",
        deepLink: softposDeepLink,
        intentUrl,
        createdAt: new Date().toISOString(),
      };

      res.json(orderRecord);
    } catch (error) {
      console.error("SoftPOS create order error:", error);
      res.status(500).json({ error: "Failed to create SoftPOS order" });
    }
  });

  app.get("/api/cashfree/softpos/orders/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const cfOrderId = req.params.id;
      
      const { isCashfreeReady, getCashfreePG, CF_API_VERSION } = await import("../cashfree");
      
      if (isCashfreeReady()) {
        try {
          const pg = getCashfreePG();
          const response = await pg.PGFetchOrder(CF_API_VERSION, cfOrderId);
          if (response?.data) {
            return res.json({
              cfOrderId,
              status: response.data.order_status || "ACTIVE",
              paymentDetails: response.data,
            });
          }
        } catch (apiErr: any) {

        }
      }

      res.json({
        cfOrderId,
        status: "ACTIVE",
        message: "Cashfree API not configured — returning placeholder status",
      });
    } catch (error) {
      console.error("SoftPOS order status error:", error);
      res.status(500).json({ error: "Failed to check order status" });
    }
  });

  // ── Cashfree Payouts: Beneficiaries ──
  app.get("/api/cashfree/payouts/beneficiaries", requireAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(cashfreeBeneficiariesTable).orderBy(desc(cashfreeBeneficiariesTable.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("List beneficiaries error:", error);
      res.status(500).json({ error: "Failed to list beneficiaries" });
    }
  });

  app.post("/api/cashfree/payouts/beneficiaries", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { beneId, name, email, phone, bankAccount, ifsc, vpa } = req.body;
      if (!beneId || !name) {
        return res.status(400).json({ error: "beneId and name are required" });
      }
      if (!bankAccount && !vpa) {
        return res.status(400).json({ error: "Either bank account or UPI VPA is required" });
      }
      const [row] = await db.insert(cashfreeBeneficiariesTable).values({
        beneId,
        name,
        email: email || null,
        phone: phone || null,
        bankAccount: bankAccount || null,
        ifsc: ifsc || null,
        vpa: vpa || null,
        status: "VERIFIED",
        addedBy: req.user?.id || null,
      }).returning();
      res.json(row);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: "Beneficiary ID already exists" });
      }
      console.error("Add beneficiary error:", error);
      res.status(500).json({ error: "Failed to add beneficiary" });
    }
  });

  app.delete("/api/cashfree/payouts/beneficiaries/:beneId", requireAuth, async (req, res) => {
    try {
      const { beneId } = req.params;
      await db.delete(cashfreeBeneficiariesTable).where(eq(cashfreeBeneficiariesTable.beneId, beneId));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete beneficiary error:", error);
      res.status(500).json({ error: "Failed to delete beneficiary" });
    }
  });

  // ── Cashfree Payouts: Transfers ──
  app.get("/api/cashfree/payouts/transfers", requireAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(cashfreePayoutsTable).orderBy(desc(cashfreePayoutsTable.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("List transfers error:", error);
      res.status(500).json({ error: "Failed to list transfers" });
    }
  });

  app.post("/api/cashfree/payouts/transfers", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { beneId, amount, transferMode, remarks } = req.body;
      if (!beneId || !amount || !transferMode) {
        return res.status(400).json({ error: "beneId, amount, and transferMode are required" });
      }
      if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }
      const bene = await db.select().from(cashfreeBeneficiariesTable).where(eq(cashfreeBeneficiariesTable.beneId, beneId)).limit(1);
      if (bene.length === 0) {
        return res.status(404).json({ error: "Beneficiary not found" });
      }
      const transferId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const [row] = await db.insert(cashfreePayoutsTable).values({
        transferId,
        beneId,
        amount: amount.toString(),
        transferMode,
        status: "PENDING",
        remarks: remarks || null,
        initiatedBy: req.user?.id || null,
      }).returning();
      res.json(row);
    } catch (error) {
      console.error("Create transfer error:", error);
      res.status(500).json({ error: "Failed to initiate transfer" });
    }
  });

  app.get("/api/cashfree/payouts/transfers/:transferId", requireAuth, async (req, res) => {
    try {
      const { transferId } = req.params;
      const rows = await db.select().from(cashfreePayoutsTable).where(eq(cashfreePayoutsTable.transferId, transferId)).limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Transfer not found" });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Get transfer error:", error);
      res.status(500).json({ error: "Failed to get transfer" });
    }
  });

  // ========== CASHFREE EASY SPLIT — VENDOR MANAGEMENT ==========

  app.post("/api/cashfree/split/vendors", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, name, email, phone, bankAccount, ifsc, upiVpa, scheduleOption } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Vendor name is required' });
      }

      const vendorId = `AAVIN_${(unionId || 'GEN').replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

      const { getPGBaseUrl, CF_API_VERSION } = await import('../cashfree');
      const clientId = process.env.CASHFREE_CLIENT_ID;
      const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

      let cfStatus = 'ACTIVE';
      let kycStatus = 'PENDING';

      if (clientId && clientSecret) {
        try {
          const baseUrl = getPGBaseUrl();
          const vendorPayload = {
            vendor_id: vendorId,
            name,
            email: email || `${vendorId.toLowerCase()}@aavincart.com`,
            phone: phone || '9999999999',
            bank: bankAccount && ifsc ? { account_number: bankAccount, account_holder: name, ifsc } : undefined,
            upi: upiVpa ? { vpa: upiVpa } : undefined,
            schedule_option: scheduleOption || 1,
            dashboard_access: false,
          };

          const resp = await fetch(`${baseUrl}/easy-split/vendors`, {
            method: 'POST',
            headers: {
              'x-client-id': clientId,
              'x-client-secret': clientSecret,
              'x-api-version': CF_API_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendorPayload),
          });

          if (resp.ok) {
            const data = await resp.json();
            cfStatus = data.status || 'ACTIVE';
            kycStatus = data.kyc_status || 'PENDING';
          } else {
            const errData = await resp.json().catch(() => ({}));
            console.error('[Cashfree Split] Vendor creation API response:', resp.status, errData);
          }
        } catch (apiErr) {
          console.error('[Cashfree Split] Vendor API call failed (storing locally):', apiErr);
        }
      }

      const vendor = await storage.createCashfreeSplitVendor({
        vendorId,
        unionId: unionId || null,
        name,
        email: email || null,
        phone: phone || null,
        bankAccount: bankAccount || null,
        ifsc: ifsc || null,
        upiVpa: upiVpa || null,
        status: cfStatus,
        scheduleOption: scheduleOption || 1,
        kycStatus,
        dashboardAccess: false,
      });

      res.status(201).json(vendor);
    } catch (error: any) {
      console.error('Error creating split vendor:', error);
      res.status(500).json({ error: error.message || 'Failed to create vendor' });
    }
  });

  app.get("/api/cashfree/split/vendors", requireAuth, async (_req, res) => {
    try {
      const vendors = await storage.getCashfreeSplitVendors();
      res.json(vendors);
    } catch (error) {
      console.error('Error fetching split vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  });

  app.patch("/api/cashfree/split/vendors/:vendorId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { vendorId } = req.params;
      const updates = req.body;

      const { getPGBaseUrl, CF_API_VERSION } = await import('../cashfree');
      const clientId = process.env.CASHFREE_CLIENT_ID;
      const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        try {
          const baseUrl = getPGBaseUrl();
          const updatePayload: any = {};
          if (updates.name) updatePayload.name = updates.name;
          if (updates.email) updatePayload.email = updates.email;
          if (updates.phone) updatePayload.phone = updates.phone;
          if (updates.bankAccount && updates.ifsc) {
            updatePayload.bank = { account_number: updates.bankAccount, account_holder: updates.name, ifsc: updates.ifsc };
          }
          if (updates.upiVpa) updatePayload.upi = { vpa: updates.upiVpa };
          if (updates.status) updatePayload.status = updates.status;

          await fetch(`${baseUrl}/easy-split/vendors/${vendorId}`, {
            method: 'PATCH',
            headers: {
              'x-client-id': clientId,
              'x-client-secret': clientSecret,
              'x-api-version': CF_API_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          });
        } catch (apiErr) {
          console.error('[Cashfree Split] Vendor update API call failed (updating locally):', apiErr);
        }
      }

      const updated = await storage.updateCashfreeSplitVendor(vendorId, {
        ...updates,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Error updating split vendor:', error);
      res.status(500).json({ error: error.message || 'Failed to update vendor' });
    }
  });

  app.get("/api/cashfree/split/settlements", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const splits = await storage.getCashfreeOrderSplits();
      res.json(splits);
    } catch (error) {
      console.error('Error fetching split settlements:', error);
      res.status(500).json({ error: 'Failed to fetch settlements' });
    }
  });

  app.get("/api/cashfree/split/orders/:orderId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const splits = await storage.getCashfreeOrderSplits(req.params.orderId);
      res.json(splits);
    } catch (error) {
      console.error('Error fetching order splits:', error);
      res.status(500).json({ error: 'Failed to fetch order splits' });
    }
  });



  // ==================== FRESH MILK DISPATCH + BULK DELIVERY + MMO ROUTES ====================
}


// Helper functions for Tally XML export
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatTallyDate(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ==================== TRANSPORT MANAGEMENT ROUTES ====================


function computeDriverScore(trip: any): { score: number; dropScore: number; timeScore: number; capacityScore: number; qualityScore: number } {
  const dropScore = trip.plannedDropPoints > 0
    ? (trip.completedDropPoints / trip.plannedDropPoints) * 40
    : 0;
  const capacityScore = trip.capacityBags > 0
    ? Math.min(trip.bagsLoaded / trip.capacityBags, 1) * 30
    : 0;
  const qualityScore = trip.plannedDropPoints > 0
    ? (trip.completedDropPoints / trip.plannedDropPoints) * 30
    : 0;
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
