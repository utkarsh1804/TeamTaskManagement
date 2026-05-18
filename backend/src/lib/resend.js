const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "TeamTask <onboarding@resend.dev>";
const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const emailBase = (content) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#18181b;padding:20px 32px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">TeamTask</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">You received this email from TeamTask. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;margin-top:24px;">${text}</a>`;

const card = (label, title, subtitle) => `
  <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;">${label}</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#18181b;">${title}</p>
    ${subtitle ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">${subtitle}</p>` : ""}
  </div>`;

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn("[resend] RESEND_API_KEY not set — email skipped.");
    return;
  }
  try {
    await resend.emails.send({ from: resendFrom, to, subject, html });
  } catch (err) {
    console.error("[resend] Failed to send email:", err);
  }
};

const sendTaskAssigned = ({ to, assigneeName, taskTitle, projectName }) =>
  sendEmail({
    to,
    subject: `New task assigned: ${taskTitle}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">You have a new task</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Hi ${assigneeName || "there"}, a task has been assigned to you.</p>
      ${card("Task", taskTitle, projectName ? `in ${projectName}` : "")}
      ${btn("View Task", `${appUrl}/my-tasks`)}
    `),
  });

const sendTaskDone = ({ to, taskTitle, projectName }) =>
  sendEmail({
    to,
    subject: `Task completed: ${taskTitle}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Task completed</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">A task you're tracking has been marked as done.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#15803d;">Completed</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#18181b;">${taskTitle}</p>
        ${projectName ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">in ${projectName}</p>` : ""}
      </div>
      ${btn("View Tasks", `${appUrl}/my-tasks`)}
    `),
  });

const sendProjectInvite = ({ to, projectName, inviterName }) =>
  sendEmail({
    to,
    subject: `You've been added to ${projectName}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Project invitation</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">
        ${inviterName ? `<strong>${inviterName}</strong> has` : "You have been"} added you to a project.
      </p>
      ${card("Project", projectName, "")}
      ${btn("Open Project", `${appUrl}/projects`)}
    `),
  });

const sendDailyReminder = ({ to, assigneeName, dueSoonTasks, overdueTasks }) => {
  const rows = [
    ...(overdueTasks || []).map(
      (t) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">${t.title}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:12px;color:#ef4444;text-align:right;font-weight:500;">Overdue</td>
        </tr>`
    ),
    ...(dueSoonTasks || []).map(
      (t) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">${t.title}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:12px;color:#f59e0b;text-align:right;font-weight:500;">Due soon</td>
        </tr>`
    ),
  ].join("");

  const count = (overdueTasks?.length || 0) + (dueSoonTasks?.length || 0);

  return sendEmail({
    to,
    subject: `Task reminder: ${count} task${count !== 1 ? "s" : ""} need${count === 1 ? "s" : ""} attention`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Daily task reminder</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Hi ${assigneeName || "there"}, here are your tasks that need attention today.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      ${btn("Go to My Tasks", `${appUrl}/my-tasks`)}
    `),
  });
};

module.exports = {
  sendEmail,
  sendTaskAssigned,
  sendTaskDone,
  sendProjectInvite,
  sendDailyReminder,
};
