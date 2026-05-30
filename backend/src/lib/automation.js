const prisma = require("./prisma");
const notifications = require("./notifications");

// Workflow automation engine. Rules belong to a project and fire on task
// lifecycle triggers. Field-mutating actions are merged and applied ONCE at the
// end (without re-triggering the engine) to avoid infinite loops.

const matchConditions = (conditions, task) => {
  if (!conditions) return true;
  if (conditions.status && task.status !== conditions.status) return false;
  if (conditions.priority && task.priority !== conditions.priority) return false;
  if (conditions.assigneeId && task.assigneeId !== conditions.assigneeId) return false;
  return true;
};

// Returns a partial Task update object for field-mutating actions, or null for
// side-effect actions (tags, notifications, webhooks) which run inline.
const applyAction = async (action, task) => {
  switch (action.type) {
    case "SET_STATUS":
      return action.value ? { status: action.value } : null;
    case "SET_PRIORITY":
      return action.value ? { priority: action.value } : null;
    case "ASSIGN_USER":
      return { assigneeId: action.value || null };
    case "ADD_TAG":
      if (action.value) {
        await prisma.taskTag
          .upsert({
            where: { taskId_tagId: { taskId: task.id, tagId: action.value } },
            create: { taskId: task.id, tagId: action.value },
            update: {},
          })
          .catch(() => {});
      }
      return null;
    case "NOTIFY_USER":
      if (action.value) {
        await notifications.create({
          userId: action.value,
          type: notifications.NotificationType.SYSTEM,
          title: "Workflow automation",
          body: `A rule fired on task "${task.title}"`,
          link: `/tasks/${task.id}`,
          meta: { taskId: task.id, automation: true },
        });
      }
      return null;
    case "SEND_WEBHOOK":
      try {
        const { dispatchProjectEvent } = require("./integrations");
        await dispatchProjectEvent(task.projectId, "automation.fired", {
          taskId: task.id,
          title: task.title,
          status: task.status,
        });
      } catch {
        // integrations module optional / no integrations configured
      }
      return null;
    default:
      return null;
  }
};

// Runs all enabled rules for the trigger. Returns the updated task if any
// field-mutating action ran, otherwise null.
const runAutomations = async (trigger, task) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { projectId: task.projectId, trigger, enabled: true },
    });
    if (!rules.length) return null;

    let fieldData = {};
    for (const rule of rules) {
      if (!matchConditions(rule.conditions, task)) continue;
      const actions = Array.isArray(rule.actions) ? rule.actions : [];
      for (const action of actions) {
        const data = await applyAction(action, task);
        if (data) fieldData = { ...fieldData, ...data };
      }
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      });
    }

    if (Object.keys(fieldData).length) {
      return prisma.task.update({ where: { id: task.id }, data: fieldData });
    }
    return null;
  } catch (err) {
    console.error("[automation] run failed:", err);
    return null;
  }
};

module.exports = { runAutomations, matchConditions };
