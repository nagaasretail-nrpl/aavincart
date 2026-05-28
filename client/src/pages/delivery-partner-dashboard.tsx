import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  CheckCircle, LogOut, Phone, Lock, MapPin, Truck,
  Bell, Menu, ChevronLeft, ChevronRight, X,
  Clock, Map, History, Wallet, Package, Navigation,
  Calendar, Car, Play, Square, ArrowRight
} from "lucide-react";

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/delivery-partners/login", { phone, password });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Login successful", description: "Welcome to your delivery dashboard!" });
      onLogin();
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message || "Invalid phone or password", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Truck className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Driver Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your delivery dashboard</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className="h-11 pl-10 rounded-xl" required />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-11 pl-10 rounded-xl" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link href="/delivery-partner/register" className="text-amber-600 hover:underline font-medium">Register here</Link>
        </p>
      </div>
    </div>
  );
}

function getWeekDays(selectedDate: Date) {
  const start = new Date(selectedDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const days = [];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ label: labels[i], date: d.getDate(), full: d, iso: d.toISOString().split('T')[0] });
  }
  return days;
}

function WeekCalendar({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (d: Date) => void }) {
  const days = getWeekDays(selectedDate);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex items-center justify-between px-2 py-3">
      {days.map((d) => {
        const isSelected = d.iso === selectedDate.toISOString().split('T')[0];
        const isToday = d.iso === today;
        return (
          <button
            key={d.iso}
            onClick={() => onSelect(d.full)}
            className={`flex flex-col items-center py-2 px-2.5 rounded-xl transition-all ${
              isSelected ? 'bg-amber-500 text-white' : isToday ? 'bg-amber-50 text-amber-700' : 'text-gray-500'
            }`}
          >
            <span className="text-[11px] font-medium">{d.label}</span>
            <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>{d.date < 10 ? `0${d.date}` : d.date}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusTab({ partner, shifts, onStartShift, onEndShift }: any) {
  const currentShift = shifts?.find((s: any) => s.status === 'ongoing');
  const isWorking = partner?.isOnline || !!currentShift;

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex justify-center">
        <Badge className={`px-6 py-2 text-sm font-bold rounded-lg ${isWorking ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
          {isWorking ? 'Working' : 'Offline'}
        </Badge>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Today's Schedule</h3>
        {currentShift ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="bg-green-50 rounded-lg px-3 py-2 text-center min-w-[50px]">
                <span className="text-[10px] text-green-600 font-medium">
                  {new Date(currentShift.startTime).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <p className="text-lg font-bold text-green-700">{new Date(currentShift.startTime).getDate()}</p>
                <span className="text-[10px] text-green-500">Today</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {currentShift.scheduledStart || new Date(currentShift.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {currentShift.scheduledEnd || 'Ongoing'}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Car className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-gray-600">{currentShift.vehicleInfo || 'Vehicle'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{currentShift.location}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Ongoing</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active shift</p>
            <p className="text-xs text-gray-400 mt-1">Start a shift to begin receiving orders</p>
          </div>
        )}
      </div>

      {currentShift ? (
        <button
          onClick={() => onEndShift(currentShift.id)}
          className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-base transition-all active:scale-[0.98]"
        >
          End shift
        </button>
      ) : (
        <button
          onClick={onStartShift}
          className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-base transition-all active:scale-[0.98]"
        >
          <Play className="h-4 w-4 inline mr-2" />
          Start shift
        </button>
      )}
    </div>
  );
}

function DeliveriesTab({ deliveries, onAccept, onDecline, onDeliver }: any) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700">No active deliveries</h3>
        <p className="text-sm text-gray-400 mt-1">New orders will appear here when assigned to you</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {deliveries.map((order: any) => (
        <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">New Order #{order.orderId || order.id}</h3>
            {order.status === 'assigned_to_delivery' && (
              <button onClick={() => onDecline(order.id)} className="text-xs text-red-500 font-semibold">Decline</button>
            )}
          </div>

          <div className="bg-gray-100 h-32 flex items-center justify-center">
            <div className="text-center">
              <Map className="h-8 w-8 text-gray-400 mx-auto mb-1" />
              <span className="text-xs text-gray-400">Route Map</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Delivery Details</h4>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-0.5 h-6 bg-gray-200" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Pickup</p>
                  <p className="text-sm font-semibold text-gray-900">{order.pickupAddress || 'Aavin Parlour'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Drop-off</p>
                  <p className="text-sm font-semibold text-gray-900">{order.dropoffAddress || order.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400">Order total</span>
                <p className="text-lg font-bold text-gray-900">₹{parseFloat(order.total || '0').toFixed(2)}</p>
              </div>
              {order.status === 'assigned_to_delivery' && (
                <button
                  onClick={() => onAccept(order.id)}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  Accept <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {order.status === 'out_for_delivery' && (
                <button
                  onClick={() => onDeliver(order.id)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  Mark Delivered <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (d: Date) => void }) {
  const dateStr = selectedDate.toISOString().split('T')[0];
  const { data: historyData, isLoading } = useQuery<{ totalDelivered: number; cashCollected: string; deliveryEarnings: string; orders: any[] }>({
    queryKey: [`/api/delivery-partners/history?date=${dateStr}`],
  });

  return (
    <div>
      <WeekCalendar selectedDate={selectedDate} onSelect={onDateSelect} />

      <div className="px-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-500 rounded-xl p-3 text-center">
            <p className="text-white text-xs font-medium">Total delivered</p>
            <p className="text-white text-xl font-bold">{historyData?.totalDelivered || 0}</p>
          </div>
          <div className="flex-1 bg-green-500 rounded-xl p-3 text-center">
            <p className="text-white text-xs font-medium">Cash collected</p>
            <p className="text-white text-xl font-bold">₹{historyData?.cashCollected || '0.00'}</p>
          </div>
          <div className="flex-1 bg-red-400 rounded-xl p-3 text-center">
            <p className="text-white text-xs font-medium">Delivery ₹</p>
            <p className="text-white text-xl font-bold">₹{historyData?.deliveryEarnings || '0.00'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Transaction history</h3>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !historyData?.orders || historyData.orders.length === 0 ? (
            <div className="py-8 text-center">
              <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No deliveries on this date</p>
            </div>
          ) : (
            <div className="space-y-1">
              {historyData.orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{order.orderId || order.id}</p>
                      <p className="text-xs text-gray-500">{order.customerName}</p>
                      <p className="text-xs text-gray-400">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{parseFloat(order.deliveryFee || '5.00').toFixed(2)}</p>
                    <p className="text-xs text-gray-400">₹{parseFloat(order.deliveryFee || '2.00').toFixed(2)} + ₹{parseFloat(order.tip || '3.00').toFixed(2)} tips</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletTab({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (d: Date) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCashIn, setShowCashIn] = useState(false);
  const [cashInAmount, setCashInAmount] = useState("10");

  const { data: walletData, isLoading } = useQuery<{ balance: string; transactions: any[] }>({
    queryKey: ['/api/delivery-partners/wallet'],
  });

  const cashInMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest("POST", "/api/delivery-partners/wallet/cash-in", { amount });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Cash In Successful" });
      setShowCashIn(false);
      setCashInAmount("10");
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/wallet'] });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/me'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const typeLabels: Record<string, string> = {
    cash_in: 'Cash in payment',
    delivery_fee: 'Payout delivery fee',
    tip: 'Payout tips',
    incentive: 'Payout Incentives',
    payout: 'Payout',
  };

  return (
    <div>
      <WeekCalendar selectedDate={selectedDate} onSelect={onDateSelect} />

      <div className="px-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Available balance</p>
            <p className="text-2xl font-bold text-gray-900">₹{parseFloat(walletData?.balance || '0').toFixed(2)}</p>
          </div>
          <button
            onClick={() => setShowCashIn(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            CASH IN
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Wallet transactions</h3>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !walletData?.transactions || walletData.transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Wallet className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No wallet transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {walletData.transactions.map((txn: any) => (
                <div key={txn.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold text-gray-900">₹{Math.abs(parseFloat(txn.amount)).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{txn.description || typeLabels[txn.type] || txn.type}</p>
                    {txn.referenceId && <p className="text-[10px] text-gray-400">{txn.referenceId}</p>}
                    <p className="text-[10px] text-gray-400">
                      {new Date(txn.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <p className={`text-sm font-bold ${parseFloat(txn.amount) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                    {txn.balanceAfter ? `₹${parseFloat(txn.balanceAfter).toFixed(2)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCashIn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Add to your balance</h3>
              <button onClick={() => setShowCashIn(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">how much do you want to add to your account?</p>
            <div className="mb-5">
              <label className="text-xs text-gray-500 mb-1 block">Enter top up amount</label>
              <Input
                type="number"
                value={cashInAmount}
                onChange={(e) => setCashInAmount(e.target.value)}
                className="h-11 rounded-xl text-base"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCashIn(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => cashInMutation.mutate(cashInAmount)}
                disabled={cashInMutation.isPending}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all"
              >
                {cashInMutation.isPending ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShiftsView({ shifts, selectedDate, onDateSelect, onBack }: any) {
  const currentShift = shifts?.find((s: any) => s.status === 'ongoing');
  const availableShifts = shifts?.filter((s: any) => s.status === 'available') || [];
  const monthYear = selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-bold flex-1">Shifts - {monthYear}</h2>
        <Bell className="h-5 w-5 text-amber-400" />
      </div>

      <WeekCalendar selectedDate={selectedDate} onSelect={onDateSelect} />

      <div className="px-4 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Current shift ({currentShift ? 1 : 0})</h3>
          {currentShift ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{currentShift.location}</p>
                  <p className="text-xs text-gray-500">
                    {currentShift.scheduledStart || new Date(currentShift.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {currentShift.scheduledEnd || 'Now'}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Ongoing</Badge>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">No current shift</p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Available shift ({availableShifts.length})</h3>
          {availableShifts.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-500 font-medium">No available shift</p>
              <p className="text-xs text-gray-400 mt-1">Pull down the page to refresh</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableShifts.map((shift: any) => (
                <div key={shift.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{shift.location}</p>
                      <p className="text-xs text-gray-500">{shift.scheduledStart} - {shift.scheduledEnd}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Available</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapsTab() {
  return (
    <div className="px-4 py-12 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Navigation className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">Route Maps</h3>
      <p className="text-sm text-gray-400 mt-2">Maps will appear here when you have active deliveries</p>
      <p className="text-xs text-gray-300 mt-1">Accept a delivery to see the route</p>
    </div>
  );
}

function Dashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'status' | 'deliveries' | 'maps' | 'history' | 'wallet'>('status');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showShifts, setShowShifts] = useState(false);

  useEffect(() => {
    document.title = "Driver Dashboard | Aavin Cart";
  }, []);

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['/api/delivery-partners/me'],
  });

  const { data: shifts } = useQuery({
    queryKey: ['/api/delivery-partners/shifts'],
  });

  const { data: deliveries } = useQuery({
    queryKey: ['/api/delivery-partners/deliveries'],
  });

  const startShiftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/delivery-partners/shifts/start", {
        location: (partner as any)?.segment || 'Default Location',
        scheduledStart: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        scheduledEnd: new Date(Date.now() + 4 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shift started!" });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/shifts'] });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/me'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start shift", description: error.message, variant: "destructive" });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("PATCH", `/api/delivery-partners/shifts/${shiftId}/end`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shift ended" });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/shifts'] });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/me'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to end shift", description: error.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("PATCH", `/api/delivery-partners/orders/${orderId}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Order accepted!" });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/deliveries'] });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("PATCH", `/api/delivery-partners/orders/${orderId}/deliver`);
    },
    onSuccess: () => {
      toast({ title: "Marked as delivered!" });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/deliveries'] });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/history'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("PATCH", `/api/delivery-partners/orders/${orderId}/decline`);
    },
    onSuccess: () => {
      toast({ title: "Order declined" });
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/deliveries'] });
    },
  });

  const handleLogout = () => {
    document.cookie = "delivery_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
  };

  if (partnerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (showShifts) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShiftsView
          shifts={shifts || []}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onBack={() => setShowShifts(false)}
        />
      </div>
    );
  }

  const partnerData = partner as any;
  const tabLabels: Record<string, string> = {
    status: 'Status',
    deliveries: 'Deliveries',
    maps: 'Maps',
    history: 'History',
    wallet: 'Wallet',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <button onClick={() => setShowShifts(true)} className="p-1">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">{tabLabels[activeTab]}</h1>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <button onClick={handleLogout} className="p-1 ml-1">
            <LogOut className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'status' && (
          <StatusTab
            partner={partnerData}
            shifts={shifts || []}
            onStartShift={() => startShiftMutation.mutate()}
            onEndShift={(id: number) => endShiftMutation.mutate(id)}
          />
        )}
        {activeTab === 'deliveries' && (
          <DeliveriesTab
            deliveries={deliveries || []}
            onAccept={(id: string) => acceptMutation.mutate(id)}
            onDecline={(id: string) => declineMutation.mutate(id)}
            onDeliver={(id: string) => deliverMutation.mutate(id)}
          />
        )}
        {activeTab === 'maps' && <MapsTab />}
        {activeTab === 'history' && <HistoryTab selectedDate={selectedDate} onDateSelect={setSelectedDate} />}
        {activeTab === 'wallet' && <WalletTab selectedDate={selectedDate} onDateSelect={setSelectedDate} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {([
            { id: 'status', icon: CheckCircle, label: 'Status' },
            { id: 'deliveries', icon: Truck, label: 'Deliveries' },
            { id: 'maps', icon: Navigation, label: 'Maps' },
            { id: 'history', icon: Clock, label: 'History' },
            { id: 'wallet', icon: Wallet, label: 'Wallet' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
                  isActive ? 'text-amber-500' : 'text-gray-400'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryPartnerDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/delivery-partners/me", { credentials: "include" })
      .then((res) => { setIsAuthenticated(res.ok); })
      .catch(() => { setIsAuthenticated(false); });
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard />;
}
