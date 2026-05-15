const cron = require("node-cron");
const prisma = require("./prisma");
const { sendDailyReminder } = require("./resend");

const startCron = () => {
  if (!process.env.DATABASE_URL || !process.env.RESEND_API_KEY) {
    console.warn("Cron disabled: missing DATABASE_URL or RESEND_API_KEY.");
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
