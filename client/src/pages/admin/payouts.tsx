import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Upload,
  Search,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  Building2,
  Smartphone,
  CreditCard,
} from "lucide-react";

interface Beneficiary {
  id: number;
  beneId: string;
  name: string;
  email: string | null;
  phone: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  vpa: string | null;
  status: string;
  addedBy: string | null;
  createdAt: string;
}

interface Payout {
  id: number;
  transferId: string;
  beneId: string;
  amount: string;
  transferMode: string;
  status: string;
  utr: string | null;
  remarks: string | null;
  initiatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
    SUCCESS: { variant: "default", icon: CheckCircle },
    VERIFIED: { variant: "default", icon: CheckCircle },
    PENDING: { variant: "secondary", icon: Clock },
    FAILED: { variant: "destructive", icon: XCircle },
    REVERSED: { variant: "outline", icon: AlertCircle },
    INVALID: { variant: "destructive", icon: XCircle },
    ACTIVE: { variant: "default", icon: CheckCircle },
    INACTIVE: { variant: "secondary", icon: XCircle },
  };
  const config = variants[status] || { variant: "outline" as const, icon: AlertCircle };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function BeneficiariesTab() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    beneId: "",
    name: "",
    email: "",
    phone: "",
    bankAccount: "",
    ifsc: "",
    vpa: "",
  });

  const { data: beneficiaries = [], isLoading } = useQuery<Beneficiary[]>({
    queryKey: ["/api/cashfree/payouts/beneficiaries"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/cashfree/payouts/beneficiaries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payouts/beneficiaries"] });
      setShowAddDialog(false);
      setFormData({ beneId: "", name: "", email: "", phone: "", bankAccount: "", ifsc: "", vpa: "" });
      toast({ title: "Beneficiary added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add beneficiary", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (beneId: string) => {
      await apiRequest("DELETE", `/api/cashfree/payouts/beneficiaries/${beneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payouts/beneficiaries"] });
      toast({ title: "Beneficiary removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove beneficiary", description: err.message, variant: "destructive" });
    },
  });

  const filtered = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.beneId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone || "").includes(searchQuery)
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search beneficiaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Beneficiary
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiary ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Bank / UPI</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No beneficiaries found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.beneId}</TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      {b.vpa ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Smartphone className="h-3 w-3" />
                          {b.vpa}
                        </div>
                      ) : b.bankAccount ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            ****{b.bankAccount.slice(-4)}
                          </div>
                          <div className="text-xs text-muted-foreground">{b.ifsc}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{b.phone || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status || "VERIFIED"} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(b.beneId)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Beneficiary</DialogTitle>
            <DialogDescription>Add a new payout beneficiary with bank or UPI details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Beneficiary ID</Label>
                <Input
                  placeholder="e.g. BENE-001"
                  value={formData.beneId}
                  onChange={(e) => setFormData({ ...formData, beneId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="10-digit mobile"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">Bank Details (optional if UPI provided)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Account Number</Label>
                  <Input
                    placeholder="Account number"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    placeholder="e.g. SBIN0001234"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">UPI Details (optional if bank provided)</p>
              <div className="space-y-2">
                <Label>UPI VPA</Label>
                <Input
                  placeholder="e.g. name@upi"
                  value={formData.vpa}
                  onChange={(e) => setFormData({ ...formData, vpa: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate(formData)}
              disabled={addMutation.isPending || !formData.beneId || !formData.name}
            >
              {addMutation.isPending ? "Adding..." : "Add Beneficiary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferTab() {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferData, setTransferData] = useState({
    beneId: "",
    amount: "",
    transferMode: "imps",
    remarks: "",
  });

  const { data: beneficiaries = [] } = useQuery<Beneficiary[]>({
    queryKey: ["/api/cashfree/payouts/beneficiaries"],
  });

  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferData) => {
      const res = await apiRequest("POST", "/api/cashfree/payouts/transfers", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payouts/transfers"] });
      setShowConfirmDialog(false);
      setTransferData({ beneId: "", amount: "", transferMode: "imps", remarks: "" });
      toast({ title: "Payout initiated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Payout failed", description: err.message, variant: "destructive" });
    },
  });

  const selectedBene = beneficiaries.find((b) => b.beneId === transferData.beneId);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Initiate Payout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Beneficiary</Label>
            <Select
              value={transferData.beneId}
              onValueChange={(val) => setTransferData({ ...transferData, beneId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select beneficiary" />
              </SelectTrigger>
              <SelectContent>
                {beneficiaries.map((b) => (
                  <SelectItem key={b.beneId} value={b.beneId}>
                    {b.name} ({b.beneId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBene && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>Name:</strong> {selectedBene.name}</p>
              {selectedBene.vpa && <p><strong>UPI:</strong> {selectedBene.vpa}</p>}
              {selectedBene.bankAccount && (
                <p><strong>Bank:</strong> ****{selectedBene.bankAccount.slice(-4)} ({selectedBene.ifsc})</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="0.00"
                className="pl-9"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transfer Mode</Label>
            <Select
              value={transferData.transferMode}
              onValueChange={(val) => setTransferData({ ...transferData, transferMode: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imps">IMPS (Instant)</SelectItem>
                <SelectItem value="neft">NEFT</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="banktransfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Remarks (optional)</Label>
            <Textarea
              placeholder="Payment for milk procurement..."
              value={transferData.remarks}
              onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => setShowConfirmDialog(true)}
            disabled={!transferData.beneId || !transferData.amount || parseFloat(transferData.amount) <= 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Review & Send Payout
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payout</DialogTitle>
            <DialogDescription>Please review and confirm the payout details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Beneficiary</span>
              <span className="font-medium">{selectedBene?.name || transferData.beneId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">₹{parseFloat(transferData.amount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <span className="uppercase font-medium">{transferData.transferMode}</span>
            </div>
            {transferData.remarks && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarks</span>
                <span>{transferData.remarks}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button
              onClick={() => transferMutation.mutate(transferData)}
              disabled={transferMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {transferMutation.isPending ? "Processing..." : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: payouts = [], isLoading } = useQuery<Payout[]>({
    queryKey: ["/api/cashfree/payouts/transfers"],
  });

  const refreshMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("GET", `/api/cashfree/payouts/transfers/${transferId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payouts/transfers"] });
    },
  });

  const filtered = payouts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.transferId.toLowerCase().includes(q) ||
        p.beneId.toLowerCase().includes(q) ||
        (p.utr || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPaid = payouts
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">₹{totalPending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payouts</p>
              <p className="text-lg font-bold">{payouts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by transfer ID, beneficiary, UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REVERSED">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payouts found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.transferId}</TableCell>
                    <TableCell>{p.beneId}</TableCell>
                    <TableCell className="font-medium">₹{parseFloat(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {p.transferMode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status || "PENDING"} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.utr || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refreshMutation.mutate(p.transferId)}
                        disabled={refreshMutation.isPending}
                        title="Refresh status"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BulkPayoutTab() {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState("");

  const bulkMutation = useMutation({
    mutationFn: async (transfers: Array<{ beneId: string; amount: number; transferMode: string; remarks: string }>) => {
      const results = [];
      for (const t of transfers) {
        try {
          const res = await apiRequest("POST", "/api/cashfree/payouts/transfers", t);
          results.push({ ...t, status: "initiated" });
        } catch (err: any) {
          results.push({ ...t, status: "failed", error: err.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payouts/transfers"] });
      const success = results.filter((r) => r.status === "initiated").length;
      const failed = results.filter((r) => r.status === "failed").length;
      toast({
        title: "Bulk payout completed",
        description: `${success} initiated, ${failed} failed`,
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvData(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = () => {
    if (!csvData.trim()) {
      toast({ title: "No CSV data", variant: "destructive" });
      return;
    }
    const lines = csvData.trim().split("\n");
    const transfers = lines.slice(1).map((line) => {
      const [beneId, amount, transferMode, remarks] = line.split(",").map((s) => s.trim());
      return { beneId, amount: parseFloat(amount), transferMode: transferMode || "imps", remarks: remarks || "" };
    }).filter((t) => t.beneId && !isNaN(t.amount) && t.amount > 0);

    if (transfers.length === 0) {
      toast({ title: "No valid transfers found in CSV", variant: "destructive" });
      return;
    }
    bulkMutation.mutate(transfers);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Payout Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <p className="text-xs text-muted-foreground">
              CSV format: beneId, amount, transferMode (imps/neft/upi), remarks
            </p>
          </div>

          <div className="space-y-2">
            <Label>Or paste CSV data</Label>
            <Textarea
              placeholder={"beneId,amount,transferMode,remarks\nBENE-001,5000,imps,Milk payment\nBENE-002,3000,upi,Feed procurement"}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {csvData && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">Preview</p>
              <p className="text-sm text-muted-foreground">
                {csvData.trim().split("\n").length - 1} transfers detected
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleBulkSubmit}
            disabled={bulkMutation.isPending || !csvData.trim()}
          >
            {bulkMutation.isPending ? "Processing..." : "Submit Bulk Payout"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPayouts() {
  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Cashfree Payouts</h1>
          <p className="text-muted-foreground">Disburse payments to farmers, vendors, and unions via IMPS/NEFT/UPI</p>
        </div>

        <Tabs defaultValue="beneficiaries">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="beneficiaries" className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Beneficiaries</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-1">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Transfer</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-1">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiaries" className="mt-4">
            <BeneficiariesTab />
          </TabsContent>
          <TabsContent value="transfer" className="mt-4">
            <TransferTab />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <HistoryTab />
          </TabsContent>
          <TabsContent value="bulk" className="mt-4">
            <BulkPayoutTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
