const prisma = require("../lib/prisma");
const notifications = require("../lib/notifications");

const getAccessibleProjectIds = async (userId) => {
  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true },
  });

  return projects.map((project) => project.id);
};

const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectIds = await getAccessibleProjectIds(userId);

    const totalProjects = projectIds.length;
    if (projectIds.length === 0) {
      return res.json({
        totalProjects,
        totalTasks: 0,
        myTasks: 0,
        overdueTasks: 0,
        tasksByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          IN_REVIEW: 0,
          DONE: 0,
        },
        recentActivity: [],
      });
    }

    const [totalTasks, myTasks, overdueTasks, grouped, recentActivity] =
      await prisma.$transaction([
        prisma.task.count({ where: { projectId: { in: projectIds } } }),
        prisma.task.count({
          where: {
            projectId: { in: projectIds },
            assigneeId: userId,
            status: { not: "DONE" },
          },
        }),
        prisma.task.count({
          where: {
            projectId: { in: projectIds },
            dueDate: { lt: new Date() },
            status: { not: "DONE" },
          },
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: { projectId: { in: projectIds } },
          _count: { status: true },
        }),
        prisma.activityLog.findMany({
          where: { projectId: { in: projectIds } },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);

    const tasksByStatus = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    grouped.forEach((row) => {
      tasksByStatus[row.status] = row._count.status;
    });

    res.json({
      totalProjects,
      totalTasks,
      myTasks,
      overdueTasks,
      tasksByStatus,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

const getActivityLog = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isGlobalAdmin = req.user.globalRole === "ADMIN";
    const {
      projectId,
      entityType,
      userId: filterUserId,
      action,
      from,
      to,
    } = req.query;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const where = {};

    if (!isGlobalAdmin) {
      const projectIds = await getAccessibleProjectIds(userId);
      if (projectId && !projectIds.includes(projectId)) {
        return res
          .status(403)
          .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
      }
      where.projectId = projectId ? projectId : { in: projectIds };
    } else if (projectId) {
      where.projectId = projectId;
    }

    if (entityType) where.entityType = entityType;
    if (filterUserId) where.userId = filterUserId;
    if (action) where.action = { contains: action, mode: "insensitive" };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters: { projectId, entityType, userId: filterUserId, action, from, to },
    });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const take = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);
    const unreadOnly = req.query.unreadOnly === "true";

    const result = await notifications.listForUser(userId, { take, skip, unreadOnly });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notifications.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    await notifications.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const result = await notifications.markRead(req.params.id, req.user.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found", code: "NOT_FOUND" });
    }
    res.json({ notification: result });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const result = await notifications.remove(req.params.id, req.user.id);
    if (!result.count) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found", code: "NOT_FOUND" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const deleteAllNotifications = async (req, res, next) => {
  try {
    const result = await notifications.removeAll(req.user.id);
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getActivityLog,
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  markOneRead,
  deleteNotification,
  deleteAllNotifications,
};
