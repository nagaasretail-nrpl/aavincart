import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, Route, Play, Users, BarChart3 } from "lucide-react";
import PendingDeliveriesPanel from "@/components/delivery/pending-deliveries-panel";
import TripPlanningWizard from "@/components/delivery/trip-planning-wizard";
import ActiveTripsPanel from "@/components/delivery/active-trips-panel";
import FleetVehiclesPanel from "@/components/delivery/fleet-vehicles-panel";
import DriversPanel from "@/components/delivery/drivers-panel";
import PerformancePanel from "@/components/delivery/performance-panel";

const TABS = [
  { value: "pending", label: "Pending Deliveries", icon: Package },
  { value: "trips", label: "Trip Planning", icon: Route },
  { value: "active", label: "Active Trips", icon: Play },
  { value: "fleet", label: "Fleet & Vehicles", icon: Truck },
  { value: "drivers", label: "Drivers", icon: Users },
  { value: "performance", label: "Performance", icon: BarChart3 },
];

export default function MerchantDelivery() {
  const { merchantId, user, staffSession } = useMerchantContext();
  const [location] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "pending";
  const [activeTab, setActiveTab] = useState(
    TABS.some(t => t.value === tabFromUrl) ? tabFromUrl : "pending"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.value === tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const isTransportManager = staffSession?.designation === "transport_manager";
  const isAdmin = user?.role === "admin" || user?.isGlobalAdmin === true;
  const canCreateTrips = isTransportManager || isAdmin;

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Delivery & Transport</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage deliveries, trips, fleet, and drivers
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          window.history.replaceState(null, '', `/merchant/delivery?tab=${val}`);
        }}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1">
                  <Icon className="h-3.5 w-3.5 hidden sm:inline" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="pending">
            <PendingDeliveriesPanel merchantId={merchantId} isAdmin={false} />
          </TabsContent>

          <TabsContent value="trips">
            <TripPlanningWizard
              merchantId={merchantId}
              isAdmin={false}
              canCreateTrips={canCreateTrips}
            />
          </TabsContent>

          <TabsContent value="active">
            <ActiveTripsPanel merchantId={merchantId} isAdmin={false} />
          </TabsContent>

          <TabsContent value="fleet">
            <FleetVehiclesPanel merchantId={merchantId} isAdmin={false} />
          </TabsContent>

          <TabsContent value="drivers">
            <DriversPanel merchantId={merchantId} isAdmin={false} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformancePanel merchantId={merchantId} isAdmin={false} isFederation={false} />
          </TabsContent>
        </Tabs>
      </div>
    </MerchantLayout>
  );
}
