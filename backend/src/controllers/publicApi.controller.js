const prisma = require("../lib/prisma");

// Returns the list of project ids the API key's user can access, or null for
// global admins (meaning "all projects").
const accessibleProjectIds = async (req) => {
  if (req.user.globalRole === "ADMIN") return null;
  const [memberships, owned] = await Promise.all([
    prisma.projectMember.findMany({ where: { userId: req.user.id }, select: { projectId: true } }),
    prisma.project.findMany({ where: { ownerId: req.user.id }, select: { id: true } }),
  ]);
  return [...new Set([...memberships.map((m) => m.projectId), ...owned.map((o) => o.id)])];
};

const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, globalRole: true },
    });
    res.json({ user, scopes: req.apiKey?.scopes || [] });
  } catch (e) {
    next(e);
  }
};

const listProjects = async (req, res, next) => {
  try {
    const ids = await accessibleProjectIds(req);
    const where = ids ? { id: { in: ids } } : {};
    const items = await prisma.project.findMany({
      where,
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const listTasks = async (req, res, next) => {
  try {
    const ids = await accessibleProjectIds(req);
    const where = {};
    if (ids) where.projectId = { in: ids };
    if (req.query.projectId) {
      if (ids && !ids.includes(req.query.projectId)) {
        return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
      }
      where.projectId = req.query.projectId;
    }
    if (req.query.status) where.status = req.query.status;
    const items = await prisma.task.findMany({
      where,
      select: { id: true, title: true, status: true, priority: true, projectId: true, dueDate: true, assigneeId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { projectId, title } = req.body || {};
    if (!projectId || !title) {
      return res.status(400).json({ success: false, error: "projectId and title are required", code: "BAD_REQUEST" });
    }
    const ids = await accessibleProjectIds(req);
    if (ids && !ids.includes(projectId)) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    const task = await prisma.task.create({
      data: { title, projectId, createdById: req.user.id, status: "TODO", priority: req.body.priority || "MEDIUM" },
      select: { id: true, title: true, status: true, priority: true, projectId: true },
    });
    res.status(201).json({ task });
  } catch (e) {
    next(e);
  }
};

module.exports = { me, listProjects, listTasks, createTask };
