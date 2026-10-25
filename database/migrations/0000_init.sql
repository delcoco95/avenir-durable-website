CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_label" varchar(254),
	"action" varchar(60) NOT NULL,
	"entity" varchar(40) NOT NULL,
	"entity_id" varchar(60),
	"summary" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"consent_id" varchar(40) NOT NULL,
	"choices" jsonb NOT NULL,
	"policy_version" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"organisation" varchar(160) DEFAULT '' NOT NULL,
	"topic" varchar(80) DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" varchar(400) DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"icon" varchar(30) DEFAULT 'leaf' NOT NULL,
	"image_id" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(80) DEFAULT 'Général' NOT NULL,
	"question" varchar(300) NOT NULL,
	"answer" text NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(254) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" varchar(64) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime" varchar(40) NOT NULL,
	"size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" varchar(300) DEFAULT '' NOT NULL,
	"title" varchar(200) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"credit" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"has_unpublished_changes" boolean DEFAULT true NOT NULL,
	"show_in_nav" boolean DEFAULT false NOT NULL,
	"nav_label" varchar(60) DEFAULT '' NOT NULL,
	"nav_order" integer DEFAULT 100 NOT NULL,
	"show_in_footer" boolean DEFAULT false NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"url" varchar(300) DEFAULT '' NOT NULL,
	"description" varchar(400) DEFAULT '' NOT NULL,
	"logo_id" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" varchar(400) DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_id" integer,
	"domain_id" integer,
	"location" varchar(160) DEFAULT '' NOT NULL,
	"period" varchar(120) DEFAULT '' NOT NULL,
	"audience" varchar(160) DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"seo_description" varchar(300) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" varchar(40) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" varchar(300)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_slug_idx" ON "domains" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "login_attempts_identifier_idx" ON "login_attempts" USING btree ("identifier","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "rate_limits_idx" ON "rate_limits" USING btree ("bucket","key_hash","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");