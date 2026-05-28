import { lazy, Suspense } from "react";
import MerchantLayout from "./layout";

const DmsSalesReturns = lazy(() => import("@/pages/admin/dms-sales-returns"));

export default function MerchantSalesReturns() {
  return (
    <MerchantLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        }
      >
        <DmsSalesReturns skipLayout />
      </Suspense>
    </MerchantLayout>
  );
}
