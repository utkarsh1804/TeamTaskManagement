const express = require("express");

const validate = require("../middleware/validate.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const { requireGlobalAdmin } = require("../middleware/role.middleware");
const { adminRequestSchema, inviteLinkSchema } = require("../lib/schemas");
const {
  requestAdmin,
  listAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  generateInviteLink,
  acceptInviteLink,
} = require("../controllers/admin.controller");

const router = express.Router();

router.post("/admin-request", validate(adminRequestSchema), requestAdmin);
router.get("/admin-requests", authMiddleware, requireGlobalAdmin, listAdminRequests);
router.post(
  "/admin-requests/:id/approve",
  authMiddleware,
  requireGlobalAdmin,
  approveAdminRequest
);
router.post(
  "/admin-requests/:id/reject",
  authMiddleware,
  requireGlobalAdmin,
  rejectAdminRequest
);

router.post(
  "/projects/:id/invite-link",
  authMiddleware,
  requireGlobalAdmin,
  validate(inviteLinkSchema),
  generateInviteLink
);
router.post("/invites/:token", authMiddleware, acceptInviteLink);

module.exports = router;
