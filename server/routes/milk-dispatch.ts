import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, ne, desc, asc, and, or, sql, inArray, gte, lte, isNull } from "drizzle-orm";
import { storage } from "../storage";
import {
  users as usersTable, orders as ordersTable, tripSheets, transportRoutePoints,
  bulkInvoices, deliveryJobs, bulkDeliveryLocations, manualBillBatches, manualBills,
  milkRouteAgents, milkDispatchEntries, milkAgentLedger,
  mmoOffices, mmoRoutes, mmoRouteAgents,
  insertMmoOfficeSchema, insertMmoRouteSchema, insertMmoRouteAgentSchema,
} from "@shared/schema";
import ExcelJS from "exceljs";
import multer from "multer";
import {
  haversineDistance, groupIntoStops, optimizeRoute, checkVehicleCapacity,
  buildRouteSummary, generateTripSheetPDF, generateVehicleWiseTripSheetsPDF,
  generateOptimizedStopsExcelData, generateRouteSummaryExcelData,
  generateEditableStopsExcelData, generateTripsExcelData, calculateBags,
  computeFuel, capacityFromTons, splitAllRoutesIntoTrips, buildTripSummaries,
  splitByVehicleCount, parseDMSCoordinate,
  type GroupInput, type TripConfig, type TripSummary, DEFAULT_TRIP_CONFIG,
} from "../bulk-delivery-engine";
import { logAudit } from "../audit";
import { requireAuth, requireRole, getUnionScope } from "./middleware";
import type { AuthenticatedRequest } from "./middleware";
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, invalidateCache } from "./utils";
import { generateTripId, merchantToUnionMapping } from "./shared";


const MILK_RATES: Record<string, number> = {
  fcm1000: 54,
  fcm500: 27,
  dlt500: 30,
  std200: 12,
};

export async function registerMilkDispatchRoutes(app: Express): Promise<void> {
  app.get("/api/milk-dispatch/routes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId } = req.query;
      if (!unionId) return res.status(400).json({ error: "unionId required" });
      const rows = await db.select({
        routeCode: milkRouteAgents.routeCode,
        routeName: milkRouteAgents.routeName,
        officeCode: milkRouteAgents.officeCode,
      }).from(milkRouteAgents).where(eq(milkRouteAgents.unionId, String(unionId)));
      const unique = new Map<string, { routeCode: string; routeName: string; officeCode: string }>();
      rows.forEach(r => { if (!unique.has(r.routeCode)) unique.set(r.routeCode, r); });
      res.json(Array.from(unique.values()));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/milk-dispatch/agents", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, routeCode } = req.query;
      if (!unionId) return res.status(400).json({ error: "unionId required" });
      const conditions = [eq(milkRouteAgents.unionId, String(unionId))];
      if (routeCode) conditions.push(eq(milkRouteAgents.routeCode, String(routeCode)));
      const agents = await db.select().from(milkRouteAgents)
        .where(and(...conditions))
        .orderBy(asc(milkRouteAgents.sequenceNo));
      res.json(agents);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/milk-dispatch/report", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, date, routeCode, shift, search } = req.query;
      if (!unionId || !date) return res.status(400).json({ error: "unionId and date required" });

      const agentConditions = [eq(milkRouteAgents.unionId, String(unionId))];
      if (routeCode) agentConditions.push(eq(milkRouteAgents.routeCode, String(routeCode)));
      const agents = await db.select().from(milkRouteAgents)
        .where(and(...agentConditions))
        .orderBy(asc(milkRouteAgents.sequenceNo));

      const dispatchConditions = [
        eq(milkDispatchEntries.unionId, String(unionId)),
        eq(milkDispatchEntries.dispatchDate, String(date)),
      ];
      if (routeCode) dispatchConditions.push(eq(milkDispatchEntries.routeCode, String(routeCode)));
      if (shift && shift !== "combined") dispatchConditions.push(eq(milkDispatchEntries.shift, String(shift)));
      const dispatches = await db.select().from(milkDispatchEntries).where(and(...dispatchConditions));

      const ledgerConditions = [
        eq(milkAgentLedger.unionId, String(unionId)),
        eq(milkAgentLedger.ledgerDate, String(date)),
      ];
      const ledgers = await db.select().from(milkAgentLedger).where(and(...ledgerConditions));
      const ledgerMap = new Map(ledgers.map(l => [l.agentCode, l]));

      const morningMap = new Map<string, typeof dispatches[0]>();
      const eveningMap = new Map<string, typeof dispatches[0]>();
      dispatches.forEach(d => {
        if (d.shift === "morning") morningMap.set(d.agentCode, d);
        else if (d.shift === "evening") eveningMap.set(d.agentCode, d);
      });

      const n = (v: string | null | undefined) => parseFloat(v || "0") || 0;

      let rows = agents.map((agent, idx) => {
        const m = morningMap.get(agent.agentCode);
        const e = eveningMap.get(agent.agentCode);
        const ledger = ledgerMap.get(agent.agentCode);

        const mFcm1000 = n(m?.fcm1000); const mFcm500 = n(m?.fcm500);
        const mDlt500 = n(m?.dlt500); const mStd200 = n(m?.std200);
        const eFcm1000 = n(e?.fcm1000); const eFcm500 = n(e?.fcm500);
        const eDlt500 = n(e?.dlt500); const eStd200 = n(e?.std200);

        const morningTotal = mFcm1000 + mFcm500 + mDlt500 + mStd200;
        const eveningTotal = eFcm1000 + eFcm500 + eDlt500 + eStd200;
        const grandTotal = morningTotal + eveningTotal;
        const milkValue = calcMilkValue(mFcm1000 + eFcm1000, mFcm500 + eFcm500, mDlt500 + eDlt500, mStd200 + eStd200);
        const ob = n(ledger?.openingBalance);
        const remittance = n(ledger?.remittance);
        const cb = ob + milkValue - remittance;

        return {
          sno: idx + 1,
          agentCode: agent.agentCode,
          agentName: agent.agentName,
          billable: agent.billable,
          ob,
          morningFcm1000: mFcm1000, morningFcm500: mFcm500, morningDlt500: mDlt500, morningStd200: mStd200, morningTotal,
          eveningFcm1000: eFcm1000, eveningFcm500: eFcm500, eveningDlt500: eDlt500, eveningStd200: eStd200, eveningTotal,
          grandTotal, milkValue, remittance, cb,
        };
      });

      if (search) {
        const s = String(search).toLowerCase();
        rows = rows.filter(r => r.agentCode.toLowerCase().includes(s) || r.agentName.toLowerCase().includes(s));
      }

      const totals = {
        ob: 0, morningFcm1000: 0, morningFcm500: 0, morningDlt500: 0, morningStd200: 0, morningTotal: 0,
        eveningFcm1000: 0, eveningFcm500: 0, eveningDlt500: 0, eveningStd200: 0, eveningTotal: 0,
        grandTotal: 0, milkValue: 0, remittance: 0, cb: 0,
      };
      rows.forEach(r => {
        totals.ob += r.ob; totals.morningFcm1000 += r.morningFcm1000; totals.morningFcm500 += r.morningFcm500;
        totals.morningDlt500 += r.morningDlt500; totals.morningStd200 += r.morningStd200; totals.morningTotal += r.morningTotal;
        totals.eveningFcm1000 += r.eveningFcm1000; totals.eveningFcm500 += r.eveningFcm500;
        totals.eveningDlt500 += r.eveningDlt500; totals.eveningStd200 += r.eveningStd200; totals.eveningTotal += r.eveningTotal;
        totals.grandTotal += r.grandTotal; totals.milkValue += r.milkValue; totals.remittance += r.remittance; totals.cb += r.cb;
      });

      const routeInfo = agents.length > 0 ? { routeCode: agents[0].routeCode, routeName: agents[0].routeName, officeCode: agents[0].officeCode } : null;

      res.json({
        header: { unionId, date, ...(routeInfo || {}), shift: shift || "combined" },
        rows,
        totals,
        summary: {
          morningTotalPackets: totals.morningTotal,
          eveningTotalPackets: totals.eveningTotal,
          totalMilkValue: totals.milkValue,
          netClosingBalance: totals.cb,
          agentsCovered: rows.filter(r => r.grandTotal > 0).length,
          totalAgents: rows.length,
          collectionEfficiency: totals.milkValue > 0 ? Math.round((totals.remittance / totals.milkValue) * 100) : 0,
        },
        rates: MILK_RATES,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/milk-dispatch/driver-sheet", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, date, routeCode } = req.query;
      if (!unionId || !date || !routeCode) return res.status(400).json({ error: "unionId, date, routeCode required" });

      const agents = await db.select().from(milkRouteAgents)
        .where(and(eq(milkRouteAgents.unionId, String(unionId)), eq(milkRouteAgents.routeCode, String(routeCode))))
        .orderBy(asc(milkRouteAgents.sequenceNo));

      const dispatches = await db.select().from(milkDispatchEntries)
        .where(and(
          eq(milkDispatchEntries.unionId, String(unionId)),
          eq(milkDispatchEntries.dispatchDate, String(date)),
          eq(milkDispatchEntries.routeCode, String(routeCode)),
        ));

      const morningMap = new Map<string, typeof dispatches[0]>();
      const eveningMap = new Map<string, typeof dispatches[0]>();
      dispatches.forEach(d => {
        if (d.shift === "morning") morningMap.set(d.agentCode, d);
        else eveningMap.set(d.agentCode, d);
      });

      const n = (v: string | null | undefined) => parseFloat(v || "0") || 0;
      const routeInfo = agents[0];

      const stops = agents.map((agent, idx) => {
        const m = morningMap.get(agent.agentCode);
        const e = eveningMap.get(agent.agentCode);
        const morningQty = n(m?.fcm1000) + n(m?.fcm500) + n(m?.dlt500) + n(m?.std200);
        const eveningQty = n(e?.fcm1000) + n(e?.fcm500) + n(e?.dlt500) + n(e?.std200);
        return {
          stopNo: idx + 1,
          agentCode: agent.agentCode,
          agentName: agent.agentName,
          route: routeInfo?.routeName || "",
          morningQty,
          eveningQty,
          grandTotal: morningQty + eveningQty,
          deliveryStatus: morningQty > 0 || eveningQty > 0 ? "pending" : "no_supply",
          remarks: "",
        };
      });

      res.json({ date, routeCode, routeName: routeInfo?.routeName, stops });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/milk-dispatch/entries", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, routeCode, dispatchDate, shift, entries } = req.body;
      if (!unionId || !routeCode || !dispatchDate || !shift || !entries) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let saved = 0;
      for (const entry of entries) {
        const fcm1000 = parseFloat(entry.fcm1000 || 0);
        const fcm500 = parseFloat(entry.fcm500 || 0);
        const dlt500 = parseFloat(entry.dlt500 || 0);
        const std200 = parseFloat(entry.std200 || 0);
        const totalPackets = fcm1000 + fcm500 + dlt500 + std200;

        const existing = await db.select().from(milkDispatchEntries).where(and(
          eq(milkDispatchEntries.unionId, unionId),
          eq(milkDispatchEntries.routeCode, routeCode),
          eq(milkDispatchEntries.agentCode, entry.agentCode),
          eq(milkDispatchEntries.dispatchDate, dispatchDate),
          eq(milkDispatchEntries.shift, shift),
        ));

        if (existing.length > 0) {
          await db.update(milkDispatchEntries).set({
            fcm1000: String(fcm1000), fcm500: String(fcm500), dlt500: String(dlt500), std200: String(std200),
            totalPackets: String(totalPackets), updatedAt: new Date(),
          }).where(eq(milkDispatchEntries.id, existing[0].id));
        } else {
          await db.insert(milkDispatchEntries).values({
            unionId, routeCode, agentCode: entry.agentCode, dispatchDate, shift,
            fcm1000: String(fcm1000), fcm500: String(fcm500), dlt500: String(dlt500), std200: String(std200),
            totalPackets: String(totalPackets),
          });
        }
        saved++;
      }

      res.json({ message: `Saved ${saved} entries`, saved });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/milk-dispatch/remittance", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { unionId, agentCode, ledgerDate, remittance } = req.body;
      if (!unionId || !agentCode || !ledgerDate) return res.status(400).json({ error: "Missing required fields" });

      const existing = await db.select().from(milkAgentLedger).where(and(
        eq(milkAgentLedger.unionId, unionId),
        eq(milkAgentLedger.agentCode, agentCode),
        eq(milkAgentLedger.ledgerDate, ledgerDate),
      ));

      const remittanceVal = parseFloat(remittance || 0);
      if (existing.length > 0) {
        const ob = parseFloat(existing[0].openingBalance || "0");
        const mv = parseFloat(existing[0].totalMilkValue || "0");
        const cb = ob + mv - remittanceVal;
        await db.update(milkAgentLedger).set({
          remittance: String(remittanceVal), closingBalance: String(cb), updatedAt: new Date(),
        }).where(eq(milkAgentLedger.id, existing[0].id));
      } else {
        await db.insert(milkAgentLedger).values({
          unionId, agentCode, ledgerDate,
          openingBalance: "0", totalMilkValue: "0",
          remittance: String(remittanceVal), closingBalance: String(-remittanceVal),
        });
      }

      res.json({ message: "Remittance recorded" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/milk-dispatch/seed", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const unionId = "merchant-3";
      const officeCode = "Edappadi";

      await db.delete(milkDispatchEntries).where(eq(milkDispatchEntries.unionId, unionId));
      await db.delete(milkAgentLedger).where(eq(milkAgentLedger.unionId, unionId));
      await db.delete(milkRouteAgents).where(eq(milkRouteAgents.unionId, unionId));

      const tmaAgents = [
        { code: "5339", name: "SHANKER" }, { code: "5344", name: "KAVITHA" },
        { code: "5328", name: "PERIYASAMY" }, { code: "5049", name: "PALANIYAPPAN" },
        { code: "5340", name: "KAVITHA" }, { code: "5350", name: "R.MANIKANDAN" },
        { code: "7052", name: "PAREVENTHAN" }, { code: "7019", name: "KARTHY" },
        { code: "7093", name: "KAILASH ELAVARASAN" }, { code: "7026", name: "S.MANIKANDAN" },
        { code: "7038", name: "RAMESH" }, { code: "7042", name: "CHELLAMMAL A" },
        { code: "5225", name: "KALAIVANNI" }, { code: "5296", name: "VELLIVEL" },
        { code: "5045", name: "SAMPATH" }, { code: "5268", name: "MURUGESAN" },
        { code: "7087", name: "G.CHITHRA" }, { code: "5186", name: "SENTHILKUMAR" },
        { code: "5009", name: "SIVABALAN" }, { code: "5008", name: "SIVAKUMAR" },
        { code: "7063", name: "KAMALA DURAISAMY" }, { code: "5211", name: "SEKALI" },
        { code: "5212", name: "PADHMAVATHI" }, { code: "5275", name: "RAJENDRAN" },
        { code: "5214", name: "E.SUDHA" }, { code: "5013", name: "M.R.N" },
        { code: "7058", name: "SUBRAMANI" }, { code: "5309", name: "AMUTHA" },
        { code: "5325", name: "MOHANRAJ" }, { code: "5217", name: "AYYASAMY" },
        { code: "5338", name: "KALAVATHI" }, { code: "7033", name: "SUMATHI" },
        { code: "7076", name: "JAYARAM" }, { code: "7062", name: "MANIKANDAN" },
        { code: "7034", name: "MUSHTHABA" }, { code: "7036", name: "ESWARIRAJA" },
        { code: "7095", name: "NAVEENKUMAR" }, { code: "7029", name: "DURAISAMY" },
        { code: "7096", name: "JAGADISSON" }, { code: "7031", name: "DEEPAKADHIRSAMY" },
        { code: "7078", name: "MANI M" }, { code: "7056", name: "VIGNESH" },
      ];
      const tmaFree = [
        { code: "FREE", name: "SUBRAMANI/SARAVANA/NESAR" },
        { code: "FREE", name: "SEKAR/NEEJAR" },
        { code: "FREE", name: "MADHANKUMAR/RANGASAMY" },
        { code: "FREE", name: "SANDHANAM" },
      ];

      const elpAgents = [
        { code: "3590", name: "Yahila Beevi" }, { code: "7097", name: "Yadav prasath" },
        { code: "3503", name: "Arul.C" }, { code: "7081", name: "VINOTH KUMAR" },
        { code: "3502", name: "Gnansekaran.N" }, { code: "3545", name: "Elampillai Coop Store" },
        { code: "3575", name: "Palanisamy.K" }, { code: "7085", name: "G.H Vembadithalam" },
        { code: "3508", name: "Ponnusamy.R" }, { code: "3566", name: "Mariyappan.A" },
        { code: "3509", name: "Nirmala.K" }, { code: "7079", name: "LAKSHMANAN D" },
        { code: "3510", name: "Selvi.P" }, { code: "3647", name: "Gobalakrishnan" },
        { code: "3641", name: "Magudeswaran" }, { code: "3757", name: "Kadyampatty Coop Store" },
        { code: "3570", name: "Manikandan.N" }, { code: "7092", name: "G.SENTHILKUMAR" },
        { code: "7035", name: "MEENA" }, { code: "7053", name: "PARAMESWARI" },
        { code: "7094", name: "PARVATHI" }, { code: "7073", name: "DHARANI.S" },
        { code: "7088", name: "Sathya priya" }, { code: "7051", name: "G.Saravanan" },
      ];
      const elpFree = [
        { code: "FREE", name: "K.RATHINAVELU" },
        { code: "FREE", name: "C.Sundareasan SIR(AGM)" },
      ];

      const snkAgents = [
        { code: "2098", name: "Senthilnathan.K" }, { code: "3001", name: "Palaniyappan.M" },
        { code: "3100", name: "Maliika.P" }, { code: "3134", name: "Raju.A" },
        { code: "3511", name: "Thirugnanasampantham" }, { code: "3069", name: "Ramanathan.V" },
        { code: "3131", name: "Govindharaj.A" }, { code: "7064", name: "LILAVATHI.K" },
        { code: "7072", name: "KRAPAGAM STORE" }, { code: "3004", name: "Krishnasamy" },
        { code: "7090", name: "ALLIMUTHU" }, { code: "3312", name: "Sangareswari.P" },
        { code: "7082", name: "G.H.NYANAM PATTI" }, { code: "7068", name: "N.MALLIKA" },
        { code: "7013", name: "G.MOHAN" }, { code: "7015", name: "RAJESHWARI" },
        { code: "7067", name: "M.RAVI" }, { code: "7098", name: "KASTURI.S" },
        { code: "3088", name: "Annamalai.S" }, { code: "7066", name: "SEKAR" },
      ];
      const snkFree = [
        { code: "FREE", name: "SENGOTTUVEL,CHANDRASEKAR" },
        { code: "FREE", name: "CHENNAKESAV &DURAI" },
        { code: "FREE", name: "KUMAR,P.SOMU" },
      ];

      const seedRoute = async (routeCode: string, routeName: string, agents: {code: string; name: string}[], freeAgents: {code: string; name: string}[]) => {
        let seq = 1;
        for (const a of agents) {
          await db.insert(milkRouteAgents).values({
            unionId, officeCode, routeCode, routeName,
            agentCode: a.code, agentName: a.name,
            supplyType: "Fresh Milk", billable: true, sequenceNo: seq++,
          });
        }
        for (const a of freeAgents) {
          await db.insert(milkRouteAgents).values({
            unionId, officeCode, routeCode, routeName,
            agentCode: `FREE-${seq}`, agentName: a.name,
            supplyType: "Fresh Milk", billable: false, sequenceNo: seq++,
          });
        }
      };

      await seedRoute("RT-TMA-01", "T.Mangalam / Edappady", tmaAgents, tmaFree);
      await seedRoute("RT-ELP-02", "Elampillai (EDPY)", elpAgents, elpFree);
      await seedRoute("RT-SNK-03", "Sakagiri (EDPY)", snkAgents, snkFree);

      const seedDispatch = async (routeCode: string, date: string, agentCode: string, shift: string, fcm1000: number, fcm500: number, dlt500: number, std200: number) => {
        const total = fcm1000 + fcm500 + dlt500 + std200;
        if (total === 0) return;
        await db.insert(milkDispatchEntries).values({
          unionId, routeCode, agentCode, dispatchDate: date, shift,
          fcm1000: String(fcm1000), fcm500: String(fcm500), dlt500: String(dlt500), std200: String(std200),
          totalPackets: String(total),
        });
      };

      // Sankagiri (RT-SNK-03) - Date 2026-03-07 from image 1
      const snkDate = "2026-03-07";
      await seedDispatch("RT-SNK-03", snkDate, "2098", "evening", 100, 0, 0, 0);
      await seedDispatch("RT-SNK-03", snkDate, "3001", "morning", 250, 0, 200, 100);
      await seedDispatch("RT-SNK-03", snkDate, "3001", "evening", 0, 50, 10, 300);
      await seedDispatch("RT-SNK-03", snkDate, "3100", "morning", 0, 70, 450, 50);
      await seedDispatch("RT-SNK-03", snkDate, "3134", "morning", 140, 0, 20, 50);
      await seedDispatch("RT-SNK-03", snkDate, "3511", "morning", 0, 0, 9, 0);
      await seedDispatch("RT-SNK-03", snkDate, "3069", "morning", 50, 0, 0, 0);
      await seedDispatch("RT-SNK-03", snkDate, "3069", "evening", 0, 120, 10, 60);
      await seedDispatch("RT-SNK-03", snkDate, "3131", "evening", 0, 40, 50, 0);
      await seedDispatch("RT-SNK-03", snkDate, "7064", "morning", 60, 100, 70, 70);
      await seedDispatch("RT-SNK-03", snkDate, "7064", "evening", 0, 30, 10, 10);
      await seedDispatch("RT-SNK-03", snkDate, "7072", "morning", 220, 130, 110, 110);
      await seedDispatch("RT-SNK-03", snkDate, "7072", "evening", 0, 40, 430, 230);
      await seedDispatch("RT-SNK-03", snkDate, "3004", "morning", 190, 80, 170, 130);
      await seedDispatch("RT-SNK-03", snkDate, "3004", "evening", 0, 100, 80, 60);
      await seedDispatch("RT-SNK-03", snkDate, "7090", "morning", 20, 10, 0, 10);
      await seedDispatch("RT-SNK-03", snkDate, "3312", "evening", 0, 50, 20, 0);
      await seedDispatch("RT-SNK-03", snkDate, "7082", "morning", 0, 0, 4, 0);
      await seedDispatch("RT-SNK-03", snkDate, "7068", "morning", 80, 140, 115, 60);
      await seedDispatch("RT-SNK-03", snkDate, "7068", "evening", 0, 20, 120, 90);
      await seedDispatch("RT-SNK-03", snkDate, "7013", "morning", 40, 0, 40, 20);
      await seedDispatch("RT-SNK-03", snkDate, "7013", "evening", 0, 70, 160, 180);
      await seedDispatch("RT-SNK-03", snkDate, "7015", "morning", 20, 10, 20, 10);
      await seedDispatch("RT-SNK-03", snkDate, "7015", "evening", 0, 20, 10, 20);
      await seedDispatch("RT-SNK-03", snkDate, "7067", "evening", 0, 70, 70, 50);
      await seedDispatch("RT-SNK-03", snkDate, "7098", "evening", 0, 10, 0, 0);
      await seedDispatch("RT-SNK-03", snkDate, "3088", "morning", 70, 20, 300, 40);
      await seedDispatch("RT-SNK-03", snkDate, "3088", "evening", 0, 40, 10, 140);
      await seedDispatch("RT-SNK-03", snkDate, "7066", "evening", 0, 50, 0, 0);
      await seedDispatch("RT-SNK-03", snkDate, "FREE-24", "morning", 0, 0, 1, 0);
      await seedDispatch("RT-SNK-03", snkDate, "FREE-25", "morning", 0, 0, 1, 0);

      // Elampillai (RT-ELP-02) - Date 2026-03-07 from image 2
      const elpDate = "2026-03-07";
      await seedDispatch("RT-ELP-02", elpDate, "3590", "morning", 0, 70, 0, 40);
      await seedDispatch("RT-ELP-02", elpDate, "3590", "evening", 100, 0, 70, 50);
      await seedDispatch("RT-ELP-02", elpDate, "7097", "morning", 100, 0, 0, 0);
      await seedDispatch("RT-ELP-02", elpDate, "7097", "evening", 0, 0, 0, 20);
      await seedDispatch("RT-ELP-02", elpDate, "3503", "morning", 0, 40, 20, 10);
      await seedDispatch("RT-ELP-02", elpDate, "3503", "evening", 0, 20, 10, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7081", "morning", 0, 10, 0, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7081", "evening", 70, 0, 0, 180);
      await seedDispatch("RT-ELP-02", elpDate, "3502", "morning", 50, 250, 190, 130);
      await seedDispatch("RT-ELP-02", elpDate, "3502", "evening", 20, 270, 40, 250);
      await seedDispatch("RT-ELP-02", elpDate, "3545", "morning", 0, 20, 50, 30);
      await seedDispatch("RT-ELP-02", elpDate, "3545", "evening", 20, 0, 90, 50);
      await seedDispatch("RT-ELP-02", elpDate, "3575", "morning", 0, 40, 10, 0);
      await seedDispatch("RT-ELP-02", elpDate, "3575", "evening", 0, 30, 10, 0);
      await seedDispatch("RT-ELP-02", elpDate, "7085", "morning", 0, 0, 3.5, 0);
      await seedDispatch("RT-ELP-02", elpDate, "3508", "morning", 100, 0, 0, 30);
      await seedDispatch("RT-ELP-02", elpDate, "3566", "evening", 0, 220, 9, 110);
      await seedDispatch("RT-ELP-02", elpDate, "3509", "morning", 50, 270, 166.5, 120);
      await seedDispatch("RT-ELP-02", elpDate, "3509", "evening", 10, 90, 130, 90);
      await seedDispatch("RT-ELP-02", elpDate, "7079", "evening", 0, 20, 90, 30);
      await seedDispatch("RT-ELP-02", elpDate, "3510", "evening", 0, 0, 10, 10);
      await seedDispatch("RT-ELP-02", elpDate, "3647", "morning", 0, 70, 60, 20);
      await seedDispatch("RT-ELP-02", elpDate, "3647", "evening", 0, 110, 0, 0);
      await seedDispatch("RT-ELP-02", elpDate, "3641", "morning", 0, 0, 50, 0);
      await seedDispatch("RT-ELP-02", elpDate, "3757", "morning", 180, 40, 110, 0);
      await seedDispatch("RT-ELP-02", elpDate, "3757", "evening", 90, 310, 160, 240);
      await seedDispatch("RT-ELP-02", elpDate, "3570", "morning", 0, 10, 20, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7092", "morning", 50, 30, 0, 30);
      await seedDispatch("RT-ELP-02", elpDate, "7035", "morning", 170, 110, 0, 70);
      await seedDispatch("RT-ELP-02", elpDate, "7035", "evening", 100, 0, 360, 30);
      await seedDispatch("RT-ELP-02", elpDate, "7053", "morning", 20, 90, 20, 150);
      await seedDispatch("RT-ELP-02", elpDate, "7053", "evening", 40, 130, 30, 300);
      await seedDispatch("RT-ELP-02", elpDate, "7094", "morning", 0, 170, 60, 40);
      await seedDispatch("RT-ELP-02", elpDate, "7094", "evening", 0, 260, 80, 150);
      await seedDispatch("RT-ELP-02", elpDate, "7073", "morning", 20, 30, 0, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7073", "evening", 10, 20, 0, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7088", "morning", 80, 90, 0, 0);
      await seedDispatch("RT-ELP-02", elpDate, "7088", "evening", 0, 170, 30, 0);
      await seedDispatch("RT-ELP-02", elpDate, "7051", "morning", 30, 20, 0, 10);
      await seedDispatch("RT-ELP-02", elpDate, "7051", "evening", 0, 50, 0, 20);

      // Tharamangalam (RT-TMA-01) - Date 2026-03-06 from image 3 (with OB/CB)
      const tmaDate = "2026-03-06";
      type TMAData = { code: string; ob: number; mFcm1000: number; mFcm500: number; mDlt500: number; mStd200: number; eFcm1000: number; eFcm500: number; eDlt500: number; eStd200: number; remittance: number };
      const tmaDispatchData: TMAData[] = [
        { code: "5339", ob: 117.32, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 120, eFcm500: 40, eDlt500: 40, eStd200: 220, remittance: 26375.32 },
        { code: "5344", ob: 380.85, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 30, eFcm500: 30, eDlt500: 60, eStd200: 150, remittance: 20395.05 },
        { code: "5328", ob: 849.56, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 10, eStd200: 10, remittance: 1766.96 },
        { code: "5049", ob: -50162.06, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 50, eFcm500: 30, eDlt500: 90, eStd200: 170, remittance: 3958.94 },
        { code: "5340", ob: 543, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 543 },
        { code: "5350", ob: 547.5, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7052", ob: 441.6, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7019", ob: 12575.5, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 50, eFcm500: 130, eDlt500: 10, eStd200: 150, remittance: 18772.5 },
        { code: "7093", ob: 2134, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7026", ob: 24.1, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7038", ob: 190.8, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 20, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7042", ob: 439.8, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 20, eFcm500: 0, eDlt500: 30, eStd200: 0, remittance: 0 },
        { code: "5225", ob: 35.05, mFcm1000: 0, mFcm500: 10, mDlt500: 0, mStd200: 60, eFcm1000: 0, eFcm500: 80, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "5296", ob: 1631.35, mFcm1000: 0, mFcm500: 40, mDlt500: 10, mStd200: 50, eFcm1000: 0, eFcm500: 100, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "5045", ob: 2836.28, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 10, eDlt500: 10, eStd200: 20, remittance: 0 },
        { code: "5268", ob: 1286.36, mFcm1000: 0, mFcm500: 20, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 10, eDlt500: 0, eStd200: 20, remittance: 0 },
        { code: "7087", ob: 632.8, mFcm1000: 0, mFcm500: 0, mDlt500: 20, mStd200: 30, eFcm1000: 70, eFcm500: 120, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "5186", ob: 204.47, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 30, eFcm500: 60, eDlt500: 0, eStd200: 140, remittance: 0 },
        { code: "5009", ob: 163.29, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 40, eFcm500: 0, eDlt500: 30, eStd200: 70, remittance: 0 },
        { code: "5008", ob: 165.7, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 10, eFcm500: 0, eDlt500: 10, eStd200: 0, remittance: 0 },
        { code: "7063", ob: -3956.2, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 20, eFcm500: 0, eDlt500: 20, eStd200: 40, remittance: 0 },
        { code: "5211", ob: -5202.16, mFcm1000: 200, mFcm500: 330, mDlt500: 98.5, mStd200: 440, eFcm1000: 60, eFcm500: 220, eDlt500: 0, eStd200: 480, remittance: 0 },
        { code: "5212", ob: 344.13, mFcm1000: 0, mFcm500: 50, mDlt500: 10, mStd200: 20, eFcm1000: 0, eFcm500: 30, eDlt500: 10, eStd200: 20, remittance: 0 },
        { code: "5275", ob: 40.33, mFcm1000: 0, mFcm500: 70, mDlt500: 70, mStd200: 29.5, eFcm1000: 30, eFcm500: 0, eDlt500: 0, eStd200: 199.5, remittance: 0 },
        { code: "5214", ob: 1200.53, mFcm1000: 30, mFcm500: 140, mDlt500: 20, mStd200: 140, eFcm1000: 0, eFcm500: 10, eDlt500: 40, eStd200: 0, remittance: 0 },
        { code: "5013", ob: 263.51, mFcm1000: 30, mFcm500: 150, mDlt500: 80, mStd200: 100, eFcm1000: 0, eFcm500: 100, eDlt500: 10, eStd200: 60, remittance: 0 },
        { code: "7058", ob: 158.8, mFcm1000: 0, mFcm500: 30, mDlt500: 30, mStd200: 0, eFcm1000: 0, eFcm500: 130, eDlt500: 190, eStd200: 0, remittance: 0 },
        { code: "5309", ob: 106.38, mFcm1000: 80, mFcm500: 110, mDlt500: 30, mStd200: 90, eFcm1000: 0, eFcm500: 70, eDlt500: 0, eStd200: 100, remittance: 0 },
        { code: "5325", ob: 106.57, mFcm1000: 170, mFcm500: 60, mDlt500: 30, mStd200: 210, eFcm1000: 0, eFcm500: 470, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "5217", ob: 221.29, mFcm1000: 0, mFcm500: 20, mDlt500: 0, mStd200: 50, eFcm1000: 0, eFcm500: 70, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "5338", ob: 716.1, mFcm1000: 0, mFcm500: 0, mDlt500: 40, mStd200: 40, eFcm1000: 0, eFcm500: 80, eDlt500: 40, eStd200: 0, remittance: 0 },
        { code: "7033", ob: 0.1, mFcm1000: 0, mFcm500: 30, mDlt500: 10, mStd200: 200, eFcm1000: 0, eFcm500: 240, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7076", ob: 34.6, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 20, eFcm1000: 0, eFcm500: 20, eDlt500: 100, eStd200: 70, remittance: 0 },
        { code: "7062", ob: 725.76, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 40, eFcm500: 20, eDlt500: 70, eStd200: 130, remittance: 0 },
        { code: "7034", ob: 829.2, mFcm1000: 0, mFcm500: 90, mDlt500: 20, mStd200: 10, eFcm1000: 120, eFcm500: 50, eDlt500: 30, eStd200: 0, remittance: 0 },
        { code: "7036", ob: 561.6, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 30, eDlt500: 70, eStd200: 100, remittance: 0 },
        { code: "7095", ob: 2, mFcm1000: 0, mFcm500: 10, mDlt500: 10, mStd200: 0, eFcm1000: 0, eFcm500: 30, eDlt500: 30, eStd200: 60, remittance: 0 },
        { code: "7029", ob: -17474.92, mFcm1000: 130, mFcm500: 150, mDlt500: 49.5, mStd200: 120, eFcm1000: 0, eFcm500: 70, eDlt500: 250, eStd200: 40, remittance: 0 },
        { code: "7096", ob: 925, mFcm1000: 0, mFcm500: 30, mDlt500: 0, mStd200: 20, eFcm1000: 0, eFcm500: 50, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7031", ob: 6.3, mFcm1000: 0, mFcm500: 0, mDlt500: 0, mStd200: 0, eFcm1000: 0, eFcm500: 0, eDlt500: 0, eStd200: 0, remittance: 0 },
        { code: "7078", ob: 0, mFcm1000: 0, mFcm500: 0, mDlt500: 20, mStd200: 0, eFcm1000: 0, eFcm500: 20, eDlt500: 40, eStd200: 0, remittance: 0 },
        { code: "7056", ob: -8075.8, mFcm1000: 0, mFcm500: 80, mDlt500: 0, mStd200: 10, eFcm1000: 0, eFcm500: 70, eDlt500: 160, eStd200: 0, remittance: 0 },
      ];

      for (const d of tmaDispatchData) {
        if (d.mFcm1000 || d.mFcm500 || d.mDlt500 || d.mStd200) {
          await seedDispatch("RT-TMA-01", tmaDate, d.code, "morning", d.mFcm1000, d.mFcm500, d.mDlt500, d.mStd200);
        }
        if (d.eFcm1000 || d.eFcm500 || d.eDlt500 || d.eStd200) {
          await seedDispatch("RT-TMA-01", tmaDate, d.code, "evening", d.eFcm1000, d.eFcm500, d.eDlt500, d.eStd200);
        }
        const milkValue = calcMilkValue(
          d.mFcm1000 + d.eFcm1000, d.mFcm500 + d.eFcm500,
          d.mDlt500 + d.eDlt500, d.mStd200 + d.eStd200
        );
        const cb = d.ob + milkValue - d.remittance;
        await db.insert(milkAgentLedger).values({
          unionId, agentCode: d.code, ledgerDate: tmaDate,
          openingBalance: String(d.ob), totalMilkValue: String(milkValue),
          remittance: String(d.remittance), closingBalance: String(cb),
        });
      }

      // Sankagiri remittance data from image 1
      const snkRemittance: Record<string, number> = {
        "2098": 6000, "3001": 48000, "3100": 25000, "3134": 11500,
        "3069": 15100, "3131": 10000, "7064": 17600, "7072": 86638.8,
        "3004": 46000, "7090": 2200, "3312": 8500, "7082": 176,
        "7068": 38387.9, "7013": 42000, "7015": 0, "7067": 0,
        "7098": 500, "3088": 0, "7066": 5700,
      };
      for (const [code, rem] of Object.entries(snkRemittance)) {
        const dispatched = await db.select().from(milkDispatchEntries)
          .where(and(
            eq(milkDispatchEntries.unionId, unionId),
            eq(milkDispatchEntries.agentCode, code),
            eq(milkDispatchEntries.dispatchDate, snkDate),
          ));
        let totalFcm1000 = 0, totalFcm500 = 0, totalDlt500 = 0, totalStd200 = 0;
        dispatched.forEach(d => {
          totalFcm1000 += parseFloat(d.fcm1000 || "0");
          totalFcm500 += parseFloat(d.fcm500 || "0");
          totalDlt500 += parseFloat(d.dlt500 || "0");
          totalStd200 += parseFloat(d.std200 || "0");
        });
        const milkValue = calcMilkValue(totalFcm1000, totalFcm500, totalDlt500, totalStd200);
        await db.insert(milkAgentLedger).values({
          unionId, agentCode: code, ledgerDate: snkDate,
          openingBalance: "0", totalMilkValue: String(milkValue),
          remittance: String(rem), closingBalance: String(milkValue - rem),
        });
      }

      // Elampillai remittance data from image 2
      const elpRemittance: Record<string, number> = {
        "3590": 16900, "7097": 15507, "3503": 0, "7081": 13500,
        "3502": 61000, "3545": 15000, "3575": 0, "7085": 0,
        "3508": 7100, "3566": 18000, "3509": 40000, "7079": 17000,
        "3510": 2000, "3647": 14000, "3641": 0, "3757": 73000,
        "3570": 2000, "7092": 6000, "7035": 64000, "7053": 37500,
        "7094": 39400, "7073": 6000, "7088": 25300, "7051": 8500,
      };
      for (const [code, rem] of Object.entries(elpRemittance)) {
        const dispatched = await db.select().from(milkDispatchEntries)
          .where(and(
            eq(milkDispatchEntries.unionId, unionId),
            eq(milkDispatchEntries.agentCode, code),
            eq(milkDispatchEntries.dispatchDate, elpDate),
          ));
        let totalFcm1000 = 0, totalFcm500 = 0, totalDlt500 = 0, totalStd200 = 0;
        dispatched.forEach(d => {
          totalFcm1000 += parseFloat(d.fcm1000 || "0");
          totalFcm500 += parseFloat(d.fcm500 || "0");
          totalDlt500 += parseFloat(d.dlt500 || "0");
          totalStd200 += parseFloat(d.std200 || "0");
        });
        const milkValue = calcMilkValue(totalFcm1000, totalFcm500, totalDlt500, totalStd200);
        await db.insert(milkAgentLedger).values({
          unionId, agentCode: code, ledgerDate: elpDate,
          openingBalance: "0", totalMilkValue: String(milkValue),
          remittance: String(rem), closingBalance: String(milkValue - rem),
        });
      }

      res.json({ message: "Seed complete: 3 routes, agents, dispatch data, and ledger entries created" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/milk-dispatch/sync", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const unionId = (req.body.unionId || "merchant-3") as string;
      const syncDate = (req.body.date || new Date().toISOString().split("T")[0]) as string;

      const routeAgents = await db.select().from(milkRouteAgents).where(eq(milkRouteAgents.unionId, unionId));
      if (routeAgents.length === 0) {
        return res.json({ message: "No route agents configured for this union", synced: 0 });
      }

      const agentCodeToRoute: Record<string, { routeCode: string; agentName: string }> = {};
      const agentNameToCode: Record<string, string> = {};
      for (const ra of routeAgents) {
        agentCodeToRoute[ra.agentCode] = { routeCode: ra.routeCode, agentName: ra.agentName };
        const nameKey = ra.agentName.toUpperCase().replace(/[.\s]+/g, '').trim();
        if (!agentNameToCode[nameKey]) agentNameToCode[nameKey] = ra.agentCode;
      }

      const allUsers = await db.select({
        id: usersTable.id,
        businessCode: usersTable.businessCode,
        businessRoute: usersTable.businessRoute,
        name: usersTable.name,
      }).from(usersTable).where(sql`${usersTable.businessCode} IS NOT NULL AND ${usersTable.businessCode} != ''`);

      const userIdToBusinessCode: Record<string, string> = {};
      const businessCodeToUserId: Record<string, string> = {};
      for (const u of allUsers) {
        if (u.businessCode) {
          userIdToBusinessCode[u.id] = u.businessCode;
          businessCodeToUserId[u.businessCode] = u.id;
        }
      }

      const prevDate = new Date(syncDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const orderDateStr = prevDate.toISOString().split("T")[0];
      const dateStart = new Date(orderDateStr + "T00:00:00");
      const dateEnd = new Date(orderDateStr + "T23:59:59");

      const mappedUnionId = merchantToUnionMapping[unionId] || unionId;
      const reverseUnionId = Object.entries(merchantToUnionMapping).find(([_, v]) => v === unionId)?.[0] || unionId;
      const restaurantIds = [...new Set([unionId, mappedUnionId, reverseUnionId])];

      const freshMilkOrders = await db.select().from(ordersTable).where(
        and(
          eq(ordersTable.productSegment, "Fresh Milk"),
          sql`${ordersTable.createdAt} >= ${dateStart} AND ${ordersTable.createdAt} <= ${dateEnd}`,
          sql`${ordersTable.restaurantId} IN (${sql.join(restaurantIds.map(id => sql`${id}`), sql`, `)})`
        )
      );

      const dispatchMap: Record<string, { routeCode: string; agentCode: string; shift: string; fcm1000: number; fcm500: number; dlt500: number; std200: number }> = {};

      let matchedOrders = 0;
      let unmatchedOrders = 0;

      for (const order of freshMilkOrders) {
        let agentCode: string | null = null;

        if (order.agentId && userIdToBusinessCode[order.agentId]) {
          agentCode = userIdToBusinessCode[order.agentId];
        }

        if (!agentCode && order.customerName) {
          const nameUpper = order.customerName.toUpperCase().trim();
          if (businessCodeToUserId[nameUpper] && agentCodeToRoute[nameUpper]) {
            agentCode = nameUpper;
          }
          if (!agentCode) {
            const codeMatch = order.customerName.match(/\b([A-Z]{2,3})(\d{3,5})\b/i);
            if (codeMatch) {
              const numericPart = codeMatch[2];
              if (agentCodeToRoute[numericPart]) {
                agentCode = numericPart;
              } else if (agentCodeToRoute[codeMatch[0].toUpperCase()]) {
                agentCode = codeMatch[0].toUpperCase();
              }
            }
          }
          if (!agentCode) {
            const pureNumMatch = nameUpper.match(/^(\d{3,5})$/);
            if (pureNumMatch && agentCodeToRoute[pureNumMatch[1]]) {
              agentCode = pureNumMatch[1];
            }
          }
          if (!agentCode) {
            const cleanName = nameUpper.replace(/[.\s]+/g, '');
            if (agentNameToCode[cleanName]) {
              agentCode = agentNameToCode[cleanName];
            }
          }
          if (!agentCode && nameUpper.length >= 4) {
            const cleanName = nameUpper.replace(/[.\s]+/g, '');
            const candidates: string[] = [];
            for (const [aName, aCode] of Object.entries(agentNameToCode)) {
              if (aName.startsWith(cleanName) || cleanName.startsWith(aName)) {
                candidates.push(aCode);
              }
            }
            if (candidates.length === 1) {
              agentCode = candidates[0];
            }
          }
        }

        if (!agentCode || !agentCodeToRoute[agentCode]) {
          unmatchedOrders++;
          continue;
        }

        matchedOrders++;
        const routeCode = agentCodeToRoute[agentCode].routeCode;

        const shift = order.deliveryShift || (order.createdAt && new Date(order.createdAt).getHours() >= 12 ? "evening" : "morning");

        const items: any[] = Array.isArray(order.items) ? order.items : [];
        let fcm1000 = 0, fcm500 = 0, dlt500 = 0, std200 = 0;

        for (const item of items) {
          const name = (item.name || item.productName || "").toLowerCase();
          const qty = parseFloat(item.quantity || item.qty || "0");
          const size = item.unitSize || item.size || "";
          const sizeStr = String(size);

          if ((name.includes("full cream") || name.includes("fcm")) && (sizeStr === "1000" || name.includes("1000") || name.includes("1 lit"))) {
            fcm1000 += qty;
          } else if ((name.includes("full cream") || name.includes("fcm")) && (sizeStr === "500" || name.includes("500"))) {
            fcm500 += qty;
          } else if ((name.includes("double toned") || name.includes("delite") || name.includes("dlt") || name.includes("toned")) && (sizeStr === "500" || name.includes("500"))) {
            dlt500 += qty;
          } else if ((name.includes("standard") || name.includes("std")) && (sizeStr === "200" || name.includes("200"))) {
            std200 += qty;
          }
        }

        const key = `${routeCode}|${agentCode}|${shift}`;
        if (!dispatchMap[key]) {
          dispatchMap[key] = { routeCode, agentCode, shift, fcm1000: 0, fcm500: 0, dlt500: 0, std200: 0 };
        }
        dispatchMap[key].fcm1000 += fcm1000;
        dispatchMap[key].fcm500 += fcm500;
        dispatchMap[key].dlt500 += dlt500;
        dispatchMap[key].std200 += std200;
      }

      let upsertCount = 0;
      const RATES = { fcm1000: 54, fcm500: 27, dlt500: 30, std200: 12 };
      const agentTotals: Record<string, { fcm1000: number; fcm500: number; dlt500: number; std200: number }> = {};

      for (const [, entry] of Object.entries(dispatchMap)) {
        const total = entry.fcm1000 + entry.fcm500 + entry.dlt500 + entry.std200;
        if (total === 0) continue;

        const existing = await db.select().from(milkDispatchEntries).where(
          and(
            eq(milkDispatchEntries.unionId, unionId),
            eq(milkDispatchEntries.routeCode, entry.routeCode),
            eq(milkDispatchEntries.agentCode, entry.agentCode),
            eq(milkDispatchEntries.dispatchDate, syncDate),
            eq(milkDispatchEntries.shift, entry.shift),
          )
        );

        if (existing.length > 0) {
          await db.update(milkDispatchEntries).set({
            fcm1000: String(entry.fcm1000),
            fcm500: String(entry.fcm500),
            dlt500: String(entry.dlt500),
            std200: String(entry.std200),
            totalPackets: String(total),
            enteredBy: "auto-sync",
            updatedAt: new Date(),
          }).where(eq(milkDispatchEntries.id, existing[0].id));
        } else {
          await db.insert(milkDispatchEntries).values({
            unionId,
            routeCode: entry.routeCode,
            agentCode: entry.agentCode,
            dispatchDate: syncDate,
            shift: entry.shift,
            fcm1000: String(entry.fcm1000),
            fcm500: String(entry.fcm500),
            dlt500: String(entry.dlt500),
            std200: String(entry.std200),
            totalPackets: String(total),
            enteredBy: "auto-sync",
          });
        }
        upsertCount++;

        if (!agentTotals[entry.agentCode]) {
          agentTotals[entry.agentCode] = { fcm1000: 0, fcm500: 0, dlt500: 0, std200: 0 };
        }
        agentTotals[entry.agentCode].fcm1000 += entry.fcm1000;
        agentTotals[entry.agentCode].fcm500 += entry.fcm500;
        agentTotals[entry.agentCode].dlt500 += entry.dlt500;
        agentTotals[entry.agentCode].std200 += entry.std200;
      }

      for (const [agentCode, totals] of Object.entries(agentTotals)) {
        const milkValue = totals.fcm1000 * RATES.fcm1000 + totals.fcm500 * RATES.fcm500 + totals.dlt500 * RATES.dlt500 + totals.std200 * RATES.std200;

        let ob = 0;
        const prevDate = new Date(syncDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split("T")[0];
        const prevLedger = await db.select().from(milkAgentLedger).where(
          and(
            eq(milkAgentLedger.unionId, unionId),
            eq(milkAgentLedger.agentCode, agentCode),
            eq(milkAgentLedger.ledgerDate, prevDateStr),
          )
        );
        if (prevLedger.length > 0) {
          ob = parseFloat(prevLedger[0].closingBalance || "0");
        }

        const existingLedger = await db.select().from(milkAgentLedger).where(
          and(
            eq(milkAgentLedger.unionId, unionId),
            eq(milkAgentLedger.agentCode, agentCode),
            eq(milkAgentLedger.ledgerDate, syncDate),
          )
        );

        const remittance = existingLedger.length > 0 ? parseFloat(existingLedger[0].remittance || "0") : 0;
        const cb = ob + milkValue - remittance;

        if (existingLedger.length > 0) {
          await db.update(milkAgentLedger).set({
            openingBalance: String(ob),
            totalMilkValue: String(milkValue),
            closingBalance: String(cb),
            updatedAt: new Date(),
          }).where(eq(milkAgentLedger.id, existingLedger[0].id));
        } else {
          await db.insert(milkAgentLedger).values({
            unionId,
            agentCode,
            ledgerDate: syncDate,
            openingBalance: String(ob),
            totalMilkValue: String(milkValue),
            remittance: "0",
            closingBalance: String(ob + milkValue),
          });
        }
      }

      res.json({
        message: `Sync complete for ${syncDate} (orders from ${orderDateStr})`,
        synced: upsertCount,
        matchedOrders,
        unmatchedOrders,
        totalFreshMilkOrders: freshMilkOrders.length,
        agentsUpdated: Object.keys(agentTotals).length,
      });
    } catch (e: any) {
      console.error("Milk dispatch sync error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/milk-dispatch/sync-status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const unionId = (req.query.unionId || "merchant-3") as string;
      const date = (req.query.date || new Date().toISOString().split("T")[0]) as string;

      const entries = await db.select().from(milkDispatchEntries).where(
        and(
          eq(milkDispatchEntries.unionId, unionId),
          eq(milkDispatchEntries.dispatchDate, date),
        )
      );

      const autoSynced = entries.filter(e => e.enteredBy === "auto-sync");
      const manual = entries.filter(e => e.enteredBy !== "auto-sync");
      const lastSync = autoSynced.length > 0
        ? autoSynced.reduce((latest, e) => {
            const t = e.updatedAt || e.createdAt;
            return t && t > (latest || new Date(0)) ? t : latest;
          }, null as Date | null)
        : null;

      res.json({
        date,
        totalEntries: entries.length,
        autoSyncedEntries: autoSynced.length,
        manualEntries: manual.length,
        lastSyncTime: lastSync ? lastSync.toISOString() : null,
        hasData: entries.length > 0,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===== MMO Helper: resolve merchant ID from request =====
  function resolveMerchantId(req: AuthenticatedRequest): string | null {
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

  // ===== MMO Offices CRUD =====
}
