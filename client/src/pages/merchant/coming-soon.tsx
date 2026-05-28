import MerchantLayout from "./layout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useLocation } from "wouter";

export default function MerchantComingSoon() {
  const [location] = useLocation();
  const pageName = location
    .replace("/merchant/", "")
    .replace(/\//g, " > ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <MerchantLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-16 w-16 text-purple-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">{pageName}</h2>
            <p className="text-muted-foreground">
              This section is being migrated to the new dashboard architecture. It will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
