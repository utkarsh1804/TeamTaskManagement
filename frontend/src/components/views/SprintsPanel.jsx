import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const statusStyles = {
  PLANNED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
};

const Burndown = ({ sprintId }) => {
  const { data } = useQuery({
    queryKey: ["burndown", sprintId],
    queryFn: async () => (await api.get(`/sprints/${sprintId}/burndown`)).data,
    enabled: !!sprintId,
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading burndown…</p>;
  const points = data.points || [];
  if (points.length < 2 || data.total === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data for a burndown yet (add tasks with story points).</p>;
  }

  const W = 520;
  const H = 180;
  const pad = 28;
  const total = data.total;
  const n = points.length;
  const x = (i) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - v / total) * (H - pad * 2);

  const idealPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.ideal)}`).join(" ");
  const actualPts = points.filter((p) => p.actualRemaining != null);
  const actualPath = actualPts
    .map((p) => `${p === actualPts[0] ? "M" : "L"} ${x(points.indexOf(p))} ${y(p.actualRemaining)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="max-w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-border" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} className="stroke-border" />
        <text x={pad} y={pad - 8} className="fill-muted-foreground text-[10px]">{total} {data.metric}</text>
        <path d={idealPath} fill="none" className="stroke-muted-foreground/50" strokeWidth="1.5" strokeDasharray="4 4" />
        {actualPath && <path d={actualPath} fill="none" className="stroke-blue-500" strokeWidth="2" />}
        {actualPts.map((p) => (
          <circle key={p.date} cx={x(points.indexOf(p))} cy={y(p.actualRemaining)} r="2.5" className="fill-blue-500" />
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-muted-foreground/50" /> Ideal</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-blue-500" /> Actual</span>
      </div>
    </div>
  );
};

const SprintsPanel = ({ projectId, tasks = [], isAdmin }) => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [assignIds, setAssignIds] = useState(new Set());

  const { data } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}/sprints`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sprints", projectId] });
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  };

  const createM = useMutation({
    mutationFn: (payload) => api.post(`/projects/${projectId}/sprints`, payload),
    onSuccess: () => {
      invalidate();
      setCreating(false);
      setForm({ name: "", goal: "", startDate: "", endDate: "" });
      toast.success("Sprint created");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not create sprint"),
  });
  const updateM = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/sprints/${id}`, body),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["burndown"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Update failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id) => api.delete(`/sprints/${id}`),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      toast.success("Sprint deleted");
    },
  });
  const assignM = useMutation({
    mutationFn: ({ id, taskIds }) => api.post(`/sprints/${id}/tasks`, { taskIds }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["burndown"] });
      setAssignIds(new Set());
      toast.success("Tasks added to sprint");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not add tasks"),
  });

  const sprints = data?.items || [];
  const selected = sprints.find((s) => s.id === selectedId) || null;
  const sprintTasks = useMemo(() => tasks.filter((t) => t.sprintId === selectedId), [tasks, selectedId]);
  const unassigned = useMemo(() => tasks.filter((t) => !t.sprintId), [tasks]);

  const submitCreate = (e) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Name, start and end are required");
      return;
    }
    createM.mutate({
      name: form.name,
      goal: form.goal || undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprints</h3>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New sprint
          </Button>
        )}
      </div>

      {creating && isAdmin && (
        <form onSubmit={submitCreate} className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Sprint name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Goal (optional)"
            value={form.goal}
            onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="text-xs text-muted-foreground">
            Start
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-muted-foreground">
            End
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={createM.isPending}>Create sprint</Button>
          </div>
        </form>
      )}

      {sprints.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No sprints yet.</p>
      ) : (
        <div className="space-y-2">
          {sprints.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.startDate), "MMM d")} – {format(new Date(s.endDate), "MMM d")} · {s._count?.tasks ?? 0} tasks
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[s.status]}`}>{s.status}</span>
              </button>

              {selectedId === s.id && (
                <div className="space-y-4 border-t border-border px-4 py-3">
                  {s.goal && <p className="text-sm text-muted-foreground">Goal: {s.goal}</p>}

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {s.status !== "ACTIVE" && (
                        <Button size="sm" onClick={() => updateM.mutate({ id: s.id, body: { status: "ACTIVE" } })}>Start</Button>
                      )}
                      {s.status !== "COMPLETED" && (
                        <Button size="sm" variant="outline" onClick={() => updateM.mutate({ id: s.id, body: { status: "COMPLETED" } })}>Complete</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Delete this sprint?")) deleteM.mutate(s.id); }}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  )}

                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Burndown</p>
                    <Burndown sprintId={s.id} />
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Tasks in sprint ({sprintTasks.length})</p>
                    {sprintTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">None yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {sprintTasks.map((t) => (
                          <li key={t.id} className="text-sm text-foreground">• {t.title} <span className="text-xs text-muted-foreground">({t.status})</span></li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {isAdmin && unassigned.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">Add unassigned tasks</p>
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                        {unassigned.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={assignIds.has(t.id)}
                              onChange={(e) => {
                                setAssignIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(t.id);
                                  else next.delete(t.id);
                                  return next;
                                });
                              }}
                            />
                            <span className="truncate">{t.title}</span>
                          </label>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={assignIds.size === 0 || assignM.isPending}
                        onClick={() => assignM.mutate({ id: s.id, taskIds: Array.from(assignIds) })}
                      >
                        Add {assignIds.size > 0 ? `(${assignIds.size})` : ""}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SprintsPanel;
