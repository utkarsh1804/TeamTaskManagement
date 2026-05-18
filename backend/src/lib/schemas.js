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
  profileUpdateSchema,
  passwordUpdateSchema,
};
