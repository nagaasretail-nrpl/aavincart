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
import { UserRepository } from './users';

export abstract class MerchantRepository extends UserRepository {
  async getMerchants(status?: string): Promise<Merchant[]> {
    try {
      if (status) {
        return await db.select().from(merchants).where(eq(merchants.status, status)).orderBy(merchants.createdAt);
      }
      return await db.select().from(merchants).orderBy(merchants.createdAt);
    } catch (error) {
      console.error('Error fetching merchants from database:', error);
      // Fallback to in-memory
      let results = Array.from(this.merchants.values());
      if (status) {
        results = results.filter(merchant => merchant.status === status);
      }
      return results.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
    }
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    try {
      const results = await db.select().from(merchants).where(eq(merchants.id, id));
      return results[0];
    } catch (error) {
      console.error('Error fetching merchant from database:', error);
      return this.merchants.get(id);
    }
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    try {
      const [newMerchant] = await db.insert(merchants).values({
        ...merchant,
        merchantUuid: merchant.merchantUuid || randomUUID(),
      }).returning();
      return newMerchant;
    } catch (error) {
      console.error('Error creating merchant in database:', error);
      // Fallback to in-memory
      const id = randomUUID();
      const now = new Date();
      const newMerchant: Merchant = {
        ...merchant,
        id,
        merchantUuid: merchant.merchantUuid || randomUUID(),
        description: merchant.description || null,
        address: merchant.address || null,
        path: merchant.path || "",
        status: merchant.status || "pending",
        createdAt: now,
        updatedAt: now,
      };
      this.merchants.set(id, newMerchant);
      return newMerchant;
    }
  }

  async updateMerchant(id: string, merchantUpdate: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    try {
      const [updated] = await db.update(merchants)
        .set({ ...merchantUpdate, updatedAt: new Date() })
        .where(eq(merchants.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating merchant in database:', error);
      // Fallback to in-memory
      const existing = this.merchants.get(id);
      if (!existing) return undefined;
      const updated: Merchant = { 
        ...existing, 
        ...merchantUpdate,
        updatedAt: new Date(),
      };
      this.merchants.set(id, updated);
      return updated;
    }
  }

  async deleteMerchant(id: string): Promise<boolean> {
    try {
      const result = await db.delete(merchants).where(eq(merchants.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting merchant from database:', error);
      return this.merchants.delete(id);
    }
  }

  // Clients CRUD
  async getClients(status?: string): Promise<Client[]> {
    let results = Array.from(this.clients.values());
    if (status) {
      results = results.filter(client => client.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.dateCreated!).getTime() - new Date(a.dateCreated!).getTime()
    );
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date();
    const newClient: Client = {
      ...client,
      id,
      clientUuid: client.clientUuid || randomUUID(),
      socialStrategy: client.socialStrategy || "web",
      merchantId: client.merchantId || 0,
      path: client.path || "",
      status: client.status || "active",
      contactPhone: client.contactPhone || "",
      password: client.password || "",
      lastLogin: client.lastLogin || null,
      ipAddress: client.ipAddress || "",
      dateCreated: now,
      dateModified: now,
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existing = this.clients.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...client,
      dateModified: new Date(),
    };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Items CRUD
  async getItems(merchantId?: string, status?: string): Promise<Item[]> {
    let results = Array.from(this.items.values());
    if (merchantId) {
      results = results.filter(item => item.merchantId.toString() === merchantId);
    }
    if (status) {
      results = results.filter(item => item.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.dateCreated!).getTime() - new Date(a.dateCreated!).getTime()
    );
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(item: InsertItem): Promise<Item> {
    const id = randomUUID();
    const now = new Date();
    const newItem: Item = {
      ...item,
      id,
      itemName: item.itemName || "",
      slug: item.slug || "",
      itemDescription: item.itemDescription || null,
      itemShortDescription: item.itemShortDescription || "",
      path: item.path || "",
      status: item.status || "active",
      isFeatured: item.isFeatured || "",
      merchantId: item.merchantId || 0,
      ipAddress: item.ipAddress || "",
      dateCreated: now,
      dateModified: now,
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined> {
    const existing = this.items.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...item,
      dateModified: new Date(),
    };
    this.items.set(id, updated);
    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  // Plans CRUD
  async getPlans(status?: string): Promise<Plan[]> {
    let results = Array.from(this.plans.values());
    if (status) {
      results = results.filter(plan => plan.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const id = randomUUID();
    const now = new Date();
    const newPlan: Plan = {
      ...plan,
      id,
      planDescription: plan.planDescription || null,
      planPrice: plan.planPrice || "0.00",
      planDuration: plan.planDuration || 30,
      maxItems: plan.maxItems || 0,
      maxOrders: plan.maxOrders || 0,
      commissionRate: plan.commissionRate || "0.00",
      status: plan.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(id, newPlan);
    return newPlan;
  }

  async updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan | undefined> {
    const existing = this.plans.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...plan,
      updatedAt: new Date(),
    };
    this.plans.set(id, updated);
    return updated;
  }

  async deletePlan(id: string): Promise<boolean> {
    return this.plans.delete(id);
  }

  // Invoices CRUD
  async getInvoices(merchantId?: string, status?: string): Promise<Invoice[]> {
    let results = Array.from(this.invoices.values());
    if (merchantId) {
      results = results.filter(invoice => invoice.merchantId === merchantId);
    }
    if (status) {
      results = results.filter(invoice => invoice.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date();
    const newInvoice: Invoice = {
      ...invoice,
      id,
      invoiceReference: invoice.invoiceReference || `INV-${Date.now()}`,
      status: invoice.status || "unpaid",
      tax: invoice.tax || "0.00",
      paymentMethod: invoice.paymentMethod || "",
      paymentDate: invoice.paymentDate || null,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...invoice,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // B2B Invoices CRUD
  async getB2BInvoices(merchantId: string, startDate?: Date, endDate?: Date): Promise<B2BInvoice[]> {
    try {
      let query = db.select().from(b2bInvoices).where(eq(b2bInvoices.merchantId, merchantId));
      const results = await query.orderBy(desc(b2bInvoices.invoiceDate));
      
      let filtered = results;
      if (startDate) {
        filtered = filtered.filter(inv => new Date(inv.invoiceDate) >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter(inv => new Date(inv.invoiceDate) <= endDate);
      }
      return filtered;
    } catch (error) {
      console.error("Error fetching B2B invoices:", error);
      return [];
    }
  }

  async getB2BInvoice(id: string): Promise<B2BInvoice | undefined> {
    try {
      const result = await db.select().from(b2bInvoices).where(eq(b2bInvoices.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error fetching B2B invoice:", error);
      return undefined;
    }
  }

  async createB2BInvoice(invoice: InsertB2BInvoice): Promise<B2BInvoice> {
    const [created] = await db.insert(b2bInvoices).values({
      ...invoice,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateB2BInvoice(id: string, invoice: Partial<InsertB2BInvoice>): Promise<B2BInvoice | undefined> {
    try {
      const [updated] = await db.update(b2bInvoices)
        .set({ ...invoice, updatedAt: new Date() })
        .where(eq(b2bInvoices.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating B2B invoice:", error);
      return undefined;
    }
  }

  async deleteB2BInvoice(id: string): Promise<boolean> {
    try {
      await db.delete(b2bInvoices).where(eq(b2bInvoices.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting B2B invoice:", error);
      return false;
    }
  }

  async getNextB2BInvoiceNo(merchantId: string, segment: string): Promise<string> {
    try {
      const results = await db.select({ invoiceNo: b2bInvoices.invoiceNo })
        .from(b2bInvoices)
        .where(eq(b2bInvoices.merchantId, merchantId))
        .orderBy(desc(b2bInvoices.createdAt))
        .limit(1);
      
      let nextNum = 1;
      if (results.length > 0 && results[0].invoiceNo) {
        const match = results[0].invoiceNo.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      const prefix = segment === 'Fresh Milk' ? 'FM' : 'WSD';
      return `HO/${prefix}/${nextNum.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      return `HO/WSD/${Date.now()}`;
    }
  }

  // Payouts CRUD
}
