import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const ProjectsPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get("/projects");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/projects", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setForm({ name: "", description: "" });
      setError("");
    },
    onError: (err) => {
      setError(err?.response?.data?.error || "Unable to create project");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name) {
      setError("Project name is required");
      return;
    }
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
    });
  };

  return (
    <section className="space-y-8">
      {user?.globalRole === "ADMIN" && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="text-lg font-semibold">Create a new project</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr,3fr,auto]">
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Project name"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Optional description"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects?.items?.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {project.name}
              </h3>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {project.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.description || "No description provided."}
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{project._count?.tasks || 0} tasks</span>
              <span>{project._count?.members || 0} members</span>
            </div>
          </Link>
        ))}
        {!projects?.items?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            No projects yet. Create one to get started.
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectsPage;
