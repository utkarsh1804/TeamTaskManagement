const prisma = require("../lib/prisma");
const { isProjectAdmin, isProjectMember } = require("../lib/projectAccess");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const listFields = async (req, res, next) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json({ items: fields, total: fields.length });
  } catch (e) {
    next(e);
  }
};

const createField = async (req, res, next) => {
  try {
    const { name, type, options, required, order } = req.body;
    const field = await prisma.customField.create({
      data: {
        projectId: req.params.id,
        name,
        type,
        options: options ?? null,
        required: required ?? false,
        order: order ?? 0,
      },
    });
    res.status(201).json({ field });
  } catch (e) {
    next(e);
  }
};

const updateField = async (req, res, next) => {
  try {
    const field = await prisma.customField.findUnique({ where: { id: req.params.fieldId } });
    if (!field) return notFound(res, "Field");
    if (!(await isProjectAdmin(field.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const { name, type, options, required, order } = req.body;
    const updated = await prisma.customField.update({
      where: { id: field.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && { options }),
        ...(required !== undefined && { required }),
        ...(order !== undefined && { order }),
      },
    });
    res.json({ field: updated });
  } catch (e) {
    next(e);
  }
};

const deleteField = async (req, res, next) => {
  try {
    const field = await prisma.customField.findUnique({ where: { id: req.params.fieldId } });
    if (!field) return notFound(res, "Field");
    if (!(await isProjectAdmin(field.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    await prisma.customFieldValue.deleteMany({ where: { fieldId: field.id } });
    await prisma.customField.delete({ where: { id: field.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const getTaskValues = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      select: { id: true, projectId: true },
    });
    if (!task) return notFound(res, "Task");
    if (!(await isProjectMember(task.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const fields = await prisma.customField.findMany({
      where: { projectId: task.projectId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { values: { where: { taskId: task.id } } },
    });
    const items = fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      options: f.options,
      required: f.required,
      value: f.values[0]?.value ?? null,
    }));
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const setTaskValue = async (req, res, next) => {
  try {
    const { taskId, fieldId } = req.params;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });
    if (!task) return notFound(res, "Task");
    if (!(await isProjectMember(task.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const field = await prisma.customField.findUnique({ where: { id: fieldId } });
    if (!field || field.projectId !== task.projectId) return notFound(res, "Field");

    const { value } = req.body;
    const saved = await prisma.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId, taskId } },
      create: { fieldId, taskId, value: value ?? null },
      update: { value: value ?? null },
    });
    res.json({ value: saved });
  } catch (e) {
    next(e);
  }
};

module.exports = { listFields, createField, updateField, deleteField, getTaskValues, setTaskValue };
