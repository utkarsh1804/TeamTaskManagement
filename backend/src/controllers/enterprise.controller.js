const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

// ---------- CSV helpers ----------
const csvEscape = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCsv = (headers, rows) =>
  [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\r\n");
const sendCsv = (res, filename, csv) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};
const iso = (d) => (d ? new Date(d).toISOString() : "");

// ---------- Exports ----------
const exportProjectTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      include: { assignee: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const headers = [
      "ID", "Title", "Status", "Priority", "Assignee", "Due Date",
      "Estimated Hours", "Story Points", "Created By", "Created At",
    ];
    const rows = tasks.map((t) => [
      t.id, t.title, t.status, t.priority, t.assignee?.name || "", iso(t.dueDate),
      t.estimatedHours ?? "", t.storyPoints ?? "", t.createdBy?.name || "", iso(t.createdAt),
    ]);
    sendCsv(res, `tasks-${req.params.id}.csv`, toCsv(headers, rows));
  } catch (e) {
    next(e);
  }
};

const exportMyTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const headers = ["ID", "Title", "Project", "Status", "Priority", "Due Date", "Created At"];
    const rows = tasks.map((t) => [
      t.id, t.title, t.project?.name || "", t.status, t.priority, iso(t.dueDate), iso(t.createdAt),
    ]);
    sendCsv(res, "my-tasks.csv", toCsv(headers, rows));
  } catch (e) {
    next(e);
  }
};

// ---------- Global search ----------
const search = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ tasks: [], projects: [], total: 0 });

    const isAdmin = req.user.globalRole === "ADMIN";
    let projectFilter = {};
    let taskProjectFilter = {};
    if (!isAdmin) {
      const [memberships, owned] = await Promise.all([
        prisma.projectMember.findMany({ where: { userId: req.user.id }, select: { projectId: true } }),
        prisma.project.findMany({ where: { ownerId: req.user.id }, select: { id: true } }),
      ]);
      const ids = [...new Set([...memberships.map((m) => m.projectId), ...owned.map((o) => o.id)])];
      projectFilter = { id: { in: ids } };
      taskProjectFilter = { projectId: { in: ids } };
    }

    const like = { contains: q, mode: "insensitive" };
    const [tasks, projects] = await Promise.all([
      prisma.task.findMany({
        where: { AND: [taskProjectFilter, { OR: [{ title: like }, { description: like }] }] },
        take: 20,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, priority: true, projectId: true, project: { select: { name: true } } },
      }),
      prisma.project.findMany({
        where: { AND: [projectFilter, { OR: [{ name: like }, { description: like }] }] },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true },
      }),
    ]);
    res.json({ tasks, projects, total: tasks.length + projects.length });
  } catch (e) {
    next(e);
  }
};

// ---------- GDPR ----------
const gdprExport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [user, createdTasks, assignedTasks, comments, timeEntries, leaveRequests, notifs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, jobTitle: true, phone: true, timezone: true, createdAt: true },
      }),
      prisma.task.findMany({ where: { createdById: userId }, select: { id: true, title: true, status: true, createdAt: true } }),
      prisma.task.findMany({ where: { assigneeId: userId }, select: { id: true, title: true, status: true } }),
      prisma.comment.findMany({ where: { authorId: userId }, select: { id: true, body: true, createdAt: true } }),
      prisma.timeEntry.findMany({ where: { userId }, select: { id: true, taskId: true, durationMinutes: true, startedAt: true } }),
      prisma.leaveRequest.findMany({ where: { userId }, select: { id: true, type: true, status: true, startDate: true, endDate: true } }),
      prisma.notification.findMany({ where: { userId }, select: { id: true, type: true, title: true, createdAt: true }, take: 200 }),
    ]);
    res.setHeader("Content-Disposition", `attachment; filename="teamtask-data-${userId}.json"`);
    res.json({ exportedAt: new Date().toISOString(), user, createdTasks, assignedTasks, comments, timeEntries, leaveRequests, notifications: notifs });
  } catch (e) {
    next(e);
  }
};

const gdprDelete = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
    const ok = await bcrypt.compare(req.body?.password || "", user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: "Invalid password", code: "INVALID_CREDENTIALS" });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        deletedAt: new Date(),
        name: "Deleted User",
        email: `deleted+${req.user.id}@example.invalid`,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    await prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

// ---------- File upload (Supabase Storage REST; graceful when unconfigured) ----------
const uploadFile = async (req, res, next) => {
  try {
    const { name, mimeType, dataBase64, taskId, projectId } = req.body;
    const buffer = Buffer.from(dataBase64, "base64");
    const size = buffer.length;

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || "attachments";

    if (!url || !serviceKey) {
      return res.status(503).json({
        success: false,
        error: "File storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_KEY)",
        code: "STORAGE_NOT_CONFIGURED",
      });
    }

    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${req.user.id}/${Date.now()}-${safeName}`;
    const uploadResp = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": mimeType, "x-upsert": "true" },
      body: buffer,
    });
    if (!uploadResp.ok) {
      const txt = await uploadResp.text().catch(() => "");
      return res.status(502).json({ success: false, error: `Storage upload failed: ${uploadResp.status} ${txt}`, code: "STORAGE_ERROR" });
    }

    const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}`;
    const attachment = await prisma.attachment.create({
      data: { taskId: taskId || null, projectId: projectId || null, url: publicUrl, name, size, mimeType, uploadedById: req.user.id },
    });
    res.status(201).json({ attachment });
  } catch (e) {
    next(e);
  }
};

module.exports = { exportProjectTasks, exportMyTasks, search, gdprExport, gdprDelete, uploadFile };
