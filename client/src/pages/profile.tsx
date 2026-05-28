import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  User, Mail, Phone, Shield, MapPin, Building2, Save, Lock,
  Milk, Package, Eye, EyeOff, ArrowLeft, Plus, Pencil, Trash2,
  Navigation, Star, Truck, Loader2, CheckCircle2, AlertCircle, FileText, Landmark, CreditCard,
  ChevronRight, LogOut, ShoppingBag, Globe, Heart, Settings
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddressCapture from "@/components/address-capture";
import type { ProofData } from "@/components/location-proof-capture";
import type { DeliveryPoint } from "@shared/schema";
import { Camera, Signal, AlertTriangle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  customer: "Customer",
  driver: "Delivery Driver",
  agent: "Agent / Dealer",
  restaurant: "District Union",
  production_manager: "Production Manager",
  marketing_manager: "Marketing Manager",
};

const PRICING_LABELS: Record<string, string> = {
  FEDERATION: "Federation (50%)",
  INTER_UNION: "Inter-Union (55%)",
  WHOLESALE_DEALER: "Wholesale Dealer (65%)",
  DEALER: "Dealer (85%)",
  RETAILER: "Retailer",
  MRP: "MRP (Consumer)",
};

interface DeliveryPointForm {
  businessId: string;
  pointName: string;
  contactName: string;
  contactPhone: string;
  route: string;
  deliveryAddress: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

const emptyForm: DeliveryPointForm = {
  businessId: "", pointName: "", contactName: "", contactPhone: "",
  route: "", deliveryAddress: "", latitude: null, longitude: null, isDefault: false,
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [mapsApiKey, setMapsApiKey] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [dpDialogOpen, setDpDialogOpen] = useState(false);
  const [editingDp, setEditingDp] = useState<DeliveryPoint | null>(null);
  const [dpForm, setDpForm] = useState<DeliveryPointForm>(emptyForm);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const [editingCompliance, setEditingCompliance] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [complianceForm, setComplianceForm] = useState({
    gstNumber: user?.gstNumber || "",
    panNumber: user?.panNumber || "",
    fssaiLicense: user?.fssaiLicense || "",
    tradeLicense: user?.tradeLicense || "",
    msmeNumber: user?.msmeNumber || "",
    gstExpiryDate: user?.gstExpiryDate || "",
    fssaiExpiryDate: user?.fssaiExpiryDate || "",
    tradeLicenseExpiryDate: user?.tradeLicenseExpiryDate || "",
    msmeExpiryDate: user?.msmeExpiryDate || "",
    gstRegistrationDate: user?.gstRegistrationDate || "",
    fssaiRegistrationDate: user?.fssaiRegistrationDate || "",
    tradeLicenseRegistrationDate: user?.tradeLicenseRegistrationDate || "",
    msmeRegistrationDate: user?.msmeRegistrationDate || "",
  });
  const [bankForm, setBankForm] = useState({
    accountHolderName: user?.accountHolderName || "",
    bankAccountNumber: user?.bankAccountNumber || "",
    bankIfscCode: user?.bankIfscCode || "",
    accountType: user?.accountType || "savings",
    bankName: user?.bankName || "",
    bankBranch: user?.bankBranch || "",
    upiId: user?.upiId || "",
  });
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [verifyingFssai, setVerifyingFssai] = useState(false);
  const [verifyingIfsc, setVerifyingIfsc] = useState(false);
  const [gstVerifyResult, setGstVerifyResult] = useState<any>(null);
  const [panVerifyResult, setPanVerifyResult] = useState<string | null>(null);
  const [fssaiVerifyResult, setFssaiVerifyResult] = useState<any>(null);
  const [ifscVerifyResult, setIfscVerifyResult] = useState<string | null>(null);

  const getExpiryStatus = (dateStr: string | undefined, perpetualLabel?: string) => {
    if (!dateStr) return null;
    if (dateStr === "9999-12-31") return { label: perpetualLabel || 'No Expiry (Perpetual)', color: 'text-blue-600', bg: 'bg-blue-100 text-blue-700', urgent: false };
    const expiry = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: `Expired ${Math.abs(daysLeft)} days ago`, color: 'text-red-600', bg: 'bg-red-100 text-red-700', urgent: true };
    if (daysLeft <= 30) return { label: `Expires in ${daysLeft} days - Renewal needed`, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700', urgent: true };
    return { label: `Valid until ${dateStr}`, color: 'text-green-600', bg: 'bg-green-100 text-green-700', urgent: false };
  };

  const isB2B = user?.pricingRole && user.pricingRole !== "MRP";

  const businessCode = (user as any)?.businessCode;
  const { data: b2bLookup } = useQuery<{ businessRoute: string; businessPoint: string }>({
    queryKey: ["/api/b2b/lookup-by-code", businessCode],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/lookup-by-code?businessCode=${encodeURIComponent(businessCode)}`, { credentials: 'include' });
      if (!res.ok) return { businessRoute: '', businessPoint: '' };
      return res.json();
    },
    enabled: !!user && !!businessCode && isB2B === true,
    staleTime: 60000,
  });

  const effectiveBusinessRoute = (user as any)?.businessRoute || b2bLookup?.businessRoute || '';
  const effectiveBusinessPoint = (user as any)?.businessPoint || b2bLookup?.businessPoint || '';

  const [routeSearch, setRouteSearch] = useState('');
  const [pointSearch, setPointSearch] = useState('');
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const [showPointDropdown, setShowPointDropdown] = useState(false);

  const { data: routesAndPoints } = useQuery<{ routes: string[]; points: string[] }>({
    queryKey: ["/api/b2b/routes-and-points", dpForm.route],
    queryFn: async () => {
      const routeParam = dpForm.route ? `?route=${encodeURIComponent(dpForm.route)}` : '';
      const res = await fetch(`/api/b2b/routes-and-points${routeParam}`, { credentials: 'include' });
      if (!res.ok) return { routes: [], points: [] };
      return res.json();
    },
    enabled: !!user && dpDialogOpen,
    staleTime: 30000,
  });

  const filteredRoutes = (routesAndPoints?.routes || []).filter(r =>
    !routeSearch || r.toLowerCase().includes(routeSearch.toLowerCase())
  );
  const filteredPoints = (routesAndPoints?.points || []).filter(p =>
    !pointSearch || p.toLowerCase().includes(pointSearch.toLowerCase())
  );

  const { data: deliveryPoints = [], isLoading: dpLoading } = useQuery<DeliveryPoint[]>({
    queryKey: ["/api/auth/delivery-points"],
    enabled: !!user,
  });

  const { data: merchants } = useQuery<any[]>({ queryKey: ['/api/merchants'] });

  useEffect(() => {
    fetch('/api/config/maps')
      .then(r => r.json())
      .then(data => { if (data.mapsApiKey) setMapsApiKey(data.mapsApiKey); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user && isB2B && !dpLoading && deliveryPoints.length === 0) {
      setShowCompletionBanner(true);
    }
  }, [user, isB2B, dpLoading, deliveryPoints.length]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
        setName(data.user.name);
        setPhone(data.user.phone || "");
      }
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to change password.", variant: "destructive" });
    },
  });

  const createDpMutation = useMutation({
    mutationFn: async (data: DeliveryPointForm) => {
      const payload: any = {
        ...data,
        latitude: data.latitude ? String(data.latitude) : null,
        longitude: data.longitude ? String(data.longitude) : null,
      };
      if (proofData) {
        payload.locationPhotoUrl = proofData.photoUrl;
        payload.gpsAccuracy = proofData.accuracy;
        payload.accuracyGrade = proofData.accuracyGrade;
        payload.locationSource = proofData.locationSource;
        payload.addressSource = "proof";
        payload.isMockLocation = proofData.isMockLocation;
        payload.suspicionScore = proofData.suspicionScore;
        payload.capturedAt = proofData.capturedAt;
        payload.proofHash = proofData.proofHash;
        payload.consentGiven = proofData.consentGiven;
      }
      const res = await apiRequest("POST", "/api/auth/delivery-points", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/delivery-points"] });
      setDpDialogOpen(false);
      setDpForm(emptyForm);
      setProofData(null);
      setShowCompletionBanner(false);
      toast({ title: "Delivery point added", description: "Your delivery point has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to add delivery point.", variant: "destructive" });
    },
  });

  const updateDpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeliveryPointForm }) => {
      const payload: any = {
        ...data,
        latitude: data.latitude ? String(data.latitude) : null,
        longitude: data.longitude ? String(data.longitude) : null,
      };
      if (proofData) {
        payload.locationPhotoUrl = proofData.photoUrl;
        payload.gpsAccuracy = proofData.accuracy;
        payload.accuracyGrade = proofData.accuracyGrade;
        payload.locationSource = proofData.locationSource;
        payload.addressSource = "proof";
        payload.isMockLocation = proofData.isMockLocation;
        payload.suspicionScore = proofData.suspicionScore;
        payload.capturedAt = proofData.capturedAt;
        payload.proofHash = proofData.proofHash;
        payload.consentGiven = proofData.consentGiven;
      }
      const res = await apiRequest("PATCH", `/api/auth/delivery-points/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/delivery-points"] });
      setDpDialogOpen(false);
      setEditingDp(null);
      setDpForm(emptyForm);
      setProofData(null);
      toast({ title: "Delivery point updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update delivery point.", variant: "destructive" });
    },
  });

  const deleteDpMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/auth/delivery-points/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/delivery-points"] });
      toast({ title: "Delivery point removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete delivery point.", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/auth/delivery-points/${id}`, { isDefault: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/delivery-points"] });
      toast({ title: "Default delivery point updated" });
    },
  });

  const saveComplianceMutation = useMutation({
    mutationFn: async (data: typeof complianceForm) => {
      const res = await apiRequest("PATCH", "/api/auth/compliance", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) setUser(data.user);
      setEditingCompliance(false);
      setGstVerifyResult(null);
      setPanVerifyResult(null);
      setFssaiVerifyResult(null);
      toast({ title: "Compliance details saved" });
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to save compliance details.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const saveBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      const res = await apiRequest("PATCH", "/api/auth/compliance", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) setUser(data.user);
      setEditingBank(false);
      setIfscVerifyResult(null);
      toast({ title: "Bank details saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save bank details.", variant: "destructive" });
    },
  });

  const handleVerifyGst = async () => {
    if (!complianceForm.gstNumber.trim()) return;
    setVerifyingGst(true);
    setGstVerifyResult(null);
    try {
      const res = await apiRequest("POST", "/api/verify/gst", { gstNumber: complianceForm.gstNumber });
      const data = await res.json();
      setGstVerifyResult(data);
      const updates: any = {};
      if (data.panFromGst && !complianceForm.panNumber) {
        updates.panNumber = data.panFromGst;
      }
      if (!complianceForm.gstExpiryDate) {
        updates.gstExpiryDate = "9999-12-31";
      }
      if (data.registrationDate && !complianceForm.gstRegistrationDate) {
        const parts = data.registrationDate.split('/');
        if (parts.length === 3) {
          updates.gstRegistrationDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          updates.gstRegistrationDate = data.registrationDate;
        }
      }
      if (!updates.gstRegistrationDate && !complianceForm.gstRegistrationDate) {
        updates.gstRegistrationDate = new Date().toISOString().split('T')[0];
      }
      if (Object.keys(updates).length > 0) {
        setComplianceForm(prev => ({ ...prev, ...updates }));
      }
    } catch {
      setGstVerifyResult({ error: true });
    }
    setVerifyingGst(false);
  };

  const handleVerifyPan = async () => {
    if (!complianceForm.panNumber.trim()) return;
    setVerifyingPan(true);
    setPanVerifyResult(null);
    try {
      const res = await apiRequest("POST", "/api/verify/pan", { panNumber: complianceForm.panNumber });
      const data = await res.json();
      if (data.verified) {
        setPanVerifyResult(`Verified: ${data.entityType || "Valid PAN"}`);
      } else {
        setPanVerifyResult(data.message || "Verification failed");
      }
    } catch {
      setPanVerifyResult("Verification request failed");
    }
    setVerifyingPan(false);
  };

  const handleVerifyFssai = async () => {
    if (!complianceForm.fssaiLicense.trim()) return;
    setVerifyingFssai(true);
    setFssaiVerifyResult(null);
    try {
      const res = await apiRequest("POST", "/api/verify/fssai", { fssaiLicense: complianceForm.fssaiLicense });
      const data = await res.json();
      setFssaiVerifyResult(data);
      if (data.verified || data.formatValid) {
        const updates: any = {};
        if (data.registrationDate && !complianceForm.fssaiRegistrationDate) {
          updates.fssaiRegistrationDate = data.registrationDate;
        }
        if (data.expiryDate && !complianceForm.fssaiExpiryDate) {
          updates.fssaiExpiryDate = data.expiryDate;
        } else if (!complianceForm.fssaiExpiryDate) {
          const oneYearLater = new Date();
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
          updates.fssaiExpiryDate = oneYearLater.toISOString().split('T')[0];
        }
        if (Object.keys(updates).length > 0) {
          setComplianceForm(prev => ({ ...prev, ...updates }));
        }
      }
    } catch {
      setFssaiVerifyResult({ error: true });
    }
    setVerifyingFssai(false);
  };

  const handleVerifyIfsc = async () => {
    if (!bankForm.bankIfscCode.trim()) return;
    setVerifyingIfsc(true);
    setIfscVerifyResult(null);
    try {
      const res = await apiRequest("POST", "/api/verify/ifsc", { ifscCode: bankForm.bankIfscCode });
      const data = await res.json();
      if (data.verified) {
        setBankForm(prev => ({
          ...prev,
          bankName: data.bankName || prev.bankName,
          bankBranch: data.branch || prev.bankBranch,
        }));
        setIfscVerifyResult(`Verified: ${data.bankName || ""} - ${data.branch || ""}`);
      } else {
        setIfscVerifyResult("Invalid IFSC code");
      }
    } catch {
      setIfscVerifyResult("Verification request failed");
    }
    setVerifyingIfsc(false);
  };

  const maskAccountNumber = (num: string) => {
    if (!num || num.length <= 4) return num || "";
    return "••••" + num.slice(-4);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({ name: name.trim(), phone: phone.trim() });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast({ title: "Error", description: "Current password is required.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const openAddDp = () => {
    setEditingDp(null);
    setProofData(null);
    setDpForm({
      ...emptyForm,
      businessId: (user as any)?.businessCode || '',
      route: effectiveBusinessRoute,
      pointName: effectiveBusinessPoint,
      contactName: user.name,
      contactPhone: user.phone || "",
    });
    setRouteSearch('');
    setPointSearch('');
    setShowRouteDropdown(false);
    setShowPointDropdown(false);
    setDpDialogOpen(true);
  };

  const openEditDp = (dp: DeliveryPoint) => {
    setEditingDp(dp);
    setDpForm({
      businessId: dp.businessId || "",
      pointName: dp.pointName,
      contactName: dp.contactName || "",
      contactPhone: dp.contactPhone || "",
      route: dp.route || "",
      deliveryAddress: dp.deliveryAddress,
      latitude: dp.latitude ? Number(dp.latitude) : null,
      longitude: dp.longitude ? Number(dp.longitude) : null,
      isDefault: dp.isDefault || false,
    });
    setDpDialogOpen(true);
  };

  const handleSaveDp = () => {
    if (!dpForm.pointName.trim()) {
      toast({ title: "Error", description: "Point name is required.", variant: "destructive" });
      return;
    }
    if (!dpForm.deliveryAddress.trim()) {
      toast({ title: "Error", description: "Delivery address is required.", variant: "destructive" });
      return;
    }
    if (editingDp) {
      updateDpMutation.mutate({ id: editingDp.id, data: dpForm });
    } else {
      createDpMutation.mutate(dpForm);
    }
  };

  const pricingTiers: { segment: string; role: string; icon: any; color: string }[] = [];
  if (user.freshMilkPricingRole && user.freshMilkPricingRole !== "MRP") {
    pricingTiers.push({ segment: "Fresh Milk", role: user.freshMilkPricingRole, icon: Milk, color: "text-blue-600 bg-blue-50" });
  }
  if (user.productsPricingRole && user.productsPricingRole !== "MRP") {
    pricingTiers.push({ segment: "Products", role: user.productsPricingRole, icon: Package, color: "text-green-600 bg-green-50" });
  }
  if (user.pricingRole && user.pricingRole !== "MRP" && !pricingTiers.length) {
    pricingTiers.push({ segment: "All Products", role: user.pricingRole, icon: Package, color: "text-orange-600 bg-orange-50" });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 page-content">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-2 text-xs text-gray-400 min-h-9" onClick={() => navigate("/")}>
          <ArrowLeft className="h-3 w-3 mr-1" />
          Home
        </Button>

        <div className="space-y-4 sm:space-y-6">

          {/* 1. Header Section */}
          <div className="flex items-center gap-4 p-4 sm:p-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Hi, {user.name?.split(' ')[0] || 'User'}!</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 text-xs">{ROLE_LABELS[user.role] || user.role}</Badge>
                {user.agentCode && <Badge variant="outline" className="text-xs">Code: {user.agentCode}</Badge>}
              </div>
            </div>
          </div>

          {/* 2. Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-3 px-1">
            <Link href="/orders">
              <button className="w-full flex flex-col items-center gap-2 p-4 bg-teal-50 dark:bg-teal-950 rounded-2xl hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors">
                <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Orders</span>
              </button>
            </Link>
            <button onClick={() => toggleSection('addresses')} className="w-full flex flex-col items-center gap-2 p-4 bg-teal-50 dark:bg-teal-950 rounded-2xl hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors">
              <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Addresses</span>
            </button>
            <button onClick={() => toggleSection('payment')} className="w-full flex flex-col items-center gap-2 p-4 bg-teal-50 dark:bg-teal-950 rounded-2xl hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors">
              <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Payment</span>
            </button>
          </div>

          {/* 3. Completion Banner */}
          {showCompletionBanner && isB2B && deliveryPoints.length === 0 && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
              <CardContent className="p-3 sm:py-4 sm:px-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-100">Complete Your Profile</h3>
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Add your first delivery point so we know where to deliver your orders.
                    </p>
                    <Button size="sm" className="mt-2 min-h-11 sm:min-h-9" onClick={openAddDp}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Delivery Point
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowCompletionBanner(false)} className="text-amber-600 min-h-11 sm:min-h-9">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. B2B Business Details Section */}
          {((user as any).businessName || (user as any).district || (user as any).businessCode) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  Business Details
                </h2>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {(user as any).businessName && (
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{(user as any).businessName}</h3>
                      {(user as any).businessType && <p className="text-xs text-gray-500">{(user as any).businessType}</p>}
                      {(user as any).businessCode && (
                        <Badge variant="outline" className="mt-1 font-mono text-xs">{(user as any).businessCode}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {(user as any).district && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">District</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{(user as any).district}</p>
                    </div>
                  )}
                  {(user as any).districtUnion && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">District Union</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{(user as any).districtUnion}</p>
                    </div>
                  )}
                  {(user as any).office && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">Office</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{(user as any).office}</p>
                    </div>
                  )}
                  {effectiveBusinessRoute && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">Route</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{effectiveBusinessRoute}</p>
                    </div>
                  )}
                  {effectiveBusinessPoint && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">Point</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{effectiveBusinessPoint}</p>
                    </div>
                  )}
                  {(user as any).businessTypeCode && (
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">Type Code</p>
                      <p className="font-medium font-mono text-gray-900 dark:text-white mt-0.5">{(user as any).businessTypeCode}</p>
                    </div>
                  )}
                </div>

                {(user as any).businessAddress && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Business Address</p>
                        <p className="text-sm text-gray-900 dark:text-white">{(user as any).businessAddress}</p>
                        {(user as any).addressLat && (user as any).addressLng && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {Number((user as any).addressLat).toFixed(5)}, {Number((user as any).addressLng).toFixed(5)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(user as any).addressLat && (user as any).addressLng && mapsApiKey && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <iframe
                      width="100%"
                      height="180"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${(user as any).addressLat},${(user as any).addressLng}&zoom=15`}
                      allowFullScreen
                    />
                  </div>
                )}

                {pricingTiers.length > 0 && (
                  <div>
                    <Separator className="mb-4" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pricing Tiers</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pricingTiers.map((tier) => (
                        <div key={tier.segment} className={`flex items-center gap-3 p-3 rounded-lg ${tier.color}`}>
                          <tier.icon className="h-5 w-5" />
                          <div>
                            <p className="text-xs font-medium opacity-70">{tier.segment}</p>
                            <p className="text-sm font-semibold">{PRICING_LABELS[tier.role] || tier.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.unionId && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Building2 className="h-4 w-4" />
                    <span>Associated Union: {(() => {
                      const fullName = merchants?.find((m: any) => m.id === user.unionId)?.restaurantName;
                      if (fullName) {
                        const i = fullName.indexOf(' District');
                        return i !== -1 ? fullName.slice(0, i) + ' Union' : fullName;
                      }
                      // Friendly fallback for any legacy UNI-* IDs still in session
                      const legacyMap: Record<string, string> = {
                        'UNI-SLM-01': 'Salem Union', 'UNI-CBE-01': 'Coimbatore Union',
                        'UNI-ERO-01': 'Erode Union', 'UNI-MDU-01': 'Madurai Union',
                        'UNI-TRY-01': 'Trichy Union', 'UNI-TNJ-01': 'Thanjavur Union',
                      };
                      return legacyMap[user.unionId] || user.unionId;
                    })()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show pricing tiers for non-B2B users who have them */}
          {!((user as any).businessName || (user as any).district || (user as any).businessCode) && pricingTiers.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pricing Tiers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pricingTiers.map((tier) => (
                  <div key={tier.segment} className={`flex items-center gap-3 p-3 rounded-lg ${tier.color}`}>
                    <tier.icon className="h-5 w-5" />
                    <div>
                      <p className="text-xs font-medium opacity-70">{tier.segment}</p>
                      <p className="text-sm font-semibold">{PRICING_LABELS[tier.role] || tier.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. My Account Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Account</h2>
            </div>

            {/* Addresses */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => toggleSection('addresses')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">Addresses</span>
                  {deliveryPoints.length > 0 && <Badge variant="secondary" className="text-xs">{deliveryPoints.length}</Badge>}
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedSection === 'addresses' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSection === 'addresses' && (
                <div className="px-4 pb-4">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={openAddDp}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {dpLoading ? (
                    <div className="text-center py-6 text-gray-400">Loading delivery points...</div>
                  ) : deliveryPoints.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      <MapPin className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No delivery points yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add your first delivery location to get started</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={openAddDp}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Delivery Point
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deliveryPoints.map((dp) => (
                        <div
                          key={dp.id}
                          className={`p-4 rounded-lg border ${dp.isDefault ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{dp.pointName}</h4>
                                {dp.isDefault && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    <Star className="h-3 w-3 mr-1" />Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{dp.deliveryAddress}</p>
                              {(dp as any).locationPhotoUrl && (
                                <div className="flex items-center gap-2 mt-2">
                                  <img src={(dp as any).locationPhotoUrl} alt="Location proof" className="h-10 w-14 rounded object-cover border" />
                                  <div className="flex flex-wrap gap-1">
                                    {(dp as any).accuracyGrade && (
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                        (dp as any).accuracyGrade === 'good' ? 'border-green-300 text-green-700 bg-green-50' :
                                        (dp as any).accuracyGrade === 'ok' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                        'border-red-300 text-red-700 bg-red-50'
                                      }`}>
                                        <Signal className="h-2.5 w-2.5 mr-0.5" />
                                        {(dp as any).accuracyGrade === 'good' ? '≤30m' : (dp as any).accuracyGrade === 'ok' ? '≤50m' : '>50m'}
                                      </Badge>
                                    )}
                                    {(dp as any).proofStatus && (
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                        (dp as any).proofStatus === 'verified' ? 'border-green-300 text-green-700 bg-green-50' :
                                        (dp as any).proofStatus === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                                        (dp as any).proofStatus === 'rejected_need_retake' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                        'border-blue-300 text-blue-700 bg-blue-50'
                                      }`}>
                                        {(dp as any).proofStatus === 'verified' ? 'Verified' :
                                         (dp as any).proofStatus === 'rejected' ? 'Rejected' :
                                         (dp as any).proofStatus === 'rejected_need_retake' ? 'Retake Needed' : 'Pending'}
                                      </Badge>
                                    )}
                                    {Number((dp as any).suspicionScore) > 50 && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-700 bg-red-50">
                                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                        Suspicious
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(dp as any).proofStatus === 'rejected_need_retake' && (
                                <Button size="sm" variant="outline" className="mt-2 text-xs h-7 text-orange-600 border-orange-300"
                                  onClick={() => openEditDp(dp)}>
                                  <Camera className="h-3 w-3 mr-1" />
                                  Retake Photo
                                </Button>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                                {dp.businessId && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />{dp.businessId}
                                  </span>
                                )}
                                {dp.route && (
                                  <span className="flex items-center gap-1">
                                    <Navigation className="h-3 w-3" />{dp.route}
                                  </span>
                                )}
                                {dp.contactName && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />{dp.contactName}
                                  </span>
                                )}
                                {dp.contactPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />{dp.contactPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!dp.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => setDefaultMutation.mutate(dp.id)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDp(dp)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm("Remove this delivery point?")) {
                                    deleteDpMutation.mutate(dp.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment methods */}
            {isB2B && (
              <div className="border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => toggleSection('payment')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium">Payment methods</span>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedSection === 'payment' ? 'rotate-90' : ''}`} />
                </button>
                {expandedSection === 'payment' && (
                  <div className="px-4 pb-4">
                    <div className="flex justify-end mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!editingBank) {
                            setBankForm({
                              accountHolderName: user.accountHolderName || "",
                              bankAccountNumber: user.bankAccountNumber || "",
                              bankIfscCode: user.bankIfscCode || "",
                              accountType: user.accountType || "savings",
                              bankName: user.bankName || "",
                              bankBranch: user.bankBranch || "",
                              upiId: user.upiId || "",
                            });
                            setIfscVerifyResult(null);
                          }
                          setEditingBank(!editingBank);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {editingBank ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                    {editingBank ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Account Holder Name</Label>
                          <Input
                            value={bankForm.accountHolderName}
                            onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                            placeholder="Name as per bank account"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input
                            value={bankForm.bankAccountNumber}
                            onChange={(e) => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                            placeholder="Bank account number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Select value={bankForm.accountType} onValueChange={(val) => setBankForm({ ...bankForm, accountType: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="current">Current</SelectItem>
                              <SelectItem value="overdraft">Overdraft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>IFSC Code</Label>
                          <div className="flex gap-2">
                            <Input
                              value={bankForm.bankIfscCode}
                              onChange={(e) => setBankForm({ ...bankForm, bankIfscCode: e.target.value.toUpperCase() })}
                              placeholder="e.g. SBIN0001234"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={handleVerifyIfsc} disabled={verifyingIfsc || !bankForm.bankIfscCode.trim()}>
                              {verifyingIfsc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                          {ifscVerifyResult && (
                            <p className={`text-xs flex items-center gap-1 ${ifscVerifyResult.startsWith("Verified") ? "text-green-600" : "text-amber-600"}`}>
                              {ifscVerifyResult.startsWith("Verified") ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {ifscVerifyResult}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                              value={bankForm.bankName}
                              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                              placeholder="Bank name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch</Label>
                            <Input
                              value={bankForm.bankBranch}
                              onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
                              placeholder="Branch name"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>UPI ID</Label>
                          <Input
                            value={bankForm.upiId}
                            onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                            placeholder="e.g. name@upi"
                          />
                        </div>
                        <Button onClick={() => saveBankMutation.mutate(bankForm)} disabled={saveBankMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {saveBankMutation.isPending ? "Saving..." : "Save Bank Details"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Account Holder</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{user.accountHolderName || "Not provided"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Account Number</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{user.bankAccountNumber ? maskAccountNumber(user.bankAccountNumber) : "Not provided"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Account Type</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{user.accountType || "Not provided"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">IFSC Code</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{user.bankIfscCode || "Not provided"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Bank & Branch</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {user.bankName ? `${user.bankName}${user.bankBranch ? ` - ${user.bankBranch}` : ""}` : "Not provided"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">UPI ID</span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{user.upiId || "Not provided"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Compliance & Certificates */}
            {isB2B && (
              <div>
                <button onClick={() => toggleSection('compliance')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium">Compliance & Certificates</span>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedSection === 'compliance' ? 'rotate-90' : ''}`} />
                </button>
                {expandedSection === 'compliance' && (
                  <div className="px-4 pb-4">
                    <div className="flex justify-end mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!editingCompliance) {
                            setComplianceForm({
                              gstNumber: user.gstNumber || "",
                              panNumber: user.panNumber || "",
                              fssaiLicense: user.fssaiLicense || "",
                              tradeLicense: user.tradeLicense || "",
                              msmeNumber: user.msmeNumber || "",
                              gstExpiryDate: user.gstExpiryDate || "",
                              fssaiExpiryDate: user.fssaiExpiryDate || "",
                              tradeLicenseExpiryDate: user.tradeLicenseExpiryDate || "",
                              msmeExpiryDate: user.msmeExpiryDate || "",
                              gstRegistrationDate: user.gstRegistrationDate || "",
                              fssaiRegistrationDate: user.fssaiRegistrationDate || "",
                              tradeLicenseRegistrationDate: user.tradeLicenseRegistrationDate || "",
                              msmeRegistrationDate: user.msmeRegistrationDate || "",
                            });
                            setGstVerifyResult(null);
                            setPanVerifyResult(null);
                            setFssaiVerifyResult(null);
                          }
                          setEditingCompliance(!editingCompliance);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {editingCompliance ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                    {!editingCompliance && (() => {
                      const expiringCerts = [
                        { name: 'GST Certificate', date: user.gstExpiryDate },
                        { name: 'FSSAI License', date: user.fssaiExpiryDate },
                        { name: 'Trade License', date: user.tradeLicenseExpiryDate },
                        { name: 'MSME Registration', date: user.msmeExpiryDate },
                      ].filter(c => {
                        if (!c.date || c.date === "9999-12-31") return false;
                        const days = Math.ceil((new Date(c.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return days <= 30;
                      });
                      return expiringCerts.length > 0 ? (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                            <AlertCircle className="h-4 w-4" />
                            Renewal Alert
                          </div>
                          {expiringCerts.map(c => {
                            const days = Math.ceil((new Date(c.date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <div key={c.name} className={`text-xs ${days < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                {c.name}: {days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`} ({c.date})
                              </div>
                            );
                          })}
                        </div>
                      ) : null;
                    })()}
                    {editingCompliance ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>GST Number</Label>
                          <div className="flex gap-2">
                            <Input
                              value={complianceForm.gstNumber}
                              onChange={(e) => setComplianceForm({ ...complianceForm, gstNumber: e.target.value.toUpperCase() })}
                              placeholder="e.g. 22AAAAA0000A1Z5"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={handleVerifyGst} disabled={verifyingGst || !complianceForm.gstNumber.trim()}>
                              {verifyingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                          {gstVerifyResult && !gstVerifyResult.error && (
                            <div className={`text-xs p-2 rounded space-y-1 ${gstVerifyResult.verified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              {gstVerifyResult.verified ? (
                                <>
                                  <div className="font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {gstVerifyResult.businessName}</div>
                                  {gstVerifyResult.tradeName && gstVerifyResult.tradeName !== gstVerifyResult.businessName && <div>Trade: {gstVerifyResult.tradeName}</div>}
                                  <div>Status: {gstVerifyResult.status} | {gstVerifyResult.businessType} | {gstVerifyResult.stateName}</div>
                                  {gstVerifyResult.address && <div className="text-[10px] opacity-80">{gstVerifyResult.address}</div>}
                                </>
                              ) : (
                                <>
                                  <div className="font-semibold">Format Valid - {gstVerifyResult.stateName}</div>
                                  <div>Entity: {gstVerifyResult.entityType} | PAN: {gstVerifyResult.panFromGst}</div>
                                  <div className="text-[10px] opacity-80">Online portal could not be reached. Please verify details match your GST certificate.</div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>GST Registration Date</Label>
                          <Input
                            type="date"
                            value={complianceForm.gstRegistrationDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, gstRegistrationDate: e.target.value })}
                          />
                          {complianceForm.gstRegistrationDate && <p className="text-[10px] text-gray-500">Auto-filled from verification. Adjust if needed.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>GST Certificate Valid Until</Label>
                          {complianceForm.gstExpiryDate === "9999-12-31" ? (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-blue-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Valid until cancelled/surrendered (auto-detected)</p>
                              <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => setComplianceForm(prev => ({ ...prev, gstExpiryDate: "" }))}>Set custom date</Button>
                            </div>
                          ) : (
                            <Input
                              type="date"
                              value={complianceForm.gstExpiryDate}
                              onChange={(e) => setComplianceForm({ ...complianceForm, gstExpiryDate: e.target.value })}
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>PAN Number</Label>
                          <div className="flex gap-2">
                            <Input
                              value={complianceForm.panNumber}
                              onChange={(e) => setComplianceForm({ ...complianceForm, panNumber: e.target.value.toUpperCase() })}
                              placeholder="e.g. ABCDE1234F"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={handleVerifyPan} disabled={verifyingPan || !complianceForm.panNumber.trim()}>
                              {verifyingPan ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                          {panVerifyResult && (
                            <p className={`text-xs flex items-center gap-1 ${panVerifyResult.startsWith("Verified") ? "text-green-600" : "text-amber-600"}`}>
                              {panVerifyResult.startsWith("Verified") ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {panVerifyResult}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>FSSAI License</Label>
                          <div className="flex gap-2">
                            <Input
                              value={complianceForm.fssaiLicense}
                              onChange={(e) => setComplianceForm({ ...complianceForm, fssaiLicense: e.target.value })}
                              placeholder="e.g. 10012345678901"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={handleVerifyFssai} disabled={verifyingFssai || !complianceForm.fssaiLicense.trim()}>
                              {verifyingFssai ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                          </div>
                          {fssaiVerifyResult && !fssaiVerifyResult.error && (
                            <div className={`text-xs p-2 rounded space-y-1 ${fssaiVerifyResult.verified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              <div className="font-semibold flex items-center gap-1">
                                {fssaiVerifyResult.verified ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                {fssaiVerifyResult.verified ? `${fssaiVerifyResult.licenseType} - ${fssaiVerifyResult.state}` : 'Format validation failed'}
                              </div>
                              {fssaiVerifyResult.verified && (
                                <div className="text-[10px] opacity-80">
                                  {fssaiVerifyResult.issueYear && `Issued: ${fssaiVerifyResult.issueYear} · `}
                                  FSSAI license format verified. Please confirm details match your certificate.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>FSSAI Registration Date</Label>
                          <Input
                            type="date"
                            value={complianceForm.fssaiRegistrationDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, fssaiRegistrationDate: e.target.value })}
                          />
                          {complianceForm.fssaiRegistrationDate && <p className="text-[10px] text-gray-500">Auto-filled from verification. Adjust if needed.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>FSSAI License Valid Until</Label>
                          <Input
                            type="date"
                            value={complianceForm.fssaiExpiryDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, fssaiExpiryDate: e.target.value })}
                          />
                          {complianceForm.fssaiExpiryDate && <p className="text-[10px] text-gray-500">Auto-set to 1 year. Adjust to match your certificate's "Valid Upto" date.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Trade License</Label>
                          <Input
                            value={complianceForm.tradeLicense}
                            onChange={(e) => setComplianceForm({ ...complianceForm, tradeLicense: e.target.value })}
                            placeholder="Trade license number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Trade License Registration Date</Label>
                          <Input
                            type="date"
                            value={complianceForm.tradeLicenseRegistrationDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, tradeLicenseRegistrationDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Trade License Valid Until</Label>
                          <Input
                            type="date"
                            value={complianceForm.tradeLicenseExpiryDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, tradeLicenseExpiryDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>MSME Registration (Udyam)</Label>
                          <div className="flex gap-2">
                            <Input
                              value={complianceForm.msmeNumber}
                              onChange={(e) => setComplianceForm({ ...complianceForm, msmeNumber: e.target.value.toUpperCase() })}
                              placeholder="UDYAM-TN-00-0000000"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={async () => {
                              if (!complianceForm.msmeNumber) return;
                              try {
                                const res = await apiRequest("POST", "/api/verify/msme", { msmeNumber: complianceForm.msmeNumber });
                                const data = await res.json();
                                if (data.verified || data.formatValid) {
                                  toast({ title: "MSME Verified", description: data.stateName ? `${data.enterpriseType || 'Enterprise'} - ${data.stateName}` : data.message || "Format valid" });
                                  if (!complianceForm.msmeRegistrationDate && data.verificationDate) {
                                    setComplianceForm(prev => ({ ...prev, msmeRegistrationDate: data.verificationDate, msmeExpiryDate: prev.msmeExpiryDate || "9999-12-31" }));
                                  } else if (!complianceForm.msmeExpiryDate) {
                                    setComplianceForm(prev => ({ ...prev, msmeExpiryDate: "9999-12-31" }));
                                  }
                                }
                              } catch { toast({ title: "Verification failed", variant: "destructive" }); }
                            }}>Verify</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>MSME Registration Date</Label>
                          <Input
                            type="date"
                            value={complianceForm.msmeRegistrationDate}
                            onChange={(e) => setComplianceForm({ ...complianceForm, msmeRegistrationDate: e.target.value })}
                          />
                          {complianceForm.msmeRegistrationDate && <p className="text-[10px] text-gray-500">Auto-filled from verification. Adjust if needed.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>MSME Registration Valid Until</Label>
                          {complianceForm.msmeExpiryDate === "9999-12-31" ? (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-blue-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> No Expiry - Perpetual Registration (auto-detected)</p>
                              <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => setComplianceForm(prev => ({ ...prev, msmeExpiryDate: "" }))}>Set custom date</Button>
                            </div>
                          ) : (
                            <Input
                              type="date"
                              value={complianceForm.msmeExpiryDate}
                              onChange={(e) => setComplianceForm({ ...complianceForm, msmeExpiryDate: e.target.value })}
                            />
                          )}
                        </div>
                        <Button onClick={() => saveComplianceMutation.mutate(complianceForm)} disabled={saveComplianceMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {saveComplianceMutation.isPending ? "Saving..." : "Save Compliance Details"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium">GST Number</span>
                            </div>
                            <div className="flex items-center gap-2 pl-6 sm:pl-0">
                              <span className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.gstNumber || "Not provided"}</span>
                              {user.gstNumber && (
                                user.gstVerified ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
                                )
                              )}
                            </div>
                          </div>
                          {user.gstRegistrationDate && (
                            <div className="text-xs text-gray-500">Registered: {user.gstRegistrationDate}</div>
                          )}
                          {user.gstExpiryDate && (() => {
                            const status = getExpiryStatus(user.gstExpiryDate, 'Valid until cancelled/surrendered');
                            return status ? (
                              <div className={`text-xs flex items-center gap-1 ${status.color}`}>
                                {status.urgent ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {status.label}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium">PAN Number</span>
                            </div>
                            <div className="flex items-center gap-2 pl-6 sm:pl-0">
                              <span className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.panNumber || "Not provided"}</span>
                              {user.panNumber && (
                                user.panVerified ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium">FSSAI License</span>
                            </div>
                            <div className="flex items-center gap-2 pl-6 sm:pl-0">
                              <span className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.fssaiLicense || "Not provided"}</span>
                              {user.fssaiLicense && (
                                user.fssaiVerified ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
                                )
                              )}
                            </div>
                          </div>
                          {user.fssaiRegistrationDate && (
                            <div className="text-xs text-gray-500">Registered: {user.fssaiRegistrationDate}</div>
                          )}
                          {user.fssaiExpiryDate && (() => {
                            const status = getExpiryStatus(user.fssaiExpiryDate);
                            return status ? (
                              <div className={`text-xs flex items-center gap-1 ${status.color}`}>
                                {status.urgent ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {status.label}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium">Trade License</span>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 pl-6 sm:pl-0 break-all">{user.tradeLicense || "Not provided"}</span>
                          </div>
                          {user.tradeLicenseRegistrationDate && (
                            <div className="text-xs text-gray-500">Registered: {user.tradeLicenseRegistrationDate}</div>
                          )}
                          {user.tradeLicenseExpiryDate && (() => {
                            const status = getExpiryStatus(user.tradeLicenseExpiryDate);
                            return status ? (
                              <div className={`text-xs flex items-center gap-1 ${status.color}`}>
                                {status.urgent ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {status.label}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium">MSME Registration</span>
                            </div>
                            <div className="flex items-center gap-2 pl-6 sm:pl-0">
                              <span className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.msmeNumber || "Not provided"}</span>
                              {user.msmeNumber && (
                                user.msmeVerified ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
                                )
                              )}
                            </div>
                          </div>
                          {user.msmeRegistrationDate && (
                            <div className="text-xs text-gray-500">Registered: {user.msmeRegistrationDate}</div>
                          )}
                          {user.msmeExpiryDate && (() => {
                            const status = getExpiryStatus(user.msmeExpiryDate, 'No Expiry (Perpetual Registration)');
                            return status ? (
                              <div className={`text-xs flex items-center gap-1 ${status.color}`}>
                                {status.urgent ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {status.label}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Settings Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h2>
            </div>

            {/* Edit Profile */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => toggleSection('editProfile')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedSection === 'editProfile' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSection === 'editProfile' && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
                    <p className="text-xs text-gray-400">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>

            {/* Change Password */}
            <div>
              <button onClick={() => toggleSection('changePassword')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">Change Password</span>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedSection === 'changePassword' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSection === 'changePassword' && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowNewPw(!showNewPw)}
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 7. More Information Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More Information</h2>
            </div>
            <Link href="/privacy">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">Privacy Policy</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
            <Link href="/terms">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">Terms and Conditions</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
            <Link href="/about">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">About Us</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* 8. Logout Button */}
          <div className="pb-8">
            <Button
              variant="outline"
              className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950"
              onClick={async () => {
                try {
                  await apiRequest("POST", "/api/auth/logout");
                  queryClient.clear();
                  setUser(null);
                  navigate("/login");
                } catch {
                  queryClient.clear();
                  setUser(null);
                  navigate("/login");
                }
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dpDialogOpen} onOpenChange={setDpDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg w-[calc(100%-2rem)] sm:w-full rounded-lg">
          <DialogHeader>
            <DialogTitle>{editingDp ? "Edit Delivery Point" : "Add Delivery Point"}</DialogTitle>
            <DialogDescription>
              {editingDp ? "Update your delivery point details" : "Add a new delivery location"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Business ID</Label>
                <Input
                  value={dpForm.businessId}
                  onChange={(e) => setDpForm({ ...dpForm, businessId: e.target.value })}
                  placeholder="e.g. DLR-101"
                />
              </div>
              <div className="space-y-2 relative">
                <Label>Route</Label>
                <Input
                  value={dpForm.route}
                  onChange={(e) => {
                    setDpForm({ ...dpForm, route: e.target.value });
                    setRouteSearch(e.target.value);
                    setShowRouteDropdown(true);
                  }}
                  onFocus={() => { setRouteSearch(dpForm.route); setShowRouteDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowRouteDropdown(false), 200)}
                  placeholder="Type or select route"
                  autoComplete="off"
                />
                {showRouteDropdown && filteredRoutes.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredRoutes.map((r) => (
                      <div
                        key={r}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700"
                        onMouseDown={() => {
                          setDpForm({ ...dpForm, route: r });
                          setShowRouteDropdown(false);
                        }}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>Point Name *</Label>
              <Input
                value={dpForm.pointName}
                onChange={(e) => {
                  setDpForm({ ...dpForm, pointName: e.target.value });
                  setPointSearch(e.target.value);
                  setShowPointDropdown(true);
                }}
                onFocus={() => { setPointSearch(dpForm.pointName); setShowPointDropdown(true); }}
                onBlur={() => setTimeout(() => setShowPointDropdown(false), 200)}
                placeholder="Type or select point name"
                autoComplete="off"
              />
              {showPointDropdown && filteredPoints.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredPoints.map((p) => (
                    <div
                      key={p}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700"
                      onMouseDown={() => {
                        setDpForm({ ...dpForm, pointName: p });
                        setShowPointDropdown(false);
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={dpForm.contactName}
                  onChange={(e) => setDpForm({ ...dpForm, contactName: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={dpForm.contactPhone}
                  onChange={(e) => setDpForm({ ...dpForm, contactPhone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
            <AddressCapture
              value={dpForm.deliveryAddress}
              onChange={(addr) => setDpForm({ ...dpForm, deliveryAddress: addr })}
              onCoordinatesChange={(lat, lng) => setDpForm({ ...dpForm, latitude: lat, longitude: lng })}
              latitude={dpForm.latitude}
              longitude={dpForm.longitude}
              userRole={user.role}
              onProofDataChange={(data) => {
                setProofData(data);
                if (data.lat && data.lng) {
                  setDpForm(prev => ({
                    ...prev,
                    latitude: data.lat,
                    longitude: data.lng,
                    deliveryAddress: data.address || prev.deliveryAddress,
                  }));
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDpDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveDp}
              disabled={createDpMutation.isPending || updateDpMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createDpMutation.isPending || updateDpMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
