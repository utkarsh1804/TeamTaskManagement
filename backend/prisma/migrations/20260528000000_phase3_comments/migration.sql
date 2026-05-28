-- =====================================================
-- Phase 3: Views & collaboration
-- Adds dedicated Comment model (threaded via parentId)
-- and CommentMention join table for @mentions.
-- Backfills existing ActivityLog comments into Comment.
-- =====================================================

-- CreateTable: Comment
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX "Comment_deletedAt_idx" ON "Comment"("deletedAt");

-- CreateTable: CommentMention
CREATE TABLE "CommentMention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMention_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommentMention_commentId_mentionedUserId_key" ON "CommentMention"("commentId", "mentionedUserId");
CREATE INDEX "CommentMention_mentionedUserId_idx" ON "CommentMention"("mentionedUserId");

-- Foreign Keys
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migrate existing comments stored as ActivityLog rows.
-- Comment text lived in ActivityLog.action; entityId was the task id.
-- Guarded against orphaned task/user references; idempotent via ON CONFLICT.
INSERT INTO "Comment" ("id", "taskId", "authorId", "body", "createdAt", "updatedAt")
SELECT al."id", al."entityId", al."userId", al."action", al."createdAt", al."createdAt"
FROM "ActivityLog" al
WHERE al."entityType" = 'Comment'
  AND al."action" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = al."entityId")
  AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = al."userId")
ON CONFLICT ("id") DO NOTHING;
