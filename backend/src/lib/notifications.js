const prisma = require("./prisma");

const NotificationType = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_DONE: "TASK_DONE",
  TASK_OVERDUE: "TASK_OVERDUE",
  TASK_DUE_SOON: "TASK_DUE_SOON",
  COMMENT_ADDED: "COMMENT_ADDED",
  MENTION: "MENTION",
  PROJECT_INVITED: "PROJECT_INVITED",
  PROJECT_MEMBER_ADDED: "PROJECT_MEMBER_ADDED",
  PROJECT_MEMBER_REMOVED: "PROJECT_MEMBER_REMOVED",
  PROJECT_MEMBER_ROLE_CHANGED: "PROJECT_MEMBER_ROLE_CHANGED",
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_DELETED: "PROJECT_DELETED",
  ADMIN_REQUEST_APPROVED: "ADMIN_REQUEST_APPROVED",
  ADMIN_REQUEST_REJECTED: "ADMIN_REQUEST_REJECTED",
  ORG_MEMBER_ADDED: "ORG_MEMBER_ADDED",
  TEAM_MEMBER_ADDED: "TEAM_MEMBER_ADDED",
  SYSTEM: "SYSTEM",
};

const create = async ({ userId, type, title, body, link, meta }) => {
  if (!userId || !type || !title) return null;
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body: body || null, link: link || null, meta: meta || null },
    });
  } catch (err) {
    console.error("[notifications] create failed:", err);
    return null;
  }
};

const createMany = async (rows) => {
  if (!rows || !rows.length) return { count: 0 };
  try {
    return await prisma.notification.createMany({ data: rows });
  } catch (err) {
    console.error("[notifications] createMany failed:", err);
    return { count: 0 };
  }
};

const listForUser = async (userId, { take = 20, skip = 0, unreadOnly = false } = {}) => {
  const where = { userId };
  if (unreadOnly) where.read = false;

  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return { items, total, unreadCount };
};

const getUnreadCount = (userId) =>
  prisma.notification.count({ where: { userId, read: false } });

const markRead = async (notificationId, userId) => {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) return null;
  if (existing.read) return existing;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true, readAt: new Date() },
  });
};

const markAllRead = (userId) =>
  prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });

const remove = (notificationId, userId) =>
  prisma.notification.deleteMany({ where: { id: notificationId, userId } });

const removeAll = (userId) =>
  prisma.notification.deleteMany({ where: { userId } });

module.exports = {
  NotificationType,
  create,
  createMany,
  listForUser,
  getUnreadCount,
  markRead,
  markAllRead,
  remove,
  removeAll,
};
