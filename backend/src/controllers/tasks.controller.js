const prisma = require("../lib/prisma");
const { logActivity } = require("../lib/activityLog");
const { sendTaskAssigned, sendTaskDone } = require("../lib/resend");

const userSelect = {
  id: true,
  name: true,
  email: true,
  globalRole: true,
  createdAt: true,
};

const getActor = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

const getProjectAccess = async (projectId, userId, globalRole) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true },
  });

  if (!project) {
    return { project: null, isMember: false, isAdmin: false };
  }

  if (globalRole === "ADMIN" || project.ownerId === userId) {
    return { project, isMember: true, isAdmin: true };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (!membership) {
    return { project, isMember: false, isAdmin: false };
  }

  return { project, isMember: true, isAdmin: membership.role === "ADMIN" };
};

const isUserInProject = async (projectId, userId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) return false;
  if (project.ownerId === userId) return true;

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  return Boolean(membership);
};

const listProjectTasks = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { status, assignee, priority, sort, search } = req.query;

    const where = { projectId };
    if (status) where.status = status;
    if (assignee) where.assigneeId = assignee;
    if (priority) where.priority = priority;
    if (search) where.title = { contains: search, mode: "insensitive" };

    let orderBy = { createdAt: "desc" };
    if (sort === "dueDate") orderBy = { dueDate: "asc" };
    if (sort === "priority") orderBy = { priority: "desc" };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
      orderBy,
    });

    res.json({ items: tasks });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const access = await getProjectAccess(projectId, req.user.id, req.user.globalRole);
    if (!access.project || !access.isMember) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    if (!access.isAdmin && assigneeId && assigneeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Members can only assign tasks to themselves",
        code: "FORBIDDEN",
      });
    }

    if (assigneeId) {
      const assigneeAllowed = await isUserInProject(projectId, assigneeId);
      if (!assigneeAllowed) {
        return res.status(400).json({
          success: false,
          error: "Assignee must be a project member",
          code: "BAD_REQUEST",
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        createdById: req.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} created task "${task.title}"`,
      "Task",
      task.id,
      actor.id,
      task.projectId
    );

    if (task.assignee) {
      await logActivity(
        `${actor.name} assigned "${task.title}" to ${task.assignee.name}`,
        "Task",
        task.id,
        actor.id,
        task.projectId,
        { assigneeId: task.assignee.id }
      );
      await sendTaskAssigned({ to: task.assignee.email, taskTitle: task.title });
    }

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true, ownerId: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isMember) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const activityLog = await prisma.activityLog.findMany({
      where: { entityType: "Task", entityId: task.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({ task, activityLog });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: { select: userSelect }, createdBy: { select: userSelect } },
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isMember) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    if (!access.isAdmin && task.assigneeId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    if (!access.isAdmin && assigneeId && assigneeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Members can only assign tasks to themselves",
        code: "FORBIDDEN",
      });
    }

    if (assigneeId) {
      const assigneeAllowed = await isUserInProject(task.projectId, assigneeId);
      if (!assigneeAllowed) {
        return res.status(400).json({
          success: false,
          error: "Assignee must be a project member",
          code: "BAD_REQUEST",
        });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updates,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });

    const actor = await getActor(req.user.id);
    if (status && status !== task.status) {
      await logActivity(
        `${actor.name} changed status from ${task.status} to ${updated.status} on "${updated.title}"`,
        "Task",
        updated.id,
        actor.id,
        updated.projectId,
        { from: task.status, to: updated.status }
      );

      if (updated.status === "DONE" && updated.createdBy) {
        await sendTaskDone({ to: updated.createdBy.email, taskTitle: updated.title });
      }
    }

    if (assigneeId !== undefined && assigneeId !== task.assigneeId && updated.assignee) {
      await logActivity(
        `${actor.name} assigned "${updated.title}" to ${updated.assignee.name}`,
        "Task",
        updated.id,
        actor.id,
        updated.projectId,
        { assigneeId: updated.assignee.id }
      );
      await sendTaskAssigned({ to: updated.assignee.email, taskTitle: updated.title });
    }

    if (priority && priority !== task.priority) {
      await logActivity(
        `${actor.name} changed priority to ${updated.priority} on "${updated.title}"`,
        "Task",
        updated.id,
        actor.id,
        updated.projectId,
        { from: task.priority, to: updated.priority }
      );
    }

    if (dueDate !== undefined) {
      const oldDate = task.dueDate ? task.dueDate.toISOString() : null;
      const newDate = updated.dueDate ? updated.dueDate.toISOString() : null;
      if (oldDate !== newDate) {
        const formatted = updated.dueDate
          ? updated.dueDate.toISOString().split("T")[0]
          : "no due date";
        await logActivity(
          `${actor.name} set due date to ${formatted} on "${updated.title}"`,
          "Task",
          updated.id,
          actor.id,
          updated.projectId
        );
      }
    }

    if (title && title !== task.title) {
      await logActivity(
        `${actor.name} updated task "${updated.title}"`,
        "Task",
        updated.id,
        actor.id,
        updated.projectId
      );
    }

    res.json({ task: updated });
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: { select: userSelect } },
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isMember) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    if (!access.isAdmin && task.assigneeId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} changed status from ${task.status} to ${status} on "${updated.title}"`,
      "Task",
      updated.id,
      actor.id,
      updated.projectId,
      { from: task.status, to: status }
    );

    if (status === "DONE" && task.createdBy) {
      await sendTaskDone({ to: task.createdBy.email, taskTitle: updated.title });
    }

    res.json({ task: updated });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, ownerId: true } } },
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    }

    const access = await getProjectAccess(task.projectId, req.user.id, req.user.globalRole);
    if (!access.isAdmin) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} deleted task "${task.title}"`,
      "Task",
      task.id,
      actor.id,
      task.projectId
    );

    await prisma.task.delete({ where: { id: taskId } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const listMyTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });

    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) {
      return res.json({ items: [] });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ items: tasks });
  } catch (error) {
    next(error);
  }
};

const listOverdueTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });

    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) {
      return res.json({ items: [] });
    }

    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: userSelect },
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({ items: tasks });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProjectTasks,
  listMyTasks,
  createTask,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  listOverdueTasks,
};
