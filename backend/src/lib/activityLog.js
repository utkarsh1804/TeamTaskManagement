const prisma = require("./prisma");

const logActivity = (action, entityType, entityId, userId, projectId, meta) => {
  prisma.activityLog
    .create({ data: { action, entityType, entityId, userId, projectId, meta } })
    .catch((err) => console.error("[activityLog] failed to write:", err));
};

module.exports = { logActivity };
