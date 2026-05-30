const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess } = require("../middleware/role.middleware");
const { twoFactorDisableSchema, fileUploadSchema } = require("../lib/schemas");
const {
  exportProjectTasks,
  exportMyTasks,
  search,
  gdprExport,
  gdprDelete,
  uploadFile,
} = require("../controllers/enterprise.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/search", search);
router.get("/projects/:id/export/tasks.csv", requireProjectAccess, exportProjectTasks);
router.get("/export/my-tasks.csv", exportMyTasks);
router.get("/gdpr/export", gdprExport);
router.post("/gdpr/delete", validate(twoFactorDisableSchema), gdprDelete);
router.post("/uploads", validate(fileUploadSchema), uploadFile);

module.exports = router;
