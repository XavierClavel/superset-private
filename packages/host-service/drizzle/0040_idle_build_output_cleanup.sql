ALTER TABLE `host_settings` ADD `clean_idle_build_output` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `host_settings` ADD `idle_build_output_days` integer DEFAULT 7 NOT NULL;