import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Send, Pencil, Trash2, CornerDownRight, X } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Avatar = ({ name }) => (
  <span
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
    aria-hidden="true"
  >
    {initials(name)}
  </span>
);

const MentionComposer = ({
  members,
  currentUserId,
  onSubmit,
  submitting,
  placeholder = "Write a comment... use @ to mention",
  submitLabel = "Comment",
  autoFocus = false,
  onCancel,
}) => {
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState(null);
  const ref = useRef(null);

  const candidates = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  const suggestions = useMemo(() => {
    if (query == null) return [];
    const q = query.toLowerCase();
    return candidates.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [candidates, query]);

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);
    const caret = e.target.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/@([^\s@]*)$/);
    setQuery(match ? match[1] : null);
  };

  const pickMention = (member) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? content.length;
    const before = content.slice(0, caret).replace(/@([^\s@]*)$/, `@${member.name} `);
    const after = content.slice(caret);
    const next = before + after;
    setContent(next);
    setSelected((prev) =>
      prev.some((m) => m.id === member.id) ? prev : [...prev, member]
    );
    setQuery(null);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(before.length, before.length);
      }
    });
  };

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const mentions = [
      ...new Set(
        selected.filter((m) => content.includes(`@${m.name}`)).map((m) => m.id)
      ),
    ];
    onSubmit(trimmed, mentions, () => {
      setContent("");
      setSelected([]);
      setQuery(null);
    });
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-48 w-56 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {suggestions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => pickMention(m)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Avatar name={m.name} />
                <span className="truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={submitting || !content.trim()}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

const CommentNode = ({ node, taskId, members, currentUserId, isAdmin, depth = 0 }) => {
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.body);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["task-comments", taskId] });

  const replyMutation = useMutation({
    mutationFn: ({ content, mentions }) =>
      api.post(`/tasks/${taskId}/comments`, { content, parentId: node.id, mentions }),
    onSuccess: () => {
      invalidate();
      setReplying(false);
      toast.success("Reply added");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to reply"),
  });

  const editMutation = useMutation({
    mutationFn: (content) => api.patch(`/comments/${node.id}`, { content }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast.success("Comment updated");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/comments/${node.id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Comment deleted");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to delete"),
  });

  const canModify = node.author?.id === currentUserId || isAdmin;
  const edited = node.updatedAt && node.createdAt && node.updatedAt !== node.createdAt;

  return (
    <div className={depth > 0 ? "mt-3 border-l border-border pl-4" : "mt-4"}>
      <div className="flex gap-3">
        <Avatar name={node.author?.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{node.author?.name}</span>
            <span className="text-xs text-muted-foreground">
              {node.createdAt ? formatDistanceToNow(new Date(node.createdAt), { addSuffix: true }) : ""}
              {edited ? " (edited)" : ""}
            </span>
          </div>

          {editing ? (
            <div className="mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => draft.trim() && editMutation.mutate(draft.trim())}
                  disabled={editMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(node.body);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
              {node.body}
            </p>
          )}

          {node.mentions?.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Mentioned: {node.mentions.map((m) => m.user?.name).filter(Boolean).join(", ")}
            </p>
          )}

          {!editing && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                Reply
              </button>
              {canModify && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(node.body);
                      setEditing(true);
                    }}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this comment?")) deleteMutation.mutate();
                    }}
                    className="flex items-center gap-1 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-3">
              <MentionComposer
                members={members}
                currentUserId={currentUserId}
                submitting={replyMutation.isPending}
                submitLabel="Reply"
                autoFocus
                placeholder="Write a reply..."
                onCancel={() => setReplying(false)}
                onSubmit={(content, mentions) => replyMutation.mutate({ content, mentions })}
              />
            </div>
          )}

          {node.replies?.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              taskId={taskId}
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CommentsThread = ({ taskId, projectId }) => {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.globalRole === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/comments`)).data,
  });

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
    enabled: !!projectId,
  });

  const members = useMemo(() => {
    const project = projectData?.project;
    if (!project) return [];
    const map = new Map();
    if (project.owner?.id) map.set(project.owner.id, { id: project.owner.id, name: project.owner.name });
    (project.members || []).forEach((m) => {
      const u = m.user || (m.userId ? { id: m.userId, name: m.name } : null);
      if (u?.id) map.set(u.id, { id: u.id, name: u.name });
    });
    return Array.from(map.values());
  }, [projectData]);

  const createMutation = useMutation({
    mutationFn: ({ content, mentions }) =>
      api.post(`/tasks/${taskId}/comments`, { content, mentions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast.success("Comment added");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to add comment"),
  });

  const roots = data?.items || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Comments {typeof data?.total === "number" ? `(${data.total})` : ""}
      </h3>

      <MentionComposer
        members={members}
        currentUserId={user?.id}
        submitting={createMutation.isPending}
        onSubmit={(content, mentions, reset) => {
          createMutation.mutate({ content, mentions }, { onSuccess: reset });
        }}
      />

      <div className="mt-2">
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading comments...</p>
        ) : roots.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
        ) : (
          roots.map((node) => (
            <CommentNode
              key={node.id}
              node={node}
              taskId={taskId}
              members={members}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsThread;
