const cron = require("node-cron");
const prisma = require("./prisma");
const notifications = require("./notifications");
const { sendDailyReminder } = require("./resend");

const HOUR_MS = 60 * 60 * 1000;

// Scans enabled SLA policies and notifies assignees of tasks past their
// resolution deadline. De-duplicates via an existing SLA_BREACH notification.
const runSlaEscalation = async () => {
  const policies = await prisma.slaPolicy.findMany({ where: { enabled: true } });
  if (!policies.length) return;
  const now = new Date();
  for (const policy of policies) {
    const tasks = await prisma.task.findMany({
      where: {
        projectId: policy.projectId,
        priority: policy.priority,
        status: { not: "DONE" },
        assigneeId: { not: null },
      },
      select: { id: true, title: true, createdAt: true, assigneeId: true, projectId: true },
    });
    for (const task of tasks) {
      const deadline = new Date(new Date(task.createdAt).getTime() + policy.resolutionHours * HOUR_MS);
      if (now <= deadline) continue;
      const existing = await prisma.notification.findFirst({
        where: { userId: task.assigneeId, type: "SLA_BREACH", meta: { path: ["taskId"], equals: task.id } },
      });
      if (existing) continue;
      await notifications.create({
        userId: task.assigneeId,
        type: notifications.NotificationType.SLA_BREACH,
        title: "SLA breached",
        body: `Task "${task.title}" exceeded its ${policy.resolutionHours}h SLA`,
        link: `/tasks/${task.id}`,
        meta: { taskId: task.id, projectId: task.projectId, policy: policy.name },
      });
    }
  }
};

const startCron = () => {
  if (!process.env.DATABASE_URL) {
    console.warn("Cron disabled: missing DATABASE_URL.");
    return;
  }

  // SLA breach escalation — every 30 minutes (DB-only, no email needed).
  cron.schedule("*/30 * * * *", async () => {
    try {
      await runSlaEscalation();
    } catch (error) {
      console.error("SLA escalation failed", error);
    }
  });

  if (!process.env.RESEND_API_KEY) {
    console.warn("Email reminders disabled: missing RESEND_API_KEY.");
    return;
  }

  cron.schedule("0 8 * * *", async () => {
    try {
      const now = new Date();
      const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const dueSoonTasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: nextDay },
          status: { not: "DONE" },
          assigneeId: { not: null },
        },
        include: { assignee: true },
      });

      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { not: "DONE" },
          assigneeId: { not: null },
        },
        include: { assignee: true },
      });

      const dueSoonByUser = new Map();
      for (const task of dueSoonTasks) {
        if (!task.assignee) continue;
        const key = task.assignee.id;
        if (!dueSoonByUser.has(key)) {
          dueSoonByUser.set(key, { user: task.assignee, tasks: [] });
        }
        dueSoonByUser.get(key).tasks.push(task);
      }

      const overdueByUser = new Map();
      for (const task of overdueTasks) {
        if (!task.assignee) continue;
        const key = task.assignee.id;
        if (!overdueByUser.has(key)) {
          overdueByUser.set(key, { user: task.assignee, tasks: [] });
        }
        overdueByUser.get(key).tasks.push(task);
      }

      const userIds = new Set([...dueSoonByUser.keys(), ...overdueByUser.keys()]);

      for (const userId of userIds) {
        const dueSoonBucket = dueSoonByUser.get(userId);
        const overdueBucket = overdueByUser.get(userId);
        const user = (dueSoonBucket || overdueBucket).user;

        await sendDailyReminder({
          to: user.email,
          assigneeName: user.name,
          dueSoonTasks: dueSoonBucket ? dueSoonBucket.tasks : [],
          overdueTasks: overdueBucket ? overdueBucket.tasks : [],
        });

        await prisma.activityLog.create({
          data: {
            action: "sent daily reminder email",
            entityType: "EmailReminder",
            entityId: user.id,
            userId: user.id,
            meta: {
              dueSoonCount: dueSoonBucket ? dueSoonBucket.tasks.length : 0,
              overdueCount: overdueBucket ? overdueBucket.tasks.length : 0,
            },
          },
        });
      }
    } catch (error) {
      console.error("Cron job failed", error);
    }
  });
};

module.exports = { startCron };
