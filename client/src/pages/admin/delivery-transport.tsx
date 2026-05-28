import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingDeliveriesPanel from "@/components/delivery/pending-deliveries-panel";
import TripPlanningWizard from "@/components/delivery/trip-planning-wizard";
import ActiveTripsPanel from "@/components/delivery/active-trips-panel";
import FleetVehiclesPanel from "@/components/delivery/fleet-vehicles-panel";
import DriversPanel from "@/components/delivery/drivers-panel";
import PerformancePanel from "@/components/delivery/performance-panel";
import {
  Package, Route, Play, Truck, Users, BarChart3,
} from "lucide-react";

const TABS = [
  { value: "pending", label: "Pending Deliveries", icon: <Package className="h-4 w-4" /> },
  { value: "trips", label: "Trip Planning", icon: <Route className="h-4 w-4" /> },
  { value: "active", label: "Active Trips", icon: <Play className="h-4 w-4" /> },
  { value: "fleet", label: "Fleet & Vehicles", icon: <Truck className="h-4 w-4" /> },
  { value: "drivers", label: "Drivers", icon: <Users className="h-4 w-4" /> },
  { value: "performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> },
];

function getTabFromSearch(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") || "pending";
}

export default function AdminDeliveryTransport() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getTabFromSearch);

  const { data: authData } = useQuery<{ user?: { role?: string; merchantId?: string; designationId?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const user = authData?.user;
  const merchantId = user?.merchantId || "federation";
  const isFederation = user?.role === "admin";
  const isTransportManager = (user?.designationId || "").toLowerCase().includes("transport");
  const canCreateTrips = user?.role === "admin" || isTransportManager;

  useEffect(() => {
    const tab = getTabFromSearch();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `/admin/delivery?tab=${value}`;
    window.history.replaceState(null, "", newUrl);
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Delivery & Transport</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Unified delivery operations management
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full flex overflow-x-auto h-auto flex-wrap gap-1 bg-muted/50 p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <PendingDeliveriesPanel merchantId={merchantId} isAdmin={true} />
          </TabsContent>

          <TabsContent value="trips" className="mt-4">
            <TripPlanningWizard
              merchantId={merchantId}
              isAdmin={true}
              canCreateTrips={canCreateTrips}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <ActiveTripsPanel merchantId={merchantId} isAdmin={true} />
          </TabsContent>

          <TabsContent value="fleet" className="mt-4">
            <FleetVehiclesPanel merchantId={merchantId} isAdmin={true} />
          </TabsContent>

          <TabsContent value="drivers" className="mt-4">
            <DriversPanel merchantId={merchantId} isAdmin={true} />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <PerformancePanel
              merchantId={merchantId}
              isAdmin={true}
              isFederation={isFederation}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
