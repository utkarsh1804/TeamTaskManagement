const prisma = require("../lib/prisma");
const { isProjectAdmin, isProjectMember } = require("../lib/projectAccess");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const listTemplates = async (req, res, next) => {
  try {
    const items = await prisma.taskTemplate.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const { name, title, description, priority, estimatedHours, storyPoints, checklist } = req.body;
    const template = await prisma.taskTemplate.create({
      data: {
        projectId: req.params.id,
        name,
        title,
        description: description ?? null,
        priority: priority ?? "MEDIUM",
        estimatedHours: estimatedHours ?? null,
        storyPoints: storyPoints ?? null,
        checklist: checklist ?? null,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ template });
  } catch (e) {
    next(e);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const template = await prisma.taskTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) return notFound(res, "Template");
    if (!(await isProjectAdmin(template.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const fields = ["name", "title", "description", "priority", "estimatedHours", "storyPoints", "checklist"];
    const data = {};
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

    const updated = await prisma.taskTemplate.update({ where: { id: template.id }, data });
    res.json({ template: updated });
  } catch (e) {
    next(e);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = await prisma.taskTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) return notFound(res, "Template");
    if (!(await isProjectAdmin(template.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    await prisma.taskTemplate.delete({ where: { id: template.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const instantiate = async (req, res, next) => {
  try {
    const template = await prisma.taskTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) return notFound(res, "Template");
    if (!(await isProjectMember(template.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const { assigneeId, dueDate, sprintId } = req.body;
    const task = await prisma.task.create({
      data: {
        title: template.title,
        description: template.description,
        priority: template.priority,
        estimatedHours: template.estimatedHours,
        storyPoints: template.storyPoints,
        projectId: template.projectId,
        createdById: req.user.id,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sprintId: sprintId ?? null,
      },
    });

    if (Array.isArray(template.checklist) && template.checklist.length) {
      await prisma.checklistItem.createMany({
        data: template.checklist
          .filter((c) => c && c.title)
          .map((c, i) => ({ taskId: task.id, title: c.title, order: i })),
      });
    }

    res.status(201).json({ task });
  } catch (e) {
    next(e);
  }
};

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate, instantiate };
