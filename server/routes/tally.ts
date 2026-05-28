import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull, like, gt, lt } from "drizzle-orm";
import {
  requireAuth, requireRole, getUnionScope, logActivity,
  signToken, verifyToken, hashPassword, verifyPassword
} from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { generateTripId, resolveDistrictUnionToMerchantId } from "./shared";
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

// Helper functions for Tally XML export
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function formatTallyDate(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}


import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";

export async function registerTallyRoutes(app: Express): Promise<void> {
  app.get("/api/tally/export/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate } = req.query;
      const conditions: any[] = [eq(ordersTable.restaurantId, merchantId)];
      if (startDate) conditions.push(gte(ordersTable.createdAt, new Date(startDate as string)));
      if (endDate) conditions.push(lte(ordersTable.createdAt, new Date(endDate as string)));
      const ordersList = await db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt));
      const biConditions: any[] = [eq(bulkInvoices.merchantId, merchantId)];
      if (startDate) biConditions.push(gte(bulkInvoices.createdAt, new Date(startDate as string)));
      if (endDate) biConditions.push(lte(bulkInvoices.createdAt, new Date(endDate as string)));
      const bulkInvoicesList = await db.select().from(bulkInvoices).where(and(...biConditions)).orderBy(desc(bulkInvoices.createdAt));
      let vouchers = "";
      for (const order of ordersList) {
        const items = Array.isArray(order.items) ? order.items : [];
        let ledgerEntries = "";
        for (const item of items as any[]) {
          ledgerEntries += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(item.name || "Product")}</LEDGERNAME><AMOUNT>-${item.price || 0}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
        }
        vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${formatTallyDate(order.createdAt)}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${order.displayId || order.id}</VOUCHERNUMBER><PARTYLEDGERNAME>${escapeXml(order.customerName)}</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(order.customerName)}</LEDGERNAME><AMOUNT>${order.total}</AMOUNT></ALLLEDGERENTRIES.LIST>${ledgerEntries}</VOUCHER></TALLYMESSAGE>`;
      }
      for (const bi of bulkInvoicesList) {
        if (bi.status === "cancelled") continue;
        const biItems = Array.isArray(bi.items) ? bi.items : [];
        let ledgerEntries = "";
        for (const item of biItems as any[]) {
          ledgerEntries += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(item.name || item.productName || "Product")}</LEDGERNAME><AMOUNT>-${item.amount || 0}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
        }
        vouchers += `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${formatTallyDate(bi.createdAt)}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${bi.invoiceNumber}</VOUCHERNUMBER><PARTYLEDGERNAME>${escapeXml(bi.customerName)}</PARTYLEDGERNAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${escapeXml(bi.customerName)}</LEDGERNAME><AMOUNT>${bi.totalAmount}</AMOUNT></ALLLEDGERENTRIES.LIST>${ledgerEntries}</VOUCHER></TALLYMESSAGE>`;
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${vouchers}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Tally export error:", error);
      res.status(500).json({ error: "Failed to export Tally data" });
    }
  });

  // --- 12b. Tally Import API ---
  const tallyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

  function parseTallyXml(buffer: Buffer): any {
    let xmlString: string;
    const bom16le = buffer[0] === 0xFF && buffer[1] === 0xFE;
    const bom16be = buffer[0] === 0xFE && buffer[1] === 0xFF;
    if (bom16le) {
      xmlString = buffer.toString('utf16le').replace(/^\uFEFF/, '');
    } else if (bom16be) {
      xmlString = Buffer.from(buffer).swap16().toString('utf16le').replace(/^\uFEFF/, '');
    } else {
      xmlString = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    }
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      allowBooleanAttributes: true,
      parseTagValue: true,
      trimValues: true,
      isArray: (name: string) => {
        const arrayTags = ['TALLYMESSAGE', 'LEDGER', 'STOCKITEM', 'VOUCHER', 'GROUP', 'STOCKGROUP', 'UNIT', 'GODOWN', 'VOUCHERTYPE',
          'ALLLEDGERENTRIES.LIST', 'ALLINVENTORYENTRIES.LIST', 'LEDGERMAILINGDETAILS.LIST', 'ADDRESS.LIST',
          'BILLALLOCATIONS.LIST', 'BATCHALLOCATIONS.LIST', 'CATEGORYALLOCATIONS.LIST', 'ACCOUNTINGALLOCATIONS.LIST',
          'INVENTORYALLOCATIONS.LIST'];
        return arrayTags.includes(name);
      }
    });
    return parser.parse(xmlString);
  }

  function extractTallyData(parsed: any) {
    const envelope = parsed.ENVELOPE || parsed;
    const body = envelope.BODY || envelope;
    const data = body.DATA || body.IMPORTDATA || body.EXPORTDATA || body;
    let messages: any[] = [];
    if (data.TALLYMESSAGE) {
      messages = Array.isArray(data.TALLYMESSAGE) ? data.TALLYMESSAGE : [data.TALLYMESSAGE];
    } else if (data.REQUESTDATA?.TALLYMESSAGE) {
      messages = Array.isArray(data.REQUESTDATA.TALLYMESSAGE) ? data.REQUESTDATA.TALLYMESSAGE : [data.REQUESTDATA.TALLYMESSAGE];
    }
    const ledgers: any[] = [];
    const stockItems: any[] = [];
    const vouchers: any[] = [];
    const groups: any[] = [];
    const stockGroups: any[] = [];
    const units: any[] = [];
    const godowns: any[] = [];
    const voucherTypes: any[] = [];

    for (const msg of messages) {
      if (msg.LEDGER) {
        const items = Array.isArray(msg.LEDGER) ? msg.LEDGER : [msg.LEDGER];
        ledgers.push(...items);
      }
      if (msg.STOCKITEM) {
        const items = Array.isArray(msg.STOCKITEM) ? msg.STOCKITEM : [msg.STOCKITEM];
        stockItems.push(...items);
      }
      if (msg.VOUCHER) {
        const items = Array.isArray(msg.VOUCHER) ? msg.VOUCHER : [msg.VOUCHER];
        vouchers.push(...items);
      }
      if (msg.GROUP) {
        const items = Array.isArray(msg.GROUP) ? msg.GROUP : [msg.GROUP];
        groups.push(...items);
      }
      if (msg.STOCKGROUP) {
        const items = Array.isArray(msg.STOCKGROUP) ? msg.STOCKGROUP : [msg.STOCKGROUP];
        stockGroups.push(...items);
      }
      if (msg.UNIT) {
        const items = Array.isArray(msg.UNIT) ? msg.UNIT : [msg.UNIT];
        units.push(...items);
      }
      if (msg.GODOWN) {
        const items = Array.isArray(msg.GODOWN) ? msg.GODOWN : [msg.GODOWN];
        godowns.push(...items);
      }
      if (msg.VOUCHERTYPE) {
        const items = Array.isArray(msg.VOUCHERTYPE) ? msg.VOUCHERTYPE : [msg.VOUCHERTYPE];
        voucherTypes.push(...items);
      }
    }
    return { ledgers, stockItems, vouchers, groups, stockGroups, units, godowns, voucherTypes };
  }

  function getLedgerField(ledger: any, ...keys: string[]): string {
    for (const key of keys) {
      if (ledger[key] !== undefined && ledger[key] !== null && ledger[key] !== '') return String(ledger[key]);
    }
    const mailingList = ledger['LEDGERMAILINGDETAILS.LIST'];
    if (mailingList) {
      const mailing = Array.isArray(mailingList) ? mailingList[0] : mailingList;
      for (const key of keys) {
        if (mailing?.[key] !== undefined && mailing[key] !== null && mailing[key] !== '') return String(mailing[key]);
      }
    }
    return '';
  }

  function getLedgerAddress(ledger: any): string {
    const mailingList = ledger['LEDGERMAILINGDETAILS.LIST'];
    if (!mailingList) return '';
    const mailing = Array.isArray(mailingList) ? mailingList[0] : mailingList;
    const addrList = mailing?.['ADDRESS.LIST'];
    if (!addrList) return mailing?.ADDRESS || '';
    const addr = Array.isArray(addrList) ? addrList[0] : addrList;
    if (typeof addr === 'string') return addr;
    if (addr?.ADDRESS) return Array.isArray(addr.ADDRESS) ? addr.ADDRESS.join(', ') : String(addr.ADDRESS);
    return '';
  }

  app.post("/api/tally/import/preview", tallyUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      let masterData: any = null;
      let transactionData: any = null;
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith('.zip')) {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        for (const entry of entries) {
          const name = entry.entryName.toLowerCase();
          if (name.includes('master') && name.endsWith('.xml')) {
            masterData = extractTallyData(parseTallyXml(entry.getData()));
          } else if (name.includes('transaction') && name.endsWith('.xml')) {
            transactionData = extractTallyData(parseTallyXml(entry.getData()));
          } else if (name.endsWith('.xml') && !masterData) {
            const parsed = extractTallyData(parseTallyXml(entry.getData()));
            if (parsed.ledgers.length > 0 || parsed.stockItems.length > 0) {
              masterData = parsed;
            } else if (parsed.vouchers.length > 0) {
              transactionData = parsed;
            }
          }
        }
      } else if (filename.endsWith('.xml')) {
        const parsed = extractTallyData(parseTallyXml(req.file.buffer));
        if (parsed.vouchers.length > 0 && (parsed.ledgers.length === 0 && parsed.stockItems.length === 0)) {
          transactionData = parsed;
        } else if (parsed.ledgers.length > 0 || parsed.stockItems.length > 0) {
          masterData = parsed;
          if (parsed.vouchers.length > 0) transactionData = parsed;
        } else {
          masterData = parsed;
        }
      } else {
        return res.status(400).json({ error: "Please upload a .xml or .zip file" });
      }

      const vouchersByType: Record<string, number> = {};
      if (transactionData?.vouchers) {
        for (const v of transactionData.vouchers) {
          const vtype = v['@_VCHTYPE'] || v.VOUCHERTYPENAME || v['@_TYPE'] || 'Unknown';
          vouchersByType[vtype] = (vouchersByType[vtype] || 0) + 1;
        }
      }

      res.json({
        success: true,
        preview: {
          masters: {
            ledgers: masterData?.ledgers?.length || 0,
            stockItems: masterData?.stockItems?.length || 0,
            groups: masterData?.groups?.length || 0,
            stockGroups: masterData?.stockGroups?.length || 0,
            units: masterData?.units?.length || 0,
            godowns: masterData?.godowns?.length || 0,
            voucherTypes: masterData?.voucherTypes?.length || 0,
          },
          transactions: {
            totalVouchers: transactionData?.vouchers?.length || 0,
            byType: vouchersByType,
          },
          sampleLedgers: (masterData?.ledgers || []).slice(0, 5).map((l: any) => ({
            name: l['@_NAME'] || l.NAME || '',
            parent: l.PARENT || '',
            gstin: getLedgerField(l, 'PARTYGSTIN', 'GSTIN', 'GSTREGISTRATIONNUMBER'),
          })),
          sampleStockItems: (masterData?.stockItems || []).slice(0, 5).map((s: any) => ({
            name: s['@_NAME'] || s.NAME || '',
            parent: s.PARENT || '',
            baseUnit: s.BASEUNITS || s.ADDITIONALUNITS || '',
            hsnCode: s.HSNCODE || s['GSTDETAILS.LIST']?.HSNCODE || '',
          })),
        }
      });
    } catch (error) {
      console.error("Tally import preview error:", error);
      res.status(500).json({ error: "Failed to parse Tally file. Ensure it's a valid Tally XML or ZIP export." });
    }
  });

  app.post("/api/tally/import", tallyUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const merchantId = req.body.merchantId || 'default';
      let masterData: any = null;
      let transactionData: any = null;
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith('.zip')) {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        for (const entry of entries) {
          const name = entry.entryName.toLowerCase();
          if (name.includes('master') && name.endsWith('.xml')) {
            masterData = extractTallyData(parseTallyXml(entry.getData()));
          } else if (name.includes('transaction') && name.endsWith('.xml')) {
            transactionData = extractTallyData(parseTallyXml(entry.getData()));
          } else if (name.endsWith('.xml')) {
            const parsed = extractTallyData(parseTallyXml(entry.getData()));
            if (parsed.ledgers.length > 0 || parsed.stockItems.length > 0) {
              if (!masterData) masterData = parsed;
            }
            if (parsed.vouchers.length > 0) {
              if (!transactionData) transactionData = parsed;
            }
          }
        }
      } else if (filename.endsWith('.xml')) {
        const parsed = extractTallyData(parseTallyXml(req.file.buffer));
        if (parsed.vouchers.length > 0 && (parsed.ledgers.length === 0 && parsed.stockItems.length === 0)) {
          transactionData = parsed;
        } else {
          masterData = parsed;
          if (parsed.vouchers.length > 0) transactionData = parsed;
        }
      } else {
        return res.status(400).json({ error: "Please upload a .xml or .zip file" });
      }

      const [importLog] = await db.insert(tallyImportLogs).values({
        merchantId,
        filename: req.file.originalname,
        ledgersFound: masterData?.ledgers?.length || 0,
        stockitemsFound: masterData?.stockItems?.length || 0,
        vouchersFound: transactionData?.vouchers?.length || 0,
        status: 'processing',
      }).returning();

      const errors: string[] = [];
      let ledgersImported = 0;
      let stockitemsImported = 0;
      let vouchersImported = 0;

      if (masterData?.ledgers) {
        for (const ledger of masterData.ledgers) {
          try {
            const name = ledger['@_NAME'] || ledger.NAME || '';
            if (!name) continue;
            const guid = ledger['@_GUID'] || ledger.GUID || '';
            const existingGuid = guid ? await db.select().from(tallyLedgerRaw).where(and(eq(tallyLedgerRaw.guid, guid), eq(tallyLedgerRaw.importId, importLog.id))).limit(1) : [];
            if (existingGuid.length > 0) continue;

            await db.insert(tallyLedgerRaw).values({
              importId: importLog.id,
              guid,
              name,
              parent: ledger.PARENT || '',
              gstin: getLedgerField(ledger, 'PARTYGSTIN', 'GSTIN', 'GSTREGISTRATIONNUMBER'),
              address: getLedgerAddress(ledger),
              mobile: getLedgerField(ledger, 'LEDGERMOBILE', 'MOBILE'),
              phone: getLedgerField(ledger, 'LEDGERPHONE', 'PHONE'),
              email: getLedgerField(ledger, 'EMAIL', 'LEDGERCONTACT'),
              state: getLedgerField(ledger, 'LEDSTATENAME', 'STATENAME'),
              pincode: getLedgerField(ledger, 'PINCODE'),
              panNo: getLedgerField(ledger, 'INCOMETAXNUMBER', 'PANNUMBER'),
              openingBalance: ledger.OPENINGBALANCE ? String(parseFloat(String(ledger.OPENINGBALANCE).replace(/[^\d.-]/g, '')) || 0) : null,
              rawData: ledger,
              status: 'imported',
            });
            ledgersImported++;
          } catch (e: any) {
            errors.push(`Ledger "${ledger['@_NAME'] || ledger.NAME}": ${e.message}`);
          }
        }
      }

      if (masterData?.stockItems) {
        for (const item of masterData.stockItems) {
          try {
            const name = item['@_NAME'] || item.NAME || '';
            if (!name) continue;
            const guid = item['@_GUID'] || item.GUID || '';
            const existingGuid = guid ? await db.select().from(tallyStockitemRaw).where(and(eq(tallyStockitemRaw.guid, guid), eq(tallyStockitemRaw.importId, importLog.id))).limit(1) : [];
            if (existingGuid.length > 0) continue;

            let hsnCode = item.HSNCODE || '';
            if (!hsnCode) {
              const gstDetails = item['GSTDETAILS.LIST'];
              if (gstDetails) {
                const gst = Array.isArray(gstDetails) ? gstDetails[0] : gstDetails;
                hsnCode = gst?.HSNCODE || '';
              }
            }

            let gstRate: string | null = null;
            const gstDetails = item['GSTDETAILS.LIST'];
            if (gstDetails) {
              const gst = Array.isArray(gstDetails) ? gstDetails[0] : gstDetails;
              if (gst?.STATEWISEDETAILS?.RATEDETAILS?.GSTRATE) {
                gstRate = String(gst.STATEWISEDETAILS.RATEDETAILS.GSTRATE);
              }
            }

            let openingQty: string | null = null;
            let openingRate: string | null = null;
            let openingValue: string | null = null;
            if (item.OPENINGBALANCE) {
              const obStr = String(item.OPENINGBALANCE);
              const qtyMatch = obStr.match(/([\d.]+)\s*\w+/);
              if (qtyMatch) openingQty = qtyMatch[1];
            }
            if (item.OPENINGRATE) openingRate = String(parseFloat(String(item.OPENINGRATE).replace(/[^\d.-]/g, '')) || 0);
            if (item.OPENINGVALUE) openingValue = String(parseFloat(String(item.OPENINGVALUE).replace(/[^\d.-]/g, '')) || 0);

            await db.insert(tallyStockitemRaw).values({
              importId: importLog.id,
              guid,
              name,
              parent: item.PARENT || '',
              category: item.CATEGORY || '',
              baseUnit: item.BASEUNITS || item.ADDITIONALUNITS || '',
              hsnCode,
              gstRate,
              openingQty,
              openingRate,
              openingValue,
              godown: '',
              rawData: item,
              status: 'imported',
            });
            stockitemsImported++;
          } catch (e: any) {
            errors.push(`StockItem "${item['@_NAME'] || item.NAME}": ${e.message}`);
          }
        }
      }

      if (transactionData?.vouchers) {
        for (const voucher of transactionData.vouchers) {
          try {
            const vchKey = voucher['@_VCHKEY'] || voucher.VCHKEY || '';
            const remoteId = voucher['@_REMOTEID'] || voucher.REMOTEID || '';
            const voucherType = voucher['@_VCHTYPE'] || voucher.VOUCHERTYPENAME || '';
            if (!voucherType) continue;

            if (vchKey) {
              const existing = await db.select().from(tallyVoucherRaw).where(and(eq(tallyVoucherRaw.vchKey, vchKey), eq(tallyVoucherRaw.importId, importLog.id))).limit(1);
              if (existing.length > 0) continue;
            }

            let dateVal: Date | null = null;
            const dateStr = voucher.DATE || voucher['@_DATE'] || '';
            if (dateStr) {
              const ds = String(dateStr);
              if (ds.length === 8) {
                dateVal = new Date(`${ds.substring(0,4)}-${ds.substring(4,6)}-${ds.substring(6,8)}`);
              } else {
                dateVal = new Date(ds);
              }
              if (isNaN(dateVal.getTime())) dateVal = null;
            }

            const invEntries = voucher['ALLINVENTORYENTRIES.LIST'] || voucher['INVENTORYENTRIES.LIST'] || [];
            const inventoryEntries = (Array.isArray(invEntries) ? invEntries : [invEntries]).filter(Boolean).map((inv: any) => ({
              stockItemName: inv.STOCKITEMNAME || '',
              quantity: inv.ACTUALQTY || inv.BILLEDQTY || '',
              rate: inv.RATE || '',
              amount: inv.AMOUNT || '',
              discount: inv.DISCOUNT || '',
            }));

            const ledgEntries = voucher['ALLLEDGERENTRIES.LIST'] || voucher['LEDGERENTRIES.LIST'] || [];
            const ledgerEntries = (Array.isArray(ledgEntries) ? ledgEntries : [ledgEntries]).filter(Boolean).map((le: any) => ({
              ledgerName: le.LEDGERNAME || '',
              amount: le.AMOUNT || '',
              isDebit: parseFloat(String(le.AMOUNT || '0').replace(/[^\d.-]/g, '')) > 0,
            }));

            let amount: string | null = null;
            const partyEntry = ledgerEntries.find((le: any) => le.isDebit);
            if (partyEntry) amount = String(Math.abs(parseFloat(String(partyEntry.amount).replace(/[^\d.-]/g, '')) || 0));

            await db.insert(tallyVoucherRaw).values({
              importId: importLog.id,
              vchKey,
              remoteId,
              voucherType,
              voucherNumber: voucher.VOUCHERNUMBER || voucher['@_NUMBER'] || '',
              date: dateVal,
              partyLedgerName: voucher.PARTYLEDGERNAME || '',
              amount,
              narration: voucher.NARRATION || '',
              inventoryEntries,
              ledgerEntries,
              rawData: voucher,
              status: 'imported',
            });
            vouchersImported++;
          } catch (e: any) {
            errors.push(`Voucher: ${e.message}`);
          }
        }
      }

      await db.update(tallyImportLogs).set({
        ledgersImported,
        stockitemsImported,
        vouchersImported,
        errors: errors.length > 0 ? errors.slice(0, 100) : null,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      }).where(eq(tallyImportLogs.id, importLog.id));

      res.json({
        success: true,
        importId: importLog.id,
        summary: {
          ledgers: { found: masterData?.ledgers?.length || 0, imported: ledgersImported },
          stockItems: { found: masterData?.stockItems?.length || 0, imported: stockitemsImported },
          vouchers: { found: transactionData?.vouchers?.length || 0, imported: vouchersImported },
          errors: errors.length,
          errorSamples: errors.slice(0, 10),
        }
      });
    } catch (error) {
      console.error("Tally import error:", error);
      res.status(500).json({ error: "Failed to import Tally data. Ensure the file is a valid Tally XML export." });
    }
  });

  app.get("/api/tally/imports", async (req, res) => {
    try {
      const logs = await db.select().from(tallyImportLogs).orderBy(desc(tallyImportLogs.createdAt)).limit(20);
      res.json(logs);
    } catch (error) {
      console.error("Tally import logs error:", error);
      res.status(500).json({ error: "Failed to fetch import logs" });
    }
  });

  app.get("/api/tally/import/:importId/details", async (req, res) => {
    try {
      const importId = parseInt(req.params.importId);
      const [log] = await db.select().from(tallyImportLogs).where(eq(tallyImportLogs.id, importId)).limit(1);
      if (!log) return res.status(404).json({ error: "Import not found" });

      const ledgers = await db.select().from(tallyLedgerRaw).where(eq(tallyLedgerRaw.importId, importId));
      const stockItems = await db.select().from(tallyStockitemRaw).where(eq(tallyStockitemRaw.importId, importId));
      const vouchers = await db.select().from(tallyVoucherRaw).where(eq(tallyVoucherRaw.importId, importId));

      const vouchersByType: Record<string, number> = {};
      for (const v of vouchers) {
        vouchersByType[v.voucherType] = (vouchersByType[v.voucherType] || 0) + 1;
      }

      res.json({
        log,
        counts: { ledgers: ledgers.length, stockItems: stockItems.length, vouchers: vouchers.length },
        vouchersByType,
        ledgers: ledgers.slice(0, 50),
        stockItems: stockItems.slice(0, 50),
        vouchers: vouchers.slice(0, 50),
      });
    } catch (error) {
      console.error("Tally import details error:", error);
      res.status(500).json({ error: "Failed to fetch import details" });
    }
  });

  app.post("/api/tally/import/:importId/map-to-app", async (req, res) => {
    try {
      const importId = parseInt(req.params.importId);
      const merchantId = req.body.merchantId || 'default';
      const [log] = await db.select().from(tallyImportLogs).where(eq(tallyImportLogs.id, importId)).limit(1);
      if (!log) return res.status(404).json({ error: "Import not found" });

      const results = { usersCreated: 0, productsCreated: 0, ordersCreated: 0, paymentsCreated: 0, errors: [] as string[] };

      const ledgers = await db.select().from(tallyLedgerRaw).where(and(eq(tallyLedgerRaw.importId, importId), eq(tallyLedgerRaw.status, 'imported')));
      const partyGroups = ['sundry debtors', 'sundry creditors', 'dealers', 'wholesale dealers', 'retailers', 'customers', 'parties'];

      for (const ledger of ledgers) {
        try {
          const parentGroup = (ledger.parent || '').toLowerCase();
          if (!partyGroups.some(pg => parentGroup.includes(pg))) continue;

          let role = 'customer';
          let pricingRole = 'MRP';
          if (parentGroup.includes('wholesale') || parentGroup.includes('wsd')) {
            role = 'wholesale_dealer'; pricingRole = 'WHOLESALE_DEALER';
          } else if (parentGroup.includes('dealer')) {
            role = 'dealer'; pricingRole = 'DEALER';
          } else if (parentGroup.includes('retailer')) {
            role = 'retailer'; pricingRole = 'RETAILER';
          }

          const existingUser = await db.select().from(usersTable)
            .where(eq(usersTable.name, ledger.name)).limit(1);

          if (existingUser.length > 0) {
            await db.update(tallyLedgerRaw).set({ mappedToUserId: existingUser[0].id, status: 'mapped_existing' }).where(eq(tallyLedgerRaw.id, ledger.id));
            continue;
          }

          const [newUser] = await db.insert(usersTable).values({
            name: ledger.name,
            email: ledger.email || `tally_${ledger.id}@import.local`,
            phone: ledger.mobile || ledger.phone || '',
            role,
            pricingRole,
            gstin: ledger.gstin || '',
            unionId: merchantId,
            isActive: true,
            isApproved: true,
          } as any).returning();

          await db.update(tallyLedgerRaw).set({ mappedToUserId: newUser.id, status: 'mapped_new' }).where(eq(tallyLedgerRaw.id, ledger.id));
          results.usersCreated++;
        } catch (e: any) {
          results.errors.push(`Ledger "${ledger.name}": ${e.message}`);
        }
      }

      const stockItems = await db.select().from(tallyStockitemRaw).where(and(eq(tallyStockitemRaw.importId, importId), eq(tallyStockitemRaw.status, 'imported')));
      for (const item of stockItems) {
        try {
          const existingProduct = await storage.getProducts?.() || [];
          const found = existingProduct.find((p: any) => p.name?.toLowerCase() === item.name.toLowerCase());
          if (found) {
            await db.update(tallyStockitemRaw).set({ mappedToProductId: String(found.id), status: 'mapped_existing' }).where(eq(tallyStockitemRaw.id, item.id));
            continue;
          }

          await db.update(tallyStockitemRaw).set({ status: 'mapped_skipped' }).where(eq(tallyStockitemRaw.id, item.id));
          results.productsCreated++;
        } catch (e: any) {
          results.errors.push(`StockItem "${item.name}": ${e.message}`);
        }
      }

      const salesVouchers = await db.select().from(tallyVoucherRaw).where(and(
        eq(tallyVoucherRaw.importId, importId),
        eq(tallyVoucherRaw.status, 'imported'),
      ));

      for (const voucher of salesVouchers) {
        try {
          const vtype = voucher.voucherType.toLowerCase();
          if (vtype.includes('sale')) {
            await db.update(tallyVoucherRaw).set({ status: 'mapped_order' }).where(eq(tallyVoucherRaw.id, voucher.id));
            results.ordersCreated++;
          } else if (vtype.includes('receipt') || vtype.includes('payment')) {
            await db.update(tallyVoucherRaw).set({ status: 'mapped_payment' }).where(eq(tallyVoucherRaw.id, voucher.id));
            results.paymentsCreated++;
          } else {
            await db.update(tallyVoucherRaw).set({ status: 'mapped_other' }).where(eq(tallyVoucherRaw.id, voucher.id));
          }
        } catch (e: any) {
          results.errors.push(`Voucher ${voucher.voucherNumber}: ${e.message}`);
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Tally map-to-app error:", error);
      res.status(500).json({ error: "Failed to map Tally data to app tables" });
    }
  });

  // --- 13. GSTR API ---
  app.get("/api/gstr/gstr1/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ error: "month and year are required" });
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      const ordersList = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, merchantId), gte(ordersTable.createdAt, startDate), lte(ordersTable.createdAt, endDate)));
      const bulkInvoicesList = await db.select().from(bulkInvoices)
        .where(and(eq(bulkInvoices.merchantId, merchantId), gte(bulkInvoices.createdAt, startDate), lte(bulkInvoices.createdAt, endDate)));
      const b2b: any[] = [];
      const b2c: any[] = [];
      const gstRateGroups: Record<string, { taxableValue: number; igst: number; cgst: number; sgst: number; invoices: number }> = {};
      for (const order of ordersList) {
        const items = Array.isArray(order.items) ? order.items : [];
        let orderGst = 0;
        let orderTaxable = 0;
        for (const item of items as any[]) {
          const gstRate = parseFloat(item.gstPercent || "0");
          const price = parseFloat(item.price || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          const gstAmount = price - taxable;
          orderGst += gstAmount;
          orderTaxable += taxable;
          const rateKey = `${gstRate}%`;
          if (!gstRateGroups[rateKey]) gstRateGroups[rateKey] = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, invoices: 0 };
          gstRateGroups[rateKey].taxableValue += taxable;
          gstRateGroups[rateKey].cgst += gstAmount / 2;
          gstRateGroups[rateKey].sgst += gstAmount / 2;
        }
        const entry = {
          invoiceNumber: order.displayId || order.id,
          invoiceDate: order.createdAt,
          customerName: order.customerName,
          taxableValue: Math.round(orderTaxable * 100) / 100,
          gstAmount: Math.round(orderGst * 100) / 100,
          total: parseFloat(order.total),
        };
        if (parseFloat(order.total) > 250000) { b2b.push(entry); } else { b2c.push(entry); }
      }
      for (const bi of bulkInvoicesList) {
        if (bi.status === "cancelled") continue;
        const biItems = Array.isArray(bi.items) ? bi.items : [];
        let biGst = 0;
        let biTaxable = 0;
        for (const item of biItems as any[]) {
          const gstRate = parseFloat(item.gstRate || "0");
          const price = parseFloat(item.unitPrice || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          const gstAmt = price - taxable;
          biGst += gstAmt;
          biTaxable += taxable;
          const rateKey = `${gstRate}%`;
          if (!gstRateGroups[rateKey]) gstRateGroups[rateKey] = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, invoices: 0 };
          gstRateGroups[rateKey].taxableValue += taxable;
          gstRateGroups[rateKey].cgst += gstAmt / 2;
          gstRateGroups[rateKey].sgst += gstAmt / 2;
        }
        const entry = {
          invoiceNumber: bi.invoiceNumber,
          invoiceDate: bi.createdAt,
          customerName: bi.customerName,
          taxableValue: Math.round(biTaxable * 100) / 100,
          gstAmount: Math.round(biGst * 100) / 100,
          total: parseFloat(bi.totalAmount),
          source: "bulk_invoice",
        };
        if (bi.customerGstin) { b2b.push(entry); } else { b2c.push(entry); }
      }
      const totalInvoices = ordersList.length + bulkInvoicesList.filter(b => b.status !== "cancelled").length;
      res.json({ period: `${month}/${year}`, b2b, b2c, gstRateGroups, totalInvoices });
    } catch (error) {
      console.error("GSTR-1 error:", error);
      res.status(500).json({ error: "Failed to generate GSTR-1 data" });
    }
  });

  app.get("/api/gstr/gstr3b/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ error: "month and year are required" });
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      const ordersList = await db.select().from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, merchantId), gte(ordersTable.createdAt, startDate), lte(ordersTable.createdAt, endDate)));
      const bulkInvoicesList = await db.select().from(bulkInvoices)
        .where(and(eq(bulkInvoices.merchantId, merchantId), gte(bulkInvoices.createdAt, startDate), lte(bulkInvoices.createdAt, endDate)));
      let totalTaxableValue = 0;
      let totalIgst = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalCess = 0;
      for (const order of ordersList) {
        const items = Array.isArray(order.items) ? order.items : [];
        for (const item of items as any[]) {
          const gstRate = parseFloat(item.gstPercent || "0");
          const price = parseFloat(item.price || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          const gstAmount = price - taxable;
          totalTaxableValue += taxable;
          totalCgst += gstAmount / 2;
          totalSgst += gstAmount / 2;
        }
      }
      for (const bi of bulkInvoicesList) {
        if (bi.status === "cancelled") continue;
        const biItems = Array.isArray(bi.items) ? bi.items : [];
        for (const item of biItems as any[]) {
          const gstRate = parseFloat(item.gstRate || "0");
          const price = parseFloat(item.unitPrice || "0") * (item.quantity || 1);
          const taxable = price / (1 + gstRate / 100);
          const gstAmt = price - taxable;
          totalTaxableValue += taxable;
          totalCgst += gstAmt / 2;
          totalSgst += gstAmt / 2;
        }
      }
      const totalBulkSales = bulkInvoicesList.filter(b => b.status !== "cancelled").reduce((acc, b) => acc + parseFloat(b.totalAmount), 0);
      res.json({
        period: `${month}/${year}`,
        outwardSupplies: {
          taxableValue: Math.round(totalTaxableValue * 100) / 100,
          igst: Math.round(totalIgst * 100) / 100,
          cgst: Math.round(totalCgst * 100) / 100,
          sgst: Math.round(totalSgst * 100) / 100,
          cess: totalCess,
        },
        taxLiability: {
          igst: Math.round(totalIgst * 100) / 100,
          cgst: Math.round(totalCgst * 100) / 100,
          sgst: Math.round(totalSgst * 100) / 100,
          total: Math.round((totalIgst + totalCgst + totalSgst) * 100) / 100,
        },
        totalInvoices: ordersList.length + bulkInvoicesList.filter(b => b.status !== "cancelled").length,
        totalSalesValue: ordersList.reduce((acc, o) => acc + parseFloat(o.total), 0) + totalBulkSales,
      });
    } catch (error) {
      console.error("GSTR-3B error:", error);
      res.status(500).json({ error: "Failed to generate GSTR-3B data" });
    }
  });


  // ==================== KITCHEN DISPLAY SYSTEM (KDS) ROUTES ====================


  setTimeout(async () => {
    try {
      const allUsers = await storage.listUsers();
      const merchants = await storage.getMerchants();
      let fixed = 0;
      for (const user of allUsers) {
        const uid = (user as any).unionId || '';
        const du = (user as any).districtUnion || '';
        if (!uid && !du) continue;
        if (uid.startsWith('merchant-') || /^(UNI|FED)-/.test(uid)) continue;
        const resolved = resolveDistrictUnionToMerchantId(uid || du, merchants);
        if (resolved && resolved !== uid) {
          await storage.updateUser(user.id, { unionId: resolved, restaurantId: resolved } as any);
          fixed++;
        }
      }
    } catch (e: any) {
      if (!e.message?.includes('terminating connection')) {
        console.error('[B2B Fix] Error fixing unionId:', e.message);
      }
    }
  }, 5000);

  // ==================== TRANSPORT MANAGEMENT API ====================

}
