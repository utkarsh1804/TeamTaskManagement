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
  listAllUsers,
  addMembersToProject,
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
router.get("/users", authMiddleware, requireGlobalAdmin, listAllUsers);
router.get("/users/:userId", authMiddleware, requireGlobalAdmin, getMemberDetails);
router.post(
  "/projects/:id/add-members",
  authMiddleware,
  requireGlobalAdmin,
  addMembersToProject
);
router.post(
  "/users/:userId/move",
  authMiddleware,
  requireGlobalAdmin,
  moveMemberToProject
);
router.delete(
  "/users/:userId/projects/:projectId",
  authMiddleware,
  requireGlobalAdmin,
  removeMemberFromProject
);

module.exports = router;
