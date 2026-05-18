import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Square,
  Tag as TagIcon,
  Link2,
  GitBranch,
  Paperclip,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const Section = ({ icon: Icon, title, count, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {typeof count === "number" && (
        <span className="rounded-full bg-muted px-1.5 text-xs">{count}</span>
      )}
    </div>
    {children}
  </div>
);

const Checklist = ({ taskId }) => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const { data } = useQuery({
    queryKey: ["checklist", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/checklist`)).data,
  });

  const add = useMutation({
    mutationFn: (t) => api.post(`/tasks/${taskId}/checklist`, { title: t }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["checklist", taskId] });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ itemId, done }) =>
      api.patch(`/tasks/${taskId}/checklist/${itemId}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", taskId] }),
  });
  const remove = useMutation({
    mutationFn: (itemId) => api.delete(`/tasks/${taskId}/checklist/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", taskId] }),
  });

  const items = data?.items || [];
  const done = items.filter((i) => i.done).length;

  return (
    <Section
      icon={CheckSquare}
      title="Checklist"
      count={items.length ? `${done}/${items.length}` : 0}
    >
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => toggle.mutate({ itemId: item.id, done: !item.done })}
              className="shrink-0"
            >
              {item.done ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}
            >
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => remove.mutate(item.id)}
              className="opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate(title.trim());
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add item..."
          className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" disabled={add.isPending}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Section>
  );
};

const Tags = ({ taskId, orgId }) => {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: taskTags } = useQuery({
    queryKey: ["task-tags", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/tags`)).data,
  });

  const { data: orgTags } = useQuery({
    queryKey: ["org-tags", orgId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/tags`)).data,
    enabled: Boolean(orgId) && pickerOpen,
  });

  const attach = useMutation({
    mutationFn: (tagId) => api.post(`/tasks/${taskId}/tags`, { tagId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-tags", taskId] });
      setPickerOpen(false);
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Failed"),
  });

  const detach = useMutation({
    mutationFn: (tagId) => api.delete(`/tasks/${taskId}/tags/${tagId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-tags", taskId] }),
  });

  const current = taskTags?.items || [];
  const attachedIds = new Set(current.map((t) => t.id));
  const available = (orgTags?.items || []).filter((t) => !attachedIds.has(t.id));

  return (
    <Section icon={TagIcon} title="Tags" count={current.length}>
      <div className="flex flex-wrap gap-1.5">
        {current.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${t.color}22`, color: t.color }}
          >
            {t.name}
            <button
              type="button"
              onClick={() => detach.mutate(t.id)}
              className="hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {orgId && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setPickerOpen((v) => !v)}
            className="h-6 px-2 text-xs"
          >
            <Plus className="mr-0.5 h-3 w-3" /> Tag
          </Button>
        )}
      </div>
      {pickerOpen && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-2">
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tags available. Create one in your org settings.
            </p>
          ) : (
            available.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => attach.mutate(t.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </button>
            ))
          )}
        </div>
      )}
    </Section>
  );
};

const Subtasks = ({ taskId }) => {
  const { data } = useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/subtasks`)).data,
  });
  const items = data?.items || [];

  return (
    <Section icon={GitBranch} title="Subtasks" count={items.length}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No subtasks.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                to={`/tasks/${s.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-2 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                  {s.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

const Dependencies = ({ taskId }) => {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [blockingId, setBlockingId] = useState("");

  const { data } = useQuery({
    queryKey: ["deps", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/dependencies`)).data,
  });

  const add = useMutation({
    mutationFn: (id) => api.post(`/tasks/${taskId}/dependencies`, { blockingId: id }),
    onSuccess: () => {
      setBlockingId("");
      setPickerOpen(false);
      qc.invalidateQueries({ queryKey: ["deps", taskId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Failed"),
  });

  const remove = useMutation({
    mutationFn: (depId) => api.delete(`/tasks/${taskId}/dependencies/${depId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deps", taskId] }),
  });

  const blockedBy = data?.blockedBy || [];
  const blocking = data?.blocking || [];

  return (
    <Section
      icon={Link2}
      title="Dependencies"
      count={blockedBy.length + blocking.length}
    >
      {blockedBy.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground">Blocked by</p>
          <ul className="mt-1 space-y-1">
            {blockedBy.map((d) => (
              <li key={d.id} className="group flex items-center justify-between">
                <Link
                  to={`/tasks/${d.task.id}`}
                  className="flex items-center gap-1 text-sm hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {d.task.title}
                </Link>
                <button
                  type="button"
                  onClick={() => remove.mutate(d.id)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {blocking.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Blocking</p>
          <ul className="mt-1 space-y-1">
            {blocking.map((d) => (
              <li key={d.id} className="group flex items-center justify-between">
                <Link
                  to={`/tasks/${d.task.id}`}
                  className="flex items-center gap-1 text-sm hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {d.task.title}
                </Link>
                <button
                  type="button"
                  onClick={() => remove.mutate(d.id)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {blockedBy.length === 0 && blocking.length === 0 && (
        <p className="text-xs text-muted-foreground">No dependencies.</p>
      )}

      {pickerOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (blockingId) add.mutate(blockingId);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={blockingId}
            onChange={(e) => setBlockingId(e.target.value)}
            placeholder="Task ID to block this one"
            className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
          />
          <Button type="submit" size="sm" disabled={add.isPending}>
            Add
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setPickerOpen(true)}
          className="mt-3 h-6 px-2 text-xs"
        >
          <Plus className="mr-0.5 h-3 w-3" /> Add dependency
        </Button>
      )}
    </Section>
  );
};

const Attachments = ({ taskId }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ url: "", name: "", size: 0, mimeType: "" });

  const { data } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => (await api.get(`/tasks/${taskId}/attachments`)).data,
  });

  const add = useMutation({
    mutationFn: (payload) => api.post(`/tasks/${taskId}/attachments`, payload),
    onSuccess: () => {
      setForm({ url: "", name: "", size: 0, mimeType: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${taskId}/attachments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
  });

  const items = data?.items || [];

  return (
    <Section icon={Paperclip} title="Attachments" count={items.length}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="group flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Math.round(a.size / 1024)}KB
                </span>
              </a>
              <button
                type="button"
                onClick={() => remove.mutate(a.id)}
                className="opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.url && form.name) add.mutate(form);
          }}
          className="mt-3 space-y-2"
        >
          <input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
          />
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="File name"
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: Number(e.target.value) }))}
              placeholder="Size (bytes)"
              className="w-28 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
            />
            <input
              value={form.mimeType}
              onChange={(e) => setForm((f) => ({ ...f, mimeType: e.target.value }))}
              placeholder="image/png"
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
            />
            <Button type="submit" size="sm" disabled={add.isPending}>
              Add
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(true)}
          className="mt-3 h-6 px-2 text-xs"
        >
          <Plus className="mr-0.5 h-3 w-3" /> Add link
        </Button>
      )}
    </Section>
  );
};

const TaskExtras = ({ taskId, orgId }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Checklist taskId={taskId} />
      <Tags taskId={taskId} orgId={orgId} />
      <Subtasks taskId={taskId} />
      <Dependencies taskId={taskId} />
      <div className="md:col-span-2">
        <Attachments taskId={taskId} />
      </div>
    </div>
  );
};

export default TaskExtras;
