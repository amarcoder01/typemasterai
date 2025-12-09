CREATE TABLE "account_lockouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"requirement" jsonb NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"icon" varchar(50) NOT NULL,
	"color" varchar(50) NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "anti_cheat_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_text" text NOT NULL,
	"challenge_type" varchar(20) DEFAULT 'typing' NOT NULL,
	"triggered" boolean DEFAULT false NOT NULL,
	"triggered_wpm" integer,
	"passed" boolean,
	"challenge_wpm" integer,
	"certified_wpm" integer,
	"certified_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"user_id" varchar,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_fingerprint" varchar(64),
	"provider" varchar(20),
	"success" boolean NOT NULL,
	"failure_reason" varchar(200),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_paragraphs" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"difficulty" text NOT NULL,
	"topic" text NOT NULL,
	"duration_mode" integer NOT NULL,
	"length_words" integer NOT NULL,
	"source" text NOT NULL,
	"book_id" integer NOT NULL,
	"paragraph_index" integer NOT NULL,
	"chapter" integer,
	"section_index" integer,
	"chapter_title" text,
	"language" text DEFAULT 'en' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_typing_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"paragraph_id" integer NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"characters" integer NOT NULL,
	"errors" integer NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"topic" text NOT NULL,
	"difficulty" text NOT NULL,
	"total_paragraphs" integer NOT NULL,
	"total_chapters" integer DEFAULT 1 NOT NULL,
	"cover_image_url" text,
	"description" text,
	"estimated_duration_map" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"goal" jsonb NOT NULL,
	"difficulty" varchar(20) DEFAULT 'medium' NOT NULL,
	"points_reward" integer DEFAULT 50 NOT NULL,
	"badge_reward" varchar(50),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"category" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_snippets" (
	"id" serial PRIMARY KEY NOT NULL,
	"programming_language" text NOT NULL,
	"framework" text,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"content" text NOT NULL,
	"line_count" integer NOT NULL,
	"character_count" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_typing_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"code_snippet_id" integer,
	"programming_language" text NOT NULL,
	"framework" text,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"characters" integer NOT NULL,
	"errors" integer NOT NULL,
	"syntax_errors" integer DEFAULT 0 NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"is_pinned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictation_sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"sentence" text NOT NULL,
	"difficulty" text NOT NULL,
	"category" text DEFAULT 'general',
	"word_count" integer NOT NULL,
	"character_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictation_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"sentence_id" integer NOT NULL,
	"speed_level" text NOT NULL,
	"actual_speed" real NOT NULL,
	"actual_sentence" text NOT NULL,
	"typed_text" text NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"errors" integer NOT NULL,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"hint_used" integer DEFAULT 0 NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"contact_email" varchar(255),
	"category_id" integer,
	"subject" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"sentiment_score" real,
	"sentiment_label" varchar(20),
	"ai_category_id" integer,
	"ai_summary" text,
	"ai_priority_score" real,
	"ai_tags" jsonb,
	"ai_processed_at" timestamp,
	"source" varchar(30) DEFAULT 'in_app' NOT NULL,
	"page_url" text,
	"browser_info" jsonb,
	"ip_address" varchar(45),
	"device_fingerprint" varchar(64),
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar,
	"resolution_notes" text,
	"user_notified" boolean DEFAULT false NOT NULL,
	"is_spam" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) DEFAULT 'moderator' NOT NULL,
	"can_respond" boolean DEFAULT true NOT NULL,
	"can_change_status" boolean DEFAULT true NOT NULL,
	"can_change_priority" boolean DEFAULT true NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_manage_admins" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_feedback" integer DEFAULT 0 NOT NULL,
	"new_feedback" integer DEFAULT 0 NOT NULL,
	"resolved_feedback" integer DEFAULT 0 NOT NULL,
	"category_breakdown" jsonb,
	"priority_breakdown" jsonb,
	"status_breakdown" jsonb,
	"sentiment_breakdown" jsonb,
	"average_sentiment_score" real,
	"average_resolution_time_hours" real,
	"first_response_time_hours" real,
	"source_breakdown" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"uploaded_by_user_id" varchar,
	"virus_scan_status" varchar(20) DEFAULT 'pending',
	"virus_scan_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20) DEFAULT 'blue',
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "feedback_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "feedback_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"identifier_type" varchar(20) NOT NULL,
	"submission_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp NOT NULL,
	"last_submission" timestamp,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_until" timestamp,
	"blocked_reason" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "feedback_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"admin_user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"is_internal_note" boolean DEFAULT false NOT NULL,
	"template_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"previous_priority" varchar(20),
	"new_priority" varchar(20),
	"changed_by_user_id" varchar,
	"change_reason" text,
	"is_automated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_upvotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keystroke_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_result_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"expected_key" text NOT NULL,
	"typed_key" text NOT NULL,
	"is_correct" integer NOT NULL,
	"position" integer NOT NULL,
	"timestamp" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keystroke_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_result_id" integer,
	"key" varchar(10) NOT NULL,
	"key_code" varchar(50) NOT NULL,
	"press_time" bigint NOT NULL,
	"release_time" bigint,
	"dwell_time" integer,
	"flight_time" integer,
	"is_correct" boolean NOT NULL,
	"expected_key" varchar(10),
	"position" integer NOT NULL,
	"finger" varchar(20),
	"hand" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"email" text NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_fingerprint" varchar(64),
	"city" varchar(100),
	"country" varchar(100),
	"country_code" varchar(2),
	"latitude" real,
	"longitude" real,
	"success" boolean NOT NULL,
	"failure_reason" varchar(200),
	"is_suspicious" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"send_at_utc" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"error_message" text,
	"payload_meta" jsonb,
	"claimed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"daily_reminder" boolean DEFAULT true NOT NULL,
	"daily_reminder_time" varchar(5) DEFAULT '09:00',
	"streak_warning" boolean DEFAULT true NOT NULL,
	"streak_milestone" boolean DEFAULT true NOT NULL,
	"weekly_summary" boolean DEFAULT true NOT NULL,
	"weekly_summary_day" varchar(10) DEFAULT 'sunday',
	"achievement_unlocked" boolean DEFAULT true NOT NULL,
	"challenge_invite" boolean DEFAULT true NOT NULL,
	"challenge_complete" boolean DEFAULT true NOT NULL,
	"leaderboard_change" boolean DEFAULT false NOT NULL,
	"new_personal_record" boolean DEFAULT true NOT NULL,
	"race_invite" boolean DEFAULT true NOT NULL,
	"race_starting" boolean DEFAULT true NOT NULL,
	"social_updates" boolean DEFAULT true NOT NULL,
	"tip_of_the_day" boolean DEFAULT true NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"profile_name" varchar(100),
	"avatar_url" text,
	"access_token_hash" varchar(64),
	"refresh_token_hash" varchar(64),
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state" varchar(64) PRIMARY KEY NOT NULL,
	"provider" varchar(20) NOT NULL,
	"code_verifier" varchar(128),
	"redirect_to" varchar(255),
	"link_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(64),
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"ip_address" varchar(45),
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "persistent_logins" (
	"series" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"device_name" varchar(200),
	"device_fingerprint" varchar(64),
	"user_agent" text,
	"ip_address" varchar(45),
	"last_used" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"practice_text" text,
	"focus_keys" jsonb,
	"focus_digraphs" jsonb,
	"estimated_duration" integer,
	"target_wpm" integer,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"expiration_time" bigint,
	"keys" jsonb NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"participant_id" integer,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"emote_code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_keystrokes" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"keystrokes" jsonb NOT NULL,
	"content_hash" varchar(64),
	"avg_interval" real,
	"min_interval" real,
	"std_dev_interval" real,
	"suspicious_patterns" integer DEFAULT 0 NOT NULL,
	"server_calculated_wpm" integer,
	"client_reported_wpm" integer,
	"wpm_discrepancy" real,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reasons" jsonb,
	"requires_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_match_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"user_id" varchar,
	"finish_position" integer NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"rating_before" integer,
	"rating_after" integer,
	"rating_change" integer,
	"opponent_count" integer DEFAULT 0 NOT NULL,
	"avg_opponent_rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"user_id" varchar,
	"guest_name" text,
	"username" text NOT NULL,
	"avatar_color" text DEFAULT 'bg-primary',
	"is_bot" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"wpm" integer DEFAULT 0 NOT NULL,
	"accuracy" real DEFAULT 100 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"is_finished" integer DEFAULT 0 NOT NULL,
	"finish_position" integer,
	"finished_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_replays" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"paragraph_content" text NOT NULL,
	"duration" integer,
	"participant_data" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "race_replays_race_id_unique" UNIQUE("race_id")
);
--> statement-breakpoint
CREATE TABLE "race_spectators" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"user_id" varchar,
	"session_id" varchar(64),
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "races" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" varchar(6) NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"race_type" text DEFAULT 'standard' NOT NULL,
	"time_limit_seconds" integer,
	"paragraph_id" integer,
	"paragraph_content" text NOT NULL,
	"max_players" integer DEFAULT 4 NOT NULL,
	"is_private" integer DEFAULT 0 NOT NULL,
	"finish_counter" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "races_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(32),
	"backup_codes" jsonb,
	"suspicious_login_alerts" boolean DEFAULT true NOT NULL,
	"new_device_alerts" boolean DEFAULT true NOT NULL,
	"password_changed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "shared_code_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_id" varchar(10) NOT NULL,
	"user_id" varchar,
	"username" text NOT NULL,
	"programming_language" text NOT NULL,
	"framework" text,
	"difficulty" text NOT NULL,
	"test_mode" text NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"errors" integer NOT NULL,
	"syntax_errors" integer DEFAULT 0 NOT NULL,
	"duration" integer NOT NULL,
	"code_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_code_results_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
CREATE TABLE "shared_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_token" varchar(12) NOT NULL,
	"user_id" varchar,
	"username" text,
	"mode" text NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"errors" integer NOT NULL,
	"duration" integer,
	"characters" integer,
	"metadata" jsonb,
	"freestyle" boolean DEFAULT false NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_results_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "stress_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"difficulty" text NOT NULL,
	"enabled_effects" jsonb NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"errors" integer NOT NULL,
	"max_combo" integer DEFAULT 0 NOT NULL,
	"total_characters" integer NOT NULL,
	"duration" integer NOT NULL,
	"survival_time" integer NOT NULL,
	"completion_rate" real NOT NULL,
	"stress_score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"mode" integer NOT NULL,
	"characters" integer NOT NULL,
	"errors" integer NOT NULL,
	"freestyle" boolean DEFAULT false NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typing_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"test_result_id" integer,
	"wpm" integer NOT NULL,
	"raw_wpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"consistency" real,
	"avg_dwell_time" real,
	"avg_flight_time" real,
	"std_dev_flight_time" real,
	"fastest_digraph" varchar(10),
	"slowest_digraph" varchar(10),
	"finger_usage" jsonb,
	"hand_balance" real,
	"total_errors" integer NOT NULL,
	"errors_by_type" jsonb,
	"error_keys" jsonb,
	"wpm_by_position" jsonb,
	"slowest_words" jsonb,
	"key_heatmap" jsonb,
	"burst_wpm" integer,
	"adjusted_wpm" integer,
	"consistency_percentile" integer,
	"rolling_accuracy" jsonb,
	"top_digraphs" jsonb,
	"bottom_digraphs" jsonb,
	"typing_rhythm" real,
	"peak_performance_window" jsonb,
	"fatigue_indicator" real,
	"error_burst_count" integer,
	"is_suspicious" boolean DEFAULT false,
	"suspicious_flags" jsonb,
	"validation_score" integer,
	"min_keystroke_interval" integer,
	"keystroke_variance" real,
	"synthetic_input_detected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typing_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"insight_type" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"actionable" text,
	"confidence" real,
	"affected_keys" jsonb,
	"metric" varchar(50),
	"metric_value" real,
	"dismissed" boolean DEFAULT false,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typing_paragraphs" (
	"id" serial PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"mode" text NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"content" text NOT NULL,
	"word_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"test_result_id" integer,
	"notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_book_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"last_paragraph_index" integer DEFAULT 0 NOT NULL,
	"completed_paragraphs" jsonb DEFAULT '[]'::jsonb,
	"words_typed" integer DEFAULT 0 NOT NULL,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"average_wpm" real DEFAULT 0,
	"average_accuracy" real DEFAULT 100,
	"is_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"start_notified" boolean DEFAULT false NOT NULL,
	"completion_notified" boolean DEFAULT false NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"experience_points" integer DEFAULT 0 NOT NULL,
	"total_achievements" integer DEFAULT 0 NOT NULL,
	"total_challenges_completed" integer DEFAULT 0 NOT NULL,
	"total_shares" integer DEFAULT 0 NOT NULL,
	"current_title" varchar(100),
	"featured_badges" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_gamification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"peak_rating" integer DEFAULT 1200 NOT NULL,
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"total_races" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"provisional_games" integer DEFAULT 0 NOT NULL,
	"last_race_at" timestamp,
	"rating_decay" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_ratings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"device_name" varchar(200),
	"device_type" varchar(50),
	"browser" varchar(100),
	"browser_version" varchar(20),
	"os" varchar(100),
	"os_version" varchar(20),
	"ip_address" varchar(45),
	"city" varchar(100),
	"country" varchar(100),
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_color" text DEFAULT 'bg-primary',
	"bio" text,
	"country" text,
	"keyboard_layout" text DEFAULT 'QWERTY',
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"last_test_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account_lockouts" ADD CONSTRAINT "account_lockouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_challenges" ADD CONSTRAINT "anti_cheat_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_paragraphs" ADD CONSTRAINT "book_paragraphs_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_typing_tests" ADD CONSTRAINT "book_typing_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_typing_tests" ADD CONSTRAINT "book_typing_tests_paragraph_id_book_paragraphs_id_fk" FOREIGN KEY ("paragraph_id") REFERENCES "public"."book_paragraphs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_typing_tests" ADD CONSTRAINT "code_typing_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_typing_tests" ADD CONSTRAINT "code_typing_tests_code_snippet_id_code_snippets_id_fk" FOREIGN KEY ("code_snippet_id") REFERENCES "public"."code_snippets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_tests" ADD CONSTRAINT "dictation_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_tests" ADD CONSTRAINT "dictation_tests_sentence_id_dictation_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."dictation_sentences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_category_id_feedback_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."feedback_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_ai_category_id_feedback_categories_id_fk" FOREIGN KEY ("ai_category_id") REFERENCES "public"."feedback_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_admins" ADD CONSTRAINT "feedback_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_status_history" ADD CONSTRAINT "feedback_status_history_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_status_history" ADD CONSTRAINT "feedback_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keystroke_analytics" ADD CONSTRAINT "keystroke_analytics_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keystroke_analytics" ADD CONSTRAINT "keystroke_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keystroke_events" ADD CONSTRAINT "keystroke_events_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_link_user_id_users_id_fk" FOREIGN KEY ("link_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persistent_logins" ADD CONSTRAINT "persistent_logins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_recommendations" ADD CONSTRAINT "practice_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_chat_messages" ADD CONSTRAINT "race_chat_messages_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_chat_messages" ADD CONSTRAINT "race_chat_messages_participant_id_race_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."race_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_keystrokes" ADD CONSTRAINT "race_keystrokes_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_keystrokes" ADD CONSTRAINT "race_keystrokes_participant_id_race_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."race_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_match_history" ADD CONSTRAINT "race_match_history_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_match_history" ADD CONSTRAINT "race_match_history_participant_id_race_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."race_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_match_history" ADD CONSTRAINT "race_match_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_replays" ADD CONSTRAINT "race_replays_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_spectators" ADD CONSTRAINT "race_spectators_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_spectators" ADD CONSTRAINT "race_spectators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_paragraph_id_typing_paragraphs_id_fk" FOREIGN KEY ("paragraph_id") REFERENCES "public"."typing_paragraphs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_code_results" ADD CONSTRAINT "shared_code_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_results" ADD CONSTRAINT "shared_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_tests" ADD CONSTRAINT "stress_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_analytics" ADD CONSTRAINT "typing_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_analytics" ADD CONSTRAINT "typing_analytics_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_insights" ADD CONSTRAINT "typing_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_book_progress" ADD CONSTRAINT "user_book_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_book_progress" ADD CONSTRAINT "user_book_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_lockouts_user_id_idx" ON "account_lockouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anti_cheat_user_id_idx" ON "anti_cheat_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anti_cheat_certified_idx" ON "anti_cheat_challenges" USING btree ("user_id","certified_until");--> statement-breakpoint
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "book_topic_difficulty_duration_idx" ON "book_paragraphs" USING btree ("topic","difficulty","duration_mode");--> statement-breakpoint
CREATE INDEX "book_id_paragraph_idx" ON "book_paragraphs" USING btree ("book_id","paragraph_index");--> statement-breakpoint
CREATE INDEX "book_id_chapter_idx" ON "book_paragraphs" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE INDEX "book_difficulty_idx" ON "book_paragraphs" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "book_topic_idx" ON "book_paragraphs" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "book_duration_idx" ON "book_paragraphs" USING btree ("duration_mode");--> statement-breakpoint
CREATE INDEX "book_test_user_id_idx" ON "book_typing_tests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "book_test_paragraph_id_idx" ON "book_typing_tests" USING btree ("paragraph_id");--> statement-breakpoint
CREATE INDEX "book_test_wpm_idx" ON "book_typing_tests" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX "book_test_created_at_idx" ON "book_typing_tests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "book_slug_idx" ON "books" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "book_meta_topic_idx" ON "books" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "book_meta_difficulty_idx" ON "books" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "book_meta_language_idx" ON "books" USING btree ("language");--> statement-breakpoint
CREATE INDEX "code_language_idx" ON "code_snippets" USING btree ("programming_language");--> statement-breakpoint
CREATE INDEX "code_difficulty_idx" ON "code_snippets" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "code_language_difficulty_idx" ON "code_snippets" USING btree ("programming_language","difficulty");--> statement-breakpoint
CREATE INDEX "code_test_user_id_idx" ON "code_typing_tests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "code_test_language_idx" ON "code_typing_tests" USING btree ("programming_language");--> statement-breakpoint
CREATE INDEX "code_test_wpm_idx" ON "code_typing_tests" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX "code_test_user_language_idx" ON "code_typing_tests" USING btree ("user_id","programming_language");--> statement-breakpoint
CREATE INDEX "code_test_created_at_idx" ON "code_typing_tests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversation_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "dictation_sentence_difficulty_idx" ON "dictation_sentences" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "dictation_sentence_category_idx" ON "dictation_sentences" USING btree ("category");--> statement-breakpoint
CREATE INDEX "dictation_sentence_difficulty_category_idx" ON "dictation_sentences" USING btree ("difficulty","category");--> statement-breakpoint
CREATE INDEX "dictation_test_user_id_idx" ON "dictation_tests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dictation_test_sentence_id_idx" ON "dictation_tests" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "dictation_test_wpm_idx" ON "dictation_tests" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX "dictation_test_accuracy_idx" ON "dictation_tests" USING btree ("accuracy");--> statement-breakpoint
CREATE INDEX "dictation_test_speed_level_idx" ON "dictation_tests" USING btree ("speed_level");--> statement-breakpoint
CREATE INDEX "dictation_test_created_at_idx" ON "dictation_tests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_category_id_idx" ON "feedback" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_priority_idx" ON "feedback" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "feedback_sentiment_idx" ON "feedback" USING btree ("sentiment_label");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_status_priority_idx" ON "feedback" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "feedback_admins_user_id_idx" ON "feedback_admins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_analytics_period_type_idx" ON "feedback_analytics" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "feedback_analytics_period_start_idx" ON "feedback_analytics" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "feedback_analytics_period_type_start_idx" ON "feedback_analytics" USING btree ("period_type","period_start");--> statement-breakpoint
CREATE INDEX "feedback_attachments_feedback_id_idx" ON "feedback_attachments" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_feedback_id_idx" ON "feedback_responses" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_admin_user_id_idx" ON "feedback_responses" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_history_feedback_id_idx" ON "feedback_status_history" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "feedback_status_history_created_at_idx" ON "feedback_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_upvotes_feedback_user_idx" ON "feedback_upvotes" USING btree ("feedback_id","user_id");--> statement-breakpoint
CREATE INDEX "keystroke_user_id_idx" ON "keystroke_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "keystroke_test_result_id_idx" ON "keystroke_analytics" USING btree ("test_result_id");--> statement-breakpoint
CREATE INDEX "keystroke_expected_key_idx" ON "keystroke_analytics" USING btree ("expected_key");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_email_idx" ON "login_history" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_history_created_at_idx" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "notification_jobs_send_at_status_idx" ON "notification_jobs" USING btree ("send_at_utc","status");--> statement-breakpoint
CREATE INDEX "notification_jobs_user_id_type_idx" ON "notification_jobs" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_provider_idx" ON "oauth_accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "oauth_accounts_provider_user_id_idx" ON "oauth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persistent_logins_user_id_idx" ON "persistent_logins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persistent_logins_expires_at_idx" ON "persistent_logins" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "race_chat_race_id_idx" ON "race_chat_messages" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "race_chat_created_at_idx" ON "race_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "race_keystrokes_race_id_idx" ON "race_keystrokes" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "race_keystrokes_participant_id_idx" ON "race_keystrokes" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "race_keystrokes_flagged_idx" ON "race_keystrokes" USING btree ("is_flagged");--> statement-breakpoint
CREATE INDEX "race_keystrokes_race_participant_unique_idx" ON "race_keystrokes" USING btree ("race_id","participant_id");--> statement-breakpoint
CREATE INDEX "race_match_race_id_idx" ON "race_match_history" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "race_match_user_id_idx" ON "race_match_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "race_match_created_at_idx" ON "race_match_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "race_match_race_participant_unique_idx" ON "race_match_history" USING btree ("race_id","participant_id");--> statement-breakpoint
CREATE INDEX "participant_race_id_idx" ON "race_participants" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "participant_user_id_idx" ON "race_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "participant_race_status_idx" ON "race_participants" USING btree ("race_id","is_finished");--> statement-breakpoint
CREATE INDEX "participant_race_active_idx" ON "race_participants" USING btree ("race_id","is_active");--> statement-breakpoint
CREATE INDEX "race_replays_race_id_idx" ON "race_replays" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "race_replays_public_idx" ON "race_replays" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "race_spectators_race_id_idx" ON "race_spectators" USING btree ("race_id");--> statement-breakpoint
CREATE INDEX "race_spectators_active_idx" ON "race_spectators" USING btree ("race_id","is_active");--> statement-breakpoint
CREATE INDEX "race_room_code_idx" ON "races" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "race_status_idx" ON "races" USING btree ("status");--> statement-breakpoint
CREATE INDEX "race_created_at_idx" ON "races" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "race_type_idx" ON "races" USING btree ("race_type");--> statement-breakpoint
CREATE INDEX "shared_code_share_id_idx" ON "shared_code_results" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "shared_code_created_at_idx" ON "shared_code_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "share_token_idx" ON "shared_results" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "shared_mode_idx" ON "shared_results" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "shared_created_at_idx" ON "shared_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stress_test_user_id_idx" ON "stress_tests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stress_test_difficulty_idx" ON "stress_tests" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "stress_test_score_idx" ON "stress_tests" USING btree ("stress_score");--> statement-breakpoint
CREATE INDEX "stress_test_wpm_idx" ON "stress_tests" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX "stress_test_created_at_idx" ON "stress_tests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "test_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wpm_idx" ON "test_results" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "test_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "freestyle_idx" ON "test_results" USING btree ("freestyle");--> statement-breakpoint
CREATE INDEX "language_idx" ON "test_results" USING btree ("language");--> statement-breakpoint
CREATE INDEX "language_mode_time_idx" ON "test_results" USING btree ("language","mode","created_at" DESC NULLS LAST,"wpm" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "paragraph_language_idx" ON "typing_paragraphs" USING btree ("language");--> statement-breakpoint
CREATE INDEX "paragraph_mode_idx" ON "typing_paragraphs" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "paragraph_language_mode_idx" ON "typing_paragraphs" USING btree ("language","mode");--> statement-breakpoint
CREATE INDEX "user_book_progress_user_id_idx" ON "user_book_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_book_progress_book_id_idx" ON "user_book_progress" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "user_book_progress_user_book_idx" ON "user_book_progress" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "user_ratings_rating_idx" ON "user_ratings" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "user_ratings_tier_idx" ON "user_ratings" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "user_ratings_wins_idx" ON "user_ratings" USING btree ("wins");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_session_id_idx" ON "user_sessions" USING btree ("session_id");