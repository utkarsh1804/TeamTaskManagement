const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "TeamTask <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn("Resend is not configured (missing RESEND_API_KEY). Email skipped.");
    return;
  }

  await resend.emails.send({
    from: resendFrom,
    to,
    subject,
    html,
  });
};

const sendTaskAssigned = ({ to, taskTitle }) =>
  sendEmail({
    to,
    subject: `You have been assigned: ${taskTitle}`,
    html: `<p>You have been assigned to <strong>${taskTitle}</strong>.</p>`,
  });

const sendTaskDone = ({ to, taskTitle }) =>
  sendEmail({
    to,
    subject: `${taskTitle} has been completed`,
    html: `<p>The task <strong>${taskTitle}</strong> has been marked as DONE.</p>`,
  });

const sendProjectInvite = ({ to, projectName }) =>
  sendEmail({
    to,
    subject: `You have been added to ${projectName}`,
    html: `<p>You have been added to the project <strong>${projectName}</strong>.</p>`,
  });

const sendDailyReminder = ({ to, assigneeName, dueSoonTasks, overdueTasks }) => {
  const dueSoonList = (dueSoonTasks || [])
    .map((task) => `<li>${task.title}</li>`)
    .join("");
  const overdueList = (overdueTasks || [])
    .map((task) => `<li>${task.title}</li>`)
    .join("");

  const html = `
    <p>Hi ${assigneeName || "there"},</p>
    ${dueSoonList ? `<p>Due soon:</p><ul>${dueSoonList}</ul>` : ""}
    ${overdueList ? `<p>Overdue:</p><ul>${overdueList}</ul>` : ""}
  `;

  return sendEmail({
    to,
    subject: "Reminder: tasks due soon or overdue",
    html,
  });
};

module.exports = {
  sendTaskAssigned,
  sendTaskDone,
  sendProjectInvite,
  sendDailyReminder,
};
