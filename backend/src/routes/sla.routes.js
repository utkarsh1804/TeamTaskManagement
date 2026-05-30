const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const { slaCreateSchema, slaUpdateSchema } = require("../lib/schemas");
const {
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getSlaStatus,
} = require("../controllers/sla.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/sla-policies", requireProjectAccess, listPolicies);
router.post("/projects/:id/sla-policies", requireProjectAdmin, validate(slaCreateSchema), createPolicy);
router.get("/projects/:id/sla-status", requireProjectAccess, getSlaStatus);
router.patch("/sla-policies/:policyId", validate(slaUpdateSchema), updatePolicy);
router.delete("/sla-policies/:policyId", deletePolicy);

module.exports = router;
