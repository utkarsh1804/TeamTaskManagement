const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const { automationCreateSchema, automationUpdateSchema } = require("../lib/schemas");
const {
  listRules,
  createRule,
  updateRule,
  deleteRule,
} = require("../controllers/automations.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/automations", requireProjectAccess, listRules);
router.post("/projects/:id/automations", requireProjectAdmin, validate(automationCreateSchema), createRule);
router.patch("/automations/:ruleId", validate(automationUpdateSchema), updateRule);
router.delete("/automations/:ruleId", deleteRule);

module.exports = router;
