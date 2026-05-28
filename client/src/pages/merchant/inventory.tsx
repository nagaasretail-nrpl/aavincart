import { lazy, Suspense } from "react";
import MerchantLayout from "./layout";

const DMSInventory = lazy(() => import("@/pages/admin/dms-inventory"));

export default function MerchantInventory() {
  return (
    <MerchantLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        }
      >
        <DMSInventory skipLayout />
      </Suspense>
    </MerchantLayout>
  );
}
