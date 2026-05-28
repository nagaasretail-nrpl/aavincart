import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Milk, ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Send, Package, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Pending Approval", color: "bg-amber-100 text-amber-800",  icon: Clock },
  approved:  { label: "Approved",         color: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  rejected:  { label: "Rejected",         color: "bg-red-100 text-red-800",      icon: XCircle },
  fulfilled: { label: "Fulfilled",        color: "bg-blue-100 text-blue-800",    icon: Package },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-800", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type EntitlementInfo = {
  entitlementLiters: number;
  usedLiters: number;
  remainingLiters: number;
};

function EntitlementCard({ info, loading }: { info?: EntitlementInfo; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading entitlement…</span>
        </CardContent>
      </Card>
    );
  }
  if (!info) return null;

  const pct = info.entitlementLiters > 0
    ? Math.min(100, (info.usedLiters / info.entitlementLiters) * 100)
    : 100;

  const isExhausted = info.remainingLiters <= 0;

  return (
    <Card className={isExhausted ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className={`h-5 w-5 ${isExhausted ? "text-red-500" : "text-green-600"}`} />
          <span className="text-sm font-semibold">Monthly Entitlement</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{info.entitlementLiters.toFixed(1)} L</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-700">{info.usedLiters.toFixed(1)} L</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${isExhausted ? "text-red-700" : "text-green-700"}`}>
              {info.remainingLiters.toFixed(1)} L
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        {isExhausted && (
          <p className="text-xs text-red-700 font-medium">
            You have used your full monthly entitlement. New requests are not allowed until next month.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FreeMilkRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [qty, setQty] = useState("");
  const [deliveryType, setDeliveryType] = useState("route");
  const [notes, setNotes] = useState("");

  const { data: entitlement, isLoading: loadingEntitlement } = useQuery<EntitlementInfo>({
    queryKey: ["/api/free-milk/entitlement"],
    enabled: !!user,
  });

  const { data: myRequests = [], isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ["/api/free-milk/my-requests"],
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/free-milk/request", {
      quantityLiters: parseFloat(qty),
      deliveryType,
      notes: notes.trim() || null,
    }),
    onSuccess: () => {
      toast({ title: "Request submitted", description: "Your free milk request has been submitted for approval." });
      setQty("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/entitlement"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    },
  });

  const hasPending = myRequests.some((r: any) => r.status === "pending");
  const remaining = entitlement?.remainingLiters ?? Infinity;
  const isExhausted = entitlement ? entitlement.remainingLiters <= 0 : false;
  const requestedQty = parseFloat(qty) || 0;
  const exceedsRemaining = entitlement ? requestedQty > entitlement.remainingLiters + 0.001 : false;
  const maxAllowed = entitlement ? Math.min(entitlement.remainingLiters, 100) : 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground px-4 pt-14 pb-6">
        <Link href="/services">
          <button className="flex items-center gap-1 text-primary-foreground/80 text-sm mb-3 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </button>
        </Link>
        <h1 className="text-2xl font-bold">Free Milk Request</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">
          Monthly milk entitlement for AAVIN employees.
        </p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        <EntitlementCard info={entitlement} loading={loadingEntitlement} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Milk className="h-5 w-5 text-green-600" />
              New Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPending && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                You already have a pending request awaiting approval.
              </div>
            )}

            {isExhausted && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                You have used your full monthly entitlement of{" "}
                <strong>{entitlement!.entitlementLiters.toFixed(1)} L</strong>. New requests
                will be available from next month.
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Quantity (Liters)</Label>
              <Input
                type="number"
                min="0.5"
                max={maxAllowed > 0 ? maxAllowed : 100}
                step="0.5"
                placeholder="e.g. 5"
                value={qty}
                onChange={e => setQty(e.target.value)}
                disabled={isExhausted}
              />
              {entitlement && !isExhausted && (
                <p className="text-xs text-muted-foreground">
                  You can request up to{" "}
                  <span className="font-semibold text-green-700">
                    {entitlement.remainingLiters.toFixed(1)} L
                  </span>{" "}
                  this month.
                </p>
              )}
              {exceedsRemaining && (
                <p className="text-xs text-red-600 font-medium">
                  Exceeds your remaining entitlement of {entitlement!.remainingLiters.toFixed(1)} L.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Delivery Method</Label>
              <Select value={deliveryType} onValueChange={setDeliveryType} disabled={isExhausted}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="route">Route Delivery (to your address)</SelectItem>
                  <SelectItem value="pickup">Walk-in Pickup (collect from depot)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any special instructions or address details…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isExhausted}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => submitMutation.mutate()}
              disabled={
                !qty ||
                parseFloat(qty) <= 0 ||
                submitMutation.isPending ||
                isExhausted ||
                exceedsRemaining
              }
            >
              {submitMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Submit Request</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Requests</h2>
          {loadingHistory ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
          ) : myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No requests yet. Submit your first request above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{parseFloat(r.quantityLiters).toFixed(1)} Liters</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.deliveryType === "pickup" ? "Walk-in Pickup" : "Route Delivery"} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground border-t pt-2">{r.notes}</p>
                    )}
                    {r.adminNotes && (
                      <>
                        <Separator />
                        <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                          <span className="font-medium">Admin note:</span> {r.adminNotes}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
