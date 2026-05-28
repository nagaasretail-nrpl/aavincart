import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  XCircle, 
  Clock, 
  Truck,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ScrollText
} from "lucide-react";
import { format } from "date-fns";

interface EwayBill {
  id: string;
  ewayBillNumber: string | null;
  orderId: string | null;
  merchantId: string | null;
  status: string;
  supplyType: string;
  subSupplyType: string;
  docType: string;
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromTradeName: string;
  fromAddr1: string;
  fromPlace: string;
  fromPincode: string;
  fromStateCode: string;
  toGstin: string;
  toTradeName: string;
  toAddr1: string;
  toPlace: string;
  toPincode: string;
  toStateCode: string;
  totalValue: string;
  cgstValue: string;
  sgstValue: string;
  igstValue: string;
  cessValue: string;
  transMode: string;
  transDistance: number | null;
  transporterId: string | null;
  transporterName: string | null;
  vehicleNo: string | null;
  vehicleType: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string | null;
}

export default function EwayBillPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<EwayBill | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [updatePartBDialog, setUpdatePartBDialog] = useState(false);
  const [vehicleNo, setVehicleNo] = useState("");
  const [transMode, setTransMode] = useState("1");
  const [extendDialog, setExtendDialog] = useState(false);
  const [extendReason, setExtendReason] = useState("");
  const [extendAddress, setExtendAddress] = useState("");

  const { data: ewayBills = [], isLoading, refetch } = useQuery<EwayBill[]>({
    queryKey: ['/api/admin/eway-bills', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`/api/admin/eway-bills?${params}`);
      if (!res.ok) throw new Error('Failed to fetch E-way Bills');
      return res.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/eway-bills/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/eway-bills/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/eway-bills/${id}/cancel`, { cancelReason: reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "E-way Bill cancelled successfully" });
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedBill(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/eway-bills'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel E-way Bill", description: error.message, variant: "destructive" });
    }
  });

  const updatePartBMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/admin/eway-bills/${id}/update-partb`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Part B updated successfully" });
      setUpdatePartBDialog(false);
      setVehicleNo("");
      setTransMode("1");
      setSelectedBill(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/eway-bills'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update Part B", description: error.message, variant: "destructive" });
    }
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/admin/eway-bills/${id}/extend`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "E-way Bill validity extended" });
      setExtendDialog(false);
      setExtendReason("");
      setExtendAddress("");
      setSelectedBill(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/eway-bills'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to extend validity", description: error.message, variant: "destructive" });
    }
  });

  const isExpiringSoon = (bill: EwayBill) => {
    if (!bill.validUntil || bill.status !== 'active') return false;
    const validUntil = new Date(bill.validUntil);
    const hoursRemaining = (validUntil.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursRemaining > 0 && hoursRemaining <= 8;
  };

  const isDeliveryBlocked = (bill: EwayBill) => {
    const totalValue = parseFloat(bill.totalValue || '0');
    return totalValue >= 50000 && !bill.ewayBillNumber && bill.status === 'draft';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      draft: { color: "bg-gray-100 text-gray-800", icon: FileText },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      active: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      extended: { color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      expired: { color: "bg-red-100 text-red-800", icon: AlertCircle },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleCancel = (bill: EwayBill) => {
    setSelectedBill(bill);
    setCancelDialogOpen(true);
  };

  const handleUpdatePartB = (bill: EwayBill) => {
    setSelectedBill(bill);
    setVehicleNo(bill.vehicleNo || "");
    setTransMode(bill.transMode || "1");
    setUpdatePartBDialog(true);
  };

  const handleExtend = (bill: EwayBill) => {
    setSelectedBill(bill);
    setExtendDialog(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">E-way Bill Management</h2>
            <p className="text-gray-500 mt-1">Generate, track, and manage E-way Bills for GST compliance</p>
          </div>
          <Link href="/admin/eway-bill/generate">
            <Button className="bg-[#4AB3E8] hover:bg-[#3a9fd4]">
              <Plus className="h-4 w-4 mr-2" />
              Generate E-way Bill
            </Button>
          </Link>
        </div>

        {ewayBills.some(b => isDeliveryBlocked(b)) && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-800">Delivery Blocked</p>
                  <p className="text-sm text-red-600">
                    {ewayBills.filter(b => isDeliveryBlocked(b)).length} order(s) with value ≥ ₹50,000 require an E-way Bill before delivery can proceed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ewayBills.some(b => isExpiringSoon(b)) && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-800">Expiry Alert</p>
                  <p className="text-sm text-orange-600">
                    {ewayBills.filter(b => isExpiringSoon(b)).length} E-way Bill(s) will expire within 8 hours. Extend validity if needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ScrollText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-bold">{stats?.active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Draft</p>
                  <p className="text-xl font-bold">{stats?.draft || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expired</p>
                  <p className="text-xl font-bold">{stats?.expired || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cancelled</p>
                  <p className="text-xl font-bold">{stats?.cancelled || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>E-way Bills</CardTitle>
                <CardDescription>View and manage all E-way Bills</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : ewayBills.length === 0 ? (
              <div className="text-center py-12">
                <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No E-way Bills Found</h3>
                <p className="text-gray-500 mb-4">Generate your first E-way Bill to get started</p>
                <Link href="/admin/eway-bill/generate">
                  <Button className="bg-[#4AB3E8] hover:bg-[#3a9fd4]">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate E-way Bill
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-way Bill No.</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Value (₹)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ewayBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          {bill.ewayBillNumber || <span className="text-gray-400">Not Generated</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{bill.docNo}</p>
                            <p className="text-gray-500">{format(new Date(bill.docDate), 'dd/MM/yyyy')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium truncate max-w-[150px]">{bill.fromTradeName}</p>
                            <p className="text-gray-500">{bill.fromPlace}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium truncate max-w-[150px]">{bill.toTradeName}</p>
                            <p className="text-gray-500">{bill.toPlace}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{parseFloat(bill.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(bill.status)}
                            {isDeliveryBlocked(bill) && (
                              <Badge className="bg-red-100 text-red-800 flex items-center gap-1 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                Delivery Blocked
                              </Badge>
                            )}
                            {isExpiringSoon(bill) && (
                              <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 text-xs animate-pulse">
                                <Clock className="h-3 w-3" />
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {bill.validUntil ? (
                            <span className={`text-sm ${isExpiringSoon(bill) ? 'text-orange-600 font-medium' : ''}`}>
                              {format(new Date(bill.validUntil), 'dd/MM/yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/admin/eway-bill/${bill.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {(bill.status === 'active' || bill.status === 'extended') && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleUpdatePartB(bill)}
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleExtend(bill)}
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleCancel(bill)}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel E-way Bill</DialogTitle>
              <DialogDescription>
                This action cannot be undone. E-way Bills can only be cancelled within 24 hours of generation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cancel Reason</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Duplicate</SelectItem>
                    <SelectItem value="2">Order Cancelled</SelectItem>
                    <SelectItem value="3">Data Entry Mistake</SelectItem>
                    <SelectItem value="4">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep E-way Bill
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedBill && cancelMutation.mutate({ id: selectedBill.id, reason: cancelReason })}
                disabled={!cancelReason || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel E-way Bill"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={updatePartBDialog} onOpenChange={setUpdatePartBDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Part B (Vehicle Details)</DialogTitle>
              <DialogDescription>
                Update transporter and vehicle details for this E-way Bill
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Transport Mode</Label>
                <Select value={transMode} onValueChange={setTransMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Road</SelectItem>
                    <SelectItem value="2">Rail</SelectItem>
                    <SelectItem value="3">Air</SelectItem>
                    <SelectItem value="4">Ship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle Number</Label>
                <Input 
                  value={vehicleNo} 
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="TN01AB1234"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdatePartBDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedBill && updatePartBMutation.mutate({ 
                  id: selectedBill.id, 
                  data: { vehicleNo, transMode } 
                })}
                disabled={!vehicleNo || updatePartBMutation.isPending}
              >
                {updatePartBMutation.isPending ? "Updating..." : "Update Part B"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={extendDialog} onOpenChange={setExtendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Extend E-way Bill Validity</DialogTitle>
              <DialogDescription>
                Extend the validity period of this E-way Bill. Can only be done within 8 hours of expiry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for Extension</Label>
                <Select value={extendReason} onValueChange={setExtendReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Natural Calamity</SelectItem>
                    <SelectItem value="2">Law and Order Situation</SelectItem>
                    <SelectItem value="3">Transshipment</SelectItem>
                    <SelectItem value="4">Accident</SelectItem>
                    <SelectItem value="5">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Address/Location</Label>
                <Textarea 
                  value={extendAddress} 
                  onChange={(e) => setExtendAddress(e.target.value)}
                  placeholder="Enter current location of goods"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtendDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedBill && extendMutation.mutate({ 
                  id: selectedBill.id, 
                  data: { 
                    reason: extendReason, 
                    fromAddress: extendAddress,
                    vehicleNo: selectedBill.vehicleNo 
                  } 
                })}
                disabled={!extendReason || !extendAddress || extendMutation.isPending}
              >
                {extendMutation.isPending ? "Extending..." : "Extend Validity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
