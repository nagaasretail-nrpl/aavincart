import { useLocation } from "wouter";
import { Package, FileText, RefreshCw, Wallet, Tag, MapPin, Truck, Database, ScrollText, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AdminLayout from "./layout";

const modules = [
  { id: "inventory", label: "Inventory & Batches", icon: Package, route: "/admin/dms-inventory", desc: "Manage stock batches and inventory levels" },
  { id: "grn", label: "Goods Receipt Notes", icon: FileText, route: "/admin/dms-grn", desc: "Track incoming goods and receipts" },
  { id: "sales-returns", label: "Sales Returns", icon: RefreshCw, route: "/admin/dms-sales-returns", desc: "Process returns and credit notes" },
  { id: "collections", label: "Collections & Outstanding", icon: Wallet, route: "/admin/dms-collections", desc: "Track payments and outstanding dues" },
  { id: "schemes", label: "Schemes & Promotions", icon: Tag, route: "/admin/dms-schemes", desc: "Create and manage distribution schemes" },
  { id: "sfa", label: "Sales Force Automation", icon: MapPin, route: "/admin/dms-sfa", desc: "Staff attendance, visits and beat plans" },
  { id: "vehicles", label: "Transport Master", icon: Truck, route: "/admin/dms-vehicles", desc: "Vehicle and driver master data" },
  { id: "transport", label: "Trip Planning & Delivery", icon: Navigation, route: "/admin/dms-transport", desc: "Plan routes, assign vehicles, track deliveries" },
  { id: "tally", label: "Tally Integration", icon: Database, route: "/admin/dms-tally", desc: "Import/export with Tally accounting" },
  { id: "gstr", label: "GSTR Returns", icon: ScrollText, route: "/admin/dms-gstr", desc: "Generate GST return data for filing" },
];

export default function AdminDMS() {
  const [, setLocation] = useLocation();

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribution Management System</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage inventory, procurement, sales, logistics, and compliance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(mod.route)}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{mod.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </AdminLayout>
  );
}
