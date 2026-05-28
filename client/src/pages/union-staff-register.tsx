import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Users, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { UNION_STAFF_DEPARTMENTS, UNION_STAFF_DESIGNATIONS, UNION_STAFF_ACCESS_TIERS } from "@shared/schema";

interface UnionOption {
  id: string;
  restaurantName: string;
  address: string;
}

export default function UnionStaffRegisterPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    unionId: "",
    name: "",
    phone: "",
    email: "",
    employeeId: "",
    department: "",
    designationId: "",
    assignedOffice: "",
    password: "",
    confirmPassword: "",
  });

  const { data: unions } = useQuery<UnionOption[]>({
    queryKey: ["/api/merchants"],
  });

  interface MmoOfficeOption {
    id: string;
    officeName: string;
    officeCode: string;
  }

  const { data: mmoOffices = [] } = useQuery<MmoOfficeOption[]>({
    queryKey: ["/api/public/mmo-offices", formData.unionId],
    queryFn: async () => {
      if (!formData.unionId) return [];
      const res = await fetch(`/api/public/mmo-offices?unionId=${encodeURIComponent(formData.unionId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!formData.unionId,
  });

  const officeMandatoryRoles = ['marketing_executive', 'data_entry_operator'];
  const isOfficeMandatory = officeMandatoryRoles.includes(formData.designationId);


  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data, username: data.employeeId };
      return await apiRequest("POST", "/api/union-staff/register", payload);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Submitted",
        description: "Your registration is pending approval from your Union administrator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const selectedDepartment = formData.department;
  const designationsForDepartment = selectedDepartment 
    ? (UNION_STAFF_DESIGNATIONS as any)[selectedDepartment] || []
    : [];
  
  const selectedDesignation = designationsForDepartment.find(
    (d: any) => d.id === formData.designationId
  );
  const accessTier = selectedDesignation?.accessTier || 'operational';
  const accessInfo = (UNION_STAFF_ACCESS_TIERS as any)[accessTier];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 sm:pt-8 text-center px-4 sm:px-6 pb-4 sm:pb-6">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Your registration is pending approval from your District Union administrator. 
              You will be notified once your account is approved.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full h-11">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5 sm:mb-8">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-600 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Union Staff Registration</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Register as a staff member of your District Union
          </p>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Registration Form
            </CardTitle>
            <CardDescription>
              Fill in your details below. Your registration will be reviewed by your Union administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Your District Union</Label>
                <Select
                  value={formData.unionId}
                  onValueChange={(value) => setFormData({ ...formData, unionId: value, assignedOffice: "" })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose your District Union" />
                  </SelectTrigger>
                  <SelectContent>
                    {unions?.map((union) => (
                      <SelectItem key={union.id} value={union.id}>
                        {union.restaurantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID * (used for login)</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="Your official employee ID"
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Department & Designation</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value, designationId: "" })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNION_STAFF_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation *</Label>
                    <Select
                      value={formData.designationId}
                      onValueChange={(value) => setFormData({ ...formData, designationId: value })}
                      disabled={!formData.department}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={formData.department ? "Select designation" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {designationsForDepartment.map((desig: any) => (
                          <SelectItem key={desig.id} value={desig.id}>
                            {desig.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedDesignation && accessInfo && (
                  <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">{accessInfo.label}</p>
                        <p className="text-sm text-blue-700">{accessInfo.description}</p>
                        <p className="text-xs text-blue-600 mt-1">Level: {selectedDesignation.level}</p>
                        
                        {selectedDesignation.salesSegment && selectedDesignation.salesSegment !== 'all_access' && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800">Sales Segment: {
                              selectedDesignation.salesSegment === 'federation_interunion' ? 'Federation & Inter-Union' :
                              selectedDesignation.salesSegment === 'wsd_dealer' ? 'WSD & Dealer' :
                              selectedDesignation.salesSegment === 'retail_parlour' ? 'Retail, Institutional & Parlour' :
                              selectedDesignation.salesSegment
                            }</p>
                          </div>
                        )}
                        
                        {selectedDesignation.responsibilities && selectedDesignation.responsibilities.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-1">Key Responsibilities:</p>
                            <ul className="text-xs text-blue-700 space-y-0.5">
                              {selectedDesignation.responsibilities.slice(0, 3).map((resp: string, idx: number) => (
                                <li key={idx}>• {resp}</li>
                              ))}
                              {selectedDesignation.responsibilities.length > 3 && (
                                <li className="text-blue-500">+{selectedDesignation.responsibilities.length - 3} more...</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">
                  MMO Office {isOfficeMandatory ? '*' : '(Optional)'}
                </Label>
                {isOfficeMandatory && (
                  <p className="text-sm text-amber-700 mb-2">
                    MMO Office selection is required for {formData.designationId === 'marketing_executive' ? 'Marketing Executive' : 'Data Entry Operator'} roles.
                  </p>
                )}
                <Select
                  value={formData.assignedOffice}
                  onValueChange={(value) => setFormData({ ...formData, assignedOffice: value })}
                  disabled={!formData.unionId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={formData.unionId ? "Select your MMO Office" : "Select a Union first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {mmoOffices.map((office) => (
                      <SelectItem key={office.id} value={office.officeName}>
                        {office.officeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.unionId && mmoOffices.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No MMO offices found for this union.</p>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Login Credentials</Label>
                <p className="text-sm text-gray-600 mb-4">Your Employee ID will be used as your username for login.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min. 6 characters"
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Re-enter password"
                        className="h-11"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Approval Required</p>
                    <p>Your registration will be reviewed by your District Union administrator before you can access the system.</p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11" 
                size="lg"
                disabled={registerMutation.isPending || !formData.unionId || !formData.employeeId || !formData.department || !formData.designationId || (isOfficeMandatory && !formData.assignedOffice)}
              >
                {registerMutation.isPending ? "Submitting..." : "Submit Registration"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already registered?{" "}
          <Link href="/union/login" className="text-cyan-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
