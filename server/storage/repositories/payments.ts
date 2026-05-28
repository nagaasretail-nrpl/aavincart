import {
  type Restaurant, type MenuItem, type Order, type User,
  deliveryPoints as deliveryPointsTable,
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
  cashfreeTransactions, type CashfreePaymentLink, type InsertCashfreePaymentLink,
  cashfreePaymentLinks, type CashfreeSplitVendor, type InsertCashfreeSplitVendor,
  cashfreeSplitVendors, type CashfreeOrderSplit, type InsertCashfreeOrderSplit,
  cashfreeOrderSplits, type CashfreeBeneficiary, type InsertCashfreeBeneficiary,
  cashfreeBeneficiaries, type CashfreePayout, type InsertCashfreePayout,
  cashfreePayouts, type CashfreeSoftposTerminal, type InsertCashfreeSoftposTerminal,
  cashfreeSoftposTerminals, type PricingTier, type InsertPricingTier,
  type EwayBill, type InsertEwayBill, type EwayBillConfig, type InsertEwayBillConfig,
  type EwayBillLog, type InsertEwayBillLog, type HsnCode,
  type GstReturn, type InsertGstReturn, type InsertHsnCode,
  type DelhiveryConfig, type InsertDelhiveryConfig,
  type DelhiveryWarehouse, type InsertDelhiveryWarehouse,
  type DelhiveryShipment, type InsertDelhiveryShipment,
  delhiveryConfig, delhiveryWarehouses, delhiveryShipments,
  type WholesaleDealer, wholesaleDealers,
  type FreshMilkDealer, freshMilkDealers,
  type MediaFile, type InsertMediaFile, mediaFiles,
  type Agent, type InsertAgent, agents,
  type Inventory, type InsertInventory, type InventoryTransaction,
  type InsertInventoryTransaction, inventory, inventoryTransactions,
  type MasterOrder, type InsertMasterOrder, masterOrders,
  type Wallet, type InsertWallet, type WalletTransaction,
  type InsertWalletTransaction, wallets, walletTransactions,
  type DeliveryConfiguration, type InsertDeliveryConfiguration,
  type DeliveryRoute, type InsertDeliveryRoute,
  type DeliveryEarnings, type InsertDeliveryEarnings,
  deliveryConfiguration, deliveryRoutes, deliveryEarnings,
  type B2BInvoice, type InsertB2BInvoice, b2bInvoices,
  type ApiSetting, type InsertApiSetting, apiSettings,
  type UserHierarchy, type InsertUserHierarchy, userHierarchy,
  type B2bRegistration, type InsertB2bRegistration, b2bRegistrations,
  type B2bApprovalHistory, b2bApprovalHistory,
  type FreshMilkRoute, type InsertFreshMilkRoute,
  type FreshMilkDispatch, type InsertFreshMilkDispatch,
  type FreshMilkDispatchItem, type InsertFreshMilkDispatchItem,
  type FreshMilkReturn, type InsertFreshMilkReturn,
  users, restaurants, menuItems, orders, merchants, clients, items, plans,
  invoices, payouts, reservations, promos, notifications, earnings,
  attributes, marketingCampaigns, paymentGateways, upiTransactions,
  pricingTiers, ewayBills, ewayBillConfig, ewayBillLogs, hsnCodes, gstReturns,
  orders as ordersTable
} from "@shared/schema";
import { eq, desc, asc, like, or, sql, and, inArray } from "drizzle-orm";
import { db } from "../../db";
import { randomUUID } from "crypto";
import { CommerceRepository } from './commerce';

export abstract class PaymentRepository extends CommerceRepository {
  async getPaymentGateways(status?: string): Promise<PaymentGateway[]> {
    let results = Array.from(this.paymentGateways.values());
    
    if (status) {
      results = results.filter(gateway => gateway.status === status);
    }
    
    return results;
  }

  async getPaymentGateway(id: string): Promise<PaymentGateway | undefined> {
    return this.paymentGateways.get(id);
  }

  async createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway> {
    const id = randomUUID();
    const now = new Date();
    const newGateway: PaymentGateway = {
      ...gateway,
      id,
      onlinePayment: gateway.onlinePayment ?? true,
      availableForPayout: gateway.availableForPayout ?? false,
      availableForPlan: gateway.availableForPlan ?? true,
      logoType: gateway.logoType || "image",
      logoImage: gateway.logoImage || "",
      logoClassIcon: gateway.logoClassIcon || "",
      featuredImage: gateway.featuredImage || "",
      isProduction: gateway.isProduction ?? false,
      secretKey: gateway.secretKey || "",
      publishableKey: gateway.publishableKey || "",
      webhooksSigningSecret: gateway.webhooksSigningSecret || "",
      webhooksPlan: gateway.webhooksPlan || "",
      events: gateway.events || "checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, subscription_schedule.canceled",
      status: gateway.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.paymentGateways.set(id, newGateway);
    return newGateway;
  }

  async updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined> {
    const existing = this.paymentGateways.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...gateway,
      updatedAt: new Date(),
    };
    this.paymentGateways.set(id, updated);
    return updated;
  }

  async deletePaymentGateway(id: string): Promise<boolean> {
    return this.paymentGateways.delete(id);
  }

  // UPI Transaction methods
  async getUpiTransactions(orderId?: string, status?: string): Promise<UpiTransaction[]> {
    let results = Array.from(this.upiTransactions.values());
    
    if (orderId) {
      results = results.filter(transaction => transaction.orderId === orderId);
    }
    
    if (status) {
      results = results.filter(transaction => transaction.status === status);
    }
    
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getUpiTransaction(id: string): Promise<UpiTransaction | undefined> {
    return this.upiTransactions.get(id);
  }

  async getUpiTransactionByMerchantId(merchantTransactionId: string): Promise<UpiTransaction | undefined> {
    return Array.from(this.upiTransactions.values()).find(
      transaction => transaction.merchantTransactionId === merchantTransactionId
    );
  }

  async createUpiTransaction(transaction: InsertUpiTransaction): Promise<UpiTransaction> {
    const id = randomUUID();
    const now = new Date();
    const newTransaction: UpiTransaction = {
      ...transaction,
      id,
      currency: transaction.currency || "INR",
      status: transaction.status || "pending",
      payerVPA: transaction.payerVPA || null,
      payeeVPA: transaction.payeeVPA || null,
      qrCodeData: transaction.qrCodeData || null,
      failureReason: transaction.failureReason || null,
      completedAt: transaction.completedAt || null,
      expiresAt: transaction.expiresAt || null,
      webhookData: transaction.webhookData || null,
      initiatedAt: transaction.initiatedAt || now,
      createdAt: now,
      updatedAt: now,
    };
    this.upiTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateUpiTransaction(id: string, transaction: Partial<InsertUpiTransaction>): Promise<UpiTransaction | undefined> {
    const existing = this.upiTransactions.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...transaction,
      updatedAt: new Date(),
    };
    this.upiTransactions.set(id, updated);
    return updated;
  }

  async deleteUpiTransaction(id: string): Promise<boolean> {
    return this.upiTransactions.delete(id);
  }

  // Razorpay Transaction methods
  async getRazorpayTransactions(): Promise<RazorpayTransaction[]> {
    return Array.from(this.razorpayTransactions.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getRazorpayTransaction(id: string): Promise<RazorpayTransaction | undefined> {
    return this.razorpayTransactions.get(id);
  }

  async getRazorpayTransactionByOrderId(razorpayOrderId: string): Promise<RazorpayTransaction | undefined> {
    return Array.from(this.razorpayTransactions.values()).find(t => t.razorpayOrderId === razorpayOrderId);
  }

  async getRazorpayTransactionByPaymentId(razorpayPaymentId: string): Promise<RazorpayTransaction | undefined> {
    return Array.from(this.razorpayTransactions.values()).find(t => t.razorpayPaymentId === razorpayPaymentId);
  }

  async createRazorpayTransaction(transaction: InsertRazorpayTransaction): Promise<RazorpayTransaction> {
    const id = crypto.randomUUID();
    const newTransaction: RazorpayTransaction = {
      id,
      ...transaction,
      razorpayPaymentId: transaction.razorpayPaymentId || null,
      razorpaySignature: transaction.razorpaySignature || null,
      currency: transaction.currency || 'INR',
      status: transaction.status || 'created',
      paymentMethod: transaction.paymentMethod || null,
      bankName: transaction.bankName || null,
      cardLast4: transaction.cardLast4 || null,
      vpa: transaction.vpa || null,
      email: transaction.email || null,
      contact: transaction.contact || null,
      errorCode: transaction.errorCode || null,
      errorDescription: transaction.errorDescription || null,
      errorReason: transaction.errorReason || null,
      notes: transaction.notes || null,
      webhookData: transaction.webhookData || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      capturedAt: transaction.capturedAt || null
    };
    this.razorpayTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateRazorpayTransaction(id: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined> {
    const existing = this.razorpayTransactions.get(id);
    if (!existing) return undefined;
    const updated: RazorpayTransaction = {
      ...existing,
      ...transaction,
      updatedAt: new Date()
    };
    this.razorpayTransactions.set(id, updated);
    return updated;
  }

  async updateRazorpayTransactionByOrderId(razorpayOrderId: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined> {
    const existing = await this.getRazorpayTransactionByOrderId(razorpayOrderId);
    if (!existing) return undefined;
    return this.updateRazorpayTransaction(existing.id, transaction);
  }

  async updateRazorpayTransactionByPaymentId(razorpayPaymentId: string, transaction: Partial<InsertRazorpayTransaction>): Promise<RazorpayTransaction | undefined> {
    const existing = await this.getRazorpayTransactionByPaymentId(razorpayPaymentId);
    if (!existing) return undefined;
    return this.updateRazorpayTransaction(existing.id, transaction);
  }

  // Cashfree Transactions - Database operations
  async getCashfreeTransactions(): Promise<CashfreeTransaction[]> {
    try {
      return await db.select().from(cashfreeTransactions).orderBy(desc(cashfreeTransactions.createdAt));
    } catch { return []; }
  }

  async getCashfreeTransactionByCfOrderId(cfOrderId: string): Promise<CashfreeTransaction | undefined> {
    try {
      const [tx] = await db.select().from(cashfreeTransactions).where(eq(cashfreeTransactions.cfOrderId, cfOrderId));
      return tx;
    } catch { return undefined; }
  }

  async createCashfreeTransaction(tx: InsertCashfreeTransaction): Promise<CashfreeTransaction> {
    const [created] = await db.insert(cashfreeTransactions).values(tx).returning();
    return created;
  }

  async updateCashfreeTransaction(id: number, tx: Partial<InsertCashfreeTransaction>): Promise<CashfreeTransaction | undefined> {
    const [updated] = await db.update(cashfreeTransactions).set({ ...tx, updatedAt: new Date() }).where(eq(cashfreeTransactions.id, id)).returning();
    return updated;
  }

  async updateCashfreeTransactionByCfOrderId(cfOrderId: string, tx: Partial<InsertCashfreeTransaction>): Promise<CashfreeTransaction | undefined> {
    const existing = await this.getCashfreeTransactionByCfOrderId(cfOrderId);
    if (!existing) return undefined;
    return this.updateCashfreeTransaction(existing.id, tx);
  }

  // Cashfree Payment Links - Database operations
  async getCashfreePaymentLinks(): Promise<CashfreePaymentLink[]> {
    try {
      return await db.select().from(cashfreePaymentLinks).orderBy(desc(cashfreePaymentLinks.createdAt));
    } catch { return []; }
  }

  async getCashfreePaymentLink(linkId: string): Promise<CashfreePaymentLink | undefined> {
    try {
      const [link] = await db.select().from(cashfreePaymentLinks).where(eq(cashfreePaymentLinks.linkId, linkId));
      return link;
    } catch { return undefined; }
  }

  async createCashfreePaymentLink(link: InsertCashfreePaymentLink): Promise<CashfreePaymentLink> {
    const [created] = await db.insert(cashfreePaymentLinks).values(link).returning();
    return created;
  }

  async updateCashfreePaymentLink(linkId: string, link: Partial<InsertCashfreePaymentLink>): Promise<CashfreePaymentLink | undefined> {
    const [updated] = await db.update(cashfreePaymentLinks).set({ ...link, updatedAt: new Date() }).where(eq(cashfreePaymentLinks.linkId, linkId)).returning();
    return updated;
  }

  // Cashfree Split Vendors - Database operations
  async getCashfreeSplitVendors(): Promise<CashfreeSplitVendor[]> {
    try {
      return await db.select().from(cashfreeSplitVendors).orderBy(desc(cashfreeSplitVendors.createdAt));
    } catch { return []; }
  }

  async getCashfreeSplitVendor(vendorId: string): Promise<CashfreeSplitVendor | undefined> {
    try {
      const [v] = await db.select().from(cashfreeSplitVendors).where(eq(cashfreeSplitVendors.vendorId, vendorId));
      return v;
    } catch { return undefined; }
  }

  async createCashfreeSplitVendor(vendor: InsertCashfreeSplitVendor): Promise<CashfreeSplitVendor> {
    const [created] = await db.insert(cashfreeSplitVendors).values(vendor).returning();
    return created;
  }

  async updateCashfreeSplitVendor(vendorId: string, vendor: Partial<InsertCashfreeSplitVendor>): Promise<CashfreeSplitVendor | undefined> {
    const [updated] = await db.update(cashfreeSplitVendors).set({ ...vendor, updatedAt: new Date() }).where(eq(cashfreeSplitVendors.vendorId, vendorId)).returning();
    return updated;
  }

  // Cashfree Order Splits - Database operations
  async getCashfreeOrderSplits(orderId?: string): Promise<CashfreeOrderSplit[]> {
    try {
      if (orderId) {
        return await db.select().from(cashfreeOrderSplits).where(eq(cashfreeOrderSplits.orderId, orderId));
      }
      return await db.select().from(cashfreeOrderSplits).orderBy(desc(cashfreeOrderSplits.createdAt));
    } catch { return []; }
  }

  async createCashfreeOrderSplit(split: InsertCashfreeOrderSplit): Promise<CashfreeOrderSplit> {
    const [created] = await db.insert(cashfreeOrderSplits).values(split).returning();
    return created;
  }

  // Cashfree Beneficiaries - Database operations
  async getCashfreeBeneficiaries(): Promise<CashfreeBeneficiary[]> {
    try {
      return await db.select().from(cashfreeBeneficiaries).orderBy(desc(cashfreeBeneficiaries.createdAt));
    } catch { return []; }
  }

  async getCashfreeBeneficiary(beneId: string): Promise<CashfreeBeneficiary | undefined> {
    try {
      const [b] = await db.select().from(cashfreeBeneficiaries).where(eq(cashfreeBeneficiaries.beneId, beneId));
      return b;
    } catch { return undefined; }
  }

  async createCashfreeBeneficiary(bene: InsertCashfreeBeneficiary): Promise<CashfreeBeneficiary> {
    const [created] = await db.insert(cashfreeBeneficiaries).values(bene).returning();
    return created;
  }

  async deleteCashfreeBeneficiary(beneId: string): Promise<boolean> {
    try {
      await db.delete(cashfreeBeneficiaries).where(eq(cashfreeBeneficiaries.beneId, beneId));
      return true;
    } catch { return false; }
  }

  // Cashfree Payouts - Database operations
  async getCashfreePayouts(): Promise<CashfreePayout[]> {
    try {
      return await db.select().from(cashfreePayouts).orderBy(desc(cashfreePayouts.createdAt));
    } catch { return []; }
  }

  async getCashfreePayout(transferId: string): Promise<CashfreePayout | undefined> {
    try {
      const [p] = await db.select().from(cashfreePayouts).where(eq(cashfreePayouts.transferId, transferId));
      return p;
    } catch { return undefined; }
  }

  async createCashfreePayout(payout: InsertCashfreePayout): Promise<CashfreePayout> {
    const [created] = await db.insert(cashfreePayouts).values(payout).returning();
    return created;
  }

  async updateCashfreePayout(transferId: string, payout: Partial<InsertCashfreePayout>): Promise<CashfreePayout | undefined> {
    const [updated] = await db.update(cashfreePayouts).set({ ...payout, updatedAt: new Date() }).where(eq(cashfreePayouts.transferId, transferId)).returning();
    return updated;
  }

  // Cashfree SoftPOS Terminals - Database operations
  async getCashfreeSoftposTerminals(merchantId?: string): Promise<CashfreeSoftposTerminal[]> {
    try {
      if (merchantId) {
        return await db.select().from(cashfreeSoftposTerminals).where(eq(cashfreeSoftposTerminals.merchantId, merchantId));
      }
      return await db.select().from(cashfreeSoftposTerminals).orderBy(desc(cashfreeSoftposTerminals.createdAt));
    } catch { return []; }
  }

  async createCashfreeSoftposTerminal(terminal: InsertCashfreeSoftposTerminal): Promise<CashfreeSoftposTerminal> {
    const [created] = await db.insert(cashfreeSoftposTerminals).values(terminal).returning();
    return created;
  }

  // Pricing Tiers - Database operations
}
