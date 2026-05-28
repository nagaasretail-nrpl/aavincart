import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  Calendar,
  Route,
  Store,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  FileText,
  UserCheck,
  UserX,
  Timer,
  RefreshCw,
} from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName?: string;
  merchantId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLat?: string;
  checkInLng?: string;
  checkOutLat?: string;
  checkOutLng?: string;
  status: string;
  leaveType?: string;
  leaveReason?: string;
  totalHours?: number;
}

interface BeatPlan {
  id: string;
  staffId: string;
  staffName?: string;
  merchantId: string;
  dayOfWeek: number;
  routeId?: string;
  routeName: string;
  outlets: any[];
  status?: string;
}

interface OutletVisit {
  id: string;
  staffId: string;
  staffName?: string;
  merchantId: string;
  outletId: string;
  outletName: string;
  visitDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  orderAmount?: number;
  collectionAmount?: number;
}

export default function DmsSfa() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const merchantId = user?.unionId || user?.id || "";

  const [activeTab, setActiveTab] = useState("attendance");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [staffFilter, setStaffFilter] = useState("");
  const [visitDateFilter, setVisitDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [visitStaffFilter, setVisitStaffFilter] = useState("");
  const [beatStaffFilter, setBeatStaffFilter] = useState("");

  const [checkInDialog, setCheckInDialog] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ staffId: "", checkInLat: "", checkInLng: "" });

  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staffId: "", date: new Date().toISOString().split("T")[0], leaveType: "casual", leaveReason: "" });

  const [beatDialog, setBeatDialog] = useState(false);
  const [editingBeat, setEditingBeat] = useState<BeatPlan | null>(null);
  const [beatForm, setBeatForm] = useState({ staffId: "", dayOfWeek: "1", routeId: "", routeName: "", outlets: "[]" });

  const [visitDialog, setVisitDialog] = useState(false);
  const [visitForm, setVisitForm] = useState({ staffId: "", outletId: "", outletName: "", latitude: "", longitude: "", notes: "", orderAmount: "", collectionAmount: "" });

  const attendanceQuery = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/staff-attendance", merchantId, { date: dateFilter, staffId: staffFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (staffFilter) params.set("staffId", staffFilter);
      const res = await fetch(`/api/staff-attendance/${merchantId}?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const beatPlansQuery = useQuery<BeatPlan[]>({
    queryKey: ["/api/beat-plans", merchantId, { staffId: beatStaffFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (beatStaffFilter) params.set("staffId", beatStaffFilter);
      const res = await fetch(`/api/beat-plans/${merchantId}?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch beat plans");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const visitsQuery = useQuery<OutletVisit[]>({
    queryKey: ["/api/outlet-visits", merchantId, { staffId: visitStaffFilter, date: visitDateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (visitStaffFilter) params.set("staffId", visitStaffFilter);
      if (visitDateFilter) params.set("date", visitDateFilter);
      const res = await fetch(`/api/outlet-visits/${merchantId}?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/staff-attendance/check-in", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance", merchantId] });
      toast({ title: "Success", description: "Check-in recorded successfully" });
      setCheckInDialog(false);
      setCheckInForm({ staffId: "", checkInLat: "", checkInLng: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/staff-attendance/${id}/check-out`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance", merchantId] });
      toast({ title: "Success", description: "Check-out recorded successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/staff-attendance/leave", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance", merchantId] });
      toast({ title: "Success", description: "Leave applied successfully" });
      setLeaveDialog(false);
      setLeaveForm({ staffId: "", date: new Date().toISOString().split("T")[0], leaveType: "casual", leaveReason: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createBeatMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/beat-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beat-plans", merchantId] });
      toast({ title: "Success", description: "Beat plan created successfully" });
      setBeatDialog(false);
      setEditingBeat(null);
      setBeatForm({ staffId: "", dayOfWeek: "1", routeId: "", routeName: "", outlets: "[]" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateBeatMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/beat-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beat-plans", merchantId] });
      toast({ title: "Success", description: "Beat plan updated successfully" });
      setBeatDialog(false);
      setEditingBeat(null);
      setBeatForm({ staffId: "", dayOfWeek: "1", routeId: "", routeName: "", outlets: "[]" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBeatMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/beat-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beat-plans", merchantId] });
      toast({ title: "Success", description: "Beat plan deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/outlet-visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outlet-visits", merchantId] });
      toast({ title: "Success", description: "Visit recorded successfully" });
      setVisitDialog(false);
      setVisitForm({ staffId: "", outletId: "", outletName: "", latitude: "", longitude: "", notes: "", orderAmount: "", collectionAmount: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleCheckIn = () => {
    const now = new Date();
    checkInMutation.mutate({
      staffId: checkInForm.staffId,
      merchantId,
      date: now.toISOString().split("T")[0],
      checkInTime: now.toTimeString().split(" ")[0],
      checkInLat: checkInForm.checkInLat,
      checkInLng: checkInForm.checkInLng,
    });
  };

  const handleCheckOut = (record: AttendanceRecord) => {
    const now = new Date();
    checkOutMutation.mutate({
      id: record.id,
      checkOutTime: now.toTimeString().split(" ")[0],
      checkOutLat: "",
      checkOutLng: "",
    });
  };

  const handleLeaveSubmit = () => {
    leaveMutation.mutate({
      staffId: leaveForm.staffId,
      merchantId,
      date: leaveForm.date,
      status: "leave",
      leaveType: leaveForm.leaveType,
      leaveReason: leaveForm.leaveReason,
    });
  };

  const handleBeatSubmit = () => {
    let outlets: any[] = [];
    try {
      outlets = JSON.parse(beatForm.outlets);
    } catch {
      toast({ title: "Error", description: "Invalid outlets JSON format", variant: "destructive" });
      return;
    }
    const payload = {
      staffId: beatForm.staffId,
      merchantId,
      dayOfWeek: parseInt(beatForm.dayOfWeek),
      routeId: beatForm.routeId,
      routeName: beatForm.routeName,
      outlets,
    };
    if (editingBeat) {
      updateBeatMutation.mutate({ id: editingBeat.id, ...payload });
    } else {
      createBeatMutation.mutate(payload);
    }
  };

  const handleVisitSubmit = () => {
    createVisitMutation.mutate({
      staffId: visitForm.staffId,
      merchantId,
      outletId: visitForm.outletId,
      outletName: visitForm.outletName,
      visitDate: new Date().toISOString().split("T")[0],
      checkInTime: new Date().toTimeString().split(" ")[0],
      latitude: visitForm.latitude,
      longitude: visitForm.longitude,
      notes: visitForm.notes,
      orderAmount: visitForm.orderAmount ? parseFloat(visitForm.orderAmount) : 0,
      collectionAmount: visitForm.collectionAmount ? parseFloat(visitForm.collectionAmount) : 0,
    });
  };

  const openEditBeat = (beat: BeatPlan) => {
    setEditingBeat(beat);
    setBeatForm({
      staffId: beat.staffId,
      dayOfWeek: String(beat.dayOfWeek),
      routeId: beat.routeId || "",
      routeName: beat.routeName,
      outlets: JSON.stringify(beat.outlets || [], null, 2),
    });
    setBeatDialog(true);
  };

  const attendance = attendanceQuery.data || [];
  const beatPlans = beatPlansQuery.data || [];
  const visits = visitsQuery.data || [];

  const totalStaff = new Set(attendance.map((a) => a.staffId)).size;
  const presentToday = attendance.filter((a) => a.status === "present").length;
  const onLeave = attendance.filter((a) => a.status === "leave").length;
  const avgHours = attendance.filter((a) => a.totalHours).length > 0
    ? (attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0) / attendance.filter((a) => a.totalHours).length).toFixed(1)
    : "0";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case "leave":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Leave</Badge>;
      case "absent":
        return <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Sales Force Automation</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">DMS - Marketing Staff Management</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { attendanceQuery.refetch(); beatPlansQuery.refetch(); visitsQuery.refetch(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6 overflow-x-auto">
            <TabsTrigger value="attendance" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Attend.</span>
            </TabsTrigger>
            <TabsTrigger value="beat-plans" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Route className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Beat Plans</span>
              <span className="sm:hidden">Beats</span>
            </TabsTrigger>
            <TabsTrigger value="outlet-visits" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Store className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Outlet Visits</span>
              <span className="sm:hidden">Visits</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs sm:text-sm">Total Staff</p>
                      <p className="text-xl sm:text-2xl font-bold">{totalStaff}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs sm:text-sm">Present Today</p>
                      <p className="text-xl sm:text-2xl font-bold">{presentToday}</p>
                    </div>
                    <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-xs sm:text-sm">On Leave</p>
                      <p className="text-xl sm:text-2xl font-bold">{onLeave}</p>
                    </div>
                    <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs sm:text-sm">Avg Hours</p>
                      <p className="text-xl sm:text-2xl font-bold">{avgHours}</p>
                    </div>
                    <Timer className="h-6 w-6 sm:h-8 sm:w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="grid grid-cols-2 gap-3 w-full md:flex md:flex-1">
                    <div className="w-full">
                      <Label>Date Filter</Label>
                      <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full" />
                    </div>
                    <div className="w-full">
                      <Label>Staff ID Filter</Label>
                      <Input placeholder="Filter by Staff ID..." value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex">
                    <Button onClick={() => setCheckInDialog(true)} className="w-full md:w-auto">
                      <LogIn className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Mark Attendance</span>
                    </Button>
                    <Button variant="outline" onClick={() => setLeaveDialog(true)} className="w-full md:w-auto">
                      <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Apply Leave</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance List
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {attendanceQuery.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading attendance data...</div>
                ) : attendance.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Attendance Records</h3>
                    <p className="text-muted-foreground">No attendance records found for the selected filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium">Staff Name</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">Check-in</th>
                            <th className="text-left py-3 px-4 font-medium">Check-out</th>
                            <th className="text-left py-3 px-4 font-medium">Location</th>
                            <th className="text-center py-3 px-4 font-medium">Status</th>
                            <th className="text-right py-3 px-4 font-medium">Total Hours</th>
                            <th className="text-center py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((record) => (
                            <tr key={record.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{record.staffName || record.staffId}</td>
                              <td className="py-3 px-4">{record.date}</td>
                              <td className="py-3 px-4">{record.checkInTime || "-"}</td>
                              <td className="py-3 px-4">{record.checkOutTime || "-"}</td>
                              <td className="py-3 px-4 text-sm">
                                {record.checkInLat && record.checkInLng ? (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {parseFloat(record.checkInLat).toFixed(4)}, {parseFloat(record.checkInLng).toFixed(4)}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="py-3 px-4 text-center">{getStatusBadge(record.status)}</td>
                              <td className="py-3 px-4 text-right">{record.totalHours ? `${record.totalHours.toFixed(1)}h` : "-"}</td>
                              <td className="py-3 px-4 text-center">
                                {record.status === "present" && record.checkInTime && !record.checkOutTime && (
                                  <Button size="sm" variant="outline" onClick={() => handleCheckOut(record)} disabled={checkOutMutation.isPending}>
                                    <LogOut className="h-4 w-4 mr-1" />
                                    Check-out
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {attendance.map((record) => (
                        <Card key={record.id} className="border">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{record.staffName || record.staffId}</span>
                              {getStatusBadge(record.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <span>Date: {record.date}</span>
                              <span>Check-in: {record.checkInTime || "-"}</span>
                              <span>Check-out: {record.checkOutTime || "-"}</span>
                              <span>Hours: {record.totalHours ? `${record.totalHours.toFixed(1)}h` : "-"}</span>
                            </div>
                            {record.status === "present" && record.checkInTime && !record.checkOutTime && (
                              <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => handleCheckOut(record)} disabled={checkOutMutation.isPending}>
                                <LogOut className="h-3 w-3 mr-1" />
                                Check-out
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beat-plans">
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="w-full sm:flex-1">
                    <Label>Staff ID Filter</Label>
                    <Input placeholder="Filter by Staff ID..." value={beatStaffFilter} onChange={(e) => setBeatStaffFilter(e.target.value)} className="w-full" />
                  </div>
                  <Button className="w-full sm:w-auto" onClick={() => { setEditingBeat(null); setBeatForm({ staffId: "", dayOfWeek: "1", routeId: "", routeName: "", outlets: "[]" }); setBeatDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Beat Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Beat Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {beatPlansQuery.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading beat plans...</div>
                ) : beatPlans.length === 0 ? (
                  <div className="p-12 text-center">
                    <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Beat Plans</h3>
                    <p className="text-muted-foreground">Create beat plans to define staff routes and outlet coverage.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium">Staff</th>
                            <th className="text-left py-3 px-4 font-medium">Day of Week</th>
                            <th className="text-left py-3 px-4 font-medium">Route</th>
                            <th className="text-center py-3 px-4 font-medium">Outlets</th>
                            <th className="text-center py-3 px-4 font-medium">Status</th>
                            <th className="text-center py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beatPlans.map((plan) => (
                            <tr key={plan.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{plan.staffName || plan.staffId}</td>
                              <td className="py-3 px-4">{DAY_NAMES[plan.dayOfWeek] || plan.dayOfWeek}</td>
                              <td className="py-3 px-4">{plan.routeName || plan.routeId || "-"}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="secondary">{Array.isArray(plan.outlets) ? plan.outlets.length : 0}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge className="bg-green-500 hover:bg-green-600">{plan.status || "active"}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditBeat(plan)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                                    if (confirm("Delete this beat plan?")) deleteBeatMutation.mutate(plan.id);
                                  }} disabled={deleteBeatMutation.isPending}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {beatPlans.map((plan) => (
                        <Card key={plan.id} className="border">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{plan.staffName || plan.staffId}</span>
                              <Badge className="bg-green-500 hover:bg-green-600 text-xs">{plan.status || "active"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <span>Day: {DAY_NAMES[plan.dayOfWeek] || plan.dayOfWeek}</span>
                              <span>Route: {plan.routeName || "-"}</span>
                              <span>Outlets: {Array.isArray(plan.outlets) ? plan.outlets.length : 0}</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditBeat(plan)}>
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                                if (confirm("Delete this beat plan?")) deleteBeatMutation.mutate(plan.id);
                              }} disabled={deleteBeatMutation.isPending}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outlet-visits">
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-end">
                  <div className="grid grid-cols-2 gap-3 w-full md:flex md:flex-1">
                    <div className="w-full">
                      <Label>Date Filter</Label>
                      <Input type="date" value={visitDateFilter} onChange={(e) => setVisitDateFilter(e.target.value)} className="w-full" />
                    </div>
                    <div className="w-full">
                      <Label>Staff ID Filter</Label>
                      <Input placeholder="Filter by Staff ID..." value={visitStaffFilter} onChange={(e) => setVisitStaffFilter(e.target.value)} className="w-full" />
                    </div>
                  </div>
                  <Button className="w-full md:w-auto" onClick={() => setVisitDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Visit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Outlet Visits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {visitsQuery.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading visits...</div>
                ) : visits.length === 0 ? (
                  <div className="p-12 text-center">
                    <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Outlet Visits</h3>
                    <p className="text-muted-foreground">Record outlet visits to track sales force activity.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium">Staff</th>
                            <th className="text-left py-3 px-4 font-medium">Outlet</th>
                            <th className="text-left py-3 px-4 font-medium">Visit Date</th>
                            <th className="text-left py-3 px-4 font-medium">Check-in</th>
                            <th className="text-left py-3 px-4 font-medium">Check-out</th>
                            <th className="text-left py-3 px-4 font-medium">Location</th>
                            <th className="text-right py-3 px-4 font-medium">Order Amt</th>
                            <th className="text-right py-3 px-4 font-medium">Collection Amt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map((visit) => (
                            <tr key={visit.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{visit.staffName || visit.staffId}</td>
                              <td className="py-3 px-4">{visit.outletName || visit.outletId}</td>
                              <td className="py-3 px-4">{visit.visitDate}</td>
                              <td className="py-3 px-4">{visit.checkInTime || "-"}</td>
                              <td className="py-3 px-4">{visit.checkOutTime || "-"}</td>
                              <td className="py-3 px-4 text-sm">
                                {visit.latitude && visit.longitude ? (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {parseFloat(visit.latitude).toFixed(4)}, {parseFloat(visit.longitude).toFixed(4)}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="py-3 px-4 text-right">₹{visit.orderAmount?.toFixed(2) || "0.00"}</td>
                              <td className="py-3 px-4 text-right">₹{visit.collectionAmount?.toFixed(2) || "0.00"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {visits.map((visit) => (
                        <Card key={visit.id} className="border">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{visit.staffName || visit.staffId}</span>
                              <span className="text-xs text-muted-foreground">{visit.visitDate}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Outlet: {visit.outletName || visit.outletId}</p>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <span>Check-in: {visit.checkInTime || "-"}</span>
                              <span>Check-out: {visit.checkOutTime || "-"}</span>
                              <span>Order: ₹{visit.orderAmount?.toFixed(2) || "0.00"}</span>
                              <span>Collection: ₹{visit.collectionAmount?.toFixed(2) || "0.00"}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={checkInDialog} onOpenChange={setCheckInDialog}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Mark Attendance - Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="checkin-staffId">Staff ID</Label>
              <Input id="checkin-staffId" placeholder="Enter Staff ID" value={checkInForm.staffId} onChange={(e) => setCheckInForm({ ...checkInForm, staffId: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkin-lat">Latitude</Label>
                <Input id="checkin-lat" placeholder="e.g., 11.6643" value={checkInForm.checkInLat} onChange={(e) => setCheckInForm({ ...checkInForm, checkInLat: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="checkin-lng">Longitude</Label>
                <Input id="checkin-lng" placeholder="e.g., 78.1460" value={checkInForm.checkInLng} onChange={(e) => setCheckInForm({ ...checkInForm, checkInLng: e.target.value })} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Current time will be captured as check-in time.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialog(false)}>Cancel</Button>
            <Button onClick={handleCheckIn} disabled={checkInMutation.isPending || !checkInForm.staffId}>
              {checkInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Apply Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="leave-staffId">Staff ID</Label>
              <Input id="leave-staffId" placeholder="Enter Staff ID" value={leaveForm.staffId} onChange={(e) => setLeaveForm({ ...leaveForm, staffId: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="leave-date">Date</Label>
              <Input id="leave-date" type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm({ ...leaveForm, leaveType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="earned">Earned Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="leave-reason">Leave Reason</Label>
              <Textarea id="leave-reason" placeholder="Reason for leave..." value={leaveForm.leaveReason} onChange={(e) => setLeaveForm({ ...leaveForm, leaveReason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog(false)}>Cancel</Button>
            <Button onClick={handleLeaveSubmit} disabled={leaveMutation.isPending || !leaveForm.staffId}>
              {leaveMutation.isPending ? "Applying..." : "Apply Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={beatDialog} onOpenChange={(open) => { if (!open) { setBeatDialog(false); setEditingBeat(null); } else setBeatDialog(true); }}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingBeat ? "Edit Beat Plan" : "Create Beat Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="beat-staffId">Staff ID</Label>
              <Input id="beat-staffId" placeholder="Enter Staff ID" value={beatForm.staffId} onChange={(e) => setBeatForm({ ...beatForm, staffId: e.target.value })} />
            </div>
            <div>
              <Label>Day of Week</Label>
              <Select value={beatForm.dayOfWeek} onValueChange={(v) => setBeatForm({ ...beatForm, dayOfWeek: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="beat-routeId">Route ID</Label>
              <Input id="beat-routeId" placeholder="Route ID (optional)" value={beatForm.routeId} onChange={(e) => setBeatForm({ ...beatForm, routeId: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="beat-routeName">Route Name</Label>
              <Input id="beat-routeName" placeholder="e.g., North City Route" value={beatForm.routeName} onChange={(e) => setBeatForm({ ...beatForm, routeName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="beat-outlets">Outlets (JSON Array)</Label>
              <Textarea id="beat-outlets" rows={4} placeholder='[{"id":"1","name":"Shop A"},{"id":"2","name":"Shop B"}]' value={beatForm.outlets} onChange={(e) => setBeatForm({ ...beatForm, outlets: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBeatDialog(false); setEditingBeat(null); }}>Cancel</Button>
            <Button onClick={handleBeatSubmit} disabled={createBeatMutation.isPending || updateBeatMutation.isPending || !beatForm.staffId || !beatForm.routeName}>
              {(createBeatMutation.isPending || updateBeatMutation.isPending) ? "Saving..." : editingBeat ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Record Outlet Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="visit-staffId">Staff ID</Label>
              <Input id="visit-staffId" placeholder="Enter Staff ID" value={visitForm.staffId} onChange={(e) => setVisitForm({ ...visitForm, staffId: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit-outletId">Outlet ID</Label>
                <Input id="visit-outletId" placeholder="Outlet ID" value={visitForm.outletId} onChange={(e) => setVisitForm({ ...visitForm, outletId: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="visit-outletName">Outlet Name</Label>
                <Input id="visit-outletName" placeholder="Outlet Name" value={visitForm.outletName} onChange={(e) => setVisitForm({ ...visitForm, outletName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit-lat">Latitude</Label>
                <Input id="visit-lat" placeholder="e.g., 11.6643" value={visitForm.latitude} onChange={(e) => setVisitForm({ ...visitForm, latitude: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="visit-lng">Longitude</Label>
                <Input id="visit-lng" placeholder="e.g., 78.1460" value={visitForm.longitude} onChange={(e) => setVisitForm({ ...visitForm, longitude: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="visit-notes">Notes</Label>
              <Textarea id="visit-notes" placeholder="Visit notes..." value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit-orderAmt">Order Amount (₹)</Label>
                <Input id="visit-orderAmt" type="number" placeholder="0.00" value={visitForm.orderAmount} onChange={(e) => setVisitForm({ ...visitForm, orderAmount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="visit-collectAmt">Collection Amount (₹)</Label>
                <Input id="visit-collectAmt" type="number" placeholder="0.00" value={visitForm.collectionAmount} onChange={(e) => setVisitForm({ ...visitForm, collectionAmount: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDialog(false)}>Cancel</Button>
            <Button onClick={handleVisitSubmit} disabled={createVisitMutation.isPending || !visitForm.staffId || !visitForm.outletName}>
              {createVisitMutation.isPending ? "Recording..." : "Record Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
