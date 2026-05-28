import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { formatTimestamp } from '@/lib/format-timestamp';
import { formatOrderId as formatOrderIdLib } from '@/lib/format-order-id';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Printer, 
  MoreVertical,
  Edit,
  Clock,
  ChefHat,
  Navigation,
  UserCheck,
  ShoppingCart,
  FileText,
  Trash2,
  History,
  Download,
  Check,
  X,
  AlertTriangle,
  Truck,
  CreditCard,
  Receipt,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useRoute } from 'wouter';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber?: number;
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
  preparationTime?: number;
  driverName?: string;
  driverPhone?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  invoiceStatus?: string;
  receivableStatus?: string;
  ewayBillId?: string;
  bankRef?: string | null;
}

function formatOrderId(order: Order): string {
  return formatOrderIdLib({ id: order.id, orderNumber: order.orderNumber, displayId: (order as any).displayId });
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisine: string;
}

export default function OrderDetails() {
  const [, params] = useRoute('/admin/orders/view/:id');
  const orderId = params?.id;
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [showEditPrepTime, setShowEditPrepTime] = useState(false);
  const [prepTime, setPrepTime] = useState('10');
  const [showReassignDriver, setShowReassignDriver] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [selectedPrintOptions, setSelectedPrintOptions] = useState({
    invoice: true,
    production: false,
    delivery: false,
  });

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/admin/orders/${orderId}`],
    enabled: !!orderId,
  });

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  // Get customer order count
  const { data: customerOrders } = useQuery<Order[]>({
    queryKey: ['/api/admin/orders', { customer: order?.customerEmail }],
    queryFn: async () => {
      if (!order?.customerEmail) return [];
      const res = await fetch(`/api/admin/orders?customer=${encodeURIComponent(order.customerEmail)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.orders || data || [];
    },
    enabled: !!order?.customerEmail,
  });
  
  const customerOrderCount = customerOrders?.length || 0;

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/orders/${orderId}`] });
      }
      toast({ title: "Success", description: "Order updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
      preparing: { bg: 'bg-purple-100', text: 'text-purple-800' },
      ready: { bg: 'bg-orange-100', text: 'text-orange-800' },
      out_for_delivery: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={`${config.bg} ${config.text} border-0`}>{status}</Badge>;
  };

  const handleAccept = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'confirmed' });
    }
  };

  const handleReject = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'cancelled' });
    }
  };

  const handleSendToProduction = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'preparing' });
    }
  };

  const handleReadyForDelivery = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'ready' });
    }
  };

  const handleOutForDelivery = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'out_for_delivery' });
    }
  };

  const handleMarkDelivered = () => {
    if (order) {
      updateOrderMutation.mutate({ id: order.id, status: 'delivered' });
    }
  };

  const handlePrint = (type: 'web' | 'pos' | 'production') => {
    if (!order) return;
    
    // Open a new window for printing
    const printWindow = window.open('', 'PrintWindow', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      toast({ title: "Print Error", description: "Please allow popups for this site to print invoices", variant: "destructive" });
      return;
    }

    const restaurant = restaurants.find(r => r.id === order.restaurantId);
    const dateTime = new Date(order.createdAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const items = order.items || [];
    const subtotal = parseFloat(order.subtotal || order.total || '0');
    const tax = parseFloat(order.tax || '0');
    const deliveryFee = parseFloat(order.deliveryFee || '0');
    const total = parseFloat(order.total || '0');

    if (type === 'production') {
      const productionContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Production Order #${formatOrderId(order)}</title>
          <style>
            @page { size: 80mm auto; margin: 2mm; }
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 0; padding: 5mm; width: 76mm; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .title { font-size: 16px; font-weight: bold; }
            .order-num { font-size: 24px; font-weight: bold; margin: 8px 0; }
            .time { font-size: 14px; }
            .items { margin: 10px 0; }
            .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dashed #ccc; }
            .item-name { font-size: 14px; font-weight: bold; }
            .item-qty { font-size: 18px; font-weight: bold; }
            .item-notes { font-size: 11px; color: #666; margin-top: 3px; }
            .footer { text-align: center; margin-top: 15px; border-top: 2px dashed #000; padding-top: 8px; }
            @media print { body { width: 76mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PRODUCTION ORDER</div>
            <div class="order-num">#${formatOrderId(order)}</div>
            <div class="time">${dateTime}</div>
          </div>
          <div class="items">
            ${items.map(item => `
              <div class="item">
                <div style="display: flex; justify-content: space-between;">
                  <span class="item-name">${item.name}</span>
                  <span class="item-qty">x${item.quantity}</span>
                </div>
                ${item.notes ? `<div class="item-notes">Note: ${item.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <strong>Prep Time: ${prepTime} minutes</strong>
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(productionContent);
    } else if (type === 'pos') {
      const posContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${formatOrderId(order)}</title>
          <style>
            @page { size: 80mm auto; margin: 2mm; }
            body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.3; margin: 0; padding: 3mm; width: 74mm; }
            .center { text-align: center; }
            .header { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .logo { font-size: 16px; font-weight: bold; }
            .tagline { font-size: 9px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .items { margin: 8px 0; }
            .item { margin: 4px 0; }
            .total-row { font-weight: bold; font-size: 13px; }
            .footer { margin-top: 10px; font-size: 9px; }
            @media print { body { width: 74mm; } }
          </style>
        </head>
        <body>
          <div class="header center">
            <div class="logo">AAVIN CART - TCMPF</div>
            <div class="tagline">Tamil Nadu Cooperative Milk Producers' Federation</div>
            <div style="margin-top:5px;">Order #${formatOrderId(order)}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Order ID:</span><span>${order.id}</span></div>
          <div class="row"><span>Customer:</span><span>${order.customerName}</span></div>
          <div class="row"><span>District Union:</span><span>${restaurant?.name || 'AAVIN'}</span></div>
          <div class="row"><span>Date:</span><span>${dateTime}</span></div>
          <div class="row"><span>Status:</span><span>${order.status.toUpperCase()}</span></div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${items.length > 0 ? items.map(item => `
              <div class="item">
                <div class="row">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            `).join('') : '<div class="center">No items</div>'}
          </div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
          ${tax > 0 ? `<div class="row"><span>Tax:</span><span>₹${tax.toFixed(2)}</span></div>` : ''}
          ${deliveryFee > 0 ? `<div class="row"><span>Delivery:</span><span>₹${deliveryFee.toFixed(2)}</span></div>` : ''}
          
          <div class="divider"></div>
          
          <div class="row total-row"><span>TOTAL:</span><span>₹${total.toFixed(2)}</span></div>
          
          <div class="divider"></div>
          
          <div class="footer center">
            <div>Thank you for your order!</div>
            <div>Tamil Nadu Cooperative Milk Producers' Federation</div>
            <div>Printed on: ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(posContent);
    } else {
      const sellerName = restaurant?.name || 'Tamil Nadu Cooperative Milk Producers\' Federation';
      const sellerAddress = (restaurant as any)?.address || 'Aavin Illam, Madhavaram Milk Colony\nChennai - 600051, Tamil Nadu';
      const sellerGstin = (restaurant as any)?.gstin || '33AAACT1234F1Z5';
      const buyerName = order.customerName || 'Customer';
      const buyerAddress = order.deliveryAddress || '';
      const invoiceNo = `INV-${formatOrderId(order)}`;
      const actualTax = tax;
      const cgstAmount = actualTax / 2;
      const sgstAmount = actualTax / 2;
      const grandTotal = Math.round(total);
      const roundingOff = grandTotal - total;

      const numberToWords = (num: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
          'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        if (num === 0) return 'Zero';
        const convertLess1000 = (n: number): string => {
          if (n === 0) return '';
          if (n < 20) return ones[n];
          if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
          return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLess1000(n % 100) : '');
        };
        const crore = Math.floor(num / 10000000);
        const lakh = Math.floor((num % 10000000) / 100000);
        const thousand = Math.floor((num % 100000) / 1000);
        const remainder = Math.floor(num % 1000);
        const paise = Math.round((num % 1) * 100);
        let result = '';
        if (crore) result += convertLess1000(crore) + ' Crore ';
        if (lakh) result += convertLess1000(lakh) + ' Lakh ';
        if (thousand) result += convertLess1000(thousand) + ' Thousand ';
        if (remainder) result += convertLess1000(remainder);
        result = result.trim();
        if (paise > 0) result += ' and ' + convertLess1000(paise) + ' paise';
        return result + ' Only';
      };

      const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);

      const webContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tax Invoice - ${invoiceNo}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 15px; }
            .inv { max-width: 800px; margin: 0 auto; }
            table { border-collapse: collapse; width: 100%; }
            .b { border: 1px solid #000; }
            .bb { border-bottom: 1px solid #000; }
            .br { border-right: 1px solid #000; }
            .bt { border-top: 1px solid #000; }
            .bl { border-left: 1px solid #000; }
            .bg-gray { background: #f3f4f6; }
            .bold { font-weight: bold; }
            .semi { font-weight: 600; }
            .center { text-align: center; }
            .right { text-align: right; }
            .left { text-align: left; }
            .p1 { padding: 3px 6px; }
            .p2 { padding: 6px 10px; }
            .fs-lg { font-size: 16px; }
            .fs-sm { font-size: 10px; }
            .fs-xs { font-size: 9px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="inv">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">
              <h1 style="font-size:18px;margin:0;">Tax Invoice</h1>
            </div>

            <table class="b">
              <tr>
                <td class="p2 br bb" style="width:50%;vertical-align:top;">
                  <div class="bold" style="font-size:13px;">${sellerName}</div>
                  <div style="white-space:pre-line;margin:4px 0;">${sellerAddress}</div>
                  <div><span class="semi">GSTIN/UIN:</span> ${sellerGstin}</div>
                  <div><span class="semi">State Name:</span> Tamil Nadu, Code: 33</div>
                </td>
                <td class="p1 bb" style="width:50%;vertical-align:top;">
                  <table style="width:100%;">
                    <tr><td class="p1 semi bb br fs-sm">Invoice No.</td><td class="p1 semi bb br fs-sm">e-Way Bill No.</td><td class="p1 semi bb fs-sm">Dated</td></tr>
                    <tr><td class="p1 bb br fs-sm" style="word-break:break-word;">${invoiceNo}</td><td class="p1 bb br fs-sm">${order.ewayBillId || '-'}</td><td class="p1 bb fs-sm">${dateTime.split(',')[0]}</td></tr>
                    <tr><td class="p1 semi bb br fs-sm">Delivery Note</td><td colspan="2" class="p1 semi bb fs-sm">Mode/Terms of Payment</td></tr>
                    <tr><td class="p1 bb br fs-sm">-</td><td colspan="2" class="p1 bb fs-sm">${order.paymentMethod?.toUpperCase() || '-'}</td></tr>
                    <tr><td class="p1 semi bb br fs-sm">Dispatch Doc No.</td><td colspan="2" class="p1 semi bb fs-sm">Delivery Note Date</td></tr>
                    <tr><td class="p1 bb br fs-sm">-</td><td colspan="2" class="p1 bb fs-sm">-</td></tr>
                    <tr><td class="p1 semi br fs-sm">Vehicle No.</td><td colspan="2" class="p1 semi fs-sm">Destination</td></tr>
                    <tr><td class="p1 br fs-sm">-</td><td colspan="2" class="p1 fs-sm">${order.deliveryAddress ? order.deliveryAddress.split(',').slice(-2).join(',').trim() : '-'}</td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="p2 br bb" style="vertical-align:top;">
                  <div class="fs-xs semi" style="color:#666;margin-bottom:3px;">Consignee (Ship to)</div>
                  <div class="bold">${buyerName}</div>
                  <div style="white-space:pre-line;">${buyerAddress}</div>
                  <div><span class="semi">State Name:</span> Tamil Nadu, Code: 33</div>
                </td>
                <td class="p2 bb" style="vertical-align:top;">
                  <div class="fs-xs semi" style="color:#666;margin-bottom:3px;">Buyer (Bill to)</div>
                  <div class="bold">${buyerName}</div>
                  <div style="white-space:pre-line;">${buyerAddress}</div>
                  <div><span class="semi">State Name:</span> Tamil Nadu, Code: 33</div>
                </td>
              </tr>
              <tr class="bg-gray bb">
                <td colspan="2" class="p1">
                  <table style="width:100%;">
                    <tr class="bold" style="border-bottom:1px solid #000;">
                      <th class="p1 br left" style="width:5%;">Sl</th>
                      <th class="p1 br left" style="width:30%;">Description of Goods</th>
                      <th class="p1 br center" style="width:10%;">HSN/SAC</th>
                      <th class="p1 br center" style="width:8%;">GST Rate</th>
                      <th class="p1 br right" style="width:10%;">Quantity</th>
                      <th class="p1 br right" style="width:12%;">Rate</th>
                      <th class="p1 br center" style="width:8%;">per</th>
                      <th class="p1 right" style="width:15%;">Amount</th>
                    </tr>
                    ${items.length > 0 ? items.map((item: any, idx: number) => `
                    <tr style="border-bottom:1px solid #ccc;">
                      <td class="p1 br center">${idx + 1}</td>
                      <td class="p1 br">${item.name}</td>
                      <td class="p1 br center">${item.hsnCode || '0401'}</td>
                      <td class="p1 br center">${item.gstPercent ? item.gstPercent + '%' : (subtotal > 0 ? ((actualTax / subtotal) * 100).toFixed(1) + '%' : '0%')}</td>
                      <td class="p1 br right">${item.quantity} Nos</td>
                      <td class="p1 br right">${fmt(item.price)}</td>
                      <td class="p1 br center">Nos</td>
                      <td class="p1 right">${fmt(item.price * item.quantity)}</td>
                    </tr>
                    `).join('') : `
                    <tr><td colspan="8" class="p1 center">No items available</td></tr>
                    `}
                    <tr style="border-bottom:1px solid #ccc;">
                      <td colspan="7" class="p1 br right semi">Output CGST</td>
                      <td class="p1 right">${fmt(cgstAmount)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #ccc;">
                      <td colspan="7" class="p1 br right semi">Output SGST</td>
                      <td class="p1 right">${fmt(sgstAmount)}</td>
                    </tr>
                    ${deliveryFee > 0 ? `
                    <tr style="border-bottom:1px solid #ccc;">
                      <td colspan="7" class="p1 br right semi">Delivery Fee</td>
                      <td class="p1 right">${fmt(deliveryFee)}</td>
                    </tr>` : ''}
                    ${Math.abs(roundingOff) >= 0.01 ? `
                    <tr style="border-bottom:1px solid #ccc;">
                      <td colspan="7" class="p1 br right semi">Rounding Off</td>
                      <td class="p1 right">${fmt(roundingOff)}</td>
                    </tr>` : ''}
                    <tr class="bg-gray bold" style="border-top:2px solid #000;">
                      <td colspan="4" class="p1 br right">Total</td>
                      <td class="p1 br right">${totalQty} Nos</td>
                      <td colspan="2" class="p1 br"></td>
                      <td class="p1 right">₹ ${fmt(grandTotal)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="p2 bb">
                  <div class="semi">Amount Chargeable (in words):</div>
                  <div class="semi">INR ${numberToWords(grandTotal)}</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="p2 bb">
                  <table style="width:100%;border:1px solid #999;">
                    <tr class="bg-gray">
                      <th class="p1 right" style="border:1px solid #999;">Taxable Value</th>
                      <th class="p1 center" colspan="2" style="border:1px solid #999;">CGST</th>
                      <th class="p1 center" colspan="2" style="border:1px solid #999;">SGST/UTGST</th>
                      <th class="p1 right" style="border:1px solid #999;">Total Tax</th>
                    </tr>
                    <tr class="fs-xs">
                      <th class="p1" style="border:1px solid #999;"></th>
                      <th class="p1 center" style="border:1px solid #999;">Rate</th>
                      <th class="p1 center" style="border:1px solid #999;">Amount</th>
                      <th class="p1 center" style="border:1px solid #999;">Rate</th>
                      <th class="p1 center" style="border:1px solid #999;">Amount</th>
                      <th class="p1" style="border:1px solid #999;"></th>
                    </tr>
                    <tr>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(subtotal)}</td>
                      <td class="p1 center" style="border:1px solid #999;">${subtotal > 0 ? ((cgstAmount / subtotal) * 100).toFixed(1) : '0'}%</td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(cgstAmount)}</td>
                      <td class="p1 center" style="border:1px solid #999;">${subtotal > 0 ? ((sgstAmount / subtotal) * 100).toFixed(1) : '0'}%</td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(sgstAmount)}</td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(cgstAmount + sgstAmount)}</td>
                    </tr>
                    <tr class="bold bg-gray">
                      <td class="p1 right" style="border:1px solid #999;">${fmt(subtotal)}</td>
                      <td class="p1" style="border:1px solid #999;"></td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(cgstAmount)}</td>
                      <td class="p1" style="border:1px solid #999;"></td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(sgstAmount)}</td>
                      <td class="p1 right" style="border:1px solid #999;">${fmt(cgstAmount + sgstAmount)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="p2 bb fs-sm">
                  <span class="semi">Tax Amount (in words):</span> INR ${numberToWords(cgstAmount + sgstAmount)}
                </td>
              </tr>
              <tr>
                <td class="p2 br" style="vertical-align:top;">
                  <div class="semi fs-sm" style="margin-bottom:4px;">Declaration</div>
                  <div class="fs-xs" style="color:#555;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                </td>
                <td class="p2 right" style="vertical-align:top;">
                  <div class="semi fs-sm" style="margin-bottom:40px;">for ${sellerName}</div>
                  <div class="semi fs-sm" style="border-top:1px solid #999;padding-top:4px;display:inline-block;">Authorised Signatory</div>
                </td>
              </tr>
            </table>

            <div class="center" style="margin-top:12px;color:#888;font-size:10px;">
              <div>This is a Computer Generated Invoice</div>
              <div style="margin-top:4px;">Printed on: ${new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(webContent);
    }
    
    printWindow.document.close();
    
    // Wait for content to render then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const openGoogleMaps = () => {
    if (order?.deliveryAddress) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 p-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-96 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700">Order not found</h2>
          <Link href="/admin/orders">
            <Button className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const restaurant = restaurants.find(r => r.id === order.restaurantId);
  const items = order.items || [];
  const subtotal = parseFloat(order.subtotal || order.total || '0');
  const tax = parseFloat(order.tax || '0');
  const deliveryFee = parseFloat(order.deliveryFee || '0');
  const total = parseFloat(order.total || '0');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Printer className="h-6 w-6 text-gray-400" />
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  Order #{formatOrderId(order)}
                  <Badge variant="outline" className="text-green-600 bg-green-50">new</Badge>
                </h1>
                <p className="text-sm text-gray-500">
                  Placed on {formatTimestamp(order.createdAt)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={order.status !== 'pending'}
            >
              Accepted
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={order.status === 'cancelled' || order.status === 'delivered'}
            >
              Reject
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSendToProduction}
              disabled={order.status !== 'confirmed'}
            >
              Send Production
            </Button>
            
            {order.status === 'preparing' && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleReadyForDelivery}
              >
                <Package className="mr-1 h-4 w-4" /> Ready
              </Button>
            )}
            
            {order.status === 'ready' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleOutForDelivery}
              >
                <Navigation className="mr-1 h-4 w-4" /> Out for Delivery
              </Button>
            )}
            
            {order.status === 'out_for_delivery' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleMarkDelivered}
              >
                <Check className="mr-1 h-4 w-4" /> Delivered
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/order/${order.id}/invoice`}>
                    <FileText className="mr-2 h-4 w-4" /> GST Tax Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrint('web')}>
                  <FileText className="mr-2 h-4 w-4" /> Web Print (A4)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrint('pos')}>
                  <Printer className="mr-2 h-4 w-4" /> POS (80mm)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrint('production')}>
                  <ChefHat className="mr-2 h-4 w-4" /> Production Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrint('production')}>
                  <ChefHat className="mr-2 h-4 w-4" /> Production Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <History className="mr-2 h-4 w-4" /> Timeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrint('web')}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF (A4)
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" /> Manage Order
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleReject}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 text-xl">🏪</div>
                  <div>
                    <h3 className="font-semibold">District Union :</h3>
                    <p className="text-gray-700">{restaurant?.name || 'AAVIN Salem'}</p>
                    <p className="text-sm text-gray-500">{restaurant?.address || 'Salem, Tamil Nadu'}</p>
                    <Link href={`/admin/orders?restaurantId=${order.restaurantId}`}>
                      <span className="text-sm text-green-600 hover:underline cursor-pointer">
                        View all orders
                      </span>
                    </Link>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-green-600 hover:underline cursor-pointer" onClick={openGoogleMaps}>
                      Get direction
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Customer :</h3>
                    <p className="text-gray-700">{order.customerName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {order.customerPhone}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {order.customerEmail}
                    </p>
                    <Link href={`/admin/orders?customer=${order.customerEmail}`}>
                      <span className="text-sm text-green-600 hover:underline cursor-pointer">
                        {customerOrderCount > 0 ? `${customerOrderCount} orders` : 'View customer orders'}
                      </span>
                    </Link>
                    {order.pricingRole && (
                      <p className="text-sm text-blue-600 mt-1">Role: {order.pricingRole}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">Loyalty Points :</h3>
                    <p className="text-sm text-gray-500">This order will earn {Math.floor(total)} points!</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-semibold">Delivery information :</h3>
                    <p className="text-gray-700">{order.customerName}</p>
                    <p className="text-sm text-gray-500">{order.customerPhone}</p>
                    <p className="text-sm text-gray-500">{order.deliveryAddress || 'Address not provided'}</p>
                    <p className="text-sm text-gray-500">Delivery options: Hand it to me</p>
                    <span className="text-sm text-green-600 hover:underline cursor-pointer" onClick={openGoogleMaps}>
                      Get direction
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-purple-500" />
                  <div>
                    <h3 className="font-semibold">Delivery man :</h3>
                    {order.driverName ? (
                      <>
                        <p className="text-gray-700">{order.driverName}</p>
                        <p className="text-sm text-gray-500">{order.driverPhone}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Not assigned</p>
                    )}
                    <button 
                      className="text-sm text-green-600 hover:underline"
                      onClick={() => setShowReassignDriver(true)}
                    >
                      Reassign Driver
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Order type</td>
                      <td className="py-3">
                        <Badge className="bg-green-100 text-green-700 border-0">Delivery</Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Delivery Date/Time</td>
                      <td className="py-3">{new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Payment</td>
                      <td className="py-3">Payment by {order.paymentMethod === 'cod' ? 'Cash On Delivery' : order.paymentMethod}</td>
                    </tr>
                    {order.bankRef && (
                      <tr className="border-b">
                        <td className="py-3 font-medium text-gray-600">Bank Ref No.</td>
                        <td className="py-3 font-mono text-sm">{order.bankRef}</td>
                      </tr>
                    )}
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Payment status</td>
                      <td className="py-3">
                        <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {order.paymentStatus || 'Unpaid'}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Delivery status</td>
                      <td className="py-3">
                        <Badge className={
                          order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.deliveryStatus === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                          order.deliveryStatus === 'dispatched' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          <Truck className="h-3 w-3 mr-1" />
                          {order.deliveryStatus || 'pending'}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 font-medium text-gray-600">Invoice status</td>
                      <td className="py-3">
                        <Badge className={
                          order.invoiceStatus === 'generated' ? 'bg-green-100 text-green-700' :
                          order.invoiceStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          <Receipt className="h-3 w-3 mr-1" />
                          {order.invoiceStatus || 'pending'}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-600">Receivable status</td>
                      <td className="py-3">
                        <Badge className={
                          order.receivableStatus === 'collected' ? 'bg-green-100 text-green-700' :
                          order.receivableStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                          order.receivableStatus === 'outstanding' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          <CreditCard className="h-3 w-3 mr-1" />
                          {order.receivableStatus || 'not_applicable'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment history</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Date</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Payment</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Description</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Amount</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-3">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-3">{order.paymentMethod}</td>
                      <td className="py-3 px-3 text-gray-500">Payment</td>
                      <td className="py-3 px-3">₹{total.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {order.paymentStatus || 'Unpaid'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">Summary</CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Preparation Estimate</p>
                    <p className="text-2xl font-bold text-gray-800">{prepTime} minutes</p>
                    <p className="text-xs text-gray-400">Suggested</p>
                    <button 
                      className="text-xs text-green-600 hover:underline flex items-center gap-1 ml-auto"
                      onClick={() => setShowEditPrepTime(true)}
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length > 0 ? items.map((item, idx) => {
                  const itemImage = (item as any).image;
                  return (
                  <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                    <div className="flex gap-3">
                      {itemImage && (
                        <img 
                          src={itemImage} 
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {item.quantity}x
                          </Badge>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-blue-600 mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                )}) : (
                  <p className="text-sm text-gray-500 text-center py-4">No item details available</p>
                )}

                <div className="pt-4 space-y-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sub total ({items.length} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service fee</span>
                      <span>₹{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax 5%</span>
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

            {order.paymentMethod === 'cod' && order.status === 'delivered' && order.paymentStatus !== 'paid' && (() => {
              const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;
              const daysOverdue = deliveredDate ? Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              return daysOverdue >= 3 ? (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-red-800 text-sm">COD Payment Delay ({daysOverdue} days overdue)</p>
                        <p className="text-xs text-red-600">
                          This order was delivered {daysOverdue} days ago but the Cash on Delivery payment has not been collected. Follow up with the delivery agent immediately.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">4-Way Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Print</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="print-invoice"
                    checked={selectedPrintOptions.invoice}
                    onCheckedChange={(checked) => setSelectedPrintOptions(prev => ({ ...prev, invoice: !!checked }))}
                  />
                  <label htmlFor="print-invoice" className="text-sm cursor-pointer">Invoice (A4)</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="print-production"
                    checked={selectedPrintOptions.production}
                    onCheckedChange={(checked) => setSelectedPrintOptions(prev => ({ ...prev, production: !!checked }))}
                  />
                  <label htmlFor="print-production" className="text-sm cursor-pointer">Production Order</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="print-delivery"
                    checked={selectedPrintOptions.delivery}
                    onCheckedChange={(checked) => setSelectedPrintOptions(prev => ({ ...prev, delivery: !!checked }))}
                  />
                  <label htmlFor="print-delivery" className="text-sm cursor-pointer">Delivery Slip</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedPrintOptions({ invoice: true, production: true, delivery: true })}
                  >
                    Check All
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      if (selectedPrintOptions.invoice) handlePrint('web');
                      if (selectedPrintOptions.production) setTimeout(() => handlePrint('production'), 500);
                    }}
                  >
                    Print Selected
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showEditPrepTime} onOpenChange={setShowEditPrepTime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Preparation Time</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Preparation time (minutes)</label>
            <Input 
              type="number" 
              value={prepTime} 
              onChange={(e) => setPrepTime(e.target.value)}
              min="1"
              max="120"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPrepTime(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: "Updated", description: `Preparation time set to ${prepTime} minutes` });
              setShowEditPrepTime(false);
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReassignDriver} onOpenChange={setShowReassignDriver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Driver</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">Select a driver to assign to this order:</p>
            <div className="space-y-2">
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <p className="font-medium">Driver 1</p>
                <p className="text-sm text-gray-500">+91 98437 77277</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <p className="font-medium">Driver 2</p>
                <p className="text-sm text-gray-500">+91 98437 77278</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDriver(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: "Driver Assigned", description: "Driver has been reassigned to this order" });
              setShowReassignDriver(false);
            }}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
