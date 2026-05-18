import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  FolderKanban,
  Users,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const ICON_BY_TYPE = {
  TASK_ASSIGNED: UserPlus,
  TASK_STATUS_CHANGED: CheckCircle2,
  TASK_DONE: CheckCircle2,
  TASK_OVERDUE: AlertTriangle,
  TASK_DUE_SOON: AlertTriangle,
  COMMENT_ADDED: MessageSquare,
  MENTION: MessageSquare,
  PROJECT_INVITED: FolderKanban,
  PROJECT_MEMBER_ADDED: FolderKanban,
  PROJECT_MEMBER_REMOVED: FolderKanban,
  PROJECT_MEMBER_ROLE_CHANGED: ShieldCheck,
  PROJECT_DELETED: FolderKanban,
  ORG_MEMBER_ADDED: Users,
  TEAM_MEMBER_ADDED: Users,
  ADMIN_REQUEST_APPROVED: ShieldCheck,
  ADMIN_REQUEST_REJECTED: ShieldCheck,
};

const NotificationsPage = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { unreadOnly }],
    queryFn: async () => {
      const response = await api.get("/notifications", {
        params: { unreadOnly: unreadOnly ? "true" : undefined, limit: 50 },
      });
      return response.data;
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete("/notifications"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount === 0
                ? "You are all caught up."
                : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={unreadOnly ? "default" : "secondary"}
              size="sm"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm("Delete all notifications?")) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending || items.length === 0}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Clear all
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {unreadOnly ? "No unread notifications." : "No notifications yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = ICON_BY_TYPE[n.type] || Bell;
              return (
                <li
                  key={n.id}
                  className={`group flex gap-3 px-5 py-4 transition ${
                    n.read ? "bg-transparent" : "bg-muted/30"
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-full bg-muted p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          if (!n.read) markOneReadMutation.mutate(n.id);
                        }}
                        className="block hover:underline"
                      >
                        <p className="font-medium leading-snug">{n.title}</p>
                      </Link>
                    ) : (
                      <p className="font-medium leading-snug">{n.title}</p>
                    )}
                    {n.body && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      {!n.read && (
                        <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1 opacity-0 transition group-hover:opacity-100">
                    {!n.read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => markOneReadMutation.mutate(n.id)}
                        title="Mark read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(n.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default NotificationsPage;
