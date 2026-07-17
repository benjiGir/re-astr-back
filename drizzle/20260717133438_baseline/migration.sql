CREATE TYPE "file_type" AS ENUM('screenshot', 'report', 'documentation', 'other');--> statement-breakpoint
CREATE TYPE "test_status" AS ENUM('draft', 'in_progress', 'completed', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('master', 'archivist', 'contributor', 'user');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"base_schema" jsonb DEFAULT '{"fields": []}' NOT NULL,
	"custom_fields_schema" jsonb DEFAULT '{"fields": []}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL UNIQUE,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_files" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"test_id" text NOT NULL,
	"file_type" "file_type" DEFAULT 'other'::"file_type" NOT NULL,
	"original_filename" text NOT NULL,
	"stored_filename" text NOT NULL,
	"bucket_name" text DEFAULT 'test-archives' NOT NULL,
	"object_key" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"checksum" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "test_status" DEFAULT 'draft'::"test_status" NOT NULL,
	"common_data" jsonb DEFAULT '{}' NOT NULL,
	"custom_data" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text DEFAULT '',
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_files" ADD CONSTRAINT "test_files_test_id_tests_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_files" ADD CONSTRAINT "test_files_uploaded_by_users_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;