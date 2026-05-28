import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import AddressCapture from "@/components/address-capture";
import {
  Building2, User, Phone, MapPin, FileText, Milk,
  Package, IceCream, Shield, ArrowLeft, ArrowRight, CheckCircle,
  Briefcase, CreditCard, Store, Hotel, Factory, MapPinned, Hash, ChevronDown
} from "lucide-react";

function ComboboxInput({ value, onChange, options, placeholder, label }: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes((search || value).toLowerCase()));

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>}
      <div className="relative">
        <Input
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => { setOpen(true); setSearch(value); }}
          placeholder={placeholder}
          className="text-base pr-8"
        />
        <button type="button" onClick={() => setOpen(!open)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${opt === value ? 'bg-blue-100 font-medium' : ''}`}
              onClick={() => { onChange(opt); setSearch(''); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BUSINESS_TYPES = [
  { value: "WSD", code: "AA", label: "WSD (Wholesale Dealer)", icon: Package },
  { value: "Dealer / Agent", code: "AA", label: "Dealer / Agent", icon: Briefcase },
  { value: "MPCS", code: "MP", label: "MPCS", icon: Building2 },
  { value: "Hotel", code: "HT", label: "Hotel", icon: Hotel },
  { value: "Institution", code: "IN", label: "Institution", icon: Factory },
  { value: "Private Parlour", code: "PP", label: "Private Parlour", icon: Store },
  { value: "Union Parlour", code: "UP", label: "Union Parlour", icon: Store },
  { value: "General Shop / Retail", code: "GS", label: "General Shop / Retail", icon: Store },
];

const PRICING_TIERS: Record<string, string> = {
  M: "MRP (Consumer Price)",
  R: "RETAILER",
  D: "DEALER",
  W: "WSD (Wholesale Dealer)",
  U: "DISTRICT UNION",
  F: "FEDERATION",
  X: "No Access",
};

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram",
  "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam",
  "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram",
  "Ranipet", "Salem", "Sivagangai", "Tenkasi", "Thanjavur",
  "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur",
  "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
  "Viluppuram", "Virudhunagar"
];

const TOTAL_STEPS = 8;

export default function B2BRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    district: "",
    districtUnion: "",
    office: "",
    businessType: "",
    businessTypeCode: "",
    businessRoute: "",
    businessPoint: "",
    businessName: "",
    address: "",
    addressLat: null as number | null,
    addressLng: null as number | null,
    phone: "",
    mobile2: "",
    gstin: "",
    panNumber: "",
    aadhaarNumber: "",
    fssaiLicense: "",
    msmeUdyam: "",
    freshMilkSegment: false,
    productsSegment: false,
    iceCreamSegment: false,
    freshMilkTier: "",
    productTier: "",
    iceCreamTier: "",
    securityDeposit: "",
    contactName: "",
    role: "b2b",
    email: "",
    notes: "",
  });

  const { data: merchantsData } = useQuery<any[]>({
    queryKey: ['/api/merchants'],
  });

  const { data: routesPointsData } = useQuery<{
    routes: string[];
    points: string[];
    routePointMap: Record<string, string[]>;
    codeMap: Record<string, { route: string; point: string }>;
  }>({
    queryKey: ['/api/b2b/routes-points'],
  });

  const allRoutes = routesPointsData?.routes || [];
  const allPoints = routesPointsData?.points || [];
  const routePointMap = routesPointsData?.routePointMap || {};
  const codeMap = routesPointsData?.codeMap || {};

  const pointsForSelectedRoute = formData.businessRoute && routePointMap[formData.businessRoute]
    ? routePointMap[formData.businessRoute]
    : allPoints;

  const merchants = merchantsData || [];

  const getUnionName = (id: string) => {
    const m = merchants.find((m: any) => m.id === id);
    return m ? m.name : id;
  };

  const unionsByDistrict = formData.district
    ? merchants.filter((m: any) => m.district?.toLowerCase() === formData.district.toLowerCase())
    : merchants;

  const normalizeRole = (bt: string) => {
    const map: Record<string, string> = {
      "WSD": "wsd",
      "Dealer / Agent": "dealer_/_agent",
      "MPCS": "mpcs",
      "Hotel": "hotel",
      "Institution": "institution",
      "Private Parlour": "private_parlour",
      "Union Parlour": "union_parlour",
      "General Shop / Retail": "general_shop_/_retail",
    };
    return map[bt] || "b2b";
  };

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        role: normalizeRole(data.businessType),
        iceCreamTier: data.productTier || data.iceCreamTier,
        iceCreamSegment: data.productsSegment ? true : data.iceCreamSegment,
      };
      const res = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }
      return result;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      toast({ title: "Registration Submitted!", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Registration Error", description: err.message || "Failed to submit registration", variant: "destructive" });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectBusinessType = (bt: typeof BUSINESS_TYPES[0]) => {
    setFormData(prev => ({
      ...prev,
      businessType: bt.value,
      businessTypeCode: bt.code,
    }));
  };

  const canProceedStep = (s: number): boolean => {
    switch (s) {
      case 1: return !!formData.district && !!formData.districtUnion;
      case 2: return !!formData.businessType;
      case 3: return true;
      case 4: return !!formData.businessName;
      case 5: return !!formData.phone;
      case 6: return true;
      case 7: return formData.freshMilkSegment || formData.productsSegment || formData.iceCreamSegment;
      case 8: return true;
      default: return true;
    }
  };

  const stepLabels = [
    "Union & Office",
    "Business Type",
    "Location",
    "Identity",
    "Contact",
    "Documents",
    "Segments",
    "Finance",
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-3 sm:px-4 py-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-4 sm:p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-green-800">Registration Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering as a <strong>{formData.businessType}</strong> under <strong>{getUnionName(formData.districtUnion)}</strong>.
              Our admin team will review your application.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal pl-4">
                <li>Admin reviews your business details &amp; documents</li>
                <li>Admin assigns pricing tier and segment access</li>
                <li>Admin maps you to the hierarchy (WSD/Federation/Union)</li>
                <li>You receive approval notification with login credentials</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Button>
              <Button className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700" onClick={() => { setSubmitted(false); setStep(1); setFormData({...formData, businessType: "", district: "", districtUnion: ""}); }}>
                Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Milk className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Aavin B2B Registration</h1>
              <p className="text-xs text-gray-500">Tamil Nadu Cooperative Milk Producers' Federation</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { if (s < step) setStep(s); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
                    step > s ? 'bg-green-500 text-white cursor-pointer' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? '✓' : s}
                </button>
                <span className={`text-xs hidden md:block whitespace-nowrap ${step === s ? 'text-blue-700 font-semibold' : step > s ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {s < TOTAL_STEPS && <div className={`w-4 md:w-8 h-0.5 ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Step 1 — Choose Union & Office
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">1. District *</label>
                  <Select value={formData.district} onValueChange={(v) => { updateField('district', v); updateField('districtUnion', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                    <SelectContent>
                      {TAMIL_NADU_DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">2. District Union *</label>
                  <Select value={formData.districtUnion} onValueChange={(v) => updateField('districtUnion', v)}>
                    <SelectTrigger><SelectValue placeholder="Select District Union" /></SelectTrigger>
                    <SelectContent>
                      {unionsByDistrict.length > 0 ? unionsByDistrict.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      )) : TAMIL_NADU_DISTRICTS.filter(d => d === formData.district || !formData.district).map((d) => (
                        <SelectItem key={d} value={`${d} District Union`}>{d} District Union</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">3. Office (City MMO / Attur / Omalur...)</label>
                  <Input value={formData.office} onChange={(e) => updateField('office', e.target.value)} placeholder="e.g., City MMO, Attur, Omalur" className="text-base" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" /> Step 2 — Choose Business Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">4. Business Type *</p>
                <div className="grid gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const Icon = bt.icon;
                    const isSelected = formData.businessType === bt.value;
                    return (
                      <div
                        key={bt.value}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                        onClick={() => selectBusinessType(bt)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{bt.label}</p>
                          </div>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{bt.code}</span>
                          {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {formData.businessType && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Auto-filled Business Type Code: <strong className="font-mono">{formData.businessTypeCode}</strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-blue-600" /> Step 3 — Business Location Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <ComboboxInput
                    label="5. Business Route"
                    value={formData.businessRoute}
                    onChange={(val) => updateField('businessRoute', val)}
                    options={allRoutes}
                    placeholder="Type or select a route (e.g., Hosthampatti, Omalur)"
                  />
                  <p className="text-xs text-gray-400 mt-1">Select from existing routes or type a new one</p>
                </div>
                <div>
                  <ComboboxInput
                    label="6. Business Point / Area"
                    value={formData.businessPoint}
                    onChange={(val) => updateField('businessPoint', val)}
                    options={pointsForSelectedRoute}
                    placeholder="Type or select a point (e.g., Main Road, Bus Stand)"
                  />
                  <p className="text-xs text-gray-400 mt-1">Points are filtered by selected route when available</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" /> Step 4 — Business Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">7. Business Name *</label>
                  <Input value={formData.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="e.g., Sri Murugan Dairy Store" className="text-base" />
                </div>
                <div>
                  <AddressCapture
                    value={formData.address}
                    onChange={(addr) => updateField('address', addr)}
                    onCoordinatesChange={(lat, lng) => {
                      updateField('addressLat', lat);
                      updateField('addressLng', lng);
                    }}
                    latitude={formData.addressLat}
                    longitude={formData.addressLng}
                    placeholder="Full business address including street, area, city, pincode"
                    label="8. Business Address"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" /> Step 5 — Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">9. Mobile Number 1 * (WhatsApp Number - mandatory)</label>
                  <Input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="e.g., 9843777277" maxLength={10} type="tel" className="text-base" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">10. Mobile Number 2 (optional)</label>
                  <Input value={formData.mobile2} onChange={(e) => updateField('mobile2', e.target.value)} placeholder="e.g., 9876543210" maxLength={10} type="tel" className="text-base" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Person Name</label>
                  <Input value={formData.contactName} onChange={(e) => updateField('contactName', e.target.value)} placeholder="e.g., Murugan K" className="text-base" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" /> Step 6 — Documents (for verification)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">11. GSTIN {formData.businessType === "Hotel" || formData.businessType === "Institution" ? "(recommended)" : "(optional depending on type)"}</label>
                  <Input value={formData.gstin} onChange={(e) => updateField('gstin', e.target.value.toUpperCase())} placeholder="e.g., 33AABCT1234F1ZH" maxLength={15} className="text-base" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">12. PAN (recommended)</label>
                  <Input value={formData.panNumber} onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())} placeholder="e.g., AABCT1234F" maxLength={10} className="text-base" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">13. Aadhaar Number (optional)</label>
                  <Input value={formData.aadhaarNumber} onChange={(e) => updateField('aadhaarNumber', e.target.value.replace(/\D/g, ''))} placeholder="e.g., 987654321012" maxLength={12} className="text-base" />
                  <p className="text-xs text-gray-400 mt-1">12-digit Aadhaar number of proprietor/partner</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    14. FSSAI License {(formData.businessType === "Hotel" || formData.businessType === "Institution") ? "(mandatory for Hotels/Institutions)" : "(optional)"}
                  </label>
                  <Input value={formData.fssaiLicense} onChange={(e) => updateField('fssaiLicense', e.target.value)} placeholder="e.g., 12345678901234" className="text-base" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">15. MSME / UDYAM Number (optional)</label>
                  <Input value={formData.msmeUdyam} onChange={(e) => updateField('msmeUdyam', e.target.value.toUpperCase())} placeholder="e.g., UDYAM-TN-01-0012345" className="text-base" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" /> Step 7 — Segment Access + Pricing Tier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">A) Which segments do they want? *</h3>
                  <p className="text-xs text-gray-400 mb-3">15. Select Segments (multi-select)</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                      <Checkbox
                        checked={formData.freshMilkSegment}
                        onCheckedChange={(v) => updateField('freshMilkSegment', !!v)}
                      />
                      <Milk className="h-5 w-5 text-cyan-600" />
                      <span className="font-medium">Fresh Milk</span>
                    </div>
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Checkbox
                        checked={formData.productsSegment}
                        onCheckedChange={(v) => {
                          updateField('productsSegment', !!v);
                          if (v) updateField('iceCreamSegment', true);
                        }}
                      />
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-medium">Products</span>
                        <p className="text-xs text-gray-400">Ice Cream auto-included when Products selected OR keep default products list</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <Checkbox
                        checked={formData.iceCreamSegment}
                        onCheckedChange={(v) => updateField('iceCreamSegment', !!v)}
                        disabled={formData.productsSegment}
                      />
                      <IceCream className="h-5 w-5 text-pink-600" />
                      <div>
                        <span className="font-medium">Ice Cream</span>
                        {formData.productsSegment && <span className="text-xs text-pink-500 ml-2">(auto-included with Products)</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">B) Pricing tier for each segment</h3>
                  
                  {formData.freshMilkSegment && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Milk className="h-4 w-4 text-cyan-600" />
                        16. Fresh Milk Pricing Tier (M/R/D/W/U/F) or X
                      </label>
                      <Select value={formData.freshMilkTier} onValueChange={(v) => updateField('freshMilkTier', v)}>
                        <SelectTrigger><SelectValue placeholder="Select pricing tier" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRICING_TIERS).map(([code, label]) => (
                            <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.productsSegment && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        17. Products Pricing Tier (M/R/D/W/U/F) or X
                      </label>
                      <Select value={formData.productTier} onValueChange={(v) => { updateField('productTier', v); updateField('iceCreamTier', v); }}>
                        <SelectTrigger><SelectValue placeholder="Select pricing tier" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRICING_TIERS).map(([code, label]) => (
                            <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(formData.iceCreamSegment || formData.productsSegment) && (
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-4">
                      <p className="text-sm flex items-center gap-2">
                        <IceCream className="h-4 w-4 text-pink-600" />
                        <span className="font-medium">18. Ice Cream Pricing Tier</span>
                        <span className="text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">AUTO = Products Tier</span>
                      </p>
                      <p className="text-xs text-pink-600 mt-1">
                        Rule: Ice Cream Tier = Product Tier (no separate question). 
                        Current: <strong>{formData.productTier ? `${formData.productTier} — ${PRICING_TIERS[formData.productTier]}` : 'Not set'}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" /> Step 8 — Finance / Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">19. Security Deposit (optional based on business type/tier)</label>
                  <Input value={formData.securityDeposit} onChange={(e) => updateField('securityDeposit', e.target.value)} placeholder="e.g., 50000" type="number" className="text-base" />
                  <p className="text-xs text-gray-400 mt-1">Amount in ₹ (INR). Optional depending on business type and pricing tier.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 text-base">Registration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Union & Office</p>
                    <p className="font-medium">{formData.district} → {getUnionName(formData.districtUnion)}</p>
                    {formData.office && <p className="text-gray-600">{formData.office}</p>}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Business Type</p>
                    <p className="font-medium">{formData.businessType} <span className="font-mono text-xs bg-gray-100 px-1 rounded">{formData.businessTypeCode}</span></p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Business</p>
                    <p className="font-medium">{formData.businessName}</p>
                    {formData.businessRoute && <p className="text-gray-600 text-xs">Route: {formData.businessRoute}</p>}
                    {formData.businessPoint && <p className="text-gray-600 text-xs">Point: {formData.businessPoint}</p>}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Contact</p>
                    <p className="font-medium">{formData.phone}</p>
                    {formData.mobile2 && <p className="text-gray-600 text-xs">Alt: {formData.mobile2}</p>}
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Segments</p>
                    <div className="flex gap-1 flex-wrap">
                      {formData.freshMilkSegment && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Fresh Milk ({formData.freshMilkTier || '-'})</span>}
                      {formData.productsSegment && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Products ({formData.productTier || '-'})</span>}
                      {formData.iceCreamSegment && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">Ice Cream ({formData.iceCreamTier || formData.productTier || '-'})</span>}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Documents</p>
                    <div className="text-xs space-y-0.5">
                      {formData.gstin && <p>GSTIN: {formData.gstin}</p>}
                      {formData.panNumber && <p>PAN: {formData.panNumber}</p>}
                      {formData.aadhaarNumber && <p>Aadhaar: {formData.aadhaarNumber}</p>}
                      {formData.fssaiLicense && <p>FSSAI: {formData.fssaiLicense}</p>}
                      {formData.msmeUdyam && <p>MSME/UDYAM: {formData.msmeUdyam}</p>}
                      {!formData.gstin && !formData.panNumber && !formData.aadhaarNumber && !formData.fssaiLicense && !formData.msmeUdyam && <p className="text-gray-400">None provided</p>}
                    </div>
                  </div>
                  {formData.securityDeposit && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Security Deposit</p>
                      <p className="font-medium">₹{formData.securityDeposit}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-3 justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
              disabled={!canProceedStep(step)}
              onClick={() => setStep(step + 1)}
            >
              Next: {stepLabels[step]} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              disabled={registerMutation.isPending}
              onClick={() => registerMutation.mutate(formData)}
            >
              {registerMutation.isPending ? 'Submitting...' : 'Submit Registration'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
