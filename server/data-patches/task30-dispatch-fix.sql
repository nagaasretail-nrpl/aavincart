-- Task #30 Data Patch: Fix Dispatch Route Matching for MRN. NARAYANAN (AA5013)
-- Applied: 2026-04-09
-- Safe to re-run: all statements are idempotent

-- ── 1. Fix customer_name on three historical unmatched orders ──────────────────
-- Orders placed before businessCode prefixing was implemented.
-- customer_name lacked the "AA5013" prefix, causing matchAgent() to fail.
UPDATE orders
SET customer_name = 'AA5013 MRN. NARAYANAN'
WHERE customer_phone = '9488437537'
  AND display_id IN ('ORD0742-FM', 'ORD0770-FM', 'ORD1307-FM')
  AND customer_name = 'MRN. NARAYANAN';

-- ── 2. Insert AA5013 MRN. NARAYANAN into mmo_route_agents if not present ───────
-- Route: Tharamangalam Route (R-THM), Edappadi MMO (MMO-EDP), Salem (merchant-3)
-- Point: Edappadi Bus Stand
INSERT INTO mmo_route_agents (
  id,
  route_id,
  mmo_office_id,
  union_id,
  agent_code,
  agent_name,
  point_name,
  segment,
  mobile_no,
  is_active,
  sequence_no,
  created_at
)
SELECT
  gen_random_uuid(),
  'c82cf955-93b6-4c9f-8f86-ed3db82152ef',  -- Tharamangalam Route
  'b703f7d6-7a8e-42fb-9e44-6dc0ac7bf66c',  -- Edappadi MMO
  'merchant-3',
  'AA5013',
  'MRN. NARAYANAN',
  'Edappadi Bus Stand',
  'Fresh Milk',
  '9488437537',
  true,
  5013,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM mmo_route_agents
  WHERE agent_code = 'AA5013' AND union_id = 'merchant-3'
);
