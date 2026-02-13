CREATE TABLE `webauthn_credential` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`name` text DEFAULT 'Passkey' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webauthn_credential_credential_id_unique` ON `webauthn_credential` (`credential_id`);--> statement-breakpoint
CREATE TABLE `webauthn_challenge` (
	`id` integer PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webauthn_challenge_challenge_unique` ON `webauthn_challenge` (`challenge`);