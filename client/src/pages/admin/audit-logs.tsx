import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollText, ChevronDown, ChevronRight, ChevronLeft, Search, Filter, Calendar } from "lucide-react";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  changedFields: string[] | null;
  previousValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  changedByUserId: string | null;
  changedByName: string | null;
  changedByRole: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const TABLE_LABELS: Record<string, string> = {
  users: "Users",
  master_products: "Master Products",
  union_products: "Union Products",
  orders: "Orders",
  b2b_registrations: "B2B Registrations",
};

function DiffView({ log }: { log: AuditLog }) {
  const fields = log.changedFields || [];
  const prev = log.previousValues || {};
  const next = log.newValues || {};

  if (fields.length === 0 && Object.keys(prev).length === 0 && Object.keys(next).length === 0) {
    return <p className="text-sm text-muted-foreground italic">No detail recorded</p>;
  }

  const allKeys = [...new Set([...fields, ...Object.keys(prev), ...Object.keys(next)])];

  return (
    <div className="space-y-1">
      {allKeys.map((key) => (
        <div key={key} className="flex items-start gap-2 text-sm">
          <span className="font-medium min-w-[140px] text-muted-foreground">{key}:</span>
          {log.action === "DELETE" ? (
            <span className="text-red-600 dark:text-red-400 line-through">{formatValue(prev[key])}</span>
          ) : log.action === "CREATE" ? (
            <span className="text-green-600 dark:text-green-400">{formatValue(next[key])}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-red-600 dark:text-red-400 line-through">{formatValue(prev[key])}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-green-600 dark:text-green-400">{formatValue(next[key])}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLogsPage() {
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const limit = 25;

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (tableFilter) params.set("tableName", tableFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (searchUser) params.set("userId", searchUser);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/api/admin/audit-logs?${params.toString()}`;
  };

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["/api/admin/audit-logs", tableFilter, actionFilter, searchUser, startDate, endDate, page],
    queryFn: async () => {
      const res = await fetch(buildUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setTableFilter("");
    setActionFilter("");
    setSearchUser("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="h-6 w-6" /> Audit Log
            </h1>
            <p className="text-muted-foreground mt-1">Track all data changes across the system</p>
          </div>
          {data?.pagination && (
            <Badge variant="outline" className="text-sm">
              {data.pagination.total} total entries
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="master_products">Master Products</SelectItem>
                  <SelectItem value="union_products">Union Products</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="b2b_registrations">B2B Registrations</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name"
                  value={searchUser}
                  onChange={(e) => { setSearchUser(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Start date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="End date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
            ) : !data?.logs?.length ? (
              <div className="p-8 text-center text-muted-foreground">No audit log entries found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 w-8"></th>
                      <th className="text-left p-3">Timestamp</th>
                      <th className="text-left p-3">Table</th>
                      <th className="text-left p-3">Record</th>
                      <th className="text-left p-3">Action</th>
                      <th className="text-left p-3">Changed By</th>
                      <th className="text-left p-3">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <Fragment key={log.id}>
                        <tr
                          className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => toggleRow(log.id)}
                        >
                          <td className="p-3">
                            {expandedRows.has(log.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {TABLE_LABELS[log.tableName] || log.tableName}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs max-w-[120px] truncate" title={log.recordId}>
                            {log.recordId}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || ""}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-xs">
                              <div className="font-medium">{log.changedByName || "System"}</div>
                              <div className="text-muted-foreground">{log.changedByRole || ""}</div>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{log.ipAddress || "—"}</td>
                        </tr>
                        {expandedRows.has(log.id) && (
                          <tr className="bg-muted/10">
                            <td></td>
                            <td colSpan={6} className="p-4">
                              <div className="bg-background border rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">Changes Detail</h4>
                                <DiffView log={log} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
