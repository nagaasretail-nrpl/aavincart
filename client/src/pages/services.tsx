import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Milk, Package, Star, ChevronRight, Clock, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isB2BUser, isEmployeeUser } from "@/lib/role-utils";

type ServiceCard = {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  href?: string;
  badge?: string;
};

const CONSUMER_SERVICES: ServiceCard[] = [
  {
    icon: Star,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Subscription",
    description: "Set up a daily or weekly home delivery schedule for fresh milk and dairy products.",
    badge: "Coming Soon",
  },
  {
    icon: Package,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Bulk Order",
    description: "Place large orders for events, institutions, or resale at special prices.",
    badge: "Coming Soon",
  },
];

const EMPLOYEE_SERVICES: ServiceCard[] = [
  {
    icon: Milk,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    title: "Free Milk Request",
    description: "Submit and track your monthly free milk entitlement as an AAVIN employee.",
    href: "/free-milk-request",
  },
  {
    icon: Star,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Subscription",
    description: "Set up a recurring home delivery schedule for fresh milk and dairy products.",
    badge: "Coming Soon",
  },
];

function ServiceCardItem({ svc }: { svc: ServiceCard }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="flex items-start gap-4 p-4">
        <div className={`rounded-xl p-3 shrink-0 ${svc.iconBg}`}>
          <svc.icon className={`h-6 w-6 ${svc.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{svc.title}</span>
            {svc.badge && (
              <Badge variant="secondary" className="text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {svc.badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-snug">{svc.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </CardContent>
    </Card>
  );

  if (svc.href) {
    return <Link href={svc.href}>{content}</Link>;
  }
  return content;
}

function B2BServicesView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-full bg-muted p-5 mb-4">
        <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Your Services Are in the Dashboard</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        As a business account holder, your orders, ledger, and account tools are accessible from your dashboard.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}

export default function ServicesPage() {
  const { user } = useAuth();
  const isB2B = isB2BUser(user);
  const isEmployee = isEmployeeUser(user);

  const services = isEmployee ? EMPLOYEE_SERVICES : CONSUMER_SERVICES;
  const heading = isEmployee ? "Employee Services" : "Services";
  const subtitle = isEmployee
    ? "Access your AAVIN employee benefits and milk entitlements."
    : "Explore subscription plans, bulk orders, and more from AAVIN.";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground px-4 pt-14 pb-6">
        <h1 className="text-2xl font-bold">{isB2B ? "Services" : heading}</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">
          {isB2B ? "Manage your business account and orders." : subtitle}
        </p>
      </div>

      {isB2B ? (
        <B2BServicesView />
      ) : (
        <div className="px-4 py-5 space-y-3 max-w-lg mx-auto">
          {services.map((svc) => (
            <ServiceCardItem key={svc.title} svc={svc} />
          ))}
        </div>
      )}
    </div>
  );
}
