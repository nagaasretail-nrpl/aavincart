import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, generateInvoiceNumber, getAllIdsForMerchant } from "./shared";
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, getCached, setCache, invalidateCache } from "./utils";
import { z } from "zod";
import { randomUUID, createHmac, timingSafeEqual, randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import ExcelJS from "exceljs";
import {
  unionStaff,
  userAddresses,
  users as usersTable,
  agents as agentsTable,
  businessRoutes,
  deliveryPartners,
  b2bRegistrations,
  inventoryBatches,
  goodsReceiptNotes,
  salesReturns,
  collections as collectionsTable,
  outstandingLedger,
  schemes,
  staffAttendance,
  beatPlans,
  outletVisits,
  vehicles,
  pickLists,
  orders as ordersTable,
  userActivityLogs,
  deliveryShifts,
  deliveryWalletTransactions,
  kdsUsers,
  kdsSettings,
  deliveryPoints as deliveryPointsTable,
  tallyImportLogs,
  tallyLedgerRaw,
  tallyStockitemRaw,
  tallyVoucherRaw,
  deliveryRoutes,
  userHierarchy,
  invoiceSequences,
  transportHubs,
  tripSheets,
  loadManifests,
  transportRoutePoints,
  driverPerformance,
  butterMilkStops,
  driverLocations,
  bulkInvoices,
  deliveryJobs,
  gstFilingPeriods,
  upiTransactions,
  cashfreeSoftposTerminals,
  cashfreePaymentLinks,
  cashfreeBeneficiaries as cashfreeBeneficiariesTable,
  cashfreePayouts as cashfreePayoutsTable,
  bulkDeliveryLocations,
  manualBillBatches,
  manualBills,
  milkRouteAgents,
  milkDispatchEntries,
  milkAgentLedger,
  mmoOffices,
  mmoRoutes,
  mmoRouteAgents,
  insertMmoOfficeSchema,
  insertMmoRouteSchema,
  insertMmoRouteAgentSchema,
  auditLogs,
  type Restaurant,
  type MenuItem,
  type Order,
  type User,
  type DeliveryPoint,
  type InsertRestaurant,
  type InsertMenuItem,
  type InsertOrder,
  type InsertUser,
  type InsertDeliveryPoint,
  type Merchant,
  type Client,
  type Item,
  type Plan,
  type Invoice,
  type Payout,
  type Reservation,
  type Promo,
  type Notification,
  type Earning,
  type Attribute,
  type MarketingCampaign,
  type PaymentGateway,
  type UpiTransaction,
  type InsertMerchant,
  type InsertClient,
  type InsertItem,
  type InsertPlan,
  type InsertInvoice,
  type InsertPayout,
  type InsertReservation,
  type InsertPromo,
  type InsertNotification,
  type InsertEarning,
  type InsertAttribute,
  type InsertMarketingCampaign,
  type InsertPaymentGateway,
  type InsertUpiTransaction,
  type RazorpayTransaction,
  type InsertRazorpayTransaction,
  type CashfreeTransaction,
  type InsertCashfreeTransaction,
  type PricingTier,
  type InsertPricingTier,
  type EwayBill,
  type InsertEwayBill,
  type GstReturn,
  type InsertGstReturn,
  type DelhiveryConfig,
  type InsertDelhiveryConfig,
  type WholesaleDealer,
  type FreshMilkDealer,
  type MediaFile,
  type InsertMediaFile,
  type Agent,
  type InsertAgent,
  type MasterOrder,
  type InsertMasterOrder,
  masterOrders,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  wallets,
  walletTransactions,
  type B2BInvoice,
  type InsertB2BInvoice,
  b2bInvoices,
  type ApiSetting,
  deliveryConfiguration,
  deliveryRoutes as deliveryRoutesTable,
  type UserHierarchy,
  type InsertUserHierarchy,
  type B2bRegistration,
  type InsertB2bRegistration,
  type FreshMilkRoute,
  type InsertFreshMilkRoute,
  type FreshMilkDispatch,
  type InsertFreshMilkDispatch,
  type FreshMilkReturn,
  type InsertFreshMilkReturn,
  UNION_STAFF_DESIGNATIONS,
  AGENT_TYPES,
  AGENT_PRICING_ROLES,
  insertMmoOfficeSchema as insertMmoOffice,
  pricingTiers,
  ewayBills,
  ewayBillConfig,
  ewayBillLogs,
  hsnCodes,
  gstReturns,
  users,
  restaurants,
  menuItems,
  orders,
  merchants,
  clients,
  items,
  plans,
  invoices,
  payouts,
  reservations,
  promos,
  notifications,
  earnings,
  attributes,
  marketingCampaigns,
  paymentGateways,
  upiTransactions as upiTransactionsTable,
  insertPayoutSchema,
  insertPaymentGatewaySchema,
  insertUpiTransactionSchema,
  insertAttributeSchema,
  insertEarningSchema,
  insertMarketingCampaignSchema,
  insertNotificationSchema,
  insertPromoSchema,
  insertReservationSchema,
  merchantGatewayAccounts,
  paymentOrders,
  paymentTransactions,
  paymentRefunds,
  paymentWebhookLogs,
  merchantSettlementImports
} from "@shared/schema";
import { objectStorageClient, ObjectStorageService } from "../replit_integrations/object_storage";
import { logAudit, diffObjects } from "../audit";

import { encrypt, decrypt, maskKeyId } from "../payment-crypto";
import crypto from "crypto";

export async function registerPaymentsRoutes(app: Express): Promise<void> {
  app.get("/api/b2b-invoices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await storage.getB2BInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching B2B invoice:', error);
      res.status(500).json({ error: 'Failed to fetch B2B invoice' });
    }
  });

  // Create B2B invoice
  app.post("/api/merchants/:merchantId/b2b-invoices", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.params;
      
      // Fetch merchant data to populate seller details
      const merchant = await storage.getMerchant(merchantId);
      
      // Build seller details from merchant data
      const sellerDetails = merchant ? {
        sellerName: merchant.restaurantName || merchant.email?.split('@')[0] || 'District Union',
        sellerAddress: merchant.address || '',
        sellerCity: merchant.city || '',
        sellerState: 'Tamil Nadu',
        sellerStateCode: '33',
        sellerGstin: merchant.gstin || '',
        sellerFssai: merchant.fssaiLicense || '',
      } : {};
      
      const invoiceData = {
        ...req.body,
        ...sellerDetails,
        merchantId,
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : new Date(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };
      
      const invoice = await storage.createB2BInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating B2B invoice:', error);
      res.status(500).json({ error: 'Failed to create B2B invoice' });
    }
  });

  // Update B2B invoice
  app.put("/api/b2b-invoices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await storage.updateB2BInvoice(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error updating B2B invoice:', error);
      res.status(500).json({ error: 'Failed to update B2B invoice' });
    }
  });

  // Delete B2B invoice
  app.delete("/api/b2b-invoices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteB2BInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting B2B invoice:', error);
      res.status(500).json({ error: 'Failed to delete B2B invoice' });
    }
  });

  // Get next invoice number
  app.get("/api/merchants/:merchantId/b2b-invoices/next-number", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.params;
      const { segment } = req.query;
      const invoiceNo = await storage.getNextB2BInvoiceNo(merchantId, segment as string || 'Products');
      res.json({ invoiceNo });
    } catch (error) {
      console.error('Error generating invoice number:', error);
      res.status(500).json({ error: 'Failed to generate invoice number' });
    }
  });

  // ===============================================
  // PAYOUT MANAGEMENT API
  // ===============================================

  app.get("/api/admin/payouts", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const payouts = await storage.getPayouts();
      res.json(payouts);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ error: 'Failed to fetch payouts' });
    }
  });

  app.post("/api/admin/payouts", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedPayout = insertPayoutSchema.parse(req.body);
      const payout = await storage.createPayout(validatedPayout);
      res.status(201).json(payout);
    } catch (error) {
      console.error('Error creating payout:', error);
      res.status(500).json({ error: 'Failed to create payout' });
    }
  });

  app.get("/api/admin/payouts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const payout = await storage.getPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json(payout);
    } catch (error) {
      console.error('Error fetching payout:', error);
      res.status(500).json({ error: 'Failed to fetch payout' });
    }
  });

  app.put("/api/admin/payouts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertPayoutSchema.partial().parse(req.body);
      const payout = await storage.updatePayout(req.params.id, updates);
      if (!payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json(payout);
    } catch (error) {
      console.error('Error updating payout:', error);
      res.status(500).json({ error: 'Failed to update payout' });
    }
  });

  app.delete("/api/admin/payouts/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deletePayout(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Payout not found' });
      }
      res.json({ message: 'Payout deleted successfully' });
    } catch (error) {
      console.error('Error deleting payout:', error);
      res.status(500).json({ error: 'Failed to delete payout' });
    }
  });

  // ===============================================
  // PAYMENT GATEWAY MANAGEMENT API  
  // ===============================================

  app.get("/api/admin/payment-gateways", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const gateways = await storage.getPaymentGateways(status);
      res.json(gateways);
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
      res.status(500).json({ error: 'Failed to fetch payment gateways' });
    }
  });

  app.post("/api/admin/payment-gateways", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedGateway = insertPaymentGatewaySchema.parse(req.body);
      const gateway = await storage.createPaymentGateway(validatedGateway);
      res.status(201).json(gateway);
    } catch (error) {
      console.error('Error creating payment gateway:', error);
      res.status(500).json({ error: 'Failed to create payment gateway' });
    }
  });

  app.get("/api/admin/payment-gateways/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const gateway = await storage.getPaymentGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ error: 'Payment gateway not found' });
      }
      res.json(gateway);
    } catch (error) {
      console.error('Error fetching payment gateway:', error);
      res.status(500).json({ error: 'Failed to fetch payment gateway' });
    }
  });

  app.put("/api/admin/payment-gateways/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertPaymentGatewaySchema.partial().parse(req.body);
      const gateway = await storage.updatePaymentGateway(req.params.id, updates);
      if (!gateway) {
        return res.status(404).json({ error: 'Payment gateway not found' });
      }
      res.json(gateway);
    } catch (error) {
      console.error('Error updating payment gateway:', error);
      res.status(500).json({ error: 'Failed to update payment gateway' });
    }
  });

  app.delete("/api/admin/payment-gateways/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deletePaymentGateway(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Payment gateway not found' });
      }
      res.json({ message: 'Payment gateway deleted successfully' });
    } catch (error) {
      console.error('Error deleting payment gateway:', error);
      res.status(500).json({ error: 'Failed to delete payment gateway' });
    }
  });

  // ===============================================
  // SBI UPI PAYMENT API
  // ===============================================

  // UPI Payment Initiation - No authentication required for guest checkout
  app.post("/api/upi/payment/initiate", async (req, res) => {
    try {
      // Validate request body with Zod
      const validationSchema = z.object({
        orderId: z.string().min(1, 'Order ID is required'),
      });
      
      const { orderId } = validationSchema.parse(req.body);

      // Get the order to validate ownership and amount
      const order = await storage.getOrder(orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      // For guest checkout, we rely on order existence validation
      // In a production environment, you might want to add additional verification
      // such as requiring a payment verification token or customer email confirmation

      // Check if order is already paid or confirmed
      if (order.status === 'delivered' || order.status === 'confirmed') {
        console.error('Order already processed:', order.status);
        return res.status(400).json({ error: 'Order is already processed' });
      }

      // Get SBI UPI gateway configuration
      const sbiGateway = (await storage.getPaymentGateways()).find(g => g.paymentCode === 'sbi_upi');
      if (!sbiGateway || sbiGateway.status !== 'active') {
        console.error('SBI UPI gateway not available or inactive:', { 
          found: !!sbiGateway, 
          status: sbiGateway?.status 
        });
        return res.status(400).json({ error: 'SBI UPI gateway not available' });
      }

      // Use merchant VPA from gateway configuration - must be configured
      const merchantVPA = sbiGateway.publishableKey; // Store merchant VPA in publishableKey field
      if (!merchantVPA) {
        return res.status(500).json({ error: 'SBI UPI merchant VPA not configured' });
      }
      
      // Use order total amount (not client-supplied amount) for security
      const amount = order.total;

      // Check for existing transactions (idempotency and prevent duplicate payments)
      const existingTransactions = await storage.getUpiTransactions(orderId);
      const successfulTransaction = existingTransactions.find(t => t.status === 'success');
      if (successfulTransaction) {
        return res.status(400).json({ error: 'Order payment already completed' });
      }
      
      const pendingTransaction = existingTransactions.find(t => t.status === 'pending');
      if (pendingTransaction) {
        return res.json({
          transactionId: pendingTransaction.id,
          merchantTransactionId: pendingTransaction.merchantTransactionId,
          qrCodeData: pendingTransaction.qrCodeData,
          amount: pendingTransaction.amount,
          currency: pendingTransaction.currency,
          expiresAt: pendingTransaction.expiresAt,
          status: pendingTransaction.status
        });
      }

      // Generate unique merchant transaction ID
      const merchantTransactionId = `TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
      
      // Calculate expiry time (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Generate UPI QR code data using secure merchant VPA
      const qrCodeData = `upi://pay?pa=${merchantVPA}&pn=FoodieHub&am=${amount}&cu=INR&tr=${merchantTransactionId}`;

      // Validate and create UPI transaction record with schema validation
      const transactionData = insertUpiTransactionSchema.parse({
        orderId,
        paymentGatewayId: sbiGateway.id,
        upiTransactionId: null, // Will be updated when we get response from SBI
        merchantTransactionId,
        amount,
        currency: 'INR',
        payeeVPA: merchantVPA,
        qrCodeData,
        status: 'pending',
        expiresAt,
        initiatedAt: new Date(),
      });
      
      const upiTransaction = await storage.createUpiTransaction(transactionData);

      const responseData = {
        transactionId: upiTransaction.id,
        merchantTransactionId,
        qrCodeData,
        amount,
        currency: 'INR',
        expiresAt,
        status: 'pending'
      };

      res.json(responseData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      console.error('Error initiating UPI payment:', error);
      res.status(500).json({ error: 'Failed to initiate UPI payment' });
    }
  });

  // UPI Payment Status Check
  app.get("/api/upi/payment/status/:merchantTransactionId", async (req, res) => {
    try {
      const { merchantTransactionId } = req.params;
      
      const transaction = await storage.getUpiTransactionByMerchantId(merchantTransactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // In a real implementation, this would check with SBI UPI API
      // For now, we'll simulate the status check
      let status = transaction.status;
      
      // Simulate payment processing logic
      if (status === 'pending' && transaction.expiresAt && new Date() > transaction.expiresAt) {
        status = 'expired';
        await storage.updateUpiTransaction(transaction.id, { status: 'expired' });
      }

      res.json({
        transactionId: transaction.id,
        merchantTransactionId: transaction.merchantTransactionId,
        upiTransactionId: transaction.upiTransactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status,
        initiatedAt: transaction.initiatedAt,
        completedAt: transaction.completedAt,
        expiresAt: transaction.expiresAt
      });
    } catch (error) {
      console.error('Error checking UPI payment status:', error);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  });

  // UPI Webhook Handler for SBI - with signature verification
  app.post("/api/upi/webhook/sbi", async (req, res) => {
    try {
      const webhookData = req.body;
      const signature = req.headers['x-sbi-signature'] as string;
      
      // Get SBI UPI gateway configuration for webhook secret
      const sbiGateway = (await storage.getPaymentGateways()).find(g => g.paymentCode === 'sbi_upi');
      if (!sbiGateway || sbiGateway.status !== 'active') {
        return res.status(400).json({ error: 'SBI UPI gateway not available' });
      }

      // Verify webhook signature for security
      if (!signature || !sbiGateway.webhooksSigningSecret) {
        return res.status(400).json({ error: 'Missing or invalid signature' });
      }

      const payload = JSON.stringify(webhookData);
      const expectedSignature = createHmac('sha256', sbiGateway.webhooksSigningSecret)
        .update(payload)
        .digest('hex');
      const receivedSignature = signature.replace('sha256=', '');

      // Use timing-safe comparison to prevent timing attacks
      if (!timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'))) {
        console.error('Invalid webhook signature for SBI UPI');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const { merchantTransactionId, upiTransactionId, status, amount, payerVPA } = webhookData;
      
      if (!merchantTransactionId) {
        return res.status(400).json({ error: 'Merchant transaction ID required' });
      }

      const transaction = await storage.getUpiTransactionByMerchantId(merchantTransactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Map SBI UPI status to our internal status
      let internalStatus = status;
      if (status === 'SUCCESS') internalStatus = 'success';
      else if (status === 'FAILED') internalStatus = 'failed';
      else if (status === 'PENDING') internalStatus = 'pending';
      else if (status === 'EXPIRED') internalStatus = 'expired';

      // Update transaction with complete webhook data
      const updateData: any = {
        status: internalStatus,
        webhookData,
        upiTransactionId: upiTransactionId || transaction.upiTransactionId,
        payerVPA: payerVPA || transaction.payerVPA,
      };

      if (internalStatus === 'success') {
        updateData.completedAt = new Date();
        // Update order payment status atomically
        await storage.updateOrderStatus(transaction.orderId, 'confirmed');
      } else if (internalStatus === 'failed') {
        updateData.failureReason = webhookData.failureReason || webhookData.errorMessage || 'Payment failed';
      }

      const updatedTransaction = await storage.updateUpiTransaction(transaction.id, updateData);

      res.json({ message: 'Webhook processed successfully', transactionId: transaction.id });
    } catch (error) {
      console.error('Error processing UPI webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // UPI Transaction Management - Admin only
  app.get("/api/admin/upi-transactions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { orderId, status } = req.query;
      const transactions = await storage.getUpiTransactions(orderId as string, status as string);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching UPI transactions:', error);
      res.status(500).json({ error: 'Failed to fetch UPI transactions' });
    }
  });

  app.get("/api/admin/upi-transactions/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const transaction = await storage.getUpiTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: 'UPI transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching UPI transaction:', error);
      res.status(500).json({ error: 'Failed to fetch UPI transaction' });
    }
  });

  // ===============================================
  // EARNINGS MANAGEMENT API  
  // ===============================================

  app.get("/api/admin/earnings", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      let earnings = await storage.getEarnings();
      const scope = getUnionScope(req);
      if (!scope.isGlobalAdmin && scope.merchantId) {
        const validIds = getAllIdsForMerchant(scope.merchantId);
        earnings = earnings.filter((e: any) => validIds.includes(e.restaurantId || '') || validIds.includes(e.merchantId || ''));
      }
      res.json(earnings);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  });

  app.post("/api/admin/earnings", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedEarning = insertEarningSchema.parse(req.body);
      const earning = await storage.createEarning(validatedEarning);
      res.status(201).json(earning);
    } catch (error) {
      console.error('Error creating earning:', error);
      res.status(500).json({ error: 'Failed to create earning' });
    }
  });

  app.get("/api/admin/earnings/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const earning = await storage.getEarning(req.params.id);
      if (!earning) {
        return res.status(404).json({ error: 'Earning not found' });
      }
      res.json(earning);
    } catch (error) {
      console.error('Error fetching earning:', error);
      res.status(500).json({ error: 'Failed to fetch earning' });
    }
  });

  app.put("/api/admin/earnings/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertEarningSchema.partial().parse(req.body);
      const earning = await storage.updateEarning(req.params.id, updates);
      if (!earning) {
        return res.status(404).json({ error: 'Earning not found' });
      }
      res.json(earning);
    } catch (error) {
      console.error('Error updating earning:', error);
      res.status(500).json({ error: 'Failed to update earning' });
    }
  });

  app.delete("/api/admin/earnings/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteEarning(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Earning not found' });
      }
      res.json({ message: 'Earning deleted successfully' });
    } catch (error) {
      console.error('Error deleting earning:', error);
      res.status(500).json({ error: 'Failed to delete earning' });
    }
  });

  // ===============================================
  // RESERVATION MANAGEMENT API
  // ===============================================

  app.get("/api/admin/reservations", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const reservations = await storage.getReservations();
      res.json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  });

  app.post("/api/admin/reservations", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedReservation = insertReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(validatedReservation);
      res.status(201).json(reservation);
    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({ error: 'Failed to create reservation' });
    }
  });

  app.get("/api/admin/reservations/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      res.json(reservation);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ error: 'Failed to fetch reservation' });
    }
  });

  app.put("/api/admin/reservations/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertReservationSchema.partial().parse(req.body);
      const reservation = await storage.updateReservation(req.params.id, updates);
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      res.json(reservation);
    } catch (error) {
      console.error('Error updating reservation:', error);
      res.status(500).json({ error: 'Failed to update reservation' });
    }
  });

  app.delete("/api/admin/reservations/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteReservation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      res.status(500).json({ error: 'Failed to delete reservation' });
    }
  });

  // ===============================================
  // PROMO/COUPON MANAGEMENT API
  // ===============================================

  app.get("/api/admin/promos", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const promos = await storage.getPromos();
      res.json(promos);
    } catch (error) {
      console.error('Error fetching promos:', error);
      res.status(500).json({ error: 'Failed to fetch promos' });
    }
  });

  app.post("/api/admin/promos", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedPromo = insertPromoSchema.parse(req.body);
      const promo = await storage.createPromo(validatedPromo);
      res.status(201).json(promo);
    } catch (error) {
      console.error('Error creating promo:', error);
      res.status(500).json({ error: 'Failed to create promo' });
    }
  });

  app.get("/api/admin/promos/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const promo = await storage.getPromo(req.params.id);
      if (!promo) {
        return res.status(404).json({ error: 'Promo not found' });
      }
      res.json(promo);
    } catch (error) {
      console.error('Error fetching promo:', error);
      res.status(500).json({ error: 'Failed to fetch promo' });
    }
  });

  app.put("/api/admin/promos/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertPromoSchema.partial().parse(req.body);
      const promo = await storage.updatePromo(req.params.id, updates);
      if (!promo) {
        return res.status(404).json({ error: 'Promo not found' });
      }
      res.json(promo);
    } catch (error) {
      console.error('Error updating promo:', error);
      res.status(500).json({ error: 'Failed to update promo' });
    }
  });

  app.delete("/api/admin/promos/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deletePromo(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Promo not found' });
      }
      res.json({ message: 'Promo deleted successfully' });
    } catch (error) {
      console.error('Error deleting promo:', error);
      res.status(500).json({ error: 'Failed to delete promo' });
    }
  });

  // ===============================================
  // NOTIFICATION MANAGEMENT API
  // ===============================================

  app.get("/api/admin/notifications", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/admin/notifications", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedNotification = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedNotification);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  app.get("/api/admin/notifications/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  });

  app.put("/api/admin/notifications/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertNotificationSchema.partial().parse(req.body);
      const notification = await storage.updateNotification(req.params.id, updates);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  app.delete("/api/admin/notifications/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteNotification(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // ===============================================
  // ATTRIBUTE MANAGEMENT API
  // ===============================================

  app.get("/api/admin/attributes", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const attributes = await storage.getAttributes();
      res.json(attributes);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      res.status(500).json({ error: 'Failed to fetch attributes' });
    }
  });

  app.post("/api/admin/attributes", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedAttribute = insertAttributeSchema.parse(req.body);
      const attribute = await storage.createAttribute(validatedAttribute);
      res.status(201).json(attribute);
    } catch (error) {
      console.error('Error creating attribute:', error);
      res.status(500).json({ error: 'Failed to create attribute' });
    }
  });

  app.get("/api/admin/attributes/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const attribute = await storage.getAttribute(req.params.id);
      if (!attribute) {
        return res.status(404).json({ error: 'Attribute not found' });
      }
      res.json(attribute);
    } catch (error) {
      console.error('Error fetching attribute:', error);
      res.status(500).json({ error: 'Failed to fetch attribute' });
    }
  });

  app.put("/api/admin/attributes/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertAttributeSchema.partial().parse(req.body);
      const attribute = await storage.updateAttribute(req.params.id, updates);
      if (!attribute) {
        return res.status(404).json({ error: 'Attribute not found' });
      }
      res.json(attribute);
    } catch (error) {
      console.error('Error updating attribute:', error);
      res.status(500).json({ error: 'Failed to update attribute' });
    }
  });

  app.delete("/api/admin/attributes/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteAttribute(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Attribute not found' });
      }
      res.json({ message: 'Attribute deleted successfully' });
    } catch (error) {
      console.error('Error deleting attribute:', error);
      res.status(500).json({ error: 'Failed to delete attribute' });
    }
  });

  // ===============================================
  // MARKETING CAMPAIGN MANAGEMENT API
  // ===============================================

  app.get("/api/admin/campaigns", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.post("/api/admin/campaigns", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validatedCampaign = insertMarketingCampaignSchema.parse(req.body);
      const campaign = await storage.createMarketingCampaign(validatedCampaign);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  app.get("/api/admin/campaigns/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const campaign = await storage.getMarketingCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  app.put("/api/admin/campaigns/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const updates = insertMarketingCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateMarketingCampaign(req.params.id, updates);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.delete("/api/admin/campaigns/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const success = await storage.deleteMarketingCampaign(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  // ===============================================
  // RAZORPAY PAYMENT GATEWAY API
  // ===============================================
  
  // Get Razorpay key (public) for frontend
  app.get("/api/razorpay/config", async (req, res) => {
    try {
      // Get Razorpay key from environment variables
      const keyId = process.env.RAZORPAY_KEY_ID;
      
      if (!keyId) {
        return res.status(404).json({ error: 'Razorpay payment gateway not configured' });
      }
      
      res.json({
        keyId: keyId,
        currency: 'INR',
        name: 'Aavincart',
        description: 'Tamil Nadu Cooperative Milk Producers Federation',
        theme: {
          color: '#F97316' // Orange theme for Aavincart
        }
      });
    } catch (error) {
      console.error('Error fetching Razorpay config:', error);
      res.status(500).json({ error: 'Failed to fetch payment configuration' });
    }
  });

  // Create Razorpay order
  app.post("/api/razorpay/orders", async (req, res) => {
    try {
      const { amount, currency = 'INR', orderId, customerInfo, notes } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Get Razorpay credentials - prioritize environment variables
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        console.error('Razorpay credentials not found in environment variables');
        return res.status(503).json({ error: 'Razorpay payment gateway not properly configured' });
      }
      
      // Initialize Razorpay
      const Razorpay = (await import('razorpay')).default;
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      
      const numericAmount = Number(amount);
      const amountInPaise = Math.round(numericAmount * 100);
      
      // Generate a receipt ID (not orderId - Razorpay generates its own order_id)
      const receiptId = `rcpt_${Date.now()}`;
      
      // Create order with Razorpay
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: currency,
        receipt: receiptId,
        notes: {
          appOrderId: orderId || '',
          ...notes
        }
      }) as any;
      
      // Store transaction in our database
      const transaction = await storage.createRazorpayTransaction({
        orderId: orderId || razorpayOrder.receipt,
        razorpayOrderId: razorpayOrder.id,
        amount: amount.toString(),
        currency: currency,
        status: 'created',
        email: customerInfo?.email,
        contact: customerInfo?.phone,
        notes: notes
      });
      
      res.json({
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        transactionId: transaction.id
      });
    } catch (error: any) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({ error: error.message || 'Failed to create payment order' });
    }
  });

  // Verify Razorpay payment signature
  app.post("/api/razorpay/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing required payment verification parameters' });
      }
      
      // Get Razorpay secret key from environment variables
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keySecret) {
        console.error('Razorpay secret key not found in environment variables');
        return res.status(503).json({ error: 'Razorpay payment gateway not properly configured' });
      }
      
      // Validate transaction exists and amount matches
      const existingTransaction = await storage.getRazorpayTransactionByOrderId(razorpay_order_id);
      if (!existingTransaction) {
        return res.status(400).json({ error: 'Transaction not found for this order', verified: false });
      }
      
      // Verify signature with length check to prevent timingSafeEqual errors
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');
      
      // Length check before timingSafeEqual to avoid throws on mismatched lengths
      const expectedBuffer = Buffer.from(expectedSignature);
      const receivedBuffer = Buffer.from(razorpay_signature);
      
      const isValid = expectedBuffer.length === receivedBuffer.length && 
        timingSafeEqual(expectedBuffer, receivedBuffer);
      
      if (!isValid) {
        // Update transaction status to failed
        await storage.updateRazorpayTransactionByOrderId(razorpay_order_id, {
          status: 'failed',
          errorDescription: 'Payment signature verification failed'
        });
        return res.status(400).json({ error: 'Payment verification failed', verified: false });
      }
      
      // Update transaction with payment details
      const transaction = await storage.updateRazorpayTransactionByOrderId(razorpay_order_id, {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'captured',
        capturedAt: new Date()
      });
      
      // Create the actual order in the database if orderData is provided
      let createdOrderIds: string[] = [];
      const { orderData } = req.body;
      if (orderData) {
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          console.error('[Razorpay Verify] CRITICAL: orderData has no items!', {
            razorpay_order_id,
            razorpay_payment_id,
            orderDataKeys: Object.keys(orderData),
            itemsType: typeof orderData.items,
            itemsLength: Array.isArray(orderData.items) ? orderData.items.length : 'N/A'
          });
          return res.status(400).json({ 
            error: 'Order data is incomplete - no items found. Payment was captured but order could not be created. Please contact support with payment ID: ' + razorpay_payment_id,
            verified: true,
            paymentCaptured: true,
            orderCreated: false
          });
        }

        if (!orderData.customerName || !orderData.customerPhone) {
          console.error('[Razorpay Verify] CRITICAL: orderData missing customer info!', {
            razorpay_order_id,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone
          });
        }

        const razorpayAmountRupees = parseFloat(existingTransaction?.amount || '0');
        const orderTotalRupees = parseFloat(orderData.total || '0');
        if (razorpayAmountRupees > 0 && Math.abs(razorpayAmountRupees - orderTotalRupees) > 1) {
          console.warn('[Razorpay Verify] Amount mismatch warning:', {
            razorpayAmount: razorpayAmountRupees,
            orderTotal: orderTotalRupees,
            difference: Math.abs(razorpayAmountRupees - orderTotalRupees)
          });
        }

        try {
          const pricingRole = orderData.pricingRole || 'MRP';
          const isB2B = pricingRole !== 'MRP' && pricingRole !== 'RETAILER';

          if (isB2B && orderData.items && Array.isArray(orderData.items)) {
            // Use the same B2B segment splitting logic as POST /api/orders
            const orderItems = orderData.items as { id: string; name: string; price: string; quantity: number; productSegment?: string; category?: string }[];
            const segmentBuckets: Record<string, typeof orderItems> = { 'Fresh Milk': [], 'Products': [], 'Ice Cream': [] };
            const iceCreamCategories = ['Ice Cream', 'ice_cream', 'Frozen Desserts', 'Kulfi'];

            for (const item of orderItems) {
              let segment = item.productSegment;
              if (!segment) {
                const lookupId = (item as any).itemId || item.id;
                const menuItem = lookupId ? await storage.getMenuItem(lookupId) : null;
                segment = menuItem?.productSegment || 'Products';
                if (segment === 'Products' && menuItem?.category && iceCreamCategories.some(c => c.toLowerCase() === (menuItem.category || '').toLowerCase())) {
                  segment = 'Ice Cream';
                }
              }
              if (segment === 'Fresh Milk') segmentBuckets['Fresh Milk'].push({ ...item, productSegment: 'Fresh Milk' });
              else if (segment === 'Ice Cream' || (item.category && iceCreamCategories.some(c => c.toLowerCase() === item.category!.toLowerCase()))) segmentBuckets['Ice Cream'].push({ ...item, productSegment: 'Ice Cream' });
              else segmentBuckets['Products'].push({ ...item, productSegment: 'Products' });
            }

            const activeSegments = Object.entries(segmentBuckets).filter(([, items]) => items.length > 0);
            const segmentSuffixMap: Record<string, string> = { 'Fresh Milk': 'FM', 'Products': 'DP', 'Ice Cream': 'IC' };
            const calculateTotal = (segItems: typeof orderItems) => {
              const sub = segItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
              const t = sub * 0.05;
              return { subtotal: sub, tax: t, total: sub + t };
            };
            const grandTotal = activeSegments.reduce((sum, [, si]) => sum + calculateTotal(si).total, 0) + parseFloat(orderData.deliveryFee || '0');

            const masterOrder = await storage.createMasterOrder({
              customerName: orderData.customerName,
              customerEmail: orderData.customerEmail,
              customerPhone: orderData.customerPhone,
              restaurantId: orderData.restaurantId,
              pricingRole: pricingRole,
              totalAmount: grandTotal.toFixed(2),
              segmentCount: activeSegments.length,
              deliveredCount: 0,
              status: 'open',
            } as any);

            for (let i = 0; i < activeSegments.length; i++) {
              const [segmentName, segmentItems] = activeSegments[i];
              const totals = calculateTotal(segmentItems);
              const suffix = segmentSuffixMap[segmentName] || 'OT';
              const segDisplayId = `${masterOrder.displayId}-${suffix}`;

              const rzpInvoiceNo = await generateInvoiceNumber(orderData.restaurantId);
              const segmentOrder = await storage.createOrder({
                ...orderData,
                items: segmentItems,
                subtotal: totals.subtotal.toFixed(2),
                tax: totals.tax.toFixed(2),
                total: (i === 0 ? totals.total + parseFloat(orderData.deliveryFee || '0') : totals.total).toFixed(2),
                deliveryFee: i === 0 ? orderData.deliveryFee : '0.00',
                productSegment: segmentName,
                masterOrderId: masterOrder.id,
                segmentSuffix: suffix,
                displayId: segDisplayId,
                workflowStatus: 'pending',
                paymentMethod: 'razorpay',
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                status: 'confirmed',
                invoiceNumber: rzpInvoiceNo,
              } as any);
              createdOrderIds.push(segmentOrder.id);
            }
          } else {
            // Consumer / single order
            const rzpConsumerInvNo = await generateInvoiceNumber(orderData.restaurantId);
            const order = await storage.createOrder({
              ...orderData,
              paymentMethod: 'razorpay',
              razorpayPaymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,
              status: 'confirmed',
              invoiceNumber: rzpConsumerInvNo,
            });
            createdOrderIds.push(order.id);
          }
        } catch (orderError) {
          console.error('Error creating order after Razorpay payment:', orderError);
        }
      }
      
      // If we have an order linked, update order status
      if (transaction?.orderId) {
        try {
          await storage.updateOrderStatus(transaction.orderId, 'confirmed');
        } catch (e) {
        }
      }
      
      res.json({ 
        verified: true, 
        message: 'Payment verified successfully',
        transactionId: transaction?.id,
        paymentId: razorpay_payment_id,
        orderIds: createdOrderIds
      });
    } catch (error: any) {
      console.error('Error verifying Razorpay payment:', error);
      res.status(500).json({ error: error.message || 'Payment verification failed' });
    }
  });

  // Razorpay webhook handler
  app.post("/api/razorpay/webhook", async (req, res) => {
    try {
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      
      // Get Razorpay webhook secret
      const gateways = await storage.getPaymentGateways();
      const razorpayGateway = gateways.find(g => g.paymentCode === 'razorpay' && g.status === 'active');
      
      if (!razorpayGateway?.webhooksSigningSecret) {
        return res.status(200).json({ status: 'ok' });
      }
      
      // Verify webhook signature using raw body if available, fallback to JSON stringify
      // Note: For production, configure express.raw() middleware for this route
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const expectedSignature = createHmac('sha256', razorpayGateway.webhooksSigningSecret)
        .update(rawBody)
        .digest('hex');
      
      // Safe comparison with length check
      if (!webhookSignature || webhookSignature.length !== expectedSignature.length || webhookSignature !== expectedSignature) {
        console.error('Invalid Razorpay webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      const event = req.body;
      const payload = event.payload;
      
      switch (event.event) {
        case 'payment.captured':
        case 'payment.authorized': {
          const payment = payload.payment.entity;
          await storage.updateRazorpayTransactionByOrderId(payment.order_id, {
            razorpayPaymentId: payment.id,
            status: event.event === 'payment.captured' ? 'captured' : 'authorized',
            paymentMethod: payment.method,
            bankName: payment.bank,
            cardLast4: payment.card?.last4,
            vpa: payment.vpa,
            email: payment.email,
            contact: payment.contact,
            webhookData: event,
            capturedAt: event.event === 'payment.captured' ? new Date() : undefined
          });
          break;
        }
        case 'payment.failed': {
          const payment = payload.payment.entity;
          await storage.updateRazorpayTransactionByOrderId(payment.order_id, {
            razorpayPaymentId: payment.id,
            status: 'failed',
            errorCode: payment.error_code,
            errorDescription: payment.error_description,
            errorReason: payment.error_reason,
            webhookData: event
          });
          break;
        }
        case 'refund.created':
        case 'refund.processed': {
          const refund = payload.refund.entity;
          await storage.updateRazorpayTransactionByPaymentId(refund.payment_id, {
            status: 'refunded',
            webhookData: event
          });
          break;
        }
      }
      
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Error processing Razorpay webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ========== CASHFREE PAYMENT GATEWAY ROUTES ==========

  app.post("/api/cashfree/orders", async (req, res) => {
    try {
      const { amount, orderId, customerName, customerEmail, customerPhone, returnUrl, orderData } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const { getCashfreePG, generateOrderId, CF_API_VERSION, isCashfreeReady } = await import('../cashfree');
      
      if (!isCashfreeReady()) {
        const { initCashfree } = await import('../cashfree');
        initCashfree();
      }

      if (!isCashfreeReady()) {
        return res.status(503).json({ error: 'Cashfree payment gateway not configured' });
      }

      const Cashfree = getCashfreePG();
      const cfOrderId = generateOrderId();
      const numericAmount = Number(amount);

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseReturnUrl = returnUrl || `${protocol}://${host}/checkout/cashfree-return`;
      const fullReturnUrl = `${baseReturnUrl}?order_id={order_id}`;

      const orderRequest: any = {
        order_amount: numericAmount,
        order_currency: "INR",
        order_id: cfOrderId,
        customer_details: {
          customer_id: customerEmail || `cust_${Date.now()}`,
          customer_name: customerName || "Customer",
          customer_email: customerEmail || "customer@aavincart.com",
          customer_phone: customerPhone || "9999999999"
        },
        order_meta: {
          return_url: fullReturnUrl,
          notify_url: `${protocol}://${host}/api/cashfree/webhook`
        },
        order_note: orderId ? `AavinCart Order: ${orderId}` : "AavinCart Payment"
      };

      let orderSplitsToLog: { vendorId: string; splitAmount: number; segment: string }[] = [];
      if (orderData && orderData.items && Array.isArray(orderData.items)) {
        try {
          const splitVendors = await storage.getCashfreeSplitVendors();
          if (splitVendors.length > 0) {
            const segmentBuckets: Record<string, number> = {};
            const iceCreamCategories = ['Ice Cream', 'ice_cream', 'Frozen Desserts', 'Kulfi'];
            for (const item of orderData.items) {
              let segment = item.productSegment || 'Products';
              if (!item.productSegment) {
                const lookupId = item.itemId || item.id;
                const menuItem = lookupId ? await storage.getMenuItem(lookupId) : null;
                segment = menuItem?.productSegment || 'Products';
                if (segment === 'Products' && menuItem?.category && iceCreamCategories.some((c: string) => c.toLowerCase() === (menuItem.category || '').toLowerCase())) {
                  segment = 'Ice Cream';
                }
              }
              const itemTotal = parseFloat(item.price) * item.quantity;
              segmentBuckets[segment] = (segmentBuckets[segment] || 0) + itemTotal;
            }

            const splitArray: { vendor_id: string; amount: number }[] = [];
            for (const [segment, segAmount] of Object.entries(segmentBuckets)) {
              const matchingVendor = splitVendors.find(v =>
                v.status === 'ACTIVE' && v.unionId && (
                  v.name?.toLowerCase().includes(segment.toLowerCase()) ||
                  v.unionId.toLowerCase().includes(segment.toLowerCase().replace(/\s+/g, ''))
                )
              );
              if (matchingVendor) {
                const roundedAmount = Math.round(segAmount * 100) / 100;
                splitArray.push({ vendor_id: matchingVendor.vendorId, amount: roundedAmount });
                orderSplitsToLog.push({ vendorId: matchingVendor.vendorId, splitAmount: roundedAmount, segment });
              }
            }

            if (splitArray.length > 0) {
              orderRequest.order_splits = splitArray;
            }
          }
        } catch (splitErr) {
          console.error('[Cashfree Split] Could not attach splits:', splitErr);
        }
      }

      const response = await Cashfree.PGCreateOrder(CF_API_VERSION, orderRequest);
      const cfOrder = response.data;

      await storage.createCashfreeTransaction({
        orderId: orderId || null,
        cfOrderId: cfOrderId,
        paymentSessionId: cfOrder.payment_session_id || null,
        amount: numericAmount.toFixed(2),
        currency: "INR",
        status: "created",
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
      });

      for (const splitLog of orderSplitsToLog) {
        try {
          await storage.createCashfreeOrderSplit({
            orderId: orderId || null,
            cfOrderId: cfOrderId,
            vendorId: splitLog.vendorId,
            splitAmount: splitLog.splitAmount.toFixed(2),
            status: 'created',
          });
        } catch (splitLogErr) {
          console.error('[Cashfree Split] Failed to log split:', splitLogErr);
        }
      }

      res.json({
        cfOrderId: cfOrderId,
        paymentSessionId: cfOrder.payment_session_id,
        orderAmount: numericAmount,
        orderCurrency: "INR",
        splits: orderSplitsToLog.length > 0 ? orderSplitsToLog : undefined,
      });
    } catch (error: any) {
      console.error('Error creating Cashfree order:', error?.response?.data || error.message);
      res.status(500).json({ error: error?.response?.data?.message || error.message || 'Failed to create Cashfree order' });
    }
  });

  app.post("/api/cashfree/verify", async (req, res) => {
    try {
      const { cfOrderId, orderData } = req.body;

      if (!cfOrderId) {
        return res.status(400).json({ error: 'Missing cfOrderId' });
      }

      const { getCashfreePG, CF_API_VERSION, isCashfreeReady } = await import('../cashfree');
      if (!isCashfreeReady()) {
        return res.status(503).json({ error: 'Cashfree not configured' });
      }

      const Cashfree = getCashfreePG();
      const response = await Cashfree.PGFetchOrder(CF_API_VERSION, cfOrderId);
      const cfOrder = response.data;

      const orderStatus = cfOrder.order_status;
      let createdOrderIds: string[] = [];

      if (orderStatus === "PAID") {
        const payments = cfOrder.order_payments || [];
        const payment = payments[0] || {};

        await storage.updateCashfreeTransactionByCfOrderId(cfOrderId, {
          status: "paid",
          cfPaymentId: payment.cf_payment_id?.toString() || null,
          paymentMethod: payment.payment_group || null,
          webhookData: cfOrder,
        });

        if (orderData && orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
          try {
            const pricingRole = orderData.pricingRole || 'MRP';
            const isB2B = pricingRole !== 'MRP' && pricingRole !== 'RETAILER';

            if (isB2B && orderData.items && Array.isArray(orderData.items)) {
              const orderItems = orderData.items as { id: string; name: string; price: string; quantity: number; productSegment?: string; category?: string }[];
              const segmentBuckets: Record<string, typeof orderItems> = { 'Fresh Milk': [], 'Products': [], 'Ice Cream': [] };
              const iceCreamCategories = ['Ice Cream', 'ice_cream', 'Frozen Desserts', 'Kulfi'];

              for (const item of orderItems) {
                let segment = item.productSegment;
                if (!segment) {
                  const lookupId = (item as any).itemId || item.id;
                  const menuItem = lookupId ? await storage.getMenuItem(lookupId) : null;
                  segment = menuItem?.productSegment || 'Products';
                  if (segment === 'Products' && menuItem?.category && iceCreamCategories.some(c => c.toLowerCase() === (menuItem.category || '').toLowerCase())) {
                    segment = 'Ice Cream';
                  }
                }
                if (segment === 'Fresh Milk') segmentBuckets['Fresh Milk'].push({ ...item, productSegment: 'Fresh Milk' });
                else if (segment === 'Ice Cream' || (item.category && iceCreamCategories.some(c => c.toLowerCase() === item.category!.toLowerCase()))) segmentBuckets['Ice Cream'].push({ ...item, productSegment: 'Ice Cream' });
                else segmentBuckets['Products'].push({ ...item, productSegment: 'Products' });
              }

              const activeSegments = Object.entries(segmentBuckets).filter(([, items]) => items.length > 0);
              const segmentSuffixMap: Record<string, string> = { 'Fresh Milk': 'FM', 'Products': 'DP', 'Ice Cream': 'IC' };
              const calculateTotal = (segItems: typeof orderItems) => {
                const sub = segItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
                const t = sub * 0.05;
                return { subtotal: sub, tax: t, total: sub + t };
              };
              const grandTotal = activeSegments.reduce((sum, [, si]) => sum + calculateTotal(si).total, 0) + parseFloat(orderData.deliveryFee || '0');

              const masterOrder = await storage.createMasterOrder({
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                customerPhone: orderData.customerPhone,
                restaurantId: orderData.restaurantId,
                pricingRole: pricingRole,
                totalAmount: grandTotal.toFixed(2),
                segmentCount: activeSegments.length,
                deliveredCount: 0,
                status: 'open',
              } as any);

              for (let i = 0; i < activeSegments.length; i++) {
                const [segmentName, segmentItems] = activeSegments[i];
                const totals = calculateTotal(segmentItems);
                const suffix = segmentSuffixMap[segmentName] || 'OT';
                const segDisplayId = `${masterOrder.displayId}-${suffix}`;
                const cfInvoiceNo = await generateInvoiceNumber(orderData.restaurantId);

                const segmentOrder = await storage.createOrder({
                  ...orderData,
                  items: segmentItems,
                  subtotal: totals.subtotal.toFixed(2),
                  tax: totals.tax.toFixed(2),
                  total: (i === 0 ? totals.total + parseFloat(orderData.deliveryFee || '0') : totals.total).toFixed(2),
                  deliveryFee: i === 0 ? orderData.deliveryFee : '0.00',
                  productSegment: segmentName,
                  masterOrderId: masterOrder.id,
                  segmentSuffix: suffix,
                  displayId: segDisplayId,
                  workflowStatus: 'pending',
                  paymentMethod: 'cashfree',
                  status: 'confirmed',
                  invoiceNumber: cfInvoiceNo,
                } as any);
                createdOrderIds.push(segmentOrder.id);
              }
            } else {
              const cfConsumerInvNo = await generateInvoiceNumber(orderData.restaurantId);
              const order = await storage.createOrder({
                ...orderData,
                paymentMethod: 'cashfree',
                status: 'confirmed',
                invoiceNumber: cfConsumerInvNo,
              });
              createdOrderIds.push(order.id);
            }
          } catch (orderError) {
            console.error('Error creating order after Cashfree payment:', orderError);
          }
        }

        res.json({
          verified: true,
          status: "PAID",
          cfOrderId,
          orderIds: createdOrderIds,
          paymentId: cfOrder.cf_order_id
        });
      } else if (orderStatus === "EXPIRED" || orderStatus === "TERMINATED") {
        await storage.updateCashfreeTransactionByCfOrderId(cfOrderId, {
          status: "failed",
          errorMessage: `Order ${orderStatus}`,
          webhookData: cfOrder,
        });

        res.json({ verified: false, status: orderStatus, cfOrderId });
      } else {
        res.json({ verified: false, status: orderStatus, cfOrderId });
      }
    } catch (error: any) {
      console.error('Error verifying Cashfree order:', error?.response?.data || error.message);
      res.status(500).json({ error: error?.response?.data?.message || error.message || 'Verification failed' });
    }
  });

  app.post("/api/cashfree/webhook", async (req, res) => {
    try {
      const timestamp = req.headers['x-cashfree-timestamp'] as string;
      const signature = req.headers['x-cashfree-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      if (signature && process.env.CASHFREE_CLIENT_SECRET) {
        const expectedSig = createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
          .update(timestamp + rawBody)
          .digest('base64');
        if (signature !== expectedSig) {
          console.error('[Cashfree Webhook] Invalid signature');
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }

      const event = req.body;
      const data = event?.data || {};

      if (event?.type === 'PAYMENT_SUCCESS_WEBHOOK' || event?.type === 'PAYMENT_RECEIVED') {
        const cfOrderId = data.order?.order_id;
        if (cfOrderId) {
          await storage.updateCashfreeTransactionByCfOrderId(cfOrderId, {
            status: "paid",
            cfPaymentId: data.payment?.cf_payment_id?.toString(),
            paymentMethod: data.payment?.payment_group,
            webhookData: event,
          });
        }
      } else if (event?.type === 'PAYMENT_FAILED_WEBHOOK') {
        const cfOrderId = data.order?.order_id;
        if (cfOrderId) {
          await storage.updateCashfreeTransactionByCfOrderId(cfOrderId, {
            status: "failed",
            errorMessage: data.payment?.payment_message || "Payment failed",
            webhookData: event,
          });
        }
      }

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Error processing Cashfree webhook:', error);
      res.status(200).json({ status: 'ok' });
    }
  });

  app.get("/api/payment-methods", async (req, res) => {
    try {
      const merchantIdParam = req.query.merchantId as string | undefined;

      let razorpayMerchantEnabled = false;
      let cashfreeMerchantEnabled = false;
      let sbiMerchantEnabled = false;
      let codEnabled = false;
      let razorpayHasCredentials = false;
      let cashfreeHasCredentials = false;

      const { merchantGatewayAccounts, merchants: merchantsTable } = await import('../shared/schema');
      const { db } = await import('../db');
      const { eq, and, or, ilike } = await import('drizzle-orm');

      let resolvedMerchantId = merchantIdParam;

      if (merchantIdParam && !merchantIdParam.startsWith('merchant-')) {
        const allMerchants = await db.select({ id: merchantsTable.id, restaurantSlug: merchantsTable.restaurantSlug }).from(merchantsTable);
        const slugNorm = merchantIdParam.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = allMerchants.find(m => {
          const mSlug = (m.restaurantSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return mSlug === slugNorm ||
            slugNorm.includes(mSlug) || mSlug.includes(slugNorm) ||
            merchantIdParam.toLowerCase().replace('uni-', 'aavin-').replace(/-0\d$/, '') === m.restaurantSlug.toLowerCase().replace(/-0\d$/, '');
        });
        if (match) resolvedMerchantId = match.id;
      }

      if (resolvedMerchantId) {
        const merchant = await storage.getMerchant(resolvedMerchantId);
        if (merchant) {
          const ps = (merchant as any).paymentSettings as Record<string, boolean> | null;
          if (ps) {
            razorpayMerchantEnabled = ps.razorpay === true;
            cashfreeMerchantEnabled = ps.cashfree === true;
            sbiMerchantEnabled = ps.sbi === true;
            codEnabled = ps.cod === true;
          }
        }

        const accounts = await db.select().from(merchantGatewayAccounts)
          .where(and(
            eq(merchantGatewayAccounts.merchantId, resolvedMerchantId),
            eq(merchantGatewayAccounts.isActive, true)
          ));
        for (const acc of accounts) {
          if (acc.gatewayName === 'razorpay') razorpayHasCredentials = true;
          if (acc.gatewayName === 'cashfree') cashfreeHasCredentials = true;
        }
      }

      const { isCashfreeReady } = await import('../cashfree');
      const cashfreePlatformReady = isCashfreeReady() || !!process.env.CASHFREE_CLIENT_ID;

      res.json({
        razorpay: razorpayMerchantEnabled && razorpayHasCredentials,
        cashfree: (cashfreeMerchantEnabled && cashfreeHasCredentials) || (cashfreePlatformReady && cashfreeMerchantEnabled),
        sbi: sbiMerchantEnabled,
        cod: codEnabled,
        credit: true,
        wallet: true,
        bankTransfer: false,
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.json({ razorpay: false, cashfree: false, sbi: false, cod: false, credit: true, wallet: true, bankTransfer: false });
    }
  });

  app.get("/api/cashfree/config", async (_req, res) => {
    try {
      const { isCashfreeReady } = await import('../cashfree');
      const gateways = await storage.getPaymentGateways();
      const cashfreeGw = gateways.find(g => g.paymentCode === 'cashfree');

      res.json({
        available: isCashfreeReady() || !!process.env.CASHFREE_CLIENT_ID,
        active: cashfreeGw?.status === 'active',
        environment: process.env.CASHFREE_ENV || 'sandbox'
      });
    } catch (error) {
      res.json({ available: false, active: false });
    }
  });

  app.post("/api/cashfree/test-connection", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { isCashfreeReady, initCashfree, getPGBaseUrl, CF_API_VERSION } = await import('../cashfree');
      if (!isCashfreeReady()) {
        initCashfree();
      }
      if (!isCashfreeReady()) {
        return res.json({ success: false, message: 'Cashfree credentials not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET environment variables.' });
      }
      const baseUrl = getPGBaseUrl();
      const response = await fetch(`${baseUrl}/orders?count=1`, {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_CLIENT_ID || '',
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET || '',
          'x-api-version': CF_API_VERSION,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok || response.status === 200) {
        res.json({ success: true, message: `Connected to Cashfree (${process.env.CASHFREE_ENV || 'sandbox'} mode)` });
      } else {
        const errorData = await response.text();
        res.json({ success: false, message: `Cashfree API returned ${response.status}: ${errorData.substring(0, 200)}` });
      }
    } catch (error: any) {
      res.json({ success: false, message: error.message || 'Connection test failed' });
    }
  });

  app.get("/api/cashfree/transactions", async (_req, res) => {
    try {
      const transactions = await storage.getCashfreeTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Get Razorpay transaction by order ID
  app.get("/api/razorpay/transactions/:orderId", async (req, res) => {
    try {
      const transaction = await storage.getRazorpayTransactionByOrderId(req.params.orderId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });

  // Admin: Get all Razorpay transactions
  app.get("/api/admin/razorpay/transactions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const transactions = await storage.getRazorpayTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching Razorpay transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // =====================
  // Pricing Tiers Routes
  // =====================

  // Get all pricing tiers
}
