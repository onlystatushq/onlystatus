CREATE TABLE `recovery_code` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `login_attempt` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip` text,
	`attempted_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
ALTER TABLE `user` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_root` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `user` ADD `totp_enabled` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `force_password_change` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `disabled` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `token_version` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `onboarding_completed` integer DEFAULT 0;