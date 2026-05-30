import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Play, Square, Plus, Trash2, Clock } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

export const formatDuration = (minutes) => {
  if (!minutes || minutes < 1) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(" ") || "0m";
};

const initials = (name) =>
  name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const TimeTracker = ({ taskId }) => {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ startedAt: "", endedAt: "", description: "" });
  const [now, setNow] = useState(Date.now());

  const { data } = useQuery({
    queryKey: ["task-time", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/time`)).data,
  });
  const { data: timerData } = useQuery({
    queryKey: ["my-timer"],
    queryFn: async () => (await api.get("/me/timer")).data,
    refetchInterval: 30000,
  });

  const running = timerData?.running || null;
  const runningHere = running && running.taskId === taskId;

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["task-time", taskId] });
    qc.invalidateQueries({ queryKey: ["my-timer"] });
    qc.invalidateQueries({ queryKey: ["timesheet"] });
  };

  const startM = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/time/start`, {}),
    onSuccess: invalidate,
    onError: (err) => toast.error(err?.response?.data?.error || "Could not start timer"),
  });
  const stopM = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/time/stop`),
    onSuccess: () => {
      invalidate();
      toast.success("Time logged");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not stop timer"),
  });
  const manualM = useMutation({
    mutationFn: (payload) => api.post(`/tasks/${taskId}/time`, payload),
    onSuccess: () => {
      invalidate();
      setShowManual(false);
      setManual({ startedAt: "", endedAt: "", description: "" });
      toast.success("Entry added");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not add entry"),
  });
  const deleteM = useMutation({
    mutationFn: (entryId) => api.delete(`/time/${entryId}`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err?.response?.data?.error || "Could not delete entry"),
  });

  const entries = data?.items || [];
  const totalMinutes = data?.totalMinutes || 0;

  const elapsed = runningHere
    ? Math.max(0, Math.round((now - new Date(running.startedAt).getTime()) / 1000))
    : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const submitManual = (e) => {
    e.preventDefault();
    if (!manual.startedAt || !manual.endedAt) {
      toast.error("Start and end are required");
      return;
    }
    manualM.mutate({
      startedAt: new Date(manual.startedAt).toISOString(),
      endedAt: new Date(manual.endedAt).toISOString(),
      description: manual.description || undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Time tracking</h3>
        <span className="ml-auto text-xs text-muted-foreground">Total: {formatDuration(totalMinutes)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {runningHere ? (
          <>
            <span className="font-mono text-sm tabular-nums text-foreground">
              {hh}:{mm}:{ss}
            </span>
            <Button size="sm" variant="destructive" onClick={() => stopM.mutate()} disabled={stopM.isPending}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Stop
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => startM.mutate()} disabled={startM.isPending || Boolean(running)}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Start timer
          </Button>
        )}
        {running && !runningHere && (
          <span className="text-xs text-amber-600">Timer running on “{running.task?.title}”</span>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowManual((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Manual
        </Button>
      </div>

      {showManual && (
        <form onSubmit={submitManual} className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Start
            <input
              type="datetime-local"
              value={manual.startedAt}
              onChange={(e) => setManual((m) => ({ ...m, startedAt: e.target.value }))}
              className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            End
            <input
              type="datetime-local"
              value={manual.endedAt}
              onChange={(e) => setManual((m) => ({ ...m, endedAt: e.target.value }))}
              className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <input
            type="text"
            placeholder="Description (optional)"
            value={manual.description}
            onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Button size="sm" type="submit" disabled={manualM.isPending}>
              Add entry
            </Button>
          </div>
        </form>
      )}

      <ul className="mt-4 space-y-2">
        {entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">No time logged yet.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
                title={entry.user?.name}
              >
                {initials(entry.user?.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {formatDuration(entry.durationMinutes)}
                  {entry.source === "MANUAL" && <span className="ml-1.5 text-xs text-muted-foreground">manual</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.startedAt ? format(new Date(entry.startedAt), "MMM d, HH:mm") : ""}
                  {entry.description ? ` · ${entry.description}` : ""}
                </p>
              </div>
              {(entry.userId === user?.id || user?.globalRole === "ADMIN") && (
                <button
                  type="button"
                  onClick={() => deleteM.mutate(entry.id)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TimeTracker;
