const prisma = require("../lib/prisma");
const { isProjectAdmin } = require("../lib/projectAccess");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const listPolicies = async (req, res, next) => {
  try {
    const items = await prisma.slaPolicy.findMany({
      where: { projectId: req.params.id },
      orderBy: { priority: "asc" },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createPolicy = async (req, res, next) => {
  try {
    const { name, priority, responseHours, resolutionHours, enabled } = req.body;
    const policy = await prisma.slaPolicy.create({
      data: {
        projectId: req.params.id,
        name,
        priority,
        responseHours: responseHours ?? null,
        resolutionHours,
        enabled: enabled ?? true,
      },
    });
    res.status(201).json({ policy });
  } catch (e) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, error: "A policy for this priority already exists", code: "CONFLICT" });
    }
    next(e);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const policy = await prisma.slaPolicy.findUnique({ where: { id: req.params.policyId } });
    if (!policy) return notFound(res, "Policy");
    if (!(await isProjectAdmin(policy.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const fields = ["name", "priority", "responseHours", "resolutionHours", "enabled"];
    const data = {};
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

    const updated = await prisma.slaPolicy.update({ where: { id: policy.id }, data });
    res.json({ policy: updated });
  } catch (e) {
    next(e);
  }
};

const deletePolicy = async (req, res, next) => {
  try {
    const policy = await prisma.slaPolicy.findUnique({ where: { id: req.params.policyId } });
    if (!policy) return notFound(res, "Policy");
    if (!(await isProjectAdmin(policy.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    await prisma.slaPolicy.delete({ where: { id: policy.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const HOUR = 60 * 60 * 1000;

const computeStanding = (task, policy, now) => {
  const deadline = new Date(new Date(task.createdAt).getTime() + policy.resolutionHours * HOUR);
  const remainingMs = deadline.getTime() - now.getTime();
  let standing = "on_track";
  if (remainingMs <= 0) standing = "breached";
  else if (remainingMs <= policy.resolutionHours * HOUR * 0.25) standing = "at_risk";
  return { deadline, remainingHours: Math.round(remainingMs / HOUR), standing };
};

const getSlaStatus = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const policies = await prisma.slaPolicy.findMany({ where: { projectId, enabled: true } });
    const byPriority = new Map(policies.map((p) => [p.priority, p]));
    if (!policies.length) return res.json({ items: [], summary: { on_track: 0, at_risk: 0, breached: 0 } });

    const tasks = await prisma.task.findMany({
      where: { projectId, status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        assignee: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const summary = { on_track: 0, at_risk: 0, breached: 0 };
    const items = [];
    for (const task of tasks) {
      const policy = byPriority.get(task.priority);
      if (!policy) continue;
      const standing = computeStanding(task, policy, now);
      summary[standing.standing] += 1;
      items.push({
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        policyName: policy.name,
        resolutionHours: policy.resolutionHours,
        deadline: standing.deadline,
        remainingHours: standing.remainingHours,
        standing: standing.standing,
      });
    }
    items.sort((a, b) => a.remainingHours - b.remainingHours);
    res.json({ items, summary, total: items.length });
  } catch (e) {
    next(e);
  }
};

module.exports = { listPolicies, createPolicy, updatePolicy, deletePolicy, getSlaStatus };
