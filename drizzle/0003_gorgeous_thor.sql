CREATE TYPE "public"."user_role" AS ENUM('master', 'archivist', 'contributor', 'user');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;