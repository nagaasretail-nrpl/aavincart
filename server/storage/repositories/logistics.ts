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
import { PaymentRepository } from './payments';

export abstract class LogisticsRepository extends PaymentRepository {
  async getPricingTiers(isActive?: boolean): Promise<PricingTier[]> {
    try {
      let query = db.select().from(pricingTiers);
      if (isActive !== undefined) {
        query = query.where(eq(pricingTiers.isActive, isActive)) as any;
      }
      const tiers = await query.orderBy(pricingTiers.sortOrder);
      return tiers;
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      return [];
    }
  }

  async getPricingTier(id: string): Promise<PricingTier | undefined> {
    try {
      const [tier] = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
      return tier;
    } catch (error) {
      console.error('Error fetching pricing tier:', error);
      return undefined;
    }
  }

  async getPricingTierByCode(tierCode: string): Promise<PricingTier | undefined> {
    try {
      const [tier] = await db.select().from(pricingTiers).where(eq(pricingTiers.tierCode, tierCode));
      return tier;
    } catch (error) {
      console.error('Error fetching pricing tier by code:', error);
      return undefined;
    }
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const [created] = await db.insert(pricingTiers).values(tier).returning();
    return created;
  }

  async updatePricingTier(id: string, tier: Partial<InsertPricingTier>): Promise<PricingTier | undefined> {
    try {
      const [updated] = await db.update(pricingTiers).set({ ...tier, updatedAt: new Date() }).where(eq(pricingTiers.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('Error updating pricing tier:', error);
      return undefined;
    }
  }

  async deletePricingTier(id: string): Promise<boolean> {
    try {
      await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting pricing tier:', error);
      return false;
    }
  }

  async calculateTierPrice(mrp: number, tierCode: string, productPrices?: { federationPrice?: number; districtUnionPrice?: number; wholesalePrice?: number; retailPrice?: number }): Promise<number> {
    const tier = await this.getPricingTierByCode(tierCode);
    if (!tier) {
      return mrp; // Default to MRP if tier not found
    }

    const formula = tier.formula;
    const discountPercent = tier.discountPercent ? parseFloat(tier.discountPercent) : 0;
    const basePrice = tier.basePrice;

    // Determine the base amount based on tier configuration
    let baseAmount = mrp;
    if (basePrice === 'federation' && productPrices?.federationPrice) {
      baseAmount = productPrices.federationPrice;
    } else if (basePrice === 'district_union' && productPrices?.districtUnionPrice) {
      baseAmount = productPrices.districtUnionPrice;
    } else if (basePrice === 'wholesale' && productPrices?.wholesalePrice) {
      baseAmount = productPrices.wholesalePrice;
    } else if (basePrice === 'retail' && productPrices?.retailPrice) {
      baseAmount = productPrices.retailPrice;
    }

    // Apply formula-based calculation
    if (formula === 'MRP') {
      return mrp;
    } else if (formula === 'FEDERATION_PRICE') {
      return productPrices?.federationPrice || mrp;
    } else if (formula === 'INTER_UNION_PRICE') {
      return productPrices?.districtUnionPrice || mrp;
    } else if (formula === 'WHOLESALE_PRICE') {
      return productPrices?.wholesalePrice || mrp;
    } else if (formula.startsWith('MRP-') && formula.endsWith('%')) {
      // Formula like "MRP-40%" means MRP minus 40%
      const calculatedPrice = mrp * (1 - discountPercent / 100);
      return Math.round(calculatedPrice * 100) / 100; // Round to 2 decimal places
    }

    // Default: apply discount percentage from MRP
    if (discountPercent > 0) {
      return Math.round(mrp * (1 - discountPercent / 100) * 100) / 100;
    }

    return baseAmount;
  }

  // Seed products to database if empty
  async seedProductsToDatabase(): Promise<void> {
    try {
      const existingProducts = await db.select().from(menuItems).limit(1);
      if (existingProducts.length > 0) {
        return;
      }

      const productsToSeed = Array.from(this.menuItems.values());
      
      for (const product of productsToSeed) {
        await db.insert(menuItems).values({
          id: product.id,
          restaurantId: product.restaurantId,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image: product.image,
          isAvailable: product.isAvailable,
          productCode: product.productCode,
          subcategory: product.subcategory,
          gstPercent: product.gstPercent,
          federationPrice: product.federationPrice,
          districtUnionPrice: product.districtUnionPrice,
          wholesalePrice: product.wholesalePrice,
          retailPrice: product.retailPrice,
          mrp: product.mrp,
          unitSize: product.unitSize,
          unitType: product.unitType,
        });
      }
    } catch (error) {
      console.error('Error seeding products to database:', error);
    }
  }

  // E-way Bill Methods
  async getEwayBills(filters?: { status?: string; merchantId?: string; fromDate?: Date; toDate?: Date; search?: string }): Promise<EwayBill[]> {
    try {
      let query = db.select().from(ewayBills).orderBy(desc(ewayBills.createdAt));
      const results = await query;
      
      let filtered = results;
      if (filters?.status) {
        filtered = filtered.filter(e => e.status === filters.status);
      }
      if (filters?.merchantId) {
        filtered = filtered.filter(e => e.merchantId === filters.merchantId);
      }
      if (filters?.fromDate) {
        filtered = filtered.filter(e => e.createdAt && new Date(e.createdAt) >= filters.fromDate!);
      }
      if (filters?.toDate) {
        filtered = filtered.filter(e => e.createdAt && new Date(e.createdAt) <= filters.toDate!);
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(e => 
          e.ewayBillNumber?.toLowerCase().includes(search) ||
          e.docNo.toLowerCase().includes(search) ||
          e.toTradeName.toLowerCase().includes(search)
        );
      }
      
      return filtered;
    } catch (error) {
      console.error('Error getting E-way bills:', error);
      return [];
    }
  }

  async getEwayBillById(id: string): Promise<EwayBill | undefined> {
    try {
      const result = await db.select().from(ewayBills).where(eq(ewayBills.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting E-way bill:', error);
      return undefined;
    }
  }

  async createEwayBill(ewayBill: InsertEwayBill): Promise<EwayBill> {
    const [created] = await db.insert(ewayBills).values({
      ...ewayBill,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateEwayBill(id: string, ewayBillUpdate: Partial<InsertEwayBill>): Promise<EwayBill | undefined> {
    try {
      const [updated] = await db.update(ewayBills)
        .set({ ...ewayBillUpdate, updatedAt: new Date() })
        .where(eq(ewayBills.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating E-way bill:', error);
      return undefined;
    }
  }

  async deleteEwayBill(id: string): Promise<boolean> {
    try {
      await db.delete(ewayBills).where(eq(ewayBills.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting E-way bill:', error);
      return false;
    }
  }

  async getEwayBillStats(): Promise<{ total: number; active: number; expired: number; cancelled: number; draft: number }> {
    try {
      const all = await db.select().from(ewayBills);
      const now = new Date();
      
      return {
        total: all.length,
        active: all.filter(e => e.status === 'active' || e.status === 'extended').length,
        expired: all.filter(e => e.status === 'expired' || (e.validUntil && new Date(e.validUntil) < now && e.status === 'active')).length,
        cancelled: all.filter(e => e.status === 'cancelled').length,
        draft: all.filter(e => e.status === 'draft' || e.status === 'pending').length,
      };
    } catch (error) {
      console.error('Error getting E-way bill stats:', error);
      return { total: 0, active: 0, expired: 0, cancelled: 0, draft: 0 };
    }
  }

  // E-way Bill Configuration
  async getEwayBillConfig(merchantId?: string): Promise<EwayBillConfig | undefined> {
    try {
      if (merchantId) {
        const result = await db.select().from(ewayBillConfig).where(eq(ewayBillConfig.merchantId, merchantId)).limit(1);
        if (result[0]) return result[0];
      }
      // Return global config if no merchant-specific config
      const globalResult = await db.select().from(ewayBillConfig).limit(1);
      return globalResult[0];
    } catch (error) {
      console.error('Error getting E-way bill config:', error);
      return undefined;
    }
  }

  async saveEwayBillConfig(config: InsertEwayBillConfig): Promise<EwayBillConfig> {
    // Check if config exists for this merchant or global
    const existing = await this.getEwayBillConfig(config.merchantId || undefined);
    
    if (existing) {
      const [updated] = await db.update(ewayBillConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(ewayBillConfig.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(ewayBillConfig).values({
      ...config,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // E-way Bill Logs
  async getEwayBillLogs(ewayBillId?: string): Promise<EwayBillLog[]> {
    try {
      if (ewayBillId) {
        return await db.select().from(ewayBillLogs)
          .where(eq(ewayBillLogs.ewayBillId, ewayBillId))
          .orderBy(desc(ewayBillLogs.createdAt));
      }
      return await db.select().from(ewayBillLogs).orderBy(desc(ewayBillLogs.createdAt));
    } catch (error) {
      console.error('Error getting E-way bill logs:', error);
      return [];
    }
  }

  async createEwayBillLog(log: InsertEwayBillLog): Promise<EwayBillLog> {
    const [created] = await db.insert(ewayBillLogs).values({
      ...log,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // HSN Codes
  async getHsnCodes(category?: string, search?: string): Promise<HsnCode[]> {
    try {
      const results = await db.select().from(hsnCodes);
      let filtered = results.filter(h => h.isActive);
      
      if (category) {
        filtered = filtered.filter(h => h.category === category);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(h => 
          h.hsnCode.toLowerCase().includes(searchLower) ||
          h.description.toLowerCase().includes(searchLower)
        );
      }
      
      return filtered;
    } catch (error) {
      console.error('Error getting HSN codes:', error);
      return [];
    }
  }

  async getHsnCode(hsnCode: string): Promise<HsnCode | undefined> {
    try {
      const result = await db.select().from(hsnCodes).where(eq(hsnCodes.hsnCode, hsnCode)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting HSN code:', error);
      return undefined;
    }
  }

  async createHsnCode(hsnCodeData: InsertHsnCode): Promise<HsnCode> {
    const [created] = await db.insert(hsnCodes).values({
      ...hsnCodeData,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // Order by ID helper
  async getOrderById(id: string): Promise<Order | undefined> {
    try {
      const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  // GST Returns Implementation
  async getGstReturnsByMerchant(merchantId: string): Promise<GstReturn[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM gst_returns 
        WHERE merchant_id = ${merchantId}
        ORDER BY period_year DESC, period_month DESC
      `);
      return result.rows as GstReturn[];
    } catch (error) {
      console.error('Error getting GST returns:', error);
      return [];
    }
  }

  async getGstReturnById(id: string): Promise<GstReturn | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM gst_returns WHERE id = ${id}
      `);
      return result.rows[0] as GstReturn;
    } catch (error) {
      console.error('Error getting GST return:', error);
      return undefined;
    }
  }

  async getGstReturnByPeriod(merchantId: string, month: number, year: number): Promise<GstReturn | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM gst_returns 
        WHERE merchant_id = ${merchantId} 
        AND period_month = ${month} 
        AND period_year = ${year}
      `);
      return result.rows[0] as GstReturn;
    } catch (error) {
      console.error('Error getting GST return by period:', error);
      return undefined;
    }
  }

  async createGstReturn(gstReturn: Partial<InsertGstReturn>): Promise<GstReturn> {
    try {
      const result = await db.execute(sql`
        INSERT INTO gst_returns (
          merchant_id, gstin, return_type, period_month, period_year, status,
          total_invoices, total_taxable_value, total_cgst, total_sgst, total_igst,
          total_cess, total_tax, b2b_data, b2c_data, hsn_summary, generated_at
        ) VALUES (
          ${gstReturn.merchantId}, ${gstReturn.gstin || ''}, ${gstReturn.returnType || 'GSTR1'},
          ${gstReturn.periodMonth}, ${gstReturn.periodYear}, ${gstReturn.status || 'draft'},
          ${gstReturn.totalInvoices || 0}, ${gstReturn.totalTaxableValue || '0'},
          ${gstReturn.totalCgst || '0'}, ${gstReturn.totalSgst || '0'}, ${gstReturn.totalIgst || '0'},
          ${gstReturn.totalCess || '0'}, ${gstReturn.totalTax || '0'},
          ${JSON.stringify(gstReturn.b2bData || [])}, ${JSON.stringify(gstReturn.b2cData || [])},
          ${JSON.stringify(gstReturn.hsnSummary || [])}, NOW()
        )
        RETURNING *
      `);
      return result.rows[0] as GstReturn;
    } catch (error) {
      console.error('Error creating GST return:', error);
      throw error;
    }
  }

  async updateGstReturn(id: string, gstReturn: Partial<InsertGstReturn>): Promise<GstReturn | undefined> {
    try {
      const setValues: Record<string, unknown> = {};

      if (gstReturn.status !== undefined) setValues.status = gstReturn.status;
      if (gstReturn.totalInvoices !== undefined) setValues.totalInvoices = gstReturn.totalInvoices;
      if (gstReturn.totalTaxableValue !== undefined) setValues.totalTaxableValue = gstReturn.totalTaxableValue;
      if (gstReturn.totalCgst !== undefined) setValues.totalCgst = gstReturn.totalCgst;
      if (gstReturn.totalSgst !== undefined) setValues.totalSgst = gstReturn.totalSgst;
      if (gstReturn.totalIgst !== undefined) setValues.totalIgst = gstReturn.totalIgst;
      if (gstReturn.totalCess !== undefined) setValues.totalCess = gstReturn.totalCess;
      if (gstReturn.totalTax !== undefined) setValues.totalTax = gstReturn.totalTax;
      if (gstReturn.b2bData !== undefined) setValues.b2bData = gstReturn.b2bData;
      if (gstReturn.b2cData !== undefined) setValues.b2cData = gstReturn.b2cData;
      if (gstReturn.hsnSummary !== undefined) setValues.hsnSummary = gstReturn.hsnSummary;
      if (gstReturn.generatedAt !== undefined) setValues.generatedAt = new Date();
      if (gstReturn.filedAt !== undefined) setValues.filedAt = new Date();
      if (gstReturn.fileReference !== undefined) setValues.fileReference = gstReturn.fileReference;
      setValues.updatedAt = new Date();

      const result = await db.update(gstReturns)
        .set(setValues)
        .where(eq(gstReturns.id, id))
        .returning();
      return result[0] as GstReturn;
    } catch (error) {
      console.error('Error updating GST return:', error);
      return undefined;
    }
  }

  async getAllGstReturns(filters?: { month?: number; year?: number; status?: string }): Promise<GstReturn[]> {
    try {
      const conditions = [];
      if (filters?.month) conditions.push(eq(gstReturns.periodMonth, filters.month));
      if (filters?.year) conditions.push(eq(gstReturns.periodYear, filters.year));
      if (filters?.status) conditions.push(eq(gstReturns.status, filters.status));

      return await db
        .select()
        .from(gstReturns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(gstReturns.periodYear), desc(gstReturns.periodMonth));
    } catch (error) {
      console.error('Error getting all GST returns:', error);
      return [];
    }
  }

  async getOrdersByMerchantAndDateRange(merchantId: string | string[], startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      const merchantIds = Array.isArray(merchantId) ? merchantId : [merchantId];
      const result = await db.select().from(orders)
        .where(and(
          inArray(orders.restaurantId, merchantIds),
          sql`${orders.createdAt} >= ${startDate}`,
          sql`${orders.createdAt} <= ${endDate}`
        ));
      return result;
    } catch (error) {
      console.error('Error getting orders by date range:', error);
      return [];
    }
  }

  // Delhivery Config Methods
  async getDelhiveryConfig(merchantId: string): Promise<DelhiveryConfig | undefined> {
    try {
      const result = await db.select().from(delhiveryConfig).where(eq(delhiveryConfig.merchantId, merchantId));
      return result[0];
    } catch (error) {
      console.error('Error getting Delhivery config:', error);
      return undefined;
    }
  }

  async saveDelhiveryConfig(config: Partial<InsertDelhiveryConfig>): Promise<DelhiveryConfig> {
    try {
      const existing = await this.getDelhiveryConfig(config.merchantId!);
      if (existing) {
        const result = await db.update(delhiveryConfig)
          .set({ ...config, updatedAt: new Date() })
          .where(eq(delhiveryConfig.id, existing.id))
          .returning();
        return result[0];
      } else {
        const result = await db.insert(delhiveryConfig)
          .values(config as InsertDelhiveryConfig)
          .returning();
        return result[0];
      }
    } catch (error) {
      console.error('Error saving Delhivery config:', error);
      throw error;
    }
  }

  // Delhivery Warehouse Methods
  async getDelhiveryWarehouses(merchantId: string): Promise<DelhiveryWarehouse[]> {
    try {
      return await db.select().from(delhiveryWarehouses)
        .where(eq(delhiveryWarehouses.merchantId, merchantId))
        .orderBy(desc(delhiveryWarehouses.createdAt));
    } catch (error) {
      console.error('Error getting Delhivery warehouses:', error);
      return [];
    }
  }

  async getDelhiveryWarehouse(id: string): Promise<DelhiveryWarehouse | undefined> {
    try {
      const result = await db.select().from(delhiveryWarehouses).where(eq(delhiveryWarehouses.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting Delhivery warehouse:', error);
      return undefined;
    }
  }

  async createDelhiveryWarehouse(warehouse: InsertDelhiveryWarehouse): Promise<DelhiveryWarehouse> {
    try {
      const result = await db.insert(delhiveryWarehouses).values(warehouse).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating Delhivery warehouse:', error);
      throw error;
    }
  }

  async updateDelhiveryWarehouse(id: string, warehouse: Partial<InsertDelhiveryWarehouse>): Promise<DelhiveryWarehouse | undefined> {
    try {
      const result = await db.update(delhiveryWarehouses)
        .set({ ...warehouse, updatedAt: new Date() })
        .where(eq(delhiveryWarehouses.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating Delhivery warehouse:', error);
      return undefined;
    }
  }

  async deleteDelhiveryWarehouse(id: string): Promise<boolean> {
    try {
      await db.delete(delhiveryWarehouses).where(eq(delhiveryWarehouses.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting Delhivery warehouse:', error);
      return false;
    }
  }

  // Delhivery Shipment Methods
  async getDelhiveryShipments(merchantId: string, filters?: { status?: string; shipmentType?: string }): Promise<DelhiveryShipment[]> {
    try {
      let query = sql`SELECT * FROM delhivery_shipments WHERE merchant_id = ${merchantId}`;
      if (filters?.status) query = sql`${query} AND status = ${filters.status}`;
      if (filters?.shipmentType) query = sql`${query} AND shipment_type = ${filters.shipmentType}`;
      query = sql`${query} ORDER BY created_at DESC`;
      
      const result = await db.execute(query);
      return result.rows as DelhiveryShipment[];
    } catch (error) {
      console.error('Error getting Delhivery shipments:', error);
      return [];
    }
  }

  async getDelhiveryShipment(id: string): Promise<DelhiveryShipment | undefined> {
    try {
      const result = await db.select().from(delhiveryShipments).where(eq(delhiveryShipments.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting Delhivery shipment:', error);
      return undefined;
    }
  }

  async getDelhiveryShipmentByOrder(orderId: string): Promise<DelhiveryShipment | undefined> {
    try {
      const result = await db.select().from(delhiveryShipments).where(eq(delhiveryShipments.orderId, orderId));
      return result[0];
    } catch (error) {
      console.error('Error getting Delhivery shipment by order:', error);
      return undefined;
    }
  }

  async getDelhiveryShipmentByWaybill(waybill: string): Promise<DelhiveryShipment | undefined> {
    try {
      const result = await db.select().from(delhiveryShipments).where(eq(delhiveryShipments.waybillNumber, waybill));
      return result[0];
    } catch (error) {
      console.error('Error getting Delhivery shipment by waybill:', error);
      return undefined;
    }
  }

  async createDelhiveryShipment(shipment: InsertDelhiveryShipment): Promise<DelhiveryShipment> {
    try {
      const result = await db.insert(delhiveryShipments).values(shipment).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating Delhivery shipment:', error);
      throw error;
    }
  }

  async updateDelhiveryShipment(id: string, shipment: Partial<InsertDelhiveryShipment>): Promise<DelhiveryShipment | undefined> {
    try {
      const result = await db.update(delhiveryShipments)
        .set({ ...shipment, updatedAt: new Date() })
        .where(eq(delhiveryShipments.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating Delhivery shipment:', error);
      return undefined;
    }
  }

  // Wholesale Dealers (WSD) methods
  async getAllWholesaleDealers(): Promise<WholesaleDealer[]> {
    try {
      const result = await db.select().from(wholesaleDealers).orderBy(wholesaleDealers.wsdCode);
      return result;
    } catch (error) {
      console.error('Error getting wholesale dealers:', error);
      return [];
    }
  }

  async getWholesaleDealersByDistrictUnion(districtUnion: string): Promise<WholesaleDealer[]> {
    try {
      const result = await db.select().from(wholesaleDealers)
        .where(eq(wholesaleDealers.districtUnion, districtUnion))
        .orderBy(wholesaleDealers.wsdCode);
      return result;
    } catch (error) {
      console.error('Error getting wholesale dealers by district union:', error);
      return [];
    }
  }

  async getWholesaleDealerById(id: string): Promise<WholesaleDealer | undefined> {
    try {
      const result = await db.select().from(wholesaleDealers).where(eq(wholesaleDealers.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting wholesale dealer by ID:', error);
      return undefined;
    }
  }

  async getWholesaleDealerByCode(wsdCode: string): Promise<WholesaleDealer | undefined> {
    try {
      const result = await db.select().from(wholesaleDealers).where(eq(wholesaleDealers.wsdCode, wsdCode));
      return result[0];
    } catch (error) {
      console.error('Error getting wholesale dealer by code:', error);
      return undefined;
    }
  }

  async getWholesaleDealerByPhone(phone: string): Promise<WholesaleDealer | undefined> {
    try {
      const digits = phone.replace(/\D/g, '');
      const result = await db.select().from(wholesaleDealers).where(eq(wholesaleDealers.mobileNumber, digits));
      if (result[0]) return result[0];
      // Fallback: normalize stored values in case they contain formatting
      const all = await db.select().from(wholesaleDealers);
      return all.find(w => w.mobileNumber && w.mobileNumber.replace(/\D/g, '') === digits);
    } catch (error) {
      console.error('Error getting wholesale dealer by phone:', error);
      return undefined;
    }
  }

  async updateWholesaleDealerLastLogin(id: string): Promise<void> {
    try {
      await db.update(wholesaleDealers)
        .set({ lastLogin: new Date() })
        .where(eq(wholesaleDealers.id, id));
    } catch (error) {
      console.error('Error updating wholesale dealer last login:', error);
    }
  }

  async updateWholesaleDealer(id: string, data: Partial<InsertWholesaleDealer>): Promise<WholesaleDealer | undefined> {
    try {
      const result = await db.update(wholesaleDealers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(wholesaleDealers.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating wholesale dealer:', error);
      return undefined;
    }
  }

  // Fresh Milk Dealers (FMD) Implementation
  async getAllFreshMilkDealers(): Promise<FreshMilkDealer[]> {
    try {
      const result = await db.select().from(freshMilkDealers).orderBy(freshMilkDealers.fmdCode);
      return result;
    } catch (error) {
      console.error('Error getting fresh milk dealers:', error);
      return [];
    }
  }

  async getFreshMilkDealerById(id: string): Promise<FreshMilkDealer | undefined> {
    try {
      const result = await db.select().from(freshMilkDealers).where(eq(freshMilkDealers.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting fresh milk dealer by ID:', error);
      return undefined;
    }
  }

  async getFreshMilkDealerByCode(fmdCode: string): Promise<FreshMilkDealer | undefined> {
    try {
      const result = await db.select().from(freshMilkDealers).where(eq(freshMilkDealers.fmdCode, fmdCode));
      return result[0];
    } catch (error) {
      console.error('Error getting fresh milk dealer by code:', error);
      return undefined;
    }
  }

  async updateFreshMilkDealerLastLogin(id: string): Promise<void> {
    try {
      await db.update(freshMilkDealers)
        .set({ lastLogin: new Date() })
        .where(eq(freshMilkDealers.id, id));
    } catch (error) {
      console.error('Error updating fresh milk dealer last login:', error);
    }
  }

  // Agent Methods
  async getAgents(): Promise<Agent[]> {
    try {
      return await db.select().from(agents).orderBy(desc(agents.createdAt));
    } catch (error) {
      console.error('Error getting agents:', error);
      return [];
    }
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    try {
      const result = await db.select().from(agents).where(eq(agents.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting agent:', error);
      return undefined;
    }
  }

  async getAgentByCode(agentCode: string): Promise<Agent | undefined> {
    try {
      const result = await db.select().from(agents).where(eq(agents.agentCode, agentCode));
      return result[0];
    } catch (error) {
      console.error('Error getting agent by code:', error);
      return undefined;
    }
  }

  async getAgentByPhone(phone: string): Promise<Agent | undefined> {
    try {
      const digits = phone.replace(/\D/g, '');
      const result = await db.select().from(agents).where(eq(agents.phone, digits));
      if (result[0]) return result[0];
      // Fallback: normalize stored values in case they contain formatting
      const all = await db.select().from(agents).where(sql`phone IS NOT NULL`);
      return all.find(a => a.phone && a.phone.replace(/\D/g, '') === digits);
    } catch (error) {
      console.error('Error getting agent by phone:', error);
      return undefined;
    }
  }

  async getAgentsByType(agentType: string): Promise<Agent[]> {
    try {
      return await db.select().from(agents)
        .where(eq(agents.agentType, agentType))
        .orderBy(desc(agents.createdAt));
    } catch (error) {
      console.error('Error getting agents by type:', error);
      return [];
    }
  }

  async getAgentsByUnion(unionId: string): Promise<Agent[]> {
    try {
      return await db.select().from(agents)
        .where(eq(agents.assignedUnionId, unionId))
        .orderBy(desc(agents.createdAt));
    } catch (error) {
      console.error('Error getting agents by union:', error);
      return [];
    }
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(agent).returning();
    return result[0];
  }

  async updateAgent(id: string, agentData: Partial<InsertAgent>): Promise<Agent | undefined> {
    try {
      const result = await db.update(agents)
        .set({ ...agentData, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating agent:', error);
      return undefined;
    }
  }

  async deleteAgent(id: string): Promise<boolean> {
    try {
      await db.delete(agents).where(eq(agents.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  }

  // Media Files Implementation
  async getMediaFiles(): Promise<MediaFile[]> {
    try {
      return await db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt));
    } catch (error) {
      console.error('Error getting media files:', error);
      return [];
    }
  }

  async getMediaFile(id: string): Promise<MediaFile | undefined> {
    try {
      const result = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting media file:', error);
      return undefined;
    }
  }

  async createMediaFile(file: InsertMediaFile): Promise<MediaFile> {
    const result = await db.insert(mediaFiles).values(file).returning();
    return result[0];
  }

  async deleteMediaFile(id: string): Promise<boolean> {
    try {
      await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting media file:', error);
      return false;
    }
  }

  // ============ Inventory Management Implementation ============
  
  async getInventoryByUserId(userId: string): Promise<Inventory[]> {
    try {
      return await db.select().from(inventory).where(eq(inventory.userId, userId)).orderBy(inventory.productName);
    } catch (error) {
      console.error('Error getting inventory by user:', error);
      return [];
    }
  }

  async getInventoryById(id: string): Promise<Inventory | undefined> {
    try {
      const result = await db.select().from(inventory).where(eq(inventory.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting inventory by id:', error);
      return undefined;
    }
  }

  async getInventoryByUserAndProduct(userId: string, productId: string): Promise<Inventory | undefined> {
    try {
      const result = await db.select().from(inventory)
        .where(and(eq(inventory.userId, userId), eq(inventory.productId, productId)));
      return result[0];
    } catch (error) {
      console.error('Error getting inventory by user and product:', error);
      return undefined;
    }
  }

  async getAllInventory(): Promise<Inventory[]> {
    try {
      return await db.select().from(inventory).orderBy(inventory.userId, inventory.productName);
    } catch (error) {
      console.error('Error getting all inventory:', error);
      return [];
    }
  }

  async createInventory(inv: InsertInventory): Promise<Inventory> {
    const result = await db.insert(inventory).values({
      ...inv,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateInventory(id: string, quantity: number, transactionType: string, adjustedBy?: string, notes?: string): Promise<Inventory | undefined> {
    try {
      // Get current inventory
      const current = await this.getInventoryById(id);
      if (!current) return undefined;
      
      const previousQty = current.quantity;
      const quantityChange = quantity - previousQty;
      
      // Update inventory
      const result = await db.update(inventory)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(inventory.id, id))
        .returning();
      
      // Create transaction log
      await this.createInventoryTransaction({
        inventoryId: id,
        userId: current.userId,
        productId: current.productId,
        transactionType,
        quantityChange,
        previousQty,
        newQty: quantity,
        notes,
        adjustedBy
      });
      
      return result[0];
    } catch (error) {
      console.error('Error updating inventory:', error);
      return undefined;
    }
  }

  async addToInventory(userId: string, productId: string, productName: string, quantity: number, orderId?: string, unitType?: string): Promise<Inventory> {
    // Check if inventory record exists
    let inv = await this.getInventoryByUserAndProduct(userId, productId);
    
    if (inv) {
      // Update existing inventory
      const newQty = inv.quantity + quantity;
      const result = await db.update(inventory)
        .set({ 
          quantity: newQty, 
          lastPurchaseDate: new Date(),
          lastPurchaseQty: quantity,
          updatedAt: new Date() 
        })
        .where(eq(inventory.id, inv.id))
        .returning();
      
      // Create transaction log
      await this.createInventoryTransaction({
        inventoryId: inv.id,
        userId,
        productId,
        transactionType: 'purchase',
        quantityChange: quantity,
        previousQty: inv.quantity,
        newQty,
        orderId
      });
      
      return result[0];
    } else {
      // Create new inventory record
      inv = await this.createInventory({
        userId,
        productId,
        productName,
        quantity,
        unitType,
        lastPurchaseDate: new Date(),
        lastPurchaseQty: quantity
      });
      
      // Create transaction log
      await this.createInventoryTransaction({
        inventoryId: inv.id,
        userId,
        productId,
        transactionType: 'purchase',
        quantityChange: quantity,
        previousQty: 0,
        newQty: quantity,
        orderId
      });
      
      return inv;
    }
  }

  async getInventoryTransactions(inventoryId: string): Promise<InventoryTransaction[]> {
    try {
      return await db.select().from(inventoryTransactions)
        .where(eq(inventoryTransactions.inventoryId, inventoryId))
        .orderBy(desc(inventoryTransactions.createdAt));
    } catch (error) {
      console.error('Error getting inventory transactions:', error);
      return [];
    }
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const result = await db.insert(inventoryTransactions).values({
      ...transaction,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  // Wallet Methods
  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    try {
      const result = await db.select().from(wallets).where(eq(wallets.userId, userId));
      return result[0];
    } catch (error) {
      console.error('Error getting wallet by user:', error);
      return undefined;
    }
  }

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.getWalletByUserId(userId);
    if (!wallet) {
      const result = await db.insert(wallets).values({
        userId,
        balance: "0.00",
        currency: "INR",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      wallet = result[0];
    }
    return wallet;
  }

  async updateWalletBalance(
    userId: string, 
    amount: number, 
    type: 'credit' | 'debit', 
    description?: string, 
    referenceType?: string, 
    referenceId?: string,
    razorpayPaymentId?: string,
    razorpayOrderId?: string
  ): Promise<Wallet | undefined> {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const previousBalance = parseFloat(wallet.balance);
      const newBalance = type === 'credit' 
        ? previousBalance + amount 
        : previousBalance - amount;
      
      if (type === 'debit' && newBalance < 0) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Update wallet balance
      const result = await db.update(wallets)
        .set({ 
          balance: newBalance.toFixed(2), 
          updatedAt: new Date() 
        })
        .where(eq(wallets.userId, userId))
        .returning();
      
      // Create transaction log
      await this.createWalletTransaction({
        walletId: wallet.id,
        userId,
        type,
        amount: amount.toFixed(2),
        previousBalance: previousBalance.toFixed(2),
        newBalance: newBalance.toFixed(2),
        description,
        referenceType,
        referenceId,
        razorpayPaymentId,
        razorpayOrderId,
        status: 'completed'
      });
      
      return result[0];
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      return undefined;
    }
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    try {
      return await db.select().from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt));
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return [];
    }
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const result = await db.insert(walletTransactions).values({
      ...transaction,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  // Delivery Configuration Methods
  async getDeliveryConfiguration(districtUnionId: string): Promise<DeliveryConfiguration | undefined> {
    try {
      const result = await db.select().from(deliveryConfiguration)
        .where(eq(deliveryConfiguration.districtUnionId, districtUnionId));
      return result[0];
    } catch (error) {
      console.error('Error getting delivery configuration:', error);
      return undefined;
    }
  }

  async getAllDeliveryConfigurations(): Promise<DeliveryConfiguration[]> {
    try {
      return await db.select().from(deliveryConfiguration);
    } catch (error) {
      console.error('Error getting all delivery configurations:', error);
      return [];
    }
  }

  async createDeliveryConfiguration(config: InsertDeliveryConfiguration): Promise<DeliveryConfiguration> {
    const result = await db.insert(deliveryConfiguration).values({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateDeliveryConfiguration(districtUnionId: string, config: Partial<InsertDeliveryConfiguration>): Promise<DeliveryConfiguration | undefined> {
    try {
      const result = await db.update(deliveryConfiguration)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(deliveryConfiguration.districtUnionId, districtUnionId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating delivery configuration:', error);
      return undefined;
    }
  }

  // Delivery Routes Methods
  async getDeliveryRoutesByDriver(driverId: string, date?: Date): Promise<DeliveryRoute[]> {
    try {
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return await db.select().from(deliveryRoutes)
          .where(and(
            eq(deliveryRoutes.driverId, driverId),
            gte(deliveryRoutes.routeDate, startOfDay),
            lte(deliveryRoutes.routeDate, endOfDay)
          ))
          .orderBy(deliveryRoutes.routeDate);
      }
      return await db.select().from(deliveryRoutes)
        .where(eq(deliveryRoutes.driverId, driverId))
        .orderBy(desc(deliveryRoutes.routeDate));
    } catch (error) {
      console.error('Error getting delivery routes by driver:', error);
      return [];
    }
  }

  async getDeliveryRoutesByUnion(districtUnionId: string, date?: Date): Promise<DeliveryRoute[]> {
    try {
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return await db.select().from(deliveryRoutes)
          .where(and(
            eq(deliveryRoutes.districtUnionId, districtUnionId),
            gte(deliveryRoutes.routeDate, startOfDay),
            lte(deliveryRoutes.routeDate, endOfDay)
          ))
          .orderBy(deliveryRoutes.routeDate);
      }
      return await db.select().from(deliveryRoutes)
        .where(eq(deliveryRoutes.districtUnionId, districtUnionId))
        .orderBy(desc(deliveryRoutes.routeDate));
    } catch (error) {
      console.error('Error getting delivery routes by union:', error);
      return [];
    }
  }

  async getDeliveryRoute(id: string): Promise<DeliveryRoute | undefined> {
    try {
      const result = await db.select().from(deliveryRoutes).where(eq(deliveryRoutes.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting delivery route:', error);
      return undefined;
    }
  }

  async createDeliveryRoute(route: InsertDeliveryRoute): Promise<DeliveryRoute> {
    const result = await db.insert(deliveryRoutes).values({
      ...route,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateDeliveryRoute(id: string, route: Partial<InsertDeliveryRoute>): Promise<DeliveryRoute | undefined> {
    try {
      const result = await db.update(deliveryRoutes)
        .set({ ...route, updatedAt: new Date() })
        .where(eq(deliveryRoutes.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating delivery route:', error);
      return undefined;
    }
  }

  // Delivery Earnings Methods
  async getDeliveryEarningsByDriver(driverId: string): Promise<DeliveryEarnings[]> {
    try {
      return await db.select().from(deliveryEarnings)
        .where(eq(deliveryEarnings.driverId, driverId))
        .orderBy(desc(deliveryEarnings.createdAt));
    } catch (error) {
      console.error('Error getting delivery earnings:', error);
      return [];
    }
  }

  async createDeliveryEarning(earning: InsertDeliveryEarnings): Promise<DeliveryEarnings> {
    const result = await db.insert(deliveryEarnings).values({
      ...earning,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateDeliveryEarningPayment(id: string, status: string, reference?: string): Promise<DeliveryEarnings | undefined> {
    try {
      const result = await db.update(deliveryEarnings)
        .set({ 
          paymentStatus: status, 
          paymentReference: reference,
          paidAt: status === 'paid' ? new Date() : undefined
        })
        .where(eq(deliveryEarnings.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating delivery earning payment:', error);
      return undefined;
    }
  }

  // API Settings
  async getApiSettings(provider?: string): Promise<ApiSetting[]> {
    try {
      if (provider) {
        return await db.select().from(apiSettings).where(eq(apiSettings.provider, provider));
      }
      return await db.select().from(apiSettings);
    } catch (error) {
      console.error('Error getting API settings:', error);
      return [];
    }
  }

  async getApiSetting(id: number): Promise<ApiSetting | undefined> {
    try {
      const result = await db.select().from(apiSettings).where(eq(apiSettings.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting API setting:', error);
      return undefined;
    }
  }

  async getApiSettingByService(provider: string, serviceName: string): Promise<ApiSetting | undefined> {
    try {
      const result = await db.select().from(apiSettings)
        .where(and(eq(apiSettings.provider, provider), eq(apiSettings.serviceName, serviceName)));
      return result[0];
    } catch (error) {
      console.error('Error getting API setting by service:', error);
      return undefined;
    }
  }

  async saveApiSetting(setting: InsertApiSetting): Promise<ApiSetting> {
    const existing = await this.getApiSettingByService(setting.provider, setting.serviceName);
    if (existing) {
      const [updated] = await db.update(apiSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(apiSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(apiSettings).values({
      ...setting,
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateApiSetting(id: number, setting: Partial<InsertApiSetting>): Promise<ApiSetting | undefined> {
    try {
      const [updated] = await db.update(apiSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(apiSettings.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating API setting:', error);
      return undefined;
    }
  }

  async deleteApiSetting(id: number): Promise<boolean> {
    try {
      await db.delete(apiSettings).where(eq(apiSettings.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting API setting:', error);
      return false;
    }
  }

  async getUserHierarchyByParent(parentId: string): Promise<UserHierarchy[]> {
    return db.select().from(userHierarchy).where(eq(userHierarchy.parentId, parentId)).orderBy(desc(userHierarchy.createdAt));
  }

  async getUserHierarchyByChild(childId: string): Promise<UserHierarchy[]> {
    return db.select().from(userHierarchy).where(eq(userHierarchy.childId, childId)).orderBy(desc(userHierarchy.createdAt));
  }

  async getUserHierarchyById(id: string): Promise<UserHierarchy | undefined> {
    const [result] = await db.select().from(userHierarchy).where(eq(userHierarchy.id, id));
    return result;
  }

  async createUserHierarchy(data: InsertUserHierarchy): Promise<UserHierarchy> {
    const [created] = await db.insert(userHierarchy).values(data).returning();
    return created;
  }

  async updateUserHierarchy(id: string, data: Partial<InsertUserHierarchy>): Promise<UserHierarchy | undefined> {
    const [updated] = await db.update(userHierarchy)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userHierarchy.id, id))
      .returning();
    return updated;
  }

  async deleteUserHierarchy(id: string): Promise<boolean> {
    await db.delete(userHierarchy).where(eq(userHierarchy.id, id));
    return true;
  }

  async getUserHierarchyByParentEmail(parentEmail: string): Promise<UserHierarchy[]> {
    return db.select().from(userHierarchy).where(eq(userHierarchy.parentEmail, parentEmail)).orderBy(desc(userHierarchy.createdAt));
  }

  async getUserHierarchyByChildEmail(childEmail: string): Promise<UserHierarchy | undefined> {
    const [result] = await db.select().from(userHierarchy).where(eq(userHierarchy.childEmail, childEmail));
    return result;
  }

  async getB2bRegistrations(status?: string): Promise<B2bRegistration[]> {
    if (status) {
      return db.select().from(b2bRegistrations).where(eq(b2bRegistrations.status, status)).orderBy(b2bRegistrations.createdAt);
    }
    return db.select().from(b2bRegistrations).orderBy(b2bRegistrations.createdAt);
  }

  async getB2bRegistrationById(id: string): Promise<B2bRegistration | undefined> {
    const [result] = await db.select().from(b2bRegistrations).where(eq(b2bRegistrations.id, id));
    return result;
  }

  async createB2bRegistration(data: InsertB2bRegistration): Promise<B2bRegistration> {
    const [result] = await db.insert(b2bRegistrations).values(data).returning();
    return result;
  }

  async updateB2bRegistration(id: string, data: Partial<B2bRegistration>): Promise<B2bRegistration | undefined> {
    const [result] = await db.update(b2bRegistrations).set({ ...data, updatedAt: new Date() }).where(eq(b2bRegistrations.id, id)).returning();
    return result;
  }

  async deleteB2bRegistration(id: string): Promise<boolean> {
    const result = await db.delete(b2bRegistrations).where(eq(b2bRegistrations.id, id));
    return true;
  }

  async createB2bApprovalHistory(data: Omit<B2bApprovalHistory, 'id' | 'createdAt'>): Promise<B2bApprovalHistory> {
    const [result] = await db.insert(b2bApprovalHistory).values(data).returning();
    return result;
  }

  async getB2bApprovalHistory(registrationId: string): Promise<B2bApprovalHistory[]> {
    return db.select().from(b2bApprovalHistory)
      .where(eq(b2bApprovalHistory.registrationId, registrationId))
      .orderBy(b2bApprovalHistory.createdAt);
  }

  async getFreshMilkRoutes(unionId?: string): Promise<FreshMilkRoute[]> {
    let results = Array.from(this.freshMilkRoutesMap.values());
    if (unionId) results = results.filter(r => r.unionId === unionId);
    return results.sort((a, b) => a.sequenceNo - b.sequenceNo);
  }

  async getFreshMilkRoute(id: string): Promise<FreshMilkRoute | undefined> {
    return this.freshMilkRoutesMap.get(id);
  }

  async createFreshMilkRoute(route: InsertFreshMilkRoute): Promise<FreshMilkRoute> {
    const id = `fmr-${randomUUID().slice(0, 8)}`;
    const newRoute: FreshMilkRoute = { id, ...route, createdAt: new Date() };
    this.freshMilkRoutesMap.set(id, newRoute);
    return newRoute;
  }

  async updateFreshMilkRoute(id: string, route: Partial<InsertFreshMilkRoute>): Promise<FreshMilkRoute | undefined> {
    const existing = this.freshMilkRoutesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...route };
    this.freshMilkRoutesMap.set(id, updated);
    return updated;
  }

  async deleteFreshMilkRoute(id: string): Promise<boolean> {
    return this.freshMilkRoutesMap.delete(id);
  }

  async getFreshMilkDispatches(filters: { unionId?: string; date?: string; shift?: string; routeId?: string }): Promise<FreshMilkDispatch[]> {
    let results = Array.from(this.freshMilkDispatches.values());
    if (filters.unionId) results = results.filter(d => d.unionId === filters.unionId);
    if (filters.date) results = results.filter(d => d.dispatchDate === filters.date);
    if (filters.shift) results = results.filter(d => d.shift === filters.shift);
    if (filters.routeId) results = results.filter(d => d.routeId === filters.routeId);
    return results;
  }

  async getFreshMilkDispatch(id: string): Promise<FreshMilkDispatch | undefined> {
    return this.freshMilkDispatches.get(id);
  }

  async createFreshMilkDispatch(dispatch: InsertFreshMilkDispatch): Promise<FreshMilkDispatch> {
    const id = `fmd-${randomUUID().slice(0, 8)}`;
    const newDispatch: FreshMilkDispatch = { id, ...dispatch, leakAllowanceLtrs: dispatch.leakAllowanceLtrs || "0", status: dispatch.status || "draft", createdAt: new Date(), updatedAt: new Date() };
    this.freshMilkDispatches.set(id, newDispatch);
    return newDispatch;
  }

  async updateFreshMilkDispatch(id: string, dispatch: Partial<InsertFreshMilkDispatch>): Promise<FreshMilkDispatch | undefined> {
    const existing = this.freshMilkDispatches.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...dispatch, updatedAt: new Date() };
    this.freshMilkDispatches.set(id, updated);
    return updated;
  }

  async deleteFreshMilkDispatch(id: string): Promise<boolean> {
    return this.freshMilkDispatches.delete(id);
  }

  async getFreshMilkDispatchItems(dispatchId: string): Promise<FreshMilkDispatchItem[]> {
    return Array.from(this.freshMilkDispatchItems.values()).filter(i => i.dispatchId === dispatchId);
  }

  async createFreshMilkDispatchItem(item: InsertFreshMilkDispatchItem): Promise<FreshMilkDispatchItem> {
    const id = `fmdi-${randomUUID().slice(0, 8)}`;
    const newItem: FreshMilkDispatchItem = { id, ...item, createdAt: new Date() };
    this.freshMilkDispatchItems.set(id, newItem);
    return newItem;
  }

  async updateFreshMilkDispatchItem(id: string, item: Partial<InsertFreshMilkDispatchItem>): Promise<FreshMilkDispatchItem | undefined> {
    const existing = this.freshMilkDispatchItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...item };
    this.freshMilkDispatchItems.set(id, updated);
    return updated;
  }

  async deleteFreshMilkDispatchItemsByDispatch(dispatchId: string): Promise<boolean> {
    const toDelete = Array.from(this.freshMilkDispatchItems.entries()).filter(([_, v]) => v.dispatchId === dispatchId);
    toDelete.forEach(([k]) => this.freshMilkDispatchItems.delete(k));
    return toDelete.length > 0;
  }

  async getFreshMilkReturns(filters: { unionId?: string; date?: string; shift?: string }): Promise<FreshMilkReturn[]> {
    let results = Array.from(this.freshMilkReturns.values());
    if (filters.unionId) results = results.filter(r => r.unionId === filters.unionId);
    if (filters.date) results = results.filter(r => r.dispatchDate === filters.date);
    if (filters.shift) results = results.filter(r => r.shift === filters.shift);
    return results;
  }

  async createFreshMilkReturn(ret: InsertFreshMilkReturn): Promise<FreshMilkReturn> {
    const id = `fmret-${randomUUID().slice(0, 8)}`;
    const newReturn: FreshMilkReturn = { id, ...ret, createdAt: new Date() };
    this.freshMilkReturns.set(id, newReturn);
    return newReturn;
  }

  async updateFreshMilkReturn(id: string, ret: Partial<InsertFreshMilkReturn>): Promise<FreshMilkReturn | undefined> {
    const existing = this.freshMilkReturns.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...ret };
    this.freshMilkReturns.set(id, updated);
    return updated;
  }
}
