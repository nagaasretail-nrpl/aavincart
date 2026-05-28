import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import MerchantLayout from './layout';
import { useMerchantContext } from './context';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Printer,
  Clock,
  CreditCard,
  Receipt,
  Package,
  Truck,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useRoute } from 'wouter';
import { formatOrderId } from '@/lib/format-order-id';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  hsnCode?: string;
  gstPercent?: number;
}

interface Order {
  id: string;
  orderNumber?: number;
  displayId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  status: string;
  createdAt: Date;
  paymentMethod: string;
  deliveryAddress: string;
  pricingRole?: string;
  items?: OrderItem[];
  restaurantId?: string;
  restaurantName?: string;
  deliveryFee?: string;
  tax?: string;
  subtotal?: string;
  driverName?: string;
  driverPhone?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  invoiceStatus?: string;
  receivableStatus?: string;
  bankRef?: string | null;
}

function fmtOrderId(order: Order): string {
  return formatOrderId({
    id: String(order.id),
    orderNumber: order.orderNumber,
    displayId: order.displayId,
  });
}

function getStatusBadge(status: string) {
  const config: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    new: 'bg-orange-100 text-orange-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    marketing_approved: 'bg-purple-100 text-purple-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-blue-100 text-blue-800',
    assigned_to_delivery: 'bg-indigo-100 text-indigo-800',
    out_for_delivery: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return <Badge className={`${config[status] || 'bg-gray-100 text-gray-800'} border-0`}>{status}</Badge>;
}

function MerchantOrderDetailsContent() {
  const [, params] = useRoute('/merchant/orders/view/:id');
  const orderId = params?.id;
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load order');
      return res.json();
    },
    enabled: !!orderId,
  });

  const autoPrintTriggered = useRef(false);
  useEffect(() => {
    if (order && !autoPrintTriggered.current && window.location.search.includes('print=1')) {
      autoPrintTriggered.current = true;
      setTimeout(() => handlePrint(), 300);
    }
  }, [order]);

  const handlePrint = () => {
    if (!order) return;

    const printWindow = window.open('', 'PrintWindow', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      toast({ title: "Print Error", description: "Please allow popups to print invoices", variant: "destructive" });
      return;
    }

    const dateTime = new Date(order.createdAt).toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });

    const items = order.items || [];
    const subtotal = parseFloat(order.subtotal || order.total || '0');
    const tax = parseFloat(order.tax || '0');
    const deliveryFee = parseFloat(order.deliveryFee || '0');
    const total = parseFloat(order.total || '0');
    const grandTotal = Math.round(total);
    const cgstAmount = tax / 2;
    const sgstAmount = tax / 2;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    const invoiceNo = `INV-${fmtOrderId(order)}`;

    const content = `<!DOCTYPE html><html><head><title>Tax Invoice - ${invoiceNo}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 15px; }
        table { border-collapse: collapse; width: 100%; }
        .b { border: 1px solid #000; } .bb { border-bottom: 1px solid #000; } .br { border-right: 1px solid #000; }
        .bg-gray { background: #f3f4f6; } .bold { font-weight: bold; } .semi { font-weight: 600; }
        .center { text-align: center; } .right { text-align: right; } .left { text-align: left; }
        .p1 { padding: 3px 6px; } .p2 { padding: 6px 10px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div style="max-width:800px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">
          <h1 style="font-size:18px;margin:0;">Tax Invoice</h1>
        </div>
        <table class="b">
          <tr>
            <td class="p2 br bb" style="width:50%;vertical-align:top;">
              <div class="bold" style="font-size:13px;">AAVIN CART - TCMPF</div>
              <div style="margin:4px 0;">Tamil Nadu Cooperative Milk Producers' Federation</div>
              <div><span class="semi">Invoice No:</span> ${invoiceNo}</div>
              <div><span class="semi">Date:</span> ${dateTime}</div>
            </td>
            <td class="p2 bb" style="width:50%;vertical-align:top;">
              <div class="bold">${order.customerName || 'Customer'}</div>
              <div style="margin:4px 0;">${order.deliveryAddress || ''}</div>
              <div><span class="semi">Phone:</span> ${order.customerPhone || '-'}</div>
              <div><span class="semi">Payment:</span> ${order.paymentMethod?.toUpperCase() || '-'}</div>
            </td>
          </tr>
          <tr class="bg-gray bb">
            <td colspan="2" class="p1">
              <table style="width:100%;">
                <tr class="bold" style="border-bottom:1px solid #000;">
                  <th class="p1 br left" style="width:5%;">Sl</th>
                  <th class="p1 br left" style="width:35%;">Description</th>
                  <th class="p1 br center" style="width:10%;">HSN</th>
                  <th class="p1 br right" style="width:10%;">Qty</th>
                  <th class="p1 br right" style="width:15%;">Rate</th>
                  <th class="p1 right" style="width:15%;">Amount</th>
                </tr>
                ${items.length > 0 ? items.map((item, idx) => `
                <tr style="border-bottom:1px solid #ccc;">
                  <td class="p1 br center">${idx + 1}</td>
                  <td class="p1 br">${item.name}</td>
                  <td class="p1 br center">${item.hsnCode || '0401'}</td>
                  <td class="p1 br right">${item.quantity}</td>
                  <td class="p1 br right">${fmt(item.price)}</td>
                  <td class="p1 right">${fmt(item.price * item.quantity)}</td>
                </tr>`).join('') : '<tr><td colspan="6" class="p1 center">No items</td></tr>'}
                <tr style="border-bottom:1px solid #ccc;"><td colspan="5" class="p1 br right semi">Subtotal</td><td class="p1 right">${fmt(subtotal)}</td></tr>
                ${tax > 0 ? `<tr style="border-bottom:1px solid #ccc;"><td colspan="5" class="p1 br right semi">CGST</td><td class="p1 right">${fmt(cgstAmount)}</td></tr>
                <tr style="border-bottom:1px solid #ccc;"><td colspan="5" class="p1 br right semi">SGST</td><td class="p1 right">${fmt(sgstAmount)}</td></tr>` : ''}
                ${deliveryFee > 0 ? `<tr style="border-bottom:1px solid #ccc;"><td colspan="5" class="p1 br right semi">Delivery</td><td class="p1 right">${fmt(deliveryFee)}</td></tr>` : ''}
                <tr class="bg-gray bold" style="border-top:2px solid #000;">
                  <td colspan="3" class="p1 br right">Total</td>
                  <td class="p1 br right">${totalQty}</td>
                  <td class="p1 br"></td>
                  <td class="p1 right">₹ ${fmt(grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="margin-top:20px;text-align:center;font-size:10px;color:#666;">
          Thank you for your order! | Tamil Nadu Cooperative Milk Producers' Federation | Printed: ${new Date().toLocaleString('en-IN')}
        </div>
      </div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Eye className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Order not found</p>
        <Link href="/merchant/orders">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const items = order.items || [];
  const subtotal = parseFloat(order.subtotal || order.total || '0');
  const tax = parseFloat(order.tax || '0');
  const deliveryFee = parseFloat(order.deliveryFee || '0');
  const total = parseFloat(order.total || '0');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/merchant/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order #{fmtOrderId(order)}</h1>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(order.status)}
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{order.customerName || 'Unknown'}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.customerPhone}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.deliveryAddress}</span>
                </div>
              )}
              {order.pricingRole && (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{order.pricingRole}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length > 0 ? items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {item.quantity}x
                    </Badge>
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <span className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No item details available</p>
              )}

              <div className="pt-4 space-y-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-semibold text-lg pt-4 border-t">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <span className="font-medium">{fmtOrderId(order)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span>{order.paymentMethod?.toUpperCase() || '-'}</span>
              </div>
              {order.bankRef && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bank Ref No.</span>
                  <span className="font-mono text-xs">{order.bankRef}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">4-Way Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded-lg p-3 text-center">
                  <Truck className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Delivery</p>
                  <Badge className={
                    order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-700 mt-1' :
                    order.deliveryStatus === 'in_transit' ? 'bg-blue-100 text-blue-700 mt-1' :
                    'bg-gray-100 text-gray-700 mt-1'
                  }>
                    {order.deliveryStatus || 'pending'}
                  </Badge>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <Receipt className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <Badge className={
                    order.invoiceStatus === 'generated' ? 'bg-green-100 text-green-700 mt-1' :
                    'bg-gray-100 text-gray-700 mt-1'
                  }>
                    {order.invoiceStatus || 'pending'}
                  </Badge>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <CreditCard className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <Badge className={
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 mt-1' :
                    'bg-red-100 text-red-700 mt-1'
                  }>
                    {order.paymentStatus || 'unpaid'}
                  </Badge>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <Package className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-xs text-muted-foreground">Receivable</p>
                  <Badge className={
                    order.receivableStatus === 'collected' ? 'bg-green-100 text-green-700 mt-1' :
                    order.receivableStatus === 'overdue' ? 'bg-red-100 text-red-700 mt-1' :
                    'bg-gray-100 text-gray-700 mt-1'
                  }>
                    {order.receivableStatus || 'n/a'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MerchantOrderDetailsPage() {
  return (
    <MerchantLayout>
      <MerchantOrderDetailsContent />
    </MerchantLayout>
  );
}
