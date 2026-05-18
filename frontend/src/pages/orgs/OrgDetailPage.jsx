import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Layers,
  Network,
  Plus,
  Trash2,
  ChevronLeft,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "members", label: "Members", icon: Users },
  { id: "departments", label: "Departments", icon: Network },
  { id: "teams", label: "Teams", icon: Layers },
];

const OrgDetailPage = () => {
  const { id } = useParams();
  const [tab, setTab] = useState("members");

  const { data: orgData } = useQuery({
    queryKey: ["org", id],
    queryFn: async () => (await api.get(`/orgs/${id}`)).data,
  });

  const org = orgData?.org;
  const myRole = orgData?.myRole;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <section className="space-y-6">
      <Link
        to="/orgs"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> All organizations
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="truncate text-xl font-semibold">{org?.name || "..."}</h2>
              {myRole && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {myRole}
                </span>
              )}
            </div>
            {org?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{org.description}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "members" && <MembersPanel orgId={id} canManage={canManage} />}
      {tab === "departments" && (
        <DepartmentsPanel orgId={id} canManage={canManage} />
      )}
      {tab === "teams" && <TeamsPanel orgId={id} canManage={canManage} />}
    </section>
  );
};

const MembersPanel = ({ orgId, canManage }) => {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/members`)).data,
  });

  const add = useMutation({
    mutationFn: (payload) => api.post(`/orgs/${orgId}/members`, payload),
    onSuccess: () => {
      setEmail("");
      setError("");
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
    onError: (err) => setError(err?.response?.data?.error || "Failed"),
  });

  const remove = useMutation({
    mutationFn: (userId) => api.delete(`/orgs/${orgId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members", orgId] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/orgs/${orgId}/members/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members", orgId] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) add.mutate({ email, role });
          }}
          className="mb-4 flex flex-wrap items-end gap-2"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="GUEST">Guest</option>
            </select>
          </div>
          <Button type="submit" disabled={add.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
          {error && <p className="w-full text-sm text-destructive">{error}</p>}
        </form>
      )}

      <ul className="divide-y divide-border">
        {data?.items?.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{m.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage ? (
                <select
                  value={m.role}
                  onChange={(e) =>
                    changeRole.mutate({ userId: m.user.id, role: e.target.value })
                  }
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="GUEST">Guest</option>
                </select>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {m.role}
                </span>
              )}
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Remove ${m.user.name}?`))
                      remove.mutate(m.user.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
        {(!data?.items || data.items.length === 0) && (
          <li className="py-4 text-sm text-muted-foreground">No members yet.</li>
        )}
      </ul>
    </div>
  );
};

const DepartmentsPanel = ({ orgId, canManage }) => {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data } = useQuery({
    queryKey: ["org-departments", orgId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/departments`)).data,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post(`/orgs/${orgId}/departments`, payload),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["org-departments", orgId] });
    },
  });

  const remove = useMutation({
    mutationFn: (deptId) => api.delete(`/orgs/${orgId}/departments/${deptId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-departments", orgId] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name) create.mutate({ name });
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={create.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </form>
      )}

      <ul className="divide-y divide-border">
        {data?.items?.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d._count?.users ?? 0} members · {d._count?.teams ?? 0} teams ·{" "}
                {d._count?.projects ?? 0} projects
              </p>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete department "${d.name}"?`))
                    remove.mutate(d.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {(!data?.items || data.items.length === 0) && (
          <li className="py-4 text-sm text-muted-foreground">No departments yet.</li>
        )}
      </ul>
    </div>
  );
};

const TeamsPanel = ({ orgId, canManage }) => {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data } = useQuery({
    queryKey: ["org-teams", orgId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/teams`)).data,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post(`/orgs/${orgId}/teams`, payload),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["org-teams", orgId] });
    },
  });

  const remove = useMutation({
    mutationFn: (teamId) => api.delete(`/orgs/${orgId}/teams/${teamId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-teams", orgId] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name) create.mutate({ name });
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Platform Team"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={create.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </form>
      )}

      <ul className="divide-y divide-border">
        {data?.items?.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <div className="min-w-0">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t._count?.members ?? 0} members · {t._count?.projects ?? 0} projects
                {t.department && ` · ${t.department.name}`}
              </p>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete team "${t.name}"?`)) remove.mutate(t.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {(!data?.items || data.items.length === 0) && (
          <li className="py-4 text-sm text-muted-foreground">No teams yet.</li>
        )}
      </ul>
    </div>
  );
};

export default OrgDetailPage;
