import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, merchantToUnionMapping, getAllIdsForMerchant, resolveDistrictUnionToMerchantId, autoCreateDeliveryJob, autoAssignDriverToOrder } from "./shared";
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

export async function registerStaffRoutes(app: Express): Promise<void> {
  app.get("/api/unions/list", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (_req: AuthenticatedRequest, res) => {
    try {
      const merchants = await storage.getMerchants();
      const reverseMapping: Record<string, string> = {};
      for (const [mId, uId] of Object.entries(merchantToUnionMapping)) {
        reverseMapping[uId] = mId;
      }

      const seen = new Set<string>();
      const unionList: any[] = [];

      for (const m of merchants) {
        const key = m.id;
        if (seen.has(key)) continue;
        seen.add(key);

        const altIds: string[] = [m.id];
        if (merchantToUnionMapping[m.id]) altIds.push(merchantToUnionMapping[m.id]);
        if (reverseMapping[m.id]) altIds.push(reverseMapping[m.id]);

        unionList.push({
          id: m.id,
          altIds,
          name: m.restaurantName || m.contactName || m.name || m.id,
          unionCode: (m as any).unionCode || '',
        });
      }

      for (const [merchantStyleId, unionStyleId] of Object.entries(merchantToUnionMapping)) {
        if (!seen.has(merchantStyleId) && !seen.has(unionStyleId)) {
          const m = merchants.find(x => x.id === unionStyleId);
          seen.add(merchantStyleId);
          seen.add(unionStyleId);
          unionList.push({
            id: unionStyleId,
            altIds: [unionStyleId, merchantStyleId],
            name: m?.restaurantName || m?.contactName || unionStyleId,
            unionCode: '',
          });
        }
      }

      res.json(unionList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unions" });
    }
  });

  app.get("/api/admin/app-performance", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const range = (req.query.range as string) || 'today';
      const now = new Date();
      let startDate: Date;

      switch (range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday': {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate());
          break;
        }
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      const endDate = range === 'yesterday'
        ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1)
        : now;

      const logs = await db.select().from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.createdAt, startDate),
          lte(userActivityLogs.createdAt, endDate)
        ))
        .orderBy(desc(userActivityLogs.createdAt));

      const loginCount = logs.filter(l => l.eventType === 'login').length;
      const signupCount = logs.filter(l => l.eventType === 'signup').length;
      const orderCount = logs.filter(l => l.eventType === 'order_placed').length;

      const uniqueUsers = new Set(logs.filter(l => l.eventType === 'login').map(l => l.userId)).size;

      const loginsByRole: Record<string, number> = {};
      logs.filter(l => l.eventType === 'login').forEach(l => {
        const role = l.userRole || 'unknown';
        loginsByRole[role] = (loginsByRole[role] || 0) + 1;
      });

      const hourlyActivity: Record<string, number> = {};
      logs.forEach(l => {
        const hour = l.createdAt ? new Date(l.createdAt).getHours() : 0;
        const key = `${hour}:00`;
        hourlyActivity[key] = (hourlyActivity[key] || 0) + 1;
      });

      const recentActivity = logs.slice(0, 20).map(l => ({
        id: l.id,
        eventType: l.eventType,
        userName: l.userName,
        userRole: l.userRole,
        userEmail: l.userEmail,
        metadata: l.metadata,
        createdAt: l.createdAt,
      }));

      res.json({
        range,
        summary: {
          signedInUsers: loginCount,
          uniqueSignedInUsers: uniqueUsers,
          newSignups: signupCount,
          ordersPlaced: orderCount,
        },
        loginsByRole,
        hourlyActivity,
        recentActivity,
      });
    } catch (error) {
      console.error('App performance error:', error);
      res.status(500).json({ error: 'Failed to fetch app performance data' });
    }
  });

  app.get("/api/admin/segment-staff", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const segStaff = await db.query.unionStaff.findMany({
        where: eq(unionStaff.department, 'segment_workflow'),
        orderBy: [asc(unionStaff.level), asc(unionStaff.designationId)]
      });
      res.json(segStaff);
    } catch (error) {
      console.error('Error fetching segment staff:', error);
      res.status(500).json({ message: "Failed to fetch segment staff" });
    }
  });

  app.post("/api/admin/segment-staff", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { name, phone, email, employeeId, designationId, unionId, assignedSegments } = req.body;
      if (!name || !phone || !employeeId || !designationId || !unionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const { UNION_STAFF_DESIGNATIONS, buildWorkflowPermissions } = await import("@shared/schema");
      const deptDesignations = (UNION_STAFF_DESIGNATIONS as any).segment_workflow;
      const desig = deptDesignations?.find((d: any) => d.id === designationId);
      if (!desig) {
        return res.status(400).json({ message: "Invalid segment workflow designation" });
      }
      const segments: string[] = assignedSegments || [];
      if (segments.length === 0) {
        return res.status(400).json({ message: "At least one segment must be assigned" });
      }
      const validSegs = ['FM', 'DP', 'IC'];
      if (segments.some((s: string) => !validSegs.includes(s))) {
        return res.status(400).json({ message: "Invalid segment. Must be FM, DP, or IC" });
      }
      const existing = await db.query.unionStaff.findFirst({
        where: eq(unionStaff.employeeId, employeeId)
      });
      if (existing) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
      const autoPerms = buildWorkflowPermissions(designationId, segments);
      const bcrypt = await import("bcryptjs");
      const defaultPw = `Aavin@${phone.slice(-4)}`;
      const pwHash = await bcrypt.hash(defaultPw, 10);
      const [newStaff] = await db.insert(unionStaff).values({
        unionId,
        name,
        phone,
        email: email || null,
        employeeId,
        department: 'segment_workflow',
        designation: desig.name,
        designationId,
        level: desig.level,
        accessTier: desig.accessTier,
        salesSegment: 'all_access',
        assignedSegments: segments,
        permissions: autoPerms,
        username: employeeId,
        passwordHash: pwHash,
        approvalStatus: 'approved',
        isActive: true,
      }).returning();
      res.status(201).json({ success: true, staff: newStaff });
    } catch (error) {
      console.error('Error creating segment staff:', error);
      res.status(500).json({ message: "Failed to create segment staff" });
    }
  });

  app.patch("/api/admin/segment-staff/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { name, phone, email, assignedSegments, designationId: newDesigId, isActive } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const current = await db.query.unionStaff.findFirst({
        where: and(eq(unionStaff.id, req.params.id), eq(unionStaff.department, 'segment_workflow'))
      });
      if (!current) return res.status(404).json({ message: "Segment staff not found" });
      
      const effectiveDesigId = newDesigId || current.designationId;
      if (newDesigId) {
        const { UNION_STAFF_DESIGNATIONS } = await import("@shared/schema");
        const deptDesigs = (UNION_STAFF_DESIGNATIONS as any).segment_workflow;
        const desig = deptDesigs?.find((d: any) => d.id === newDesigId);
        if (!desig) return res.status(400).json({ message: "Invalid designation" });
        updates.designationId = newDesigId;
        updates.designation = desig.name;
        updates.level = desig.level;
        updates.accessTier = desig.accessTier;
      }
      
      if (assignedSegments !== undefined) {
        const validSegs = ['FM', 'DP', 'IC'];
        if (!Array.isArray(assignedSegments) || assignedSegments.some((s: string) => !validSegs.includes(s))) {
          return res.status(400).json({ message: "Invalid segments. Must be FM, DP, or IC" });
        }
        if (assignedSegments.length === 0) {
          return res.status(400).json({ message: "At least one segment must be assigned" });
        }
        updates.assignedSegments = assignedSegments;
      }
      
      const finalSegments = assignedSegments || (current.assignedSegments as string[]) || [];
      if (assignedSegments !== undefined || newDesigId) {
        const { buildWorkflowPermissions } = await import("@shared/schema");
        updates.permissions = buildWorkflowPermissions(effectiveDesigId, finalSegments);
      }
      
      updates.updatedAt = new Date();
      const [updated] = await db.update(unionStaff).set(updates).where(
        and(eq(unionStaff.id, req.params.id), eq(unionStaff.department, 'segment_workflow'))
      ).returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating segment staff:', error);
      res.status(500).json({ message: "Failed to update segment staff" });
    }
  });

  app.delete("/api/admin/segment-staff/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const [deleted] = await db.delete(unionStaff).where(
        and(eq(unionStaff.id, req.params.id), eq(unionStaff.department, 'segment_workflow'))
      ).returning();
      if (!deleted) return res.status(404).json({ message: "Segment staff not found" });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting segment staff:', error);
      res.status(500).json({ message: "Failed to delete segment staff" });
    }
  });

  app.post("/api/admin/segment-staff/bulk-import", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows provided' });
      }
      const { UNION_STAFF_DESIGNATIONS, buildWorkflowPermissions } = await import("@shared/schema");
      const bcrypt = await import("bcryptjs");
      const deptDesignations = (UNION_STAFF_DESIGNATIONS as any).segment_workflow || [];
      const results = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] as any[] };
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name && !row.phone && !row.employeeId) { results.skipped++; continue; }
          if (!row.name || !row.phone || !row.employeeId || !row.designationId) {
            results.errors.push({ row: i + 1, name: row.name || '', error: 'Missing required fields (name, phone, employeeId, designationId)' });
            continue;
          }
          const desig = deptDesignations.find((d: any) => d.id === row.designationId);
          if (!desig) {
            results.errors.push({ row: i + 1, name: row.name, error: `Invalid designation: ${row.designationId}` });
            continue;
          }
          const segments: string[] = row.assignedSegments || [];
          const validSegs = ['FM', 'DP', 'IC'];
          const filteredSegments = segments.filter((s: string) => validSegs.includes(s));
          if (filteredSegments.length === 0) {
            results.errors.push({ row: i + 1, name: row.name, error: 'At least one valid segment required (FM, DP, IC)' });
            continue;
          }
          const autoPerms = buildWorkflowPermissions(row.designationId, filteredSegments);
          const unionId = row.unionId || 'federation';
          
          const existing = await db.query.unionStaff.findFirst({
            where: eq(unionStaff.employeeId, row.employeeId)
          });
          
          if (existing) {
            const updateData: any = { name: row.name, phone: row.phone };
            if (row.email) updateData.email = row.email;
            updateData.designation = desig.name;
            updateData.designationId = row.designationId;
            updateData.level = desig.level;
            updateData.accessTier = desig.accessTier;
            updateData.assignedSegments = filteredSegments;
            updateData.permissions = autoPerms;
            await db.update(unionStaff).set(updateData).where(eq(unionStaff.id, existing.id));
            results.updated++;
          } else {
            const defaultPw = `Aavin@${row.phone.slice(-4)}`;
            const pwHash = await bcrypt.hash(defaultPw, 10);
            await db.insert(unionStaff).values({
              unionId,
              name: row.name,
              phone: row.phone,
              email: row.email || null,
              employeeId: row.employeeId,
              department: 'segment_workflow',
              designation: desig.name,
              designationId: row.designationId,
              level: desig.level,
              accessTier: desig.accessTier,
              salesSegment: 'all_access',
              assignedSegments: filteredSegments,
              permissions: autoPerms,
              username: row.employeeId,
              passwordHash: pwHash,
              approvalStatus: 'approved',
              isActive: true,
            }).returning();
            results.created++;
          }
        } catch (err: any) {
          results.errors.push({ row: i + 1, name: row.name || '', error: err.message });
        }
      }
      res.json(results);
    } catch (error) {
      console.error('Error in staff bulk import:', error);
      res.status(500).json({ error: 'Failed to process staff bulk import' });
    }
  });

  async function verifySegmentStaff(req: any): Promise<any | null> {
    const staffSessionHeader = req.headers['x-staff-session'];
    if (!staffSessionHeader) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(staffSessionHeader as string);
    } catch {
      try {
        parsed = JSON.parse(Buffer.from(staffSessionHeader as string, 'base64').toString());
      } catch { return null; }
    }
    if (!parsed?.id) return null;
    const staffRecord = await db.query.unionStaff.findFirst({
      where: eq(unionStaff.id, parsed.id),
    });
    if (!staffRecord) return null;
    if (staffRecord.department !== 'segment_workflow') return null;
    if (!staffRecord.isActive) return null;
    if (staffRecord.approvalStatus !== 'approved') return null;
    return staffRecord;
  }

  app.get("/api/segment-staff/my-orders", async (req, res) => {
    try {
      const staff = await verifySegmentStaff(req);
      if (!staff) {
        return res.status(401).json({ error: "Invalid or unauthorized staff session" });
      }
      const segments: string[] = (staff.assignedSegments as string[]) || [];
      if (segments.length === 0) {
        return res.json([]);
      }
      const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
      const allowedSegments = segments.map(s => segmentSuffixMap[s] || s);
      const { status, segment } = req.query;
      const allOrders = await storage.getOrders(staff.unionId);
      let filtered = allOrders.filter((o: any) => o.productSegment && allowedSegments.includes(o.productSegment));
      if (segment && segment !== 'all') {
        filtered = filtered.filter((o: any) => o.productSegment === segment);
      }
      if (status && status !== 'all') {
        filtered = filtered.filter((o: any) => (o.workflowStatus || o.status) === status);
      }
      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching segment staff orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.patch("/api/segment-staff/orders/:id/workflow", async (req, res) => {
    try {
      const staff = await verifySegmentStaff(req);
      if (!staff) {
        return res.status(401).json({ error: "Invalid or unauthorized staff session" });
      }
      const { workflowStatus } = req.body;
      const validStatuses = ['pending', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered', 'customer_acknowledged', 'cancelled'];
      if (!validStatuses.includes(workflowStatus)) {
        return res.status(400).json({ error: `Invalid workflow status` });
      }
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) return res.status(404).json({ error: "Order not found" });
      const suffix = (existingOrder as any).segmentSuffix as string | null;
      const productSegment = (existingOrder as any).productSegment as string;
      const segmentSuffixMap: Record<string, string> = { 'Fresh Milk': 'FM', 'Products': 'DP', 'Ice Cream': 'IC' };
      const orderSeg = suffix || segmentSuffixMap[productSegment] || null;
      const staffSegments: string[] = (staff.assignedSegments as string[]) || [];
      if (orderSeg && !staffSegments.includes(orderSeg)) {
        return res.status(403).json({ error: "You don't have access to this segment's orders" });
      }
      const { SEGMENT_WORKFLOW_PERMISSIONS } = await import("@shared/schema");
      if (orderSeg) {
        const segPerms = (SEGMENT_WORKFLOW_PERMISSIONS as any)[orderSeg];
        if (segPerms) {
          const requiredPerm = segPerms[workflowStatus];
          const staffPerms: string[] = (staff.permissions as string[]) || [];
          const hasPermission = staffPerms.includes('*') || staffPerms.includes('workflow_manage') || staffPerms.includes(requiredPerm);
          if (!hasPermission) {
            return res.status(403).json({ error: `You don't have permission for this action` });
          }
        }
      }
      const order = await storage.updateOrderWorkflowStatus(req.params.id, workflowStatus);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (['marketing_approved', 'assigned_to_delivery'].includes(workflowStatus)) {
        autoCreateDeliveryJob(req.params.id);
      }
      if (workflowStatus === 'assigned_to_delivery') {
        autoAssignDriverToOrder(order).catch(e => console.error('Auto-assign failed:', e));
      }
      if (order.masterOrderId) {
        const master = await storage.getMasterOrder(order.masterOrderId);
        return res.json({ order, masterOrder: master });
      }
      res.json({ order });
    } catch (error) {
      console.error("Error updating workflow status:", error);
      res.status(500).json({ error: "Failed to update workflow status" });
    }
  });

  // Office-scoped staff verification for marketing roles (data_entry_operator, marketing_executive, segment managers)
  const OFFICE_SCOPED_DESIGNATIONS = [
    'data_entry_operator', 'marketing_executive',
    'segment_mgr_marketing_fm', 'segment_mgr_marketing_dp', 'segment_mgr_marketing_ic',
  ];

  async function verifyOfficeStaff(req: any): Promise<any | null> {
    const staffSessionHeader = req.headers['x-staff-session'];
    if (!staffSessionHeader) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(staffSessionHeader as string);
    } catch {
      try {
        parsed = JSON.parse(Buffer.from(staffSessionHeader as string, 'base64').toString());
      } catch { return null; }
    }
    if (!parsed?.id) return null;
    const staffRecord = await db.query.unionStaff.findFirst({
      where: eq(unionStaff.id, parsed.id),
    });
    if (!staffRecord) return null;
    if (!staffRecord.isActive || staffRecord.approvalStatus !== 'approved') return null;
    const desId = staffRecord.designationId || '';
    if (!OFFICE_SCOPED_DESIGNATIONS.includes(desId) && staffRecord.department !== 'segment_workflow') return null;
    return staffRecord;
  }

  const OFFICE_ID_TO_NAME: Record<string, string> = {
    'city_mmo': 'City MMO',
    'mettur_mmo': 'Mettur MMO',
    'edappadi_mmo': 'Edappadi MMO',
    'head_office': 'Head Office',
  };

  app.get("/api/office-staff/my-orders", async (req, res) => {
    try {
      const staff = await verifyOfficeStaff(req);
      if (!staff) {
        return res.status(401).json({ error: "Invalid or unauthorized staff session" });
      }

      const assignedOffice = staff.assignedOffice;
      const designationId = staff.designationId || '';
      const isOfficeScopedRole = OFFICE_SCOPED_DESIGNATIONS.includes(designationId);

      // Get all orders for the union
      const allOrders = await storage.getOrders(staff.unionId);
      const { status, segment } = req.query;

      let filtered = [...allOrders];

      // For office-scoped roles, filter by assigned office
      if (isOfficeScopedRole && assignedOffice && assignedOffice !== 'head_office') {
        const mmoOfficeRecords = await db.select().from(mmoOffices).where(
          and(eq(mmoOffices.unionId, staff.unionId), eq(mmoOffices.isActive, true))
        );

        const officeNameMatch = OFFICE_ID_TO_NAME[assignedOffice] || assignedOffice;
        const matchedOffice = mmoOfficeRecords.find(o =>
          o.officeName.toLowerCase() === officeNameMatch.toLowerCase() ||
          o.officeName.toLowerCase().includes(officeNameMatch.toLowerCase()) ||
          o.officeCode.toLowerCase() === assignedOffice.toLowerCase()
        );

        if (matchedOffice) {
          // Get all routes under this office (including sub-offices)
          const subOfficeIds = [matchedOffice.id, ...mmoOfficeRecords.filter(o => o.parentId === matchedOffice.id).map(o => o.id)];
          const officeRoutes = await db.select().from(mmoRoutes).where(
            and(
              sql`${mmoRoutes.mmoOfficeId} IN (${sql.join(subOfficeIds.map(id => sql`${id}`), sql`, `)})`,
              eq(mmoRoutes.unionId, staff.unionId),
              eq(mmoRoutes.isActive, true)
            )
          );

          const routeIds = officeRoutes.map(r => r.id);
          if (routeIds.length > 0) {
            // Get all agents under these routes
            const officeAgents = await db.select().from(mmoRouteAgents).where(
              and(
                sql`${mmoRouteAgents.routeId} IN (${sql.join(routeIds.map(id => sql`${id}`), sql`, `)})`,
                eq(mmoRouteAgents.unionId, staff.unionId),
                eq(mmoRouteAgents.isActive, true)
              )
            );

            const agentLookup = new Map<string, boolean>();
            const agentNames: string[] = [];
            for (const agent of officeAgents) {
              agentLookup.set(agent.agentCode.toUpperCase(), true);
              const name = agent.agentName.toUpperCase().trim();
              agentLookup.set(name, true);
              agentLookup.set(name.replace(/\s+/g, ''), true);
              agentNames.push(name);
            }

            filtered = filtered.filter((o: any) => {
              const cn = ((o.customerName || '') as string).toUpperCase().trim();
              if (agentLookup.has(cn)) return true;
              const cnStripped = cn.replace(/\s+/g, '');
              if (agentLookup.has(cnStripped)) return true;
              const codeMatch = cn.match(/^([A-Z0-9]+)\s/);
              if (codeMatch && agentLookup.has(codeMatch[1])) return true;
              if (cn.length >= 4 && agentNames.some(an => an.startsWith(cn) || cn.startsWith(an))) return true;
              return false;
            });
          } else {
            filtered = [];
          }
        } else {
          filtered = [];
        }
      } else if (isOfficeScopedRole && assignedOffice === 'head_office') {
        // Head office staff can see all orders (no filtering)
      } else {
        // For segment_workflow department staff, use segment-based filtering
        const segments: string[] = (staff.assignedSegments as string[]) || [];
        if (segments.length > 0) {
          const segmentSuffixMap: Record<string, string> = { 'FM': 'Fresh Milk', 'DP': 'Products', 'IC': 'Ice Cream' };
          const allowedSegments = segments.map((s: string) => segmentSuffixMap[s] || s);
          filtered = filtered.filter((o: any) => o.productSegment && allowedSegments.includes(o.productSegment));
        }
      }

      // Apply segment filter
      if (segment && segment !== 'all') {
        filtered = filtered.filter((o: any) => o.productSegment === segment);
      }
      // Apply status filter
      if (status && status !== 'all') {
        filtered = filtered.filter((o: any) => (o.workflowStatus || o.status) === status);
      }

      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching office-scoped orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Office-scoped workflow update (same logic as segment-staff but for office-scoped roles)
  app.patch("/api/office-staff/orders/:id/workflow", async (req, res) => {
    try {
      const staff = await verifyOfficeStaff(req);
      if (!staff) {
        return res.status(401).json({ error: "Invalid or unauthorized staff session" });
      }
      const { workflowStatus } = req.body;
      const validStatuses = ['pending', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered', 'customer_acknowledged', 'cancelled'];
      if (!validStatuses.includes(workflowStatus)) {
        return res.status(400).json({ error: 'Invalid workflow status' });
      }
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) return res.status(404).json({ error: "Order not found" });

      const designationId = staff.designationId || '';
      const isOfficeScopedRole = OFFICE_SCOPED_DESIGNATIONS.includes(designationId);

      // For office-scoped roles, verify the order belongs to the staff's office
      if (isOfficeScopedRole) {
        const marketingAllowed = ['marketing_approved'];
        if (!marketingAllowed.includes(workflowStatus)) {
          return res.status(403).json({ error: "You can only approve orders for marketing" });
        }

        // Verify order belongs to staff's assigned office
        const assignedOffice = staff.assignedOffice;
        if (assignedOffice && assignedOffice !== 'head_office') {
          const officeNameForMatch = OFFICE_ID_TO_NAME[assignedOffice] || assignedOffice;
          const mmoOfficeRecords = await db.select().from(mmoOffices).where(
            and(eq(mmoOffices.unionId, staff.unionId), eq(mmoOffices.isActive, true))
          );
          const matchedOffice = mmoOfficeRecords.find(o =>
            o.officeName.toLowerCase() === officeNameForMatch.toLowerCase() ||
            o.officeName.toLowerCase().includes(officeNameForMatch.toLowerCase()) ||
            o.officeCode.toLowerCase() === assignedOffice.toLowerCase()
          );
          if (matchedOffice) {
            const subOfficeIds = [matchedOffice.id, ...mmoOfficeRecords.filter(o => o.parentId === matchedOffice.id).map(o => o.id)];
            const officeRoutes = await db.select().from(mmoRoutes).where(
              and(
                sql`${mmoRoutes.mmoOfficeId} IN (${sql.join(subOfficeIds.map(id => sql`${id}`), sql`, `)})`,
                eq(mmoRoutes.unionId, staff.unionId),
                eq(mmoRoutes.isActive, true)
              )
            );
            const routeIds = officeRoutes.map(r => r.id);
            if (routeIds.length > 0) {
              const officeAgents = await db.select().from(mmoRouteAgents).where(
                and(
                  sql`${mmoRouteAgents.routeId} IN (${sql.join(routeIds.map(id => sql`${id}`), sql`, `)})`,
                  eq(mmoRouteAgents.unionId, staff.unionId),
                  eq(mmoRouteAgents.isActive, true)
                )
              );
              const agentLookup = new Map<string, boolean>();
              const agentNames: string[] = [];
              for (const agent of officeAgents) {
                agentLookup.set(agent.agentCode.toUpperCase(), true);
                const name = agent.agentName.toUpperCase().trim();
                agentLookup.set(name, true);
                agentLookup.set(name.replace(/\s+/g, ''), true);
                agentNames.push(name);
              }
              const cn = ((existingOrder.customerName || '') as string).toUpperCase().trim();
              const cnStripped = cn.replace(/\s+/g, '');
              const isMatch = agentLookup.has(cn) || agentLookup.has(cnStripped) || (() => { const m = cn.match(/^([A-Z0-9]+)\s/); return m ? agentLookup.has(m[1]) : false; })() || (cn.length >= 4 && agentNames.some(an => an.startsWith(cn) || cn.startsWith(an)));
              if (!isMatch) {
                return res.status(403).json({ error: "This order does not belong to your assigned office" });
              }
            } else {
              return res.status(403).json({ error: "No routes configured for your office" });
            }
          } else {
            return res.status(403).json({ error: "Office not found" });
          }
        }
      } else {
        // Original segment-based permission check
        const suffix = (existingOrder as any).segmentSuffix as string | null;
        const productSegment = (existingOrder as any).productSegment as string;
        const segmentSuffixMap: Record<string, string> = { 'Fresh Milk': 'FM', 'Products': 'DP', 'Ice Cream': 'IC' };
        const orderSeg = suffix || segmentSuffixMap[productSegment] || null;
        const staffSegments: string[] = (staff.assignedSegments as string[]) || [];
        if (orderSeg && !staffSegments.includes(orderSeg)) {
          return res.status(403).json({ error: "You don't have access to this segment's orders" });
        }
      }

      const order = await storage.updateOrderWorkflowStatus(req.params.id, workflowStatus);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json({ order });
    } catch (error) {
      console.error("Error updating workflow status:", error);
      res.status(500).json({ error: "Failed to update workflow status" });
    }
  });

  // ===== End Union Staff API =====

  // ===== Business Routes CRUD =====

  app.get("/api/delivery/routes", async (req, res) => {
    try {
      const { merchantId, segment } = req.query;
      if (!merchantId || !segment) {
        return res.status(400).json({ error: "merchantId and segment are required" });
      }
      const routes = await db.select().from(businessRoutes).where(
        and(
          eq(businessRoutes.merchantId, merchantId as string),
          eq(businessRoutes.segment, segment as string),
          eq(businessRoutes.isActive, true)
        )
      );
      res.json(routes);
    } catch (error) {
      console.error('Error fetching delivery routes:', error);
      res.status(500).json({ error: "Failed to fetch delivery routes" });
    }
  });

  app.post("/api/union/:merchantId/business-routes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { routeName, routeCode, segment, description } = req.body;
      if (!routeName || !segment) {
        return res.status(400).json({ error: "routeName and segment are required" });
      }
      const [route] = await db.insert(businessRoutes).values({
        routeName,
        routeCode: routeCode || null,
        merchantId: req.params.merchantId,
        segment,
        description: description || null,
      }).returning();
      res.json(route);
    } catch (error) {
      console.error('Error creating business route:', error);
      res.status(500).json({ error: "Failed to create business route" });
    }
  });

  app.get("/api/union/:merchantId/business-routes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const routes = await db.select().from(businessRoutes).where(
        eq(businessRoutes.merchantId, req.params.merchantId)
      );
      res.json(routes);
    } catch (error) {
      console.error('Error fetching business routes:', error);
      res.status(500).json({ error: "Failed to fetch business routes" });
    }
  });

  app.delete("/api/union/:merchantId/business-routes/:routeId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "Invalid route ID" });
      }
      await db.delete(businessRoutes).where(
        and(
          eq(businessRoutes.id, routeId),
          eq(businessRoutes.merchantId, req.params.merchantId)
        )
      );
      res.json({ success: true, message: "Business route deleted" });
    } catch (error) {
      console.error('Error deleting business route:', error);
      res.status(500).json({ error: "Failed to delete business route" });
    }
  });

  // ===== Delivery Partner Registration & Login =====

  app.post("/api/delivery-partners/register", async (req, res) => {
    try {
      const { name, phone, email, segment, merchantId, routeId, vehicleType, vehicleCapacity, vehicleNumber, driverLicense, password } = req.body;
      if (!name || !phone || !segment || !merchantId || !password) {
        return res.status(400).json({ error: "name, phone, segment, merchantId, and password are required" });
      }

      const existingPartner = await db.select().from(deliveryPartners).where(eq(deliveryPartners.phone, phone));
      if (existingPartner.length > 0) {
        return res.status(409).json({ error: "A delivery partner with this phone number already exists" });
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const [partner] = await db.insert(deliveryPartners).values({
        name,
        phone,
        email: email || null,
        segment,
        merchantId,
        routeId: routeId ? parseInt(routeId) : null,
        vehicleType: vehicleType || null,
        vehicleCapacity: vehicleCapacity || null,
        vehicleNumber: vehicleNumber || null,
        driverLicense: driverLicense || null,
        passwordHash,
        approvalStatus: 'pending',
        isActive: true,
      }).returning();

      res.status(201).json({ success: true, message: "Registration successful. Your account is pending approval.", partnerId: partner.id });
    } catch (error) {
      console.error('Error registering delivery partner:', error);
      res.status(500).json({ error: "Failed to register delivery partner" });
    }
  });

  app.post("/api/delivery-partners/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: "Phone/email and password are required" });
      }

      // Try delivery_partners table first (phone-based login)
      const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.phone, phone));
      if (partner) {
        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(password, partner.passwordHash || '');
        if (!isValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        if (partner.approvalStatus !== 'approved') {
          return res.status(403).json({ error: "Your account is pending approval." });
        }
        if (!partner.isActive) {
          return res.status(403).json({ error: "Your account has been deactivated." });
        }
        await db.update(deliveryPartners).set({ lastLogin: new Date() }).where(eq(deliveryPartners.id, partner.id));
        const token = signToken({ deliveryPartnerId: partner.id, role: 'delivery_partner', source: 'partner' });
        res.cookie('delivery_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
        const { passwordHash: _, ...partnerInfo } = partner;
        return res.json({ success: true, partner: { ...partnerInfo, source: 'partner' } });
      }

      // Try users table (admin-created drivers, login by email or phone)
      let driverUser = await storage.findUserByEmail(phone);
      if (!driverUser) {
        const allUsers = await storage.listUsers();
        driverUser = allUsers.find(u => u.role === 'driver' && u.phone === phone) || null;
      }
      if (driverUser && driverUser.role === 'driver') {
        const isValid = await verifyPassword(password, driverUser.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = signToken({ deliveryPartnerId: driverUser.id, role: 'delivery_driver', source: 'user', userId: driverUser.id });
        res.cookie('delivery_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
        return res.json({
          success: true,
          partner: {
            id: driverUser.id,
            name: driverUser.name,
            email: driverUser.email,
            phone: driverUser.phone,
            unionId: driverUser.unionId,
            assignedSegment: driverUser.assignedSegment,
            source: 'user',
          }
        });
      }

      return res.status(401).json({ error: "Invalid phone/email or password" });
    } catch (error) {
      console.error('Error logging in delivery partner:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  async function requireDeliveryAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.delivery_token;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.deliveryPartnerId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (payload.source === 'user') {
      const user = await storage.getUser(payload.deliveryPartnerId);
      if (!user) return res.status(401).json({ error: "Driver not found" });
      (req as any).deliveryPartner = {
        id: user.id, name: user.name, email: user.email, phone: user.phone,
        unionId: user.unionId, assignedSegment: user.assignedSegment, source: 'user'
      };
      return next();
    }

    const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, payload.deliveryPartnerId));
    if (!partner) {
      return res.status(401).json({ error: "Delivery partner not found" });
    }
    (req as any).deliveryPartner = { ...partner, source: 'partner' };
    next();
  }

  app.get("/api/delivery-partners/my-orders", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const driverId = partner.id;

      // Get routes assigned to this driver
      const routes = await db.select().from(deliveryRoutes).where(eq(deliveryRoutes.driverId, String(driverId)));

      // Collect all order IDs from routes
      const orderIds: string[] = [];
      for (const route of routes) {
        const seq = route.deliverySequence as any[];
        if (Array.isArray(seq)) {
          seq.forEach((s: any) => { if (s.orderId) orderIds.push(String(s.orderId)); });
        }
      }

      // Get orders with assigned_to_delivery/out_for_delivery status for this driver
      const allOrders = await storage.getOrders();
      const driverOrders = allOrders.filter((o: any) =>
        orderIds.includes(String(o.id)) ||
        (o.driverId && String(o.driverId) === String(driverId)) ||
        ['assigned_to_delivery', 'out_for_delivery'].includes(o.status)
      );

      // Enrich orders with route info
      const enrichedOrders = driverOrders.map((o: any) => {
        const route = routes.find(r => {
          const seq = r.deliverySequence as any[];
          return Array.isArray(seq) && seq.some((s: any) => String(s.orderId) === String(o.id));
        });
        return {
          ...o,
          routeId: route?.id || null,
          routeName: route ? `${route.segment} - Route ${route.id.slice(-6)}` : null,
          routeSegment: route?.segment || null,
        };
      });

      res.json(enrichedOrders);
    } catch (error) {
      console.error('Error fetching delivery partner orders:', error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/delivery-partners/logout", (req, res) => {
    res.clearCookie('delivery_token');
    res.json({ success: true });
  });

  app.patch("/api/delivery-partners/orders/:orderId/status", requireDeliveryAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const validStatuses = ['out_for_delivery', 'delivered', 'completed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Allowed: out_for_delivery, delivered, completed" });
      }
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updatedOrder = await storage.updateOrder(orderId, { status });
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status by driver:', error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.patch("/api/delivery-partners/orders/:orderId/accept", requireDeliveryAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updatedOrder = await storage.updateOrder(req.params.orderId, { workflowStatus: 'out_for_delivery', deliveryStartedAt: new Date() });
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error accepting order:', error);
      res.status(500).json({ error: "Failed to accept order" });
    }
  });

  app.patch("/api/delivery-partners/orders/:orderId/deliver", requireDeliveryAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updatedOrder = await storage.updateOrder(req.params.orderId, { workflowStatus: 'delivered', deliveredAt: new Date() });
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error delivering order:', error);
      res.status(500).json({ error: "Failed to mark order as delivered" });
    }
  });

  // ===== Delivery Partner Profile & Status =====

  app.get("/api/delivery-partners/me", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const { passwordHash: _, ...info } = partner;
      res.json(info);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/delivery-partners/status", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const { isOnline } = req.body;
      await db.update(deliveryPartners).set({ isOnline: !!isOnline }).where(eq(deliveryPartners.id, partner.id));
      res.json({ success: true, isOnline: !!isOnline });
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ===== Delivery Partner Shifts =====

  app.get("/api/delivery-partners/shifts", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const shifts = await db.select().from(deliveryShifts)
        .where(eq(deliveryShifts.partnerId, partner.id))
        .orderBy(desc(deliveryShifts.startTime));
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  app.post("/api/delivery-partners/shifts/start", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const { location, vehicleInfo, scheduledStart, scheduledEnd } = req.body;
      const [shift] = await db.insert(deliveryShifts).values({
        partnerId: partner.id,
        merchantId: partner.merchantId,
        location: location || 'Default Location',
        vehicleInfo: vehicleInfo || `${partner.vehicleType || ''} - ${partner.vehicleNumber || ''}`.trim(),
        startTime: new Date(),
        scheduledStart: scheduledStart || null,
        scheduledEnd: scheduledEnd || null,
        status: 'ongoing',
      }).returning();
      await db.update(deliveryPartners).set({ isOnline: true }).where(eq(deliveryPartners.id, partner.id));
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to start shift" });
    }
  });

  app.patch("/api/delivery-partners/shifts/:shiftId/end", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const shiftId = parseInt(req.params.shiftId);
      const [shift] = await db.update(deliveryShifts)
        .set({ endTime: new Date(), status: 'completed' })
        .where(and(eq(deliveryShifts.id, shiftId), eq(deliveryShifts.partnerId, partner.id)))
        .returning();
      await db.update(deliveryPartners).set({ isOnline: false }).where(eq(deliveryPartners.id, partner.id));
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to end shift" });
    }
  });

  // ===== Delivery Partner Wallet =====

  app.get("/api/delivery-partners/wallet", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const transactions = await db.select().from(deliveryWalletTransactions)
        .where(eq(deliveryWalletTransactions.partnerId, partner.id))
        .orderBy(desc(deliveryWalletTransactions.createdAt))
        .limit(50);
      res.json({
        balance: partner.walletBalance || "0.00",
        transactions,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  app.post("/api/delivery-partners/wallet/cash-in", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const { amount } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      const newBalance = (parseFloat(partner.walletBalance || "0") + parseFloat(amount)).toFixed(2);
      await db.update(deliveryPartners).set({ walletBalance: newBalance }).where(eq(deliveryPartners.id, partner.id));
      const [txn] = await db.insert(deliveryWalletTransactions).values({
        partnerId: partner.id,
        type: 'cash_in',
        amount: amount.toString(),
        description: 'Cash in payment',
        balanceAfter: newBalance,
      }).returning();
      res.json({ success: true, balance: newBalance, transaction: txn });
    } catch (error) {
      res.status(500).json({ error: "Failed to process cash in" });
    }
  });

  // ===== Delivery Partner History =====

  app.get("/api/delivery-partners/history", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const { date } = req.query;
      const allOrders = await storage.getOrders();
      const partnerOrders = allOrders.filter((o: any) => {
        if (o.driverId !== partner.id && o.deliveryPartnerId !== partner.id) return false;
        if (date) {
          const orderDate = new Date(o.createdAt || o.orderDate).toISOString().split('T')[0];
          return orderDate === date;
        }
        return true;
      });
      const deliveredOrders = partnerOrders.filter((o: any) =>
        o.workflowStatus === 'delivered' || o.workflowStatus === 'customer_acknowledged' || o.status === 'delivered'
      );
      const totalCashCollected = deliveredOrders.reduce((sum: number, o: any) => {
        if (o.paymentMethod === 'cod' || o.paymentMethod === 'cash') {
          return sum + parseFloat(o.total || o.totalAmount || '0');
        }
        return sum;
      }, 0);
      res.json({
        totalDelivered: deliveredOrders.length,
        cashCollected: totalCashCollected.toFixed(2),
        deliveryEarnings: partner.totalEarnings || "0.00",
        orders: partnerOrders.slice(0, 20).map((o: any) => ({
          id: o.id,
          orderId: o.orderId || o.id,
          customerName: o.customerName || 'Customer',
          total: o.total || o.totalAmount || '0.00',
          status: o.workflowStatus || o.status,
          paymentMethod: o.paymentMethod,
          deliveryFee: o.deliveryFee || '5.00',
          tip: o.tip || '0.00',
          createdAt: o.createdAt || o.orderDate,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.get("/api/delivery-partners/deliveries", requireDeliveryAuth, async (req, res) => {
    try {
      const partner = (req as any).deliveryPartner;
      const allOrders = await storage.getOrders();
      const activeOrders = allOrders.filter((o: any) => {
        const isAssigned = o.driverId === partner.id || o.deliveryPartnerId === partner.id;
        const isActive = ['assigned_to_delivery', 'out_for_delivery', 'pending', 'confirmed', 'preparing', 'ready'].includes(o.workflowStatus || o.status);
        return isAssigned && isActive;
      });
      res.json(activeOrders.map((o: any) => ({
        id: o.id,
        orderId: o.orderId || o.id,
        customerName: o.customerName || 'Customer',
        customerPhone: o.customerPhone || '',
        pickupAddress: o.restaurantAddress || o.merchantAddress || 'Aavin Parlour',
        dropoffAddress: o.deliveryAddress || 'Delivery Address',
        total: o.total || o.totalAmount || '0.00',
        status: o.workflowStatus || o.status,
        items: o.items || [],
        createdAt: o.createdAt || o.orderDate,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  app.patch("/api/delivery-partners/orders/:orderId/decline", requireDeliveryAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updatedOrder = await storage.updateOrder(req.params.orderId, { workflowStatus: 'pending' });
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: "Failed to decline order" });
    }
  });

  // ===== Customer Order Acknowledgement =====

  app.patch("/api/orders/:orderId/acknowledge", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updatedOrder = await storage.updateOrder(req.params.orderId, { workflowStatus: 'customer_acknowledged' });
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error acknowledging order:', error);
      res.status(500).json({ error: "Failed to acknowledge order" });
    }
  });

  // Wholesale Dealer (WSD) Login
  app.post("/api/wsd/login", async (req, res) => {
    try {
      const { wsdCode, password } = req.body;
      
      if (!wsdCode || !password) {
        return res.status(400).json({ success: false, message: 'WSD Code and password are required' });
      }
      
      // Query wholesale dealer from database
      const result = await storage.getWholesaleDealerByCode(wsdCode.toUpperCase());
      
      if (!result) {
        return res.status(401).json({ success: false, message: 'Invalid WSD Code or password' });
      }
      
      // Password is the phone number, verify against hashed password (with plaintext fallback for legacy)
      let isValid = false;
      if (result.passwordHash.includes(':')) {
        isValid = await verifyPassword(password, result.passwordHash);
      } else {
        isValid = result.passwordHash === password;
      }
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid WSD Code or password' });
      }
      
      if (!result.isActive) {
        return res.status(403).json({ success: false, message: 'Your account is not active. Please contact your district union.' });
      }
      
      // Update last login
      await storage.updateWholesaleDealerLastLogin(result.id);
      
      const token = signToken({ 
        id: result.id,
        wsdCode: result.wsdCode,
        name: result.name, 
        email: result.email,
        role: 'wsd',
        pricingRole: 'WHOLESALE_DEALER',
        districtUnion: result.districtUnion
      });
      
      res.cookie('wsd_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        dealer: {
          id: result.id,
          wsdCode: result.wsdCode,
          name: result.name,
          email: result.email,
          location: result.location,
          districtUnion: result.districtUnion,
          pricingTier: result.pricingTier,
          gstin: result.gstin,
          hasFreshMilkAccess: result.hasFreshMilkAccess
        }
      });
    } catch (error) {
      console.error('WSD login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Get WSD profile
  app.get("/api/wsd/me", async (req, res) => {
    try {
      const wsdToken = req.cookies.wsd_token;
      const authToken = req.cookies.auth_token;

      if (wsdToken) {
        const payload = verifyToken(wsdToken);
        if (payload && payload.role === 'wsd') {
          const dealer = await storage.getWholesaleDealerById(payload.id);
          if (dealer) {
            return res.json({ 
              success: true, 
              dealer: {
                id: dealer.id,
                wsdCode: dealer.wsdCode,
                name: dealer.name,
                email: dealer.email,
                location: dealer.location,
                address: dealer.address,
                mobileNumber: dealer.mobileNumber,
                districtUnion: dealer.districtUnion,
                pricingTier: dealer.pricingTier,
                gstin: dealer.gstin,
                hasFreshMilkAccess: dealer.hasFreshMilkAccess
              }
            });
          }
        }
      }

      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload && payload.userId) {
          const user = await storage.getUser(payload.userId);
          if (user) {
            const extUser = user as any;
            const allRoles = [extUser.pricingRole, extUser.freshMilkPricingRole, extUser.productsPricingRole, extUser.iceCreamPricingRole].filter(Boolean);
            if (allRoles.includes('WHOLESALE_DEALER')) {
              return res.json({
                success: true,
                dealer: {
                  id: user.id,
                  wsdCode: extUser.businessCode || extUser.name || '',
                  name: extUser.businessName || user.name || '',
                  email: user.email,
                  location: extUser.district || '',
                  address: extUser.businessAddress || extUser.address || '',
                  mobileNumber: user.phone || '',
                  districtUnion: extUser.districtUnion || '',
                  pricingTier: 'WHOLESALE_DEALER',
                  gstin: extUser.gstNumber || '',
                  hasFreshMilkAccess: extUser.freshMilkPricingRole && extUser.freshMilkPricingRole !== 'MRP'
                }
              });
            }
          }
        }
      }

      return res.status(401).json({ success: false, message: 'Not authenticated' });
    } catch (error) {
      console.error('WSD profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  });

  // WSD Logout
  app.post("/api/wsd/logout", (req, res) => {
    res.clearCookie('wsd_token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // ========================
  // User Hierarchy Management
  // ========================

  // Get all downstream users (dealers/retailers) for a parent user
  app.get("/api/hierarchy/my-users", async (req, res) => {
    try {
      const token = req.cookies?.auth_token || req.cookies?.wsd_token || req.cookies?.dealer_token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      let email = '';
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = jwt.default.verify(token, process.env.SESSION_SECRET || 'aavincart-secret-key');
        email = decoded.email || decoded.id || '';
        // For WSD tokens, look up by ID
        if (decoded.id && !decoded.email) {
          const wsd = await storage.getWholesaleDealerById(decoded.id);
          if (wsd) email = wsd.email || `${wsd.wsdCode.toLowerCase()}@aavincart.com`;
        }
      } catch (e) {
        // Try direct cookie decode for dealer tokens
        try {
          const parts = token.split(':');
          if (parts.length >= 2) {
            email = parts[1] || '';
          }
        } catch {}
      }

      if (!email) {
        return res.status(401).json({ success: false, message: 'Could not identify user' });
      }

      const children = await storage.getUserHierarchyByParentEmail(email);
      res.json({ success: true, users: children });
    } catch (error) {
      console.error('Get hierarchy users error:', error);
      res.status(500).json({ success: false, message: 'Failed to get users' });
    }
  });

  // Get downstream orders (orders placed by my dealers/retailers)
  app.get("/api/hierarchy/downstream-orders", async (req, res) => {
    try {
      const token = req.cookies?.auth_token || req.cookies?.wsd_token || req.cookies?.dealer_token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      let email = '';
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = jwt.default.verify(token, process.env.SESSION_SECRET || 'aavincart-secret-key');
        email = decoded.email || decoded.id || '';
        if (decoded.id && !decoded.email) {
          const wsd = await storage.getWholesaleDealerById(decoded.id);
          if (wsd) email = wsd.email || `${wsd.wsdCode.toLowerCase()}@aavincart.com`;
        }
      } catch (e) {
        try {
          const parts = token.split(':');
          if (parts.length >= 2) email = parts[1] || '';
        } catch {}
      }

      if (!email) {
        return res.status(401).json({ success: false, message: 'Could not identify user' });
      }

      const children = await storage.getUserHierarchyByParentEmail(email);
      const approvedChildren = children.filter(c => c.approvalStatus === 'approved');
      const childEmails = approvedChildren.map(c => c.childEmail);

      // Get all orders placed by downstream users
      const allOrders = await storage.getOrders();
      const downstreamOrders = allOrders.filter(o => childEmails.includes(o.customerEmail));

      res.json({ success: true, orders: downstreamOrders, childCount: approvedChildren.length });
    } catch (error) {
      console.error('Get downstream orders error:', error);
      res.status(500).json({ success: false, message: 'Failed to get downstream orders' });
    }
  });

  // Add a downstream user (dealer/retailer) under current user
  app.post("/api/hierarchy/add-user", async (req, res) => {
    try {
      const token = req.cookies?.auth_token || req.cookies?.wsd_token || req.cookies?.dealer_token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      let parentEmail = '';
      let parentName = '';
      let parentRole = '';
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = jwt.default.verify(token, process.env.SESSION_SECRET || 'aavincart-secret-key');
        parentEmail = decoded.email || '';
        parentName = decoded.name || '';
        parentRole = decoded.role || 'wsd';
        if (decoded.id && !decoded.email) {
          const wsd = await storage.getWholesaleDealerById(decoded.id);
          if (wsd) {
            parentEmail = wsd.email || `${wsd.wsdCode.toLowerCase()}@aavincart.com`;
            parentName = wsd.name;
            parentRole = 'wsd';
          }
        }
      } catch (e) {
        try {
          const parts = token.split(':');
          if (parts.length >= 2) parentEmail = parts[1] || '';
        } catch {}
      }

      if (!parentEmail) {
        return res.status(401).json({ success: false, message: 'Could not identify user' });
      }

      const { 
        childEmail, childName, childPhone, childRole, childAddress, 
        childGstin, childBusinessName, pricingTier,
        freshMilkApproved, productsApproved, iceCreamApproved,
        freshMilkPricingRole, productsPricingRole, iceCreamPricingRole,
        districtUnion
      } = req.body;

      if (!childEmail || !childName || !childRole) {
        return res.status(400).json({ success: false, message: 'Email, name, and role are required' });
      }

      // Check if child already exists under this parent
      const existing = await storage.getUserHierarchyByParentEmail(parentEmail);
      if (existing.find(c => c.childEmail === childEmail)) {
        return res.status(400).json({ success: false, message: 'This user is already under your hierarchy' });
      }

      const hierarchy = await storage.createUserHierarchy({
        parentId: parentEmail,
        parentRole: parentRole,
        parentEmail: parentEmail,
        parentName: parentName,
        childId: childEmail,
        childRole: childRole || 'dealer',
        childEmail: childEmail,
        childName: childName,
        childPhone: childPhone || '',
        childAddress: childAddress || '',
        childGstin: childGstin || '',
        childBusinessName: childBusinessName || '',
        approvalStatus: 'pending',
        pricingTier: pricingTier || 'DEALER',
        freshMilkApproved: freshMilkApproved || false,
        productsApproved: productsApproved || false,
        iceCreamApproved: iceCreamApproved || false,
        freshMilkPricingRole: freshMilkPricingRole || 'DEALER',
        productsPricingRole: productsPricingRole || 'DEALER',
        iceCreamPricingRole: iceCreamPricingRole || 'DEALER',
        districtUnion: districtUnion || '',
        isActive: true,
      });

      // Also create a user account for the child if one doesn't exist
      const existingUser = await storage.findUserByEmail(childEmail);
      if (!existingUser) {
        await storage.createUser({
          name: childName,
          email: childEmail,
          phone: childPhone || '',
          passwordHash: childPhone || 'password123',
          role: childRole === 'retailer' ? 'customer' : 'customer',
          pricingRole: pricingTier || 'DEALER',
          freshMilkPricingRole: freshMilkPricingRole || 'DEALER',
          productsPricingRole: productsPricingRole || 'DEALER',
          iceCreamPricingRole: iceCreamPricingRole || 'DEALER',
        });
      }

      res.json({ success: true, hierarchy });
    } catch (error) {
      console.error('Add hierarchy user error:', error);
      res.status(500).json({ success: false, message: 'Failed to add user' });
    }
  });

  // Approve/reject/update a downstream user
  app.post("/api/hierarchy/:id/update", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.cookies?.auth_token || req.cookies?.wsd_token || req.cookies?.dealer_token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const hierarchy = await storage.getUserHierarchyById(id);
      if (!hierarchy) {
        return res.status(404).json({ success: false, message: 'Hierarchy record not found' });
      }

      const {
        approvalStatus, pricingTier, 
        freshMilkApproved, productsApproved, iceCreamApproved,
        freshMilkPricingRole, productsPricingRole, iceCreamPricingRole,
        rejectedReason, isActive
      } = req.body;

      const updateData: any = {};
      if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;
      if (pricingTier !== undefined) updateData.pricingTier = pricingTier;
      if (freshMilkApproved !== undefined) updateData.freshMilkApproved = freshMilkApproved;
      if (productsApproved !== undefined) updateData.productsApproved = productsApproved;
      if (iceCreamApproved !== undefined) updateData.iceCreamApproved = iceCreamApproved;
      if (freshMilkPricingRole !== undefined) updateData.freshMilkPricingRole = freshMilkPricingRole;
      if (productsPricingRole !== undefined) updateData.productsPricingRole = productsPricingRole;
      if (iceCreamPricingRole !== undefined) updateData.iceCreamPricingRole = iceCreamPricingRole;
      if (rejectedReason !== undefined) updateData.rejectedReason = rejectedReason;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (approvalStatus === 'approved') {
        updateData.approvedAt = new Date();
      }

      const updated = await storage.updateUserHierarchy(id, updateData);

      // Also update the user's pricing roles if approved
      if (approvalStatus === 'approved' && updated) {
        const user = await storage.findUserByEmail(updated.childEmail);
        if (user) {
          await storage.updateUser(user.id, {
            pricingRole: pricingTier || user.pricingRole,
            freshMilkPricingRole: freshMilkPricingRole || user.freshMilkPricingRole,
            productsPricingRole: productsPricingRole || user.productsPricingRole,
            iceCreamPricingRole: iceCreamPricingRole || user.iceCreamPricingRole,
          });
        }
      }

      res.json({ success: true, hierarchy: updated });
    } catch (error) {
      console.error('Update hierarchy error:', error);
      res.status(500).json({ success: false, message: 'Failed to update hierarchy' });
    }
  });

  // Delete a downstream user from hierarchy
  app.delete("/api/hierarchy/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUserHierarchy(id);
      res.json({ success: true, message: 'User removed from hierarchy' });
    } catch (error) {
      console.error('Delete hierarchy error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove user' });
    }
  });

  // Get hierarchy info for current user (what parent approved for me)
  app.get("/api/hierarchy/my-approval", async (req, res) => {
    try {
      const token = req.cookies?.auth_token || req.cookies?.wsd_token || req.cookies?.dealer_token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      let email = '';
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = jwt.default.verify(token, process.env.SESSION_SECRET || 'aavincart-secret-key');
        email = decoded.email || '';
        if (decoded.id && !decoded.email) {
          const wsd = await storage.getWholesaleDealerById(decoded.id);
          if (wsd) email = wsd.email || `${wsd.wsdCode.toLowerCase()}@aavincart.com`;
        }
      } catch (e) {
        try {
          const parts = token.split(':');
          if (parts.length >= 2) email = parts[1] || '';
        } catch {}
      }

      if (!email) {
        return res.status(401).json({ success: false, message: 'Could not identify user' });
      }

      const approval = await storage.getUserHierarchyByChildEmail(email);
      res.json({ success: true, approval: approval || null });
    } catch (error) {
      console.error('Get my approval error:', error);
      res.status(500).json({ success: false, message: 'Failed to get approval info' });
    }
  });

  // B2B Registration - Public endpoint (no auth required)
  app.post("/api/b2b/register", async (req, res) => {
    try {
      const {
        role, businessName, contactName, email, phone, mobile2,
        gstin, panNumber, aadhaarNumber, address, addressLat, addressLng, city, state, pincode, districtUnion,
        fssaiLicense, bankAccountName, bankAccountNumber, bankIfsc, bankName, notes,
        district, office, businessType, businessTypeCode,
        businessRoute, businessPoint,
        msmeUdyam,
        freshMilkSegment, productsSegment, iceCreamSegment,
        freshMilkTier, productTier, iceCreamTier,
        securityDeposit
      } = req.body;

      if (!businessName) {
        return res.status(400).json({ success: false, message: 'Business name is required' });
      }

      if (!phone) {
        return res.status(400).json({ success: false, message: 'Mobile number is required' });
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }
      }

      if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 15-character GSTIN' });
      }

      const merchants = await storage.getMerchants();
      const resolvedUnion = districtUnion ? resolveDistrictUnionToMerchantId(districtUnion.trim(), merchants) : (districtUnion?.trim() || null);

      const toMerchantId = (id: string) => resolveDistrictUnionToMerchantId(id, merchants);

      const existing = await storage.getB2bRegistrations();
      const duplicate = existing.find((r: any) => {
        if (r.phone !== phone || r.status === 'rejected') return false;
        return toMerchantId(r.districtUnion || '') === resolvedUnion;
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `A registration with this phone number already exists under this union. Please use your existing credentials or contact admin.` });
      }

      const nameUnionDupe = existing.find((r: any) =>
        r.status !== 'rejected' &&
        r.businessName && businessName &&
        r.businessName.toLowerCase().trim() === businessName.trim().toLowerCase() &&
        toMerchantId(r.districtUnion || '') === resolvedUnion
      );
      if (nameUnionDupe) {
        return res.status(400).json({ success: false, message: `A registration with this business name already exists under this union. Please use your existing credentials or contact admin.` });
      }

      if (gstin) {
        const gstinDupe = existing.find((r: any) =>
          r.status !== 'rejected' && r.gstin && r.gstin.toUpperCase() === gstin.toUpperCase()
        );
        if (gstinDupe) {
          return res.status(400).json({ success: false, message: `A registration with this GSTIN already exists. Please use your existing credentials or contact admin.` });
        }
      }

      const existingUsers = await storage.listUsers();
      const userPhoneDupe = existingUsers.find((u: any) => {
        if (!u.phone || !phone || u.phone !== phone) return false;
        return toMerchantId(u.unionId || u.districtUnion || '') === resolvedUnion;
      });
      if (userPhoneDupe) {
        return res.status(400).json({ success: false, message: `An account with this phone number already exists under this union. Please use your existing credentials or contact admin.` });
      }
      const userNameUnionDupe = existingUsers.find((u: any) => {
        if (!u.businessName || !businessName) return false;
        if (u.businessName.toLowerCase().trim() !== businessName.trim().toLowerCase()) return false;
        return toMerchantId(u.unionId || u.districtUnion || '') === resolvedUnion;
      });
      if (userNameUnionDupe) {
        return res.status(400).json({ success: false, message: `An account with this business name already exists under this union. Please use your existing credentials or contact admin.` });
      }

      const typeCode = businessTypeCode || 'AA';
      const existingCount = existing.filter((r: any) => {
        return toMerchantId(r.districtUnion || '') === resolvedUnion && r.businessTypeCode === typeCode;
      }).length;
      const existingUserCount = existingUsers.filter((u: any) => {
        return toMerchantId(u.unionId || u.districtUnion || '') === resolvedUnion && (u.businessCode || '').startsWith(typeCode);
      }).length;
      const nextNum = Math.max(existingCount, existingUserCount) + 1;
      const generatedCode = `${typeCode}${String(nextNum).padStart(4, '0')}`;

      const registration = await storage.createB2bRegistration({
        role: (businessType || role || 'b2b').toLowerCase().replace(/[\s\/]/g, '_'),
        district: district?.trim() || null,
        districtUnion: resolvedUnion || districtUnion?.trim() || null,
        office: office?.trim() || null,
        businessType: businessType?.trim() || null,
        businessTypeCode: typeCode,
        businessRoute: businessRoute?.trim() || null,
        businessPoint: businessPoint?.trim() || null,
        businessCode: generatedCode,
        businessName: businessName.trim(),
        contactName: (contactName || businessName).trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        mobile2: mobile2?.trim() || null,
        gstin: gstin?.trim().toUpperCase() || null,
        panNumber: panNumber?.trim().toUpperCase() || null,
        aadhaarNumber: aadhaarNumber?.trim().replace(/\D/g, '') || null,
        fssaiLicense: fssaiLicense?.trim() || null,
        msmeUdyam: msmeUdyam?.trim().toUpperCase() || null,
        address: address?.trim() || null,
        addressLat: addressLat?.toString() || null,
        addressLng: addressLng?.toString() || null,
        city: city?.trim() || null,
        state: state?.trim() || 'Tamil Nadu',
        pincode: pincode?.trim() || null,
        freshMilkSegment: !!freshMilkSegment,
        productsSegment: !!productsSegment,
        iceCreamSegment: !!iceCreamSegment,
        freshMilkTier: freshMilkTier || null,
        productTier: productTier || null,
        iceCreamTier: iceCreamTier || productTier || null,
        securityDeposit: securityDeposit?.toString() || null,
        bankAccountName: bankAccountName?.trim() || null,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankIfsc: bankIfsc?.trim().toUpperCase() || null,
        bankName: bankName?.trim() || null,
        notes: notes?.trim() || null,
      });

      res.json({
        success: true,
        registration,
        businessCode: generatedCode,
        message: `Registration submitted successfully (Code: ${generatedCode}). Admin will review and approve your application.`
      });
    } catch (error) {
      console.error('B2B registration error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit registration' });
    }
  });

  // Admin B2B Registration Management
  app.get("/api/admin/b2b-registrations/export/csv", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      let registrations = await storage.getB2bRegistrations();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        registrations = registrations.filter((r: any) => {
          if (validIds.includes(r.unionId || '') || validIds.includes(r.districtUnion || '')) return true;
          const resolved = resolveDistrictUnionToMerchantId(r.districtUnion || '', merchants);
          return validIds.includes(resolved);
        });
      }
      const headers = [
        'S.No', 'District', 'District Union', 'Office', 'Business Type', 'Business Type Code',
        'Business Route', 'Business Point', 'Business Code', 'Business Name', 'Business Address',
        'Mobile 1', 'Mobile 2', 'Contact Name', 'Email',
        'GSTIN', 'PAN', 'Aadhaar', 'FSSAI License', 'MSME/UDYAM',
        'Fresh Milk Segment', 'Products Segment', 'Ice Cream Segment',
        'Fresh Milk Tier', 'Product Tier', 'Ice Cream Tier',
        'Security Deposit', 'Status', 'Created Date'
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = registrations.map((r: any, i: number) => [
        i + 1,
        escapeCsv(r.district),
        escapeCsv(r.districtUnion),
        escapeCsv(r.office),
        escapeCsv(r.businessType),
        escapeCsv(r.businessTypeCode),
        escapeCsv(r.businessRoute),
        escapeCsv(r.businessPoint),
        escapeCsv(r.businessCode),
        escapeCsv(r.businessName),
        escapeCsv(r.address),
        escapeCsv(r.phone),
        escapeCsv(r.mobile2),
        escapeCsv(r.contactName),
        escapeCsv(r.email),
        escapeCsv(r.gstin),
        escapeCsv(r.panNumber),
        escapeCsv(r.aadhaarNumber),
        escapeCsv(r.fssaiLicense),
        escapeCsv(r.msmeUdyam),
        r.freshMilkSegment ? 'Yes' : 'No',
        r.productsSegment ? 'Yes' : 'No',
        r.iceCreamSegment ? 'Yes' : 'No',
        escapeCsv(r.freshMilkTier),
        escapeCsv(r.productTier),
        escapeCsv(r.iceCreamTier),
        escapeCsv(r.securityDeposit),
        escapeCsv(r.status),
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '',
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=b2b_registrations.csv');
      res.send(csv);
    } catch (error) {
      console.error('Export B2B registrations error:', error);
      res.status(500).json({ success: false, message: 'Failed to export registrations' });
    }
  });

  app.get("/api/admin/b2b-registrations", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      let registrations = await storage.getB2bRegistrations(status);
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        registrations = registrations.filter((r: any) => {
          if (validIds.includes(r.unionId || '') || validIds.includes(r.districtUnion || '')) return true;
          const resolved = resolveDistrictUnionToMerchantId(r.districtUnion || '', merchants);
          return validIds.includes(resolved);
        });
      }
      res.json({ success: true, registrations });
    } catch (error) {
      console.error('Get B2B registrations error:', error);
      res.status(500).json({ success: false, message: 'Failed to get registrations' });
    }
  });

  app.get("/api/admin/b2b-registrations/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        const resolved = resolveDistrictUnionToMerchantId(registration.districtUnion || '', merchants);
        if (!validIds.includes(registration.unionId || '') && !validIds.includes(registration.districtUnion || '') && !validIds.includes(resolved)) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
      }
      res.json({ success: true, registration });
    } catch (error) {
      console.error('Get B2B registration error:', error);
      res.status(500).json({ success: false, message: 'Failed to get registration' });
    }
  });

  app.post("/api/admin/b2b-registrations/:id/approve", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const { parentId, parentRole, parentName, pricingTier, freshMilkApproved, productsApproved, iceCreamApproved, freshMilkPricingRole, productsPricingRole, iceCreamPricingRole } = req.body;

      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        const resolved = resolveDistrictUnionToMerchantId(registration.districtUnion || '', merchants);
        if (!validIds.includes(registration.unionId || '') && !validIds.includes(registration.districtUnion || '') && !validIds.includes(resolved)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this registration' });
        }
      }

      const updated = await storage.updateB2bRegistration(req.params.id, {
        status: 'approved',
        parentId: parentId || null,
        parentRole: parentRole || null,
        parentName: parentName || null,
        pricingTier: pricingTier || 'MRP',
        freshMilkApproved: freshMilkApproved || false,
        productsApproved: productsApproved || false,
        iceCreamApproved: iceCreamApproved || false,
        freshMilkPricingRole: freshMilkPricingRole || null,
        productsPricingRole: productsPricingRole || null,
        iceCreamPricingRole: iceCreamPricingRole || null,
        approvedBy: 'admin',
        approvedAt: new Date(),
      });
      await logAudit(req, "b2b_registrations", req.params.id, "UPDATE", { changedFields: ["status"], previousValues: { status: registration.status }, newValues: { status: "approved", pricingTier, businessName: registration.businessName } });

      // Resolve districtUnion to a proper merchant ID
      const resolvedMerchantId = resolveDistrictUnionToMerchantId(registration.districtUnion || '', await storage.getMerchants());
      const resolvedRestaurantSlug = (() => {
        const merchants = [];
        for (const [mId, uId] of Object.entries(merchantToUnionMapping)) {
          if (mId === resolvedMerchantId || uId === resolvedMerchantId) return mId;
        }
        return resolvedMerchantId;
      })();

      // Create or update user account with B2B fields from registration
      let duplicateWarnings: string[] = [];
      try {
        const existingUsers = await storage.listUsers();
        const existingUser = existingUsers.find((u: any) =>
          u.phone === registration.phone || (registration.email && u.email === registration.email)
        );

        // Check for potential duplicates by businessCode, businessName, or GSTIN
        const regBusinessCode = (registration as any).businessCode || '';
        const regBusinessName = (registration.businessName || '').toLowerCase();
        const regGstin = (registration.gstin || '').toUpperCase();
        const potentialDupes = existingUsers.filter((u: any) => {
          if (existingUser && u.id === existingUser.id) return false;
          if (regBusinessCode && u.businessCode === regBusinessCode) return true;
          if (regGstin && regGstin.length > 5 && (u.gstNumber || '').toUpperCase() === regGstin) return true;
          if (regBusinessName && (u.businessName || '').toLowerCase() === regBusinessName &&
              (u.districtUnion || '').toLowerCase() === (registration.districtUnion || '').toLowerCase()) return true;
          return false;
        });
        if (potentialDupes.length > 0) {
          duplicateWarnings = potentialDupes.map((d: any) =>
            `Potential duplicate: ${d.name} (${d.businessCode || 'no code'}, phone: ${d.phone || 'N/A'}, role: ${d.role})`
          );
        }

        const b2bUserData: any = {
          name: registration.contactName,
          email: registration.email || `${registration.phone}@b2b.aavincart.com`,
          phone: registration.phone,
          role: registration.role,
          pricingRole: pricingTier || 'MRP',
          freshMilkPricingRole: freshMilkPricingRole || 'MRP',
          productsPricingRole: productsPricingRole || 'MRP',
          iceCreamPricingRole: iceCreamPricingRole || 'MRP',
          district: registration.district || '',
          districtUnion: registration.districtUnion || '',
          office: (registration as any).office || '',
          businessType: (registration as any).businessType || '',
          businessTypeCode: (registration as any).businessTypeCode || '',
          businessRoute: (registration as any).businessRoute || '',
          businessPoint: (registration as any).businessPoint || '',
          businessCode: (registration as any).businessCode || '',
          businessName: registration.businessName || '',
          businessAddress: registration.address || '',
          addressLat: (registration as any).addressLat || '',
          addressLng: (registration as any).addressLng || '',
          gstNumber: registration.gstin || '',
          panNumber: registration.panNumber || '',
          aadhaarNumber: (registration as any).aadhaarNumber || '',
          msmeNumber: (registration as any).msmeUdyam || '',
          securityDeposit: (registration as any).securityDeposit || '',
          fssaiLicense: registration.fssaiLicense || '',
          unionId: resolvedMerchantId,
          restaurantId: resolvedRestaurantSlug,
        };

        if (existingUser) {
          await storage.updateUser(existingUser.id, b2bUserData);
        } else {
          const regDefaultPassword = registration.phone || 'Aavin@123';
          const passwordHash = await hashPassword(regDefaultPassword);
          await storage.createUser({ ...b2bUserData, passwordHash, plainPassword: regDefaultPassword });
        }
      } catch (e) {
        console.error('Failed to create/update user from B2B registration:', e);
      }

      if (parentId && parentRole) {
        try {
          await storage.createUserHierarchy({
            parentId: parentId,
            parentRole: parentRole,
            parentEmail: parentName || parentId,
            parentName: parentName || parentId,
            childId: registration.id,
            childRole: registration.role,
            childEmail: registration.email,
            childName: registration.contactName,
            childPhone: registration.phone || undefined,
            childAddress: registration.address || undefined,
            childGstin: registration.gstin || undefined,
            childBusinessName: registration.businessName,
            approvalStatus: 'approved',
            pricingTier: pricingTier || 'MRP',
            freshMilkApproved: freshMilkApproved || false,
            productsApproved: productsApproved || false,
            iceCreamApproved: iceCreamApproved || false,
            freshMilkPricingRole: freshMilkPricingRole || 'MRP',
            productsPricingRole: productsPricingRole || 'MRP',
            iceCreamPricingRole: iceCreamPricingRole || 'MRP',
            districtUnion: registration.districtUnion || undefined,
            approvedAt: new Date(),
            approvedBy: 'admin',
            isActive: true,
          });
        } catch (e) {
          console.error('Failed to create hierarchy mapping:', e);
        }
      }

      res.json({ success: true, registration: updated, message: 'Registration approved and mapped successfully', duplicateWarnings: duplicateWarnings.length > 0 ? duplicateWarnings : undefined });
    } catch (error) {
      console.error('Approve B2B registration error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve registration' });
    }
  });

  app.post("/api/admin/b2b-registrations/:id/reject", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        const resolved = resolveDistrictUnionToMerchantId(registration.districtUnion || '', merchants);
        if (!validIds.includes(registration.unionId || '') && !validIds.includes(registration.districtUnion || '') && !validIds.includes(resolved)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this registration' });
        }
      }
      const { rejectedReason } = req.body;
      const updated = await storage.updateB2bRegistration(req.params.id, {
        status: 'rejected',
        rejectedReason: rejectedReason || 'Application rejected by admin',
        approvedBy: 'admin',
      });
      await logAudit(req, "b2b_registrations", req.params.id, "UPDATE", { changedFields: ["status"], newValues: { status: "rejected", rejectedReason } });

      res.json({ success: true, registration: updated });
    } catch (error) {
      console.error('Reject B2B registration error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject registration' });
    }
  });

  app.delete("/api/admin/b2b-registrations/:id", requireAuth, requireRole('admin', 'merchant'), async (req, res) => {
    try {
      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        const merchants = await storage.getMerchants();
        const resolved = resolveDistrictUnionToMerchantId(registration.districtUnion || '', merchants);
        if (!validIds.includes(registration.unionId || '') && !validIds.includes(registration.districtUnion || '') && !validIds.includes(resolved)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this registration' });
        }
      }
      await storage.deleteB2bRegistration(req.params.id);
      await logAudit(req, "b2b_registrations", req.params.id, "DELETE", {});
      res.json({ success: true, message: 'Registration deleted' });
    } catch (error) {
      console.error('Delete B2B registration error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete registration' });
    }
  });

  // B2B Multi-Level Approval System
  // Level mapping: 5=Executive/Staff, 4=Deputy Manager/Supervisor, 3=Manager, 2=AGM, 1=GM
  const APPROVAL_LEVEL_NAMES: Record<number, string> = {
    5: 'Executive / Staff',
    4: 'Deputy Manager / Supervisor',
    3: 'Manager',
    2: 'AGM (Assistant General Manager)',
    1: 'GM (General Manager)',
  };

  app.get("/api/b2b-registrations/by-staff-level", async (req, res) => {
    try {
      const level = parseInt(req.query.level as string) || 5;
      const unionId = req.query.unionId as string;
      const status = req.query.status as string;
      const allRegs = await storage.getB2bRegistrations();
      let filtered = allRegs;
      if (unionId) {
        filtered = filtered.filter((r: any) => {
          const regUnion = (r.districtUnion || '').toLowerCase();
          return regUnion.includes(unionId.toLowerCase()) || unionId.toLowerCase().includes(regUnion);
        });
      }
      if (status === 'pending_at_my_level') {
        filtered = filtered.filter((r: any) => r.status === 'pending' && (r.currentApproverLevel || 5) === level);
      } else if (status === 'approved_by_me') {
        filtered = filtered.filter((r: any) => {
          const chain = Array.isArray(r.approvalChain) ? r.approvalChain : [];
          return chain.some((c: any) => c.level === level && c.action === 'approved');
        });
      } else if (status === 'rejected') {
        filtered = filtered.filter((r: any) => r.status === 'rejected');
      } else if (status === 'fully_approved') {
        filtered = filtered.filter((r: any) => r.status === 'approved');
      }
      const counters = {
        pendingAtMyLevel: allRegs.filter((r: any) => r.status === 'pending' && (r.currentApproverLevel || 5) === level && (!unionId || (r.districtUnion || '').toLowerCase().includes(unionId.toLowerCase()))).length,
        approvedByMe: allRegs.filter((r: any) => {
          const chain = Array.isArray(r.approvalChain) ? r.approvalChain : [];
          return chain.some((c: any) => c.level === level && c.action === 'approved') && (!unionId || (r.districtUnion || '').toLowerCase().includes(unionId.toLowerCase()));
        }).length,
        rejected: allRegs.filter((r: any) => r.status === 'rejected' && (!unionId || (r.districtUnion || '').toLowerCase().includes(unionId.toLowerCase()))).length,
        fullyApproved: allRegs.filter((r: any) => r.status === 'approved' && (!unionId || (r.districtUnion || '').toLowerCase().includes(unionId.toLowerCase()))).length,
        total: filtered.length,
      };
      res.json({ success: true, registrations: filtered, counters, levelName: APPROVAL_LEVEL_NAMES[level] || `Level ${level}` });
    } catch (error) {
      console.error('Get B2B registrations by staff level error:', error);
      res.status(500).json({ success: false, message: 'Failed to get registrations' });
    }
  });

  app.get("/api/b2b-registrations/:id/approval-history", async (req, res) => {
    try {
      const history = await storage.getB2bApprovalHistory(req.params.id);
      const registration = await storage.getB2bRegistrationById(req.params.id);
      res.json({
        success: true,
        history,
        registration,
        levelNames: APPROVAL_LEVEL_NAMES,
      });
    } catch (error) {
      console.error('Get B2B approval history error:', error);
      res.status(500).json({ success: false, message: 'Failed to get approval history' });
    }
  });

  app.post("/api/b2b-registrations/:id/approve-level", async (req, res) => {
    try {
      const { staffId, staffName, staffDesignation, staffDepartment, unionId, comments, level } = req.body;
      const approverLevel = parseInt(level) || 5;

      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

      if (registration.status !== 'pending') {
        return res.status(400).json({ success: false, message: `Registration is already ${registration.status}` });
      }

      const currentLevel = registration.currentApproverLevel || 5;
      if (approverLevel !== currentLevel) {
        return res.status(400).json({ success: false, message: `This registration is pending at ${APPROVAL_LEVEL_NAMES[currentLevel]}. You cannot approve at your level.` });
      }

      const existingChain = Array.isArray(registration.approvalChain) ? registration.approvalChain : [];
      const newEntry = {
        level: approverLevel,
        action: 'approved',
        staffId: staffId || 'unknown',
        staffName: staffName || 'Staff',
        designation: staffDesignation || '',
        timestamp: new Date().toISOString(),
        comments: comments || '',
      };
      const updatedChain = [...existingChain, newEntry];

      await storage.createB2bApprovalHistory({
        registrationId: req.params.id,
        level: approverLevel,
        levelName: APPROVAL_LEVEL_NAMES[approverLevel] || `Level ${approverLevel}`,
        action: 'approved',
        staffId: staffId || null,
        staffName: staffName || null,
        staffDesignation: staffDesignation || null,
        staffDepartment: staffDepartment || null,
        unionId: unionId || null,
        comments: comments || null,
      });

      const nextLevel = approverLevel - 1;
      if (nextLevel >= 1) {
        await storage.updateB2bRegistration(req.params.id, {
          approvalLevel: approverLevel,
          currentApproverLevel: nextLevel,
          approvalChain: updatedChain as any,
        });
        res.json({
          success: true,
          message: `Approved at ${APPROVAL_LEVEL_NAMES[approverLevel]}. Forwarded to ${APPROVAL_LEVEL_NAMES[nextLevel]} for next approval.`,
          nextLevel,
          nextLevelName: APPROVAL_LEVEL_NAMES[nextLevel],
        });
      } else {
        await storage.updateB2bRegistration(req.params.id, {
          status: 'approved',
          approvalLevel: approverLevel,
          currentApproverLevel: 0,
          approvalChain: updatedChain as any,
          approvedBy: staffName || 'GM',
          approvedAt: new Date(),
        });
        res.json({
          success: true,
          message: 'Registration fully approved by GM. Final approval complete.',
          nextLevel: 0,
          fullyApproved: true,
        });
      }
    } catch (error) {
      console.error('Approve B2B registration level error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve registration' });
    }
  });

  app.post("/api/b2b-registrations/:id/reject-level", async (req, res) => {
    try {
      const { staffId, staffName, staffDesignation, staffDepartment, unionId, comments, level, reason } = req.body;
      const rejecterLevel = parseInt(level) || 5;

      const registration = await storage.getB2bRegistrationById(req.params.id);
      if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

      if (registration.status !== 'pending') {
        return res.status(400).json({ success: false, message: `Registration is already ${registration.status}` });
      }

      const existingChain = Array.isArray(registration.approvalChain) ? registration.approvalChain : [];
      const newEntry = {
        level: rejecterLevel,
        action: 'rejected',
        staffId: staffId || 'unknown',
        staffName: staffName || 'Staff',
        designation: staffDesignation || '',
        timestamp: new Date().toISOString(),
        comments: reason || comments || 'Rejected',
      };
      const updatedChain = [...existingChain, newEntry];

      await storage.createB2bApprovalHistory({
        registrationId: req.params.id,
        level: rejecterLevel,
        levelName: APPROVAL_LEVEL_NAMES[rejecterLevel] || `Level ${rejecterLevel}`,
        action: 'rejected',
        staffId: staffId || null,
        staffName: staffName || null,
        staffDesignation: staffDesignation || null,
        staffDepartment: staffDepartment || null,
        unionId: unionId || null,
        comments: reason || comments || null,
      });

      await storage.updateB2bRegistration(req.params.id, {
        status: 'rejected',
        approvalChain: updatedChain as any,
        rejectedReason: reason || comments || `Rejected by ${APPROVAL_LEVEL_NAMES[rejecterLevel]}`,
      });

      res.json({
        success: true,
        message: `Registration rejected by ${APPROVAL_LEVEL_NAMES[rejecterLevel]}.`,
      });
    } catch (error) {
      console.error('Reject B2B registration level error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject registration' });
    }
  });

  // Fresh Milk Dealer (FMD) Authentication Routes
}
