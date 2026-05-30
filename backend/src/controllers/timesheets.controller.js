const prisma = require("../lib/prisma");
const notifications = require("../lib/notifications");

const userSelect = { id: true, name: true, email: true };

// Monday 00:00 UTC for the week containing `input`.
const getWeekStart = (input) => {
  const d = new Date(input);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
};

const addDays = (date, n) => new Date(date.getTime() + n * 24 * 60 * 60 * 1000);

const sumMinutes = (entries) => entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);

const getMyTimesheet = async (req, res, next) => {
  try {
    const weekStart = getWeekStart(req.query.weekStart || new Date());
    const weekEnd = addDays(weekStart, 7);

    const [timesheet, entries] = await Promise.all([
      prisma.timesheet.findUnique({
        where: { userId_weekStart: { userId: req.user.id, weekStart } },
        include: { reviewedBy: { select: userSelect } },
      }),
      prisma.timeEntry.findMany({
        where: { userId: req.user.id, endedAt: { not: null }, startedAt: { gte: weekStart, lt: weekEnd } },
        include: { task: { select: { id: true, title: true, projectId: true } } },
        orderBy: { startedAt: "asc" },
      }),
    ]);

    res.json({
      weekStart,
      weekEnd,
      timesheet: timesheet || null,
      status: timesheet?.status || "DRAFT",
      entries,
      totalMinutes: sumMinutes(entries),
    });
  } catch (error) {
    next(error);
  }
};

const listMyTimesheets = async (req, res, next) => {
  try {
    const timesheets = await prisma.timesheet.findMany({
      where: { userId: req.user.id },
      include: { reviewedBy: { select: userSelect }, _count: { select: { entries: true } } },
      orderBy: { weekStart: "desc" },
      take: 26,
    });
    res.json({ items: timesheets, total: timesheets.length });
  } catch (error) {
    next(error);
  }
};

const submitTimesheet = async (req, res, next) => {
  try {
    const weekStart = getWeekStart(req.body.weekStart);
    const weekEnd = addDays(weekStart, 7);
    const note = req.body.note || null;

    const entries = await prisma.timeEntry.findMany({
      where: { userId: req.user.id, endedAt: { not: null }, startedAt: { gte: weekStart, lt: weekEnd } },
      select: { id: true },
    });
    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: "No time logged for this week", code: "BAD_REQUEST" });
    }

    const timesheet = await prisma.timesheet.upsert({
      where: { userId_weekStart: { userId: req.user.id, weekStart } },
      update: { status: "SUBMITTED", note, submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null },
      create: { userId: req.user.id, weekStart, status: "SUBMITTED", note, submittedAt: new Date() },
    });

    await prisma.timeEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { timesheetId: timesheet.id },
    });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    const admins = await prisma.user.findMany({ where: { globalRole: "ADMIN" }, select: { id: true } });
    const rows = admins
      .filter((a) => a.id !== req.user.id)
      .map((a) => ({
        userId: a.id,
        type: notifications.NotificationType.TIMESHEET_SUBMITTED,
        title: `${actor?.name || "A user"} submitted a timesheet`,
        body: `Week of ${weekStart.toISOString().slice(0, 10)}`,
        link: "/timesheets/review",
        meta: { timesheetId: timesheet.id },
      }));
    if (rows.length) await notifications.createMany(rows);

    res.json({ timesheet });
  } catch (error) {
    next(error);
  }
};

const listPending = async (req, res, next) => {
  try {
    const timesheets = await prisma.timesheet.findMany({
      where: { status: "SUBMITTED" },
      include: { user: { select: userSelect }, entries: { select: { durationMinutes: true } } },
      orderBy: { submittedAt: "asc" },
    });
    const items = timesheets.map((t) => ({
      id: t.id,
      user: t.user,
      weekStart: t.weekStart,
      note: t.note,
      submittedAt: t.submittedAt,
      totalMinutes: sumMinutes(t.entries),
      entryCount: t.entries.length,
    }));
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
};

const reviewTimesheet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    const timesheet = await prisma.timesheet.findUnique({ where: { id } });
    if (!timesheet) return res.status(404).json({ success: false, error: "Timesheet not found", code: "NOT_FOUND" });
    if (timesheet.status !== "SUBMITTED") {
      return res.status(400).json({ success: false, error: "Timesheet is not awaiting review", code: "BAD_REQUEST" });
    }

    const updated = await prisma.timesheet.update({
      where: { id },
      data: { status, reviewNote: reviewNote || null, reviewedById: req.user.id, reviewedAt: new Date() },
      include: { reviewedBy: { select: userSelect } },
    });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    await notifications.create({
      userId: timesheet.userId,
      type: notifications.NotificationType.TIMESHEET_REVIEWED,
      title: `Your timesheet was ${status.toLowerCase()}`,
      body: `${actor?.name || "A reviewer"} reviewed the week of ${timesheet.weekStart.toISOString().slice(0, 10)}`,
      link: "/timesheets",
      meta: { timesheetId: id, status },
    });

    res.json({ timesheet: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTimesheet,
  listMyTimesheets,
  submitTimesheet,
  listPending,
  reviewTimesheet,
};
