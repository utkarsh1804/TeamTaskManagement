import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Search } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const ENTITY_TYPES = ["", "Project", "Task", "ProjectMember", "Organization", "OrgMember", "Comment"];

const AuditLogPage = () => {
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    from: "",
    to: "",
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      const params = {};
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) params.to = new Date(filters.to).toISOString();
      params.page = filters.page;
      params.limit = 50;
      return (await api.get("/activity-log", { params })).data;
    },
  });

  const items = data?.items || [];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Audit Log</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every action taken across projects, tasks, and team management.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.action}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, action: e.target.value, page: 1 }))
                }
                placeholder="Search actions..."
                className="w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Entity</label>
            <select
              value={filters.entityType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, entityType: e.target.value, page: 1 }))
              }
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))
              }
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))
              }
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No activity matches these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Who</th>
                  <th className="px-4 py-2">Entity</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                      {format(new Date(it.createdAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-2">{it.user?.name || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {it.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-2">{it.action}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {it.project?.name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {data.page} of {data.totalPages} · {data.total} entries
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={filters.page >= data.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AuditLogPage;
