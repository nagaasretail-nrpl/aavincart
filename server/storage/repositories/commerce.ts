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
import { MerchantRepository } from './merchants';

export abstract class CommerceRepository extends MerchantRepository {
  async getPayouts(merchantId?: string, status?: string): Promise<Payout[]> {
    let results = Array.from(this.payouts.values());
    if (merchantId) {
      results = results.filter(payout => payout.merchantId === merchantId);
    }
    if (status) {
      results = results.filter(payout => payout.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.requestDate!).getTime() - new Date(a.requestDate!).getTime()
    );
  }

  async getPayout(id: string): Promise<Payout | undefined> {
    return this.payouts.get(id);
  }

  async createPayout(payout: InsertPayout): Promise<Payout> {
    const id = randomUUID();
    const now = new Date();
    const newPayout: Payout = {
      ...payout,
      id,
      processedAmount: payout.processedAmount || "0.00",
      fees: payout.fees || "0.00",
      notes: payout.notes || null,
      processedDate: payout.processedDate || null,
      status: payout.status || "pending",
      paymentMethod: payout.paymentMethod || "",
      requestDate: now,
      createdAt: now,
      updatedAt: now,
    };
    this.payouts.set(id, newPayout);
    return newPayout;
  }

  async updatePayout(id: string, payout: Partial<InsertPayout>): Promise<Payout | undefined> {
    const existing = this.payouts.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...payout,
      updatedAt: new Date(),
    };
    this.payouts.set(id, updated);
    return updated;
  }

  async deletePayout(id: string): Promise<boolean> {
    return this.payouts.delete(id);
  }

  // Reservations CRUD
  async getReservations(merchantId?: string, status?: string): Promise<Reservation[]> {
    let results = Array.from(this.reservations.values());
    if (merchantId) {
      results = results.filter(reservation => reservation.merchantId === merchantId);
    }
    if (status) {
      results = results.filter(reservation => reservation.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const id = randomUUID();
    const now = new Date();
    const newReservation: Reservation = {
      ...reservation,
      id,
      tableNumber: reservation.tableNumber || null,
      specialRequests: reservation.specialRequests || null,
      status: reservation.status || "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.reservations.set(id, newReservation);
    return newReservation;
  }

  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const existing = this.reservations.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...reservation,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  async deleteReservation(id: string): Promise<boolean> {
    return this.reservations.delete(id);
  }

  // Promos CRUD
  async getPromos(status?: string): Promise<Promo[]> {
    let results = Array.from(this.promos.values());
    if (status) {
      results = results.filter(promo => promo.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getPromo(id: string): Promise<Promo | undefined> {
    return this.promos.get(id);
  }

  async createPromo(promo: InsertPromo): Promise<Promo> {
    const id = randomUUID();
    const now = new Date();
    const newPromo: Promo = {
      ...promo,
      id,
      description: promo.description || null,
      minimumOrderAmount: promo.minimumOrderAmount || "0.00",
      maximumDiscount: promo.maximumDiscount || "0.00",
      usageLimit: promo.usageLimit || 0,
      usedCount: promo.usedCount || 0,
      applicableFor: promo.applicableFor || "all",
      merchantIds: promo.merchantIds || null,
      status: promo.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.promos.set(id, newPromo);
    return newPromo;
  }

  async updatePromo(id: string, promo: Partial<InsertPromo>): Promise<Promo | undefined> {
    const existing = this.promos.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...promo,
      updatedAt: new Date(),
    };
    this.promos.set(id, updated);
    return updated;
  }

  async deletePromo(id: string): Promise<boolean> {
    return this.promos.delete(id);
  }

  // Notifications CRUD
  async getNotifications(targetType?: string, targetId?: string): Promise<Notification[]> {
    let results = Array.from(this.notifications.values());
    if (targetType) {
      results = results.filter(notification => notification.targetType === targetType);
    }
    if (targetId) {
      results = results.filter(notification => notification.targetId === targetId);
    }
    return results.sort((a, b) => 
      new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime()
    );
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const now = new Date();
    const newNotification: Notification = {
      ...notification,
      id,
      targetId: notification.targetId || null,
      orderId: notification.orderId || null,
      merchantId: notification.merchantId || null,
      isRead: notification.isRead || false,
      readAt: notification.readAt || null,
      sentAt: now,
      createdAt: now,
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...notification,
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      isRead: true,
      readAt: new Date(),
    };
    this.notifications.set(id, updated);
    return updated;
  }

  // Earnings CRUD
  async getEarnings(merchantId?: string, status?: string): Promise<Earning[]> {
    let results = Array.from(this.earnings.values());
    if (merchantId) {
      results = results.filter(earning => earning.merchantId === merchantId);
    }
    if (status) {
      results = results.filter(earning => earning.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime()
    );
  }

  async getEarning(id: string): Promise<Earning | undefined> {
    return this.earnings.get(id);
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    const id = randomUUID();
    const now = new Date();
    const newEarning: Earning = {
      ...earning,
      id,
      payoutId: earning.payoutId || null,
      paidAt: earning.paidAt || null,
      status: earning.status || "pending",
      earnedAt: now,
      createdAt: now,
    };
    this.earnings.set(id, newEarning);
    return newEarning;
  }

  async updateEarning(id: string, earning: Partial<InsertEarning>): Promise<Earning | undefined> {
    const existing = this.earnings.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...earning,
    };
    this.earnings.set(id, updated);
    return updated;
  }

  async deleteEarning(id: string): Promise<boolean> {
    return this.earnings.delete(id);
  }

  // Attributes CRUD
  async getAttributes(isActive?: boolean): Promise<Attribute[]> {
    let results = Array.from(this.attributes.values());
    if (typeof isActive === 'boolean') {
      results = results.filter(attribute => attribute.isActive === isActive);
    }
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getAttribute(id: string): Promise<Attribute | undefined> {
    return this.attributes.get(id);
  }

  async createAttribute(attribute: InsertAttribute): Promise<Attribute> {
    const id = randomUUID();
    const now = new Date();
    const newAttribute: Attribute = {
      ...attribute,
      id,
      options: attribute.options || null,
      isRequired: attribute.isRequired || false,
      isActive: attribute.isActive || true,
      sortOrder: attribute.sortOrder || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.attributes.set(id, newAttribute);
    return newAttribute;
  }

  async updateAttribute(id: string, attribute: Partial<InsertAttribute>): Promise<Attribute | undefined> {
    const existing = this.attributes.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...attribute,
      updatedAt: new Date(),
    };
    this.attributes.set(id, updated);
    return updated;
  }

  async deleteAttribute(id: string): Promise<boolean> {
    return this.attributes.delete(id);
  }

  // Marketing Campaigns CRUD
  async getMarketingCampaigns(status?: string): Promise<MarketingCampaign[]> {
    let results = Array.from(this.marketingCampaigns.values());
    if (status) {
      results = results.filter(campaign => campaign.status === status);
    }
    return results.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    return this.marketingCampaigns.get(id);
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const id = randomUUID();
    const now = new Date();
    const newCampaign: MarketingCampaign = {
      ...campaign,
      id,
      description: campaign.description || null,
      subject: campaign.subject || null,
      scheduledAt: campaign.scheduledAt || null,
      sentAt: campaign.sentAt || null,
      recipientCount: campaign.recipientCount || 0,
      deliveredCount: campaign.deliveredCount || 0,
      openCount: campaign.openCount || 0,
      clickCount: campaign.clickCount || 0,
      status: campaign.status || "draft",
      createdAt: now,
      updatedAt: now,
    };
    this.marketingCampaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateMarketingCampaign(id: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined> {
    const existing = this.marketingCampaigns.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...campaign,
      updatedAt: new Date(),
    };
    this.marketingCampaigns.set(id, updated);
    return updated;
  }

  async deleteMarketingCampaign(id: string): Promise<boolean> {
    return this.marketingCampaigns.delete(id);
  }

  // Payment Gateway methods
}
