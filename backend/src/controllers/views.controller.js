const prisma = require("../lib/prisma");

const notFound = (res) =>
  res.status(404).json({ success: false, error: "View not found", code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const listViews = async (req, res, next) => {
  try {
    const me = req.user.id;
    const where = { OR: [{ ownerId: me }, { shared: true }] };
    if (req.query.projectId) where.projectId = req.query.projectId;
    const items = await prisma.savedView.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true } } },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createView = async (req, res, next) => {
  try {
    const { projectId, name, filters, viewType, shared } = req.body;
    const view = await prisma.savedView.create({
      data: {
        projectId: projectId ?? null,
        ownerId: req.user.id,
        name,
        filters,
        viewType: viewType ?? "list",
        shared: shared ?? false,
      },
    });
    res.status(201).json({ view });
  } catch (e) {
    next(e);
  }
};

const updateView = async (req, res, next) => {
  try {
    const view = await prisma.savedView.findUnique({ where: { id: req.params.viewId } });
    if (!view) return notFound(res);
    if (view.ownerId !== req.user.id && req.user.globalRole !== "ADMIN") return forbidden(res);

    const fields = ["name", "filters", "viewType", "shared", "projectId"];
    const data = {};
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

    const updated = await prisma.savedView.update({ where: { id: view.id }, data });
    res.json({ view: updated });
  } catch (e) {
    next(e);
  }
};

const deleteView = async (req, res, next) => {
  try {
    const view = await prisma.savedView.findUnique({ where: { id: req.params.viewId } });
    if (!view) return notFound(res);
    if (view.ownerId !== req.user.id && req.user.globalRole !== "ADMIN") return forbidden(res);
    await prisma.savedView.delete({ where: { id: view.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

module.exports = { listViews, createView, updateView, deleteView };
