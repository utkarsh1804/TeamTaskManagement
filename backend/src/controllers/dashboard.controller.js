const prisma = require("../lib/prisma");
const { getLastReadAt, markRead } = require("../lib/notifications");

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
    const projectIds = await getAccessibleProjectIds(userId);

    const { projectId } = req.query;
    if (projectId && !projectIds.includes(projectId)) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const skip = (page - 1) * limit;

    const where = projectId
      ? { projectId }
      : { projectId: { in: projectIds } };

    const [items, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectIds = await getAccessibleProjectIds(userId);
    const lastReadAt = getLastReadAt(userId);

    const [unreadCount, items] = await prisma.$transaction([
      prisma.activityLog.count({
        where: {
          projectId: { in: projectIds },
          createdAt: { gt: lastReadAt },
        },
      }),
      prisma.activityLog.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    res.json({ unreadCount, items, lastReadAt });
  } catch (error) {
    next(error);
  }
};

const markNotificationsRead = (req, res) => {
  markRead(req.user.id);
  res.json({ success: true });
};

module.exports = {
  getDashboard,
  getActivityLog,
  getNotifications,
  markNotificationsRead,
};
