import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
} from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/components/tasks/TimeTracker";

const statusStyles = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  SUBMITTED: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
};

const MyTimesheet = () => {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data } = useQuery({
    queryKey: ["timesheet", weekStart.toISOString()],
    queryFn: async () =>
      (await api.get(`/timesheets/me?weekStart=${format(weekStart, "yyyy-MM-dd")}`)).data,
  });

  const submitM = useMutation({
    mutationFn: (note) => api.post("/timesheets/submit", { weekStart: format(weekStart, "yyyy-MM-dd"), note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheet"] });
      toast.success("Timesheet submitted");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not submit"),
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    [weekStart]
  );

  const entries = data?.entries || [];
  const status = data?.status || "DRAFT";
  const totalMinutes = data?.totalMinutes || 0;

  const byDay = useMemo(() => {
    return days.map((day) => {
      const dayEntries = entries.filter((e) => isSameDay(parseISO(e.startedAt), day));
      const minutes = dayEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
      return { day, minutes, entries: dayEntries };
    });
  }, [days, entries]);

  const canSubmit = (status === "DRAFT" || status === "REJECTED") && totalMinutes > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => subWeeks(w, 1))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            This week
          </Button>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{status}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {byDay.map(({ day, minutes, entries: de }) => (
          <div key={day.toISOString()} className="border-b border-border last:border-0">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium">{format(day, "EEEE, MMM d")}</span>
              <span className="text-sm text-muted-foreground">{formatDuration(minutes)}</span>
            </div>
            {de.length > 0 && (
              <ul className="space-y-1 px-4 pb-2">
                {de.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">
                      {e.task?.title || "Task"}
                      {e.description ? ` · ${e.description}` : ""}
                    </span>
                    <span>{formatDuration(e.durationMinutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">Week total</span>
          <span className="text-sm font-semibold">{formatDuration(totalMinutes)}</span>
        </div>
      </div>

      {data?.timesheet?.reviewNote && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Reviewer note: {data.timesheet.reviewNote}
        </p>
      )}

      <div>
        <Button onClick={() => submitM.mutate(null)} disabled={!canSubmit || submitM.isPending}>
          {status === "SUBMITTED" ? "Submitted" : "Submit for approval"}
        </Button>
        {!canSubmit && status === "DRAFT" && (
          <span className="ml-3 text-xs text-muted-foreground">Log time on tasks to submit.</span>
        )}
      </div>
    </div>
  );
};

const ReviewQueue = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["timesheets-pending"],
    queryFn: async () => (await api.get("/timesheets/pending")).data,
  });

  const reviewM = useMutation({
    mutationFn: ({ id, status }) => api.post(`/timesheets/${id}/review`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets-pending"] });
      toast.success("Reviewed");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Review failed"),
  });

  const items = data?.items || [];

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No timesheets awaiting review.
        </p>
      ) : (
        items.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                Week of {format(new Date(t.weekStart), "MMM d, yyyy")} · {formatDuration(t.totalMinutes)} · {t.entryCount} entries
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => reviewM.mutate({ id: t.id, status: "APPROVED" })} disabled={reviewM.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reviewM.mutate({ id: t.id, status: "REJECTED" })} disabled={reviewM.isPending}>
                Reject
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const TimesheetsPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.globalRole === "ADMIN";
  const [tab, setTab] = useState("mine");

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timesheets</h1>
        {isAdmin && (
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              My timesheet
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

      {tab === "mine" || !isAdmin ? <MyTimesheet /> : <ReviewQueue />}
    </section>
  );
};

export default TimesheetsPage;
