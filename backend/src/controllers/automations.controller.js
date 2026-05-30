const prisma = require("../lib/prisma");
const { isProjectAdmin } = require("../lib/projectAccess");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const listRules = async (req, res, next) => {
  try {
    const items = await prisma.automationRule.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createRule = async (req, res, next) => {
  try {
    const { name, trigger, conditions, actions, enabled } = req.body;
    const rule = await prisma.automationRule.create({
      data: {
        projectId: req.params.id,
        name,
        trigger,
        conditions: conditions ?? null,
        actions,
        enabled: enabled ?? true,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ rule });
  } catch (e) {
    next(e);
  }
};

const updateRule = async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: req.params.ruleId } });
    if (!rule) return notFound(res, "Rule");
    if (!(await isProjectAdmin(rule.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const fields = ["name", "trigger", "conditions", "actions", "enabled"];
    const data = {};
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

    const updated = await prisma.automationRule.update({ where: { id: rule.id }, data });
    res.json({ rule: updated });
  } catch (e) {
    next(e);
  }
};

const deleteRule = async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: req.params.ruleId } });
    if (!rule) return notFound(res, "Rule");
    if (!(await isProjectAdmin(rule.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    await prisma.automationRule.delete({ where: { id: rule.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

module.exports = { listRules, createRule, updateRule, deleteRule };
