const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const {
  approvalChainCreateSchema,
  approvalRequestCreateSchema,
  approvalDecisionSchema,
} = require("../lib/schemas");
const {
  listChains,
  createChain,
  deleteChain,
  createRequest,
  listProjectRequests,
  listMyRequests,
  decide,
} = require("../controllers/approvals.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/approval-requests", listMyRequests);
router.post("/approval-requests/:reqId/decide", validate(approvalDecisionSchema), decide);

router.get("/projects/:id/approval-chains", requireProjectAccess, listChains);
router.post("/projects/:id/approval-chains", requireProjectAdmin, validate(approvalChainCreateSchema), createChain);
router.get("/projects/:id/approval-requests", requireProjectAccess, listProjectRequests);
router.delete("/approval-chains/:chainId", deleteChain);
router.post("/approval-chains/:chainId/requests", validate(approvalRequestCreateSchema), createRequest);

module.exports = router;
