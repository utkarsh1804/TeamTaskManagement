const prisma = require("../lib/prisma");
const { isProjectAdmin, isProjectMember } = require("../lib/projectAccess");
const { deliver } = require("../lib/integrations");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const SECRET_KEYS = ["token", "secret", "apiKey", "password"];
const redact = (config) => {
  if (!config || typeof config !== "object") return config;
  const c = { ...config };
  for (const k of SECRET_KEYS) if (c[k]) c[k] = "••••••••";
  return c;
};

const listIntegrations = async (req, res, next) => {
  try {
    const items = await prisma.projectIntegration.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { deliveries: true } } },
    });
    res.json({
      items: items.map((i) => ({ ...i, config: redact(i.config) })),
      total: items.length,
    });
  } catch (e) {
    next(e);
  }
};

const createIntegration = async (req, res, next) => {
  try {
    const { type, config, enabled } = req.body;
    const integration = await prisma.projectIntegration.create({
      data: {
        projectId: req.params.id,
        type,
        config,
        enabled: enabled ?? true,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ integration: { ...integration, config: redact(integration.config) } });
  } catch (e) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, error: "An integration of this type already exists for the project", code: "CONFLICT" });
    }
    next(e);
  }
};

const loadAdmin = async (req, res) => {
  const integration = await prisma.projectIntegration.findUnique({ where: { id: req.params.integrationId } });
  if (!integration) {
    notFound(res, "Integration");
    return null;
  }
  if (!(await isProjectAdmin(integration.projectId, req.user.id, req.user.globalRole))) {
    forbidden(res);
    return null;
  }
  return integration;
};

const updateIntegration = async (req, res, next) => {
  try {
    const integration = await loadAdmin(req, res);
    if (!integration) return;
    const data = {};
    if (req.body.config !== undefined) data.config = req.body.config;
    if (req.body.enabled !== undefined) data.enabled = req.body.enabled;
    const updated = await prisma.projectIntegration.update({ where: { id: integration.id }, data });
    res.json({ integration: { ...updated, config: redact(updated.config) } });
  } catch (e) {
    next(e);
  }
};

const deleteIntegration = async (req, res, next) => {
  try {
    const integration = await loadAdmin(req, res);
    if (!integration) return;
    await prisma.webhookDelivery.deleteMany({ where: { integrationId: integration.id } });
    await prisma.projectIntegration.delete({ where: { id: integration.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const testIntegration = async (req, res, next) => {
  try {
    const integration = await loadAdmin(req, res);
    if (!integration) return;
    const result = await deliver(integration, "test.ping", {
      title: "Test event from TeamTask",
      message: "If you can see this, the integration works.",
      at: new Date().toISOString(),
    });
    res.json({ result });
  } catch (e) {
    next(e);
  }
};

const listDeliveries = async (req, res, next) => {
  try {
    const integration = await loadAdmin(req, res);
    if (!integration) return;
    const items = await prisma.webhookDelivery.findMany({
      where: { integrationId: integration.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  listDeliveries,
};
