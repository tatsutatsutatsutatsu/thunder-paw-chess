CREATE TABLE `rooms` (
	`code` text(6) PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`guest_token` text,
	`pgn` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_host_token_unique` ON `rooms` (`host_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_guest_token_unique` ON `rooms` (`guest_token`);--> statement-breakpoint
CREATE INDEX `idx_rooms_updated_at` ON `rooms` (`updated_at`);