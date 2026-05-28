import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ArrowLeft, Download, Search, Filter, RefreshCw, X, CheckCircle, AlertTriangle, Copy, Clock, LinkIcon, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from './layout';

function ReconciliationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'matched':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Matched</Badge>;
    case 'unmatched':
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Unmatched</Badge>;
    case 'duplicate':
      return <Badge className="bg-orange-100 text-orange-800"><Copy className="h-3 w-3 mr-1" />Duplicate</Badge>;
    case 'pending':
    default:
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
}

function ReconciliationTab() {
  const { toast } = useToast();
  const [reconFilter, setReconFilter] = useState("all");
  const [selectedReconTxn, setSelectedReconTxn] = useState<any>(null);
  const [reconNote, setReconNote] = useState("");
  const [linkedInvoice, setLinkedInvoice] = useState("");

  const { data: reconData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/payment-reconciliation', reconFilter],
    queryFn: async () => {
      const params = reconFilter !== "all" ? `?status=${reconFilter}` : "";
      const res = await fetch(`/api/admin/payment-reconciliation${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, reconciliationStatus, linkedInvoiceId, reconciliationNote }: any) => {
      await apiRequest('PATCH', `/api/admin/payment-reconciliation/${id}`, {
        reconciliationStatus,
        linkedInvoiceId: linkedInvoiceId || undefined,
        reconciliationNote: reconciliationNote || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-reconciliation'] });
      setSelectedReconTxn(null);
      setReconNote("");
      setLinkedInvoice("");
      toast({ title: "Reconciliation Updated", description: "Transaction reconciliation status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update reconciliation status.", variant: "destructive" });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    updateMutation.mutate({
      id,
      reconciliationStatus: status,
      linkedInvoiceId: linkedInvoice,
      reconciliationNote: reconNote,
    });
  };

  const summary = reconData?.summary || { matched: 0, unmatched: 0, duplicate: 0, pending: 0, matchedAmount: 0, totalAmount: 0 };
  const transactions = reconData?.transactions || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.matched}</div>
            <p className="text-xs text-gray-500">₹{Number(summary.matchedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Unmatched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.unmatched}</div>
            <p className="text-xs text-gray-500">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Copy className="h-4 w-4 text-orange-600" />
              Duplicate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.duplicate}</div>
            <p className="text-xs text-gray-500">Potential duplicates</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            <p className="text-xs text-gray-500">Awaiting reconciliation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                3-Way Reconciliation
              </CardTitle>
              <CardDescription>Compare Order → Payment Gateway → Bank Statement</CardDescription>
            </div>
            <Select value={reconFilter} onValueChange={setReconFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading reconciliation data...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transactions found for the selected filter.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map((txn: any) => (
                <Card key={txn.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">Order Record</h4>
                          <p className="text-sm"><span className="text-gray-500">Order:</span> {txn.orderId}</p>
                          <p className="text-sm"><span className="text-gray-500">Amount:</span> ₹{Number(txn.amount).toFixed(2)}</p>
                          <p className="text-sm"><span className="text-gray-500">Status:</span> {txn.status}</p>
                        </div>

                        <div className="bg-purple-50 p-3 rounded-lg">
                          <h4 className="text-xs font-semibold text-purple-700 uppercase mb-2">Gateway Response</h4>
                          <p className="text-sm"><span className="text-gray-500">Txn ID:</span> {txn.upiTransactionId || txn.merchantTransactionId}</p>
                          <p className="text-sm"><span className="text-gray-500">Gateway:</span> {txn.paymentGatewayId}</p>
                          <p className="text-sm"><span className="text-gray-500">Payer:</span> {txn.payerVPA || 'N/A'}</p>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                          <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">Bank Settlement</h4>
                          <p className="text-sm"><span className="text-gray-500">Invoice:</span> {txn.linkedInvoiceId || 'Not linked'}</p>
                          <p className="text-sm"><span className="text-gray-500">Reconciled:</span> {txn.reconciledAt ? new Date(txn.reconciledAt).toLocaleDateString() : 'Pending'}</p>
                          <p className="text-sm"><span className="text-gray-500">Note:</span> {txn.reconciliationNote || '—'}</p>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-2">
                        <ReconciliationStatusBadge status={txn.reconciliationStatus} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReconTxn(txn);
                            setReconNote(txn.reconciliationNote || "");
                            setLinkedInvoice(txn.linkedInvoiceId || "");
                          }}
                        >
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReconTxn} onOpenChange={(open) => { if (!open) setSelectedReconTxn(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Reconciliation Status</DialogTitle>
            <DialogDescription>
              Transaction: {selectedReconTxn?.merchantTransactionId}
            </DialogDescription>
          </DialogHeader>
          {selectedReconTxn && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Current Status</label>
                <div className="mt-1">
                  <ReconciliationStatusBadge status={selectedReconTxn.reconciliationStatus} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Link Invoice ID</label>
                <Input
                  value={linkedInvoice}
                  onChange={(e) => setLinkedInvoice(e.target.value)}
                  placeholder="Enter invoice ID to link"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Reconciliation Note</label>
                <Textarea
                  value={reconNote}
                  onChange={(e) => setReconNote(e.target.value)}
                  placeholder="Add a note about this reconciliation"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusUpdate(selectedReconTxn.id, 'matched')}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Matched
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleStatusUpdate(selectedReconTxn.id, 'unmatched')}
                  disabled={updateMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Mark Unmatched
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => handleStatusUpdate(selectedReconTxn.id, 'duplicate')}
                  disabled={updateMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Mark Duplicate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate(selectedReconTxn.id, 'pending')}
                  disabled={updateMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Reset to Pending
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentGatewayTransactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const allTransactions = [
    {
      id: "TXN_1758204437731_8ae9443d",
      paymentGateway: "SBI UPI",
      amount: 20.31,
      currency: "INR",
      status: "pending",
      customerEmail: "test@example.com",
      timestamp: "2024-01-15 14:00:15",
      orderId: "ORD-2024-004"
    },
    {
      id: "txn_0987654321",
      paymentGateway: "PayPal",
      amount: 45.50,
      currency: "USD", 
      status: "pending",
      customerEmail: "user@domain.com",
      timestamp: "2024-01-15 13:15:18",
      orderId: "ORD-2024-002"
    },
    {
      id: "TXN_1758203842156_7b2c9d1e",
      paymentGateway: "SBI UPI",
      amount: 35.75,
      currency: "INR",
      status: "completed",
      customerEmail: "customer@foodie.com",
      timestamp: "2024-01-15 13:00:42",
      orderId: "ORD-2024-005"
    },
    {
      id: "txn_5555666677",
      paymentGateway: "Razorpay",
      amount: 120.00,
      currency: "USD",
      status: "failed",
      customerEmail: "buyer@email.com", 
      timestamp: "2024-01-15 12:45:55",
      orderId: "ORD-2024-003"
    }
  ];

  const transactions = useMemo(() => {
    return allTransactions.filter(transaction => {
      const matchesSearch = searchQuery === "" || 
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.orderId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGateway = selectedGateway === "all" || 
        transaction.paymentGateway.toLowerCase().replace(/\s+/g, "_") === selectedGateway;

      const matchesStatus = selectedStatus === "all" || 
        transaction.status === selectedStatus;

      return matchesSearch && matchesGateway && matchesStatus;
    });
  }, [searchQuery, selectedGateway, selectedStatus]);

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleApplyFilter = () => {
    console.log("Filters applied:", { searchQuery, selectedGateway, selectedStatus });
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setSelectedGateway("all");
    setSelectedStatus("all");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/payment-gateway">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment Gateway
          </Button>
        </Link>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600">Transaction Logs</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Logs</h1>
          <p className="text-gray-600">Monitor and track all payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-refresh" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transaction Logs</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-green-600">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">1,156</div>
                <p className="text-xs text-gray-500">92.7% success rate</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">23</div>
                <p className="text-xs text-gray-500">1.8% pending</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">68</div>
                <p className="text-xs text-gray-500">5.5% failure rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input 
                    placeholder="Search by transaction ID or email"
                    className="w-full"
                    data-testid="input-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                    <SelectTrigger data-testid="select-gateway">
                      <SelectValue placeholder="Payment Gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Gateways</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                      <SelectItem value="sbi_upi">SBI UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button className="w-full" data-testid="button-filter" onClick={handleApplyFilter}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>View and manage all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-600">Transaction ID</th>
                      <th className="text-left p-3 font-medium text-gray-600">Gateway</th>
                      <th className="text-left p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Status</th>
                      <th className="text-left p-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left p-3 font-medium text-gray-600">Order ID</th>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50" data-testid={`row-transaction-${transaction.id}`}>
                        <td className="p-3">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{transaction.id}</code>
                        </td>
                        <td className="p-3">{transaction.paymentGateway}</td>
                        <td className="p-3 font-medium">₹{transaction.amount.toFixed(2)} {transaction.currency}</td>
                        <td className="p-3">
                          <Badge className={getStatusColor(transaction.status)} data-testid={`status-${transaction.status}`}>
                            {transaction.status}
                          </Badge>
                        </td>
                        <td className="p-3">{transaction.customerEmail}</td>
                        <td className="p-3">
                          <code className="text-sm">{transaction.orderId}</code>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{transaction.timestamp}</td>
                        <td className="p-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            data-testid={`button-view-${transaction.id}`}
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>
      </Tabs>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Transaction Details
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsViewModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected transaction
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{selectedTransaction.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedTransaction.status)}>
                          {selectedTransaction.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Amount</label>
                      <p className="font-semibold text-lg">
                        {selectedTransaction.currency === "INR" ? "₹" : "$"}{selectedTransaction.amount.toFixed(2)} {selectedTransaction.currency}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Gateway</label>
                      <p className="font-medium">{selectedTransaction.paymentGateway}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-sm">{selectedTransaction.customerEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Order ID</label>
                      <p className="font-mono text-sm">{selectedTransaction.orderId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Transaction Date</label>
                    <p className="text-sm">{selectedTransaction.timestamp}</p>
                  </div>
                  
                  {selectedTransaction.paymentGateway === "SBI UPI" && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">UPI Transaction Details</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Payment initiated through SBI UPI gateway</p>
                        <p>• QR code generated for customer payment</p>
                        {selectedTransaction.status === "pending" && <p>• Awaiting payment confirmation</p>}
                        {selectedTransaction.status === "completed" && <p>• Payment successfully processed</p>}
                        {selectedTransaction.status === "failed" && <p>• Payment failed or expired</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}