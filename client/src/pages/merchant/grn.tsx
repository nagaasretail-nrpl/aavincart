import { lazy, Suspense } from "react";
import MerchantLayout from "./layout";

const DmsGrn = lazy(() => import("@/pages/admin/dms-grn"));

export default function MerchantGrn() {
  return (
    <MerchantLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        }
      >
        <DmsGrn skipLayout />
      </Suspense>
    </MerchantLayout>
  );
}
