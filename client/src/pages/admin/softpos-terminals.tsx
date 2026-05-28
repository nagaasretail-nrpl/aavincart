import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Plus, Smartphone, Trash2, RefreshCw, CreditCard, AlertTriangle } from "lucide-react";

interface Terminal {
  id: number;
  terminalId: string;
  merchantId: string | null;
  terminalName: string | null;
  terminalPhone: string | null;
  deviceInfo: string | null;
  status: string;
  createdAt: string;
}

export default function SoftPOSTerminals() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [terminalId, setTerminalId] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [terminalPhone, setTerminalPhone] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");

  const { data: terminals = [], isLoading } = useQuery<Terminal[]>({
    queryKey: ["/api/cashfree/softpos/terminals"],
  });

  const createTerminalMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/cashfree/softpos/terminals", data);
    },
    onSuccess: () => {
      toast({ title: "Terminal registered", description: "SoftPOS terminal has been added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/softpos/terminals"] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to register terminal", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/cashfree/softpos/terminals/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Terminal updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/softpos/terminals"] });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTerminalId("");
    setTerminalName("");
    setTerminalPhone("");
    setMerchantId("");
    setDeviceInfo("");
  };

  const handleAddTerminal = () => {
    if (!terminalId.trim() || !terminalName.trim()) {
      toast({ title: "Required fields", description: "Terminal ID and name are required", variant: "destructive" });
      return;
    }
    createTerminalMutation.mutate({
      terminalId: terminalId.trim(),
      terminalName: terminalName.trim(),
      terminalPhone: terminalPhone.trim() || null,
      merchantId: merchantId.trim() || null,
      deviceInfo: deviceInfo.trim() || null,
    });
  };

  const activeCount = terminals.filter((t) => t.status === "ACTIVE").length;
  const inactiveCount = terminals.filter((t) => t.status === "INACTIVE").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SoftPOS Terminals</h1>
            <p className="text-muted-foreground">Manage Cashfree SoftPOS terminals for in-person card payments</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Terminal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{terminals.length}</p>
                <p className="text-sm text-muted-foreground">Total Terminals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registered Terminals</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading terminals...</div>
            ) : terminals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No terminals registered yet</p>
                <p className="text-sm mt-1">Register a SoftPOS terminal to start accepting card payments</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Device Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminals.map((terminal) => (
                    <TableRow key={terminal.id}>
                      <TableCell className="font-mono text-sm">{terminal.terminalId}</TableCell>
                      <TableCell>{terminal.terminalName || "-"}</TableCell>
                      <TableCell>{terminal.terminalPhone || "-"}</TableCell>
                      <TableCell>{terminal.merchantId || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{terminal.deviceInfo || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={terminal.status === "ACTIVE" ? "default" : "secondary"}>
                          {terminal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(terminal.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: terminal.id,
                              status: terminal.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                            })
                          }
                        >
                          {terminal.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Android Only</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Cashfree SoftPOS requires the Cashfree SoftPOS Android app installed on the terminal device.
                  Card payments via SoftPOS are only available on Android devices with NFC capability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register SoftPOS Terminal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Terminal ID *</Label>
                <Input
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  placeholder="e.g., TERM-001"
                />
              </div>
              <div>
                <Label>Terminal Name *</Label>
                <Input
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  placeholder="e.g., Salem Parlour Counter 1"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={terminalPhone}
                  onChange={(e) => setTerminalPhone(e.target.value)}
                  placeholder="Device phone number"
                />
              </div>
              <div>
                <Label>Merchant / Union ID</Label>
                <Input
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="e.g., merchant-3"
                />
              </div>
              <div>
                <Label>Device Info</Label>
                <Input
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  placeholder="e.g., Samsung Galaxy A54, Android 14"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddTerminal} disabled={createTerminalMutation.isPending}>
                {createTerminalMutation.isPending ? "Registering..." : "Register Terminal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
