import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql, inArray, count } from "drizzle-orm";
import { encrypt, decrypt, maskKeyId } from "./payment-crypto";
import { logAudit } from "./audit";
import {
  merchantGatewayAccounts,
  paymentOrders,
  paymentTransactions,
  paymentRefunds,
  paymentWebhookLogs,
  merchantSettlementImports,
  merchants as merchantsTable,
} from "@shared/schema";
import crypto from "crypto";
import ExcelJS from "exceljs";

async function payXlsxWriteJson(data: any[], sheetName: string): Promise<{ xlsx: Buffer; csv: string }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    ws.addRow(keys);
    for (const row of data) { ws.addRow(keys.map(k => row[k])); }
  }
  const xlsxBuf = Buffer.from(await wb.xlsx.writeBuffer());
  const csvRows: string[] = [];
  ws.eachRow(row => {
    const vals = (row.values as any[]).slice(1).map(v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    });
    csvRows.push(vals.join(','));
  });
  return { xlsx: xlsxBuf, csv: csvRows.join('\n') };
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

type MiddlewareFn = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;

export function registerPaymentRoutes(
  app: Express,
  requireAuth: MiddlewareFn,
  requireRole: (...roles: string[]) => MiddlewareFn,
  verifyToken?: (token: string) => any | null
) {

  async function resolveRestaurantToMerchantId(rawId: string): Promise<string> {
    if (rawId.startsWith('merchant-')) return rawId;
    const allMerchants = await db.select({ id: merchantsTable.id, restaurantSlug: merchantsTable.restaurantSlug }).from(merchantsTable);
    const slugNorm = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = allMerchants.find(m => {
      const mSlug = (m.restaurantSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return mSlug === slugNorm ||
        slugNorm.includes(mSlug) || mSlug.includes(slugNorm) ||
        rawId.toLowerCase().replace('uni-', 'aavin-').replace(/-0\d$/, '') === (m.restaurantSlug || '').toLowerCase().replace(/-0\d$/, '');
    });
    return match ? match.id : rawId;
  }

  function resolveMerchantId(req: AuthenticatedRequest): string | null {
    if (req.user?.role !== 'admin') {
      return req.user?.merchantId || req.user?.restaurantId || req.user?.id || null;
    }
    const merchantToken = req.cookies?.merchant_token;
    if (merchantToken && verifyToken) {
      const payload = verifyToken(merchantToken);
      if (payload && payload.merchantId) {
        return payload.merchantId;
      }
      if (payload && payload.id && typeof payload.id === 'string' && payload.id.startsWith('merchant-')) {
        return payload.id;
      }
    }
    return req.user?.merchantId || null;
  }

  async function resolveMerchantIdAsync(req: AuthenticatedRequest): Promise<string | null> {
    const rawId = resolveMerchantId(req);
    if (!rawId) return null;
    return resolveRestaurantToMerchantId(rawId);
  }

  app.post("/api/admin/merchant-gateway-accounts", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId, gatewayName, accountMode, keyId, keySecret, webhookSecret, accountName, settlementName, contactName, contactMobile, contactEmail, isActive, autoCapture, refundEnabled } = req.body;
      if (!merchantId || !keyId || !keySecret) {
        return res.status(400).json({ error: "merchantId, keyId, keySecret are required" });
      }
      if (keyId.startsWith('****') || keyId.length < 10) {
        return res.status(400).json({ error: "Invalid Key ID. Please enter the full Razorpay Key ID (e.g., rzp_live_... or rzp_test_...)." });
      }
      const keySecretEncrypted = encrypt(keySecret);
      const webhookSecretEncrypted = webhookSecret ? encrypt(webhookSecret) : null;
      const [account] = await db.insert(merchantGatewayAccounts).values({
        merchantId,
        gatewayName: gatewayName || "razorpay",
        accountMode: accountMode || "live",
        keyId,
        keySecretEncrypted,
        webhookSecretEncrypted,
        accountName: accountName || null,
        settlementName: settlementName || null,
        contactName: contactName || null,
        contactMobile: contactMobile || null,
        contactEmail: contactEmail || null,
        isActive: isActive !== false,
        autoCapture: autoCapture !== false,
        refundEnabled: refundEnabled !== false,
      }).returning();

      await logAudit(req as any, "merchant_gateway_accounts", account.id, "CREATE", {
        changedFields: ["merchantId", "keyId", "gatewayName", "accountMode"],
        newValues: { merchantId, keyId: maskKeyId(keyId), gatewayName: gatewayName || "razorpay", accountMode: accountMode || "live" },
      });

      res.json({
        ...account,
        keyId: maskKeyId(account.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
      });
    } catch (error: any) {
      console.error("Create gateway account error:", error);
      res.status(500).json({ error: "Failed to create gateway account" });
    }
  });

  app.get("/api/admin/merchant-gateway-accounts", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const accounts = await db.select().from(merchantGatewayAccounts).orderBy(desc(merchantGatewayAccounts.createdAt));
      const sanitized = accounts.map(a => ({
        ...a,
        keyId: maskKeyId(a.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!a.webhookSecretEncrypted,
      }));
      res.json(sanitized);
    } catch (error: any) {
      console.error("List gateway accounts error:", error);
      res.status(500).json({ error: "Failed to list gateway accounts" });
    }
  });

  app.get("/api/admin/merchant-gateway-accounts/by-merchant/:merchantId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const accounts = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.merchantId, req.params.merchantId));
      const sanitized = accounts.map(a => ({
        ...a,
        keyId: maskKeyId(a.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!a.webhookSecretEncrypted,
      }));
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch gateway accounts" });
    }
  });

  app.get("/api/admin/merchant-gateway-accounts/account/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const [account] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, req.params.id));
      if (!account) return res.status(404).json({ error: "Account not found" });
      res.json({
        ...account,
        keyId: maskKeyId(account.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!account.webhookSecretEncrypted,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch gateway account" });
    }
  });

  app.put("/api/admin/merchant-gateway-accounts/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { keyId, keySecret, webhookSecret, accountMode, accountName, settlementName, contactName, contactMobile, contactEmail, isActive, autoCapture, refundEnabled } = req.body;
      const [existing] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Account not found" });

      const updateFields: any = { updatedAt: new Date() };
      const changedFields: string[] = [];

      if (keyId && keyId !== existing.keyId) {
        if (keyId.startsWith('****') || keyId.length < 10) {
          return res.status(400).json({ error: "Invalid Key ID. Please enter the full Razorpay Key ID (e.g., rzp_live_... or rzp_test_...)." });
        }
        updateFields.keyId = keyId; changedFields.push("keyId");
      }
      if (keySecret) { updateFields.keySecretEncrypted = encrypt(keySecret); changedFields.push("keySecret"); }
      if (webhookSecret) { updateFields.webhookSecretEncrypted = encrypt(webhookSecret); changedFields.push("webhookSecret"); }
      if (accountMode !== undefined) { updateFields.accountMode = accountMode; changedFields.push("accountMode"); }
      if (accountName !== undefined) { updateFields.accountName = accountName; changedFields.push("accountName"); }
      if (settlementName !== undefined) { updateFields.settlementName = settlementName; changedFields.push("settlementName"); }
      if (contactName !== undefined) { updateFields.contactName = contactName; changedFields.push("contactName"); }
      if (contactMobile !== undefined) { updateFields.contactMobile = contactMobile; changedFields.push("contactMobile"); }
      if (contactEmail !== undefined) { updateFields.contactEmail = contactEmail; changedFields.push("contactEmail"); }
      if (isActive !== undefined) { updateFields.isActive = isActive; changedFields.push("isActive"); }
      if (autoCapture !== undefined) { updateFields.autoCapture = autoCapture; changedFields.push("autoCapture"); }
      if (refundEnabled !== undefined) { updateFields.refundEnabled = refundEnabled; changedFields.push("refundEnabled"); }
      const [updated] = await db.update(merchantGatewayAccounts).set(updateFields).where(eq(merchantGatewayAccounts.id, req.params.id)).returning();

      await logAudit(req as any, "merchant_gateway_accounts", req.params.id, "UPDATE", {
        changedFields,
        previousValues: { isActive: existing.isActive, accountMode: existing.accountMode },
        newValues: { isActive: updated.isActive, accountMode: updated.accountMode },
      });

      res.json({
        ...updated,
        keyId: maskKeyId(updated.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!updated.webhookSecretEncrypted,
      });
    } catch (error: any) {
      console.error("Update gateway account error:", error);
      res.status(500).json({ error: "Failed to update gateway account" });
    }
  });

  app.delete("/api/admin/merchant-gateway-accounts/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const [existing] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Account not found" });

      const [updated] = await db.update(merchantGatewayAccounts).set({ isActive: false, updatedAt: new Date() }).where(eq(merchantGatewayAccounts.id, req.params.id)).returning();

      await logAudit(req as any, "merchant_gateway_accounts", req.params.id, "UPDATE", {
        changedFields: ["isActive"],
        previousValues: { isActive: existing.isActive },
        newValues: { isActive: false },
      });

      res.json({ success: true, message: "Gateway account deactivated" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to deactivate gateway account" });
    }
  });

  app.get("/api/merchant/my-gateway-account", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });
      const accounts = await db.select().from(merchantGatewayAccounts).where(and(eq(merchantGatewayAccounts.merchantId, merchantId), eq(merchantGatewayAccounts.isActive, true)));
      const sanitized = accounts.map(a => ({
        ...a,
        keyId: maskKeyId(a.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!a.webhookSecretEncrypted,
      }));
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch gateway account" });
    }
  });

  async function getGatewayForMerchant(merchantId: string) {
    const [account] = await db.select().from(merchantGatewayAccounts).where(and(eq(merchantGatewayAccounts.merchantId, merchantId), eq(merchantGatewayAccounts.isActive, true))).limit(1);
    return account || null;
  }

  function generateInternalOrderNo(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `PAY-${ts}-${rand}`;
  }

  app.post("/api/payments/create-order", requireAuth, requireRole('admin', 'merchant', 'customer', 'dealer', 'wholesale_dealer', 'dealer___agent', 'union_parlour', 'driver'), async (req: AuthenticatedRequest, res) => {
    try {
      const { orderId, amount, merchantId: reqMerchantId, routeId, segment, businessType, customerId, checkoutSource, paymentFor, cartSnapshot } = req.body;
      if (!orderId || !amount) return res.status(400).json({ error: "orderId and amount are required" });

      const rawMerchantId = reqMerchantId || req.user?.merchantId || "platform";
      const merchantId = rawMerchantId !== "platform" ? await resolveRestaurantToMerchantId(rawMerchantId) : rawMerchantId;
      const amountPaise = Math.round(parseFloat(amount) * 100);
      const internalOrderNo = generateInternalOrderNo();

      const gateway = await getGatewayForMerchant(merchantId);
      let rzpKeyId: string = "";
      let rzpKeySecret: string = "";
      let accountSource: string = "platform";
      let gatewayAccountId: string | null = null;

      let useMerchantGateway = false;
      if (gateway && gateway.keyId && !gateway.keyId.startsWith('****') && gateway.keyId.length >= 10 && gateway.keySecretEncrypted) {
        try {
          rzpKeySecret = decrypt(gateway.keySecretEncrypted);
          rzpKeyId = gateway.keyId;
          accountSource = "merchant";
          gatewayAccountId = gateway.id;
          useMerchantGateway = true;
        } catch (decryptErr: any) {
          console.warn(`[Payment] Failed to decrypt merchant ${merchantId} gateway credentials, falling back to platform keys:`, decryptErr.message);
        }
      }

      if (!useMerchantGateway) {
        const platformKeyId = process.env.RAZORPAY_KEY_ID;
        const platformKeySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!platformKeyId || !platformKeySecret) {
          console.error(`[Payment] No valid gateway for merchant ${merchantId} and no platform Razorpay keys configured`);
          return res.status(400).json({ error: "Payment gateway not configured. Please contact support." });
        }
        console.warn(`[Payment] Using platform Razorpay keys for merchant ${merchantId} (merchant gateway not available)`);
        rzpKeyId = platformKeyId;
        rzpKeySecret = platformKeySecret;
        accountSource = "platform";
      }

      const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString("base64");
      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: internalOrderNo,
          notes: { orderId, merchantId, internalOrderNo },
        }),
      });

      if (!rzpResponse.ok) {
        const errBody = await rzpResponse.text();
        console.error("Razorpay create order error:", errBody);
        return res.status(502).json({ error: "Failed to create payment order with gateway" });
      }

      const rzpOrder = await rzpResponse.json() as any;

      const [paymentOrder] = await db.insert(paymentOrders).values({
        orderId,
        merchantId,
        routeId: routeId || null,
        segment: segment || null,
        businessType: businessType || null,
        customerId: customerId || req.user?.id || null,
        gatewayAccountId,
        gatewayName: "razorpay",
        internalOrderNo,
        gatewayOrderId: rzpOrder.id,
        currency: "INR",
        amount: amount.toString(),
        amountPaid: "0",
        amountDue: amount.toString(),
        status: "created",
        checkoutSource: checkoutSource || "web",
        paymentFor: paymentFor || null,
        accountSource,
        receipt: internalOrderNo,
        notes: { orderId, merchantId, ...(cartSnapshot ? { cartSnapshot } : {}) },
      }).returning();

      res.json({
        paymentOrderId: paymentOrder.id,
        gatewayOrderId: rzpOrder.id,
        keyId: rzpKeyId,
        amount: amountPaise,
        currency: "INR",
        internalOrderNo,
        accountSource,
        merchantName: gateway?.accountName || "Aavin",
      });
    } catch (error: any) {
      console.error("Create payment order error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  app.post("/api/payments/verify", requireAuth, requireRole('admin', 'merchant', 'customer', 'dealer', 'wholesale_dealer', 'dealer___agent', 'union_parlour', 'driver'), async (req: AuthenticatedRequest, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment verification parameters" });
      }

      const existingTxn = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayPaymentId, razorpay_payment_id));
      if (existingTxn.length > 0) {
        return res.json({ success: true, message: "Payment already verified", transactionId: existingTxn[0].id, duplicate: true });
      }

      const [paymentOrder] = await db.select().from(paymentOrders).where(eq(paymentOrders.gatewayOrderId, razorpay_order_id));
      if (!paymentOrder) return res.status(404).json({ error: "Payment order not found" });

      let keySecret: string;
      if (paymentOrder.gatewayAccountId) {
        const [gateway] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, paymentOrder.gatewayAccountId));
        if (!gateway) return res.status(500).json({ error: "Gateway account not found" });
        try {
          keySecret = decrypt(gateway.keySecretEncrypted);
        } catch (decryptErr: any) {
          console.error(`[Payment] Failed to decrypt gateway credentials for verification:`, decryptErr.message);
          return res.status(400).json({ error: "Payment gateway credentials need to be re-entered. Please update your Razorpay Key Secret in Payment Settings." });
        }
      } else {
        keySecret = process.env.RAZORPAY_KEY_SECRET || "";
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
      if (expectedSignature !== razorpay_signature) {
        await db.update(paymentOrders).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentOrders.id, paymentOrder.id));
        return res.status(400).json({ error: "Payment verification failed: invalid signature" });
      }

      const [transaction] = await db.insert(paymentTransactions).values({
        paymentOrderId: paymentOrder.id,
        orderId: paymentOrder.orderId,
        merchantId: paymentOrder.merchantId,
        routeId: paymentOrder.routeId,
        segment: paymentOrder.segment,
        businessType: paymentOrder.businessType,
        gatewayName: "razorpay",
        gatewayPaymentId: razorpay_payment_id,
        gatewayOrderId: razorpay_order_id,
        amount: paymentOrder.amount,
        status: "captured",
        captured: true,
        capturedAt: new Date(),
        rawResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      }).returning();

      await db.update(paymentOrders).set({
        status: "captured",
        amountPaid: paymentOrder.amount,
        amountDue: "0",
        updatedAt: new Date(),
      }).where(eq(paymentOrders.id, paymentOrder.id));

      res.json({ success: true, transactionId: transaction.id, paymentOrderId: paymentOrder.id });
    } catch (error: any) {
      console.error("Payment verify error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  const refundInProgress = new Set<string>();

  app.post("/api/payments/refund", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const { paymentTransactionId, amount, reason, idempotencyKey } = req.body;
      if (!paymentTransactionId || !amount) return res.status(400).json({ error: "paymentTransactionId and amount required" });

      const refundKey = idempotencyKey || `${paymentTransactionId}:${amount}`;
      if (refundInProgress.has(refundKey)) {
        return res.status(409).json({ error: "Refund already in progress for this transaction and amount" });
      }
      refundInProgress.add(refundKey);

      try {
      const [txn] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, paymentTransactionId));
      if (!txn) { refundInProgress.delete(refundKey); return res.status(404).json({ error: "Transaction not found" }); }

      if (req.user?.role === 'merchant') {
        const resolvedMerchantId = await resolveMerchantIdAsync(req);
        if (txn.merchantId !== resolvedMerchantId) {
          refundInProgress.delete(refundKey);
          return res.status(403).json({ error: "Not authorized to refund this transaction" });
        }
      }

      const existingRefunds = await db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentTransactionId, paymentTransactionId));
      const pendingOrProcessedForSameAmount = existingRefunds.find(r => parseFloat(r.amount) === parseFloat(amount) && (r.status === 'pending' || r.status === 'processed'));
      if (pendingOrProcessedForSameAmount) {
        refundInProgress.delete(refundKey);
        return res.json({ success: true, message: "Refund already exists for this amount", refundId: pendingOrProcessedForSameAmount.id, duplicate: true });
      }
      const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const paidAmount = parseFloat(txn.amount);
      const refundAmount = parseFloat(amount);

      if (totalRefunded + refundAmount > paidAmount) {
        return res.status(400).json({ error: `Refund exceeds paid amount. Max refundable: ${(paidAmount - totalRefunded).toFixed(2)}` });
      }

      let keySecret: string;
      let keyId: string;
      const [paymentOrder] = await db.select().from(paymentOrders).where(eq(paymentOrders.id, txn.paymentOrderId));
      if (paymentOrder?.gatewayAccountId) {
        const [gateway] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, paymentOrder.gatewayAccountId));
        if (!gateway) return res.status(500).json({ error: "Gateway account not found" });
        if (!gateway.refundEnabled) return res.status(400).json({ error: "Refunds are disabled for this gateway account" });
        keyId = gateway.keyId;
        try {
          keySecret = decrypt(gateway.keySecretEncrypted);
        } catch (decryptErr: any) {
          console.error(`[Payment] Failed to decrypt gateway credentials for refund:`, decryptErr.message);
          return res.status(400).json({ error: "Payment gateway credentials need to be re-entered. Please update your Razorpay Key Secret in Payment Settings." });
        }
      } else {
        keyId = process.env.RAZORPAY_KEY_ID || "";
        keySecret = process.env.RAZORPAY_KEY_SECRET || "";
      }

      const amountPaise = Math.round(refundAmount * 100);
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${txn.gatewayPaymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({ amount: amountPaise, notes: { reason: reason || "Refund requested" } }),
      });

      if (!rzpResponse.ok) {
        const errBody = await rzpResponse.text();
        console.error("Razorpay refund error:", errBody);
        return res.status(502).json({ error: "Refund failed at gateway" });
      }

      const rzpRefund = await rzpResponse.json() as any;

      const existingRefund = await db.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, rzpRefund.id));
      if (existingRefund.length > 0) {
        return res.json({ success: true, message: "Refund already processed", refundId: existingRefund[0].id, duplicate: true });
      }

      const [refund] = await db.insert(paymentRefunds).values({
        paymentTransactionId,
        orderId: txn.orderId,
        merchantId: txn.merchantId,
        gatewayRefundId: rzpRefund.id,
        refundReference: rzpRefund.id,
        amount: refundAmount.toString(),
        status: rzpRefund.status === "processed" ? "processed" : "pending",
        reason: reason || null,
        refundedAt: rzpRefund.status === "processed" ? new Date() : null,
      }).returning();

      const newTotalRefunded = totalRefunded + refundAmount;
      const orderStatus = newTotalRefunded >= paidAmount ? "refunded" : "partial_refund";
      if (paymentOrder) {
        await db.update(paymentOrders).set({ status: orderStatus, updatedAt: new Date() }).where(eq(paymentOrders.id, paymentOrder.id));
      }

      refundInProgress.delete(refundKey);
      res.json({ success: true, refundId: refund.id, status: refund.status, gatewayRefundId: rzpRefund.id });
      } catch (innerError: any) {
        refundInProgress.delete(refundKey);
        throw innerError;
      }
    } catch (error: any) {
      console.error("Refund error:", error);
      res.status(500).json({ error: "Refund processing failed" });
    }
  });

  app.put("/api/merchant/gateway-account", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const [existing] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.merchantId, merchantId));
      if (!existing) return res.status(404).json({ error: "No gateway account found" });

      const { keyId, keySecret, webhookSecret, accountName, contactEmail, contactMobile } = req.body;
      const updateFields: any = { updatedAt: new Date() };
      const changedFields: string[] = [];

      if (keyId) {
        if (keyId.startsWith('****') || keyId.length < 10) {
          return res.status(400).json({ error: "Invalid Key ID. Please enter the full Razorpay Key ID (e.g., rzp_live_... or rzp_test_...)." });
        }
        updateFields.keyId = keyId; changedFields.push("keyId");
      }
      if (keySecret) { updateFields.keySecretEncrypted = encrypt(keySecret); changedFields.push("keySecret"); }
      if (webhookSecret) { updateFields.webhookSecretEncrypted = encrypt(webhookSecret); changedFields.push("webhookSecret"); }
      if (accountName !== undefined) { updateFields.accountName = accountName; changedFields.push("accountName"); }
      if (contactEmail !== undefined) { updateFields.contactEmail = contactEmail; changedFields.push("contactEmail"); }
      if (contactMobile !== undefined) { updateFields.contactMobile = contactMobile; changedFields.push("contactMobile"); }

      const [updated] = await db.update(merchantGatewayAccounts).set(updateFields).where(eq(merchantGatewayAccounts.id, existing.id)).returning();

      await logAudit(req as any, "merchant_gateway_accounts", existing.id, "UPDATE", {
        changedFields,
        newValues: { keyId: keyId ? maskKeyId(keyId) : undefined },
      });

      res.json({
        ...updated,
        keyId: maskKeyId(updated.keyId),
        keySecretEncrypted: undefined,
        webhookSecretEncrypted: undefined,
        hasWebhookSecret: !!updated.webhookSecretEncrypted,
      });
    } catch (error: any) {
      console.error("Merchant update gateway error:", error);
      res.status(500).json({ error: "Failed to update gateway account" });
    }
  });

  app.get("/api/merchant/payment-reports/:reportType", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = (req.user?.role === 'admin' && req.query.merchantId) ? await resolveRestaurantToMerchantId(req.query.merchantId as string) : await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const { reportType } = req.params;
      const { startDate, endDate } = req.query as any;
      const buildDateFilter = (col: any) => {
        const filters: any[] = [];
        if (startDate) filters.push(gte(col, new Date(startDate)));
        if (endDate) filters.push(lte(col, new Date(endDate + "T23:59:59.999Z")));
        return filters;
      };

      switch (reportType) {
        case "refund-register": {
          const refunds = await db.select().from(paymentRefunds).where(and(
            eq(paymentRefunds.merchantId, merchantId),
            ...buildDateFilter(paymentRefunds.createdAt),
          )).orderBy(desc(paymentRefunds.createdAt));
          return res.json(refunds);
        }
        case "payment-method-summary": {
          const txns = await db.select().from(paymentTransactions).where(and(
            eq(paymentTransactions.merchantId, merchantId),
            ...buildDateFilter(paymentTransactions.createdAt),
          ));
          const methodMap = new Map<string, { method: string; count: number; amount: number; fee: number }>();
          for (const t of txns) {
            const method = t.paymentMethod || "unknown";
            if (!methodMap.has(method)) methodMap.set(method, { method, count: 0, amount: 0, fee: 0 });
            const m = methodMap.get(method)!;
            m.count++;
            m.amount += parseFloat(t.amount);
            m.fee += parseFloat(t.fee || "0");
          }
          return res.json(Array.from(methodMap.values()));
        }
        case "gateway-fee-summary": {
          const txns = await db.select().from(paymentTransactions).where(and(
            eq(paymentTransactions.merchantId, merchantId),
            ...buildDateFilter(paymentTransactions.createdAt),
          ));
          let gross = 0, fee = 0, tax = 0, net = 0;
          for (const t of txns) {
            gross += parseFloat(t.amount);
            fee += parseFloat(t.fee || "0");
            tax += parseFloat(t.tax || "0");
            net += parseFloat(t.netAmount || t.amount);
          }
          return res.json({ gross, fee, tax, net });
        }
        case "settlement-reconciliation": {
          const imports = await db.select().from(merchantSettlementImports).where(and(
            eq(merchantSettlementImports.merchantId, merchantId),
            ...buildDateFilter(merchantSettlementImports.createdAt),
          )).orderBy(desc(merchantSettlementImports.createdAt));
          return res.json(imports);
        }
        default:
          return res.status(400).json({ error: "Unknown report type" });
      }
    } catch (error: any) {
      console.error("Merchant report error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/merchant/payment-reports/:reportType/export", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = (req.user?.role === 'admin' && req.query.merchantId) ? await resolveRestaurantToMerchantId(req.query.merchantId as string) : await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const reportRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/merchant/payment-reports/${req.params.reportType}?${new URLSearchParams(req.query as any).toString()}`, {
        headers: { cookie: req.headers.cookie || "" },
      });
      const data = await reportRes.json();
      if (!Array.isArray(data) && typeof data !== 'object') return res.status(400).json({ error: "No data to export" });

      const exportData = Array.isArray(data) ? data : [data];
      const format = (req.query.format as string) || "csv";
      const { xlsx: xlsxBuf, csv: csvContent } = await payXlsxWriteJson(exportData, req.params.reportType);

      if (format === "xlsx") {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${req.params.reportType}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
        return res.send(xlsxBuf);
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.reportType}-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csvContent);
    } catch (error: any) {
      console.error("Merchant report export error:", error);
      res.status(500).json({ error: "Failed to export report" });
    }
  });

  app.post("/api/webhooks/razorpay/:merchantId", async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.params;
      const signature = req.headers["x-razorpay-signature"] as string;
      const payload = req.body;

      const eventType = payload?.event;
      const eventId = payload?.payload?.payment?.entity?.id || payload?.payload?.refund?.entity?.id || crypto.randomUUID();

      const [webhookLog] = await db.insert(paymentWebhookLogs).values({
        merchantId,
        gatewayName: "razorpay",
        eventType: eventType || "unknown",
        eventId,
        signature: signature || null,
        payload,
        isVerified: false,
        processingStatus: "pending",
      }).returning();

      const [gateway] = await db.select().from(merchantGatewayAccounts).where(and(eq(merchantGatewayAccounts.merchantId, merchantId), eq(merchantGatewayAccounts.isActive, true)));

      if (!gateway) {
        await db.update(paymentWebhookLogs).set({ processingStatus: "failed", errorMessage: "No active gateway for merchant", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
        return res.status(200).json({ status: "ok" });
      }

      if (gateway.webhookSecretEncrypted && signature) {
        let webhookSecret: string;
        try {
          webhookSecret = decrypt(gateway.webhookSecretEncrypted);
        } catch (decryptErr: any) {
          console.error(`[Payment] Failed to decrypt webhook secret for merchant ${merchantId}:`, decryptErr.message);
          await db.update(paymentWebhookLogs).set({ processingStatus: "failed", errorMessage: "Webhook secret decryption failed - credentials need re-entry", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
          return res.status(200).json({ status: "ok" });
        }
        const body = JSON.stringify(payload);
        const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
        if (expectedSignature !== signature) {
          await db.update(paymentWebhookLogs).set({ processingStatus: "failed", errorMessage: "Invalid signature", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
          return res.status(200).json({ status: "ok" });
        }
        await db.update(paymentWebhookLogs).set({ isVerified: true, gatewayAccountId: gateway.id }).where(eq(paymentWebhookLogs.id, webhookLog.id));
      }

      const existingWebhook = await db.select().from(paymentWebhookLogs).where(and(eq(paymentWebhookLogs.eventId, eventId), eq(paymentWebhookLogs.processingStatus, "processed")));
      if (existingWebhook.length > 0) {
        await db.update(paymentWebhookLogs).set({ processingStatus: "duplicate", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
        return res.status(200).json({ status: "ok" });
      }

      if (eventType === "payment.captured") {
        const paymentEntity = payload?.payload?.payment?.entity;
        if (paymentEntity?.order_id) {
          const existingTxn = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayPaymentId, paymentEntity.id));
          if (existingTxn.length === 0) {
            const [po] = await db.select().from(paymentOrders).where(eq(paymentOrders.gatewayOrderId, paymentEntity.order_id));
            if (po) {
              await db.insert(paymentTransactions).values({
                paymentOrderId: po.id,
                orderId: po.orderId,
                merchantId: po.merchantId,
                routeId: po.routeId,
                segment: po.segment,
                businessType: po.businessType,
                gatewayName: "razorpay",
                gatewayPaymentId: paymentEntity.id,
                gatewayOrderId: paymentEntity.order_id,
                paymentMethod: paymentEntity.method,
                bank: paymentEntity.bank || null,
                wallet: paymentEntity.wallet || null,
                vpa: paymentEntity.vpa || null,
                rrn: paymentEntity.acquirer_data?.rrn || paymentEntity.acquirer_data?.bank_transaction_id || null,
                amount: (paymentEntity.amount / 100).toString(),
                fee: paymentEntity.fee ? (paymentEntity.fee / 100).toString() : "0",
                tax: paymentEntity.tax ? (paymentEntity.tax / 100).toString() : "0",
                netAmount: paymentEntity.fee ? ((paymentEntity.amount - paymentEntity.fee) / 100).toString() : null,
                status: "captured",
                captured: true,
                capturedAt: new Date(),
                rawResponse: paymentEntity,
              });
              await db.update(paymentOrders).set({
                status: "captured",
                amountPaid: (paymentEntity.amount / 100).toString(),
                amountDue: "0",
                updatedAt: new Date(),
              }).where(eq(paymentOrders.id, po.id));
            }
          }
        }
      } else if (eventType === "payment.failed") {
        const paymentEntity = payload?.payload?.payment?.entity;
        if (paymentEntity?.order_id) {
          const [po] = await db.select().from(paymentOrders).where(eq(paymentOrders.gatewayOrderId, paymentEntity.order_id));
          if (po && po.status === "created") {
            await db.update(paymentOrders).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentOrders.id, po.id));
          }
        }
      } else if (eventType === "refund.processed") {
        const refundEntity = payload?.payload?.refund?.entity;
        if (refundEntity?.id) {
          const existing = await db.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, refundEntity.id));
          if (existing.length > 0) {
            await db.update(paymentRefunds).set({ status: "processed", refundedAt: new Date() }).where(eq(paymentRefunds.gatewayRefundId, refundEntity.id));
          }
        }
      } else {
        await db.update(paymentWebhookLogs).set({ processingStatus: "ignored", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
        return res.status(200).json({ status: "ok" });
      }

      await db.update(paymentWebhookLogs).set({ processingStatus: "processed", processedAt: new Date() }).where(eq(paymentWebhookLogs.id, webhookLog.id));
      res.status(200).json({ status: "ok" });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(200).json({ status: "ok" });
    }
  });

  app.get("/api/admin/payment-reports/:reportType", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { reportType } = req.params;
      const { startDate, endDate, merchantId, paymentMethod, status, segment, businessType, routeId, gatewayMode } = req.query as any;

      const buildDateFilter = (col: any) => {
        const filters: any[] = [];
        if (startDate) filters.push(gte(col, new Date(startDate)));
        if (endDate) filters.push(lte(col, new Date(endDate + "T23:59:59.999Z")));
        return filters;
      };

      switch (reportType) {
        case "merchant-collection": {
          const transactions = await db.select().from(paymentTransactions).where(and(
            ...buildDateFilter(paymentTransactions.createdAt),
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
            segment ? eq(paymentTransactions.segment, segment) : undefined,
          ));
          const grouped = new Map<string, any>();
          for (const t of transactions) {
            const key = t.merchantId;
            if (!grouped.has(key)) grouped.set(key, { merchantId: key, orderCount: 0, gross: 0, fee: 0, tax: 0, net: 0, successCount: 0, failedCount: 0, refundCount: 0 });
            const g = grouped.get(key)!;
            g.orderCount++;
            g.gross += parseFloat(t.amount);
            g.fee += parseFloat(t.fee || "0");
            g.tax += parseFloat(t.tax || "0");
            g.net += parseFloat(t.netAmount || t.amount);
            if (t.status === "captured") g.successCount++;
            else if (t.status === "failed") g.failedCount++;
            else if (t.status === "refunded") g.refundCount++;
          }
          return res.json(Array.from(grouped.values()));
        }
        case "failed-transactions": {
          const failed = await db.select().from(paymentTransactions).where(and(
            eq(paymentTransactions.status, "failed"),
            ...buildDateFilter(paymentTransactions.createdAt),
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
          ));
          return res.json(failed);
        }
        case "refund-register": {
          const refunds = await db.select().from(paymentRefunds).where(and(
            ...buildDateFilter(paymentRefunds.createdAt),
            merchantId ? eq(paymentRefunds.merchantId, merchantId) : undefined,
          ));
          return res.json(refunds);
        }
        case "payment-method-summary": {
          const txns = await db.select().from(paymentTransactions).where(and(
            ...buildDateFilter(paymentTransactions.createdAt),
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
            status ? eq(paymentTransactions.status, status) : undefined,
          ));
          const methodMap = new Map<string, { method: string; count: number; amount: number; fee: number }>();
          for (const t of txns) {
            const method = t.paymentMethod || "unknown";
            if (!methodMap.has(method)) methodMap.set(method, { method, count: 0, amount: 0, fee: 0 });
            const m = methodMap.get(method)!;
            m.count++;
            m.amount += parseFloat(t.amount);
            m.fee += parseFloat(t.fee || "0");
          }
          return res.json(Array.from(methodMap.values()));
        }
        case "gateway-fee-summary": {
          const txns = await db.select().from(paymentTransactions).where(and(
            ...buildDateFilter(paymentTransactions.createdAt),
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
          ));
          const feeMap = new Map<string, { merchantId: string; gross: number; fee: number; tax: number; net: number }>();
          for (const t of txns) {
            const key = t.merchantId;
            if (!feeMap.has(key)) feeMap.set(key, { merchantId: key, gross: 0, fee: 0, tax: 0, net: 0 });
            const f = feeMap.get(key)!;
            f.gross += parseFloat(t.amount);
            f.fee += parseFloat(t.fee || "0");
            f.tax += parseFloat(t.tax || "0");
            f.net += parseFloat(t.netAmount || t.amount);
          }
          return res.json(Array.from(feeMap.values()));
        }
        case "union-summary": {
          const txns = await db.select().from(paymentTransactions).where(and(
            ...buildDateFilter(paymentTransactions.createdAt),
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
          ));
          const refunds = await db.select().from(paymentRefunds).where(and(...buildDateFilter(paymentRefunds.createdAt)));
          const merchantMap = new Map<string, { merchantId: string; totalCollection: number; refunds: number; fees: number; net: number }>();
          for (const t of txns) {
            const mid = t.merchantId;
            if (!merchantMap.has(mid)) merchantMap.set(mid, { merchantId: mid, totalCollection: 0, refunds: 0, fees: 0, net: 0 });
            const u = merchantMap.get(mid)!;
            u.totalCollection += parseFloat(t.amount);
            u.fees += parseFloat(t.fee || "0");
            u.net += parseFloat(t.netAmount || t.amount);
          }
          for (const r of refunds) {
            const mid = r.merchantId;
            if (merchantMap.has(mid)) merchantMap.get(mid)!.refunds += parseFloat(r.amount);
          }
          return res.json(Array.from(merchantMap.values()));
        }
        case "settlement-reconciliation": {
          const imports = await db.select().from(merchantSettlementImports).where(and(
            ...buildDateFilter(merchantSettlementImports.createdAt),
            merchantId ? eq(merchantSettlementImports.merchantId, merchantId) : undefined,
          )).orderBy(desc(merchantSettlementImports.createdAt));
          return res.json(imports);
        }
        case "route-collection": {
          const txns = await db.select().from(paymentTransactions).where(and(
            ...buildDateFilter(paymentTransactions.createdAt),
            routeId ? eq(paymentTransactions.routeId, routeId) : undefined,
            merchantId ? eq(paymentTransactions.merchantId, merchantId) : undefined,
          ));
          const routeMap = new Map<string, { routeId: string; merchantCount: number; orders: number; collection: number; merchants: Set<string> }>();
          for (const t of txns) {
            const rid = t.routeId || "no-route";
            if (!routeMap.has(rid)) routeMap.set(rid, { routeId: rid, merchantCount: 0, orders: 0, collection: 0, merchants: new Set() });
            const r = routeMap.get(rid)!;
            r.merchants.add(t.merchantId);
            r.orders++;
            r.collection += parseFloat(t.amount);
          }
          return res.json(Array.from(routeMap.values()).map(r => ({ ...r, merchantCount: r.merchants.size, merchants: undefined })));
        }
        default:
          return res.status(400).json({ error: "Unknown report type" });
      }
    } catch (error: any) {
      console.error("Payment report error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/admin/payment-reports/:reportType/export", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { reportType } = req.params;
      const format = (req.query.format as string) || "csv";

      const fakeRes = {
        statusCode: 200,
        data: null as any,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { this.data = data; return this; },
      };
      req.params.reportType = reportType;
      const handler = app._router.stack.find((layer: any) => layer.route?.path === "/api/admin/payment-reports/:reportType");

      const reportRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/admin/payment-reports/${reportType}?${new URLSearchParams(req.query as any).toString()}`, {
        headers: { cookie: req.headers.cookie || "" },
      });
      const data = await reportRes.json();

      if (!Array.isArray(data)) return res.status(400).json({ error: "No data to export" });

      const { xlsx: xlsxBuf2, csv: csvContent2 } = await payXlsxWriteJson(data, reportType);

      if (format === "xlsx") {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
        return res.send(xlsxBuf2);
      } else {
        const csvContent = csvContent2;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${reportType}-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csvContent);
      }
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export report" });
    }
  });

  app.get("/api/admin/payment-dashboard-stats", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const activeAccounts = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.isActive, true));
      const liveAccounts = activeAccounts.filter(a => a.accountMode === "live");
      const merchantsWithPayment = new Set(activeAccounts.map(a => a.merchantId));

      const todayTxns = await db.select().from(paymentTransactions).where(and(gte(paymentTransactions.createdAt, today), eq(paymentTransactions.status, "captured")));
      const todayCollection = todayTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const monthTxns = await db.select().from(paymentTransactions).where(and(gte(paymentTransactions.createdAt, monthStart), eq(paymentTransactions.status, "captured")));
      const monthCollection = monthTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthFees = monthTxns.reduce((sum, t) => sum + parseFloat(t.fee || "0"), 0);

      const pendingOrders = await db.select().from(paymentOrders).where(eq(paymentOrders.status, "created"));
      const pendingSettlement = pendingOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);

      const todayFailed = await db.select().from(paymentTransactions).where(and(gte(paymentTransactions.createdAt, today), eq(paymentTransactions.status, "failed")));

      const todayRefunds = await db.select().from(paymentRefunds).where(gte(paymentRefunds.createdAt, today));
      const todayRefundAmount = todayRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      res.json({
        totalMerchantsWithPayment: merchantsWithPayment.size,
        activeLiveAccounts: liveAccounts.length,
        todayCollection,
        monthCollection,
        pendingSettlement,
        failedTransactionsToday: todayFailed.length,
        refundAmountToday: todayRefundAmount,
        gatewayFeesThisMonth: monthFees,
      });
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/merchant/payment-summary", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = (req.user?.role === 'admin' && req.query.merchantId) ? await resolveRestaurantToMerchantId(req.query.merchantId as string) : await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayTxns = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.merchantId, merchantId), gte(paymentTransactions.createdAt, today), eq(paymentTransactions.status, "captured")));
      const todayPaid = todayTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const monthTxns = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.merchantId, merchantId), gte(paymentTransactions.createdAt, monthStart), eq(paymentTransactions.status, "captured")));
      const monthPaid = monthTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const allCaptured = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.merchantId, merchantId), eq(paymentTransactions.status, "captured")));
      const totalPaid = allCaptured.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const allRefunds = await db.select().from(paymentRefunds).where(eq(paymentRefunds.merchantId, merchantId));
      const totalRefunded = allRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const failedTxns = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.merchantId, merchantId), eq(paymentTransactions.status, "failed")));

      const allTxns = await db.select().from(paymentTransactions).where(eq(paymentTransactions.merchantId, merchantId));
      const successRate = allTxns.length > 0 ? ((allCaptured.length / allTxns.length) * 100).toFixed(1) : "0";

      res.json({
        todayPaid,
        monthPaid,
        totalSettled: totalPaid - totalRefunded,
        pendingSettlement: 0,
        failedPayments: failedTxns.length,
        refundAmount: totalRefunded,
        avgSuccessRate: parseFloat(successRate),
      });
    } catch (error: any) {
      console.error("Merchant payment summary error:", error);
      res.status(500).json({ error: "Failed to fetch payment summary" });
    }
  });

  app.get("/api/merchant/payment-transactions", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = (req.user?.role === 'admin' && req.query.merchantId) ? await resolveRestaurantToMerchantId(req.query.merchantId as string) : await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const { startDate, endDate, status, paymentMethod, segment } = req.query as any;
      const filters: any[] = [eq(paymentTransactions.merchantId, merchantId)];
      if (startDate) filters.push(gte(paymentTransactions.createdAt, new Date(startDate)));
      if (endDate) filters.push(lte(paymentTransactions.createdAt, new Date(endDate + "T23:59:59.999Z")));
      if (status) filters.push(eq(paymentTransactions.status, status));
      if (paymentMethod) filters.push(eq(paymentTransactions.paymentMethod, paymentMethod));
      if (segment) filters.push(eq(paymentTransactions.segment, segment));

      const txns = await db.select().from(paymentTransactions).where(and(...filters)).orderBy(desc(paymentTransactions.createdAt)).limit(500);
      res.json(txns);
    } catch (error: any) {
      console.error("Merchant transactions error:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/merchant/payment-transactions/export", requireAuth, requireRole('merchant', 'admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = (req.user?.role === 'admin' && req.query.merchantId) ? await resolveRestaurantToMerchantId(req.query.merchantId as string) : await resolveMerchantIdAsync(req);
      if (!merchantId) return res.status(400).json({ error: "Merchant ID not found" });

      const txns = await db.select().from(paymentTransactions).where(eq(paymentTransactions.merchantId, merchantId)).orderBy(desc(paymentTransactions.createdAt));
      const exportData = txns.map(t => ({
        "Transaction ID": t.id,
        "Order ID": t.orderId,
        "Gateway Payment ID": t.gatewayPaymentId,
        "Method": t.paymentMethod,
        "Amount": t.amount,
        "Fee": t.fee,
        "Tax": t.tax,
        "Net": t.netAmount,
        "Status": t.status,
        "Date": t.createdAt,
      }));

      const format = (req.query.format as string) || "xlsx";
      const { xlsx: xlsxBuf3, csv: csvContent3 } = await payXlsxWriteJson(exportData, "Transactions");

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="transactions-${merchantId}.csv"`);
        return res.send(csvContent3);
      }

      const buf = xlsxBuf3;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="transactions-${merchantId}.xlsx"`);
      return res.send(buf);
    } catch (error: any) {
      console.error("Transaction export error:", error);
      res.status(500).json({ error: "Failed to export transactions" });
    }
  });

  app.post("/api/admin/settlement-imports/upload", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId, data, fileName, fileType, gatewayName } = req.body;
      if (!merchantId || !data || !Array.isArray(data)) return res.status(400).json({ error: "merchantId and data array required" });

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          if (row.gateway_payment_id) {
            const [txn] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.gatewayPaymentId, row.gateway_payment_id), eq(paymentTransactions.merchantId, merchantId)));
            if (txn) {
              if (row.fee) await db.update(paymentTransactions).set({ fee: row.fee.toString(), tax: (row.tax || "0").toString(), netAmount: (row.net_amount || "0").toString() }).where(eq(paymentTransactions.id, txn.id));
              successCount++;
            } else {
              failedCount++;
              errors.push(`Row ${i + 1}: Transaction ${row.gateway_payment_id} not found`);
            }
          } else {
            failedCount++;
            errors.push(`Row ${i + 1}: Missing gateway_payment_id`);
          }
        } catch (err: any) {
          failedCount++;
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      const [importRecord] = await db.insert(merchantSettlementImports).values({
        merchantId,
        gatewayName: gatewayName || "razorpay",
        settlementDate: new Date().toISOString().slice(0, 10),
        totalAmount: data.reduce((s: number, r: any) => s + (parseFloat(r.amount) || 0), 0).toString(),
        totalFee: data.reduce((s: number, r: any) => s + (parseFloat(r.fee) || 0), 0).toString(),
        totalTax: data.reduce((s: number, r: any) => s + (parseFloat(r.tax) || 0), 0).toString(),
        totalNet: data.reduce((s: number, r: any) => s + (parseFloat(r.net_amount) || 0), 0).toString(),
        status: "settled",
        uploadedBy: req.user?.id || null,
        fileName: fileName || null,
        fileType: fileType || null,
        rowCount: data.length,
        successCount,
        failedCount,
        importStatus: failedCount === 0 ? "completed" : "partial",
        errorSummary: errors.length > 0 ? errors.join("\n") : null,
        rawData: data,
      }).returning();

      res.json({ importId: importRecord.id, rowCount: data.length, successCount, failedCount, errors: errors.slice(0, 20) });
    } catch (error: any) {
      console.error("Settlement import error:", error);
      res.status(500).json({ error: "Failed to import settlement data" });
    }
  });

  app.get("/api/admin/settlement-imports", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.query as any;
      const filters: any[] = [];
      if (merchantId) filters.push(eq(merchantSettlementImports.merchantId, merchantId));
      const imports = await db.select().from(merchantSettlementImports).where(filters.length > 0 ? and(...filters) : undefined).orderBy(desc(merchantSettlementImports.createdAt));
      res.json(imports);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch settlement imports" });
    }
  });

  app.get("/api/admin/settlement-imports/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const [imp] = await db.select().from(merchantSettlementImports).where(eq(merchantSettlementImports.id, req.params.id));
      if (!imp) return res.status(404).json({ error: "Import not found" });
      res.json(imp);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch import details" });
    }
  });

  app.get("/api/admin/payment-health", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const allAccounts = await db.select().from(merchantGatewayAccounts);
      const health = [];

      for (const account of allAccounts) {
        const [lastSuccess] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.merchantId, account.merchantId), eq(paymentTransactions.status, "captured"))).orderBy(desc(paymentTransactions.createdAt)).limit(1);

        const [lastWebhook] = await db.select().from(paymentWebhookLogs).where(eq(paymentWebhookLogs.merchantId, account.merchantId)).orderBy(desc(paymentWebhookLogs.receivedAt)).limit(1);

        const pendingOrders = await db.select().from(paymentOrders).where(and(eq(paymentOrders.merchantId, account.merchantId), eq(paymentOrders.status, "created")));

        const invalidWebhooks = await db.select().from(paymentWebhookLogs).where(and(eq(paymentWebhookLogs.merchantId, account.merchantId), eq(paymentWebhookLogs.processingStatus, "failed")));

        let configStatus: "healthy" | "warning" | "error" = "healthy";
        if (!account.isActive) configStatus = "error";
        else if (invalidWebhooks.length > 5) configStatus = "warning";
        else if (!lastSuccess && pendingOrders.length > 3) configStatus = "warning";

        health.push({
          merchantId: account.merchantId,
          accountName: account.accountName,
          gatewayActive: account.isActive,
          accountMode: account.accountMode,
          lastPaymentSuccess: lastSuccess?.createdAt || null,
          lastWebhookReceived: lastWebhook?.receivedAt || null,
          pendingSettlementCount: pendingOrders.length,
          invalidWebhookCount: invalidWebhooks.length,
          configStatus,
        });
      }

      res.json(health);
    } catch (error: any) {
      console.error("Payment health error:", error);
      res.status(500).json({ error: "Failed to fetch payment health" });
    }
  });

  // Razorpay Webhook — handles payment.captured events to auto-create orders
  // when the browser callback (verify) never reaches the server.
  // NOTE: express.json() in server/index.ts uses a verify callback to capture
  // req.rawBody before parsing, so we use that here for HMAC verification.
  app.post("/api/payments/razorpay/webhook", async (req: Request, res: Response) => {
      try {
        // Use rawBody captured by express.json() verify callback — exact bytes Razorpay signed
        const rawBodyBuf: Buffer | undefined = (req as any).rawBody;
        const signature = req.headers['x-razorpay-signature'] as string;
        const event = req.body; // already parsed by express.json()

        const eventType: string = event?.event || 'unknown';
        const gatewayOrderId: string | undefined = event?.payload?.payment?.entity?.order_id;
        const gatewayPaymentId: string | undefined = event?.payload?.payment?.entity?.id;

        // Find the gateway account to get the webhook secret
        let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
        if (gatewayOrderId) {
          const [po] = await db.select().from(paymentOrders).where(eq(paymentOrders.gatewayOrderId, gatewayOrderId));
          if (po?.gatewayAccountId) {
            const [gw] = await db.select().from(merchantGatewayAccounts).where(eq(merchantGatewayAccounts.id, po.gatewayAccountId));
            if (gw?.webhookSecretEncrypted) {
              try { webhookSecret = decrypt(gw.webhookSecretEncrypted); } catch {}
            }
          }
        }

        // Verify signature using raw body bytes (before any JSON re-serialisation)
        let isVerified = false;
        let sigError: string | null = null;
        if (webhookSecret && rawBodyBuf && signature) {
          const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBodyBuf).digest('hex');
          if (expectedSig === signature) {
            isVerified = true;
          } else {
            sigError = "Signature mismatch";
            console.warn("[Webhook] Invalid Razorpay signature for", gatewayPaymentId);
          }
        } else if (!webhookSecret) {
          console.warn("[Webhook] No webhook secret configured — skipping signature verification");
        }

        // ALWAYS log first — even invalid/unverified webhooks
        let webhookLogId: string | null = null;
        try {
          const [wl] = await db.insert(paymentWebhookLogs).values({
            gatewayName: 'razorpay',
            eventType,
            eventId: gatewayPaymentId || event?.id || null,
            signature: signature || null,
            payload: event,
            isVerified,
            processingStatus: sigError ? 'failed' : 'pending',
            errorMessage: sigError || null,
          }).returning();
          webhookLogId = wl?.id || null;
        } catch (logErr) {
          console.warn("[Webhook] Could not log webhook event:", logErr);
        }

        // Reject only if signature verification fails and we have a secret configured
        if (sigError && webhookSecret) {
          return res.json({ received: true, processed: false, reason: "Invalid signature" });
        }

        // Only process payment.captured events
        if (eventType !== 'payment.captured') {
          return res.json({ received: true, processed: false, reason: `Event ${eventType} not handled` });
        }

        if (!gatewayOrderId || !gatewayPaymentId) {
          return res.status(400).json({ error: "Missing order_id or payment_id in event payload" });
        }

        // Idempotency check — skip if already processed
        const existing = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId));
        if (existing.length > 0) {
          console.log(`[Webhook] Payment ${gatewayPaymentId} already processed — skipping`);
          if (webhookLogId) {
            await db.update(paymentWebhookLogs)
              .set({ processingStatus: 'skipped', processedAt: new Date(), errorMessage: 'Payment already processed via verify endpoint' })
              .where(eq(paymentWebhookLogs.id, webhookLogId));
          }
          return res.json({ received: true, processed: false, reason: "Already processed" });
        }

        // Find the payment order
        const [paymentOrder] = await db.select().from(paymentOrders).where(eq(paymentOrders.gatewayOrderId, gatewayOrderId));
        if (!paymentOrder) {
          console.warn(`[Webhook] No payment order found for gateway_order_id ${gatewayOrderId}`);
          return res.status(404).json({ error: "Payment order not found" });
        }

        const capturedAmount = (event?.payload?.payment?.entity?.amount || 0) / 100;

        // Record the payment transaction
        const _payEnt = event?.payload?.payment?.entity || {};
        await db.insert(paymentTransactions).values({
          paymentOrderId: paymentOrder.id,
          orderId: paymentOrder.orderId,
          merchantId: paymentOrder.merchantId,
          gatewayName: 'razorpay',
          gatewayPaymentId,
          gatewayOrderId,
          paymentMethod: _payEnt.method || null,
          bank: _payEnt.bank || null,
          vpa: _payEnt.vpa || null,
          rrn: _payEnt.acquirer_data?.rrn || _payEnt.acquirer_data?.bank_transaction_id || null,
          amount: capturedAmount.toString(),
          status: 'captured',
          captured: true,
          capturedAt: new Date(),
          rawResponse: _payEnt,
        });

        // Update payment order status
        await db.update(paymentOrders).set({
          status: 'captured',
          amountPaid: capturedAmount.toString(),
          amountDue: '0',
          updatedAt: new Date(),
        }).where(eq(paymentOrders.id, paymentOrder.id));

        // Auto-create the order from the stored cartSnapshot
        const notes = paymentOrder.notes as any;
        const cartSnapshot = notes?.cartSnapshot;

        if (cartSnapshot && cartSnapshot.items && Array.isArray(cartSnapshot.items) && cartSnapshot.items.length > 0) {
          try {
            const orderRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Webhook-Internal': 'razorpay' },
              body: JSON.stringify({
                ...cartSnapshot,
                paymentMethod: 'razorpay',
                paymentStatus: 'paid',
                status: 'confirmed',
              }),
            });
            if (orderRes.ok) {
              const orderData = await orderRes.json() as any;
              console.log(`[Webhook] Auto-created order ${orderData?.display_id || orderData?.id} for payment ${gatewayPaymentId}`);
            } else {
              const errText = await orderRes.text();
              console.error(`[Webhook] Order creation failed (${orderRes.status}):`, errText);
            }
          } catch (orderErr) {
            console.error("[Webhook] Error auto-creating order:", orderErr);
          }
        } else {
          console.warn(`[Webhook] No cartSnapshot in payment order ${paymentOrder.id} — order not auto-created`);
        }

        return res.json({ received: true, processed: true });
      } catch (error: any) {
        console.error("[Webhook] Error processing Razorpay webhook:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}
