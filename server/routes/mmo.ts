import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull } from "drizzle-orm";
import { storage } from "../storage";
import {
  users as usersTable, orders as ordersTable, tripSheets, transportRoutePoints,
  bulkInvoices, deliveryJobs, bulkDeliveryLocations, manualBillBatches, manualBills,
  milkRouteAgents, milkDispatchEntries, milkAgentLedger,
  mmoOffices, mmoRoutes, mmoRouteAgents, freeMilkRequests,
  insertMmoOfficeSchema, insertMmoRouteSchema, insertMmoRouteAgentSchema,
} from "@shared/schema";
import ExcelJS from "exceljs";
import multer from "multer";
import {
  haversineDistance, groupIntoStops, optimizeRoute, checkVehicleCapacity,
  buildRouteSummary, generateTripSheetPDF, generateVehicleWiseTripSheetsPDF,
  generateOptimizedStopsExcelData, generateRouteSummaryExcelData,
  generateEditableStopsExcelData, generateTripsExcelData, calculateBags,
  computeFuel, capacityFromTons, splitAllRoutesIntoTrips, buildTripSummaries,
  splitByVehicleCount, parseDMSCoordinate,
  type GroupInput, type TripConfig, type TripSummary, DEFAULT_TRIP_CONFIG,
} from "../bulk-delivery-engine";
import { logAudit } from "../audit";
import { requireAuth, requireRole, getUnionScope } from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, invalidateCache } from "./utils";
import { generateTripId, getAllIdsForMerchant, resolveMerchantId, getEffectiveMerchantId } from "./shared";

export async function registerMmoRoutes(app: Express): Promise<void> {
  app.get("/api/mmo/offices", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const offices = await db.select().from(mmoOffices)
        .where(and(eq(mmoOffices.unionId, merchantId), eq(mmoOffices.isActive, true), ne(mmoOffices.officeCode, 'HEAD')))
        .orderBy(asc(mmoOffices.sequenceNo), asc(mmoOffices.officeName));
      res.json(offices);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/mmo/offices", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const body = { ...req.body, unionId: merchantId };
      const parsed = insertMmoOfficeSchema.parse(body);
      const [office] = await db.insert(mmoOffices).values(parsed).returning();
      res.json(office);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/mmo/offices/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoOffices).where(and(eq(mmoOffices.id, req.params.id), eq(mmoOffices.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Office not found" });
      const { officeName, officeCode, parentId, address, contactPerson, contactPhone, sequenceNo } = req.body;
      const updateFields: any = {};
      if (officeName !== undefined) updateFields.officeName = officeName;
      if (officeCode !== undefined) updateFields.officeCode = officeCode;
      if (parentId !== undefined) updateFields.parentId = parentId;
      if (address !== undefined) updateFields.address = address;
      if (contactPerson !== undefined) updateFields.contactPerson = contactPerson;
      if (contactPhone !== undefined) updateFields.contactPhone = contactPhone;
      if (sequenceNo !== undefined) updateFields.sequenceNo = sequenceNo;
      const [updated] = await db.update(mmoOffices).set(updateFields).where(eq(mmoOffices.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/mmo/offices/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoOffices).where(and(eq(mmoOffices.id, req.params.id), eq(mmoOffices.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Office not found" });
      await db.update(mmoOffices).set({ isActive: false }).where(eq(mmoOffices.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== MMO Routes CRUD =====
  app.get("/api/mmo/offices/:officeId/routes", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const routes = await db.select().from(mmoRoutes)
        .where(and(eq(mmoRoutes.mmoOfficeId, req.params.officeId), eq(mmoRoutes.unionId, merchantId), eq(mmoRoutes.isActive, true)))
        .orderBy(asc(mmoRoutes.sequenceNo), asc(mmoRoutes.routeName));
      res.json(routes);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/mmo/routes", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const body = { ...req.body, unionId: merchantId };
      const parsed = insertMmoRouteSchema.parse(body);
      const [ownerOffice] = await db.select().from(mmoOffices).where(and(eq(mmoOffices.id, parsed.mmoOfficeId), eq(mmoOffices.unionId, merchantId)));
      if (!ownerOffice) return res.status(403).json({ error: "Office does not belong to your union" });
      const [route] = await db.insert(mmoRoutes).values(parsed).returning();
      res.json(route);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/mmo/routes/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.id), eq(mmoRoutes.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Route not found" });
      const { routeName, routeCode, areaDescription, sequenceNo } = req.body;
      const updateFields: any = {};
      if (routeName !== undefined) updateFields.routeName = routeName;
      if (routeCode !== undefined) updateFields.routeCode = routeCode;
      if (areaDescription !== undefined) updateFields.areaDescription = areaDescription;
      if (sequenceNo !== undefined) updateFields.sequenceNo = sequenceNo;
      const [updated] = await db.update(mmoRoutes).set(updateFields).where(eq(mmoRoutes.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/mmo/routes/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.id), eq(mmoRoutes.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Route not found" });
      await db.update(mmoRoutes).set({ isActive: false }).where(eq(mmoRoutes.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== MMO Route Agents CRUD =====
  app.get("/api/mmo/routes/:routeId/agents", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const agents = await db.select().from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.routeId, req.params.routeId), eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)))
        .orderBy(asc(mmoRouteAgents.sequenceNo), asc(mmoRouteAgents.agentName));
      res.json(agents);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/mmo/routes/:routeId/agents", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });
      const body = { ...req.body, routeId: req.params.routeId, mmoOfficeId: ownerRoute.mmoOfficeId, unionId: merchantId };
      const parsed = insertMmoRouteAgentSchema.parse(body);
      const [agent] = await db.insert(mmoRouteAgents).values(parsed).returning();
      res.json(agent);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/mmo/routes/:routeId/agents/bulk", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });
      const { agents } = req.body;
      if (!Array.isArray(agents) || agents.length === 0) return res.status(400).json({ error: "agents array required" });
      const values = agents.map((a: any, idx: number) => ({
        routeId: req.params.routeId,
        mmoOfficeId: ownerRoute.mmoOfficeId,
        unionId: merchantId,
        agentCode: a.agentCode || `AGT-${idx + 1}`,
        agentName: a.agentName || '',
        pointName: a.pointName || '',
        segment: a.segment || 'Fresh Milk',
        mobileNo: a.mobileNo || null,
        address: a.address || null,
        sequenceNo: a.sequenceNo || idx + 1,
      }));
      const inserted = await db.insert(mmoRouteAgents).values(values).returning();
      res.json({ success: true, count: inserted.length, agents: inserted });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/mmo/agents/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoRouteAgents).where(and(eq(mmoRouteAgents.id, req.params.id), eq(mmoRouteAgents.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Agent not found" });
      const { agentCode, agentName, pointName, segment, mobileNo, address, sequenceNo } = req.body;
      const updateFields: any = {};
      if (agentCode !== undefined) updateFields.agentCode = agentCode;
      if (agentName !== undefined) updateFields.agentName = agentName;
      if (pointName !== undefined) updateFields.pointName = pointName;
      if (segment !== undefined) updateFields.segment = segment;
      if (mobileNo !== undefined) updateFields.mobileNo = mobileNo;
      if (address !== undefined) updateFields.address = address;
      if (sequenceNo !== undefined) updateFields.sequenceNo = sequenceNo;
      const [updated] = await db.update(mmoRouteAgents).set(updateFields).where(eq(mmoRouteAgents.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/mmo/agents/:id", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [existing] = await db.select().from(mmoRouteAgents).where(and(eq(mmoRouteAgents.id, req.params.id), eq(mmoRouteAgents.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Agent not found" });
      await db.update(mmoRouteAgents).set({ isActive: false }).where(eq(mmoRouteAgents.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== MMO Route Dispatch (segment-wise, next-day logic, route-specific) =====
  app.get("/api/mmo/routes/:routeId/dispatch", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });
      const { date } = req.query;
      const dateStr = String(date || new Date().toISOString().split("T")[0]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: "Invalid date format, use YYYY-MM-DD" });

      const routeAgents = await db.select().from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.routeId, req.params.routeId), eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)));

      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const merchantToUnionMapping: Record<string, string> = { "merchant-3": "UNI-SLM-01", "merchant-2": "UNI-CBE-01" };
      const mappedUnionId = merchantToUnionMapping[merchantId] || merchantId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === merchantId)?.[0] || merchantId;
      const restaurantIds = [...new Set([merchantId, mappedUnionId, reverseUnionId])];

      const allOrders = await db.select().from(ordersTable).where(
        and(
          sql`${ordersTable.createdAt} >= ${dateStart} AND ${ordersTable.createdAt} <= ${dateEnd}`,
          sql`${ordersTable.restaurantId} IN (${sql.join(restaurantIds.map(id => sql`${id}`), sql`, `)})`,
          eq(ordersTable.paymentStatus, 'paid')
        )
      );

      const agentCodesUpper = new Set(routeAgents.map(a => a.agentCode.toUpperCase()));
      const agentNamesUpper = new Set(routeAgents.map(a => a.agentName.toUpperCase()));
      const agentLookup = new Map<string, typeof routeAgents[0]>();
      const agentPhoneLookup = new Map<string, typeof routeAgents[0]>();
      for (const a of routeAgents) {
        agentLookup.set(a.agentCode.toUpperCase(), a);
        agentLookup.set(a.agentName.toUpperCase(), a);
        if (a.mobileNo) {
          const digits = a.mobileNo.replace(/\D/g, '');
          if (digits) agentPhoneLookup.set(digits.slice(-10), a);
        }
      }

      function matchAgent(customerName: string, customerPhone?: string | null) {
        const cn = (customerName || '').toUpperCase().trim();
        if (agentLookup.has(cn)) return agentLookup.get(cn)!;
        // Extract leading code token — allow optional trailing punctuation (e.g. "MRN." or "AA5013-")
        const tokens = cn.split(/[\s.\-,\/]+/).filter(Boolean);
        const firstToken = tokens[0] || '';
        if (firstToken && agentLookup.has(firstToken)) return agentLookup.get(firstToken)!;
        // Strip leading letter prefix (e.g. "UP7042" → "7042", "AA5013" → "5013")
        const strippedFirst = firstToken.replace(/^[A-Z]+/, '');
        if (strippedFirst && strippedFirst !== firstToken && agentLookup.has(strippedFirst)) return agentLookup.get(strippedFirst)!;
        // Also try the first two tokens joined (e.g. "AA 5013" → "AA5013")
        const twoTokens = tokens.slice(0, 2).join('');
        if (twoTokens && twoTokens !== firstToken && agentLookup.has(twoTokens)) return agentLookup.get(twoTokens)!;
        // Strip prefix from twoTokens (e.g. "AA5013" → "5013" for spaced "AA 5013" inputs)
        const strippedTwo = twoTokens.replace(/^[A-Z]+/, '');
        if (strippedTwo && strippedTwo !== twoTokens && strippedTwo !== strippedFirst && agentLookup.has(strippedTwo)) return agentLookup.get(strippedTwo)!;
        // Last-word fallback: agent code may appear at the end (e.g. "NARAYANAN AA5013")
        const lastToken = tokens[tokens.length - 1] || '';
        if (lastToken && lastToken !== firstToken && agentLookup.has(lastToken)) return agentLookup.get(lastToken)!;
        // Strip leading letter prefix from last token too
        const strippedLast = lastToken.replace(/^[A-Z]+/, '');
        if (strippedLast && strippedLast !== lastToken && strippedLast !== strippedFirst && agentLookup.has(strippedLast)) return agentLookup.get(strippedLast)!;
        // Phone-number fallback: match customer_phone against agent mobile_no
        if (customerPhone) {
          const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10);
          if (phoneDigits && agentPhoneLookup.has(phoneDigits)) return agentPhoneLookup.get(phoneDigits)!;
        }
        return null;
      }

      const matchedOrders = allOrders.filter(o => matchAgent(o.customerName || '', o.customerPhone) !== null);
      const unmatchedOrdersList = allOrders.filter(o => matchAgent(o.customerName || '', o.customerPhone) === null);
      const unmatchedCount = unmatchedOrdersList.length;

      type SegAgentRow = {
        agentId: string;
        agentCode: string;
        agentName: string;
        pointName: string;
        morning: Record<string, number>;
        evening: Record<string, number>;
        morningValue: number;
        eveningValue: number;
        totalValue: number;
        orderCount: number;
        ordersQty: number;
        subscriptionQty: number;
        freeMilkQty: number;
        totalQty: number;
      };

      type SegData = {
        products: string[];
        productPrices: Record<string, number>;
        agents: SegAgentRow[];
        totalOrders: number;
        totalValue: number;
        productTotals: Record<string, { morning: number; evening: number }>;
      };

      const segments: Record<string, SegData> = {
        'Fresh Milk': { products: [], productPrices: {}, agents: [], totalOrders: 0, totalValue: 0, productTotals: {} },
        'Products': { products: [], productPrices: {}, agents: [], totalOrders: 0, totalValue: 0, productTotals: {} },
        'Ice Cream': { products: [], productPrices: {}, agents: [], totalOrders: 0, totalValue: 0, productTotals: {} },
      };

      const segProductSets: Record<string, Set<string>> = { 'Fresh Milk': new Set(), 'Products': new Set(), 'Ice Cream': new Set() };
      const agentSegRows: Record<string, Record<string, SegAgentRow>> = {};

      for (const agent of routeAgents) {
        agentSegRows[agent.id] = {};
        for (const seg of ['Fresh Milk', 'Products', 'Ice Cream']) {
          agentSegRows[agent.id][seg] = {
            agentId: agent.id,
            agentCode: agent.agentCode,
            agentName: agent.agentName,
            pointName: agent.pointName,
            morning: {},
            evening: {},
            morningValue: 0,
            eveningValue: 0,
            totalValue: 0,
            orderCount: 0,
            ordersQty: 0,
            subscriptionQty: 0,
            freeMilkQty: 0,
            totalQty: 0,
          };
        }
      }

      const { masterProducts: masterProductsTable } = await import("@shared/schema");
      const catalogProducts = await db.select({ name: masterProductsTable.name, segment: masterProductsTable.segment }).from(masterProductsTable);
      const catalogSegmentMap = new Map<string, string>();
      for (const cp of catalogProducts) {
        if (cp.name && cp.segment) {
          catalogSegmentMap.set(cp.name.toLowerCase().trim(), cp.segment);
        }
      }
      function lookupSegment(itemName: string, fallbackSeg: string): string {
        const catalogSeg = catalogSegmentMap.get((itemName || '').toLowerCase().trim());
        if (catalogSeg && ['Fresh Milk', 'Products', 'Ice Cream'].includes(catalogSeg)) return catalogSeg;
        // Keyword-based fallback before defaulting to Products (prevents misclassification of unlisted items)
        const lower = (itemName || '').toLowerCase();
        const iceCreamKw = ['ice cream', 'kulfi', 'frozen', 'popsicle', 'sundae'];
        const freshMilkKw = ['milk', 'buttermilk', 'butter milk', 'lassi', 'toned', 'standardised', 'standardized', 'full cream', 'double toned', 'skimmed', 'curd', 'paneer', 'ghee', 'butter', 'cream'];
        if (iceCreamKw.some(k => lower.includes(k))) return 'Ice Cream';
        if (freshMilkKw.some(k => lower.includes(k))) return 'Fresh Milk';
        return ['Fresh Milk', 'Products', 'Ice Cream'].includes(fallbackSeg) ? fallbackSeg : 'Products';
      }

      for (const order of matchedOrders) {
        const agent = matchAgent(order.customerName || '', order.customerPhone);
        if (!agent) continue;
        const orderShift = (order as any).deliveryShift || (new Date(order.createdAt!).getHours() >= 12 ? 'evening' : 'morning');

        const items = Array.isArray(order.items) ? order.items : [];
        const segmentsInOrder = new Set<string>();

        for (const item of items) {
          const prodName = item.name || item.productName || 'Unknown';
          const itemSeg = item.productSegment || item.category || order.productSegment || 'Other';
          const normalizedSeg = lookupSegment(prodName, itemSeg);
          segmentsInOrder.add(normalizedSeg);

          const qty = parseInt(String(item.quantity || '0'), 10);
          const price = parseFloat(String(item.price || '0'));

          segProductSets[normalizedSeg].add(prodName);
          if (!segments[normalizedSeg].productPrices[prodName]) segments[normalizedSeg].productPrices[prodName] = price;

          const shift = normalizedSeg === 'Fresh Milk' ? orderShift : 'morning';

          const row = agentSegRows[agent.id][normalizedSeg];
          const bucket = shift === 'morning' ? row.morning : row.evening;
          bucket[prodName] = (bucket[prodName] || 0) + qty;

          const lineValue = qty * price;
          if (shift === 'morning') row.morningValue += lineValue;
          else row.eveningValue += lineValue;
          row.totalValue += lineValue;

          if (!segments[normalizedSeg].productTotals[prodName]) segments[normalizedSeg].productTotals[prodName] = { morning: 0, evening: 0 };
          segments[normalizedSeg].productTotals[prodName][shift === 'morning' ? 'morning' : 'evening'] += qty;
        }

        for (const seg of segmentsInOrder) {
          agentSegRows[agent.id][seg].orderCount++;
          segments[seg].totalOrders++;
        }
      }

      // Compute ordersQty (total product units from orders) and initialise totalQty per agent/seg
      for (const agent of routeAgents) {
        for (const seg of ['Fresh Milk', 'Products', 'Ice Cream']) {
          const row = agentSegRows[agent.id][seg];
          const morningTotal = Object.values(row.morning).reduce((s, v) => s + v, 0);
          const eveningTotal = Object.values(row.evening).reduce((s, v) => s + v, 0);
          row.ordersQty = morningTotal + eveningTotal;
          // subscriptionQty stays 0 until subscription system is live
          row.totalQty = row.ordersQty + row.subscriptionQty + row.freeMilkQty;
        }
      }

      for (const seg of ['Fresh Milk', 'Products', 'Ice Cream']) {
        segments[seg].products = Array.from(segProductSets[seg]).sort();
        const agentRows: SegAgentRow[] = [];
        for (const agent of routeAgents) {
          const row = agentSegRows[agent.id][seg];
          if (row.orderCount > 0 || routeAgents.length <= 100) {
            agentRows.push(row);
          }
        }
        segments[seg].agents = agentRows;
        segments[seg].totalValue = agentRows.reduce((s, r) => s + r.totalValue, 0);
      }

      const totalMatchedOrders = matchedOrders.length;
      const totalMatchedValue = matchedOrders.reduce((s, o) => s + parseFloat(String(o.total || '0')), 0);

      const unmatchedOrdersDetail = unmatchedOrdersList.map(o => ({
        id: o.id,
        customerName: o.customerName || 'Unknown',
        customerPhone: o.customerPhone || null,
        total: parseFloat(String(o.total || '0')),
        productSegment: o.productSegment || 'Unknown',
        items: Array.isArray(o.items) ? o.items.map((it: any) => ({
          name: it.name || it.productName || 'Unknown',
          quantity: parseFloat(String(it.quantity || it.qty || '0')),
          price: parseFloat(String(it.price || '0')),
        })) : [],
        createdAt: o.createdAt,
        deliveryShift: (o as any).deliveryShift || (o.createdAt && new Date(o.createdAt).getHours() >= 12 ? 'evening' : 'morning'),
      }));

      const matchedOrdersDetail = matchedOrders.map(o => {
        const nameAgent = matchAgent(o.customerName || '');
        const dbAgentId = (o as any).agentId;
        const dbAgentName = (o as any).agentName;
        const dbAgent = dbAgentId ? routeAgents.find((a: any) => a.id === dbAgentId) : null;
        return {
          id: o.id,
          customerName: o.customerName || 'Unknown',
          total: parseFloat(String(o.total || '0')),
          productSegment: o.productSegment || 'Unknown',
          items: Array.isArray(o.items) ? o.items.map((it: any) => ({
            name: it.name || it.productName || 'Unknown',
            quantity: parseFloat(String(it.quantity || it.qty || '0')),
            price: parseFloat(String(it.price || '0')),
          })) : [],
          createdAt: o.createdAt,
          deliveryShift: (o as any).deliveryShift || (o.createdAt && new Date(o.createdAt).getHours() >= 12 ? 'evening' : 'morning'),
          currentAgentId: dbAgentId || nameAgent?.id || null,
          currentAgentCode: dbAgent?.agentCode || nameAgent?.agentCode || null,
          currentAgentName: dbAgentName || nameAgent?.agentName || null,
        };
      });

      // Fetch approved route-delivery free milk requests for this route's agents
      const routeAgentIds = routeAgents.map(a => a.id);
      let totalFreeMilkQty = 0;
      if (routeAgentIds.length > 0) {
        const freeMilkRows = await db.select().from(freeMilkRequests).where(
          and(
            eq(freeMilkRequests.unionId, merchantId),
            eq(freeMilkRequests.status, 'approved'),
            eq(freeMilkRequests.deliveryType, 'route'),
            inArray(freeMilkRequests.assignedAgentId, routeAgentIds)
          )
        );
        for (const fmr of freeMilkRows) {
          const qty = parseFloat(String(fmr.quantityLiters || '0'));
          totalFreeMilkQty += qty;
          // Add to the Fresh Milk segment row for this agent and recompute totalQty
          if (fmr.assignedAgentId && agentSegRows[fmr.assignedAgentId]) {
            const row = agentSegRows[fmr.assignedAgentId]['Fresh Milk'];
            row.freeMilkQty += qty;
            row.totalQty = row.ordersQty + row.subscriptionQty + row.freeMilkQty;
          }
        }
      }

      res.json({
        dispatchDate: dateStr,
        orderDate: orderDateStr,
        routeName: ownerRoute.routeName,
        routeCode: ownerRoute.routeCode,
        agents: routeAgents,
        segments,
        matchedOrderCount: totalMatchedOrders,
        unmatchedOrderCount: unmatchedCount,
        unmatchedOrders: unmatchedOrdersDetail,
        matchedOrders: matchedOrdersDetail,
        totalAllUnionOrders: allOrders.length,
        summary: {
          totalOrders: totalMatchedOrders,
          totalValue: totalMatchedValue,
          totalFreeMilkQty,
        },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  app.get("/api/mmo/routes/:routeId/payment-statement", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });

      const { date } = req.query;
      const dateStr = String(date || new Date().toISOString().split("T")[0]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: "Invalid date format, use YYYY-MM-DD" });

      const routeAgents = await db.select().from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.routeId, req.params.routeId), eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)));

      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const merchantToUnionMapping: Record<string, string> = { "merchant-3": "UNI-SLM-01", "merchant-2": "UNI-CBE-01" };
      const mappedUnionId = merchantToUnionMapping[merchantId] || merchantId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === merchantId)?.[0] || merchantId;
      const restaurantIds = [...new Set([merchantId, mappedUnionId, reverseUnionId])];

      const agentLookup = new Map<string, typeof routeAgents[0]>();
      const agentPhoneLookupStmt = new Map<string, typeof routeAgents[0]>();
      for (const a of routeAgents) {
        agentLookup.set(a.agentCode.toUpperCase(), a);
        agentLookup.set(a.agentName.toUpperCase(), a);
        if (a.mobileNo) {
          const digits = a.mobileNo.replace(/\D/g, '');
          if (digits) agentPhoneLookupStmt.set(digits.slice(-10), a);
        }
      }

      function matchStatementAgent(customerName: string, customerPhone?: string | null) {
        const cn = (customerName || '').toUpperCase().trim();
        if (agentLookup.has(cn)) return agentLookup.get(cn)!;
        const tokens = cn.split(/[\s.\-,\/]+/).filter(Boolean);
        const firstToken = tokens[0] || '';
        if (firstToken && agentLookup.has(firstToken)) return agentLookup.get(firstToken)!;
        const strippedFirst = firstToken.replace(/^[A-Z]+/, '');
        if (strippedFirst && strippedFirst !== firstToken && agentLookup.has(strippedFirst)) return agentLookup.get(strippedFirst)!;
        const twoTokens = tokens.slice(0, 2).join('');
        if (twoTokens && twoTokens !== firstToken && agentLookup.has(twoTokens)) return agentLookup.get(twoTokens)!;
        const strippedTwo = twoTokens.replace(/^[A-Z]+/, '');
        if (strippedTwo && strippedTwo !== twoTokens && strippedTwo !== strippedFirst && agentLookup.has(strippedTwo)) return agentLookup.get(strippedTwo)!;
        const lastToken = tokens[tokens.length - 1] || '';
        if (lastToken && lastToken !== firstToken && agentLookup.has(lastToken)) return agentLookup.get(lastToken)!;
        const strippedLast = lastToken.replace(/^[A-Z]+/, '');
        if (strippedLast && strippedLast !== lastToken && strippedLast !== strippedFirst && agentLookup.has(strippedLast)) return agentLookup.get(strippedLast)!;
        if (customerPhone) {
          const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10);
          if (phoneDigits && agentPhoneLookupStmt.has(phoneDigits)) return agentPhoneLookupStmt.get(phoneDigits)!;
        }
        return null;
      }

      const restaurantIdsSql = sql.join(restaurantIds.map(id => sql`${id}`), sql`, `);
      const result = await db.execute(
        sql`SELECT o.id, o.customer_name, o.customer_phone, o.display_id, o.order_number, o.total, o.delivery_shift,
                   o.payment_method AS gateway_name,
                   pt.gateway_payment_id, COALESCE(pt.amount, o.total) AS txn_amount
            FROM orders o
            LEFT JOIN LATERAL (
              SELECT pt2.gateway_payment_id, pt2.amount
              FROM payment_orders po
              JOIN payment_transactions pt2 ON pt2.payment_order_id = po.id AND pt2.status = 'captured'
              WHERE po.merchant_id = o.restaurant_id
                AND po.amount_paid = o.total
                AND (o.delivery_shift IS NULL OR (po.notes->'cartSnapshot'->>'deliveryShift') = o.delivery_shift)
                AND po.created_at >= ${dateStart}::timestamp - interval '6 hours'
                AND po.created_at < ${dateEnd}::timestamp + interval '6 hours'
              ORDER BY po.created_at DESC
              LIMIT 1
            ) pt ON true
            WHERE o.restaurant_id = ANY(ARRAY[${restaurantIdsSql}])
              AND o.created_at >= ${dateStart} AND o.created_at <= ${dateEnd}
              AND o.payment_status = 'paid'
              AND o.payment_method IN ('razorpay', 'cashfree')
            ORDER BY o.created_at ASC`
      );

      const rows: any[] = [];
      let sno = 1;
      for (const row of result.rows as any[]) {
        const agent = matchStatementAgent(row.customer_name || '', row.customer_phone || null);
        if (!agent) continue;
        const pgRaw = String(row.gateway_name || 'razorpay');
        rows.push({
          sno: sno++,
          zone: ownerRoute.routeName,
          shift: row.delivery_shift || 'morning',
          boothCode: agent.agentCode,
          agentName: agent.agentName,
          orderId: row.display_id || row.order_number || row.id,
          pgName: pgRaw.charAt(0).toUpperCase() + pgRaw.slice(1),
          txnType: 'Order',
          amount: parseFloat(String(row.txn_amount || row.total || '0')),
          txnId: row.gateway_payment_id || '',
        });
      }

      res.json({ rows, routeName: ownerRoute.routeName, orderDate: orderDateStr, dispatchDate: dateStr });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  app.get("/api/mmo/routes/:routeId/collection-statement", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });

      const { date } = req.query;
      const dateStr = String(date || new Date().toISOString().split("T")[0]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: "Invalid date format, use YYYY-MM-DD" });

      const routeAgents = await db.select().from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.routeId, req.params.routeId), eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)));

      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const merchantToUnionMapping: Record<string, string> = { "merchant-3": "UNI-SLM-01", "merchant-2": "UNI-CBE-01" };
      const mappedUnionId = merchantToUnionMapping[merchantId] || merchantId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === merchantId)?.[0] || merchantId;
      const restaurantIds = [...new Set([merchantId, mappedUnionId, reverseUnionId])];

      const agentLookup = new Map<string, typeof routeAgents[0]>();
      const agentPhoneLookupCol = new Map<string, typeof routeAgents[0]>();
      for (const a of routeAgents) {
        agentLookup.set(a.agentCode.toUpperCase(), a);
        agentLookup.set(a.agentName.toUpperCase(), a);
        if (a.mobileNo) {
          const digits = a.mobileNo.replace(/\D/g, '');
          if (digits) agentPhoneLookupCol.set(digits.slice(-10), a);
        }
      }

      function matchColAgent(customerName: string, customerPhone?: string | null) {
        const cn = (customerName || '').toUpperCase().trim();
        if (agentLookup.has(cn)) return agentLookup.get(cn)!;
        const tokens = cn.split(/[\s.\-,\/]+/).filter(Boolean);
        const firstToken = tokens[0] || '';
        if (firstToken && agentLookup.has(firstToken)) return agentLookup.get(firstToken)!;
        const strippedFirst = firstToken.replace(/^[A-Z]+/, '');
        if (strippedFirst && strippedFirst !== firstToken && agentLookup.has(strippedFirst)) return agentLookup.get(strippedFirst)!;
        const twoTokens = tokens.slice(0, 2).join('');
        if (twoTokens && twoTokens !== firstToken && agentLookup.has(twoTokens)) return agentLookup.get(twoTokens)!;
        const strippedTwo = twoTokens.replace(/^[A-Z]+/, '');
        if (strippedTwo && strippedTwo !== twoTokens && strippedTwo !== strippedFirst && agentLookup.has(strippedTwo)) return agentLookup.get(strippedTwo)!;
        const lastToken = tokens[tokens.length - 1] || '';
        if (lastToken && lastToken !== firstToken && agentLookup.has(lastToken)) return agentLookup.get(lastToken)!;
        const strippedLast = lastToken.replace(/^[A-Z]+/, '');
        if (strippedLast && strippedLast !== lastToken && strippedLast !== strippedFirst && agentLookup.has(strippedLast)) return agentLookup.get(strippedLast)!;
        if (customerPhone) {
          const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10);
          if (phoneDigits && agentPhoneLookupCol.has(phoneDigits)) return agentPhoneLookupCol.get(phoneDigits)!;
        }
        return null;
      }

      const restaurantIdsSql = sql.join(restaurantIds.map(id => sql`${id}`), sql`, `);
      const result = await db.execute(
        sql`SELECT o.id, o.customer_name, o.customer_phone, o.display_id, o.order_number, o.total, o.delivery_shift,
                   o.payment_method AS gateway_name,
                   pt.gateway_payment_id, COALESCE(pt.amount, o.total) AS txn_amount
            FROM orders o
            LEFT JOIN LATERAL (
              SELECT pt2.gateway_payment_id, pt2.amount
              FROM payment_orders po
              JOIN payment_transactions pt2 ON pt2.payment_order_id = po.id AND pt2.status = 'captured'
              WHERE po.merchant_id = o.restaurant_id
                AND po.amount_paid = o.total
                AND (o.delivery_shift IS NULL OR (po.notes->'cartSnapshot'->>'deliveryShift') = o.delivery_shift)
                AND po.created_at >= ${dateStart}::timestamp - interval '6 hours'
                AND po.created_at < ${dateEnd}::timestamp + interval '6 hours'
              ORDER BY po.created_at DESC
              LIMIT 1
            ) pt ON true
            WHERE o.restaurant_id = ANY(ARRAY[${restaurantIdsSql}])
              AND o.created_at >= ${dateStart} AND o.created_at <= ${dateEnd}
              AND o.payment_status = 'paid'
            ORDER BY o.created_at ASC`
      );

      const rows: any[] = [];
      const byMode: Record<string, number> = {};
      let sno = 1;
      for (const row of result.rows as any[]) {
        const agent = matchColAgent(row.customer_name || '', row.customer_phone || null);
        if (!agent) continue;
        const hasOnline = !!row.gateway_name;
        const pgRaw = hasOnline ? String(row.gateway_name) : 'cash';
        const paymentMode = hasOnline ? (pgRaw.charAt(0).toUpperCase() + pgRaw.slice(1)) : 'Cash';
        const amount = hasOnline
          ? parseFloat(String(row.txn_amount || row.total || '0'))
          : parseFloat(String(row.total || '0'));
        byMode[paymentMode] = (byMode[paymentMode] || 0) + amount;
        rows.push({
          sno: sno++,
          zone: ownerRoute.routeName,
          shift: row.delivery_shift || 'morning',
          boothCode: agent.agentCode,
          agentName: agent.agentName,
          orderId: row.display_id || row.order_number || row.id,
          paymentMode,
          amount,
          txnId: hasOnline ? (row.gateway_payment_id || '') : '',
        });
      }

      const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
      res.json({ rows, routeName: ownerRoute.routeName, orderDate: orderDateStr, dispatchDate: dateStr, summary: { totalAmount, byMode } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  app.get("/api/mmo/routes/:routeId/collection-summary", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const [ownerRoute] = await db.select().from(mmoRoutes).where(and(eq(mmoRoutes.id, req.params.routeId), eq(mmoRoutes.unionId, merchantId)));
      if (!ownerRoute) return res.status(403).json({ error: "Route does not belong to your union" });

      const { date } = req.query;
      const dateStr = String(date || new Date().toISOString().split("T")[0]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: "Invalid date format, use YYYY-MM-DD" });

      const routeAgents = await db.select().from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.routeId, req.params.routeId), eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)));

      if (routeAgents.length === 0) return res.json({ totalAmount: 0, cashCount: 0, onlineCount: 0, byMode: {} });

      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const merchantToUnionMapping: Record<string, string> = { "merchant-3": "UNI-SLM-01", "merchant-2": "UNI-CBE-01" };
      const mappedUnionId = merchantToUnionMapping[merchantId] || merchantId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === merchantId)?.[0] || merchantId;
      const restaurantIds = [...new Set([merchantId, mappedUnionId, reverseUnionId])];

      const agentLookup = new Map<string, boolean>();
      for (const a of routeAgents) {
        agentLookup.set(a.agentCode.toUpperCase(), true);
        agentLookup.set(a.agentName.toUpperCase(), true);
      }

      function matchSummaryAgent(customerName: string): boolean {
        const cn = (customerName || '').toUpperCase().trim();
        if (agentLookup.has(cn)) return true;
        const tokens = cn.split(/[\s.\-,\/]+/).filter(Boolean);
        const firstToken = tokens[0] || '';
        if (firstToken && agentLookup.has(firstToken)) return true;
        const strippedFirst = firstToken.replace(/^[A-Z]+/, '');
        if (strippedFirst && strippedFirst !== firstToken && agentLookup.has(strippedFirst)) return true;
        const twoTokens = tokens.slice(0, 2).join('');
        if (twoTokens && twoTokens !== firstToken && agentLookup.has(twoTokens)) return true;
        const strippedTwo = twoTokens.replace(/^[A-Z]+/, '');
        if (strippedTwo && strippedTwo !== twoTokens && strippedTwo !== strippedFirst && agentLookup.has(strippedTwo)) return true;
        const lastToken = tokens[tokens.length - 1] || '';
        if (lastToken && lastToken !== firstToken && agentLookup.has(lastToken)) return true;
        const strippedLast = lastToken.replace(/^[A-Z]+/, '');
        if (strippedLast && strippedLast !== lastToken && strippedLast !== strippedFirst && agentLookup.has(strippedLast)) return true;
        return false;
      }

      const restaurantIdsSql = sql.join(restaurantIds.map(id => sql`${id}`), sql`, `);
      const result = await db.execute(
        sql`SELECT o.customer_name, o.total, o.payment_method AS gateway_name
            FROM orders o
            WHERE o.restaurant_id = ANY(ARRAY[${restaurantIdsSql}])
              AND o.created_at >= ${dateStart} AND o.created_at <= ${dateEnd}
              AND o.payment_status = 'paid'`
      );

      let totalAmount = 0;
      let cashCount = 0;
      let onlineCount = 0;
      const byMode: Record<string, { count: number; amount: number }> = {};

      for (const row of result.rows as any[]) {
        if (!matchSummaryAgent(row.customer_name || '')) continue;
        const pm = (row.gateway_name || '').toLowerCase();
        const hasOnline = pm === 'razorpay' || pm === 'cashfree';
        const paymentMode = hasOnline ? (pm.charAt(0).toUpperCase() + pm.slice(1)) : 'Cash';
        const amount = parseFloat(String(row.total || '0'));
        totalAmount += amount;
        if (hasOnline) onlineCount++; else cashCount++;
        if (!byMode[paymentMode]) byMode[paymentMode] = { count: 0, amount: 0 };
        byMode[paymentMode].count++;
        byMode[paymentMode].amount += amount;
      }

      res.json({ totalAmount, cashCount, onlineCount, byMode });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/mmo/routes/:routeId/assign-order", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { routeId } = req.params;
      const { orderId, agentId } = req.body;
      if (!orderId || !agentId) return res.status(400).json({ error: "orderId and agentId are required" });

      const merchantId = getEffectiveMerchantId(req);
      const [route] = await db.select().from(mmoRoutes).where(eq(mmoRoutes.id, routeId));
      if (!route) return res.status(404).json({ error: "Route not found" });

      if (merchantId) {
        const validIds = getAllIdsForMerchant(merchantId);
        if (!validIds.includes(route.unionId)) {
          return res.status(403).json({ error: "Route does not belong to your union" });
        }
      }

      const [agent] = await db.select().from(mmoRouteAgents).where(and(eq(mmoRouteAgents.id, agentId), eq(mmoRouteAgents.routeId, routeId)));
      if (!agent) return res.status(404).json({ error: "Agent not found on this route" });

      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, String(orderId)));
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (merchantId) {
        const validIds = getAllIdsForMerchant(merchantId);
        if (!validIds.includes(order.restaurantId || '')) {
          return res.status(403).json({ error: "Order does not belong to your union" });
        }
      }

      let baseName = order.customerName || '';
      if (order.agentId) {
        const oldAgent = await db.select().from(mmoRouteAgents).where(eq(mmoRouteAgents.id, order.agentId)).then(r => r[0]);
        if (oldAgent) {
          const prefix = `${oldAgent.agentCode} `;
          if (baseName.startsWith(prefix)) {
            baseName = baseName.substring(prefix.length);
          }
        }
      }
      const newName = `${agent.agentCode} ${baseName}`;
      await db.update(ordersTable).set({
        customerName: newName,
        agentId: agent.id,
        agentName: agent.agentName,
      }).where(eq(ordersTable.id, String(orderId)));

      res.json({ success: true, message: `Order assigned to ${agent.agentName} (${agent.agentCode})` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== Head Office: auto-create + fetch HEAD office record =====
  app.get("/api/head-office", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      let [existing] = await db.select().from(mmoOffices)
        .where(and(eq(mmoOffices.unionId, merchantId), eq(mmoOffices.officeCode, 'HEAD'), eq(mmoOffices.isActive, true)))
        .limit(1);
      if (existing) return res.json(existing);
      try {
        const [created] = await db.insert(mmoOffices).values({
          unionId: merchantId,
          officeName: 'Head Office',
          officeCode: 'HEAD',
          sequenceNo: -1,
        }).returning();
        return res.json(created);
      } catch {
        [existing] = await db.select().from(mmoOffices)
          .where(and(eq(mmoOffices.unionId, merchantId), eq(mmoOffices.officeCode, 'HEAD'), eq(mmoOffices.isActive, true)))
          .limit(1);
        if (existing) return res.json(existing);
        throw new Error("Failed to create Head Office record");
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== Head Office: B2B Products + Ice Cream orders =====
  app.get("/api/head-office/orders", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const { status, segment } = req.query;
      const validIds = getAllIdsForMerchant(merchantId);
      const conditions: any[] = [
        inArray(ordersTable.restaurantId, validIds),
        inArray(ordersTable.productSegment, ['Products', 'Ice Cream']),
        ne(ordersTable.pricingRole, 'MRP'),
      ];
      if (status && typeof status === 'string') {
        conditions.push(eq(ordersTable.status, status));
      }
      if (segment && typeof segment === 'string' && segment !== 'all') {
        conditions.push(eq(ordersTable.productSegment, segment));
      }
      const result = await db.select({
        id: ordersTable.id,
        displayId: ordersTable.displayId,
        customerName: ordersTable.customerName,
        customerPhone: ordersTable.customerPhone,
        productSegment: ordersTable.productSegment,
        pricingRole: ordersTable.pricingRole,
        total: ordersTable.total,
        status: ordersTable.status,
        items: ordersTable.items,
        deliveryShift: ordersTable.deliveryShift,
        deliveryAddress: ordersTable.deliveryAddress,
        agentId: ordersTable.agentId,
        agentName: ordersTable.agentName,
        createdAt: ordersTable.createdAt,
      }).from(ordersTable)
        .where(and(...conditions))
        .orderBy(desc(ordersTable.createdAt))
        .limit(200);
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== Segment Dispatch Report (Products & Ice Cream) =====
  app.get("/api/segment-dispatch/report", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { segment, date, shift, merchantId: qMerchantId, search } = req.query;
      if (!segment || !date) return res.status(400).json({ error: "segment and date required" });

      const segmentStr = String(segment);
      const dateStr = String(date);
      const shiftStr = String(shift || "combined");
      const userRole = (req.user as any)?.role || '';
      const sessionMerchantId = (req.user as any)?.merchantId || (req.user as any)?.restaurantId || '';
      const unionId = (userRole === 'admin' && qMerchantId) ? String(qMerchantId) : (sessionMerchantId || "merchant-3");

      const prevDate = new Date(dateStr);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const mappedUnionId = merchantToUnionMapping[unionId] || unionId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === unionId)?.[0] || unionId;
      const restaurantIds = [...new Set([unionId, mappedUnionId, reverseUnionId])];

      const segmentOrders = await db.select().from(ordersTable).where(
        and(
          eq(ordersTable.productSegment, segmentStr),
          sql`${ordersTable.createdAt} >= ${dateStart} AND ${ordersTable.createdAt} <= ${dateEnd}`,
          sql`${ordersTable.restaurantId} IN (${sql.join(restaurantIds.map(id => sql`${id}`), sql`, `)})`
        )
      );

      const productSet = new Set<string>();
      const productPrices: Record<string, number> = {};

      type CustomerRow = {
        customerCode: string;
        customerName: string;
        morning: Record<string, number>;
        evening: Record<string, number>;
      };
      const customerMap = new Map<string, CustomerRow>();

      for (const order of segmentOrders) {
        const orderShift = order.deliveryShift || (order.createdAt && new Date(order.createdAt).getHours() >= 12 ? "evening" : "morning");
        if (shiftStr !== "combined" && orderShift !== shiftStr) continue;

        let custCode = order.customerName || "UNKNOWN";
        const codeMatch = custCode.match(/\b([A-Z]{2,3}\d{3,5})\b/i);
        if (codeMatch) custCode = codeMatch[1].toUpperCase();
        else {
          const pureNum = custCode.match(/^(\d{3,5})$/);
          if (pureNum) custCode = pureNum[1];
        }
        const custName = order.customerName || custCode;
        const custKey = custCode;

        if (!customerMap.has(custKey)) {
          customerMap.set(custKey, { customerCode: custCode, customerName: custName, morning: {}, evening: {} });
        }
        const row = customerMap.get(custKey)!;

        const items: any[] = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
          const prodName = item.name || item.productName || "Unknown Product";
          const qty = parseFloat(item.quantity || item.qty || "0");
          const price = parseFloat(item.price || item.unitPrice || "0");

          productSet.add(prodName);
          if (price > 0 && !productPrices[prodName]) productPrices[prodName] = price;

          const shiftData = orderShift === "evening" ? row.evening : row.morning;
          shiftData[prodName] = (shiftData[prodName] || 0) + qty;
        }
      }

      const products = Array.from(productSet).sort();

      const rows = Array.from(customerMap.values()).map((cust, idx) => {
        const morningTotal = products.reduce((s, p) => s + (cust.morning[p] || 0), 0);
        const eveningTotal = products.reduce((s, p) => s + (cust.evening[p] || 0), 0);
        const grandTotal = morningTotal + eveningTotal;
        let orderValue = 0;
        for (const p of products) {
          const qty = (cust.morning[p] || 0) + (cust.evening[p] || 0);
          orderValue += qty * (productPrices[p] || 0);
        }
        return {
          sno: idx + 1,
          customerCode: cust.customerCode,
          customerName: cust.customerName,
          morning: cust.morning,
          evening: cust.evening,
          morningTotal,
          eveningTotal,
          grandTotal,
          orderValue,
        };
      });

      if (search) {
        const s = String(search).toLowerCase();
        const filtered = rows.filter(r =>
          r.customerCode.toLowerCase().includes(s) || r.customerName.toLowerCase().includes(s)
        );
        filtered.forEach((r, i) => r.sno = i + 1);
        rows.length = 0;
        rows.push(...filtered);
      }

      const totals: Record<string, number> = { morningTotal: 0, eveningTotal: 0, grandTotal: 0, orderValue: 0 };
      for (const p of products) {
        totals[`morning_${p}`] = 0;
        totals[`evening_${p}`] = 0;
      }
      rows.forEach(r => {
        totals.morningTotal += r.morningTotal;
        totals.eveningTotal += r.eveningTotal;
        totals.grandTotal += r.grandTotal;
        totals.orderValue += r.orderValue;
        for (const p of products) {
          totals[`morning_${p}`] += (r.morning[p] || 0);
          totals[`evening_${p}`] += (r.evening[p] || 0);
        }
      });

      res.json({
        header: { segment: segmentStr, unionId, date: dateStr, shift: shiftStr },
        products,
        productPrices,
        rows,
        totals,
        summary: {
          morningTotalPackets: totals.morningTotal,
          eveningTotalPackets: totals.eveningTotal,
          totalOrderValue: totals.orderValue,
          customersCovered: rows.filter(r => r.grandTotal > 0).length,
          totalCustomers: rows.length,
          totalOrders: segmentOrders.length,
        },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
