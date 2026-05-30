import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const TYPES = ["VACATION", "SICK", "PERSONAL", "OTHER"];

const MyLeave = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: "VACATION", startDate: "", endDate: "", reason: "" });

  const { data } = useQuery({
    queryKey: ["my-leave"],
    queryFn: async () => (await api.get("/leave/me")).data,
  });

  const createM = useMutation({
    mutationFn: (payload) => api.post("/leave", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave"] });
      setForm({ type: "VACATION", startDate: "", endDate: "", reason: "" });
      toast.success("Leave requested");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not request leave"),
  });

  const cancelM = useMutation({
    mutationFn: (id) => api.post(`/leave/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leave"] });
      toast.success("Request cancelled");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not cancel"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    createM.mutate({
      type: form.type,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      reason: form.reason || undefined,
    });
  };

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Type
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <div />
        <label className="text-xs text-muted-foreground">
          Start
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          End
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={createM.isPending}>
            Request leave
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests yet.</p>
        ) : (
          items.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {l.type.charAt(0) + l.type.slice(1).toLowerCase()} ·{" "}
                  {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                </p>
                {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
                {l.reviewNote && <p className="text-xs text-muted-foreground">Note: {l.reviewNote}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[l.status]}`}>{l.status}</span>
              {l.status === "PENDING" && (
                <Button size="sm" variant="ghost" onClick={() => cancelM.mutate(l.id)} disabled={cancelM.isPending}>
                  Cancel
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ReviewQueue = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["leave-pending"],
    queryFn: async () => (await api.get("/leave/pending")).data,
  });

  const reviewM = useMutation({
    mutationFn: ({ id, status }) => api.post(`/leave/${id}/review`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-pending"] });
      toast.success("Reviewed");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Review failed"),
  });

  const items = data?.items || [];

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No leave requests awaiting review.
        </p>
      ) : (
        items.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{l.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {l.type.charAt(0) + l.type.slice(1).toLowerCase()} ·{" "}
                {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                {l.reason ? ` · ${l.reason}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => reviewM.mutate({ id: l.id, status: "APPROVED" })} disabled={reviewM.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reviewM.mutate({ id: l.id, status: "REJECTED" })} disabled={reviewM.isPending}>
                Reject
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const LeavePage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.globalRole === "ADMIN";
  const [tab, setTab] = useState("mine");

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leave & PTO</h1>
        {isAdmin && (
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              My leave
            </button>
            <button
              type="button"
              onClick={() => setTab("review")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "review" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Review queue
            </button>
          </div>
        )}
      </div>
      {tab === "mine" || !isAdmin ? <MyLeave /> : <ReviewQueue />}
    </section>
  );
};

export default LeavePage;
