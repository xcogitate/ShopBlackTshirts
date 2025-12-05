import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { AlertCircle, RefreshCw, ShieldX, TriangleAlert } from "lucide-react";

import AdminSignInForm from "@/components/ui/AdminSignInForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { auth } from "@/lib/firebase";
import { getFreshIdToken } from "@/lib/auth-client";

type AdminCart = {
  id: string;
  status: string;
  email: string | null;
  userId: string | null;
  items: Array<{ name?: string; qty?: number; price?: number }>;
  subtotal: number;
  lastActivityAt: string | null;
  abandonedAt: string | null;
  nextReminderAt: string | null;
  reminderStep: number;
  optedOut: boolean;
  bounced?: boolean;
};

const formatMoney = (value: number | null | undefined, currency = "USD") => {
  if (!Number.isFinite(value ?? NaN)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value ?? 0);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusColor = (status: string) => {
  switch (status) {
    case "abandoned":
      return "bg-orange-500/20 text-orange-200";
    case "recovered":
      return "bg-emerald-500/20 text-emerald-100";
    case "opted_out":
      return "bg-gray-500/20 text-gray-100";
    default:
      return "bg-slate-500/20 text-slate-100";
  }
};

export default function AbandonedCartsSection() {
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [carts, setCarts] = useState<AdminCart[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("abandoned");
  const [minSubtotal, setMinSubtotal] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setIdToken(null);
        return;
      }
      const token = await getFreshIdToken(user);
      setIdToken(token);
    });
    return () => unsubscribe();
  }, []);

  const loadCarts = useMemo(
    () => async () => {
      if (!idToken) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        const min = Number(minSubtotal);
        if (Number.isFinite(min) && min > 0) params.set("minSubtotal", String(min));
        params.set("limit", "200");
        params.set("hasEmail", "true");

        const response = await fetch(`/api/admin/carts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!response.ok) {
          throw new Error("Unable to load carts");
        }
        const data = (await response.json()) as { carts?: AdminCart[]; error?: string };
        if (data.error) {
          throw new Error(data.error);
        }
        setCarts(data.carts ?? []);
      } catch (err) {
        console.error("[admin carts] load error", err);
        setError("Unable to load abandoned carts.");
        toast({
          title: "Load failed",
          description: "Could not load abandoned carts.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [idToken, minSubtotal, statusFilter, toast],
  );

  useEffect(() => {
    void loadCarts();
  }, [loadCarts]);

  if (!firebaseUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
          <AdminSignInForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">Admin Portal</p>
          <h1 className="mt-2 text-3xl font-bold">Abandoned carts</h1>
          <p className="text-sm text-gray-400">Monitor carts marked abandoned, reminder progress, and opt-outs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadCarts()}
            disabled={loading}
            className="border border-white/15 text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-[0.25em] text-[#F5A623]">
              Abandoned (filter)
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {carts.filter((c) => c.status === statusFilter || !statusFilter).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-[0.25em] text-[#F5A623]">
              Recovered
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {carts.filter((c) => c.status === "recovered").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-[0.25em] text-[#F5A623]">
              Opted out / bounced
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {carts.filter((c) => c.optedOut || c.bounced).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mx-auto mt-6 max-w-6xl border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Reminders control</CardTitle>
          <CardDescription>Filter carts and resend or pause reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white"
                >
                  <option value="">All</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="active">Active</option>
                  <option value="recovered">Recovered</option>
                  <option value="opted_out">Opted out</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-400">Min subtotal</p>
                <Input
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value)}
                  className="mt-1 h-10 w-32 border-white/10 bg-black/60 text-sm text-white"
                  placeholder="0"
                />
              </div>
            </div>
            <Button className="bg-[#F5A623] text-black hover:bg-[#E09612]" onClick={() => void loadCarts()}>
              Apply
            </Button>
          </div>

          <Separator className="border-white/10" />

          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Cart</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Items</TableHead>
                  <TableHead className="text-gray-400">Subtotal</TableHead>
                  <TableHead className="text-gray-400">Last activity</TableHead>
                  <TableHead className="text-gray-400">Reminder</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="text-center text-sm text-gray-400">
                      {loading ? "Loading..." : "No carts found for this filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  carts.map((cart) => (
                    <TableRow key={cart.id} className="border-white/10">
                      <TableCell className="text-sm text-white">
                        <div className="flex flex-col">
                          <span className="font-semibold">{cart.id.slice(0, 10)}…</span>
                          <span className="text-xs text-gray-500">
                            {cart.userId ? `User ${cart.userId}` : "Guest"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(cart.status)}>{cart.status}</Badge>
                        {cart.bounced ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] uppercase text-red-300">
                            <ShieldX className="h-3 w-3" />
                            Bounced
                          </div>
                        ) : null}
                        {cart.optedOut ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] uppercase text-gray-300">
                            <TriangleAlert className="h-3 w-3" />
                            Opted out
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-gray-200">{cart.items?.length ?? 0} items</TableCell>
                      <TableCell className="text-sm text-gray-200">{formatMoney(cart.subtotal)}</TableCell>
                      <TableCell className="text-sm text-gray-200">{formatDateTime(cart.lastActivityAt)}</TableCell>
                      <TableCell className="text-sm text-gray-200">
                        Step {cart.reminderStep ?? 0}
                        <div className="text-xs text-gray-500">Next: {formatDateTime(cart.nextReminderAt)}</div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-200">{cart.email ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
