import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  CheckCircle, LogOut, Phone, Lock, MapPin, Truck,
  Bell, ChevronLeft, ChevronRight, X,
  Clock, Map, History, Wallet, Package, Navigation,
  Calendar, Car, Play, Square, ArrowRight, User,
  DollarSign, Timer, TrendingUp
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/30">
            <Truck className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Driver Login</h1>
          <p className="text-sm text-gray-400 mt-2">Sign in to your delivery dashboard</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-5">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className="h-12 pl-12 rounded-xl text-base" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-12 pl-12 rounded-xl text-base" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-base" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <Link href="/delivery-partner/register" className="text-amber-600 hover:underline font-semibold">Register here</Link>
          </p>
        </div>
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
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 rounded-xl mx-4 mb-4">
      {days.map((d) => {
        const isSelected = d.iso === selectedDate.toISOString().split('T')[0];
        const isToday = d.iso === today;
        return (
          <button
            key={d.iso}
            onClick={() => onSelect(d.full)}
            className={`flex flex-col items-center py-2.5 px-3 rounded-xl transition-all min-w-[44px] ${
              isSelected ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : isToday ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400'
            }`}
          >
            <span className="text-[13px] font-medium">{d.label}</span>
            <span className={`text-sm font-bold mt-1 ${isSelected ? 'text-white' : ''}`}>{d.date < 10 ? `0${d.date}` : d.date}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusTab({ partner, shifts, onStartShift, onEndShift, onToggleOnline }: any) {
  const currentShift = shifts?.find((s: any) => s.status === 'ongoing');
  const isOnline = partner?.isOnline || !!currentShift;
  const todayDeliveries = partner?.totalDeliveries || 0;
  const todayEarnings = partner?.todayEarnings || '0.00';
  const hoursWorked = currentShift ? Math.round((Date.now() - new Date(currentShift.startTime).getTime()) / 3600000 * 10) / 10 : 0;

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400 font-medium">Status</p>
            <p className={`text-2xl font-bold ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          <div
            onClick={onToggleOnline}
            className={`w-16 h-9 rounded-full flex items-center cursor-pointer transition-all duration-300 ${
              isOnline ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
          >
            <div className="w-7 h-7 bg-white rounded-full mx-1 shadow-md transition-all" />
          </div>
        </div>
        <div className={`text-xs font-medium px-3 py-1.5 rounded-full inline-block ${
          isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'
        }`}>
          {isOnline ? '● Receiving orders' : '○ Not receiving orders'}
        </div>
      </div>

      {currentShift ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900">Current Shift</h3>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-green-50 rounded-xl px-4 py-3 text-center min-w-[56px]">
              <span className="text-[12px] text-green-600 font-medium">
                {new Date(currentShift.startTime).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <p className="text-xl font-bold text-green-700">{new Date(currentShift.startTime).getDate()}</p>
              <span className="text-[12px] text-green-500 font-medium">Today</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {currentShift.scheduledStart || new Date(currentShift.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {currentShift.scheduledEnd || 'Ongoing'}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Car className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-gray-600">{currentShift.vehicleInfo || 'Vehicle'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">{currentShift.location}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No active shift</p>
          <p className="text-xs text-gray-400 mt-1">Start a shift to begin receiving orders</p>
        </div>
      )}

      {currentShift ? (
        <button
          onClick={() => onEndShift(currentShift.id)}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
        >
          <Square className="h-5 w-5" />
          End Shift
        </button>
      ) : (
        <button
          onClick={onStartShift}
          className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <Play className="h-5 w-5" />
          Start Shift
        </button>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <Package className="h-5 w-5 text-blue-500 mx-auto mb-1.5" />
          <p className="text-xl font-bold text-blue-700">{todayDeliveries}</p>
          <p className="text-[12px] text-blue-500 font-medium mt-0.5">Deliveries</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
          <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1.5" />
          <p className="text-xl font-bold text-green-700">₹{todayEarnings}</p>
          <p className="text-[12px] text-green-500 font-medium mt-0.5">Earnings</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <Timer className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-xl font-bold text-amber-700">{hoursWorked}h</p>
          <p className="text-[12px] text-amber-500 font-medium mt-0.5">Hours</p>
        </div>
      </div>
    </div>
  );
}

function DeliveriesTab({ deliveries, onAccept, onDecline, onDeliver }: any) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="h-10 w-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-700">No active deliveries</h3>
        <p className="text-sm text-gray-400 mt-2">New orders will appear here when assigned to you</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {deliveries.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Order #{order.orderId || order.id}</h3>
            </div>
            {order.status === 'assigned_to_delivery' && (
              <button onClick={() => onDecline(order.id)} className="text-xs text-red-500 font-bold px-3 py-1.5 rounded-lg bg-red-50 active:bg-red-100">
                Decline
              </button>
            )}
          </div>

          <div className="bg-gray-100 h-28 flex items-center justify-center">
            <div className="text-center">
              <Map className="h-8 w-8 text-gray-400 mx-auto mb-1" />
              <span className="text-xs text-gray-400">Route Map</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Delivery Details</h4>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-red-200" />
                <div className="w-0.5 h-8 bg-gray-200" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-amber-200" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-[13px] text-gray-400 font-semibold uppercase">Pickup</p>
                  <p className="text-sm font-semibold text-gray-900">{order.pickupAddress || 'Aavin Parlour'}</p>
                </div>
                <div>
                  <p className="text-[13px] text-gray-400 font-semibold uppercase">Drop-off</p>
                  <p className="text-sm font-semibold text-gray-900">{order.dropoffAddress || order.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400">Order total</span>
                <p className="text-xl font-bold text-gray-900">₹{parseFloat(order.total || '0').toFixed(2)}</p>
              </div>
              {order.status === 'assigned_to_delivery' && (
                <button
                  onClick={() => onAccept(order.id)}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] shadow-lg shadow-green-500/20"
                >
                  Accept <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {order.status === 'out_for_delivery' && (
                <button
                  onClick={() => onDeliver(order.id)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97] shadow-lg shadow-blue-500/20"
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

function MapsTab() {
  return (
    <div className="px-4 py-16 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <Navigation className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-700">Route Maps</h3>
      <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Maps will appear here when you have active deliveries</p>
      <p className="text-xs text-gray-300 mt-2">Accept a delivery to see the route</p>
    </div>
  );
}

function HistoryTab({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (d: Date) => void }) {
  const dateStr = selectedDate.toISOString().split('T')[0];
  const { data: historyData, isLoading } = useQuery<{ totalDelivered: number; cashCollected: string; deliveryEarnings: string; orders: any[] }>({
    queryKey: [`/api/delivery-partners/history?date=${dateStr}`],
  });

  return (
    <div className="py-4">
      <WeekCalendar selectedDate={selectedDate} onSelect={onDateSelect} />

      <div className="px-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-center shadow-lg shadow-blue-500/20">
            <Package className="h-5 w-5 text-white/80 mx-auto mb-1" />
            <p className="text-white text-2xl font-bold">{historyData?.totalDelivered || 0}</p>
            <p className="text-white/70 text-[12px] font-medium mt-0.5">Delivered</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-center shadow-lg shadow-green-500/20">
            <DollarSign className="h-5 w-5 text-white/80 mx-auto mb-1" />
            <p className="text-white text-2xl font-bold">₹{historyData?.cashCollected || '0'}</p>
            <p className="text-white/70 text-[12px] font-medium mt-0.5">Cash</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-center shadow-lg shadow-amber-500/20">
            <TrendingUp className="h-5 w-5 text-white/80 mx-auto mb-1" />
            <p className="text-white text-2xl font-bold">₹{historyData?.deliveryEarnings || '0'}</p>
            <p className="text-white/70 text-[12px] font-medium mt-0.5">Earnings</p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Transaction history</h3>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !historyData?.orders || historyData.orders.length === 0 ? (
            <div className="py-10 text-center">
              <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No deliveries on this date</p>
            </div>
          ) : (
            <div className="space-y-1">
              {historyData.orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-500" />
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
    <div className="py-4">
      <WeekCalendar selectedDate={selectedDate} onSelect={onDateSelect} />

      <div className="px-4 space-y-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-amber-500/20">
          <div>
            <p className="text-xs text-amber-100 font-medium">Available balance</p>
            <p className="text-3xl font-bold text-white mt-1">₹{parseFloat(walletData?.balance || '0').toFixed(2)}</p>
          </div>
          <button
            onClick={() => setShowCashIn(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] backdrop-blur-sm border border-white/20"
          >
            CASH IN
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Wallet transactions</h3>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !walletData?.transactions || walletData.transactions.length === 0 ? (
            <div className="py-10 text-center">
              <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No wallet transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {walletData.transactions.map((txn: any) => (
                <div key={txn.id} className="flex items-start justify-between py-3.5 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${parseFloat(txn.amount) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <DollarSign className={`h-5 w-5 ${parseFloat(txn.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">₹{Math.abs(parseFloat(txn.amount)).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{txn.description || typeLabels[txn.type] || txn.type}</p>
                      {txn.referenceId && <p className="text-[12px] text-gray-400">{txn.referenceId}</p>}
                      <p className="text-[12px] text-gray-400">
                        {new Date(txn.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.balanceAfter ? `₹${parseFloat(txn.balanceAfter).toFixed(2)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCashIn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add to your balance</h3>
              <button onClick={() => setShowCashIn(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">How much do you want to add to your account?</p>
            <div className="mb-6">
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Enter top up amount</label>
              <Input
                type="number"
                value={cashInAmount}
                onChange={(e) => setCashInAmount(e.target.value)}
                className="h-12 rounded-xl text-lg font-semibold"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCashIn(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => cashInMutation.mutate(cashInAmount)}
                disabled={cashInMutation.isPending}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
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

function Dashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'status' | 'deliveries' | 'maps' | 'history' | 'wallet'>('status');
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const toggleOnlineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/delivery-partners/me/toggle-online", {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/delivery-partners/me'] });
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
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const partnerData = partner as any;
  const isOnline = partnerData?.isOnline;

  const tabs = [
    { id: 'status' as const, icon: CheckCircle, label: 'Status' },
    { id: 'deliveries' as const, icon: Truck, label: 'Deliveries' },
    { id: 'maps' as const, icon: Navigation, label: 'Maps' },
    { id: 'history' as const, icon: Clock, label: 'History' },
    { id: 'wallet' as const, icon: Wallet, label: 'Wallet' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-4 flex items-center justify-between safe-area-inset-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
            <User className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold">{partnerData?.name || 'Driver'}</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span className="text-[13px] text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-400" />
          </button>
          <button onClick={handleLogout} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
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
            onToggleOnline={() => toggleOnlineMutation.mutate()}
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all min-w-[60px] ${
                  isActive ? 'text-amber-500 bg-amber-50' : 'text-gray-400'
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[12px] font-medium ${isActive ? 'font-bold' : ''}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MobileDriverDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/delivery-partners/me", { credentials: "include" })
      .then((res) => { setIsAuthenticated(res.ok); })
      .catch(() => { setIsAuthenticated(false); });
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard />;
}