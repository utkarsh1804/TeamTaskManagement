import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ProjectsSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="mb-2 h-5 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    ))}
  </div>
);

const ProjectsPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const { data: projects, isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm({ name: "", description: "" });
      setFormError("");
      toast.success("Project created");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || "Unable to create project";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Project name is required");
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    });
  };

  return (
    <section className="space-y-8">
      {user?.globalRole === "ADMIN" && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6"
          aria-label="Create new project"
        >
          <h2 className="text-lg font-semibold">Create a new project</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr,3fr,auto]">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Project name"
              aria-label="Project name"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              aria-label="Project description"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
          {formError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {formError}
            </p>
          )}
        </form>
      )}

      {isLoading ? (
        <ProjectsSkeleton />
      ) : projects?.items?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.items.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`Open project ${project.name}`}
            >
              <h3 className="font-semibold text-foreground">{project.name}</h3>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>{project._count?.tasks ?? 0} tasks</span>
                <span>{project._count?.members ?? 0} members</span>
                <span
                  className={
                    project.status === "ACTIVE"
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }
                >
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No projects yet.{" "}
          {user?.globalRole === "ADMIN" && "Create your first project above."}
        </div>
      )}
    </section>
  );
};

export default ProjectsPage;
