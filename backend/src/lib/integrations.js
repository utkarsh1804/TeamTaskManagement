const crypto = require("crypto");
const prisma = require("./prisma");
const logger = require("./logger");

const postJSON = (url, body, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const buildDelivery = (integration, event, payload) => {
  const config = integration.config || {};
  const headers = {};
  let url = null;
  let body;

  if (integration.type === "SLACK") {
    url = config.webhookUrl || config.url;
    const summary = payload.title || payload.message || event;
    body = { text: `:bell: *TeamTask* — \`${event}\`\n> ${summary}` };
  } else if (integration.type === "GITHUB") {
    url = config.webhookUrl || config.url;
    body = { event, payload, sender: "teamtask" };
    if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
    headers["Accept"] = "application/vnd.github+json";
  } else {
    // WEBHOOK (generic)
    url = config.url || config.webhookUrl;
    body = { event, payload, timestamp: new Date().toISOString() };
    if (config.secret) {
      const sig = crypto.createHmac("sha256", config.secret).update(JSON.stringify(body)).digest("hex");
      headers["X-TeamTask-Signature"] = `sha256=${sig}`;
    }
  }

  return { url, body, headers };
};

const deliver = async (integration, event, payload) => {
  const { url, body, headers } = buildDelivery(integration, event, payload);
  if (!url) {
    await prisma.webhookDelivery
      .create({
        data: { integrationId: integration.id, event, payload, statusCode: null, success: false, error: "No delivery URL configured" },
      })
      .catch(() => {});
    return { success: false, error: "No delivery URL configured" };
  }
  try {
    const resp = await postJSON(url, body, headers);
    await prisma.webhookDelivery
      .create({
        data: {
          integrationId: integration.id,
          event,
          payload,
          statusCode: resp.status,
          success: resp.ok,
          error: resp.ok ? null : `HTTP ${resp.status}`,
        },
      })
      .catch(() => {});
    return { success: resp.ok, statusCode: resp.status };
  } catch (err) {
    logger.warn("integration delivery failed", { integrationId: integration.id, event, error: String(err.message || err) });
    await prisma.webhookDelivery
      .create({
        data: { integrationId: integration.id, event, payload, statusCode: null, success: false, error: String(err.message || err) },
      })
      .catch(() => {});
    return { success: false, error: String(err.message || err) };
  }
};

// Fan a project event out to all enabled integrations on that project.
const dispatchProjectEvent = async (projectId, event, payload) => {
  const integrations = await prisma.projectIntegration.findMany({ where: { projectId, enabled: true } });
  for (const integration of integrations) {
    await deliver(integration, event, payload);
  }
  return integrations.length;
};

module.exports = { dispatchProjectEvent, deliver };
