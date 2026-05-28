import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Truck,
  FileText,
  Filter,
  RefreshCw,
  ArrowLeft,
  Package,
  Milk
} from "lucide-react";

interface IndentItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  hsnCode?: string;
  gstPercent?: string;
}

interface DailyIndent {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  institution_type?: string;
  delivery_date: string;
  delivery_address?: string;
  delivery_instructions?: string;
  items: IndentItem[];
  product_segment: string;
  subtotal: string;
  gst_amount?: string;
  total: string;
  mmo_office?: string;
  status: string;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  submitted_at: string;
}

const MMO_OFFICES = [
  { value: "City", label: "City" },
  { value: "Mettur", label: "Mettur" },
  { value: "Edappadi", label: "Edappadi" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "dispatched", label: "Dispatched", color: "bg-blue-100 text-blue-800" },
  { value: "delivered", label: "Delivered", color: "bg-purple-100 text-purple-800" },
];

export default function MmoIndentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<DailyIndent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedStatus !== "all") params.append("status", selectedStatus);
    if (selectedSegment !== "all") params.append("segment", selectedSegment);
    if (selectedOffice !== "all") params.append("mmoOffice", selectedOffice);
    if (selectedDate) params.append("date", selectedDate);
    return params.toString();
  };

  const { data: indents = [], isLoading, refetch } = useQuery<DailyIndent[]>({
    queryKey: ["/api/mmo/daily-indents", selectedStatus, selectedSegment, selectedOffice, selectedDate],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const res = await fetch(`/api/mmo/daily-indents?${queryParams}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch indents');
      return res.json();
    },
    enabled: !!user,
  });

  const updateIndentMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const res = await apiRequest("PATCH", `/api/mmo/daily-indents/${id}`, { status, rejectionReason });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Indent ${variables.status} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mmo/daily-indents"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedIndent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update indent",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (indent: DailyIndent) => {
    updateIndentMutation.mutate({ id: indent.id, status: "approved" });
  };

  const handleReject = (indent: DailyIndent) => {
    setSelectedIndent(indent);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedIndent) {
      updateIndentMutation.mutate({
        id: selectedIndent.id,
        status: "rejected",
        rejectionReason,
      });
    }
  };

  const handleDispatch = (indent: DailyIndent) => {
    updateIndentMutation.mutate({ id: indent.id, status: "dispatched" });
  };

  const handleDeliver = (indent: DailyIndent) => {
    updateIndentMutation.mutate({ id: indent.id, status: "delivered" });
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={statusOption?.color || "bg-gray-100 text-gray-800"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Please log in to access this page.</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">MMO Daily Indents</h1>
          <p className="text-sm text-muted-foreground">Process institution daily indent requests</p>
        </div>
      </div>

      <div>
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Segment</label>
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    <SelectItem value="Fresh Milk">🥛 Fresh Milk</SelectItem>
                    <SelectItem value="Products">📦 Products</SelectItem>
                    <SelectItem value="Ice Cream">🍦 Ice Cream</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">MMO Office</label>
                <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {MMO_OFFICES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => refetch()} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-10 text-center text-gray-500">Loading indents...</div>
            ) : indents.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No indents found for the selected filters</p>
              </div>
            ) : (
              <div className="divide-y">
                {indents.map((indent) => (
                  <div key={indent.id} className="p-4 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold">{indent.customer_name}</span>
                          {indent.institution_type && (
                            <Badge variant="outline" className="text-purple-600 border-purple-300">
                              {indent.institution_type}
                            </Badge>
                          )}
                          {getStatusBadge(indent.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(indent.delivery_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            {indent.product_segment === "Fresh Milk" ? (
                              <Milk className="h-4 w-4 text-blue-500" />
                            ) : indent.product_segment === "Ice Cream" ? (
                              <Package className="h-4 w-4 text-purple-500" />
                            ) : (
                              <Package className="h-4 w-4 text-green-500" />
                            )}
                            {indent.product_segment}
                          </div>
                          {indent.mmo_office && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {indent.mmo_office}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(indent.submitted_at)}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-2 mb-2">
                          <p className="text-sm font-medium mb-1">Items:</p>
                          <div className="text-sm text-gray-600">
                            {Array.isArray(indent.items) ? indent.items.map((item: IndentItem, idx: number) => (
                              <span key={idx}>
                                {item.name} x{item.quantity}
                                {idx < indent.items.length - 1 ? ", " : ""}
                              </span>
                            )) : "No items"}
                          </div>
                        </div>

                        {indent.delivery_address && (
                          <p className="text-sm text-gray-500">
                            📍 {indent.delivery_address}
                          </p>
                        )}
                        
                        {indent.rejection_reason && (
                          <p className="text-sm text-red-600 mt-2">
                            ❌ Rejection: {indent.rejection_reason}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600 mb-2">
                          ₹{parseFloat(indent.total).toFixed(2)}
                        </p>
                        
                        {indent.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => handleReject(indent)}
                              disabled={updateIndentMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(indent)}
                              disabled={updateIndentMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                        
                        {indent.status === "approved" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleDispatch(indent)}
                            disabled={updateIndentMutation.isPending}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Mark Dispatched
                          </Button>
                        )}
                        
                        {indent.status === "dispatched" && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleDeliver(indent)}
                            disabled={updateIndentMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Indent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Reason for rejection</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejecting this indent"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={updateIndentMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
