import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const NotificationsPage = () => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("/notifications");
      return response.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {data?.unreadCount || 0} unread updates.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="space-y-3">
          {data?.items?.length ? (
            data.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="text-sm text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default NotificationsPage;
