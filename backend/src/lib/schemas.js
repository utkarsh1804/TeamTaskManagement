const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number");

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  token: z.string().optional(),
});

const projectCreateSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

const projectUpdateSchema = projectCreateSchema.partial();

const memberInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const memberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

const taskBaseSchema = z.object({
  title: z.string().min(2, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().nonnegative().max(99999).optional().nullable(),
  storyPoints: z.number().int().nonnegative().max(999).optional().nullable(),
  recurrenceRule: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

const taskCreateSchema = taskBaseSchema;
const taskUpdateSchema = taskBaseSchema.partial();
const taskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

const adminRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: passwordSchema,
});

const inviteLinkSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

const emailInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
  parentId: z.string().uuid().optional().nullable(),
  mentions: z.array(z.string().uuid()).max(50).optional(),
});

const commentUpdateSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").optional(),
  jobTitle: z.string().max(100, "Job title too long").optional().nullable(),
  phone: z.string().max(50, "Phone too long").optional().nullable(),
  timezone: z.string().max(60, "Timezone too long").optional().nullable(),
  avatarUrl: z.string().url("Invalid URL").max(500).optional().nullable(),
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug too long")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens");

const orgCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: slugSchema,
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
});

const orgUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
});

const orgMemberInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});

const orgMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]),
});

const departmentCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  parentId: z.string().uuid().optional().nullable(),
});

const departmentUpdateSchema = departmentCreateSchema.partial();

const teamCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  leaderId: z.string().uuid().optional().nullable(),
});

const teamUpdateSchema = teamCreateSchema.partial();

const teamMemberAddSchema = z.object({
  userId: z.string().uuid(),
});

const integrationCreateSchema = z.object({
  type: z.enum(["GITHUB", "SLACK", "WEBHOOK"]),
  config: z.record(z.any()),
  enabled: z.boolean().optional(),
});

const integrationUpdateSchema = z.object({
  config: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});

const checklistItemSchema = z.object({
  title: z.string().min(1, "Title required").max(300),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
});

const checklistItemUpdateSchema = checklistItemSchema.partial();

const tagCreateSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex like #6b7280")
    .optional(),
});

const tagUpdateSchema = tagCreateSchema.partial();

const taskTagSchema = z.object({
  tagId: z.string().uuid(),
});

const dependencyCreateSchema = z.object({
  blockingId: z.string().uuid(),
});

const attachmentCreateSchema = z.object({
  url: z.string().url().max(1000),
  name: z.string().min(1).max(200),
  size: z.number().int().nonnegative().max(2_000_000_000),
  mimeType: z.string().min(1).max(100),
});

// ===== Phase 4: workforce =====
const timerStartSchema = z.object({
  description: z.string().max(500).optional().nullable(),
});

const manualTimeEntrySchema = z
  .object({
    description: z.string().max(500).optional().nullable(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().optional().nullable(),
    durationMinutes: z.number().int().positive().max(24 * 60).optional().nullable(),
  })
  .refine((d) => Boolean(d.endedAt) || Boolean(d.durationMinutes), {
    message: "Provide either endedAt or durationMinutes",
  });

const timeEntryUpdateSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().nullable(),
});

const timesheetSubmitSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid week"),
  note: z.string().max(1000).optional().nullable(),
});

const timesheetReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(1000).optional().nullable(),
});

const skillCreateSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(80).optional().nullable(),
});

const userSkillSchema = z.object({
  skillId: z.string().uuid(),
  level: z.number().int().min(1).max(5),
});

const leaveCreateSchema = z.object({
  type: z.enum(["VACATION", "SICK", "PERSONAL", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(1000).optional().nullable(),
});

const leaveReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(1000).optional().nullable(),
});

const sprintCreateSchema = z.object({
  name: z.string().min(1).max(120),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
});

const sprintUpdateSchema = sprintCreateSchema.partial();

const sprintTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).max(200),
});

// ===== Phase 5: workflow & automation =====
const customFieldCreateSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX", "URL"]),
  options: z.array(z.string().max(120)).max(50).optional().nullable(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
});
const customFieldUpdateSchema = customFieldCreateSchema.partial();
const customFieldValueSchema = z.object({
  value: z.string().max(2000).nullable(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  estimatedHours: z.number().nonnegative().max(99999).optional().nullable(),
  storyPoints: z.number().int().nonnegative().max(999).optional().nullable(),
  checklist: z.array(z.object({ title: z.string().min(1).max(300) })).max(100).optional().nullable(),
});
const templateUpdateSchema = templateCreateSchema.partial();
const templateInstantiateSchema = z.object({
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
});

const automationActionSchema = z.object({
  type: z.enum(["SET_STATUS", "SET_PRIORITY", "ASSIGN_USER", "ADD_TAG", "NOTIFY_USER", "SEND_WEBHOOK"]),
  value: z.string().max(500).optional().nullable(),
});
const automationCreateSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.enum(["TASK_CREATED", "TASK_STATUS_CHANGED", "TASK_ASSIGNED", "TASK_PRIORITY_CHANGED"]),
  conditions: z
    .object({
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      assigneeId: z.string().uuid().optional(),
    })
    .optional()
    .nullable(),
  actions: z.array(automationActionSchema).min(1).max(10),
  enabled: z.boolean().optional(),
});
const automationUpdateSchema = automationCreateSchema.partial();

const slaCreateSchema = z.object({
  name: z.string().min(1).max(120),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  responseHours: z.number().int().positive().max(8760).optional().nullable(),
  resolutionHours: z.number().int().positive().max(8760),
  enabled: z.boolean().optional(),
});
const slaUpdateSchema = slaCreateSchema.partial();

const approvalChainCreateSchema = z.object({
  name: z.string().min(1).max(120),
  steps: z
    .array(z.object({ name: z.string().min(1).max(120), approverId: z.string().uuid() }))
    .min(1)
    .max(10),
});
const approvalRequestCreateSchema = z.object({
  taskId: z.string().uuid().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});
const approvalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(1000).optional().nullable(),
});

const savedViewCreateSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(120),
  filters: z.record(z.any()),
  viewType: z.enum(["list", "kanban", "calendar", "gantt"]).optional(),
  shared: z.boolean().optional(),
});
const savedViewUpdateSchema = savedViewCreateSchema.partial();

const bulkTaskSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(["status", "priority", "assignee", "sprint", "delete"]),
  value: z.string().optional().nullable(),
});

// ===== Phase 6: enterprise & integrations =====
const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(["read", "write"])).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const twoFactorVerifySchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const fileUploadSchema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
  taskId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

module.exports = {
  registerSchema,
  loginSchema,
  projectCreateSchema,
  projectUpdateSchema,
  memberInviteSchema,
  memberRoleSchema,
  taskCreateSchema,
  taskUpdateSchema,
  orgCreateSchema,
  orgUpdateSchema,
  orgMemberInviteSchema,
  orgMemberRoleSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  teamCreateSchema,
  teamUpdateSchema,
  teamMemberAddSchema,
  integrationCreateSchema,
  integrationUpdateSchema,
  checklistItemSchema,
  checklistItemUpdateSchema,
  tagCreateSchema,
  tagUpdateSchema,
  taskTagSchema,
  dependencyCreateSchema,
  attachmentCreateSchema,
  taskStatusSchema,
  adminRequestSchema,
  inviteLinkSchema,
  emailInviteSchema,
  commentSchema,
  commentUpdateSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
  timerStartSchema,
  manualTimeEntrySchema,
  timeEntryUpdateSchema,
  timesheetSubmitSchema,
  timesheetReviewSchema,
  skillCreateSchema,
  userSkillSchema,
  leaveCreateSchema,
  leaveReviewSchema,
  sprintCreateSchema,
  sprintUpdateSchema,
  sprintTasksSchema,
  customFieldCreateSchema,
  customFieldUpdateSchema,
  customFieldValueSchema,
  templateCreateSchema,
  templateUpdateSchema,
  templateInstantiateSchema,
  automationCreateSchema,
  automationUpdateSchema,
  slaCreateSchema,
  slaUpdateSchema,
  approvalChainCreateSchema,
  approvalRequestCreateSchema,
  approvalDecisionSchema,
  savedViewCreateSchema,
  savedViewUpdateSchema,
  bulkTaskSchema,
  apiKeyCreateSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
  fileUploadSchema,
};
