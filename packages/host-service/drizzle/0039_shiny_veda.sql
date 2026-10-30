CREATE TABLE `workspace_label_assignments` (
	`workspace_id` text NOT NULL,
	`label_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `label_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `workspace_labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_label_assignments_label_id_idx` ON `workspace_label_assignments` (`label_id`);--> statement-breakpoint
CREATE TABLE `workspace_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_labels_owner_name_key_idx` ON `workspace_labels` (`created_by_user_id`,`name_key`);