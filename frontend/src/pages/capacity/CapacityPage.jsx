import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";

const heat = (ratio) => {
  if (ratio <= 0) return "bg-muted text-muted-foreground";
  if (ratio < 0.25) return "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100";
  if (ratio < 0.5) return "bg-lime-200 text-lime-900 dark:bg-lime-900 dark:text-lime-100";
  if (ratio < 0.75) return "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100";
  return "bg-red-300 text-red-900 dark:bg-red-900 dark:text-red-100";
};

const initials = (name) =>
  name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const CapacityPage = () => {
  const { data } = useQuery({
    queryKey: ["capacity"],
    queryFn: async () => (await api.get("/capacity")).data,
  });

  const maxTasks = data?.maxTasks || 0;
  const rows = useMemo(() => {
    const items = data?.items || [];
    return items
      .filter((i) => i.openTasks > 0 || i.onLeaveNow)
      .sort((a, b) => b.openTasks - a.openTasks || b.estimatedHours - a.estimatedHours);
  }, [data]);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Capacity & workload</h1>
        <p className="text-sm text-muted-foreground">Open (non-done) workload per assignee, with current leave.</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No open assigned workload right now.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Member</th>
                <th className="px-4 py-2 text-center font-medium">Open tasks</th>
                <th className="px-4 py-2 text-center font-medium">Est. hours</th>
                <th className="px-4 py-2 text-center font-medium">Story pts</th>
                <th className="px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                        {initials(r.user.name)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{r.user.name}</p>
                        {r.user.jobTitle && <p className="text-xs text-muted-foreground">{r.user.jobTitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block min-w-[2rem] rounded px-2 py-1 text-xs font-semibold ${heat(maxTasks ? r.openTasks / maxTasks : 0)}`}>
                      {r.openTasks}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-foreground">{r.estimatedHours || "—"}</td>
                  <td className="px-4 py-2 text-center text-foreground">{r.storyPoints || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    {r.onLeaveNow ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                        On leave
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CapacityPage;
