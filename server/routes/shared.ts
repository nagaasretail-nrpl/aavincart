// Shared helpers used across multiple route modules

import { db } from "../db";
import { sql, eq, and, inArray, desc } from "drizzle-orm";
import { deliveryJobs, deliveryPartners, orders as ordersTable } from "@shared/schema";

// ============ MERCHANT / UNION ID MAPPING ============

export const merchantToUnionMapping: Record<string, string> = {
  'merchant-2': 'UNI-CBE-01',
  'merchant-3': 'UNI-SLM-01',
  'merchant-4': 'UNI-MDU-01',
  'merchant-5': 'UNI-TRY-01',
  'merchant-6': 'UNI-TNJ-01',
  'merchant-7': 'UNI-ERO-01',
  'merchant-8': 'UNI-TNV-01',
  'merchant-9': 'UNI-VLR-01',
  'merchant-10': 'UNI-VPM-01',
  'merchant-11': 'UNI-KTU-01',
  'merchant-12': 'UNI-TVM-01',
  'merchant-13': 'UNI-CUD-01',
  'merchant-15': 'UNI-DGL-01',
  'merchant-16': 'UNI-THN-01',
  'merchant-17': 'UNI-VNR-01',
  'merchant-19': 'UNI-SVG-01',
  'merchant-20': 'UNI-TUT-01',
  'merchant-21': 'UNI-KYK-01',
  'merchant-22': 'UNI-NKL-01',
  'merchant-23': 'UNI-DPI-01',
  'merchant-24': 'UNI-KGI-01',
  'merchant-25': 'UNI-TPR-01',
  'merchant-26': 'UNI-KRR-01',
  'merchant-28': 'UNI-KAL-01',
  'merchant-29': 'UNI-NGR-01',
  'merchant-30': 'UNI-PUD-01',
  'merchant-31': 'UNI-TPT-01',
  'merchant-fed-01': 'FED-TCMPF-01',
  'merchant-fed-amb': 'FED-AMB-01',
  'merchant-fed-mad': 'FED-MAD-01',
  'merchant-fed-pro': 'FED-PROD-01',
  'merchant-fed-sho': 'FED-SHL-01',
};

export function getAllIdsForMerchant(merchantId: string): string[] {
  const ids = [merchantId];
  const unionId = merchantToUnionMapping[merchantId];
  if (unionId) ids.push(unionId);
  const numericId = merchantId.replace('merchant-', '');
  if (numericId !== merchantId) ids.push(numericId);
  return ids;
}

export function resolveDistrictUnionToMerchantId(districtUnion: string, merchants: any[]): string {
  if (!districtUnion) return '';
  if (districtUnion.startsWith('merchant-')) return districtUnion;
  if (/^(UNI|FED)-/.test(districtUnion)) {
    const entry = Object.entries(merchantToUnionMapping).find(([_, uId]) => uId === districtUnion);
    return entry ? entry[0] : districtUnion;
  }
  const normalized = districtUnion.toLowerCase().trim();
  const match = merchants.find((m: any) =>
    (m.restaurantName || m.name || '').toLowerCase().trim() === normalized ||
    (m.restaurantName || m.name || '').toLowerCase().includes(normalized) ||
    normalized.includes((m.restaurantName || m.name || '').toLowerCase())
  );
  if (match) return match.id;
  for (const [mId, uId] of Object.entries(merchantToUnionMapping)) {
    if (uId.toLowerCase().includes(normalized) || normalized.includes(uId.toLowerCase())) return mId;
  }
  return districtUnion;
}

export function getUnionCodeFromMerchantId(merchantId: string): string {
  const unionMappingCode = merchantToUnionMapping[merchantId] || '';
  const match = unionMappingCode.match(/UNI-([A-Z]+)-/) || unionMappingCode.match(/FED-([A-Z]+)-/);
  return match ? match[1] : 'AAVIN';
}

export function getFinancialYear(date?: Date): string {
  const d = date || new Date();
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(fy).slice(2)}${String(fy + 1).slice(2)}`;
}

export async function generateInvoiceNumber(merchantId: string): Promise<string> {
  const unionCode = getUnionCodeFromMerchantId(merchantId);
  const fyStr = getFinancialYear();
  const result = await db.execute(sql`
    INSERT INTO invoice_sequences (union_code, financial_year, last_sequence, updated_at)
    VALUES (${unionCode}, ${fyStr}, 1, NOW())
    ON CONFLICT (union_code, financial_year)
    DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1, updated_at = NOW()
    RETURNING last_sequence
  `);
  const seq = (result as any).rows?.[0]?.last_sequence || (result as any)[0]?.last_sequence || 1;
  return `${unionCode}/${fyStr}/${String(seq).padStart(5, '0')}`;
}

// ============ DELIVERY JOB HELPERS ============

export function generateDeliveryJobId(): string {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`
    : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`;
  const seq = Date.now().toString().slice(-6);
  return `DJ/${fy}/${seq}`;
}

export function validateDeliveryJob(job: any): { valid: boolean; errors: string[] } {
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

export async function autoCreateDeliveryJob(orderId: string) {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return;
    const existing = await db.select().from(deliveryJobs)
      .where(and(eq(deliveryJobs.sourceType, "order"), eq(deliveryJobs.sourceId, orderId)));
    if (existing.length > 0) return;

    const totalAmount = Number(order.total || 0);
    const segment = (order as any).productSegment || "Products";
    const jobData: any = {
      jobId: generateDeliveryJobId(),
      sourceType: "order",
      sourceId: orderId,
      dispatchType: "REGULAR",
      deliveryType: "regular",
      merchantId: (order as any).merchantId || (order as any).restaurantId || "federation",
      segment,
      customerName: (order as any).customerName || "",
      customerPhone: (order as any).customerPhone || "",
      deliveryAddress: (order as any).deliveryAddress || "",
      deliveryLat: String((order as any).deliveryLat || "0"),
      deliveryLng: String((order as any).deliveryLng || "0"),
      totalAmount: String(totalAmount),
      totalBags: Math.ceil(totalAmount / 500),
      totalWeightKg: String(Math.ceil(totalAmount / 500) * 13),
      temperatureRequired: segment === "Ice Cream",
      ewayBillRequired: totalAmount >= 50000,
      gstInvoiceGenerated: !!(order as any).invoiceNumber,
      paymentConfirmed: !!(order as any).paymentMethod || (order as any).paymentStatus === "paid",
    };
    const validation = validateDeliveryJob(jobData);
    jobData.status = validation.valid ? "ready_for_trip" : "validation_failed";
    jobData.validationErrors = validation.errors.length > 0 ? validation.errors : null;
    await db.insert(deliveryJobs).values(jobData);
  } catch (e: any) {
    console.error(`Failed to auto-create delivery job for order ${orderId}:`, e.message);
  }
}

export async function autoAssignDriverToOrder(order: any) {
  try {
    if (order.assignedDriverId) return;
    const segment = order.productSegment || 'Products';
    const merchantId = order.restaurantId;
    const allIds = getAllIdsForMerchant(merchantId);
    const drivers = await db.select().from(deliveryPartners).where(
      sql`${deliveryPartners.isActive} = true AND ${deliveryPartners.approvalStatus} = 'approved'`
    );
    const segmentDrivers = drivers.filter((d: any) =>
      allIds.includes(d.merchantId) && d.segment.toLowerCase() === segment.toLowerCase()
    );
    if (segmentDrivers.length === 0) {
      const anyMerchantDrivers = drivers.filter((d: any) => allIds.includes(d.merchantId));
      if (anyMerchantDrivers.length === 0) return;
      const onlineDrivers = anyMerchantDrivers.filter((d: any) => d.isOnline);
      const chosen = onlineDrivers.length > 0
        ? onlineDrivers[Math.floor(Math.random() * onlineDrivers.length)]
        : anyMerchantDrivers[Math.floor(Math.random() * anyMerchantDrivers.length)];
      await db.update(ordersTable).set({
        assignedDriverId: chosen.id,
        assignedDriverName: chosen.name,
        assignedAt: new Date(),
      }).where(eq(ordersTable.id, order.id));
      return;
    }
    const onlineSegment = segmentDrivers.filter((d: any) => d.isOnline);
    const chosen = onlineSegment.length > 0
      ? onlineSegment[Math.floor(Math.random() * onlineSegment.length)]
      : segmentDrivers[Math.floor(Math.random() * segmentDrivers.length)];
    await db.update(ordersTable).set({
      assignedDriverId: chosen.id,
      assignedDriverName: chosen.name,
      assignedAt: new Date(),
    }).where(eq(ordersTable.id, order.id));
  } catch (err) {
    console.error('Auto-assign driver error:', err);
  }
}


// ============ REQUEST MERCHANT ID HELPERS ============

import { verifyToken } from "./middleware";
import type { AuthenticatedRequest } from "./middleware";

export function resolveMerchantId(req: AuthenticatedRequest): string | null {
  const user = req.user as any;
  if (!user) return null;
  if (user.isGlobalAdmin) {
    const merchantToken = (req as any).cookies?.merchant_token;
    if (merchantToken) {
      const payload = verifyToken(merchantToken);
      if (payload?.merchantId && payload.merchantId !== 'admin-1') return payload.merchantId;
      if (payload?.id && payload.id !== 'admin-1') return payload.id;
    }
  }
  return user.merchantId || user.restaurantId || user.id || null;
}

export function getEffectiveMerchantId(req: AuthenticatedRequest, clientMerchantId?: string): string {
  const user = req.user as any;
  if (user?.role === 'union_staff' && user?.unionId) {
    return user.unionId;
  }
  return clientMerchantId || user?.merchantId || '';
}

// ============ TRIP ID HELPER ============

function generateTripId(hubName: string, date: string, seq: number): string {
  const hub = hubName.substring(0, 3).toUpperCase();
  const d = date.replace(/-/g, "-");
  return `TRP-${hub}-${d}-${String(seq).padStart(3, "0")}`;
}

export { generateTripId };
