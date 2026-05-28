const B2B_ROLE_STRINGS = new Set([
  "dealer", "wsd", "wholesale_dealer", "retailer", "parlour",
  "inter_union", "federation", "agent",
]);

const B2B_PRICING_ROLES = new Set([
  "DEALER", "WHOLESALE_DEALER", "RETAILER", "FEDERATION", "INTER_UNION",
  "dealer", "wholesale_dealer", "retailer", "federation", "inter_union",
  "WSD", "wsd",
]);

export const HIDDEN_NAV_ROLES = new Set([
  "admin", "merchant", "driver", "staff", "transport",
]);

function normalizeRole(r: string | undefined | null): string {
  return (r || "").toLowerCase().trim();
}

export function isB2BUser(user: any): boolean {
  if (!user) return false;
  if (B2B_ROLE_STRINGS.has(normalizeRole(user.role))) return true;
  const pr = normalizeRole(
    user.pricingRole ||
    user.freshMilkPricingRole ||
    user.productsPricingRole ||
    ""
  );
  return B2B_PRICING_ROLES.has(pr) || B2B_PRICING_ROLES.has((pr || "").toUpperCase());
}

export function isEmployeeUser(user: any): boolean {
  const r = normalizeRole(user?.role);
  return r === "employee" || r === "staff" || r === "union_staff";
}

export function isHiddenNavRole(user: any): boolean {
  return HIDDEN_NAV_ROLES.has(normalizeRole(user?.role));
}
