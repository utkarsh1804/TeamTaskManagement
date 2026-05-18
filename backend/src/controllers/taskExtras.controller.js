const prisma = require("../lib/prisma");
const { logActivity } = require("../lib/activityLog");

const userSelect = { id: true, name: true, email: true };

const getProjectAccess = async (projectId, userId, globalRole) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) return { isMember: false, isAdmin: false };
  if (globalRole === "ADMIN" || project.ownerId === userId) {
    return { isMember: true, isAdmin: true };
  }
  const m = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return { isMember: !!m, isAdmin: m?.role === "ADMIN" };
};

const requireTaskAccess = async (req, res, requireAdmin = false) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true },
  });
  if (!task) {
    res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    return null;
  }
  const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
  if (!access.isMember || (requireAdmin && !access.isAdmin)) {
    res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    return null;
  }
  return { task, access };
};

// ===================== Subtasks =====================

const listSubtasks = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const items = await prisma.task.findMany({
      where: { parentId: ctx.task.id },
      include: {
        assignee: { select: userSelect },
        _count: { select: { subtasks: true, checklistItems: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

// ===================== Checklist =====================

const listChecklist = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const items = await prisma.checklistItem.findMany({
      where: { taskId: ctx.task.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const addChecklistItem = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const count = await prisma.checklistItem.count({ where: { taskId: ctx.task.id } });
    const item = await prisma.checklistItem.create({
      data: {
        taskId: ctx.task.id,
        title: req.body.title,
        done: req.body.done ?? false,
        order: req.body.order ?? count,
      },
    });
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

const updateChecklistItem = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const existing = await prisma.checklistItem.findFirst({
      where: { id: req.params.itemId, taskId: ctx.task.id },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Item not found", code: "NOT_FOUND" });
    }
    const item = await prisma.checklistItem.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
};

const deleteChecklistItem = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const result = await prisma.checklistItem.deleteMany({
      where: { id: req.params.itemId, taskId: ctx.task.id },
    });
    if (!result.count) {
      return res
        .status(404)
        .json({ success: false, error: "Item not found", code: "NOT_FOUND" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ===================== Tags on task =====================

const listTaskTags = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const items = await prisma.taskTag.findMany({
      where: { taskId: ctx.task.id },
      include: { tag: true },
    });
    res.json({ items: items.map((t) => t.tag) });
  } catch (error) {
    next(error);
  }
};

const addTaskTag = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;

    const tag = await prisma.tag.findUnique({ where: { id: req.body.tagId } });
    if (!tag) {
      return res
        .status(404)
        .json({ success: false, error: "Tag not found", code: "NOT_FOUND" });
    }

    const project = await prisma.project.findUnique({
      where: { id: ctx.task.projectId },
      select: { orgId: true },
    });
    if (project?.orgId && tag.orgId !== project.orgId) {
      return res
        .status(400)
        .json({ success: false, error: "Tag is from a different org", code: "BAD_REQUEST" });
    }

    try {
      await prisma.taskTag.create({ data: { taskId: ctx.task.id, tagId: tag.id } });
    } catch (err) {
      if (err.code !== "P2002") throw err;
    }
    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
};

const removeTaskTag = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    await prisma.taskTag.deleteMany({
      where: { taskId: ctx.task.id, tagId: req.params.tagId },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ===================== Dependencies =====================

const listDependencies = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const [blockedBy, blocking] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { blockedId: ctx.task.id },
        include: { blocking: { select: { id: true, title: true, status: true } } },
      }),
      prisma.taskDependency.findMany({
        where: { blockingId: ctx.task.id },
        include: { blocked: { select: { id: true, title: true, status: true } } },
      }),
    ]);
    res.json({
      blockedBy: blockedBy.map((d) => ({ id: d.id, task: d.blocking })),
      blocking: blocking.map((d) => ({ id: d.id, task: d.blocked })),
    });
  } catch (error) {
    next(error);
  }
};

const detectCycle = async (startId, candidateBlockerId) => {
  if (startId === candidateBlockerId) return true;
  const visited = new Set();
  const stack = [candidateBlockerId];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === startId) return true;
    const upstream = await prisma.taskDependency.findMany({
      where: { blockedId: id },
      select: { blockingId: true },
    });
    upstream.forEach((u) => stack.push(u.blockingId));
  }
  return false;
};

const addDependency = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const { blockingId } = req.body;

    if (blockingId === ctx.task.id) {
      return res.status(400).json({
        success: false,
        error: "Task cannot block itself",
        code: "BAD_REQUEST",
      });
    }

    const blocker = await prisma.task.findUnique({
      where: { id: blockingId },
      select: { id: true, projectId: true },
    });
    if (!blocker) {
      return res.status(404).json({
        success: false,
        error: "Blocking task not found",
        code: "NOT_FOUND",
      });
    }
    if (blocker.projectId !== ctx.task.projectId) {
      return res.status(400).json({
        success: false,
        error: "Dependencies must be within the same project",
        code: "BAD_REQUEST",
      });
    }

    const wouldCycle = await detectCycle(ctx.task.id, blockingId);
    if (wouldCycle) {
      return res.status(400).json({
        success: false,
        error: "Adding this dependency would create a cycle",
        code: "CYCLE",
      });
    }

    try {
      const dep = await prisma.taskDependency.create({
        data: { blockingId, blockedId: ctx.task.id },
      });
      res.status(201).json({ dependency: dep });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: "Dependency already exists",
          code: "CONFLICT",
        });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

const removeDependency = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const result = await prisma.taskDependency.deleteMany({
      where: {
        id: req.params.depId,
        OR: [{ blockedId: ctx.task.id }, { blockingId: ctx.task.id }],
      },
    });
    if (!result.count) {
      return res
        .status(404)
        .json({ success: false, error: "Dependency not found", code: "NOT_FOUND" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ===================== Attachments =====================

const listAttachments = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const items = await prisma.attachment.findMany({
      where: { taskId: ctx.task.id },
      include: { uploadedBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const createAttachment = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const item = await prisma.attachment.create({
      data: {
        taskId: ctx.task.id,
        url: req.body.url,
        name: req.body.name,
        size: req.body.size,
        mimeType: req.body.mimeType,
        uploadedById: req.user.id,
      },
      include: { uploadedBy: { select: userSelect } },
    });
    await logActivity(
      `attached ${item.name}`,
      "Attachment",
      item.id,
      req.user.id,
      ctx.task.projectId
    );
    res.status(201).json({ attachment: item });
  } catch (error) {
    next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const ctx = await requireTaskAccess(req, res);
    if (!ctx) return;
    const existing = await prisma.attachment.findFirst({
      where: { id: req.params.attachmentId, taskId: ctx.task.id },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Attachment not found", code: "NOT_FOUND" });
    }
    if (existing.uploadedById !== req.user.id && !ctx.access.isAdmin) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    await prisma.attachment.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSubtasks,
  listChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  listTaskTags,
  addTaskTag,
  removeTaskTag,
  listDependencies,
  addDependency,
  removeDependency,
  listAttachments,
  createAttachment,
  deleteAttachment,
};
