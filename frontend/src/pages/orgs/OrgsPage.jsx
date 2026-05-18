import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus, Users, FolderKanban, Layers } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: z
    .string()
    .min(2, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().max(500).optional(),
});

const OrgsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: async () => (await api.get("/orgs")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/orgs", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      setShowForm(false);
      reset();
      setError("");
    },
    onError: (err) => setError(err?.response?.data?.error || "Failed"),
  });

  const onSubmit = (values) => createMutation.mutate(values);

  const items = data?.items || [];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Organizations</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Group your projects, departments, and teams by organization.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New organization
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 grid gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-2"
          >
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Acme Corp"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="acme-corp"
                {...register("slug")}
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-destructive">{errors.slug.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                {...register("description")}
              />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  reset();
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No organizations yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((org) => (
            <Link
              key={org.id}
              to={`/orgs/${org.id}`}
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{org.name}</h3>
                  <p className="text-xs text-muted-foreground">@{org.slug}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {org.myRole}
                </span>
              </div>
              {org.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {org.description}
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Stat icon={Users} label="Members" value={org._count?.members ?? 0} />
                <Stat icon={Layers} label="Teams" value={org._count?.teams ?? 0} />
                <Stat
                  icon={FolderKanban}
                  label="Projects"
                  value={org._count?.projects ?? 0}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border border-border bg-background px-2 py-1.5">
    <div className="flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
    <p className="mt-0.5 font-semibold">{value}</p>
  </div>
);

export default OrgsPage;
