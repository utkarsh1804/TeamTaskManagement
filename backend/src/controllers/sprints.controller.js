const prisma = require("../lib/prisma");

const isProjectAdmin = async (projectId, userId, globalRole) => {
  if (globalRole === "ADMIN") return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return membership?.role === "ADMIN";
};

const isProjectMember = async (projectId, userId, globalRole) => {
  if (globalRole === "ADMIN") return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return Boolean(membership);
};

const eachDayUTC = (start, end) => {
  const days = [];
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (d <= last) {
    days.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
};

const listSprints = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json({ items: sprints, total: sprints.length });
  } catch (error) {
    next(error);
  }
};

const createSprint = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { name, goal, startDate, endDate, status } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, error: "endDate must be after startDate", code: "BAD_REQUEST" });
    }
    const sprint = await prisma.sprint.create({
      data: { projectId, name, goal: goal || null, startDate: start, endDate: end, status: status || "PLANNED" },
    });
    res.status(201).json({ sprint });
  } catch (error) {
    next(error);
  }
};

const updateSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) return res.status(404).json({ success: false, error: "Sprint not found", code: "NOT_FOUND" });
    if (!(await isProjectAdmin(sprint.projectId, req.user.id, req.user.globalRole))) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const { name, goal, startDate, endDate, status } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (goal !== undefined) data.goal = goal;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (status !== undefined) data.status = status;

    const updated = await prisma.sprint.update({ where: { id }, data });
    res.json({ sprint: updated });
  } catch (error) {
    next(error);
  }
};

const deleteSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) return res.status(404).json({ success: false, error: "Sprint not found", code: "NOT_FOUND" });
    if (!(await isProjectAdmin(sprint.projectId, req.user.id, req.user.globalRole))) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    await prisma.task.updateMany({ where: { sprintId: id }, data: { sprintId: null } });
    await prisma.sprint.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const assignTasks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { taskIds } = req.body;
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) return res.status(404).json({ success: false, error: "Sprint not found", code: "NOT_FOUND" });
    if (!(await isProjectAdmin(sprint.projectId, req.user.id, req.user.globalRole))) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    const result = await prisma.task.updateMany({
      where: { id: { in: taskIds }, projectId: sprint.projectId },
      data: { sprintId: id },
    });
    res.json({ success: true, assigned: result.count });
  } catch (error) {
    next(error);
  }
};

const removeTask = async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) return res.status(404).json({ success: false, error: "Sprint not found", code: "NOT_FOUND" });
    if (!(await isProjectAdmin(sprint.projectId, req.user.id, req.user.globalRole))) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    await prisma.task.updateMany({ where: { id: taskId, sprintId: id }, data: { sprintId: null } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getBurndown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) return res.status(404).json({ success: false, error: "Sprint not found", code: "NOT_FOUND" });
    if (!(await isProjectMember(sprint.projectId, req.user.id, req.user.globalRole))) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const tasks = await prisma.task.findMany({
      where: { sprintId: id },
      select: { id: true, status: true, storyPoints: true, updatedAt: true },
    });

    const usePoints = tasks.some((t) => typeof t.storyPoints === "number" && t.storyPoints > 0);
    const unit = (t) => (usePoints ? t.storyPoints || 0 : 1);
    const total = tasks.reduce((s, t) => s + unit(t), 0);

    const days = eachDayUTC(sprint.startDate, sprint.endDate);
    const now = new Date();
    const span = Math.max(1, days.length - 1);

    const points = days.map((day, i) => {
      const endOfDay = new Date(day);
      endOfDay.setUTCHours(23, 59, 59, 999);
      const ideal = Math.max(0, Math.round((total - (total * i) / span) * 100) / 100);
      let actualRemaining = null;
      if (endOfDay <= now) {
        const completed = tasks
          .filter((t) => t.status === "DONE" && new Date(t.updatedAt) <= endOfDay)
          .reduce((s, t) => s + unit(t), 0);
        actualRemaining = total - completed;
      }
      return { date: day.toISOString().slice(0, 10), ideal, actualRemaining };
    });

    res.json({
      sprint,
      metric: usePoints ? "storyPoints" : "tasks",
      total,
      taskCount: tasks.length,
      points,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  assignTasks,
  removeTask,
  getBurndown,
};
