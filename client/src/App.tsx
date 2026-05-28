import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LocationProvider } from "@/lib/location-context";
import { lazy, Suspense, Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CartSidebar from "@/components/cart-sidebar";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import PwaInstallPrompt from "@/components/pwa-install-prompt";

const Home = lazy(() => import("@/pages/home"));
const Unions = lazy(() => import("@/pages/unions"));
const UnionDetail = lazy(() => import("@/pages/union-detail"));
const Orders = lazy(() => import("@/pages/orders"));
const Services = lazy(() => import("@/pages/services"));
const FreeMilkRequest = lazy(() => import("@/pages/free-milk-request"));
const RestaurantDashboard = lazy(() => import("@/pages/restaurant-dashboard"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Profile = lazy(() => import("@/pages/profile"));
const NotFound = lazy(() => import("@/pages/not-found"));

const Register = lazy(() => import("@/pages/register"));
const UnifiedLogin = lazy(() => import("@/pages/unified-login"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Signup = lazy(() => import("@/pages/signup"));
const MerchantRegister = lazy(() => import("@/pages/merchant-register"));
const B2BRegister = lazy(() => import("@/pages/b2b-register"));
const MerchantSignup = lazy(() => import("@/pages/merchant-signup"));
const DeliverySignup = lazy(() => import("@/pages/delivery-signup"));

const About = lazy(() => import("@/pages/about"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Careers = lazy(() => import("@/pages/careers"));
const Support = lazy(() => import("@/pages/support"));
const MobileApp = lazy(() => import("@/pages/mobile-app"));
const OrderInvoice = lazy(() => import("@/pages/order-invoice"));

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminAppPerformance = lazy(() => import("@/pages/admin/app-performance"));
const AdminStaffDashboard = lazy(() => import("@/pages/admin/staff-dashboard"));
const AdminSegmentStaff = lazy(() => import("@/pages/admin/segment-staff"));
const AdminProductionDashboard = lazy(() => import("@/pages/admin/production-dashboard"));
const AdminInventoryManagement = lazy(() => import("@/pages/admin/inventory-management"));
const AdminDMS = lazy(() => import("@/pages/admin/dms"));
const AdminDMSInventory = lazy(() => import("@/pages/admin/dms-inventory"));
const AdminDMSGrn = lazy(() => import("@/pages/admin/dms-grn"));
const AdminDMSSalesReturns = lazy(() => import("@/pages/admin/dms-sales-returns"));
const AdminDMSCollections = lazy(() => import("@/pages/admin/dms-collections"));
const AdminDMSSchemes = lazy(() => import("@/pages/admin/dms-schemes"));
const AdminDMSSfa = lazy(() => import("@/pages/admin/dms-sfa"));
const AdminDMSVehicles = lazy(() => import("@/pages/admin/dms-vehicles"));
const AdminDMSTally = lazy(() => import("@/pages/admin/dms-tally"));
const AdminDMSGstr = lazy(() => import("@/pages/admin/dms-gstr"));
const AdminBulkInvoices = lazy(() => import("@/pages/admin/bulk-invoices"));
const AdminPaymentLinks = lazy(() => import("@/pages/admin/payment-links"));
const AdminDeliveryConfig = lazy(() => import("@/pages/admin/delivery-config"));
const POSDashboard = lazy(() => import("@/pages/pos/dashboard"));
const AdminMasterCatalog = lazy(() => import("@/pages/admin/master-catalog"));
const AdminMerchant = lazy(() => import("@/pages/admin/merchant"));
const AdminMerchantNewSignup = lazy(() => import("@/pages/admin/merchant-new-signup"));
const AdminMerchantSponsored = lazy(() => import("@/pages/admin/merchant-sponsored"));
const AdminMerchantAdd = lazy(() => import("@/pages/admin/merchant-add"));
const AdminSiteConfiguration = lazy(() => import("@/pages/admin/site-configuration"));
const AdminAutomatedStatusUpdates = lazy(() => import("@/pages/admin/site-configuration/automated-status-updates"));
const AdminMerchantRegistration = lazy(() => import("@/pages/admin/site-configuration/merchant-registration"));
const AdminSiteNotifications = lazy(() => import("@/pages/admin/site-configuration/notifications"));
const AdminContactSettings = lazy(() => import("@/pages/admin/site-configuration/contact-settings"));
const AdminAnalytics = lazy(() => import("@/pages/admin/site-configuration/analytics"));
const AdminApiAccess = lazy(() => import("@/pages/admin/site-configuration/api-access"));
const AdminPushNotifications = lazy(() => import("@/pages/admin/site-configuration/push-notifications"));
const AdminGdprCookieConsent = lazy(() => import("@/pages/admin/site-configuration/gdpr-cookie-consent"));
const AdminOthers = lazy(() => import("@/pages/admin/site-configuration/others"));
const AdminMembership = lazy(() => import("@/pages/admin/membership"));
const AdminMembershipPlans = lazy(() => import("@/pages/admin/membership-plans"));
const AdminMembershipSubscribers = lazy(() => import("@/pages/admin/membership-subscribers"));
const AdminMembershipDeposits = lazy(() => import("@/pages/admin/membership-deposits"));
const MerchantSubUsers = lazy(() => import("@/pages/merchant/sub-users"));
const MerchantLayout = lazy(() => import("@/pages/merchant/layout"));
const MerchantOverview = lazy(() => import("@/pages/merchant/overview"));
const MerchantOrders = lazy(() => import("@/pages/merchant/orders"));
const MerchantProducts = lazy(() => import("@/pages/merchant/products"));
const MerchantInventory = lazy(() => import("@/pages/merchant/inventory"));
const MerchantGrn = lazy(() => import("@/pages/merchant/grn"));
const MerchantSalesReturns = lazy(() => import("@/pages/merchant/sales-returns"));
const MerchantCollections = lazy(() => import("@/pages/merchant/collections"));
const MerchantInvoices = lazy(() => import("@/pages/merchant/invoices"));
const MerchantStaff = lazy(() => import("@/pages/merchant/staff"));
const MerchantUnionInfo = lazy(() => import("@/pages/merchant/union-info"));
const MerchantDelivery = lazy(() => import("@/pages/merchant/delivery"));
const MerchantDeliveryTrips = lazy(() => import("@/pages/merchant/delivery-trips"));
const MerchantDeliveryTracking = lazy(() => import("@/pages/merchant/delivery-tracking"));
const MerchantDeliveryVehicles = lazy(() => import("@/pages/merchant/delivery-vehicles"));
const MerchantPOS = lazy(() => import("@/pages/merchant/pos"));
const MerchantTransportTeam = lazy(() => import("@/pages/merchant/transport-team"));
const MerchantB2BUsers = lazy(() => import("@/pages/merchant/b2b-users"));
const MerchantComingSoon = lazy(() => import("@/pages/merchant/coming-soon"));
const MerchantReports = lazy(() => import("@/pages/merchant/reports"));
const MilkDispatchReport = lazy(() => import("@/pages/merchant/milk-dispatch-report"));
const SegmentDispatchReport = lazy(() => import("@/pages/merchant/segment-dispatch-report"));
const MerchantUnionSettings = lazy(() => import("@/pages/merchant/union-settings"));
const MerchantBanner = lazy(() => import("@/pages/merchant/banner"));
const MerchantB2BRegistrations = lazy(() => import("@/pages/merchant/b2b-registrations"));
const MerchantUsers = lazy(() => import("@/pages/merchant/users"));
const MerchantB2CUsers = lazy(() => import("@/pages/merchant/b2c-users"));
const MerchantOrderDetails = lazy(() => import("@/pages/merchant/order-details"));
const MmoOfficesPage = lazy(() => import("@/pages/merchant/mmo-offices"));
const MmoRoutesPage = lazy(() => import("@/pages/merchant/mmo-routes"));
const HeadOfficePage = lazy(() => import("@/pages/merchant/head-office"));
const MerchantFreeMilkRequests = lazy(() => import("@/pages/merchant/free-milk-requests"));

const UnionSubUsers = lazy(() => import("@/pages/union/sub-users"));
const SegmentManagerDashboard = lazy(() => import("@/pages/union/segment-manager"));
const UnionB2BApprovals = lazy(() => import("@/pages/union/b2b-approvals"));
const AdminMerchantEdit = lazy(() => import("@/pages/admin/merchant-edit"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminOrderDetails = lazy(() => import("@/pages/admin/order-details"));
const AdminOrderSettings = lazy(() => import("@/pages/admin/order-settings"));
const AdminOrderWorkflow = lazy(() => import("@/pages/admin/order-workflow"));
const AdminPaymentGateway = lazy(() => import("@/pages/admin/payment-gateway"));
const AdminPaymentGatewayEdit = lazy(() => import("@/pages/admin/payment-gateway-edit"));
const AdminPaymentGatewayTransactions = lazy(() => import("@/pages/admin/payment-gateway-transactions"));
const AdminPaymentGatewayMethods = lazy(() => import("@/pages/admin/payment-gateway-methods"));
const AdminPaymentGatewayWebhooks = lazy(() => import("@/pages/admin/payment-gateway-webhooks"));
const AdminPaymentGatewayReports = lazy(() => import("@/pages/admin/payment-gateway-reports"));
const AdminPaymentGatewayApiSettings = lazy(() => import("@/pages/admin/payment-gateway-api-settings"));
const AdminPayOnDelivery = lazy(() => import("@/pages/admin/pay-on-delivery"));
const AdminPayouts = lazy(() => import("@/pages/admin/payouts"));
const AdminSoftPOSTerminals = lazy(() => import("@/pages/admin/softpos-terminals"));
const AdminEasySplit = lazy(() => import("@/pages/admin/easy-split"));
const AdminAccount = lazy(() => import("@/pages/admin/account"));
const AdminAccountTransactions = lazy(() => import("@/pages/admin/account-transactions"));
const AdminSubUsers = lazy(() => import("@/pages/admin/sub-users"));
const AdminEarnings = lazy(() => import("@/pages/admin/earnings"));
const AdminMerchantEarnings = lazy(() => import("@/pages/admin/merchant-earnings"));
const AdminWithdrawals = lazy(() => import("@/pages/admin/withdrawals"));
const AdminInvoice = lazy(() => import("@/pages/admin/invoice"));
const AdminTableReservation = lazy(() => import("@/pages/admin/table-reservation"));
const AdminAttributes = lazy(() => import("@/pages/admin/attributes"));
const AdminPromo = lazy(() => import("@/pages/admin/promo"));
const AdminNotifications = lazy(() => import("@/pages/admin/notifications"));
const AdminMarketing = lazy(() => import("@/pages/admin/marketing"));
const AdminBuyers = lazy(() => import("@/pages/admin/buyers"));
const AdminAgents = lazy(() => import("@/pages/admin/agents"));
const AdminThirdPartyApp = lazy(() => import("@/pages/admin/third-party-app"));
const AdminGoogleMaps = lazy(() => import("@/pages/admin/google-maps"));
const AdminApiSettings = lazy(() => import("@/pages/admin/api-settings"));
const AdminSMS = lazy(() => import("@/pages/admin/sms"));
const AdminDeliveryManagement = lazy(() => import("@/pages/admin/delivery-management"));
const AdminStaffManagement = lazy(() => import("@/pages/admin/staff-management"));
const AdminSalesAnalytics = lazy(() => import("@/pages/admin/sales-analytics"));
const AdminB2BDashboard = lazy(() => import("@/pages/admin/b2b-dashboard"));
const AdminB2BUsersMap = lazy(() => import("@/pages/admin/b2b-users-map"));
const AdminAddressProofs = lazy(() => import("@/pages/admin/address-proofs"));
const AdminDriverTracking = lazy(() => import("@/pages/admin/driver-tracking"));
const AdminLoyaltyPoints = lazy(() => import("@/pages/admin/loyalty-points"));
const AdminTablesideOrdering = lazy(() => import("@/pages/admin/tableside-ordering"));
const AdminProductionApp = lazy(() => import("@/pages/admin/production-app"));
const AdminProductionManagement = lazy(() => import("@/pages/admin/production-management"));
const AdminParlours = lazy(() => import("@/pages/admin/parlours"));
const AdminChatSettings = lazy(() => import("@/pages/admin/communication/chat-settings"));
const AdminChats = lazy(() => import("@/pages/admin/communication/chats"));
const AdminAllUsers = lazy(() => import("@/pages/admin/users/all-users"));
const AdminB2CUsers = lazy(() => import("@/pages/admin/users/b2c-users"));
const AdminB2BUsers = lazy(() => import("@/pages/admin/users/b2b-users"));
const AdminAllRoles = lazy(() => import("@/pages/admin/users/all-roles"));
const AdminDigitalWallet = lazy(() => import("@/pages/admin/digital-wallet"));
const AdminMultiCurrency = lazy(() => import("@/pages/admin/multi-currency"));
const AdminCommunication = lazy(() => import("@/pages/admin/communication"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminPrinters = lazy(() => import("@/pages/admin/printers"));
const AdminWebsite = lazy(() => import("@/pages/admin/website"));
const AdminMediaLibrary = lazy(() => import("@/pages/admin/media-library"));
const AdminAddonManager = lazy(() => import("@/pages/admin/addon-manager"));
const AdminUtilities = lazy(() => import("@/pages/admin/utilities"));
const AdminFixedDatabase = lazy(() => import("@/pages/admin/utilities/fixed-database"));
const AdminCleanDatabase = lazy(() => import("@/pages/admin/utilities/clean-database"));
const AdminCronJobs = lazy(() => import("@/pages/admin/utilities/cron-jobs"));
const AdminMigrationTools = lazy(() => import("@/pages/admin/utilities/migration-tools"));
const AdminClearCache = lazy(() => import("@/pages/admin/utilities/clear-cache"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/audit-logs"));
const AdminDuplicateProducts = lazy(() => import("@/pages/admin/utilities/duplicate-products"));
const AdminEwayBill = lazy(() => import("@/pages/admin/eway-bill"));
const AdminEwayBillGenerate = lazy(() => import("@/pages/admin/eway-bill-generate"));
const AdminEwayBillSettings = lazy(() => import("@/pages/admin/eway-bill-settings"));
const AdminEwayBillHsn = lazy(() => import("@/pages/admin/eway-bill-hsn"));
const AdminGstReturns = lazy(() => import("@/pages/admin/gst-returns"));
const AdminDelhivery = lazy(() => import("@/pages/admin/delhivery"));
const AdminB2BRegistrations = lazy(() => import("@/pages/admin/b2b-registrations"));
const AdminPerformanceSignedIn = lazy(() => import("@/pages/admin/performance/signed-in"));
const AdminPerformanceSignups = lazy(() => import("@/pages/admin/performance/signups"));
const B2BDashboard = lazy(() => import("@/pages/b2b/dashboard"));
const AgentClaim = lazy(() => import("@/pages/agent-claim"));
const DriverDashboard = lazy(() => import("@/pages/driver/dashboard"));
const DriverTripDashboard = lazy(() => import("@/pages/driver/trip-dashboard"));
const DriverLogin = lazy(() => import("@/pages/driver/login"));
const UnionStaffRegister = lazy(() => import("@/pages/union-staff-register"));
const DeliveryPartnerRegisterPage = lazy(() => import("@/pages/delivery-partner-register"));
const BulkImageUpload = lazy(() => import("@/pages/bulk-image-upload"));
const DailyIndent = lazy(() => import("@/pages/institution/daily-indent"));
const MmoIndents = lazy(() => import("@/pages/admin/mmo-indents"));
const DeliveryPartnerDashboard = lazy(() => import("@/pages/delivery-partner-dashboard"));
const MobileMerchantDashboard = lazy(() => import("@/pages/mobile/merchant-dashboard"));
const MobileDriverDashboard = lazy(() => import("@/pages/mobile/driver-dashboard"));
const MobileProductionDashboard = lazy(() => import("@/pages/mobile/production-dashboard"));
const MobileStaffDashboard = lazy(() => import("@/pages/mobile/staff-dashboard"));
const KDSDashboard = lazy(() => import("@/pages/kds-dashboard"));
const PwaStaffApp = lazy(() => import("@/pages/pwa/staff-app"));
const PwaDriverApp = lazy(() => import("@/pages/pwa/driver-app"));
const PwaTransportApp = lazy(() => import("@/pages/pwa/transport-app"));
const TransportLogin = lazy(() => import("@/pages/transport-login"));
const AdminDeliveryTransport = lazy(() => import("@/pages/admin/delivery-transport"));
const AdminRegularDelivery = lazy(() => import("@/pages/admin/regular-delivery"));
const AdminBulkDelivery = lazy(() => import("@/pages/admin/bulk-delivery"));
const AdminFreshMilkRoutes = lazy(() => import("@/pages/admin/fresh-milk-routes"));
const AdminFreshMilkDispatch = lazy(() => import("@/pages/admin/fresh-milk-dispatch"));
const AdminMilkDispatchReport = lazy(() => import("@/pages/admin/milk-dispatch-report"));
const AdminFreshMilkDmr = lazy(() => import("@/pages/admin/fresh-milk-dmr"));
const AdminFreshMilkVehicles = lazy(() => import("@/pages/admin/fresh-milk-vehicles"));
const MerchantRegularDelivery = lazy(() => import("@/pages/merchant/regular-delivery"));
const MerchantBulkDelivery = lazy(() => import("@/pages/merchant/bulk-delivery"));
const MerchantBulkInvoices = lazy(() => import("@/pages/merchant/bulk-invoices"));
const TransportDashboard = lazy(() => import("@/pages/admin/transport-dashboard"));
const TransportTripPlanning = lazy(() => import("@/pages/admin/transport-trip-planning"));
const TransportTripDetail = lazy(() => import("@/pages/admin/transport-trip-detail"));
const AdminTransportTeam = lazy(() => import("@/pages/admin/transport-team"));
const AdminPaymentMisReports = lazy(() => import("@/pages/admin/payment-mis-reports"));
const MerchantPaymentDashboard = lazy(() => import("@/pages/merchant/payment-dashboard"));
const MerchantCreditLedger = lazy(() => import("@/pages/merchant/credit-ledger"));
const MerchantPaymentSettings = lazy(() => import("@/pages/merchant/payment-settings"));
const AdminMerchantPaymentAccounts = lazy(() => import("@/pages/admin/merchant-payment-accounts"));


class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    const msg = error?.message || "";
    if (msg.includes("Loading chunk") || msg.includes("ChunkLoadError") || msg.includes("dynamically imported")) {
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <p className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4">The page failed to load. This usually fixes itself.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer className="hidden md:block" />
      <CartSidebar />
      <MobileBottomNav />
    </div>
  );
}

function B2BProductsRedirect() {
  const { user, authLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (authLoading) return;
    if (user?.restaurantId) {
      setLocation(`/union/${user.restaurantId}`);
    } else {
      setLocation('/');
    }
  }, [authLoading, user]);
  return null;
}

function Router() {
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Customer routes with layout */}
        <Route path="/">
          <CustomerLayout>
            <Home />
          </CustomerLayout>
        </Route>
        <Route path="/unions">
          <CustomerLayout>
            <Unions />
          </CustomerLayout>
        </Route>
        <Route path="/restaurants">
          <Redirect to="/unions" />
        </Route>
        <Route path="/shops">
          <CustomerLayout>
            <Unions />
          </CustomerLayout>
        </Route>
        <Route path="/union/:id">
          <CustomerLayout>
            <UnionDetail />
          </CustomerLayout>
        </Route>
        <Route path="/restaurant/:id">
          {(params: { id: string }) => <Redirect to={`/union/${params.id}`} />}
        </Route>
        <Route path="/shops/:slug">
          <CustomerLayout>
            <UnionDetail />
          </CustomerLayout>
        </Route>
              <Route path="/orders">
          <CustomerLayout>
            <Orders />
          </CustomerLayout>
        </Route>
        <Route path="/services">
          <CustomerLayout>
            <Services />
          </CustomerLayout>
        </Route>
        <Route path="/free-milk-request">
          <CustomerLayout>
            <FreeMilkRequest />
          </CustomerLayout>
        </Route>
        <Route path="/dashboard">
          <CustomerLayout>
            <RestaurantDashboard />
          </CustomerLayout>
        </Route>
        <Route path="/checkout">
          <CustomerLayout>
            <Checkout />
          </CustomerLayout>
        </Route>
        
        {/* Auth routes - unified login */}
        <Route path="/login" component={UnifiedLogin} />
        <Route path="/register" component={Register} />
        <Route path="/signup" component={Signup} />
        <Route path="/signup/:role" component={Signup} />
        <Route path="/merchant-register" component={MerchantRegister} />
        <Route path="/merchant-signup" component={MerchantSignup} />
        <Route path="/delivery-signup" component={DeliverySignup} />
        <Route path="/b2b-register" component={B2BRegister} />
        
        {/* Static pages */}
        <Route path="/about" component={About} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/careers" component={Careers} />
        <Route path="/support" component={Support} />
        <Route path="/apps" component={MobileApp} />
        <Route path="/profile">
          <CustomerLayout>
            <Profile />
          </CustomerLayout>
        </Route>
        
        {/* Driver routes */}
        <Route path="/driver/login" component={DriverLogin} />
        <Route path="/driver/signup">
          {() => { window.location.href = '/delivery-signup'; return null; }}
        </Route>
        <Route path="/driver/dashboard" component={DriverDashboard} />
        <Route path="/driver/trip" component={DriverTripDashboard} />
        
        {/* District Union routes - redirect old login/signup to unified */}
        <Route path="/district-union/login">
          {() => { window.location.href = '/admin/login?tab=union'; return null; }}
        </Route>
        <Route path="/district-union/signup">
          {() => { window.location.href = '/merchant-signup'; return null; }}
        </Route>
        <Route path="/district-union/dashboard">
          {() => { window.location.href = '/merchant/dashboard'; return null; }}
        </Route>
        
        <Route path="/pos" component={POSDashboard} />
        
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/transport/login" component={TransportLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/app-performance" component={AdminAppPerformance} />
        <Route path="/admin/staff-dashboard" component={AdminStaffDashboard} />
        <Route path="/admin/segment-staff" component={AdminSegmentStaff} />
        <Route path="/admin/mmo-indents" component={MmoIndents} />
        <Route path="/admin/production-dashboard" component={AdminProductionDashboard} />
        <Route path="/admin/inventory-management" component={AdminInventoryManagement} />
        <Route path="/admin/dms" component={AdminDMS} />
        <Route path="/admin/bulk-invoices" component={AdminBulkInvoices} />
        <Route path="/admin/payment-links" component={AdminPaymentLinks} />
        <Route path="/admin/dms-inventory" component={AdminDMSInventory} />
        <Route path="/admin/dms-grn" component={AdminDMSGrn} />
        <Route path="/admin/dms-sales-returns" component={AdminDMSSalesReturns} />
        <Route path="/admin/dms-collections" component={AdminDMSCollections} />
        <Route path="/admin/dms-schemes" component={AdminDMSSchemes} />
        <Route path="/admin/dms-sfa" component={AdminDMSSfa} />
        <Route path="/admin/regular-delivery" component={AdminRegularDelivery} />
        <Route path="/admin/bulk-delivery" component={AdminBulkDelivery} />
        <Route path="/admin/fresh-milk-routes" component={AdminFreshMilkRoutes} />
        <Route path="/admin/fresh-milk-dispatch" component={AdminFreshMilkDispatch} />
        <Route path="/admin/milk-dispatch-report" component={AdminMilkDispatchReport} />
        <Route path="/admin/fresh-milk-dmr" component={AdminFreshMilkDmr} />
        <Route path="/admin/fresh-milk-vehicles" component={AdminFreshMilkVehicles} />
        <Route path="/admin/dms-vehicles">
          {() => { window.location.href = '/admin/regular-delivery?tab=fleet'; return null; }}
        </Route>
        <Route path="/admin/dms-transport">
          {() => { window.location.href = '/admin/bulk-delivery?tab=active'; return null; }}
        </Route>
        <Route path="/admin/dms-tally" component={AdminDMSTally} />
        <Route path="/admin/dms-gstr" component={AdminDMSGstr} />
        <Route path="/admin/delivery-config" component={AdminDeliveryConfig} />
        <Route path="/admin/master-catalog" component={AdminMasterCatalog} />
        <Route path="/admin/site-configuration" component={AdminSiteConfiguration} />
        <Route path="/admin/site-configuration/automated-status-updates" component={AdminAutomatedStatusUpdates} />
        <Route path="/admin/site-configuration/merchant-registration" component={AdminMerchantRegistration} />
        <Route path="/admin/site-configuration/notifications" component={AdminSiteNotifications} />
        <Route path="/admin/site-configuration/contact-settings" component={AdminContactSettings} />
        <Route path="/admin/site-configuration/analytics" component={AdminAnalytics} />
        <Route path="/admin/site-configuration/api-access" component={AdminApiAccess} />
        <Route path="/admin/site-configuration/push-notifications" component={AdminPushNotifications} />
        <Route path="/admin/site-configuration/gdpr-cookie-consent" component={AdminGdprCookieConsent} />
        <Route path="/admin/site-configuration/others" component={AdminOthers} />
        <Route path="/admin/merchant" component={AdminMerchant} />
        <Route path="/admin/merchant/add" component={AdminMerchantAdd} />
        <Route path="/admin/merchant/edit/:id" component={AdminMerchantEdit} />
        <Route path="/admin/merchant/new-signup" component={AdminMerchantNewSignup} />
        <Route path="/admin/merchant/sponsored" component={AdminMerchantSponsored} />
        <Route path="/admin/membership" component={AdminMembership} />
        <Route path="/admin/membership/plans" component={AdminMembershipPlans} />
        <Route path="/admin/membership/subscribers" component={AdminMembershipSubscribers} />
        <Route path="/admin/membership/deposits" component={AdminMembershipDeposits} />
        {/* Union routes */}
        <Route path="/union/login">
          {() => { window.location.href = '/login?tab=staff'; return null; }}
        </Route>
        <Route path="/union/signup">
          {() => { window.location.href = '/merchant-signup'; return null; }}
        </Route>
        <Route path="/union/dashboard">
          {() => { window.location.href = '/merchant/dashboard' + window.location.search; return null; }}
        </Route>
        <Route path="/union/sub-users" component={UnionSubUsers} />
        <Route path="/union/segment-manager" component={SegmentManagerDashboard} />
        <Route path="/union/b2b-approvals" component={UnionB2BApprovals} />

        <Route path="/merchant/dashboard" component={MerchantOverview} />
        <Route path="/merchant/orders/view/:id" component={MerchantOrderDetails} />
        <Route path="/merchant/mmo" component={MmoOfficesPage} />
        <Route path="/merchant/mmo/:officeId/routes" component={MmoRoutesPage} />
        <Route path="/merchant/head-office" component={HeadOfficePage} />
        <Route path="/merchant/orders" component={MerchantOrders} />
        <Route path="/merchant/products" component={MerchantProducts} />
        <Route path="/merchant/inventory" component={MerchantInventory} />
        <Route path="/merchant/grn" component={MerchantGrn} />
        <Route path="/merchant/sales-returns" component={MerchantSalesReturns} />
        <Route path="/merchant/collections" component={MerchantCollections} />
        <Route path="/merchant/invoices" component={MerchantInvoices} />
        <Route path="/merchant/staff" component={MerchantStaff} />
        <Route path="/merchant/transport-team" component={MerchantTransportTeam} />
        <Route path="/merchant/union-info" component={MerchantUnionInfo} />
        <Route path="/merchant/regular-delivery" component={MerchantRegularDelivery} />
        <Route path="/merchant/bulk-delivery" component={MerchantBulkDelivery} />
        <Route path="/merchant/bulk-invoices" component={MerchantBulkInvoices} />
        <Route path="/merchant/delivery" component={MerchantDelivery} />
        <Route path="/merchant/delivery/trips/:tripId" component={TransportTripDetail} />
        <Route path="/merchant/delivery/trips">
          {() => { window.location.href = '/merchant/regular-delivery?tab=orders'; return null; }}
        </Route>
        <Route path="/merchant/delivery/tracking">
          {() => { window.location.href = '/merchant/bulk-delivery?tab=active'; return null; }}
        </Route>
        <Route path="/merchant/delivery/vehicles">
          {() => { window.location.href = '/merchant/regular-delivery?tab=fleet'; return null; }}
        </Route>
        <Route path="/merchant/pos" component={MerchantPOS} />
        <Route path="/merchant/union-settings" component={MerchantUnionSettings} />
        <Route path="/merchant/banner" component={MerchantBanner} />
        <Route path="/merchant/products/catalog" component={MerchantComingSoon} />
        <Route path="/merchant/orders/bulk-invoices" component={MerchantBulkInvoices} />
        <Route path="/merchant/daily-indent" component={MerchantComingSoon} />
        <Route path="/merchant/eway-bill" component={MerchantComingSoon} />
        <Route path="/merchant/gst" component={MerchantComingSoon} />
        <Route path="/merchant/account" component={MerchantComingSoon} />
        <Route path="/merchant/users" component={MerchantUsers} />
        <Route path="/merchant/users/b2b" component={MerchantB2BUsers} />
        <Route path="/merchant/users/b2c" component={MerchantB2CUsers} />
        <Route path="/merchant/users/b2b-registrations" component={MerchantB2BRegistrations} />
        <Route path="/merchant/sub-users" component={MerchantComingSoon} />
        <Route path="/merchant/schemes" component={MerchantComingSoon} />
        <Route path="/merchant/sfa" component={MerchantComingSoon} />
        <Route path="/merchant/tally" component={MerchantComingSoon} />
        <Route path="/merchant/gstr" component={MerchantComingSoon} />
        <Route path="/merchant/credit-ledger" component={MerchantCreditLedger} />
        <Route path="/merchant/payment-dashboard" component={MerchantPaymentDashboard} />
        <Route path="/merchant/payment-settings" component={MerchantPaymentSettings} />
        <Route path="/merchant/reports" component={MerchantReports} />
        <Route path="/merchant/free-milk-requests" component={MerchantFreeMilkRequests} />
        <Route path="/merchant/milk-dispatch-report" component={MilkDispatchReport} />
        <Route path="/merchant/products-dispatch-report">
          {() => <MerchantLayout><SegmentDispatchReport segment="Products" /></MerchantLayout>}
        </Route>
        <Route path="/merchant/icecream-dispatch-report">
          {() => <MerchantLayout><SegmentDispatchReport segment="Ice Cream" /></MerchantLayout>}
        </Route>
        <Route path="/merchant/gallery" component={MerchantComingSoon} />
        <Route path="/merchant/printers" component={MerchantComingSoon} />
        <Route path="/union-staff-register" component={UnionStaffRegister} />
        <Route path="/delivery-partner/register" component={DeliveryPartnerRegisterPage} />
        <Route path="/delivery-partner/dashboard" component={DeliveryPartnerDashboard} />
        <Route path="/mobile/merchant-dashboard" component={MobileMerchantDashboard} />
        <Route path="/mobile/driver-dashboard" component={MobileDriverDashboard} />
        <Route path="/mobile/production-dashboard" component={MobileProductionDashboard} />
        <Route path="/m/merchant" component={MobileStaffDashboard} />
        <Route path="/m/driver" component={MobileDriverDashboard} />
        <Route path="/m/production" component={MobileProductionDashboard} />
        <Route path="/kds" component={KDSDashboard} />
        <Route path="/pwa/staff" component={PwaStaffApp} />
        <Route path="/pwa/driver" component={PwaDriverApp} />
        <Route path="/pwa/transport" component={PwaTransportApp} />
        
        <Route path="/admin/delivery" component={AdminDeliveryTransport} />
        <Route path="/admin/transport/dashboard">
          {() => { window.location.href = '/admin/bulk-delivery?tab=performance'; return null; }}
        </Route>
        <Route path="/admin/transport/trip-planning">
          {() => { window.location.href = '/admin/bulk-delivery?tab=trips'; return null; }}
        </Route>
        <Route path="/admin/transport/trips/:tripId" component={TransportTripDetail} />

        <Route path="/union-staff-login">
          {() => { window.location.href = '/pwa/staff'; return null; }}
        </Route>
        <Route path="/bulk-image-upload" component={BulkImageUpload} />
        <Route path="/daily-indent" component={DailyIndent} />
        
        {/* Backward compatibility redirects */}
        <Route path="/merchant/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/order/:orderId/invoice" component={OrderInvoice} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/orders/view/:id" component={AdminOrderDetails} />
        <Route path="/admin/orders/settings" component={AdminOrderSettings} />
        <Route path="/admin/order-workflow/:id" component={AdminOrderWorkflow} />
        <Route path="/admin/payment-gateway" component={AdminPaymentGateway} />
        <Route path="/admin/payment-gateway/create" component={AdminPaymentGatewayEdit} />
        <Route path="/admin/payment-gateway/edit/:id" component={AdminPaymentGatewayEdit} />
        <Route path="/admin/payment-gateway/transactions" component={AdminPaymentGatewayTransactions} />
        <Route path="/admin/payment-gateway/methods" component={AdminPaymentGatewayMethods} />
        <Route path="/admin/payment-gateway/webhooks" component={AdminPaymentGatewayWebhooks} />
        <Route path="/admin/payment-gateway/reports" component={AdminPaymentGatewayReports} />
        <Route path="/admin/payment-gateway/api-settings" component={AdminPaymentGatewayApiSettings} />
        <Route path="/admin/payment-mis-reports" component={AdminPaymentMisReports} />
        <Route path="/admin/payment-gateway/pay-on-delivery" component={AdminPayOnDelivery} />
        <Route path="/admin/merchant-payment-accounts" component={AdminMerchantPaymentAccounts} />
        <Route path="/admin/payouts" component={AdminPayouts} />
        <Route path="/admin/softpos-terminals" component={AdminSoftPOSTerminals} />
        <Route path="/admin/easy-split" component={AdminEasySplit} />
        <Route path="/admin/account" component={AdminAccount} />
        <Route path="/admin/account/transactions" component={AdminAccountTransactions} />
        <Route path="/admin/sub-users" component={AdminSubUsers} />
        <Route path="/admin/earnings" component={AdminEarnings} />
        <Route path="/admin/earnings/merchant" component={AdminMerchantEarnings} />
        <Route path="/admin/withdrawals" component={AdminWithdrawals} />
        <Route path="/admin/invoice" component={AdminInvoice} />
        <Route path="/admin/eway-bill" component={AdminEwayBill} />
        <Route path="/admin/eway-bill/generate" component={AdminEwayBillGenerate} />
        <Route path="/admin/eway-bill/settings" component={AdminEwayBillSettings} />
        <Route path="/admin/eway-bill/hsn-codes" component={AdminEwayBillHsn} />
        <Route path="/admin/gst-returns" component={AdminGstReturns} />
        <Route path="/admin/delhivery" component={AdminDelhivery} />
        <Route path="/admin/b2b-registrations" component={AdminB2BRegistrations} />
        <Route path="/admin/performance/signed-in" component={AdminPerformanceSignedIn} />
        <Route path="/admin/performance/signups" component={AdminPerformanceSignups} />
        <Route path="/admin/table-reservation" component={AdminTableReservation} />
        <Route path="/admin/attributes" component={AdminAttributes} />
        <Route path="/admin/promo" component={AdminPromo} />
        <Route path="/admin/notifications" component={AdminNotifications} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route path="/admin/buyers" component={AdminBuyers} />
        <Route path="/admin/agents" component={AdminAgents} />
        <Route path="/admin/third-party-app" component={AdminThirdPartyApp} />
        <Route path="/admin/google-maps" component={AdminGoogleMaps} />
        <Route path="/admin/api-settings" component={AdminApiSettings} />
        <Route path="/admin/sms" component={AdminSMS} />
        <Route path="/admin/delivery-management">
          {() => { window.location.href = '/admin/delivery?tab=drivers'; return null; }}
        </Route>
        <Route path="/admin/transport-team" component={AdminTransportTeam} />
        <Route path="/admin/staff-management" component={AdminStaffManagement} />
        <Route path="/admin/sales-analytics" component={AdminSalesAnalytics} />
        <Route path="/admin/b2b-dashboard" component={AdminB2BDashboard} />
        <Route path="/admin/b2b-users-map" component={AdminB2BUsersMap} />
        <Route path="/admin/address-proofs" component={AdminAddressProofs} />
        <Route path="/admin/driver-tracking">
          {() => { window.location.href = '/admin/delivery?tab=active'; return null; }}
        </Route>
        <Route path="/admin/loyalty-points" component={AdminLoyaltyPoints} />
        <Route path="/admin/tableside-ordering" component={AdminTablesideOrdering} />
        <Route path="/admin/production-app" component={AdminProductionApp} />
        <Route path="/admin/production-management" component={AdminProductionManagement} />
        <Route path="/admin/parlours" component={AdminParlours} />
        <Route path="/admin/district-unions">
          {() => { window.location.href = '/admin/merchant'; return null; }}
        </Route>
        <Route path="/admin/digital-wallet" component={AdminDigitalWallet} />
        <Route path="/admin/multi-currency" component={AdminMultiCurrency} />
        <Route path="/admin/communication" component={AdminCommunication} />
        <Route path="/admin/communication/chat-settings" component={AdminChatSettings} />
        <Route path="/admin/communication/chats" component={AdminChats} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/users" component={AdminAllUsers} />
        <Route path="/admin/users/b2c" component={AdminB2CUsers} />
        <Route path="/admin/users/b2b" component={AdminB2BUsers} />
        <Route path="/admin/users/roles" component={AdminAllRoles} />
        <Route path="/admin/printers" component={AdminPrinters} />
        <Route path="/admin/website" component={AdminWebsite} />
        <Route path="/admin/media-library" component={AdminMediaLibrary} />
        <Route path="/admin/addon-manager" component={AdminAddonManager} />
        <Route path="/admin/utilities" component={AdminUtilities} />
        <Route path="/admin/utilities/fixed-database" component={AdminFixedDatabase} />
        <Route path="/admin/utilities/clean-database" component={AdminCleanDatabase} />
        <Route path="/admin/utilities/cron-jobs" component={AdminCronJobs} />
        <Route path="/admin/utilities/migration-tools" component={AdminMigrationTools} />
        <Route path="/admin/utilities/clear-cache" component={AdminClearCache} />
        <Route path="/admin/utilities/duplicate-products" component={AdminDuplicateProducts} />
        <Route path="/admin/audit-logs" component={AdminAuditLogs} />
        
        {/* Parlour routes - redirect login to unified */}
        <Route path="/parlour/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/parlour/dashboard" component={B2BProductsRedirect} />
        
        {/* WSD routes - redirect login to unified */}
        <Route path="/wsd/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/wsd/dashboard" component={B2BProductsRedirect} />
        
        {/* Dealer routes - redirect login to unified */}
        <Route path="/dealer/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/dealer/dashboard" component={B2BProductsRedirect} />
        
        {/* Retailer routes - redirect login to unified */}
        <Route path="/retailer/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/retailer/dashboard" component={B2BProductsRedirect} />
        
        {/* Inter-Union routes - redirect login to unified */}
        <Route path="/inter-union/login">
          {() => { window.location.href = '/login?tab=business'; return null; }}
        </Route>
        
        {/* FMD routes - redirect login to unified */}
        <Route path="/fmd/login">
          {() => { window.location.href = '/login?tab=staff'; return null; }}
        </Route>
        <Route path="/fmd/dashboard" component={B2BProductsRedirect} />
        
        {/* Agent routes - redirect login to unified */}
        <Route path="/agent-claim" component={AgentClaim} />
        <Route path="/agent-login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        <Route path="/agent/login">
          {() => { window.location.href = '/login'; return null; }}
        </Route>
        
        {/* B2B Dashboard - /b2b/dashboard redirects to products page, /my-account keeps profile */}
        <Route path="/b2b/dashboard" component={B2BProductsRedirect} />
        <Route path="/my-account" component={B2BDashboard} />
        
        {/* 404 */}
        <Route>
          <CustomerLayout>
            <NotFound />
          </CustomerLayout>
        </Route>
      </Switch>
    </Suspense>
    </ChunkErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <TooltipProvider>
            <Router />
            <PwaInstallPrompt />
            <Toaster />
          </TooltipProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
