import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import AdminLayout from './layout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { ORDER_WORKFLOW_STAGES } from '@shared/schema';
import {
  ArrowLeft,
  Milk,
  IceCream,
  Package,
  UserCheck,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ArrowDown,
  Megaphone,
  Factory,
  PackageOpen,
  TruckIcon,
  ThumbsUp,
} from 'lucide-react';

interface SegmentOrder {
  id: string;
  orderNumber: number;
  displayId: string;
  productSegment: string;
  segmentSuffix: string;
  workflowStatus: string;
  status: string;
  total: string;
  items: any[];
  customerName: string;
  managerAssignedAt: string | null;
  packingStartedAt: string | null;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

interface MasterOrderDetail {
  id: string;
  masterOrderNumber: number;
  displayId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  status: string;
  segmentCount: number;
  deliveredCount: number;
  createdAt: string;
  segmentOrders: SegmentOrder[];
}

const WORKFLOW_STEP_IDS = ORDER_WORKFLOW_STAGES.map(s => s.id);

const TEAM_COLORS: Record<string, { bg: string; text: string; activeBg: string; completeBg: string; badge: string }> = {
  marketing: { bg: 'bg-blue-100', text: 'text-blue-700', activeBg: 'bg-blue-600', completeBg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  production: { bg: 'bg-amber-100', text: 'text-amber-700', activeBg: 'bg-amber-600', completeBg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  packing: { bg: 'bg-green-100', text: 'text-green-700', activeBg: 'bg-green-600', completeBg: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-300' },
  delivery: { bg: 'bg-purple-100', text: 'text-purple-700', activeBg: 'bg-purple-600', completeBg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  default: { bg: 'bg-gray-100', text: 'text-gray-700', activeBg: 'bg-gray-600', completeBg: 'bg-gray-500', badge: 'bg-gray-100 text-gray-800 border-gray-300' },
};

function getTeamColors(team: string | null) {
  return TEAM_COLORS[team || 'default'] || TEAM_COLORS['default'];
}

const SEGMENT_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: typeof Milk; label: string }> = {
  'Fresh Milk': { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-400', icon: Milk, label: 'Fresh Milk' },
  'Products': { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-400', icon: Package, label: 'Dairy Products' },
  'Ice Cream': { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-400', icon: IceCream, label: 'Ice Cream' },
};

function getStepIndex(status: string): number {
  return (WORKFLOW_STEP_IDS as readonly string[]).indexOf(status);
}

function StepIcon({ step, isActive, isComplete }: { step: string; isActive: boolean; isComplete: boolean }) {
  const iconClass = isComplete ? 'text-white' : isActive ? 'text-white' : 'text-gray-400';
  const size = 16;
  switch (step) {
    case 'pending': return <Clock className={iconClass} size={size} />;
    case 'marketing_approved': return <Megaphone className={iconClass} size={size} />;
    case 'assigned_to_delivery': return <PackageOpen className={iconClass} size={size} />;
    case 'out_for_delivery': return <Truck className={iconClass} size={size} />;
    case 'delivered': return <CheckCircle2 className={iconClass} size={size} />;
    case 'customer_acknowledged': return <ThumbsUp className={iconClass} size={size} />;
    default: return <Clock className={iconClass} size={size} />;
  }
}

function SegmentWorkflowCard({ order, onAdvance }: { order: SegmentOrder; onAdvance: (orderId: string, newStatus: string) => void }) {
  const segConfig = SEGMENT_CONFIG[order.productSegment] || SEGMENT_CONFIG['Products'];
  const SegIcon = segConfig.icon;
  const currentStepIdx = getStepIndex(order.workflowStatus || 'pending');
  const nextStep = currentStepIdx < WORKFLOW_STEP_IDS.length - 1 ? WORKFLOW_STEP_IDS[currentStepIdx + 1] : null;
  const isFullyComplete = order.workflowStatus === 'customer_acknowledged';

  return (
    <div className={`rounded-xl border-2 ${segConfig.borderColor} ${segConfig.bgColor} p-4 min-w-[220px] flex-1`}>
      <div className="flex items-center gap-2 mb-3">
        <SegIcon className={segConfig.color} size={22} />
        <div>
          <div className={`font-bold text-sm ${segConfig.color}`}>{segConfig.label}</div>
          <div className="text-xs font-mono text-gray-600">{order.displayId || order.id.slice(0, 8)}</div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {ORDER_WORKFLOW_STAGES.map((stage, idx) => {
          const isComplete = idx < currentStepIdx;
          const isActive = idx === currentStepIdx;
          const teamColors = getTeamColors(stage.team);
          return (
            <div key={stage.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isComplete ? teamColors.completeBg : isActive ? teamColors.activeBg : 'bg-gray-200'
              }`}>
                <StepIcon step={stage.id} isActive={isActive} isComplete={isComplete} />
              </div>
              <span className={`text-xs ${isComplete ? `${teamColors.text} font-medium line-through` : isActive ? `${teamColors.text} font-bold` : 'text-gray-400'}`}>
                {stage.label}
              </span>
              {isActive && (
                <Badge variant="outline" className={`text-[10px] px-1 py-0 ${teamColors.badge}`}>
                  Current
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Total: <span className="font-semibold text-gray-800">₹{parseFloat(order.total).toLocaleString('en-IN')}</span>
      </div>

      {nextStep && !isFullyComplete && (
        <Button
          size="sm"
          className="w-full text-xs"
          onClick={() => onAdvance(order.id, nextStep)}
        >
          Advance to {ORDER_WORKFLOW_STAGES.find(s => s.id === nextStep)?.label || nextStep}
        </Button>
      )}
      {isFullyComplete && (
        <Badge className="w-full justify-center bg-green-600 text-white">Complete</Badge>
      )}
    </div>
  );
}

export default function OrderWorkflow() {
  const [, params] = useRoute('/admin/order-workflow/:id');
  const masterOrderId = params?.id;
  const { toast } = useToast();

  const { data: masterOrder, isLoading } = useQuery<MasterOrderDetail>({
    queryKey: ['/api/master-orders', masterOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/master-orders/${masterOrderId}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    enabled: !!masterOrderId,
    refetchInterval: 5000,
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ orderId, workflowStatus }: { orderId: string; workflowStatus: string }) => {
      const res = await apiRequest('PATCH', `/api/orders/${orderId}/workflow`, { workflowStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-orders', masterOrderId] });
      toast({ title: 'Workflow updated', description: 'Segment order status has been advanced.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update workflow.', variant: 'destructive' });
    },
  });

  const handleAdvance = (orderId: string, newStatus: string) => {
    advanceMutation.mutate({ orderId, workflowStatus: newStatus });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!masterOrder) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Master order not found.</p>
          <Link href="/admin/orders">
            <Button variant="outline" className="mt-4"><ArrowLeft size={16} className="mr-2" /> Back to Orders</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const allDelivered = masterOrder.segmentOrders.every(o => o.workflowStatus === 'delivered' || o.workflowStatus === 'customer_acknowledged');
  const allAcknowledged = masterOrder.segmentOrders.every(o => o.workflowStatus === 'customer_acknowledged');
  const fmOrder = masterOrder.segmentOrders.find(o => o.productSegment === 'Fresh Milk');
  const dpOrder = masterOrder.segmentOrders.find(o => o.productSegment === 'Products');
  const icOrder = masterOrder.segmentOrders.find(o => o.productSegment === 'Ice Cream');

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">8-Stage Order Workflow</h1>
            <p className="text-sm text-gray-500">
              <span className="text-blue-600">Marketing</span> → <span className="text-amber-600">Production</span> → <span className="text-green-600">Packing</span> → <span className="text-purple-600">Delivery</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCheck size={20} className="text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold">{masterOrder.customerName}</div>
                  <div className="text-xs text-gray-500">{masterOrder.customerPhone} &bull; {masterOrder.customerEmail}</div>
                </div>
              </div>
              <Badge variant={masterOrder.status === 'closed' ? 'default' : 'secondary'} className={masterOrder.status === 'closed' ? 'bg-green-600' : ''}>
                {masterOrder.status === 'closed' ? 'Closed' : 'Open'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="bg-gray-100 rounded-lg px-6 py-3 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Master Order</div>
                <div className="text-xl font-bold font-mono">{masterOrder.displayId}</div>
                <div className="text-sm text-gray-600 mt-1">Total: ₹{parseFloat(masterOrder.totalAmount).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-1">
          <ArrowDown className="text-gray-400" size={24} />
          <div className="bg-gray-700 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            Auto Segment Split
          </div>
          <ArrowDown className="text-gray-400" size={24} />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {fmOrder && <SegmentWorkflowCard order={fmOrder} onAdvance={handleAdvance} />}
          {dpOrder && <SegmentWorkflowCard order={dpOrder} onAdvance={handleAdvance} />}
          {icOrder && <SegmentWorkflowCard order={icOrder} onAdvance={handleAdvance} />}
          {!fmOrder && !dpOrder && !icOrder && masterOrder.segmentOrders.map(o => (
            <SegmentWorkflowCard key={o.id} order={o} onAdvance={handleAdvance} />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          <ArrowDown className="text-gray-400" size={24} />
          <div className={`rounded-xl px-8 py-4 text-center border-2 ${
            allDelivered ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className={allDelivered ? 'text-green-600' : 'text-gray-400'} size={24} />
              <span className={`font-bold text-lg ${allDelivered ? 'text-green-700' : 'text-gray-500'}`}>Delivery Confirmation</span>
            </div>
            <p className="text-sm text-gray-500">
              {masterOrder.deliveredCount}/{masterOrder.segmentCount} segments delivered
            </p>
          </div>
          <ArrowDown className="text-gray-400" size={24} />
        </div>

        <div className="flex justify-center">
          <div className={`rounded-xl px-8 py-4 text-center border-2 ${
            allAcknowledged ? 'bg-green-600 border-green-700 text-white' : 'bg-gray-100 border-gray-300'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={22} />
              <span className="font-bold text-lg">Master Order {allAcknowledged ? 'CLOSED' : 'Open'}</span>
            </div>
            <div className="text-sm mt-1 opacity-80">{masterOrder.displayId}</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
