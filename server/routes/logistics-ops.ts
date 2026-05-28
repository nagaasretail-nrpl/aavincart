import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId } from "./shared";
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

import * as delhiveryService from "../delhivery";

export async function registerLogisticsOpsRoutes(app: Express): Promise<void> {
  app.get("/api/shipping/check-pincode/:pincode", async (req: Request, res) => {
    try {
      const config = await storage.getDelhiveryConfig('admin');
      if (!config || !config.apiToken) {
        // Fallback: assume serviceable within Tamil Nadu pincodes
        const pincode = req.params.pincode;
        const tamilNaduPincodes = ['600', '601', '602', '603', '604', '605', '606', '607', '608', '609', '610', '611', '612', '613', '614', '620', '621', '622', '623', '624', '625', '626', '627', '628', '629', '630', '631', '632', '633', '634', '635', '636', '637', '638', '639', '640', '641', '642', '643'];
        const isServiceable = tamilNaduPincodes.some(p => pincode.startsWith(p));
        return res.json({ serviceable: isServiceable, fallback: true });
      }

      const result = await delhiveryService.checkPincodeServiceability(config, req.params.pincode);
      res.json(result);
    } catch (error) {
      console.error('Error checking pincode:', error);
      res.json({ serviceable: true, fallback: true }); // Default to serviceable on error
    }
  });

  // Public Shipping Cost Calculation (for checkout page)
  app.post("/api/shipping/calculate-cost", async (req: Request, res) => {
    try {
      const { originPincode, destinationPincode, weight, paymentMode } = req.body;
      const config = await storage.getDelhiveryConfig('admin');
      
      if (!config || !config.apiToken) {
        // Use fallback rate card
        const distanceZones: Record<string, number> = {
          'same_city': 49,
          'intra_state': 79,
          'inter_state': 99,
          'remote': 149
        };
        
        // Simplified zone detection
        const originPrefix = originPincode?.slice(0, 3);
        const destPrefix = destinationPincode?.slice(0, 3);
        
        let zone = 'inter_state';
        if (originPrefix === destPrefix) {
          zone = 'same_city';
        } else if (originPincode?.slice(0, 2) === destinationPincode?.slice(0, 2)) {
          zone = 'intra_state';
        }
        
        const baseCost = distanceZones[zone] || 79;
        const weightCost = Math.max(0, (weight - 1) * 15); // ₹15 per additional kg
        const codCharge = paymentMode === 'COD' ? 30 : 0;
        
        return res.json({
          success: true,
          cost: baseCost + weightCost + codCharge,
          zone,
          fallback: true
        });
      }

      const result = await delhiveryService.calculateShippingCost(config, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      res.json({ success: true, cost: 99, fallback: true }); // Default rate on error
    }
  });

  // Check Pincode Serviceability (Admin)
  app.get("/api/admin/delhivery/check-pincode/:pincode", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const result = await delhiveryService.checkPincodeServiceability(config, req.params.pincode);
      res.json(result);
    } catch (error) {
      console.error('Error checking pincode:', error);
      res.status(500).json({ error: 'Failed to check pincode' });
    }
  });

  // Calculate Shipping Cost (via API)
  app.post("/api/admin/delhivery/calculate-cost", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const result = await delhiveryService.calculateShippingCost(config, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error calculating cost:', error);
      res.status(500).json({ error: 'Failed to calculate shipping cost' });
    }
  });

  // Calculate B2B Shipping Cost (using rate card - no API required)
  app.post("/api/admin/delhivery/calculate-b2b-cost", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { originCity, originState, destCity, destState, weightGrams, mode, codAmount, distanceKm } = req.body;
      
      if (!originCity || !originState || !destCity || !destState || !weightGrams) {
        return res.status(400).json({ error: 'Missing required fields: originCity, originState, destCity, destState, weightGrams' });
      }

      const zone = delhiveryService.determineZone(originCity, originState, destCity, destState, distanceKm);
      const cost = delhiveryService.calculateB2BShippingCost(
        weightGrams,
        zone,
        mode || 'surface',
        codAmount
      );

      res.json({
        success: true,
        data: {
          zone,
          mode: mode || 'surface',
          weightGrams,
          ...cost
        }
      });
    } catch (error) {
      console.error('Error calculating B2B cost:', error);
      res.status(500).json({ error: 'Failed to calculate B2B shipping cost' });
    }
  });

  // Create B2C Shipment
  app.post("/api/admin/delhivery/shipments/b2c", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const { orderId, ...shipmentData } = req.body;

      // Fetch waybill if auto-generate is enabled
      let waybill = shipmentData.waybill;
      if (!waybill && config.autoGenerateAwb) {
        const waybillResult = await delhiveryService.fetchWaybills(config, 1);
        if (waybillResult.success && waybillResult.data) {
          waybill = waybillResult.data;
        }
      }

      // Create shipment in Delhivery
      const result = await delhiveryService.createB2CShipment(config, {
        ...shipmentData,
        waybill,
        orderRef: orderId
      });

      if (result.success) {
        // Save to database
        const shipment = await storage.createDelhiveryShipment({
          orderId,
          merchantId,
          shipmentType: 'b2c',
          waybillNumber: waybill || result.data?.waybill,
          status: 'manifested',
          consigneeName: shipmentData.consigneeName,
          consigneePhone: shipmentData.consigneePhone,
          deliveryAddress: shipmentData.consigneeAddress,
          deliveryCity: shipmentData.consigneeCity,
          deliveryState: shipmentData.consigneeState,
          deliveryPincode: shipmentData.consigneePincode,
          weight: shipmentData.weight,
          dimensions: shipmentData.dimensions,
          productDescription: shipmentData.productDescription,
          quantity: shipmentData.quantity,
          paymentMode: shipmentData.paymentMode,
          codAmount: shipmentData.codAmount,
          invoiceAmount: shipmentData.invoiceAmount,
          invoiceNumber: shipmentData.invoiceNumber,
          pickupWarehouseId: shipmentData.pickupWarehouseId
        });

        res.json({ success: true, shipment, delhiveryResponse: result.data });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating B2C shipment:', error);
      res.status(500).json({ error: 'Failed to create shipment' });
    }
  });

  // Create B2B Shipment
  app.post("/api/admin/delhivery/shipments/b2b", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const { orderId, ...shipmentData } = req.body;

      // Create shipment in Delhivery
      const result = await delhiveryService.createB2BShipment(config, {
        ...shipmentData,
        orderRef: orderId
      });

      if (result.success) {
        // Save to database
        const shipment = await storage.createDelhiveryShipment({
          orderId,
          merchantId,
          shipmentType: 'b2b',
          lrNumber: result.data?.lr_number,
          status: 'manifested',
          consigneeName: shipmentData.consigneeName,
          consigneePhone: shipmentData.consigneePhone,
          deliveryAddress: shipmentData.consigneeAddress,
          deliveryCity: shipmentData.consigneeCity,
          deliveryState: shipmentData.consigneeState,
          deliveryPincode: shipmentData.consigneePincode,
          weight: shipmentData.weight,
          dimensions: shipmentData.dimensions,
          productDescription: shipmentData.productDescription,
          quantity: shipmentData.quantity,
          paymentMode: shipmentData.paymentMode === 'fod' ? 'cod' : 'prepaid',
          invoiceAmount: shipmentData.invoiceAmount,
          invoiceNumber: shipmentData.invoiceNumber,
          ewayBillNumber: shipmentData.ewayBillNumber,
          gstinSender: shipmentData.senderGstin,
          gstinReceiver: shipmentData.consigneeGstin,
          pickupWarehouseId: shipmentData.pickupWarehouseId
        });

        res.json({ success: true, shipment, delhiveryResponse: result.data });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error creating B2B shipment:', error);
      res.status(500).json({ error: 'Failed to create shipment' });
    }
  });

  // Track Shipment
  app.get("/api/admin/delhivery/shipments/:id/track", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const shipment = await storage.getDelhiveryShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      let result;
      if (shipment.shipmentType === 'b2b' && shipment.lrNumber) {
        result = await delhiveryService.trackB2BShipment(config, shipment.lrNumber);
      } else if (shipment.waybillNumber) {
        result = await delhiveryService.trackB2CShipment(config, shipment.waybillNumber);
      } else {
        return res.status(400).json({ error: 'No tracking number available' });
      }

      if (result.success && result.data) {
        // Update local status
        const newStatus = delhiveryService.mapDelhiveryStatusToShipmentStatus(
          result.data.Status?.Status || result.data.status || 'unknown'
        );
        await storage.updateDelhiveryShipment(shipment.id, {
          status: newStatus,
          currentLocation: result.data.Status?.StatusLocation,
          trackingHistory: result.data.Scans || result.data.scans
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error tracking shipment:', error);
      res.status(500).json({ error: 'Failed to track shipment' });
    }
  });

  // Cancel Shipment
  app.post("/api/admin/delhivery/shipments/:id/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const shipment = await storage.getDelhiveryShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      let result;
      if (shipment.shipmentType === 'b2b' && shipment.lrNumber) {
        result = await delhiveryService.cancelB2BShipment(config, shipment.lrNumber, req.body.reason);
      } else if (shipment.waybillNumber) {
        result = await delhiveryService.cancelB2CShipment(config, shipment.waybillNumber);
      } else {
        return res.status(400).json({ error: 'No tracking number available' });
      }

      if (result.success) {
        await storage.updateDelhiveryShipment(shipment.id, { status: 'cancelled' });
        res.json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error cancelling shipment:', error);
      res.status(500).json({ error: 'Failed to cancel shipment' });
    }
  });

  // Generate Label
  app.get("/api/admin/delhivery/shipments/:id/label", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const shipment = await storage.getDelhiveryShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      let result;
      if (shipment.shipmentType === 'b2b' && shipment.lrNumber) {
        result = await delhiveryService.generateB2BLabel(config, shipment.lrNumber);
      } else if (shipment.waybillNumber) {
        result = await delhiveryService.generateB2CLabel(config, shipment.waybillNumber);
      } else {
        return res.status(400).json({ error: 'No tracking number available' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error generating label:', error);
      res.status(500).json({ error: 'Failed to generate label' });
    }
  });

  // Create Pickup Request
  app.post("/api/admin/delhivery/pickup-request", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const merchantId = req.user?.restaurantId || 'admin';
      const config = await storage.getDelhiveryConfig(merchantId);
      if (!config || !config.apiToken) {
        return res.status(400).json({ error: 'Delhivery API not configured' });
      }

      const result = await delhiveryService.createPickupRequest(config, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error creating pickup request:', error);
      res.status(500).json({ error: 'Failed to create pickup request' });
    }
  });

  // ==================== AGENT MANAGEMENT ROUTES ====================

  // Get all agents
  app.get("/api/admin/agents", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  app.get("/api/admin/agents/download-csv", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const allAgents = await storage.getAgents();
      const allWsds = await storage.getAllWholesaleDealers();
      const allMerchants = await storage.getMerchants();
      const merchantMap = new Map(allMerchants.map((m: any) => [m.id, m.restaurantName || m.name || '']));

      const rows: string[][] = [];
      rows.push(["S.No", "Username", "Password", "Name", "Type", "District Union", "District", "Phone", "GST Number", "Status", "Route", "Agent Point"]);

      let sno = 1;
      for (const agent of allAgents) {
        const unionName = merchantMap.get(agent.assignedUnionId || '') || agent.assignedUnionId || '';
        rows.push([
          String(sno++),
          (agent.agentCode || '').replace('-', ''),
          agent.phone || '',
          agent.name || '',
          agent.agentType || '',
          unionName,
          agent.district || '',
          agent.phone || '',
          (agent as any).gstNumber || '',
          agent.status || '',
          agent.routeName || '',
          agent.agentPoint || '',
        ]);
      }

      for (const wsd of allWsds) {
        rows.push([
          String(sno++),
          wsd.wsdCode || '',
          wsd.mobileNumber || '',
          wsd.name || '',
          'WSD (Wholesale Dealer)',
          wsd.districtUnion || '',
          wsd.districtUnion || '',
          wsd.mobileNumber || '',
          wsd.gstin || '',
          wsd.isActive ? 'active' : 'inactive',
          (wsd as any).team || '',
          wsd.location || '',
        ]);
      }

      const csvContent = rows.map(row => 
        row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="b2b_users_credentials.csv"');
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error downloading agents CSV:', error);
      res.status(500).json({ error: 'Failed to generate CSV' });
    }
  });

  // Get single agent
  app.get("/api/admin/agents/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });

  // Create agent
  app.post("/api/admin/agents", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid agent data', details: parsed.error.errors });
      }
      const agent = await storage.createAgent(parsed.data);
      res.status(201).json(agent);
    } catch (error: any) {
      console.error('Error creating agent:', error);
      if (error.message?.includes('duplicate')) {
        return res.status(400).json({ error: 'Agent code already exists' });
      }
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  // Update agent
  app.patch("/api/admin/agents/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  // Update agent (PUT - full update)
  app.put("/api/admin/agents/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  // Delete agent
  app.delete("/api/admin/agents/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  // Credit System Endpoints

  // Get agent credit status
  app.get("/api/admin/agents/:id/credit", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({
        freshMilk: {
          limit: parseFloat(agent.freshMilkCreditLimit || '0'),
          used: parseFloat(agent.freshMilkCreditUsed || '0'),
          available: parseFloat(agent.freshMilkCreditLimit || '0') - parseFloat(agent.freshMilkCreditUsed || '0')
        },
        products: {
          limit: parseFloat(agent.productsCreditLimit || '0'),
          used: parseFloat(agent.productsCreditUsed || '0'),
          available: parseFloat(agent.productsCreditLimit || '0') - parseFloat(agent.productsCreditUsed || '0')
        }
      });
    } catch (error) {
      console.error('Error fetching agent credit:', error);
      res.status(500).json({ error: 'Failed to fetch credit status' });
    }
  });

  // Update agent credit limits
  app.patch("/api/admin/agents/:id/credit", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { freshMilkCreditLimit, productsCreditLimit } = req.body;
      
      const updateData: any = {};
      if (freshMilkCreditLimit !== undefined) {
        updateData.freshMilkCreditLimit = freshMilkCreditLimit.toString();
      }
      if (productsCreditLimit !== undefined) {
        updateData.productsCreditLimit = productsCreditLimit.toString();
      }
      
      const agent = await storage.updateAgent(req.params.id, updateData);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({
        freshMilk: {
          limit: parseFloat(agent.freshMilkCreditLimit || '0'),
          used: parseFloat(agent.freshMilkCreditUsed || '0'),
          available: parseFloat(agent.freshMilkCreditLimit || '0') - parseFloat(agent.freshMilkCreditUsed || '0')
        },
        products: {
          limit: parseFloat(agent.productsCreditLimit || '0'),
          used: parseFloat(agent.productsCreditUsed || '0'),
          available: parseFloat(agent.productsCreditLimit || '0') - parseFloat(agent.productsCreditUsed || '0')
        }
      });
    } catch (error) {
      console.error('Error updating agent credit:', error);
      res.status(500).json({ error: 'Failed to update credit limits' });
    }
  });

  // Check credit availability for an order (used during checkout) - requires authentication
  app.post("/api/credit/check", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId, segment, amount } = req.body;
      
      if (!agentId || !segment || !amount) {
        return res.status(400).json({ error: 'Missing required fields: agentId, segment, amount' });
      }
      
      // Validate segment is a valid enum
      if (segment !== 'Fresh Milk' && segment !== 'Products') {
        return res.status(400).json({ error: 'Invalid segment. Must be "Fresh Milk" or "Products"' });
      }
      
      // Validate amount is positive
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      let available = 0;
      if (segment === 'Fresh Milk') {
        available = parseFloat(agent.freshMilkCreditLimit || '0') - parseFloat(agent.freshMilkCreditUsed || '0');
      } else {
        available = parseFloat(agent.productsCreditLimit || '0') - parseFloat(agent.productsCreditUsed || '0');
      }
      
      const canUseCredit = available >= amountValue;
      
      res.json({
        available,
        requested: amountValue,
        canUseCredit,
        segment
      });
    } catch (error) {
      console.error('Error checking credit:', error);
      res.status(500).json({ error: 'Failed to check credit availability' });
    }
  });

  // Use credit for an order (deduct from available credit) - requires admin auth
  app.post("/api/credit/use", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId, segment, amount, orderId } = req.body;
      
      if (!agentId || !segment || !amount) {
        return res.status(400).json({ error: 'Missing required fields: agentId, segment, amount' });
      }
      
      // Validate segment is a valid enum
      if (segment !== 'Fresh Milk' && segment !== 'Products') {
        return res.status(400).json({ error: 'Invalid segment. Must be "Fresh Milk" or "Products"' });
      }
      
      // Validate amount is positive
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      let currentUsed = 0;
      let limit = 0;
      
      if (segment === 'Fresh Milk') {
        currentUsed = parseFloat(agent.freshMilkCreditUsed || '0');
        limit = parseFloat(agent.freshMilkCreditLimit || '0');
      } else {
        currentUsed = parseFloat(agent.productsCreditUsed || '0');
        limit = parseFloat(agent.productsCreditLimit || '0');
      }
      
      const newUsed = currentUsed + amountValue;
      
      if (newUsed > limit) {
        return res.status(400).json({ 
          error: 'Insufficient credit',
          available: limit - currentUsed,
          requested: amountValue
        });
      }
      
      // Update credit used
      const updateData: any = {};
      if (segment === 'Fresh Milk') {
        updateData.freshMilkCreditUsed = newUsed.toFixed(2);
      } else {
        updateData.productsCreditUsed = newUsed.toFixed(2);
      }
      
      await storage.updateAgent(agentId, updateData);
      
      res.json({
        success: true,
        segment,
        amountUsed: amountValue,
        newBalance: limit - newUsed,
        orderId
      });
    } catch (error) {
      console.error('Error using credit:', error);
      res.status(500).json({ error: 'Failed to use credit' });
    }
  });

  // Repay credit (when payment is received) - requires admin auth
  app.post("/api/credit/repay", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId, segment, amount } = req.body;
      
      if (!agentId || !segment || !amount) {
        return res.status(400).json({ error: 'Missing required fields: agentId, segment, amount' });
      }
      
      // Validate segment is a valid enum
      if (segment !== 'Fresh Milk' && segment !== 'Products') {
        return res.status(400).json({ error: 'Invalid segment. Must be "Fresh Milk" or "Products"' });
      }
      
      // Validate amount is positive
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      let currentUsed = 0;
      let limit = 0;
      
      if (segment === 'Fresh Milk') {
        currentUsed = parseFloat(agent.freshMilkCreditUsed || '0');
        limit = parseFloat(agent.freshMilkCreditLimit || '0');
      } else {
        currentUsed = parseFloat(agent.productsCreditUsed || '0');
        limit = parseFloat(agent.productsCreditLimit || '0');
      }
      
      const newUsed = Math.max(0, currentUsed - amountValue);
      
      // Update credit used
      const updateData: any = {};
      if (segment === 'Fresh Milk') {
        updateData.freshMilkCreditUsed = newUsed.toFixed(2);
      } else {
        updateData.productsCreditUsed = newUsed.toFixed(2);
      }
      
      await storage.updateAgent(agentId, updateData);
      
      res.json({
        success: true,
        segment,
        amountRepaid: amountValue,
        newBalance: limit - newUsed,
        creditUsed: newUsed
      });
    } catch (error) {
      console.error('Error repaying credit:', error);
      res.status(500).json({ error: 'Failed to repay credit' });
    }
  });

  // Bulk import agents
  app.post("/api/admin/agents/import", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { agents } = req.body;
      if (!Array.isArray(agents) || agents.length === 0) {
        return res.status(400).json({ error: 'No agents data provided' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; error: string }[]
      };

      for (let i = 0; i < agents.length; i++) {
        try {
          const agentData = agents[i];
          // Set default pricing role based on agent type if not provided
          if (!agentData.pricingRole && agentData.agentType) {
            agentData.pricingRole = AGENT_PRICING_ROLES[agentData.agentType as keyof typeof AGENT_PRICING_ROLES] || 'DEALER';
          }
          
          const parsed = insertAgentSchema.safeParse(agentData);
          if (!parsed.success) {
            results.failed++;
            results.errors.push({ 
              row: i + 1, 
              error: parsed.error.errors.map(e => `${e.path}: ${e.message}`).join(', ')
            });
            continue;
          }
          
          await storage.createAgent(parsed.data);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({ 
            row: i + 1, 
            error: error.message || 'Unknown error'
          });
        }
      }

      res.json({
        message: `Imported ${results.success} agents, ${results.failed} failed`,
        ...results
      });
    } catch (error) {
      console.error('Error importing agents:', error);
      res.status(500).json({ error: 'Failed to import agents' });
    }
  });

  // Get agents by type
  app.get("/api/admin/agents/type/:type", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agents = await storage.getAgentsByType(req.params.type);
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents by type:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  // Get agents by union
  app.get("/api/admin/agents/union/:unionId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const agents = await storage.getAgentsByUnion(req.params.unionId);
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents by union:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  // ==================== AGENT AUTHENTICATION ROUTES ====================

  // Agent lookup by code (for claim process)
  app.post("/api/agent/lookup", async (req, res) => {
    try {
      const { agentCode } = req.body;
      if (!agentCode) {
        return res.status(400).json({ error: 'Agent code is required' });
      }
      
      const agent = await storage.getAgentByCode(agentCode);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Return agent details (without sensitive info)
      res.json({
        id: agent.id,
        agentCode: agent.agentCode,
        agentType: agent.agentType,
        name: agent.name,
        phone: agent.phone,
        assignedUnionId: agent.assignedUnionId,
        officeId: agent.officeId,
        routeName: agent.routeName,
        routeNumber: agent.routeNumber,
        agentPoint: agent.agentPoint,
        freshMilkTier: agent.freshMilkTier,
        productTier: agent.productTier,
        status: agent.status,
      });
    } catch (error) {
      console.error('Error looking up agent:', error);
      res.status(500).json({ error: 'Failed to lookup agent' });
    }
  });

  // Agent claim account (set password)
  app.post("/api/agent/claim", async (req, res) => {
    try {
      const { agentCode, password } = req.body;
      if (!agentCode || !password) {
        return res.status(400).json({ error: 'Agent code and password are required' });
      }
      
      const agent = await storage.getAgentByCode(agentCode);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      if (agent.status === 'claimed' || agent.status === 'active') {
        return res.status(400).json({ error: 'Account already claimed' });
      }
      
      // Hash password and update agent
      const passwordHash = await hashPassword(password);
      const updatedAgent = await storage.updateAgent(agent.id, {
        passwordHash,
        status: 'claimed',
      });
      
      // Create JWT token for agent
      const token = signToken({ 
        agentId: agent.id, 
        role: 'agent',
        unionId: agent.assignedUnionId,
      });
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.json({ 
        user: { 
          id: agent.id, 
          name: agent.name, 
          role: 'agent',
          agentCode: agent.agentCode,
          agentType: agent.agentType,
          unionId: agent.assignedUnionId,
          freshMilkTier: agent.freshMilkTier,
          productTier: agent.productTier,
        } 
      });
    } catch (error) {
      console.error('Error claiming agent account:', error);
      res.status(500).json({ error: 'Failed to claim account' });
    }
  });

  // Agent login
  app.post("/api/agent/login", async (req, res) => {
    try {
      const { agentCode, password } = req.body;
      if (!agentCode || !password) {
        return res.status(400).json({ error: 'Agent code and password are required' });
      }
      
      const upperCode = agentCode.toUpperCase().trim();
      const phoneDigits = agentCode.replace(/\D/g, '');
      const looksLikePhone = phoneDigits.length >= 10 && !/[A-Za-z]/.test(agentCode.trim());
      const isWsdCode = upperCode.startsWith('WSD') || upperCode.startsWith('MPCS');

      // Phone input: try WSD lookup first, then fall through to agent
      let wsdByPhone: Awaited<ReturnType<typeof storage.getWholesaleDealerByPhone>> | undefined;
      if (looksLikePhone && !isWsdCode) {
        wsdByPhone = await storage.getWholesaleDealerByPhone(phoneDigits);
      }

      if (isWsdCode || wsdByPhone) {
        const wsd = isWsdCode
          ? await storage.getWholesaleDealerByCode(upperCode)
          : wsdByPhone;
        if (!wsd) {
          return res.status(404).json({ error: 'Dealer not found' });
        }
        
        if (!wsd.isActive) {
          return res.status(403).json({ error: 'Account is inactive. Please contact your District Union.' });
        }
        
        if (!wsd.passwordHash) {
          if (password === wsd.mobileNumber) {
            const hashed = await hashPassword(password);
            await storage.updateWholesaleDealer(wsd.id, { passwordHash: hashed });
          } else {
            return res.status(401).json({ error: 'Invalid password. Use your registered mobile number for first login.' });
          }
        } else {
          const isValid = await verifyPassword(password, wsd.passwordHash);
          if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
          }
        }
        
        try {
          await storage.updateWholesaleDealer(wsd.id, {});
        } catch (e) { /* ignore */ }
        
        const wsdId = `wsd-${wsd.id}`;
        const token = signToken({ 
          agentId: wsdId, 
          role: 'agent',
          unionId: 'merchant-3',
        });
        
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
        });
        
        const freshMilkTier = wsd.hasFreshMilkAccess ? 'WSD' : null;
        
        return res.json({ 
          user: { 
            id: wsdId, 
            name: wsd.name, 
            role: 'agent',
            agentCode: wsd.wsdCode,
            agentType: wsd.wsdCategory === 'MPCS' ? 'MPCS' : 'WSD',
            unionId: 'merchant-3',
            pricingRole: 'WHOLESALE_DEALER',
            freshMilkTier: freshMilkTier,
            productTier: 'WSD',
            freshMilkPricingRole: freshMilkTier ? 'WHOLESALE_DEALER' : 'MRP',
            productsPricingRole: 'WHOLESALE_DEALER',
            phone: wsd.mobileNumber,
            email: wsd.email,
            wsdCategory: wsd.wsdCategory,
          } 
        });
      }
      
      let agent = await storage.getAgentByCode(agentCode);
      if (!agent && looksLikePhone) {
        agent = await storage.getAgentByPhone(phoneDigits);
      }
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found. Please check your code or mobile number.' });
      }
      
      if (agent.status === 'pending') {
        return res.status(403).json({ error: 'Account not yet claimed. Please claim your account first.' });
      }
      
      if (!agent.passwordHash) {
        return res.status(403).json({ error: 'Account not set up. Please claim your account first.' });
      }
      
      const isValid = await verifyPassword(password, agent.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      if (agent.status === 'claimed') {
        await storage.updateAgent(agent.id, { status: 'active' });
      }
      
      const token = signToken({ 
        agentId: agent.id, 
        role: 'agent',
        unionId: agent.assignedUnionId,
      });
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.json({ 
        user: { 
          id: agent.id, 
          name: agent.name, 
          role: 'agent',
          agentCode: agent.agentCode,
          agentType: agent.agentType,
          unionId: agent.assignedUnionId,
          pricingRole: agent.agentType === 'Dealer' ? 'DEALER' : 
                       agent.agentType === 'Retailer' ? 'RETAILER' : 'DEALER',
          freshMilkTier: agent.freshMilkTier,
          productTier: agent.productTier,
          freshMilkPricingRole: agent.freshMilkTier === 'DLR' ? 'DEALER' : 'MRP',
          productsPricingRole: agent.productTier === 'DLR' ? 'DEALER' : 'DEALER',
          phone: agent.phone,
          email: agent.email,
        } 
      });
    } catch (error) {
      console.error('Error logging in agent:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post("/api/agent/change-password", async (req, res) => {
    try {
      const { agentCode, currentPassword, newPassword } = req.body;
      
      if (!agentCode || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Agent code, current password, and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      
      const upperCode = agentCode.toUpperCase().trim();
      const isWsdCode = upperCode.startsWith('WSD') || upperCode.startsWith('MPCS');
      
      if (isWsdCode) {
        const wsd = await storage.getWholesaleDealerByCode(upperCode);
        if (!wsd) {
          return res.status(404).json({ error: 'Dealer not found' });
        }
        
        if (!wsd.passwordHash) {
          return res.status(403).json({ error: 'Account not set up properly' });
        }
        
        const isValid = await verifyPassword(currentPassword, wsd.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const newPasswordHash = await hashPassword(newPassword);
        await storage.updateWholesaleDealer(wsd.id, { passwordHash: newPasswordHash });
        
        return res.json({ success: true, message: 'Password changed successfully' });
      }
      
      const agent = await storage.getAgentByCode(agentCode);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      if (!agent.passwordHash) {
        return res.status(403).json({ error: 'Account not set up properly' });
      }
      
      const isValid = await verifyPassword(currentPassword, agent.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateAgent(agent.id, { passwordHash: newPasswordHash });
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // ===========================================
  // Media Library API
  // ===========================================
  
  // Configure multer for file uploads - use memory storage for object storage upload
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|pdf|doc|docx/;
      const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (ext || mimeType) {
        cb(null, true);
      } else {
        cb(new Error('Only images, videos, and documents are allowed'));
      }
    }
  });

  // Get all media files
  app.get("/api/admin/media", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const files = await storage.getMediaFiles();
      res.json(files);
    } catch (error) {
      console.error('Error fetching media files:', error);
      res.status(500).json({ error: 'Failed to fetch media files' });
    }
  });

  // Upload media file - uses Object Storage for persistence
  app.post("/api/admin/media", requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const file = req.file;
      let fileType: 'image' | 'video' | 'document' = 'document';
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        fileType = 'video';
      }
      
      // Generate unique filename for object storage
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const objectName = `media/${uniqueSuffix}${ext}`;
      
      // Get the public object search paths to determine bucket
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (publicPaths.length === 0) {
        return res.status(500).json({ error: 'Object storage not configured' });
      }
      
      // Parse the first public path to get bucket name
      const publicPath = publicPaths[0];
      const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
      const bucketName = pathParts[0];
      const publicDir = pathParts.slice(1).join('/');
      
      // Full object path within bucket
      const fullObjectName = publicDir ? `${publicDir}/${objectName}` : objectName;
      
      // Upload to object storage
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(fullObjectName);
      
      await objectFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });
      
      // URL will be served through our public objects route
      const objectUrl = `/public/${objectName}`;
      
      const mediaFile = await storage.createMediaFile({
        name: `${uniqueSuffix}${ext}`,
        originalName: file.originalname,
        type: fileType,
        mimeType: file.mimetype,
        size: file.size,
        url: objectUrl,
        thumbnail: fileType === 'image' ? objectUrl : null,
        uploadedBy: user.email
      });
      
      res.json(mediaFile);
    } catch (error) {
      console.error('Error uploading media file:', error);
      res.status(500).json({ error: 'Failed to upload media file' });
    }
  });

  // Delete media file from Object Storage
  app.delete("/api/admin/media/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const mediaFile = await storage.getMediaFile(req.params.id);
      if (!mediaFile) {
        return res.status(404).json({ error: 'Media file not found' });
      }
      
      // Delete from Object Storage if it's a /public/ URL
      if (mediaFile.url.startsWith('/public/')) {
        try {
          const objectStorageService = new ObjectStorageService();
          const publicPaths = objectStorageService.getPublicObjectSearchPaths();
          
          if (publicPaths.length > 0) {
            const publicPath = publicPaths[0];
            const pathParts = publicPath.startsWith('/') ? publicPath.slice(1).split('/') : publicPath.split('/');
            const bucketName = pathParts[0];
            const publicDir = pathParts.slice(1).join('/');
            
            // Extract the object name from the URL (remove /public/ prefix)
            const objectName = mediaFile.url.replace('/public/', '');
            const fullObjectName = publicDir ? `${publicDir}/${objectName}` : objectName;
            
            const bucket = objectStorageClient.bucket(bucketName);
            const objectFile = bucket.file(fullObjectName);
            const [exists] = await objectFile.exists();
            if (exists) {
              await objectFile.delete();
            }
          }
        } catch (objStorageError) {
          console.error('Error deleting from object storage:', objStorageError);
        }
      }
      
      // Delete from database
      const deleted = await storage.deleteMediaFile(req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to delete media file' });
      }
    } catch (error) {
      console.error('Error deleting media file:', error);
      res.status(500).json({ error: 'Failed to delete media file' });
    }
  });

  // ============ Inventory Management APIs ============
  
  // Get inventory for current B2B user (WSD, Dealer, Retailer)
  app.get("/api/inventory", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Only B2B users can access their inventory
      // Support both full names and abbreviations for role checking
      const b2bRoles = ['WHOLESALE_DEALER', 'WSD', 'DEALER', 'DLR', 'RETAILER', 'RTL'];
      if (!user.pricingRole || !b2bRoles.includes(user.pricingRole)) {
        return res.status(403).json({ error: 'Inventory access is only available for B2B users (WSD, Dealer, Retailer)' });
      }
      
      const inventory = await storage.getInventoryByUserId(user.id);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });
  
  // Get inventory for a specific user (Admin only)
  app.get("/api/admin/inventory/:userId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const inventory = await storage.getInventoryByUserId(userId);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      res.status(500).json({ error: 'Failed to fetch user inventory' });
    }
  });
  
  // Get all B2B users with inventory (Admin only)
  app.get("/api/admin/inventory", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const allInventory = await storage.getAllInventory();
      res.json(allInventory);
    } catch (error) {
      console.error('Error fetching all inventory:', error);
      res.status(500).json({ error: 'Failed to fetch all inventory' });
    }
  });
  
  // Update inventory item (Admin only - manual adjustment)
  app.patch("/api/admin/inventory/:inventoryId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { inventoryId } = req.params;
      const { quantity, notes } = req.body;
      const admin = req.user;
      
      if (!admin) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
      }
      
      const existingInventory = await storage.getInventoryById(inventoryId);
      if (!existingInventory) {
        return res.status(404).json({ error: 'Inventory record not found' });
      }
      
      // Update inventory with transaction log
      const updated = await storage.updateInventory(inventoryId, quantity, 'adjustment', admin.id, notes);
      res.json(updated);
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  });
  
  // Create or initialize inventory for a B2B user (Admin only)
  app.post("/api/admin/inventory", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, productId, productName, quantity, unitType } = req.body;
      const admin = req.user;
      
      if (!admin) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!userId || !productId || !productName) {
        return res.status(400).json({ error: 'userId, productId, and productName are required' });
      }
      
      // Check if inventory already exists for this user-product pair
      const existing = await storage.getInventoryByUserAndProduct(userId, productId);
      if (existing) {
        return res.status(400).json({ error: 'Inventory already exists for this user and product. Use PATCH to update.' });
      }
      
      const inventory = await storage.createInventory({
        userId,
        productId,
        productName,
        quantity: quantity || 0,
        unitType
      });
      
      // Log the initial transaction
      if (quantity > 0) {
        await storage.createInventoryTransaction({
          inventoryId: inventory.id,
          userId,
          productId,
          transactionType: 'adjustment',
          quantityChange: quantity,
          previousQty: 0,
          newQty: quantity,
          notes: 'Initial inventory setup',
          adjustedBy: admin.id
        });
      }
      
      res.status(201).json(inventory);
    } catch (error) {
      console.error('Error creating inventory:', error);
      res.status(500).json({ error: 'Failed to create inventory' });
    }
  });
  
  // Get inventory transaction history (Admin only)
  app.get("/api/admin/inventory/:inventoryId/transactions", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { inventoryId } = req.params;
      const transactions = await storage.getInventoryTransactions(inventoryId);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transactions' });
    }
  });
  
  // Get inventory transactions for current user
  app.get("/api/inventory/:inventoryId/transactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { inventoryId } = req.params;
      
      // Verify the inventory belongs to the current user
      const inventory = await storage.getInventoryById(inventoryId);
      if (!inventory || inventory.userId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const transactions = await storage.getInventoryTransactions(inventoryId);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transactions' });
    }
  });

  // ============ Wallet APIs ============
  
  // Get current user's wallet
  app.get("/api/wallet", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const wallet = await storage.getOrCreateWallet(user.id);
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  });
  
  // Get wallet transactions
  app.get("/api/wallet/transactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const transactions = await storage.getWalletTransactions(user.id);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      res.status(500).json({ error: 'Failed to fetch wallet transactions' });
    }
  });
  
  // Create Razorpay order for adding funds to wallet
  app.post("/api/wallet/add-funds", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      
      // Create Razorpay order
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `wallet_${user.id}_${Date.now()}`,
        notes: {
          userId: user.id,
          type: 'wallet_topup'
        }
      };
      
      const order = await razorpay.orders.create(options);
      
      res.json({
        orderId: order.id,
        amount: amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } catch (error) {
      console.error('Error creating wallet order:', error);
      res.status(500).json({ error: 'Failed to create payment order' });
    }
  });
  
  // Verify Razorpay payment and add funds to wallet
  app.post("/api/wallet/verify-payment", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
      
      // Verify signature
      const crypto = require('crypto');
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');
      
      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
      
      // Add funds to wallet
      const wallet = await storage.updateWalletBalance(
        user.id,
        amount,
        'credit',
        `Added ₹${amount} via Razorpay`,
        'razorpay',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_order_id
      );
      
      if (!wallet) {
        return res.status(500).json({ error: 'Failed to update wallet balance' });
      }
      
      res.json({ success: true, wallet });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    }
  });
  
  // Use wallet for order payment
  app.post("/api/wallet/pay", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { amount, orderId, description } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      
      const wallet = await storage.getOrCreateWallet(user.id);
      if (parseFloat(wallet.balance) < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
      
      // Deduct from wallet
      const updatedWallet = await storage.updateWalletBalance(
        user.id,
        amount,
        'debit',
        description || `Order payment #${orderId}`,
        'order',
        orderId
      );
      
      if (!updatedWallet) {
        return res.status(500).json({ error: 'Failed to process wallet payment' });
      }
      
      res.json({ success: true, wallet: updatedWallet });
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      res.status(500).json({ error: 'Failed to process wallet payment' });
    }
  });

  // ============ Delivery Configuration APIs ============
  
  // Get delivery configuration for a District Union
  app.get("/api/admin/delivery-config/:unionId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId } = req.params;
      const config = await storage.getDeliveryConfiguration(unionId);
      res.json(config || null);
    } catch (error) {
      console.error('Error fetching delivery config:', error);
      res.status(500).json({ error: 'Failed to fetch delivery configuration' });
    }
  });
  
  // Get all delivery configurations
  app.get("/api/admin/delivery-config", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const configs = await storage.getAllDeliveryConfigurations();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching delivery configs:', error);
      res.status(500).json({ error: 'Failed to fetch delivery configurations' });
    }
  });
  
  // Create or update delivery configuration
  app.post("/api/admin/delivery-config", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const config = req.body;
      
      if (!config.districtUnionId || !config.districtUnionName) {
        return res.status(400).json({ error: 'District Union ID and name are required' });
      }
      
      // Check if config exists
      const existing = await storage.getDeliveryConfiguration(config.districtUnionId);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateDeliveryConfiguration(config.districtUnionId, config);
        res.json(updated);
      } else {
        // Create new
        const created = await storage.createDeliveryConfiguration(config);
        res.status(201).json(created);
      }
    } catch (error) {
      console.error('Error saving delivery config:', error);
      res.status(500).json({ error: 'Failed to save delivery configuration' });
    }
  });

  // ============ Delivery Route APIs ============
  
  // Get routes for a driver
  app.get("/api/delivery-routes/driver/:driverId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { driverId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const routes = await storage.getDeliveryRoutesByDriver(driverId, date);
      res.json(routes);
    } catch (error) {
      console.error('Error fetching driver routes:', error);
      res.status(500).json({ error: 'Failed to fetch delivery routes' });
    }
  });
  
  // Get routes for a District Union
  app.get("/api/admin/delivery-routes/:unionId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const routes = await storage.getDeliveryRoutesByUnion(unionId, date);
      res.json(routes);
    } catch (error) {
      console.error('Error fetching union routes:', error);
      res.status(500).json({ error: 'Failed to fetch delivery routes' });
    }
  });
  
  // Get orders ready for delivery assignment, grouped by segment
  app.get("/api/admin/assignable-orders", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const allOrders = await storage.getOrders();
      const assignableStatuses = ['accepted', 'marketing_approved', 'assigned_to_delivery', 'confirmed', 'ready', 'preparing'];
      const assignable = allOrders.filter((o: any) => assignableStatuses.includes(o.status));

      // Enrich with B2B route/delivery point info
      const allUsers = await storage.listUsers();
      const enrichedOrders = assignable.map((o: any) => {
        const customer = allUsers.find(u => String(u.id) === String(o.userId) || u.email === o.customerEmail);
        return {
          ...o,
          routeName: customer?.routeName || null,
          agentPoint: customer?.agentPoint || null,
          customerBusinessId: customer?.businessId || null,
          segment: o.segment || guessSegment(o),
        };
      });

      res.json(enrichedOrders);
    } catch (error) {
      console.error('Error fetching assignable orders:', error);
      res.status(500).json({ error: 'Failed to fetch assignable orders' });
    }
  });

  function guessSegment(order: any): string {
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      for (const item of items) {
        const seg = item.segment || '';
        if (seg) return seg;
        const name = (item.name || item.productName || '').toLowerCase();
        if (name.includes('milk') || name.includes('curd') || name.includes('butter')) return 'Fresh Milk';
        if (name.includes('ice cream') || name.includes('kulfi') || name.includes('cone')) return 'Ice Cream';
      }
    } catch {}
    return 'Products';
  }

  // Create optimized delivery route with order assignment
  app.post("/api/admin/delivery-routes", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const routeData = req.body;
      
      if (!routeData.driverId || !routeData.districtUnionId || !routeData.segment) {
        return res.status(400).json({ error: 'Driver ID, District Union ID, and segment are required' });
      }
      
      let deliverySequence = routeData.deliverySequence || [];
      
      if (routeData.orders && routeData.orders.length > 0) {
        const startLat = parseFloat(routeData.startLatitude || '11.6643');
        const startLng = parseFloat(routeData.startLongitude || '78.1460');
        
        const allStops = routeData.orders.map((order: any) => ({
          ...order,
          lat: parseFloat(order.latitude || '0'),
          lng: parseFloat(order.longitude || '0'),
        }));
        const stops = allStops.filter((s: any) => s.lat !== 0 || s.lng !== 0);
        const skippedStops = allStops.filter((s: any) => s.lat === 0 && s.lng === 0);

        const optimized: typeof stops = [];
        const visited = new Set<number>();
        let curLat = startLat;
        let curLng = startLng;

        while (optimized.length < stops.length) {
          let nearestIdx = -1;
          let nearestDist = Infinity;
          for (let i = 0; i < stops.length; i++) {
            if (visited.has(i)) continue;
            const d = calculateDistance(curLat, curLng, stops[i].lat, stops[i].lng);
            if (d < nearestDist) {
              nearestDist = d;
              nearestIdx = i;
            }
          }
          if (nearestIdx === -1) break;
          visited.add(nearestIdx);
          optimized.push(stops[nearestIdx]);
          curLat = stops[nearestIdx].lat;
          curLng = stops[nearestIdx].lng;
        }

        if (optimized.length > 3) {
          let improved = true;
          while (improved) {
            improved = false;
            for (let i = 1; i < optimized.length - 1; i++) {
              for (let j = i + 1; j < optimized.length; j++) {
                const prevI = i === 0 ? { lat: startLat, lng: startLng } : optimized[i - 1];
                const afterJ = j + 1 < optimized.length ? optimized[j + 1] : null;
                const currentDist =
                  calculateDistance(prevI.lat, prevI.lng, optimized[i].lat, optimized[i].lng) +
                  (afterJ ? calculateDistance(optimized[j].lat, optimized[j].lng, afterJ.lat, afterJ.lng) : 0);
                const swappedDist =
                  calculateDistance(prevI.lat, prevI.lng, optimized[j].lat, optimized[j].lng) +
                  (afterJ ? calculateDistance(optimized[i].lat, optimized[i].lng, afterJ.lat, afterJ.lng) : 0);
                if (swappedDist < currentDist - 0.01) {
                  const segment = optimized.slice(i, j + 1).reverse();
                  optimized.splice(i, j - i + 1, ...segment);
                  improved = true;
                }
              }
            }
          }
        }

        let prevLat = startLat;
        let prevLong = startLng;
        let totalDistance = 0;
        
        const allOptimized = [...optimized, ...skippedStops];
        deliverySequence = allOptimized.map((order: any, index: number) => {
          const hasCoords = order.lat !== 0 || order.lng !== 0;
          const distFromPrev = hasCoords ? calculateDistance(prevLat, prevLong, order.lat, order.lng) : 0;
          totalDistance += distFromPrev;
          if (hasCoords) { prevLat = order.lat; prevLong = order.lng; }
          
          return {
            orderId: order.orderId,
            sequence: index + 1,
            customerName: order.customerName || 'Customer',
            address: order.address || order.deliveryAddress || '',
            routeName: order.routeName || '',
            agentPoint: order.agentPoint || '',
            latitude: order.latitude,
            longitude: order.longitude,
            distanceFromPrevious: Math.round(distFromPrev * 100) / 100,
            estimatedTime: Math.round(distFromPrev * 3),
            status: 'pending',
            total: order.total || '0',
          };
        });
        
        routeData.totalDistanceKm = Math.round(totalDistance * 100) / 100;
        routeData.estimatedDurationMinutes = Math.round(totalDistance * 3);
      }
      
      const route = await storage.createDeliveryRoute({
        ...routeData,
        deliverySequence,
        totalOrders: deliverySequence.length,
        routeDate: new Date(routeData.routeDate || Date.now())
      });

      // Update order statuses to assigned_to_delivery
      for (const stop of deliverySequence) {
        try {
          await storage.updateOrder(stop.orderId, { status: 'assigned_to_delivery' });
        } catch (e) {
          console.error(`Failed to update order ${stop.orderId} status:`, e);
        }
      }
      
      res.status(201).json(route);
    } catch (error) {
      console.error('Error creating delivery route:', error);
      res.status(500).json({ error: 'Failed to create delivery route' });
    }
  });
  
  app.post("/api/admin/optimize-route", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { stops, startLatitude, startLongitude } = req.body;
      if (!stops || !Array.isArray(stops) || stops.length === 0) {
        return res.status(400).json({ error: 'Stops array is required' });
      }
      const startLat = parseFloat(startLatitude || '11.6643');
      const startLng = parseFloat(startLongitude || '78.1460');
      const points = stops.map((s: any) => ({
        ...s,
        lat: parseFloat(s.latitude || '0'),
        lng: parseFloat(s.longitude || '0'),
      }));
      const optimized: typeof points = [];
      const visited = new Set<number>();
      let curLat = startLat;
      let curLng = startLng;
      while (optimized.length < points.length) {
        let nearestIdx = -1;
        let nearestDist = Infinity;
        for (let i = 0; i < points.length; i++) {
          if (visited.has(i)) continue;
          const d = calculateDistance(curLat, curLng, points[i].lat, points[i].lng);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
        if (nearestIdx === -1) break;
        visited.add(nearestIdx);
        optimized.push(points[nearestIdx]);
        curLat = points[nearestIdx].lat;
        curLng = points[nearestIdx].lng;
      }
      if (optimized.length > 3) {
        let improved = true;
        while (improved) {
          improved = false;
          for (let i = 1; i < optimized.length - 1; i++) {
            for (let j = i + 1; j < optimized.length; j++) {
              const prevI = i === 0 ? { lat: startLat, lng: startLng } : optimized[i - 1];
              const afterJ = j + 1 < optimized.length ? optimized[j + 1] : null;
              const currentDist = calculateDistance(prevI.lat, prevI.lng, optimized[i].lat, optimized[i].lng) +
                (afterJ ? calculateDistance(optimized[j].lat, optimized[j].lng, afterJ.lat, afterJ.lng) : 0);
              const swappedDist = calculateDistance(prevI.lat, prevI.lng, optimized[j].lat, optimized[j].lng) +
                (afterJ ? calculateDistance(optimized[i].lat, optimized[i].lng, afterJ.lat, afterJ.lng) : 0);
              if (swappedDist < currentDist - 0.01) {
                const segment = optimized.slice(i, j + 1).reverse();
                optimized.splice(i, j - i + 1, ...segment);
                improved = true;
              }
            }
          }
        }
      }
      let prevLat2 = startLat;
      let prevLng2 = startLng;
      let totalDist = 0;
      const sequence = optimized.map((stop: any, idx: number) => {
        const d = calculateDistance(prevLat2, prevLng2, stop.lat, stop.lng);
        totalDist += d;
        prevLat2 = stop.lat;
        prevLng2 = stop.lng;
        return { ...stop, sequence: idx + 1, distanceFromPrevious: Math.round(d * 100) / 100, estimatedMinutes: Math.round(d * 3) };
      });
      res.json({ optimizedStops: sequence, totalDistanceKm: Math.round(totalDist * 100) / 100, estimatedDurationMinutes: Math.round(totalDist * 3), stopsCount: sequence.length });
    } catch (error) {
      console.error('Route optimization error:', error);
      res.status(500).json({ error: 'Failed to optimize route' });
    }
  });

  // Update delivery route (mark deliveries as completed, update status)
  app.patch("/api/delivery-routes/:routeId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { routeId } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateDeliveryRoute(routeId, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating delivery route:', error);
      res.status(500).json({ error: 'Failed to update delivery route' });
    }
  });

  // ============ Delivery Earnings APIs ============
  
  // Get earnings for a driver
  app.get("/api/delivery-earnings/:driverId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { driverId } = req.params;
      const earnings = await storage.getDeliveryEarningsByDriver(driverId);
      res.json(earnings);
    } catch (error) {
      console.error('Error fetching driver earnings:', error);
      res.status(500).json({ error: 'Failed to fetch delivery earnings' });
    }
  });
  
  // Calculate and create earning record
  app.post("/api/delivery-earnings", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const earningData = req.body;
      
      if (!earningData.driverId || !earningData.driverName) {
        return res.status(400).json({ error: 'Driver ID and name are required' });
      }
      
      const earning = await storage.createDeliveryEarning(earningData);
      res.status(201).json(earning);
    } catch (error) {
      console.error('Error creating delivery earning:', error);
      res.status(500).json({ error: 'Failed to create delivery earning' });
    }
  });
  
  // Update earning payment status
  app.patch("/api/admin/delivery-earnings/:earningId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const { earningId } = req.params;
      const { status, reference } = req.body;
      
      const updated = await storage.updateDeliveryEarningPayment(earningId, status, reference);
      if (!updated) {
        return res.status(404).json({ error: 'Earning record not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating earning payment:', error);
      res.status(500).json({ error: 'Failed to update earning payment' });
    }
  });

  // ============ Re-order API ============
  
  // Get order details for re-ordering
  app.post("/api/orders/:orderId/reorder", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { orderId } = req.params;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Verify order belongs to the user (check email or phone)
      // Strip +91 prefix for comparison to handle format inconsistencies
      const normalizePhone = (p: string) => p.replace(/^\+91/, '').trim();
      const userEmail = user.email || '';
      const userPhone = normalizePhone(user.phone || '');
      const orderEmail = order.customerEmail || '';
      const orderPhone = normalizePhone(order.customerPhone || '');
      const isAdmin = user.role === 'admin' || user.role === 'merchant';
      const isOwner = isAdmin ||
                      (userEmail && orderEmail && userEmail === orderEmail) ||
                      (userPhone && orderPhone && userPhone === orderPhone);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Return order items for adding to cart
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      res.json({
        items,
        restaurantId: order.restaurantId,
        deliveryAddress: order.deliveryAddress
      });
    } catch (error) {
      console.error('Error processing reorder:', error);
      res.status(500).json({ error: 'Failed to process reorder request' });
    }
  });

  // ============ Daily Indents APIs (Institution Credit Orders) ============
  
  // Create a new daily indent (institution customers only)
  app.post("/api/daily-indents", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is a B2B customer (can submit daily indents for credit)
      // B2B pricing roles: FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER
      // Also allow institutions (isInstitution flag)
      const fullUser = await storage.getUser(user.id);
      const b2bRoles = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER'];
      const isB2BCustomer = fullUser && (
        b2bRoles.includes((fullUser as any).pricingRole) || 
        (fullUser as any).isInstitution
      );
      
      if (!isB2BCustomer) {
        return res.status(403).json({ error: 'Only B2B customers (Federation, Inter-Union, WSD, Dealer, Retailer) can submit daily indents' });
      }
      
      // Security: Require union association for tenant isolation
      if (!user.unionId) {
        return res.status(403).json({ error: 'B2B customer must be associated with a District Union to submit indents' });
      }
      
      const indentData = req.body;
      
      // Validate required fields
      if (!indentData.deliveryDate || !indentData.items || !Array.isArray(indentData.items) || indentData.items.length === 0) {
        return res.status(400).json({ error: 'Delivery date and items are required' });
      }
      
      // Validate items structure
      for (const item of indentData.items) {
        if (!item.itemId || !item.name || typeof item.quantity !== 'number' || item.quantity <= 0) {
          return res.status(400).json({ error: 'Invalid item data: itemId, name, and quantity > 0 required' });
        }
      }
      
      // Security: Use authenticated user's ID, not client-provided (prevent submitting on behalf of others)
      const result = await db.execute(
        sql`INSERT INTO daily_indents (
          customer_id, customer_name, customer_phone, customer_email,
          institution_type, delivery_date, delivery_address, delivery_instructions,
          items, product_segment, subtotal, gst_amount, total,
          mmo_office, status, union_id
        ) VALUES (
          ${user.id},
          ${user.name},
          ${user.phone || ''},
          ${user.email},
          ${(fullUser as any).institutionType || 'Institution'},
          ${new Date(indentData.deliveryDate)},
          ${indentData.deliveryAddress || ''},
          ${indentData.deliveryInstructions || ''},
          ${JSON.stringify(indentData.items)},
          ${indentData.productSegment || 'Products'},
          ${parseFloat(indentData.subtotal) || 0},
          ${parseFloat(indentData.gstAmount) || 0},
          ${parseFloat(indentData.total) || 0},
          ${indentData.mmoOffice || null},
          'pending',
          ${user.unionId || null}
        ) RETURNING *`
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating daily indent:', error);
      res.status(500).json({ error: 'Failed to create daily indent' });
    }
  });
  
  // Get daily indents for a customer
  app.get("/api/daily-indents", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { status, segment, date } = req.query;
      
      let query = sql`SELECT * FROM daily_indents WHERE customer_id = ${user.id}`;
      
      if (status) {
        query = sql`${query} AND status = ${status as string}`;
      }
      if (segment) {
        query = sql`${query} AND product_segment = ${segment as string}`;
      }
      if (date) {
        query = sql`${query} AND DATE(delivery_date) = DATE(${new Date(date as string)})`;
      }
      
      query = sql`${query} ORDER BY submitted_at DESC LIMIT 50`;
      
      const result = await db.execute(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching daily indents:', error);
      res.status(500).json({ error: 'Failed to fetch daily indents' });
    }
  });
  
  // Get all pending indents for MMO office (staff view - admin/staff only)
}
