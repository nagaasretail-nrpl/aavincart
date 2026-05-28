import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/pages/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck } from "lucide-react";

interface FreshMilkVehicle {
  vehicleId: string;
  vehicleNo: string;
  routeId: string;
  routeName: string;
  areaGroup: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  segment: string;
}

function VehicleTable({ vehicles }: { vehicles: FreshMilkVehicle[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">S.No</TableHead>
          <TableHead>Vehicle No</TableHead>
          <TableHead>Route Name</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Driver Name</TableHead>
          <TableHead>Driver Phone</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Segment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              No vehicles found
            </TableCell>
          </TableRow>
        ) : (
          vehicles.map((v, idx) => (
            <TableRow key={v.vehicleId}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="font-medium">{v.vehicleNo}</TableCell>
              <TableCell>{v.routeName}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  v.areaGroup === "Salem"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : v.areaGroup === "Namakkal"
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : ""
                }>
                  {v.areaGroup}
                </Badge>
              </TableCell>
              <TableCell>{v.driverName}</TableCell>
              <TableCell>{v.driverPhone}</TableCell>
              <TableCell>{v.capacity}</TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">
                  {v.segment}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default function FreshMilkVehiclesPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: vehicles = [], isLoading } = useQuery<FreshMilkVehicle[]>({
    queryKey: ["/api/fresh-milk/vehicles", "?unionId=UNI-SLM-01"],
  });

  const filtered = activeTab === "all"
    ? vehicles
    : vehicles.filter(v => v.areaGroup.toLowerCase() === activeTab);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Fresh Milk Vehicles & Drivers</h1>
          <Badge variant="secondary" className="ml-2">{filtered.length} vehicles</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="salem">Salem</TabsTrigger>
            <TabsTrigger value="namakkal">Namakkal</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {activeTab === "all" ? "All Vehicles" : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Vehicles`}
                  {" "}({filtered.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
                ) : (
                  <VehicleTable vehicles={filtered} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
