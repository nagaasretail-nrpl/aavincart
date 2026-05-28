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
import { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, invalidateCache } from "./utils";
import { generateTripId } from "./shared";

export async function registerFreshMilkRoutes(app: Express): Promise<void> {
  // ==================== FRESH MILK DISPATCH ROUTES ====================

  // Fresh Milk Routes CRUD
  app.get("/api/fresh-milk/routes", async (req, res) => {
    try {
      const unionId = req.query.unionId as string | undefined;
      const routes = await storage.getFreshMilkRoutes(unionId);
      res.json(routes);
    } catch (error) {
      console.error("Error fetching fresh milk routes:", error);
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.get("/api/fresh-milk/routes/:id", async (req, res) => {
    try {
      const route = await storage.getFreshMilkRoute(req.params.id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });

  app.post("/api/fresh-milk/routes", async (req, res) => {
    try {
      const route = await storage.createFreshMilkRoute(req.body);
      res.status(201).json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to create route" });
    }
  });

  app.put("/api/fresh-milk/routes/:id", async (req, res) => {
    try {
      const route = await storage.updateFreshMilkRoute(req.params.id, req.body);
      if (!route) return res.status(404).json({ error: "Route not found" });
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to update route" });
    }
  });

  app.delete("/api/fresh-milk/routes/:id", async (req, res) => {
    try {
      const result = await storage.deleteFreshMilkRoute(req.params.id);
      if (!result) return res.status(404).json({ error: "Route not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  // Fresh Milk Dispatch CRUD
  app.get("/api/fresh-milk/dispatches", async (req, res) => {
    try {
      const { unionId, date, shift, routeId } = req.query as any;
      const dispatches = await storage.getFreshMilkDispatches({ unionId, date, shift, routeId });
      // Enrich with route info and items
      const enriched = await Promise.all(dispatches.map(async (d) => {
        const route = await storage.getFreshMilkRoute(d.routeId);
        const items = await storage.getFreshMilkDispatchItems(d.id);
        return { ...d, route, items };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching dispatches:", error);
      res.status(500).json({ error: "Failed to fetch dispatches" });
    }
  });

  app.get("/api/fresh-milk/dispatches/:id", async (req, res) => {
    try {
      const dispatch = await storage.getFreshMilkDispatch(req.params.id);
      if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
      const route = await storage.getFreshMilkRoute(dispatch.routeId);
      const items = await storage.getFreshMilkDispatchItems(dispatch.id);
      res.json({ ...dispatch, route, items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dispatch" });
    }
  });

  app.post("/api/fresh-milk/dispatches", async (req, res) => {
    try {
      const { items, ...dispatchData } = req.body;
      const dispatch = await storage.createFreshMilkDispatch(dispatchData);

      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createFreshMilkDispatchItem({
            dispatchId: dispatch.id,
            milkType: item.milkType,
            qtyPackets: item.qtyPackets || 0,
            litres: item.litres || "0",
          });
        }
      }

      const savedItems = await storage.getFreshMilkDispatchItems(dispatch.id);
      const route = await storage.getFreshMilkRoute(dispatch.routeId);
      res.status(201).json({ ...dispatch, route, items: savedItems });
    } catch (error) {
      console.error("Error creating dispatch:", error);
      res.status(500).json({ error: "Failed to create dispatch" });
    }
  });

  app.put("/api/fresh-milk/dispatches/:id", async (req, res) => {
    try {
      const { items, ...dispatchData } = req.body;
      const dispatch = await storage.updateFreshMilkDispatch(req.params.id, dispatchData);
      if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });

      if (items && Array.isArray(items)) {
        await storage.deleteFreshMilkDispatchItemsByDispatch(dispatch.id);
        for (const item of items) {
          await storage.createFreshMilkDispatchItem({
            dispatchId: dispatch.id,
            milkType: item.milkType,
            qtyPackets: item.qtyPackets || 0,
            litres: item.litres || "0",
          });
        }
      }

      const savedItems = await storage.getFreshMilkDispatchItems(dispatch.id);
      const route = await storage.getFreshMilkRoute(dispatch.routeId);
      res.json({ ...dispatch, route, items: savedItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to update dispatch" });
    }
  });

  app.delete("/api/fresh-milk/dispatches/:id", async (req, res) => {
    try {
      await storage.deleteFreshMilkDispatchItemsByDispatch(req.params.id);
      const result = await storage.deleteFreshMilkDispatch(req.params.id);
      if (!result) return res.status(404).json({ error: "Dispatch not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dispatch" });
    }
  });

  // Fresh Milk Returns
  app.get("/api/fresh-milk/returns", async (req, res) => {
    try {
      const { unionId, date, shift } = req.query as any;
      const returns = await storage.getFreshMilkReturns({ unionId, date, shift });
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch returns" });
    }
  });

  app.post("/api/fresh-milk/returns", async (req, res) => {
    try {
      const ret = await storage.createFreshMilkReturn(req.body);
      res.status(201).json(ret);
    } catch (error) {
      res.status(500).json({ error: "Failed to create return" });
    }
  });

  // Fresh Milk Trip Sheet PDF
  app.get("/api/fresh-milk/trip-sheet/:dispatchId/pdf", async (req, res) => {
    try {
      const dispatch = await storage.getFreshMilkDispatch(req.params.dispatchId);
      if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });

      const route = await storage.getFreshMilkRoute(dispatch.routeId);
      const items = await storage.getFreshMilkDispatchItems(dispatch.id);

      const allRoutes = await storage.getFreshMilkRoutes(dispatch.unionId);
      const routeIdx = allRoutes.findIndex(r => r.id === dispatch.routeId);
      const driverNames = [
        "Vijay Kumar", "Sathish R", "Kannan P", "Manikandan V", "Ravi Shankar",
        "Prakash S", "Senthil Kumar", "Arun M", "Deepak R", "Ganesh K",
        "Hari Prasad", "Jegan S", "Karthik V", "Lakshmi Narayanan", "Mohan R",
        "Naveen Kumar", "Palani S", "Ramesh V", "Siva K", "Thirumal M",
        "Udhaya Kumar", "Velu P", "Bala S", "Dinesh K", "Ezhil R", "Gopal V", "Iyappan S"
      ];
      const vehicleNo = `TN-30-FM-${String(routeIdx + 1).padStart(4, "0")}`;
      const driverName = driverNames[routeIdx] || `Driver ${routeIdx + 1}`;
      const driverPhone = `98765${String(10000 + routeIdx)}`;

      const totalLitres = items.reduce((sum, i) => sum + parseFloat(i.litres || "0"), 0);
      const totalPackets = items.reduce((sum, i) => sum + (i.qtyPackets || 0), 0);

      const { generateTripSheetPDF } = await import("./trip-sheet-pdf");
      const doc = generateTripSheetPDF({
        unionName: "THE SALEM DISTRICT CO-OPERATIVE MILK PRODUCERS UNION LTD., SALEM",
        date: dispatch.dispatchDate,
        shift: dispatch.shift,
        routeName: route?.routeName || "Unknown",
        areaGroup: route?.areaGroup || "Salem",
        vehicleNo: vehicleNo,
        driverName: driverName,
        driverPhone: driverPhone,
        dispatchItems: items.map(i => ({
          milkType: i.milkType,
          qtyPackets: i.qtyPackets || 0,
          litres: parseFloat(i.litres || "0"),
        })),
        arrivalTime: dispatch.arrivalTime || "",
        dispatchTime: dispatch.dispatchTime || "",
        leakAllowance: parseFloat(dispatch.leakAllowanceLtrs || "0"),
        totalLitres,
        totalPackets,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="trip-sheet-${dispatch.dispatchDate}-${route?.routeName || 'route'}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Error generating trip sheet PDF:", error);
      res.status(500).json({ error: "Failed to generate trip sheet PDF" });
    }
  });

  // Fresh Milk DMR Report PDF
  app.get("/api/fresh-milk/dmr-report/pdf", async (req, res) => {
    try {
      const { date, shift, unionId } = req.query as any;
      if (!date || !shift) return res.status(400).json({ error: "date and shift required" });
      const targetUnion = unionId || "UNI-SLM-01";

      const dispatches = await storage.getFreshMilkDispatches({ unionId: targetUnion, date, shift });
      const routes = await storage.getFreshMilkRoutes(targetUnion);
      const returns = await storage.getFreshMilkReturns({ unionId: targetUnion, date, shift });

      const areaGroupMap: Record<string, any[]> = {};
      for (const d of dispatches) {
        const route = routes.find(r => r.id === d.routeId);
        if (!route) continue;
        const area = route.areaGroup || "Other";
        if (!areaGroupMap[area]) areaGroupMap[area] = [];
        const items = await storage.getFreshMilkDispatchItems(d.id);

        const milkData: Record<string, number> = { STD200: 0, DLT500: 0, FCM500: 0, FCM1000: 0, GM450: 0 };
        items.forEach(i => { milkData[i.milkType] = parseFloat(i.litres || "0"); });

        const totalLtrs = Object.values(milkData).reduce((a, b) => a + b, 0);
        const noOfTubs = Math.round(totalLtrs / 10);

        areaGroupMap[area].push({
          sNo: route.sequenceNo,
          routeName: route.routeName,
          arrivalTime: d.arrivalTime || "",
          dispatchTime: d.dispatchTime || "",
          std200: milkData.STD200,
          dlt500: milkData.DLT500,
          fcm500: milkData.FCM500,
          fcm1000: milkData.FCM1000,
          gm450: milkData.GM450,
          noOfTubs,
          totalLtrs,
          leakAll: parseFloat(d.leakAllowanceLtrs || "0"),
        });
      }

      const areaGroups = Object.entries(areaGroupMap).map(([areaName, routeData]) => ({
        areaName,
        routes: routeData.sort((a, b) => a.sNo - b.sNo),
      }));

      const allDispatches = dispatches;
      let grandStd = 0, grandDlt = 0, grandFcm = 0, grandGm = 0;
      for (const d of allDispatches) {
        const items = await storage.getFreshMilkDispatchItems(d.id);
        items.forEach(i => {
          const ltrs = parseFloat(i.litres || "0");
          if (i.milkType === "STD200") grandStd += ltrs;
          else if (i.milkType === "DLT500") grandDlt += ltrs;
          else if (i.milkType === "FCM500" || i.milkType === "FCM1000") grandFcm += ltrs;
          else if (i.milkType === "GM450") grandGm += ltrs;
        });
      }

      const { generateDMRReportPDF } = await import("./dmr-report-pdf");
      const doc = generateDMRReportPDF({
        unionName: "THE SALEM DISTRICT CO-OPERATIVE MILK PRODUCERS UNION LTD., SALEM",
        date: date,
        shift: shift,
        areaGroups,
        returns: returns.map(r => ({ milkType: r.milkType, returnLtrs: parseFloat(r.returnLtrs || "0") })),
        grandTotals: { std: grandStd, dlt: grandDlt, fcm: grandFcm, gm: grandGm },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="DMR-Report-${date}-${shift}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Error generating DMR report PDF:", error);
      res.status(500).json({ error: "Failed to generate DMR report" });
    }
  });

  // DMR Report JSON (for UI table display)
  app.get("/api/fresh-milk/dmr-report", async (req, res) => {
    try {
      const { date, shift, unionId } = req.query as any;
      if (!date || !shift) return res.status(400).json({ error: "date and shift required" });
      const targetUnion = unionId || "UNI-SLM-01";

      const dispatches = await storage.getFreshMilkDispatches({ unionId: targetUnion, date, shift });
      const routes = await storage.getFreshMilkRoutes(targetUnion);
      const returns = await storage.getFreshMilkReturns({ unionId: targetUnion, date, shift });

      const areaGroupMap: Record<string, any[]> = {};
      for (const d of dispatches) {
        const route = routes.find(r => r.id === d.routeId);
        if (!route) continue;
        const area = route.areaGroup || "Other";
        if (!areaGroupMap[area]) areaGroupMap[area] = [];
        const items = await storage.getFreshMilkDispatchItems(d.id);

        const milkData: Record<string, number> = { STD200: 0, DLT500: 0, FCM500: 0, FCM1000: 0, GM450: 0 };
        items.forEach(i => { milkData[i.milkType] = parseFloat(i.litres || "0"); });

        const totalLtrs = Object.values(milkData).reduce((a, b) => a + b, 0);
        const noOfTubs = Math.round(totalLtrs / 10);

        areaGroupMap[area].push({
          sNo: route.sequenceNo,
          routeName: route.routeName,
          arrivalTime: d.arrivalTime || "",
          dispatchTime: d.dispatchTime || "",
          std200: milkData.STD200,
          dlt500: milkData.DLT500,
          fcm500: milkData.FCM500,
          fcm1000: milkData.FCM1000,
          gm450: milkData.GM450,
          noOfTubs,
          totalLtrs,
          leakAll: parseFloat(d.leakAllowanceLtrs || "0"),
          dispatchId: d.id,
        });
      }

      const areaGroups = Object.entries(areaGroupMap).map(([areaName, routeData]) => ({
        areaName,
        routes: routeData.sort((a, b) => a.sNo - b.sNo),
      }));

      res.json({ date, shift, unionId: targetUnion, areaGroups, returns });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate DMR report data" });
    }
  });

  // Fresh Milk Drivers/Vehicles for a union
  app.get("/api/fresh-milk/vehicles", async (req, res) => {
    try {
      const unionId = (req.query.unionId as string) || "UNI-SLM-01";
      const routes = await storage.getFreshMilkRoutes(unionId);
      const driverNames = [
        "Vijay Kumar", "Sathish R", "Kannan P", "Manikandan V", "Ravi Shankar",
        "Prakash S", "Senthil Kumar", "Arun M", "Deepak R", "Ganesh K",
        "Hari Prasad", "Jegan S", "Karthik V", "Lakshmi Narayanan", "Mohan R",
        "Naveen Kumar", "Palani S", "Ramesh V", "Siva K", "Thirumal M",
        "Udhaya Kumar", "Velu P", "Bala S", "Dinesh K", "Ezhil R", "Gopal V", "Iyappan S"
      ];
      const vehicles = routes.map((route, idx) => ({
        vehicleId: `veh-fm-slm-${idx + 1}`,
        vehicleNo: `TN-30-FM-${String(idx + 1).padStart(4, "0")}`,
        routeId: route.id,
        routeName: route.routeName,
        areaGroup: route.areaGroup,
        driverId: `drv-fm-slm-${idx + 1}`,
        driverName: driverNames[idx] || `Driver ${idx + 1}`,
        driverPhone: `98765${String(10000 + idx)}`,
        capacity: "TBD",
        segment: "Fresh Milk",
      }));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  // ==================== BULK DELIVERY SYSTEM ROUTES ====================

  const VALID_SEGMENTS = ['Fresh Milk', 'Milk Products', 'Ice Cream', 'Butter Milk'];
  const DEPOT_CONFIG: Record<string, {lat: number, lng: number}> = {
    'UNI-AMB-01': { lat: 13.1143, lng: 80.1548 },
    'UNI-SLM-01': { lat: 11.6643, lng: 78.1460 },
    'default': { lat: 13.0827, lng: 80.2707 },
  };

  function getDepot(unionId: string) {
    return DEPOT_CONFIG[unionId] || DEPOT_CONFIG['default'];
  }

  const bulkDeliveryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /xlsx|xls|csv/;
      const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeTypes = /spreadsheet|excel|csv/;
      const mime = mimeTypes.test(file.mimetype);
      if (ext || mime) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
      }
    }
  });

}
