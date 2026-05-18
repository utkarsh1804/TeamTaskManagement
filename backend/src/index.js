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
const { startCron } = require("./lib/cron");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(express.json({ limit: "10kb" }));
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

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/orgs", orgsRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not Found", code: "NOT_FOUND" });
});

app.use((err, req, res, _next) => {
  console.error(`[${req.requestId}]`, err);
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
