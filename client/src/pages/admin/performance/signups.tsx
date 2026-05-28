import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Search, UserPlus } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "../layout";
import { buildXlsxBuffer } from "@/lib/excel-utils";

interface SignupUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  unionId: string | null;
  districtUnion: string | null;
  businessType: string | null;
  createdAt: string;
}

const RANGE_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Last 7 Days",
  month: "Last 30 Days",
};

export default function NewSignups() {
  const params = new URLSearchParams(window.location.search);
  const initialRange = params.get("range") || "today";
  const [range, setRange] = useState(initialRange);
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery<SignupUser[]>({
    queryKey: [`/api/admin/user-metrics/signups?range=${range}&search=${encodeURIComponent(search)}`],
  });

  async function handleExport() {
    if (!users || users.length === 0) return;
    try {
      const headers = ["User ID", "Created Time", "Phone/Email", "Role", "Union", "Business Type"];
      const rows = users.map((u) => [
        u.id,
        u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN") : "",
        u.phone || u.email || "",
        u.role || "",
        u.districtUnion || u.unionId || "",
        u.businessType || "",
      ]);
      const buf = await buildXlsxBuffer([{ name: "New Signups", rows: [headers, ...rows] }]);
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `New_Signups_${range}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Sign-ups</h1>
                <p className="text-xs text-gray-500">{RANGE_LABELS[range] || range} - {users?.length || 0} users</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!users || users.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, phone, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">User ID</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Created Time</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Phone / Email</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Union / Role</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Business Type</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                      </tr>
                    ))
                  ) : users && users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-3 font-mono text-xs text-gray-500">{u.id.slice(0, 8)}...</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {u.phone && <div>{u.phone}</div>}
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {u.districtUnion && <span className="text-xs text-gray-500">{u.districtUnion}</span>}
                            <Badge variant="secondary" className="w-fit text-xs">{u.role}</Badge>
                          </div>
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {u.businessType || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No new sign-ups found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
