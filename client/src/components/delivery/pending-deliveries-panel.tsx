import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search, Filter, AlertTriangle, Clock, MapPin, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface PendingDeliveriesPanelProps {
  merchantId?: string;
  isAdmin?: boolean;
}

const SEGMENT_OPTIONS = [
  { value: "all", label: "All Segments" },
  { value: "Fresh Milk", label: "Fresh Milk" },
  { value: "Products", label: "Products" },
  { value: "Ice Cream", label: "Ice Cream" },
];

const SOURCE_TYPE_COLORS: Record<string, string> = {
  order: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bulk_invoice: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  inter_union: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  b2b: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  order: "B2C",
  bulk_invoice: "Bulk",
  inter_union: "Inter-Union",
  b2b: "B2B",
};

const STATUS_COLORS: Record<string, string> = {
  pending_validation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ready_for_trip: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  validation_failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending_validation: "Pending Validation",
  ready_for_trip: "Ready for Trip",
  validation_failed: "Validation Failed",
};

export default function PendingDeliveriesPanel({ merchantId, isAdmin }: PendingDeliveriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");

  const effectiveMerchantId = isAdmin ? "federation" : (merchantId || "federation");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs", effectiveMerchantId, "pending"],
    queryFn: async () => {
      const params = new URLSearchParams();
      const statuses = ["pending_validation", "ready_for_trip", "validation_failed"];
      const results: any[] = [];
      for (const status of statuses) {
        params.set("status", status);
        const res = await fetch(`/api/delivery-jobs/${effectiveMerchantId}?status=${status}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          results.push(...data);
        }
      }
      return results;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/delivery-jobs/stats", effectiveMerchantId],
    queryFn: async () => {
      const res = await fetch(`/api/delivery-jobs/stats/${effectiveMerchantId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const filteredJobs = jobs.filter((job: any) => {
    if (segmentFilter !== "all" && job.segment !== segmentFilter) return false;
    if (sourceTypeFilter !== "all" && job.sourceType !== sourceTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesJobId = job.jobId?.toLowerCase().includes(q);
      const matchesCustomer = job.customerName?.toLowerCase().includes(q);
      const matchesAddress = job.deliveryAddress?.toLowerCase().includes(q);
      const matchesPhone = job.customerPhone?.includes(q);
      if (!matchesJobId && !matchesCustomer && !matchesAddress && !matchesPhone) return false;
    }
    return true;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs", effectiveMerchantId, "pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs/stats", effectiveMerchantId] });
  };

  if (jobsLoading || statsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Validation</p>
                <p className="text-2xl font-bold">{stats?.pendingValidation || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready for Trip</p>
                <p className="text-2xl font-bold">{stats?.readyForTrip || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validation Failed</p>
                <p className="text-2xl font-bold">{stats?.validationFailed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">{(stats?.pendingValidation || 0) + (stats?.readyForTrip || 0) + (stats?.validationFailed || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Pending Delivery Jobs</CardTitle>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Job ID, customer, address, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Source Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="order">B2C</SelectItem>
                <SelectItem value="bulk_invoice">Bulk</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="inter_union">Inter-Union</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No pending delivery jobs</p>
              <p className="text-sm mt-1">All delivery jobs have been assigned or there are no new orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Customer / Destination</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">{job.jobId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SOURCE_TYPE_COLORS[job.sourceType] || ""}>
                          {SOURCE_TYPE_LABELS[job.sourceType] || job.sourceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{job.segment || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{job.customerName || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.deliveryAddress || "No address"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{job.totalBags || 0}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(job.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{job.deliveryTimeWindow || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[job.status] || ""}>
                          {STATUS_LABELS[job.status] || job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} pending jobs
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
