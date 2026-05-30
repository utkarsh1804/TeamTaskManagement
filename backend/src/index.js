const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const authRoutes = require("./routes/auth.routes");
const projectsRoutes = require("./routes/projects.routes");
const tasksRoutes = require("./routes/tasks.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const adminRoutes = require("./routes/admin.routes");
const orgsRoutes = require("./routes/orgs.routes");
const commentsRoutes = require("./routes/comments.routes");
const eventsRoutes = require("./routes/events.routes");
const timeRoutes = require("./routes/time.routes");
const timesheetsRoutes = require("./routes/timesheets.routes");
const skillsRoutes = require("./routes/skills.routes");
const leaveRoutes = require("./routes/leave.routes");
const sprintsRoutes = require("./routes/sprints.routes");
const capacityRoutes = require("./routes/capacity.routes");
const customFieldsRoutes = require("./routes/customFields.routes");
const templatesRoutes = require("./routes/templates.routes");
const automationsRoutes = require("./routes/automations.routes");
const slaRoutes = require("./routes/sla.routes");
const approvalsRoutes = require("./routes/approvals.routes");
const viewsRoutes = require("./routes/views.routes");
const integrationsRoutes = require("./routes/integrations.routes");
const apiKeysRoutes = require("./routes/apiKeys.routes");
const twoFactorRoutes = require("./routes/twoFactor.routes");
const ssoRoutes = require("./routes/sso.routes");
const enterpriseRoutes = require("./routes/enterprise.routes");
const publicApiRoutes = require("./routes/publicApi.routes");
const logger = require("./lib/logger");
const { startCron } = require("./lib/cron");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
const jsonParser = express.json({ limit: "10kb" });
const largeJsonParser = express.json({ limit: "12mb" });
app.use((req, res, next) =>
  req.path === "/api/uploads" ? largeJsonParser(req, res, next) : jsonParser(req, res, next)
);
app.use(cookieParser());
app.use(morgan("dev"));

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: frontendUrl, credentials: true }));

app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    code: "RATE_LIMITED",
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    code: "RATE_LIMITED",
  },
});

app.use("/api", generalLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", requestId: req.requestId });
});

app.use("/api/auth/sso", ssoRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/keys", apiKeysRoutes);
app.use("/api/v1", publicApiRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/orgs", orgsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/timesheets", timesheetsRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/capacity", capacityRoutes);
app.use("/api", timeRoutes);
app.use("/api", sprintsRoutes);
app.use("/api", customFieldsRoutes);
app.use("/api", templatesRoutes);
app.use("/api", automationsRoutes);
app.use("/api", slaRoutes);
app.use("/api", approvalsRoutes);
app.use("/api", viewsRoutes);
app.use("/api", integrationsRoutes);
app.use("/api", enterpriseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not Found", code: "NOT_FOUND" });
});

app.use((err, req, res, _next) => {
  logger.error("request error", {
    requestId: req.requestId,
    message: err.message,
    status: err.status || 500,
  });
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Server Error",
    code: err.code || "SERVER_ERROR",
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});

startCron();
