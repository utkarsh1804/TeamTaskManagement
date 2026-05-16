import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Trash2,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const statusColors = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

const statusIcons = {
  TODO: ListTodo,
  IN_PROGRESS: Clock,
  IN_REVIEW: AlertCircle,
  DONE: CheckCircle2,
};

const MemberCard = ({ member, projects, onRemove, onMove }) => {
  const [expanded, setExpanded] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [moveToProjectId, setMoveToProjectId] = useState("");
  const user = useAuthStore((state) => state.user);

  const { data: details, isLoading } = useQuery({
    queryKey: ["member-details", member.user.id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${member.user.id}`);
      return data.member;
    },
    enabled: expanded && user?.globalRole === "ADMIN",
  });

  const currentProjectIds = new Set(
    details?.projects?.map((p) => p.projectId) || member.projects.map(() => "")
  );

  const availableProjects = (projects?.items || []).filter(
    (p) => !member.projectIds.includes(p.id)
  );

  const activeProjects =
    details?.projects?.filter((p) => p.projectStatus === "ACTIVE") || [];
  const archivedProjects =
    details?.projects?.filter((p) => p.projectStatus === "ARCHIVED") || [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {member.user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{member.user.name}</p>
            <p className="text-xs text-muted-foreground">{member.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {member.projects.length} project{member.projects.length !== 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading details...</p>
          ) : details ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="text-lg font-semibold">{details.taskStats.total}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-semibold text-green-600">
                    {details.taskStats.byStatus.DONE}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {details.taskStats.byStatus.IN_PROGRESS}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-lg font-semibold">{details.taskStats.created}</p>
                </div>
              </div>

              {details.taskStats.total > 0 && (
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  {Object.entries(details.taskStats.byStatus).map(([status, count]) =>
                    count > 0 ? (
                      <div
                        key={status}
                        className={`${statusColors[status]} opacity-80`}
                        style={{ flex: count }}
                      />
                    ) : null
                  )}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Projects
                </h4>
                {activeProjects.length > 0 ? (
                  <div className="space-y-2">
                    {activeProjects.map((p) => (
                      <div
                        key={p.projectId}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.projectName}</p>
                          <p className="text-xs text-muted-foreground">
                            Role: {p.role} &middot; Joined{" "}
                            {new Date(p.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {user?.globalRole === "ADMIN" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(member.user.id, p.projectId, p.projectName);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active projects.</p>
                )}
              </div>

              {archivedProjects.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Previous Projects (Archived)
                  </h4>
                  <div className="space-y-2">
                    {archivedProjects.map((p) => (
                      <div
                        key={p.projectId}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 opacity-60"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.projectName}</p>
                          <p className="text-xs text-muted-foreground">
                            Role: {p.role} &middot; Archived
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details.tasks.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Tasks
                  </h4>
                  <div className="space-y-2">
                    {details.tasks.slice(0, 5).map((task) => {
                      const StatusIcon = statusIcons[task.status] || ListTodo;
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {task.project?.name || "Unknown"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColors[task.status]}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {user?.globalRole === "ADMIN" && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <a
                    href={`mailto:${member.user.email}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>

                  {availableProjects.length > 0 && (
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => setMoveMenuOpen(!moveMenuOpen)}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Move to Project
                      </Button>
                      {moveMenuOpen && (
                        <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
                          {availableProjects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setMoveToProjectId(p.id);
                                setMoveMenuOpen(false);
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {moveToProjectId && (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        onMove(member.user.id, member.projectIds[0], moveToProjectId);
                        setMoveToProjectId("");
                      }}
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      Confirm Move
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load details.</p>
          )}
        </div>
      )}
    </div>
  );
};

const MembersPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState({ projectId: "", email: "", role: "MEMBER" });
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [linkRole, setLinkRole] = useState("MEMBER");
  const [linkProjectId, setLinkProjectId] = useState("");
  const [addProjectId, setAddProjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [addMsg, setAddMsg] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get("/projects");
      return data;
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return data;
    },
    enabled: user?.globalRole === "ADMIN",
  });

  const members = useMemo(() => {
    const map = new Map();
    (projects?.items || []).forEach((project) => {
      (project.members || []).forEach((member) => {
        const entry = map.get(member.userId) || {
          user: member.user,
          projects: [],
          projectIds: [],
          roles: [],
        };
        entry.projects.push(project.name);
        entry.projectIds.push(project.id);
        entry.roles.push(member.role);
        map.set(member.userId, entry);
      });
    });
    return Array.from(map.values());
  }, [projects]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const projectMemberIds = useMemo(() => {
    if (!addProjectId || !projects?.items) return new Set();
    const project = projects.items.find((p) => p.id === addProjectId);
    if (!project) return new Set();
    return new Set((project.members || []).map((m) => m.userId));
  }, [addProjectId, projects]);

  const filteredUsers = useMemo(() => {
    if (!allUsers?.items) return [];
    return allUsers.items.filter(
      (u) =>
        !projectMemberIds.has(u.id) &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allUsers, projectMemberIds, searchTerm]);

  const inviteMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/admin/projects/${payload.projectId}/email-invite`, {
        email: payload.email,
        role: payload.role,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setInvite({ projectId: "", email: "", role: "MEMBER" });
      setError("");
      setInviteMsg(res.data.message);
      setTimeout(() => setInviteMsg(""), 4000);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || "Unable to invite member");
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: ({ projectId, role }) =>
      api.post(`/admin/projects/${projectId}/invite-link`, { role }),
    onSuccess: (res) => {
      setInviteLink(res.data.link);
      setError("");
    },
    onError: (err) => {
      setError(err?.response?.data?.error || "Failed to generate link");
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: ({ projectId, userIds }) =>
      api.post(`/admin/projects/${projectId}/add-members`, { userIds }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setSelectedIds(new Set());
      setAddMsg(res.data.message);
      setTimeout(() => setAddMsg(""), 3000);
    },
    onError: (err) => {
      setAddMsg(err?.response?.data?.error || "Failed to add members");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ userId, projectId }) =>
      api.delete(`/admin/users/${userId}/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["member-details"] });
    },
  });

  const moveMemberMutation = useMutation({
    mutationFn: ({ userId, fromProjectId, toProjectId }) =>
      api.post(`/admin/users/${userId}/move`, { fromProjectId, toProjectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["member-details"] });
    },
  });

  const handleInvite = (event) => {
    event.preventDefault();
    if (!invite.projectId || !invite.email) {
      setError("Select a project and enter an email");
      return;
    }
    inviteMutation.mutate(invite);
  };

  const handleGenerateLink = (event) => {
    event.preventDefault();
    if (!linkProjectId) {
      setError("Select a project");
      return;
    }
    generateLinkMutation.mutate({ projectId: linkProjectId, role: linkRole });
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  const toggleUser = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage members, view task stats, move between projects.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Search members by name or email..."
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredMembers.length ? (
          filteredMembers.map((member) => (
            <MemberCard
              key={member.user.id}
              member={member}
              projects={projects}
              onRemove={(userId, projectId, projectName) => {
                if (confirm(`Remove from "${projectName}"?`)) {
                  removeMemberMutation.mutate({ userId, projectId });
                }
              }}
              onMove={(userId, fromProjectId, toProjectId) => {
                moveMemberMutation.mutate({ userId, fromProjectId, toProjectId });
              }}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No members found.</p>
        )}
      </div>

      {user?.globalRole === "ADMIN" && (
        <>
          <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Invite member by email</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <select
                value={invite.projectId}
                onChange={(event) =>
                  setInvite((prev) => ({ ...prev, projectId: event.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {projects?.items?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                type="email"
                value={invite.email}
                onChange={(event) =>
                  setInvite((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="member@company.com"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={invite.role}
                onChange={(event) =>
                  setInvite((prev) => ({ ...prev, role: event.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            {inviteMsg && <p className="mt-2 text-xs text-green-600">{inviteMsg}</p>}
            <Button type="submit" className="mt-4" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Inviting..." : "Send invite"}
            </Button>
          </form>

          <form onSubmit={handleGenerateLink} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Generate invite link</h3>
            <p className="text-sm text-muted-foreground">
              Create a shareable link that lets anyone join a project.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <select
                value={linkProjectId}
                onChange={(event) => setLinkProjectId(event.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {projects?.items?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={linkRole}
                onChange={(event) => setLinkRole(event.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <Button type="submit" disabled={generateLinkMutation.isPending}>
                {generateLinkMutation.isPending ? "Generating..." : "Generate Link"}
              </Button>
            </div>

            {inviteLink && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="button" variant="outline" onClick={copyLink}>
                  Copy
                </Button>
              </div>
            )}
          </form>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Add members to project</h3>
            <p className="text-sm text-muted-foreground">
              Search and select existing users to add to a project.
            </p>
            <div className="mt-4 space-y-4">
              <select
                value={addProjectId}
                onChange={(event) => {
                  setAddProjectId(event.target.value);
                  setSelectedIds(new Set());
                  setSearchTerm("");
                  setAddMsg("");
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {projects?.items?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {addProjectId && (
                <>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />

                  {filteredUsers.length > 0 && (
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                      {filteredUsers.map((u) => (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {filteredUsers.length === 0 && searchTerm && (
                    <p className="text-sm text-muted-foreground">No matching users found.</p>
                  )}

                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                      </span>
                      <Button
                        type="button"
                        disabled={addMembersMutation.isPending}
                        onClick={() =>
                          addMembersMutation.mutate({
                            projectId: addProjectId,
                            userIds: Array.from(selectedIds),
                          })
                        }
                      >
                        {addMembersMutation.isPending
                          ? "Adding..."
                          : `Add ${selectedIds.size} Member${selectedIds.size > 1 ? "s" : ""}`}
                      </Button>
                    </div>
                  )}

                  {addMsg && (
                    <p className="text-xs text-muted-foreground">{addMsg}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default MembersPage;
