-- =====================================================
-- Phase 1: Foundation
-- Adds Organizations, Departments, Teams, Notifications,
-- RefreshTokens, ProjectIntegrations + soft-delete columns.
-- Backfills a Default Organization and binds existing data.
-- =====================================================

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('GITHUB', 'SLACK', 'WEBHOOK');

-- AlterTable: User (profile + soft-delete)
ALTER TABLE "User"
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "timezone" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Project (org/dept/team + soft-delete)
ALTER TABLE "Project"
  ADD COLUMN "orgId" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "teamId" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Task (soft-delete)
ALTER TABLE "Task"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- CreateTable: OrgMember
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrgMember_userId_orgId_key" ON "OrgMember"("userId", "orgId");
CREATE INDEX "OrgMember_orgId_idx" ON "OrgMember"("orgId");
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

-- CreateTable: Department
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Department_orgId_idx" ON "Department"("orgId");
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateTable: Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orgId" TEXT NOT NULL,
    "departmentId" TEXT,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Team_orgId_idx" ON "Team"("orgId");
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");

-- CreateTable: TeamMember
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "meta" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateTable: RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateTable: ProjectIntegration
CREATE TABLE "ProjectIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectIntegration_projectId_type_key" ON "ProjectIntegration"("projectId", "type");
CREATE INDEX "ProjectIntegration_projectId_idx" ON "ProjectIntegration"("projectId");

-- =====================================================
-- Indexes on altered tables
-- =====================================================
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "Project_orgId_idx" ON "Project"("orgId");
CREATE INDEX "Project_departmentId_idx" ON "Project"("departmentId");
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- =====================================================
-- Foreign Keys
-- =====================================================
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIntegration" ADD CONSTRAINT "ProjectIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIntegration" ADD CONSTRAINT "ProjectIntegration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================
-- Data backfill: default Organization + memberships + project link
-- Idempotent: only runs if no Organization exists yet
-- =====================================================

-- 1. Create default Organization (idempotent)
INSERT INTO "Organization" ("id", "name", "slug", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Default Organization', 'default', 'Initial organization created during Phase 1 foundation migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Organization" WHERE "slug" = 'default');

-- 2. Create OrgMember for every existing User (idempotent)
INSERT INTO "OrgMember" ("id", "userId", "orgId", "role", "joinedAt")
SELECT
  gen_random_uuid(),
  u."id",
  o."id",
  CASE WHEN u."globalRole" = 'ADMIN' THEN 'OWNER'::"OrgRole" ELSE 'MEMBER'::"OrgRole" END,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (SELECT "id" FROM "Organization" WHERE "slug" = 'default' LIMIT 1) o
WHERE NOT EXISTS (
  SELECT 1 FROM "OrgMember" om WHERE om."userId" = u."id" AND om."orgId" = o."id"
);

-- 3. Link existing Projects to default Organization
UPDATE "Project"
SET "orgId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'default' LIMIT 1)
WHERE "orgId" IS NULL;
