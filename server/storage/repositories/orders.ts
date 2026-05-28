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
import { StorageBase } from '../base';

export abstract class OrderRepository extends StorageBase {
  async getOrders(restaurantId?: string): Promise<Order[]> {
    try {
      if (restaurantId) {
        const results = await db.select().from(ordersTable)
          .where(eq(ordersTable.restaurantId, restaurantId))
          .orderBy(desc(ordersTable.createdAt));
        return results as Order[];
      }
      const results = await db.select().from(ordersTable)
        .orderBy(desc(ordersTable.createdAt));
      return results as Order[];
    } catch (error) {
      console.error("Error fetching orders from DB:", error);
      return [];
    }
  }

  async getOrdersByPhone(phone: string, email?: string): Promise<Order[]> {
    try {
      const conditions: any[] = [];
      if (phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        const last10 = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
        conditions.push(like(ordersTable.customerPhone, `%${last10}%`));
      }
      if (email) {
        conditions.push(eq(ordersTable.customerEmail, email));
      }
      if (conditions.length === 0) return [];
      const results = await db.select().from(ordersTable)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions))
        .orderBy(desc(ordersTable.createdAt));
      return results as Order[];
    } catch (error) {
      console.error("Error fetching orders by phone/email:", error);
      return [];
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const results = await db.select().from(ordersTable)
        .where(eq(ordersTable.id, id));
      return results[0] as Order | undefined;
    } catch (error) {
      console.error("Error fetching order:", error);
      return undefined;
    }
  }

  async createMasterOrder(masterOrder: InsertMasterOrder): Promise<MasterOrder> {
    try {
      const [created] = await db.insert(masterOrders).values({
        ...masterOrder,
        status: masterOrder.status ?? "open",
      }).returning();
      const displayId = `ORD${String(created.masterOrderNumber).padStart(4, '0')}`;
      const [updated] = await db.update(masterOrders)
        .set({ displayId })
        .where(eq(masterOrders.id, created.id))
        .returning();
      return updated as MasterOrder;
    } catch (error) {
      console.error("Error creating master order:", error);
      throw error;
    }
  }

  async getMasterOrder(id: string): Promise<MasterOrder | undefined> {
    try {
      const [result] = await db.select().from(masterOrders).where(eq(masterOrders.id, id));
      return result as MasterOrder | undefined;
    } catch (error) {
      console.error("Error getting master order:", error);
      return undefined;
    }
  }

  async getMasterOrders(restaurantId?: string): Promise<MasterOrder[]> {
    try {
      if (restaurantId) {
        return await db.select().from(masterOrders)
          .where(eq(masterOrders.restaurantId, restaurantId))
          .orderBy(desc(masterOrders.createdAt)) as MasterOrder[];
      }
      return await db.select().from(masterOrders)
        .orderBy(desc(masterOrders.createdAt)) as MasterOrder[];
    } catch (error) {
      console.error("Error getting master orders:", error);
      return [];
    }
  }

  async updateMasterOrder(id: string, data: Partial<InsertMasterOrder>): Promise<MasterOrder | undefined> {
    try {
      const [updated] = await db.update(masterOrders)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(masterOrders.id, id))
        .returning();
      return updated as MasterOrder | undefined;
    } catch (error) {
      console.error("Error updating master order:", error);
      return undefined;
    }
  }

  async getSegmentOrders(masterOrderId: string): Promise<Order[]> {
    try {
      return await db.select().from(ordersTable)
        .where(eq(ordersTable.masterOrderId, masterOrderId))
        .orderBy(ordersTable.productSegment) as Order[];
    } catch (error) {
      console.error("Error getting segment orders:", error);
      return [];
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    try {
      const [newOrder] = await db.insert(ordersTable).values({
        ...order,
        status: order.status ?? "pending",
        orderType: order.orderType ?? "delivery",
        deliveryInstructions: order.deliveryInstructions ?? null,
      }).returning();
      return newOrder as Order;
    } catch (error) {
      console.error("Error creating order in DB:", error);
      throw error;
    }
  }

  async updateOrder(id: string, data: Partial<InsertOrder & { ewayBillId?: string }>): Promise<Order | undefined> {
    try {
      const [updated] = await db.update(ordersTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();
      return updated as Order | undefined;
    } catch (error) {
      console.error("Error updating order:", error);
      return undefined;
    }
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    try {
      const [updated] = await db.update(ordersTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();
      return updated as Order | undefined;
    } catch (error) {
      console.error("Error updating order status:", error);
      return undefined;
    }
  }

  async updateOrderWorkflowStatus(id: string, workflowStatus: string): Promise<Order | undefined> {
    try {
      const timestampField: Record<string, any> = {};
      const now = new Date();
      if (workflowStatus === 'marketing_approved') timestampField.managerAssignedAt = now;
      if (workflowStatus === 'production_approved') timestampField.productionApprovedAt = now;
      if (workflowStatus === 'packing_approved') timestampField.packingStartedAt = now;
      if (workflowStatus === 'assigned_to_delivery') timestampField.assignedToDeliveryAt = now;
      if (workflowStatus === 'out_for_delivery') timestampField.deliveryStartedAt = now;
      if (workflowStatus === 'delivered') timestampField.deliveredAt = now;
      if (workflowStatus === 'customer_acknowledged') timestampField.acknowledgedAt = now;

      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'marketing_approved': 'confirmed',
        'production_approved': 'confirmed',
        'packing_approved': 'preparing',
        'assigned_to_delivery': 'out_for_delivery',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered',
        'customer_acknowledged': 'delivered',
        'cancelled': 'cancelled',
      };

      const [updated] = await db.update(ordersTable)
        .set({
          workflowStatus,
          status: statusMap[workflowStatus] || workflowStatus,
          ...timestampField,
          updatedAt: now,
        })
        .where(eq(ordersTable.id, id))
        .returning();

      if (updated && workflowStatus === 'delivered' && updated.masterOrderId) {
        const segmentOrders = await this.getSegmentOrders(updated.masterOrderId);
        const allDelivered = segmentOrders.every(o => o.workflowStatus === 'delivered');
        const deliveredCount = segmentOrders.filter(o => o.workflowStatus === 'delivered').length;
        await this.updateMasterOrder(updated.masterOrderId, {
          deliveredCount,
          status: allDelivered ? 'closed' : 'open',
        } as any);
      }

      return updated as Order | undefined;
    } catch (error) {
      console.error("Error updating order workflow status:", error);
      return undefined;
    }
  }

  // Delete methods
}
