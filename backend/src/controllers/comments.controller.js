const prisma = require("../lib/prisma");
const notifications = require("../lib/notifications");
const events = require("../lib/events");

const authorSelect = { id: true, name: true, email: true };

const commentInclude = {
  author: { select: authorSelect },
  mentions: { include: { user: { select: authorSelect } } },
};

const getProjectAccess = async (projectId, userId, globalRole) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true },
  });

  if (!project) return { project: null, isMember: false, isAdmin: false };
  if (globalRole === "ADMIN" || project.ownerId === userId) {
    return { project, isMember: true, isAdmin: true };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!membership) return { project, isMember: false, isAdmin: false };
  return { project, isMember: true, isAdmin: membership.role === "ADMIN" };
};

const getProjectMemberIds = async (projectId) => {
  const [project, members] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } }),
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
  ]);
  const ids = new Set();
  if (project?.ownerId) ids.add(project.ownerId);
  members.forEach((m) => ids.add(m.userId));
  return Array.from(ids);
};

const buildTree = (comments) => {
  const byId = new Map();
  comments.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const listComments = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isMember) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: commentInclude,
      orderBy: { createdAt: "asc" },
    });

    res.json({ items: buildTree(comments), total: comments.length });
  } catch (error) {
    next(error);
  }
};

const createComment = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { content, parentId, mentions } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, title: true, assigneeId: true, createdById: true },
    });
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isMember) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, taskId: true },
      });
      if (!parent || parent.taskId !== taskId) {
        return res.status(400).json({
          success: false,
          error: "Parent comment must belong to this task",
          code: "BAD_REQUEST",
        });
      }
    }

    const memberIds = await getProjectMemberIds(task.projectId);
    const memberSet = new Set(memberIds);
    let mentionIds = [];
    if (Array.isArray(mentions) && mentions.length) {
      mentionIds = [...new Set(mentions)].filter((uid) => memberSet.has(uid));
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        authorId: req.user.id,
        parentId: parentId || null,
        body: content,
        mentions: mentionIds.length
          ? { create: mentionIds.map((mentionedUserId) => ({ mentionedUserId })) }
          : undefined,
      },
      include: commentInclude,
    });

    const actorName = comment.author.name;
    const preview = content.length > 120 ? `${content.slice(0, 117)}...` : content;
    const link = `/tasks/${taskId}`;
    const meta = { taskId, commentId: comment.id, projectId: task.projectId };

    // @mention notifications take priority over the generic comment notification.
    const mentionSet = new Set(mentionIds);
    const commentRecipients = new Set();
    if (task.assigneeId && task.assigneeId !== req.user.id) commentRecipients.add(task.assigneeId);
    if (task.createdById && task.createdById !== req.user.id) commentRecipients.add(task.createdById);
    mentionSet.forEach((id) => commentRecipients.delete(id));

    const commentRows = Array.from(commentRecipients).map((userId) => ({
      userId,
      type: notifications.NotificationType.COMMENT_ADDED,
      title: `${actorName} commented on "${task.title}"`,
      body: preview,
      link,
      meta,
    }));

    const mentionRows = mentionIds
      .filter((uid) => uid !== req.user.id)
      .map((userId) => ({
        userId,
        type: notifications.NotificationType.MENTION,
        title: `${actorName} mentioned you on "${task.title}"`,
        body: preview,
        link,
        meta,
      }));

    if (commentRows.length || mentionRows.length) {
      await notifications.createMany([...commentRows, ...mentionRows]);
    }

    events.sendToUsers(memberIds, "comment:created", {
      taskId,
      projectId: task.projectId,
      commentId: comment.id,
    });
    const notifiedIds = [
      ...commentRows.map((r) => r.userId),
      ...mentionRows.map((r) => r.userId),
    ];
    events.sendToUsers(notifiedIds, "notification:created", { taskId });

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, taskId: true },
    });
    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found", code: "NOT_FOUND" });
    }
    if (comment.authorId !== req.user.id && req.user.globalRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body: content },
      include: commentInclude,
    });

    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      select: { projectId: true },
    });
    if (task) {
      const memberIds = await getProjectMemberIds(task.projectId);
      events.sendToUsers(memberIds, "comment:updated", { taskId: comment.taskId, commentId });
    }

    res.json({ comment: updated });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, taskId: true },
    });
    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found", code: "NOT_FOUND" });
    }
    if (comment.authorId !== req.user.id && req.user.globalRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
      select: { projectId: true },
    });
    if (task) {
      const memberIds = await getProjectMemberIds(task.projectId);
      events.sendToUsers(memberIds, "comment:deleted", { taskId: comment.taskId, commentId });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listComments,
  createComment,
  updateComment,
  deleteComment,
};
