import type { DelhiveryConfig, DelhiveryShipment, DelhiveryWarehouse } from "@shared/schema";

// B2B Silver Rate Card - Delhivery Pricing (₹)
// Zones: A=Same City, B=Same Region (<500km), C1=Metro-Metro (501-1400km), 
// C2=Metro-Metro (1401-2500km), D1=Rest of India (501-1400km), D2=Rest of India (1401-2500km),
// E=Special Zone, F=Special Zone (NE, J&K, >2500km)
const B2B_SURFACE_RATES = {
  // Weight slab: [Zone A, Zone B, C-1, C-2, D-1, D-2, E, F]
  '0-250': [28, 32, 33, 36, 37, 38, 45, 50],
  '250-500': [6, 6, 9, 10, 9, 10, 11, 13],
  'additional_500g_till_5kg': [9, 14, 19, 24, 24, 27, 33, 37],
  'additional_1kg_above_5kg': [15, 21, 31, 39, 39, 44, 50, 55],
  'rto_0-250': [15, 18, 18, 20, 20, 21, 25, 28],
  'dto_0-250': [42, 48, 50, 54, 56, 57, 68, 75]
};

const B2B_EXPRESS_RATES = {
  '0-250': [28, 32, 42, 42, 47, 56, 63],
  '250-500': [6, 6, 13, 13, 18, 18, 22],
  'additional_500g_till_5kg': [9, 14, 39, 39, 43, 46, 53],
  'additional_1kg_above_5kg': [15, 21, 67, 67, 76, 85, 98],
  'rto_0-250': [15, 18, 24, 24, 27, 31, 32],
  'dto_0-250': [42, 48, 67, 67, 58, 68, 75]
};

// COD charges: 1.5% or Rs 40, whichever is higher
// Fuel Surcharge: Zero
// DPH: Excluded

// Metro cities for zone calculation
const METRO_CITIES = [
  'delhi', 'new delhi', 'mumbai', 'chennai', 'kolkata', 'bangalore', 'bengaluru',
  'hyderabad', 'ahmedabad', 'pune'
];

// Special zones (NE states, J&K)
const SPECIAL_ZONE_STATES = [
  'arunachal pradesh', 'assam', 'manipur', 'meghalaya', 'mizoram', 
  'nagaland', 'sikkim', 'tripura', 'jammu and kashmir', 'ladakh'
];

export type ShippingZone = 'A' | 'B' | 'C1' | 'C2' | 'D1' | 'D2' | 'E' | 'F';
export type ShippingMode = 'surface' | 'express';

export function determineZone(
  originCity: string,
  originState: string,
  destCity: string,
  destState: string,
  distanceKm?: number
): ShippingZone {
  const originCityLower = originCity.toLowerCase();
  const destCityLower = destCity.toLowerCase();
  const originStateLower = originState.toLowerCase();
  const destStateLower = destState.toLowerCase();
  
  // Check for special zones (NE, J&K)
  if (SPECIAL_ZONE_STATES.includes(destStateLower)) {
    return 'F';
  }
  if (SPECIAL_ZONE_STATES.includes(originStateLower)) {
    return 'E';
  }
  
  // Same city
  if (originCityLower === destCityLower) {
    return 'A';
  }
  
  // Same state or within 500km
  if (originStateLower === destStateLower || (distanceKm && distanceKm <= 500)) {
    return 'B';
  }
  
  const originIsMetro = METRO_CITIES.includes(originCityLower);
  const destIsMetro = METRO_CITIES.includes(destCityLower);
  
  // Metro to Metro
  if (originIsMetro && destIsMetro) {
    if (distanceKm && distanceKm > 1400) {
      return 'C2';
    }
    return 'C1';
  }
  
  // Rest of India (Metro to Others or Others to Others)
  if (distanceKm && distanceKm > 1400) {
    return 'D2';
  }
  return 'D1';
}

export function calculateB2BShippingCost(
  weightGrams: number,
  zone: ShippingZone,
  mode: ShippingMode = 'surface',
  codAmount?: number
): {
  baseCharge: number;
  codCharge: number;
  totalCharge: number;
  breakdown: {
    firstSlab: number;
    secondSlab: number;
    additionalWeight: number;
  };
} {
  const rates = mode === 'express' ? B2B_EXPRESS_RATES : B2B_SURFACE_RATES;
  const zoneIndex = ['A', 'B', 'C1', 'C2', 'D1', 'D2', 'E', 'F'].indexOf(zone);
  
  let baseCharge = 0;
  let firstSlab = 0;
  let secondSlab = 0;
  let additionalWeight = 0;
  
  if (weightGrams <= 250) {
    // 0-250g slab
    firstSlab = rates['0-250'][zoneIndex];
    baseCharge = firstSlab;
  } else if (weightGrams <= 500) {
    // 0-250g + 250-500g slabs
    firstSlab = rates['0-250'][zoneIndex];
    secondSlab = rates['250-500'][zoneIndex];
    baseCharge = firstSlab + secondSlab;
  } else if (weightGrams <= 5000) {
    // First 500g + additional 500g slabs till 5kg
    firstSlab = rates['0-250'][zoneIndex];
    secondSlab = rates['250-500'][zoneIndex];
    const additionalSlabs = Math.ceil((weightGrams - 500) / 500);
    additionalWeight = additionalSlabs * rates['additional_500g_till_5kg'][zoneIndex];
    baseCharge = firstSlab + secondSlab + additionalWeight;
  } else {
    // First 5kg + additional 1kg slabs above 5kg
    firstSlab = rates['0-250'][zoneIndex];
    secondSlab = rates['250-500'][zoneIndex];
    const slabsTill5kg = 9; // (5000-500)/500 = 9 additional slabs
    const weightTill5kg = slabsTill5kg * rates['additional_500g_till_5kg'][zoneIndex];
    const additionalKgSlabs = Math.ceil((weightGrams - 5000) / 1000);
    const weightAbove5kg = additionalKgSlabs * rates['additional_1kg_above_5kg'][zoneIndex];
    additionalWeight = weightTill5kg + weightAbove5kg;
    baseCharge = firstSlab + secondSlab + additionalWeight;
  }
  
  // COD charges: 1.5% or Rs 40, whichever is higher
  let codCharge = 0;
  if (codAmount && codAmount > 0) {
    codCharge = Math.max(codAmount * 0.015, 40);
  }
  
  return {
    baseCharge,
    codCharge,
    totalCharge: baseCharge + codCharge,
    breakdown: {
      firstSlab,
      secondSlab,
      additionalWeight
    }
  };
}

const DELHIVERY_URLS = {
  staging: {
    b2c: "https://staging-express.delhivery.com",
    b2b: "https://staging-express.delhivery.com",
    track: "https://staging-express.delhivery.com"
  },
  production: {
    b2c: "https://track.delhivery.com",
    b2b: "https://track.delhivery.com",
    track: "https://track.delhivery.com"
  }
};

interface DelhiveryApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

function getBaseUrl(config: DelhiveryConfig, type: 'b2c' | 'b2b' | 'track'): string {
  const env = config.environment === 'production' ? 'production' : 'staging';
  return DELHIVERY_URLS[env][type];
}

async function makeApiCall(
  config: DelhiveryConfig,
  endpoint: string,
  method: string = 'GET',
  body?: any,
  contentType: string = 'application/json'
): Promise<DelhiveryApiResponse> {
  try {
    const baseUrl = getBaseUrl(config, 'b2c');
    const headers: Record<string, string> = {
      'Authorization': `Token ${config.apiToken}`,
      'Accept': 'application/json'
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `API error: ${response.status}`
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Delhivery API error:', error);
    return { success: false, error: error.message || 'API call failed' };
  }
}

export async function checkPincodeServiceability(
  config: DelhiveryConfig,
  pincode: string
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/c/api/pin-codes/json/?filter_codes=${pincode}`);
}

export async function fetchWaybills(
  config: DelhiveryConfig,
  count: number = 1
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/waybill/api/bulk/json/?count=${count}`);
}

export async function calculateShippingCost(
  config: DelhiveryConfig,
  params: {
    originPin: string;
    destinationPin: string;
    weight: number;
    codAmount?: number;
    paymentMode: 'prepaid' | 'cod';
  }
): Promise<DelhiveryApiResponse> {
  const query = new URLSearchParams({
    md: params.paymentMode === 'cod' ? 'C' : 'P',
    ss: 'Delivered',
    d_pin: params.destinationPin,
    o_pin: params.originPin,
    cgm: params.weight.toString(),
    pt: params.paymentMode === 'cod' ? 'COD' : 'Pre-paid',
    cod: (params.codAmount || 0).toString()
  });

  return makeApiCall(config, `/api/kinko/v1/invoice/charges/.json?${query.toString()}`);
}

export async function createB2CShipment(
  config: DelhiveryConfig,
  shipment: {
    waybill?: string;
    orderRef: string;
    consigneeName: string;
    consigneePhone: string;
    consigneeAddress: string;
    consigneeCity: string;
    consigneeState: string;
    consigneePincode: string;
    paymentMode: 'prepaid' | 'cod';
    codAmount?: number;
    productDescription: string;
    quantity: number;
    weight: number;
    pickupLocation: string;
    invoiceAmount: number;
    invoiceNumber?: string;
    dimensions?: { length: number; breadth: number; height: number };
  }
): Promise<DelhiveryApiResponse> {
  const shipmentData = {
    shipments: [{
      name: shipment.consigneeName,
      add: shipment.consigneeAddress,
      pin: shipment.consigneePincode,
      city: shipment.consigneeCity,
      state: shipment.consigneeState,
      country: 'India',
      phone: shipment.consigneePhone,
      order: shipment.orderRef,
      payment_mode: shipment.paymentMode === 'cod' ? 'COD' : 'Prepaid',
      cod_amount: shipment.paymentMode === 'cod' ? shipment.codAmount : 0,
      return_pin: '',
      return_city: '',
      return_phone: '',
      return_add: '',
      return_state: '',
      return_country: '',
      products_desc: shipment.productDescription,
      hsn_code: '',
      total_amount: shipment.invoiceAmount,
      seller_add: '',
      seller_name: config.clientName || '',
      seller_inv: shipment.invoiceNumber || '',
      quantity: shipment.quantity,
      waybill: shipment.waybill || '',
      shipment_width: shipment.dimensions?.breadth || 0,
      shipment_height: shipment.dimensions?.height || 0,
      weight: shipment.weight * 1000,
      seller_gst_tin: '',
      shipping_mode: 'Surface',
      address_type: 'home'
    }],
    pickup_location: {
      name: shipment.pickupLocation
    }
  };

  const formData = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentData))}`;

  return makeApiCall(
    config,
    '/api/cmu/create.json',
    'POST',
    formData,
    'application/x-www-form-urlencoded'
  );
}

export async function createB2BShipment(
  config: DelhiveryConfig,
  shipment: {
    lrNumber?: string;
    orderRef: string;
    consigneeName: string;
    consigneePhone: string;
    consigneeAddress: string;
    consigneeCity: string;
    consigneeState: string;
    consigneePincode: string;
    consigneeGstin?: string;
    paymentMode: 'prepaid' | 'fod';
    invoiceAmount: number;
    invoiceNumber: string;
    invoiceDocument?: string;
    ewayBillNumber?: string;
    productDescription: string;
    quantity: number;
    weight: number;
    pickupLocation: string;
    senderGstin?: string;
    dimensions?: { length: number; breadth: number; height: number };
  }
): Promise<DelhiveryApiResponse> {
  const shipmentData = {
    lr_number: shipment.lrNumber || '',
    order_id: shipment.orderRef,
    consignee_name: shipment.consigneeName,
    consignee_phone: shipment.consigneePhone,
    consignee_address: shipment.consigneeAddress,
    consignee_city: shipment.consigneeCity,
    consignee_state: shipment.consigneeState,
    consignee_pincode: shipment.consigneePincode,
    consignee_gst_number: shipment.consigneeGstin || '',
    payment_mode: shipment.paymentMode === 'fod' ? 'FOD' : 'Prepaid',
    invoice_value: shipment.invoiceAmount,
    invoice_number: shipment.invoiceNumber,
    ewaybill_number: shipment.ewayBillNumber || '',
    product_description: shipment.productDescription,
    quantity: shipment.quantity,
    weight: shipment.weight,
    pickup_location: shipment.pickupLocation,
    sender_gst_number: shipment.senderGstin || '',
    length: shipment.dimensions?.length || 0,
    breadth: shipment.dimensions?.breadth || 0,
    height: shipment.dimensions?.height || 0
  };

  return makeApiCall(config, '/api/lr/create.json', 'POST', shipmentData);
}

export async function trackB2CShipment(
  config: DelhiveryConfig,
  waybill: string
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/api/v1/packages/json/?waybill=${waybill}`);
}

export async function trackB2BShipment(
  config: DelhiveryConfig,
  lrNumber: string
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/api/lr/track.json?lr_numbers=${lrNumber}`);
}

export async function cancelB2CShipment(
  config: DelhiveryConfig,
  waybill: string
): Promise<DelhiveryApiResponse> {
  const formData = `waybill=${waybill}&cancellation=true`;
  return makeApiCall(
    config,
    '/api/p/edit',
    'POST',
    formData,
    'application/x-www-form-urlencoded'
  );
}

export async function cancelB2BShipment(
  config: DelhiveryConfig,
  lrNumber: string,
  reason: string = 'Order cancelled'
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, '/api/lr/cancel.json', 'POST', {
    lr_number: lrNumber,
    cancellation_reason: reason
  });
}

export async function generateB2CLabel(
  config: DelhiveryConfig,
  waybill: string
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/api/p/packing_slip?wbns=${waybill}&pdf=true`);
}

export async function generateB2BLabel(
  config: DelhiveryConfig,
  lrNumber: string
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, `/api/lr/label.json?lr_numbers=${lrNumber}`);
}

export async function createPickupRequest(
  config: DelhiveryConfig,
  params: {
    pickupLocation: string;
    expectedPackages: number;
    pickupTime: string;
    pickupDate: string;
  }
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, '/api/fm/request/new/', 'POST', {
    pickup_time: params.pickupTime,
    pickup_date: params.pickupDate,
    pickup_location: params.pickupLocation,
    expected_package_count: params.expectedPackages
  });
}

export async function registerWarehouse(
  config: DelhiveryConfig,
  warehouse: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  }
): Promise<DelhiveryApiResponse> {
  return makeApiCall(config, '/api/backend/clientwarehouse/create/', 'POST', {
    name: warehouse.name,
    phone: warehouse.phone,
    address: warehouse.address,
    city: warehouse.city,
    state: warehouse.state,
    pin: warehouse.pincode,
    country: warehouse.country || 'India',
    registered_name: warehouse.name,
    return_address: warehouse.address,
    return_pin: warehouse.pincode,
    return_city: warehouse.city,
    return_state: warehouse.state,
    return_country: warehouse.country || 'India'
  });
}

export function mapDelhiveryStatusToShipmentStatus(delhiveryStatus: string): string {
  const statusMap: Record<string, string> = {
    'Manifested': 'manifested',
    'In Transit': 'in_transit',
    'Out for Delivery': 'out_for_delivery',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
    'RTO': 'rto',
    'RTO Delivered': 'rto_delivered',
    'Pending': 'pending',
    'Dispatched': 'dispatched',
    'Reached at Destination': 'in_transit'
  };

  return statusMap[delhiveryStatus] || delhiveryStatus.toLowerCase().replace(/\s+/g, '_');
}
