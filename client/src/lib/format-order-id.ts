export function formatOrderId(order: { orderNumber?: number; displayId?: string; id: string }): string {
  if (order.displayId) return order.displayId;
  if (order.orderNumber) return `ORD-${String(order.orderNumber).padStart(4, '0')}`;
  return order.id.slice(-8).toUpperCase();
}

export function getShortOrderId(order: any): string {
  if (order.displayId) return order.displayId;
  if (order.orderNumber) return `ORD-${String(order.orderNumber).padStart(4, '0')}`;
  if (typeof order.id === 'string' && order.id.length > 10) {
    return order.id.slice(-8).toUpperCase();
  }
  return String(order.id);
}
