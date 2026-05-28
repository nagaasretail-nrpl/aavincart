import PDFDocument from "pdfkit";

export interface TripStop {
  locationId?: number;
  routeNo: number;
  locationName: string;
  locationType?: string;
  address?: string;
  latitude: number;
  longitude: number;
  totalQtyNos: number;
  bags: number;
  zone?: string;
  division?: string;
  billNos?: string[];
  customerName?: string;
  segment?: string;
}

export interface OptimizedStop extends TripStop {
  stopSeq: number;
  distanceFromPrevKm: number;
  cumulativeKm: number;
}

export interface RouteSummary {
  routeNo: number;
  stopsCount: number;
  totalQtyNos: number;
  totalBags: number;
  totalDistanceKm: number;
  totalKg?: number;
  vehiclesNeeded?: number;
  totalFuelLiters?: number;
  totalFuelCost?: number;
}

export interface CapacityCheckResult {
  fits: boolean;
  totalBags: number;
  vehicleCapacity: number;
  trips: OptimizedStop[][];
}

export interface TripSummary {
  routeNo: number;
  tripNo: number;
  vehicleNo: number;
  stopsCount: number;
  bags: number;
  kg: number;
  distanceKm: number;
  fuelLiters: number;
  fuelCost: number;
}

export interface TripConfig {
  bagWeightKg: number;
  packSize: number;
  vehicleCapacityBags: number;
  kmPerLiter: number;
  fuelPricePerLiter: number;
}

export const DEFAULT_TRIP_CONFIG: TripConfig = {
  bagWeightKg: 13,
  packSize: 50,
  vehicleCapacityBags: 154,
  kmPerLiter: 8,
  fuelPricePerLiter: 105,
};

export function computeFuel(totalKm: number, kmPerLiter: number, fuelPricePerLiter: number): { fuelLiters: number; fuelCost: number } {
  if (kmPerLiter <= 0) return { fuelLiters: 0, fuelCost: 0 };
  const fuelLiters = Math.round((totalKm / kmPerLiter) * 100) / 100;
  const fuelCost = Math.round(fuelLiters * fuelPricePerLiter * 100) / 100;
  return { fuelLiters, fuelCost };
}

export function capacityFromTons(tons: number, bagWeightKg: number): number {
  if (bagWeightKg <= 0) return 0;
  return Math.floor((tons * 1000) / bagWeightKg);
}

export function buildTripSummaries(
  routeTrips: Map<number, OptimizedStop[][]>,
  bagWeightKg: number = 13,
  kmPerLiter: number = 8,
  fuelPricePerLiter: number = 105
): TripSummary[] {
  const summaries: TripSummary[] = [];
  let vehicleCounter = 0;
  for (const [routeNo, trips] of routeTrips) {
    for (let t = 0; t < trips.length; t++) {
      vehicleCounter++;
      const tripStops = trips[t];
      const bags = tripStops.reduce((s, st) => s + st.bags, 0);
      const kg = Math.round(bags * bagWeightKg * 100) / 100;
      const distanceKm = Math.round(
        tripStops.reduce((s, st) => s + (st.distanceFromPrevKm || 0), 0) * 100
      ) / 100;
      const fuel = computeFuel(distanceKm, kmPerLiter, fuelPricePerLiter);
      summaries.push({
        routeNo,
        tripNo: 1,
        vehicleNo: vehicleCounter,
        stopsCount: tripStops.length,
        bags,
        kg,
        distanceKm,
        fuelLiters: fuel.fuelLiters,
        fuelCost: fuel.fuelCost,
      });
    }
  }
  return summaries.sort((a, b) => a.vehicleNo - b.vehicleNo);
}

export function parseDMSCoordinate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  const plainNum = parseFloat(str);
  if (!isNaN(plainNum) && /^-?\d+\.?\d*°?$/.test(str.replace(/°$/, ''))) {
    return plainNum;
  }
  const decDirMatch = str.match(/^(-?\d+\.?\d*)\s*([NSEWnsew])$/);
  if (decDirMatch) {
    let val = Math.abs(parseFloat(decDirMatch[1]));
    const dir = decDirMatch[2].toUpperCase();
    if (dir === 'S' || dir === 'W') val = -val;
    return Math.round(val * 1000000) / 1000000;
  }
  const decDegDirMatch = str.match(/^(-?\d+\.?\d*)\s*°\s*([NSEWnsew])?$/);
  if (decDegDirMatch) {
    let val = parseFloat(decDegDirMatch[1]);
    const dir = (decDegDirMatch[2] || '').toUpperCase();
    if (dir === 'S' || dir === 'W') val = -Math.abs(val);
    return Math.round(val * 1000000) / 1000000;
  }
  const MIN_CHARS = "['''′\u2032]";
  const SEC_CHARS = "[\"\"\"″\u2033]";
  const dmsRegex = new RegExp(`^(-?\\d+)[°]\\s*(\\d+)${MIN_CHARS}\\s*([\\d.]+)${SEC_CHARS}?\\s*([NSEWnsew])?$`);
  const dmsMatch = str.match(dmsRegex);
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1]);
    const min = parseFloat(dmsMatch[2]);
    const sec = parseFloat(dmsMatch[3]);
    const dir = (dmsMatch[4] || '').toUpperCase();
    let decimal = Math.abs(deg) + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W' || deg < 0) decimal = -Math.abs(decimal);
    return Math.round(decimal * 1000000) / 1000000;
  }
  const dmRegex = new RegExp(`^(-?\\d+)[°]\\s*([\\d.]+)${MIN_CHARS}?\\s*([NSEWnsew])?$`);
  const dmMatch = str.match(dmRegex);
  if (dmMatch) {
    const deg = parseFloat(dmMatch[1]);
    const min = parseFloat(dmMatch[2]);
    const dir = (dmMatch[3] || '').toUpperCase();
    let decimal = Math.abs(deg) + min / 60;
    if (dir === 'S' || dir === 'W' || deg < 0) decimal = -Math.abs(decimal);
    return Math.round(decimal * 1000000) / 1000000;
  }
  const cleaned = str.replace(/[°NSEWnsew\s'''′"""″\u2032\u2033]/g, '');
  if (/^-?\d+\.?\d*$/.test(cleaned)) {
    const numOnly = parseFloat(cleaned);
    if (!isNaN(numOnly) && numOnly >= -90 && numOnly <= 180) return numOnly;
  }
  return null;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBags(nos: number, packSize: number = 50): number {
  if (nos <= 0) return 0;
  return Math.ceil(nos / packSize);
}

export interface GroupInput {
  unionId?: string;
  dispatchDate?: string;
  segment?: string;
  routeNo: number;
  locationId?: number;
  locationName: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalQtyNos: number;
  bags?: number;
  billNo?: string;
  customerName?: string;
  locationType?: string;
  zone?: string;
  division?: string;
}

export function groupIntoStops(items: GroupInput[], packSize: number = 50): TripStop[] {
  const groups = new Map<string, TripStop>();

  for (const item of items) {
    const key = `${item.routeNo}-${item.locationId || `${item.locationName}-${item.division || ''}`}-${item.zone || ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.totalQtyNos += item.totalQtyNos || 0;
      existing.bags += (item.bags && item.bags > 0) ? item.bags : calculateBags(item.totalQtyNos || 0, packSize);
      if (item.billNo) {
        existing.billNos = existing.billNos || [];
        existing.billNos.push(item.billNo);
      }
    } else {
      const nos = item.totalQtyNos || 0;
      const bags = (item.bags && item.bags > 0) ? item.bags : calculateBags(nos, packSize);
      groups.set(key, {
        locationId: item.locationId,
        routeNo: item.routeNo,
        locationName: item.locationName,
        locationType: item.locationType,
        address: item.address || '',
        latitude: Number(item.latitude) || 0,
        longitude: Number(item.longitude) || 0,
        totalQtyNos: nos,
        bags,
        zone: item.zone,
        division: item.division,
        billNos: item.billNo ? [item.billNo] : [],
        customerName: item.customerName,
        segment: item.segment,
      });
    }
  }

  return Array.from(groups.values());
}

export function optimizeRoute(stops: TripStop[], depotLat: number, depotLng: number): OptimizedStop[] {
  if (stops.length === 0) return [];
  if (stops.length === 1) {
    const dist = haversineDistance(depotLat, depotLng, stops[0].latitude, stops[0].longitude) / 1000;
    return [{
      ...stops[0],
      stopSeq: 1,
      distanceFromPrevKm: Math.round(dist * 100) / 100,
      cumulativeKm: Math.round(dist * 100) / 100,
    }];
  }

  const visited = new Set<number>();
  const order: number[] = [];
  let currentLat = depotLat;
  let currentLng = depotLng;

  while (order.length < stops.length) {
    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < stops.length; i++) {
      if (visited.has(i)) continue;
      const dist = haversineDistance(currentLat, currentLng, stops[i].latitude, stops[i].longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    if (nearestIdx === -1) break;
    visited.add(nearestIdx);
    order.push(nearestIdx);
    currentLat = stops[nearestIdx].latitude;
    currentLng = stops[nearestIdx].longitude;
  }

  const improved = twoOptImprove(order, stops, depotLat, depotLng);

  let cumKm = 0;
  let prevLat = depotLat;
  let prevLng = depotLng;
  const result: OptimizedStop[] = [];

  for (let seq = 0; seq < improved.length; seq++) {
    const stop = stops[improved[seq]];
    const dist = haversineDistance(prevLat, prevLng, stop.latitude, stop.longitude) / 1000;
    cumKm += dist;
    result.push({
      ...stop,
      stopSeq: seq + 1,
      distanceFromPrevKm: Math.round(dist * 100) / 100,
      cumulativeKm: Math.round(cumKm * 100) / 100,
    });
    prevLat = stop.latitude;
    prevLng = stop.longitude;
  }

  return result;
}

function twoOptImprove(order: number[], stops: TripStop[], depotLat: number, depotLng: number): number[] {
  const route = [...order];
  let improved = true;
  let iterations = 0;
  const maxIterations = 500;

  function totalDist(r: number[]): number {
    let d = haversineDistance(depotLat, depotLng, stops[r[0]].latitude, stops[r[0]].longitude);
    for (let i = 1; i < r.length; i++) {
      d += haversineDistance(stops[r[i - 1]].latitude, stops[r[i - 1]].longitude, stops[r[i]].latitude, stops[r[i]].longitude);
    }
    return d;
  }

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const before = totalDist(route);
        const segment = route.slice(i, j + 1).reverse();
        const newRoute = [...route.slice(0, i), ...segment, ...route.slice(j + 1)];
        const after = totalDist(newRoute);
        if (after < before) {
          route.splice(0, route.length, ...newRoute);
          improved = true;
        }
      }
    }
  }

  return route;
}

export function checkVehicleCapacity(stops: OptimizedStop[], vehicleCapacityBags: number = 120): CapacityCheckResult {
  const totalBags = stops.reduce((s, st) => s + st.bags, 0);
  if (totalBags <= vehicleCapacityBags) {
    return { fits: true, totalBags, vehicleCapacity: vehicleCapacityBags, trips: [stops] };
  }

  const trips: OptimizedStop[][] = [];
  let currentTrip: OptimizedStop[] = [];
  let currentBags = 0;

  for (const stop of stops) {
    if (currentBags + stop.bags > vehicleCapacityBags && currentTrip.length > 0) {
      trips.push(currentTrip);
      currentTrip = [];
      currentBags = 0;
    }
    currentTrip.push(stop);
    currentBags += stop.bags;
  }
  if (currentTrip.length > 0) trips.push(currentTrip);

  return { fits: false, totalBags, vehicleCapacity: vehicleCapacityBags, trips };
}

export function splitByVehicleCount(
  stops: OptimizedStop[],
  vehicleCount: number,
  depotLat: number,
  depotLng: number,
  bagWeightKg: number = 13,
  kmPerLiter: number = 8,
  fuelPricePerLiter: number = 105
): { trips: OptimizedStop[][]; tripSummaries: TripSummary[] } {
  if (vehicleCount <= 0) vehicleCount = 1;
  if (stops.length === 0) return { trips: [], tripSummaries: [] };
  if (vehicleCount >= stops.length) {
    const trips = stops.map((s, idx) => [{ ...s, routeNo: idx + 1 }]);
    const tripSummaries = trips.map((tripStops, idx) => {
      const bags = tripStops.reduce((s, st) => s + st.bags, 0);
      const distanceKm = tripStops.reduce((s, st) => s + (st.distanceFromPrevKm || 0), 0);
      const fuel = computeFuel(distanceKm, kmPerLiter, fuelPricePerLiter);
      return {
        routeNo: 1,
        tripNo: 1,
        vehicleNo: idx + 1,
        stopsCount: tripStops.length,
        bags,
        kg: Math.round(bags * bagWeightKg * 100) / 100,
        distanceKm: Math.round(distanceKm * 100) / 100,
        fuelLiters: fuel.fuelLiters,
        fuelCost: fuel.fuelCost,
      };
    });
    return { trips, tripSummaries };
  }

  const stopsPerVehicle = Math.ceil(stops.length / vehicleCount);

  const trips: OptimizedStop[][] = [];
  let currentTrip: OptimizedStop[] = [];

  for (const stop of stops) {
    if (currentTrip.length >= stopsPerVehicle && trips.length < vehicleCount - 1) {
      trips.push(currentTrip);
      currentTrip = [];
    }
    currentTrip.push(stop);
  }
  if (currentTrip.length > 0) trips.push(currentTrip);

  const reoptimizedTrips: OptimizedStop[][] = [];
  for (let t = 0; t < trips.length; t++) {
    const tripStops = trips[t];
    const vehicleIdx = t + 1;
    let reopt: OptimizedStop[];
    if (tripStops.length <= 1) {
      reopt = tripStops.map((s, i) => {
        const dist = haversineDistance(depotLat, depotLng, s.latitude, s.longitude) / 1000;
        return { ...s, routeNo: vehicleIdx, stopSeq: i + 1, distanceFromPrevKm: Math.round(dist * 100) / 100, cumulativeKm: Math.round(dist * 100) / 100 };
      });
    } else {
      reopt = optimizeRoute(tripStops, depotLat, depotLng).map(s => ({ ...s, routeNo: vehicleIdx }));
    }
    reoptimizedTrips.push(reopt);
  }

  const tripSummaries: TripSummary[] = reoptimizedTrips.map((tripStops, idx) => {
    const bags = tripStops.reduce((s, st) => s + st.bags, 0);
    const distanceKm = tripStops.reduce((s, st) => s + (st.distanceFromPrevKm || 0), 0);
    const fuel = computeFuel(distanceKm, kmPerLiter, fuelPricePerLiter);
    return {
      routeNo: 1,
      tripNo: 1,
      vehicleNo: idx + 1,
      stopsCount: tripStops.length,
      bags,
      kg: Math.round(bags * bagWeightKg * 100) / 100,
      distanceKm: Math.round(distanceKm * 100) / 100,
      fuelLiters: fuel.fuelLiters,
      fuelCost: fuel.fuelCost,
    };
  });

  return { trips: reoptimizedTrips, tripSummaries };
}

export function buildRouteSummary(
  stops: OptimizedStop[],
  config?: Partial<TripConfig>
): RouteSummary[] {
  const cfg = { ...DEFAULT_TRIP_CONFIG, ...config };
  const routeMap = new Map<number, RouteSummary>();
  const routeStopsMap = new Map<number, OptimizedStop[]>();

  for (const stop of stops) {
    const existing = routeMap.get(stop.routeNo);
    if (existing) {
      existing.stopsCount++;
      existing.totalQtyNos += stop.totalQtyNos;
      existing.totalBags += stop.bags;
      existing.totalDistanceKm = Math.max(existing.totalDistanceKm, stop.cumulativeKm);
    } else {
      routeMap.set(stop.routeNo, {
        routeNo: stop.routeNo,
        stopsCount: 1,
        totalQtyNos: stop.totalQtyNos,
        totalBags: stop.bags,
        totalDistanceKm: stop.cumulativeKm,
      });
    }
    if (!routeStopsMap.has(stop.routeNo)) routeStopsMap.set(stop.routeNo, []);
    routeStopsMap.get(stop.routeNo)!.push(stop);
  }

  for (const [routeNo, summary] of routeMap) {
    summary.totalKg = Math.round(summary.totalBags * cfg.bagWeightKg * 100) / 100;
    const routeStops = routeStopsMap.get(routeNo) || [];
    const capacityResult = checkVehicleCapacity(routeStops, cfg.vehicleCapacityBags);
    summary.vehiclesNeeded = capacityResult.trips.length;
    let routeFuelL = 0;
    let routeFuelCost = 0;
    for (const tripStops of capacityResult.trips) {
      const tripDist = tripStops.reduce((s, st) => s + (st.distanceFromPrevKm || 0), 0);
      const fuel = computeFuel(tripDist, cfg.kmPerLiter, cfg.fuelPricePerLiter);
      routeFuelL += fuel.fuelLiters;
      routeFuelCost += fuel.fuelCost;
    }
    summary.totalFuelLiters = Math.round(routeFuelL * 100) / 100;
    summary.totalFuelCost = Math.round(routeFuelCost * 100) / 100;
  }

  return Array.from(routeMap.values()).sort((a, b) => a.routeNo - b.routeNo);
}

export function splitAllRoutesIntoTrips(
  stops: OptimizedStop[],
  vehicleCapacityBags: number
): Map<number, OptimizedStop[][]> {
  const routeStopsMap = new Map<number, OptimizedStop[]>();
  for (const stop of stops) {
    if (!routeStopsMap.has(stop.routeNo)) routeStopsMap.set(stop.routeNo, []);
    routeStopsMap.get(stop.routeNo)!.push(stop);
  }
  const routeTrips = new Map<number, OptimizedStop[][]>();
  for (const [routeNo, routeStops] of routeStopsMap) {
    const result = checkVehicleCapacity(routeStops, vehicleCapacityBags);
    routeTrips.set(routeNo, result.trips);
  }
  return routeTrips;
}

export function generateTripSheetPDF(
  tripData: {
    tripId?: string; date: string; unionName: string; segment: string;
    vehicleNo?: string; driverName?: string;
    tripNo?: number; totalKg?: number; fuelLiters?: number; fuelCost?: number;
    vehicleCapacityBags?: number;
  },
  stops: OptimizedStop[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    doc.fontSize(14).font('Helvetica-Bold').text('TCMPF LTD - BULK DELIVERY TRIP SHEET', { align: 'center' });
    doc.moveDown(0.3);
    const subtitle = tripData.tripNo
      ? `${tripData.segment} - Trip ${tripData.tripNo} - Route Wise Delivery`
      : `${tripData.segment} - Route Wise Delivery Location`;
    doc.fontSize(10).font('Helvetica').text(subtitle, { align: 'center' });
    doc.moveDown(0.5);

    const infoY = doc.y;
    doc.fontSize(9).font('Helvetica');
    doc.text(`Date: ${tripData.date}`, 40, infoY);
    doc.text(`Union: ${tripData.unionName}`, 200, infoY);
    if (tripData.vehicleNo) doc.text(`Vehicle: ${tripData.vehicleNo}`, 350, infoY);
    doc.moveDown(0.3);
    if (tripData.driverName) doc.text(`Driver: ${tripData.driverName}`, 40);
    if (tripData.tripId) doc.text(`Trip ID: ${tripData.tripId}`, 200);
    doc.moveDown(0.3);
    const metaParts: string[] = [];
    if (tripData.totalKg) metaParts.push(`Weight: ${tripData.totalKg} kg`);
    if (tripData.vehicleCapacityBags) metaParts.push(`Capacity: ${tripData.vehicleCapacityBags} bags`);
    if (tripData.fuelLiters) metaParts.push(`Fuel: ${tripData.fuelLiters} L`);
    if (tripData.fuelCost) metaParts.push(`Fuel Cost: ₹${tripData.fuelCost}`);
    if (metaParts.length > 0) {
      doc.text(metaParts.join('  |  '), 40);
    }
    doc.moveDown(0.8);

    const tableLeft = 38;
    const tableWidth = 520;
    const colX = [40, 68, 100, 230, 370, 430, 480, 530];
    const colW = [28, 32, 130, 140, 60, 50, 50, 30];
    const headers = ['S.No', 'Zone', 'Location Name', 'Address', 'Packets', 'Bags', 'Division', 'Rte'];

    function drawHeader() {
      doc.fontSize(7).font('Helvetica-Bold');
      const hY = doc.y;
      doc.rect(tableLeft, hY - 2, tableWidth, 16).fill('#003366');
      doc.fillColor('white');
      headers.forEach((h, i) => doc.text(h, colX[i], hY, { width: colW[i] }));
      doc.fillColor('black');
      return hY + 18;
    }

    let rowY = drawHeader();

    const routeGroups = new Map<number, OptimizedStop[]>();
    for (const s of stops) {
      if (!routeGroups.has(s.routeNo)) routeGroups.set(s.routeNo, []);
      routeGroups.get(s.routeNo)!.push(s);
    }

    let grandTotalQty = 0;
    let grandTotalBags = 0;
    let sNo = 0;

    doc.font('Helvetica').fontSize(7);

    for (const [routeNo, routeStops] of routeGroups) {
      let routeQty = 0;
      let routeBags = 0;

      for (const stop of routeStops) {
        if (rowY > 740) {
          doc.addPage();
          rowY = 50;
          doc.y = 50;
          rowY = drawHeader();
          doc.font('Helvetica').fontSize(7);
        }
        sNo++;
        if (sNo % 2 === 0) doc.rect(tableLeft, rowY - 2, tableWidth, 14).fill('#f5f5f5').fillColor('black');

        doc.text(String(sNo), colX[0], rowY, { width: colW[0] });
        doc.text(stop.zone || '', colX[1], rowY, { width: colW[1] });
        doc.text(stop.locationName.substring(0, 28), colX[2], rowY, { width: colW[2] });
        doc.text((stop.address || '').substring(0, 30), colX[3], rowY, { width: colW[3] });
        doc.text(String(stop.totalQtyNos), colX[4], rowY, { width: colW[4], align: 'right' });
        doc.text(String(stop.bags), colX[5], rowY, { width: colW[5], align: 'right' });
        doc.text(stop.division || '', colX[6], rowY, { width: colW[6] });
        doc.text(String(stop.routeNo), colX[7], rowY, { width: colW[7] });
        rowY += 14;
        routeQty += stop.totalQtyNos;
        routeBags += stop.bags;
      }

      if (rowY > 740) { doc.addPage(); rowY = 50; doc.y = 50; rowY = drawHeader(); }
      doc.font('Helvetica-Bold').fontSize(7);
      doc.rect(tableLeft, rowY - 2, tableWidth, 14).fill('#e8e8e8').fillColor('black');
      doc.text(`Route ${routeNo} Total`, colX[2], rowY, { width: colW[2] });
      doc.text(String(routeQty), colX[4], rowY, { width: colW[4], align: 'right' });
      doc.text(String(routeBags), colX[5], rowY, { width: colW[5], align: 'right' });
      rowY += 16;
      doc.font('Helvetica').fontSize(7);

      grandTotalQty += routeQty;
      grandTotalBags += routeBags;
    }

    if (rowY > 740) { doc.addPage(); rowY = 50; doc.y = 50; rowY = drawHeader(); }
    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(tableLeft, rowY - 2, tableWidth, 16).fill('#003366');
    doc.fillColor('white');
    doc.text('Grand Total', colX[2], rowY, { width: colW[2] });
    doc.text(String(grandTotalQty), colX[4], rowY, { width: colW[4], align: 'right' });
    doc.text(String(grandTotalBags), colX[5], rowY, { width: colW[5], align: 'right' });
    doc.fillColor('black');

    doc.end();
  });
}

export function generateVehicleWiseTripSheetsPDF(
  optimizedStops: OptimizedStop[],
  config: Partial<TripConfig>,
  unionName: string,
  date: string,
  vehicleDetailsMap?: Record<number, { vehicleNo?: string; driverName?: string }>,
  precomputedVehicleTrips?: OptimizedStop[][],
  depot?: { lat: number; lng: number; name?: string }
): Promise<Buffer> {
  const cfg = { ...DEFAULT_TRIP_CONFIG, ...config };
  const isPrecomputed = !!precomputedVehicleTrips && precomputedVehicleTrips.length > 0;

  let allTrips: { vehicleIdx: number; tripStops: OptimizedStop[] }[] = [];
  let tripSummaries: TripSummary[] = [];

  if (isPrecomputed) {
    allTrips = precomputedVehicleTrips!.map((tripStops, idx) => ({ vehicleIdx: idx + 1, tripStops }));
    tripSummaries = precomputedVehicleTrips!.map((tripStops, idx) => {
      const bags = tripStops.reduce((s, st) => s + st.bags, 0);
      const distanceKm = tripStops.reduce((s, st) => s + (st.distanceFromPrevKm || 0), 0);
      const fuel = computeFuel(distanceKm, cfg.kmPerLiter, cfg.fuelPricePerLiter);
      return {
        routeNo: 1, tripNo: 1, vehicleNo: idx + 1,
        stopsCount: tripStops.length, bags,
        kg: Math.round(bags * cfg.bagWeightKg * 100) / 100,
        distanceKm: Math.round(distanceKm * 100) / 100,
        fuelLiters: fuel.fuelLiters, fuelCost: fuel.fuelCost,
      };
    });
  } else {
    const routeTrips = splitAllRoutesIntoTrips(optimizedStops, cfg.vehicleCapacityBags);
    tripSummaries = buildTripSummaries(routeTrips, cfg.bagWeightKg, cfg.kmPerLiter, cfg.fuelPricePerLiter);
    let vehicleIdx = 0;
    for (const [, trips] of routeTrips) {
      for (const tripStops of trips) {
        vehicleIdx++;
        allTrips.push({ vehicleIdx, tripStops });
      }
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    for (let vi = 0; vi < allTrips.length; vi++) {
      const { vehicleIdx, tripStops } = allTrips[vi];
      const summary = tripSummaries.find(s => s.vehicleNo === vehicleIdx);
      const totalBags = tripStops.reduce((s, st) => s + st.bags, 0);
      const totalQty = tripStops.reduce((s, st) => s + st.totalQtyNos, 0);
      const totalKg = Math.round(totalBags * cfg.bagWeightKg * 100) / 100;

        if (vi > 0) doc.addPage();

        const vDetails = vehicleDetailsMap?.[vehicleIdx];
        const vRegNo = vDetails?.vehicleNo || '';
        const vDriver = vDetails?.driverName || '';
        const vehicleLabel = vRegNo ? `Vehicle ${vehicleIdx} (${vRegNo})` : `Vehicle ${vehicleIdx}`;

        doc.fontSize(14).font('Helvetica-Bold').text('TCMPF LTD - BULK DELIVERY TRIP SHEET', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold').text(`${vehicleLabel} — Single Trip`, { align: 'center' });
        doc.moveDown(0.5);

        const infoY = doc.y;
        doc.fontSize(9).font('Helvetica');
        doc.text(`Date: ${date}`, 40, infoY);
        doc.text(`Union: ${unionName}`, 200, infoY);
        doc.text(`Stops: ${tripStops.length}`, 400, infoY);
        if (vRegNo || vDriver) {
          doc.moveDown(0.2);
          const detY = doc.y;
          if (vRegNo) doc.text(`Vehicle No: ${vRegNo}`, 40, detY);
          if (vDriver) doc.text(`Driver: ${vDriver}`, vRegNo ? 200 : 40, detY);
        }
        if (depot) {
          doc.moveDown(0.2);
          const depotName = depot.name || unionName || 'Depot';
          doc.font('Helvetica-Bold').fontSize(8).text(`Starting Point: ${depotName} (${depot.lat.toFixed(4)}, ${depot.lng.toFixed(4)})`, 40);
          doc.font('Helvetica').fontSize(9);
        }
        doc.moveDown(0.4);

        const metaParts: string[] = [];
        metaParts.push(`Stops: ${tripStops.length}`);
        metaParts.push(`Bags: ${totalBags}`);
        metaParts.push(`Weight: ${totalKg} kg (${(totalKg / 1000).toFixed(2)} t)`);
        if (summary) {
          metaParts.push(`Distance: ${summary.distanceKm} km`);
          metaParts.push(`Fuel: ${summary.fuelLiters} L`);
          metaParts.push(`Fuel Cost: ₹${summary.fuelCost}`);
        }
        doc.font('Helvetica-Bold').fontSize(8).text(metaParts.join('  |  '), 40);
        doc.moveDown(0.6);

        const tblLeft = 38;
        const tblWidth = 520;
        const colX = isPrecomputed
          ? [40, 68, 105, 240, 370, 420, 480]
          : [40, 68, 105, 235, 360, 410, 465, 530];
        const colW = isPrecomputed
          ? [28, 35, 132, 128, 48, 55, 75]
          : [28, 35, 128, 122, 48, 50, 60, 28];
        const headers = isPrecomputed
          ? ['S.No', 'Zone', 'Location Name', 'Address', 'Packets', 'Bags', 'Division']
          : ['S.No', 'Zone', 'Location Name', 'Address', 'Packets', 'Bags', 'Division', 'Rte'];
        const colAlign: Record<number, string> = isPrecomputed
          ? { 4: 'right', 5: 'right' }
          : { 4: 'right', 5: 'right' };

        function drawTripHeader() {
          doc.fontSize(7).font('Helvetica-Bold');
          const hY = doc.y;
          doc.rect(tblLeft, hY - 2, tblWidth, 16).fill('#003366');
          doc.fillColor('white');
          headers.forEach((h, i) => {
            const align = colAlign[i] || 'left';
            doc.text(h, colX[i], hY, { width: colW[i], align: align as any });
          });
          doc.fillColor('black');
          return hY + 18;
        }

        let rowY = drawTripHeader();

        doc.font('Helvetica').fontSize(7);
        for (let si = 0; si < tripStops.length; si++) {
          const stop = tripStops[si];
          if (rowY > 740) {
            doc.addPage(); rowY = 50; doc.y = 50;
            rowY = drawTripHeader();
            doc.font('Helvetica').fontSize(7);
          }
          if (si % 2 === 1) doc.rect(tblLeft, rowY - 2, tblWidth, 14).fill('#f5f5f5').fillColor('black');
          doc.text(String(si + 1), colX[0], rowY, { width: colW[0] });
          doc.text(stop.zone || '', colX[1], rowY, { width: colW[1] });
          doc.text(stop.locationName.substring(0, 26), colX[2], rowY, { width: colW[2] });
          doc.text((stop.address || '').substring(0, 28), colX[3], rowY, { width: colW[3] });
          doc.text(String(stop.totalQtyNos), colX[4], rowY, { width: colW[4], align: 'right' });
          doc.text(String(stop.bags), colX[5], rowY, { width: colW[5], align: 'right' });
          doc.text(stop.division || '', colX[6], rowY, { width: colW[6] });
          if (!isPrecomputed) doc.text(String(stop.routeNo), colX[7], rowY, { width: colW[7] });
          rowY += 14;
        }

        if (rowY > 740) { doc.addPage(); rowY = 50; doc.y = 50; rowY = drawTripHeader(); }
        doc.font('Helvetica-Bold').fontSize(8);
        doc.rect(tblLeft, rowY - 2, tblWidth, 16).fill('#003366');
        doc.fillColor('white');
        doc.text(`Vehicle ${vehicleIdx} Total`, colX[2], rowY, { width: colW[2] });
        doc.text(String(totalQty), colX[4], rowY, { width: colW[4], align: 'right' });
        doc.text(String(totalBags), colX[5], rowY, { width: colW[5], align: 'right' });
        doc.fillColor('black');
        rowY += 20;

        doc.font('Helvetica').fontSize(8);
        if (rowY > 700) { doc.addPage(); rowY = 50; }
        doc.text('Driver Signature: ______________________', 40, rowY);
        doc.text('Checked By: ______________________', 300, rowY);
    }

    if (tripSummaries.length > 1) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('TCMPF LTD - VEHICLE ASSIGNMENT SUMMARY', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`Date: ${date}  |  Union: ${unionName}`, { align: 'center' });
      if (depot) {
        doc.moveDown(0.3);
        const depotName = depot.name || unionName || 'Depot';
        doc.fontSize(8).font('Helvetica').text(`Starting Point: ${depotName} (${depot.lat.toFixed(4)}, ${depot.lng.toFixed(4)})`, { align: 'center' });
      }
      if (isPrecomputed) {
        doc.moveDown(0.2);
        doc.fontSize(7).font('Helvetica-Oblique').text('Stops distributed using nearest-neighbor clustering from depot. Each vehicle group is re-optimized for shortest path.', { align: 'center' });
      }
      doc.moveDown(0.8);

      const sColX = isPrecomputed
        ? [40, 100, 160, 230, 310, 390, 470]
        : [40, 90, 140, 200, 260, 330, 400, 470];
      const sColW = isPrecomputed
        ? [60, 60, 70, 80, 80, 80, 70]
        : [50, 50, 60, 60, 70, 70, 70, 70];
      const sHeaders = isPrecomputed
        ? ['Vehicle', 'Stops', 'Bags', 'Weight (kg)', 'Dist (km)', 'Fuel (L)', 'Fuel (₹)']
        : ['Vehicle', 'Route', 'Stops', 'Bags', 'Weight (kg)', 'Dist (km)', 'Fuel (L)', 'Fuel (₹)'];

      doc.fontSize(8).font('Helvetica-Bold');
      let sY = doc.y;
      doc.rect(38, sY - 2, 535, 16).fill('#003366');
      doc.fillColor('white');
      sHeaders.forEach((h, i) => doc.text(h, sColX[i], sY, { width: sColW[i] }));
      doc.fillColor('black');
      sY += 18;

      doc.font('Helvetica').fontSize(7);
      let grandBags = 0, grandKg = 0, grandDist = 0, grandFuelL = 0, grandFuelCost = 0;
      for (let i = 0; i < tripSummaries.length; i++) {
        const ts = tripSummaries[i];
        if (sY > 750) {
          doc.addPage(); sY = 50;
          doc.fontSize(8).font('Helvetica-Bold');
          doc.rect(38, sY - 2, 535, 16).fill('#003366');
          doc.fillColor('white');
          sHeaders.forEach((h, i2) => doc.text(h, sColX[i2], sY, { width: sColW[i2] }));
          doc.fillColor('black');
          sY += 18;
          doc.font('Helvetica').fontSize(7);
        }
        if (i % 2 === 1) doc.rect(38, sY - 2, 535, 14).fill('#f5f5f5').fillColor('black');
        const vd = vehicleDetailsMap?.[ts.vehicleNo];
        const vLabel = vd?.vehicleNo ? `${ts.vehicleNo} (${vd.vehicleNo})` : String(ts.vehicleNo);
        if (isPrecomputed) {
          doc.text(vLabel, sColX[0], sY, { width: sColW[0] });
          doc.text(String(ts.stopsCount), sColX[1], sY, { width: sColW[1] });
          doc.text(String(ts.bags), sColX[2], sY, { width: sColW[2], align: 'right' });
          doc.text(String(ts.kg), sColX[3], sY, { width: sColW[3], align: 'right' });
          doc.text(String(ts.distanceKm), sColX[4], sY, { width: sColW[4], align: 'right' });
          doc.text(String(ts.fuelLiters), sColX[5], sY, { width: sColW[5], align: 'right' });
          doc.text(String(ts.fuelCost), sColX[6], sY, { width: sColW[6], align: 'right' });
        } else {
          doc.text(vLabel, sColX[0], sY, { width: sColW[0] });
          doc.text(String(ts.routeNo), sColX[1], sY, { width: sColW[1] });
          doc.text(String(ts.stopsCount), sColX[2], sY, { width: sColW[2] });
          doc.text(String(ts.bags), sColX[3], sY, { width: sColW[3], align: 'right' });
          doc.text(String(ts.kg), sColX[4], sY, { width: sColW[4], align: 'right' });
          doc.text(String(ts.distanceKm), sColX[5], sY, { width: sColW[5], align: 'right' });
          doc.text(String(ts.fuelLiters), sColX[6], sY, { width: sColW[6], align: 'right' });
          doc.text(String(ts.fuelCost), sColX[7], sY, { width: sColW[7], align: 'right' });
        }
        sY += 14;
        grandBags += ts.bags; grandKg += ts.kg; grandDist += ts.distanceKm;
        grandFuelL += ts.fuelLiters; grandFuelCost += ts.fuelCost;
      }

      if (sY > 750) { doc.addPage(); sY = 50; }
      doc.font('Helvetica-Bold').fontSize(8);
      doc.rect(38, sY - 2, 535, 16).fill('#003366');
      doc.fillColor('white');
      if (isPrecomputed) {
        doc.text('Grand Total', sColX[0], sY, { width: sColW[0] + sColW[1] });
        doc.text(String(grandBags), sColX[2], sY, { width: sColW[2], align: 'right' });
        doc.text(String(Math.round(grandKg * 100) / 100), sColX[3], sY, { width: sColW[3], align: 'right' });
        doc.text(String(Math.round(grandDist * 100) / 100), sColX[4], sY, { width: sColW[4], align: 'right' });
        doc.text(String(Math.round(grandFuelL * 100) / 100), sColX[5], sY, { width: sColW[5], align: 'right' });
        doc.text(String(Math.round(grandFuelCost * 100) / 100), sColX[6], sY, { width: sColW[6], align: 'right' });
      } else {
        doc.text('Grand Total', sColX[0], sY, { width: sColW[0] + sColW[1] + sColW[2] });
        doc.text(String(grandBags), sColX[3], sY, { width: sColW[3], align: 'right' });
        doc.text(String(Math.round(grandKg * 100) / 100), sColX[4], sY, { width: sColW[4], align: 'right' });
        doc.text(String(Math.round(grandDist * 100) / 100), sColX[5], sY, { width: sColW[5], align: 'right' });
        doc.text(String(Math.round(grandFuelL * 100) / 100), sColX[6], sY, { width: sColW[6], align: 'right' });
        doc.text(String(Math.round(grandFuelCost * 100) / 100), sColX[7], sY, { width: sColW[7], align: 'right' });
      }
      doc.fillColor('black');
    }

    doc.end();
  });
}

export function generateOptimizedStopsExcelData(
  stops: OptimizedStop[],
  tripAssignments?: Map<number, number>
): any[][] {
  const hasTripCol = tripAssignments && tripAssignments.size > 0;
  const header = hasTripCol
    ? ['Trip No', 'Route No', 'Stop Seq', 'Zone', 'Division', 'Location Name', 'Address', 'Latitude', 'Longitude', 'Total Qty (Nos)', 'Bags', 'Distance From Prev (KM)', 'Cumulative KM']
    : ['Route No', 'Stop Seq', 'Zone', 'Division', 'Location Name', 'Address', 'Latitude', 'Longitude', 'Total Qty (Nos)', 'Bags', 'Distance From Prev (KM)', 'Cumulative KM'];
  const rows = stops.map(s => {
    const base = [s.routeNo, s.stopSeq, s.zone || '', s.division || '', s.locationName, s.address || '', s.latitude, s.longitude,
      s.totalQtyNos, s.bags, s.distanceFromPrevKm, s.cumulativeKm];
    if (hasTripCol) {
      return [tripAssignments.get(s.stopSeq) || 1, ...base];
    }
    return base;
  });
  return [header, ...rows];
}

export function generateRouteSummaryExcelData(summaries: RouteSummary[]): any[][] {
  const header = ['Route No', 'Stops Count', 'Total Qty (Nos)', 'Total Bags', 'Total Kg', 'Total Distance (KM)', 'Vehicles Needed', 'Fuel (Liters)', 'Fuel Cost (₹)'];
  const rows = summaries.map(s => [
    s.routeNo, s.stopsCount, s.totalQtyNos, s.totalBags,
    s.totalKg || 0, s.totalDistanceKm,
    s.vehiclesNeeded || 1, s.totalFuelLiters || 0, s.totalFuelCost || 0
  ]);
  return [header, ...rows];
}

export function generateTripsExcelData(tripSummaries: TripSummary[]): any[][] {
  const header = ['Vehicle No', 'Route No', 'Stops', 'Bags', 'Weight (Kg)', 'Distance (KM)', 'Fuel (Liters)', 'Fuel Cost (₹)'];
  const rows = tripSummaries.map(t => [
    t.vehicleNo, t.routeNo, t.stopsCount, t.bags, t.kg, t.distanceKm, t.fuelLiters, t.fuelCost
  ]);
  return [header, ...rows];
}

export function generateEditableStopsExcelData(stops: OptimizedStop[]): any[][] {
  const header = ['Stop Seq', 'Route No', 'Zone', 'Division', 'Location Name', 'Address', 'Latitude', 'Longitude', 'Total Qty (Nos)', 'Bags (50 Nos each)', 'Remarks'];
  const rows = stops.map(s => [
    s.stopSeq, s.routeNo, s.zone || '', s.division || '', s.locationName, s.address || '', s.latitude, s.longitude,
    s.totalQtyNos, s.bags, ''
  ]);
  return [header, ...rows];
}
