CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"certificate_type" varchar(20) NOT NULL,
	"test_result_id" integer,
	"code_test_id" integer,
	"book_test_id" integer,
	"race_id" integer,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"consistency" integer NOT NULL,
	"duration" integer NOT NULL,
	"metadata" jsonb,
	"share_id" varchar(12),
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_code_test_id_code_typing_tests_id_fk" FOREIGN KEY ("code_test_id") REFERENCES "public"."code_typing_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_book_test_id_book_typing_tests_id_fk" FOREIGN KEY ("book_test_id") REFERENCES "public"."book_typing_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificates_user_id_idx" ON "certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certificates_type_idx" ON "certificates" USING btree ("certificate_type");--> statement-breakpoint
CREATE INDEX "certificates_share_id_idx" ON "certificates" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "certificates_created_at_idx" ON "certificates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "certificates_user_type_idx" ON "certificates" USING btree ("user_id","certificate_type");