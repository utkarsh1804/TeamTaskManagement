const prisma = require("../lib/prisma");
const notifications = require("../lib/notifications");

const userSelect = { id: true, name: true, email: true };

const createLeave = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, error: "endDate must be on or after startDate", code: "BAD_REQUEST" });
    }

    const leave = await prisma.leaveRequest.create({
      data: { userId: req.user.id, type, startDate: start, endDate: end, reason: reason || null },
    });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    const admins = await prisma.user.findMany({ where: { globalRole: "ADMIN" }, select: { id: true } });
    const rows = admins
      .filter((a) => a.id !== req.user.id)
      .map((a) => ({
        userId: a.id,
        type: notifications.NotificationType.LEAVE_REQUESTED,
        title: `${actor?.name || "A user"} requested ${type.toLowerCase()} leave`,
        body: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
        link: "/leave/review",
        meta: { leaveId: leave.id },
      }));
    if (rows.length) await notifications.createMany(rows);

    res.status(201).json({ leave });
  } catch (error) {
    next(error);
  }
};

const listMyLeave = async (req, res, next) => {
  try {
    const items = await prisma.leaveRequest.findMany({
      where: { userId: req.user.id },
      include: { reviewedBy: { select: userSelect } },
      orderBy: { startDate: "desc" },
    });
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
};

const cancelLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ success: false, error: "Request not found", code: "NOT_FOUND" });
    if (leave.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    if (leave.status !== "PENDING") {
      return res.status(400).json({ success: false, error: "Only pending requests can be cancelled", code: "BAD_REQUEST" });
    }
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ leave: updated });
  } catch (error) {
    next(error);
  }
};

const listPending = async (_req, res, next) => {
  try {
    const items = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: userSelect } },
      orderBy: { startDate: "asc" },
    });
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
};

const reviewLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ success: false, error: "Request not found", code: "NOT_FOUND" });
    if (leave.status !== "PENDING") {
      return res.status(400).json({ success: false, error: "Request is not awaiting review", code: "BAD_REQUEST" });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewNote: reviewNote || null, reviewedById: req.user.id, reviewedAt: new Date() },
      include: { reviewedBy: { select: userSelect } },
    });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    await notifications.create({
      userId: leave.userId,
      type: notifications.NotificationType.LEAVE_REVIEWED,
      title: `Your leave request was ${status.toLowerCase()}`,
      body: `${actor?.name || "A reviewer"} reviewed ${leave.startDate.toISOString().slice(0, 10)} → ${leave.endDate.toISOString().slice(0, 10)}`,
      link: "/leave",
      meta: { leaveId: id, status },
    });

    res.json({ leave: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLeave,
  listMyLeave,
  cancelLeave,
  listPending,
  reviewLeave,
};
