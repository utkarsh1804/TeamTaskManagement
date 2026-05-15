import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import TaskRow from "@/components/tasks/TaskRow";
import { Button } from "@/components/ui/button";

const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [linkRole, setLinkRole] = useState("MEMBER");

  const { data: projectData } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data;
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}/tasks`);
      return data;
    },
  });

  const project = projectData?.project;
  const members = project?.members || [];

  const isProjectAdmin = useMemo(() => {
    if (!project || !user) return false;
    if (user.globalRole === "ADMIN") return true;
    if (project.ownerId === user.id) return true;
    const membership = members.find((member) => member.userId === user.id);
    return membership?.role === "ADMIN";
  }, [project, user, members]);

  const { register, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assigneeId: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload) => api.post(`/projects/${id}/tasks`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post(`/projects/${id}/members`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setInvite({ email: "", role: "MEMBER" });
      setInviteError("");
    },
    onError: (err) => {
      setInviteError(err?.response?.data?.error || "Unable to invite member");
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: ({ projectId, role }) =>
      api.post(`/admin/projects/${projectId}/invite-link`, { role }),
    onSuccess: (res) => {
      setInviteLink(res.data.link);
    },
    onError: (err) => {
      setInviteError(err?.response?.data?.error || "Failed to generate link");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/projects/${id}/members/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const onSubmitTask = (values) => {
    const payload = {
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      assigneeId: values.assigneeId || null,
      description: values.description || undefined,
    };
    createTaskMutation.mutate(payload);
  };

  const handleInvite = (event) => {
    event.preventDefault();
    if (!invite.email) {
      setInviteError("Email is required");
      return;
    }
    inviteMutation.mutate(invite);
  };

  const handleGenerateLink = () => {
    generateLinkMutation.mutate({ projectId: id, role: linkRole });
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Project
        </p>
        <h2 className="text-2xl font-semibold text-foreground">
          {project?.name || "Loading project"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {project?.description || "No description."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmitTask)} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Create task</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Task title"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("title")}
          />
          <input
            type="text"
            placeholder="Short description"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("description")}
          />
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("status")}
          >
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("priority")}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <input
            type="date"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("dueDate")}
          />
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...register("assigneeId")}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name}
              </option>
            ))}
          </select>
        </div>
        {formState.errors?.title && (
          <p className="mt-2 text-xs text-destructive">
            {formState.errors.title.message}
          </p>
        )}
        <Button type="submit" className="mt-4" disabled={createTaskMutation.isPending}>
          {createTaskMutation.isPending ? "Creating..." : "Create task"}
        </Button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tasks</h3>
          {tasksData?.items?.length ? (
            tasksData.items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={(current, status) =>
                  statusMutation.mutate({ taskId: current.id, status })
                }
                onOpen={() => navigate(`/tasks/${task.id}`)}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              No tasks yet.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Members</h3>
            <div className="mt-4 space-y-3">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  {isProjectAdmin ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          updateRoleMutation.mutate({
                            userId: member.userId,
                            role: event.target.value,
                          })
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        className="text-xs text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isProjectAdmin && (
            <>
              <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold">Invite member by email</h3>
                <div className="mt-4 space-y-3">
                  <input
                    type="email"
                    value={invite.email}
                    onChange={(event) =>
                      setInvite((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="member@company.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={invite.role}
                    onChange={(event) =>
                      setInvite((prev) => ({ ...prev, role: event.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {inviteError && (
                    <p className="text-xs text-destructive">{inviteError}</p>
                  )}
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? "Inviting..." : "Send invite"}
                  </Button>
                </div>
              </form>

              {user?.globalRole === "ADMIN" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="text-lg font-semibold">Generate invite link</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a shareable link for this project.
                  </p>
                  <div className="mt-4 space-y-3">
                    <select
                      value={linkRole}
                      onChange={(event) => setLinkRole(event.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <Button
                      type="button"
                      onClick={handleGenerateLink}
                      disabled={generateLinkMutation.isPending}
                      className="w-full"
                    >
                      {generateLinkMutation.isPending ? "Generating..." : "Generate Link"}
                    </Button>
                    {inviteLink && (
                      <div className="flex items-center gap-2">
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
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProjectDetailPage;
