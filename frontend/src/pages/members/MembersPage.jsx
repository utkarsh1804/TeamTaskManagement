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

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get("/projects");
      return data;
    },
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

  const handleInvite = (event) => {
    event.preventDefault();
    if (!invite.projectId || !invite.email) {
      setError("Select a project and enter an email");
      return;
    }
    inviteMutation.mutate(invite);
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
        <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Invite member</h3>
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
      )}
    </section>
  );
};

export default MembersPage;
