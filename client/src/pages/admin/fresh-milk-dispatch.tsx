import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/pages/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Download, Save, Loader2 } from "lucide-react";

interface MilkRoute {
  id: string;
  routeName: string;
  routeCode?: string;
}

interface DispatchItem {
  milkType: string;
  qtyPackets: number;
  litres: string;
}

interface Dispatch {
  id?: string;
  routeId: string;
  unionId: string;
  dispatchDate: string;
  shift: string;
  arrivalTime: string;
  dispatchTime: string;
  leakAllowanceLtrs: number;
  items: DispatchItem[];
}

interface DispatchEntry {
  routeId: string;
  routeName: string;
  dispatchId?: string;
  arrivalTime: string;
  dispatchTime: string;
  std200: number;
  dlt500: number;
  fcm500: number;
  fcm1000: number;
  gm450: number;
  leakAllowance: number;
}

const MILK_TYPES = [
  { key: "std200", type: "STD200", factor: 0.2 },
  { key: "dlt500", type: "DLT500", factor: 0.5 },
  { key: "fcm500", type: "FCM500", factor: 0.5 },
  { key: "fcm1000", type: "FCM1000", factor: 1.0 },
  { key: "gm450", type: "GM450", factor: 0.45 },
] as const;

function calcTotalLtrs(entry: DispatchEntry): number {
  return (
    entry.std200 * 0.2 +
    entry.dlt500 * 0.5 +
    entry.fcm500 * 0.5 +
    entry.fcm1000 * 1.0 +
    entry.gm450 * 0.45
  );
}

export default function FreshMilkDispatchPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("Day");
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<DispatchEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const routesQuery = useQuery<MilkRoute[]>({
    queryKey: ["/api/fresh-milk/routes", { unionId: "UNI-SLM-01" }],
    queryFn: async () => {
      const res = await fetch("/api/fresh-milk/routes?unionId=UNI-SLM-01", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    },
    enabled: false,
  });

  const dispatchesQuery = useQuery<Dispatch[]>({
    queryKey: ["/api/fresh-milk/dispatches", { unionId: "UNI-SLM-01", date, shift }],
    queryFn: async () => {
      const res = await fetch(
        `/api/fresh-milk/dispatches?unionId=UNI-SLM-01&date=${date}&shift=${shift}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch dispatches");
      return res.json();
    },
    enabled: false,
  });

  const handleLoad = async () => {
    try {
      const [routesResult, dispatchesResult] = await Promise.all([
        routesQuery.refetch(),
        dispatchesQuery.refetch(),
      ]);

      const routes: MilkRoute[] = routesResult.data || [];
      const dispatches: Dispatch[] = dispatchesResult.data || [];

      const dispatchMap = new Map<string, Dispatch>();
      dispatches.forEach((d) => dispatchMap.set(d.routeId, d));

      const newEntries: DispatchEntry[] = routes.map((route) => {
        const existing = dispatchMap.get(route.id);
        if (existing) {
          const getPackets = (type: string) => {
            const item = existing.items?.find((i) => i.milkType === type);
            return item?.qtyPackets || 0;
          };
          return {
            routeId: route.id,
            routeName: route.routeName,
            dispatchId: existing.id,
            arrivalTime: existing.arrivalTime || "",
            dispatchTime: existing.dispatchTime || "",
            std200: getPackets("STD200"),
            dlt500: getPackets("DLT500"),
            fcm500: getPackets("FCM500"),
            fcm1000: getPackets("FCM1000"),
            gm450: getPackets("GM450"),
            leakAllowance: existing.leakAllowanceLtrs || 0,
          };
        }
        return {
          routeId: route.id,
          routeName: route.routeName,
          arrivalTime: "",
          dispatchTime: "",
          std200: 0,
          dlt500: 0,
          fcm500: 0,
          fcm1000: 0,
          gm450: 0,
          leakAllowance: 0,
        };
      });

      setEntries(newEntries);
      setLoaded(true);
    } catch {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    }
  };

  const updateEntry = (index: number, field: keyof DispatchEntry, value: string | number) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      let savedCount = 0;
      for (const entry of entries) {
        const hasData = entry.std200 > 0 || entry.dlt500 > 0 || entry.fcm500 > 0 || entry.fcm1000 > 0 || entry.gm450 > 0;
        if (!hasData && !entry.dispatchId) continue;

        const payload = {
          routeId: entry.routeId,
          unionId: "UNI-SLM-01",
          dispatchDate: date,
          shift,
          arrivalTime: entry.arrivalTime,
          dispatchTime: entry.dispatchTime,
          leakAllowanceLtrs: String(entry.leakAllowance),
          items: MILK_TYPES.map((mt) => ({
            milkType: mt.type,
            qtyPackets: entry[mt.key as keyof DispatchEntry] as number,
            litres: ((entry[mt.key as keyof DispatchEntry] as number) * mt.factor).toFixed(2),
          })),
        };

        if (entry.dispatchId) {
          await apiRequest("PUT", `/api/fresh-milk/dispatches/${entry.dispatchId}`, payload);
        } else {
          await apiRequest("POST", "/api/fresh-milk/dispatches", payload);
        }
        savedCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/fresh-milk/dispatches"] });
      toast({ title: "Success", description: `${savedCount} dispatch(es) saved successfully` });
      await handleLoad();
    } catch {
      toast({ title: "Error", description: "Failed to save dispatches", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const grandTotalLtrs = entries.reduce((sum, e) => sum + calcTotalLtrs(e), 0);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Fresh Milk Dispatch</h1>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Shift</label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLoad} disabled={routesQuery.isFetching || dispatchesQuery.isFetching}>
              {(routesQuery.isFetching || dispatchesQuery.isFetching) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Load
            </Button>
          </div>
        </Card>

        {loaded && (
          <Card className="p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead className="min-w-[140px]">Route Name</TableHead>
                  <TableHead className="w-28">Arr.Time</TableHead>
                  <TableHead className="w-28">Desp.Time</TableHead>
                  <TableHead className="w-20">STD 200</TableHead>
                  <TableHead className="w-20">DLT 500</TableHead>
                  <TableHead className="w-20">FCM 500</TableHead>
                  <TableHead className="w-24">FCM 1000</TableHead>
                  <TableHead className="w-20">G.M 450</TableHead>
                  <TableHead className="w-24">Leak All.</TableHead>
                  <TableHead className="w-24">Total Ltrs</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      No routes found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => {
                    const totalLtrs = calcTotalLtrs(entry);
                    return (
                      <TableRow key={entry.routeId}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{entry.routeName}</TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={entry.arrivalTime}
                            onChange={(e) => updateEntry(idx, "arrivalTime", e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={entry.dispatchTime}
                            onChange={(e) => updateEntry(idx, "dispatchTime", e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={entry.std200 || ""}
                            onChange={(e) => updateEntry(idx, "std200", parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={entry.dlt500 || ""}
                            onChange={(e) => updateEntry(idx, "dlt500", parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={entry.fcm500 || ""}
                            onChange={(e) => updateEntry(idx, "fcm500", parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={entry.fcm1000 || ""}
                            onChange={(e) => updateEntry(idx, "fcm1000", parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={entry.gm450 || ""}
                            onChange={(e) => updateEntry(idx, "gm450", parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={entry.leakAllowance || ""}
                            onChange={(e) => updateEntry(idx, "leakAllowance", parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{totalLtrs.toFixed(2)}</TableCell>
                        <TableCell>
                          {entry.dispatchId && (
                            <a
                              href={`/api/fresh-milk/trip-sheet/${entry.dispatchId}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon" title="Download Trip Sheet">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {entries.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4}>Grand Total</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.std200, 0)}</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.dlt500, 0)}</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.fcm500, 0)}</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.fcm1000, 0)}</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.gm450, 0)}</TableCell>
                    <TableCell>{entries.reduce((s, e) => s + e.leakAllowance, 0).toFixed(2)}</TableCell>
                    <TableCell>{grandTotalLtrs.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {entries.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveAll} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save All
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}