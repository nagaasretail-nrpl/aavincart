import type { IStorage } from './types';
import { CatalogRepository } from './repositories/catalog';

/**
 * Concrete storage implementation.
 * Inherits methods via domain repository chain:
 *   StorageBase (base.ts)                  — Maps, seed data, catalog (restaurants/menuItems)
 *   → OrderRepository  (orders.ts)         — orders, masterOrders, orderStatus
 *   → UserRepository   (users.ts)          — users, deliveryPoints, analytics, categories, subUsers
 *   → MerchantRepository (merchants.ts)    — merchants, clients, items, plans, invoices, B2B invoices
 *   → CommerceRepository (commerce.ts)     — payouts, reservations, promos, notifications, earnings, attributes, marketing
 *   → PaymentRepository  (payments.ts)     — paymentGateways, UPI, Razorpay, Cashfree transactions
 *   → LogisticsRepository (logistics.ts)   — pricing, eway-bills, Delhivery, agents, media, delivery, fresh-milk
 */
export class MemStorage extends CatalogRepository implements IStorage {
  constructor() {
    super();
  }
}

export const storage = new MemStorage();
export type { IStorage };
