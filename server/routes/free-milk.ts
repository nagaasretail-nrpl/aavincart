import type { Express } from "express";
import { db } from "../db";
import { eq, and, desc, inArray, asc, gte, lt, sum } from "drizzle-orm";
import { freeMilkRequests, mmoRouteAgents, mmoRoutes, mmoOffices, unionStaff, merchants, insertFreeMilkRequestSchema } from "@shared/schema";
import { requireAuth, requireRole } from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { resolveMerchantId } from "./shared";
import { sendToUser } from "../firebase";

function resolveUnionIdForStaff(req: AuthenticatedRequest): string | null {
  const user = req.user as any;
  if (!user) return null;
  if (user.role === 'union_staff' && user.unionId) return user.unionId;
  if ((user.role === 'employee' || user.role === 'staff') && (user.unionId || user.merchantId || user.restaurantId)) {
    return user.unionId || user.merchantId || user.restaurantId;
  }
  return null;
}

/** Returns [start, end) timestamps for the current calendar month in UTC */
function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Compute the effective entitlement for a staff member.
 * Priority: per-employee override → union default → system fallback (10 L).
 */
async function resolveEntitlement(employeeId: string, unionId: string): Promise<number> {
  const SYSTEM_DEFAULT = 10;

  // 1. Per-employee override
  const [staffRow] = await db
    .select({ monthlyEntitlementLiters: unionStaff.monthlyEntitlementLiters })
    .from(unionStaff)
    .where(eq(unionStaff.id, employeeId))
    .limit(1);

  if (staffRow?.monthlyEntitlementLiters !== null && staffRow?.monthlyEntitlementLiters !== undefined) {
    const v = parseFloat(String(staffRow.monthlyEntitlementLiters));
    if (!isNaN(v)) return v;
  }

  // 2. Union default
  const [merchantRow] = await db
    .select({ freeMilkEntitlementLiters: merchants.freeMilkEntitlementLiters })
    .from(merchants)
    .where(eq(merchants.id, unionId))
    .limit(1);

  if (merchantRow?.freeMilkEntitlementLiters !== null && merchantRow?.freeMilkEntitlementLiters !== undefined) {
    const v = parseFloat(String(merchantRow.freeMilkEntitlementLiters));
    if (!isNaN(v)) return v;
  }

  return SYSTEM_DEFAULT;
}

/** Sum of approved/pending/fulfilled liters this month for an employee */
async function monthlyUsedLiters(employeeId: string): Promise<number> {
  const { start, end } = currentMonthRange();
  const rows = await db
    .select({ quantityLiters: freeMilkRequests.quantityLiters, status: freeMilkRequests.status })
    .from(freeMilkRequests)
    .where(
      and(
        eq(freeMilkRequests.employeeId, employeeId),
        gte(freeMilkRequests.createdAt, start),
        lt(freeMilkRequests.createdAt, end),
        // Count pending + approved + fulfilled; exclude rejected
      )
    );

  return rows
    .filter(r => r.status !== "rejected")
    .reduce((s, r) => s + parseFloat(String(r.quantityLiters) || "0"), 0);
}

export async function registerFreeMilkRoutes(app: Express): Promise<void> {

  // GET /api/free-milk/entitlement — employee fetches their current month usage + entitlement
  app.get("/api/free-milk/entitlement", requireAuth, requireRole('union_staff', 'employee', 'staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user as any;
      const derivedUnionId = resolveUnionIdForStaff(req);
      if (!derivedUnionId) return res.status(403).json({ error: "No union association found." });

      const [entitlementLiters, usedLiters] = await Promise.all([
        resolveEntitlement(user.id, derivedUnionId),
        monthlyUsedLiters(user.id),
      ]);

      const remainingLiters = Math.max(0, entitlementLiters - usedLiters);
      res.json({ entitlementLiters, usedLiters, remainingLiters });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/free-milk/request — union employees submit a request
  app.post("/api/free-milk/request", requireAuth, requireRole('union_staff', 'employee', 'staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user as any;
      const derivedUnionId = resolveUnionIdForStaff(req);
      if (!derivedUnionId) {
        return res.status(403).json({ error: "No union association found for this account." });
      }

      const { quantityLiters, deliveryType, notes } = req.body;

      if (!quantityLiters || isNaN(parseFloat(String(quantityLiters))) || parseFloat(String(quantityLiters)) <= 0) {
        return res.status(400).json({ error: "Please enter a valid quantity in liters." });
      }

      const requestedQty = parseFloat(parseFloat(String(quantityLiters)).toFixed(2));

      // --- Entitlement check ---
      const [entitlementLiters, usedLiters] = await Promise.all([
        resolveEntitlement(user.id, derivedUnionId),
        monthlyUsedLiters(user.id),
      ]);
      const remainingLiters = Math.max(0, entitlementLiters - usedLiters);

      if (requestedQty > remainingLiters + 0.001) {
        return res.status(400).json({
          error: `Request exceeds your monthly entitlement. You have ${remainingLiters.toFixed(2)} L remaining out of ${entitlementLiters.toFixed(2)} L for this month.`,
          remainingLiters,
          entitlementLiters,
          usedLiters,
        });
      }
      // -------------------------

      const payload = {
        employeeId: user.id,
        employeeName: user.name || user.email,
        unionId: derivedUnionId,
        quantityLiters: String(requestedQty.toFixed(2)),
        status: "pending" as const,
        deliveryType: deliveryType === "pickup" ? "pickup" : "route",
        notes: notes ? String(notes).slice(0, 500) : null,
        adminNotes: null,
        assignedAgentId: null,
      };

      const parsed = insertFreeMilkRequestSchema.parse(payload);
      const [newRequest] = await db.insert(freeMilkRequests).values(parsed).returning();
      res.json(newRequest);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // GET /api/free-milk/requests — admin/merchant fetches all requests for their union
  app.get("/api/free-milk/requests", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const { status } = req.query;
      let conditions = [eq(freeMilkRequests.unionId, merchantId)];
      if (status && status !== "all") {
        conditions.push(eq(freeMilkRequests.status, String(status)));
      }

      const requests = await db.select().from(freeMilkRequests)
        .where(and(...conditions))
        .orderBy(desc(freeMilkRequests.createdAt));

      const agentIds = requests.map(r => r.assignedAgentId).filter(Boolean) as string[];
      let agentMap: Record<string, any> = {};
      if (agentIds.length > 0) {
        const agents = await db.select().from(mmoRouteAgents).where(inArray(mmoRouteAgents.id, agentIds));
        for (const a of agents) agentMap[a.id] = a;
      }

      const enriched = requests.map(r => ({
        ...r,
        assignedAgent: r.assignedAgentId ? agentMap[r.assignedAgentId] || null : null,
      }));

      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/free-milk/my-requests — union employees fetch their own requests
  app.get("/api/free-milk/my-requests", requireAuth, requireRole('union_staff', 'employee', 'staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user as any;
      const requests = await db.select().from(freeMilkRequests)
        .where(eq(freeMilkRequests.employeeId, user.id))
        .orderBy(desc(freeMilkRequests.createdAt));
      res.json(requests);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/free-milk/agents — admin/merchant fetches route agents for assignment
  app.get("/api/free-milk/agents", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const agents = await db.select({
        id: mmoRouteAgents.id,
        agentCode: mmoRouteAgents.agentCode,
        agentName: mmoRouteAgents.agentName,
        pointName: mmoRouteAgents.pointName,
        routeId: mmoRouteAgents.routeId,
      }).from(mmoRouteAgents)
        .where(and(eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)))
        .orderBy(mmoRouteAgents.agentCode);

      const routeIds = [...new Set(agents.map(a => a.routeId))];
      let routeMap: Record<string, string> = {};
      if (routeIds.length > 0) {
        const routes = await db.select({ id: mmoRoutes.id, routeName: mmoRoutes.routeName })
          .from(mmoRoutes).where(inArray(mmoRoutes.id, routeIds));
        for (const r of routes) routeMap[r.id] = r.routeName;
      }

      const enriched = agents.map(a => ({ ...a, routeName: routeMap[a.routeId] || a.routeId }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/free-milk/union-entitlement — merchant reads union-level default entitlement
  app.get("/api/free-milk/union-entitlement", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const [row] = await db
        .select({ freeMilkEntitlementLiters: merchants.freeMilkEntitlementLiters })
        .from(merchants)
        .where(eq(merchants.id, merchantId))
        .limit(1);

      const value = row?.freeMilkEntitlementLiters !== null && row?.freeMilkEntitlementLiters !== undefined
        ? parseFloat(String(row.freeMilkEntitlementLiters))
        : 10;

      res.json({ entitlementLiters: value });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/free-milk/union-entitlement — merchant updates union-level default entitlement
  app.patch("/api/free-milk/union-entitlement", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const { entitlementLiters } = req.body;
      if (entitlementLiters === undefined || isNaN(parseFloat(String(entitlementLiters))) || parseFloat(String(entitlementLiters)) < 0) {
        return res.status(400).json({ error: "Please provide a valid entitlement value in liters." });
      }

      const val = parseFloat(parseFloat(String(entitlementLiters)).toFixed(2));
      await db.update(merchants)
        .set({ freeMilkEntitlementLiters: String(val), updatedAt: new Date() })
        .where(eq(merchants.id, merchantId));

      res.json({ entitlementLiters: val });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/free-milk/staff/:id/entitlement — admin sets per-employee entitlement override
  app.patch("/api/free-milk/staff/:id/entitlement", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      // Verify staff belongs to this union
      const [staffRow] = await db
        .select({ id: unionStaff.id })
        .from(unionStaff)
        .where(and(eq(unionStaff.id, req.params.id), eq(unionStaff.unionId, merchantId)))
        .limit(1);

      if (!staffRow) return res.status(404).json({ error: "Staff member not found." });

      const { entitlementLiters } = req.body;
      // null means "use union default"
      const val = entitlementLiters === null || entitlementLiters === undefined || entitlementLiters === ""
        ? null
        : parseFloat(parseFloat(String(entitlementLiters)).toFixed(2));

      if (val !== null && (isNaN(val) || val < 0)) {
        return res.status(400).json({ error: "Invalid entitlement value." });
      }

      await db.update(unionStaff)
        .set({ monthlyEntitlementLiters: val === null ? null : String(val), updatedAt: new Date() })
        .where(eq(unionStaff.id, req.params.id));

      res.json({ employeeId: req.params.id, entitlementLiters: val });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/free-milk/staff-entitlements — admin gets this month's usage per employee
  app.get("/api/free-milk/staff-entitlements", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const { start, end } = currentMonthRange();

      // Union default
      const [merchantRow] = await db
        .select({ freeMilkEntitlementLiters: merchants.freeMilkEntitlementLiters })
        .from(merchants)
        .where(eq(merchants.id, merchantId))
        .limit(1);
      const unionDefault = merchantRow?.freeMilkEntitlementLiters !== null && merchantRow?.freeMilkEntitlementLiters !== undefined
        ? parseFloat(String(merchantRow.freeMilkEntitlementLiters))
        : 10;

      // This month's non-rejected requests for the union
      const monthRows = await db
        .select({
          employeeId: freeMilkRequests.employeeId,
          employeeName: freeMilkRequests.employeeName,
          quantityLiters: freeMilkRequests.quantityLiters,
          status: freeMilkRequests.status,
        })
        .from(freeMilkRequests)
        .where(
          and(
            eq(freeMilkRequests.unionId, merchantId),
            gte(freeMilkRequests.createdAt, start),
            lt(freeMilkRequests.createdAt, end)
          )
        );

      // Group by employee
      const empMap: Record<string, { employeeId: string; employeeName: string; usedLiters: number }> = {};
      for (const r of monthRows) {
        if (r.status === "rejected") continue;
        if (!empMap[r.employeeId]) {
          empMap[r.employeeId] = { employeeId: r.employeeId, employeeName: r.employeeName, usedLiters: 0 };
        }
        empMap[r.employeeId].usedLiters += parseFloat(String(r.quantityLiters) || "0");
      }

      // Fetch per-employee overrides from union_staff
      const employeeIds = Object.keys(empMap);
      let overrideMap: Record<string, number | null> = {};
      if (employeeIds.length > 0) {
        const staffRows = await db
          .select({ id: unionStaff.id, monthlyEntitlementLiters: unionStaff.monthlyEntitlementLiters })
          .from(unionStaff)
          .where(inArray(unionStaff.id, employeeIds));
        for (const s of staffRows) {
          overrideMap[s.id] = s.monthlyEntitlementLiters !== null && s.monthlyEntitlementLiters !== undefined
            ? parseFloat(String(s.monthlyEntitlementLiters))
            : null;
        }
      }

      const result = Object.values(empMap).map(e => {
        const entitlementLiters = overrideMap[e.employeeId] ?? unionDefault;
        return {
          ...e,
          entitlementLiters,
          remainingLiters: Math.max(0, entitlementLiters - e.usedLiters),
          hasOverride: overrideMap[e.employeeId] !== null && overrideMap[e.employeeId] !== undefined,
        };
      });

      res.json({ unionDefault, result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/free-milk/requests/:id/approve — admin/merchant approves a request
  app.patch("/api/free-milk/requests/:id/approve", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const [existing] = await db.select().from(freeMilkRequests)
        .where(and(eq(freeMilkRequests.id, req.params.id), eq(freeMilkRequests.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Request not found" });
      if (existing.status !== "pending") return res.status(400).json({ error: "Only pending requests can be approved" });

      let { assignedAgentId, deliveryType, adminNotes } = req.body;
      const resolvedDelivery = deliveryType === "pickup" ? "pickup" : (existing.deliveryType || "route");

      if (assignedAgentId) {
        const [agentCheck] = await db.select({ id: mmoRouteAgents.id })
          .from(mmoRouteAgents)
          .where(and(
            eq(mmoRouteAgents.id, String(assignedAgentId)),
            eq(mmoRouteAgents.unionId, merchantId),
            eq(mmoRouteAgents.isActive, true)
          ))
          .limit(1);
        if (!agentCheck) {
          return res.status(400).json({ error: "Selected agent not found or does not belong to this union." });
        }
      }

      if (resolvedDelivery === "route" && !assignedAgentId) {
        let scopedOfficeIds: string[] = [];

        const [staffRecord] = await db.select({ assignedOffice: unionStaff.assignedOffice })
          .from(unionStaff)
          .where(eq(unionStaff.id, existing.employeeId))
          .limit(1);

        if (staffRecord?.assignedOffice) {
          let officeNames: string[] = [];
          try {
            const parsed = JSON.parse(staffRecord.assignedOffice);
            officeNames = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
          } catch {
            officeNames = [String(staffRecord.assignedOffice)];
          }

          if (officeNames.length > 0) {
            const matchedOffices = await db.select({ id: mmoOffices.id })
              .from(mmoOffices)
              .where(and(
                eq(mmoOffices.unionId, merchantId),
                inArray(mmoOffices.officeName, officeNames)
              ));
            scopedOfficeIds = matchedOffices.map(o => o.id);
          }
        }

        if (scopedOfficeIds.length > 0) {
          const [officeAgent] = await db.select({ id: mmoRouteAgents.id })
            .from(mmoRouteAgents)
            .where(and(
              eq(mmoRouteAgents.unionId, merchantId),
              eq(mmoRouteAgents.isActive, true),
              inArray(mmoRouteAgents.mmoOfficeId, scopedOfficeIds)
            ))
            .orderBy(asc(mmoRouteAgents.sequenceNo), asc(mmoRouteAgents.agentCode))
            .limit(1);
          if (officeAgent) assignedAgentId = officeAgent.id;
        }

        if (!assignedAgentId) {
          const [fallbackAgent] = await db.select({ id: mmoRouteAgents.id })
            .from(mmoRouteAgents)
            .where(and(eq(mmoRouteAgents.unionId, merchantId), eq(mmoRouteAgents.isActive, true)))
            .orderBy(asc(mmoRouteAgents.sequenceNo), asc(mmoRouteAgents.agentCode))
            .limit(1);
          if (fallbackAgent) assignedAgentId = fallbackAgent.id;
        }
      }

      const updateData: Record<string, any> = {
        status: "approved",
        deliveryType: resolvedDelivery,
        updatedAt: new Date(),
      };
      if (assignedAgentId) updateData.assignedAgentId = String(assignedAgentId);
      if (adminNotes) updateData.adminNotes = String(adminNotes).slice(0, 500);

      const [updated] = await db.update(freeMilkRequests).set(updateData)
        .where(eq(freeMilkRequests.id, req.params.id)).returning();

      // Send push notification to the employee (fire-and-forget)
      (async () => {
        try {
          let deliveryDetail = "";
          if (updated.deliveryType === "pickup") {
            deliveryDetail = "Please collect your milk from the pickup point.";
          } else if (updated.assignedAgentId) {
            const [agent] = await db.select({ agentCode: mmoRouteAgents.agentCode, agentName: mmoRouteAgents.agentName, pointName: mmoRouteAgents.pointName })
              .from(mmoRouteAgents).where(eq(mmoRouteAgents.id, updated.assignedAgentId)).limit(1);
            if (agent) {
              deliveryDetail = `Delivery agent: ${agent.agentName || agent.agentCode}${agent.pointName ? ` (${agent.pointName})` : ""}.`;
            }
          }
          const qty = parseFloat(String(updated.quantityLiters)).toFixed(2);
          await sendToUser(updated.employeeId, {
            title: "Free Milk Request Approved ✓",
            body: `Your request for ${qty} L of free milk has been approved. ${deliveryDetail}`.trim(),
            data: { type: "free_milk_approved", requestId: updated.id },
          });
        } catch (err) {
          console.error("Free milk approval notification error:", err);
        }
      })();

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/free-milk/requests/:id/reject — admin/merchant rejects a request
  app.patch("/api/free-milk/requests/:id/reject", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const [existing] = await db.select().from(freeMilkRequests)
        .where(and(eq(freeMilkRequests.id, req.params.id), eq(freeMilkRequests.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Request not found" });
      if (existing.status !== "pending") return res.status(400).json({ error: "Only pending requests can be rejected" });

      const { adminNotes } = req.body;
      const updateData: Record<string, any> = {
        status: "rejected",
        updatedAt: new Date(),
      };
      if (adminNotes) updateData.adminNotes = String(adminNotes).slice(0, 500);

      const [updated] = await db.update(freeMilkRequests).set(updateData)
        .where(eq(freeMilkRequests.id, req.params.id)).returning();

      // Send push notification to the employee (fire-and-forget)
      (async () => {
        try {
          const qty = parseFloat(String(updated.quantityLiters)).toFixed(2);
          const reason = updated.adminNotes ? ` Reason: ${updated.adminNotes}` : "";
          await sendToUser(updated.employeeId, {
            title: "Free Milk Request Rejected",
            body: `Your request for ${qty} L of free milk has been rejected.${reason}`,
            data: { type: "free_milk_rejected", requestId: updated.id },
          });
        } catch (err) {
          console.error("Free milk rejection notification error:", err);
        }
      })();

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/free-milk/requests/:id/fulfill — admin/merchant marks a request fulfilled
  app.patch("/api/free-milk/requests/:id/fulfill", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const [existing] = await db.select().from(freeMilkRequests)
        .where(and(eq(freeMilkRequests.id, req.params.id), eq(freeMilkRequests.unionId, merchantId)));
      if (!existing) return res.status(404).json({ error: "Request not found" });
      if (existing.status !== "approved") return res.status(400).json({ error: "Only approved requests can be fulfilled" });

      const [updated] = await db.update(freeMilkRequests)
        .set({ status: "fulfilled", updatedAt: new Date() })
        .where(eq(freeMilkRequests.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
