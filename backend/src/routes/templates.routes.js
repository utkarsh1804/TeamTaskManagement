const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const {
  templateCreateSchema,
  templateUpdateSchema,
  templateInstantiateSchema,
} = require("../lib/schemas");
const {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  instantiate,
} = require("../controllers/templates.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/templates", requireProjectAccess, listTemplates);
router.post("/projects/:id/templates", requireProjectAdmin, validate(templateCreateSchema), createTemplate);
router.patch("/templates/:templateId", validate(templateUpdateSchema), updateTemplate);
router.delete("/templates/:templateId", deleteTemplate);
router.post("/templates/:templateId/instantiate", validate(templateInstantiateSchema), instantiate);

module.exports = router;
