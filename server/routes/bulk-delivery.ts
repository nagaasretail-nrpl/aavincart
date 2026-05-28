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
import { generateTripId, getAllIdsForMerchant, autoCreateDeliveryJob } from "./shared";


const bulkDeliveryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = /xlsx|xls|csv/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeTypes = /spreadsheet|excel|csv/;
    cb(null, ext || mimeTypes.test(file.mimetype));
  },
});

export async function registerBulkDeliveryRoutes(app: Express): Promise<void> {
  // --- Delivery Locations CRUD ---
  app.get("/api/bulk-delivery-locations/:merchantId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.params;
      const { unionId, routeNo, segment, isActive } = req.query;
      const conditions = [eq(bulkDeliveryLocations.merchantId, merchantId)];
      if (unionId) conditions.push(eq(bulkDeliveryLocations.unionId, String(unionId)));
      if (routeNo) conditions.push(eq(bulkDeliveryLocations.routeNo, Number(routeNo)));
      if (segment) conditions.push(eq(bulkDeliveryLocations.defaultSegment, String(segment)));
      if (isActive !== undefined) conditions.push(eq(bulkDeliveryLocations.isActive, isActive === 'true'));
      const locations = await db.select().from(bulkDeliveryLocations).where(and(...conditions)).orderBy(asc(bulkDeliveryLocations.routeNo), asc(bulkDeliveryLocations.zone));
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch delivery locations" });
    }
  });

  app.post("/api/bulk-delivery-locations", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const body = { ...req.body, merchantId: getEffectiveMerchantId(req, req.body.merchantId) };
      const [loc] = await db.insert(bulkDeliveryLocations).values(body).returning();
      res.json(loc);
    } catch (error) {
      res.status(500).json({ error: "Failed to create delivery location" });
    }
  });

  app.patch("/api/bulk-delivery-locations/:id", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const [loc] = await db.update(bulkDeliveryLocations).set(req.body).where(eq(bulkDeliveryLocations.id, Number(req.params.id))).returning();
      res.json(loc);
    } catch (error) {
      res.status(500).json({ error: "Failed to update delivery location" });
    }
  });

  app.delete("/api/bulk-delivery-locations/:id", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      await db.update(bulkDeliveryLocations).set({ isActive: false }).where(eq(bulkDeliveryLocations.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete delivery location" });
    }
  });

  app.post("/api/bulk-delivery-locations/bulk-import", requireAuth, requireRole('admin', 'merchant', 'union_staff'), bulkDeliveryUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const rows: any[] = await xlsxReadToJson(req.file.buffer);
      const merchantId = getEffectiveMerchantId(req, req.body.merchantId);
      const unionId = req.body.unionId || '';
      let imported = 0;
      for (const row of rows) {
        await db.insert(bulkDeliveryLocations).values({
          merchantId, unionId,
          zone: String(row['Zone'] || row['zone'] || ''),
          division: String(row['Division'] || row['division'] || ''),
          routeNo: Number(row['Route No'] || row['Route'] || row['routeNo'] || 1),
          locationName: String(row['Location Name'] || row['Name of the Location'] || row['locationName'] || ''),
          locationType: String(row['Location Type'] || row['locationType'] || ''),
          address: String(row['Address'] || row['address'] || ''),
          latitude: row['Latitude'] || row['latitude'] ? String(row['Latitude'] || row['latitude']) : null,
          longitude: row['Longitude'] || row['longitude'] ? String(row['Longitude'] || row['longitude']) : null,
          defaultSegment: String(row['Segment'] || row['defaultSegment'] || 'Butter Milk'),
          isActive: true,
        });
        imported++;
      }
      res.json({ success: true, imported, total: rows.length });
    } catch (error) {
      console.error('Bulk location import error:', error);
      res.status(500).json({ error: "Failed to import locations" });
    }
  });

  // --- Excel Template Download ---
  app.get("/api/bulk-delivery/template-download", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const mainHeaders = ['Zone', 'Division', 'Name of the Location', 'Latitude', 'Longitude', 'Address', 'Packets to be Delivered', 'BAGS', 'Remarks'];
      const sampleRows = [
        [1, 5, 'Division Office', 13.112, 80.21852, 'NO. 1 RAMAKRISHNA NAGAR, 2ND ROAD CH - 19', 565, 11, ''],
        [2, 18, 'Division Office', 13.175544, 80.256157, 'Nedunchezian St, CPCL layout, Manali, Chennai - 68', 379, 8, ''],
        [4, 44, 'Lorry Depot', '13°06\'44.7"N', '80°15\'09.3"E', 'No. 107, BB Road, Perambur, Chennai - 39', 1423, 28, ''],
      ];
      const lookupData = [
        ['Notes'],
        ['Zone = Route grouping number'],
        ['Division = Sub-identifier within zone'],
        ['Latitude/Longitude can be decimal (13.112) or DMS (13°06\'44.7"N)'],
        [''],
        ['Allowed Segments (optional, set during upload)'], ...VALID_SEGMENTS.map(s => [s]),
      ];

      const buf = await xlsxWriteAoa([
        { name: 'ManualBills', data: [mainHeaders, ...sampleRows] },
        { name: 'Lookups', data: lookupData },
      ]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Manual_Bills_Import_Template.xlsx');
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Helper: enforce union scoping for union_staff users on bulk delivery endpoints
  function getEffectiveMerchantId(req: AuthenticatedRequest, clientMerchantId?: string): string {
    const user = req.user as any;
    if (user?.role === 'union_staff' && user?.unionId) {
      return user.unionId;
    }
    return clientMerchantId || user?.merchantId || '';
  }

  // --- Manual Bills Upload ---
  app.post("/api/bulk-delivery/manual-bills/upload", requireAuth, requireRole('admin', 'merchant', 'union_staff'), bulkDeliveryUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const merchantId = getEffectiveMerchantId(req, req.body.merchantId);
      const unionId = req.body.unionId || '';
      const batchId = `MB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const rows: any[] = await xlsxReadToJson(req.file.buffer);

      if (rows.length === 0) return res.status(400).json({ error: "Excel file is empty" });

      const locations = await db.select().from(bulkDeliveryLocations)
        .where(and(eq(bulkDeliveryLocations.merchantId, merchantId), eq(bulkDeliveryLocations.isActive, true)));

      let totalRows = rows.length, validRows = 0, matchedRows = 0, unmatchedRows = 0, errorRows = 0;
      const billsToInsert: any[] = [];

      const todayStr = new Date().toISOString().split('T')[0];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const errors: string[] = [];

        const zone = row['Zone'] || row['zone'] || '';
        const division = row['Division'] || row['division'] || '';
        const locationName = row['Name of the Location'] || row['Location Name'] || row['location_name'] || '';
        const address = row['Address'] || row['address'] || '';
        const latRaw = row['Latitude'] || row['latitude'];
        const lngRaw = row['Longitude'] || row['longitude'];
        const dispatchDate = row['Dispatch Date'] || row['dispatch_date'] || todayStr;
        const segment = row['Segment'] || row['segment'] || '';
        const billNo = row['Bill No'] || row['bill_no'] || `STOP-${i + 1}`;
        let totalQtyNos = Number(row['Packets to be Delivered'] || row['packets to be delivered'] || row['Total Qty (Nos)'] || row['total_qty_nos'] || 0);
        let bags = Number(row['BAGS'] || row['Bags (50 Nos each)'] || row['bags'] || row['Bags'] || 0);

        if (!locationName && !address && !latRaw && !lngRaw) {
          errors.push('Missing location info (need Name of the Location, Address, or Lat/Long)');
        }

        if (segment && !VALID_SEGMENTS.map(s => s.toLowerCase()).includes(String(segment).toLowerCase())) {
          errors.push(`Invalid Segment: ${segment}. Must be one of: ${VALID_SEGMENTS.join(', ')}`);
        }

        if (totalQtyNos && bags) {
          // preserve user's uploaded bags value; don't recalculate
        } else if (bags && !totalQtyNos) {
          totalQtyNos = bags * 50;
        } else if (totalQtyNos) {
          bags = calculateBags(totalQtyNos);
        } else {
          totalQtyNos = 50;
          bags = 1;
        }

        const parsedLat = parseDMSCoordinate(latRaw);
        const parsedLng = parseDMSCoordinate(lngRaw);
        if (parsedLat !== null && (parsedLat < -90 || parsedLat > 90)) errors.push('Latitude must be between -90 and 90');
        if (parsedLng !== null && (parsedLng < -180 || parsedLng > 180)) errors.push('Longitude must be between -180 and 180');
        if ((parsedLat !== null && parsedLng === null) || (parsedLat === null && parsedLng !== null)) errors.push('Both Lat and Long required if either provided');

        let matchStatus = 'error';
        let matchedLocationId: number | null = null;
        let routeNo = Number(row['Route No'] || row['route_no'] || zone || 0);

        const divisionStr = division ? String(division) : '';
        const customerName = row['Customer / Outlet Name'] || row['customer_name'] || (divisionStr ? `Div ${divisionStr}` : '');

        if (errors.length === 0) {
          validRows++;
          let matched = false;

          if (parsedLat !== null && parsedLng !== null) {
            for (const loc of locations) {
              if (loc.latitude && loc.longitude) {
                const dist = haversineDistance(parsedLat, parsedLng, Number(loc.latitude), Number(loc.longitude));
                if (dist <= 300) {
                  matchedLocationId = loc.id;
                  if (!routeNo) routeNo = loc.routeNo;
                  matched = true;
                  break;
                }
              }
            }
          }

          if (!matched && locationName) {
            const locNameLower = String(locationName).toLowerCase().trim();
            const nameMatch = locations.find(l => l.locationName.toLowerCase().trim() === locNameLower);
            if (nameMatch) {
              matchedLocationId = nameMatch.id;
              if (!routeNo) routeNo = nameMatch.routeNo;
              matched = true;
            }
          }

          if (!matched && locationName && address) {
            const locNameLower = String(locationName).toLowerCase().trim();
            const addrLower = String(address).toLowerCase().trim();
            const fuzzyMatch = locations.find(l =>
              l.locationName.toLowerCase().includes(locNameLower) ||
              locNameLower.includes(l.locationName.toLowerCase()) ||
              (l.address && (l.address.toLowerCase().includes(addrLower) || addrLower.includes(l.address.toLowerCase())))
            );
            if (fuzzyMatch) {
              matchedLocationId = fuzzyMatch.id;
              if (!routeNo) routeNo = fuzzyMatch.routeNo;
              matched = true;
            }
          }

          if (matched) {
            matchStatus = 'matched';
            matchedRows++;
          } else if (!routeNo) {
            matchStatus = 'unmatched_route';
            unmatchedRows++;
          } else {
            matchStatus = 'unmatched_location';
            unmatchedRows++;
          }
        } else {
          errorRows++;
        }

        const remarksRaw = row['Remarks'] || row['remarks'] || '';
        const remarksParts = [remarksRaw, divisionStr ? `Division: ${divisionStr}` : ''].filter(Boolean);

        billsToInsert.push({
          batchId, merchantId,
          sNo: i + 1,
          dispatchDate: String(dispatchDate),
          segment: String(segment || ''),
          routeNo: routeNo || null,
          billNo: String(billNo),
          billDate: String(row['Bill Date'] || row['bill_date'] || ''),
          customerName: String(customerName),
          locationName: String(locationName),
          address: String(address),
          latitude: parsedLat !== null ? String(parsedLat) : null,
          longitude: parsedLng !== null ? String(parsedLng) : null,
          totalQtyNos,
          bags,
          zone: String(zone || ''),
          division: String(division || ''),
          remarks: remarksParts.join(' | '),
          matchStatus,
          matchedLocationId,
          validationErrors: errors.length > 0 ? errors : null,
        });
      }

      for (const bill of billsToInsert) {
        await db.insert(manualBills).values(bill);
      }

      await db.insert(manualBillBatches).values({
        batchId, merchantId, unionId,
        uploadedBy: req.user?.email || req.user?.username || '',
        fileName: req.file.originalname || 'upload.xlsx',
        totalRows, validRows, matchedRows, unmatchedRows, errorRows,
        status: 'validated',
      });

      res.json({ batchId, totalRows, validRows, matchedRows, unmatchedRows, errorRows, status: 'validated' });
    } catch (error) {
      console.error('Manual bills upload error:', error);
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // --- Get Manual Bills by Batch ---
  app.get("/api/bulk-delivery/manual-bills/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const bills = await db.select().from(manualBills).where(eq(manualBills.batchId, req.params.batchId)).orderBy(asc(manualBills.sNo));
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch manual bills" });
    }
  });

  // --- Get All Batches ---
  app.get("/api/bulk-delivery/batches/:merchantId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const batches = await db.select().from(manualBillBatches).where(eq(manualBillBatches.merchantId, req.params.merchantId)).orderBy(desc(manualBillBatches.createdAt));
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  // --- Errors Excel Download ---
  app.get("/api/bulk-delivery/manual-bills/:batchId/errors-excel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      if (req.user?.role !== 'admin' && batch.merchantId !== req.user?.merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const bills = await db.select().from(manualBills).where(and(eq(manualBills.batchId, req.params.batchId), eq(manualBills.matchStatus, 'error')));

      const errorSuggestions: Record<string, string> = {
        'Missing location info': 'Provide at least a "Name of the Location" or valid Latitude and Longitude coordinates',
        'Invalid Segment': `Use one of these segments: ${VALID_SEGMENTS.join(', ')}`,
        'Latitude must be between': 'Latitude must be between -90 and 90. Use decimal (e.g. 13.112) or DMS format (e.g. 13°06\'44.7"N)',
        'Longitude must be between': 'Longitude must be between -180 and 180. Use decimal (e.g. 80.218) or DMS format (e.g. 80°15\'09.3"E)',
        'Both Lat and Long required': 'Provide both Latitude and Longitude together, or remove both and use Location Name instead',
      };

      function getSuggestion(errors: string[]): string {
        const suggestions: string[] = [];
        for (const err of errors) {
          let matched = false;
          for (const [key, suggestion] of Object.entries(errorSuggestions)) {
            if (err.includes(key)) { suggestions.push(suggestion); matched = true; break; }
          }
          if (!matched) suggestions.push('Review and correct this field');
        }
        return [...new Set(suggestions)].join('; ');
      }

      function extractDivision(remarks: string): string {
        const match = remarks?.match(/Division:\s*(\S+)/);
        return match ? match[1] : '';
      }

      const headers = ['S.No', 'Zone', 'Division', 'Name of the Location', 'Latitude', 'Longitude', 'Address', 'Remarks', 'Error Reason', 'Suggested Correction'];
      const rows = bills.map(b => {
        const errs = Array.isArray(b.validationErrors) ? (b.validationErrors as string[]) : [];
        return [
          b.sNo, b.routeNo || '', extractDivision(b.remarks || ''),
          b.locationName, b.latitude, b.longitude, b.address, b.remarks || '',
          errs.join('; '), getSuggestion(errs)
        ];
      });
      const buf = await xlsxWriteAoa([{ name: 'Errors', data: [headers, ...rows] }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Errors_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate errors excel" });
    }
  });

  // --- Unmatched Excel Download ---
  app.get("/api/bulk-delivery/manual-bills/:batchId/unmatched-excel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      if (req.user?.role !== 'admin' && batch.merchantId !== req.user?.merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const bills = await db.select().from(manualBills).where(and(
        eq(manualBills.batchId, req.params.batchId),
        or(eq(manualBills.matchStatus, 'unmatched_location'), eq(manualBills.matchStatus, 'unmatched_route'))
      ));

      const merchantId = batch.merchantId;
      const locations = merchantId ? await db.select().from(bulkDeliveryLocations)
        .where(and(eq(bulkDeliveryLocations.merchantId, merchantId), eq(bulkDeliveryLocations.isActive, true))) : [];

      function extractDivision(remarks: string): string {
        const match = remarks?.match(/Division:\s*(\S+)/);
        return match ? match[1] : '';
      }

      function findNearestLocation(lat: string | null, lng: string | null) {
        if (!lat || !lng || locations.length === 0) return { name: '', distance: '' };
        const bLat = parseFloat(lat);
        const bLng = parseFloat(lng);
        if (isNaN(bLat) || isNaN(bLng)) return { name: '', distance: '' };
        let minDist = Infinity;
        let nearest = '';
        for (const loc of locations) {
          if (loc.latitude && loc.longitude) {
            const d = haversineDistance(bLat, bLng, Number(loc.latitude), Number(loc.longitude));
            if (d < minDist) { minDist = d; nearest = `${loc.locationName} (Route ${loc.routeNo})`; }
          }
        }
        if (!nearest) return { name: '', distance: '' };
        const distStr = minDist < 1000 ? `${Math.round(minDist)} m` : `${(minDist / 1000).toFixed(1)} km`;
        return { name: nearest, distance: distStr };
      }

      const headers = ['S.No', 'Zone', 'Division', 'Name of the Location', 'Latitude', 'Longitude', 'Address', 'Reason', 'Suggested Correction', 'Nearest Master Location', 'Distance to Nearest'];
      const rows = bills.map(b => {
        const isRouteIssue = b.matchStatus === 'unmatched_route';
        const reason = isRouteIssue
          ? 'No route/zone number found — Zone was empty or not provided in the upload'
          : 'Location not found in master locations database — no GPS match within 300m and no name match';
        const suggestion = isRouteIssue
          ? 'Provide a valid Zone number in your upload, or add this location to the Locations master with correct coordinates'
          : 'Check the location name spelling, verify GPS coordinates are accurate, or add this location to the Locations master first';
        const nearest = findNearestLocation(b.latitude, b.longitude);
        return [
          b.sNo, b.routeNo || '', extractDivision(b.remarks || ''),
          b.locationName, b.latitude, b.longitude, b.address,
          reason, suggestion, nearest.name, nearest.distance
        ];
      });
      const buf = await xlsxWriteAoa([{ name: 'Unmatched', data: [headers, ...rows] }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Unmatched_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate unmatched excel" });
    }
  });

  // ==================== MODE A: System Bulk Invoices ====================

  app.post("/api/bulk-delivery/mode-a/load-invoices", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { date, merchantId: clientMerchantId, segment, routeNo } = req.body;
      const merchantId = getEffectiveMerchantId(req, clientMerchantId);
      const conditions = [
        eq(bulkInvoices.status, 'confirmed'),
        eq(bulkInvoices.deliveryRequired, true),
        isNull(bulkInvoices.tripId),
      ];
      if (merchantId) conditions.push(eq(bulkInvoices.merchantId, merchantId));
      if (segment) conditions.push(eq(bulkInvoices.productSegment, segment));
      if (date) {
        conditions.push(gte(bulkInvoices.createdAt, new Date(date)));
        conditions.push(lte(bulkInvoices.createdAt, new Date(date + 'T23:59:59')));
      }
      const invoices = await db.select().from(bulkInvoices).where(and(...conditions)).orderBy(desc(bulkInvoices.createdAt));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to load invoices" });
    }
  });

  app.post("/api/bulk-delivery/mode-a/build-stops", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { invoiceIds, packSize = 50 } = req.body;
      if (!invoiceIds || !invoiceIds.length) return res.status(400).json({ error: "No invoice IDs provided" });
      const invoices = await db.select().from(bulkInvoices).where(inArray(bulkInvoices.id, invoiceIds));
      const items: GroupInput[] = invoices.map(inv => ({
        routeNo: 1,
        locationName: inv.customerName,
        address: inv.deliveryAddress || '',
        latitude: inv.deliveryLat ? Number(inv.deliveryLat) : undefined,
        longitude: inv.deliveryLng ? Number(inv.deliveryLng) : undefined,
        totalQtyNos: Math.round(Number(inv.totalAmount) / 10),
        segment: inv.productSegment || 'Mixed',
      }));
      const stops = groupIntoStops(items, packSize);
      res.json({ stops, totalStops: stops.length, totalQtyNos: stops.reduce((s, st) => s + st.totalQtyNos, 0), totalBags: stops.reduce((s, st) => s + st.bags, 0) });
    } catch (error) {
      res.status(500).json({ error: "Failed to build stops" });
    }
  });

  app.post("/api/bulk-delivery/mode-a/optimize", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { stops, unionId = 'default' } = req.body;
      if (!stops || !stops.length) return res.status(400).json({ error: "No stops provided" });
      const depot = getDepot(unionId);
      const optimized = optimizeRoute(stops, depot.lat, depot.lng);
      const summary = buildRouteSummary(optimized);
      res.json({ optimizedStops: optimized, routeSummary: summary, depot });
    } catch (error) {
      res.status(500).json({ error: "Failed to optimize route" });
    }
  });

  app.post("/api/bulk-delivery/mode-a/create-trip", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { optimizedStops, vehicleId, driverId, vehicleNo, driverName, driverPhone, invoiceIds, segment, unionId, date, vehicleCapacity = 120 } = req.body;
      const capacityResult = checkVehicleCapacity(optimizedStops, vehicleCapacity);
      const tripsToCreate = capacityResult.trips;
      const createdTrips = [];
      const mId = getEffectiveMerchantId(req, req.body.merchantId);
      const allMerchants = await storage.getMerchants();
      const resolvedUnionName = allMerchants.find(m => m.id === mId)?.restaurantName || mId;

      for (let t = 0; t < tripsToCreate.length; t++) {
        const tripStops = tripsToCreate[t];
        const tripDate = date || new Date().toISOString().split('T')[0];
        const existingTrips = await db.select().from(tripSheets).where(sql`date = ${tripDate}`);
        const seq = existingTrips.length + t + 1;
        const tripId = generateTripId(unionId || 'HUB', tripDate, seq);
        const totalBags = tripStops.reduce((s: number, st: any) => s + st.bags, 0);

        const [trip] = await db.insert(tripSheets).values({
          tripId,
          routeName: `Bulk Route ${t + 1}`,
          shift: 'Morning',
          date: tripDate,
          unionId: unionId || mId || null,
          unionName: resolvedUnionName,
          vehicleId: vehicleId || null,
          vehicleNo: vehicleNo || '',
          driverId: driverId || null,
          driverName: driverName || '',
          driverPhone: driverPhone || '',
          segment: segment || 'Mixed',
          status: 'Planned',
          plannedDropPoints: tripStops.length,
          completedDropPoints: 0,
          bagsPlanned: totalBags,
          bagsLoaded: totalBags,
          capacityBags: vehicleCapacity,
          tonnageLoaded: String(Math.round(totalBags * bagWeight) / 1000),
        }).returning();

        for (const stop of tripStops) {
          await db.insert(transportRoutePoints).values({
            tripId: trip.id,
            locationName: stop.locationName,
            lat: String(stop.latitude),
            lng: String(stop.longitude),
            sequenceNo: stop.stopSeq,
            bagsToDeliver: stop.bags,
            status: 'pending',
          });
        }

        createdTrips.push(trip);
      }

      if (invoiceIds && invoiceIds.length) {
        for (const invId of invoiceIds) {
          await db.update(bulkInvoices).set({ tripId: createdTrips[0]?.id, status: 'dispatched' }).where(eq(bulkInvoices.id, invId));
        }
      }

      res.json({ success: true, trips: createdTrips, splitInto: tripsToCreate.length });
    } catch (error) {
      console.error('Mode A create trip error:', error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.get("/api/bulk-delivery/mode-a/trip-sheet/:tripId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [trip] = await db.select().from(tripSheets).where(eq(tripSheets.tripId, req.params.tripId));
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      const points = await db.select().from(transportRoutePoints).where(eq(transportRoutePoints.tripId, trip.id)).orderBy(asc(transportRoutePoints.sequenceNo));
      const stops = points.map((p, i) => ({
        stopSeq: i + 1, routeNo: 1, locationName: p.locationName || '', locationType: '', address: '',
        latitude: Number(p.lat) || 0, longitude: Number(p.lng) || 0,
        totalQtyNos: (p.bagsToDeliver || 0) * 50, bags: p.bagsToDeliver || 0,
        zone: '', division: '', distanceFromPrevKm: 0, cumulativeKm: 0,
      }));
      const pdfBuffer = await generateTripSheetPDF(
        { tripId: trip.tripId || '', date: trip.date || '', unionName: trip.unionName || '', segment: trip.segment || '', vehicleNo: trip.vehicleNo || '', driverName: trip.driverName || '' },
        stops
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=TripSheet_${trip.tripId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate trip sheet" });
    }
  });

  // ==================== MODE B: Manual Bills Pipeline ====================

  app.post("/api/bulk-delivery/mode-b/optimize/:batchId", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { batchId } = req.params;
      const {
        packSize = DEFAULT_TRIP_CONFIG.packSize,
        unionId = 'default',
        bagWeightKg = DEFAULT_TRIP_CONFIG.bagWeightKg,
        vehicleCapacityBags: rawCapBags,
        vehicleCapacityTons,
        kmPerLiter = DEFAULT_TRIP_CONFIG.kmPerLiter,
        fuelPricePerLiter = DEFAULT_TRIP_CONFIG.fuelPricePerLiter,
        optimizeMode = 'capacity',
        vehicleCount: rawVehicleCount,
      } = req.body;

      const useVehicleCount = optimizeMode === 'vehicleCount' && rawVehicleCount && Number(rawVehicleCount) > 0;

      let vehicleCapacityBags = rawCapBags || DEFAULT_TRIP_CONFIG.vehicleCapacityBags;
      if (vehicleCapacityTons && !rawCapBags) {
        vehicleCapacityBags = capacityFromTons(Number(vehicleCapacityTons), Number(bagWeightKg));
      }

      if (!useVehicleCount && (!vehicleCapacityBags || vehicleCapacityBags < 1 || !isFinite(vehicleCapacityBags))) {
        return res.status(400).json({ error: "Vehicle capacity must be a positive number" });
      }
      if (Number(bagWeightKg) <= 0 || !isFinite(Number(bagWeightKg))) {
        return res.status(400).json({ error: "Bag weight must be a positive number" });
      }

      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, batchId));
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      if ((batch.errorRows || 0) > 0) {
        return res.status(400).json({ error: "Cannot optimize: there are error rows. Fix them first." });
      }

      const bills = await db.select().from(manualBills).where(and(
        eq(manualBills.batchId, batchId),
        or(
          eq(manualBills.matchStatus, 'matched'),
          eq(manualBills.matchStatus, 'unmatched_location'),
          eq(manualBills.matchStatus, 'unmatched_route')
        )
      ));
      const locations = await db.select().from(bulkDeliveryLocations).where(eq(bulkDeliveryLocations.merchantId, batch.merchantId));
      const locMap = new Map(locations.map(l => [l.id, l]));

      const items: GroupInput[] = bills.map(b => {
        const matchedLoc = b.matchedLocationId ? locMap.get(b.matchedLocationId) : null;
        return {
          routeNo: b.routeNo || matchedLoc?.routeNo || 1,
          locationId: b.matchedLocationId || undefined,
          locationName: b.locationName || '',
          address: b.address || matchedLoc?.address || '',
          latitude: b.latitude ? Number(b.latitude) : matchedLoc?.latitude ? Number(matchedLoc.latitude) : undefined,
          longitude: b.longitude ? Number(b.longitude) : matchedLoc?.longitude ? Number(matchedLoc.longitude) : undefined,
          totalQtyNos: b.totalQtyNos || 0,
          bags: b.bags || undefined,
          billNo: b.billNo || undefined,
          segment: b.segment || '',
          zone: (b as any).zone || matchedLoc?.zone || String(b.routeNo || ''),
          division: (b as any).division || matchedLoc?.division || (b.remarks?.match(/Division:\s*(\S+)/)?.[1]) || (b.customerName?.match(/Div\s+(\S+)/)?.[1]) || '',
          locationType: matchedLoc?.locationType || '',
        };
      });

      const stops = groupIntoStops(items, packSize);
      const depot = getDepot(unionId);
      const optimized = optimizeRoute(stops, depot.lat, depot.lng);

      const tripConfig: TripConfig = {
        bagWeightKg: Number(bagWeightKg),
        packSize: Number(packSize),
        vehicleCapacityBags: Number(vehicleCapacityBags),
        kmPerLiter: Number(kmPerLiter),
        fuelPricePerLiter: Number(fuelPricePerLiter),
      };

      let summary, tripSummaries, routeTrips;

      if (useVehicleCount) {
        const vcResult = splitByVehicleCount(
          optimized, Number(rawVehicleCount), depot.lat, depot.lng,
          Number(bagWeightKg), Number(kmPerLiter), Number(fuelPricePerLiter)
        );
        tripSummaries = vcResult.tripSummaries;
        summary = buildRouteSummary(optimized, tripConfig);
        routeTrips = new Map<number, typeof optimized[]>();
        routeTrips.set(1, vcResult.trips);
      } else {
        summary = buildRouteSummary(optimized, tripConfig);
        routeTrips = splitAllRoutesIntoTrips(optimized, tripConfig.vehicleCapacityBags);
        tripSummaries = buildTripSummaries(routeTrips, tripConfig.bagWeightKg, tripConfig.kmPerLiter, tripConfig.fuelPricePerLiter);
      }

      const optimizeResult: any = { optimizedStops: optimized, routeSummary: summary, tripSummaries, tripConfig, depot };
      if (useVehicleCount) {
        optimizeResult.vehicleCount = Number(rawVehicleCount);
        optimizeResult.vehicleTrips = routeTrips.get(1) || [];
      } else {
        const allTripStops: any[][] = [];
        for (const [, trips] of routeTrips) {
          for (const tripStops of trips) {
            allTripStops.push(tripStops);
          }
        }
        optimizeResult.vehicleTrips = allTripStops;
      }

      await db.update(manualBillBatches).set({
        status: 'optimized',
        optimizationResult: optimizeResult,
      }).where(eq(manualBillBatches.batchId, batchId));

      res.json(optimizeResult);
    } catch (error) {
      console.error('Mode B optimize error:', error);
      res.status(500).json({ error: "Failed to optimize" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/optimized-stops/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const data = generateOptimizedStopsExcelData(result.optimizedStops);
      const buf = await xlsxWriteAoa([{ name: 'Stops', data }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Optimized_Stops_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate optimized stops" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/route-summary/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const data = generateRouteSummaryExcelData(result.routeSummary);
      const buf = await xlsxWriteAoa([{ name: 'Summary', data }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Route_Summary_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate route summary" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/trip-sheet/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const pdfMerchants = await storage.getMerchants();
      const pdfUnionName = pdfMerchants.find(m => m.id === batch.merchantId)?.restaurantName || batch.merchantId || '';
      const pdfBuffer = await generateTripSheetPDF(
        { date: new Date().toISOString().split('T')[0], unionName: pdfUnionName, segment: 'Mixed' },
        result.optimizedStops
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=TripSheet_${req.params.batchId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate trip sheet PDF" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/editable-stops/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const data = generateEditableStopsExcelData(result.optimizedStops);
      const buf = await xlsxWriteAoa([{ name: 'EditableStops', data }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Editable_Stops_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate editable stops" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/trips-excel/:batchId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const tripSummaries = result.tripSummaries || [];
      const data = generateTripsExcelData(tripSummaries);
      const buf = await xlsxWriteAoa([{ name: 'Trips', data }]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Trips_${req.params.batchId}.xlsx`);
      res.send(Buffer.from(buf));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate trips excel" });
    }
  });

  app.get("/api/bulk-delivery/mode-b/vehicle-trip-sheets/:batchId", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, req.params.batchId));
      if (!batch || !batch.optimizationResult) return res.status(404).json({ error: "No optimization result" });
      const result = batch.optimizationResult as any;
      const tripConfig = result.tripConfig || DEFAULT_TRIP_CONFIG;
      const pdfMerchants = await storage.getMerchants();
      const pdfUnionName = pdfMerchants.find((m: any) => m.id === batch.merchantId)?.restaurantName || batch.merchantId || '';
      let vehicleDetailsMap: Record<number, { vehicleNo?: string; driverName?: string }> | undefined;
      if (req.query.vehicleDetails) {
        try { vehicleDetailsMap = JSON.parse(String(req.query.vehicleDetails)); } catch {}
      }
      const precomputedTrips = result.vehicleCount && result.vehicleTrips ? result.vehicleTrips : undefined;
      const depotInfo = result.depot ? { lat: result.depot.lat, lng: result.depot.lng, name: pdfUnionName } : undefined;
      const pdfBuffer = await generateVehicleWiseTripSheetsPDF(
        result.optimizedStops,
        tripConfig,
        pdfUnionName,
        new Date().toISOString().split('T')[0],
        vehicleDetailsMap,
        precomputedTrips,
        depotInfo
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Vehicle_TripSheets_${req.params.batchId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Vehicle trip sheets PDF error:', error);
      res.status(500).json({ error: "Failed to generate vehicle trip sheets PDF" });
    }
  });

  app.post("/api/bulk-delivery/mode-b/create-trip/:batchId", requireAuth, requireRole('admin', 'merchant', 'union_staff'), async (req: AuthenticatedRequest, res) => {
    try {
      const { batchId } = req.params;
      const { vehicleId, driverId, vehicleNo, driverName, driverPhone, segment, unionId } = req.body;
      const effectiveMerchantId = getEffectiveMerchantId(req, unionId);
      const [batch] = await db.select().from(manualBillBatches).where(eq(manualBillBatches.batchId, batchId));
      if (!batch || !batch.optimizationResult) return res.status(400).json({ error: "Batch not optimized yet" });
      if (batch.status === 'dispatched') return res.status(400).json({ error: "This batch has already been dispatched" });
      const callerMerchantId = getEffectiveMerchantId(req, batch.merchantId);
      if ((req.user as any)?.role === 'union_staff' && batch.merchantId && callerMerchantId !== batch.merchantId) {
        return res.status(403).json({ error: "Access denied: batch belongs to a different union" });
      }
      const result = batch.optimizationResult as any;
      const storedConfig = result.tripConfig || DEFAULT_TRIP_CONFIG;
      const vehicleCapacity = storedConfig.vehicleCapacityBags || DEFAULT_TRIP_CONFIG.vehicleCapacityBags;
      const bagWeight = storedConfig.bagWeightKg || DEFAULT_TRIP_CONFIG.bagWeightKg;
      const optimizedStops = result.optimizedStops;
      const capacityResult = checkVehicleCapacity(optimizedStops, vehicleCapacity);
      const createdTrips = [];
      const allMerchants = await storage.getMerchants();
      const resolvedUnionName = allMerchants.find(m => m.id === (effectiveMerchantId || batch.merchantId))?.restaurantName || batch.merchantId || '';

      for (let t = 0; t < capacityResult.trips.length; t++) {
        const tripStops = capacityResult.trips[t];
        const tripDate = new Date().toISOString().split('T')[0];
        const existingTrips = await db.select().from(tripSheets).where(sql`date = ${tripDate}`);
        const seq = existingTrips.length + t + 1;
        const tripId = generateTripId(effectiveMerchantId || 'HUB', tripDate, seq);
        const totalBags = tripStops.reduce((s: number, st: any) => s + st.bags, 0);
        const totalWeightKg = totalBags * bagWeight;

        const [trip] = await db.insert(tripSheets).values({
          tripId,
          routeName: `Manual Bulk Route ${t + 1}`,
          shift: 'Morning',
          date: tripDate,
          unionId: effectiveMerchantId || batch.merchantId || null,
          unionName: resolvedUnionName,
          vehicleId: vehicleId || null,
          vehicleNo: vehicleNo || '',
          driverId: driverId || null,
          driverName: driverName || '',
          driverPhone: driverPhone || '',
          segment: segment || 'Mixed',
          status: 'Planned',
          plannedDropPoints: tripStops.length,
          completedDropPoints: 0,
          bagsPlanned: totalBags,
          bagsLoaded: totalBags,
          capacityBags: vehicleCapacity,
          tonnageLoaded: String(Math.round(totalWeightKg) / 1000),
          notes: 'Mode B - Manual Bills (E-way Bill: Done)',
        }).returning();

        for (const stop of tripStops) {
          await db.insert(transportRoutePoints).values({
            tripId: trip.id,
            locationName: stop.locationName,
            lat: String(stop.latitude),
            lng: String(stop.longitude),
            sequenceNo: stop.stopSeq,
            bagsToDeliver: stop.bags,
            status: 'pending',
          });

          const jobId = `MBJ-${batchId}-${trip.id}-${stop.stopSeq}`;
          await db.insert(deliveryJobs).values({
            jobId,
            sourceType: 'manual_bill',
            sourceId: batchId,
            dispatchType: 'BULK',
            deliveryType: 'bulk',
            merchantId: effectiveMerchantId || batch.merchantId || '',
            segment: segment || 'Mixed',
            status: 'assigned',
            customerName: stop.locationName,
            deliveryAddress: stop.address || stop.locationName,
            deliveryLat: String(stop.latitude || '0'),
            deliveryLng: String(stop.longitude || '0'),
            totalBags: stop.bags,
            totalWeightKg: String(stop.bags * bagWeight),
            tripId: trip.id,
            gstInvoiceGenerated: true,
            ewayBillRequired: false,
            ewayBillGenerated: true,
            paymentConfirmed: true,
          });
        }
        createdTrips.push(trip);
      }

      await db.update(manualBillBatches).set({ status: 'dispatched' }).where(eq(manualBillBatches.batchId, batchId));
      res.json({ success: true, trips: createdTrips, splitInto: capacityResult.trips.length });
    } catch (error) {
      console.error('Mode B create trip error:', error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.post("/api/union/:merchantId/sync-delivery-jobs", requireAuth, requireRole('admin', 'merchant'), async (req: AuthenticatedRequest, res) => {
    try {
      const { merchantId } = req.params;
      const user = req.user as any;
      if (user.role !== 'admin') {
        const userMerchantId = user.merchantId || user.restaurantId || user.unionId;
        const userAllIds = userMerchantId ? getAllIdsForMerchant(userMerchantId) : [];
        const targetAllIds = getAllIdsForMerchant(merchantId);
        const hasOverlap = targetAllIds.some(id => userAllIds.includes(id));
        if (!hasOverlap) {
          return res.status(403).json({ error: 'Access denied: you do not own this union' });
        }
      }
      const allIds = getAllIdsForMerchant(merchantId);
      const allOrders = await db.select().from(ordersTable)
        .where(
          and(
            inArray(ordersTable.restaurantId, allIds),
            inArray(ordersTable.status, DELIVERY_TRIGGER_STATUSES)
          )
        );

      const existingJobs = await db.select({ sourceId: deliveryJobs.sourceId })
        .from(deliveryJobs)
        .where(eq(deliveryJobs.sourceType, "order"));

      const existingSourceIds = new Set(existingJobs.map(j => j.sourceId));
      const missingOrders = allOrders.filter(o => !existingSourceIds.has(o.id));

      let created = 0;
      for (const order of missingOrders) {
        await autoCreateDeliveryJob(order.id);
        created++;
      }

      res.json({
        message: `Synced delivery jobs: ${created} created out of ${missingOrders.length} missing`,
        totalOrders: allOrders.length,
        alreadyHadJobs: allOrders.length - missingOrders.length,
        created,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===== MILK DISPATCH REPORT MODULE =====
  const MILK_RATES: Record<string, number> = {
    fcm1000: 54,
    fcm500: 27,
    dlt500: 30,
    std200: 12,
  };

  function calcMilkValue(fcm1000: number, fcm500: number, dlt500: number, std200: number): number {
    return fcm1000 * MILK_RATES.fcm1000 + fcm500 * MILK_RATES.fcm500 + dlt500 * MILK_RATES.dlt500 + std200 * MILK_RATES.std200;
  }

}
