import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/pages/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Printer, Download, Loader2 } from "lucide-react";

interface RouteData {
  sNo: number;
  routeName: string;
  arrivalTime: string;
  dispatchTime: string;
  std200: number;
  dlt500: number;
  fcm500: number;
  fcm1000: number;
  gm450: number;
  noOfTubs: number;
  totalLtrs: number;
  leakAll: number;
}

interface AreaGroup {
  areaName: string;
  routes: RouteData[];
}

interface DMRReport {
  date: string;
  shift: string;
  unionId: string;
  areaGroups: AreaGroup[];
  returns: any;
}

export default function FreshMilkDMR() {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState("Day");
  const [queryParams, setQueryParams] = useState<{ date: string; shift: string } | null>(null);

  const { data: report, isLoading, isError, error } = useQuery<DMRReport>({
    queryKey: ["/api/fresh-milk/dmr-report", queryParams?.date, queryParams?.shift],
    queryFn: async () => {
      const res = await fetch(
        `/api/fresh-milk/dmr-report?date=${queryParams!.date}&shift=${queryParams!.shift}&unionId=UNI-SLM-01`
      );
      if (!res.ok) throw new Error("Failed to fetch DMR report");
      return res.json();
    },
    enabled: !!queryParams,
  });

  if (isError) {
    toast({
      title: "Error",
      description: (error as Error)?.message || "Failed to load DMR report",
      variant: "destructive",
    });
  }

  const handleLoadReport = () => {
    if (!date) {
      toast({ title: "Select Date", description: "Please select a date to load the report", variant: "destructive" });
      return;
    }
    setQueryParams({ date, shift });
  };

  const handleDownloadPDF = () => {
    if (!queryParams) return;
    window.open(
      `/api/fresh-milk/dmr-report/pdf?date=${queryParams.date}&shift=${queryParams.shift}&unionId=UNI-SLM-01`,
      "_blank"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const computeAreaTotals = (routes: RouteData[]) => {
    return routes.reduce(
      (acc, r) => ({
        std200: acc.std200 + (r.std200 || 0),
        dlt500: acc.dlt500 + (r.dlt500 || 0),
        fcm500: acc.fcm500 + (r.fcm500 || 0),
        fcm1000: acc.fcm1000 + (r.fcm1000 || 0),
        gm450: acc.gm450 + (r.gm450 || 0),
        noOfTubs: acc.noOfTubs + (r.noOfTubs || 0),
        totalLtrs: acc.totalLtrs + (r.totalLtrs || 0),
        leakAll: acc.leakAll + (r.leakAll || 0),
      }),
      { std200: 0, dlt500: 0, fcm500: 0, fcm1000: 0, gm450: 0, noOfTubs: 0, totalLtrs: 0, leakAll: 0 }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">DMR Report</h1>
          </div>
          {queryParams && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Shift</label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleLoadReport} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Load Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {queryParams && !isLoading && (!report || !report.areaGroups || report.areaGroups.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No dispatch data found for selected date and shift
            </CardContent>
          </Card>
        )}

        {report && report.areaGroups && report.areaGroups.length > 0 && (
          <div className="space-y-6 print:space-y-4" id="dmr-report-content">
            <div className="text-center space-y-1 print:mb-4">
              <h2 className="text-lg font-bold uppercase">
                THE SALEM DISTRICT CO-OPERATIVE MILK PRODUCERS UNION LTD., SALEM
              </h2>
              <p className="text-base font-semibold">
                QUANTITY OF MILK DESPATCHED DETAILS {report.date} {report.shift}
              </p>
              <Badge variant="secondary" className="print:hidden">
                Union: {report.unionId}
              </Badge>
            </div>

            {report.areaGroups.map((group) => {
              const totals = computeAreaTotals(group.routes);
              return (
                <Card key={group.areaName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold">{group.areaName}</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">S.No</TableHead>
                          <TableHead>Route Name</TableHead>
                          <TableHead>Arr.Time</TableHead>
                          <TableHead>Desp.Time</TableHead>
                          <TableHead className="text-right">STD 200</TableHead>
                          <TableHead className="text-right">DLT 500</TableHead>
                          <TableHead className="text-right">FCM 500</TableHead>
                          <TableHead className="text-right">FCM 1000</TableHead>
                          <TableHead className="text-right">G.M 450</TableHead>
                          <TableHead className="text-right">No.of Tubs</TableHead>
                          <TableHead className="text-right">Total Ltrs</TableHead>
                          <TableHead className="text-right">Leak All.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.routes.map((route) => (
                          <TableRow key={route.sNo}>
                            <TableCell>{route.sNo}</TableCell>
                            <TableCell>{route.routeName}</TableCell>
                            <TableCell>{route.arrivalTime}</TableCell>
                            <TableCell>{route.dispatchTime}</TableCell>
                            <TableCell className="text-right">{route.std200 || 0}</TableCell>
                            <TableCell className="text-right">{route.dlt500 || 0}</TableCell>
                            <TableCell className="text-right">{route.fcm500 || 0}</TableCell>
                            <TableCell className="text-right">{route.fcm1000 || 0}</TableCell>
                            <TableCell className="text-right">{route.gm450 || 0}</TableCell>
                            <TableCell className="text-right">{route.noOfTubs || 0}</TableCell>
                            <TableCell className="text-right">{route.totalLtrs || 0}</TableCell>
                            <TableCell className="text-right">{route.leakAll || 0}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={4} className="text-right font-bold">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold">{totals.std200}</TableCell>
                          <TableCell className="text-right font-bold">{totals.dlt500}</TableCell>
                          <TableCell className="text-right font-bold">{totals.fcm500}</TableCell>
                          <TableCell className="text-right font-bold">{totals.fcm1000}</TableCell>
                          <TableCell className="text-right font-bold">{totals.gm450}</TableCell>
                          <TableCell className="text-right font-bold">{totals.noOfTubs}</TableCell>
                          <TableCell className="text-right font-bold">{totals.totalLtrs}</TableCell>
                          <TableCell className="text-right font-bold">{totals.leakAll}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}