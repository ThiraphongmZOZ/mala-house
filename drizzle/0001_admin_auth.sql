CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`password_version` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires` integer NOT NULL
);
