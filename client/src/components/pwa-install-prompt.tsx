import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import customerLogo from "@assets/F-F_1770588249868.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      return outcome;
    }
    return null;
  }, [deferredPrompt]);

  return { deferredPrompt, isInstalled, triggerInstall };
}

export function getDeviceType() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios" as const;
  if (/Android/.test(ua)) return "android" as const;
  return "desktop" as const;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 3 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_DURATION;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {}
}

export default function PwaInstallPrompt() {
  const { deferredPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissedState] = useState(() => wasDismissedRecently());
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">(() => getDeviceType());
  const [, navigate] = useLocation();

  const isMobile = deviceType === "ios" || deviceType === "android";

  if (isInstalled || dismissed || !isMobile) return null;

  const canPromptNatively = deferredPrompt != null;

  const handleInstall = async () => {
    if (canPromptNatively) {
      await triggerInstall();
    } else if (deviceType === "ios") {
      setShowIOSGuide(true);
    } else {
      navigate("/apps");
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
  };

  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => { setShowIOSGuide(false); handleDismiss(); }} />
        <div className="relative w-full max-w-md bg-white rounded-t-2xl p-5 pb-8 shadow-2xl animate-slide-up safe-area-bottom">
          <button
            onClick={() => { setShowIOSGuide(false); handleDismiss(); }}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Install AavinCart on iPhone</h3>
          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</span>
              <span>Tap the <Share2 className="h-4 w-4 inline mx-1 text-blue-600" /> <strong>Share</strong> button at the bottom of Safari</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">3</span>
              <span>Tap <strong>"Add"</strong> in the top right corner</span>
            </li>
          </ol>
          <p className="text-xs text-gray-500 mt-4 text-center">Must use Safari browser on iOS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] safe-area-bottom">
      <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-cyan-50 p-1.5 flex-shrink-0">
          <img src={customerLogo} alt="AavinCart" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Install AavinCart</p>
          <p className="text-xs text-gray-500 truncate">Order milk & dairy products instantly</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            Later
          </button>
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 h-9 text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
