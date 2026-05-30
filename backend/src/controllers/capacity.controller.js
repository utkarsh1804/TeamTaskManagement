const prisma = require("../lib/prisma");

// Workload per assignee: open (non-DONE) task counts, estimated hours, story
// points, plus any currently-approved leave. Powers the capacity heatmap.
const getCapacity = async (_req, res, next) => {
  try {
    const now = new Date();
    const [users, grouped, leaves] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, jobTitle: true },
        orderBy: { name: "asc" },
        take: 200,
      }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { status: { not: "DONE" }, assigneeId: { not: null } },
        _count: { _all: true },
        _sum: { estimatedHours: true, storyPoints: true },
      }),
      prisma.leaveRequest.findMany({
        where: { status: "APPROVED", endDate: { gte: now } },
        select: { userId: true, startDate: true, endDate: true, type: true },
      }),
    ]);

    const byUser = new Map();
    grouped.forEach((g) => {
      byUser.set(g.assigneeId, {
        openTasks: g._count._all,
        estimatedHours: Number(g._sum.estimatedHours || 0),
        storyPoints: g._sum.storyPoints || 0,
      });
    });

    const leaveByUser = new Map();
    leaves.forEach((l) => {
      const list = leaveByUser.get(l.userId) || [];
      list.push({ startDate: l.startDate, endDate: l.endDate, type: l.type, onLeaveNow: l.startDate <= now && l.endDate >= now });
      leaveByUser.set(l.userId, list);
    });

    const items = users.map((u) => {
      const load = byUser.get(u.id) || { openTasks: 0, estimatedHours: 0, storyPoints: 0 };
      const leave = leaveByUser.get(u.id) || [];
      return {
        user: u,
        openTasks: load.openTasks,
        estimatedHours: load.estimatedHours,
        storyPoints: load.storyPoints,
        leave,
        onLeaveNow: leave.some((l) => l.onLeaveNow),
      };
    });

    const maxHours = Math.max(0, ...items.map((i) => i.estimatedHours));
    const maxTasks = Math.max(0, ...items.map((i) => i.openTasks));

    res.json({ items, total: items.length, maxHours, maxTasks });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCapacity };
