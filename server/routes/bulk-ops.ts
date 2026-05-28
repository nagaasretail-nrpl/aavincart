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

import { registerFreshMilkRoutes } from "./fresh-milk";
import { registerBulkDeliveryRoutes } from "./bulk-delivery";
import { registerMilkDispatchRoutes } from "./milk-dispatch";
import { registerMmoRoutes } from "./mmo";

export async function registerBulkOpsRoutes(app: Express): Promise<void> {
  await registerFreshMilkRoutes(app);
  await registerBulkDeliveryRoutes(app);
  await registerMilkDispatchRoutes(app);
  await registerMmoRoutes(app);
}
