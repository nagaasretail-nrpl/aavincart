import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, CheckCircle, Clock, RefreshCw, Calendar } from "lucide-react";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export default function GstReturnsPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [gstin, setGstin] = useState("");

  const { data: gstReturns, isLoading } = useQuery<any[]>({
    queryKey: ["/api/gst-returns"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { month: number; year: number; gstin: string }) => {
      const res = await apiRequest("POST", "/api/gst-returns/generate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-returns"] });
      toast({
        title: "GST Return Generated",
        description: "Your GST return has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate GST return",
        variant: "destructive",
      });
    },
  });

  const markFiledMutation = useMutation({
    mutationFn: async ({ id, fileReference }: { id: string; fileReference: string }) => {
      const res = await apiRequest("POST", `/api/gst-returns/${id}/mark-filed`, { fileReference });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-returns"] });
      toast({
        title: "Marked as Filed",
        description: "GST return has been marked as filed.",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      gstin,
    });
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/gst-returns/${id}/download`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "GSTR1.json";
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your GSTR-1 JSON file is downloading.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download GST return file.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Filed</Badge>;
      case "generated":
        return <Badge className="bg-blue-500"><FileText className="w-3 h-3 mr-1" />Generated</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
    }
  };

  const getMonthName = (month: number) => {
    return months.find(m => m.value === String(month))?.label || "";
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">GST Returns</h1>
          <p className="text-muted-foreground">
            Generate monthly GSTR-1 files for GST portal upload
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Generate New Return
          </CardTitle>
          <CardDescription>
            Select month and year to generate GST return from your orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>GSTIN (Optional)</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate GSTR-1
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your GST Returns</CardTitle>
          <CardDescription>
            View and download your generated GST returns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !gstReturns || gstReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No GST returns generated yet.</p>
              <p className="text-sm">Select a month and year above to generate your first return.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Taxable Value</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>Total Tax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gstReturns.map((gstReturn: any) => (
                  <TableRow key={gstReturn.id}>
                    <TableCell className="font-medium">
                      {getMonthName(gstReturn.period_month || gstReturn.periodMonth)} {gstReturn.period_year || gstReturn.periodYear}
                    </TableCell>
                    <TableCell>{gstReturn.return_type || gstReturn.returnType || "GSTR1"}</TableCell>
                    <TableCell>{gstReturn.total_invoices || gstReturn.totalInvoices || 0}</TableCell>
                    <TableCell>{formatCurrency(gstReturn.total_taxable_value || gstReturn.totalTaxableValue || 0)}</TableCell>
                    <TableCell>{formatCurrency(gstReturn.total_cgst || gstReturn.totalCgst || 0)}</TableCell>
                    <TableCell>{formatCurrency(gstReturn.total_sgst || gstReturn.totalSgst || 0)}</TableCell>
                    <TableCell>{formatCurrency(gstReturn.total_tax || gstReturn.totalTax || 0)}</TableCell>
                    <TableCell>{getStatusBadge(gstReturn.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(gstReturn.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          JSON
                        </Button>
                        {gstReturn.status !== "filed" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const ref = prompt("Enter filing reference number (ARN):");
                              if (ref) {
                                markFiledMutation.mutate({ id: gstReturn.id, fileReference: ref });
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Filed
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to File on GST Portal</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Download the GSTR-1 JSON file using the button above</li>
            <li>Login to <a href="https://gst.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">gst.gov.in</a></li>
            <li>Go to Returns Dashboard → GSTR-1</li>
            <li>Click on "Prepare Offline" and select "Upload"</li>
            <li>Upload the downloaded JSON file</li>
            <li>Review and submit your return</li>
            <li>After successful filing, enter the ARN number here to mark as filed</li>
          </ol>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
