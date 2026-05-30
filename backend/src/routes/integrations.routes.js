const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const { integrationCreateSchema, integrationUpdateSchema } = require("../lib/schemas");
const {
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  listDeliveries,
} = require("../controllers/integrations.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/integrations", requireProjectAccess, listIntegrations);
router.post("/projects/:id/integrations", requireProjectAdmin, validate(integrationCreateSchema), createIntegration);
router.patch("/integrations/:integrationId", validate(integrationUpdateSchema), updateIntegration);
router.delete("/integrations/:integrationId", deleteIntegration);
router.post("/integrations/:integrationId/test", testIntegration);
router.get("/integrations/:integrationId/deliveries", listDeliveries);

module.exports = router;
