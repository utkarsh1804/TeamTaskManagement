const express = require("express");

const { apiKeyAuth, requireScope } = require("../lib/apiKeyAuth");
const { me, listProjects, listTasks, createTask } = require("../controllers/publicApi.controller");

const router = express.Router();

// Authenticated via API key (X-API-Key header or Bearer token), not JWT.
router.use(apiKeyAuth);

router.get("/me", me);
router.get("/projects", requireScope("read"), listProjects);
router.get("/tasks", requireScope("read"), listTasks);
router.post("/tasks", requireScope("write"), createTask);

module.exports = router;
