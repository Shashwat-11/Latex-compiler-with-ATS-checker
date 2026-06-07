CREATE TABLE "ats_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"compilation_id" uuid,
	"overall_score" integer NOT NULL,
	"category_scores" jsonb NOT NULL,
	"keyword_matches" jsonb NOT NULL,
	"missing_keywords" text[] DEFAULT '{}' NOT NULL,
	"formatting_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readability_metrics" jsonb NOT NULL,
	"recommendations" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ats_reports" ADD CONSTRAINT "ats_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_reports" ADD CONSTRAINT "ats_reports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_reports" ADD CONSTRAINT "ats_reports_compilation_id_compilations_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ats_reports_project_id" ON "ats_reports" USING btree ("project_id");