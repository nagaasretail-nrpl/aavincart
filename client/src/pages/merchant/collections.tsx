import { lazy, Suspense } from "react";
import MerchantLayout from "./layout";

const DmsCollections = lazy(() => import("@/pages/admin/dms-collections"));

export default function MerchantCollections() {
  return (
    <MerchantLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        }
      >
        <DmsCollections skipLayout />
      </Suspense>
    </MerchantLayout>
  );
}
