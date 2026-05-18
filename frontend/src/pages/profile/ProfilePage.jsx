import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [nameForm, setNameForm] = useState({ name: user?.name || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const nameMutation = useMutation({
    mutationFn: (data) => api.patch("/auth/profile", data),
    onSuccess: ({ data }) => {
      setUser(data.user);
      toast.success("Name updated successfully");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to update name"),
  });

  const pwMutation = useMutation({
    mutationFn: (data) => api.patch("/auth/password", data),
    onSuccess: () => {
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      setPwError("");
      toast.success("Password changed successfully");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to change password"),
  });

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!nameForm.name.trim()) return;
    nameMutation.mutate({ name: nameForm.name.trim() });
  };

  const handlePwSubmit = (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    setPwError("");
    pwMutation.mutate({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-xl font-bold text-background">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {user?.globalRole}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Edit name</h3>
        <form onSubmit={handleNameSubmit} className="flex gap-3">
          <input
            type="text"
            value={nameForm.name}
            onChange={(e) => setNameForm({ name: e.target.value })}
            placeholder="Your name"
            aria-label="Name"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={nameMutation.isPending}>
            {nameMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Change password</h3>
        <form onSubmit={handlePwSubmit} className="space-y-3">
          <input
            type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
            placeholder="Current password"
            aria-label="Current password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
            placeholder="New password"
            aria-label="New password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {pwError && (
            <p role="alert" className="text-xs text-destructive">
              {pwError}
            </p>
          )}
          <Button type="submit" disabled={pwMutation.isPending} className="w-full">
            {pwMutation.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Min 8 characters, one uppercase letter, one number.
        </p>
      </div>
    </section>
  );
};

export default ProfilePage;
