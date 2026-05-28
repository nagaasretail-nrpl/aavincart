import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Smartphone,
  Download,
  Shield,
  Zap,
  Bell,
  MapPin,
  ShoppingCart,
  Truck,
  Star,
  Check,
  ArrowLeft,
  Share2,
  Monitor,
  Chrome,
  Store,
  ExternalLink,
} from "lucide-react";
import customerLogo from "@assets//aavin-logo.png";
import { usePwaInstall, getDeviceType } from "@/components/pwa-install-prompt";

export default function MobileApp() {
  const { deferredPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    setDeviceType(getDeviceType());
  }, []);

  const handleInstall = async () => {
    await triggerInstall();
  };

  const features = [
    { icon: ShoppingCart, title: "Easy Ordering", desc: "Browse and order fresh milk & dairy products with just a few taps" },
    { icon: Truck, title: "Order Tracking", desc: "Track your delivery in real-time from dispatch to doorstep" },
    { icon: Bell, title: "Push Notifications", desc: "Get instant updates on orders, offers, and delivery status" },
    { icon: MapPin, title: "GPS Location", desc: "Auto-detect your location for quick delivery address setup" },
    { icon: Shield, title: "Secure Payments", desc: "Pay safely with Razorpay - UPI, cards, net banking & more" },
    { icon: Zap, title: "Fast & Lightweight", desc: "Works like a native app without taking up storage space" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl shadow-lg overflow-hidden bg-white p-2">
              <img src={customerLogo} alt="Aavin Cart" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Aavin Cart
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Get the Aavin Cart app on your phone — order fresh milk and dairy products from Tamil Nadu's 27 District Unions
          </p>
        </div>

        <Card className="mb-8 border-cyan-200 bg-white shadow-md">
          <CardContent className="p-6 md:p-8">
            {isInstalled ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">App Installed!</h2>
                <p className="text-gray-600">Aavin Cart is installed on your device. You can find it on your home screen.</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Install the App</h2>

                {deferredPrompt && (
                  <div className="flex justify-center mb-6">
                    <Button
                      onClick={handleInstall}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Install AavinCart Now
                    </Button>
                  </div>
                )}

                <div className="space-y-6">
                  {deviceType === "ios" && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-cyan-600" />
                        Install on iPhone / iPad
                      </h3>
                      <ol className="space-y-3 text-sm text-gray-700">
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">1</span>
                          <span>Open this page in <strong>Safari</strong> browser</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">2</span>
                          <span>Tap the <Share2 className="h-4 w-4 inline mx-1" /> <strong>Share</strong> button at the bottom</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">3</span>
                          <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">4</span>
                          <span>Tap <strong>"Add"</strong> in the top right corner</span>
                        </li>
                      </ol>
                      <p className="text-xs text-gray-500 mt-3">Must use Safari browser on iOS</p>
                    </div>
                  )}

                  {deviceType === "android" && !deferredPrompt && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Chrome className="h-5 w-5 text-cyan-600" />
                        Install on Android
                      </h3>
                      <ol className="space-y-3 text-sm text-gray-700">
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">1</span>
                          <span>Open this page in <strong>Chrome</strong> browser</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">2</span>
                          <span>Tap the <strong>three-dot menu</strong> (⋮) at the top right</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">3</span>
                          <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                        </li>
                      </ol>
                    </div>
                  )}

                  {deviceType === "desktop" && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-cyan-600" />
                        Install on Desktop
                      </h3>
                      {deferredPrompt ? (
                        <p className="text-sm text-gray-700">Click the <strong>"Install AavinCart Now"</strong> button above to add the app to your computer.</p>
                      ) : (
                        <ol className="space-y-3 text-sm text-gray-700">
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">1</span>
                            <span>Look for the <strong>install icon</strong> (⊕) in your browser's address bar</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">2</span>
                            <span>Click <strong>"Install"</strong> to add the app</span>
                          </li>
                        </ol>
                      )}
                      <p className="text-xs text-gray-500 mt-3">Works best in Chrome, Edge, or Brave browsers</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">App Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <Card key={i} className="border-gray-200 hover:border-cyan-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{feature.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mb-8 border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 text-center">Why Install?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                  <Zap className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="font-medium text-sm text-gray-900">Faster Access</h3>
                <p className="text-xs text-gray-600 mt-1">Launch instantly from your home screen</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                  <Bell className="h-6 w-6 text-cyan-600" />
                </div>
                <h3 className="font-medium text-sm text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-600 mt-1">Get alerts on orders and deliveries</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-sm text-gray-900">Full Screen</h3>
                <p className="text-xs text-gray-600 mt-1">App-like experience without browser bars</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Role-Based Apps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-indigo-200 hover:border-indigo-400 transition-colors hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Admin / Union Portal</h3>
                    <p className="text-xs text-gray-600 mt-1 mb-3">For Federation Admin & District Union Managers</p>
                    <Link href="/admin/login">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs px-4">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Admin Login
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 hover:border-blue-400 transition-colors hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Store className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Union Staff App</h3>
                    <p className="text-xs text-gray-600 mt-1 mb-3">For Union staff — process orders, track operations & manage products</p>
                    <Link href="/pwa/staff">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs px-4">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Open Staff App
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:border-purple-400 transition-colors hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Driver App</h3>
                    <p className="text-xs text-gray-600 mt-1 mb-3">For delivery drivers — manage deliveries, routes & order status</p>
                    <Link href="/pwa/driver">
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs px-4">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Open Driver App
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200 hover:border-teal-400 transition-colors hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Transport Manager App</h3>
                    <p className="text-xs text-gray-600 mt-1 mb-3">For transport managers — dispatch trips, track vehicles, manage fleet & exceptions</p>
                    <Link href="/pwa/transport">
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs px-4">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Open Transport App
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        <p className="text-center text-xs text-gray-500 pb-8">
          Aavin Cart is a Progressive Web App (PWA). No download from app stores required — install directly from your browser.
        </p>
      </div>
    </div>
  );
}
