const prisma = require("./prisma");

const logActivity = async (action, entityType, entityId, userId, projectId, meta) =>
  prisma.activityLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      projectId,
      meta,
    },
  });

module.exports = { logActivity };
