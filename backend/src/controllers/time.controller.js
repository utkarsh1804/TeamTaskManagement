const prisma = require("../lib/prisma");

const userSelect = { id: true, name: true, email: true };

const getTaskAccess = async (taskId, userId, globalRole) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, projectId: true },
  });
  if (!task) return { task: null, isMember: false };
  if (globalRole === "ADMIN") return { task, isMember: true };

  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    select: { ownerId: true },
  });
  if (project?.ownerId === userId) return { task, isMember: true };

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId: task.projectId } },
  });
  return { task, isMember: Boolean(membership) };
};

const minutesBetween = (start, end) => Math.max(1, Math.round((end - start) / 60000));

const startTimer = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { task, isMember } = await getTaskAccess(taskId, req.user.id, req.user.globalRole);
    if (!task) return res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    if (!isMember) return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

    const running = await prisma.timeEntry.findFirst({
      where: { userId: req.user.id, endedAt: null },
      include: { task: { select: { id: true, title: true } } },
    });
    if (running) {
      return res.status(409).json({
        success: false,
        error: "A timer is already running. Stop it first.",
        code: "TIMER_RUNNING",
        running,
      });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId: req.user.id,
        description: req.body?.description || null,
        startedAt: new Date(),
        source: "TIMER",
      },
      include: { task: { select: { id: true, title: true } } },
    });
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
};

const stopTimer = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const running = await prisma.timeEntry.findFirst({
      where: { userId: req.user.id, taskId, endedAt: null },
    });
    if (!running) {
      return res.status(404).json({ success: false, error: "No running timer for this task", code: "NOT_FOUND" });
    }

    const endedAt = new Date();
    const entry = await prisma.timeEntry.update({
      where: { id: running.id },
      data: { endedAt, durationMinutes: minutesBetween(running.startedAt, endedAt) },
      include: { task: { select: { id: true, title: true } } },
    });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

const addManualEntry = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { task, isMember } = await getTaskAccess(taskId, req.user.id, req.user.globalRole);
    if (!task) return res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    if (!isMember) return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

    const { description, startedAt, endedAt, durationMinutes } = req.body;
    const start = new Date(startedAt);
    let end = endedAt ? new Date(endedAt) : null;
    let minutes = durationMinutes || null;

    if (end && !minutes) minutes = minutesBetween(start, end);
    if (!end && minutes) end = new Date(start.getTime() + minutes * 60000);
    if (end && end < start) {
      return res.status(400).json({ success: false, error: "endedAt must be after startedAt", code: "BAD_REQUEST" });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId: req.user.id,
        description: description || null,
        startedAt: start,
        endedAt: end,
        durationMinutes: minutes,
        source: "MANUAL",
      },
      include: { task: { select: { id: true, title: true } } },
    });
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
};

const listTaskTime = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { task, isMember } = await getTaskAccess(taskId, req.user.id, req.user.globalRole);
    if (!task) return res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    if (!isMember) return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: userSelect } },
      orderBy: { startedAt: "desc" },
    });
    const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    res.json({ items: entries, total: entries.length, totalMinutes });
  } catch (error) {
    next(error);
  }
};

const getRunning = async (req, res, next) => {
  try {
    const running = await prisma.timeEntry.findFirst({
      where: { userId: req.user.id, endedAt: null },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });
    res.json({ running: running || null });
  } catch (error) {
    next(error);
  }
};

const listMyTime = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { userId: req.user.id, endedAt: { not: null } };
    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from);
      if (to) where.startedAt.lte = new Date(to);
    }
    const entries = await prisma.timeEntry.findMany({
      where,
      include: { task: { select: { id: true, title: true, projectId: true } } },
      orderBy: { startedAt: "asc" },
    });
    const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    res.json({ items: entries, total: entries.length, totalMinutes });
  } catch (error) {
    next(error);
  }
};

const updateEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const existing = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!existing) return res.status(404).json({ success: false, error: "Entry not found", code: "NOT_FOUND" });
    if (existing.userId !== req.user.id && req.user.globalRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const { description, startedAt, endedAt, durationMinutes } = req.body;
    const data = {};
    if (description !== undefined) data.description = description;
    const start = startedAt ? new Date(startedAt) : existing.startedAt;
    let end = endedAt !== undefined ? (endedAt ? new Date(endedAt) : null) : existing.endedAt;
    if (startedAt) data.startedAt = start;
    if (endedAt !== undefined) data.endedAt = end;
    if (durationMinutes !== undefined && durationMinutes !== null) {
      data.durationMinutes = durationMinutes;
      if (!endedAt) data.endedAt = new Date(start.getTime() + durationMinutes * 60000);
    } else if (end) {
      data.durationMinutes = minutesBetween(start, end);
    }

    const entry = await prisma.timeEntry.update({
      where: { id: entryId },
      data,
      include: { task: { select: { id: true, title: true } } },
    });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

const deleteEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const existing = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!existing) return res.status(404).json({ success: false, error: "Entry not found", code: "NOT_FOUND" });
    if (existing.userId !== req.user.id && req.user.globalRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    await prisma.timeEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startTimer,
  stopTimer,
  addManualEntry,
  listTaskTime,
  getRunning,
  listMyTime,
  updateEntry,
  deleteEntry,
};
