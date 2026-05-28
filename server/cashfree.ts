import { Cashfree, CFEnvironment } from "cashfree-pg";

export const CF_API_VERSION = "2023-08-01";

let initialized = false;

export function initCashfree() {
  if (initialized) return;
  
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const env = process.env.CASHFREE_ENV || "sandbox";

  if (!clientId || !clientSecret) {
    console.log("[Cashfree] API credentials not configured — Cashfree PG disabled");
    return;
  }

  Cashfree.XClientId = clientId;
  Cashfree.XClientSecret = clientSecret;
  Cashfree.XEnvironment = env === "production" 
    ? CFEnvironment.PRODUCTION 
    : CFEnvironment.SANDBOX;

  initialized = true;
  console.log(`[Cashfree] PG SDK initialized in ${env} mode`);
}

export function isCashfreeReady(): boolean {
  return initialized;
}

export function getCashfreePG() {
  if (!initialized) {
    initCashfree();
  }
  return new Cashfree();
}

export function getPayoutHeaders(): Record<string, string> {
  const clientId = process.env.CASHFREE_PAYOUT_CLIENT_ID || process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_PAYOUT_CLIENT_SECRET || process.env.CASHFREE_CLIENT_SECRET;
  const env = process.env.CASHFREE_ENV || "sandbox";
  const baseUrl = env === "production" 
    ? "https://payout-api.cashfree.com" 
    : "https://payout-gamma.cashfree.com";
  
  return {
    "x-client-id": clientId || "",
    "x-client-secret": clientSecret || "",
    "x-api-version": CF_API_VERSION,
    "Content-Type": "application/json",
    _baseUrl: baseUrl,
  };
}

export function getPayoutBaseUrl(): string {
  const env = process.env.CASHFREE_ENV || "sandbox";
  return env === "production" 
    ? "https://payout-api.cashfree.com" 
    : "https://payout-gamma.cashfree.com";
}

export function getPGBaseUrl(): string {
  const env = process.env.CASHFREE_ENV || "sandbox";
  return env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function generateOrderId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `AAVIN-${ts}-${rand}`.toUpperCase();
}
