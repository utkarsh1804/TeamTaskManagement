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
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
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
  taskStatusSchema,
  adminRequestSchema,
  inviteLinkSchema,
  emailInviteSchema,
  commentSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
};
