import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

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
          roles: [],
        };
        entry.projects.push(project.name);
        entry.roles.push(member.role);
        map.set(member.userId, entry);
      });
    });
    return Array.from(map.values());
  }, [projects]);

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
    mutationFn: (payload) => api.post(`/projects/${payload.projectId}/members`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setInvite({ projectId: "", email: "", role: "MEMBER" });
      setError("");
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
          All members across your projects.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Roster</h3>
        <div className="mt-4 space-y-3">
          {members.length ? (
            members.map((member) => (
              <div key={member.user.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Projects: {member.projects.join(", ")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          )}
        </div>
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
