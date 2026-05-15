import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const AdminRequestsPage = () => {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data } = await api.get("/admin/admin-requests");
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/admin-requests/${id}/approve`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      setMsg(`Approved: ${res.data.user?.email}`);
    },
    onError: (err) => setMsg(err?.response?.data?.error || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/admin-requests/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      setMsg("Request rejected.");
    },
    onError: (err) => setMsg(err?.response?.data?.error || "Failed to reject"),
  });

  const requests = data?.items || [];

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Admin Access Requests</h2>
        <p className="text-sm text-muted-foreground">
          Review and manage pending admin requests.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{req.name}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(req.id)}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(req.id)}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminRequestsPage;
