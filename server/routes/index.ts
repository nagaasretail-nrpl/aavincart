import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerMainRoutes } from "./main";
import { registerKdsRoutes } from "./kds";
import { registerBulkOpsRoutes } from "./bulk-ops";
import { registerPaymentGatewayRoutes } from "./payment-gateways";
import { registerFreeMilkRoutes } from "./free-milk";

/**
 * Thin orchestrator — mounts all domain route modules onto Express.
 * Domain modules:
 *   ./main       — core application routes (~27k lines, pending further domain extraction)
 *   ./kds        — Kitchen Display System routes
 *   ./bulk-ops   — Fresh Milk Dispatch, Bulk Delivery, MMO Offices, Head Office
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Mount core routes (auth, orders, merchants, payments, delivery, etc.)
  await registerMainRoutes(app);

  // Mount Kitchen Display System routes
  await registerKdsRoutes(app);

  // Mount bulk-operations routes (fresh milk, MMO, bulk delivery, milk dispatch)
  await registerBulkOpsRoutes(app);

  // Mount merchant gateway account & payment processing routes
  await registerPaymentGatewayRoutes(app);

  // Mount free milk employee request routes
  await registerFreeMilkRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
